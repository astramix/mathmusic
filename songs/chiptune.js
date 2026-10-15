// 8-bit adventure at 150 BPM, a whole game in two minutes: title screen → level 1 → cave →
// boss → victory → level 2 (a tone up) → sky (a fourth up, the lead improvised) → credits.
// Only what an NES has: two pulse channels (duty 12.5 / 25 / 50 %), a 4-bit triangle, a 15-bit
// LFSR noise channel — plus coins, a power-down, a boss alarm, an explosion and a 1-UP.
// Pulse 2 plays chords the chip way: one note per 60 Hz video frame, ⌊60t⌋ mod 3.
//
// x is time in beats. C major: C – Am – F – G;  F – G – Em – Am;  cave Am – F – Dm – E;  boss Am – Am – F – E.
import { mod, floor, exp, sin, TAU, between, hz, filter, reverb, delay } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, pulse, triangle4, lfsr, vol4, improvise } from '../src/instruments.js'

const SECTIONS = [
  [0, 'title'], [16, 'level 1'], [48, 'level 1 B'], [80, 'cave'], [112, 'boss'], [160, 'victory'],
  [168, 'level 2'], [232, 'sky'], [264, 'credits'], [296, 'the end'],
]
const END = 304
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const C2 = 65.41, C4 = 261.63, C5 = 523.25

// ---- harmony ---------------------------------------------------------------------------------
const CH = { C: [0, 4, 7], Am: [9, 12, 16], F: [5, 9, 12], G: [7, 11, 14], Em: [4, 7, 11], Dm: [2, 5, 9], E: [4, 8, 11] } // from C4
const ROOT = { C: 0, Am: 9, F: 5, G: 7, Em: 4, Dm: 2, E: 4 } // from C2
const A_PROG = ['C', 'Am', 'F', 'G'], B_PROG = ['F', 'G', 'Em', 'Am']
const PROG = { 'level 1 B': B_PROG, cave: ['Am', 'F', 'Dm', 'E'], boss: ['Am', 'Am', 'F', 'E'], victory: ['C', 'F', 'G', 'C'], 'the end': ['C'] }
const BAR = { victory: 2, credits: 8, 'the end': 8 } // beats per chord (4 otherwise)
const TR = { 'level 2': 2, sky: 5 } // transposition in semitones
const tr = x => TR[part(x).name] ?? 0
const chordAt = x => {
  const { name, t } = part(x)
  const p = name === 'level 2' && t >= 32 ? B_PROG : PROG[name] ?? A_PROG
  return p[mod(floor(t / (BAR[name] ?? 4)), p.length)]
}

// ---- melodies [beat, n from C5, length] -----------------------------------------------------------
const TITLE = [[8, 7, 0.5], [8.5, 12, 0.5], [9, 16, 1.5], [12, 19, 0.5], [12.5, 16, 0.5], [13, 24, 2.5]]
const MEL_A = [
  [0, 7, 0.5], [0.5, 12, 0.5], [1, 16, 0.5], [1.5, 12, 0.5], [2, 14, 0.5], [2.5, 16, 1], [3.5, 19, 0.5],
  [4, 16, 1], [5, 12, 0.5], [5.5, 9, 0.5], [6, 12, 1], [7, 11, 0.5], [7.5, 9, 0.5],
  [8, 9, 0.5], [8.5, 12, 0.5], [9, 17, 1], [10, 16, 0.5], [10.5, 14, 0.5], [11, 12, 1],
  [12, 11, 0.5], [12.5, 14, 0.5], [13, 19, 1.5], [14.5, 17, 0.5], [15, 14, 1],
]
const MEL_A_END = [...MEL_A.slice(0, -1), [15, 12, 1]]
const MEL_B = [
  [0, 17, 0.75], [0.75, 16, 0.25], [1, 14, 0.5], [1.5, 12, 0.5], [2, 9, 1], [3, 12, 0.5], [3.5, 14, 0.5],
  [4, 14, 0.75], [4.75, 12, 0.25], [5, 11, 0.5], [5.5, 14, 0.5], [6, 19, 1.5], [7.5, 17, 0.5],
  [8, 16, 1], [9, 11, 0.5], [9.5, 12, 0.5], [10, 16, 1], [11, 19, 1],
  [12, 21, 1.5], [13.5, 19, 0.5], [14, 16, 0.5], [14.5, 12, 0.5], [15, 9, 1],
]
const CAVE = [
  [0, 9, 1.5], [2, 12, 0.5], [2.5, 11, 1.5], [4, 9, 2], [6, 5, 1], [7, 4, 1],
  [8, 2, 1.5], [10, 5, 0.5], [10.5, 9, 1.5], [12, 8, 2], [14, 11, 1], [15, 4, 1],
]
const BOSS = [
  [0, 9, 0.5], [0.5, 9, 0.25], [0.75, 12, 0.25], [1, 16, 0.5], [1.5, 15, 0.5], [2, 16, 0.5], [2.5, 21, 1], [3.5, 20, 0.5],
  [4, 21, 0.5], [4.5, 19, 0.5], [5, 16, 0.5], [5.5, 12, 0.5], [6, 14, 0.5], [6.5, 16, 1], [7.5, 12, 0.5],
  [8, 17, 0.5], [8.5, 17, 0.25], [8.75, 16, 0.25], [9, 17, 0.5], [9.5, 21, 0.5], [10, 24, 1], [11, 21, 0.5], [11.5, 17, 0.5],
  [12, 20, 1], [13, 16, 0.5], [13.5, 20, 0.5], [14, 23, 1], [15, 20, 0.25], [15.25, 16, 0.25], [15.5, 8, 0.5],
]
const FANFARE = [
  [0, 0, 0.25], [0.25, 4, 0.25], [0.5, 7, 0.25], [0.75, 12, 0.75], [1.5, 7, 0.5],
  [2, 9, 0.25], [2.25, 12, 0.25], [2.5, 17, 1.5], [4, 11, 0.25], [4.25, 14, 0.25], [4.5, 19, 1.5], [6, 24, 2],
]
// The sky level's lead is improvised: a walk over C major pentatonic (transposed with the level)
const SKY = improvise({
  start: 0, length: 32, rate: 2, seed: 8, lo: 7, hi: 26, phrase: 8, rest: 0.15, hold: 0.35, breathe: 1,
  scale: () => [0, 2, 4, 7, 9], chord: t => CH[A_PROG[mod(floor(t / 4), 4)]].map(n => mod(n, 12)),
})
const SLOW_A = MEL_A_END.map(([b, n, d]) => [2 * b, n, 2 * d]) // credits: the theme at half speed
const LEAD = {
  title: t => notesAt(TITLE, t),
  'level 1': t => notesAt(t < 16 ? MEL_A : MEL_A_END, mod(t, 16)),
  'level 1 B': t => notesAt(MEL_B, mod(t, 16)),
  cave: t => notesAt(CAVE, mod(t, 16)),
  boss: t => notesAt(BOSS, mod(t, 16)),
  victory: t => notesAt(FANFARE, t),
  'level 2': t => notesAt(t < 16 ? MEL_A : t < 32 ? MEL_A_END : MEL_B, mod(t, 16)),
  sky: t => notesAt(SKY, t),
  credits: t => notesAt(SLOW_A, t),
  'the end': t => notesAt([[0, 0, 6]], t),
}
const leadAt = x => {
  const { name, t } = part(x), m = x < END ? LEAD[name](t) : null
  return m && { ...m, n: m.n + tr(x), at: x - m.τ }
}
const DUTY = { 'level 1 B': 2, cave: 0, sky: 0, credits: 2, victory: 2, 'the end': 2, title: 2 } // index into 12.5/25/50 %

// L(x) — pulse 1, the lead. Chip envelope: full, falling 30% over 0.3 s, cut at 90% of the note;
// vibrato ±0.3 semitones at 6 Hz on long notes; echoes in the cave
const lead = {
  color: '#ff9ad5',
  graph: x => (leadAt(x) ? 1.2 + leadAt(x).n / 12 : null),
  midi: x => (leadAt(x) && leadAt(x).u < 0.9 ? [72 + leadAt(x).n] : []), // C5 = MIDI 72
  audio({ bpm }) {
    const sec = 60 / bpm, ps = [0.125, 0.25, 0.5].map(pulse), lp = filter('lp')
    const echo = delay({ time: sec * 0.75, feedback: 0.5, wet: 0.5 })
    return x => {
      const m = leadAt(x), t = x * sec, held = m ? m.τ * sec : 0
      const vib = held > 0.35 ? 0.3 * sin(TAU * 6 * t) : 0
      const f = hz((m?.n ?? 0) + vib, C5), duty = DUTY[part(x).name] ?? 1
      const waves = ps.map(p => p(f))
      const a = m && m.u < 0.9 ? vol4(1 - 0.3 * Math.min(1, held / 0.3)) : 0
      const y = 0.34 * a * lp(waves[duty], 12000)
      const [l, r] = pan(y, -0.2), cave = is(x, 'cave'), [el, er] = echo(cave ? l : 0, cave ? r : 0)
      return cave ? [el, er] : [l + el, r + er] // echoes ring out after the cave
    }
  },
}

// P(x) — pulse 2: the 60 Hz chord arpeggio on rhythmic eighths (e^{−4τ} per eighth); in the cave it
// echoes the lead 3/4 beat late; in the boss fight it breaks the chord in sixteenths
const p2At = x => {
  if (x >= END) return null
  const { name } = part(x), c = CH[chordAt(x)].map(n => n + tr(x))
  if (name === 'cave') {
    const m = leadAt(x - 0.75)
    return m && m.u < 0.9 ? { notes: [m.n - 12], a: 0.45 } : null
  }
  if (name === 'boss') return { notes: [c[[0, 1, 2, 1][mod(floor(4 * x), 4)]] + 12], a: 0.6 * exp(-10 * mod(x, 0.25)) }
  if (name === 'credits' || name === 'the end') return { notes: c, a: name === 'the end' ? 0.5 * exp(-0.5 * part(x).t) : 0.4 }
  return { notes: c, a: 0.55 * exp(-4 * mod(x, 0.5)) }
}
const harmony = {
  color: '#ffe08a',
  graph: x => (p2At(x) && p2At(x).a > 0.15 ? p2At(x).notes.map(n => -0.5 + n / 24) : null),
  midi: x => (p2At(x) && p2At(x).a > 0.2 ? p2At(x).notes.map(n => 60 + n) : []), // C4 = MIDI 60
  audio({ bpm }) {
    const p = pulse(0.125), lp = filter('lp'), sec = 60 / bpm
    return x => {
      const s = p2At(x), t = x * sec
      const n = s ? s.notes[mod(floor(60 * t), s.notes.length)] : 0
      const y = 0.3 * (s ? vol4(0.15 + s.a) : 0) * lp(p(hz(n, C4)), 12000)
      return pan(y, 0.3)
    }
  },
}

// T(x) — the triangle bass (no volume control on the chip: on or off)
//   levels: octave bounce on eighths · cave: dotted roots · boss: sixteenth chugs, octave on every 4th
//   victory: chord roots in quarters · credits: root – fifth half notes
const bassAt = x => {
  if (x >= END) return null
  const { name, t } = part(x), r = ROOT[chordAt(x)] + tr(x), p = mod(x, 4)
  if (name === 'title') return t >= 8 && mod(x, 1) < 0.8 ? r : null
  if (name === 'cave') return [0, 1.5, 3].some(h => p >= h && p < h + 0.9) ? r : null
  if (name === 'boss') return mod(x, 0.25) < 0.18 ? r + (mod(floor(4 * x), 4) === 3 ? 12 : 0) : null
  if (name === 'victory') return mod(x, 1) < 0.8 ? r : null
  if (name === 'credits') return mod(x, 2) < 1.8 ? r + (mod(floor(x / 2), 2) ? 7 : 0) : null
  if (name === 'the end') return t < 4 ? r : null
  return mod(x, 0.5) < 0.4 ? r + 12 * mod(floor(2 * x), 2) : null
}
const bass = {
  color: '#9fd3ff',
  graph: x => (bassAt(x) !== null ? -2.6 + bassAt(x) / 12 : null),
  midi: x => (bassAt(x) !== null ? [36 + bassAt(x)] : []), // C2 = MIDI 36
  audio() {
    const tri = triangle4(), lp = filter('lp')
    let n = 0
    return x => {
      const b = bassAt(x)
      if (b !== null) n = b
      return 0.2 * (b !== null ? 1 : 0) * lp(tri(hz(n, C2)), 9000)
    }
  },
}

// ---- noise channel drums ----------------------------------------------------------------------
// Kick = triangle sweep 60 + 300e^{−30τ} with a noise click;  snare = LFSR at 12 kHz;  hat = "metal" LFSR
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, { name, t } = part(x), hits = []
  const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel]))
  if (['level 1', 'level 1 B', 'level 2', 'sky'].includes(name)) {
    add('kick', 1, 0, 2.5)
    add('snare', 1, 1, 3)
    for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.5 : 0.8, i / 2)
    if (b % 8 === 7) add('snare', 0.7, 3.25, 3.5, 3.75)
  } else if (name === 'title' && t >= 8) {
    add('kick', 0.8, 0)
    for (let i = 0; i < 4; i++) add('hat', 0.6, i + 0.5)
  } else if (name === 'cave') {
    for (let i = 0; i < 4; i++) add('hat', 0.35, i)
  } else if (name === 'boss') {
    for (let i = 0; i < 8; i++) add('kick', i % 2 ? 0.6 : 1, i / 2)
    add('snare', 1, 1, 3)
    for (let i = 0; i < 16; i++) add('hat', i % 2 ? 0.4 : 0.7, i / 4)
    if (b % 4 === 3) add('snare', 0.8, 2.5, 2.75, 3.25, 3.5, 3.75)
  } else if (name === 'victory') {
    add('kick', 1, 0, 2)
    add('snare', 0.8, 1, 3)
    if (t >= 4) for (let i = 0; i < 8; i++) add('snare', 0.4 + 0.08 * i, 2 + i / 4)
  } else if (name === 'credits') {
    add('kick', 0.7, 0)
    add('snare', 0.6, 2)
    for (let i = 0; i < 4; i++) add('hat', 0.4, i + 0.5)
  } else if (name === 'the end' && t === 0) {
    add('kick', 1, 0)
    add('snare', 1, 0)
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
    const h = lastHit(x, 'kick')
    return h && h.τ < 1 ? 3 + 1.4 * h.vel * exp(-8 * h.τ) : null
  },
  midi: x => {
    const notes = []
    for (const [d, n] of [['kick', 36], ['snare', 38], ['hat', 42]]) {
      const h = lastHit(x, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  audio({ bpm }) {
    const sec = 60 / bpm, tri = triangle4(), white = lfsr(), white2 = lfsr(), tick = lfsr({ metal: true })
    let lastK = Infinity
    return x => {
      const k = lastHit(x, 'kick'), s = lastHit(x, 'snare'), h = lastHit(x, 'hat')
      const kt = k ? k.τ * sec : 1, st = s ? s.τ * sec : 1, ht = h ? h.τ * sec : 1
      if (kt < lastK) tri.reset?.()
      lastK = kt
      const kick = k && kt < 0.15 ? k.vel * (tri(60 + 300 * exp(-30 * kt)) + 0.3 * exp(-80 * kt) * white(4000)) : (tri(60), white(4000), 0)
      const snare = s && st < 0.25 ? s.vel * vol4(exp(-12 * st)) * white2(12000) : (white2(12000), 0)
      const hat = h && ht < 0.06 ? h.vel * vol4(exp(-50 * ht)) * tick(30000) : (tick(30000), 0)
      return 0.3 * kick + 0.14 * snare + 0.07 * hat
    }
  },
}

// ---- sound effects -------------------------------------------------------------------------------
// coin: B5 for 70 ms then E6 · down: 900·2^{−2t} Hz with a 20 Hz warble · alarm: 880/660 Hz every
// quarter beat · boom: LFSR noise whose clock falls 8 kHz → 300 Hz · jump: 300·2^{4t} · 1-UP: six quick notes
const SFX = [
  [15, 'coin'], [47.5, 'coin'], [77, 'down'], [108, 'alarm'], [158, 'boom'], [160.5, 'oneup'],
  [167.5, 'coin'], [199.5, 'jump'], [215.5, 'jump'], [231, 'coin'], [231.5, 'coin'], [263, 'oneup'],
]
const LEN = { coin: 0.5, down: 1.8, alarm: 1.6, boom: 1.6, jump: 0.3, oneup: 0.6 } // seconds
const sfxAt = (x, sec) => {
  let s = null
  for (const [at, type] of SFX) if (at <= x && (x - at) * sec < LEN[type]) s = { type, t: (x - at) * sec, x0: at }
  return s
}
const ONEUP = [1318.5, 1568, 2637, 2093, 2349.3, 3136]
const sfx = {
  color: '#ffffff',
  graph: x => {
    const s = sfxAt(x, 0.4)
    return s ? 4.2 + 0.4 * sin(TAU * 3 * s.t) : null
  },
  audio({ bpm }) {
    const sec = 60 / bpm, sq = pulse(0.5), noiseCh = lfsr(), verb = reverb({ room: 0.5, wet: 0.15 })
    return x => {
      const s = sfxAt(x, sec)
      let y = 0, f = 440
      if (s) {
        const { type, t } = s
        if (type === 'coin') (f = t < 0.07 ? 987.77 : 1318.5), (y = t < 0.07 ? 1 : exp(-5 * (t - 0.07)))
        else if (type === 'down') (f = 900 * 2 ** (-2 * t) * (1 + 0.06 * Math.sign(sin(TAU * 20 * t)))), (y = 1 - t / LEN.down)
        else if (type === 'alarm') (f = mod(floor(4 * (x - s.x0)), 2) ? 660 : 880), (y = 0.8)
        else if (type === 'jump') (f = 300 * 2 ** (4 * t)), (y = 1 - t / LEN.jump)
        else if (type === 'oneup') (f = ONEUP[Math.min(5, floor(t / 0.09))]), (y = 1)
      }
      const tone = sq(f), boom = s?.type === 'boom' ? exp(-2 * s.t) * noiseCh(8000 * 2 ** (-5 * s.t)) : (noiseCh(8000), 0)
      const out = 0.1 * vol4(y) * tone + 0.3 * boom
      return verb(out, out)
    }
  },
}

export default {
  name: 'chiptune',
  style: 'chiptune',
  bpm: 150,
  key: 'C',
  length: END,
  sections: SECTIONS,
  tracks: { lead, harmony, bass, drums, sfx },
}
