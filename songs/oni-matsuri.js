// Oni Matsuri (鬼祭り, "the demons' festival") — a festival that turns into a fight: the matsuri-bayashi band (shinobue,
// shime-daiko, the atarigane's "chiki-chan", hyoshigi) meets a taiko ensemble, brass and timpani, and in the end a
// hardstyle kick. D in the yo scale (D E G A B — no third, so the chords are open: Dsus2, Asus4, G, Em7); the oni
// bring B minor with its A♯; 136 BPM; "matsuri" and "oni battle" a whole step up (E, C♯ minor).
//
// yobikomi (the clappers call) → bayashi (theme A) → oni (theme B) → euclid (the taiko in Euclidean rhythms) →
// kagura (the sacred dance: kotsuzumi and shouts) → build → MATSURI (theme A + kick) → ONI BATTLE → hanabi (fireworks).
//
// The math: the taiko of "euclid" are Euclidean rhythms — k hits spread as evenly as possible over n steps,
// hit(i) ⇔ (i·k + r) mod n < k: odaiko E(5,16), nagado E(7,16), shime E(11,16), and the kotsuzumi E(5,12) on a grid of
// twelve — three against four; the koto plays a note every ¾ beat (4 : 3); the shinobue improvises over B minor
// pentatonic (improvise); the chords are voice-led by a search; the hyoshigi call speeds up, a gap of 1.5·2^{−k/4} beats.
import { mod, floor, exp, sin, TAU, clamp, filter, reverb, delay, smooth, noise } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, improvise, voiceChords, koto, shinobue, taikoDrum, kotsuzumi, woodClack, kaneDrum, kakegoe,
  timpaniTone, poly, trigger, strings, brass, horn, hardKick, reverseBass, duck, chorus,
} from '../src/instruments.js'

const BPM = 136, SEC = 60 / BPM
const SECTIONS = [
  [0, 'yobikomi'], [16, 'bayashi'], [48, 'oni'], [80, 'euclid'], [128, 'kagura'], [160, 'build'],
  [176, 'matsuri'], [224, 'oni battle'], [256, 'hanabi'],
]
const END = 280
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
const tr = x => (is(x, 'matsuri', 'oni battle', 'hanabi') ? 2 : 0)

// ---- harmony -------------------------------------------------------------------------------------------------
const CH = {
  Dsus2: [2, 4, 9], G: [7, 11, 2], Em7: [4, 7, 11, 2], Asus4: [9, 2, 4], D: [2, 6, 9], Bm: [11, 2, 6], A: [9, 1, 4],
  'F#7': [6, 10, 1, 4], B7sus4: [11, 4, 6, 9], B7: [11, 3, 6, 9],
}
const A_CH = ['Dsus2', 'G', 'Em7', 'Asus4', 'Dsus2', 'G', 'Em7', 'D']
const B_CH = ['Bm', 'G', 'A', 'F#7']
const PROG = {
  yobikomi: ['Dsus2'], bayashi: A_CH, oni: B_CH, euclid: ['Bm', 'Bm', 'G', 'A'], kagura: ['Dsus2', 'Dsus2', 'G', 'G', 'Em7', 'Em7', 'Asus4', 'Asus4'],
  build: ['G', 'A', 'B7sus4', 'B7'], matsuri: [...A_CH, 'Dsus2', 'G', 'Em7', 'D'], 'oni battle': B_CH, hanabi: ['Dsus2', 'G', 'Asus4', 'D', 'D', 'D'],
}
const BARS = []
for (let b = 0; b < END / 4; b++) {
  const { name, t } = part(4 * b), sym = PROG[name][floor(t / 4) % PROG[name].length], k = tr(4 * b)
  BARS.push({ sym, tr: k, pcs: CH[sym].map(p => mod(p + k, 12)) })
}
voiceChords(BARS.map(c => c.pcs), { lo: 55, hi: 76 }).forEach((v, i) => (BARS[i].v = v))
for (const c of BARS) c.bass = 36 + mod(c.pcs[0] - 36, 12)
const chordAt = x => BARS[clamp(floor(x / 4), 0, BARS.length - 1)]
const BM_PENTA = [11, 2, 4, 6, 9] // B minor pentatonic

// ---- melodies [beat, MIDI, length] ----------------------------------------------------------------------------
const A = [ // theme A in D yo (D E G A B), over Dsus2 – G – Em7 – Asus4
  [0, 81, 0.5], [0.5, 83, 0.5], [1, 86, 1], [2, 88, 0.5], [2.5, 86, 0.5], [3, 83, 0.5], [3.5, 81, 0.5],
  [4, 79, 0.75], [4.75, 81, 0.25], [5, 83, 1], [6, 86, 0.75], [6.75, 88, 0.25], [7, 86, 0.5], [7.5, 83, 0.5],
  [8, 88, 1], [9, 86, 0.5], [9.5, 83, 0.5], [10, 83, 1], [11, 81, 0.5], [11.5, 79, 0.5],
  [12, 88, 0.5], [12.5, 86, 0.5], [13, 83, 0.5], [13.5, 81, 0.5], [14, 81, 2],
]
const A_END = [...A.slice(0, -5), [12, 88, 0.5], [12.5, 86, 0.5], [13, 83, 0.5], [13.5, 88, 0.5], [14, 86, 2]] // ends on D
const B = [ // theme B, the oni, in B minor: Bm – G – A – F♯7
  [0, 71, 0.5], [0.5, 71, 0.25], [0.75, 73, 0.25], [1, 74, 0.5], [1.5, 78, 0.5], [2, 83, 1], [3, 81, 0.5], [3.5, 78, 0.5],
  [4, 79, 1], [5, 78, 0.5], [5.5, 76, 0.5], [6, 74, 1], [7, 71, 0.5], [7.5, 74, 0.5],
  [8, 76, 0.5], [8.5, 76, 0.25], [8.75, 78, 0.25], [9, 81, 0.5], [9.5, 85, 0.5], [10, 88, 1], [11, 86, 0.5], [11.5, 85, 0.5],
  [12, 85, 1], [13, 82, 0.5], [13.5, 78, 0.5], [14, 76, 1], [15, 82, 0.5], [15.5, 85, 0.5],
]
const CALL = [[2, 86, 1.5], [3.5, 88, 0.5], [4, 91, 1], [5, 88, 0.5], [5.5, 86, 0.5], [6, 83, 2], [10, 81, 0.5], [10.5, 83, 0.5], [11, 86, 1], [12, 81, 3]]
const SOLO = improvise({ start: 96, length: 30, rate: 2, seed: 41, lo: 74, hi: 93, phrase: 8, rest: 0.22, hold: 0.25, scale: () => BM_PENTA, chord: x => chordAt(x).pcs })

const play = (list, x, at, k = 1) => { const m = notesAt(list, (x - at) / k); return m && { n: m.n + tr(x), d: m.d * k, τ: m.τ * k, u: m.u, at: at + m.at * k } }
const fluteAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'yobikomi') return play(CALL, x, s)
  if (name === 'bayashi') return play(t < 16 ? A : A_END, x, s + (t < 16 ? 0 : 16))
  if (name === 'oni' || name === 'oni battle') return play(B, x, s + 16 * floor(t / 16))
  if (name === 'euclid') return t >= 16 ? notesAt(SOLO, x) : null
  if (name === 'kagura') return play(A, x, s, 2)
  if (name === 'matsuri') return play(t < 32 ? A : A_END, x, s + 16 * floor(t / 16))
  if (name === 'hanabi') return t < 16 ? play(A_END.filter(e => e[0] >= 8).map(([b, n, d]) => [b - 8, n, d]), x, s, 2) : null
  return null
}
// the horns: theme B in unison, an octave under the shinobue
const hornAt = x => { if (!is(x, 'oni', 'oni battle')) return null; const m = play(B, x, x - mod(part(x).t, 16)); return m && { ...m, n: m.n - 12 } }

// the koto: a note every ¾ beat, cycling the voicing an octave up (4 against 3); a tremolo through kagura
const kotoAt = x => {
  const { name } = part(x), c = chordAt(x)
  if (name === 'yobikomi' || name === 'build' || x >= END - 8) return null
  if (name === 'kagura') { const j = floor(4 * x); return { n: c.v[3] + 12, at: j / 4, d: 0.25, v: 0.25 + 0.15 * (j % 2) } }
  const j = floor(x / 0.75), cyc = [0, 1, 2, 3, 2, 1]
  return { n: c.v[cyc[j % 6]] + 12, at: j * 0.75, d: 0.7, v: name === 'euclid' ? 0.6 : 0.45 }
}

// ---- drums -----------------------------------------------------------------------------------------------------
const euclid = (k, n, r = 0) => Array.from({ length: n }, (_, i) => mod(i * k + r, n) < k)
const E5_16 = euclid(5, 16), E7_16 = euclid(7, 16, 3), E11_16 = euclid(11, 16, 1), E5_12 = euclid(5, 12, 2)
const HITS = {}
const add = (drum, at, vel = 1, data) => (HITS[drum] ??= []).push([at, vel * (0.86 + 0.14 * hash(floor(at * 12), drum.length)), data])
const steps = (drum, b, pat, vel = 1) => { for (let i = 0; i < 16; i++) if (pat[i] === 'x' || pat[i] === 'o') add(drum, b + i / 4, (pat[i] === 'x' ? 1 : 0.45) * vel) }
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let b = start; b < end; b += 4) {
    const t = b - start, last = b + 4 === end, bar = floor(t / 4)
    if (name === 'yobikomi') {
      if (t === 0) for (let k = 0, at = 0; k < 20; k++, at += 1.5 * 2 ** (-k / 4)) add('clack', b + at, 0.6 + 0.02 * k) // ki… ki… kikiki
      if (t === 12) add('don', b + 2), add('kane', b + 2), add('shout', b + 1, 1, 'sa'), steps('shime', b, '--------x-x-xxxx', 0.8)
    } else if (name === 'bayashi' || name === 'matsuri') {
      steps('shime', b, 'x-oxx-oxx-oxx-ox', 0.75) // ji-uchi: "ten tsuku ten tsuku"
      steps('kane', b, 'x-x-x-xxx-x-x-xx', 0.6) // chiki-chan
      steps('don', b, name === 'matsuri' ? 'x-------x-------' : 'x---------x-----', 1)
      steps('naga', b, last || bar % 4 === 3 ? '----x---x-x-xxxx' : '----x-------x---', 0.8)
      add('timp', b, 0.8, 0), add('timp', b + 1.5, 0.5, 0), add('timp', b + 2, 0.7, 7), add('timp', b + 3, 0.5, 0), add('timp', b + 3.5, 0.6, 0)
      if (name === 'matsuri') { for (let p = 0; p < 4; p++) add('kick', b + p); add('stab', b, 0.9), add('stab', b + 2.5, 0.7) }
      if (t === 0) add('clack', b, 1)
    } else if (name === 'oni' || name === 'oni battle') {
      steps('don', b, 'x--x--x-x--x--x-', 0.9) // 3 + 3 + 2, twice
      steps('naga', b, last ? '----x---x-xxxxxx' : '----x-------x---', 0.9)
      steps('shime', b, 'xoxoxoxoxoxoxoxo', 0.55)
      steps('ka', b, '--x---x---x---x-', 0.6)
      add('timp', b, 0.9, 0), add('timp', b + 0.75, 0.6, 0), add('timp', b + 1.5, 0.7, 0), add('timp', b + 2, 0.8, 7), add('timp', b + 2.75, 0.6, 7), add('timp', b + 3.5, 0.7, 0)
      if (name === 'oni battle') for (let p = 0; p < 4; p++) add('kick', b + p)
      if (bar % 4 === 0) add('kane', b, 1)
    } else if (name === 'euclid') {
      for (let i = 0; i < 16; i++) {
        if (E5_16[i]) add('don', b + i / 4, 1)
        if (E7_16[i] && t >= 4) add('naga', b + i / 4, 0.8)
        if (E11_16[i] && t >= 8) add('shime', b + i / 4, 0.6)
      }
      if (t >= 12) for (let i = 0; i < 12; i++) if (E5_12[i]) add('pon', b + i / 3, 0.8) // three against four
      if (t >= 16) for (let i = 0; i < 8; i++) if (euclid(3, 8)[i]) add('stab', b + i / 2, 0.6)
      add('timp', b, 0.7, 0)
      if (last) steps('naga', b, '--------x-x-xxxx', 1)
    } else if (name === 'kagura') {
      add('shout', b, 1, bar % 2 ? 'ha' : 'yo'), add('pon', b + 1, 0.9), add('pon', b + 2.5, 0.6), add('ta', b + 3, 0.8)
      if (bar % 2) add('pon', b + 3.5, 0.5)
      add('kane', b, 0.35)
    } else if (name === 'build') {
      const step = t < 4 ? 1 : t < 8 ? 0.5 : t < 12 ? 0.25 : 0.125
      for (let p = 0; p < 4; p += step) add('naga', b + p, 0.4 + (0.6 * (t + p)) / 16)
      add('don', b, 0.8), add('timp', b, 0.7 + t / 40, 0)
      if (t >= 8) for (let p = 0; p < 4; p += 0.25) add('timp', b + p, 0.3 + (0.5 * (t - 8 + p)) / 8, 0)
      if (t === 12) add('shout', b + 3.5, 1, 'yo')
    } else if (name === 'hanabi') {
      if (t === 0) add('don', b), add('kane', b), add('timp', b, 1, 0)
      if (t < 16) steps('shime', b, 'x---x---x---x---', 0.5)
      if (t === 16) [0, 1, 2, 2.5, 3].forEach(p => (add('don', b + p, 1), add('naga', b + p, 1), add('stab', b + p, 1), add('timp', b + p, 1, 0)))
      if (t === 20) add('don', b), add('stab', b), add('timp', b, 1, 0), add('kick', b), add('kane', b), [1, 2, 3].forEach(p => add('clack', b + p, 1))
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
const KICKED = x => is(x, 'matsuri', 'oni battle')
const pumpAt = x => { const k = lastOf('kick', x); return k && KICKED(x) ? duck(k.τ * SEC, 0.55, 0.17) : 1 }
const y01 = (n, lo, hi, y0, y1) => y0 + ((n - lo) / (hi - lo)) * (y1 - y0)

// ---- tracks ----------------------------------------------------------------------------------------------------------
// Sb(x) — the shinobue: the call, theme A, theme B over the horns, the improvised solo, the theme at half speed in kagura
const fluteT = {
  color: '#ff5a5f',
  graph: x => { const m = fluteAt(x); return m ? y01(m.n, 72, 96, 1.2, 3) : null },
  midi: x => { const m = fluteAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [
    String.raw`Sb = a\Big(0.55\sin 2\pi\!\!\int\! g + 0.28\sin 4\pi\!\!\int\! g + 0.15\sin 6\pi\!\!\int\! g + 0.05\sin 8\pi\!\!\int\! g + 0.05\BP_{2g}\eta\Big),\quad \text{лад ё: } D\,E\,G\,A\,B`,
    String.raw`\text{эвклид-соло: случайное блуждание по } B\,D\,E\,F\sharp\,A,\ \text{на долях — звуки аккорда (improvise)}`,
  ],
  audio() {
    const fl = shinobue({ breath: 0.06 }), echo = delay({ time: SEC * 0.75, feedback: 0.28, wet: 0.2 }), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    let n = 86
    return x => {
      const m = fluteAt(x)
      if (m) n = m.n
      return verb(...echo(...pan(0.55 * pumpAt(x) * fl(mf(n), !!m && m.u < 0.93), 0.1)))
    }
  },
}

// Hn(x) — horns: theme B in unison (the oni's voice); brass stabs on the accents
const hornT = {
  color: '#f4a261',
  graph: x => {
    const m = hornAt(x), h = lastOf('stab', x)
    if (m) return y01(m.n, 56, 80, 0.4, 2.2)
    return h && h.τ < 0.4 ? chordAt(x).v.map(n => y01(n, 50, 80, -0.8, 0.5)) : null
  },
  midi: x => { const m = hornAt(x), h = lastOf('stab', x); return m ? (m.u < 0.9 ? [m.n] : []) : h && h.τ < 0.35 ? chordAt(x).v : [] },
  formula: [String.raw`Hn = 0.7y + 0.5\BP_{450}y,\quad y = \LP_{1.6f_c}\LP_{f_c}\tfrac12\big(\saw g + \saw 1.0023g\big)e(t),\quad f_c = 250 + 2300\,e^{1.6}`],
  audio() {
    const h1 = horn({ bright: 0.8, seed: 1 }), h2 = horn({ bright: 0.8, seed: 2 }), b = brass({ voices: 4, bright: 1.2, gain: 0.4 })
    const verb = reverb({ room: 0.88, wet: 0.38 })
    let n = 71
    return x => {
      const m = hornAt(x), h = lastOf('stab', x), on = h && h.τ < 0.42 && !m
      if (m) n = m.n
      const f = mf(n), y = 0.5 * (h1(f, !!m && m.u < 0.92, 0.85) + h2(f * 1.003, !!m && m.u < 0.92, 0.85))
      const [l, r] = b(on ? chordAt(x).v.map(mf) : [], on ? h.vel : 0.5), g = pumpAt(x)
      return verb(g * (l + 0.8 * y), g * (r + 0.6 * y))
    }
  },
}

// Ko(x) — the koto: four notes against three beats, the tremolo in kagura
const kotoT = {
  color: '#8ecae6',
  graph: x => { const m = kotoAt(x); return m && x - m.at < 0.5 ? y01(m.n, 60, 92, 0, 1.6) : null },
  midi: x => { const m = kotoAt(x); return m && x - m.at < m.d * 0.9 ? [m.n] : [] },
  formula: [String.raw`\text{нота каждые } \tfrac34 \text{ доли: } n_j = v_{(0,1,2,3,2,1)_{j \bmod 6}} + 12,\ j = \lfloor x / 0.75\rfloor\quad(4:3)`],
  audio() {
    const k = koto({ sustain: 2.6 }), fire = trigger(), verb = reverb({ room: 0.86, wet: 0.34 })
    return x => {
      const m = kotoAt(x)
      if (m && fire(m.at)) k.hit(mf(m.n), m.v)
      return verb(...pan(3.5 * pumpAt(x) * k(), 0.35))
    }
  },
}

// Ta(x) — the taiko: odaiko, nagado, shime-daiko, rims; Euclidean in "euclid"
const taikoT = {
  color: '#e63946',
  graph: x => {
    const d = lastOf('don', x), n = lastOf('naga', x), s = lastOf('shime', x)
    if (d && d.τ < 0.6) return 3.1 + 1.3 * d.vel * exp(-4 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.12 ? 2.3 + 0.5 * s.vel : null
  },
  midi: x => [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [
    String.raw`\text{эвклидов ритм } E(k, n):\ \text{удар на шаге } i \iff (ik + r) \bmod n < k;\quad \text{одайко } E(5,16),\ \text{нагадо } E(7,16),\ \text{симэ } E(11,16)`,
    String.raw`T = \tanh\!\Big(1.4\LP\Big[\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\sin\big(R_k 2\pi f(t + \gamma\tau(1 - e^{-t/\tau}))\big) + \ldots\Big]\Big)`,
  ],
  audio() {
    const don = taikoDrum({ pitch: 66, decay: 1.3, crack: 0.25, boom: 0.4, seed: 1 }), naga = taikoDrum({ pitch: 125, decay: 0.55, crack: 0.4, seed: 2 })
    const shime = taikoDrum({ pitch: 440, decay: 0.12, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 1900 })
    const verb = reverb({ room: 0.84, damp: 0.45, wet: 0.28 })
    const hit = (d, f, x) => { const h = lastOf(d, x); return h ? h.vel * f(h.τ * SEC, true) : f(1, false) }
    return x => verb(...pan(0.5 * hit('don', don, x) + 0.28 * hit('naga', naga, x) + 0.17 * hit('shime', shime, x) + 0.09 * hit('ka', ka, x)))
  },
}

// Ka(x) — atarigane and hyoshigi: "chiki-chan" (the off-beats muted), the clappers that call the festival
const kaneT = {
  color: '#ffd166',
  graph: x => { const k = lastOf('kane', x), c = lastOf('clack', x); return (k && k.τ < 0.15) || (c && c.τ < 0.1) ? 4.2 + 0.3 * (k?.vel ?? 0) : null },
  midi: x => [['kane', 80], ['clack', 75]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`\text{канэ: } 0.4\sum_{k}A_k e^{-t(1 + k)/d}\sin 2\pi R_k\,1250t,\ R = (1, 2.32, 3.86, 5.81);\quad \text{хёсиги: } t_k = \sum_{j<k} 1.5\cdot 2^{-j/4}\ \text{долей}`],
  audio() {
    const kane = kaneDrum({ f: 1250, decay: 0.5 }), clack = woodClack({ f: 2400, seed: 5 }), verb = reverb({ room: 0.86, wet: 0.35 })
    return x => {
      const k = lastOf('kane', x), c = lastOf('clack', x)
      const y = (k ? 0.85 * k.vel * kane(k.τ * SEC, true, mod(k.at * 4, 2) === 1) : 0) + (c ? 1.1 * c.vel * clack(c.τ * SEC, true) : clack(1, false))
      return verb(...pan(y, 0.4))
    }
  },
}

// Ts(x) — kotsuzumi and kakegoe: "yo-o!" … pon … "ha!" … pon-ta, three against four in euclid
const tsuzumiT = {
  color: '#ffffff',
  graph: x => { const p = lastOf('pon', x), t = lastOf('ta', x), s = lastOf('shout', x); return (p && p.τ < 0.2) || (t && t.τ < 0.2) ? 3.6 : s && s.τ < 0.8 ? 4.4 : null },
  midi: x => [['pon', 60], ['ta', 62]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`\text{коцудзуми: } f = 280\cdot 2^{-4(1 - e^{-t/0.08})/12}\ \text{(сжатие шнуров)},\quad \text{«йо-о!»: } F: \text{«и»}\to\text{«о»},\ f = 165\cdot 2^{(7\sin\pi t/0.6 - 6s)/12}`],
  audio() {
    const pon = kotsuzumi({ pitch: 290, bend: -4 }), ta = kotsuzumi({ pitch: 560, bend: 1, seed: 33 }), k = kakegoe({ pitch: 170 }), verb = reverb({ room: 0.9, wet: 0.42 })
    return x => {
      const p = lastOf('pon', x), t = lastOf('ta', x), s = lastOf('shout', x)
      const y = (p ? 0.5 * p.vel * pon(p.τ * SEC, true) : pon(1, false)) + (t ? 0.35 * t.vel * ta(t.τ * SEC, true) : ta(1, false))
      const st = s ? s.τ * SEC : 9, v = 0.8 * k(s ? s.data : 'ha', st, st < 1)
      return verb(...pan(y + v, -0.25))
    }
  },
}

// Ti(x) — timpani as the bass: root and fifth in the festival rhythm, 3-3-2 for the oni, rolls into the build
const timpNote = h => { const n = chordAt(h.at).bass + h.data; return n > 50 ? n - 12 : n }
const timpT = {
  color: '#9c6644',
  graph: x => { const h = lastOf('timp', x); return h && h.τ < 0.8 ? -2.2 + (timpNote(h) - 40) / 16 + 0.5 * h.vel * exp(-4 * h.τ) : null },
  midi: x => { const h = lastOf('timp', x); return h && h.τ < 0.2 ? [timpNote(h)] : [] },
  formula: [String.raw`Ti = \sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\,t}\sin\big(2\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\big) + 0.35v\,e^{-t/6\text{мс}}\sin 2\pi\,0.7ft,\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)`],
  audio() {
    const p = poly(timpaniTone, { release: 0.6, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.88, damp: 0.4, wet: 0.3 })
    return x => {
      const h = lastOf('timp', x)
      if (h && fire(h.at)) p.hit(mf(timpNote(h)), h.vel)
      return verb(...pan(0.7 * pumpAt(x) * p(), -0.1))
    }
  },
}

// St(x) — strings under everything but the call and the drums' own bars
const padOn = x => !is(x, 'yobikomi') && x < END - 2
const stringsT = {
  color: '#cdb4db',
  graph: x => (padOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1, 0.4)) : null),
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v : []),
  formula: [String.raw`S = \Rev\,\Cho\sum_{j=1}^{4}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big),\quad \text{аккорды без терции: } D\,E\,A,\ A\,D\,E`],
  audio() {
    const s = strings({ voices: 4, attack: 400, release: 1000, cutoff: 3000, gain: 0.06 }), ch = chorus({ mix: 0.35 }), verb = reverb({ room: 0.9, wet: 0.4 }), level = smooth(500)
    return x => {
      const g = level(is(x, 'kagura', 'oni', 'oni battle', 'hanabi', 'build') ? 1 : 0.6) * pumpAt(x), [l, r] = s(padOn(x) ? chordAt(x).v.map(mf) : [])
      return verb(...ch(g * l, g * r))
    }
  },
}

// K(x) — the hardstyle kick in the last fight: its tail on E1, on C♯2 for the oni
const kickNote = x => (is(x, 'oni battle') ? 37 : 28)
const kickT = {
  color: '#ff006e',
  graph: x => { const k = lastOf('kick', x); return k && k.τ < 0.5 ? 2.6 + 1.8 * k.vel * exp(-6 * k.τ) : null },
  midi: x => (lastOf('kick', x)?.τ < 0.2 ? [36] : []),
  formula: [String.raw`K = 0.8\tanh\!\Big(2.2\LP\big[\tanh(7(s + 0.3)) - \tanh 2.1\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP\eta + 0.55\sin 2\pi\!\!\int\! f,\quad f = 41.2\ (E1)\ \text{или } 69.3\ (C\sharp 2)`],
  audio() {
    const k = hardKick({ tail: 0.26, drop: 5, drive: 7, bias: 0.3, tone: 4800, sub: 0.55 })
    return x => { const h = lastOf('kick', x); return 0.5 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, mf(kickNote(h ? h.at : x)), !!h) }
  },
}

// R(x) — the reverse bass: a swell a beat in matsuri, rolling in the oni battle
const rbassAt = x => {
  if (!KICKED(x)) return null
  const p = mod(x, 1)
  if (p < 0.5) return null
  return { u: is(x, 'oni battle') ? mod(p - 0.5, 0.25) / 0.25 : (p - 0.5) / 0.5, n: 33 + mod(chordAt(x).pcs[0] - 9, 12) }
}
const rbassT = {
  color: '#6a040f',
  graph: x => { const b = rbassAt(x); return b ? -2.9 + 0.8 * b.u * b.u : null },
  midi: x => (rbassAt(x)?.u > 0.3 ? [rbassAt(x).n] : []),
  formula: [String.raw`R = \HP_{25}\LP_{150\cdot 2^{4u}}\tanh\!\Big(5u^2\big(0.4\saw f + 0.4\saw 1.006f + 0.8\sin 2\pi\!\!\int\! f\big)\Big)`],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4, q: 1.3 }), lp = filter('lp')
    return x => { const b = rbassAt(x); return 0.4 * lp(rb(b ? b.u : null, mf(b ? b.n : 40)), 2400) }
  },
}

// Fx(x) — the riser of the build and the fireworks of hanabi: whistles climbing, then a crackling bloom
const ROCKETS = [256, 258.5, 261, 263, 264.5, 266, 268, 270]
const fxT = {
  color: '#6c757d',
  graph: x => (is(x, 'build') ? -2 + (part(x).t / 16) ** 2 * 3 : ROCKETS.some(r => x >= r && x < r + 1.5) ? -2.9 + (x % 1.5) : null),
  formula: [String.raw`\text{ракета: } \sin 2\pi\!\!\int\!(1200 + 2600\,t/0.6)\,e^{-t/0.6};\quad \text{букет: } e^{-t/0.6}\,\HP_{2000}\eta\cdot[\eta > 0.7]`],
  audio() {
    const η = noise(11), bp = filter('bp'), hp = filter('hp'), verb = reverb({ room: 0.92, wet: 0.5 })
    let ph = 0
    return x => {
      const n = η(), u = is(x, 'build') ? part(x).t / 16 : 0
      let y = 0.25 * u * u * bp(n, 300 * 2 ** (5 * u), 1.5), r = null
      for (const s of ROCKETS) if (s <= x) r = s
      const t = r !== null ? (x - r) * SEC : 9
      ph += (1200 + (2600 * Math.min(t, 0.6)) / 0.6) / 44100
      if (t < 0.6) y += 0.05 * (t / 0.6) * sin(TAU * ph)
      else if (t < 2.5) y += 0.3 * exp(-(t - 0.6) / 0.6) * hp(Math.abs(n) > 0.7 ? n : 0, 2000)
      else hp(0, 2000)
      return verb(...pan(y, r !== null ? 0.6 * Math.sin(r) : 0))
    }
  },
}

export default {
  name: 'oni-matsuri',
  bpm: BPM,
  key: 'D',
  style: 'jbattle',
  theme: 'ink',
  length: END,
  sections: SECTIONS,
  tracks: { shinobue: fluteT, horns: hornT, koto: kotoT, taiko: taikoT, kane: kaneT, tsuzumi: tsuzumiT, timpani: timpT, strings: stringsT, kick: kickT, rbass: rbassT, fx: fxT },
}
