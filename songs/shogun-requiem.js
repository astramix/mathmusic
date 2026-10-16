// Shogun Requiem — an epic in two tempos: a war camp chanting at half time (84), then the clash at full 168 BPM.
// A male choir, biwa, shakuhachi, two koto in canon, shamisen tremolo, horns, strings, timpani, the taiko, and a
// hardstyle kick tuned so low and long that it booms like a timpano. C minor through the in-scale (C D♭ F G A♭, the
// ♭II chord D♭ everywhere), the dominant G with its B♮; a section in 7/4 (2 + 2 + 3); the last battle a whole step
// up in D minor, and after it D major — the Picardy third, the field after the battle.
//
// mokuso (meditation) → jinmaku (the war camp chants theme A at half time) → shingun (the advance) → GEKITOTSU
// (the clash, theme B) → kyōfu (fear, 7/4, the koto canon) → requiem (the chorale) → KESSEN (the last battle) →
// ikusa no ato (after the battle).
//
// The math: half time is x/2 — the same theme read at half speed, A(x/2); the chorale's four parts are found by a
// search (least motion, no parallel fifths/octaves, the leading tone never doubled); in kyōfu the second koto is the
// first one 1½ beats later and an octave down, K₂(x) = K₁(x − 3/2) − 12, a stretto that grinds C against D♭; the
// koto ostinato is (0, 7, 8, 7) over the root where the ♭6 lies in the key, else (0, 7, 12, 7).
import { mod, floor, exp, sin, TAU, clamp, filter, reverb, delay, smooth, noise } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, voiceChords, shamisen, koto, biwa, shakuhachi, taikoDrum, woodClack, templeBellTone,
  timpaniTone, poly, trigger, strings, brass, horn, hardKick, reverseBass, duck, chorus, choir, VOWELS, blend,
} from '../src/instruments.js'

const BPM = 168, SEC = 60 / BPM
const SECTIONS = [
  [0, 'mokuso'], [32, 'jinmaku'], [64, 'shingun'], [112, 'gekitotsu'], [176, 'kyōfu'], [204, 'requiem'],
  [252, 'kessen'], [316, 'ikusa no ato'],
]
const END = 348
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
const tr = x => (is(x, 'kessen', 'ikusa no ato') ? 2 : 0) // D minor for the last battle
const SEVEN = x => is(x, 'kyōfu') // bars of 7 beats

// ---- harmony: chords with their own lengths --------------------------------------------------------------------
const CH = { Cm: [0, 3, 7], Db: [1, 5, 8], G: [7, 11, 2], Fm: [5, 8, 0], Ab: [8, 0, 3], C: [0, 4, 7] }
const A_CH = ['Cm', 'Db', 'Cm', 'G', 'Fm', 'Ab', 'Db', 'G']
const B_CH = ['Cm', 'Db', 'Cm', 'Db', 'Fm', 'G', 'Cm', 'G']
const PLAN = { // section → [[chord, beats], …] repeated to fill it
  mokuso: [['Cm', 16], ['Db', 8], ['Cm', 8]],
  jinmaku: [['Cm', 8], ['Db', 8], ['Cm', 8], ['G', 8]],
  shingun: [...A_CH.map(c => [c, 4]), ['Cm', 4], ['Db', 4], ['Cm', 4], ['G', 4]],
  gekitotsu: B_CH.map(c => [c, 4]),
  kyōfu: [['Db', 7], ['Cm', 7]],
  requiem: [['Cm', 8], ['Db', 8], ['Cm', 8], ['G', 8], ['Fm', 4], ['Ab', 4], ['Db', 4], ['G', 4]],
  kessen: [...A_CH.map(c => [c, 4]), ...B_CH.map(c => [c, 4])],
  'ikusa no ato': [['Cm', 8], ['Db', 8], ['Cm', 8], ['C', 8]],
}
const SPANS = [] // { at, len, sym, pcs, v, bass }
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let at = start, i = 0; at < end; i++) {
    const [sym, len] = PLAN[name][i % PLAN[name].length], k = tr(at)
    SPANS.push({ at, len: Math.min(len, end - at), sym, pcs: CH[sym].map(p => mod(p + k, 12)) })
    at += len
  }
}
voiceChords(SPANS.map(c => c.pcs), { lo: 53, hi: 74 }).forEach((v, i) => (SPANS[i].v = v))
for (const c of SPANS) c.bass = 36 + mod(c.pcs[0] - 36, 12)
const BY_BEAT = [] // every chord starts on a whole beat
for (const s of SPANS) for (let b = s.at; b < s.at + s.len; b++) BY_BEAT[b] = s
const chordAt = x => BY_BEAT[clamp(floor(x), 0, END - 1)]
const KEY = [0, 1, 2, 3, 5, 7, 8, 10, 11] // C minor with D♭ (in-scale) and B♮ (over G)

// ---- melodies [beat, MIDI, length] in C minor --------------------------------------------------------------------------
const A = [ // theme A over Cm – D♭ – Cm – G – Fm – A♭ – D♭ – G
  [0, 72, 1.5], [1.5, 73, 0.5], [2, 75, 1], [3, 79, 1], [4, 80, 2], [6, 77, 1], [7, 75, 0.5], [7.5, 73, 0.5],
  [8, 72, 1], [9, 75, 1], [10, 79, 1.5], [11.5, 80, 0.5], [12, 79, 2], [14, 74, 1], [15, 71, 1],
  [16, 80, 1], [17, 79, 0.5], [17.5, 77, 0.5], [18, 84, 2], [20, 87, 1.5], [21.5, 84, 0.5], [22, 80, 2],
  [24, 77, 1], [25, 80, 1], [26, 85, 1.5], [27.5, 84, 0.5], [28, 86, 1], [29, 84, 0.5], [29.5, 83, 0.5], [30, 79, 2],
]
const B = [ // theme B, the clash, in eighths over Cm – D♭ – Cm – D♭ – Fm – G – Cm – G
  [0, 72, 0.5], [0.5, 72, 0.5], [1, 79, 0.5], [1.5, 75, 0.5], [2, 84, 0.5], [2.5, 82, 0.5], [3, 79, 0.5], [3.5, 75, 0.5],
  [4, 85, 1], [5, 84, 0.5], [5.5, 80, 0.5], [6, 77, 1], [7, 80, 0.5], [7.5, 84, 0.5],
  [8, 84, 0.5], [8.5, 79, 0.5], [9, 75, 0.5], [9.5, 79, 0.5], [10, 84, 0.5], [10.5, 87, 0.5], [11, 85, 0.5], [11.5, 84, 0.5],
  [12, 80, 1.5], [13.5, 79, 0.5], [14, 77, 1], [15, 73, 1],
  [16, 77, 0.5], [16.5, 80, 0.5], [17, 84, 0.5], [17.5, 89, 0.5], [18, 84, 0.5], [18.5, 87, 0.5], [19, 80, 0.5], [19.5, 77, 0.5],
  [20, 79, 0.5], [20.5, 83, 0.5], [21, 86, 0.5], [21.5, 89, 0.5], [22, 86, 1], [23, 83, 0.5], [23.5, 79, 0.5],
  [24, 87, 1], [25, 86, 0.5], [25.5, 84, 0.5], [26, 79, 1], [27, 80, 0.5], [27.5, 77, 0.5],
  [28, 86, 0.5], [28.5, 83, 0.5], [29, 79, 0.5], [29.5, 74, 0.5], [30, 79, 1], [31, 71, 1],
]
// kyōfu: fourteen eighths over D♭, fourteen over Cm (2 + 2 + 3)
const FEAR = [[68, 73, 72, 73, 77, 73, 72, 73, 80, 79, 77, 73, 72, 73], [67, 72, 73, 72, 75, 72, 73, 72, 79, 77, 75, 73, 72, 67]]
const BIWA = [ // the tale over the drone: [beat, MIDI, length, chord]
  [0, 48, 4, 1], [4, 60, 1], [5, 61, 1], [6, 60, 2], [8, 55, 2], [10, 56, 2], [12, 55, 4, 1],
  [16, 49, 4, 1], [20, 61, 1], [21, 65, 1], [22, 61, 2], [24, 48, 4, 1], [28, 55, 1], [29, 56, 1], [30, 55, 2],
]

const play = (list, x, at, k = 1, dn = 0) => { const m = notesAt(list, (x - at) / k); return m && { n: m.n + tr(x) + dn, d: m.d * k, τ: m.τ * k, u: m.u, at: at + m.at * k } }
const fearAt = (x, s) => { // the 7/4 line: bar k, eighth i
  const t = x - s
  if (t < 0) return null
  const k = floor(t / 7), i = floor(2 * mod(t, 7))
  return { n: FEAR[k % 2][i], at: s + 7 * k + i / 2, d: 0.5, τ: mod(t, 0.5), u: mod(t, 0.5) / 0.5 }
}
// the chant: theme A at half time in the war camp, the chorale's top in the requiem (the choir also holds the chords)
const chantAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'jinmaku') return play(A.filter(e => e[0] < 16), x, s, 2, -12)
  return null
}
const shakuAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'shingun') return t < 32 ? play(A, x, s) : play(A.filter(e => e[0] < 16), x, s + 32)
  if (name === 'requiem') return t < 32 ? play(A.filter(e => e[0] < 16), x, s, 2) : play(A.filter(e => e[0] >= 16).map(([b, n, d]) => [b - 16, n, d]), x, s + 32)
  if (name === 'mokuso') return t >= 16 ? play([[0, 68, 3], [3, 65, 1], [4, 68, 2], [6, 73, 2], [8, 72, 6]], x, s + 16) : null // A♭ F A♭ D♭ over D♭, then C
  return null
}
const leadAt = x => { // horns: theme B in the clash (second time) and the last battle
  const { name, t } = part(x), s = x - t
  if (name === 'gekitotsu' && t >= 32) return play(B, x, s + 32, 1, -12)
  if (name === 'kessen') return t < 32 ? play(A, x, s, 1, -12) : play(B, x, s + 32, 1, -12)
  return null
}
const shamiAt = x => { // shamisen: theme B in tremolo (first time), the fear line, the last battle
  const { name, t } = part(x), s = x - t
  let m = null
  if (name === 'gekitotsu' && t < 32) m = play(B, x, s, 1, -12)
  else if (name === 'kessen' && t >= 32) m = play(B, x, s + 32, 1, -12)
  else if (name === 'kyōfu') { const f = fearAt(x, s); return f && { n: f.n - 12, at: f.at, d: 0.5, v: 0.6 } }
  if (!m) return null
  return m.d >= 1 ? { n: m.n, at: m.at + floor(4 * m.τ) / 4, d: 0.25, v: m.τ < 0.25 ? 0.9 : 0.5 } : { n: m.n, at: m.at, d: m.d, v: 0.85 }
}
const kotoNotes = x => { // → [{ n, at, d, v }]; two koto: [0] and [1]
  const { name, t } = part(x), s = x - t, c = chordAt(x), out = [null, null]
  if (name === 'shingun' || name === 'gekitotsu' || name === 'kessen') {
    const j = floor(4 * x), k = tr(x), root = c.bass + 24
    const ost = KEY.includes(mod(c.pcs[0] - k + 8, 12)) ? [0, 7, 8, 7] : [0, 7, 12, 7] // the ♭6 only where the key has it
    if (name !== 'shingun' || t >= 16) out[0] = { n: root + ost[mod(j, 4)], at: j / 4, d: 0.25, v: mod(j, 4) ? 0.4 : 0.65 }
  } else if (name === 'kyōfu') {
    const a = fearAt(x, s), b = fearAt(x, s + 1.5)
    if (a) out[0] = { ...a, v: 0.75 }
    if (b) out[1] = { ...b, n: b.n - 12, v: 0.55 }
  } else if (name === 'requiem' || name === 'jinmaku') {
    const j = floor(x), v = c.v, cyc = [0, 1, 2, 3, 2, 1]
    out[0] = { n: v[cyc[j % 6] % v.length] + 12, at: j, d: 1, v: 0.45 }
  }
  return out
}
const biwaAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'mokuso') return play(BIWA, x, s)
  if (name === 'ikusa no ato') return t < 24 ? play(BIWA.slice(0, 12), x, s) : null
  return null
}

// ---- drums ---------------------------------------------------------------------------------------------------------
const HITS = {}
const add = (drum, at, vel = 1, data) => (HITS[drum] ??= []).push([at, vel * (0.86 + 0.14 * hash(floor(at * 8), drum.length)), data])
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END, bl = name === 'kyōfu' ? 7 : 4
  for (let b = start; b < end; b += bl) {
    const t = b - start, last = b + bl >= end, bar = floor(t / bl)
    if (name === 'mokuso') {
      if (t === 0 || t === 16) add('bell', b)
      if (t >= 24) for (let i = 0; i < 4; i++) add('don', b + i, 0.3 + 0.08 * (t - 24 + i))
    } else if (name === 'jinmaku' || name === 'requiem') {
      add('boom', b, 1) // half time: a boom a bar, the timpani in 3 + 3 + 2 quarters over two bars
      if (bar % 2 === 0) [0, 3].forEach(p => add('timp', b + p, 0.8, 0))
      else [2, 3.5].forEach(p => add('timp', b + p, 0.7, p === 2 ? 7 : 0))
      add('don', b + 2, 0.5)
      if (name === 'requiem' && t >= 32) for (let i = 0; i < 8; i++) add('timp', b + 2 + i / 4, 0.3 + 0.07 * i, 0)
      if (t === 0 && name === 'requiem') add('bell', b)
    } else if (name === 'shingun') {
      add('don', b), add('don', b + 2.5, 0.7)
      add('naga', b + 1, 0.8), add('naga', b + 3, 0.8)
      for (let i = 0; i < 16; i++) add('shime', b + i / 4, i % 4 === 0 ? 0.8 : i % 2 ? 0.3 : 0.5)
      add('timp', b, 0.8, 0), add('timp', b + 2, 0.6, 7)
      if (last) for (let i = 0; i < 8; i++) add('naga', b + i / 2, 0.5 + 0.06 * i)
      if (t >= 32) add('boom', b, 0.8)
    } else if (name === 'gekitotsu' || name === 'kessen') {
      for (let p = 0; p < 4; p++) add('kick', b + p)
      add('naga', b + 1), add('naga', b + 3)
      for (let i = 0; i < 4; i++) add('ka', b + i + 0.5, 0.7)
      for (let i = 0; i < 16; i++) add('shime', b + i / 4, i % 2 ? 0.25 : 0.45)
      if (bar % 4 === 0) add('don', b), add('crash', b)
      add('stab', b), add('stab', b + 1.5, 0.75), add('stab', b + 3, 0.7)
      if (bar % 8 === 7) for (let i = 0; i < 8; i++) add('naga', b + 2 + i / 4, 0.5 + 0.06 * i)
      add('timp', b, 0.6, 0)
    } else if (name === 'kyōfu') { // 2 + 2 + 3
      ;[0, 2, 4].forEach(p => add('don', b + p, p ? 0.7 : 1))
      ;[1, 3, 5, 6].forEach(p => add('naga', b + p, 0.55))
      for (let i = 0; i < 14; i++) add('shime', b + i / 2, [0, 4, 8].includes(i) ? 0.7 : 0.3)
      add('timp', b, 0.8, 0), add('timp', b + 4, 0.6, 0)
    } else if (name === 'ikusa no ato') {
      if (t === 0) add('boom', b), add('bell', b), add('don', b)
      if (t === 24) add('bell', b), add('timp', b, 0.6, 0), add('boom', b, 0.6)
    }
  }
}
for (const list of Object.values(HITS)) list.sort((a, c) => a[0] - c[0])
const lastOf = (drum, x) => {
  const a = HITS[drum]
  if (!a || x >= END + 8) return null
  let lo = 0, hi = a.length - 1, r = -1
  while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m][0] <= x) (r = m), (lo = m + 1); else hi = m - 1 }
  return r < 0 ? null : { τ: x - a[r][0], vel: a[r][1], data: a[r][2], at: a[r][0] }
}
const FIGHT = x => is(x, 'gekitotsu', 'kessen')
const pumpAt = x => { const k = lastOf('kick', x); return k && FIGHT(x) ? duck(k.τ * SEC, 0.55, 0.15) : 1 }
const y01 = (n, lo, hi, y0, y1) => y0 + ((n - lo) / (hi - lo)) * (y1 - y0)

// ---- tracks ------------------------------------------------------------------------------------------------------------
// Ch(x) — the male choir: theme A in unison at half time (the camp), the chords on "o" through the requiem and the end
const choirChords = x => is(x, 'mokuso', 'requiem', 'ikusa no ato', 'jinmaku')
const choirT = {
  color: '#a2d2ff',
  graph: x => { const m = chantAt(x); return m ? y01(m.n, 55, 80, 0.6, 2) : choirChords(x) ? chordAt(x).v.map(n => y01(n, 45, 80, -1.6, -0.4)) : null },
  midi: x => { const m = chantAt(x); return [...(m && m.u < 0.95 ? [m.n] : []), ...(choirChords(x) && !SEVEN(x) ? chordAt(x).v.map(n => n - 12) : [])] },
  formula: [
    String.raw`Ch = \Rev\Big[\sum_{j}\sum_{i=1}^{3}\tfrac{G_i}{Q_i}\BP_{0.82F_i}\big(\saw(f_j/2) + 0.06\eta\big)\Big],\quad F = \text{«о»}\to\text{«а»}`,
    String.raw`\text{лагерь: } A\big(\tfrac{x - 32}{2}\big) - 12\ \text{в унисон — тема вдвое медленнее}`,
  ],
  audio() {
    const pad = choir({ voices: 4, size: 0.82, gain: 0.32, rough: 0.15 }), lead = choir({ voices: 3, size: 0.8, gain: 0.42, rough: 0.2 }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => {
      const m = chantAt(x), c = chordAt(x), F = blend(VOWELS.o, VOWELS.a, 0.5 + 0.5 * sin((TAU * x) / 16))
      const [l1, r1] = pad(choirChords(x) && x < END - 1 ? c.v.map(n => mf(n - 12)) : [], F)
      const fm = m && m.u < 0.96 ? mf(m.n) : 0, [l2, r2] = lead(fm ? [fm, fm * 0.5, fm] : [], VOWELS.o)
      return verb(l1 + l2, r1 + r2)
    }
  },
}

// Bw(x) — the biwa: the tale at the start and the end, chords strummed with a heavy bachi
const biwaT = {
  color: '#d4a373',
  graph: x => { const m = biwaAt(x); return m ? y01(m.n, 40, 70, -0.2, 1.4) : null },
  midi: x => { const m = biwaAt(x); return m && m.u < 0.9 ? [m.n] : [] },
  formula: [String.raw`Bw = 0.6\LP_{3500}y + \BP_{300}y + 0.45\BP_{1100}y,\quad y[k] = e[k] + g\big(a\,y[k - D(1 - 0.02\max(0, y))] + \ldots\big)\ \text{— савари}`],
  audio() {
    const b = biwa({ sawari: 0.024 }), b2 = biwa({ seed: 31 }), fire = trigger(), verb = reverb({ room: 0.92, damp: 0.4, wet: 0.45 })
    return x => {
      const m = biwaAt(x), e = m && (is(x, 'mokuso') ? BIWA : BIWA.slice(0, 12)).find(q => q[0] === m.at - (x - part(x).t))
      if (m && fire(m.at + m.n / 1000)) {
        b.hit(mf(m.n), 0.9, { bend: m.d >= 2 && !e?.[3] ? 1 : 0, bendAt: 0.6, bendTime: 0.25, back: m.d >= 2 ? 0.6 + m.d * SEC * 0.5 : 0 })
        if (e?.[3]) b2.hit(mf(m.n + 7), 0.7, { at: floor(0.03 * 44100) })
      }
      return verb(...pan(2.4 * (b() + b2()), -0.15))
    }
  },
}

// Sh(x) — the shakuhachi: a call in the meditation, theme A in the advance, the requiem's top line
const shakuT = {
  color: '#c8e6a0',
  graph: x => { const m = shakuAt(x); return m ? y01(m.n, 58, 90, 1, 2.9) : null },
  midi: x => { const m = shakuAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [String.raw`Sh = a\Big(\tanh\big(1.2\textstyle\sum_k c_k\sin 2\pi k\!\!\int\! g\big) + 0.17\big(\BP_{g}\eta + \tfrac12\BP_{2g}\eta\big)\Big),\quad g = f\,2^{(-0.7(1 - s(t/0.14)) + 0.3s\,\sin 2\pi\,4.6T)/12}`],
  audio() {
    const sh = shakuhachi({ breath: 0.17 }), verb = reverb({ room: 0.93, wet: 0.46 }), echo = delay({ time: SEC * 2, feedback: 0.25, wet: 0.16 })
    let n = 72
    return x => {
      const m = shakuAt(x)
      if (m) n = m.n
      return verb(...echo(...pan(0.55 * sh(mf(n), !!m && m.u < 0.95, { accent: m && m.d >= 2 ? 0.6 : 0.15 }), 0.15)))
    }
  },
}

// Hn(x) — horns: theme B (and A in the last battle) an octave down; stabs of the section in the fights
const hornT = {
  color: '#f4a261',
  graph: x => { const m = leadAt(x), h = lastOf('stab', x); return m ? y01(m.n, 58, 80, 0.6, 2.4) : h && h.τ < 0.4 ? chordAt(x).v.map(n => y01(n, 50, 80, -0.8, 0.5)) : null },
  midi: x => { const m = leadAt(x), h = lastOf('stab', x); return [...(m && m.u < 0.9 ? [m.n] : []), ...(h && h.τ < 0.35 ? chordAt(x).v : [])] },
  formula: [String.raw`Hn = 0.7y + 0.5\BP_{450}y,\quad y = \LP\LP\,\tfrac12(\saw g + \saw 1.0023g)\,e(t);\quad \text{стабы: } \sum_j \text{Br}(f_j)\ \text{на } 0, 1\tfrac12, 3`],
  audio() {
    const h1 = horn({ bright: 0.9, seed: 3 }), h2 = horn({ bright: 0.9, seed: 4 }), b = brass({ voices: 4, bright: 1.1, gain: 0.32 }), verb = reverb({ room: 0.9, wet: 0.38 })
    let n = 60
    return x => {
      const m = leadAt(x), h = lastOf('stab', x), on = h && h.τ < 0.4
      if (m) n = m.n
      const g = m && m.u < 0.92, y = 0.6 * (h1(mf(n), g, 0.9) + h2(mf(n) * 1.003, g, 0.9))
      const [l, r] = b(on && FIGHT(x) ? chordAt(x).v.map(mf) : [], on ? h.vel : 0.5), k = pumpAt(x)
      return verb(k * (l + 0.7 * y), k * (r + 0.7 * y))
    }
  },
}

// Sm(x) — the shamisen: theme B in tremolo, the fear line an octave down
const shamiT = {
  color: '#ffd166',
  graph: x => { const m = shamiAt(x); return m && x - m.at < 0.2 ? y01(m.n, 50, 80, 0.6, 2.4) : null },
  midi: x => { const m = shamiAt(x); return m && x - m.at < m.d * 0.8 ? [m.n] : [] },
  formula: [String.raw`Sm = 0.45\HP y + 1.1\BP_{450}y + 0.75\BP_{1800}y + 0.35\BP_{3200}y + 0.5\BP_{1700}(\text{бати}),\quad \text{тремоло шестнадцатыми на долгих нотах}`],
  audio() {
    const s = shamisen({ sawari: 0.014 }), fire = trigger(), verb = reverb({ room: 0.8, wet: 0.24 })
    return x => {
      const m = shamiAt(x)
      if (m && fire(m.at + m.n / 1000)) s.hit(mf(m.n), m.v)
      return verb(...pan(1.8 * pumpAt(x) * s(), -0.3))
    }
  },
}

// Ko(x) — two koto: the ostinato (0, 7, 8, 7) or (0, 7, 12, 7), broken chords, the stretto K₂(x) = K₁(x − 3/2) − 12
const kotoT = {
  color: '#8ecae6',
  graph: x => { const ns = kotoNotes(x).filter(Boolean); return ns.length ? ns.map(e => y01(e.n, 50, 90, 0, 1.6)) : null },
  midi: x => kotoNotes(x).filter(e => e && x - e.at < e.d * 0.9).map(e => e.n),
  formula: [
    String.raw`\text{остинато: } r + (0, 7, 8, 7)_{\lfloor 4x\rfloor \bmod 4}\ \ (\text{если } r + 8 \in \text{ладу}),\ \text{иначе } r + (0, 7, 12, 7)`,
    String.raw`\text{страх (7/4): } K_2(x) = K_1\big(x - \tfrac32\big) - 12\quad\text{— стретта: C против D}\flat`,
  ],
  audio() {
    const k1 = koto({ sustain: 2.6 }), k2 = koto({ sustain: 2.6, seed: 77 }), fires = [trigger(), trigger()], verb = reverb({ room: 0.86, wet: 0.34 })
    return x => {
      const ns = kotoNotes(x)
      ns.forEach((e, i) => { if (e && fires[i](e.at + e.n / 1000)) (i ? k2 : k1).hit(mf(e.n), e.v) })
      const g = 2.2 * pumpAt(x), [a, b] = pan(k1(), 0.35), [c, d] = pan(k2(), -0.35)
      return verb(g * (a + c), g * (b + d))
    }
  },
}

// St(x) — strings: a bed everywhere but the meditation's start; a tremolo of sixteenths in the fights
const stringsT = {
  color: '#cdb4db',
  graph: x => (x < END - 1 && part(x).t >= 0 && !(is(x, 'mokuso') && part(x).t < 8) ? chordAt(x).v.map(n => y01(n, 45, 80, -1, 0.4)) : null),
  midi: x => (x < END - 1 && !(is(x, 'mokuso') && part(x).t < 8) && x - chordAt(x).at < chordAt(x).len - 0.1 ? chordAt(x).v : []),
  formula: [String.raw`S = \Rev\,\Cho\sum_{j=1}^{4}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big)\cdot\big(1 - 0.5\,\mathbb{1}_{\text{бой}}\,[(x \bmod \tfrac14) > \tfrac18]\big)`],
  audio() {
    const s = strings({ voices: 4, attack: 300, release: 900, cutoff: 3400, gain: 0.07 }), ch = chorus({ mix: 0.35 }), verb = reverb({ room: 0.9, wet: 0.4 }), trem = smooth(4)
    return x => {
      const on = x < END - 1 && !(is(x, 'mokuso') && part(x).t < 8), c = chordAt(x)
      const g = trem(FIGHT(x) && mod(x, 0.25) > 0.125 ? 0.45 : 1) * pumpAt(x), [l, r] = s(on ? c.v.map(mf) : [])
      return verb(...ch(g * l, g * r))
    }
  },
}

// Ti(x) — timpani: 3 + 3 + 2 at half time, the root and fifth, rolls into the cadences
const timpNote = h => { const n = chordAt(h.at).bass + h.data; return n > 50 ? n - 12 : n }
const timpT = {
  color: '#9c6644',
  graph: x => { const h = lastOf('timp', x); return h && h.τ < 1 ? -2.3 + (timpNote(h) - 38) / 16 + 0.5 * h.vel * exp(-3 * h.τ) : null },
  midi: x => { const h = lastOf('timp', x); return h && h.τ < 0.2 ? [timpNote(h)] : [] },
  formula: [String.raw`Ti = \sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\,t}\sin\big(2\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\big),\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)`],
  audio() {
    const p = poly(timpaniTone, { release: 0.8, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.34 })
    return x => {
      const h = lastOf('timp', x)
      if (h && fire(h.at)) p.hit(mf(timpNote(h)), h.vel)
      return verb(...pan(0.75 * p(), -0.1))
    }
  },
}

// Ta(x) — taiko: odaiko, nagado, shime, rims; 2 + 2 + 3 in kyōfu
const taikoT = {
  color: '#e63946',
  graph: x => {
    const d = lastOf('don', x), n = lastOf('naga', x), s = lastOf('shime', x)
    if (d && d.τ < 0.8) return 3.1 + 1.3 * d.vel * exp(-3 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.12 ? 2.3 + 0.5 * s.vel : null
  },
  midi: x => [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`T = \tanh\!\Big(1.4\LP\Big[\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\sin\big(R_k 2\pi f(t + \gamma\tau(1 - e^{-t/\tau}))\big) + \ldots\Big]\Big),\quad \text{страх: } 2 + 2 + 3`],
  audio() {
    const don = taikoDrum({ pitch: 56, decay: 1.6, crack: 0.25, boom: 0.45, seed: 1 }), naga = taikoDrum({ pitch: 118, decay: 0.55, crack: 0.4, seed: 2 })
    const shime = taikoDrum({ pitch: 420, decay: 0.12, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 2000 })
    const verb = reverb({ room: 0.88, damp: 0.45, wet: 0.3 })
    const hit = (d, f, x) => { const h = lastOf(d, x); return h ? h.vel * f(h.τ * SEC, true) : f(1, false) }
    return x => verb(...pan(0.55 * hit('don', don, x) + 0.3 * hit('naga', naga, x) + 0.16 * hit('shime', shime, x) + 0.09 * hit('ka', ka, x)))
  },
}

// K(x) — the kick: in the fights a hardstyle kick on C2 (D2 in the last battle); at half time the same kick with a long
// tail that hardly bends — a boom, a timpano made of a sine and two tanh stages
const kickT = {
  color: '#ff006e',
  graph: x => { const k = lastOf('kick', x) ?? lastOf('boom', x); return k && k.τ < 0.6 ? 2.5 + 1.9 * k.vel * exp(-5 * k.τ) : null },
  midi: x => (lastOf('kick', x)?.τ < 0.2 || lastOf('boom', x)?.τ < 0.3 ? [36] : []),
  formula: [
    String.raw`K = 0.8\tanh\!\Big(2.2\LP\big[\tanh(7(s + 0.3)) - \tanh 2.1\big]\Big) + 0.55\sin 2\pi\!\!\int\! f,\quad f = 65.41\cdot 2^{\text{tr}/12}\ (C2)`,
    String.raw`\text{бум: хвост } 0.6\ \text{с, спад } 2\ \text{полутона, драйв } 3.5\ \text{— «литавра»}`,
  ],
  audio() {
    const k = hardKick({ tail: 0.24, drop: 5, drive: 7, bias: 0.3, tone: 4600, sub: 0.55 }), boom = hardKick({ tail: 0.6, drop: 2, drive: 3.5, bias: 0.15, tone: 1800, sub: 0.9 })
    return x => {
      const h = lastOf('kick', x), b = lastOf('boom', x), f = mf(36 + tr(x))
      return 0.3 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, f, !!h && FIGHT(x)) + 0.4 * (b ? b.vel : 0) * boom(b ? b.τ * SEC : 1, f, !!b)
    }
  },
}

// R(x) — the reverse bass in the last battle, rolling
const rbassAt = x => {
  if (!is(x, 'kessen')) return null
  const p = mod(x, 1)
  return p < 0.5 ? null : { u: mod(p - 0.5, 0.25) / 0.25, n: 33 + mod(chordAt(x).pcs[0] - 9, 12) }
}
const rbassT = {
  color: '#6a040f',
  graph: x => { const b = rbassAt(x); return b ? -2.9 + 0.8 * b.u * b.u : null },
  midi: x => (rbassAt(x)?.u > 0.3 ? [rbassAt(x).n] : []),
  formula: [String.raw`R = \HP_{25}\LP_{150\cdot 2^{4u}}\tanh\!\Big(5u^2\big(0.4\saw f + 0.4\saw 1.006f + 0.8\sin 2\pi\!\!\int\! f\big)\Big),\quad u = \tfrac{(x - 1/2) \bmod 1/4}{1/4}`],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4, q: 1.3 }), lp = filter('lp')
    return x => { const b = rbassAt(x); return 0.5 * lp(rb(b ? b.u : null, mf(b ? b.n : 38)), 2400) }
  },
}

// Fx(x) — the temple bell, the wind over the camp, a crash in the fights
const fxT = {
  color: '#6c757d',
  graph: x => (lastOf('bell', x)?.τ < 4 ? -2.9 + 0.1 * sin(3 * x) : null),
  formula: [String.raw`\text{бонсё: } \tfrac12, 1, 1.2, 1.5, 2, 2.52, 3.01\ f\ \text{парами} \pm 0.075\%,\ e^{-t/T_k},\ T = (9, 6, 4, 3, 2.5, 1.5, 1)\ \text{с}`],
  audio() {
    const η = noise(5), bell = poly((f, t, v) => templeBellTone(f, t, v), { life: 14, release: 3 }), fire = trigger(), wind = filter('bp'), hp = filter('hp')
    const verb = reverb({ room: 0.94, wet: 0.5 })
    return x => {
      const b = lastOf('bell', x), c = lastOf('crash', x), n = η(), T = x * SEC
      if (b && fire(b.at)) bell.hit(mf(36 + tr(b.at)), 0.9)
      let y = (is(x, 'mokuso', 'jinmaku', 'ikusa no ato') ? 0.07 : 0) * wind(n, 380 * 2 ** (1.5 * sin((TAU * T) / 11)), 3)
      y += c ? 0.25 * c.vel * exp(-2 * c.τ * SEC) * hp(n, 4500) : hp(0, 4500)
      const bl = 0.55 * bell()
      return verb(y + bl, y + bl)
    }
  },
}

export default {
  name: 'shogun-requiem',
  bpm: BPM,
  key: 'Cm',
  style: 'jbattle',
  theme: 'ink',
  length: END,
  sections: SECTIONS,
  tracks: {
    choir: choirT, biwa: biwaT, shakuhachi: shakuT, horns: hornT, shamisen: shamiT, koto: kotoT, strings: stringsT,
    timpani: timpT, taiko: taikoT, kick: kickT, rbass: rbassT, fx: fxT,
  },
}
