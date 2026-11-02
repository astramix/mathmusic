// Space and 8D (src/spatial.js): a centred tone goes round the head — louder in the right ear a quarter turn in, in the left
// three quarters in, the far ear later and darker —, the room widens a mono mix, nothing explodes or turns to NaN, and an
// offline pass keeps the peak.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spatialChain, spatialOffline } from '../src/spatial.js'

const sr = 44100, TAU = 2 * Math.PI
const rmsOf = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length)

test('8D: the source goes round the head', () => {
  const ch = spatialChain('8d', sr, { period: 8 }), n = 8 * sr, L = new Float32Array(n), R = new Float32Array(n)
  let seed = 3 // broadband (a single sine would sit in a notch of the reflections' comb)
  for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; const x = 0.3 * (seed / 4294967296 - 0.5); [L[i], R[i]] = ch.process(x, x) }
  for (let i = 0; i < n; i += 97) assert.ok(Number.isFinite(L[i]) && Number.isFinite(R[i]))
  const win = (a, t) => a.slice(Math.round((t - 0.25) * sr), Math.round((t + 0.25) * sr))
  // a quarter of the way round (2 s): on the right; three quarters (6 s): on the left — by several dB
  const db = t => 20 * Math.log10(rmsOf(win(R, t)) / rmsOf(win(L, t)))
  assert.ok(db(2) > 3, `right at 2 s: ${db(2).toFixed(1)} dB`)
  assert.ok(db(6) < -3, `left at 6 s: ${db(6).toFixed(1)} dB`)
  assert.ok(Math.abs(db(4)) < 2.5, `behind at 4 s, centred: ${db(4).toFixed(1)} dB`)
})

test('space: a mono mix gets width, and the offline pass keeps the peak', () => {
  const n = 3 * sr, L = new Float32Array(n), R = new Float32Array(n)
  for (let i = 0; i < n; i++) { const t = i / sr, v = 0.5 * Math.sin(TAU * 220 * t) * Math.exp(-6 * (t % 0.5)); L[i] = R[i] = v }
  const [oL, oR] = spatialOffline(L, R, 'space', sr)
  let side = 0, mid = 0
  for (let i = 0; i < n; i++) { side += (oL[i] - oR[i]) ** 2; mid += (oL[i] + oR[i]) ** 2 }
  assert.ok(side / mid > 0.01, `side/mid ${(side / mid).toFixed(4)}`)
  const pk = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  assert.ok(Math.abs(Math.max(pk(oL), pk(oR)) - 0.5) < 0.01)
  // off: untouched
  const off = spatialChain('off', sr)
  assert.deepEqual(off.process(0.3, -0.2), [0.3, -0.2])
})
