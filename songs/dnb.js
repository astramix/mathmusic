// Drum & Bass at 174 BPM: a two-step break, a wobbling reese bass and a pluck hook.
//
// x is time in beats. τ(x) = beats since the latest hit of a rhythm (engine `since`);
// envelopes e^{−kτ} turn those rhythms into sound.
import {
  mod, floor, exp, sin, tanh, TAU, between, hz, since, lastStep, noise, osc, supersaw, filter, smooth, reverb, delay,
  sampleLayer,
} from '../src/engine.js'

const RISE = 8, DROP = 16, HOOK = 48, END = 80 // intro 0–16 (riser from 8), drop 16–80, hook from 48
const η = noise(174)
const drop = x => between(x, DROP, END)

// Fm – D♭ – E♭ – Cm, two bars each:  k = ⌊x/8⌋ mod 4
const chord = x => mod(floor(x / 8), 4)
const c = [[0, 3, 7], [0, 3, 8], [2, 5, 10], [2, 7, 10]] // c_{k,j}: pad tones, semitones from F3
const root = [0, -4, -2, -5] // b_k: bass roots, semitones from F1

// Two-step: kick on 1 and the "and" of 3, snare on 2 and 4
const τK = x => since(x, [0, 2.5], 4)
const τS = x => since(x, [1, 3], 4)

// K(x) — kick:  e^{−4τ}·tanh(1.6·sin 2π∫f),  f = 48 + 220e^{−50τ}  (268 Hz click → 48 Hz)
const kick = {
  color: '#ff4f8b',
  graph: x => (drop(x) ? 3 + 1.5 * exp(-6 * τK(x)) : null),
  midi: x => (drop(x) && τK(x) < 0.25 ? [36] : []),
  audio() {
    const o = osc('sine')
    let last = Infinity
    return x => {
      if (!drop(x)) return 0
      const τ = τK(x)
      if (τ < last) o.reset() // every hit starts from phase 0
      last = τ
      return 0.9 * exp(-4 * τ) * tanh(1.6 * o(48 + 220 * exp(-50 * τ))) + 0.15 * exp(-150 * τ) * η()
    }
  },
}

// S(x) — snare:  0.6e^{−9τ}·η + e^{−16τ}·(0.45 sin 2π·185t + 0.2 sin 2π·330t)   (t = τ in seconds)
const snare = {
  color: '#8fa8ff',
  graph: x => (drop(x) && τS(x) < 0.4 ? 2.4 + 0.5 * exp(-14 * τS(x)) * η() : null),
  midi: x => (drop(x) && τS(x) < 0.25 ? [38] : []),
  audio({ bpm }) {
    const hp = filter('hp'), fx = reverb({ room: 0.75, wet: 0.35 })
    return x => {
      const τ = τS(x), t = (τ * 60) / bpm, noisy = hp(η(), 900)
      const body = 0.45 * sin(TAU * 185 * t) + 0.2 * sin(TAU * 330 * t)
      const y = drop(x) ? 0.6 * exp(-9 * τ) * noisy + exp(-16 * τ) * body : 0
      return fx(y, y)
    }
  },
}

// H(x) — 8th hats:  a·e^{−45τ}·η,  τ = x mod ½,  a = 1 off the beat, 0.5 on it; enter at x = 8
const hats = {
  color: '#8fa8ff',
  graph: x => (between(x, RISE, END) && mod(x, 0.5) < 0.15 ? 1.9 + 0.12 * exp(-45 * mod(x, 0.5)) * η() : null),
  midi: x => (between(x, RISE, END) && mod(x, 0.5) < 0.1 ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => {
      const τ = mod(x, 0.5), accent = mod(floor(2 * x), 2) ? 1 : 0.5, level = drop(x) ? 0.5 : 0.25
      return between(x, RISE, END) ? level * accent * exp(-45 * τ) * hp(η(), 7000) : hp(0, 7000)
    }
  },
}

// B(x) — reese bass: two saws ±12 cents (one per side) an octave above a sine sub
//   f = 43.65 Hz · 2^{b_k/12}                                   (F1, D♭1, E♭1, C1)
//   cutoff f_c = 120 · 2^{5w},  w(x) = ½(1 − cos 2π·r·x),   r = 2^{(0, 1, 0, 2)_{⌊x⌋ mod 4}} wobbles per beat
//   ducked under the kick: × (1 − 0.6e^{−8τ_K})
const wobble = x => 0.5 * (1 - Math.cos(TAU * x * 2 ** [0, 1, 0, 2][mod(floor(x), 4)]))
const bass = {
  color: '#c9b8ff',
  graph: x => (drop(x) ? -2.7 + 1.3 * wobble(x) : null),
  midi: x => (drop(x) ? [29 + root[chord(x)]] : []), // F1 = MIDI 29
  audio() {
    const a = osc('saw', 0.1), b = osc('saw', 0.6), sub = osc('sine')
    const lpL = filter('lp'), lpR = filter('lp'), on = smooth(5), glide = smooth(20)
    return x => {
      const f = glide(hz(root[chord(x)], 43.65)), fc = 120 * 2 ** (5 * wobble(x))
      const v = on(drop(x) ? 1 : 0) * (1 - 0.6 * exp(-8 * τK(x)))
      const l = tanh(2 * lpL(a(2 * f * 1.007), fc, 2)), r = tanh(2 * lpR(b((2 * f) / 1.007), fc, 2))
      const s = 0.25 * sub(f < 40 ? 2 * f : f)
      return [v * (0.25 * l + s), v * (0.25 * r + s)]
    }
  },
}

// P_j(x) = c_{k,j}/12 — pads: open up through the intro (cutoff 400 Hz · 2^{3.5x/16}), then sit back
export const P = x => c[chord(x)].map(cj => cj / 12)
const pads = {
  color: '#9fd3ff',
  graph: x => (x < END ? P(x) : null),
  midi: x => (x < END ? c[chord(x)].map(cj => 53 + cj) : []), // F3 = MIDI 53
  audio() {
    const voices = c[0].map((_, j) => supersaw({ voices: 5, detune: 0.2, seed: 21 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), fade = smooth(80), fx = reverb({ room: 0.9, wet: 0.6 })
    return x => {
      let l = 0, r = 0
      P(x).forEach((y, j) => {
        const [vl, vr] = voices[j](hz(12 * y, 174.61)) // curve → pitch: c = 12P
        l += vl
        r += vr
      })
      const fc = x < DROP ? 400 * 2 ** ((3.5 * x) / DROP) : 2500
      const a = fade(x < DROP ? 0.3 : x < END ? 0.14 : 0)
      return fx(a * lpL(l, fc), a * lpR(r, fc))
    }
  },
}

// R(x) = ((x − 8)/8)² on [8, 16) — noise sweep into the drop, 400 Hz … 12.8 kHz
export const R = x => (between(x, RISE, DROP) ? ((x - RISE) / (DROP - RISE)) ** 2 : null)
const riser = {
  color: '#c9b8ff',
  graph: x => (R(x) === null ? null : -2.5 + 2 * R(x)),
  audio() {
    const bp = filter('bp')
    return x => {
      const y = R(x)
      return y === null ? 0 : 0.5 * y * bp(η(), 400 * 2 ** (5 * y), 1.5)
    }
  },
}

// Crash on the drop and on the hook:  e^{−1.2τ}·η, high-passed
const crash = {
  midi: x => ((between(x, DROP, DROP + 0.25) || between(x, HOOK, HOOK + 0.25)) ? [49] : []),
  audio() {
    const hp = filter('hp'), fx = reverb({ room: 0.85, wet: 0.5 })
    return x => {
      const τ = x >= HOOK ? x - HOOK : x - DROP
      const y = x >= DROP && x < END ? 0.35 * exp(-1.2 * τ) * hp(η(), 4000) : 0
      return fx(y, y)
    }
  },
}

// L(x) — pluck hook from beat 48: 16ths over the chord, rests where the pattern has null
//   n = c_{k, p_i} + 12,  p = (0, ·, 1, 2, ·, 1, 2, ·, 0, ·, 1, 2, ·, 2, 1, ·)
const p = [0, null, 1, 2, null, 1, 2, null, 0, null, 1, 2, null, 2, 1, null]
const hookNote = x => {
  const h = lastStep(p, x)
  return { n: c[chord(x)][h.v] + 12, τ: h.τ }
}
const hook = {
  color: '#ffffff',
  graph: x => (between(x, HOOK, END) && p[mod(floor(4 * x), 16)] !== null ? 0.9 + hookNote(x).n / 24 : null),
  midi: x => (between(x, HOOK, END) && p[mod(floor(4 * x), 16)] !== null && mod(4 * x, 1) < 0.6 ? [53 + hookNote(x).n] : []),
  audio({ bpm }) {
    const o = osc('square'), lp = filter('lp'), echo = delay({ time: (0.75 * 60) / bpm, feedback: 0.4, wet: 0.45 })
    const fx = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const { n, τ } = hookNote(x)
      const y = between(x, HOOK, END) ? 0.3 * exp(-10 * τ) * lp(o(hz(n, 174.61)), 600 + 4000 * exp(-14 * τ)) : 0
      const [l, r] = echo(y, y)
      return fx(l, r)
    }
  },
}

export default {
  name: 'dnb',
  bpm: 174,
  key: 'Fm',
  length: END,
  sections: [[0, 'intro'], [DROP, 'drop'], [HOOK, 'hook']],
  tracks: {
    pads, riser, bass, kick, snare, hats, crash, hook,
    sample_a: sampleLayer('A', x => drop(x) && τS(x) < 0.25, { gain: 0.5 }),
    sample_b: sampleLayer('B', x => drop(x) && τK(x) < 0.25, { gain: 0.6 }),
  },
}
