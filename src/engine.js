// Math-music engine core.
//
// Time is measured in beats (x). Every part of a song is a function of x: a curve y(x)
// for the graph, plus a mapping that turns the curve into sound. This module holds the
// DSP building blocks, file I/O (WAV in/out, MIDI out), the renderer and the plotters.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

export const SR = 44100

// ---- math --------------------------------------------------------------------------
export const { floor, exp, sin, cos, tanh, PI } = Math
export const TAU = 2 * PI
export const mod = (a, n) => ((a % n) + n) % n
export const between = (x, a, b) => x >= a && x < b
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const hz = (n, base = 110) => base * 2 ** (n / 12) // pitch = 110 Hz · 2^{n/12}

// τ(x) = min_h ((x − h) mod period): beats since the latest hit of a repeating rhythm.
// Envelopes like e^{−kτ} then turn the rhythm into sound.
export function since(x, hits, period) {
  let m = Infinity
  for (const h of hits) m = Math.min(m, mod(x - h, period))
  return m
}

// The latest non-null step of a looping step sequence (`rate` steps per beat) at beat x
// → { v, τ }: the step's value and the beats since it started (null if every step is null).
export function lastStep(seq, x, rate = 4) {
  const k = Math.floor(x * rate)
  for (let i = 0; i < seq.length; i++) {
    const v = seq[mod(k - i, seq.length)]
    if (v != null) return { v, τ: (x * rate - k + i) / rate }
  }
  return null
}

// Deterministic white noise η ∈ [-1, 1), so every render sounds the same.
export function noise(seed = 1) {
  let s = seed | 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 2147483648 - 1
  }
}

// ---- oscillators -------------------------------------------------------------------
function polyblep(t, dt) {
  if (t < dt) return (t /= dt), t + t - t * t - 1
  if (t > 1 - dt) return (t = (t - 1) / dt), t * t + t + t + 1
  return 0
}

// Phase-accumulating oscillator; the frequency may change on every sample.
export function osc(shape = 'sine', phase = 0) {
  let p = phase
  const wave =
    shape === 'saw' ? dt => 2 * p - 1 - polyblep(p, dt)
    : shape === 'square' ? dt => (p < 0.5 ? 1 : -1) + polyblep(p, dt) - polyblep(p < 0.5 ? p + 0.5 : p - 0.5, dt)
    : () => Math.sin(TAU * p)
  const o = freq => {
    const dt = freq / SR, y = wave(dt)
    p += dt
    p -= Math.floor(p)
    return y
  }
  o.reset = (to = 0) => (p = to)
  return o
}

// Detuned unison saws spread across the stereo field → [left, right].
export function supersaw({ voices = 7, detune = 0.2, width = 0.8, seed = 7 } = {}) {
  const rnd = noise(seed), norm = 1 / Math.sqrt(voices)
  const vs = Array.from({ length: voices }, (_, i) => {
    const pos = voices > 1 ? (2 * i) / (voices - 1) - 1 : 0, pan = pos * width
    return {
      o: osc('saw', (rnd() + 1) / 2),
      ratio: 2 ** ((pos * detune) / 12),
      l: Math.sqrt((1 - pan) / 2) * norm,
      r: Math.sqrt((1 + pan) / 2) * norm,
    }
  })
  return freq => {
    let l = 0, r = 0
    for (const v of vs) {
      const y = v.o(freq * v.ratio)
      l += y * v.l
      r += y * v.r
    }
    return [l, r]
  }
}

// ---- filters & effects -------------------------------------------------------------
// Topology-preserving state-variable filter ('lp' | 'bp' | 'hp'); cutoff may move per sample.
export function filter(mode = 'lp') {
  let ic1 = 0, ic2 = 0
  return (x, fc, q = 0.707) => {
    const g = Math.tan((PI * clamp(fc, 10, SR * 0.45)) / SR), k = 1 / q
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2
    const v3 = x - ic2
    const v1 = a1 * ic1 + a2 * v3
    const v2 = ic2 + a2 * ic1 + a3 * v3
    ic1 = 2 * v1 - ic1
    ic2 = 2 * v2 - ic2
    return mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2
  }
}

// One-pole smoother: turns hard gates and steps into click-free envelopes.
export function smooth(ms = 3) {
  const a = 1 - Math.exp(-1000 / (SR * ms))
  let y = 0
  return x => (y += a * (x - y))
}

// Freeverb-style stereo reverb: (l, r) → [l, r] with the wet signal added.
// 8 parallel low-passed combs into 4 series allpasses per side; the delay lines live in one flat
// buffer per side (offsets `at`, read heads `pos`) so the loop has no closures.
export function reverb({ room = 0.84, damp = 0.3, wet = 0.3 } = {}) {
  const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], PASSES = [556, 441, 341, 225]
  const side = spread => {
    const lens = [...COMBS, ...PASSES].map(n => n + spread), at = new Int32Array(12)
    for (let j = 1; j < 12; j++) at[j] = at[j - 1] + lens[j - 1]
    return { buf: new Float32Array(at[11] + lens[11]), lens: Int32Array.from(lens), at, pos: new Int32Array(12), f: new Float64Array(8) }
  }
  const run = (s, x) => {
    const { buf, lens, at, pos, f } = s
    let y = 0
    for (let j = 0; j < 8; j++) {
      const i = at[j] + pos[j], o = buf[i]
      f[j] = o * (1 - damp) + f[j] * damp
      buf[i] = x + f[j] * room
      if (++pos[j] === lens[j]) pos[j] = 0
      y += o
    }
    for (let j = 8; j < 12; j++) {
      const i = at[j] + pos[j], o = buf[i]
      buf[i] = y + o * 0.5
      if (++pos[j] === lens[j]) pos[j] = 0
      y = o - y
    }
    return y
  }
  const L = side(0), R = side(23)
  return (l, r) => {
    const x = (l + r) * 0.015
    return [l + run(L, x) * wet, r + run(R, x) * wet]
  }
}

// Stereo ping-pong delay, time in seconds: the echo enters left and bounces right.
export function delay({ time = 0.3, feedback = 0.4, wet = 0.3 } = {}) {
  const n = Math.max(1, Math.round(time * SR)), bl = new Float32Array(n), br = new Float32Array(n)
  let i = 0
  return (l, r) => {
    const dl = bl[i], dr = br[i]
    bl[i] = (l + r) * 0.5 + dr * feedback
    br[i] = dl * feedback
    if (++i === n) i = 0
    return [l + dl * wet, r + dr * wet]
  }
}

// ---- samples -----------------------------------------------------------------------
// Reads a PCM or float WAV (e.g. any sample from Ableton's library) → { sr, ch: Float32Array[] }.
export function loadWav(file) {
  const buf = fs.readFileSync(file)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error(`${file}: not a WAV file`)
  let fmt, data
  for (let pos = 12; pos + 8 <= buf.length; ) {
    const id = buf.toString('ascii', pos, pos + 4), size = buf.readUInt32LE(pos + 4)
    if (id === 'fmt ') {
      const format = buf.readUInt16LE(pos + 8)
      fmt = {
        format: format === 0xfffe ? buf.readUInt16LE(pos + 32) : format, // WAVE_FORMAT_EXTENSIBLE
        channels: buf.readUInt16LE(pos + 10),
        sr: buf.readUInt32LE(pos + 12),
        bytes: buf.readUInt16LE(pos + 22) / 8,
      }
    } else if (id === 'data') data = buf.subarray(pos + 8, pos + 8 + size)
    pos += 8 + size + (size & 1)
  }
  if (!fmt || !data) throw new Error(`${file}: missing fmt or data chunk`)
  const { format, channels, bytes } = fmt
  const n = Math.floor(data.length / (bytes * channels))
  const ch = Array.from({ length: channels }, () => new Float32Array(n))
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < channels; c++) {
      const o = (i * channels + c) * bytes
      ch[c][i] =
        format === 3 ? (bytes === 4 ? data.readFloatLE(o) : data.readDoubleLE(o))
        : bytes === 1 ? (data[o] - 128) / 128
        : bytes === 2 ? data.readInt16LE(o) / 32768
        : bytes === 3 ? data.readIntLE(o, 3) / 8388608
        : data.readInt32LE(o) / 2147483648
    }
  }
  return { sr: fmt.sr, ch }
}

// One-shot sampler: s.hit() (re)triggers, s() pulls one stereo frame. Hits may overlap.
export function sampler(wav, { semitones = 0 } = {}) {
  const rate = (wav.sr / SR) * 2 ** (semitones / 12)
  const L = wav.ch[0], R = wav.ch[1] ?? wav.ch[0]
  const heads = []
  const s = () => {
    let l = 0, r = 0
    for (let i = heads.length - 1; i >= 0; i--) {
      const p = heads[i], j = p | 0, f = p - j
      if (j + 1 >= L.length) {
        heads.splice(i, 1)
        continue
      }
      l += L[j] + (L[j + 1] - L[j]) * f
      r += R[j] + (R[j + 1] - R[j]) * f
      heads[i] += rate
    }
    return [l, r]
  }
  s.hit = () => heads.push(0)
  return s
}

// Rising-edge detector: true only on the sample where a gate switches on.
export function edge() {
  let prev = false
  return on => {
    const e = on && !prev
    prev = on
    return e
  }
}

// A track that plays the sample in `slot` (a drop zone in the Max device) or the fallback
// file every time gate(x) switches on; skipped when there is neither.
export function sampleLayer(slot, gate, { gain = 0.5, fallback = null } = {}) {
  return {
    audio({ sample }) {
      const wav = sample(slot) ?? (fallback && fs.existsSync(fallback) ? loadWav(fallback) : null)
      if (!wav) return null
      const s = sampler(wav), hit = edge()
      return x => {
        if (hit(gate(x))) s.hit()
        const [l, r] = s()
        return [gain * l, gain * r]
      }
    },
  }
}

// ---- rendering ---------------------------------------------------------------------
const activeTracks = song => Object.entries(song.tracks).filter(([, t]) => t)

// Renders every track → { name: [left, right] }. track.audio(ctx) is called once per render
// and returns the function that is fed x in order (or null to skip the track).
// ctx.sample(slot) is the WAV assigned to that slot via opts.samples (e.g. dropped onto the
// Max device), or null.
export function render(song, { tail = 2, samples = {} } = {}) {
  const spb = 60 / song.bpm
  const n = Math.ceil((song.length * spb + tail) * SR)
  const loaded = {}
  const ctx = { bpm: song.bpm, sample: slot => (samples[slot] ? (loaded[slot] ??= loadWav(samples[slot])) : null) }
  const stems = {}
  for (const [name, track] of activeTracks(song)) {
    const f = track.audio?.(ctx)
    if (!f) continue
    const L = new Float32Array(n), R = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const y = f(i / SR / spb)
      if (typeof y === 'number') L[i] = R[i] = y
      else (L[i] = y[0]), (R[i] = y[1])
    }
    stems[name] = [L, R]
  }
  return stems
}

// Sums the stems and scales so the mix peaks at `ceiling`. The stems get the same gain,
// so dropping all of them into Ableton reproduces mix.wav exactly.
export function mixdown(stems, ceiling = 10 ** (-1 / 20)) {
  const list = Object.values(stems), n = list[0][0].length
  const mix = [new Float32Array(n), new Float32Array(n)]
  for (const [l, r] of list) {
    for (let i = 0; i < n; i++) {
      mix[0][i] += l[i]
      mix[1][i] += r[i]
    }
  }
  let peak = 0
  for (const ch of mix) for (const v of ch) peak = Math.max(peak, Math.abs(v))
  if (!Number.isFinite(peak)) throw new Error('mix contains NaN/Infinity — check the formulas')
  const gain = peak > 0 ? ceiling / peak : 1
  for (const ch of mix) for (let i = 0; i < n; i++) ch[i] *= gain
  return { mix, gain }
}

// ---- file output -------------------------------------------------------------------
// 24-bit PCM WAV.
export function writeWav(file, ch) {
  const n = ch[0].length, C = ch.length, B = 3, size = n * C * B
  const buf = Buffer.alloc(44 + size)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + size, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(C, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * C * B, 28)
  buf.writeUInt16LE(C * B, 32)
  buf.writeUInt16LE(24, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(size, 40)
  let o = 44
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < C; c++, o += B) buf.writeIntLE(Math.round(clamp(ch[c][i], -1, 1) * 8388607), o, B)
  }
  fs.writeFileSync(file, buf)
}

// Scans track.midi(x) — the MIDI notes sounding at beat x — at every tick and writes a type-0 MIDI file.
export function writeMidi(file, song, name, track, { ppq = 480, res = ppq, velocity = 100 } = {}) {
  const events = []
  const last = Math.round(song.length * res)
  let on = new Set()
  for (let i = 0; i <= last; i++) {
    const now = new Set(i < last ? track.midi(i / res).map(Math.round) : [])
    const tick = Math.round((i / res) * ppq)
    for (const p of on) if (!now.has(p)) events.push([tick, 0x80, p, 0])
    for (const p of now) if (!on.has(p)) events.push([tick, 0x90, p, velocity])
    on = now
  }
  const vlq = v => {
    const b = [v & 0x7f]
    while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80)
    return b
  }
  const us = Math.round(60e6 / song.bpm), title = [...Buffer.from(name)]
  const body = [
    0, 0xff, 0x03, ...vlq(title.length), ...title,
    0, 0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff,
    0, 0xff, 0x58, 0x04, 4, 2, 24, 8,
  ]
  let prev = 0
  for (const [tick, status, pitch, vel] of events) {
    body.push(...vlq(tick - prev), status, pitch, vel)
    prev = tick
  }
  body.push(0, 0xff, 0x2f, 0)
  const head = Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, ppq >> 8, ppq & 0xff])
  const trk = Buffer.alloc(8)
  trk.write('MTrk')
  trk.writeUInt32BE(body.length, 4)
  fs.writeFileSync(file, Buffer.concat([head, trk, Buffer.from(body)]))
}

// Writes mix.wav, one WAV stem + one MIDI clip per track and graph.svg into dir.
// Returns each stem's peak/RMS (linear, after the mix gain) and the length in seconds.
export function exportSong(song, dir, opts) {
  fs.mkdirSync(dir, { recursive: true })
  const stems = render(song, opts)
  const { mix, gain } = mixdown(stems)
  writeWav(path.join(dir, 'mix.wav'), mix)
  const levels = {}
  for (const [name, ch] of Object.entries(stems)) {
    const scaled = ch.map(c => c.map(v => v * gain))
    writeWav(path.join(dir, `${name}.wav`), scaled)
    let peak = 0, sum = 0
    for (const v of scaled[0]) (peak = Math.max(peak, Math.abs(v))), (sum += v * v)
    levels[name] = { peak, rms: Math.sqrt(sum / scaled[0].length) }
  }
  for (const [name, track] of activeTracks(song)) {
    if (track.midi) writeMidi(path.join(dir, `${name}.mid`), song, name, track)
  }
  plotSvg(path.join(dir, 'graph.svg'), song)
  return { levels, seconds: mix[0].length / SR }
}

// ---- graphs ------------------------------------------------------------------------
// Samples every track's curve y(x) → [{ color, pieces: [[[x, y], …], …] }]. graph(x) may
// return a number, an array (several voices) or null (silence); big jumps start a new piece.
export function graphLines(song, res = 64) {
  return activeTracks(song)
    .filter(([, track]) => track.graph)
    .map(([, track]) => {
      const pieces = [], open = []
      let prev = []
      for (let i = 0; i <= song.length * res; i++) {
        const x = i / res, v = track.graph(x), ys = v == null ? [] : [].concat(v)
        for (let j = 0; j < Math.max(ys.length, open.length); j++) {
          const y = ys[j]
          if (y == null || (prev[j] != null && Math.abs(y - prev[j]) > 2)) {
            if (open[j]?.length > 1) pieces.push(open[j])
            open[j] = null
          }
          if (y != null) (open[j] ??= []).push([x, y])
        }
        prev = ys
      }
      for (const p of open) if (p?.length > 1) pieces.push(p)
      return { color: track.color ?? '#ffffff', pieces }
    })
}

// Draws every track's curve like the pictures, with bar lines and section labels.
export function plotSvg(file, song, { pxPerBeat = 40, yMin = -3, yMax = 5, height = 400, res = 64 } = {}) {
  const W = Math.round(song.length * pxPerBeat), H = height
  const px = x => (x * pxPerBeat).toFixed(1)
  const py = y => (((yMax - clamp(y, yMin, yMax)) / (yMax - yMin)) * H).toFixed(1)
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="100%" height="100%" fill="#14091f"/>`,
    `<line x1="0" x2="${W}" y1="${py(0)}" y2="${py(0)}" stroke="#ffffff40"/>`,
  ]
  for (let b = 0; b <= song.length; b += 4) {
    out.push(`<line x1="${px(b)}" x2="${px(b)}" y1="0" y2="${H}" stroke="#ffffff${b % 16 ? '14' : '30'}"/>`)
  }
  for (const [at, label] of song.sections ?? []) {
    out.push(`<text x="${+px(at) + 6}" y="20" fill="#ffffffa0" font-family="sans-serif" font-size="14">${label}</text>`)
  }
  for (const { color, pieces } of graphLines(song, res)) {
    for (const p of pieces) {
      const points = p.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')
      out.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`)
    }
  }
  out.push('</svg>')
  fs.writeFileSync(file, out.join('\n'))
}

// The same picture rasterised to a PNG (no section labels) — the Max device shows it.
export function plotPng(file, song, { width = 460, height = 130, yMin = -3, yMax = 5, res = 32 } = {}) {
  const W = width, H = height, img = new Float32Array(W * H * 3)
  const toPx = ([x, y]) => [(x / song.length) * W, ((yMax - clamp(y, yMin, yMax)) / (yMax - yMin)) * H]
  const paint = (pieces, color, radius, alpha = 1) => {
    const cover = new Float32Array(W * H)
    const stamp = (cx, cy) => {
      for (let y = Math.max(0, Math.floor(cy - radius - 1)); y <= Math.min(H - 1, Math.ceil(cy + radius)); y++) {
        for (let x = Math.max(0, Math.floor(cx - radius - 1)); x <= Math.min(W - 1, Math.ceil(cx + radius)); x++) {
          const a = clamp(radius + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy), 0, 1)
          if (a > cover[y * W + x]) cover[y * W + x] = a
        }
      }
    }
    for (const piece of pieces) {
      const pts = piece.map(toPx)
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
        for (let s = 0; s <= steps; s++) stamp(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps)
      }
    }
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
    for (let i = 0; i < W * H; i++) {
      const a = cover[i] * alpha
      if (a > 0) for (let c = 0; c < 3; c++) img[i * 3 + c] += (rgb[c] - img[i * 3 + c]) * a
    }
  }
  for (let i = 0; i < W * H; i++) img.set([0x14, 0x09, 0x1f], i * 3)
  const vertical = x => [[x, yMin], [x, yMax]]
  const bars = []
  for (let b = 4; b < song.length; b += 4) bars.push(vertical(b))
  paint(bars, '#ffffff', 0.5, 0.08)
  paint((song.sections ?? []).filter(([at]) => at > 0).map(([at]) => vertical(at)), '#ffffff', 0.5, 0.3)
  paint([[[0, 0], [song.length, 0]]], '#ffffff', 0.5, 0.25)
  for (const { color, pieces } of graphLines(song, res)) paint(pieces, color, 0.8)

  const rows = Buffer.alloc((W * 4 + 1) * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = y * (W * 4 + 1) + 1 + x * 4, i = (y * W + x) * 3
      rows[o] = Math.round(img[i])
      rows[o + 1] = Math.round(img[i + 1])
      rows[o + 2] = Math.round(img[i + 2])
      rows[o + 3] = 255
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]), out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc32(body), body.length + 4)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
