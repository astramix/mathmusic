// The studio (the instruments of the «2» styles): in tune, finite, the hall as long as asked, the sections wide
import test from 'node:test'
import assert from 'node:assert/strict'
import { TIMBRES, soloist, section, hall, ensemble, grandTone, feltTone, poly, polyWide, cymbal2, kick2, pizzTone, softPluckTone, glassBellTone } from '../src/instruments.js'

const SR = 44100
const freq = n => 440 * 2 ** ((n - 69) / 12)
// the frequency of the component near f: its phase in two windows a quarter second apart
function fundamental(y, f, from = 0.4) {
  const N = 8820, at = Math.floor(from * SR)
  const phase = o => { let a = 0, b = 0; for (let i = 0; i < N; i++) { const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N), t = (o + i) / SR; a += y[o + i] * h * Math.cos(2 * Math.PI * f * t); b -= y[o + i] * h * Math.sin(2 * Math.PI * f * t) } return Math.atan2(b, a) }
  let d = phase(at + 11025) - phase(at)
  d -= 2 * Math.PI * Math.round(d / (2 * Math.PI))
  return f + d / (2 * Math.PI * 0.25)
}
const cents = (g, f) => 1200 * Math.log2(g / f)

test('every timbre as a soloist: exactly in tune (A4 = 440), no NaN, silent when the note is over', () => {
  for (const name of Object.keys(TIMBRES)) {
    for (const n of name === 'basses' ? [36, 43] : [55, 69, 76]) {
      const s = soloist(name, { vib: 0, drift: 0 }), f = freq(n)
      const y = Float64Array.from({ length: SR }, () => s(f, true, 0.8))
      assert.ok(y.every(Number.isFinite), `${name} ${n}: finite`)
      const c = cents(fundamental(y, f), f)
      assert.ok(Math.abs(c) < 0.5, `${name} ${n}: ${c.toFixed(2)} ¢`)
      let tail = 0
      for (let i = 0; i < 8 * SR; i++) tail = s(f, false)
      assert.ok(Math.abs(tail) < 1e-4, `${name}: silent after the release`)
    }
  }
})

test('a section: the players surround the note within its few cents, the sound is wide, loud is brighter than soft', () => {
  const f = freq(69)
  for (const name of ['violins', 'horns', 'aah', 'warm']) {
    const s = section(name, { players: 6 }), L = new Float64Array(2 * SR), R = new Float64Array(2 * SR)
    for (let i = 0; i < 2 * SR; i++) [L[i], R[i]] = s([f], 0.7)
    assert.ok(L.every(Number.isFinite) && R.every(Number.isFinite), `${name}: finite`)
    const c = cents(fundamental(L, f, 1), f)
    assert.ok(Math.abs(c) < TIMBRES[name].detune + 3, `${name}: ${c.toFixed(1)} ¢ from the note`)
    let lr = 0, ll = 0, rr = 0
    for (let i = SR; i < 2 * SR; i++) { lr += L[i] * R[i]; ll += L[i] * L[i]; rr += R[i] * R[i] }
    assert.ok(lr / Math.sqrt(ll * rr) < 0.96, `${name}: the two sides differ (correlation ${(lr / Math.sqrt(ll * rr)).toFixed(2)})`)
  }
  // brightness: the energy above 2 kHz against all of it, soft and loud (a first difference stands for a high-pass)
  const high = level => {
    const s = section('violins', { players: 4 })
    let hi = 0, all = 0, prev = 0
    for (let i = 0; i < SR; i++) { const [l] = s([freq(60), freq(67)], level); if (i > SR / 2) { hi += (l - prev) ** 2; all += l * l } prev = l }
    return hi / all
  }
  assert.ok(high(0.9) > 1.3 * high(0.15), 'the loud table is brighter')
})

test('the piano: its fundamental on the note to a quarter cent, the grand brighter than the felt, eight notes across the keyboard', () => {
  for (const [label, tone] of [['grand', grandTone], ['felt', feltTone]]) for (const n of [33, 48, 60, 72, 84]) {
    const p = poly(tone, { life: 6 }), f = freq(n)
    p.hit(f, 0.8)
    const y = Float64Array.from({ length: SR }, () => p())
    assert.ok(y.every(Number.isFinite), `${label} ${n}: finite`)
    const c = cents(fundamental(y, f, 0.1), f)
    assert.ok(Math.abs(c) < 0.4, `${label} ${n}: ${c.toFixed(2)} ¢`)
  }
  const p = polyWide(grandTone)
  ;[36, 48, 60, 72, 84].forEach(n => p.hit(freq(n), 0.7))
  let lowL = 0
  const lo = polyWide(grandTone), hi = polyWide(grandTone)
  lo.hit(freq(36), 0.8)
  hi.hit(freq(84), 0.8)
  let a = 0, b = 0, c = 0, d = 0
  for (let i = 0; i < SR / 2; i++) { const [l, r] = lo(), [l2, r2] = hi(); a += l * l; b += r * r; c += l2 * l2; d += r2 * r2; lowL += p()[0] }
  assert.ok(a > b && d > c, 'low notes to the left, high ones to the right')
  assert.ok(Number.isFinite(lowL))
})

test('the hall: its tail lasts about as long as asked, both sides differ; the ensemble keeps the level', () => {
  for (const [decay, size] of [[0.9, 0.6], [2.6, 1], [5, 1.3]]) {
    const h = hall({ decay, size, wet: 1, dry: 0 }), n = Math.ceil(8 * SR), e = new Float64Array(n), q = new Float64Array(n)
    for (let i = 0; i < n; i++) [e[i], q[i]] = h(i === 0 ? 1 : 0, i === 0 ? 1 : 0)
    assert.ok(e.every(Number.isFinite), 'finite')
    const back = new Float64Array(n)
    let acc = 0
    for (let i = n - 1; i >= 0; i--) { acc += e[i] * e[i]; back[i] = acc }
    const db = i => 10 * Math.log10(back[i] / back[0] + 1e-30)
    let t5 = 0, t35 = 0
    for (let i = 0; i < n; i++) { if (!t5 && db(i) < -5) t5 = i; if (!t35 && db(i) < -35) { t35 = i; break } }
    const rt = (2 * (t35 - t5)) / SR
    assert.ok(rt > 0.6 * decay && rt < 1.4 * decay, `asked ${decay} s, measured ${rt.toFixed(2)} s`)
    let lr = 0, ll = 0, rr = 0
    for (let i = 2000; i < 2 * SR; i++) { lr += e[i] * q[i]; ll += e[i] * e[i]; rr += q[i] * q[i] }
    assert.ok(Math.abs(lr / Math.sqrt(ll * rr)) < 0.3, 'the tail is not the same in both ears')
  }
  const en = ensemble()
  let inp = 0, out = 0
  for (let i = 0; i < SR; i++) { const x = Math.sin((2 * Math.PI * 330 * i) / SR), [l, r] = en(x, x); inp += x * x; out += 0.5 * (l * l + r * r) }
  assert.ok(out / inp > 0.4 && out / inp < 2, `ensemble level ${(10 * Math.log10(out / inp)).toFixed(1)} dB`)
})

test('the studio drums and plucks: finite, not louder than full scale by much, silent when off', () => {
  for (const kind of ['hat', 'open', 'ride', 'crash', 'splash']) {
    const c = cymbal2({ kind })
    let pk = 0
    for (let i = 0; i < SR / 2; i++) { const y = c(i / SR, true); assert.ok(Number.isFinite(y)); pk = Math.max(pk, Math.abs(y)) }
    assert.ok(pk > 0.2 && pk < 1.6, `${kind}: peak ${pk.toFixed(2)}`)
    assert.equal(c(9, false), 0)
  }
  const k = kick2()
  let pk = 0
  for (let i = 0; i < SR / 2; i++) pk = Math.max(pk, Math.abs(k(i / SR, true)))
  assert.ok(pk > 0.5 && pk < 1.6, `kick peak ${pk.toFixed(2)}`)
  for (const [name, tone, n] of [['pizz', pizzTone, 40], ['pluck', softPluckTone, 72], ['bell', glassBellTone, 72]]) {
    const f = freq(n), y = Float64Array.from({ length: SR }, (_, i) => tone(f, i / SR, 0.8))
    assert.ok(y.every(Number.isFinite), name)
    const c = cents(fundamental(y, f, 0.25), f)
    assert.ok(Math.abs(c) < 2, `${name}: ${c.toFixed(2)} ¢`)
  }
})
