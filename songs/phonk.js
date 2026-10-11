// Drift phonk at 130 BPM: a cowbell riff, a distorted 808 with slides, trap hats with rolls.
//
// x is time in beats. Riffs are step sequences on the 16th-note grid (null = rest);
// lastStep(seq, x) gives the step that is sounding and τ = beats since it started.
import {
  mod, floor, exp, sin, tanh, TAU, between, hz, since, lastStep, noise, osc, filter, smooth, reverb, delay,
  sampleLayer,
} from '../src/engine.js'

const DROP = 8, BREAK = 40, BACK = 48, END = 64 // intro 0–8, drop 8–40, break 40–48, drop 48–64
const η = noise(130)
const full = x => between(x, DROP, BREAK) || between(x, BACK, END)
const playing = x => between(x, 0, END)

// CB(x) — cowbell riff over two bars, semitones from D5 (587 Hz):
//   two square waves at f and 1.48f (the 808 cowbell recipe), band-passed at 1.8f, then driven
//   volume e^{−30τ} + 0.3e^{−6τ}
const riff = [
  0, null, 0, null, -2, null, 0, null, 3, null, 0, -2, null, -4, null, -5,
  0, null, 0, null, -2, null, 0, null, 5, 3, null, 0, -2, null, -4, -7,
]
const cowbell = {
  color: '#ffffff',
  graph: x => {
    const h = lastStep(riff, x)
    return playing(x) && h.τ < 0.2 ? 0.5 + h.v / 8 : null
  },
  midi: x => {
    const h = lastStep(riff, x)
    return playing(x) && h.τ < 0.2 ? [74 + h.v] : [] // D5 = MIDI 74
  },
  audio({ bpm }) {
    const a = osc('square'), b = osc('square'), bp = filter('bp'), hp = filter('hp'), lp = filter('lp')
    const echo = delay({ time: (0.75 * 60) / bpm, feedback: 0.3, wet: 0.25 }), fx = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const { v, τ } = lastStep(riff, x), f = hz(v, 587.33)
      const e = playing(x) ? exp(-30 * τ) + 0.3 * exp(-6 * τ) : 0
      const raw = bp((a(f) + b(1.48 * f)) * e, 1.8 * f, 1.5)
      const fc = x < DROP ? 300 * 2 ** (0.7 * x) : 16000 // the intro opens the filter
      const y = 0.4 * lp(hp(tanh(2.5 * raw), 300), fc)
      const [l, r] = echo(y, y)
      return fx(l, r)
    }
  },
}

// 808 — distorted sine with slides, semitones from G1 (49 Hz):
//   f glides to 49 Hz · 2^{n/12} in ~40 ms,   y = tanh(3·sin 2π∫f) · e^{−0.9τ}
const bassline = [
  0, null, null, 0, null, null, 0, null, null, null, 3, null, null, null, -2, null,
  0, null, null, 0, null, null, 5, null, null, null, 3, null, -2, null, -4, null,
]
const b808 = {
  color: '#c9b8ff',
  graph: x => {
    const h = lastStep(bassline, x)
    return full(x) && h.τ < 1.5 ? -2.5 + h.v / 8 : null
  },
  midi: x => {
    const h = lastStep(bassline, x)
    return full(x) && h.τ < 0.6 ? [31 + h.v] : [] // G1 = MIDI 31
  },
  audio() {
    const o = osc('sine'), glide = smooth(40), level = smooth(3), lp = filter('lp')
    return x => {
      const { v, τ } = lastStep(bassline, x)
      const f = glide(hz(v, 49)), a = level(full(x) ? exp(-0.9 * τ) : 0)
      return 0.5 * a * lp(tanh(3 * o(f)), 2500)
    }
  },
}

// K(x) — kick on every 808 hit:  e^{−12τ}·sin 2π∫(50 + 180e^{−40τ})
const kick = {
  color: '#ff4f8b',
  graph: x => (full(x) ? 3 + 1.5 * exp(-8 * lastStep(bassline, x).τ) : null),
  midi: x => (full(x) && lastStep(bassline, x).τ < 0.2 ? [36] : []),
  audio() {
    const o = osc('sine')
    let last = Infinity
    return x => {
      const { τ } = lastStep(bassline, x)
      if (τ < last) o.reset()
      last = τ
      return full(x) ? 0.8 * exp(-12 * τ) * tanh(1.5 * o(50 + 180 * exp(-40 * τ))) : 0
    }
  },
}

// C(x) — clap-snare on 2 and 4: three 5 ms bursts, then a tail, plus a 200 Hz body
//   C = η·(Σ_{i=0..2} e^{−300(τ − 0.012i)}·[τ ≥ 0.012i] + 0.6e^{−7τ}) + 0.3e^{−20τ}·sin 2π·200t
const τS = x => since(x, [1, 3], 4)
const clapEnv = τ => {
  let e = 0.6 * exp(-7 * τ)
  for (let i = 0; i < 3; i++) if (τ >= 0.012 * i) e += exp(-300 * (τ - 0.012 * i))
  return e
}
const clap = {
  color: '#8fa8ff',
  graph: x => (full(x) && τS(x) < 0.3 ? 2.4 + 0.25 * clapEnv(τS(x)) * η() : null),
  midi: x => (full(x) && τS(x) < 0.25 ? [39] : []),
  audio({ bpm }) {
    const bp = filter('bp'), fx = reverb({ room: 0.7, wet: 0.3 })
    return x => {
      const τ = τS(x), t = (τ * 60) / bpm, noisy = bp(η(), 1500, 0.7)
      const y = full(x) ? 1.3 * clapEnv(τ) * noisy + 0.3 * exp(-20 * τ) * sin(TAU * 200 * t) : 0
      return fx(y, y)
    }
  },
}

// H(x) — trap hats with rolls: ρ hits per beat, ρ = 4, but 6 on beat 7 and 8 on its last half
//   ρ(x) = 8 if (x mod 8) ≥ 7.5,  6 if 6 ≤ (x mod 8) < 7,  else 4;    τ = (ρx mod 1)/ρ
const ρ = x => {
  const b = mod(x, 8)
  return b >= 7.5 ? 8 : b >= 6 && b < 7 ? 6 : 4
}
const τH = x => mod(ρ(x) * x, 1) / ρ(x)
const hats = {
  color: '#8fa8ff',
  graph: x => (between(x, 4, END) && τH(x) < 0.06 ? 1.9 + 0.1 * η() : null),
  midi: x => (between(x, 4, END) && τH(x) < 0.06 ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => {
      const τ = τH(x), accent = mod(x, 0.5) < 0.25 ? 0.6 : 1
      return between(x, 4, END) ? 0.35 * accent * exp(-60 * τ) * hp(η(), 8000) : hp(0, 8000)
    }
  },
}

// V(x) — vinyl crackle: sparse clicks η·[η′ > 0.9993] plus a little hiss
const vinyl = {
  audio() {
    const lp = filter('lp'), dust = noise(33)
    return x => (playing(x) ? lp((dust() > 0.9993 ? 0.6 * η() : 0) + 0.004 * η(), 4000) : 0)
  },
}

export default {
  name: 'phonk',
  bpm: 130,
  length: END,
  sections: [[0, 'intro'], [DROP, 'drop'], [BREAK, 'break'], [BACK, 'drop 2']],
  tracks: {
    cowbell, b808, kick, clap, hats, vinyl,
    sample_a: sampleLayer('A', x => full(x) && τS(x) < 0.25, { gain: 0.5 }),
    sample_b: sampleLayer('B', x => full(x) && lastStep(bassline, x).τ < 0.2, { gain: 0.6 }),
  },
}
