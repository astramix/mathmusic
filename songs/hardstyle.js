// "Hardstyle — but it's just math": the equations from the pictures, turned into sound.
//
// x is time in beats (150 BPM). Each part is a curve y(x) written as in the pictures;
// next to it is the mapping that turns the curve into audio — the curve read back as
// pitch, as volume, or (minus its display offset) as the waveform itself.
import {
  mod, floor, exp, tanh, between, hz, noise, osc, supersaw, filter, smooth, reverb, sampleLayer,
} from '../src/engine.js'

const BUILD = 16, DROP = 24, END = 56 // breakdown 0–16, build-up 16–24, drop 24–56 (beats)
const η = noise(42) // η = white noise

// Harmony shared by pads, lead and bass: k = ⌊x/2⌋ mod 4 → Am, F, C, G (two beats each)
const chord = x => mod(floor(x / 2), 4)
const c = [[0, 3, 7], [0, 3, 8], [-2, 3, 7], [-2, 2, 5]] // c_{k,j}: chord tones, semitones from A3
const root = [-12, -16, -9, -14] // A1, F1, C2, G1 in semitones from 110 Hz

// K(x) — kick + reverse bass
//   K = 5e^{−14r} − 1 − r/2  if r < 0.55,  −1.9 + 1.6w²  otherwise;   r = x mod 1,  w = (r − 0.55)/0.45
export const K = x => {
  const r = mod(x, 1), w = (r - 0.55) / 0.45
  return r < 0.55 ? 5 * exp(-14 * r) - 1 - r / 2 : -1.9 + 1.6 * w ** 2
}

// C(x) — clap on beats 2 and 4
//   C = 2.55 + 0.3e^{−10v}·η(x)  if 0 ≤ v < 0.4;   v = (x mod 2) − 1
const clapV = x => mod(x, 2) - 1
const clapOn = x => clapV(x) >= 0 && clapV(x) < 0.4
export const C = x => (clapOn(x) ? 2.55 + 0.3 * exp(-10 * clapV(x)) * η() : null)

// H(x) — off-beat hats (the "- - -" dashes in the pictures)
//   H = 2.55 + 0.12e^{−30h}·η(x)  if h < 0.25;   h = (x − 0.5) mod 1
const hatOn = x => mod(x - 0.5, 1) < 0.25
export const H = x => (hatOn(x) ? 2.55 + 0.12 * exp(-30 * mod(x - 0.5, 1)) * η() : null)

// L(x) — euphoric lead, with silent hops between notes
//   L = 0.3 + (n_k − 12)/4  if (2x mod 1) < 0.62;   k = ⌊2x⌋ mod 16,   pitch = 110 Hz · 2^{n/12}
const n = [12, 12, 15, 12, 20, 19, 17, 15, 15, 15, 19, 15, 22, 19, 17, 14]
const nk = x => (mod(2 * x, 1) < 0.62 ? n[mod(floor(2 * x), 16)] : null)
export const L = x => {
  const v = nk(x)
  return v === null ? null : 0.3 + (v - 12) / 4
}

// P_j(x) — breakdown pads, three voices
//   P_j = −0.25 + c_{k,j}/12,  j = 1, 2, 3
export const P = x => c[chord(x)].map(cj => -0.25 + cj / 12)

// R(x) — build-up riser, u = x − DROP ∈ [−8, 0)
//   R = (u + 8)²/48 − 2.5   (the picture's (x + 4)²/12 − 2.5, stretched from 4 to 8 beats)
//   snare roll: 2^{⌊(u + 8)/2⌋} hits per beat
export const R = x => (between(x, BUILD, DROP) ? (x - DROP + 8) ** 2 / 48 - 2.5 : null)
const roll = x => {
  if (!between(x, BUILD, DROP)) return null
  const u = x - DROP, rate = 2 ** floor((u + 8) / 2)
  return { s: mod(u * rate, 1), rate } // s = position inside the current hit, 0..1
}

// Lead & pad brightness: closed in the breakdown, opened by R(x) in the build-up
const cutoff = x => (x < BUILD ? 1600 : x < DROP ? 1600 * 2 ** (1.6 * (R(x) + 2.5)) : 7000)

// Any sample can join in. Slot A (a drop zone in the Max device) is layered under the clap and
// defaults to a clap from Ableton's Core Library; slot B is layered on every kick.
const ABLETON_CLAP =
  'C:/ProgramData/Ableton/Live 12 Suite/Resources/Core Library/Samples/One Shots/Drums/Clap/Clap 707.wav'

const pads = {
  color: '#9fd3ff',
  graph: x => (x < DROP ? P(x) : null),
  midi: x => (x < DROP ? c[chord(x)].map(cj => 57 + cj) : []), // A3 = MIDI 57
  audio() {
    const voices = c[0].map((_, j) => supersaw({ voices: 5, detune: 0.15, seed: 11 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), env = smooth(60), fx = reverb({ room: 0.9, wet: 0.7 })
    return x => {
      const a = env(x < DROP ? 1 : 0)
      let l = 0, r = 0
      if (a > 1e-4) {
        P(x).forEach((y, j) => {
          const [vl, vr] = voices[j](hz(12 * (y + 0.25), 220)) // curve → pitch: c = 12(P + 0.25)
          l += vl
          r += vr
        })
      }
      const fc = 0.6 * cutoff(x)
      return fx(0.3 * a * lpL(l, fc), 0.3 * a * lpR(r, fc))
    }
  },
}

const lead = {
  color: '#ffffff',
  graph: x => (x < END ? L(x) : null),
  midi: x => {
    const v = x < END ? nk(x) : null
    return v === null ? [] : [45 + v] // 110 Hz = MIDI 45
  },
  audio() {
    const main = supersaw({ voices: 7, detune: 0.25, seed: 3 }), oct = supersaw({ voices: 5, detune: 0.2, seed: 5 })
    const lpL = filter('lp'), lpR = filter('lp'), env = smooth(4), fx = reverb({ room: 0.88, wet: 0.5 })
    let f = hz(12)
    return x => {
      const y = x < END ? L(x) : null
      if (y !== null) f = hz(4 * (y - 0.3) + 12) // curve → pitch: n = 4(L − 0.3) + 12
      const a = env(y === null ? 0 : x < DROP ? 0.7 : 1)
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f), fc = cutoff(x)
      return fx(0.75 * a * lpL(l1 + 0.5 * l2, fc, 0.9), 0.75 * a * lpR(r1 + 0.5 * r2, fc, 0.9))
    }
  },
}

const riser = {
  color: '#c9b8ff',
  graph: R,
  audio() {
    const bp = filter('bp'), env = smooth(20)
    let fc = 300
    return x => {
      const y = R(x)
      if (y !== null) fc = 300 * 2 ** (4 * (y + 2.5)) // curve → filter sweep, 300 Hz … 12 kHz
      const a = env(y === null ? 0 : (y + 2.5) / 1.34) // … and volume
      return a < 1e-5 ? 0 : 0.5 * a * bp(η(), fc, 2)
    }
  },
}

const snare = {
  midi: x => {
    const h = roll(x)
    return h && h.s < 0.5 ? [38] : []
  },
  audio() {
    const body = osc('sine'), bp = filter('bp'), fx = reverb({ room: 0.8, wet: 0.4 })
    return x => {
      const h = roll(x)
      let y = 0
      if (h) {
        const e = exp((-25 * h.s) / h.rate), level = 0.25 + (0.75 * (x - BUILD)) / (DROP - BUILD)
        y = level * e * (0.7 * bp(η(), 2200, 0.8) + 0.4 * body(190))
      }
      return fx(1.2 * y, 1.2 * y)
    }
  },
}

const kick = {
  color: '#ff4f8b',
  graph: x => (between(x, DROP, END) ? K(x) : null),
  midi: x => (between(x, DROP, END) && mod(x, 1) < 0.55 ? [36] : []),
  audio() {
    const body = osc('sine'), sub = osc('sine'), lp = filter('lp')
    let last = 1
    return x => {
      if (!between(x, DROP, END)) return 0
      const r = mod(x, 1), y = K(x)
      if (r < last) body.reset() // every beat the kick restarts from phase 0
      last = r
      let s
      if (r < 0.55) {
        // kick: the curve is the log-pitch, f = 110·2^K (1760 Hz click → ~50 Hz tail)
        s = tanh(4 * body(110 * 2 ** y)) * Math.min(1, (0.55 - r) / 0.04)
      } else {
        // reverse bass: the curve is the volume, (K + 1.9)/1.6 = w²; pitch = chord root
        s = 0.8 * tanh(3 * sub(hz(root[chord(x)]))) * ((y + 1.9) / 1.6) * Math.min(1, (1 - r) / 0.02)
      }
      return 0.9 * lp(s, 5000)
    }
  },
}

const hats = {
  color: '#8fa8ff',
  graph: x => (between(x, DROP, END) ? H(x) : null),
  midi: x => (between(x, DROP, END) && hatOn(x) ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => {
      const y = between(x, DROP, END) ? H(x) : null
      return 0.4 * hp(y === null ? 0 : (y - 2.55) / 0.12, 8000) // curve − offset = the waveform itself
    }
  },
}

const clap = {
  color: '#8fa8ff',
  graph: x => (between(x, DROP, END) ? C(x) : null),
  midi: x => (between(x, DROP, END) && clapOn(x) ? [39] : []),
  audio() {
    const bp = filter('bp'), fx = reverb({ room: 0.7, wet: 0.35 })
    return x => {
      const y = between(x, DROP, END) ? C(x) : null
      const s = 1.6 * bp(y === null ? 0 : (y - 2.55) / 0.3, 1500, 0.8) // curve − offset = the waveform itself
      return fx(s, s)
    }
  },
}

export default {
  name: 'hardstyle',
  bpm: 150,
  key: 'Am',
  length: END,
  sections: [[0, 'breakdown'], [BUILD, 'build-up'], [DROP, 'drop']],
  tracks: {
    pads, lead, riser, snare, kick, hats, clap,
    sample_a: sampleLayer('A', x => between(x, DROP, END) && clapOn(x), { gain: 0.5, fallback: ABLETON_CLAP }),
    sample_b: sampleLayer('B', x => between(x, DROP, END) && mod(x, 1) < 0.5, { gain: 0.6 }),
  },
}
