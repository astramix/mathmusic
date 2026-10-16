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

// ---- hardstyle --------------------------------------------------------------------------------
// Hardstyle kick: k(t, f) with t = seconds since the hit, f = the tail's pitch (tune it to the key).
//   pitch f·(1 + 30e^{−t/4ms} + 2e^{−t/30ms}) falls onto f and holds until `tail` s, then bends down
//   `drop` semitones while it fades (the "tok"); two drive stages: an asymmetric tanh (even harmonics,
//   the fat) → LP → tanh again (the punch); a click of noise on top and a clean sine sub under it.
//   crush = N holds every N-th sample (8-bit grit: 44100/N Hz).
export function hardKick({ tail = 0.3, drop = 7, drive = 7, bias = 0.3, tone = 5000, sub = 0.5, crush = 0 } = {}) {
  const o = osc('sine'), s = osc('sine'), lp = filter('lp'), hp = filter('hp'), dc = filter('hp')
  let last = Infinity, held = 0, k = 0
  return (t, f, on = true) => {
    if (t < last) (o.reset(), s.reset())
    last = t
    const bend = t > tail ? 2 ** ((-drop * clamp((t - tail) / 0.12, 0, 1)) / 12) : 1
    const a = on ? clamp((tail + 0.1 - t) / 0.1, 0, 1) : 0
    const body = a * o(f * bend * (1 + 30 * exp(-t / 0.004) + 2 * exp(-t / 0.03)))
    let y = dc(tanh(drive * (body + bias)) - tanh(drive * bias), 25)
    y = tanh(2.2 * lp(y, tone, 0.9))
    if (crush && ++k >= crush) (k = 0), (held = y)
    if (crush) y = held
    const n = hp(η(), 3000), click = on ? exp(-t / 0.0015) * n : 0
    return 0.8 * y + 0.5 * click + sub * a * s(f * bend)
  }
}
// Reverse bass: r(u, f) with u ∈ [0, 1) the progress through the swell (null = silent).
//   volume u², two detuned saws + a sine at f driven into tanh, low-pass opening 150 → 150·2^{open} Hz
export function reverseBass({ drive = 4, open = 4, q = 1.2 } = {}) {
  const a = osc('saw'), b = osc('saw', 0.37), s = osc('sine'), lp = filter('lp'), dc = filter('hp'), g = smooth(2)
  return (u, f) => {
    const on = u != null && u >= 0 && u < 1
    const e = g(on ? u * u * clamp((1 - u) / 0.04, 0, 1) : 0)
    const y = tanh(drive * e * (0.4 * a(f) + 0.4 * b(f * 1.006) + 0.8 * s(f)))
    return dc(lp(y, 150 * 2 ** (open * (on ? u : 0)), q), 25)
  }
}
// Sidechain pump: gain after a kick t seconds ago — dips by `depth` and comes back over `release` s
export const duck = (t, depth = 0.7, release = 0.18) => 1 - depth * clamp(1 - t / release, 0, 1) ** 2

// ---- Japan ----------------------------------------------------------------------------------------
// A plucked string whose pitch may move: y[n] = e[n] + g·(a·y[n − D] + (1 − a)·y[n − D − 1]), D = SR/f(t) minus
// the loop filter's phase delay, so the pitch is exact (A4 = 440) at every moment of a bend. e = the pluck, a
// noise burst one period long, low-passed by the brightness and combed at the plucking point. g = 10^{−3/(f·T60)}.
//   from: semitones the note slides in from (suri-age), glide s;  bend: semitones pressed in after bendAt s over
//   bendTime s (koto oshide), back: s when the press lets go;  tension: the pitch rises while the string is loud;
//   sawari: the bridge shortens the string on one side of its swing (the buzz of shamisen and biwa).
function stringVoice(f, vel, η, o) {
  const { bright = 0.6, sustain = 3, from = 0, glide = 0.06, bend = 0, bendAt = 0.3, bendTime = 0.12, back = 0, pos = 0.14, sawari = 0, tension = 0, at = 0, life = 6 } = o
  const low = f * 2 ** (Math.min(0, from, bend) / 12) / (1 + 2 * tension)
  const n = Math.ceil(SR / low) + 4, buf = new Float32Array(n)
  const P = Math.max(2, Math.round(SR / f)), ex = new Float32Array(P), q = Math.max(1, Math.round(P * pos))
  const c = clamp(0.12 + 0.8 * bright * (0.55 + 0.45 * vel), 0.05, 1)
  let s = 0, peak = 1e-9
  for (let i = 0; i < P; i++) ex[i] = s += c * (η() - s)
  for (let i = P - 1; i >= q; i--) ex[i] -= ex[i - q]
  for (let i = 0; i < P; i++) peak = Math.max(peak, Math.abs(ex[i]))
  for (let i = 0; i < P; i++) ex[i] *= vel / peak
  const T60 = sustain * Math.sqrt(220 / f), a = 0.5 + 0.45 * bright
  const loss = fr => 10 ** (-3 / (fr * T60)), delayOf = fr => {
    const ω = (TAU * fr) / SR
    return SR / fr - Math.atan2((1 - a) * sin(ω), a + (1 - a) * cos(ω)) / ω
  }
  const g0 = loss(f), D0 = delayOf(f), moving = from || bend
  let w = 0, k = -Math.round(at), prev = 0, last = 0, env = 0, mute = 1
  const v = () => {
    if (k < 0) return (k++, 0)
    const t = k / SR
    let D = D0, g = g0
    if (moving) {
      let st = 0
      if (from) st += from * (1 - smoothstep(0, glide, t))
      if (bend) st += bend * (smoothstep(bendAt, bendAt + bendTime, t) - (back ? smoothstep(back, back + bendTime, t) : 0))
      if (st) {
        const fr = f * 2 ** (st / 12)
        D = delayOf(fr)
        g = loss(fr)
      }
    }
    if (tension) D /= 1 + tension * env
    if (sawari) D *= 1 - sawari * Math.max(0, last)
    let p = w - D
    if (p < 0) p += n
    const i = floor(p), i1 = i + 1 === n ? 0 : i + 1, r = buf[i] + (buf[i1] - buf[i]) * (p - i)
    const y = g * mute * (a * r + (1 - a) * prev) + (k < P ? ex[k] : 0)
    prev = r
    buf[w] = y
    w = w + 1 === n ? 0 : w + 1
    env += 0.002 * (Math.abs(y) - env)
    last = y
    if (v.muting) mute = v.muting
    k++
    v.done = k > life * SR || (k > 0.3 * SR && env < 2e-5)
    return y
  }
  v.t = () => k / SR
  // a finger on the string: from now on it dies within ~τ seconds
  v.mute = (τ = 0.03) => (v.muting = Math.exp(-1 / (f * τ)))
  return v
}
// A set of strings plucked one after another: p() → [string, attack] sums; hits may be delayed (at, in samples).
function stringSet(defaults, { mono = false, max = 8, seed = 7 } = {}) {
  const η = noise(seed), voices = []
  const p = () => {
    let y = 0, atk = 0
    for (let i = voices.length - 1; i >= 0; i--) {
      const v = voices[i]
      y += v.s()
      const t = v.s.t()
      if (t > 0 && t < 0.05) atk += v.vel * η() * exp(-t / v.click) + v.vel * v.thump * sin(TAU * v.tf * t) * exp(-t / 0.025)
      if (v.s.done) voices.splice(i, 1)
    }
    return [y, atk]
  }
  p.hit = (f, vel = 0.7, o = {}) => {
    const opts = { ...defaults, ...o }
    if (mono && !o.keep) for (const v of voices) v.s.mute(0.025)
    voices.push({ s: stringVoice(f, vel, η, opts), vel, click: opts.click ?? 0.004, thump: opts.thump ?? 0, tf: opts.thumpHz ?? 180 })
    if (voices.length > max) voices.shift()
  }
  p.mute = τ => voices.forEach(v => v.s.mute(τ))
  return p
}
// Shamisen: three silk strings over a skin. The big bachi slaps the skin with every note (a crack of noise
// and a thump), sawari makes the low string buzz, the skin's resonances (≈ 450, 1800, 3200 Hz) give the
// nasal bite. Monophonic like a melody on one string; s.hit(f, vel, { from, bend, keep }) — keep = a double stop.
export function shamisen({ sawari = 0.012, sustain = 2.2, bright = 0.82, slap = 0.5, seed = 11 } = {}) {
  const set = stringSet({ bright, sustain, sawari, tension: 0.012, pos: 0.09, click: 0.005, thump: 0.5, thumpHz: 210 }, { mono: true, max: 4, seed })
  const hp = filter('hp'), b1 = filter('bp'), b2 = filter('bp'), b3 = filter('bp'), sb = filter('bp')
  const s = () => {
    const [y, atk] = set(), x = hp(y, 140)
    return 0.45 * x + 1.1 * b1(x, 450, 1.4) + 0.75 * b2(x, 1800, 2.2) + 0.35 * b3(x, 3200, 3) + slap * sb(atk, 1700, 0.8)
  }
  s.hit = set.hit
  s.mute = set.mute
  return s
}
// Koto: thirteen silk strings on movable bridges, plucked with ivory picks (tsume) — a bright "chin" click;
// a long paulownia body (≈ 210, 650 Hz). Strings ring on; oshide = hit(f, vel, { bend: 1 or 2, bendAt }).
export function koto({ sustain = 3.2, bright = 0.72, click = 0.35, seed = 13 } = {}) {
  const set = stringSet({ bright, sustain, sawari: 0.002, tension: 0.006, pos: 0.12, click: 0.0025 }, { max: 10, seed })
  const lp = filter('lp'), b1 = filter('bp'), b2 = filter('bp'), ch = filter('hp')
  const k = () => {
    const [y, atk] = set()
    return 0.75 * lp(y, 6500) + 0.7 * b1(y, 210, 1.8) + 0.4 * b2(y, 650, 2.4) + click * ch(atk, 2500)
  }
  k.hit = set.hit
  k.mute = set.mute
  return k
}
// Biwa: the lute of the tale-singers — four strings, high frets, a lot of sawari, a heavy bachi on a wooden
// face: dark (≈ 300, 1100 Hz), buzzing, with a hard knock.
export function biwa({ sawari = 0.02, sustain = 2.2, bright = 0.6, seed = 17 } = {}) {
  const set = stringSet({ bright, sustain, sawari, tension: 0.015, pos: 0.11, click: 0.006, thump: 0.8, thumpHz: 140 }, { mono: true, max: 4, seed })
  const lp = filter('lp'), b1 = filter('bp'), b2 = filter('bp'), sb = filter('bp'), hp = filter('hp')
  const b = () => {
    const [y, atk] = set(), x = hp(y, 70)
    return 0.6 * lp(x, 3500) + 1.0 * b1(x, 300, 1.5) + 0.45 * b2(x, 1100, 2) + 0.6 * sb(atk, 900, 0.9)
  }
  b.hit = set.hit
  b.mute = set.mute
  return b
}

// Shakuhachi: the end-blown bamboo flute — a lot of breath (noise around f and 2f), a soft fundamental, the
// note entered from below (meri: −0.7 semitone rising in 0.14 s), a breath burst on accents (muraiki), the
// head-shaking vibrato (yuri, 4.6 Hz, ±0.3 semitone) that only comes on long notes.
// sh(f, on, { accent 0–1, vib }) → sample; a new pitch while on = a new note.
export function shakuhachi({ breath = 0.16, scoop = 0.7, seed = 19 } = {}) {
  const η = noise(seed), o1 = osc('sine'), o2 = osc('sine'), o3 = osc('sine')
  const bA = filter('bp'), bB = filter('bp'), hp = filter('hp'), level = ar(60, 160), glide = smooth(18)
  let t = 0, held = 0, cur = 0, acc = 0
  return (f, on, { accent = 0, vib = 1 } = {}) => {
    t += 1 / SR
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f), (acc = accent)
    held = on ? held + 1 / SR : 0
    const meri = on ? -scoop * (1 - smoothstep(0, 0.14, held)) : 0
    const yuri = vib * 0.3 * smoothstep(0.35, 0.9, held) * sin(TAU * 4.6 * t)
    const g = glide(cur || f) * 2 ** ((meri + yuri) / 12)
    const a = level(on ? 1 : 0), n = η()
    const tone = 0.62 * o1(g) + 0.15 * o2(2 * g) + 0.06 * o3(3 * g)
    const burst = on ? (0.3 + acc) * exp(-held / 0.07) : 0
    const air = breath * (bA(n, g, 3) + 0.5 * bB(n, 2 * g, 4)) + 0.3 * burst * hp(n, 1500)
    return a * ((0.85 + 0.15 * smoothstep(0, 0.6, held)) * tanh(1.2 * tone) + air)
  }
}
// Shinobue: the festival flute — high, bright, a chiff of air on every note, a quick small vibrato.
export function shinobue({ breath = 0.05, seed = 23 } = {}) {
  const η = noise(seed), os = [1, 2, 3, 4].map(() => osc('sine')), bp = filter('bp'), hp = filter('hp'), level = ar(15, 90), glide = smooth(8)
  let t = 0, held = 0, cur = 0
  return (f, on, { vib = 1 } = {}) => {
    t += 1 / SR
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f)
    held = on ? held + 1 / SR : 0
    const g = glide(cur || f) * 2 ** ((vib * 0.15 * smoothstep(0.25, 0.6, held) * sin(TAU * 5.8 * t)) / 12)
    const a = level(on ? 1 : 0), n = η()
    const tone = 0.55 * os[0](g) + 0.28 * os[1](2 * g) + 0.15 * os[2](3 * g) + 0.05 * os[3](4 * g)
    return a * (tone + breath * bp(n, 2 * g, 3) + (on ? 0.4 * exp(-held / 0.03) : 0) * hp(n, 4000))
  }
}

// Taiko: d(t, on) with t in seconds since the hit. The skin's modes f·(1, 1.52, 1.98, 2.46, 2.92), each decaying
// faster than the one below, start a little sharp and sink onto the pitch (tension: +bend semitones falling
// in 30 ms); the bachi cracks (high-passed noise), the barrel booms (noise around f). Odaiko ≈ 60–90 Hz with a
// long decay; nagado ≈ 110–150 Hz; shime-daiko ≈ 350–450 Hz, short and crisp.
export function taikoDrum({ pitch = 90, decay = 0.9, bend = 3, crack = 0.35, boom = 0.3, drive = 1.4, seed = 29 } = {}) {
  const η = noise(seed), hp = filter('hp'), bp = filter('bp'), lp = filter('lp')
  const R = [1, 1.52, 1.98, 2.46, 2.92], A = [1, 0.45, 0.28, 0.16, 0.1], K = [1, 1.7, 2.4, 3.2, 4]
  const gl = 2 ** (bend / 12) - 1, τg = 0.03
  return (t, on = true) => {
    const n = η(), c = hp(n, 1800), b = bp(n, pitch, 2.5)
    if (!on || t > 6 * decay) return (lp(0, 3000), 0)
    const ph = TAU * pitch * (t + gl * τg * (1 - exp(-t / τg)))
    let y = 0
    for (let k = 0; k < 5; k++) y += A[k] * exp((-t * K[k] * 2.6) / decay) * sin(R[k] * ph)
    y += crack * exp(-t / 0.004) * c + boom * exp(-t / (0.35 * decay)) * b
    return tanh(drive * lp(y, 3000)) / tanh(drive)
  }
}
// Kotsuzumi: the shoulder drum — a "pon" whose pitch the player bends by squeezing the cords (bend semitones)
export const kotsuzumi = ({ pitch = 280, bend = -4, seed = 31 } = {}) => taikoDrum({ pitch, decay: 0.28, bend, crack: 0.25, boom: 0.15, drive: 1.1, seed })
// Hyoshigi / the rim of a taiko ("ka"): two hard woods — 2.3 and 3.6 kHz ringing a few ms, and a click
export function woodClack({ f = 2300, seed = 37 } = {}) {
  const η = noise(seed), bp = filter('bp')
  return (t, on = true) => {
    const n = bp(η(), 3000, 1.5)
    return on && t < 0.2 ? exp(-t / 0.012) * (0.6 * sin(TAU * f * t) + 0.4 * sin(TAU * 1.56 * f * t)) + 0.8 * exp(-t / 0.002) * n : 0
  }
}
// Atarigane (kane): the small hand gong of the festival — partials 1, 2.32, 3.86, 5.81 of ≈ 1250 Hz; damp = a
// muted "chiki" instead of an open "chan"
export function kaneDrum({ f = 1250, decay = 0.7 } = {}) {
  const R = [1, 2.32, 3.86, 5.81], A = [1, 0.7, 0.45, 0.3]
  return (t, on = true, damp = false) => {
    if (!on || t > 4 * decay) return 0
    const d = damp ? 0.06 : decay
    let y = 0
    for (let k = 0; k < 4; k++) y += A[k] * exp((-t * (1 + k)) / d) * sin(TAU * R[k] * f * t)
    return 0.4 * y
  }
}
// Temple bell (bonshō): hum ½f, prime f, a minor-third tierce 1.2f, quint 1.5f, nominal 2f, … each partial a
// beating pair (±0.075 %), the low ones ringing for many seconds; a strike transient on top
export function templeBellTone(f, t, vel = 1) {
  const R = [0.5, 1, 1.2, 1.5, 2, 2.52, 3.01], A = [0.8, 1, 0.6, 0.3, 0.45, 0.2, 0.15], T = [9, 6, 4, 3, 2.5, 1.5, 1]
  let y = 0
  for (let k = 0; k < 7; k++) {
    const e = exp(-t / T[k])
    if (e < 1e-4) continue
    y += A[k] * e * (sin(TAU * R[k] * f * 0.99925 * t) + 0.7 * sin(TAU * R[k] * f * 1.00075 * t + k))
  }
  return 0.3 * vel * (y + 0.6 * exp(-t / 0.01) * sin(TAU * 4.3 * f * t))
}
// Kakegoe: the drummers' shouts — 'yo' ("iyooo": i → o, the pitch rising then falling), 'ha' (a breath, then a
// falling "a"), 'sa' (a hiss, then "a"). k(word, t seconds since the shout, on) → sample.
export function kakegoe({ size = 0.85, pitch = 165, seed = 41 } = {}) {
  const η = noise(seed), v = voice({ size, breath: 0.12, rough: 0.6 }), hp = filter('hp'), bp = filter('bp')
  const I = VOWELS.i, O = VOWELS.o, Aa = VOWELS.a
  return (word, t, on = true) => {
    const n = η(), h = hp(n, 1500), s = bp(n, 6000, 2)
    if (!on || t > 1) return v(pitch, Aa, 0)
    if (word === 'yo') {
      const st = 7 * sin(PI * Math.min(1, t / 0.6)) - 6 * smoothstep(0.35, 0.8, t)
      return 1.4 * v(pitch * 2 ** (st / 12), blend(I, O, smoothstep(0.05, 0.16, t)), env(t / 0.8, 0.05, 0.3))
    }
    const st = 4 - 7 * smoothstep(0.05, 0.3, t), body = 1.4 * v(pitch * 1.3 * 2 ** (st / 12), Aa, t > 0.05 ? env((t - 0.05) / 0.3, 0.1, 0.4) : 0)
    return body + (word === 'sa' ? 0.5 * exp(-t / 0.04) * s : 0.6 * exp(-t / 0.05) * h)
  }
}

// ---- orchestra ---------------------------------------------------------------------------------------
// Timpani: the kettle's modes 1, 1.5, 1.98, 2.44, 2.94 (the air in the kettle tunes them almost harmonic, so
// the drum has a pitch) and an inharmonic 1.65; the head starts a little sharp; the felt mallet's thump.
// Pure (f, t, vel), for poly(); low notes ring longer.
export function timpaniTone(f, t, vel = 0.8) {
  const R = [1, 1.5, 1.98, 2.44, 2.94, 1.65], A = [1, 0.5, 0.32, 0.18, 0.1, 0.12], K = [1, 1.4, 1.9, 2.6, 3.3, 6]
  const d = 1.3 * Math.sqrt(f / 100), ph = TAU * f * (t + 0.01 * 0.05 * (1 - exp(-t / 0.05)))
  let y = 0
  for (let k = 0; k < 6; k++) y += A[k] * vel ** (0.6 + 0.3 * k) * exp(-t * K[k] * d) * sin(R[k] * ph)
  return 0.6 * y + 0.35 * vel * exp(-t / 0.006) * sin(TAU * 0.7 * f * t)
}
// Harp: 10 partials of a string plucked at 1/7 of its length with the fingertip (soft: the highs weaker on soft
// notes), each dying faster than the one below; a 3 ms rise. Pure (f, t, vel) for poly(), and incremental.
export function harpTone(f, t, vel = 0.7) {
  const d = 0.4 * Math.sqrt(f / 220)
  let y = 0
  for (let k = 1; k <= 10; k++) {
    if (k * f > 10000) break
    const e = exp(-t * d * (1 + 0.35 * k ** 1.3))
    if (e < 1e-4) continue
    y += (Math.abs(sin((PI * k) / 7)) / k ** 1.4) * vel ** (0.3 + 0.12 * k) * e * sin(TAU * k * f * t)
  }
  return 0.55 * Math.min(1, t / 0.003) * y
}
harpTone.voice = (f, vel, t0) => {
  const d = 0.4 * Math.sqrt(f / 220), P = []
  for (let k = 1; k <= 10; k++) {
    if (k * f > 10000) break
    const dk = d * (1 + 0.35 * k ** 1.3), th = TAU * k * f * t0, de = (TAU * k * f) / SR
    P.push({ s: sin(th), c: cos(th), ds: sin(de), dc: cos(de), e: (0.55 * Math.abs(sin((PI * k) / 7)) / k ** 1.4) * vel ** (0.3 + 0.12 * k) * exp(-dk * t0), q: exp(-dk / SR) })
  }
  let t = t0
  return () => {
    let y = 0
    for (const p of P) {
      y += p.e * p.s
      const s = p.s * p.dc + p.c * p.ds
      p.c = p.c * p.dc - p.s * p.ds
      p.s = s
      p.e *= p.q
    }
    t += 1 / SR
    return Math.min(1, t / 0.003) * y
  }
}
// Celesta: hammered steel bars over wooden resonators — an almost pure tone, a 4th partial that dies fast,
// a tiny "tink"
export const celestaTone = (f, t, vel = 0.7) =>
  vel * exp(-t * (1.2 + f / 900)) * (sin(TAU * f * t) + 0.25 * exp(-9 * t) * sin(TAU * 4 * f * t) + 0.08 * vel * exp(-60 * t) * sin(TAU * 9.2 * f * t)) * Math.min(1, t / 0.002)

// Pipe organ: o(freqs) → [l, r]. Every key opens one pipe per stop (ratios: 1 = 8′, 2 = 4′, 3 = 2⅔′, 4 = 2′, …),
// the ranks a cent apart and spread across the case, a "chiff" of air when a pipe speaks, wind ramping in.
export function organ({ voices = 4, stops = [[1, 1], [2, 0.5], [3, 0.18], [4, 0.25]], chiff = 0.25, gain = 0.12, seed = 43 } = {}) {
  const η = noise(seed)
  const bank = Array.from({ length: voices }, (_, j) => ({
    pipes: stops.map(([r, a], i) => ({ o: osc('sine', hash(j * 7 + i, 3)), r: r * 2 ** ((i % 2 ? 1 : -1) * 0.0008), a, p: 0.6 * Math.sin(1.7 * i + j) })),
    env: ar(45, 160), f: 0, held: 0, bp: filter('bp'),
  }))
  return freqs => {
    let l = 0, r = 0
    bank.forEach((v, j) => {
      const on = j < freqs.length
      if (on && Math.abs(freqs[j] / (v.f || 1) - 1) > 0.001) (v.f = freqs[j]), (v.held = 0)
      v.held = on ? v.held + 1 / SR : 0
      const a = v.env(on ? 1 : 0), n = v.bp(η(), 3 * (v.f || 220), 4)
      if (a < 1e-4) return
      for (const p of v.pipes) {
        const y = a * p.a * p.o(v.f * p.r)
        l += y * (0.5 - 0.5 * p.p)
        r += y * (0.5 + 0.5 * p.p)
      }
      const c = chiff * a * exp(-v.held / 0.05) * n
      l += c
      r += c
    })
    return [gain * l, gain * r]
  }
}
// One brass player: two saws 4 cents apart through a low-pass that opens as the note gets louder (brass is
// brighter when loud), the note "blatted" in from a quarter-tone below, a late vibrato.
function brassVoice({ bright = 1, seed = 47 } = {}) {
  const a = osc('saw', hash(seed, 1)), b = osc('saw', hash(seed, 2)), lp = filter('lp'), lp2 = filter('lp'), level = ar(35, 180), glide = smooth(12)
  let t = 0, held = 0, cur = 0
  return (f, on, vel = 0.8) => {
    t += 1 / SR
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f)
    held = on ? held + 1 / SR : 0
    const e = level(on ? vel : 0)
    if (e < 1e-4 && !on) return (lp(0, 500), lp2(0, 500), 0)
    const st = (on ? -0.5 * exp(-held / 0.025) : 0) + 0.12 * smoothstep(0.3, 0.8, held) * sin(TAU * 5.2 * t)
    const g = glide(cur || f) * 2 ** (st / 12)
    const fc = 250 + 4200 * bright * e ** 1.6 + 1.5 * g
    return e * lp2(lp(0.5 * a(g) + 0.5 * b(g * 1.0023), fc, 0.8), fc * 1.6)
  }
}
// French horn (h(f, on, vel), mellow, a broad formant around 450 Hz) / trumpet: horn({ bright: 2.2 })
export function horn({ bright = 0.55, seed = 53 } = {}) {
  const v = brassVoice({ bright, seed }), bp = filter('bp')
  return (f, on, vel = 0.8) => {
    const y = v(f, on, vel)
    return 0.7 * y + 0.5 * bp(y, 450, 1.2)
  }
}
// Brass section: b(freqs, vel) → [l, r], a player per note spread across the stage
export function brass({ voices = 4, bright = 1, gain = 0.3 } = {}) {
  const ps = Array.from({ length: voices }, (_, j) => ({ v: brassVoice({ bright, seed: 60 + j }), p: voices > 1 ? 0.6 * ((2 * j) / (voices - 1) - 1) : 0, f: 220 }))
  return (freqs, vel = 0.8) => {
    let l = 0, r = 0
    ps.forEach((p, j) => {
      if (j < freqs.length) p.f = freqs[j]
      const y = p.v(p.f, j < freqs.length, vel)
      l += y * Math.sqrt((1 - p.p) / 2)
      r += y * Math.sqrt((1 + p.p) / 2)
    })
    return [gain * l, gain * r]
  }
}
// Double reeds and the clarinet: r(f, on, vib) → sample.
//   oboe: a narrow pulse (every harmonic) through nasal formants 1.1 and 2.8 kHz, vibrato;
//   clarinet: a square (odd harmonics — the hollow chalumeau), no vibrato;  bassoon: formants 450 and 1150 Hz.
export function reed({ kind = 'oboe', breath = 0.03, seed = 59 } = {}) {
  const K = { oboe: { duty: 0.18, F: [1100, 2800], Q: [4, 4], G: [1, 0.6], hp: 350, vib: 0.14, lp: 6000 }, clarinet: { duty: 0.5, F: [1500, 3000], Q: [1.2, 3], G: [0.3, 0.15], hp: 120, vib: 0, lp: 3200 }, bassoon: { duty: 0.25, F: [450, 1150], Q: [3, 4], G: [1, 0.5], hp: 60, vib: 0.1, lp: 3500 } }[kind]
  const η = noise(seed), p = pulse(K.duty), b1 = filter('bp'), b2 = filter('bp'), hp = filter('hp'), lp = filter('lp'), bn = filter('bp'), level = ar(30, 90), glide = smooth(15)
  let t = 0, held = 0, cur = 0
  return (f, on, vib = 1) => {
    t += 1 / SR
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f)
    held = on ? held + 1 / SR : 0
    const g = glide(cur || f) * 2 ** ((vib * K.vib * smoothstep(0.2, 0.6, held) * sin(TAU * 5.4 * t)) / 12)
    const a = level(on ? 1 : 0), src = lp(hp(p(g), K.hp), K.lp), n = η()
    const y = 0.5 * src + K.G[0] * b1(src, K.F[0], K.Q[0]) + K.G[1] * b2(src, K.F[1], K.Q[1])
    return a * (0.6 * y + breath * bn(n, 2 * g, 2) + (on ? 0.15 * exp(-held / 0.015) : 0) * n * 0.2)
  }
}
// Choir: c(freqs, F) → [l, r]; two singers per part (a few cents apart, their own vibrato), F = vowel formants
export function choir({ voices = 4, size = 1, breath = 0.06, rough = 0, gain = 0.3 } = {}) {
  const parts = Array.from({ length: voices }, (_, j) => ({
    a: voice({ size: size * (1 - 0.02 * j), breath, rough }), b: voice({ size: size * (0.97 - 0.02 * j), breath, rough }),
    env: ar(180, 500), glide: smooth(40), f: 220, p: voices > 1 ? 0.7 * ((2 * j) / (voices - 1) - 1) : 0, r: 4.8 + 0.6 * hash(j, 5),
  }))
  let t = 0
  return (freqs, F = VOWELS.a) => {
    t += 1 / SR
    let l = 0, r = 0
    parts.forEach((v, j) => {
      const on = j < freqs.length
      if (on) v.f = freqs[j]
      const e = v.env(on ? 1 : 0), g = v.glide(v.f), vib = 2 ** ((0.12 * sin(TAU * v.r * t + j)) / 12)
      const y = v.a(0.998 * g * vib, F, e) + v.b((1.002 * g) / vib, F, e)
      l += y * Math.sqrt((1 - v.p) / 2)
      r += y * Math.sqrt((1 + v.p) / 2)
    })
    return [gain * l, gain * r]
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
// Voice leading: chords = [[root, third, fifth(, seventh)] as pitch classes, …] → MIDI voicings (low → high).
// Each voicing is the cheapest move from the one before: Σ|moves| + 8 per parallel fifth or octave between
// any two voices + 3 per leap over a fourth; every chord tone present, only the root or the fifth doubled
// (never the third — in V that is the leading tone), adjacent voices at most an octave apart, all in [lo, hi].
export function voiceChords(chords, { lo = 55, hi = 76, voices = 4 } = {}) {
  const pcOf = m => ((m % 12) + 12) % 12, out = []
  let prev = null
  for (const ch of chords) {
    const notes = []
    for (let m = lo; m <= hi; m++) if (ch.includes(pcOf(m))) notes.push(m)
    let best = null, bestCost = Infinity
    const rec = (i, acc) => {
      if (acc.length === voices) {
        const pcs = acc.map(pcOf)
        if (!ch.slice(0, voices).every(p => pcs.includes(p))) return
        if (ch.length < voices && pcs.filter(p => p === ch[1]).length > 1) return
        let cost = 0
        if (prev) {
          for (let k = 0; k < voices; k++) {
            const a = Math.abs(acc[k] - prev[k])
            cost += a + (a > 5 ? 3 : 0)
            for (let j = k + 1; j < voices; j++) {
              const was = pcOf(prev[j] - prev[k]), now = pcOf(acc[j] - acc[k])
              if ((now === 0 || now === 7) && was === now && acc[k] !== prev[k] && Math.sign(acc[k] - prev[k]) === Math.sign(acc[j] - prev[j])) cost += 8
            }
          }
        } else cost = Math.abs((acc[0] + acc[voices - 1]) / 2 - (lo + hi) / 2) + 0.2 * (acc[voices - 1] - acc[0])
        if (cost < bestCost) (bestCost = cost), (best = acc)
        return
      }
      for (let j = i; j < notes.length; j++) {
        if (acc.length && notes[j] - acc[acc.length - 1] > 12) break
        rec(j + 1, [...acc, notes[j]])
      }
    }
    rec(0, [])
    prev = best ?? prev ?? notes.slice(0, voices)
    out.push(prev)
  }
  return out
}
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
    const sc = scale(x), cands = []
    if (sc.every(Number.isInteger)) {
      for (let m = lo; m <= hi; m++) if (inScale(sc, m)) cands.push(m)
    } else { // a microtonal scale (pitch classes like 3.5): its own notes in every octave
      for (let o = Math.floor(lo / 12) * 12 - 12; o <= hi; o += 12) for (const p of sc) if (o + p >= lo && o + p <= hi) cands.push(o + p)
      cands.sort((a, b) => a - b)
    }
    let i = cands.reduce((best, m, k) => (Math.abs(m - n) < Math.abs(cands[best] - n) ? k : best), 0)
    const step = [1, 1, 2, 1, 2, 3][floor(hash(j, seed + 1) * 6)] * (cands[i] > target ? -1 : 1) * (hash(j, seed + 2) < 0.75 ? 1 : -1)
    i = clamp(i + step, 0, cands.length - 1)
    n = cands[i]
    if (j % rate === 0) {
      const ch = chord(x), tones = cands.filter(m => ch.some(p => Math.abs((((m % 12) + 12) % 12) - p) < 1e-6))
      if (tones.length) n = tones.reduce((a, m) => (Math.abs(m - n) < Math.abs(a - n) ? m : a))
    }
    const d = hash(j, seed + 3) < hold ? 2 / rate : 1 / rate
    events.push([x + off, n, d * 0.95])
  }
  // overlapping holds are cut by the next note
  for (let k = 0; k + 1 < events.length; k++) events[k][2] = Math.min(events[k][2], events[k + 1][0] - events[k][0])
  return events
}
