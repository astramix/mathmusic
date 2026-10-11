// An audio worker (a classic script — pages opened from disk can't start module workers): renders a
// subset of a song's tracks, chunk by chunk, each track to its own stem. Several workers split the
// tracks of one song between them (tracks are independent functions of x); the page mixes the stems.
// The code arrives compiled by runtime.js (function bodies taking __mods). A broken track (throws,
// NaN) goes silent and is reported with its line; the rest keeps playing.
//
// page → worker  {type:'init', lib:[[name, body]], SR, TAIL, NODE?} · {type:'load', gen, body, keys, from, preroll, bpm}
//                {type:'render', gen, n} · {type:'drop', gen}
// worker → page  {type:'ready', gen, keys} · {type:'chunk', gen, start, n, stems:{key:[L,R]|null}, ms:{key:ms}, done}
//                {type:'problem', gen, key, message, line} · {type:'error', gen, message, line}
let base = null, SR = 44100, TAIL = 3
const gens = new Map()
const post = (m, t) => self.postMessage(m, t)
const lineOf = err => {
  const m = String((err && err.stack) || '').match(/mm-song\.js:(\d+):(\d+)/)
  return m ? +m[1] - 2 : null
}
const NODE = { existsSync: () => false, readFileSync: () => { throw new Error('not in the browser') }, writeFileSync() {}, mkdirSync() {}, join: (...p) => p.join('/') }

function createRenderer({ gen, body, keys, from, preroll, bpm }) {
  const song = new Function('__mods', body)({ ...base }).default
  const tempo = bpm || song.bpm, sec = 60 / tempo
  const problem = (key, err, what) => post({ type: 'problem', gen, key, message: `${key}: ${what || (err && err.message) || err}`, line: lineOf(err) })
  const voices = []
  for (const [key, track] of Object.entries(song.tracks)) {
    if (!track || !keys.includes(key)) continue
    let f = null
    try {
      f = track.audio ? track.audio({ bpm: tempo, sample: () => null }) : null
    } catch (err) {
      problem(key, err)
    }
    if (typeof f === 'function') voices.push({ key, f, broken: false })
  }
  const end = Math.ceil((song.length * sec + TAIL) * SR)
  let pos = Math.max(0, from - preroll)
  // runs one voice over [pos, pos + n) into L, R (or just advances it when L is null) → any sound?
  const run = (v, n, L, R) => {
    if (v.broken) return false
    let any = false, s = pos
    try {
      for (let i = 0; i < n; i++, s++) {
        const y = s < end ? v.f(s / SR / sec) : 0
        let l, r
        if (typeof y === 'number') l = r = y
        else if (y) (l = y[0]), (r = y[1])
        else l = r = 0
        if (!L) continue
        if (!(Number.isFinite(l) && Number.isFinite(r))) {
          v.broken = true
          problem(v.key, null, `NaN/∞ на такте ${Math.floor(s / SR / sec / 4) + 1} (x = ${(s / SR / sec).toFixed(2)}) — дорожка заглушена до правки`)
          return any
        }
        L[i] = l
        R[i] = r
        if (l !== 0 || r !== 0) any = true
      }
    } catch (err) {
      v.broken = true
      problem(v.key, err, `${err.message} (x = ${(s / SR / sec).toFixed(2)})`)
    }
    return any
  }
  // pre-roll: reverbs, delays and held notes are already sounding at `from`
  while (pos < from) {
    const n = Math.min(4096, from - pos)
    for (const v of voices) run(v, n, null, null)
    pos += n
  }
  return {
    keys: voices.map(v => v.key),
    render(n) {
      const stems = {}, ms = {}, transfer = []
      for (const v of voices) {
        const t0 = performance.now(), L = new Float32Array(n), R = new Float32Array(n)
        const any = run(v, n, L, R)
        ms[v.key] = performance.now() - t0
        stems[v.key] = any ? [L, R] : null
        if (any) transfer.push(L.buffer, R.buffer)
      }
      const start = pos
      pos += n
      return { start, n, stems, ms, transfer, done: pos >= end }
    },
  }
}

self.onmessage = e => {
  const d = e.data
  try {
    if (d.type === 'init') {
      SR = d.SR
      TAIL = d.TAIL
      base = { node: NODE }
      for (const [name, body] of d.lib) base[name] = new Function('__mods', body)(base)
    } else if (d.type === 'load') {
      const r = createRenderer(d)
      gens.set(d.gen, r)
      post({ type: 'ready', gen: d.gen, keys: r.keys })
    } else if (d.type === 'render') {
      const r = gens.get(d.gen)
      if (!r) return
      const { transfer, ...c } = r.render(d.n)
      post({ type: 'chunk', gen: d.gen, ...c }, transfer)
    } else if (d.type === 'drop') gens.delete(d.gen)
  } catch (err) {
    post({ type: 'error', gen: d.gen, message: String((err && err.message) || err), line: lineOf(err) })
  }
}
