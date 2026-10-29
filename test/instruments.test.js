// The plucked strings are exactly in tune (A4 = 440 Hz): the Karplus–Strong loop is read between samples, its filter's
// phase delay taken off — the plucker (guitar, harpsichord), the electric bass, the funk guitar
import test from 'node:test'
import assert from 'node:assert/strict'
import { plucker, electricBass, funkGuitar, spiccatoTone, pluckTone, clankTone, clubKick, crashCymbal } from '../src/instruments.js'

const SR = 44100
// the fundamental by normalized autocorrelation over 0.15–0.45 s, refined between lags by a parabola
function pitch(gen) {
  const y = Float64Array.from({ length: SR }, () => gen())
  const a = 0.15 * SR, N = 0.3 * SR, ac = L => { let s = 0, p = 0, q = 0; for (let i = a; i < a + N; i++) (s += y[i] * y[i + L]), (p += y[i] * y[i]), (q += y[i + L] * y[i + L]); return s / Math.sqrt(p * q) } // normalized: a decaying tone does not pull the peak
  let best = 0, lag = 0
  for (let L = 15; L < 1200; L++) { const v = ac(L); if (v > best) (best = v), (lag = L) }
  for (let L = 15; L < lag; L++) { const v = ac(L); if (v > 0.9 * best && ac(L - 1) < v && ac(L + 1) <= v) { lag = L; break } }
  const p = ac(lag - 1), q = ac(lag), r = ac(lag + 1)
  return SR / (lag + (p - r) / (2 * (p - 2 * q + r)))
}
const cents = (g, f) => 1200 * Math.log2(g / f)
const freq = n => 440 * 2 ** ((n - 69) / 12)

test('the plucker is in tune to 2 cents (it was rounded to whole samples)', () => {
  for (const n of [45, 57, 64, 69, 76, 81, 84]) for (const bright of [0.5, 0.65]) {
    const p = plucker({ life: 2, decay: 0.997 })
    p.hit(freq(n), 0.7, { bright })
    const c = cents(pitch(() => p()), freq(n))
    assert.ok(Math.abs(c) < 2, `MIDI ${n}, bright ${bright}: ${c.toFixed(2)} ¢`)
  }
})
test('the electric bass and the funk guitar are in tune', () => {
  for (const n of [28, 33, 38, 43, 48]) {
    const b = electricBass()
    b.hit(freq(n), 0.8)
    const c = cents(pitch(() => b()), freq(n))
    assert.ok(Math.abs(c) < 2, `bass ${n}: ${c.toFixed(2)} ¢`)
  }
  for (const n of [52, 57, 62, 67]) {
    const g = funkGuitar()
    g.strum([freq(n)], 0.8)
    const c = cents(pitch(() => g()), freq(n))
    assert.ok(Math.abs(c) < 2, `guitar ${n}: ${c.toFixed(2)} ¢`)
  }
})
test('the new tones are finite, and the incremental voices follow the formulas', () => {
  for (const tone of [spiccatoTone, pluckTone]) {
    const v = tone.voice(220, 0.8, 0)
    let y = 0
    for (let i = 0; i <= 0.2 * SR; i++) y = v()
    assert.ok(Math.abs(y - tone(220, 0.2, 0.8)) < 0.02, `${tone.name}: ${y} vs ${tone(220, 0.2, 0.8)}`)
  }
  const k = clubKick(), c = crashCymbal()
  for (let i = 0; i < SR; i++) for (const y of [k(i / SR, 50, true), c(i / SR, true), clankTone(880, i / SR, 0.8)]) assert.ok(Number.isFinite(y))
})
