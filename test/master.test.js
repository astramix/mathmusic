// Mastering (src/master.js) and loudness (src/loudness.js) against reference cases: EBU Tech 3341 sine levels, an
// inter-sample peak, the limiter's ceiling, the low end in mono, the meter, a whole song mastered to −14 LUFS.
import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { lufs } from '../src/loudness.js'
import { masterChain, masterOffline, truePeak, loudnessMeter, MASTER_DEFAULTS, MASTER_PRESETS } from '../src/master.js'
import { render, mixdown } from '../src/engine.js'

const SR = 44100
const sine = (f, dBFS, secs, phase = 0) => {
  const a = 10 ** (dBFS / 20), n = Math.round(secs * SR), x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * (i / SR) + phase)
  return x
}
const near = (a, b, e) => Math.abs(a - b) <= e

test('BS.1770: a 1 kHz stereo sine at −23 dBFS is −23 LUFS, at −33 dBFS −33 (EBU Tech 3341 cases 1, 2)', () => {
  for (const d of [-23, -33, -20]) {
    const x = sine(1000, d, 20)
    const v = lufs(x, x)
    assert.ok(near(v, d, 0.1), `${d} dBFS → ${v.toFixed(2)} LUFS`)
  }
})

test('true peak: a sine at a quarter of the sample rate, sampled between its peaks, is 3 dB over its samples', () => {
  // x[n] = sin(πn/2 + π/4): the samples are ±0.707, the wave reaches 1.0 between them
  const n = 4000, x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin((Math.PI * i) / 2 + Math.PI / 4)
  let sp = 0
  for (const v of x) sp = Math.max(sp, Math.abs(v))
  const tp = truePeak(x, x)
  assert.ok(near(20 * Math.log10(sp), -9.03, 0.05))
  assert.ok(near(tp, -6.02, 0.35), `true peak ${tp.toFixed(2)} dBTP`)
})

test('the limiter keeps a hot signal under the ceiling, true peak included', () => {
  // noise and a loud sine 6 dB over full scale
  let s = 7
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1
  const n = SR * 4, L = new Float32Array(n), R = new Float32Array(n)
  for (let i = 0; i < n; i++) { const v = 2 * Math.sin((2 * Math.PI * 997 * i) / SR) * (i % 20000 < 10000 ? 1 : 0.3) + 0.3 * rnd(); L[i] = v; R[i] = 0.8 * v }
  const ch = masterChain({ ...MASTER_PRESETS.transparent, ceiling: -1 })
  const oL = new Float32Array(n), oR = new Float32Array(n)
  for (let i = 0; i < n + ch.latency; i++) {
    const [l, r] = ch.process(i < n ? L[i] : 0, i < n ? R[i] : 0)
    if (i >= ch.latency) (oL[i - ch.latency] = l), (oR[i - ch.latency] = r)
  }
  const tp = truePeak(oL, oR)
  assert.ok(tp <= -0.85, `true peak ${tp.toFixed(2)} dBTP over −1`)
  // and quiet music passes untouched (latency aside)
  const q = sine(440, -20, 1), ch2 = masterChain({ ...MASTER_PRESETS.transparent })
  let maxd = 0
  for (let i = 0; i < q.length; i++) { const [l] = ch2.process(q[i], q[i]); if (i >= ch2.latency) maxd = Math.max(maxd, Math.abs(l - q[i - ch2.latency])) }
  assert.ok(maxd < 1e-6, `a quiet sine changed by ${maxd}`)
})

test('the low end in mono: side content at 50 Hz goes, at 2 kHz stays', () => {
  for (const [f, keep] of [[50, false], [2000, true]]) {
    const ch = masterChain({ ...MASTER_DEFAULTS, ratio: 1, threshold: 0, monoBelow: 150, width: 1 })
    const x = sine(f, -12, 2)
    let side = 0, n = 0
    for (let i = 0; i < x.length; i++) { const [l, r] = ch.process(x[i], -x[i]); if (i > SR) { side += ((l - r) / 2) ** 2; n++ } }
    const ratio = 10 * Math.log10(side / n / ((10 ** (-12 / 20)) ** 2 / 2))
    assert.ok(keep ? ratio > -0.5 : ratio < -20, `${f} Hz side ${ratio.toFixed(1)} dB`)
  }
})

test('the meter: momentary, short-term and integrated loudness of a steady sine', () => {
  const m = loudnessMeter(SR), x = sine(1000, -18, 6)
  for (const v of x) m.push(v, v)
  const r = m.read()
  for (const k of ['M', 'S', 'I']) assert.ok(near(r[k], -18, 0.15), `${k} ${r[k].toFixed(2)}`)
  assert.ok(near(r.tp, -18, 0.2))
})

test('a whole song mastered to −14 LUFS lands there, under −1 dBTP', async () => {
  const song = (await import(pathToFileURL(path.resolve('songs/lofi.js')).href)).default
  const stems = render({ ...song, length: 64 })
  const { mix } = mixdown(stems)
  const out = masterOffline(mix[0], mix[1], { ...MASTER_DEFAULTS, ...MASTER_PRESETS.glue }, { lufs, target: -14 })
  assert.ok(near(out.lufs, -14, 0.15), `${out.lufs.toFixed(2)} LUFS`)
  assert.ok(out.tp <= -0.9, `${out.tp.toFixed(2)} dBTP`)
})
