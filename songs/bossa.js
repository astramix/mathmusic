// Bossa nova at 120 BPM, a seaside café, about two and a half minutes:
//   guitar intro → theme (vibraphone) → theme II (flute, the vibes harmonising a chord tone
//   below) → bridge → piano solo → vibraphone solo → scat voice "du-ba-da" → bridge with strings →
//   final theme → ii–V tag ending on Cmaj9.
// A nylon guitar (Karplus–Strong through a guitar body) with thumb bass and syncopated chords that
// anticipate the next bar, an upright bass, cross-stick on the bossa clave, brushes, shaker, ride.
// Both solos are improvised by a deterministic random walk over each chord's scale.
//
// x is time in beats. C major: Cmaj7 – A7 – Dm9 – G13 – Em7 – A7 – Dm7 – G7, one chord a bar;
// bridge Fmaj7 – Fm6 – Em7 – A7 – Dm7 – G7 – Cmaj7 – G7.
import { mod, floor, exp, sin, TAU, PI, hz, filter, smooth, reverb, delay } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, trigger, poly, plucker, guitarBody, pianoTone, vibesTone, uprightTone, strings,
  flute as breathyFlute, voice, VOWELS, kickDrum, snareDrum, hatDrum, rimDrum, brushDrum, shakerDrum, chorus,
  improvise,
} from '../src/instruments.js'

const SECTIONS = [
  [0, 'intro'], [16, 'theme'], [48, 'theme II'], [80, 'bridge'], [112, 'piano solo'], [144, 'vibes solo'],
  [176, 'scat'], [208, 'bridge II'], [240, 'final theme'], [272, 'tag'],
]
const END = 296, FINAL = 288 // the last chord rings from 288
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const C2 = 65.41, C4 = 261.63, C5 = 523.25

// ---- harmony ---------------------------------------------------------------------------------
// v: guitar voicing, semitones from C4 · root: from C2 · scale: pitch classes for the soloists
const MAJ = [0, 2, 4, 5, 7, 9, 11], D_HARM = [2, 4, 5, 7, 9, 10, 1], F_MEL = [5, 7, 8, 10, 0, 2, 4]
const CHORDS = {
  Cmaj7: { v: [-8, -1, 2, 7], root: 0, scale: MAJ }, // E3 B3 D4 G4 (with the 9th)
  A7: { v: [-5, 1, 5, 9], root: -3, scale: D_HARM }, // G3 C♯4 F4 A4 (♭13)
  Dm9: { v: [-7, 0, 4, 9], root: 2, scale: MAJ },
  G13: { v: [-7, -1, 4, 7], root: -5, scale: MAJ },
  Em7: { v: [-5, -1, 2, 4], root: 4, scale: MAJ },
  Dm7: { v: [-7, -3, 0, 2], root: 2, scale: MAJ },
  G7: { v: [-7, -1, 2, 7], root: -5, scale: MAJ },
  Fmaj7: { v: [-7, -3, 0, 4], root: 5, scale: MAJ },
  Fm6: { v: [-7, -4, 0, 2], root: 5, scale: F_MEL },
}
const THEME_PROG = ['Cmaj7', 'A7', 'Dm9', 'G13', 'Em7', 'A7', 'Dm7', 'G7']
const BRIDGE_PROG = ['Fmaj7', 'Fm6', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'G7']
const TAG_PROG = ['Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7']
const chordAt = x => {
  const { name, t } = part(x)
  const name_ = name === 'bridge' || name === 'bridge II' ? BRIDGE_PROG[mod(floor(t / 4), 8)]
    : name === 'tag' ? TAG_PROG[Math.min(5, floor(t / 4))]
    : THEME_PROG[mod(floor(t / 4), 8)]
  return CHORDS[name_]
}
const tones = x => [...chordAt(x).v, chordAt(x).root].map(n => mod(n, 12))

// ---- melodies [beat, n from C5, length] ----------------------------------------------------------
const THEME = [
  [0, 7, 1.5], [1.5, 4, 0.5], [2, 4, 1.5], [3.5, 7, 1.5], [5, 4, 0.5], [5.5, 1, 2.5],
  [8, 2, 1.5], [9.5, 4, 0.5], [10, 5, 1], [11, 9, 1], [12, 9, 1.5], [13.5, 7, 0.5], [14, 4, 1.5],
  [15.5, 7, 2], [17.5, 11, 0.5], [18, 14, 2], [20, 13, 1], [21, 9, 1], [22, 7, 2],
  [24, 5, 1.5], [25.5, 4, 0.5], [26, 2, 1], [27, 0, 1], [28, -1, 1.5], [29.5, 2, 0.5], [30, 5, 2],
]
const BRIDGE = [
  [0, 9, 1.5], [1.5, 7, 0.5], [2, 4, 1], [3, 0, 1], [4, 8, 2], [6, 7, 1], [7, 5, 1],
  [8, 7, 1.5], [9.5, 4, 0.5], [10, 2, 2], [12, 1, 1], [13, 4, 1], [14, 7, 1], [15, 9, 1],
  [16, 9, 1.5], [17.5, 5, 0.5], [18, 2, 2], [20, 5, 1], [21, 2, 1], [22, -1, 1], [23, 2, 1],
  [24, 4, 3], [27, 2, 0.5], [27.5, 4, 0.5], [28, 5, 1.5], [29.5, 7, 0.5], [30, 11, 2],
]
const TAG = [
  [0, 7, 1.5], [1.5, 4, 0.5], [2, 2, 2], [4, 1, 1.5], [5.5, 4, 0.5], [6, 7, 2],
  [8, 5, 1.5], [9.5, 4, 0.5], [10, 2, 2], [12, -1, 1.5], [13.5, 2, 0.5], [14, 5, 2], [16, 4, 8],
]
// The vibes' second voice in theme II: under each theme note n, the highest chord tone ≤ n − 3
const below = (n, at) => {
  const pcs = tones(at)
  for (let m = n - 3; m > n - 12; m--) if (pcs.includes(mod(m, 12))) return m
  return n - 5
}
const HARMONY = THEME.map(([b, n, d]) => [b, below(n, 48 + b), d])
const soloOpts = { length: 32, rate: 2, phrase: 8, swing: 0.5, scale: x => chordAt(x).scale, chord: tones }
const PIANO_SOLO = improvise({ ...soloOpts, start: 112, seed: 21, lo: -5, hi: 17, rest: 0.18, hold: 0.25 })
const VIBES_SOLO = improvise({ ...soloOpts, start: 144, seed: 5, lo: -3, hi: 16, rest: 0.25, hold: 0.4 })

// A melody table per section: [events, offset from section start (absolute = 'abs'), transpose]
const play = (table, x) => {
  const { name, t } = part(x), row = table[name]
  if (!row || x >= END) return null
  const [events, shift = 0] = row
  const m = events === PIANO_SOLO || events === VIBES_SOLO ? notesAt(events, x) : notesAt(events, mod(t, 32))
  return m && { ...m, n: m.n + shift, at: x - m.τ }
}

// ---- nylon guitar --------------------------------------------------------------------------------
// Thumb: root on 1, the fifth below on 3.  Fingers: chords on 16ths, two alternating bar patterns,
// the last hit of the odd bar anticipating the next chord.
const FINGERS = [[0, 0.75, 1.5, 2.5, 3.25], [0.5, 1.25, 2, 2.75, 3.5]]
const guitarHits = x => {
  const b = floor(x / 4), p = mod(x, 4), hits = []
  hits.push([0, 'thumb'], [2, 'thumb'])
  for (const f of FINGERS[mod(b, 2)]) hits.push([f, 'chord'])
  return hits.filter(h => h[0] <= p).pop()
}
const guitar = {
  color: '#ffcf9f',
  graph: x => (x < END - 2 ? chordAt(x).v.map(n => -0.8 + n / 24) : null),
  midi: x => {
    const h = x < FINAL ? guitarHits(x) : null
    if (!h || mod(x, 4) - h[0] > 0.2) return []
    const c = h[0] >= 3.5 ? chordAt(floor(x / 4) * 4 + 4) : chordAt(x)
    return h[1] === 'thumb' ? [48 + c.root + (h[0] ? -5 : 0)] : c.v.map(n => 60 + n)
  },
  audio({ bpm }) {
    const sec = 60 / bpm, strum = plucker({ life: 3, decay: 0.997 }), body = guitarBody(), fire = trigger()
    const ch = chorus({ mix: 0.25, rate: 0.3 }), verb = reverb({ room: 0.75, damp: 0.4, wet: 0.25 })
    let last = false
    return x => {
      const h = x < FINAL ? guitarHits(x) : null, b = floor(x / 4)
      if (h && fire(4 * b + h[0])) {
        const c = h[0] >= 3.5 ? chordAt(4 * b + 4) : chordAt(x), j = floor(4 * x)
        if (h[1] === 'thumb') strum.hit(hz(c.root + 12 + (h[0] ? -5 : 0), C2), 0.55, { bright: 0.45 })
        else c.v.forEach((n, i) => strum.hit(hz(n, C4), 0.22 + 0.1 * hash(j, i), { bright: 0.5, at: floor(i * 0.004 * 44100) }))
      }
      if (x >= FINAL && !last) {
        last = true // the final Cmaj9, strummed slowly from the bass up
        const c = CHORDS.Cmaj7
        strum.hit(hz(12, C2), 0.6, { bright: 0.45 })
        c.v.forEach((n, i) => strum.hit(hz(n, C4), 0.35, { bright: 0.5, at: floor((i + 1) * 0.03 * 44100) }))
      }
      const y = 0.55 * body(strum())
      return verb(...ch(...pan(y, -0.15)))
    }
  },
}

// ---- upright bass ------------------------------------------------------------------------------
// The bossa bass: root (dotted quarter), fifth below on the "and" of 2 tied over 3, root again on the "and" of 4
const BASS_BAR = [[0, 0, 1.4], [1.5, -5, 1.9], [3.5, 0, 0.45]]
const bassAt = x => {
  if (is(x, 'intro') || x >= END - 1) return null
  if (x >= FINAL) return { n: 0, at: FINAL, d: 6 }
  const m = notesAt(BASS_BAR, mod(x, 4))
  return m && { n: chordAt(m.at < 3.5 ? x : floor(x / 4) * 4 + 4).root + m.n, at: floor(x / 4) * 4 + m.at, d: m.d }
}
const bass = {
  color: '#9fd3ff',
  graph: x => (bassAt(x) ? -2.6 + bassAt(x).n / 12 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [36 + bassAt(x).n] : []), // C2 = MIDI 36
  audio({ bpm }) {
    const sec = 60 / bpm, b = poly(uprightTone, { release: 0.07, life: 6 }), fire = trigger(), lp = filter('lp')
    return x => {
      const m = bassAt(x)
      if (fire(m ? m.at : null)) b.hit(hz(m.n + 12, C2), 0.85 + 0.15 * hash(floor(2 * x), 2), m.d * sec)
      return 0.2 * lp(b(), 1500)
    }
  },
}

// ---- percussion ----------------------------------------------------------------------------------
// Bar b → [position, drum, velocity]. Cross-stick on the bossa clave (two-bar pattern), shaker
// sixteenths accented (1, 0.4, 0.7, 0.4), soft kick with the bass, brush taps on 2 and 4, ride in the solos.
const CLAVE = [[0, 0.75, 1.5, 2.5, 3.25], [1, 2, 2.75]]
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, { name, t } = part(x), hits = []
  const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel]))
  const shaker = (scale = 1) => { for (let i = 0; i < 16; i++) add('shaker', scale * [1, 0.4, 0.7, 0.4][i % 4] * (0.85 + 0.15 * hash(16 * b + i, 7)), i / 4) }
  if (x >= FINAL) {
    if (x === FINAL) add('kick', 0.9, 0), add('ride', 0.8, 0)
  } else if (name === 'intro') {
    if (t >= 8) shaker(0.7)
  } else {
    shaker(name === 'bridge' || name === 'bridge II' ? 0.8 : 1)
    add('kick', 0.8, 0, 2)
    add('kick', 0.4, 1.5, 3.5)
    if (name === 'piano solo' || name === 'vibes solo') {
      for (let i = 0; i < 4; i++) add('ride', 0.6 + 0.2 * hash(4 * b + i, 8), i)
      add('ride', 0.4, 1.5, 3.5)
      add('brush', 0.7, 1, 3)
    } else {
      add('rim', 0.8, ...CLAVE[mod(b, 2)])
      if (name !== 'scat') add('brush', 0.5, 1, 3)
    }
    if (b % 8 === 7 && name !== 'tag') add('rim', 0.6, 3.5, 3.75)
  }
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
  return hits
}
function lastHit(x, drum) {
  for (let b = floor(x / 4); b >= floor(x / 4) - 1 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v }
    if (best) return best
  }
  return null
}
const drums = {
  color: '#ff4f8b',
  graph: x => {
    const h = lastHit(x, 'rim')
    return h && h.τ < 0.3 ? 3.2 + h.vel * exp(-10 * h.τ) : null
  },
  midi: x => {
    const notes = []
    for (const [d, n] of [['kick', 36], ['rim', 37], ['brush', 38], ['shaker', 70], ['ride', 51]]) {
      const h = lastHit(x, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 70, sweep: 25, decay: 5, drive: 1 }), rim = rimDrum()
    const tap = snareDrum({ tone: 200, cutoff: 1500, decay: 18 }), shaker = shakerDrum(), ride = hatDrum({ decay: 2.5, cutoff: 4500, ring: 0.85 })
    const swish = brushDrum(), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.2 })
    const hit = (x, d, f, scale = sec) => {
      const h = lastHit(x, d)
      return h ? h.vel * f(h.τ * scale, true) : f(1, false)
    }
    return x => {
      const brushing = is(x, 'piano solo', 'vibes solo', 'bridge', 'bridge II', 'final theme') && x < FINAL
      const sweep = swish(brushing ? 0.05 * Math.abs(sin(PI * x)) ** 2 : 0) // a circular brush stroke every beat
      const y = 0.55 * hit(x, 'kick', kick, 1) + 0.18 * hit(x, 'rim', rim) + 0.12 * hit(x, 'brush', tap)
        + 0.1 * hit(x, 'shaker', shaker) + 0.07 * hit(x, 'ride', ride) + sweep
      const [l, r] = pan(y, 0.1)
      return verb(l, r)
    }
  },
}

// ---- vibraphone ------------------------------------------------------------------------------------
const VIBES = {
  theme: [THEME], 'theme II': [HARMONY], 'vibes solo': [VIBES_SOLO], 'final theme': [THEME, -12], tag: [TAG],
}
const vibes = {
  color: '#b8f0ff',
  graph: x => (play(VIBES, x) ? 1 + play(VIBES, x).n / 12 : null),
  midi: x => (play(VIBES, x) && play(VIBES, x).u < 0.9 ? [72 + play(VIBES, x).n] : []), // C5 = MIDI 72
  audio({ bpm }) {
    const sec = 60 / bpm, bars = poly(vibesTone, { release: 0.5, life: 6 }), fire = trigger(), verb = reverb({ room: 0.85, wet: 0.35 })
    return x => {
      const m = play(VIBES, x)
      if (fire(m ? m.at : null)) bars.hit(hz(m.n, C5), is(x, 'theme II') ? 0.45 : 0.75, m.d * sec + 0.4)
      const y = 0.2 * bars() * (1 - 0.35 * (0.5 + 0.5 * sin(TAU * 5.5 * x * sec)))
      return verb(...pan(y, 0.35))
    }
  },
}

// ---- flute ---------------------------------------------------------------------------------------
const FLUTE = { 'theme II': [THEME], bridge: [BRIDGE], 'final theme': [THEME] }
const flute = {
  color: '#e8f4ff',
  graph: x => (play(FLUTE, x) ? 1.4 + play(FLUTE, x).n / 12 : null),
  midi: x => (play(FLUTE, x) && play(FLUTE, x).u < 0.92 ? [72 + play(FLUTE, x).n] : []),
  audio({ bpm }) {
    const fl = breathyFlute(), echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.8, wet: 0.3 })
    let n = 7
    return x => {
      const m = play(FLUTE, x)
      if (m) n = m.n
      return verb(...echo(...pan(0.3 * fl(hz(n, C5), m && m.u < 0.92), -0.3)))
    }
  },
}

// ---- piano ----------------------------------------------------------------------------------------
// Solo (improvised) and the melody of the second bridge, each note with a soft chord a tenth below
const PIANO = { 'piano solo': [PIANO_SOLO], 'bridge II': [BRIDGE] }
const piano = {
  color: '#ffffff',
  graph: x => (play(PIANO, x) ? 1.2 + play(PIANO, x).n / 12 : null),
  midi: x => (play(PIANO, x) && play(PIANO, x).u < 0.9 ? [72 + play(PIANO, x).n] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.35, life: 5 }), fire = trigger(), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const m = play(PIANO, x)
      if (fire(m ? m.at : null)) {
        keys.hit(hz(m.n, C5), 0.55 + 0.3 * hash(floor(4 * x), 3), m.d * sec + 0.1)
        if (mod(m.at, 4) === 0) chordAt(x).v.forEach((n, i) => keys.hit(hz(n, C4), 0.3, 3.5 * sec, i * 0.01)) // left hand on each downbeat
      }
      return verb(...pan(0.28 * keys(), 0.05))
    }
  },
}

// ---- scat voice ------------------------------------------------------------------------------------
// The theme sung an octave down on "du-ba-da-di-da-bo…": each note gets the next vowel, its attack
// is the consonant; vibrato 5.5 Hz grows on long notes, the pitch scoops in from a semitone below
const SYLLABLES = ['u', 'a', 'a', 'i', 'a', 'o', 'u', 'a', 'e', 'a']
const SCAT = { scat: [THEME, -12] }
const scat = {
  color: '#fff3a0',
  graph: x => (play(SCAT, x) ? 0.4 + play(SCAT, x).n / 12 : null),
  midi: x => (play(SCAT, x) && play(SCAT, x).u < 0.9 ? [72 + play(SCAT, x).n] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, v = voice({ size: 1.08, breath: 0.08 }), glide = smooth(40), vowel = [smooth(25), smooth(25), smooth(25)]
    const echo = delay({ time: sec * 0.75, feedback: 0.25, wet: 0.2 }), verb = reverb({ room: 0.8, wet: 0.35 })
    let n = 0, j = 0, lastAt = null
    return x => {
      const m = play(SCAT, x), t = x * sec
      if (m && m.at !== lastAt) (lastAt = m.at), j++
      if (m) n = m.n
      const held = m ? m.τ * sec : 0
      const scoop = m ? -Math.max(0, 1 - held / 0.08) : 0
      const vib = 0.25 * Math.min(1, held / 0.5) * sin(TAU * 5.5 * t)
      const F = VOWELS[SYLLABLES[j % SYLLABLES.length]].map((f, i) => vowel[i](f))
      const on = m && m.u < 0.9 ? 1 : 0
      const y = 0.75 * v(glide(hz(n + scoop + vib, C5)), F, on)
      return verb(...echo(...pan(y, 0)))
    }
  },
}

// ---- strings -------------------------------------------------------------------------------------
const stringsOn = x => is(x, 'bridge II', 'final theme', 'tag') && x < END - 1
const stringSection = {
  color: '#d9b8ff',
  graph: x => (stringsOn(x) ? chordAt(x).v.map(n => -1.6 + n / 24) : null),
  midi: x => (stringsOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v.map(n => 60 + n) : []),
  audio() {
    const s = strings({ voices: 4, attack: 700, release: 1500, cutoff: 2800, gain: 0.06 }), ch = chorus({ mix: 0.4 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => verb(...ch(...s(stringsOn(x) ? chordAt(x).v.map(n => hz(n, C4)) : [])))
  },
}

export default {
  name: 'bossa',
  bpm: 120,
  length: END,
  sections: SECTIONS,
  tracks: { guitar, bass, drums, vibes, flute, piano, scat, strings: stringSection },
}
