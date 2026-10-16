// Raiden (雷電, "thunder and lightning") — a Japanese battle theme in the manner of the Inazuma fights: shinobue,
// shakuhachi, shamisen and koto over a driving string ostinato and a taiko ensemble, timpani in the bass,
// and a hardstyle heart in the two storms (the kick's tail and the reverse bass on the tonic).
// E minor, the melodies leaning on the miyako-bushi notes E F A B C (the Phrygian F, the F major chord as ♭II),
// the dominant B7 with its D♯; 152 BPM; the final storm a whole step up, in F♯ minor.
//
// kaminari (thunder, a shakuhachi call) → shamisen riff → theme → STORM → eternity (theme B) → duel →
// koto solo → sakoku (the theme at half speed) → raijin (build) → FINAL STORM → oath (Phrygian cadence F → Em).
//
// The math: the chords are voice-led by a search (voiceChords: least motion, no parallel fifths/octaves);
// in the duel the koto answers the shamisen with the call turned upside down, n′ = 140 − n (E4 ↔ E5), snapped
// to the chord on the strong beats and to the mode between; the koto solo is a random walk (improvise) with
// grace notes and glissandi down its hirajoshi tuning; the final storm puts the koto in canon, K(x) = A(x − 2) − 12;
// the taiko double their roll 1 → ½ → ¼ → ⅛ through the build.
import { mod, floor, exp, sin, tanh, TAU, clamp, filter, reverb, delay, smooth, noise } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, improvise, voiceChords, shamisen, koto, shakuhachi, shinobue, taikoDrum, woodClack,
  templeBellTone, kakegoe, timpaniTone, poly, trigger, strings, brass, hardKick, reverseBass, duck, chorus, choir, VOWELS, blend,
} from '../src/instruments.js'

const BPM = 152, SEC = 60 / BPM
const SECTIONS = [
  [0, 'kaminari'], [16, 'shamisen'], [32, 'theme'], [64, 'storm'], [96, 'eternity'], [128, 'duel'],
  [160, 'koto'], [192, 'sakoku'], [224, 'raijin'], [240, 'final storm'], [288, 'oath'],
]
const END = 312
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
const tr = x => (is(x, 'final storm', 'oath') ? 2 : 0) // F♯ minor at the end

// ---- harmony: a chord per bar, voice-led once -----------------------------------------------------------
const CH = { Em: [4, 7, 11], C: [0, 4, 7], D: [2, 6, 9], F: [5, 9, 0], Am: [9, 0, 4], B7: [11, 3, 6, 9] } // root, 3rd, 5th, 7th
const PHRYGIAN = [4, 5, 7, 9, 11, 0, 2], HARMONIC = [4, 6, 7, 9, 11, 0, 3] // E Phrygian (miyako-bushi + G, D); E harmonic minor over B7
const A_CH = ['Em', 'C', 'D', 'Em', 'Am', 'F', 'B7', 'Em']
const PROG = {
  kaminari: ['Em'], shamisen: ['Em', 'F', 'Em', 'B7'], theme: A_CH, storm: A_CH, 'final storm': [...A_CH, 'Am', 'F', 'B7', 'Em'],
  eternity: ['Am', 'Em', 'F', 'Em', 'Am', 'D', 'B7', 'Em'], duel: ['Em', 'F', 'Em', 'F', 'Am', 'B7', 'Em', 'B7'],
  koto: ['Em', 'Am', 'F', 'Em', 'Am', 'B7', 'Em', 'Em'], sakoku: ['Em', 'Em', 'C', 'C', 'D', 'D', 'Em', 'Em'],
  raijin: ['C', 'D', 'B7', 'B7'], oath: ['Em', 'Em', 'F', 'F', 'Em', 'Em'],
}
const BARS = [] // per bar: { sym, tr, pcs, v (voicing), bass }
for (let b = 0; b < END / 4; b++) {
  const { name, t } = part(4 * b), sym = PROG[name][floor(t / 4) % PROG[name].length], k = tr(4 * b)
  BARS.push({ sym, tr: k, pcs: CH[sym].map(p => mod(p + k, 12)) })
}
voiceChords(BARS.map(c => c.pcs), { lo: 55, hi: 76 }).forEach((v, i) => (BARS[i].v = v))
for (const c of BARS) c.bass = 36 + mod(c.pcs[0] - 36, 12) // the root in C2…B2
const chordAt = x => BARS[clamp(floor(x / 4), 0, BARS.length - 1)]
const scaleAt = x => (chordAt(x).sym === 'B7' ? HARMONIC : PHRYGIAN).map(p => mod(p + tr(x), 12))
const snap = (n, pcs) => { for (let d = 0; d < 7; d++) for (const m of [n - d, n + d]) if (pcs.includes(mod(m, 12))) return m; return n }

// ---- melodies [beat, MIDI, length] in E minor ------------------------------------------------------------------
const A = [ // the battle theme, over Em – C – D – Em – Am – F – B7 – Em
  [0, 71, 0.75], [0.75, 76, 0.75], [1.5, 77, 0.5], [2, 83, 1.5], [3.5, 81, 0.5],
  [4, 84, 0.75], [4.75, 83, 0.75], [5.5, 81, 0.5], [6, 79, 1], [7, 76, 0.5], [7.5, 77, 0.5],
  [8, 81, 0.75], [8.75, 79, 0.75], [9.5, 74, 0.5], [10, 81, 1], [11, 83, 0.5], [11.5, 84, 0.5],
  [12, 83, 1.5], [13.5, 81, 0.25], [13.75, 79, 0.25], [14, 76, 2],
  [16, 81, 0.75], [16.75, 84, 0.75], [17.5, 86, 0.5], [18, 88, 0.75], [18.75, 86, 0.25], [19, 84, 0.5], [19.5, 83, 0.5],
  [20, 84, 0.75], [20.75, 81, 0.75], [21.5, 77, 0.5], [22, 81, 1], [23, 84, 0.5], [23.5, 83, 0.5],
  [24, 83, 0.5], [24.5, 84, 0.25], [24.75, 83, 0.25], [25, 81, 0.5], [25.5, 78, 0.5], [26, 75, 1], [27, 78, 0.5], [27.5, 81, 0.5],
  [28, 83, 0.5], [28.5, 79, 0.5], [29, 78, 0.5], [29.5, 75, 0.5], [30, 76, 2],
]
const A2 = A.filter(e => e[0] >= 16).map(([b, n, d]) => [b - 16, n, d]) // its second half
const B = [ // eternity: a long line over Am – Em – F – Em – Am – D – B7 – Em
  [0, 81, 2], [2, 84, 1], [3, 83, 1], [4, 83, 3], [7, 79, 1], [8, 81, 2], [10, 84, 1.5], [11.5, 83, 0.5], [12, 83, 2], [14, 76, 2],
  [16, 84, 2], [18, 88, 1], [19, 86, 1], [20, 86, 2], [22, 81, 1], [23, 78, 1], [24, 83, 2], [26, 81, 1], [27, 78, 1], [28, 79, 2], [30, 76, 2],
]
const CALL = [ // the shamisen's challenge, over Em – F
  [0, 64, 0.25], [0.25, 64, 0.25], [0.5, 71, 0.5], [1, 69, 0.5], [1.5, 65, 0.5], [2, 64, 0.5], [2.5, 67, 0.5], [3, 71, 0.5], [3.5, 76, 0.5],
  [4, 72, 0.5], [4.5, 69, 0.5], [5, 65, 0.5], [5.5, 69, 0.5], [6, 72, 1], [7, 71, 0.5], [7.5, 69, 0.5],
]
const snapMode = (n, pcs) => { for (let d = 0; d < 7; d++) for (const m of [n - d, n + d]) if (pcs.includes(((m % 12) + 12) % 12)) return m; return n }
const CALL5 = CALL.slice(0, 9).map(([b, n, d]) => [b, snapMode(n + 5, [4, 5, 7, 9, 11, 0, 2]), d]) // a fourth up, over Am, kept in the mode
// the answer: the call upside down around E4/E5 (n′ = 140 − n), snapped to the chord on strong beats, else to the mode
const invert = (list, at) => list.map(([b, n, d]) => {
  const x = at + b, strong = mod(b, 2) === 0
  return [b, snap(140 - n, strong ? chordAt(x).pcs : scaleAt(x)), d]
})
// the run at the end of the duel: groups of four climbing E harmonic minor, a step higher each beat
const RUN = (() => {
  const deg = g => 12 * floor(g / 7) + [0, 2, 3, 5, 7, 8, 11][mod(g, 7)] + 64
  return Array.from({ length: 32 }, (_, i) => [i / 4, deg(floor(i / 4) + (i % 4)), 0.25])
})()
const SHAKU_CALL = [[2, 71, 2], [4, 72, 0.5], [4.5, 71, 0.5], [5, 69, 1], [6, 64, 3], [10, 76, 1.5], [11.5, 77, 0.5], [12, 76, 1], [13, 71, 3]]
const SOLO = improvise({
  start: 160, length: 30, rate: 2, seed: 23, lo: 64, hi: 86, phrase: 8, rest: 0.18, hold: 0.3, breathe: 1.5,
  scale: x => scaleAt(x), chord: x => chordAt(x).pcs,
})
const HIRAJOSHI = [64, 65, 69, 71, 72, 76, 77, 81, 83, 84, 88] // the koto's tuning: E F A B C over two octaves
const GLISS = [[30, 1], [160, -1], [176, 1], [190, -1], [238, 1], [306, -1]] // [beat, up 1 / down −1]

// what each voice plays: { n, d, τ, u, at } or null
const play = (list, x, at, k = 1) => { const m = notesAt(list, (x - at) / k); return m && { n: m.n + tr(x), d: m.d * k, τ: m.τ * k, u: m.u, at: at + m.at * k } }
const shinobueAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'theme' || name === 'storm') return play(A, x, s)
  if (name === 'final storm') return t < 32 ? play(A, x, s) : play(A2, x, s + 32)
  return null
}
const shakuAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'kaminari') return play(SHAKU_CALL, x, s)
  if (name === 'eternity') { const m = play(B, x, s); return m && { ...m, n: m.n - 12 } }
  if (name === 'sakoku') return t < 30 ? play(A.filter(e => e[0] < 15), x, s, 2) : null
  if (name === 'oath') return t < 16 ? play(A.filter(e => e[0] < 8), x, s, 2) : null
  return null
}
// the shamisen: the riff (root, octave, fifth in sixteenths), the theme an octave down in the storms (long
// notes as tremolo), the call, the tremolo on B through the build
const RIFF = [0, 0, 12, 0, 7, 0, 12, 7]
const shamiAt = x => {
  const { name, t } = part(x), s = x - t, j = floor(4 * x), c = chordAt(x)
  const riff = () => ({ n: c.bass + 12 + RIFF[mod(j, 8)], at: j / 4, d: 0.25, v: mod(j, 4) ? 0.55 : 0.85 })
  if (name === 'shamisen' || name === 'theme') return riff()
  if (name === 'eternity') return t >= 16 && mod(j, 2) === 0 ? { ...riff(), v: 0.45 } : null
  if (name === 'storm' || name === 'final storm') {
    const m = shinobueAt(x)
    if (!m) return null
    if (m.d >= 1) return { n: m.n - 12, at: m.at + floor(4 * m.τ) / 4, d: 0.25, v: m.τ < 0.25 ? 0.9 : 0.55 }
    return { n: m.n - 12, at: m.at, d: m.d, v: 0.85 }
  }
  if (name === 'duel') {
    // 0–8 the call, (8–16 the koto answers), 16–20 the call a fourth up, (20–24 answered), 24–32 the run together
    if (t >= 24) { const m = play(RUN, x, s + 24); return m && { n: m.n, at: m.at, d: m.d, v: 0.75 } }
    if (t < 8) { const m = play(CALL, x, s); return m && { n: m.n, at: m.at, d: m.d, v: 0.85 } }
    if (t >= 16 && t < 20) { const m = play(CALL5, x, s + 16); return m && { n: m.n, at: m.at, d: m.d, v: 0.85 } }
    return null
  }
  if (name === 'raijin') return { n: 59 + (t >= 8 ? 12 : 0), at: j / 4, d: 0.25, v: 0.4 + (0.5 * t) / 16 }
  return null
}
// the koto: the theme an octave down (theme), broken chords, the answers, the solo, arpeggios, the canon
const ANSWERS = [invert(CALL, 136), invert(CALL5, 148)] // the inverted call over its own chords
const kotoNotes = x => { // → [{ n, at, d, v, bend? }] notes starting at or before x (the newest per voice)
  const { name, t } = part(x), s = x - t, out = []
  const note = (m, v = 0.7, o = {}) => m && out.push({ n: m.n, at: m.at, d: m.d, v, ...o })
  const c = chordAt(x)
  if (name === 'theme') { const m = play(A, x, s); note(m && { ...m, n: m.n - 12 }, 0.6) }
  else if (name === 'storm' || name === 'eternity' || name === 'sakoku') {
    const step = name === 'sakoku' ? 1 : 0.5, j = floor(x / step), cyc = [0, 1, 2, 3, 2, 1]
    note({ n: c.v[cyc[j % 6]] + 12, at: j * step, d: step * 2 }, name === 'storm' ? 0.45 : 0.55)
  } else if (name === 'duel') {
    if (t >= 8 && t < 16) note(play(ANSWERS[0], x, s + 8), 0.8)
    if (t >= 20 && t < 24) note(play(ANSWERS[1], x, s + 20), 0.8)
    if (t >= 24) { const m = play(RUN, x, s + 24); note(m && { ...m, n: m.n + 12 }, 0.6) }
  } else if (name === 'koto') {
    const m = notesAt(SOLO, x)
    // oshide on some long notes: pressed up to the next note of the mode, let go again before the end
    if (m) note({ n: m.n, at: m.at, d: m.d }, 0.75, { bend: m.d >= 0.9 && chordAt(m.at).sym !== 'B7' && hash(floor(m.at * 2), 5) < 0.4 ? snap(m.n + 1, scaleAt(m.at)) - m.n : 0 })
  } else if (name === 'final storm') { const m = t >= 2 ? play(t < 34 ? A : A2, x - 2, s + (t < 34 ? 0 : 32)) : null; note(m && { ...m, n: m.n - 12, at: m.at + 2 }, 0.6) }
  return out
}
const shoutAt = [[31, 'yo'], [63, 'ha'], [159.5, 'ha'], [224, 'yo'], [232, 'yo'], [238.5, 'ha'], [302, 'yo']]

// ---- the drums, laid out once ----------------------------------------------------------------------------------------
// odaiko "don", nagado "don" (higher), shime "ten", rim "ka"; hardstyle kick; timpani; brass stabs
const HITS = {}
const add = (drum, at, vel = 1, data) => (HITS[drum] ??= []).push([at, vel * (0.86 + 0.14 * hash(floor(at * 8), drum.length)), data])
const steps = (drum, b, pat, vel = 1) => { for (let i = 0; i < 16; i++) if (pat[i] === 'x' || pat[i] === 'o') add(drum, b + i / 4, (pat[i] === 'x' ? 1 : 0.45) * vel) }
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let b = start; b < end; b += 4) {
    const t = b - start, fill = mod(t, 32) === 28 || b + 4 === end, bar = floor(t / 4)
    if (name === 'kaminari') {
      if (t >= 8) for (let i = 0; i < (t >= 12 ? 16 : 8); i++) add('naga', b + i * (t >= 12 ? 0.25 : 0.5), 0.25 + 0.05 * (t - 8) + 0.02 * i)
      if (t === 12) add('don', b + 3.5, 1), add('timp', b, 0.7, 0)
    } else if (name === 'shamisen') {
      if (t >= 8) steps('shime', b, 'x-o-x-o-x-o-x-oo', 0.8)
      if (t >= 8) add('don', b), add('ka', b + 1.5, 0.6), add('ka', b + 3.5, 0.6)
      if (t === 12) steps('naga', b, '--------x-x-xxxx', 0.8)
    } else if (name === 'theme' || name === 'duel') {
      steps('don', b, 'x-----x---x-----')
      steps('naga', b, fill ? '----x---x-x-xxxx' : '----x-------x---', 0.85)
      steps('shime', b, 'x-oox-oox-oox-oo', 0.7)
      steps('ka', b, '--x---x---x---x-', 0.6)
      add('timp', b, 0.8, 0), add('timp', b + 2, 0.6, 7)
      add('stab', b, 0.9), add('stab', b + 1.5, 0.6)
    } else if (name === 'storm' || name === 'final storm') {
      for (let p = 0; p < 4; p++) add('kick', b + p)
      steps('naga', b, fill ? '----x---x-xxxxxx' : '----x-------x---', 1)
      steps('shime', b, 'xoxoxoxoxoxoxoxo', 0.6)
      steps('ka', b, '--x---x---x---x-', 0.7)
      if (bar % 4 === 0) add('don', b, 1)
      add('stab', b, 1), add('stab', b + 1.5, 0.8), add('stab', b + 3, 0.7)
      if (name === 'final storm' && t >= 40) add('timp', b, 1, 0), add('timp', b + 2, 0.9, 7)
    } else if (name === 'eternity') {
      steps('don', b, 'x-------------x-', 0.8)
      steps('naga', b, fill ? '--------x-x-xxxx' : '--------x-------', 0.7)
      if (t >= 16) steps('shime', b, 'x-o-x-o-x-o-x-o-', 0.55)
      add('timp', b, 0.6, 0)
      if (bar % 4 === 3) for (let i = 0; i < 8; i++) add('timp', b + 2 + i / 4, 0.25 + 0.06 * i, 0) // a roll into the next phrase
    } else if (name === 'koto') {
      steps('don', b, 'x---------------', 0.7)
      steps('shime', b, '--x---x---x---x-', 0.45)
      steps('ka', b, '----x-------x---', 0.4)
      add('timp', b, 0.5, 0)
    } else if (name === 'sakoku') {
      if (t >= 24) for (let i = 0; i < (t >= 28 ? 16 : 8); i++) add('naga', b + i * (t >= 28 ? 0.25 : 0.5), 0.2 + 0.03 * (t - 24) + 0.015 * i)
    } else if (name === 'raijin') {
      const step = t < 4 ? 1 : t < 8 ? 0.5 : t < 12 ? 0.25 : 0.125
      for (let p = 0; p < 4; p += step) add('naga', b + p, 0.4 + (0.5 * (t + p)) / 16)
      add('don', b), add('timp', b, 0.6 + t / 32, 0)
      if (t >= 12) for (let p = 0; p < 4; p += 0.5) add('kick', b + p, 0.6 + (0.4 * p) / 4)
      if (t >= 8) for (let p = 0; p < 4; p += 0.25) add('timp', b + p, 0.3 + (0.4 * (t - 8 + p)) / 8, 0)
    } else if (name === 'oath') {
      if (t === 0) add('don', b), add('timp', b, 0.6, 0)
      if (t === 16) [0, 1.5, 3].forEach(p => (add('don', b + p, 1), add('naga', b + p, 1), add('stab', b + p, 1), add('timp', b + p, 1, 0)))
      if (t === 20) add('don', b, 1), add('stab', b, 1), add('timp', b, 1, 0), add('kick', b, 1)
    }
  }
}
for (const list of Object.values(HITS)) list.sort((a, c) => a[0] - c[0])
const lastOf = (drum, x) => {
  const a = HITS[drum]
  if (!a || x >= END + 4) return null
  let lo = 0, hi = a.length - 1, r = -1
  while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m][0] <= x) (r = m), (lo = m + 1); else hi = m - 1 }
  return r < 0 ? null : { τ: x - a[r][0], vel: a[r][1], data: a[r][2], at: a[r][0] }
}
const STORMY = x => is(x, 'storm', 'final storm')
const pumpAt = x => { const k = lastOf('kick', x); return k && STORMY(x) ? duck(k.τ * SEC, 0.6, 0.17) : 1 }
const y01 = (n, lo, hi, y0, y1) => y0 + ((n - lo) / (hi - lo)) * (y1 - y0) // a note on a graph lane

// ---- tracks -----------------------------------------------------------------------------------------------------
// Sb(x) — the shinobue: the theme in theme, storm and the final storm
const shinobueT = {
  color: '#ff5a5f',
  graph: x => { const m = shinobueAt(x); return m ? y01(m.n, 70, 92, 1.4, 3) : null },
  midi: x => { const m = shinobueAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [
    String.raw`Sb = a\Big(0.55\sin 2\pi\!\!\int\! g + 0.28\sin 4\pi\!\!\int\! g + 0.15\sin 6\pi\!\!\int\! g + 0.05\BP_{2g}\eta + 0.4e^{-t/30\text{мс}}\HP_{4000}\eta\Big)`,
    String.raw`g = f\cdot 2^{0.15\,s(t)\sin(2\pi\cdot5.8T)/12},\quad f = 440\cdot 2^{(n - 69 + \text{tr})/12},\quad \text{tr} = 2\ \text{в финале}`,
  ],
  audio() {
    const fl = shinobue(), echo = delay({ time: SEC * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.32 })
    let n = 76
    return x => {
      const m = shinobueAt(x)
      if (m) n = m.n
      const y = 0.66 * pumpAt(x) * fl(mf(n), !!m && m.u < 0.93)
      return verb(...echo(...pan(y, 0.12)))
    }
  },
}

// Sh(x) — the shakuhachi: the call in the thunder, theme B low and breathy, the theme at half speed
const shakuT = {
  color: '#c8e6a0',
  graph: x => { const m = shakuAt(x); return m ? y01(m.n, 60, 92, 1, 2.8) : null },
  midi: x => { const m = shakuAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [
    String.raw`Sh = a\Big(\tanh\big(1.2(0.62\sin 2\pi\!\!\int\! g + 0.15\sin 4\pi\!\!\int\! g + 0.06\sin 6\pi\!\!\int\! g)\big) + 0.16\big(\BP_{g}\eta + \tfrac12\BP_{2g}\eta\big) + \text{мураики}\Big)`,
    String.raw`g = f\cdot 2^{\big(-0.7(1 - s(t/0.14)) + 0.3\,s(\frac{t - 0.35}{0.55})\sin(2\pi\cdot4.6T)\big)/12}\quad\text{— мэри снизу, юри на долгих нотах}`,
  ],
  audio() {
    const sh = shakuhachi({ breath: 0.17 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.45 }), echo = delay({ time: SEC * 1.5, feedback: 0.25, wet: 0.18 })
    let n = 71
    return x => {
      const m = shakuAt(x)
      if (m) n = m.n
      const y = 0.5 * sh(mf(n), !!m && m.u < 0.95, { accent: m && m.d >= 2 ? 0.6 : 0.1 })
      return verb(...echo(...pan(y, -0.15)))
    }
  },
}

// Sm(x) — the shamisen: the riff, the theme in tremolo, the call, the build
const shamiT = {
  color: '#ffd166',
  graph: x => { const m = shamiAt(x); return m && x - m.at < 0.2 ? y01(m.n, 50, 80, 0.8, 2.4) : null },
  midi: x => { const m = shamiAt(x); return m && x - m.at < m.d * 0.8 ? [m.n] : [] },
  formula: [
    String.raw`y[k] = e[k] + g\big(a\,y[k - D] + (1 - a)\,y[k - D - 1]\big),\quad D = \tfrac{44100}{f}\big(1 - 0.012\max(0, y[k-1])\big) - \delta(f)\quad\text{— савари}`,
    String.raw`Sm = 0.45\,\HP y + 1.1\BP_{450}y + 0.75\BP_{1800}y + 0.35\BP_{3200}y + 0.5\BP_{1700}(\text{удар бати}),\quad \text{рифф } (0, 0, 12, 0, 7, 0, 12, 7)_{\lfloor 4x\rfloor \bmod 8}`,
  ],
  audio() {
    const s = shamisen(), fire = trigger(), verb = reverb({ room: 0.78, damp: 0.45, wet: 0.24 })
    return x => {
      const m = shamiAt(x)
      if (m && fire(m.at + m.n / 1000)) s.hit(mf(m.n), m.v)
      return verb(...pan(1.1 * pumpAt(x) * s(), -0.3))
    }
  },
}

// Ko(x) — the koto: plucks, oshide bends in the solo (up to the next note of the mode and back), grace notes,
// glissandi down/up the hirajoshi tuning, the canon
const kotoT = {
  color: '#8ecae6',
  graph: x => {
    const ns = kotoNotes(x).filter(e => x - e.at < Math.max(0.3, e.d))
    const g = GLISS.find(([b]) => x >= b && x < b + 1.2)
    if (g) return y01(64 + 24 * clamp((x - g[0]) / 1.1, 0, 1) * (g[1] > 0 ? 1 : -1) + (g[1] > 0 ? 0 : 24), 50, 92, 0.4, 2.6)
    return ns.length ? ns.map(e => y01(e.n, 50, 92, 0.4, 2.6)) : null
  },
  midi: x => kotoNotes(x).filter(e => x - e.at < e.d * 0.9).map(e => e.n),
  formula: [
    String.raw`f(t) = f_0\cdot 2^{\,b\cdot s\left(\frac{t - 0.3}{0.12}\right)/12}\quad\text{(осидэ: } b \text{ — шаг лада вверх и обратно)}`,
    String.raw`Ko = 0.75\,\LP_{6500}y + 0.7\BP_{210}y + 0.4\BP_{650}y + 0.35\,\HP_{2500}(\text{цумэ}),\qquad K_{\text{канон}}(x) = A(x - 2) - 12`,
    String.raw`\text{глиссандо: струны } (E\,F\,A\,B\,C)\times 2\ \text{октавы, по одной каждые 30 мс}`,
  ],
  audio() {
    const k = koto(), fires = [trigger(), trigger()], verb = reverb({ room: 0.86, damp: 0.35, wet: 0.36 }), ch = chorus({ mix: 0.15, rate: 0.2 })
    let lastG = null
    return x => {
      const ns = kotoNotes(x)
      ns.forEach((e, i) => {
        if (!fires[i](e.at + e.n / 1000)) return
        const grace = part(x).name === 'koto' && e.d >= 0.5 && hash(floor(e.at * 4), 9) < 0.25
        if (grace) k.hit(mf(e.n + 2), 0.4 * e.v)
        k.hit(mf(e.n), e.v, { at: grace ? floor(0.06 * 44100) : 0, bend: e.bend ?? 0, bendAt: 0.25, bendTime: 0.1, back: e.bend ? 0.25 + e.d * SEC * 0.7 : 0 })
      })
      const g = GLISS.find(([b]) => x >= b && x < b + 0.05)
      if (g && lastG !== g[0]) {
        lastG = g[0]
        const strs = (g[1] > 0 ? HIRAJOSHI : [...HIRAJOSHI].reverse()).map(n => n + tr(g[0]))
        strs.forEach((n, i) => k.hit(mf(n), 0.35 + 0.03 * i, { at: floor(i * 0.03 * 44100) }))
      }
      return verb(...ch(...pan(1.8 * pumpAt(x) * k(), 0.3)))
    }
  },
}

// St(x) — strings: a legato bed in the calm sections, the rising scale through the build
const padOn = x => is(x, 'kaminari', 'eternity', 'sakoku', 'koto', 'final storm', 'oath', 'storm', 'raijin')
const stringsT = {
  color: '#cdb4db',
  graph: x => (padOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1, 0.4)) : null),
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? (is(x, 'kaminari') ? [40, 47, 52] : chordAt(x).v) : []),
  formula: [String.raw`S = \Rev\,\Cho\sum_{j=1}^{4}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big),\quad f_j \text{ — голоса аккорда (поиск: минимум движения, без параллельных квинт и октав)}`],
  audio() {
    const s = strings({ voices: 4, attack: 500, release: 1200, cutoff: 3000, gain: 0.065 }), ch = chorus({ mix: 0.35 }), verb = reverb({ room: 0.9, wet: 0.42 }), level = smooth(400)
    return x => {
      const on = padOn(x), c = chordAt(x), fs = !on ? [] : is(x, 'kaminari') ? [40, 47, 52, 59].map(mf) : c.v.map(mf)
      const g = level(is(x, 'storm', 'final storm', 'raijin') ? 0.6 : 1) * pumpAt(x)
      const [l, r] = s(fs)
      return verb(...ch(g * l, g * r))
    }
  },
}

// Sp(x) — the spiccato ostinato: cellos and violas in sixteenths on the root and its octave, accents 3 + 3 + 2
const spicOn = x => is(x, 'shamisen', 'theme', 'storm', 'duel', 'raijin', 'final storm') && !(is(x, 'shamisen') && part(x).t < 8)
const ACC = [1, 0.5, 0.6, 1, 0.5, 0.6, 1, 0.55]
const spicT = {
  color: '#b5838d',
  graph: x => (spicOn(x) ? y01(chordAt(x).bass + 12, 36, 60, -2.4, -1.4) + 0.25 * ACC[mod(floor(4 * x), 8)] : null),
  midi: x => (spicOn(x) && mod(x, 0.25) < 0.18 ? [chordAt(x).bass + 12, chordAt(x).bass + 24] : []),
  formula: [String.raw`Sp = \text{acc}_{\lfloor 4x\rfloor \bmod 8}\cdot\mathbb{1}[(x \bmod \tfrac14) < 0.18]\cdot S(r + 12,\ r + 24),\qquad \text{acc} = (1, .5, .6, 1, .5, .6, 1, .55)\ \ (3 + 3 + 2)`],
  audio() {
    const s = strings({ voices: 2, attack: 6, release: 60, cutoff: 4200, gain: 0.16 }), verb = reverb({ room: 0.8, wet: 0.25 }), hp = [filter('hp'), filter('hp')]
    return x => {
      const on = spicOn(x) && mod(x, 0.25) < 0.18, c = chordAt(x), j = floor(4 * x)
      const up = is(x, 'raijin') ? floor(part(x).t) : 0 // the build climbs the scale, a step a beat
      const r = c.bass + 12 + (up ? snap(c.bass + up, scaleAt(x)) - c.bass : 0)
      const [l, rr] = s(on ? [mf(r), mf(r + 12)] : [])
      const g = ACC[mod(j, 8)] * pumpAt(x)
      return verb(g * hp[0](l, 70), g * hp[1](rr, 70))
    }
  },
}

// Br(x) — brass stabs: the voicing on a horn section, a low-pass that opens with the loudness
const brassT = {
  color: '#f4a261',
  graph: x => { const h = lastOf('stab', x); return h && h.τ < 0.45 ? chordAt(x).v.map(n => y01(n, 50, 80, -0.8, 0.5)) : null },
  midi: x => { const h = lastOf('stab', x); return h && h.τ < 0.4 ? chordAt(x).v : [] },
  formula: [String.raw`Br = \sum_{j}\LP_{1.6f_c}\LP_{f_c}\tfrac12\big(\saw(g_j) + \saw(1.0023g_j)\big)\,e(t),\quad f_c = 250 + 4200\,e(t)^{1.6},\quad g_j = f_j\,2^{-0.5e^{-t/25\text{мс}}/12}`],
  audio() {
    const b = brass({ voices: 4, bright: 1.1, gain: 0.4 }), verb = reverb({ room: 0.88, wet: 0.4 })
    return x => {
      const h = lastOf('stab', x), on = h && h.τ < 0.42
      const [l, r] = b(on ? chordAt(x).v.map(mf) : [], on ? h.vel : 0.5)
      const g = pumpAt(x)
      return verb(g * l, g * r)
    }
  },
}

// Ti(x) — timpani on the root and the fifth, rolls into the phrases
const timpNote = h => { const n = chordAt(h.at).bass + h.data; return n > 50 ? n - 12 : n }
const timpT = {
  color: '#9c6644',
  graph: x => { const h = lastOf('timp', x); return h && h.τ < 1 ? -2.2 + 0.7 * h.vel * exp(-3 * h.τ) : null },
  midi: x => { const h = lastOf('timp', x); return h && h.τ < 0.2 ? [timpNote(h)] : [] },
  formula: [String.raw`Ti = \sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\,t}\sin\big(2\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\big),\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)`],
  audio() {
    const p = poly(timpaniTone, { release: 0.8, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.35 })
    return x => {
      const h = lastOf('timp', x)
      if (h && fire(h.at)) p.hit(mf(timpNote(h)), h.vel)
      return verb(...pan(0.55 * p(), -0.1))
    }
  },
}

// Ta(x) — the taiko ensemble: odaiko, nagado, shime-daiko and the rims
const taikoT = {
  color: '#e63946',
  graph: x => {
    const d = lastOf('don', x), n = lastOf('naga', x), s = lastOf('shime', x)
    if (d && d.τ < 0.6) return 3 + 1.4 * d.vel * exp(-4 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.15 ? 2.4 + 0.4 * s.vel : null
  },
  midi: x => [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [
    String.raw`T(t) = \tanh\!\Big(1.4\,\LP_{3000}\Big[\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\sin\big(R_k\,2\pi f\,(t + \gamma\tau(1 - e^{-t/\tau}))\big) + c\,e^{-t/4\text{мс}}\HP\eta + b\,e^{-t/0.35d}\BP_f\eta\Big]\Big)`,
    String.raw`R = (1, 1.52, 1.98, 2.46, 2.92),\quad f:\ \text{одайко } 62,\ \text{нагадо } 120,\ \text{симэ } 410\ \text{Гц}`,
  ],
  audio() {
    const don = taikoDrum({ pitch: 62, decay: 1.3, crack: 0.25, boom: 0.4, seed: 1 }), naga = taikoDrum({ pitch: 120, decay: 0.55, crack: 0.4, seed: 2 })
    const shime = taikoDrum({ pitch: 410, decay: 0.12, crack: 0.7, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 1900 })
    const verb = reverb({ room: 0.86, damp: 0.45, wet: 0.3 })
    const hit = (d, f, x) => { const h = lastOf(d, x); return h ? h.vel * f(h.τ * SEC, true) : f(1, false) }
    return x => {
      const l = 0.75 * hit('don', don, x) + 0.4 * hit('naga', naga, x) * 1.0 + 0.2 * hit('shime', shime, x) + 0.12 * hit('ka', ka, x)
      return verb(...pan(0.77 * l, 0))
    }
  },
}

// K(x) — the hardstyle kick in the storms, its tail on E1 (F♯1 in the final storm)
const kickT = {
  color: '#ff006e',
  graph: x => { const k = lastOf('kick', x); return k && k.τ < 0.5 ? 2.6 + 1.8 * k.vel * exp(-6 * k.τ) : null },
  midi: x => (lastOf('kick', x)?.τ < 0.2 ? [36] : []),
  formula: [String.raw`K = 0.8\tanh\!\Big(2.2\LP\big[\tanh(7(s + 0.3)) - \tanh 2.1\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP\eta + 0.5\sin 2\pi\!\!\int\! f,\quad f = 41.2\cdot 2^{\text{tr}/12}\ \text{(E1)}`],
  audio() {
    const k = hardKick({ tail: 0.28, drop: 5, drive: 7, bias: 0.3, tone: 4800, sub: 0.6 })
    return x => {
      const h = lastOf('kick', x)
      return 0.82 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, mf(28 + tr(x)), !!h)
    }
  },
}

// R(x) — the reverse bass between the kicks: a swell a beat in the storm, rolling (two a beat) in the final storm
const rbassAt = x => {
  if (!STORMY(x)) return null
  const p = mod(x, 1)
  if (p < 0.5) return null
  return { u: is(x, 'final storm') ? mod(p - 0.5, 0.25) / 0.25 : (p - 0.5) / 0.5, n: 28 + mod(chordAt(x).pcs[0] - 4, 12) }
}
const rbassT = {
  color: '#6a040f',
  graph: x => { const b = rbassAt(x); return b ? -2.9 + 0.8 * b.u * b.u : null },
  midi: x => (rbassAt(x)?.u > 0.3 ? [rbassAt(x).n] : []),
  formula: [String.raw`R = \HP_{25}\LP_{150\cdot 2^{4u}}\tanh\!\Big(5u^2\big(0.4\saw f + 0.4\saw 1.006f + 0.8\sin 2\pi\!\!\int\! f\big)\Big),\quad u = \tfrac{(x \bmod 1) - 1/2}{1/2}`],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4.2, q: 1.3 }), lp = filter('lp')
    return x => { const b = rbassAt(x); return 0.6 * lp(rb(b ? b.u : null, mf(b ? b.n : 28)), 2400) }
  },
}

// Ch(x) — a choir on "o", the second half of eternity, the final storm and the oath
const choirOn = x => (is(x, 'eternity') && part(x).t >= 16) || is(x, 'final storm', 'oath')
const choirT = {
  color: '#a2d2ff',
  graph: x => (choirOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1.6, -0.6)) : null),
  midi: x => (choirOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v.map(n => n - 12) : []),
  formula: [String.raw`Ch = \Rev\sum_{j}\sum_{i=1}^{3}\tfrac{G_i}{Q_i}\BP_{F_i}\big(\saw(f_j/2) + 0.06\eta\big),\quad F = \text{«о»}`],
  audio() {
    const c = choir({ voices: 4, size: 0.9, gain: 0.33 }), verb = reverb({ room: 0.93, wet: 0.5 })
    return x => {
      const [l, r] = c(choirOn(x) ? chordAt(x).v.map(n => mf(n - 12)) : [], blend(VOWELS.o, VOWELS.a, 0.3))
      const g = pumpAt(x)
      return verb(g * l, g * r)
    }
  },
}

// Ka(x) — kakegoe, the drummers' shouts
const shoutT = {
  color: '#ffffff',
  graph: x => { const s = shoutAt.find(([b]) => x >= b && x < b + 0.8); return s ? 4.4 : null },
  formula: [String.raw`\text{«и-йо-о!»}:\ f = 165\cdot 2^{(7\sin(\pi\min(1, t/0.6)) - 6s(t))/12},\ F: \text{«и»}\to\text{«о»};\quad \text{«ха!»}: \HP\eta \to \text{«а»}`],
  audio() {
    const k = kakegoe({ pitch: 160 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => {
      let s = null
      for (const e of shoutAt) if (e[0] <= x) s = e
      const t = s ? (x - s[0]) * SEC : 9
      return verb(...pan(0.85 * k(s ? s[1] : 'ha', t, t < 1), 0.2))
    }
  },
}

// Fx(x) — thunder, the temple bell, the riser of the build
const THUNDER = [0, 6, 222, 304], BELLS = [0, 192, 288, 308]
const fxT = {
  color: '#6c757d',
  graph: x => (THUNDER.some(b => x >= b && x < b + 3) ? -2.9 + 0.3 * sin(9 * x) : is(x, 'raijin') ? -2 + (part(x).t / 16) ** 2 * 3 : null),
  formula: [String.raw`\text{гром: }\LP_{120 + 900e^{-t}}\eta\cdot e^{-t/2}(1 + 3e^{-t/0.05}),\quad \text{колокол: } \tfrac12, 1, 1.2, 1.5, 2\ldots f\ \text{парами} \pm0.075\%`],
  audio() {
    const η = noise(9), lp = filter('lp'), lp2 = filter('lp'), bp = filter('bp'), bell = poly((f, t, v) => templeBellTone(f, t, v), { life: 12, release: 2 }), fire = trigger()
    const verb = reverb({ room: 0.94, damp: 0.3, wet: 0.5 })
    return x => {
      let th = 9, b = null
      for (const s of THUNDER) if (s <= x) th = (x - s) * SEC
      for (const s of BELLS) if (s <= x) b = s
      if (b !== null && x - b < 0.1 && fire(b)) bell.hit(mf(40 + tr(b) + (b === 308 ? 12 : 0)), 0.9)
      const n = η(), a = th < 6 ? exp(-th / 2) * (1 + 3 * exp(-th / 0.05)) : 0
      let y = 0.5 * a * lp(n, 120 + 900 * exp(-th)) + 0.15 * a * lp2(n * (η() > 0.9 ? 1 : 0), 2500)
      const u = is(x, 'raijin') ? part(x).t / 16 : 0
      y += 0.25 * u * u * bp(n, 300 * 2 ** (5 * u), 1.5)
      const bl = 0.5 * bell()
      return verb(y + bl, y + bl)
    }
  },
}

export default {
  name: 'raiden',
  bpm: BPM,
  key: 'Em',
  style: 'jbattle',
  theme: 'ink',
  length: END,
  sections: SECTIONS,
  tracks: {
    shinobue: shinobueT, shakuhachi: shakuT, shamisen: shamiT, koto: kotoT, strings: stringsT, spiccato: spicT,
    brass: brassT, timpani: timpT, taiko: taikoT, kick: kickT, rbass: rbassT, choir: choirT, kakegoe: shoutT, fx: fxT,
  },
}
