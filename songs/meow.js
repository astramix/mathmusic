// Meow-pop at 100 BPM: a cat sings the melody. Every note is one meow "m-i-a-u" — a buzzing
// saw through three formant filters that glide i → a → u while the pitch arcs up and drops,
// the "m" being the mouth (a low-pass) opening. A tomcat doubles the chorus an octave down.
// Underneath: a purr, a soft bass, kick = paw, snare = hiss, hats = claws, a music box and
// "mrrp" chirps at the end of every phrase.
//
// x is time in beats. F major: F – Dm – B♭ – C, one bar per chord.
import {
  mod, floor, exp, sin, cos, tanh, TAU, PI, between, clamp, lerp, hz, since, lastStep, noise, osc, filter, smooth,
  reverb, delay, sampleLayer,
} from '../src/engine.js'

const VERSE = 8, CHORUS = 40, OUTRO = 56, END = 64 // intro 0–8, verse 8–40, chorus 40–56, outro 56–64
const η = noise(9)
const groove = x => between(x, VERSE, OUTRO)
const F2 = 87.31, F5 = 698.46

// k = ⌊x/4⌋ mod 4 → F, Dm, B♭, C
const chord = x => mod(floor(x / 4), 4)
const triad = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]] // c_{k,j}: semitones from F
const root = [0, -3, -7, -5]

// ---- the meow ---------------------------------------------------------------------------
// Meows [start beat, n = semitones from F5, length d] within a 16-beat phrase.
const VERSE_MEOWS = [
  [0, 0, 0.75], [1, 4, 0.75], [2, 7, 1.5],
  [4, 9, 0.5], [4.5, 7, 0.5], [5, 4, 1.5], [7, 2, 0.5],
  [8, 5, 0.75], [9, 4, 0.75], [10, 2, 0.75], [11, 0, 0.75],
  [12, 2, 0.5], [12.5, 4, 0.5], [13, 7, 2],
]
const CHORUS_MEOWS = [
  [0, 9, 1.5], [2, 7, 0.5], [2.5, 4, 0.5], [3, 7, 0.75],
  [4, 9, 1], [5, 7, 0.5], [5.5, 4, 0.5], [6, 0, 1.5],
  [8, 5, 0.5], [8.5, 7, 0.5], [9, 9, 0.5], [9.5, 12, 1.25], [11, 9, 0.75],
  [12, 7, 0.5], [12.5, 9, 0.5], [13, 11, 0.5], [13.5, 12, 1.5],
]
const OUTRO_MEOWS = [[0, 0, 6]] // one long, sleepy meow

// The meow sounding at beat x → { n, d, u } (u = how far through it, 0…1), or null.
const meowAt = x => {
  const [list, t] =
    between(x, VERSE, CHORUS) ? [VERSE_MEOWS, mod(x - VERSE, 16)]
    : between(x, CHORUS, OUTRO) ? [CHORUS_MEOWS, x - CHORUS]
    : between(x, OUTRO, END) ? [OUTRO_MEOWS, x - OUTRO]
    : [[], 0]
  let e = null
  for (const ev of list) if (ev[0] <= t) e = ev
  return e && t - e[0] < e[2] ? { n: e[1], d: e[2], u: (t - e[0]) / e[2] } : null
}

// Pitch arc of a meow:  β(u) = 3·sin(π·u^0.7) − 2u²  — up three semitones, then a drop below the note
const bend = u => 3 * sin(PI * u ** 0.7) - 2 * u * u
const step = (a, b, u) => {
  const t = clamp((u - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
// Vowel i → a → u as formant frequencies F_i(u);  mouth M(u) = low-pass cutoff ("m" = closed lips)
const I = [450, 2700, 3800], A = [1100, 1800, 3600], U = [550, 1000, 3300], Q = [5, 9, 12], GAIN = [1, 0.6, 0.25]
const formant = (i, u) => lerp(lerp(I[i], A[i], step(0.15, 0.5, u)), U[i], step(0.6, 1, u))
const mouth = u => (350 + 7500 * step(0, 0.18, u)) * (1 - 0.75 * step(0.7, 1, u))
//   a(u) = clamp(u/0.08)·clamp((1 − u)/0.12)
const loud = u => clamp(u / 0.08, 0, 1) * clamp((1 - u) / 0.12, 0, 1)

// One cat:  f = F5·2^{(n + β(u) + v)/12}/octave,  v = 0.35·min(1, 2u)²·sin(2π·6t)  (vibrato)
// voice = M(u)-low-passed Σ_i g_i/Q_i·BP_{F_i·size}(saw + breath)
function cat({ octave = 1, size = 1, rough = 0 } = {}) {
  const o = osc('saw'), bps = I.map(() => filter('bp')), lip = filter('lp'), gate = smooth(6)
  return (m, t) => {
    const u = m?.u ?? 1, v = 0.35 * Math.min(1, 2 * u) ** 2 * sin(TAU * 6 * t)
    const f = (F5 * 2 ** (((m?.n ?? 0) + bend(u) + v) / 12)) / octave
    const breath = 0.25 * η() * (1 - sin(PI * u))
    let src = o(f) + breath
    if (rough) src = tanh((1 + rough) * src)
    let y = 0
    for (let i = 0; i < 3; i++) y += (GAIN[i] / Q[i]) * bps[i](src, formant(i, u) * size, Q[i])
    return gate(m ? loud(u) : 0) * lip(y, mouth(u))
  }
}

const meow = {
  color: '#ffb3d9',
  graph: x => {
    const m = meowAt(x)
    return m ? 1.2 + (m.n + bend(m.u)) / 6 : null // every meow draws a little ear
  },
  midi: x => (meowAt(x) ? [77 + meowAt(x).n] : []), // F5 = MIDI 77
  audio({ bpm }) {
    const kitty = cat(), fx = reverb({ room: 0.7, damp: 0.4, wet: 0.35 }), echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.3, wet: 0.2 })
    return x => {
      const y = 1.4 * kitty(meowAt(x), (x * 60) / bpm)
      return fx(...echo(0.9 * y, 0.7 * y))
    }
  },
}

// The tomcat: the chorus an octave down, bigger head (formants × 0.8), a growlier voice
const tomcat = {
  color: '#d98cff',
  graph: x => (between(x, CHORUS, OUTRO) && meowAt(x) ? 1.2 + (meowAt(x).n - 12 + bend(meowAt(x).u)) / 6 : null),
  midi: x => (between(x, CHORUS, OUTRO) && meowAt(x) ? [65 + meowAt(x).n] : []),
  audio({ bpm }) {
    const tom = cat({ octave: 2, size: 0.8, rough: 1.5 }), fx = reverb({ room: 0.75, damp: 0.4, wet: 0.35 })
    return x => {
      const y = 1.6 * tom(between(x, CHORUS, OUTRO) ? meowAt(x) : null, (x * 60) / bpm)
      return fx(0.4 * y, 0.9 * y)
    }
  },
}

// R(x) — "mrrp": a rolled r on the last half beat of every phrase, the pitch sliding up a fifth
//   f = F5·2^{(−5 + 12√u)/12},  rolled by (½ + ½cos 2π·28t)
const mrrpAt = x => {
  const t = mod(x - VERSE, 16) - 15.25
  return groove(x) && t >= 0 && t < 0.6 ? t / 0.6 : null
}
const mrrp = {
  color: '#ffe08a',
  graph: x => (mrrpAt(x) !== null ? 2 + mrrpAt(x) : null),
  midi: x => (mrrpAt(x) !== null ? [72] : []),
  audio({ bpm }) {
    const o = osc('saw'), bp = filter('bp'), lp = filter('lp'), gate = smooth(5), fx = reverb({ room: 0.7, wet: 0.4 })
    return x => {
      const u = mrrpAt(x), t = (x * 60) / bpm
      const f = F5 * 2 ** ((-5 + 12 * Math.sqrt(u ?? 1)) / 12)
      const roll = 0.5 + 0.5 * cos(TAU * 28 * t)
      const y = gate(u !== null ? loud(u) : 0) * roll * (0.2 * bp(o(f), 1300, 3) + 0.35 * lp(o(f), 2200))
      return fx(y, y)
    }
  },
}

// P(x) — the purr: low-passed noise chopped 25 times a second,  max(0, sin 2π·25t)²,
// breathing in (softer) and out (louder) every two beats; loud in the intro and the outro
const purrLevel = x => (between(x, VERSE + 1, OUTRO) ? 0.35 : 1)
const purr = {
  color: '#a0806a',
  graph: x => -2.6 + 0.25 * purrLevel(x) * (0.6 + 0.4 * sin((TAU * x) / 2)),
  audio({ bpm }) {
    const lp = filter('lp'), level = smooth(200)
    return x => {
      const t = (x * 60) / bpm, out = 0.6 + 0.4 * sin((TAU * x) / 2)
      const y = level(x < END ? purrLevel(x) : 0) * out * Math.max(0, sin(TAU * 25 * t)) ** 2 * lp(η(), 280)
      return 3 * y
    }
  },
}

// B(x) — soft bass, eighths per bar, value = semitones above the chord root (F2, D2, B♭1, C2)
//   sin 2π∫f + 0.3·tanh(LP saw), volume e^{−2.5τ}
const bassSteps = [0, null, null, 0, null, 7, 12, null]
const bassHit = x => lastStep(bassSteps, mod(x, 4), 2)
const bass = {
  color: '#9fd3ff',
  graph: x => (groove(x) ? -2 + (root[chord(x)] + bassHit(x).v) / 12 : null),
  midi: x => (groove(x) && bassHit(x).τ < 0.4 ? [41 + root[chord(x)] + bassHit(x).v] : []), // F2 = MIDI 41
  audio() {
    const s = osc('sine'), w = osc('saw'), lp = filter('lp'), glide = smooth(15), level = smooth(4)
    return x => {
      const { v, τ } = bassHit(x), f = glide(hz(root[chord(x)] + v, F2)), a = level(groove(x) ? exp(-2.5 * τ) : 0)
      return 0.5 * a * (s(f) + 0.3 * tanh(2 * lp(w(f), 600 + 1500 * exp(-8 * τ))))
    }
  },
}

// K(x) — the paw: a soft kick on beats 1 and the "and" of 3,  e^{−7τ}·sin 2π∫(50 + 120e^{−30τ})
const τK = x => since(x, [0, 2.5], 4)
const paw = {
  color: '#ff4f8b',
  graph: x => (groove(x) ? 3 + 1.2 * exp(-6 * τK(x)) : null),
  midi: x => (groove(x) && τK(x) < 0.25 ? [36] : []),
  audio() {
    const o = osc('sine'), lp = filter('lp')
    let last = Infinity
    return x => {
      const τ = τK(x)
      if (τ < last) o.reset()
      last = τ
      return groove(x) ? 0.75 * exp(-7 * τ) * o(50 + 120 * exp(-30 * τ)) + 0.15 * exp(-40 * τ) * lp(η(), 900) : 0
    }
  },
}

// S(x) — the hiss on 2 and 4: band-passed noise around 4.5 kHz with a "k" click at the start
//   S = (1 − e^{−60τ})·e^{−5τ}·BP(η) + 0.5e^{−80τ}·η
const τS = x => since(x, [1, 3], 4)
const hiss = {
  color: '#8fa8ff',
  graph: x => (groove(x) && τS(x) < 0.5 ? 2.4 + 0.3 * exp(-5 * τS(x)) * η() : null),
  midi: x => (groove(x) && τS(x) < 0.25 ? [38] : []),
  audio() {
    const bp = filter('bp'), hp = filter('hp')
    return x => {
      const τ = τS(x), n = η()
      const y = groove(x) && τ < 0.7 ? (1 - exp(-60 * τ)) * exp(-5 * τ) * bp(n, 4500, 1.5) + 0.5 * exp(-80 * τ) * hp(n, 2000) : bp(0, 4500, 1.5)
      return 0.5 * y
    }
  },
}

// H(x) — claws on the eighths, tiny metallic ticks:  e^{−90τ}·HP(η), off-beats louder
const τH = x => mod(x, 0.5)
const claws = {
  color: '#cfd8ff',
  graph: x => (groove(x) && τH(x) < 0.06 ? 1.9 + 0.1 * η() : null),
  midi: x => (groove(x) && τH(x) < 0.06 ? [42] : []),
  audio() {
    const hp = filter('hp')
    return x => {
      const a = mod(floor(2 * x), 2) ? 1 : 0.5
      return groove(x) ? 0.35 * a * exp(-90 * τH(x)) * hp(η(), 9000) : hp(0, 9000)
    }
  },
}

// M(x) — music box: eighths up and down the chord two octaves above F4,
//   each tine e^{−3t}·(sin 2πft + 0.25e^{−6t}·sin 2π·4.2ft),  t = seconds since it was plucked
const boxPattern = [0, 1, 2, 3, 2, 1, 2, 1] // 3 = the root an octave up
const boxNote = j => {
  const k = chord(j / 2), i = boxPattern[mod(j, 8)]
  return 24 + (i === 3 ? triad[k][0] + 12 : triad[k][i])
}
const boxLevel = x => (between(x, VERSE, CHORUS) ? 0.45 : x < END ? 1 : 0)
const musicbox = {
  color: '#ffffff',
  graph: x => (x < END ? 0.4 + boxNote(floor(2 * x)) / 24 - 1 : null),
  midi: x => (x < END && mod(x, 0.5) < 0.4 ? [65 + boxNote(floor(2 * x))] : []), // F4 = MIDI 65
  audio({ bpm }) {
    const sec = 60 / bpm, fx = delay({ time: sec * 0.75, feedback: 0.35, wet: 0.3 }), room = reverb({ room: 0.8, wet: 0.4 })
    return x => {
      let y = 0
      for (let back = 0; back < 4; back++) {
        const j = floor(2 * x) - back, t = (x - j / 2) * sec
        if (j < 0 || j / 2 >= END) continue
        const f = hz(boxNote(j), 349.23)
        y += boxLevel(j / 2) * exp(-3 * t) * (sin(TAU * f * t) + 0.25 * exp(-6 * t) * sin(TAU * 4.2 * f * t))
      }
      return room(...fx(0.16 * y, 0.16 * y))
    }
  },
}

export default {
  name: 'meow',
  style: 'meow',
  bpm: 100,
  key: 'F',
  length: END,
  sections: [[0, 'purr'], [VERSE, 'meow'], [CHORUS, 'two cats'], [OUTRO, 'nap']],
  tracks: {
    purr, musicbox, meow, tomcat, mrrp, bass, paw, hiss, claws,
    sample_a: sampleLayer('A', x => groove(x) && τS(x) < 0.25, { gain: 0.4 }),
    sample_b: sampleLayer('B', x => groove(x) && τK(x) < 0.25, { gain: 0.5 }),
  },
}
