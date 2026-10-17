// A melody you played → its key and its harmony, for the generator (opts.userTheme) and the piano roll's
// «✨ песня из мелодии».
//   the key   Krumhansl–Kessler profiles over the notes' durations (a note on a downbeat counts more);
//   the chords one per harmonic step (half a bar if the melody runs, a bar if it sings), found by Viterbi over the key's
//             chords: the notes on the strong parts are chord tones (passing notes between them cost little), the roots
//             move as harmony likes to — down a fifth best (ii → V → I), up a step, down a third; a secondary dominant
//             goes to its chord; the first chord is the tonic and the last two make a cadence (V – I);
//   the theme the melody moved to start at beat 0, its length rounded up to whole bars, as the generator's MELODIES are.
import { parseKey, roman, pc, keyName } from './theory.js'

const CANDS = {
  major: [['I', 0], ['ii', 0.1], ['iii', 0.5], ['IV', 0], ['V', 0], ['vi', 0.1], ['viiø7', 1.2], ['V7', 0.25], ['ii7', 0.3], ['IVmaj7', 0.5], ['Imaj7', 0.5], ['vi7', 0.5], ['V7/V', 1.8], ['V7/vi', 2.2], ['V7/ii', 2.4], ['iv', 1.8], ['bVII', 2]],
  minor: [['i', 0], ['iv', 0], ['V', 0], ['V7', 0.2], ['VI', 0.1], ['III', 0.3], ['VII', 0.3], ['iiø7', 0.4], ['i7', 0.6], ['iv7', 0.5], ['VImaj7', 0.6], ['V7/III', 2], ['V7/iv', 2.2], ['bII', 2.4]],
}
const TARGET = { 'V7/V': 'V', 'V7/vi': 'vi', 'V7/ii': 'ii', 'V7/III': 'III', 'V7/iv': 'iv' }

// the 24 keys with their Krumhansl–Kessler correlation to the melody's weighted pitch classes, best first
const KK = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] }
export function keyCandidates(notes) {
  const hist = new Array(12).fill(0)
  for (const [b, n, d] of notes) hist[pc(Math.round(n))] += d * (Math.abs(b / 4 - Math.round(b / 4)) < 1e-6 ? 1.5 : 1)
  const corr = (a, b) => {
    const ma = a.reduce((x, y) => x + y, 0) / 12, mb = b.reduce((x, y) => x + y, 0) / 12
    let n = 0, da = 0, db = 0
    for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
    return n / Math.sqrt(da * db || 1)
  }
  const out = []
  for (const mode of ['major', 'minor']) for (let t = 0; t < 12; t++) out.push({ tonic: t, mode, r: corr(hist, KK[mode].map((_, i) => KK[mode][(i - t + 12) % 12])) })
  return out.sort((a, b) => b.r - a.r)
}
export const melodyKey = notes => keyCandidates(notes)[0]

export function harmonize(notesIn, { key: keyIn = null, per: perIn = null } = {}) {
  if (!notesIn.length) return null
  if (!keyIn) {
    // the key: of the likeliest keys by profile, the one in which the melody harmonizes best (and ends best)
    const cands = keyCandidates(notesIn).slice(0, 6)
    let top = null
    for (const k of cands) {
      const h = harmonizeIn(notesIn, { key: { tonic: k.tonic, mode: k.mode }, per: perIn })
      const lastPc = pc(Math.round([...notesIn].sort((a, b) => a[0] - b[0]).at(-1)[1]))
      const v = h.score / h.notes.length + 3 * k.r + (lastPc === k.tonic ? 0.6 : 0) + (k.mode === 'major' ? 0.1 : 0)
      if (!top || v > top.v) top = { v, h }
    }
    return top.h
  }
  return harmonizeIn(notesIn, { key: keyIn, per: perIn })
}
function harmonizeIn(notesIn, { key: keyIn, per: perIn }) {
  const sorted = [...notesIn].sort((a, b) => a[0] - b[0])
  const t0 = Math.floor(sorted[0][0] / 4) * 4
  const notes = sorted.map(([b, n, d]) => [b - t0, n, d])
  const key = typeof keyIn === 'string' ? parseKey(keyIn) : keyIn
  const end = Math.max(...notes.map(([b, , d]) => b + d))
  const avg = notes.reduce((s, [, , d]) => s + d, 0) / notes.length
  const per = perIn ?? (avg >= 2 ? 4 : 2) // two chords a bar (the cadence needs its V), one when the melody only holds
  const length = Math.max(8, Math.ceil(end / 8) * 8)
  const steps = length / per
  const cands = CANDS[key.mode === 'minor' ? 'minor' : 'major'].map(([sym, cost]) => ({ sym, cost, ch: roman(sym, key) }))
  // how well a chord fits the notes of one step
  const fit = (c, s) => {
    const a = s * per, b = a + per
    let score = 0
    for (const [nb, n, d] of notes) {
      const o = Math.min(b, nb + d) - Math.max(a, nb)
      if (o <= 0) continue
      const strong = Math.abs(nb - a) < 1e-6 ? 2.2 : nb < a ? 1.5 : Math.abs(nb - Math.round(nb)) < 1e-6 ? 1 : 0.6 // the step's first note decides, a note held into it too
      const w = o * strong, ok = c.ch.tones.includes(pc(Math.round(n)))
      score += ok ? (strong > 1 ? 2 : 0.5) * w : strong > 1 ? -1.6 * w : -0.35 * w // the strong parts decide; a passing note costs little
    }
    return score - c.cost
  }
  const motion = (p, c) => {
    if (!p) return c.sym === (key.mode === 'minor' ? 'i' : 'I') ? 1.5 : -0.3
    const iv = pc(c.ch.root - p.ch.root)
    let s = iv === 5 ? 1.2 : iv === 2 ? 0.5 : iv === 9 ? 0.4 : iv === 0 ? -0.35 : iv === 7 ? 0.2 : iv === 10 ? 0.1 : 0
    if (TARGET[p.sym]) s += c.sym.replace('7', '').replace('maj', '') === TARGET[p.sym] || roman(TARGET[p.sym], key).root === c.ch.root ? 1 : -3
    if (/^V7?$/.test(p.sym) && /^(IV|iv)/.test(c.sym)) s -= 0.8 // the dominant does not fall back to the subdominant
    return s
  }
  // Viterbi
  let best = cands.map(c => ({ s: fit(c, 0) + motion(null, c), path: [c] }))
  for (let s = 1; s < steps; s++) {
    const last = s === steps - 1, beforeLast = s === steps - 2
    best = cands.map(c => {
      let top = null
      for (const p of best) {
        const v = p.s + motion(p.path[p.path.length - 1], c)
        if (!top || v > top.v) top = { v, p }
      }
      let bonus = 0
      if (last) bonus += c.sym === (key.mode === 'minor' ? 'i' : 'I') ? 4 : -3
      if (beforeLast) bonus += /^V7?$/.test(c.sym) ? 1.5 : 0
      return { s: top.v + fit(c, s) + bonus, path: [...top.p.path, c] }
    })
  }
  const win = best.reduce((a, b) => (b.s > a.s ? b : a))
  return {
    key, keyName: keyName(key), per, length, chords: win.path.map(c => c.sym), chordObjs: win.path.map(c => c.ch),
    notes, shift: t0, score: win.s,
    // how many notes on a strong part are chord tones (for the tests and the toast)
    fit: (() => {
      let on = 0, all = 0
      for (const [b, n] of notes) {
        if (Math.abs(b - Math.round(b)) > 1e-6) continue
        all++
        if (win.path[Math.min(steps - 1, Math.floor(b / per))].ch.tones.includes(pc(Math.round(n)))) on++
      }
      return all ? on / all : 1
    })(),
  }
}
// the generator's MELODIES entry for a played melody
export function userMelody(notes, { key = null, title = 'ваша мелодия' } = {}) {
  const h = harmonize(notes, { key })
  if (!h) return null
  return {
    id: 'user', from: 'вы', title, key: h.keyName, base: 'C4', feel: 'straight', per: h.per, modal: false,
    moods: [], chords: h.chords, notes: h.notes.map(([b, n, d]) => [b, n - 60, d]), harmony: h,
  }
}
