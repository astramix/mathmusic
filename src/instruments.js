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
// The loop is a delay of D samples read between samples plus the one-zero filter a·y + (1 − a)·y₋₁ (phase delay φ):
// D = SR/f − φ, so the pitch is exact (A4 = 440 Hz), not rounded to a whole number of samples (≈ 9 ¢ off at C6).
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
      const P = Math.max(2, Math.round(SR / f)), ex = new Float32Array(P), q = Math.max(1, floor(P / pos))
      for (let i = 0; i < P; i++) ex[i] = η()
      for (let i = P - 1; i >= q; i--) ex[i] = vel * (ex[i] - ex[i - q]) // pluck position comb
      const a = bright, ω = (TAU * f) / SR, φ = Math.atan2((1 - a) * sin(ω), a + (1 - a) * cos(ω)) / ω
      // the linear interpolation (1 − d) + d·z⁻¹ has its own phase delay at f: solve for the fraction d with it
      let D = Math.max(1.5, SR / f - φ)
      for (let it = 0; it < 4; it++) { const i0 = floor(D), d = D - i0; D += SR / f - φ - i0 - Math.atan2(d * sin(ω), 1 - d + d * cos(ω)) / ω }
      const n = Math.ceil(D) + 3, buf = new Float32Array(n)
      let w = 0, k = 0, prev = 0
      const s = () => {
        let p = w - D
        if (p < 0) p += n
        const i = floor(p), r = buf[i] + (buf[i + 1 === n ? 0 : i + 1] - buf[i]) * (p - i)
        const y = decay * (a * r + (1 - a) * prev) + (k < P ? ex[k++] : 0)
        prev = r
        buf[w] = y
        w = w + 1 === n ? 0 : w + 1
        return y
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
  // the instruments' bodies: the air and wood resonances (≈ 280 Hz, 1.1 kHz) and the bridge hill (≈ 2.7 kHz)
  const BODY = [[280, 1.6, 0.45], [1100, 1.8, 0.35], [2700, 2.2, 0.3]], bodies = [BODY.map(() => filter('bp')), BODY.map(() => filter('bp'))]
  const body = (side, y) => { let s = 0.68 * y; for (let i = 0; i < 3; i++) s += (BODY[i][2] / BODY[i][1]) * bodies[side][i](y, BODY[i][0], BODY[i][1]); return s }
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
    return [gain * hp[0](body(0, lp[0](l, cutoff)), 120), gain * hp[1](body(1, lp[1](r, cutoff)), 120)]
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

// Pan pipes (the 90s sample libraries' "zampoña"): a stopped pipe, so the odd harmonics 1, 3, 5 only; a rush of breath
// through the tube's resonance (louder than a flute's), a chiff on each note, a scoop of a third of a semitone up into
// the pitch, a vibrato that comes in late. pp(f, on, vib) → sample.
export function panpipe({ breath = 0.14 } = {}) {
  const o1 = osc('sine'), o3 = osc('sine'), o5 = osc('sine'), bp = filter('bp'), bpTube = filter('bp'), hp = filter('hp'), level = ar(60, 150), glide = smooth(18)
  let t = 0, held = 0
  return (f, on, vib = 1) => {
    t += 1 / SR
    held = on ? held + 1 / SR : 0
    const a = level(on ? 1 : 0), scoop = -0.35 * exp(-held / 0.04), g = glide(f) * 2 ** ((scoop + 0.14 * vib * Math.min(1, Math.max(0, held - 0.4) / 0.5) * sin(TAU * 4.8 * t)) / 12)
    const n = η(), chiff = on ? 0.6 * exp(-30 * held) : 0
    return a * (0.7 * o1(g) + 0.16 * o3(3 * g) + 0.05 * o5(5 * g) + breath * bp(n, g, 5) + 0.5 * breath * bpTube(n, 2 * g, 3) + chiff * hp(n, 2500))
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
// Snare: the batter head's two lowest modes (tone and 1.59·tone, the (0,1) and (1,1) membrane modes) struck a little
// sharp and settling (+40 % → 0 in 6 ms), the wires — noise high-passed at `cutoff`, darkened above 9 kHz, ringing a
// little longer than the head —, and the stick's crack (a 3 ms burst around 3.5 kHz).
//   S = 0.78e^{−kt}·LP₉ₖHP(η) + e^{−2kt}(0.4 sin φ + 0.18 sin 1.59φ) + 0.35e^{−t/3ms}·BP₃.₅ₖ(η)
export function snareDrum({ tone = 190, cutoff = 600, decay = 12 } = {}) {
  const hp = filter('hp'), lp = filter('lp'), bp = filter('bp')
  return (t, on = true) => {
    const n = η(), wires = lp(hp(n, cutoff), 9000), crack = bp(n, 3500, 1.2)
    if (!on) return 0
    const ph = TAU * tone * (t + 0.4 * 0.006 * (1 - exp(-t / 0.006)))
    return 0.78 * exp(-decay * t) * wires + exp(-2 * decay * t) * (0.4 * sin(ph) + 0.18 * sin(1.59 * ph)) + 0.35 * exp(-t / 0.003) * crack
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

// ---- the Middle East ------------------------------------------------------------------------------------------------
// Oud: eleven gut strings in courses over a bowl of thin ribs, fretless (a note may slide in: from), plucked with a
// risha — a warm string struck nearer the middle (pos 0.2), the bowl's air (≈ 110 Hz) and wood (≈ 250, 600 Hz), a soft
// quill click. The string model is the exactly tuned one (a quarter tone is a quarter tone). o.hit(f, vel, { from, glide })
export function oud({ sustain = 2.4, bright = 0.5, seed = 41 } = {}) {
  const set = stringSet({ bright, sustain, sawari: 0, tension: 0.004, pos: 0.2, click: 0.003, thump: 0.25, thumpHz: 120 }, { mono: true, max: 3, seed })
  const hp = filter('hp'), air = filter('bp'), w1 = filter('bp'), w2 = filter('bp'), lp = filter('lp'), ck = filter('hp')
  const o = () => {
    const [y, atk] = set(), x = hp(y, 60)
    return 0.55 * lp(x, 4200) + 0.5 * air(x, 110, 1.6) + 0.6 * w1(x, 250, 1.8) + 0.35 * w2(x, 600, 2.2) + 0.25 * ck(atk, 2500)
  }
  o.hit = set.hit
  o.mute = set.mute
  return o
}
// Qanun: a trapezoid zither, 26 courses of three strings plucked with picks on both forefingers — bright, a fish-skin
// bridge (≈ 400, 1500 Hz), every course three strings a few cents apart (a chorus); the mandal levers set each string
// to its quarter tone. Polyphonic (octaves, tremolo): q.hit(f, vel)
export function qanun({ sustain = 3, bright = 0.82, seed = 43 } = {}) {
  const set = stringSet({ bright, sustain, sawari: 0, tension: 0.003, pos: 0.11, click: 0.0025 }, { max: 18, seed })
  const lp = filter('lp'), b1 = filter('bp'), b2 = filter('bp'), ck = filter('hp')
  const q = () => {
    const [y, atk] = set()
    return 0.65 * lp(y, 7000) + 0.55 * b1(y, 400, 1.6) + 0.4 * b2(y, 1500, 2.2) + 0.3 * ck(atk, 3000)
  }
  q.hit = (f, vel = 0.7, o = {}) => { for (const c of [-3, 0, 3]) set.hit(f * 2 ** (c / 1200), vel * 0.42, o) } // a course of three strings, ±3 ¢
  q.mute = set.mute
  return q
}
// Ney: the reed flute blown across the rim at an angle — far more breath than tone (noise around f and 2f), a soft
// fundamental with a little 2nd and 3rd partial, notes entered with a breath push and a slight scoop, a slow vibrato
// that comes late. n(f, on, { vib }) → sample; a new pitch while on = a legato slide.
export function ney({ breath = 0.3, seed = 47 } = {}) {
  const η = noise(seed), o1 = osc('sine'), o2 = osc('sine'), o3 = osc('sine'), bA = filter('bp'), bB = filter('bp'), hp = filter('hp')
  const level = ar(90, 220), glide = smooth(45)
  let t = 0, held = 0, cur = 0
  return (f, on, { vib = 1 } = {}) => {
    t += 1 / SR
    if (on) cur = f // a new pitch while blowing: the finger slides (glide)
    held = on ? held + 1 / SR : 0
    const g = glide(cur || f) * 2 ** ((vib * 0.22 * smoothstep(0.4, 1.1, held) * sin(TAU * 5.2 * t) - 0.25 * (1 - smoothstep(0, 0.12, held))) / 12)
    const a = level(on ? 1 : 0), n = η()
    const tone = 0.55 * o1(g) + 0.12 * o2(2 * g) + 0.05 * o3(3 * g)
    const air = breath * (bA(n, g, 2.5) + 0.6 * bB(n, 2 * g, 3)) + (on ? 0.25 * exp(-held / 0.06) : 0) * hp(n, 2000)
    return a * (tanh(1.3 * tone) + air)
  }
}
// Darbuka: the goblet drum. dum — the open centre: the skin's modes (1, 1.59, 2.14, 2.3) of ≈ 95 Hz sinking from a
// semitone sharp, the goblet's air; tek — the rim with the ring finger: a bright ring (≈ 1.35, 2.2, 3.4 kHz) and a click;
// ka — the other hand's softer rim. d(t s, stroke, on)
export function darbukaDrum({ pitch = 95, seed = 53 } = {}) {
  const η = noise(seed), hp = filter('hp'), bp = filter('bp'), lp = filter('lp')
  return (t, stroke = 'dum', on = true) => {
    const n = η(), c = hp(n, 2500), b = bp(n, 1.4 * pitch, 3)
    if (!on || t > 1.2) return (lp(0, 5000), 0)
    if (stroke === 'dum') {
      const ph = TAU * pitch * (t + 0.06 * 0.04 * (1 - exp(-t / 0.04)))
      const y = exp(-t / 0.22) * sin(ph) + 0.35 * exp(-t / 0.08) * sin(1.59 * ph) + 0.18 * exp(-t / 0.05) * sin(2.14 * ph) + 0.4 * exp(-t / 0.12) * b + 0.2 * exp(-t / 0.003) * c
      return lp(tanh(1.4 * y), 5000)
    }
    const k = stroke === 'ka' ? 0.6 : 1, f = stroke === 'ka' ? 1250 : 1350
    const y = k * (exp(-t / 0.045) * (0.6 * sin(TAU * f * t) + 0.35 * sin(TAU * 1.63 * f * t) + 0.2 * sin(TAU * 2.52 * f * t)) + 0.9 * exp(-t / 0.004) * c)
    return lp(y, 9000)
  }
}
// Riq: the small frame drum with five pairs of brass jingles — the skin (≈ 230 Hz) and the jingles' shimmer (a band
// of noise around 7–9 kHz with a beating envelope as the cymbals clash and rebound). r(t s, stroke 'dum'|'tek'|'jingle', on)
export function riqDrum({ seed = 59 } = {}) {
  const η = noise(seed), j1 = filter('bp'), j2 = filter('bp'), hp = filter('hp')
  return (t, stroke = 'jingle', on = true) => {
    const n = η(), jing = 0.6 * j1(n, 7200, 6) + 0.5 * j2(n, 9100, 7) + 0.2 * hp(n, 11000)
    if (!on || t > 0.6) return 0
    const shimmer = exp(-t / (stroke === 'jingle' ? 0.09 : 0.13)) * (0.75 + 0.25 * sin(TAU * 38 * t))
    const skin = stroke === 'dum' ? exp(-t / 0.09) * sin(TAU * 230 * t) : stroke === 'tek' ? 0.5 * exp(-t / 0.02) * sin(TAU * 900 * t) : 0
    return 0.9 * shimmer * jing + 0.6 * skin
  }
}

// ---- India ------------------------------------------------------------------------------------------------------------
// Sitar: a steel melody string over a wide flat bridge — the jawari makes it buzz (sawari, strong), struck with a wire
// mizrab (a bright click); the meend is the string pulled across the fret (hit(f, vel, { from }) slides in, { bend,
// bendAt, bendTime, back } pulls and lets go); under it a dozen sympathetic tarab strings tuned to the raga's notes ring
// when the melody touches them (resonators at those pitches, fed by the string). s.hit(f, vel, o), s() → sample
export function sitar({ tarab = [], sawari = 0.03, sustain = 3, bright = 0.8, seed = 61 } = {}) {
  const set = stringSet({ bright, sustain, sawari, tension: 0.006, pos: 0.1, click: 0.002, thump: 0.15, thumpHz: 300 }, { mono: true, max: 3, seed })
  const hp = filter('hp'), gourd = filter('bp'), neck = filter('bp'), ck = filter('hp'), res = tarab.map(() => filter('bp'))
  const s = () => {
    const [y, atk] = set(), x = hp(y, 90)
    let t = 0
    for (let i = 0; i < res.length; i++) t += res[i](x, tarab[i], 60)
    return 0.55 * x + 0.6 * gourd(x, 180, 1.4) + 0.35 * neck(x, 2400, 2) + 0.25 * ck(atk, 3500) + (res.length ? (0.9 / Math.sqrt(res.length)) * t : 0)
  }
  s.hit = set.hit
  s.mute = set.mute
  return s
}
// Tanpura: four strings plucked one after another, round and round (Pa or Ma or Ni — Sa — Sa — the low Sa), never
// damped; the jawari's buzz is the whole sound (a cloud of overtones blooming after each pluck). tp(f[4], period s)
export function tanpura({ seed = 67 } = {}) {
  const set = stringSet({ bright: 0.55, sustain: 7, sawari: 0.045, tension: 0.002, pos: 0.07, click: 0.006 }, { max: 8, seed })
  const lp = filter('lp'), body = filter('bp')
  let t = 0, k = -1
  return (freqs, period = 1.1, on = true) => {
    t += 1 / SR
    const j = floor(t / period)
    if (on && freqs.length && j !== k) { k = j; set.hit(freqs[j % freqs.length], j % 4 === 3 ? 0.55 : 0.45, { bright: 0.5 + 0.1 * (j % 2) }) }
    const [y] = set()
    return 0.6 * lp(y, 5000) + 0.4 * body(y, 150, 1.2)
  }
}
// Tabla. The dayan (right, wood) is tuned to Sa: its black syahi makes the head's modes harmonic — 1, 2, 3, 4, 5 × f —
// na: struck at the rim (the partials ring a moment), tin: in the middle (the fundamental sings), te: a closed slap. The
// bayan (left, metal) is the bass: ge — open, the wrist presses the head and the pitch rises (≈ 85 → 110 Hz), ke — a
// flat slap. dha = na + ge, dhin = tin + ge. d(t s, bol, on); f = the dayan's Sa
export function tablaDrum({ f = 277.18, seed = 71 } = {}) {
  const η = noise(seed), hp = filter('hp'), bp = filter('bp')
  const dayan = (t, kind) => {
    const A = kind === 'tin' ? [1, 0.35, 0.18, 0.1, 0.05] : [0.7, 0.55, 0.45, 0.32, 0.22], T = kind === 'tin' ? [0.45, 0.25, 0.15, 0.1, 0.08] : [0.2, 0.16, 0.12, 0.09, 0.07]
    let y = 0
    for (let h = 0; h < 5; h++) y += A[h] * exp(-t / T[h]) * sin(TAU * (h + 1) * f * t * (1 + 0.004 * h * h))
    return y
  }
  const bayan = (t, open) => {
    if (!open) return 0.7 * exp(-t / 0.03) * sin(TAU * 140 * t)
    const ph = TAU * (85 * t + 25 * (t - 0.12 * (1 - exp(-t / 0.12))))
    return exp(-t / 0.5) * (sin(ph) + 0.25 * sin(2 * ph))
  }
  return (t, bol = 'na', on = true) => {
    const n = η(), c = hp(n, 3000), slap = bp(n, 900, 1.2)
    if (!on || t > 2) return 0
    const click = 0.3 * exp(-t / 0.002) * c
    switch (bol) {
      case 'na': case 'ta': return dayan(t, 'na') + click
      case 'tin': case 'tun': return dayan(t, 'tin') + 0.6 * click
      case 'te': case 'ti': case 'ra': return 0.8 * exp(-t / 0.025) * slap + click
      case 'ge': return bayan(t, true)
      case 'ke': case 'ka': return bayan(t, false) + 0.3 * exp(-t / 0.01) * slap
      case 'dha': return 0.85 * dayan(t, 'na') + 0.9 * bayan(t, true) + click
      case 'dhin': return 0.85 * dayan(t, 'tin') + 0.9 * bayan(t, true) + 0.6 * click
      default: return 0
    }
  }
}

// ---- gamelan (bronze, tuned by ear: the pitches come from the measured slendro and pelog) --------------------------------
// Every instrument of a gamelan comes as a pair a few Hz apart (pengumbang and pengisep): together they beat — the ombak,
// the "wave" that makes the bronze shimmer. Each tone here is that pair: f and f + ombak Hz.
const pair = (f, ombak, fn) => 0.5 * (fn(f) + fn(f + ombak))
// saron (and demung, peking): a thick bronze bar over a trough — partials 1, 2.71, 5.34 (a bar on two nodes), a hard
// wooden mallet; the player damps the last bar with the other hand as he strikes the next (hit with a short life)
export const saronTone = (f, t, vel = 0.7) => pair(f, 4.5, g => vel * (exp(-t / 1.6) * sin(TAU * g * t) + 0.35 * exp(-t / 0.5) * sin(TAU * 2.71 * g * t) + 0.12 * exp(-t / 0.18) * sin(TAU * 5.34 * g * t)) * Math.min(1, t / 0.0015))
// bonang: a row of small kettle gongs with a knob — a clear fundamental, a strong partial near 2.4 f, a soft bell-like
// 3.9 f, struck with padded sticks (a rounded attack)
export const bonangTone = (f, t, vel = 0.7) => pair(f, 3.2, g => vel * (exp(-t / 1.1) * sin(TAU * g * t) + 0.3 * exp(-t / 0.4) * sin(TAU * 2.41 * g * t) + 0.12 * exp(-t / 0.2) * sin(TAU * 3.89 * g * t)) * Math.min(1, t / 0.004))
// kenong: a big kettle gong lying on cords — sustained, warm, a slow ombak
export const kenongTone = (f, t, vel = 0.7) => pair(f, 2.1, g => vel * (exp(-t / 3.2) * sin(TAU * g * t) + 0.2 * exp(-t / 1.1) * sin(TAU * 2.03 * g * t) + 0.08 * exp(-t / 0.5) * sin(TAU * 3.2 * g * t)) * Math.min(1, t / 0.006))
// kempul: a hanging gong — a deep "pul", the pitch sagging a little after the stroke
export const kempulTone = (f, t, vel = 0.7) => pair(f, 1.6, g => { const ph = TAU * g * (t + 0.004 * (1 - exp(-t / 0.08))); return vel * (exp(-t / 3.5) * sin(ph) + 0.3 * exp(-t / 1.4) * sin(2.12 * ph) + 0.1 * exp(-t / 0.6) * sin(3.4 * ph)) * Math.min(1, t / 0.008) })
// kethuk: a small kettle damped at once — "tuk"
export const kethukTone = (f, t, vel = 0.7) => vel * exp(-t / 0.09) * (sin(TAU * f * t) + 0.3 * sin(TAU * 2.4 * f * t)) * Math.min(1, t / 0.003)
// gong ageng: the big gong that closes every cycle — ≈ 40–55 Hz, a long breathing decay (10 s), its low modes beating
// (the ombak ≈ 3–5 Hz on the second mode), the "nguk" of the knob at the start
export const gongTone = (f, t, vel = 0.9) => {
  const a = Math.min(1, t / 0.012), ph = TAU * f * (t + 0.01 * (1 - exp(-t / 0.15)))
  return vel * a * (exp(-t / 9) * sin(ph) + 0.55 * exp(-t / 5) * sin(2.01 * ph) * (0.6 + 0.4 * sin(TAU * 3.8 * t)) + 0.25 * exp(-t / 2.5) * sin(2.98 * ph) + 0.12 * exp(-t / 1.2) * sin(4.7 * ph) + 0.3 * exp(-t / 0.08) * sin(TAU * 2.2 * f * t))
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
// Saxophone: a conical brass bore driven by a single reed — every harmonic (a saw), brighter the harder it is blown
// (the low-pass opens with the breath), the mouthpiece and bore formants (≈ 600, 1700, 2900 Hz), air around the tone,
// notes scooped in from below and a vibrato that comes late; a little growl when loud. s(f, on, vel) → sample
export function sax({ bright = 1, breath = 0.07, seed = 101 } = {}) {
  const η = noise(seed), o = osc('saw'), sub = osc('sine'), lp = filter('lp'), f1 = filter('bp'), f2 = filter('bp'), f3 = filter('bp'), bn = filter('bp')
  const level = ar(25, 110), glide = smooth(14)
  let t = 0, held = 0, cur = 0
  return (f, on, vel = 0.8) => {
    t += 1 / SR
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f)
    held = on ? held + 1 / SR : 0
    const scoop = on ? -0.35 * exp(-held / 0.04) : 0, vib = 0.16 * smoothstep(0.3, 0.8, held) * sin(TAU * 5.4 * t)
    const g = glide(cur || f) * 2 ** ((scoop + vib) / 12)
    const a = level(on ? vel : 0), n = η()
    const src = o(g) + 0.3 * sub(g) + 0.15 * a * tanh(3 * o(g * 0.5)) * (vel > 0.85 ? 1 : 0)
    const tone = lp(src, 600 + 3800 * bright * a ** 1.5)
    const y = 0.35 * tone + 0.8 * f1(tone, 600, 2.5) + 0.55 * f2(tone, 1700, 3) + 0.3 * f3(tone, 2900, 4)
    return a * (y + breath * bn(n, 2 * g, 1.5))
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

// ---- the dance floor and the studio ---------------------------------------------------------------------------
// Club kick: k(t s, f, on). A sine whose pitch dives from ≈ 7f onto f in two stages (6 ms and 45 ms: the "punch" and the
// "body"), held 20 ms then dying over `decay` s, soft-clipped by tanh; the beater's click on top (a 2.5 ms burst of
// noise above 4 kHz and a 3.2 kHz blip). Tune f to the key (≈ 45–60 Hz): the kick then sits under the bass.
//   φ = 2πf(t + p₁τ₁(1 − e^{−t/τ₁}) + p₂τ₂(1 − e^{−t/τ₂})),  K = tanh(d·a(t) sin φ)/tanh d + c·e^{−t/2.5ms}(…)
export function clubKick({ punch = 6, body = 1.2, decay = 0.32, click = 0.35, drive = 2.2, seed = 83 } = {}) {
  const η = noise(seed), hp = filter('hp'), lp = filter('lp')
  return (t, f = 50, on = true) => {
    const n = hp(η(), 4000)
    if (!on || t > 2) return lp(0, 9000)
    const ph = TAU * f * (t + punch * 0.006 * (1 - exp(-t / 0.006)) + body * 0.045 * (1 - exp(-t / 0.045)))
    const a = Math.min(1, t / 0.0006) * exp(-Math.max(0, t - 0.02) / decay)
    const y = tanh(drive * a * sin(ph)) / tanh(drive) + click * exp(-t / 0.0025) * (0.6 * n + 0.4 * sin(TAU * 3200 * t))
    return lp(y, 9000)
  }
}
// Crash cymbal: two 808 metal sources a tritone-ish apart (inharmonic squares), noise, band-limited 3–14 kHz; a quick
// first decay (the "smash") and a long wash. c(t s, on)
export function crashCymbal({ decay = 1.8, seed = 89 } = {}) {
  const η = noise(seed), m1 = metal(1.71), m2 = metal(2.43), hp = filter('hp'), bp = filter('bp'), lp = filter('lp')
  return (t, on = true) => {
    const s = 0.6 * bp(m1() + 0.7 * m2(), 7500, 0.7) + 0.5 * η(), y = lp(hp(s, 3000), 14000)
    return on && t < 5 * decay ? Math.min(1, t / 0.0008) * (0.45 * exp(-t / 0.05) + 0.55 * exp(-t / decay)) * y : 0
  }
}
// Clank: a struck steel part of a machine — the free bar's modes 1, 2.76, 5.40, 8.93 (each a pair 0.3 % apart: it
// shimmers), the high ones dying first, and the strike's tick. Pure (f, t, vel) for poly().
export const clankTone = (f, t, vel = 0.7) => {
  const R = [1, 2.76, 5.4, 8.93], A = [1, 0.6, 0.35, 0.2], K = [1, 2.2, 4.5, 8]
  let y = 0
  for (let k = 0; k < 4; k++) if (R[k] * f < 16000) y += A[k] * vel ** (0.5 + 0.3 * k) * exp((-t * K[k]) / 0.35) * (sin(TAU * R[k] * f * t) + sin(TAU * R[k] * f * 1.003 * t))
  return 0.5 * Math.min(1, t / 0.0005) * y + 0.4 * vel * exp(-t / 0.0015) * sin(TAU * 7.1 * f * t)
}
// Synth pluck: the sound of a saw through a low-pass whose envelope snaps shut — made additively (alias-free): every
// harmonic k of two saws 7 ¢ apart dies at its own rate e^{−t(d + b·k)}, so the tone darkens as it fades. Pure (f, t, vel)
// for poly(), and incremental (pluckTone.voice).
const PLUCK = { d: 2.2, b: 1.1 }
export function pluckTone(f, t, vel = 0.7) {
  let y = 0
  for (let k = 1; k <= 24 && k * f < 12000; k++) {
    const e = exp(-t * (PLUCK.d + PLUCK.b * k * (1.3 - 0.6 * vel)))
    if (e < 1e-4) break
    y += (e / k) * (sin(TAU * k * f * t) + sin(TAU * k * f * 1.004 * t + k))
  }
  return 0.3 * vel * Math.min(1, t / 0.001) * y
}
pluckTone.voice = (f, vel, t0) => {
  const P = []
  for (let k = 1; k <= 24 && k * f < 12000; k++) for (const [r, ph] of [[1, 0], [1.004, k]]) {
    const d = PLUCK.d + PLUCK.b * k * (1.3 - 0.6 * vel), th = TAU * k * f * r * t0 + ph, de = (TAU * k * f * r) / SR
    P.push({ s: sin(th), c: cos(th), ds: sin(de), dc: cos(de), e: ((0.3 * vel) / k) * exp(-d * t0), q: exp(-d / SR) })
  }
  let t = t0
  return () => {
    let y = 0
    for (const p of P) {
      if (p.e < 1e-6) continue
      y += p.e * p.s
      const s = p.s * p.dc + p.c * p.ds
      p.c = p.c * p.dc - p.s * p.ds
      p.s = s
      p.e *= p.q
    }
    t += 1 / SR
    return Math.min(1, t / 0.001) * y
  }
}
// Spiccato strings: a section of three players bouncing the bow — each a bowed tone (harmonics 1/k^0.9 shaped by the
// body's resonances ≈ 280 Hz, 1.1 kHz, 2.7 kHz), a few cents apart and a few ms apart, the bow's scratch at the
// start, a short decay with the highs dying first. Pure (f, t, vel) for poly(), and incremental (.voice).
const SPICC = { det: [-6, 1, 7], lag: [0, 0.006, 0.011], body: x => 0.35 + exp(-(Math.log2(x / 280) ** 2) / 0.18) + 0.8 * exp(-(Math.log2(x / 1100) ** 2) / 0.25) + 0.6 * exp(-(Math.log2(x / 2700) ** 2) / 0.2) }
const spiccParts = (f, vel) => {
  const P = []
  SPICC.det.forEach((c, j) => {
    const g = f * 2 ** (c / 1200)
    for (let k = 1; k <= 16 && k * g < 11000; k++) P.push({ fr: k * g, a: (0.11 * SPICC.body(k * g) * vel ** (0.3 + 0.07 * k)) / k ** 0.9, d: 1 / 0.16 + 0.9 * k, lag: SPICC.lag[j], ph: hash(k, j + 3) * TAU })
  })
  return P
}
export function spiccatoTone(f, t, vel = 0.7) {
  let y = 0
  for (const p of spiccParts(f, vel)) { const u = t - p.lag; if (u > 0) y += p.a * Math.min(1, u / 0.006) * exp(-p.d * u) * sin(TAU * p.fr * u + p.ph) }
  return y + 0.08 * vel * exp(-t / 0.008) * (hash(floor(t * SR), 7) * 2 - 1)
}
spiccatoTone.voice = (f, vel, t0) => {
  const P = spiccParts(f, vel).map(p => {
    const de = (TAU * p.fr) / SR, th = TAU * p.fr * Math.max(0, t0 - p.lag) + p.ph
    return { ...p, s: sin(th), c: cos(th), ds: sin(de), dc: cos(de), e: p.a * exp(-p.d * Math.max(0, t0 - p.lag)), q: exp(-p.d / SR) }
  })
  let t = t0, i = floor(t0 * SR)
  return () => {
    let y = 0
    for (const p of P) {
      const u = t - p.lag
      if (u < 0 || p.e < 1e-6) continue
      y += p.e * Math.min(1, u / 0.006) * p.s
      const s = p.s * p.dc + p.c * p.ds
      p.c = p.c * p.dc - p.s * p.ds
      p.s = s
      p.e *= p.q
    }
    t += 1 / SR
    return y + 0.08 * vel * exp(-t / 0.008) * (hash(i++, 7) * 2 - 1)
  }
}
// Electric bass (a P-bass): an exactly tuned plucked string (the moving-delay Karplus–Strong of the koto) on a long
// scale, picked near the bridge by the fingers; the pickup and the amp keep 40 Hz – 2.5 kHz with a growl at ≈ 700 Hz.
// b.hit(f, vel, { slap }) — slap: the thumb bounces off the last fret (bright, a fret click and a thump); b.mute(τ)
// lifts the fretting finger (staccato). Monophonic like one string under one hand.
export function electricBass({ bright = 0.42, sustain = 2.6, seed = 97 } = {}) {
  const set = stringSet({ bright, sustain, pos: 0.17, click: 0.002, thump: 0.3, thumpHz: 95, tension: 0.002 }, { mono: true, max: 3, seed })
  const hp = filter('hp'), lp = filter('lp'), grr = filter('bp'), fret = filter('bp')
  const b = () => {
    const [y, atk] = set(), x = hp(y, 38)
    return 0.9 * lp(x, 2500) + 0.25 * grr(x, 700, 1.4) + 0.5 * fret(atk, 2600, 1.2)
  }
  b.hit = (f, vel = 0.8, o = {}) => set.hit(f, vel, o.slap ? { bright: 0.9, pos: 0.08, thump: 0.9, click: 0.005, ...o } : o)
  b.mute = set.mute
  return b
}
// Funk guitar (a single-coil Strat in the middle position): six exactly tuned strings, strummed down or up a few ms
// apart; g.mute(τ) is the fretting hand relaxing (the chord stops — a "chop"), g.strum(…, { dead: true }) the muted
// "chk" of the chicken scratch. Pickup: 160 Hz – 5.5 kHz with the single coil's resonance near 2.3 kHz.
export function funkGuitar({ bright = 0.8, seed = 103 } = {}) {
  const set = stringSet({ bright, sustain: 1.4, pos: 0.12, click: 0.003 }, { max: 12, seed })
  const hp = filter('hp'), lp = filter('lp'), coil = filter('bp'), pick = filter('bp')
  const g = () => {
    const [y, atk] = set(), x = hp(y, 160)
    return 0.8 * lp(x, 5500) + 0.45 * coil(x, 2300, 1.6) + 0.6 * pick(atk, 2800, 1)
  }
  g.strum = (freqs, vel = 0.7, { up = false, gap = 0.007, dead = false } = {}) => {
    const fs = up ? [...freqs].reverse() : freqs
    fs.forEach((f, i) => set.hit(f, vel * (up ? 0.75 : 1) * (1 - 0.06 * i), { at: Math.round(i * gap * SR), bright: dead ? 0.55 : bright }))
    if (dead) set.mute(0.008)
  }
  g.mute = set.mute
  return g
}
// A high-gain amp and its cabinet for a humbucker guitar: a high-pass tightening the low end, the pickup's top rolled off,
// a mid push into two soft-clipping stages (the first biased: even harmonics), a mid scoop, a 4×12 cabinet (low-passes at
// 5.2 and 6.5 kHz, the closed box's thump near 120 Hz, the speakers' presence near 2.5 kHz). amp(x) → sample
function ampCab({ gain = 18, tight = 90, scoop = 0.45 } = {}) {
  const hp = filter('hp'), pick = filter('lp'), pre = filter('bp'), dc = filter('hp'), sc = filter('bp'), cab1 = filter('lp'), cab2 = filter('lp'), box = filter('bp'), pres = filter('bp')
  return x => {
    let y = pick(hp(x, tight), 4500)
    y = tanh(gain * (y + 1.2 * pre(y, 900, 0.7)) + 0.15)
    y = tanh(2.5 * dc(y, 30))
    y -= scoop * sc(y, 500, 0.8)
    const c = cab2(cab1(y, 5200), 6500)
    return 0.5 * c + 0.6 * box(c, 120, 1) + 0.2 * pres(c, 2500, 1.5)
  }
}
// Metal rhythm guitar: exactly tuned strings (the plucked-string model above) into ampCab, double-tracked — two takes
// panned left and right, the second 9 ms late, 0.7 ¢ under and over the note (the middle exactly in tune), as two
// guitarists play it. A power chord is root, fifth
// and octave; the palm mute damps the strings at the bridge (a short, dark "chug"). g.hit(freqs, vel, { mute }) ·
// g.choke(τ) the fretting hand lets go · g() → [l, r]
export function metalGuitar({ gain = 18, tight = 90, scoop = 0.45, seed = 131 } = {}) {
  const DT = 2 ** (0.7 / 1200) // the two takes: 0.7 ¢ either side of the note
  const take = s => ({ set: stringSet({ bright: 0.85, sustain: 3.5, pos: 0.1, click: 0.002 }, { max: 6, seed: s }), amp: ampCab({ gain, tight, scoop }) })
  const L = take(seed), R = take(seed + 1)
  const g = () => { const [a, ka] = L.set(), [b, kb] = R.set(); return [L.amp(a + 0.3 * ka), R.amp(b + 0.3 * kb)] }
  g.hit = (freqs, vel = 0.8, { mute = false, at = 0 } = {}) => {
    const o = mute ? { sustain: 0.16, bright: 0.5 } : {}
    ;[].concat(freqs).forEach((f, i) => {
      L.set.hit(f / DT, vel, { ...o, at: at + Math.round(i * 0.003 * SR) })
      R.set.hit(f * DT, vel, { ...o, at: at + Math.round((0.009 + i * 0.004) * SR) })
    })
  }
  g.choke = (τ = 0.02) => (L.set.mute(τ), R.set.mute(τ))
  return g
}
// Metal lead guitar: one string at a time through the same amp (more gain: the note sings on), slides into a note
// (from), bends (bend, bendAt, bendTime, back) — the string model keeps the pitch exact all through a bend.
// l.hit(f, vel, { from, bend, bendAt, bendTime, back }) · l.choke(τ) · l() → sample
export function leadGuitar({ gain = 30, seed = 137 } = {}) {
  const set = stringSet({ bright: 0.8, sustain: 6, pos: 0.13, click: 0.002 }, { mono: true, max: 3, seed }), amp = ampCab({ gain, tight: 120, scoop: 0.25 })
  const l = () => { const [y, k] = set(); return amp(y + 0.2 * k) }
  l.hit = (f, vel = 0.8, o = {}) => set.hit(f, vel, o)
  l.choke = (τ = 0.03) => set.mute(τ)
  return l
}

// Analog mono synth (a Minimoog-like voice): two saws 9 ¢ apart and a square an octave down, through two resonant
// state-variable low-passes in series (24 dB/oct, the second resonant, driven), the cutoff opening on each new note
// and settling (filter envelope), glide between notes. s(f, on, vel) → sample
export function monoSynth({ cutoff = 900, env = 3200, res = 1.6, decay = 0.25, glide = 25, sub = 0.35, drive = 1.6 } = {}) {
  const a = osc('saw'), b = osc('saw', 0.31), q = osc('square'), f1 = filter('lp'), f2 = filter('lp'), level = ar(4, 90), gl = smooth(glide)
  let held = 0, cur = 0
  return (f, on, vel = 0.8) => {
    if (on && (held === 0 || Math.abs(f / cur - 1) > 0.01)) (held = 0), (cur = f)
    held = on ? held + 1 / SR : 0
    const g = gl(cur || f), e = level(on ? vel : 0), fc = cutoff + env * vel * exp(-held / decay)
    const src = 0.5 * a(g) + 0.5 * b(g * 1.0052) + sub * q(g / 2)
    return e * tanh(drive * f2(f1(src, fc, 0.6), fc, res)) / drive
  }
}

// ---- the PC-98's FM chip, the bayan, the 808 cowbell, the steel pan ---------------------------------------------------
// One FM channel of the YM2608 (OPNA), the chip of the PC-98 and of the first Touhou games: four sine operators, each at
// its own ratio of f (a few cents of detune), its own envelope [attack s, decay s, sustain level, release s] and level —
// a modulator's level is the phase swing it gives (radians), a carrier's its output; operator 1 feeds back on itself
// (fb). The algorithms by the chip's numbers: 0: 1→2→3→4 · 2: (1 + (2→3))→4 · 4: (1→2) + (3→4) · 5: 1→(2, 3, 4) ·
// 7: 1 + 2 + 3 + 4. A key-on (on rising) restarts the envelopes (and, from silence, the phases, as the chip does);
// velocity scales the carriers and, less, the modulators (louder = brighter). v(f, on, vel) → sample
export function opn({ algo = 4, ratio = [1, 1, 1, 1], level = [1, 1, 1, 1], env = [], fb = 0, detune = [0, 0, 0, 0], gain = 0.5 } = {}) {
  const E = [0, 1, 2, 3].map(k => env[k] ?? [0.002, 0.4, 0.6, 0.15])
  const att = E.map(e => 1 / Math.max(1, e[0] * SR)), dec = E.map(e => 1 - exp(-1 / (Math.max(1e-4, e[1]) * SR))), rel = E.map(e => 1 - exp(-1 / (Math.max(1e-4, e[3]) * SR)))
  const R = ratio.map((r, k) => r * 2 ** ((detune[k] ?? 0) / 1200)), [L1, L2, L3, L4] = level
  const ph = new Float64Array(4), lev = new Float64Array(4), st = new Int8Array(4)
  let was = false, p1 = 0, p2 = 0
  const op = (k, m) => lev[k] * sin(TAU * ph[k] + m)
  return (f, on, vel = 0.8) => {
    if (on && !was) {
      const quiet = lev[0] + lev[1] + lev[2] + lev[3] < 0.02
      for (let k = 0; k < 4; k++) (st[k] = 1), quiet && (ph[k] = 0)
    }
    if (!on && was) for (let k = 0; k < 4; k++) st[k] = 3
    was = on
    for (let k = 0; k < 4; k++) {
      if (st[k] === 1) { lev[k] += att[k]; if (lev[k] >= 1) (lev[k] = 1), (st[k] = 2) }
      else if (st[k] === 2) lev[k] += (E[k][2] - lev[k]) * dec[k]
      else if (st[k] === 3) lev[k] -= lev[k] * rel[k]
      ph[k] += (f * R[k]) / SR
      ph[k] -= floor(ph[k])
    }
    const mv = 0.6 + 0.4 * vel, o1 = op(0, fb * 0.5 * (p1 + p2))
    p2 = p1
    p1 = o1
    let y
    if (algo === 0) y = L4 * op(3, mv * L3 * op(2, mv * L2 * op(1, mv * L1 * o1)))
    else if (algo === 2) y = L4 * op(3, mv * (L1 * o1 + L3 * op(2, mv * L2 * op(1, 0))))
    else if (algo === 5) { const m = mv * L1 * o1; y = L2 * op(1, m) + L3 * op(2, m) + L4 * op(3, m) }
    else if (algo === 7) y = L1 * o1 + L2 * op(1, 0) + L3 * op(2, 0) + L4 * op(3, 0)
    else y = L2 * op(1, mv * L1 * o1) + L4 * op(3, mv * L3 * op(2, 0))
    return gain * vel * y
  }
}
// The bayan (the Russian button accordion): a(freqs, vel) → [l, r]. Every note three free reeds — one in tune and two
// `musette` cents sharp and flat, beating against it (the "wet" tuning) — each a narrow pulse (a brass tongue's every
// harmonic), through the box's resonances (≈ 1.1 and 2.9 kHz) under a felt-dark top; the bellows open in 25 ms and
// close in 70 ms. A note below C3 also sounds its reed an octave down (the bass side's thick buttons).
export function accordion({ voices = 4, musette = 12, gain = 0.1 } = {}) {
  const det = [1, 2 ** (musette / 1200), 2 ** (-musette / 1200)]
  const bank = Array.from({ length: voices }, () => ({ rd: [pulse(0.2), pulse(0.2), pulse(0.2), pulse(0.3)], env: ar(25, 70), f: 220 }))
  const side = () => [filter('bp'), filter('bp'), filter('lp'), filter('hp')], F = [side(), side()]
  const box = (s, y) => s[3](0.5 * s[2](y, 5200) + 0.55 * s[0](y, 1100, 1.6) + 0.35 * s[1](y, 2900, 2.2), 90)
  return (freqs, vel = 0.8) => {
    let l = 0, r = 0
    for (let j = 0; j < bank.length; j++) {
      const v = bank[j]
      if (j < freqs.length) v.f = freqs[j]
      const a = v.env(j < freqs.length ? vel : 0)
      if (a < 1e-4) continue
      const c = v.rd[0](v.f), s = v.rd[1](v.f * det[1]), q = v.rd[2](v.f * det[2]), lo = v.f < 131 ? v.rd[3](v.f / 2) : 0
      l += a * (c + 0.8 * s + 0.4 * q + 0.6 * lo)
      r += a * (c + 0.4 * s + 0.8 * q + 0.6 * lo)
    }
    return [gain * box(F[0], l), gain * box(F[1], r)]
  }
}
// The TR-808 cowbell as phonk plays it — the sample pitched to the notes: two square waves a flat fifth apart (540 and
// 800 Hz on the machine: f and 1.48f), summed partial by partial (their odd harmonics, band-limited), through the band-
// pass the machine puts after them (2.64 kHz over 540 Hz: centre 4.9f, Q 1.3 — the clank above the pitch), shaped by
// its two-stage VCA: a click that falls in 12 ms onto a ringing tail. Pure (f, t, vel) for poly().
const COWBELL = new Map()
function cowbellPartials(f) {
  const key = Math.round(f * 100)
  let list = COWBELL.get(key)
  if (list) return list
  list = []
  const fc = 4.9 * f, Q = 1.3
  for (const [g, base] of [[1, f], [0.85, 1.48 * f]]) for (let k = 1; k * base < 15000; k += 2) {
    const w = (k * base) / fc
    list.push(k * base, g / k / Math.sqrt(1 + Q * Q * (w - 1 / w) ** 2))
  }
  if (COWBELL.size > 512) COWBELL.clear()
  COWBELL.set(key, list)
  return list
}
export function cowbellTone(f, t, vel = 0.8) {
  const P = cowbellPartials(f), e = Math.min(1, t / 0.0004) * (0.62 * exp(-t / 0.012) + 0.38 * exp(-t / 0.32))
  let y = 0
  for (let i = 0; i < P.length; i += 2) y += P[i + 1] * sin(TAU * P[i] * t)
  return vel * e * y
}
// Steel pan (a note of a tenor pan): the hammered note area's three lowest modes tuned by the tuner to f, 2f and 3f (the
// octave a few cents wide: its shimmer), the upper ones growing out of the fundamental through the steel's nonlinearity —
// they swell in over 8–12 ms: the pan's "bwong" —, a rubber-tipped stick (1.5 ms), the pitch settling from a little
// sharp. Low notes ring longer. Pure (f, t, vel) for poly().
export function steelpanTone(f, t, vel = 0.7) {
  const g = f * (1 + 0.003 * exp(-t / 0.03)), d = (440 / f) ** 0.35
  const a1 = exp(-t / (1.3 * d)), a2 = (0.5 + 0.45 * vel) * (1 - exp(-t / 0.008)) * exp(-t / (0.7 * d))
  const a3 = (0.15 + 0.3 * vel) * (1 - exp(-t / 0.012)) * exp(-t / (0.3 * d)), a4 = 0.12 * vel * exp(-t / (0.12 * d))
  const y = a1 * sin(TAU * g * t) + a2 * sin(TAU * 2.004 * g * t) + (3 * f < 16000 ? a3 * sin(TAU * 3 * g * t) : 0) + (4 * f < 16000 ? a4 * sin(TAU * 4.01 * g * t + 1) : 0)
  return 0.6 * vel * Math.min(1, t / 0.0015) * y
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
  // the range in whole notes (a theme with quarter tones gives 8.5: the walk would find no note of the scale)
  lo = Math.ceil(lo - 1e-9)
  hi = Math.floor(hi + 1e-9)
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

// ---- resynthesis: an instrument measured from a recording (src/timbre.js) ---------------------------------------------
// M = { kind: 'struck' | 'sustained', f0, B, p: [[ratio, level, attack s, decay /s, sustain]…], fa: [[Hz, dB]…] (the
// spectral envelope over every measured note), fd: [[Hz, decay /s]…], attack, release, vib: { rate, depth ¢, delay s },
// scoop ¢, noise: { atk, sus, fc, dec } }. For poly(): resynthTone(M) is a tone whose .voice(f, vel) plays one note —
// each partial a rotating phasor (two multiplies a sample), its level at this pitch half from the reference note's ratio
// and half from the spectral envelope at its frequency (a body's resonances stay where they are), its decay from the
// decay curve at its frequency; a harder note brighter; vibrato and scoop at a control rate of 32 samples; the noise
// band-passed at its centre, a burst on the attack and a breath while held.
const RESYNTH_BANDS = [212, 424, 849, 1697, 3394, 6788, 13576] // src/timbre.js NOISE_BANDS
const BAND_POWER = new Map()
function bandPower(fc) {
  const key = Math.round(Math.log2(fc) * 12)
  if (!BAND_POWER.has(key)) {
    const bp = filter('bp'), z = noise(17)
    let e = 0
    for (let i = 0; i < 8192; i++) { const y = bp(z(), 2 ** (key / 12), 1.4); if (i >= 2048) e += y * y }
    BAND_POWER.set(key, Math.sqrt(e / 6144) || 1)
  }
  return BAND_POWER.get(key)
}
export function resynthTone(M) {
  const P = M.p, ref = M.f0, fa = M.fa ?? [], fd = M.fd ?? [], wF = M.wF ?? 0.5
  const lerpLog = (pts, F) => {
    if (!pts.length) return null
    if (F <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++) if (F <= pts[i][0]) { const u = Math.log(F / pts[i - 1][0]) / Math.log(pts[i][0] / pts[i - 1][0]); return pts[i - 1][1] * (1 - u) + pts[i][1] * u }
    return pts[pts.length - 1][1]
  }
  const cache = new Map()
  const atPitch = f => {
    const key = Math.round(f * 100)
    if (cache.has(key)) return cache.get(key)
    const out = []
    for (let k = 0; k < P.length; k++) {
      const [r, a, at, dec, sus] = P[k], F = f * r
      if (F > 0.45 * SR) break
      const envDb = lerpLog(fa, F), refDb = lerpLog(fa, ref * r)
      // by partial number (the instrument's own recipe) and by frequency (its resonances), as M.wF weighs them
      const level = a * (envDb == null ? 1 : 10 ** ((wF * (envDb - refDb)) / 20))
      const dRef = lerpLog(fd, ref * r), dHere = lerpLog(fd, F)
      const d = dec * (dRef && dHere ? dHere / dRef : (f / ref) ** 0.5)
      out.push({ r, level, at: Math.max(0.0005, at), d, sus })
    }
    cache.set(key, out)
    return out
  }
  const N = M.noise ?? { atk: [], sus: [], dec: 0.02 }, V = M.vib, scoop = M.scoop ?? 0
  const bands = RESYNTH_BANDS.map((fc, b) => ({ fc, atk: N.atk?.[b] ?? 0, sus: N.sus?.[b] ?? 0 })).filter(b => (b.atk > 0.002 || b.sus > 0.002) && b.fc < 0.45 * SR)
  const tone = () => 0
  tone.voice = (f, vel = 0.8) => {
    const ps = atPitch(f), n = ps.length, c = new Float64Array(n), s = new Float64Array(n), cr = new Float64Array(n), sr = new Float64Array(n)
    const env = new Float64Array(n), dk = new Float64Array(n), amp = new Float64Array(n)
    const bright = Math.max(0.2, vel / 0.8)
    let norm = 0
    for (let k = 0; k < n; k++) {
      const ph = TAU * frac(Math.sin((k + 1) * 12.9898 + f * 0.0137) * 43758.5453) // fixed scattered phases: no peaky sum
      c[k] = cos(ph); s[k] = sin(ph)
      amp[k] = ps[k].level * bright ** (0.45 * Math.log2(k + 1)); dk[k] = exp(-ps[k].d / SR); env[k] = 1
      norm += ps[k].level
    }
    const g = vel / Math.max(1, Math.sqrt(norm)), bps = bands.map(() => filter('bp')), η2 = noise(Math.round(f * 7) % 9973)
    // the noise in the partials' units: its measured power ratio against their peak power, through a band-pass whose own
    // output power (white in) was measured once
    let pk = 0
    for (let k = 0; k < n; k++) pk += (amp[k] * amp[k]) / 2
    const nzGain = bands.map(b => Math.sqrt(pk) / bandPower(b.fc))
    let t = 0, ctl = 0
    return () => {
      if (ctl-- <= 0) {
        ctl = 31
        let cents = scoop ? scoop * exp(-t / 0.05) : 0
        if (V) cents += V.depth * Math.min(1, Math.max(0, t - V.delay) / 0.35) * sin(TAU * V.rate * t)
        const pm = 2 ** (cents / 1200)
        for (let k = 0; k < n; k++) { const w = (TAU * f * ps[k].r * pm) / SR; cr[k] = cos(w); sr[k] = sin(w) }
      }
      if ((floor(t * SR) & 1023) === 0) for (let k = 0; k < n; k++) { const m = 1 / Math.hypot(c[k], s[k]); c[k] *= m; s[k] *= m }
      let y = 0
      for (let k = 0; k < n; k++) {
        const q = ps[k], cc = c[k] * cr[k] - s[k] * sr[k]
        s[k] = s[k] * cr[k] + c[k] * sr[k]; c[k] = cc
        env[k] *= dk[k]
        y += amp[k] * Math.min(1, t / q.at) * (q.sus + (1 - q.sus) * env[k]) * s[k]
      }
      let nz = 0
      if (bands.length) {
        const w = η2(), burst = exp(-t / Math.max(0.002, N.dec)), on = Math.min(1, t / 0.002)
        for (let b = 0; b < bands.length; b++) nz += nzGain[b] * bps[b](w, bands[b].fc, 1.4) * on * (bands[b].atk * burst + bands[b].sus)
      }
      t += 1 / SR
      return g * (y + nz)
    }
  }
  return tone
}

// ---- the other side: the angel's dream (the white garden of Blue Hour) and its dark twin -----------------------------
// The dream's vowels (the formants its choir sings through)
export const DREAM_VOWELS = { a: [800, 1150, 2900], o: [450, 800, 2830], u: [325, 700, 2530], e: [400, 1700, 2600], i: [290, 2250, 3000] }
// The angel choir: c(freqs, F | [F per part], level) → [l, r]. Each part is two singers `detune` apart (±0.35 % = ±6 ¢),
// each with a vibrato of its own (4.4 – 5.6 Hz), a saw through three narrow band-passes (Q 7, 11, 11; 1 : 0.42 : 0.18),
// the upper parts with their formants 8 % higher (smaller singers); the breath swells over `attack` ms and dies over
// `release`. shift < 1 and rough > 0: the same choir far below — big, hoarse voices.
export function angelChoir({ voices = 5, detune = 0.0035, vib = 0.008, attack = 1800, release = 2200, shift = 1, rough = 0, breath = 0.015, gain = 0.3, seed = 3 } = {}) {
  const Q = [7, 11, 11], G = [1, 0.42, 0.18], air = noise(977 + seed)
  const parts = Array.from({ length: voices }, (_, j) => ({
    a: osc('saw', hash(j, seed)), b: osc('saw', hash(j, seed + 1)), bp: Q.map(() => filter('bp')), env: ar(attack, release), glide: smooth(50), f: 0,
    p: voices > 1 ? 0.8 * ((2 * ((j * 3) % voices)) / (voices - 1) - 1) : 0, r1: 4.4 + 1.2 * hash(j, seed + 2), r2: 4.4 + 1.2 * hash(j, seed + 3), fs: shift * (j > 2 ? 1.08 : 1),
  }))
  let t = 0
  return (freqs, F = DREAM_VOWELS.a, level = 1) => {
    t += 1 / SR
    let l = 0, r = 0
    const n = air()
    for (let j = 0; j < voices; j++) {
      const v = parts[j], on = j < freqs.length
      if (on) { if (!v.f) for (let i = 0; i < 400; i++) v.glide(freqs[j]); v.f = freqs[j] }
      const e = v.env(on ? level : 0), g = v.glide(v.f || 220)
      let src = v.a(g * (1 - detune) * (1 + vib * sin(TAU * v.r1 * t + j))) + v.b(g * (1 + detune) * (1 + vib * sin(TAU * v.r2 * t + 2.3 * j))) + breath * n
      if (rough) src = tanh((1 + rough) * src)
      const Fj = typeof F[0] === 'number' ? F : F[j % F.length]
      let y = 0
      for (let i = 0; i < 3; i++) y += (G[i] / Q[i]) * v.bp[i](src, Fj[i] * v.fs, Q[i])
      y *= e
      l += y * Math.sqrt((1 - v.p) / 2)
      r += y * Math.sqrt((1 + v.p) / 2)
    }
    return [gain * l, gain * r]
  }
}
// The angel speaking: s(f, on, F) → sample. Wordless sung syllables — two singers ±4 ¢ through the vowel F, a quick breath
// in (60 ms), a scoop of a third of a semitone into the note, a vibrato that comes after 0.3 s, and under it a second
// voice an octave down on «о», half as loud, a little later (90 ms).
export function seraph({ low = 0.5, vib = 0.007, shift = 1, seed = 5 } = {}) {
  const a = osc('saw', 0.1), b = osc('saw', 0.6), c = osc('saw', 0.35), Q = [7, 11, 11], G = [1, 0.42, 0.18]
  const bp = Q.map(() => filter('bp')), bpo = Q.map(() => filter('bp')), env = ar(60, 260), envLow = ar(90, 340), glide = smooth(6), air = noise(991 + seed)
  let t = 0, held = 0, first = true
  return (f, on, F = DREAM_VOWELS.a) => {
    t += 1 / SR
    held = on ? held + 1 / SR : 0
    if (first && on) { for (let i = 0; i < 300; i++) glide(f); first = false }
    const g = glide(f) * 2 ** ((-0.33 * exp(-held / 0.035)) / 12) * (1 + vib * Math.min(1, held / 0.3) * sin(TAU * 5.1 * t))
    const src = a(g * 0.9977) + b(g * 1.0023) + 0.02 * air(), lo = c(g / 2)
    let y = 0, z = 0
    for (let i = 0; i < 3; i++) {
      y += (G[i] / Q[i]) * bp[i](src, F[i] * shift, Q[i])
      z += (G[i] / Q[i]) * bpo[i](lo, DREAM_VOWELS.o[i] * shift, Q[i])
    }
    return env(on ? 1 : 0) * y + low * envLow(on ? 1 : 0) * z
  }
}
// A glint of light: a pure sine and a little of its (slightly wide) octave that dies sooner — for poly()
export const glintTone = (f, t, vel = 0.7) =>
  vel * Math.min(1, t / 0.006) * (exp(-t / 0.5) * sin(TAU * f * t) + 0.28 * exp(-t / 0.2) * sin(TAU * 2.01 * f * t))
// A drop of dew: the score's soft pluck — a sine, its octave, and the same note again 0.42 s later, a third as loud
export const dewTone = (f, t, vel = 0.7) =>
  vel * (Math.min(1, t / 0.005) * (exp(-t / 0.62) * sin(TAU * f * t) + 0.24 * exp(-t / 0.27) * sin(TAU * 2 * f * t)) + (t > 0.42 ? 0.36 * Math.min(1, (t - 0.42) / 0.005) * exp(-(t - 0.42) / 0.42) * sin(TAU * f * (t - 0.42)) : 0))
// The halo bell: a bell cast with a major third (hum ½, prime 1, tierce 2^{4/12}, quint 2^{7/12}, nominal 2, …), every
// partial a pair a hair apart, so it shimmers — it rings in consonance over a major chord
export function haloBellTone(f, t, vel = 0.8) {
  const R = [0.5, 1, 1.2599, 1.4983, 2, 2.52, 3.01, 4.1], A = [0.5, 1, 0.5, 0.35, 0.45, 0.25, 0.2, 0.1], T = [1.5, 1.25, 0.95, 0.8, 0.65, 0.48, 0.36, 0.24]
  let y = 0
  for (let k = 0; k < 8; k++) {
    const e = exp(-t / T[k])
    if (e < 1e-4) continue
    y += A[k] * e * (sin(TAU * R[k] * f * 0.9996 * t) + 0.7 * sin(TAU * R[k] * f * 1.0004 * t + k))
  }
  return 0.3 * vel * Math.min(1, t / 0.004) * y
}
// The halo pad: p(freqs) → [l, r]. The score's pad — every note two oscillators −5 and +6 cents apart, one to each ear
// (sines for the two lowest, triangles above), each through its own low-pass 520 + 160 j Hz, swelling in over `attack` ms
export function haloPad({ voices = 6, attack = 2400, release = 3200, gain = 0.2 } = {}) {
  const parts = Array.from({ length: voices }, (_, j) => ({ pl: 0.13 * j, pr: 0.31 + 0.17 * j, lpl: filter('lp'), lpr: filter('lp'), env: ar(attack, release), glide: smooth(40), f: 0 }))
  const dl = 2 ** (-5 / 1200), dr = 2 ** (6 / 1200), wave = (p, tri) => (tri ? 4 * Math.abs(p - 0.5) - 1 : sin(TAU * p))
  return freqs => {
    let l = 0, r = 0
    for (let j = 0; j < voices; j++) {
      const v = parts[j], on = j < freqs.length
      if (on) { if (!v.f) for (let i = 0; i < 300; i++) v.glide(freqs[j]); v.f = freqs[j] }
      const g = v.glide(v.f || 220), e = v.env(on ? 1 : 0), fc = 520 + 160 * j, k = j < 2 ? 1 : 0.5
      v.pl += (g * dl) / SR; v.pl -= floor(v.pl)
      v.pr += (g * dr) / SR; v.pr -= floor(v.pr)
      l += k * e * v.lpl(wave(v.pl, j >= 2), fc, 0.5)
      r += k * e * v.lpr(wave(v.pr, j >= 2), fc, 0.5)
    }
    return [gain * (0.8 * l + 0.2 * r), gain * (0.8 * r + 0.2 * l)]
  }
}
// The bell of the pit: a great cracked bell — a minor third and a tritone among its partials (1 : 2^{3/12} : 2^{6/12}),
// every partial a pair beating slowly, the hum an octave below ringing longest, the hammer's clang
export function hellBellTone(f, t, vel = 0.8) {
  const R = [0.5, 1, 1.1892, 1.4142, 2, 2.52, 2.8284, 4.1], A = [0.8, 1, 0.6, 0.4, 0.45, 0.22, 0.18, 0.1], T = [3.2, 2.4, 1.8, 1.4, 1.1, 0.7, 0.5, 0.3]
  let y = 0
  for (let k = 0; k < 8; k++) {
    const e = exp(-t / T[k])
    if (e < 1e-4) continue
    y += A[k] * e * (sin(TAU * R[k] * f * 0.9991 * t) + 0.8 * sin(TAU * R[k] * f * 1.0009 * t + 1.7 * k))
  }
  return 0.28 * vel * Math.min(1, t / 0.003) * (y + 0.5 * exp(-t / 0.012) * sin(TAU * 5.3 * f * t))
}
// A heart in the dark (the crimson dream's): two thumps 0.2 s apart, sines falling 52 → 38 Hz and 48 → 34 Hz. h(t s) → sample
export function heartBeat(t, vel = 1) {
  const thump = (u, f0, f1, d) => (u < 0 || u > 2 * d ? 0 : Math.min(1, u / 0.008) * exp((-5 * u) / d) * sin((TAU * f0 * d * ((f1 / f0) ** (u / d) - 1)) / Math.log(f1 / f0)))
  return vel * (thump(t, 52, 38, 0.32) + 0.62 * thump(t - 0.2, 48, 34, 0.3))
}

// ---- Magma Depths (the user's own set, 2021): the synth hit of their drum kit, resynthesised -------------------------------
// The kit's hit (pads 44 and 48, the second 8 semitones down): measured from the user's sample — a low pair 164 / 173.6 Hz beating
// at 9.6 Hz under a cloud of inharmonic partials 1.25 – 6.7 kHz, each shimmering at its own slow rate (the sample's partials
// rise and fall: 0.2 – 1.7 of their level 0.34 s later), a 2 ms attack, held. f: the pitch of its low partial (164 Hz as recorded)
export const MAGMA_HIT = [[164, 0.478, 0.75], [173.6, 0.396, 0.5], [1249.5, 0.409, 0.42], [1339.8, 0.524, 0.19], [1405.5, 0.443, 0.92], [1424.6, 0.413, 1.71],
  [1472.5, 0.498, 1.03], [1544.6, 0.396, 0.6], [1572.3, 0.476, 0.35], [1628.4, 0.402, 1.25], [1848.5, 0.43, 1.24], [1900.4, 0.452, 0.2], [1996.2, 0.449, 0.52],
  [2150.9, 0.439, 0.83], [2179.2, 0.599, 0.72], [2476.8, 0.403, 0.89], [2525.8, 0.664, 1.46], [2537.5, 0.467, 0.71], [2556.7, 0.432, 0.53], [4560.4, 0.443, 0.46],
  [4572.8, 0.602, 1.1], [5313.8, 0.555, 0.6], [5321.8, 0.482, 0.5], [5336.3, 1, 1.14], [5365.7, 0.47, 0.48], [6389.2, 0.434, 0.78], [6481.2, 0.421, 0.87], [6673.2, 0.451, 0.53]]
export function magmaHitTone(f, t, vel = 0.8) {
  const k = f / 164, open = Math.min(1, t / 0.002)
  let y = 0
  for (let i = 0; i < MAGMA_HIT.length; i++) {
    const [F, a, late] = MAGMA_HIT[i], fi = F * k
    if (fi > 18000) continue
    // the level moves from a to a·late over 0.34 s and keeps drifting — a slow cosine of its own
    const drift = 1 + (late - 1) * 0.5 * (1 - Math.cos((PI * t) / 0.34)) * (0.8 + 0.2 * sin(0.9 * i))
    y += a * Math.max(0, drift) * sin(TAU * fi * t + 1.7 * i)
  }
  return 0.06 * vel * open * y
}

// ================================================================================================================
// The studio — the second generation of sounds (the styles marked «2»).
//
// What made the first generation sound cheap: saws with their −6 dB/octave of harmonics straight into a static
// low-pass, one oscillator a note, a vibrato that never stops, Freeverb's short metallic tail. Here instead:
//   · hall()      a room worth the name: 8 delay lines in a feedback matrix (Hadamard), four of them slowly modulated
//                 (no metallic ring), the highs dying sooner, early reflections, a pre-delay, a decay time in seconds;
//   · ensemble()  the string machine's chorus: three delay taps 120° apart on a slow and a fast LFO;
//   · TIMBRES     instruments as spectra: each harmonic's level = the source's slope × the body's resonances at that
//                 harmonic's own frequency (a violin's 290 Hz air and 2.6 kHz bridge hill, a horn's formant near 420 Hz,
//                 a voice's vowel), a soft and a loud version, made into band-limited wavetables per note — no aliasing,
//                 no filter needed, the formants stay where they are while the pitch moves;
//   · section()   a group of players on every note: each a few cents off and drifting, with its own vibrato that
//                 starts late, its own moment to begin, its place in the room (louder in the near ear and up to
//                 0.45 ms sooner); louder = brighter (the loud table);
//   · soloist()   one player with a breath: legato glides, a scoop into the note, vibrato after a while, brightness
//                 following the dynamics;
//   · piano()     a struck string as it is: up to 28 partials stretched by the string's stiffness, every one a pair
//                 that beats (two-stage decay: the prompt sound and the aftersound), a hammer that is harder when it
//                 hits harder, its knock; polyWide() spreads the notes across the keyboard's width.
// ================================================================================================================

// ---- a concert hall ---------------------------------------------------------------------------------------------
// hall({ size, decay (s, RT60), damp (Hz: above it the tail dies sooner), pre (s), mod, wet, dry, width, early }) → (l, r) ⇒ [l, r]
const HALL_LEN = [1687, 1931, 2053, 2251, 2437, 2647, 2857, 3089], HALL_RATE = [0.31, 0.47, 0.59, 0.73]
const HALL_EARLY = [[0.0071, 0.0113, 0.0179, 0.0233, 0.0317, 0.0413], [0.0083, 0.0131, 0.0197, 0.0269, 0.0341, 0.0437]]
export function hall({ size = 1, decay = 2.6, damp = 5200, pre = 0.018, mod = 1, wet = 0.3, dry = 1, width = 1, early = 0.6 } = {}) {
  const len = HALL_LEN.map(n => Math.round(n * size)), M = len.map(n => n + 64)
  const buf = M.map(n => new Float32Array(n)), w = new Int32Array(8)
  const g = len.map(n => 10 ** ((-3 * n) / (SR * decay * 1.35))), kd = 1 - exp((-TAU * damp) / SR), kl = 1 - exp((-TAU * 90) / SR)
  const lp = new Float64Array(8), lo = new Float64Array(8), o = new Float64Array(8), v = new Float64Array(8)
  const ap = [[142, 107, 379, 277], [151, 113, 389, 283]].map(set => set.map(n => ({ b: new Float32Array(Math.round(n * size)), i: 0 })))
  const diffuse = (side, x) => {
    for (const a of ap[side]) {
      const d = a.b[a.i], y = d - 0.62 * x
      a.b[a.i] = x + 0.62 * y
      if (++a.i === a.b.length) a.i = 0
      x = y
    }
    return x
  }
  const PN = Math.ceil((pre + 0.05 * size) * SR) + 8, pl = new Float32Array(PN), pr = new Float32Array(PN)
  const taps = HALL_EARLY.map(set => set.map(t => Math.round((pre * 0.5 + t * size) * SR))), preN = Math.max(1, Math.round(pre * SR))
  let pw = 0, ph = 0
  const depth = 9 * mod, norm = 0.36 / Math.sqrt(Math.max(0.3, decay)), s8 = 1 / Math.sqrt(8)
  return (l, r) => {
    pl[pw] = l
    pr[pw] = r
    // early reflections: a few echoes of each side, the later ones crossing over
    let el = 0, er = 0, gain = 0.7
    for (let i = 0; i < 6; i++) {
      let a = pw - taps[0][i], b = pw - taps[1][i]
      if (a < 0) a += PN
      if (b < 0) b += PN
      if (i & 1) { el += gain * pr[b]; er += gain * pl[a] } else { el += gain * pl[a]; er -= gain * pr[b] }
      gain *= 0.78
    }
    let q = pw - preN
    if (q < 0) q += PN
    const inL = diffuse(0, pl[q] + 0.3 * el), inR = diffuse(1, pr[q] + 0.3 * er)
    if (++pw === PN) pw = 0
    ph += 1 / SR
    // the delay lines' outputs (the first four read at a place that wanders: the tail's modes never stand still)
    for (let j = 0; j < 8; j++) {
      const n = M[j]
      if (j < 4) {
        const d = len[j] - 12 + depth * sin(TAU * HALL_RATE[j] * ph + j)
        let p = w[j] - d
        if (p < 0) p += n
        const i = p | 0, f = p - i, i1 = i + 1 === n ? 0 : i + 1
        o[j] = buf[j][i] + f * (buf[j][i1] - buf[j][i])
      } else {
        let p = w[j] - len[j]
        if (p < 0) p += n
        o[j] = buf[j][p]
      }
      lp[j] += kd * (o[j] - lp[j])
      lo[j] += kl * (lp[j] - lo[j])
      v[j] = g[j] * (lp[j] - 0.35 * lo[j])
    }
    // Hadamard: every line feeds every other, energy kept
    for (let h = 1; h < 8; h <<= 1) for (let i = 0; i < 8; i += h << 1) for (let j = i; j < i + h; j++) { const a = v[j], b = v[j + h]; v[j] = a + b; v[j + h] = a - b }
    for (let j = 0; j < 8; j++) {
      buf[j][w[j]] = s8 * v[j] + (j & 1 ? inR : inL)
      if (++w[j] === M[j]) w[j] = 0
    }
    let wl = norm * (o[0] - o[2] + o[4] - o[6]) + early * 0.5 * el, wr = norm * (o[1] - o[3] + o[5] - o[7]) + early * 0.5 * er
    if (width !== 1) { const m = 0.5 * (wl + wr), s = 0.5 * (wl - wr) * width; wl = m + s; wr = m - s }
    return [dry * l + wet * wl, dry * r + wet * wr]
  }
}

// ---- the string machine's chorus --------------------------------------------------------------------------------
// ensemble({ depth, mix }) → (l, r) ⇒ [l, r]: three taps 120° apart, a slow LFO (0.63 Hz) and a fast one (6.1 Hz) on each
export function ensemble({ depth = 1, mix = 0.5, base = 0.011 } = {}) {
  const N = Math.ceil((base + 0.006) * SR) + 8, bl = new Float32Array(N), br = new Float32Array(N)
  let w = 0, t = 0
  const tap = (b, d) => {
    let p = w - d * SR
    if (p < 0) p += N
    const i = p | 0, f = p - i
    return b[i] + f * (b[i + 1 === N ? 0 : i + 1] - b[i])
  }
  return (l, r) => {
    bl[w] = l
    br[w] = r
    t += 1 / SR
    let yl = 0, yr = 0
    for (let k = 0; k < 3; k++) {
      const a = (TAU * k) / 3, d = base + depth * (0.0021 * sin(TAU * 0.63 * t + a) + 0.00028 * sin(TAU * 6.1 * t + 2 * a))
      const sl = tap(bl, d), sr = tap(br, d)
      // each tap leans to its own side
      yl += (k === 0 ? 0.9 : k === 1 ? 0.25 : 0.55) * sl
      yr += (k === 0 ? 0.25 : k === 1 ? 0.9 : 0.55) * sr
    }
    if (++w === N) w = 0
    return [l * (1 - 0.5 * mix) + 0.62 * mix * yl, r * (1 - 0.5 * mix) + 0.62 * mix * yr]
  }
}

// ---- instruments as spectra ---------------------------------------------------------------------------------------
const WT = 2048, WTM = WT - 1, WSINE = Float32Array.from({ length: WT }, (_, i) => Math.sin((TAU * i) / WT))
const reson = (F, c, bw) => 1 / (1 + ((F - c) / bw) ** 2) // a resonance of the body at c Hz, half-width bw
const roll = (F, fc, n) => 1 / (1 + (F / fc) ** n) // the highs falling away above fc
// a vowel: the glottal source (−10 dB / octave) through the formants; d = 0 soft … 1 loud (a harder voice: a flatter source)
const vowel = (F1, F2, F3, a2, a3) => (k, F, d) => (0.05 + reson(F, F1, 70 + 0.06 * F1) + a2 * reson(F, F2, 90 + 0.05 * F2) + a3 * reson(F, F3, 190) + 0.5 * a3 * reson(F, 3500, 260)) / k ** (1.75 - 0.5 * d) * roll(F, 5200, 4)
// name → { amp(k, F, d): the level of harmonic k (at F Hz) at dynamic d ∈ [0, 1] — the soft and the loud table are d = 0.15 and 0.9;
//   attack, release (s); vib: [rate Hz, depth ¢, delay s]; detune ¢ (how far the players sit apart); breath (noise) }
export const TIMBRES = {
  // bowed strings: a saw-like source, the body's air and wood resonances, the bridge hill, then the roll-off
  violins: { amp: (k, F, d) => (0.3 + 1.1 * reson(F, 290, 60) + reson(F, 520, 110) + 0.5 * reson(F, 1000, 260) + 1.5 * reson(F, 2700, 800)) / k ** (1.2 - 0.45 * d) * roll(F, 3000 + 3200 * d, 3), attack: 0.16, release: 0.32, vib: [5.6, 16, 0.22], detune: 7, breath: 0.012 },
  violas: { amp: (k, F, d) => (0.3 + 1.1 * reson(F, 230, 50) + reson(F, 420, 90) + 0.55 * reson(F, 850, 220) + 1.2 * reson(F, 2200, 650)) / k ** (1.2 - 0.4 * d) * roll(F, 2500 + 2500 * d, 3), attack: 0.18, release: 0.34, vib: [5.3, 15, 0.24], detune: 7, breath: 0.012 },
  celli: { amp: (k, F, d) => (0.3 + reson(F, 100, 25) + 1.1 * reson(F, 178, 38) + 0.9 * reson(F, 270, 60) + 0.8 * reson(F, 520, 140) + 0.8 * reson(F, 1500, 520)) / k ** (1.15 - 0.35 * d) * roll(F, 2000 + 1900 * d, 3), attack: 0.2, release: 0.4, vib: [5.1, 14, 0.26], detune: 6, breath: 0.01 },
  basses: { amp: (k, F, d) => (0.35 + reson(F, 70, 18) + reson(F, 112, 26) + 0.8 * reson(F, 200, 50) + 0.5 * reson(F, 450, 140)) / k ** (1.3 - 0.3 * d) * roll(F, 1100 + 900 * d, 3), attack: 0.24, release: 0.45, vib: [4.8, 9, 0.3], detune: 5, breath: 0.008 },
  // brass: the harder it is blown the more harmonics; each instrument's bell formant
  horns: { amp: (k, F, d) => (0.5 + reson(F, 420, 190)) / k ** (0.9 - 0.4 * d) * roll(F, 520 + 1500 * d * d, 2.6), attack: 0.09, release: 0.22, vib: [5.2, 6, 0.4], detune: 5, breath: 0.004 },
  trumpets: { amp: (k, F, d) => (0.35 + 1.2 * reson(F, 1300, 480) + 0.5 * reson(F, 2500, 900)) / k ** (0.75 - 0.4 * d) * roll(F, 1300 + 3800 * d, 3), attack: 0.045, release: 0.14, vib: [5.6, 9, 0.3], detune: 5, breath: 0.004 },
  trombones: { amp: (k, F, d) => (0.45 + 1.1 * reson(F, 520, 210) + 0.3 * reson(F, 1500, 500)) / k ** (0.85 - 0.4 * d) * roll(F, 480 + 1900 * d * d, 2.6), attack: 0.07, release: 0.2, vib: [5, 5, 0.45], detune: 5, breath: 0.004 },
  // woodwinds
  flute: { amp: (k, F, d) => roll(F, 2400 + 1800 * d, 4) / k ** (2.6 - 0.8 * d), attack: 0.07, release: 0.16, vib: [5.2, 12, 0.3], detune: 4, breath: 0.05 },
  clarinet: { amp: (k, F, d) => (k % 2 ? 1 : Math.min(1, 0.06 + F / 3200)) / k ** (1 - 0.2 * d) * (0.6 + 0.6 * reson(F, 1650, 500)) * roll(F, 2600 + 1400 * d, 3.5), attack: 0.05, release: 0.14, vib: [5, 4, 0.5], detune: 3, breath: 0.012 },
  oboe: { amp: (k, F, d) => (0.22 + 1.25 * reson(F, 1100, 330) + 0.85 * reson(F, 2800, 520)) / k ** 0.35 * roll(F, 4200, 4), attack: 0.04, release: 0.12, vib: [5.4, 9, 0.35], detune: 3, breath: 0.008 },
  bassoon: { amp: (k, F, d) => (0.3 + 1.2 * reson(F, 480, 150) + 0.4 * reson(F, 1200, 300)) / k ** 0.85 * roll(F, 2000 + 800 * d, 3), attack: 0.05, release: 0.15, vib: [5, 6, 0.4], detune: 3, breath: 0.008 },
  // a saxophone: the tenor's formants 600 / 1700 / 2900 Hz
  sax: { amp: (k, F, d) => (0.3 + 1.1 * reson(F, 600, 220) + 0.7 * reson(F, 1700, 450) + 0.45 * reson(F, 2900, 600)) / k ** (0.95 - 0.45 * d) * roll(F, 1900 + 3200 * d, 3), attack: 0.035, release: 0.12, vib: [5, 14, 0.28], detune: 4, breath: 0.03 },
  // voices
  aah: { amp: vowel(790, 1180, 2750, 0.5, 0.2), attack: 0.22, release: 0.5, vib: [5.3, 18, 0.3], detune: 9, breath: 0.02 },
  ooh: { amp: vowel(360, 780, 2500, 0.22, 0.04), attack: 0.26, release: 0.55, vib: [5.1, 14, 0.35], detune: 9, breath: 0.015 },
  mm: { amp: vowel(270, 1000, 2400, 0.05, 0.015), attack: 0.3, release: 0.6, vib: [5, 9, 0.4], detune: 8, breath: 0.006 },
  // synthesizers, as their oscillators sound after a gentle filter
  warm: { amp: (k, F, d) => roll(F, 700 + 2600 * d * d, 2) / k ** 1.25, attack: 0.5, release: 0.9, vib: [0.35, 4, 0], detune: 11, breath: 0 },
  saw: { amp: (k, F, d) => roll(F, 1200 + 5200 * d * d, 2) / k, attack: 0.02, release: 0.2, vib: [5.5, 7, 0.25], detune: 9, breath: 0 },
  square: { amp: (k, F, d) => (k % 2 ? 1 : 0.04) * roll(F, 1200 + 4800 * d * d, 2) / k, attack: 0.015, release: 0.15, vib: [5.5, 7, 0.25], detune: 6, breath: 0 },
  glass: { amp: (k, F, d) => ([0, 1, 0.42, 0.16, 0.24, 0.05, 0.1, 0.02, 0.05][k] ?? 0) * (k < 3 ? 1 : 0.4 + 0.6 * d), attack: 0.3, release: 1.1, vib: [0.4, 3, 0], detune: 8, breath: 0 },
  sine: { amp: (k, F, d) => (k === 1 ? 1 : k === 2 ? 0.06 + 0.1 * d : k === 3 ? 0.03 * d : 0), attack: 0.2, release: 0.6, vib: [4.5, 5, 0.4], detune: 5, breath: 0 },
  organ: { amp: (k, F, d) => ([0, 1, 0.55, 0.3, 0.42, 0, 0.16, 0, 0.2][k] ?? 0) * roll(F, 5000, 3), attack: 0.03, release: 0.12, vib: [6.2, 3, 0], detune: 2, breath: 0.003 },
}
const tables = new Map()
// the wavetable of a timbre at MIDI note n and dynamic layer (0 soft, 1 loud): harmonics up to 16 kHz, at fixed scattered phases
function wavetable(name, n, layer) {
  const key = name + n + layer
  let t = tables.get(key)
  if (t) return t
  const T = TIMBRES[name], f0 = 440 * 2 ** ((n - 69) / 12), K = Math.max(1, Math.min(360, Math.floor(16000 / f0))), d = layer ? 0.9 : 0.15
  const sum = new Float64Array(WT)
  let e = 0
  for (let k = 1; k <= K; k++) {
    const a = T.amp(k, k * f0, d)
    if (!(a > 2e-5)) continue
    const p = Math.floor(hash(k, 77) * WT)
    for (let i = 0; i < WT; i++) sum[i] += a * WSINE[(k * i + p) & WTM]
    e += 0.5 * a * a
  }
  t = new Float32Array(WT + 1)
  // every table as loud as the next (RMS 0.2), the loud layer 5 dB above the soft one
  const g = (layer ? 0.26 : 0.15) / Math.sqrt(e || 1)
  for (let i = 0; i < WT; i++) t[i] = g * sum[i]
  t[WT] = t[0]
  tables.set(key, t)
  return t
}
const noteOf = f => Math.max(12, Math.min(120, Math.round(69 + 12 * Math.log2(f / 440))))
const CTRL = 16 // samples between updates of vibrato and drift

// section(name, { players, attack, release, spread (0…1 across the room), centre (−1…1), vib, detune, max notes, seed })
//   → s(freqs: Hz[], level = 0.7) ⇒ [l, r] — a group of players on every note; level: soft 0 … loud 1 (brighter and louder)
export function section(name, { players = 5, attack, release, spread = 0.8, centre = 0, vib = 1, detune, max = 12, gain = 1, seed = 1 } = {}) {
  const T = TIMBRES[name], att = attack ?? T.attack, rel = release ?? T.release, cents = detune ?? T.detune
  const slots = Array.from({ length: max }, (_, s) => ({
    f: 0, on: false, age: 0, env: 0, soft: null, loud: null,
    p: Array.from({ length: players }, (_, i) => {
      const u = s * 31 + i * 7 + seed * 101, where = players > 1 ? (2 * i) / (players - 1) - 1 : 0, pan = clamp(centre + spread * (0.75 * where + 0.5 * (hash(u, 1) - 0.5)), -1, 1)
      return {
        ph: hash(u, 2), env: 0, k: 1, late: 0.05 * hash(u, 3), slow: 0.7 + 0.7 * hash(u, 4), off: (2 * hash(u, 5) - 1) * cents,
        d1: 0.11 + 0.23 * hash(u, 6), d2: 0.31 + 0.4 * hash(u, 7), vr: T.vib[0] * (0.92 + 0.16 * hash(u, 8)), vp: TAU * hash(u, 9), vd: T.vib[1] * vib * (0.6 + 0.8 * hash(u, 10)),
        gl: Math.sqrt((1 - pan) / 2), gr: Math.sqrt((1 + pan) / 2), itd: 0.00045 * pan,
      }
    }),
  }))
  const up = 1 - exp(-1 / (SR * att)), down = 1 - exp(-1 / (SR * rel)), air = T.breath ? filter('hp') : null
  let t = 0, tick = 0, bright = 0.5
  const last = []
  return (freqs, level = 0.7) => {
    // which notes sound (looked at only when they change): a note that goes on keeps its players, a new one gets a free place
    let same = freqs.length === last.length
    for (let j = 0; same && j < freqs.length; j++) if (freqs[j] !== last[j]) same = false
    if (!same) {
      last.length = freqs.length
      for (let j = 0; j < freqs.length; j++) last[j] = freqs[j]
    }
    for (const sl of slots) sl.want = same && sl.on
    for (let j = 0; !same && j < freqs.length && j < max; j++) {
      const f = freqs[j]
      let sl = slots.find(s => s.on && Math.abs(s.f / f - 1) < 0.004)
      if (!sl) {
        sl = slots.find(s => !s.on && s.env < 1e-4) ?? slots.reduce((a, b) => (!b.on && b.env < a.env ? b : a), slots.find(s => !s.on) ?? slots[0])
        if (sl.on) continue
        const n = noteOf(f)
        sl.f = f
        sl.on = true
        sl.age = 0
        sl.soft = wavetable(name, n, 0)
        sl.loud = wavetable(name, n, 1)
      }
      sl.want = true
    }
    for (const sl of slots) if (sl.on && !sl.want) sl.on = false
    t += 1 / SR
    bright += 0.0004 * (clamp(level, 0, 1) - bright)
    const ctrl = tick-- <= 0
    if (ctrl) tick = CTRL - 1
    let l = 0, r = 0, loudness = 0
    for (const sl of slots) {
      if (!sl.on && sl.env < 1e-4) { sl.env = 0; continue }
      sl.age += 1 / SR
      let e = 0
      const inc = sl.f / SR, soft = sl.soft, loud = sl.loud
      for (const p of sl.p) {
        const target = sl.on && sl.age >= p.late ? 1 : 0
        p.env += (target > p.env ? up / p.slow : down) * (target - p.env)
        if (p.env < 1e-5) continue
        if (ctrl) {
          // a few cents off, wandering; the vibrato comes in after a while and never two players alike
          const v = sl.age > T.vib[2] ? Math.min(1, (sl.age - T.vib[2]) / 0.35) : 0
          p.k = 2 ** ((p.off + 2.2 * sin(TAU * p.d1 * t + p.vp) + 1.4 * sin(TAU * p.d2 * t + 2 * p.vp) + v * p.vd * sin(TAU * p.vr * t + p.vp)) / 1200)
        }
        p.ph += inc * p.k
        if (p.ph >= 1) p.ph -= 1
        // the left ear and the right: the same wave, the far ear's a moment later (itd · f of a cycle)
        let q = p.ph + (p.itd > 0 ? 1 - p.itd * sl.f : 0), u = p.ph + (p.itd < 0 ? 1 + p.itd * sl.f : 0)
        q -= q | 0
        u -= u | 0
        let x = q * WT, i = x | 0, fr = x - i
        let a = soft[i] + fr * (soft[i + 1] - soft[i]), b = loud[i] + fr * (loud[i + 1] - loud[i])
        l += p.gl * p.env * (a + bright * (b - a))
        x = u * WT; i = x | 0; fr = x - i
        a = soft[i] + fr * (soft[i + 1] - soft[i]); b = loud[i] + fr * (loud[i + 1] - loud[i])
        r += p.gr * p.env * (a + bright * (b - a))
        if (p.env > e) e = p.env
      }
      sl.env = e
      loudness += e
    }
    const k = gain / Math.sqrt(players)
    if (air) {
      // the bows' and the breaths' noise under the tone
      const nz = T.breath * Math.min(1, loudness) * (0.4 + 0.6 * bright) * air(η(), 1800, 0.6)
      return [k * l + nz * 0.7, k * r + nz * 0.7]
    }
    return [k * l, k * r]
  }
}

// soloist(name, { vib, glide (s), scoop (¢ into each new note), accent, drift (¢: a slow wander round the note), gain }) → v(f, on, vel = 0.8) ⇒ sample — one player:
// a held note that changes pitch glides (legato), a new one starts with its attack; the vibrato arrives late; the
// dynamics open the tone (the loud table), an accent at the start for the brass
export function soloist(name, { vib = 1, glide = 0.04, scoop = 0, accent = 0, drift = 1.5, gain = 1, seed = 5 } = {}) {
  const T = TIMBRES[name], up = 1 - exp(-1 / (SR * T.attack)), down = 1 - exp(-1 / (SR * T.release)), kg = 1 - exp(-CTRL / (SR * Math.max(0.005, glide)))
  const air = T.breath ? filter('bp') : null
  let ph = hash(seed, 1), env = 0, age = 0, was = false, lf = 0, k = 1, t = 0, tick = 0, n = -1, soft = null, loud = null, osoft = null, oloud = null, xf = 1, oph = 0, v = 0.8, f0 = 440
  return (f, on, vel = 0.8) => {
    t += 1 / SR
    if (on) {
      if (!was) { age = 0; v = vel; if (env < 0.02) lf = Math.log2(f) }
      const m = noteOf(f)
      if (m !== n) {
        // the table of the new note fades in over the old one (25 ms)
        osoft = soft; oloud = loud; oph = ph; xf = soft ? 0 : 1
        n = m
        soft = wavetable(name, m, 0)
        loud = wavetable(name, m, 1)
      }
      f0 = f
    }
    was = on
    age += 1 / SR
    env += (on ? up : down) * ((on ? 1 : 0) - env)
    if (env < 1e-5 || !soft) return 0
    if (tick-- <= 0) {
      tick = CTRL - 1
      lf += kg * (Math.log2(f0) - lf)
      const late = age > T.vib[2] ? Math.min(1, (age - T.vib[2]) / 0.3) : 0
      k = 2 ** (lf + (late * vib * T.vib[1] * sin(TAU * T.vib[0] * (1 + 0.04 * sin(0.7 * t)) * t) - scoop * exp(-age / 0.045) + drift * sin(TAU * 0.23 * t)) / 1200)
    }
    const inc = k / SR
    ph += inc
    if (ph >= 1) ph -= 1
    // brightness: the dynamics, the swell of the envelope, the attack's edge
    const b = clamp((0.15 + 0.85 * v) * (0.55 + 0.45 * env) + accent * exp(-age / 0.07), 0, 1)
    let x = ph * WT, i = x | 0, fr = x - i
    let y = (1 - b) * (soft[i] + fr * (soft[i + 1] - soft[i])) + b * (loud[i] + fr * (loud[i + 1] - loud[i]))
    if (xf < 1) {
      oph += inc
      if (oph >= 1) oph -= 1
      x = oph * WT; i = x | 0; fr = x - i
      const z = (1 - b) * (osoft[i] + fr * (osoft[i + 1] - osoft[i])) + b * (oloud[i] + fr * (oloud[i + 1] - oloud[i]))
      y = xf * y + (1 - xf) * z
      xf = Math.min(1, xf + 1 / (0.025 * SR))
    }
    y *= env * (0.45 + 0.55 * v)
    if (air) y += T.breath * env * (0.5 + 0.8 * exp(-age / 0.05)) * air(η(), Math.min(9000, 2.5 * k), 1.2) * 2.5
    return gain * y
  }
}

// ---- the piano ---------------------------------------------------------------------------------------------------
// piano({ bright, slope, stretch, knock, length }) → a tone for poly() / polyWide(): tone(f, t, vel), tone.voice(f, vel)
// Each partial k: f_k = k f √(1 + B k²) (the string's stiffness; B grows up the keyboard), struck 1/8 along the string,
// the hammer's felt a low-pass that opens with the velocity; two components a fraction of a cent apart — the prompt
// sound dying fast and the aftersound five times slower (the strings of a unison trading energy): they beat as a piano does.
export function piano({ bright = 1, stretch = 1, knock = 1, length = 1, slope = 0 } = {}) {
  const partials = (f, vel) => {
    const B = clamp(0.00022 * (f / 261.63) ** 1.4, 0.00005, 0.009) * stretch, N = Math.max(3, Math.min(28, Math.floor(9500 / f)))
    const fc = (900 + 6200 * vel * vel) * bright * (0.75 + 0.25 * Math.min(2, f / 261.63)), tilt = 0.75 + slope + 1.1 * (1 - vel), norm = Math.sqrt(1 + B)
    const tp = 0.95 * length * (261.63 / f) ** 0.5, ta = 5.2 * length * (261.63 / f) ** 0.62
    const out = []
    for (let k = 1; k <= N; k++) {
      const fk = (k * f * Math.sqrt(1 + B * k * k)) / norm
      if (fk > 0.45 * SR) break
      const a = (Math.abs(Math.sin(k * PI * 0.123)) ** 0.6 / k ** tilt) / (1 + (fk / fc) ** 2)
      const q = 1 + 0.2 * (k - 1), cents = 0.5 + 0.9 * hash(k, Math.round(f))
      out.push([fk * 2 ** (-cents / 2400), 0.72 * a, tp / q, fk * 2 ** (cents / 2400), 0.28 * a, ta / (1 + 0.09 * (k - 1))])
    }
    return out
  }
  const level = f => 0.75 * (f / 261.63) ** 0.16
  const tone = (f, t, vel) => {
    let y = 0
    for (const [f1, a1, t1, f2, a2, t2] of partials(f, vel)) y += a1 * exp(-t / t1) * sin(TAU * f1 * t) + a2 * exp(-t / t2) * sin(TAU * f2 * t)
    return level(f) * vel * y
  }
  tone.voice = (f, vel) => {
    const P = partials(f, vel), n = P.length, g = level(f) * vel
    // every component a phasor turned a step at a time, its length shrinking: no sines in the loop
    const c = new Float64Array(2 * n), s = new Float64Array(2 * n), cw = new Float64Array(2 * n), sw = new Float64Array(2 * n), dk = new Float64Array(2 * n)
    P.forEach(([f1, a1, t1, f2, a2, t2], k) => {
      s[2 * k] = 0; c[2 * k] = a1; s[2 * k + 1] = 0; c[2 * k + 1] = a2
      cw[2 * k] = cos((TAU * f1) / SR); sw[2 * k] = sin((TAU * f1) / SR); dk[2 * k] = exp(-1 / (SR * t1))
      cw[2 * k + 1] = cos((TAU * f2) / SR); sw[2 * k + 1] = sin((TAU * f2) / SR); dk[2 * k + 1] = exp(-1 / (SR * t2))
    })
    // the hammer's knock and the soundboard's thump: a burst of low noise, 25 ms
    let t = 0, nz = 0, nz2 = 0
    const kn = knock * 0.5 * vel * vel * Math.min(1.5, (f / 261.63) ** 0.3), kf = 1 - exp((-TAU * (700 + 1800 * vel)) / SR)
    return () => {
      let y = 0
      for (let i = 0; i < 2 * n; i++) {
        const x = (c[i] * cw[i] - s[i] * sw[i]) * dk[i]
        s[i] = (c[i] * sw[i] + s[i] * cw[i]) * dk[i]
        c[i] = x
        y += s[i]
      }
      if (t < 0.06) {
        nz += kf * (η() - nz)
        nz2 += kf * (nz - nz2)
        y += kn * nz2 * exp(-t / 0.012)
      }
      t += 1 / SR
      return g * y
    }
  }
  return tone
}
export const grandTone = piano()
export const feltTone = piano({ bright: 0.4, slope: 0.6, knock: 1.6, length: 0.8 }) // an upright with the felt down: soft, close, a little knock

// polyWide(tone, { life, release, width }) → p() ⇒ [l, r], p.hit(f, vel, durSec, delaySec) — poly() with every note at
// its own place from left (low) to right (high), as the keys of a piano or the bars of a marimba lie
export function polyWide(tone, { life = 8, release = 0.25, max = 28, width = 0.6 } = {}) {
  const notes = []
  const p = () => {
    let l = 0, r = 0
    for (let i = notes.length - 1; i >= 0; i--) {
      const v = notes[i]
      v.t += 1 / SR
      if (v.t < 0) continue
      const damp = v.t > v.dur ? exp(-(v.t - v.dur) / release) : 1
      if (v.t > life || damp < 1e-3) { notes.splice(i, 1); continue }
      const y = damp * (tone.voice ? (v.gen ??= tone.voice(v.f, v.vel, v.t))() : tone(v.f, v.t, v.vel))
      l += v.gl * y
      r += v.gr * y
    }
    return [l, r]
  }
  p.hit = (f, vel = 0.8, dur = Infinity, delay = 0) => {
    const where = clamp(width * (Math.log2(f / 261.63) / 2.5), -1, 1)
    notes.push({ f, vel, dur, t: -delay, gl: Math.sqrt((1 - where) / 2), gr: Math.sqrt((1 + where) / 2) })
    if (notes.length > max) notes.shift()
  }
  return p
}

// ---- the studio's drums and plucked bass ----------------------------------------------------------------------------
// cymbal2({ kind: 'hat' | 'open' | 'ride' | 'crash' | 'splash', tune }) → c(t s, on): bronze as it rings — noise through eight
// narrow resonances at the plate's own inharmonic places (3.1 … 12.7 kHz) over a broad wash, the high ones dying later
// on a ride, sooner on a closed hat; the stick's ping; the ride's bell (two partials 1 : 1.48 near 560 Hz)
const CYM = { hat: [0.045, 0.6, 0.25, 0, 7000], open: [0.32, 0.7, 0.3, 0, 6000], ride: [1.4, 0.35, 0.55, 0.22, 4500], crash: [1.9, 1, 0.2, 0, 3500], splash: [0.6, 0.9, 0.2, 0, 5000] }
const CYM_F = [3130, 4270, 5390, 6570, 7910, 9230, 10870, 12710]
export function cymbal2({ kind = 'hat', tune = 1, seed = 211 } = {}) {
  const [decay, wash, ping, bell, cut] = CYM[kind], nz = noise(seed), hp = filter('hp'), bands = CYM_F.map(() => filter('bp'))
  const b1 = bell ? osc('sine') : null, b2 = bell ? osc('sine') : null
  return (t, on = true) => {
    const n = nz()
    let y = 0
    for (let i = 0; i < 8; i++) {
      const band = bands[i](n, CYM_F[i] * tune, 9)
      if (on) y += band * (0.6 + 0.4 * (i % 3)) * exp(-t / (decay * (kind === 'ride' ? 0.6 + 0.12 * i : 1.2 - 0.07 * i)))
    }
    const w = hp(n, cut)
    if (!on) return 0
    // the stick: the first milliseconds stand out
    return 0.033 * y * (1 + 4 * ping * exp(-t / 0.006)) + 0.5 * wash * w * exp(-t / decay) + (bell ? bell * exp(-t / 0.5) * (b1(560 * tune) + 0.6 * b2(828 * tune)) : 0)
  }
}
// kick2({ f, drop, decay, click, body }) → k(t s, on): a drum with a head — the pitch falls from f·drop to f in 20 ms, the shell's
// second mode, the beater's click (a 3 ms burst near 3 kHz), a little air after it
export function kick2({ f = 52, drop = 2.6, decay = 0.26, click = 0.5, body = 0.35, seed = 223 } = {}) {
  const o = osc('sine'), o2 = osc('sine'), nz = noise(seed), bp = filter('bp'), lp = filter('lp')
  let was = 9
  return (t, on = true) => {
    if (on && t < was) { o.reset(0); o2.reset(0) }
    was = on ? t : 9
    const n = nz()
    if (!on) { o(f); o2(f * 1.6); bp(0, 3000, 1.5); lp(0, 400); return 0 }
    const fr = f * (1 + (drop - 1) * exp(-t / 0.02))
    const y = exp(-t / decay) * o(fr) + body * exp(-t / (0.5 * decay)) * o2(fr * 1.6)
    return Math.tanh(1.5 * y) / 0.905 + click * exp(-t / 0.003) * bp(n, 3000, 1.5) + 0.08 * exp(-t / 0.05) * lp(n, 400)
  }
}
// a plucked double bass for poly(): the fundamental long (1.1 s at E1), the harmonics gone sooner, the finger's thump,
// a pitch that settles from 12 ¢ above in 40 ms (the string let go)
export const pizzTone = (f, t, vel) => {
  const w = TAU * f * (t - 0.00028 * exp(-t / 0.04)), d = 1.1 * (55 / f) ** 0.35
  let y = 0
  for (let k = 1; k <= 7; k++) y += (sin(k * w) / k ** (1.5 - 0.5 * vel)) * exp((-t * (0.6 + 0.9 * k)) / d) * (k % 2 ? 1 : 0.7)
  return 0.7 * vel * (1 - exp(-t / 0.004)) * y + 0.25 * vel * exp(-t / 0.012) * sin(TAU * 85 * t)
}
// a soft synth pluck for poly(): two FM operators 1 : 2 whose brightness dies in 60 ms — a marimba made of glass
export const softPluckTone = (f, t, vel) => vel * exp(-t / (0.5 + 110 / f)) * sin(TAU * f * t + (0.4 + 1.5 * vel) * exp(-t / 0.06) * sin(TAU * 2 * f * t)) * (1 - exp(-t / 0.002))
// a glass bell for poly(): FM 1 : 3.5 at a low index, a second voice an octave up arriving 9 ms later
export const glassBellTone = (f, t, vel) => {
  const one = (g, u) => (u < 0 ? 0 : exp(-u / (1.6 + 200 / g)) * sin(TAU * g * u + 1.3 * vel * exp(-u / 0.25) * sin(TAU * 3.5 * g * u)) * (1 - exp(-u / 0.003)))
  return 0.6 * vel * (one(f, t) + 0.3 * one(2 * f, t - 0.009))
}
// a fingered electric bass for poly(): round — the pluck's upper harmonics are gone in a tenth of a second, the note stays
export const fingerBassTone = (f, t, vel) => {
  const w = TAU * f * t
  let y = 0
  for (let k = 1; k <= 8; k++) y += (sin(k * w + 0.3 * k) / k ** 1.1) * (k === 1 ? 1 : exp(-t * (1.2 + 2.2 * k * (1.25 - vel)))) * (k % 2 ? 1 : 0.8)
  return 0.62 * vel * (1 - exp(-t / 0.003)) * exp(-t / (2.4 * (55 / f) ** 0.2)) * y
}
// the 808 cowbell in tune with itself, for poly(): the machine's two squares stand 1 : 1.48 apart — a fifth 23 cents flat,
// which is its sourness; here they are a pure fifth (1 : 1.5), summed partial by partial (band-limited) through the same
// band-pass (centre 4.9 f, a little wider), the same two-stage decay with a longer tail
const COWBELL2 = new Map()
export function cowbell2Tone(f, t, vel = 0.8) {
  const key = Math.round(f * 100)
  let P = COWBELL2.get(key)
  if (!P) {
    P = []
    const fc = 4.9 * f, Q = 1.1
    for (const [g, base] of [[1, f], [0.8, 1.5 * f]]) for (let k = 1; k * base < 14000; k += 2) {
      const u = (k * base) / fc
      P.push(k * base, g / k / Math.sqrt(1 + Q * Q * (u - 1 / u) ** 2))
    }
    if (COWBELL2.size > 512) COWBELL2.clear()
    COWBELL2.set(key, P)
  }
  const e = Math.min(1, t / 0.0005) * (0.58 * exp(-t / 0.014) + 0.42 * exp(-t / 0.4))
  let y = 0
  for (let i = 0; i < P.length; i += 2) y += P[i + 1] * sin(TAU * P[i] * t)
  return vel * e * y
}
