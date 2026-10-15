// Lo-fi hip hop at 78 BPM — a cat asleep by a rainy window. About three minutes:
//   rain → beat → flute → piano bridge → vibraphone solo → flute II with strings → cat & flute
//   duet → sleep.
// Rhodes through chorus and tape (wow & flutter bend its pitch a few cents), a grand piano, an
// upright bass, swung boom-bap drums with fills, a breathy flute, a vibraphone whose solo is
// improvised by a deterministic random walk, a string section, rain, vinyl crackle — and a cat.
//
// x is time in beats. F major: Gm9 – C13 – Fmaj9 – Dm9;  bridge B♭maj9 – Am7 – Gm9 – C7sus4.
import { mod, floor, exp, sin, tanh, TAU, between, hz, filter, smooth, reverb, delay } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, trigger, poly, epianoTone, pianoTone, vibesTone, uprightTone, strings, flute as breathyFlute,
  meower, kickDrum, snareDrum, hatDrum, rimDrum, vinyl as crackle, rain as rainfall, chorus, tape, improvise, ar,
} from '../src/instruments.js'

const SECTIONS = [[0, 'rain'], [16, 'beat'], [48, 'flute'], [80, 'bridge'], [112, 'vibes'], [144, 'flute II'], [176, 'cat'], [208, 'zzz']]
const END = 224
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const F1 = 43.65, F3 = 174.61, F4 = 349.23
const SW = 0.6 // swing: the off-beat eighth lands at 0.6 of the beat

// ---- harmony ---------------------------------------------------------------------------------
// k = ⌊x/4⌋ mod 4;  voicings are rootless, semitones from F3;  roots from F1
const MAIN = { v: [[5, 9, 12, 16], [5, 9, 11, 16], [4, 7, 11, 14], [7, 11, 12, 16]], root: [2, 7, 0, 9] } // Gm9 C13 Fmaj9 Dm9
const BRIDGE = { v: [[9, 12, 16, 19], [4, 7, 11, 14], [5, 9, 12, 16], [7, 12, 14, 17]], root: [5, 4, 2, 7] } // B♭maj9 Am7 Gm9 C7sus4
const k = x => mod(floor(x / 4), 4)
const prog = x => (is(x, 'bridge') ? BRIDGE : MAIN)
const voicing = x => prog(x).v[k(x)]
const root = x => prog(x).root[k(x)]
const F_MAJOR = [0, 2, 4, 5, 7, 9, 11]

// ---- drums -----------------------------------------------------------------------------------
// The hits of bar b as [position, drum, velocity]: boom-bap with swung hats in the groove
// sections, a fill every 8th bar; cross-stick and quarter hats in the bridge.
const groove = x => is(x, 'beat', 'flute', 'vibes', 'flute II', 'cat')
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, hits = []
  if (groove(x)) {
    hits.push([0, 'kick', 1], [2 + SW, 'kick', 0.8], [1, 'snare', 1], [3, 'snare', 1])
    if (b % 2) hits.push([1 + SW, 'kick', 0.55])
    if (b % 8 === 7) hits.push([2 + SW, 'snare', 0.45], [3 + SW, 'snare', 0.6], [3 + SW + 0.2, 'snare', 0.35])
    for (let i = 0; i < 4; i++) {
      hits.push([i, 'hat', 0.75 + 0.25 * hash(4 * b + i, 1)])
      hits.push([i + SW, b % 2 && i === 3 ? 'open' : 'hat', 0.35 + 0.25 * hash(4 * b + i, 2)])
    }
  } else if (is(x, 'bridge')) {
    hits.push([0, 'kick', 0.5], [1, 'rim', 0.8], [3, 'rim', 0.8])
    for (let i = 0; i < 4; i++) hits.push([i + SW, 'hat', 0.35 + 0.2 * hash(4 * b + i, 3)])
  }
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
  return hits
}
// The latest hit of a drum at x → { τ (beats), vel } or null
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
    const h = lastHit(x, 'kick')
    return h && h.τ < 2 ? 3 + 1.4 * h.vel * exp(-5 * h.τ) : null
  },
  midi: x => {
    const notes = []
    for (const [d, n] of [['kick', 36], ['snare', 38], ['rim', 37], ['hat', 42], ['open', 46]]) {
      const h = lastHit(x, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 45, f1: 110, decay: 7, drive: 2 }), snare = snareDrum({ tone: 180, cutoff: 900, decay: 14 })
    const hat = hatDrum({ decay: 70 }), open = hatDrum({ decay: 9 }), rim = rimDrum(), lp = filter('lp'), tp = tape({ drive: 1.6 })
    const verb = reverb({ room: 0.6, damp: 0.5, wet: 0.18 })
    const play = (x, d, f, scale = 1) => {
      const h = lastHit(x, d)
      return h ? h.vel * f(h.τ * scale, true) : f(1, false)
    }
    return x => {
      const y = 0.8 * play(x, 'kick', kick) + 0.4 * play(x, 'snare', snare, sec) + 0.1 * play(x, 'hat', hat, sec)
        + 0.08 * play(x, 'open', open, sec) + 0.25 * play(x, 'rim', rim, sec)
      return verb(...tp(...pan(lp(y, 6000))))
    }
  },
}

// ---- Rhodes ------------------------------------------------------------------------------------
// Comping per section: [position in bar, velocity, length in beats];  muffled ("next room")
// in the rain and sleep sections, a stereo tremolo 1 ± 0.25·sin(2π·3.5t), chorus, tape
const COMP = {
  rain: [[0, 0.55, 4]], zzz: [[0, 0.5, 4]], bridge: [],
  flute: [[0, 0.75, 1 + SW], [1 + SW, 0.45, 2 - SW], [3, 0.5, 1]], 'flute II': [[0, 0.7, 1 + SW], [1 + SW, 0.45, 2 - SW], [3, 0.5, 1]],
}
const comp = x => COMP[part(x).name] ?? [[0, 0.8, 2 + SW], [2 + SW, 0.5, 2 - SW]]
const compHit = x => {
  let h = null
  for (const c of comp(x)) if (c[0] <= mod(x, 4)) h = c
  return h
}
const rhodes = {
  color: '#ffcf9f',
  graph: x => (compHit(x) && x < END ? voicing(x).map(n => -0.4 + n / 24) : null),
  midi: x => {
    const h = compHit(x)
    return h && x < END && mod(x, 4) - h[0] < h[2] * 0.9 ? voicing(x).map(n => 53 + n) : [] // F3 = MIDI 53
  },
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(epianoTone, { release: 0.3, life: 8 }), fire = trigger()
    const lp = [filter('lp'), filter('lp')], cut = smooth(400), ch = chorus({ mix: 0.45 }), tp = tape(), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const h = compHit(x), b = floor(x / 4)
      if (fire(h && x < END ? 4 * b + h[0] : null)) {
        voicing(x).forEach((n, i) => keys.hit(hz(n, F3), h[1] * (0.9 + 0.1 * hash(4 * b + i, 4)), h[2] * sec * 0.95, i * 0.012))
      }
      const t = x * sec, y = 0.13 * keys(), trem = 0.25 * sin(TAU * 3.5 * t), c = cut(is(x, 'rain', 'zzz') ? 1100 : 5500)
      return verb(...tp(...ch(lp[0]((1 - trem) * y, c), lp[1]((1 + trem) * y, c))))
    }
  },
}

// ---- grand piano ----------------------------------------------------------------------------------
// Bridge: swung-eighth arpeggios (bass, then the voicing up and back down);  sleep: the same in quarters
const ARP = [-1, 0, 1, 2, 3, 2, 1, 0] // −1 = the root an octave below F3
const pianoNote = (x, i) => (ARP[i] < 0 ? root(x) - 12 : voicing(x)[ARP[i]]) // semitones from F3
const pianoHit = x => {
  const p = mod(x, 4)
  if (is(x, 'bridge')) {
    const i = 2 * floor(p) + (mod(p, 1) >= SW ? 1 : 0)
    return { i, at: floor(x) + (i % 2 ? SW : 0) }
  }
  if (is(x, 'zzz') || (is(x, 'rain') && x >= 8)) return { i: floor(p) * 2, at: floor(x) }
  return null
}
const piano = {
  color: '#ffffff',
  graph: x => (pianoHit(x) ? 0.6 + pianoNote(x, pianoHit(x).i) / 18 : null),
  midi: x => (pianoHit(x) && x - pianoHit(x).at < 0.4 ? [53 + pianoNote(x, pianoHit(x).i)] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.5, life: 6 }), fire = trigger()
    const lp = filter('lp'), tp = tape({ wow: 0.0008 }), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.35 })
    return x => {
      const h = pianoHit(x)
      if (fire(h ? h.at : null)) keys.hit(hz(pianoNote(x, h.i), F3), 0.45 + 0.3 * hash(floor(4 * x), 5), 1.4)
      const y = 0.3 * lp(keys(), is(x, 'rain', 'zzz') ? 2500 : 6000)
      return verb(...tp(...pan(y, 0.15)))
    }
  },
}

// ---- upright bass ------------------------------------------------------------------------------------
// Groove: root on 1, root on the swung "and" of 2, the fifth on 4.  Bridge: a walking line
// root – fifth – octave – a semitone below the next root.
const bassAt = x => {
  const p = mod(x, 4), r = root(x)
  if (groove(x)) {
    const n = notesAt([[0, r, 1.4], [1 + SW, r, 0.9], [3, r + 7, 0.9]], p)
    return n && { n: n.n, at: floor(x / 4) * 4 + n.at, d: n.d }
  }
  if (is(x, 'bridge')) {
    const next = prog(x).root[mod(k(x) + 1, 4)]
    return { n: [r, r + 7, r + 12, next - 1][floor(p)], at: floor(x), d: 0.95 }
  }
  return null
}
const bass = {
  color: '#9fd3ff',
  graph: x => (bassAt(x) ? -2.6 + bassAt(x).n / 12 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [41 + bassAt(x).n] : []), // F2 = MIDI 41
  audio({ bpm }) {
    const sec = 60 / bpm, b = poly(uprightTone, { release: 0.08, life: 3 }), fire = trigger(), lp = filter('lp')
    return x => {
      const m = bassAt(x)
      if (fire(m ? m.at : null)) b.hit(hz(m.n, 2 * F1), 0.85 + 0.15 * hash(floor(2 * x), 6), m.d * sec)
      return 0.3 * tanh(1.2 * lp(b(), 1800))
    }
  },
}

// ---- flute -------------------------------------------------------------------------------------------
// Melodies [beat, n from F4, length]: A (first flute section, its second half ending higher),
// B (flute II), and the flute's answers to the cat in the duet
const A = [
  [0.5, 14, 1], [1.5, 12, 0.5], [2, 9, 1.5], [3.5, 7, 0.5],
  [4, 9, 0.75], [4.75, 7, 0.75], [5.5, 4, 2],
  [8.5, 12, 0.5], [9, 16, 1], [10, 14, 0.5], [10.5, 12, 1.5],
  [12.5, 9, 0.5], [13, 7, 1], [14, 4, 2],
]
const A2 = [...A.slice(0, 11), [12.5, 9, 0.5], [13, 12, 1], [14, 16, 2]]
const B = [
  [0, 16, 0.5], [0.6, 14, 0.4], [1, 12, 0.5], [1.6, 14, 0.9], [2.5, 9, 1], [3.6, 7, 0.4],
  [4, 9, 1.5], [5.6, 11, 0.4], [6, 12, 0.6], [6.6, 14, 1.4],
  [8, 16, 1], [9, 19, 0.6], [9.6, 16, 0.4], [10, 14, 0.6], [10.6, 12, 1.4],
  [12, 9, 0.6], [12.6, 12, 0.4], [13, 14, 1], [14, 16, 0.6], [14.6, 12, 1.4],
]
const ANSWERS = [[4.5, 12, 0.5], [5, 9, 0.5], [5.6, 7, 0.4], [6, 4, 1.6], [12.5, 16, 0.5], [13, 14, 0.5], [13.6, 12, 0.4], [14, 9, 1.6]]
const fluteAt = x => {
  const { name, t } = part(x)
  if (name === 'flute') return notesAt(t < 16 ? A : A2, mod(t, 16))
  if (name === 'flute II') return notesAt(B, mod(t, 16))
  if (name === 'cat') return notesAt(ANSWERS, mod(t, 16))
  return null
}
const flute = {
  color: '#e8f4ff',
  graph: x => (fluteAt(x) ? 1.3 + fluteAt(x).n / 12 : null),
  midi: x => (fluteAt(x) && fluteAt(x).u < 0.92 ? [65 + fluteAt(x).n] : []), // F4 = MIDI 65
  audio({ bpm }) {
    const fl = breathyFlute(), echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.35, wet: 0.25 }), verb = reverb({ room: 0.85, wet: 0.35 })
    let n = 9
    return x => {
      const m = fluteAt(x)
      if (m) n = m.n
      const y = 0.32 * fl(hz(n, F4), m && m.u < 0.92)
      return verb(...echo(...pan(y, 0.2)))
    }
  },
}

// ---- vibraphone --------------------------------------------------------------------------------------
// Solo: improvise() walks F major over the chords on swung eighths.  Under flute II: a 3-against-4
// polyrhythm — a note every 1.5 beats, j-th note = voicing tone j mod 4, an octave up.
// Motor tremolo: 1 − 0.4·(½ + ½sin 2π·5t)
const SOLO = improvise({
  start: 112, length: 32, rate: 2, seed: 11, swing: SW, lo: 0, hi: 21, phrase: 8, rest: 0.25, hold: 0.3,
  scale: () => F_MAJOR, chord: x => voicing(x).map(n => mod(n, 12)),
})
const vibesAt = x => {
  if (is(x, 'vibes')) {
    const m = notesAt(SOLO, x)
    return m && { n: m.n, at: x - m.τ, d: m.d, vel: 0.8 }
  }
  if (is(x, 'flute II')) {
    const j = floor(x / 1.5)
    return { n: voicing(1.5 * j)[mod(j, 4)], at: 1.5 * j, d: 1.4, vel: 0.4 }
  }
  return null
}
const vibes = {
  color: '#b8f0ff',
  graph: x => (vibesAt(x) ? 1.1 + vibesAt(x).n / 12 : null),
  midi: x => (vibesAt(x) && x - vibesAt(x).at < vibesAt(x).d * 0.9 ? [65 + vibesAt(x).n] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, bars = poly(vibesTone, { release: 0.6, life: 6 }), fire = trigger(), verb = reverb({ room: 0.85, wet: 0.35 })
    return x => {
      const m = vibesAt(x), t = x * sec
      if (fire(m ? m.at : null)) bars.hit(hz(m.n, F4), m.vel, m.d * sec + 0.6)
      const y = 0.22 * bars() * (1 - 0.4 * (0.5 + 0.5 * sin(TAU * 5 * t)))
      return verb(...pan(y, -0.35))
    }
  },
}

// ---- strings -------------------------------------------------------------------------------------
const stringsOn = x => is(x, 'bridge', 'flute II', 'zzz') && x < END - 2
const stringSection = {
  color: '#d9b8ff',
  graph: x => (stringsOn(x) ? voicing(x).map(n => -1.4 + n / 24) : null),
  midi: x => (stringsOn(x) && mod(x, 4) < 3.9 ? voicing(x).map(n => 53 + n) : []),
  audio() {
    const s = strings({ voices: 4, attack: 600, release: 1200, cutoff: 2600, gain: 0.07 }), ch = chorus({ mix: 0.4 })
    const verb = reverb({ room: 0.9, wet: 0.45 })
    return x => verb(...ch(...s(stringsOn(x) ? voicing(x).map(n => hz(n, F3)) : [])))
  },
}

// ---- the cat -------------------------------------------------------------------------------------
// The duet: the cat meows in beats 0–4 and 8–12 of every 16, the flute answers.  At the end,
// one long sleepy meow.  Meows [beat, n from F5, length]
const MEOWS = [[0, -5, 0.8], [1, -3, 0.6], [1.6, 0, 1.4], [8, 0, 0.6], [8.6, -3, 0.6], [9.2, -5, 1.6]]
const meowAt = x => {
  if (is(x, 'cat')) return notesAt(MEOWS, mod(part(x).t, 16))
  return between(x, 212, 215) ? notesAt([[212, -5, 3]], x) : null
}
const cat = {
  color: '#ffb3d9',
  graph: x => (meowAt(x) ? 2.2 + (meowAt(x).n + 3 * sin(Math.PI * meowAt(x).u)) / 8 : null),
  midi: x => (meowAt(x) ? [77 + meowAt(x).n] : []),
  audio({ bpm }) {
    const c = meower({ size: 0.95 }), lp = filter('lp'), echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.3, wet: 0.2 })
    const verb = reverb({ room: 0.85, wet: 0.4 })
    return x => {
      const m = meowAt(x)
      const y = 0.45 * lp(c(m?.n, m?.u ?? null, (x * 60) / bpm), 4500)
      return verb(...echo(...pan(y, -0.25)))
    }
  },
}

// ---- weather -------------------------------------------------------------------------------------
// Rain: loud in the intro and the ending, a distant patter in between; vinyl hiss & crackle all along
const ambience = {
  color: '#7f8fa6',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x) : null),
  audio() {
    const r = rainfall({ wash: 0.06, drops: 0.12 }), v = crackle({ hiss: 0.01, crackle: 0.3 }), level = ar(1500, 3000)
    return x => {
      const a = level(x > END + 1 ? 0 : is(x, 'rain', 'zzz') ? 1 : 0.3), [l, rr] = r(), c = v()
      return [a * l + c, a * rr + c]
    }
  },
}

export default {
  name: 'lofi',
  style: 'lofi',
  bpm: 78,
  key: 'F',
  length: END,
  sections: SECTIONS.map(([at, name]) => [at, name]),
  tracks: { ambience, rhodes, piano, bass, drums, flute, vibes, strings: stringSection, cat },
}
