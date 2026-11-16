// The sandbox: where a song that came from somewhere else runs.
//
// A song file is a program. Yours and the app's own run in the page and in its workers, where they could — if they
// wanted — read and write my_songs/ through the server, the folder you gave the page, its storage. A file somebody sent
// you gets none of that: its code only ever runs inside an <iframe sandbox="allow-scripts"> made here:
//   · the frame has an opaque origin: no cookies, localStorage, IndexedDB (so no folder handle), no window of the app;
//   · its Content-Security-Policy is `default-src 'none'` + scripts from blob: only — no fetch, XHR, WebSocket, images,
//     importScripts or import() of anything outside; workers started from blob: inherit it. The app's server refuses
//     requests from an opaque origin anyway (viz/serve.js and its twins: the Origin check, and x-mathmusic needs a
//     preflight no answer allows);
//   · the song's code runs only in workers inside that frame: the audio workers (the same viz/app/worker.js, talking to
//     the page through a MessagePort handed down to them) and the probe below, which loads the song once and sends back
//     plain data — the song's fields without functions, every track's graph() sampled GRID times a beat and its midi()
//     as runs of notes. The page builds a stand-in song from those tables (proxySong): graph(x) and midi(x) look up,
//     nothing of the stranger's code is ever called in the page;
//   · what comes back is data from a stranger too: strings lose < > & " ' `, colours must look like colours, numbers
//     are made numbers, a track with an odd name is left out.
// What is left to a hostile song: wasting the processor (its workers are terminated when the song is closed; the probe
// has a time limit). runtime.js `guard` keeps the other door shut: rt.load() refuses a source known to be foreign, and
// everything while the open song is foreign.
import { compile, guard } from './runtime.js'

const PROBE_MS = 30000
const HOST = `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; child-src blob:">
<script>
const workers = new Map()
onmessage = e => {
  const d = e.data
  if (!d || e.source !== parent) return
  if (d.type === 'spawn') {
    try {
      const w = new Worker(URL.createObjectURL(new Blob([d.code], { type: 'text/javascript' })))
      workers.set(d.id, w)
      w.onerror = ev => { ev.preventDefault && ev.preventDefault(); parent.postMessage({ type: 'sandbox-worker-error', id: d.id, message: String(ev.message || 'не запустился') }, '*') }
      w.postMessage({ __port: e.ports[0] }, [e.ports[0]])
    } catch (err) {
      parent.postMessage({ type: 'sandbox-worker-error', id: d.id, message: String((err && err.message) || err) }, '*')
    }
  } else if (d.type === 'kill') {
    const w = workers.get(d.id)
    if (w) { w.terminate(); workers.delete(d.id) }
  }
}
parent.postMessage({ type: 'sandbox-ready' }, '*')
<\/script>`
// appended to a worker's code: its channel is the port the frame hands it, not the frame itself
const PORTED = `
;(() => {
  const handler = self.onmessage
  self.onmessage = e => {
    const p = e.data && e.data.__port
    if (!p) return
    self.postMessage = (m, t) => p.postMessage(m, t || [])
    self.onmessage = null
    p.onmessage = handler
  }
})()`

let frame = null, ready = null, seq = 0
const live = new Map()
function host() {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
    frame.srcdoc = HOST
    const timer = setTimeout(() => reject(new Error('песочница не запустилась')), 8000)
    addEventListener('message', e => {
      if (!frame || e.source !== frame.contentWindow || !e.data) return
      if (e.data.type === 'sandbox-ready') { clearTimeout(timer); resolve(frame) }
      else if (e.data.type === 'sandbox-worker-error') live.get(e.data.id)?.onerror?.({ message: String(e.data.message), preventDefault() {} })
    })
    document.body.append(frame)
  })
  ready.catch(() => { frame?.remove(); frame = null; ready = null })
  return ready
}

// A worker inside the sandbox, used like a Worker: postMessage, onmessage, onerror, terminate
export class SandboxWorker {
  constructor(code) {
    this.id = ++seq
    this.onmessage = null
    this.onerror = null
    const ch = new MessageChannel()
    this.port = ch.port1
    this.port.onmessage = e => this.onmessage?.(e)
    live.set(this.id, this)
    host().then(f => this.port && f.contentWindow.postMessage({ type: 'spawn', id: this.id, code: code + PORTED }, '*', [ch.port2]),
      err => this.onerror?.({ message: err.message, preventDefault() {} }))
  }
  postMessage(m, transfer) { this.port?.postMessage(m, transfer ?? []) }
  terminate() {
    if (!this.port) return
    frame?.contentWindow?.postMessage({ type: 'kill', id: this.id }, '*')
    this.port.close()
    this.port = null
    live.delete(this.id)
  }
}

// ---- the probe: the song loaded once inside the sandbox → plain data ---------------------------------------------------
const PROBE = `
const NODE = { existsSync: () => false, readFileSync: () => { throw new Error('not in the browser') }, writeFileSync() {}, mkdirSync() {}, join: (...p) => p.join('/') }
self.onmessage = e => {
  const d = e.data
  try {
    const base = { node: NODE }
    for (const [name, body] of d.lib) base[name] = new Function('__mods', body)(base)
    const song = new Function('__mods', d.body)({ ...base }).default
    if (!song || typeof song !== 'object' || !song.tracks) throw new Error('файл песни должен делать export default { name, bpm, length, tracks }')
    let budget = 200000
    const plain = (v, depth) => {
      if (--budget < 0 || depth > 8) return null
      if (v == null || typeof v === 'boolean') return v ?? null
      if (typeof v === 'number') return Number.isFinite(v) ? v : null
      if (typeof v === 'string') return v.slice(0, 20000)
      if (Array.isArray(v)) return v.slice(0, 20000).map(x => plain(x, depth + 1))
      if (typeof v === 'object') {
        const o = {}
        for (const k of Object.keys(v).slice(0, 2000)) { const x = v[k]; if (typeof x !== 'function') o[String(k).slice(0, 200)] = plain(x, depth + 1) }
        return o
      }
      return null
    }
    const { tracks, ...rest } = song
    const meta = plain(rest, 0)
    const length = Math.max(0, Math.min(+song.length || 0, 6000)), G = d.grid, F = d.fine
    const norm = v => (typeof v === 'number' ? (Number.isFinite(v) ? v : null) : Array.isArray(v) ? v.filter(Number.isFinite).slice(0, 24) : null)
    const out = {}
    for (const key of Object.keys(tracks).slice(0, 64)) {
      const t = tracks[key]
      if (!t || typeof t !== 'object') continue
      const { graph, midi, audio, ...own } = t
      const tr = { info: plain(own, 0) || {}, audio: typeof audio === 'function', graph: null, midi: null }
      if (typeof graph === 'function') {
        const a = new Array(Math.ceil(length * G) + 1)
        for (let k = 0; k < a.length; k++) { let v = null; try { v = graph(k / G) } catch {} a[k] = norm(v) }
        tr.graph = a
      }
      if (typeof midi === 'function') {
        const runs = []
        let prev = null
        for (let k = 0, n = Math.ceil(length * F); k <= n; k++) {
          let v = null
          try { v = midi(k / F) } catch {}
          const m = Array.isArray(v) ? v.filter(Number.isFinite).slice(0, 24) : typeof v === 'number' && Number.isFinite(v) ? [v] : []
          const s = m.join(',')
          if (s !== prev) { runs.push([k, m]); prev = s }
        }
        tr.midi = runs
      }
      out[key] = tr
    }
    self.postMessage({ ok: true, meta, tracks: out })
  } catch (err) {
    const m = String((err && err.stack) || '').match(/mm-song\\.js:(\\d+):(\\d+)/)
    self.postMessage({ ok: false, error: String((err && err.message) || err), line: m ? +m[1] - 2 : null })
  }
}`

// what a stranger's strings may contain when they reach the page (names, sections, chords, anything shown)
const clean = s => String(s).replace(/[<>&"'`]/g, c => ({ '<': '‹', '>': '›', '&': '＆', '"': '”', "'": '’', '`': 'ˋ' })[c])
const cleanTex = s => String(s).replace(/</g, '\\lt ').replace(/>/g, '\\gt ')
const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/deg+-]+\)|[a-z]{3,24})$/i
const deep = (v, f = clean) => (typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map(x => deep(x, f)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [clean(k), deep(x, f)])) : v)
const SAFE_KEY = /^[^<>&"'`\\\u0000-\u001f]{1,64}$/

// the probe's answer → a song object the page can use like any other: its functions read the tables
export function proxySong(data, { grid, fine }) {
  const meta = deep(data.meta ?? {})
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d)
  const song = { ...meta, name: clean(meta.name ?? 'song').slice(0, 200), bpm: num(meta.bpm, 20, 400, 120), length: num(meta.length, 1, 6000, 16), tracks: {}, __sandbox: true }
  song.sections = Array.isArray(meta.sections) ? meta.sections.filter(s => Array.isArray(s) && Number.isFinite(+s[0])).slice(0, 200).map(s => [+s[0], String(s[1] ?? '').slice(0, 80)]) : undefined
  if (!song.sections?.length) delete song.sections
  delete song.boss // (its chord function did not come over; the game's exporter wants the real song)
  const skipped = []
  for (const [key, tr] of Object.entries(data.tracks ?? {})) {
    if (!SAFE_KEY.test(key) || key === '__proto__') { skipped.push(clean(key).slice(0, 40)); continue }
    const info = deep(tr.info ?? {})
    if (tr.info?.formula != null) info.formula = deep(tr.info.formula, cleanTex)
    info.color = typeof tr.info?.color === 'string' && COLOR.test(tr.info.color.trim()) ? tr.info.color.trim() : undefined
    delete info.vst // a stranger's song does not choose what the user's plugins play: its own sound only
    const t = { ...info }
    // (the tables were made by our probe, but in a worker the song shares: every value is checked again here)
    const real = n => typeof n === 'number' && Number.isFinite(n)
    if (Array.isArray(tr.graph)) {
      const a = tr.graph
      t.graph = x => {
        const v = a[Math.round(x * grid)]
        return real(v) ? v : Array.isArray(v) ? v.filter(real) : null
      }
    }
    if (Array.isArray(tr.midi)) {
      const runs = tr.midi.filter(r => Array.isArray(r) && real(r[0]) && Array.isArray(r[1])).map(r => [r[0], r[1].filter(real).slice(0, 24)])
      t.midi = x => {
        const k = Math.floor(x * fine + 1e-6)
        let lo = 0, hi = runs.length - 1, at = -1
        while (lo <= hi) { const mid = (lo + hi) >> 1; if (runs[mid][0] <= k) { at = mid; lo = mid + 1 } else hi = mid - 1 }
        return at < 0 ? [] : runs[at][1].slice()
      }
    }
    if (tr.audio) t.audio = () => () => 0 // the sound is made in the sandbox's workers; this stands for "the track has audio"
    song.tracks[key] = t
  }
  if (!Object.keys(song.tracks).length) throw new Error('в песне нет дорожек')
  return { song, skipped }
}

// Loads a foreign song: compiled here (a text transform), run in the sandbox → { song (the stand-in), body, skipped }
export async function sandboxLoad(lib, source, { grid = 32, fine = 96, id = '' } = {}) {
  guard.taint(source, id)
  const body = compile(source)
  const data = await new Promise((resolve, reject) => {
    const w = new SandboxWorker(PROBE)
    const timer = setTimeout(() => { w.terminate(); reject(new Error('песня не ответила за 30 секунд — остановлена')) }, PROBE_MS)
    const done = f => v => { clearTimeout(timer); w.terminate(); f(v) }
    w.onmessage = e => done(resolve)(e.data)
    w.onerror = e => done(reject)(new Error('песочница: ' + (e.message || 'не запустилась')))
    w.postMessage({ lib, body, grid, fine })
  })
  if (!data?.ok) {
    const err = new Error(clean(data?.error ?? 'песня не загрузилась'))
    err.line = Number.isFinite(data?.line) ? data.line : null
    throw err
  }
  return { ...proxySong(data, { grid, fine }), body }
}
