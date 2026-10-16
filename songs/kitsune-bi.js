// Kitsune-bi (狐火, "fox fire") — a fox spirit's chase in 12/8: every beat (a dotted quarter, 112 BPM) splits in three,
// so the whole song swings in triplets. A minor through hirajoshi (A B C E F) — the koto's tuning; the dominant E7 with
// its G♯ only in the chords. Shinobue and koto carry two themes written over the same chords, so in the last fox fire
// they can play at once; shamisen, kotsuzumi with shouts, taiko, a celesta for the will-o'-the-wisps, a hardstyle kick
// on every beat and a reverse bass that rolls in triplets. The last part a whole step up, in B minor.
//
// tasogare (twilight) → kitsune (theme A) → tsuki (the moon: theme B) → kagebōshi (shadows: the hemiola) → build →
// KITSUNEBI (the drop) → yume (the dream: the shakuhachi improvises) → build II → KITSUNEBI II (both themes) → yoake.
//
// The math: the grid is j = ⌊3x⌋ (triplet eighths); the hemiola groups them in twos — a new note every 2/3 beat, three
// against two; the reverse bass swells u² over the triplets after each kick (one swell of ⅔ beat in the first drop, two
// of ⅓ in the second); the fox fires are celesta notes where hash(j) < density, on hirajoshi notes chosen by a second
// hash; the shakuhachi's dream is a random walk on hirajoshi with chord tones on the beats (improvise, a note per ⅔ beat);
// in the dream the koto plays theme B in canon with itself, one beat later and an octave down.
import { mod, floor, exp, sin, TAU, clamp, filter, reverb, delay, smooth, noise } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, improvise, voiceChords, shamisen, koto, shinobue, shakuhachi, taikoDrum, kotsuzumi, kakegoe,
  celestaTone, poly, trigger, strings, brass, hardKick, reverseBass, duck, chorus,
} from '../src/instruments.js'

const BPM = 112, SEC = 60 / BPM // a beat = a dotted quarter
const SECTIONS = [
  [0, 'tasogare'], [16, 'kitsune'], [48, 'tsuki'], [80, 'kagebōshi'], [112, 'build'], [128, 'kitsunebi'],
  [176, 'yume'], [208, 'build II'], [224, 'kitsunebi II'], [272, 'yoake'],
]
const END = 288
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
const tr = x => (is(x, 'build II', 'kitsunebi II', 'yoake') ? 2 : 0) // B minor at the end
const T3 = 1 / 3 // a triplet eighth

// ---- harmony --------------------------------------------------------------------------------------------------
const CH = { Am: [9, 0, 4], F: [5, 9, 0], Dm: [2, 5, 9], E7: [4, 8, 11, 2], Am9: [9, 0, 4, 11] }
const THEME_CH = ['Am', 'F', 'Dm', 'E7', 'Am', 'F', 'E7', 'Am']
const PROG = {
  tasogare: ['Am9'], kitsune: THEME_CH, tsuki: THEME_CH, 'kagebōshi': ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E7', 'E7'],
  build: ['F', 'Dm', 'E7', 'E7'], kitsunebi: [...THEME_CH, 'Am', 'F', 'Dm', 'E7'], yume: THEME_CH, 'build II': ['F', 'Dm', 'E7', 'E7'],
  'kitsunebi II': [...THEME_CH, 'Am', 'F', 'Dm', 'E7'], yoake: ['Am9', 'F', 'Am9', 'Am9'],
}
const BARS = []
for (let b = 0; b < END / 4; b++) {
  const { name, t } = part(4 * b), sym = PROG[name][floor(t / 4) % PROG[name].length], k = tr(4 * b)
  BARS.push({ sym, tr: k, pcs: CH[sym].map(p => mod(p + k, 12)) })
}
voiceChords(BARS.map(c => c.pcs), { lo: 55, hi: 76 }).forEach((v, i) => (BARS[i].v = v))
for (const c of BARS) c.bass = 36 + mod(c.pcs[0] - 36, 12)
const chordAt = x => BARS[clamp(floor(x / 4), 0, BARS.length - 1)]
const HIRAJOSHI = [9, 11, 0, 4, 5] // A B C E F

// ---- melodies [beat, MIDI, length] in A minor, on the triplet grid --------------------------------------------------
const A = [ // the fox: shinobue, over Am – F – Dm – E7 – Am – F – E7 – Am
  [0, 76, 2 * T3], [2 * T3, 81, T3], [1, 83, 2 * T3], [5 * T3, 84, T3], [2, 88, 1], [3, 84, 2 * T3], [11 * T3, 83, T3],
  [4, 81, 2 * T3], [14 * T3, 84, T3], [5, 88, 2 * T3], [17 * T3, 84, T3], [6, 81, 1], [7, 77, 2 * T3], [23 * T3, 76, T3],
  [8, 77, 2 * T3], [26 * T3, 81, T3], [9, 83, 2 * T3], [29 * T3, 84, T3], [10, 81, 1], [11, 77, 2 * T3], [35 * T3, 76, T3],
  [12, 83, 1], [13, 84, 2 * T3], [41 * T3, 83, T3], [14, 76, 2],
  [16, 81, 2 * T3], [50 * T3, 83, T3], [17, 84, 2 * T3], [53 * T3, 88, T3], [18, 93, 1], [19, 88, 2 * T3], [59 * T3, 84, T3],
  [20, 89, 1], [21, 88, 2 * T3], [65 * T3, 84, T3], [22, 81, 1], [23, 84, 2 * T3], [71 * T3, 83, T3],
  [24, 83, 1], [25, 88, 2 * T3], [77 * T3, 84, T3], [26, 83, 1], [27, 77, 2 * T3], [83 * T3, 76, T3],
  [28, 81, 3],
]
const B = [ // the moon: koto, the same chords, in long notes — a counterpoint to A
  [0, 69, 2], [2, 72, 1], [3, 71, 1], [4, 72, 2], [6, 69, 1], [7, 76, 1], [8, 74, 2], [10, 77, 1], [11, 76, 1], [12, 71, 2], [14, 76, 2],
  [16, 76, 2], [18, 72, 1], [19, 71, 1], [20, 69, 2], [22, 72, 1], [23, 76, 1], [24, 71, 2], [26, 76, 1], [27, 71, 1], [28, 72, 2], [30, 69, 2],
]
const DREAM = improvise({ start: 180, length: 26, rate: 1.5, seed: 9, lo: 64, hi: 84, phrase: 8, rest: 0.2, hold: 0.35, breathe: 2, scale: () => HIRAJOSHI, chord: x => chordAt(x).pcs })

const play = (list, x, at, dn = 0) => { const m = notesAt(list, x - at); return m && { n: m.n + tr(x) + dn, d: m.d, τ: m.τ, u: m.u, at: at + m.at } }
const fluteAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'kitsune' || name === 'kitsunebi II') return t < 32 ? play(A, x, s) : play(A.slice(0, 25), x, s + 32)
  if (name === 'kitsunebi') return t < 32 ? play(A, x, s) : play(A.slice(0, 25), x, s + 32)
  if (name === 'yoake') return t < 8 ? play(A.slice(25), x, s - 16) : null // bars 5–6 of A, over Am9 – F
  return null
}
const shakuAt = x => (is(x, 'yume') ? notesAt(DREAM, x) : null)
const kotoNotes = x => { // → [{ n, at, d, v }, (second koto)]
  const { name, t } = part(x), s = x - t, c = chordAt(x), out = [null, null], j = floor(3 * x)
  if (name === 'tasogare' || name === 'yoake') out[0] = { n: c.bass + 33, at: j * T3, d: T3, v: 0.2 + 0.15 * (j % 3 === 0) } // the tremolo on the fifth above
  else if (name === 'tsuki' || name === 'kitsunebi II') { const m = play(B, x, s + 32 * floor(t / 32)); if (m) out[0] = { ...m, v: 0.8 } }
  else if (name === 'kagebōshi') { const v = c.v, k = floor(j / 2); out[0] = { n: v[k % 4] + 12, at: 2 * k * T3, d: 2 * T3, v: 0.6 } } // the hemiola
  else if (name === 'yume') {
    const m = play(B, x, s), e = t >= 1 ? play(B, x - 1, s) : null
    if (m) out[0] = { ...m, v: 0.7 }
    if (e) out[1] = { ...e, n: e.n - 12, at: e.at + 1, v: 0.5 }
  } else if (name === 'kitsunebi' || name === 'build' || name === 'build II') {
    const v = c.v, cyc = [0, 1, 2, 3, 2, 1]
    out[0] = { n: v[cyc[j % 6]] + 12, at: j * T3, d: T3, v: j % 3 ? 0.35 : 0.55 }
  } else if (name === 'kitsune' && t >= 16) out[0] = { n: c.v[3] + 12, at: floor(x), d: 1, v: 0.4 }
  return out
}
// the shamisen: root, octave, fifth in triplets; in the shadows a note every ⅔ beat (three against two)
const shamiAt = x => {
  const { name } = part(x), c = chordAt(x), j = floor(3 * x)
  if (['tasogare', 'yume', 'yoake'].includes(name)) return null
  if (name === 'kagebōshi') { const k = floor(j / 2); return { n: c.bass + 12 + [0, 7, 12, 7][k % 4], at: 2 * k * T3, d: 2 * T3, v: 0.7 } }
  const pat = mod(floor(x), 4) === 3 ? [0, 7, 12] : [0, 12, 7]
  return { n: c.bass + 12 + pat[j % 3], at: j * T3, d: T3, v: j % 3 ? 0.45 : 0.8 }
}
// fox fires: celesta notes where hash(j) < density, on hirajoshi, two octaves up
const DENSITY = { tasogare: 0.35, kitsune: 0.1, tsuki: 0.15, 'kagebōshi': 0.1, build: 0.05, kitsunebi: 0.2, yume: 0.3, 'build II': 0.05, 'kitsunebi II': 0.25, yoake: 0.4 }
const fireAt = x => {
  if (x >= END - 2) return null
  const j = floor(3 * x)
  if (hash(j, 3) >= DENSITY[part(x).name]) return null
  const pcs = HIRAJOSHI.map(p => mod(p + tr(x), 12)), p = pcs[floor(hash(j, 4) * 5)]
  return { n: 84 + mod(p - 0, 12) + (hash(j, 5) < 0.4 ? 12 : 0), at: j * T3 }
}

// ---- drums -----------------------------------------------------------------------------------------------------------
const HITS = {}
const add = (drum, at, vel = 1, data) => (HITS[drum] ??= []).push([at, vel * (0.86 + 0.14 * hash(floor(at * 12), drum.length)), data])
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let b = start; b < end; b += 4) {
    const t = b - start, last = b + 4 === end, bar = floor(t / 4)
    if (name === 'kitsune' || name === 'tsuki') {
      if (bar % 2 === 0) add('shout', b, 1, 'yo')
      add('pon', b + 1, 0.9), add('ta', b + 2 + T3, 0.8), add('pon', b + 3, 0.7), add('pon', b + 3 + 2 * T3, 0.5)
      if (name === 'tsuki') add('kick', b), add('kick', b + 2, 0.8), add('naga', b + 1), add('naga', b + 3)
      if (t >= 16 || name === 'tsuki') for (let i = 0; i < 12; i++) add('shime', b + i * T3, i % 3 ? 0.3 : 0.6)
      add('don', b, name === 'kitsune' ? 0.7 : 0.5)
    } else if (name === 'kagebōshi') { // the hemiola: the drums group the triplets in twos
      for (let k = 0; k < 6; k++) add(k % 2 ? 'naga' : 'don', b + 2 * k * T3, k % 3 === 0 ? 1 : 0.65)
      for (let i = 0; i < 12; i++) add('shime', b + i * T3, i % 2 ? 0.3 : 0.6)
      if (bar % 2) add('shout', b + 3 + T3, 1, 'ha')
      add('kick', b), add('kick', b + 2)
    } else if (name === 'build' || name === 'build II') {
      const step = t < 4 ? 1 : t < 8 ? T3 : t < 12 ? T3 / 2 : T3 / 4
      for (let p = 0; p < 4 - 1e-9; p += step) add('shime', b + p, 0.4 + (0.6 * (t + p)) / 16)
      if (t >= 8) for (let p = 0; p < 4; p++) add('kick', b + p, 0.7 + (0.3 * t) / 16)
      if (t === 12) add('shout', b + 3, 1, 'yo')
      add('don', b, 0.8)
    } else if (name === 'kitsunebi' || name === 'kitsunebi II') {
      for (let p = 0; p < 4; p++) add('kick', b + p)
      add('naga', b + 1), add('naga', b + 3)
      for (let p = 0; p < 4; p++) add('ka', b + p + 2 * T3, 0.7)
      for (let i = 0; i < 12; i++) add('shime', b + i * T3, i % 3 ? 0.3 : 0.55)
      if (bar % 4 === 0) add('don', b), add('crash', b)
      if (bar % 4 === 3) add('pon', b + 3, 1), add('pon', b + 3 + T3, 0.8), add('ta', b + 3 + 2 * T3, 1)
      add('stab', b, 0.9), add('stab', b + 2 + 2 * T3, 0.7)
    } else if (name === 'yume') {
      if (bar % 2 === 0) add('pon', b, 0.6)
      add('don', b, 0.35)
    } else if (name === 'tasogare') {
      if (t === 12) add('shout', b + 3, 1, 'yo')
    } else if (name === 'yoake') {
      if (t === 0) add('don', b), add('kick', b), add('crash', b), add('stab', b, 1)
      if (t === 12) add('pon', b, 0.8), add('pon', b + 2 * T3, 0.6), add('ta', b + 1, 1)
    }
    if (last && ['kitsune', 'tsuki', 'kagebōshi', 'kitsunebi'].includes(name)) for (let i = 0; i < 6; i++) add('naga', b + 2 + i * T3, 0.5 + 0.08 * i)
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
const DROP = x => is(x, 'kitsunebi', 'kitsunebi II')
const pumpAt = x => { const k = lastOf('kick', x); return k && DROP(x) ? duck(k.τ * SEC, 0.6, 0.16) : 1 }
const y01 = (n, lo, hi, y0, y1) => y0 + ((n - lo) / (hi - lo)) * (y1 - y0)

// ---- tracks ---------------------------------------------------------------------------------------------------------
// Sb(x) — the shinobue: theme A, the fox
const fluteT = {
  color: '#ff5a5f',
  graph: x => { const m = fluteAt(x); return m ? y01(m.n, 74, 98, 1.3, 3) : null },
  midi: x => { const m = fluteAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [String.raw`Sb = a\Big(0.55\sin 2\pi\!\!\int\! g + 0.28\sin 4\pi\!\!\int\! g + 0.15\sin 6\pi\!\!\int\! g + \ldots\Big),\quad \text{ритм на сетке } \tfrac13\ \text{доли (12/8)}`],
  audio() {
    const fl = shinobue({ breath: 0.06 }), echo = delay({ time: SEC * 2 / 3, feedback: 0.3, wet: 0.22 }), verb = reverb({ room: 0.86, wet: 0.32 })
    let n = 81
    return x => {
      const m = fluteAt(x)
      if (m) n = m.n
      return verb(...echo(...pan(0.55 * pumpAt(x) * fl(mf(n), !!m && m.u < 0.93), 0.12)))
    }
  },
}

// Ko(x) — the koto: theme B, the hemiola, the canon in the dream, triplet arpeggios in the drops, the tremolo
const kotoT = {
  color: '#8ecae6',
  graph: x => { const ns = kotoNotes(x).filter(Boolean); return ns.length ? ns.map(e => y01(e.n, 48, 90, 0, 1.8)) : null },
  midi: x => kotoNotes(x).filter(e => e && x - e.at < e.d * 0.9).map(e => e.n),
  formula: [
    String.raw`\text{гемиола: } n = v_{\lfloor j/2\rfloor \bmod 4} + 12,\ j = \lfloor 3x\rfloor\quad\text{— новая нота каждые } \tfrac23 \text{ доли, три против двух}`,
    String.raw`\text{сон: } K_2(x) = B(x - 1) - 12\quad\text{— канон}`,
  ],
  audio() {
    const k1 = koto({ sustain: 3 }), k2 = koto({ sustain: 3, seed: 88 }), fires = [trigger(), trigger()], verb = reverb({ room: 0.88, wet: 0.36 })
    return x => {
      kotoNotes(x).forEach((e, i) => {
        if (!e || !fires[i](e.at + e.n / 1000)) return
        const press = i === 0 && e.d >= 2 && is(x, 'tsuki') ? 1 : 0 // oshide on the long notes of the moon: a press up and back
        ;(i ? k2 : k1).hit(mf(e.n), e.v, { bend: press && HIRAJOSHI.includes(mod(e.n + 1, 12)) ? 1 : press ? 2 : 0, bendAt: 0.5, bendTime: 0.15, back: 0.5 + e.d * SEC * 0.5 })
      })
      const g = 1.8 * pumpAt(x), [a, b] = pan(k1(), 0.3), [c, d] = pan(k2(), -0.4)
      return verb(g * (a + c), g * (b + d))
    }
  },
}

// Sm(x) — the shamisen: triplets of root, octave and fifth; twos against threes in the shadows
const shamiT = {
  color: '#ffd166',
  graph: x => { const m = shamiAt(x); return m && x - m.at < 0.2 ? y01(m.n, 45, 72, 0.3, 1.5) : null },
  midi: x => { const m = shamiAt(x); return m && x - m.at < m.d * 0.8 ? [m.n] : [] },
  formula: [String.raw`Sm:\ r + (0, 12, 7)_{j \bmod 3},\ j = \lfloor 3x\rfloor;\quad \text{тени: } r + (0, 7, 12, 7)_{\lfloor j/2\rfloor \bmod 4}`],
  audio() {
    const s = shamisen({ sawari: 0.012 }), fire = trigger(), verb = reverb({ room: 0.8, wet: 0.24 })
    return x => {
      const m = shamiAt(x)
      if (m && fire(m.at)) s.hit(mf(m.n), m.v)
      return verb(...pan(0.8 * pumpAt(x) * s(), -0.35))
    }
  },
}

// Ce(x) — the celesta: fox fires
const celT = {
  color: '#fff3b0',
  graph: x => { const f = fireAt(x); return f && x - f.at < 0.25 ? 4.2 + (f.n - 84) / 30 : null },
  midi: x => { const f = fireAt(x); return f && x - f.at < 0.25 ? [f.n] : [] },
  formula: [String.raw`\text{огонёк, если } \text{hash}(j) < \rho:\quad Ce = v\,e^{-t(1.2 + f/900)}\big(\sin 2\pi ft + 0.25e^{-9t}\sin 2\pi\,4ft + \ldots\big),\ f \in \text{хирадзёси}`],
  audio() {
    const p = poly(celestaTone, { release: 0.5, life: 3 }), fire = trigger(), echo = delay({ time: SEC * 2 / 3, feedback: 0.4, wet: 0.35 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => {
      const f = fireAt(x)
      if (f && fire(f.at)) p.hit(mf(f.n), 0.4 + 0.4 * hash(floor(3 * x), 6))
      return verb(...echo(...pan(0.3 * p(), sin(x))))
    }
  },
}

// Sh(x) — the shakuhachi's dream: a random walk on hirajoshi, a note every ⅔ beat, chord tones on the beats
const shakuT = {
  color: '#c8e6a0',
  graph: x => { const m = shakuAt(x); return m ? y01(m.n, 60, 88, 1, 2.6) : null },
  midi: x => { const m = shakuAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [String.raw`\text{improvise}(\text{лад } A\,B\,C\,E\,F,\ \text{шаг } \tfrac23,\ \text{фраза } 8),\quad Sh = a\big(\tanh(\ldots) + 0.17\BP_g\eta\big),\ g = f\,2^{-0.7(1 - s(t/0.14))/12}`],
  audio() {
    const sh = shakuhachi({ breath: 0.18 }), verb = reverb({ room: 0.93, wet: 0.48 }), echo = delay({ time: SEC, feedback: 0.3, wet: 0.2 })
    let n = 69
    return x => {
      const m = shakuAt(x)
      if (m) n = m.n
      return verb(...echo(...pan(0.6 * sh(mf(n), !!m && m.u < 0.94, { accent: 0.2 }), -0.15)))
    }
  },
}

// Ts(x) — kotsuzumi and the shouts: "yo-o!" pon … ta … pon
const tsuzumiT = {
  color: '#ffffff',
  graph: x => { const p = lastOf('pon', x), t = lastOf('ta', x), s = lastOf('shout', x); return (p && p.τ < 0.2) || (t && t.τ < 0.2) ? 3.7 : s && s.τ < 0.8 ? 4.4 : null },
  midi: x => [['pon', 60], ['ta', 62]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`\text{пон: } f = 290\cdot 2^{-4(1 - e^{-t/0.08})/12};\quad \text{та: } 560\ \text{Гц};\quad \text{«йо-о!», «ха!»}`],
  audio() {
    const pon = kotsuzumi({ pitch: 290, bend: -4 }), ta = kotsuzumi({ pitch: 560, bend: 1, seed: 33 }), k = kakegoe({ pitch: 175 }), verb = reverb({ room: 0.9, wet: 0.42 })
    return x => {
      const p = lastOf('pon', x), t = lastOf('ta', x), s = lastOf('shout', x)
      const y = (p ? 0.55 * p.vel * pon(p.τ * SEC, true) : pon(1, false)) + (t ? 0.4 * t.vel * ta(t.τ * SEC, true) : ta(1, false))
      const st = s ? s.τ * SEC : 9
      return verb(...pan(y + 0.85 * k(s ? s.data : 'ha', st, st < 1), 0.25))
    }
  },
}

// Ta(x) — taiko
const taikoT = {
  color: '#e63946',
  graph: x => {
    const d = lastOf('don', x), n = lastOf('naga', x), s = lastOf('shime', x)
    if (d && d.τ < 0.6) return 3.1 + 1.3 * d.vel * exp(-4 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.1 ? 2.3 + 0.5 * s.vel : null
  },
  midi: x => [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`T = \tanh\!\Big(1.4\LP\Big[\sum_{k}A_k e^{-2.6K_k t/d}\sin\big(R_k 2\pi f(t + \ldots)\big) + \ldots\Big]\Big),\quad \text{тени: } \text{до, на, до, на…}\ \text{каждые } \tfrac23`],
  audio() {
    const don = taikoDrum({ pitch: 64, decay: 1.2, crack: 0.25, boom: 0.4, seed: 1 }), naga = taikoDrum({ pitch: 128, decay: 0.5, crack: 0.42, seed: 2 })
    const shime = taikoDrum({ pitch: 450, decay: 0.1, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = taikoDrum({ pitch: 900, decay: 0.05, crack: 1, bend: 0, boom: 0, seed: 4 })
    const verb = reverb({ room: 0.84, damp: 0.45, wet: 0.28 })
    const hit = (d, f, x) => { const h = lastOf(d, x); return h ? h.vel * f(h.τ * SEC, true) : f(1, false) }
    return x => verb(...pan(0.55 * hit('don', don, x) + 0.3 * pumpAt(x) * hit('naga', naga, x) + 0.16 * hit('shime', shime, x) + 0.08 * hit('ka', ka, x)))
  },
}

// K(x) — the hardstyle kick on every dotted quarter; its tail on A1 (B1 at the end)
const kickT = {
  color: '#ff006e',
  graph: x => { const k = lastOf('kick', x); return k && k.τ < 0.5 ? 2.6 + 1.8 * k.vel * exp(-6 * k.τ) : null },
  midi: x => (lastOf('kick', x)?.τ < 0.2 ? [36] : []),
  formula: [String.raw`K = 0.8\tanh\!\Big(2.2\LP\big[\tanh(7(s + 0.3)) - \tanh 2.1\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP\eta + 0.55\sin 2\pi\!\!\int\! f,\quad f = 55\cdot 2^{\text{tr}/12}\ (A1)`],
  audio() {
    const k = hardKick({ tail: 0.3, drop: 5, drive: 7, bias: 0.3, tone: 4800, sub: 0.55 })
    return x => { const h = lastOf('kick', x); return 0.26 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, mf(33 + tr(x)), !!h) }
  },
}

// R(x) — the reverse bass over the triplets after each kick: one swell of ⅔ beat, then two of ⅓ in the second drop
const rbassAt = x => {
  if (!DROP(x)) return null
  const p = mod(x, 1)
  if (p < T3) return null
  return { u: is(x, 'kitsunebi II') ? mod(p - T3, T3) / T3 : (p - T3) / (2 * T3), n: 33 + mod(chordAt(x).pcs[0] - 9, 12) }
}
const rbassT = {
  color: '#6a040f',
  graph: x => { const b = rbassAt(x); return b ? -2.9 + 0.8 * b.u * b.u : null },
  midi: x => (rbassAt(x)?.u > 0.3 ? [rbassAt(x).n] : []),
  formula: [String.raw`R = \HP_{25}\LP_{150\cdot 2^{4u}}\tanh\!\Big(5u^2\big(\ldots\big)\Big),\quad u = \tfrac{(x \bmod 1) - 1/3}{2/3}\ \ \big(\text{II: } \tfrac{((x \bmod 1) - 1/3) \bmod 1/3}{1/3}\big)`],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4, q: 1.3 }), lp = filter('lp')
    return x => { const b = rbassAt(x); return 0.3 * lp(rb(b ? b.u : null, mf(b ? b.n : 33)), 2400) }
  },
}

// St(x) — strings and the brass stabs
const padOn = x => x < END - 1 && !is(x, 'build')
const stringsT = {
  color: '#cdb4db',
  graph: x => (padOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1, 0.4)) : null),
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v : []),
  formula: [String.raw`S = \Rev\,\Cho\sum_{j=1}^{4}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big);\quad \text{медь: } \sum_j \text{Br}(f_j)\ \text{на } 0 \text{ и } 2\tfrac23`],
  audio() {
    const s = strings({ voices: 4, attack: 450, release: 1100, cutoff: 3000, gain: 0.06 }), b = brass({ voices: 4, bright: 1.1, gain: 0.3 })
    const ch = chorus({ mix: 0.35 }), verb = reverb({ room: 0.9, wet: 0.4 }), level = smooth(500)
    return x => {
      const c = chordAt(x), h = lastOf('stab', x), on = h && h.τ < 0.4, g = level(is(x, 'tasogare', 'yume', 'tsuki', 'yoake') ? 1 : 0.65) * pumpAt(x)
      const [l, r] = s(padOn(x) ? c.v.map(mf) : []), [bl, br] = b(on ? c.v.map(mf) : [], on ? h.vel : 0.5)
      return verb(...ch(g * l + pumpAt(x) * bl, g * r + pumpAt(x) * br))
    }
  },
}

// Fx(x) — dusk wind and the risers
const fxT = {
  color: '#6c757d',
  graph: x => (is(x, 'build', 'build II') ? -2 + (part(x).t / 16) ** 2 * 3 : is(x, 'tasogare', 'yoake') ? -2.9 + 0.05 * sin(x) : null),
  formula: [String.raw`\text{ветер: } \BP_{400\cdot 2^{1.5\sin(2\pi T/9)}}\eta;\quad \text{подъём: } 0.5u^2\BP_{300\cdot 2^{5.3u}}\eta`],
  audio() {
    const η = noise(14), bp = filter('bp'), wind = filter('bp'), hp = filter('hp'), verb = reverb({ room: 0.92, wet: 0.5 })
    return x => {
      const n = η(), T = x * SEC, u = is(x, 'build', 'build II') ? part(x).t / 16 : 0, c = lastOf('crash', x)
      let y = 0.5 * u * u * bp(n, 300 * 2 ** (5.3 * u), 1.5)
      y += (is(x, 'tasogare', 'yoake', 'yume') ? 0.08 : 0) * wind(n, 400 * 2 ** (1.5 * sin((TAU * T) / 9)), 3)
      y += c ? 0.25 * c.vel * exp(-2 * c.τ * SEC) * hp(n, 4500) : hp(0, 4500)
      return verb(y, y)
    }
  },
}

export default {
  name: 'kitsune-bi',
  bpm: BPM,
  key: 'Am',
  style: 'jbattle',
  theme: 'ink',
  length: END,
  sections: SECTIONS,
  tracks: {
    shinobue: fluteT, koto: kotoT, shamisen: shamiT, celesta: celT, shakuhachi: shakuT, tsuzumi: tsuzumiT, taiko: taikoT,
    kick: kickT, rbass: rbassT, strings: stringsT, fx: fxT,
  },
}
