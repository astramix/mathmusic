// Central Javanese gamelan, composed as its structure — for the generator's 'gamelan' style. Pitches are fractional MIDI
// numbers from the measured tunings of src/modes.js (Kyai Madu Laras: slendro 0 263 500 723 961 ¢, pelog 0 120 267 538 667
// 779 977 ¢), tone 1 on D4.
//
//   colotomy  a cycle (gongan) is marked by a hierarchy of gongs that halves and halves again: the gong ageng closes it,
//             the kenong cuts it into halves or quarters, the kempul marks the middles between, the kethuk the middles of
//             those — ketawang 16 beats: kethuk 2 6 10 14, kenong 8 16, kempul 12, gong 16; ladrang 32 beats: kethuk every
//             4 from 2, kenong 8 16 24 32, kempul 12 20 28, gong 32.
//   balungan  the skeleton melody, one note a beat on the saron (the demung an octave down), in gatras of four whose last
//             note (seleh) is the goal; the seleh at the kenong and the gong are the pathet's strong tones.
//   garap     the elaborations: the peking doubles each note (a a b b), the bonang barung plays pairs (mipil: a b a b), the
//             bonang panerus twice as fast an octave up; they move to the next goal ahead of the balungan.
//   irama     the tempo levels: in irama II the balungan goes at half speed and the elaborations double their density
//             against it — the same piece, twice as long, twice as busy inside; the suling floats over it.
//   buka / suwuk  the bonang's solo opening into the first gong; the ending slows down to the last gong.

export const LARAS = {
  slendro: { mode: 'slendro', cents: { 1: 0, 2: 263, 3: 500, 5: 723, 6: 961 } },
  pelog: { mode: 'pelog', cents: { 1: 0, 2: 120, 3: 267, 4: 538, 5: 667, 6: 779, 7: 977 } },
}
// pathet: the five tones it uses, its gong tone, its strong tones (kenong goals)
export const PATHET = {
  'slendro manyura': { laras: 'slendro', tones: [1, 2, 3, 5, 6], gong: 6, strong: [3, 2, 6, 1] },
  'slendro sanga': { laras: 'slendro', tones: [1, 2, 3, 5, 6], gong: 5, strong: [1, 2, 5, 6] },
  'slendro nem': { laras: 'slendro', tones: [1, 2, 3, 5, 6], gong: 2, strong: [6, 5, 2, 3] },
  'pelog nem': { laras: 'pelog', tones: [1, 2, 3, 5, 6], gong: 6, strong: [5, 3, 2, 6] },
  'pelog lima': { laras: 'pelog', tones: [1, 2, 3, 5, 6], gong: 1, strong: [5, 2, 1, 6] },
  'pelog barang': { laras: 'pelog', tones: [2, 3, 5, 6, 7], gong: 6, strong: [7, 2, 3, 6] },
}
export const FORMS = {
  ketawang: { beats: 16, kethuk: [2, 6, 10, 14], kenong: [8, 16], kempul: [12] },
  ladrang: { beats: 32, kethuk: [2, 6, 10, 14, 18, 22, 26, 30], kenong: [8, 16, 24, 32], kempul: [12, 20, 28] },
}
const TONE1 = 62 // tone 1 of the middle octave on D4

// the ordered tones of a pathet over three octaves: [{ tone, oct, pitch }] by pitch
export function ladder(pathet) {
  const P = PATHET[pathet], L = LARAS[P.laras], out = []
  for (const oct of [-1, 0, 1]) for (const t of P.tones) out.push({ tone: t, oct, pitch: TONE1 + 12 * oct + L.cents[t] / 100 })
  return out.sort((a, b) => a.pitch - b.pitch)
}
const nameOf = ({ tone, oct }) => `${tone}${oct < 0 ? '̣' : oct > 0 ? '̇' : ''}`

// a gatra of four ending on the ladder index s: a contour from the templates (null = a rest, the pin)
const GATRA = [[-3, -2, -1, 0], [3, 2, 1, 0], [1, 0, -1, 0], [-1, 1, -1, 0], [2, 1, -1, 0], [0, 0, null, 0], [-1, 0, -1, 0], [1, 2, 1, 0], [-2, -1, 1, 0], [null, -1, 1, 0]]
function gatra(s, lad, r, prev = null) {
  let best = null, bc = Infinity
  for (let k = 0; k < 6; k++) {
    const g = GATRA[Math.floor(r() * GATRA.length)].map(d => (d == null ? null : Math.max(0, Math.min(lad.length - 1, s + d))))
    // no big leap in from the last note
    const first = g.find(v => v != null)
    const c = (prev == null ? 0 : Math.abs(first - prev)) + r()
    if (c < bc) (bc = c), (best = g)
  }
  return best
}
// the ladder index of a tone near the middle (oct 0, or −1 for the low tones of a pathet)
const idx = (lad, tone, near = 6) => {
  let best = 0
  lad.forEach((l, i) => { if (l.tone === tone && Math.abs(i - near) < Math.abs(best - near)) best = i })
  return best
}

export function composeGamelan({ pathet, r, form = 'ketawang', length = 'normal' }) {
  const P = PATHET[pathet], F = FORMS[form], lad = ladder(pathet), mid = Math.floor(lad.length / 2)
  // two gongan: A and B, each a list of seleh tones per gatra; the last of each is the gong tone
  const gatras = F.beats / 4
  const selehs = name => Array.from({ length: gatras }, (_, i) => (i === gatras - 1 ? P.gong : P.strong[(i + (name === 'B' ? 2 : 0) + Math.floor(r() * 2)) % P.strong.length]))
  const compose = name => {
    const sel = selehs(name), out = []
    let prev = idx(lad, P.gong, mid)
    for (const s of sel) {
      const g = gatra(idx(lad, s, mid + (name === 'B' ? 1 : 0)), lad, r, prev)
      out.push(...g)
      prev = g[3]
    }
    return out
  }
  const A = compose('A'), B = compose('B')
  // the plan: [section, gongan, irama, repeats]
  // (a ladrang's gongan is twice a ketawang's: it goes round fewer times)
  const lad2 = F.beats > 16
  const plan = length === 'short'
    ? [['buka', null, 1, 1], ['merong', A, 1, lad2 ? 1 : 2], ['irama II', B, 2, 1], ['suwuk', A, 1, 1]]
    : lad2
      ? [['buka', null, 1, 1], ['merong', A, 1, 1], ['ngelik', B, 1, 1], ['irama II', A, 2, 1], ['ngampat', B, 1, 1], ['suwuk', A, 1, 1]]
      : [['buka', null, 1, 1], ['merong', A, 1, 2], ['ngelik', B, 1, 1], ['irama II', A, 2, 1], ['irama II · B', B, 2, 1], ['ngampat', A, 1, 1], ['suwuk', A, 1, 1]]
  const sections = [], bal = [], peking = [], bonang = [], panerus = [], colot = [], kendhang = [], suling = []
  let t = 0
  for (const [name, gong, irama, rep] of plan) {
    sections.push([t, name])
    if (name === 'buka') {
      // the bonang alone: the last gatra of A, slowing into the first gong
      const g = A.slice(-4)
      g.forEach((v, i) => { if (v != null) bonang.push([t + i, lad[v].pitch + 12, 1]) })
      kendhang.push([t + 2, 'tak'], [t + 3, 'dhah'])
      t += 4
      colot.push([t, 'gong', lad[A[A.length - 1]].pitch - 24])
      continue
    }
    for (let k = 0; k < rep; k++) {
      const D = irama // beats per balungan note
      const suwuk = name === 'suwuk'
      // the ending slows: in the suwuk the last gatras stretch
      const at = i => (suwuk && i >= gong.length - 8 ? t + D * i + 0.25 * ((i - (gong.length - 8)) * (i - (gong.length - 8) + 1)) / 2 : t + D * i)
      for (let i = 0; i < gong.length; i++) {
        const v = gong[i], b = at(i), nb = at(i + 1), dur = nb - b
        if (v != null) bal.push([b, lad[v].pitch, dur])
        const pos = i + 1 // colotomic positions count from 1; the note on that beat is struck with it
        if (F.kethuk.includes(pos)) colot.push([b, 'kethuk', TONE1 + LARAS[P.laras].cents[2] / 100])
        if (F.kempul.includes(pos) && v != null) colot.push([b, 'kempul', lad[v].pitch - 12])
        if (F.kenong.includes(pos) && pos !== gong.length && v != null) colot.push([b, 'kenong', lad[v].pitch])
        if (pos === gong.length) colot.push([b, 'gong', lad[v ?? 0].pitch - 24], [b, 'kenong', lad[v ?? 0].pitch])
        // kendhang: tak – dhah in each gatra, a dhah on the gong
        if (pos % 4 === 2) kendhang.push([b, 'tak'])
        if (pos % 4 === 0) kendhang.push([b, 'dhah'])
        if (irama === 2 && pos % 2 === 1) kendhang.push([b + 1, 'ket'])
      }
      // the elaborations: per pair of balungan notes (a, b) — the notes held over rests
      const held = gong.map((v, i) => { let j = i; while (j >= 0 && gong[j] == null) j--; return j < 0 ? gong.find(x => x != null) : gong[j] })
      for (let i = 0; i < gong.length; i += 2) {
        const a = lad[held[i]].pitch, c = lad[held[i + 1]].pitch, b0 = at(i), span = at(i + 2) - b0
        const pk = [a, a, c, c], bn = [a, c, a, c]
        const nP = 4 * irama, nB = 4 * irama, nN = 8 * irama
        for (let j = 0; j < nP; j++) peking.push([b0 + (span * j) / nP, pk[j % 4] + 12, span / nP])
        for (let j = 0; j < nB; j++) bonang.push([b0 + (span * j) / nB, bn[j % 4] + 12, span / nB])
        for (let j = 0; j < nN; j++) panerus.push([b0 + (span * j) / nN, bn[j % 4] + 24, span / nN])
      }
      // the suling in irama II: long tones leaning on the next kenong goal, entering after it and resting before the next
      if (irama === 2) {
        for (let q = 0; q < F.kenong.length; q++) {
          const goalI = gong[F.kenong[q] - 1] ?? held[F.kenong[q] - 1], from = q ? at(F.kenong[q - 1]) : t, to = at(F.kenong[q] - 1)
          const path = [goalI + 2, goalI + 1, goalI + 2, goalI].map(v => Math.max(0, Math.min(lad.length - 1, v)))
          const len = (to - from - 1) / path.length
          path.forEach((v, j) => suling.push([from + 1 + j * len, lad[v].pitch + 12, len * 0.92]))
        }
      }
      t = at(gong.length)
    }
  }
  // the last gong rings out
  const end = t + 8
  return { sections, balungan: bal, peking, bonang, panerus, colot, kendhang, suling, length: end, A: A.map(v => (v == null ? '.' : nameOf(lad[v]))), B: B.map(v => (v == null ? '.' : nameOf(lad[v]))), form, laras: P.laras }
}
