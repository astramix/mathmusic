// Kawaii anime J-pop at 168 BPM: the "royal road" progression IV – V – iii – vi (王道進行),
// a chiptune pulse lead with a blip on every note, "na-ni" vocal chops, kira-kira glockenspiel
// sparkles, supersaw pads pumping with the kick, a bouncing octave bass — and the last chorus
// one semitone up, as every anime opening must.
//
// x is time in beats. A major: D – E – C♯m – F♯m, one bar per chord; A to finish.
import {
  mod, floor, exp, sin, tanh, TAU, PI, between, clamp, lerp, hz, since, lastStep, noise, osc, supersaw, filter,
  smooth, reverb, delay, sampleLayer,
} from '../src/engine.js'

const VERSE = 16, BUILD = 28, CHORUS = 32, KEYUP = 64, OUTRO = 96, END = 104
const η = noise(39) // ミク
const A1 = 55, A3 = 220, A4 = 440

// tr(x) — the key change: everything pitched moves up a semitone for the last chorus
const tr = x => (x >= KEYUP ? 1 : 0)
// k = ⌊x/4⌋ mod 4 → D, E, C♯m, F♯m;  k = 4 → A in the outro
const chord = x => (x >= OUTRO ? 4 : mod(floor(x / 4), 4))
const ROOT = [5, 7, 4, 9, 0] // semitones from A
const CH = [[5, 9, 12, 16], [7, 11, 14, 18], [4, 7, 11, 14], [9, 12, 16, 19], [0, 4, 7, 12]] // from A3: Dmaj7, Eadd9, C♯m7, F♯m7, A

const chorus = x => between(x, CHORUS, OUTRO)
const drums = x => between(x, VERSE, BUILD) || chorus(x)
// Four on the floor in the chorus, beats 1 and the "and" of 3 in the verse
const τK = x => (chorus(x) ? mod(x, 1) : since(x, [0, 2.5], 4))
const kickOn = x => drums(x) || between(x, OUTRO, OUTRO + 1)
// The pump: everything melodic ducks under the kick in the chorus,  1 − 0.6e^{−8τ}
const pump = x => (chorus(x) ? 1 - 0.6 * exp(-8 * mod(x, 1)) : 1)

// ---- drums -----------------------------------------------------------------------------
// K(x) = e^{−6τ}·tanh(1.4·sin 2π∫(48 + 220e^{−40τ}))
const kick = {
  color: '#ff4f8b',
  graph: x => (kickOn(x) ? 3 + 1.5 * exp(-6 * τK(x)) : null),
  midi: x => (kickOn(x) && τK(x) < 0.25 ? [36] : []),
  audio() {
    const o = osc('sine')
    let last = Infinity
    return x => {
      const τ = τK(x)
      if (τ < last) o.reset()
      last = τ
      return kickOn(x) ? 0.8 * exp(-6 * τ) * tanh(1.4 * o(48 + 220 * exp(-40 * τ))) : 0
    }
  },
}

// C(x) — clap on 2 and 4: three quick bursts and a tail of band-passed noise,
//   Σ_{m=0..2} e^{−300(t − 0.012m)}·[t ≥ 0.012m] + 0.5e^{−18t};  rolls 8ths → 16ths → 32nds before a chorus
const roll = x => (between(x, BUILD, CHORUS) ? x - BUILD : between(x, KEYUP - 2, KEYUP) ? x - KEYUP + 4 : null)
const τC = x => {
  const u = roll(x)
  if (u === null) return since(x, [1, 3], 4)
  const ρ = u < 2 ? 2 : u < 3 ? 4 : 8
  return mod(x, 1 / ρ)
}
const clapOn = x => drums(x) || roll(x) !== null
const clap = {
  color: '#8fa8ff',
  graph: x => (clapOn(x) && τC(x) < 0.3 ? 2.4 + 0.3 * η() : null),
  midi: x => (clapOn(x) && τC(x) < 0.12 ? [39] : []),
  audio({ bpm }) {
    const bp = filter('bp'), fx = reverb({ room: 0.8, wet: 0.35 })
    return x => {
      const t = (τC(x) * 60) / bpm, u = roll(x), vel = u === null ? 1 : 0.25 + 0.75 * (u / 4) ** 2
      let e = 0.5 * exp(-18 * t)
      for (let m = 0; m < 3; m++) if (t >= 0.012 * m) e += exp(-300 * (t - 0.012 * m))
      const y = clapOn(x) ? 1 * vel * e * bp(η(), 1500, 1) : bp(0, 1500, 1)
      return fx(y, y)
    }
  },
}

// H(x) — shaker: 16ths in the chorus with accents (0.3, 0.6, 1, 0.6), 8ths in the verse;
// plus an open hat on every off-beat in the chorus, e^{−12τ}
const hats = {
  color: '#cfd8ff',
  graph: x => (drums(x) && mod(x, chorus(x) ? 0.25 : 0.5) < 0.05 ? 1.9 + 0.1 * η() : null),
  midi: x => (drums(x) && mod(x, chorus(x) ? 0.25 : 0.5) < 0.05 ? [chorus(x) && between(mod(x, 1), 0.5, 0.75) ? 46 : 42] : []),
  audio() {
    const hp = filter('hp'), hp2 = filter('hp')
    return x => {
      const n = η(), s = chorus(x) ? 0.25 : 0.5, a = chorus(x) ? [0.3, 0.6, 1, 0.6][mod(floor(4 * x), 4)] : 0.6
      const closed = drums(x) ? 0.3 * a * exp(-60 * mod(x, s)) * hp(n, 8000) : hp(0, 8000)
      const τo = mod(x - 0.5, 1)
      const open = chorus(x) ? 0.15 * exp(-12 * τo) * hp2(n, 6000) : hp2(0, 6000)
      return closed + open
    }
  },
}

// Crash at each chorus and the end, and a riser into each chorus:
//   crash e^{−1.2t}·HP(η);  riser = BP_{500·16^u}(η)·u²,  u = progress through the last 8 (or 4) beats
const CRASHES = [CHORUS, KEYUP, OUTRO]
const riseAt = x => (between(x, CHORUS - 8, CHORUS) ? (x - CHORUS + 8) / 8 : between(x, KEYUP - 4, KEYUP) ? (x - KEYUP + 4) / 4 : null)
const fx = {
  color: '#ffffff',
  graph: x => (riseAt(x) !== null ? -1.5 + 3 * riseAt(x) ** 2 : null),
  audio({ bpm }) {
    const hp = filter('hp'), bp = filter('bp'), o = osc('sine'), room = reverb({ room: 0.85, wet: 0.5 })
    return x => {
      let y = 0
      const n = η()
      for (const c of CRASHES) {
        const t = ((x - c) * 60) / bpm
        if (t >= 0 && t < 4) y += 0.3 * exp(-1.2 * t) * n
      }
      y = hp(y, 4000)
      const u = riseAt(x)
      const r = u === null ? bp(0, 500, 2) : u * u * (0.25 * bp(n, 500 * 16 ** u, 2) + 0.06 * o(400 * 2 ** (3 * u))) // "pyuuu~"
      return room(0.6 * (y + r), 0.6 * (y + r))
    }
  },
}

// ---- bass & pads -----------------------------------------------------------------------
// B(x) — octave bounce on the eighths, n = root + 12·(⌊2x⌋ mod 2), square through an enveloped low-pass
const bassOn = x => between(x, VERSE, OUTRO + 4)
const bassNote = x => ROOT[chord(x)] + 12 * mod(floor(2 * x), 2) + tr(x)
const bass = {
  color: '#9fd3ff',
  graph: x => (bassOn(x) ? -2.4 + bassNote(x) / 12 : null),
  midi: x => (bassOn(x) && mod(x, 0.5) < 0.4 ? [33 + bassNote(x)] : []), // A1 = MIDI 33
  audio() {
    const o = osc('square'), s = osc('sine'), lp = filter('lp'), level = smooth(3)
    return x => {
      const τ = mod(x, 0.5), f = hz(bassNote(x), A1)
      const a = level(bassOn(x) ? (x >= OUTRO ? exp(-1.5 * (x - OUTRO)) : 1) : 0) * exp(-3 * τ) * pump(x)
      return 0.45 * a * (0.6 * lp(o(f), 400 + 2500 * exp(-15 * τ), 1.5) + 0.5 * s(f))
    }
  },
}

// P(x) — supersaw chords, the filter opening through the intro:  f_c = 300 + 5000·(x/16)²
const padLevel = x => (x < VERSE ? 1 : between(x, VERSE, CHORUS) ? 0.55 : x < OUTRO ? 1 : Math.max(0, 1 - (x - OUTRO) / 8))
const pads = {
  color: '#b8f0ff',
  graph: x => (x < END ? CH[chord(x)].map(n => -0.6 + (n + tr(x)) / 24) : null),
  midi: x => (x < END - 1 && mod(x, 4) < 3.9 ? CH[chord(x)].map(n => 57 + n + tr(x)) : []), // A3 = MIDI 57
  audio() {
    const saws = CH[0].map((_, j) => supersaw({ voices: 5, detune: 0.25, width: 0.9, seed: 11 + j }))
    const lp = [filter('lp'), filter('lp')], level = smooth(20), verb = reverb({ room: 0.85, wet: 0.4 })
    return x => {
      const cut = x < VERSE ? 300 + 5000 * (x / 16) ** 2 : 5300
      let l = 0, r = 0
      saws.forEach((s, j) => {
        const [a, b] = s(hz(CH[chord(x)][j] + tr(x), A3))
        l += a
        r += b
      })
      const g = 0.18 * level(padLevel(x)) * pump(x)
      return verb(g * lp[0](l, cut), g * lp[1](r, cut))
    }
  },
}

// ---- melody ----------------------------------------------------------------------------
// The hook [start beat, n = semitones from A4, length] in a 16-beat phrase, played in both choruses
const HOOK = [
  [0, 9, 0.5], [0.5, 7, 0.5], [1, 9, 0.5], [1.5, 12, 1], [2.5, 9, 0.5], [3, 7, 1],
  [4, 4, 0.5], [4.5, 7, 0.5], [5, 11, 1], [6, 9, 0.5], [6.5, 7, 0.5], [7, 11, 1],
  [8, 11, 0.5], [8.5, 12, 0.5], [9, 16, 1.5], [10.5, 14, 0.5], [11, 12, 0.5], [11.5, 11, 0.5],
  [12, 9, 1.5], [13.5, 12, 0.5], [14, 16, 0.5], [14.5, 14, 0.5], [15, 12, 1],
]
const leadAt = x => {
  if (!chorus(x)) return null
  const t = mod(x - CHORUS, 16)
  let e = null
  for (const ev of HOOK) if (ev[0] <= t) e = ev
  return t - e[0] < e[2] ? { n: e[1] + tr(x), d: e[2], τ: t - e[0] } : null
}
// L(x) — 25% pulse = saw(φ) − saw(φ + ¼), an octave blip for the first 20 ms of each note,
// vibrato 0.25·sin(2π·6.5t) after a quarter beat, a little portamento, ping-pong echoes
const lead = {
  color: '#ff9ad5',
  graph: x => (leadAt(x) ? 1.6 + leadAt(x).n / 12 : null),
  midi: x => (leadAt(x) && leadAt(x).τ < leadAt(x).d - 0.08 ? [69 + leadAt(x).n] : []), // A4 = MIDI 69
  audio({ bpm }) {
    const a = osc('saw', 0), b = osc('saw', 0.25), glide = smooth(12), gate = smooth(4), lp = filter('lp')
    const echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.35, wet: 0.35 }), verb = reverb({ room: 0.8, wet: 0.3 })
    let n = 9
    return x => {
      const m = leadAt(x), t = (x * 60) / bpm
      if (m) n = m.n
      const age = m ? (m.τ * 60) / bpm : 1
      const vib = m && m.τ > 0.25 ? 0.25 * sin(TAU * 6.5 * t) : 0
      const f = glide(hz(n + vib, A4)) * (age < 0.02 ? 2 : 1)
      const y = 0.22 * gate(m && m.τ < m.d - 0.08 ? 1 : 0) * lp(a(f) - b(f), 6000)
      return verb(...echo(y, y))
    }
  },
}

// V(x) — "na-ni" vocal chops: a little voice (saw → formants of "a" or "i", scaled 1.15 for a
// small singer) on chord tones an octave above A3; the last chop of each bar slides up a tone, "~♪"
const CHOP_STEPS = [0, null, null, 1, 2, null, 3, null] // eighths in a bar, value = which chord tone
const VA = [850, 1250, 2900], VI = [320, 2700, 3400], VQ = [6, 10, 12], VG = [1, 0.5, 0.3]
const chopsOn = x => between(x, VERSE, BUILD) || chorus(x)
const chopAt = x => {
  if (!chopsOn(x)) return null
  const s = lastStep(CHOP_STEPS, mod(x, 4), 2)
  if (s.τ >= 0.4) return null
  const last = s.v === 3
  return { n: 12 + CH[chord(x)][s.v] + tr(x), u: s.τ / 0.4, vowel: s.v % 2, slide: last }
}
const chops = {
  color: '#fff3a0',
  graph: x => (chopAt(x) ? 0.2 + chopAt(x).n / 24 : null),
  midi: x => (chopAt(x) && chopAt(x).u < 0.9 ? [57 + chopAt(x).n] : []),
  audio({ bpm }) {
    const o = osc('saw'), bps = VA.map(() => filter('bp')), gate = smooth(5), verb = reverb({ room: 0.8, wet: 0.4 })
    const echo = delay({ time: (60 / bpm) * 0.5, feedback: 0.3, wet: 0.25 })
    let n = 12
    return x => {
      const c = chopAt(x), t = (x * 60) / bpm
      if (c) n = c.n
      const u = c?.u ?? 1, up = c?.slide ? 2 * clamp((u - 0.4) / 0.6, 0, 1) ** 2 : 0
      const src = o(hz(n + up + 0.15 * sin(TAU * 6 * t), A3)) + 0.05 * η()
      let y = 0
      for (let i = 0; i < 3; i++) y += (VG[i] / VQ[i]) * bps[i](src, 1.15 * (c?.vowel ? VI[i] : VA[i]), VQ[i])
      const level = chorus(x) ? 0.6 : 1
      y *= 0.9 * level * gate(c ? clamp(u / 0.1, 0, 1) * clamp((1 - u) / 0.2, 0, 1) : 0) * pump(x)
      return verb(...echo(y, y))
    }
  },
}

// G(x) — kira-kira glockenspiel: FM bells climbing the chord two octaves up,
//   e^{−4t}·sin(2πft + 2e^{−6t}·sin 2π·3.5ft);  16ths, 8ths in the verse, fading out over the final A
const sparkleRate = x => (between(x, VERSE, CHORUS) ? 2 : 4)
const sparkleLevel = x => (x < VERSE ? 0.8 : x < CHORUS ? 0.45 : x < OUTRO ? 0.6 : exp(-(x - OUTRO) / 2.5))
const sparkleNote = (j, ρ) => {
  const x = j / ρ, i = mod(j, 8)
  return 24 + CH[chord(x)][mod(i, 4)] + 12 * floor(i / 4) + tr(x)
}
const sparkles = {
  color: '#ffe08a',
  graph: x => {
    const ρ = sparkleRate(x)
    return x < END && mod(x, 1 / ρ) < 0.06 ? -0.2 + sparkleNote(floor(ρ * x), ρ) / 24 : null
  },
  midi: x => {
    const ρ = sparkleRate(x)
    return x < END - 2 && mod(x, 1 / ρ) < 0.75 / ρ ? [57 + sparkleNote(floor(ρ * x), ρ)] : []
  },
  audio({ bpm }) {
    const sec = 60 / bpm, echo = delay({ time: sec * 0.75, feedback: 0.4, wet: 0.35 }), verb = reverb({ room: 0.88, wet: 0.45 })
    return x => {
      const ρ = sparkleRate(x)
      let y = 0
      for (let back = 0; back < 6; back++) {
        const j = floor(ρ * x) - back, t = (x - j / ρ) * sec
        if (j < 0 || j / ρ >= END - 2) continue
        const f = hz(sparkleNote(j, ρ), A3)
        y += sparkleLevel(j / ρ) * exp(-4 * t) * sin(TAU * f * t + 2 * exp(-6 * t) * sin(TAU * 3.5 * f * t))
      }
      return verb(...echo(0.16 * y, 0.16 * y))
    }
  },
}

export default {
  name: 'kawaii',
  bpm: 168,
  length: END,
  sections: [[0, 'kira-kira'], [VERSE, 'verse'], [BUILD, 'build'], [CHORUS, 'chorus'], [KEYUP, 'key up!'], [OUTRO, '♪']],
  tracks: {
    pads, sparkles, chops, lead, bass, kick, clap, hats, fx,
    sample_a: sampleLayer('A', x => drums(x) && τC(x) < 0.12, { gain: 0.4 }),
    sample_b: sampleLayer('B', x => kickOn(x) && τK(x) < 0.25, { gain: 0.5 }),
  },
}
