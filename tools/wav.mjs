// Reading a WAV file (PCM 8/16/24/32 bit or 32/64-bit float, any channels) → { sr, channels: Float32Array[], mono }
import { readFileSync } from 'node:fs'

export function readWav(path) {
  const buf = readFileSync(path), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const tag = o => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3])
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error(`${path}: not a WAV file (convert MP3/OGG/FLAC to WAV, or open it in the app)`)
  let fmt = null, data = null
  for (let o = 12; o + 8 <= buf.length;) {
    const id = tag(o), size = dv.getUint32(o + 4, true)
    if (id === 'fmt ') fmt = { format: dv.getUint16(o + 8, true), ch: dv.getUint16(o + 10, true), sr: dv.getUint32(o + 12, true), bits: dv.getUint16(o + 22, true) }
    if (id === 'data') data = { at: o + 8, size: Math.min(size, buf.length - o - 8) }
    o += 8 + size + (size & 1)
  }
  if (!fmt || !data) throw new Error(`${path}: no fmt/data chunk`)
  let { format, ch, sr, bits } = fmt
  if (format === 0xfffe) format = bits >= 32 && dv.getUint16(data.at - 8 - 2, true) === 3 ? 3 : 1 // WAVE_FORMAT_EXTENSIBLE (a guess when unsure)
  const bps = bits / 8, frames = Math.floor(data.size / (bps * ch)), channels = Array.from({ length: ch }, () => new Float32Array(frames))
  for (let i = 0; i < frames; i++) for (let c = 0; c < ch; c++) {
    const o = data.at + (i * ch + c) * bps
    let v
    if (format === 3) v = bits === 64 ? dv.getFloat64(o, true) : dv.getFloat32(o, true)
    else if (bits === 8) v = (buf[o] - 128) / 128
    else if (bits === 16) v = dv.getInt16(o, true) / 32768
    else if (bits === 24) v = ((buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16)) << 8 >> 8) / 8388608
    else v = dv.getInt32(o, true) / 2147483648
    channels[c][i] = v
  }
  const mono = new Float32Array(frames)
  for (const c of channels) for (let i = 0; i < frames; i++) mono[i] += c[i] / ch
  return { sr, channels, mono }
}
