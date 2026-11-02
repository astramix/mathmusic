// Export straight from the page: MP3 (320 kbps, LAME in a worker), WAV (24-bit), OGG (Opus 256 kbps
// via WebCodecs, muxed here), MIDI (type 1, one track per part, General MIDI programs, drums on
// channel 10), stems (a ZIP of 24-bit WAVs) and the song's source. The mix is normalised to −1 dBFS
// like render.js; muted tracks are left out. Every file lands in the project's exports/<kind>/ (saveExport).
import { app } from './app.js'
import { toast, download } from './ui.js'
import { renderSong, renderSongCached } from './player.js'
import { trackList, SR } from './runtime.js'
import { nameIn, fileName } from './library.js'
import { midiFile, isMicrotonal } from './midi.js'
import { TARGETS } from './master.js'
import { chainParams } from './masterui.js'
import { tuningFiles } from './tuning.js'
import { MODES } from './modes.js'

const fileBase = () => fileName(nameIn(app.current?.source ?? '', app.current?.entry?.name ?? 'song'))
const mutedSet = () => new Set((app.scene?.tracks ?? []).filter(t => t.muted).map(t => t.key))

// the whole mix → { L, R } at −1 dBFS, always rendered in one pass from the start (like the video):
// the player's cache is stitched from runs restarted at seeks and mutes, with clicks at the seams
export async function getMix(t) {
  const cur = app.current
  t?.set('рендер всей песни…', 0)
  const r = await renderSongCached(app.SRC, cur.source, { muted: mutedSet(), onProgress: f => t?.set(null, f * 0.6) })
  return masterIfOn(r, t)
}
// the mix mastered when the bus is on («🎛 Мастеринг»): the whole song through the chain and onto its loudness target,
// in a worker (src/master.js + src/loudness.js) so the page stays alive → the render with L, R and mastered: { lufs, tp }
export async function masterIfOn(r, t) {
  r = await spatialIfOn(r, t)
  const m = app.master
  if (!m?.on) return r
  t?.set('мастеринг: компрессор, лимитер, громкость…', 0.6)
  const target = (TARGETS.find(x => x[0] === m.target) ?? TARGETS[1])[2]
  const code = [MM.APP['loudness.js'], MM.APP['master.js']].map(s => s.replace(/^export /gm, '')).join('\n') + `
self.onmessage = e => {
  const { L, R, params, target } = e.data
  const o = masterOffline(L, R, params, { lufs, target })
  self.postMessage({ L: o.L, R: o.R, lufs: o.lufs, tp: o.tp, gainDb: o.gainDb }, [o.L.buffer, o.R.buffer])
}`
  const w = new Worker(MM.blob(code))
  const L = r.L.slice(), R = r.R.slice()
  const o = await new Promise((resolve, reject) => {
    w.onmessage = e => resolve(e.data)
    w.onerror = e => reject(new Error(e.message || 'мастеринг'))
    w.postMessage({ L, R, params: chainParams(m), target }, [L.buffer, R.buffer])
  }).finally(() => w.terminate())
  return { ...r, L: o.L, R: o.R, mastered: { lufs: o.lufs, tp: o.tp, gainDb: o.gainDb } }
}
// space / 8D when on (Вид → «Звук вокруг»): the whole mix through src/spatial.js in a worker, before the master bus
async function spatialIfOn(r, t) {
  const mode = app.spatial
  if (!mode || mode === 'off') return r
  t?.set(mode === '8d' ? '8D: звук вокруг головы…' : 'пространство…', 0.58)
  const code = MM.APP['spatial.js'].replace(/^export /gm, '') + `
self.onmessage = e => { const [L, R] = spatialOffline(e.data.L, e.data.R, e.data.mode, e.data.sr); self.postMessage({ L, R }, [L.buffer, R.buffer]) }`
  const w = new Worker(MM.blob(code))
  const L = r.L.slice(), R = r.R.slice()
  const o = await new Promise((resolve, reject) => {
    w.onmessage = e => resolve(e.data)
    w.onerror = e => reject(new Error(e.message || 'пространство'))
    w.postMessage({ L, R, mode, sr: r.sr ?? 44100 }, [L.buffer, R.buffer])
  }).finally(() => w.terminate())
  return { ...r, L: o.L, R: o.R, spatial: mode }
}
// a finished export → exports/<kind>/ of the project (lib.exportFolder: the server, or a folder handle), else downloaded.
// folder: asked for beforehand (a long render outlives the click that may open the folder dialog) → where it went
export async function saveExport(kind, name, blob, folder) {
  folder ??= await app.lib.exportFolder(kind, { pick: true })
  if (folder) try { return '📁 ' + (await app.lib.writeExport(folder, name, blob)) } catch (e) { console.warn(`exports/${kind} not written, downloading`, e) }
  download(name, blob)
  return `⬇ ${name} — в «Загрузки»`
}
const KIND = { mp3: 'mp3', wav: 'wav', ogg: 'ogg', mid: 'midi', mpe: 'midi', stems: 'stems' }
const masteredNote = m => (m.mastered ? ` · ${m.mastered.lufs.toFixed(1)} LUFS, ${m.mastered.tp.toFixed(1)} dBTP` : '')

// ---- WAV -------------------------------------------------------------------------------------------
export function wav24(L, R, sr = SR) {
  const n = L.length, size = n * 6, buf = new ArrayBuffer(44 + size), v = new DataView(buf)
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + size, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 6, true)
  v.setUint16(32, 6, true); v.setUint16(34, 24, true); str(36, 'data'); v.setUint32(40, size, true)
  const b = new Uint8Array(buf)
  let o = 44
  // TPDF dither at the 24-bit LSB keeps quiet tails clean
  let seed = 22222
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let i = 0; i < n; i++) {
    for (const ch of [L, R]) {
      let s = Math.round(Math.max(-1, Math.min(1, ch[i])) * 8388607 + rnd() - rnd())
      s = Math.max(-8388608, Math.min(8388607, s))
      b[o++] = s & 255
      b[o++] = (s >> 8) & 255
      b[o++] = (s >> 16) & 255
    }
  }
  return new Blob([buf], { type: 'audio/wav' })
}

// ---- MP3 (LAME in a worker) -------------------------------------------------------------------------
function mp3(L, R, onProgress) {
  return new Promise((resolve, reject) => {
    const code = MM.APP['lame.js'] + `
self.onmessage = e => {
  const { L, R, kbps } = e.data, enc = new lamejs.Mp3Encoder(2, 44100, kbps), out = [], n = L.length, B = 1152 * 20
  const l16 = new Int16Array(B), r16 = new Int16Array(B)
  for (let i = 0; i < n; i += B) {
    const m = Math.min(B, n - i)
    for (let j = 0; j < m; j++) {
      // triangular dither before 16-bit
      const d = (Math.random() - Math.random()) / 32768
      l16[j] = Math.max(-32768, Math.min(32767, Math.round((L[i + j] + d) * 32767)))
      r16[j] = Math.max(-32768, Math.min(32767, Math.round((R[i + j] + d) * 32767)))
    }
    const b = enc.encodeBuffer(l16.subarray(0, m), r16.subarray(0, m))
    if (b.length) out.push(new Uint8Array(b))
    if ((i / B) % 10 === 0) self.postMessage({ p: i / n })
  }
  const f = enc.flush()
  if (f.length) out.push(new Uint8Array(f))
  self.postMessage({ done: out })
}`
    const w = new Worker(MM.blob(code))
    w.onmessage = e => {
      if (e.data.done) {
        w.terminate()
        resolve(new Blob(e.data.done, { type: 'audio/mpeg' }))
      } else onProgress?.(e.data.p)
    }
    w.onerror = e => { w.terminate(); reject(new Error(e.message || 'mp3 encoder')) }
    w.postMessage({ L, R, kbps: 320 })
  })
}

// ---- OGG Opus (WebCodecs encoder + a small Ogg muxer) -------------------------------------------------
const OGG_CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let r = i << 24
    for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1
    t[i] = r >>> 0
  }
  return t
})()
function oggPage(packets, { serial, seq, granule, bos = false, eos = false, cont = false }) {
  const segs = []
  for (const p of packets) {
    let n = p.length
    while (n >= 255) { segs.push(255); n -= 255 }
    segs.push(n)
  }
  const body = packets.reduce((s, p) => s + p.length, 0), page = new Uint8Array(27 + segs.length + body), v = new DataView(page.buffer)
  page.set([0x4f, 0x67, 0x67, 0x53], 0)
  page[5] = (cont ? 1 : 0) | (bos ? 2 : 0) | (eos ? 4 : 0)
  v.setUint32(6, granule % 2 ** 32, true)
  v.setUint32(10, Math.floor(granule / 2 ** 32), true)
  v.setUint32(14, serial, true)
  v.setUint32(18, seq, true)
  page[26] = segs.length
  page.set(segs, 27)
  let o = 27 + segs.length
  for (const p of packets) { page.set(p, o); o += p.length }
  let crc = 0
  for (let i = 0; i < page.length; i++) crc = ((crc << 8) ^ OGG_CRC[((crc >>> 24) ^ page[i]) & 255]) >>> 0
  v.setUint32(22, crc, true)
  return page
}
async function resample48(L, R) {
  const ctx = new OfflineAudioContext(2, Math.ceil((L.length * 48000) / SR), 48000)
  const b = ctx.createBuffer(2, L.length, SR)
  b.copyToChannel(L, 0)
  b.copyToChannel(R, 1)
  const s = ctx.createBufferSource()
  s.buffer = b
  s.connect(ctx.destination)
  s.start()
  const out = await ctx.startRendering()
  return [out.getChannelData(0), out.getChannelData(1)]
}
async function ogg(L, R, onProgress) {
  if (!window.AudioEncoder) throw new Error('этот браузер не умеет кодировать Opus (нужен Chrome/Edge)')
  const cfg = { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 256000 }
  if (!(await AudioEncoder.isConfigSupported(cfg)).supported) throw new Error('Opus 256 кбит/с не поддерживается')
  const [l, r] = await resample48(L, R)
  const packets = []
  let head = null
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      if (meta?.decoderConfig?.description && !head) head = new Uint8Array(meta.decoderConfig.description)
      const b = new Uint8Array(chunk.byteLength)
      chunk.copyTo(b)
      packets.push(b)
    },
    error: e => { throw e },
  })
  enc.configure(cfg)
  const F = 960 * 50, n = l.length
  for (let i = 0; i < n; i += F) {
    const m = Math.min(F, n - i), data = new Float32Array(m * 2)
    data.set(l.subarray(i, i + m), 0)
    data.set(r.subarray(i, i + m), m)
    enc.encode(new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data }))
    if (enc.encodeQueueSize > 20) await new Promise(res => setTimeout(res, 0))
    onProgress?.(i / n)
  }
  await enc.flush()
  enc.close()
  // OpusHead (from the encoder if it gave one, else our own with the usual 312-sample pre-skip)
  let preskip = 312
  if (!head || String.fromCharCode(...head.slice(0, 8)) !== 'OpusHead') {
    head = new Uint8Array(19)
    head.set([...'OpusHead'].map(c => c.charCodeAt(0)), 0)
    const v = new DataView(head.buffer)
    head[8] = 1; head[9] = 2; v.setUint16(10, preskip, true); v.setUint32(12, SR, true); v.setInt16(16, 0, true); head[18] = 0
  } else preskip = new DataView(head.buffer).getUint16(10, true)
  const vendor = 'MathMusic', tags = new Uint8Array(8 + 4 + vendor.length + 4), tv = new DataView(tags.buffer)
  tags.set([...'OpusTags'].map(c => c.charCodeAt(0)), 0)
  tv.setUint32(8, vendor.length, true)
  tags.set([...vendor].map(c => c.charCodeAt(0)), 12)
  tv.setUint32(12 + vendor.length, 0, true)
  const serial = (Math.random() * 2 ** 31) | 0, pages = []
  let seq = 0
  pages.push(oggPage([head], { serial, seq: seq++, granule: 0, bos: true }))
  pages.push(oggPage([tags], { serial, seq: seq++, granule: 0 }))
  let granule = 0, group = []
  const total = n + preskip
  packets.forEach((p, i) => {
    group.push(p)
    granule += 960
    const last = i === packets.length - 1
    if (group.length === 50 || last) {
      pages.push(oggPage(group, { serial, seq: seq++, granule: last ? total : Math.min(granule, total), eos: last }))
      group = []
    }
  })
  return new Blob(pages, { type: 'audio/ogg' })
}

// ---- ZIP (stored) ----------------------------------------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = b => {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
async function zip(files) { // [{ name, blob }]
  const parts = [], central = []
  let off = 0
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer()), name = new TextEncoder().encode(f.name), crc = crc32(data)
    const lh = new Uint8Array(30 + name.length), v = new DataView(lh.buffer)
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true)
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, name.length, true)
    lh.set(name, 30)
    const ch = new Uint8Array(46 + name.length), w = new DataView(ch.buffer)
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true)
    w.setUint32(16, crc, true); w.setUint32(20, data.length, true); w.setUint32(24, data.length, true); w.setUint16(28, name.length, true); w.setUint32(42, off, true)
    ch.set(name, 46)
    parts.push(lh, data)
    central.push(ch)
    off += lh.length + data.length
  }
  const size = central.reduce((s, c) => s + c.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true)
  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}

// ---- menu actions --------------------------------------------------------------------------------------------
export async function exportAudio(fmt) {
  const cur = app.current
  if (!cur?.song) return toast('нет песни')
  const name = fileBase()
  // the folder now, while the click still allows its dialog
  const folder = await app.lib.exportFolder(KIND[fmt], { pick: true })
  if (fmt === 'mid') {
    const where = await saveExport('midi', name + '.mid', new Blob([midiFile(cur.song, { muted: mutedSet() })], { type: 'audio/midi' }), folder)
    const micro = isMicrotonal(cur.song)
    return toast(`${where}\n🎼 MIDI: каждая дорожка — отдельный трек, барабаны на 10-м канале` + (mutedSet().size ? ' · заглушённые не вошли' : '') + (micro ? '\nмикротоны и строй округлены до полутонов — для точных нот есть «MIDI · MPE» и файлы строя' : ''), { kind: 'ok', ms: micro ? 9000 : 6000 })
  }
  if (fmt === 'mpe') {
    const where = await saveExport('midi', name + '-mpe.mid', new Blob([midiFile(cur.song, { muted: mutedSet(), mpe: true })], { type: 'audio/midi' }), folder)
    return toast(`${where}\n🎼 MIDI MPE: каждая нота на своём канале (2–9) со своим питч-бендом ±48 — микротоны и строй до цента. В Ableton — инструмент в режиме MPE, дорожки импортируй по одной`, { kind: 'ok', ms: 9000 })
  }
  const t = toast(`экспорт ${fmt.toUpperCase()}…`, { progress: true })
  try {
    if (fmt === 'stems') return await stems(name, t, folder)
    const m = await getMix(t)
    let blob
    if (fmt === 'wav') blob = wav24(m.L, m.R)
    else if (fmt === 'mp3') {
      t.set('кодирую MP3 320 кбит/с…', 0.7)
      blob = await mp3(m.L, m.R, p => t.set(null, 0.7 + 0.3 * p))
    } else if (fmt === 'ogg') {
      t.set('кодирую Opus…', 0.7)
      blob = await ogg(m.L, m.R, p => t.set(null, 0.7 + 0.3 * p))
    }
    const where = await saveExport(fmt, `${name}.${fmt}`, blob, folder)
    t.done(`${where} · ${(blob.size / 1e6).toFixed(1)} МБ${masteredNote(m)}`)
  } catch (e) {
    console.error(e)
    t.done('не получилось: ' + e.message, 'err')
  }
}
async function stems(name, t, folder) {
  const cur = app.current, keys = trackList(cur.song).map(([k]) => k).filter(k => !mutedSet().has(k))
  t.set('рендер микса (общая громкость)…', 0)
  const full = await renderSongCached(app.SRC, cur.source, { muted: mutedSet(), onProgress: f => t.set(null, 0.3 * f) })
  const files = []
  for (let i = 0; i < keys.length; i++) {
    t.set(`стем ${keys[i]}…`, 0.3 + (0.65 * i) / keys.length)
    const r = await renderSong(app.SRC, cur.source, { only: [keys[i]], gain: full.gain })
    files.push({ name: `${name}/${String(i + 1).padStart(2, '0')} ${keys[i]}.wav`, blob: wav24(r.L, r.R) })
  }
  files.push({ name: `${name}/mix.wav`, blob: wav24(full.L, full.R) })
  t.set('упаковываю ZIP…', 0.97)
  const z = await zip(files)
  const where = await saveExport('stems', `${name}-stems.zip`, z, folder)
  t.done(`${where}\n🗂 ${keys.length} стемов + микс · ${(z.size / 1e6).toFixed(0)} МБ — в Ableton они складываются ровно в mix.wav`)
}
// the song's tuning for other programs: Scala .scl + .kbm, Ableton Live 12 .ascl (a temperament: 12 notes from C;
// a microtonal mode: its own degrees from the tonic) — in one ZIP
export async function exportTuning() {
  const cur = app.current
  if (!cur?.song) return toast('нет песни')
  const name = fileBase(), mode = cur.song.mode ? MODES[cur.song.mode] : null
  const folder = await app.lib.exportFolder('tuning', { pick: true })
  const files = Object.entries(tuningFiles(cur.song, { mode, base: name })).map(([f, text]) => ({ name: `${name}-tuning/${f}`, blob: new Blob([text], { type: 'text/plain' }) }))
  const where = await saveExport('tuning', `${name}-tuning.zip`, await zip(files), folder)
  toast(`${where}\n🎚 строй: .scl и .kbm (Scala, Surge, Pianoteq…), .ascl — Ableton Live 12 (Tuning → загрузить). MIDI-ноты остаются обычными`, { kind: 'ok', ms: 8000 })
}
export async function exportSource() {
  const cur = app.current
  if (!cur) return
  const where = await saveExport('code', fileBase() + '.js', new Blob([app.sourceOf(cur)], { type: 'text/javascript' }))
  toast(`${where}\n📄 исходник песни`, { kind: 'ok', ms: 5000 })
}
