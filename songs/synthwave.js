// Synthwave / outrun at 120 BPM: driving 16th-note octave bass, an arpeggio with ping-pong
// echoes, a gated-reverb snare, 80s tom fills and a brassy lead with vibrato.
//
// x is time in beats; the progression is Em – C – G – D, two bars per chord.
import {
  mod, floor, exp, sin, tanh, TAU, between, hz, since, noise, osc, supersaw, filter, smooth, reverb, delay,
  sampleLayer,
} from '../src/engine.js'

const KICKS = 8, MAIN = 16, LEAD = 32, END = 64 // intro 0–16 (kick from 8), main 16–64, lead from 32
const η = noise(80)
const main = x => between(x, MAIN, END)

// k = ⌊x/8⌋ mod 4 → Em, C, G, D
const chord = x => mod(floor(x / 8), 4)
const c = [[0, 3, 7], [0, 3, 8], [-2, 3, 7], [-2, 2, 5]] // c_{k,j}: chord tones, semitones from E3
const root = [0, -4, 3, -2] // b_k: bass roots, semitones from E2

const τK = x => mod(x, 1) // four on the floor
const τS = x => since(x, [1, 3], 4) // snare on 2 and 4
const s16 = x => mod(x, 0.25) // beats since the current 16th started

// K(x) — kick:  e^{−5τ}·tanh(1.3·sin 2π∫f),  f = 45 + 160e^{−35τ}
const kick = {
  color: '#ff4f8b',
  graph: x => (between(x, KICKS, END) ? 3 + 1.5 * exp(-6 * τK(x)) : null),
  midi: x => (between(x, KICKS, END) && τK(x) < 0.25 ? [36] : []),
  audio() {
    const o = osc('sine')
    let last = Infinity
    return x => {
      const τ = τK(x)
      if (τ < last) o.reset()
      last = τ
      return between(x, KICKS, END) ? 0.85 * exp(-5 * τ) * tanh(1.3 * o(45 + 160 * exp(-35 * τ))) : 0
    }
  },
}

// S(x) — the 80s gated snare: a snare into a big hall, and a gate that slams the hall shut
//   dry = 0.6e^{−12τ}·η + 0.5e^{−25τ}·sin 2π·200t,     wet × [τ < 0.45]
const snare = {
  color: '#8fa8ff',
  graph: x => (main(x) && τS(x) < 0.45 ? 2.4 + 0.35 * η() : null),
  midi: x => (main(x) && τS(x) < 0.25 ? [38] : []),
  audio({ bpm }) {
    const hp = filter('hp'), hall = reverb({ room: 0.92, damp: 0.2, wet: 1 }), gate = smooth(4)
    return x => {
      const τ = τS(x), t = (τ * 60) / bpm, noisy = hp(η(), 600)
      const dry = main(x) ? 0.6 * exp(-12 * τ) * noisy + 0.5 * exp(-25 * τ) * sin(TAU * 200 * t) : 0
      const [l, r] = hall(dry, dry), g = 1.3 * gate(main(x) && τ < 0.45 ? 1 : 0)
      return [dry + (l - dry) * g, dry + (r - dry) * g]
    }
  },
}

// H(x) — 16th hats, accents a = (0.4, 0.25, 1, 0.25) on each beat's four 16ths
const hats = {
  color: '#8fa8ff',
  graph: x => (main(x) && s16(x) < 0.08 ? 1.9 + 0.1 * η() : null),
  midi: x => (main(x) && s16(x) < 0.08 ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => {
      const a = [0.4, 0.25, 1, 0.25][mod(floor(4 * x), 4)]
      return main(x) ? 0.5 * a * exp(-50 * s16(x)) * hp(η(), 8000) : hp(0, 8000)
    }
  },
}

// T(x) — tom fill on the last beat and a half of every 4 bars: hits at 14.5, 15, 15.5 (mod 16)
//   f = (180, 140, 105)_i · (1 + 0.6e^{−25τ}),   volume e^{−6τ}
const fill = x => (main(x) && mod(x, 16) >= 14.5 ? floor((mod(x, 16) - 14.5) * 2) : null)
const toms = {
  midi: x => (fill(x) !== null && mod(x, 0.5) < 0.25 ? [[45, 43, 41][fill(x)]] : []),
  audio() {
    const o = osc('sine'), fx = reverb({ room: 0.85, wet: 0.5 })
    let last = Infinity
    return x => {
      const i = fill(x), τ = mod(x, 0.5)
      if (τ < last) o.reset()
      last = τ
      const y = i === null ? 0 : 0.6 * exp(-6 * τ) * tanh(1.5 * o([180, 140, 105][i] * (1 + 0.6 * exp(-25 * τ))))
      return fx(y, y)
    }
  },
}

// B(x) — octave bass on 16ths:  f = 82.41 Hz · 2^{(b_k + 12·o)/12},  o = (0, 0, 1, 0)_{⌊4x⌋ mod 4}
//   pluck: volume e^{−5s}, cutoff 250 + 2800e^{−14s};  ducked by the kick × (1 − 0.7e^{−7τ_K})
const bassNote = x => root[chord(x)] + 12 * [0, 0, 1, 0][mod(floor(4 * x), 4)]
const bass = {
  color: '#c9b8ff',
  graph: x => (main(x) ? -2.8 + bassNote(x) / 24 + 0.3 * exp(-5 * s16(x)) : null),
  midi: x => (main(x) && s16(x) < 0.2 ? [40 + bassNote(x)] : []), // E2 = MIDI 40
  audio() {
    const a = osc('saw'), b = osc('saw', 0.5), lp = filter('lp')
    return x => {
      const s = s16(x), f = hz(bassNote(x), 82.41)
      const y = lp(a(f) + 0.5 * b(f * 1.005), 250 + 2800 * exp(-14 * s), 1.2)
      return main(x) ? 0.42 * exp(-5 * s) * (1 - 0.7 * exp(-7 * τK(x))) * tanh(1.5 * y) : 0
    }
  },
}

// A(x) — arpeggio: 16ths up and down the chord over two octaves, with ping-pong echoes
//   n = (t₀, t₁, t₂, t₀+12, t₁+12)_{p_i} + 12,   p = (0, 1, 2, 3, 4, 3, 2, 1)_{⌊4x⌋ mod 8}
const arpNote = x => {
  const t = c[chord(x)]
  return [t[0], t[1], t[2], t[0] + 12, t[1] + 12][[0, 1, 2, 3, 4, 3, 2, 1][mod(floor(4 * x), 8)]] + 12
}
const arp = {
  midi: x => (x < END && s16(x) < 0.15 ? [52 + arpNote(x)] : []), // E3 = MIDI 52
  audio({ bpm }) {
    const o = osc('square'), lp = filter('lp'), echo = delay({ time: (0.75 * 60) / bpm, feedback: 0.45, wet: 0.5 })
    return x => {
      const s = s16(x), level = x < KICKS ? 0.12 : x < END ? 0.17 : 0
      const y = level * exp(-10 * s) * lp(o(hz(arpNote(x), 164.81)), 1200 + 3000 * exp(-20 * s))
      return echo(y, y)
    }
  },
}

// P_j(x) = −0.9 + c_{k,j}/12 — warm pads, brightening through the intro
export const P = x => c[chord(x)].map(cj => -0.9 + cj / 12)
const pads = {
  color: '#9fd3ff',
  graph: x => (x < END ? P(x) : null),
  midi: x => (x < END ? c[chord(x)].map(cj => 52 + cj) : []),
  audio() {
    const voices = c[0].map((_, j) => supersaw({ voices: 5, detune: 0.12, seed: 31 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), fade = smooth(100), fx = reverb({ room: 0.88, wet: 0.5 })
    return x => {
      let l = 0, r = 0
      P(x).forEach((y, j) => {
        const [vl, vr] = voices[j](hz(12 * (y + 0.9), 164.81)) // curve → pitch: c = 12(P + 0.9)
        l += vl
        r += vr
      })
      const fc = x < MAIN ? 500 * 2 ** ((2 * x) / MAIN) : 2000, a = fade(x < END ? 0.15 : 0)
      return fx(a * lpL(l, fc), a * lpR(r, fc))
    }
  },
}

// L(x) — the lead, from beat 32: a 32-beat melody of (start, length, n), n in semitones from E4
//   pitch glides between notes, vibrato 0.2·min(1, τ/0.75)·sin(2π·5.5t) semitones
const melody = [
  [0, 1.5, 7], [1.5, 0.5, 5], [2, 1, 3], [3, 1, 2], [4, 2, 0], [6, 1, 3], [7, 1, 7], // Em
  [8, 1.5, 8], [9.5, 0.5, 7], [10, 2, 3], [12, 2, 0], [14, 1, 3], [15, 1, 8], // C
  [16, 1.5, 10], [17.5, 0.5, 8], [18, 2, 7], [20, 2, 3], [22, 1, 7], [23, 1, 10], // G
  [24, 2, 14], [26, 1, 12], [27, 1, 10], [28, 2, 5], [30, 1, 10], [31, 1, 2], // D
]
const leadNote = x => {
  const p = mod(x - LEAD, 32), [start, len, n] = melody.findLast(([s]) => s <= p)
  return { n, τ: p - start, on: between(x, LEAD, END) && p - start < 0.92 * len }
}
const lead = {
  color: '#ffffff',
  graph: x => {
    const { n, on } = leadNote(x)
    return on ? 0.2 + n / 8 : null
  },
  midi: x => {
    const { n, on } = leadNote(x)
    return on ? [64 + n] : [] // E4 = MIDI 64
  },
  audio({ bpm }) {
    const saws = supersaw({ voices: 7, detune: 0.18, seed: 9 }), sq = osc('square'), lpL = filter('lp'), lpR = filter('lp')
    const glide = smooth(35), env = smooth(8), echo = delay({ time: (0.75 * 60) / bpm, feedback: 0.35, wet: 0.3 })
    const fx = reverb({ room: 0.85, wet: 0.35 })
    return x => {
      const { n, τ, on } = leadNote(x), t = (x * 60) / bpm
      const vib = 0.2 * Math.min(1, τ / 0.75) * sin(TAU * 5.5 * t)
      const f = hz(glide(n) + vib, 329.63), a = env(on ? 1 : 0)
      const [l, r] = saws(f), s = 0.3 * sq(f / 2)
      const [el, er] = echo(0.42 * a * lpL(l + s, 4500), 0.42 * a * lpR(r + s, 4500))
      return fx(el, er)
    }
  },
}

export default {
  name: 'synthwave',
  bpm: 120,
  key: 'Em',
  length: END,
  sections: [[0, 'intro'], [MAIN, 'drive'], [LEAD, 'lead']],
  tracks: {
    pads, arp, bass, kick, snare, hats, toms, lead,
    sample_a: sampleLayer('A', x => main(x) && τS(x) < 0.25, { gain: 0.5 }),
    sample_b: sampleLayer('B', x => between(x, KICKS, END) && τK(x) < 0.25, { gain: 0.6 }),
  },
}
