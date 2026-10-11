// Reusable instruments for song files.
//
// Builders (poly, strings, flute, voice, kickDrum, chorus, …) are called once inside a track's
// audio(ctx) and return a per-sample function. Pure functions (notesAt, tail, pianoTone, fm,
// improvise, …) can be used anywhere, including graph() and midi().
import { SR, floor, exp, sin, cos, tanh, TAU, PI, clamp, lerp, hz, noise, osc, filter, smooth } from './engine.js'

const η = noise(4242)
const frac = v => v - Math.floor(v)

// ---- notes, shapes, randomness -------------------------------------------------------------
// The event sounding at t in a sorted list of [start, n, d] → { n, d, τ, u, at } (u = τ/d), or null.
export function notesAt(list, t) {
  let e = null
  for (const ev of list) {
    if (ev[0] > t) break
    e = ev
  }
  return e && t - e[0] < e[2] ? { n: e[1], d: e[2], τ: t - e[0], u: (t - e[0]) / e[2], at: e[0] } : null
}

// Σ_b f(j, τ_j) over the last `count` onsets j on a grid of `rate` per beat, τ_j = x − j/rate.
export function tail(x, rate, count, f) {
  let y = 0
  const j0 = floor(rate * x)
  for (let b = 0; b < count; b++) {
    const j = j0 - b
    if (j < 0) break
    y += f(j, x - j / rate)
  }
  return y
}

// Deterministic "random" number in [0, 1) for an integer j:  frac(43758.5453·sin(12.9898j + 78.233s))
export const hash = (j, seed = 0) => frac(Math.sin(j * 12.9898 + seed * 78.233) * 43758.5453)
export const smoothstep = (a, b, u) => {
  const t = clamp((u - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
// Equal-power pan, p ∈ [−1, 1] → [left, right]
export const pan = (y, p = 0) => [y * Math.sqrt((1 - p) / 2), y * Math.sqrt((1 + p) / 2)]
// Attack/release shape of a note at progress u ∈ [0, 1]
export const env = (u, attack = 0.05, release = 0.15) => clamp(u / attack, 0, 1) * clamp((1 - u) / release, 0, 1)
// Section lookup: list [[start, name], …] → x => { name, i, t } (t = beats into the section)
export const arrangement = list => x => {
  let i = 0
  while (i + 1 < list.length && list[i + 1][0] <= x) i++
  return { name: list[i][1], i, t: x - list[i][0] }
}

// ---- envelopes & triggers -------------------------------------------------------------------
// One-pole follower with separate attack and release times (ms)
export function ar(attackMs = 5, releaseMs = 50) {
  const up = 1 - exp(-1000 / (SR * attackMs)), down = 1 - exp(-1000 / (SR * releaseMs))
  let y = 0
  return x => (y += (x > y ? up : down) * (x - y))
}
// Fires once whenever `key` (e.g. a note's start beat, x − τ) changes to a new non-null value.
export function trigger() {
  let last = null
  return key => {
    const k = key == null ? null : Math.round(key * 1e4)
    const fire = k !== null && k !== last
    last = k
    return fire
  }
}

// ---- polyphony for struck & plucked tones -----------------------------------------------------
// p.hit(f, vel, dur, delay) starts a note (dur and delay in seconds);
// p() → Σ tone(f, t, vel)·damper,  t = seconds since the hit,  damper = e^{−(t − dur)/release} once released.
// A tone may carry tone.voice(f, vel, t0) → () ⇒ sample: the same sound computed incrementally
// (sample by sample from t0), which poly() then uses instead — much faster for additive tones.
export function poly(tone, { life = 6, release = 0.15, max = 32 } = {}) {
  const notes = []
  const p = () => {
    let y = 0
    for (let i = notes.length - 1; i >= 0; i--) {
      const v = notes[i]
      v.t += 1 / SR
      if (v.t < 0) continue
      const damp = v.t > v.dur ? exp(-(v.t - v.dur) / release) : 1
      if (v.t > life || damp < 1e-3) {
        notes.splice(i, 1)
        continue
      }
      if (tone.voice) y += damp * (v.gen ??= tone.voice(v.f, v.vel, v.t))()
      else y += damp * tone(v.f, v.t, v.vel)
    }
    return y
  }
  p.hit = (f, vel = 0.8, dur = Infinity, delay = 0) => {
    notes.push({ f, vel, dur, t: -delay })
    if (notes.length > max) notes.shift()
  }
  return p
}

// Grand piano: 6 partials on two strings 1 cent apart (they beat slowly), stretched by
// inharmonicity f_k = k·f·√(1 + Bk²), each with a fast "prompt" and slow "after-sound" decay,
// a harder hit is brighter, plus the hammer's knock.
export function pianoTone(f, t, vel) {
  const B = 0.0004, a = Math.sqrt(f / 260)
  let y = 0
  for (let k = 1; k <= 6; k++) {
    const fk = k * f * Math.sqrt(1 + B * k * k)
    if (fk > 12000) break
    const d = (0.45 + 0.4 * k) * a, decay = 0.7 * exp(-d * t) + 0.3 * exp(-0.12 * d * t)
    if (decay < 1e-4) continue
    const amp = vel ** (0.4 + 0.25 * k) / k ** 1.15
    y += amp * decay * (sin(TAU * fk * t) + sin(TAU * fk * 1.0006 * t + k))
  }
  return 0.35 * y + 0.15 * vel * exp(-90 * t) * sin(TAU * 2.7 * f * t)
}
// The same piano, incrementally: every sine is a phasor turned by e^{iδ} each sample, every
// decay e^{−dt} a factor e^{−d/SR} — no sin/exp per sample (≈ 10× faster).
pianoTone.voice = (f, vel, t0) => {
  const B = 0.0004, a = Math.sqrt(f / 260), P = []
  const add = (fr, phase, amp, d1, d2, w1, w2) => {
    const th = TAU * fr * t0 + phase, de = (TAU * fr) / SR
    P.push({ s: sin(th), c: cos(th), ds: sin(de), dc: cos(de), amp, e1: w1 * exp(-d1 * t0), e2: w2 * exp(-d2 * t0), k1: exp(-d1 / SR), k2: exp(-d2 / SR) })
  }
  for (let k = 1; k <= 6; k++) {
    const fk = k * f * Math.sqrt(1 + B * k * k)
    if (fk > 12000) break
    const d = (0.45 + 0.4 * k) * a, amp = (0.35 * vel ** (0.4 + 0.25 * k)) / k ** 1.15
    add(fk, 0, amp, d, 0.12 * d, 0.7, 0.3)
    add(fk * 1.0006, k, amp, d, 0.12 * d, 0.7, 0.3)
  }
  add(2.7 * f, 0, 0.15 * vel, 90, 0, 1, 0)
  const n = P.length
  return () => {
    let y = 0
    for (let i = 0; i < n; i++) {
      const p = P[i], decay = p.e1 + p.e2
      if (decay >= 1e-4 || i === n - 1) y += p.amp * decay * p.s
      const s = p.s * p.dc + p.c * p.ds
      p.c = p.c * p.dc - p.s * p.ds
      p.s = s
      p.e1 *= p.k1
      p.e2 *= p.k2
    }
    return y
  }
}
// Rhodes: an FM tine whose brightness falls away, a metallic "bark" when hit hard, low notes ring longer
export function epianoTone(f, t, vel) {
  const I = (0.5 + 1.8 * vel * vel) * exp(-4 * t)
  const tine = sin(TAU * f * t + I * sin(TAU * f * t)) * exp(-t / (1 + 250 / f))
  const bark = 14 * f < 14000 ? 0.2 * vel * exp(-35 * t) * sin(TAU * 14 * f * t) : 0
  return vel * (tine + bark)
}
// Vibraphone: a bar (ratio 4 overtone that dies fast) — pair it with a motor tremolo
export const vibesTone = (f, t, vel) =>
  vel * exp(-t / 2.2) * (sin(TAU * f * t) + 0.3 * exp(-5 * t) * sin(TAU * 3.98 * f * t) + 0.08 * exp(-20 * t) * sin(TAU * 9.8 * f * t))
// Marimba: wooden bar, partials 1, 4, 9.9 with fast decays
export const marimbaTone = (f, t, vel) =>
  vel * exp(-t * (2 + f / 500)) * (sin(TAU * f * t) + 0.25 * exp(-12 * t) * sin(TAU * 3.93 * f * t) + 0.06 * exp(-40 * t) * sin(TAU * 9.9 * f * t))
// Upright bass: fundamental + 2nd/3rd harmonics fading faster, a finger thump
export const uprightTone = (f, t, vel) =>
  vel * (exp(-1.2 * t) * sin(TAU * f * t) + 0.45 * exp(-2.5 * t) * sin(TAU * 2 * f * t) + 0.18 * exp(-4.5 * t) * sin(TAU * 3 * f * t)
    + 0.4 * exp(-60 * t) * sin(TAU * 1.5 * f * t))
// Bell / glockenspiel / celesta (FM): e^{−λt}·sin(2πft + I·e^{−μt}·sin 2π·r·f·t)
export const fm = (f, t, { ratio = 3.5, index = 2, decay = 4, idecay = 6 } = {}) =>
  exp(-decay * t) * sin(TAU * f * t + index * exp(-idecay * t) * sin(TAU * ratio * f * t))

// Karplus–Strong strings (guitar, harp, harpsichord). p.hit(f, vel, { bright, at, pos }) plucks
// (at = delay in samples). bright ∈ (0, 1): 0.5 = nylon, 0.65 = harpsichord.
export function plucker({ life = 4, decay = 0.996 } = {}) {
  const voices = [], queue = []
  const p = () => {
    for (let i = queue.length - 1; i >= 0; i--) if (--queue[i].wait <= 0) voices.push(queue[i].make()), queue.splice(i, 1)
    let y = 0
    for (let i = voices.length - 1; i >= 0; i--) {
      y += voices[i]()
      if (--voices[i].life <= 0) voices.splice(i, 1)
    }
    return y
  }
  p.hit = (f, vel = 0.5, { bright = 0.6, at = 0, pos = 7 } = {}) => {
    const make = () => {
      const n = Math.max(2, Math.round(SR / f)), buf = new Float32Array(n), q = Math.max(1, floor(n / pos))
      for (let i = 0; i < n; i++) buf[i] = η()
      for (let i = n - 1; i >= q; i--) buf[i] = vel * (buf[i] - buf[i - q]) // pluck position comb
      let i = 0
      const s = () => {
        const a = buf[i], j = i + 1 === n ? 0 : i + 1
        buf[i] = decay * (bright * a + (1 - bright) * buf[j])
        i = j
        return a
      }
      s.life = life * SR
      return s
    }
    queue.push({ wait: at, make })
  }
  return p
}
// Guitar body: the plucked string through the top plate's resonances (≈ 100, 200, 400 Hz) plus air
export function guitarBody() {
  const bps = [filter('bp'), filter('bp'), filter('bp')], lp = filter('lp')
  return y => 0.6 * lp(y, 5000) + 0.5 * bps[0](y, 105, 4) + 0.35 * bps[1](y, 210, 4) + 0.2 * bps[2](y, 420, 3)
}

// ---- sustained instruments ---------------------------------------------------------------------
// String ensemble: s(freqs) → [l, r]. Each voice = 3 detuned saws with their own vibrato, spread
// across the stereo field, slow bow attack/release, warm low-pass. Pass [] for silence.
export function strings({ voices = 4, attack = 350, release = 800, cutoff = 3200, gain = 0.3 } = {}) {
  const bank = Array.from({ length: voices }, (_, j) => ({
    saws: [-1, 0, 1].map(u => ({ o: osc('saw', hash(3 * j + u, 5)), detune: 2 ** ((0.09 * u) / 12), rate: 4.6 + 0.8 * hash(j, u + 9) })),
    env: ar(attack, release),
    f: 220,
    pan: voices > 1 ? 0.7 * ((2 * j) / (voices - 1) - 1) : 0,
  }))
  const lp = [filter('lp'), filter('lp')], hp = [filter('hp'), filter('hp')]
  let t = 0
  return freqs => {
    t += 1 / SR
    let l = 0, r = 0
    bank.forEach((v, j) => {
      if (j < freqs.length) v.f = freqs[j]
      const a = v.env(j < freqs.length ? 1 : 0)
      if (a < 1e-4) return
      let y = 0
      for (const s of v.saws) y += s.o(v.f * s.detune * 2 ** ((0.12 * sin(TAU * s.rate * t)) / 12))
      l += a * y * Math.sqrt((1 - v.pan) / 2)
      r += a * y * Math.sqrt((1 + v.pan) / 2)
    })
    return [gain * hp[0](lp[0](l, cutoff), 120), gain * hp[1](lp[1](r, cutoff), 120)]
  }
}

// Flute: f(freq, on, vibratoDepth) → sample. Sine + soft 2nd harmonic, breath noise around the
// pitch, a "chiff" of air at each attack, vibrato 5.2 Hz that grows with the note.
export function flute({ breath = 0.06 } = {}) {
  const o1 = osc('sine'), o2 = osc('sine'), bp = filter('bp'), hp = filter('hp'), level = ar(50, 120), glide = smooth(25)
  let t = 0, held = 0
  return (f, on, vib = 1) => {
    t += 1 / SR
    held = on ? held + 1 / SR : 0
    const a = level(on ? 1 : 0), g = glide(f) * 2 ** ((0.2 * vib * Math.min(1, held / 0.6) * sin(TAU * 5.2 * t)) / 12)
    const n = η(), chiff = on ? 0.5 * exp(-25 * held) : 0
    return a * (0.6 * o1(g) + 0.1 * o2(2 * g) + breath * bp(n, 2 * g, 2) + chiff * hp(n, 3000))
  }
}

// Formant voice: v(f, F, on) → sample. A saw (+ breath) through band-passes at F = [F1, F2, F3],
// scaled by size (1.15 = small singer, 0.8 = big). rough > 0 saturates the source (growl).
export const VOWELS = { a: [800, 1150, 2900], e: [400, 2000, 2800], i: [320, 2700, 3400], o: [450, 800, 2800], u: [350, 700, 2600] }
export const blend = (A, B, m) => A.map((f, i) => lerp(f, B[i], m))
export function voice({ size = 1, breath = 0.05, rough = 0, Q = [6, 9, 12], gain = [1, 0.55, 0.3] } = {}) {
  const o = osc('saw'), bps = Q.map(() => filter('bp')), level = smooth(5)
  return (f, F, on) => {
    let src = o(f) + breath * η()
    if (rough) src = tanh((1 + rough) * src)
    let y = 0
    for (let i = 0; i < 3; i++) y += (gain[i] / Q[i]) * bps[i](src, F[i] * size, Q[i])
    return level(on) * y
  }
}

// The meow (see songs/meow.js): pitch arc β(u) = 3sin(πu^0.7) − 2u², vowel i → a → u, lips opening.
// c(n, u, t, base) → sample; n semitones from base (F5), u ∈ [0,1] through the meow or null (silent).
export const meowBend = u => 3 * sin(PI * u ** 0.7) - 2 * u * u
export function meower({ size = 1, rough = 0 } = {}) {
  const I = [450, 2700, 3800], A = [1100, 1800, 3600], U = [550, 1000, 3300]
  const v = voice({ size, rough, breath: 0, Q: [5, 9, 12], gain: [1, 0.6, 0.25] }), lip = filter('lp')
  return (n, u, t, base = 698.46) => {
    const w = u ?? 1, vib = 0.35 * Math.min(1, 2 * w) ** 2 * sin(TAU * 6 * t)
    const F = blend(blend(I, A, smoothstep(0.15, 0.5, w)), U, smoothstep(0.6, 1, w))
    const mouth = (350 + 7500 * smoothstep(0, 0.18, w)) * (1 - 0.75 * smoothstep(0.7, 1, w))
    return 1.4 * lip(v(hz((n ?? 0) + meowBend(w) + vib, base), F, u == null ? 0 : env(w, 0.08, 0.12)), mouth)
  }
}

// Bowed string (solo violin, cello): b(note, t) with note = { n, d, τ } (or null), t in seconds.
export function bowed({ base, body = 1, phase = 0, sec = 0.75 } = {}) {
  const o = osc('saw', phase), gate = smooth(25), glide = smooth(10), lp = filter('lp')
  const RES = [300, 520, 1100, 2700], RQ = [3, 4, 3, 2], RG = [1, 0.8, 0.6, 0.5], bps = RES.map(() => filter('bp'))
  let n = 0
  return (note, t) => {
    if (note) n = note.n
    const on = note && note.τ < note.d - Math.min(0.1, 0.08 * note.d) ? 1 : 0
    const vib = 0.18 * Math.min(1, (note ? note.τ * sec : 0) / 0.4) * sin(TAU * 5.6 * t)
    const src = o(glide(hz(n + vib, base))) + 0.04 * η()
    let y = 0.3 * lp(src, 4500 * body)
    for (let i = 0; i < 4; i++) y += (RG[i] / RQ[i]) * bps[i](src, RES[i] * body, RQ[i])
    return gate(on) * y
  }
}

// ---- chiptune -------------------------------------------------------------------------------
// Pulse wave of a given duty: saw(φ) − saw(φ + duty)
export function pulse(duty = 0.5) {
  const a = osc('saw', 0), b = osc('saw', duty)
  return f => 0.5 * (a(f) - b(f))
}
// 4-bit "NES" triangle: the triangle quantised to 16 steps
export function triangle4() {
  let p = 0
  return f => {
    p = (p + f / SR) % 1
    return floor(8 * (p < 0.5 ? 4 * p - 1 : 3 - 4 * p)) / 8
  }
}
// NES noise channel: a 15-bit LFSR clocked at `rate` Hz, bit = b0 ⊕ b1 (b0 ⊕ b6 for "metal")
export function lfsr({ metal = false } = {}) {
  let s = 1, acc = 0
  return rate => {
    acc += rate / SR
    while (acc >= 1) {
      acc -= 1
      const bit = (s ^ (s >> (metal ? 6 : 1))) & 1
      s = (s >> 1) | (bit << 14)
    }
    return s & 1 ? 1 : -1
  }
}
// Volume in 16 steps, like a 4-bit chip register
export const vol4 = v => floor(15 * clamp(v, 0, 1)) / 15

// ---- drums (τ = beats since the hit, t = seconds since the hit) ---------------------------------
// Kick: e^{−kτ}·tanh(drive·sin 2π∫(f0 + f1·e^{−sweep·τ})); resets its phase on every new hit.
export function kickDrum({ f0 = 48, f1 = 200, sweep = 40, decay = 6, drive = 1.4 } = {}) {
  const o = osc('sine')
  let last = Infinity
  return (τ, on = true) => {
    if (τ < last) o.reset()
    last = τ
    return on ? exp(-decay * τ) * tanh(drive * o(f0 + f1 * exp(-sweep * τ))) : 0
  }
}
// Snare: 0.6e^{−kt}·HP(η) + 0.4e^{−2kt}·sin 2π·tone·t
export function snareDrum({ tone = 190, cutoff = 600, decay = 12 } = {}) {
  const hp = filter('hp')
  return (t, on = true) => {
    const n = hp(η(), cutoff)
    return on ? 0.6 * exp(-decay * t) * n + 0.4 * exp(-2 * decay * t) * sin(TAU * tone * t) : 0
  }
}
// Clap: three bursts 12 ms apart and a tail, band-passed around 1.5 kHz
export function clapDrum({ center = 1500 } = {}) {
  const bp = filter('bp')
  return (t, on = true) => {
    let e = 0.5 * exp(-18 * t)
    for (let m = 0; m < 3; m++) if (t >= 0.012 * m) e += exp(-300 * (t - 0.012 * m))
    const n = bp(η(), center, 1)
    return on ? e * n : 0
  }
}
// 808 metal: six square waves at inharmonic frequencies — the raw sound of hats, rides, cowbells
export function metal(scale = 1) {
  const F = [205.3, 304.4, 369.6, 522.7, 540, 800], os = F.map(() => osc('square'))
  return () => {
    let y = 0
    for (let i = 0; i < 6; i++) y += os[i](F[i] * scale)
    return y / 6
  }
}
// Hi-hat (decay ≈ 60 closed, 10 open) / ride (decay ≈ 3, cutoff 5000): metal + a little noise, high-passed
export function hatDrum({ cutoff = 7000, decay = 60, ring = 0.7 } = {}) {
  const m = metal(), bp = filter('bp'), hp = filter('hp')
  return (t, on = true) => {
    const s = hp(ring * bp(m(), 10000, 0.7) + (1 - ring) * η(), cutoff)
    return on ? exp(-decay * t) * s : 0
  }
}
// Cross-stick / rimshot: a woody 1.7 kHz knock with a click
export function rimDrum() {
  const bp = filter('bp')
  return (t, on = true) => {
    const n = bp(η(), 2500, 2)
    return on ? exp(-60 * t) * (0.6 * sin(TAU * 1700 * t) + 0.4 * sin(TAU * 560 * t)) + exp(-120 * t) * n : 0
  }
}
// Brush: a swish of band-passed noise; w(t, level) with level following the brush stroke
export function brushDrum() {
  const bp = filter('bp'), lp = filter('lp')
  return level => level * lp(bp(η(), 3500, 0.7), 8000)
}
// Shaker: noise band around 6 kHz, attack a little slower than a hat
export function shakerDrum() {
  const bp = filter('bp')
  return (t, on = true) => {
    const n = bp(η(), 6500, 1.2)
    return on ? (1 - exp(-400 * t)) * exp(-35 * t) * n : 0
  }
}

// ---- textures -----------------------------------------------------------------------------
// Vinyl: hiss plus sparse crackles
export function vinyl({ hiss = 0.01, crackle = 0.25 } = {}) {
  const lp = filter('lp'), hp = filter('hp')
  return () => {
    const n = η(), c = Math.abs(η()) > 0.9998 ? crackle * η() : 0
    return hiss * lp(n, 5000) + hp(c, 1000)
  }
}
// Rain: a wash of filtered noise and drops (short sine "plinks" 1.5–4 kHz at random moments) → [l, r]
export function rain({ wash = 0.05, drops = 0.15, density = 0.0004 } = {}) {
  const lp = [filter('lp'), filter('lp')], hp = [filter('hp'), filter('hp')], ds = []
  return () => {
    if (Math.abs(η()) < density) ds.push({ f: 1500 + 2500 * Math.abs(η()), t: 0, p: η(), a: 0.3 + 0.7 * Math.abs(η()) })
    let dl = 0, dr = 0
    for (let i = ds.length - 1; i >= 0; i--) {
      const d = ds[i]
      d.t += 1 / SR
      const y = d.a * exp(-60 * d.t) * sin(TAU * d.f * (1 + 2 * d.t) * d.t)
      dl += y * (1 - d.p) / 2
      dr += y * (1 + d.p) / 2
      if (d.t > 0.15) ds.splice(i, 1)
    }
    return [wash * hp[0](lp[0](η(), 6000), 400) + drops * dl, wash * hp[1](lp[1](η(), 6000), 400) + drops * dr]
  }
}

// ---- effects --------------------------------------------------------------------------------
function line(seconds) {
  const n = Math.ceil(seconds * SR) + 4, b = new Float32Array(n)
  let w = 0
  return {
    write(v) {
      b[w] = v
      w = w + 1 === n ? 0 : w + 1
    },
    read(d) { // d = delay in samples (≥ 1), linear interpolation
      let p = w - 1 - d
      while (p < 0) p += n
      const i = floor(p), f = p - i
      return b[i] + (b[i + 1 === n ? 0 : i + 1] - b[i]) * f
    },
  }
}
// Stereo chorus (Juno-style): each side delayed 15 ms ± depth, LFOs 90° apart
export function chorus({ rate = 0.5, depth = 0.003, base = 0.015, mix = 0.5 } = {}) {
  const L = line(base + depth + 0.01), R = line(base + depth + 0.01)
  let ph = 0
  return (l, r) => {
    ph += rate / SR
    L.write(l)
    R.write(r)
    const wl = L.read((base + depth * sin(TAU * ph)) * SR), wr = R.read((base + depth * cos(TAU * ph)) * SR)
    return [l * (1 - 0.5 * mix) + mix * wl, r * (1 - 0.5 * mix) + mix * wr]
  }
}
// Tape: wow & flutter (a delay wobbling at 0.5 Hz and 6.5 Hz bends the pitch a few cents),
// gentle saturation and the high end rolled off
export function tape({ wow = 0.0012, flutter = 0.00012, drive = 1.3, tone = 9000 } = {}) {
  const L = line(0.01), R = line(0.01), lp = [filter('lp'), filter('lp')]
  let t = 0
  return (l, r) => {
    t += 1 / SR
    L.write(l)
    R.write(r)
    const d = (0.004 + wow * (1 + sin(TAU * 0.5 * t)) + flutter * (1 + sin(TAU * 6.5 * t))) * SR
    const s = v => tanh(drive * v) / drive
    return [lp[0](s(L.read(d)), tone), lp[1](s(R.read(d)), tone)]
  }
}

// ---- composition -------------------------------------------------------------------------------
// improvise(opts) → note events [beat, n, d] for a solo, deterministic for a given seed.
//   A walk over the notes of scale(x) (pitch classes) between lo and hi, steps of ±1/±2 scale
//   notes pulled toward a phrase arch c(t) = mid + span·sin(πt/phrase); notes on the beat snap to
//   chord(x) tones; the last `breathe` beats of every phrase rest; some notes are held longer.
export function improvise({ start, length, rate = 2, seed = 1, scale, chord, lo, hi, phrase = 8, rest = 0.2, breathe = 1.5, hold = 0.3, swing = 0.5 }) {
  const mid = (lo + hi) / 2, span = (hi - lo) / 3, events = []
  const inScale = (pcs, n) => pcs.includes(((n % 12) + 12) % 12)
  let n = Math.round(mid)
  for (let j = 0; j < length * rate; j++) {
    const b = j / rate, x = start + b, local = b % phrase
    if (local >= phrase - breathe || hash(j, seed) < rest) continue
    const off = j % 2 === 1 && rate === 2 ? swing - 0.5 : 0 // swung off-beat eighths, in beats
    const target = mid + span * sin((PI * local) / phrase) * (hash(floor(b / phrase), seed + 7) < 0.5 ? 1 : -0.6)
    const cands = []
    for (let m = lo; m <= hi; m++) if (inScale(scale(x), m)) cands.push(m)
    let i = cands.reduce((best, m, k) => (Math.abs(m - n) < Math.abs(cands[best] - n) ? k : best), 0)
    const step = [1, 1, 2, 1, 2, 3][floor(hash(j, seed + 1) * 6)] * (cands[i] > target ? -1 : 1) * (hash(j, seed + 2) < 0.75 ? 1 : -1)
    i = clamp(i + step, 0, cands.length - 1)
    n = cands[i]
    if (j % rate === 0) {
      const tones = cands.filter(m => chord(x).includes(((m % 12) + 12) % 12))
      if (tones.length) n = tones.reduce((a, m) => (Math.abs(m - n) < Math.abs(a - n) ? m : a))
    }
    const d = hash(j, seed + 3) < hold ? 2 / rate : 1 / rate
    events.push([x + off, n, d * 0.95])
  }
  // overlapping holds are cut by the next note
  for (let k = 0; k + 1 < events.length; k++) events[k][2] = Math.min(events[k][2], events[k + 1][0] - events[k][0])
  return events
}
