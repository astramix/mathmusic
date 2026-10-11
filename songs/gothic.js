// Gothic beat at 140 BPM (half-time): a four-part choir, church bells, a pipe organ in the
// intro, then a distorted 808, a hall snare and trap hats.
//
// x is time in beats. D minor with a major dominant — Dm, B♭, Gm, A — two bars per chord.
import {
  mod, floor, exp, sin, cos, tanh, TAU, between, hz, lerp, since, lastStep, noise, osc, filter, smooth, reverb,
  sampleLayer,
} from '../src/engine.js'

const BEAT = 16, END = 64 // intro 0–16 (organ, choir, bells), beat 16–64
const η = noise(666)
const beat = x => between(x, BEAT, END)
const D3 = 146.83

// k = ⌊x/8⌋ mod 4 → Dm, B♭, Gm, A;  s = x mod 8 = beats since the chord began
const chord = x => mod(floor(x / 8), 4)
//   c_{k,j}: SATB voicings, semitones from D3   (A has C♯ — the harmonic-minor leading tone)
const c = [[0, 7, 15, 19], [-4, 3, 12, 20], [-7, 5, 12, 20], [-5, 11, 14, 19]]
const root = [0, -4, -7, -5]

// Ch_j(x) — the choir. Each voice j sings c_{k,j}; each voice is three slightly detuned saws.
//   pitch:  f = 146.83 Hz · 2^{(c + v)/12},  vibrato v = 0.25·(1 − e^{−s})·sin(2π·r·t), r ≈ 5–6 Hz
//   vowel:  three band-pass formants F_i(x) = (1 − m)·Ah_i + m·Oo_i,  m(x) = ½(1 − cos(2πx/32))
//   volume: a(s) = (1 − e^{−1.2s})·min(1, 2(8 − s))  — swells in, breathes before the next chord
const AH = [800, 1150, 2900], OO = [350, 750, 2500], Q = [6, 8, 12], GAIN = [1, 0.5, 0.3]
const vowel = x => 0.5 * (1 - cos((TAU * x) / 32))
export const Ch = x => c[chord(x)].map(cj => -1 + cj / 12)
const choirVolume = s => (1 - exp(-1.2 * s)) * Math.min(1, 2 * (8 - s))
const choir = {
  color: '#e8d9ff',
  graph: x => (x < END ? Ch(x) : null),
  midi: x => (x < END && mod(x, 8) < 7.75 ? c[chord(x)].map(cj => 50 + cj) : []), // D3 = MIDI 50
  audio({ bpm }) {
    const voices = c[0].map((_, j) =>
      [-1, 0, 1].map(u => ({ o: osc('saw', mod(0.37 * (3 * j + u + 1), 1)), detune: 2 ** (0.07 * u / 12), rate: 5 + 0.3 * j + 0.35 * u, pan: 0.5 * u })),
    )
    const formants = [0, 1].map(() => AH.map(() => filter('bp')))
    const body = [filter('lp'), filter('lp')], fx = reverb({ room: 0.93, damp: 0.4, wet: 0.9 })
    return x => {
      if (x >= END + 0.5) return fx(0, 0)
      const k = chord(x), s = mod(x, 8), t = (x * 60) / bpm, a = choirVolume(s), m = vowel(x)
      let l = 0, r = 0
      voices.forEach((unison, j) => {
        for (const v of unison) {
          const vib = 0.25 * (1 - exp(-s)) * sin(TAU * v.rate * t + v.pan * 3)
          const y = v.o(hz(c[k][j] + vib, D3) * v.detune)
          l += y * (0.5 - 0.5 * v.pan)
          r += y * (0.5 + 0.5 * v.pan)
        }
      })
      const breath = 0.05 * η()
      const sing = (sum, side) => {
        let y = 0.15 * body[side](sum, 700)
        for (let i = 0; i < 3; i++) y += (GAIN[i] / Q[i]) * formants[side][i](sum + breath, lerp(AH[i], OO[i], m), Q[i])
        return y
      }
      return fx(0.48 * a * sing(l, 0), 0.48 * a * sing(r, 1))
    }
  },
}

// B(x) — church bell on every chord (and a softer toll mid-chord):
//   B = Σ_i a_i·e^{−d_i·t}·sin(2π·r_i·f·t),  t = seconds since the toll,  f = chord root an octave up
//   r = (0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166)  — the inharmonic partials of a bell
const R = [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166]
const A = [0.5, 0.5, 0.45, 0.25, 0.6, 0.25, 0.2, 0.18, 0.12]
const DECAY = [0.35, 0.7, 0.9, 1.3, 1.1, 2, 2.4, 3, 4.5]
const τB = x => since(x, [0, 4], 8)
const toll = (t, f) => {
  let y = 0
  for (let i = 0; i < R.length; i++) y += A[i] * exp(-DECAY[i] * t) * sin(TAU * R[i] * f * t)
  return y
}
const bells = {
  color: '#ffd27a',
  graph: x => (x < END ? 1.2 + 0.8 * exp(-0.8 * τB(x)) : null),
  midi: x => (x < END && τB(x) < 0.5 ? [62 + root[chord(x)]] : []), // D4 = MIDI 62
  audio({ bpm }) {
    const fx = reverb({ room: 0.9, wet: 0.6 }), sec = (60 / bpm)
    return x => {
      // the current toll plus the one before it, so long rings overlap instead of cutting off
      let y = 0
      for (let back = 0; back < 2; back++) {
        const h = Math.round(x - τB(x)) - 4 * back // tolls fall on whole beats
        if (h < 0 || h >= END) continue
        y += (mod(h, 8) === 0 ? 1 : 0.45) * toll((x - h) * sec, hz(root[chord(h)] + 12, D3))
      }
      return fx(0.19 * y, 0.19 * y)
    }
  },
}

// O(x) — pipe organ pedal on D2 for the intro: drawbars → partials 1, 2, 3, 4, 6
//   O = w(x)·Σ g_i·sin(2π·i·73.42·t),  w = min(1, x/4)·clamp((18 − x)/4)
const organLevel = x => Math.max(0, Math.min(1, x / 4, (18 - x) / 4))
const organ = {
  color: '#9fd3ff',
  graph: x => (organLevel(x) > 0 ? -2.2 + 0.4 * organLevel(x) : null),
  midi: x => (organLevel(x) > 0.5 ? [38] : []),
  audio({ bpm }) {
    const fx = reverb({ room: 0.92, wet: 0.7 })
    return x => {
      const w = organLevel(x), t = (x * 60) / bpm
      let y = 0
      if (w > 0) for (const [i, g] of [[1, 1], [2, 0.7], [3, 0.4], [4, 0.35], [6, 0.2]]) y += g * sin(TAU * i * 73.42 * t)
      return fx(0.12 * w * y, 0.12 * w * y)
    }
  },
}

// 808 + kick — 32 sixteenths per chord, value = semitones above the chord root (D2, B♭1, G1, A1)
//   808: tanh(2.2·sin 2π∫f)·e^{−0.5τ}, f glides in ~60 ms;  kick on hits whose value is 0
const pattern = [
  0, null, null, null, null, null, 0, null, null, null, 0, null, null, null, null, null,
  0, null, null, null, null, null, 12, null, 0, null, null, null, 7, null, null, null,
]
const hit808 = x => lastStep(pattern, mod(x, 8))
const b808 = {
  color: '#c9b8ff',
  graph: x => (beat(x) && hit808(x).τ < 2 ? -2.2 + (root[chord(x)] + hit808(x).v) / 12 : null),
  midi: x => (beat(x) && hit808(x).τ < 1 ? [38 + root[chord(x)] + hit808(x).v] : []), // D2 = MIDI 38
  audio() {
    const o = osc('sine'), glide = smooth(60), level = smooth(4), lp = filter('lp')
    return x => {
      const { v, τ } = hit808(x), f = glide(hz(root[chord(x)] + v, 73.42)), a = level(beat(x) ? exp(-0.5 * τ) : 0)
      return 0.45 * a * lp(tanh(2.2 * o(f)), 1800)
    }
  },
}
const kickSteps = pattern.map(v => (v === 0 ? 0 : null))
const τK = x => lastStep(kickSteps, mod(x, 8)).τ
const kick = {
  color: '#ff4f8b',
  graph: x => (beat(x) ? 3 + 1.5 * exp(-6 * τK(x)) : null),
  midi: x => (beat(x) && τK(x) < 0.25 ? [36] : []),
  audio() {
    const o = osc('sine')
    let last = Infinity
    return x => {
      const τ = τK(x)
      if (τ < last) o.reset()
      last = τ
      return beat(x) ? 0.7 * exp(-10 * τ) * tanh(1.5 * o(50 + 200 * exp(-40 * τ))) : 0
    }
  },
}

// S(x) — half-time snare on beat 3 of every bar, in a cathedral-sized hall
//   S = 0.6e^{−9τ}·η + 0.4e^{−18τ}·sin 2π·180t
const τS = x => since(x, [2], 4)
const snare = {
  color: '#8fa8ff',
  graph: x => (beat(x) && τS(x) < 0.5 ? 2.4 + 0.4 * exp(-9 * τS(x)) * η() : null),
  midi: x => (beat(x) && τS(x) < 0.25 ? [38] : []),
  audio({ bpm }) {
    const hp = filter('hp'), fx = reverb({ room: 0.92, damp: 0.25, wet: 0.8 })
    return x => {
      const τ = τS(x), t = (τ * 60) / bpm, noisy = hp(η(), 500)
      const y = beat(x) ? 0.6 * exp(-9 * τ) * noisy + 0.4 * exp(-18 * τ) * sin(TAU * 180 * t) : 0
      return fx(y, y)
    }
  },
}

// H(x) — hats: ρ per beat = 2 (8ths), 4 from beat 6 of each chord, 6 (triplets) on its last half beat
const ρ = x => {
  const b = mod(x, 8)
  return b >= 7.5 ? 6 : b >= 6 ? 4 : 2
}
const τH = x => mod(ρ(x) * x, 1) / ρ(x)
const hats = {
  color: '#8fa8ff',
  graph: x => (beat(x) && τH(x) < 0.06 ? 1.9 + 0.1 * η() : null),
  midi: x => (beat(x) && τH(x) < 0.06 ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => (beat(x) ? 0.3 * exp(-50 * τH(x)) * hp(η(), 7500) : hp(0, 7500))
  },
}

// I(x) — impact where the beat comes in:  e^{−1.5τ}·sin 2π∫(38 + 80e^{−6τ}) + 0.4e^{−3τ}·η
const impact = {
  audio() {
    const o = osc('sine'), lp = filter('lp'), fx = reverb({ room: 0.93, wet: 0.7 })
    return x => {
      const τ = x - BEAT
      const y = τ >= 0 && τ < 8 ? 0.8 * exp(-1.5 * τ) * o(38 + 80 * exp(-6 * τ)) + 0.4 * exp(-3 * τ) * lp(η(), 900) : 0
      return fx(y, y)
    }
  },
}

export default {
  name: 'gothic',
  bpm: 140,
  key: 'Dm',
  length: END,
  sections: [[0, 'intro'], [BEAT, 'beat']],
  tracks: {
    organ, choir, bells, impact, b808, kick, snare, hats,
    sample_a: sampleLayer('A', x => beat(x) && τS(x) < 0.25, { gain: 0.5 }),
    sample_b: sampleLayer('B', x => beat(x) && τK(x) < 0.25, { gain: 0.6 }),
  },
}
