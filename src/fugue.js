// A three-voice fugue (and a canon before it), composed by the rules of src/counterpoint.js — for the generator's
// 'fugue' style. Everything is decided here as notes; generate.js only writes the song file.
//
//   subject   composed by rule: a head on 1̂ or 5̂ with a characteristic leap in longer notes, a running tail by step,
//             a cadence 2̂–1̂ or 7̂–1̂; its implied harmony is planned with it (a chord per half bar) and every note on a
//             beat is a tone of that chord. Of many candidates the one that also works in stretto wins.
//   answer    in the dominant: tonal when the head moves between 1̂ and 5̂ (the 5̂ answered by 1̂), else real.
//   CS        the countersubject: composed against the answer (below it) and against the subject (above it) at once —
//             invertible counterpoint at the octave; complementary rhythm (it runs where the subject holds).
//   exposition alto: subject — soprano: answer, alto: CS — a codetta — bass: subject, soprano: CS, alto: free.
//   episodes  sequences down the circle of fifths (i–iv | VII–III …): the soprano's motif (from the subject) moved a
//             step down per bar, the bass on the roots, the alto free; each leads to the next key's dominant.
//   middle entries  in the relative key and in the subdominant, with the CS and a free voice.
//   stretto   the subject against itself δ beats later (the δ and interval that the rules allow), else a last entry.
//   coda      iv – V – I over the bass, a Picardy third in minor.
//   canon     before the fugue: a canon at the octave a bar apart over a free bass (speciesCanon).
import { pc } from './theory.js'
import { counterVoice, freeRhythm, speciesCanon, check, keyPcs, at, impliedChords, passable } from './counterpoint.js'

const MAJ = [0, 2, 4, 5, 7, 9, 11], NMIN = [0, 2, 3, 5, 7, 8, 10]
const scaleOf = key => key.iv ?? (key.mode === 'minor' ? NMIN : MAJ)
// a degree (0 = 1̂, may go past 7 or below 0) → MIDI near `ref`, in a key; raise: true = the raised 6̂/7̂ of minor
export function degreeMidi(d, key, base, raise = false) {
  const sc = scaleOf(key), o = Math.floor(d / 7), k = ((d % 7) + 7) % 7
  return base + 12 * o + sc[k] + (raise && key.mode === 'minor' && (k === 6 || k === 5) ? 1 : 0)
}
// realize a line of degrees in a key: in minor 7̂ is raised before 1̂ and over V, 6̂ raised when it rises to a raised 7̂
export function realize(line, key, base, vOf = () => false) {
  const out = line.map(([b, d, len]) => [b, d, len])
  const raised = new Array(out.length).fill(false)
  if (key.mode === 'minor') {
    for (let i = 0; i < out.length; i++) {
      const k = ((out[i][1] % 7) + 7) % 7, next = out[i + 1]
      if (k === 6 && ((next && next[1] === out[i][1] + 1) || vOf(out[i][0]))) raised[i] = true
    }
    for (let i = out.length - 2; i >= 0; i--) {
      const k = ((out[i][1] % 7) + 7) % 7
      if (k === 5 && raised[i + 1] && out[i + 1][1] === out[i][1] + 1) raised[i] = true
      // a raised 7̂ falling to 6̂: keep both natural (melodic minor descending)
      if (k === 6 && raised[i] && out[i + 1] && out[i + 1][1] < out[i][1]) raised[i] = false
    }
  }
  return out.map(([b, d, len], i) => [b, degreeMidi(d, key, base, raised[i]), len])
}
// the degree (0 = 1̂, with octaves) of a MIDI note in a key; the raised 6̂ / 7̂ of minor count as 6̂ / 7̂
export function degreeOf(n, key, base = tonicBase(key, 60)) {
  const rel = n - base, o = Math.floor(rel / 12), g = ((rel % 12) + 12) % 12
  const sc = scaleOf(key)
  let k = sc.indexOf(g)
  if (k < 0) k = sc.indexOf(g - 1) >= 0 ? sc.indexOf(g - 1) : sc.indexOf(g + 1)
  return 7 * o + k
}
const tonicBase = (key, near) => { const t = ((key.tonic % 12) + 12) % 12; return near - ((((near - t) % 12) + 12) % 12) } // the tonic at or below `near`
const shiftLine = (notes, dt, dn = 0) => notes.map(([b, n, d]) => [b + dt, n + dn, d])
const fitOct = (notes, lo, hi) => { // octaves so the line sits in [lo, hi]
  const ns = notes.map(e => e[1]), mid = (Math.min(...ns) + Math.max(...ns)) / 2
  return Math.round(((lo + hi) / 2 - mid) / 12) * 12
}

// ---- the subject ------------------------------------------------------------------------------------------------------
// rhythms of two bars (beats); the harmonic skeletons a chord per half bar (degrees of the roots; 4 = V)
const RHYTHMS = [
  [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
  [1.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1],
  [2, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1],
  [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
  [1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1],
  [1, 1, 1.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1],
  [1.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1],
  [0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
  [1, 0.5, 0.25, 0.25, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1],
  [2, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1],
]
const SKELETONS = [[0, 3, 4, 0], [0, 4, 4, 0], [0, 0, 4, 0], [0, 5, 4, 0], [0, 3, 1, 4], [0, 5, 3, 4]]
const triadDeg = root => [root, root + 2, root + 4].map(d => ((d % 7) + 7) % 7)

function composeSubjectDegrees(r) {
  const rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)], skel = SKELETONS[Math.floor(r() * SKELETONS.length)]
  const slots = []
  let b = 0
  for (const d of rhythm) { slots.push([b, d]); b += d }
  const L = b
  const chordAt = t => skel[Math.min(skel.length - 1, Math.floor(t / 2))]
  const start = r() < 0.55 ? 0 : 4 // 1̂ or 5̂
  const cands = []
  for (let d = -3; d <= 11; d++) cands.push(d)
  // a beam over degrees
  let beam = [{ line: [], cost: 0, leaps: 0 }]
  slots.forEach(([b, d], i) => {
    const next = [], last = i === slots.length - 1, strong = Math.abs(b - Math.round(b)) < 1e-6
    for (const st of beam) {
      const p = st.line[st.line.length - 1]
      for (const g of cands) {
        if (i === 0 && g !== start) continue
        let c = st.cost + r()
        const k = ((g % 7) + 7) % 7, ch = triadDeg(chordAt(b))
        if (strong && !ch.includes(k)) c += Math.abs(b / 2 - Math.round(b / 2)) < 1e-6 ? 1e4 : 6
        if (last && k !== 0 && k !== 2) c += 1e4
        if (last && k === 2) c += 3
        let leaps = st.leaps
        if (p) {
          const s = g - p[1], x = Math.abs(s), pk = ((p[1] % 7) + 7) % 7
          const head = b < 3
          if (x === 0) c += 6
          else if (x === 1) c += head ? 1.5 : 0
          else if (x === 2) c += head ? 0 : 1.5
          else if (x === 3 || x === 4) { c += head ? -1 : 3; leaps++ }
          else if (x === 5) { c += head ? 0 : 6; leaps++ }
          else if (x === 7) c += 4
          else c += 1e4
          // a leap of a fourth or more is followed by a step back
          const pp = st.line[st.line.length - 2]
          if (pp) { const l = p[1] - pp[1]; if (Math.abs(l) >= 3 && (Math.sign(l) === Math.sign(s) || x > 1)) c += 8 }
          if (d <= 0.5 && x > 2) c += 4 // runs run by step
          if (pk === 6 && k !== 0 && strong) c += 5 // the leading tone resolves
          if ((pk === 6 && k === 5) || (pk === 5 && k === 6)) c += 0 // (spelt by realize)
          if (last && x !== 1) c += 1e4 // 2̂ – 1̂ or 7̂ – 1̂ (or 4̂ – 3̂)
          // the tritone 4̂ – 7̂ as an outline is avoided
          if ((pk === 3 && k === 6 && s === 3) || (pk === 6 && k === 3 && s === -3)) c += 1e4
          // and the leaps that are a tritone in the major or the minor this subject will be heard in: 2̂–♭6̂, 4̂–7̂
          if (x >= 3 && x <= 4 && ([pk, k].sort().join() === '1,5' || [pk, k].sort().join() === '3,6')) c += 1e4
        }
        if (leaps > 3) c += 5
        // character: no oscillating between two notes, no note heard too often, a running tail that goes somewhere
        const L3 = [...st.line.slice(-3).map(e => e[1]), g]
        if (L3.length === 4 && L3[0] === L3[2] && L3[1] === L3[3]) c += 10
        if (L3.length >= 3 && L3[L3.length - 3] === g && Math.abs(L3[L3.length - 2] - g) >= 2) c += 4 // a leap there and back
        if (st.line.filter(e => e[1] === g).length >= 2) c += 3
        if (p && d <= 0.5 && st.line.length >= 2) {
          const pp = st.line[st.line.length - 2], turn = Math.sign(p[1] - pp[1]) !== Math.sign(g - p[1])
          if (turn && pp[2] <= 0.5) c += 1.2
        }
        next.push({ line: [...st.line, [b, g, d]], cost: c, leaps })
      }
    }
    next.sort((a, b) => a.cost - b.cost)
    beam = next.slice(0, 40)
  })
  const best = beam[0]
  // the range: a sixth to a tenth; the climax once; a characteristic leap (a fourth or more) in the head
  const ds = best.line.map(e => e[1]), amb = Math.max(...ds) - Math.min(...ds)
  const climax = ds.filter(d => d === Math.max(...ds)).length
  const headLeap = best.line.slice(0, 4).some((e, i, a) => i && Math.abs(e[1] - a[i - 1][1]) >= 3)
  return { line: best.line, L, skel, cost: best.cost + (amb > 9 ? 50 : amb < 4 ? 20 : amb < 5 ? 6 : 0) + (climax > 1 ? 4 : 0) + (headLeap ? 0 : 6), start }
}

// ---- the plan ---------------------------------------------------------------------------------------------------------
// the keys of the entries. A mode (key.iv: seven steps) keeps its notes: its entries stand on other degrees of the same
// scale (rot), as in the modal fugues and ricercars — the answer on the fifth, else on the fourth (plagal, as in
// Phrygian); the "relative" and "subdominant" entries on the degrees whose fifth is perfect
const rot = (key, k) => ({ tonic: (key.tonic + key.iv[k]) % 12, mode: 'modal', iv: key.iv.map((_, i) => (((key.iv[(k + i) % 7] - key.iv[k]) % 12) + 12) % 12), pcs: key.pcs, deg: k })
const fifthOk = (key, k) => (((key.iv[(k + 4) % 7] - key.iv[k]) % 12) + 12) % 12 === 7
const modalDegrees = key => {
  const d = fifthOk(key, 4) ? 4 : 3, r = [2, 5].find(k => fifthOk(key, k) && k !== d) ?? 5, s = [3, 1, 5].find(k => fifthOk(key, k) && k !== d && k !== r) ?? 1
  return { d, r, s }
}
const rel = key => (key.iv ? rot(key, modalDegrees(key).r) : key.mode === 'minor' ? { tonic: (key.tonic + 3) % 12, mode: 'major' } : { tonic: (key.tonic + 9) % 12, mode: 'minor' })
const dom = key => (key.iv ? rot(key, modalDegrees(key).d) : { tonic: (key.tonic + 7) % 12, mode: key.mode })
const sub = key => (key.iv ? rot(key, modalDegrees(key).s) : { tonic: (key.tonic + 5) % 12, mode: key.mode })
// a mode that can carry a fugue: seven notes, a perfect fifth over the final
export const fugueMode = iv => iv?.length === 7 && iv.every(v => v === Math.round(v)) && (((iv[4] % 12) + 12) % 12) === 7

// descending fifths to the dominant of `to`: k bars, two chords a bar, each bar the one before a step lower
function fifthsChain(to, k) {
  const sc = scaleOf(to), chords = []
  for (let j = 0; j < k; j++) for (const d of [k - j, k - j + 3]) {
    const g = ((d % 7) + 7) % 7
    const tones = [0, 2, 4].map(s => (to.tonic + sc[(g + s) % 7] + (to.mode === 'minor' && g === 4 && s === 2 ? 1 : 0)) % 12)
    chords.push({ deg: g, root: tones[0], tones })
  }
  return chords
}

// a fugue that breaks no rule of check(): the first of a few attempts that is clean (each attempt draws on, so it is
// another subject and other lines), else the cleanest
export function composeFugue(opts) {
  let best = null
  for (let i = 0; i < 8; i++) {
    const f = composeOnce(opts)
    f.faults = f.check()
    f.attempt = i + 1
    if (!best || f.faults.length < best.faults.length) best = f
    if (!f.faults.length) break
  }
  return best
}
function composeOnce({ key, r, ranges = { s: [62, 81], a: [55, 74], b: [38, 60] }, canon = true, canonBars = 10 }) {
  const home = key.iv ? { ...key, deg: 0, pcs: key.iv.map(v => (v + key.tonic) % 12) } : { tonic: key.tonic, mode: key.mode }
  // the subject: the best of many candidates
  const pool = []
  for (let i = 0; i < 32; i++) {
    const c = composeSubjectDegrees(r)
    // stretto potential: the subject against itself an octave below δ beats later
    c.stretto = strettoOf(c, home, t => c.skel[Math.min(c.skel.length - 1, Math.floor(t / 2))] === 4)
    // the subject must sing in every key it will be heard in: no tritone, seventh or augmented second there
    for (const k of [home, rel(home), sub(home), dom(home)]) c.cost += 100 * check([realize(c.line, k, tonicBase(k, 60), t => c.skel[Math.min(c.skel.length - 1, Math.floor(t / 2))] === 4)], { key: k }).length
    pool.push({ ...c, score: c.cost - (c.stretto ? 6 : 0) })
  }
  pool.sort((a, b) => a.score - b.score)
  const top = pool.filter(c => c.score < pool[0].score + 8).slice(0, 5)
  const S = top[Math.floor(r() * top.length)]
  const L = S.L, skelAt = (t, off = 0) => S.skel[Math.min(S.skel.length - 1, Math.floor((t - off) / 2))]
  const vIn = (off) => t => skelAt(t, off) === 4
  // the subject in a key, in a voice's range: [b, MIDI, d] from beat `at`
  const subjectIn = (k, t0, [lo, hi], line = S.line) => {
    const notes = realize(line, k, tonicBase(k, 60), vIn(0))
    return shiftLine(notes, t0, fitOct(notes, lo, hi))
  }
  // the answer: in the dominant; tonal if the head (the notes before the first that is neither 1̂ nor 5̂) has a 5̂
  const headEnd = S.line.findIndex(([, d]) => ![0, 4].includes(((d % 7) + 7) % 7))
  const tonal = (!home.iv || modalDegrees(home).d === 4) && S.line.slice(0, headEnd).some(([, d]) => ((d % 7) + 7) % 7 === 4)
  const answerLine = S.line.map(([b, d, len], i) => [b, i < headEnd && ((d % 7) + 7) % 7 === 4 ? d - 1 : d, len]) // 5̂ (in the dominant: 1̂ of home = 4̂ of it)
  const answerIn = (t0, range) => {
    const D = dom(home), line = tonal ? answerLine : S.line
    const notes = realize(line, D, tonicBase(D, 60), vIn(0))
    return shiftLine(notes, t0, fitOct(notes, ...range))
  }

  const V = { s: [], a: [], b: [] } // the voices' notes
  const sections = [], keys = [], harmony = [], entries = []
  const put = (v, notes) => { V[v].push(...notes); V[v].sort((x, y) => x[0] - y[0]) }
  // a voice that enters with the subject (or the CS) after a leap takes a breath first: its last note shortened
  // faults of the three voices around beat t
  const faultsNear = (t0, t1) => check([V.s, V.a, V.b], { key: home, from: t0, to: t1 }).length
  // a breath: the note of voice v that ends at t shortened (half of it, or a beat of a long one) — kept only if the
  // texture breaks no more rules in the gap (the others may then make a fourth over a new lowest voice)
  const breathe = (v, t) => {
    const k = V[v].findIndex(e => Math.abs(e[0] + e[2] - t) < 1e-6)
    if (k < 0) return true
    const before = faultsNear(V[v][k][0] - 1, t), d = V[v][k][2]
    V[v][k][2] = d >= 2 ? d - 1 : d / 2
    if (faultsNear(V[v][k][0] - 1, t) <= before) return true
    V[v][k][2] = d
    return false
  }
  // a voice that enters (with the subject or the CS) after a leap: the note before in the other octave if that breaks
  // nothing, else a breath before the entry
  const enter = (v, notes) => {
    const t = notes[0][0], k = V[v].findIndex(e => Math.abs(e[0] + e[2] - t) < 1e-6)
    const bad = x => x === 6 || x === 10 || x === 11 || x > 7
    if (k >= 0 && bad(Math.abs(V[v][k][1] - notes[0][1]))) {
      const old = V[v][k][1], dir = Math.sign(notes[0][1] - old), before = faultsNear(V[v][k][0] - 2, t + 0.01)
      V[v][k][1] = old + 12 * dir
      const ok = faultsNear(V[v][k][0] - 2, t + 0.01) <= before && !bad(Math.abs(V[v][k][1] - notes[0][1])) && (k === 0 || Math.abs(V[v][k][1] - V[v][k - 1][1]) <= 9)
      if (!ok) { V[v][k][1] = old; breathe(v, t) }
    }
    put(v, notes)
  }

  const lastNote = (v, before = Infinity) => { let n = null; for (const e of V[v]) if (e[0] < before - 1e-6) n = e[1]; return n }
  let T = 0

  // ---- the canon
  if (canon) {
    const bars = canonBars
    let c = null
    for (let tries = 0; tries < 6 && !c; tries++) c = speciesCanon({ key: home, bars, delay: 4, interval: -12, lo: ranges.s[0] + 3, hi: ranges.s[1], r })
    if (c) {
      sections.push([0, 'canon'])
      keys.push([0, home])
      put('s', c.dux), put('a', c.comes)
      const end = bars * 4
      const rh = freeRhythm([c.dux, c.comes], 0, end - 4, r, { busy: 0.2, halves: 0, end: 0 })
      rh.push([end - 4, 4])
      const t = home.tonic
      const bass = counterVoice({ contexts: [{ voices: [{ notes: c.dux, above: true }, { notes: c.comes, above: true }] }], rhythm: rh, key: home, lo: ranges.b[0], hi: ranges.b[1] - 4, r, bass: true, pins: [[0, [t]], [end - 5, [(t + 7) % 12]], [end - 4, [t]]] })
      put('b', bass)
      T = end
    }
  }

  // ---- the exposition: alto, soprano, bass
  const T0 = T
  sections.push([T, 'exposition'])
  keys.push([T, home])
  const e1 = subjectIn(home, T, ranges.a)
  enter('a', e1)
  entries.push({ at: T, voice: 'a', kind: 'subject', key: home })
  // the answer in the soprano, the CS in the alto under it — composed in its tonic form for the soprano (it will sound a
  // fifth higher, an octave lower, against the answer) and against the bass's subject at the same time
  const ans = answerIn(T + L, ranges.s)
  const bassS = subjectIn(home, T + L, ranges.b) // where the bass will have it (for the CS's second context)
  const csRhythm = complementary(ans, T + L, T + 2 * L, r)
  // the CS's two contexts: (1) under the answer in the alto: CS + shift; (2) over the subject in the bass, in the soprano
  // the CS in the soprano's range moved as the answer is (a fifth up; in a mode by degrees) and down an octave to the alto
  const B0 = tonicBase(home, 60), dDeg = home.iv ? modalDegrees(home).d : 0
  const toAlto = home.iv ? n => degreeMidi(degreeOf(n, home, B0) + dDeg, home, B0) - 12 : n => n - 5
  const fromAlto = home.iv ? n => degreeMidi(degreeOf(n + 12, home, B0) - dDeg, home, B0) : n => n + 5
  const cs = counterVoice({
    contexts: [
      { voices: [{ notes: ans, above: true }], map: toAlto },
      { voices: [{ notes: bassS, above: false }], shift: 0 },
    ],
    rhythm: csRhythm, key: home, lo: ranges.s[0], hi: ranges.s[1], r, invertible: true, prev: fromAlto(lastNote('a')),
  })
  const csRel = shiftLine(cs, -(T + L)) // the CS in its tonic form, from 0, soprano range
  enter('s', ans)
  put('a', shiftLine(csRel, T + L).map(([b, n, d]) => [b, toAlto(n), d]))
  entries.push({ at: T + L, voice: 's', kind: tonal ? 'tonal answer' : 'real answer', key: dom(home) })
  keys.push([T + L, dom(home)])
  T += 2 * L
  // the codetta: a bar back to the tonic (V7 of home, then into the bass's entry), soprano and alto
  const cod = 4
  {
    const chords = [fifthsChain(home, 1)[0], fifthsChain(home, 1)[1]]
    const chAt = t => (t < T + 2 ? chords[0].tones : chords[1].tones)
    const rs = freeRhythm([], T, T + cod, r, { busy: 0.8, end: 0 })
    const sopr = counterVoice({ contexts: [{ voices: [] }], rhythm: rs, key: home, lo: ranges.s[0], hi: ranges.s[1], r, chordAt: chAt, prev: lastNote('s') })
    put('s', sopr)
    const ra = freeRhythm([sopr], T, T + cod, r, { end: 0 })
    put('a', counterVoice({ contexts: [{ voices: [{ notes: V.s, above: true }] }], rhythm: ra, key: home, lo: ranges.a[0], hi: ranges.a[1], r, chordAt: chAt, prev: lastNote('a') }))
    keys.push([T, home])
    T += cod
  }
  // the bass enters with the subject; the soprano has the CS, the alto a free voice between them
  const e3 = subjectIn(home, T, ranges.b)
  enter('b', e3)
  enter('s', shiftLine(csRel, T)) // (the CS was composed against exactly this placement)
  if (Math.abs(T - (T0 + L * 2 + cod)) > 1e-6) throw new Error('fugue: timing')
  entries.push({ at: T, voice: 'b', kind: 'subject', key: home })
  freeVoice('a', T, T + L, ['s'], ['b'], home, { prevV: 'a' })
  T += L

  // ---- episodes and middle entries
  const R = rel(home), SD = sub(home)
  const plan = [
    { name: 'episode', to: R, bars: 2 },
    { name: 'middle entry', key: R, voice: 's' },
    { name: 'episode II', to: SD, bars: 2 },
    { name: 'middle entry II', key: SD, voice: 'a' },
    { name: 'episode III', to: home, bars: 3 },
  ]
  for (const p of plan) {
    if (p.to) { episode(p.name, p.to, p.bars); continue }
    sections.push([T, p.name])
    keys.push([T, p.key])
    middleEntry(p.key, p.voice)
  }

  // ---- stretto (or a last entry), coda
  sections.push([T, S.stretto ? 'stretto' : 'final entry'])
  keys.push([T, home])
  if (S.stretto) {
    const { delay, interval } = S.stretto
    // the lead in the bass, in the octave nearer to where the bass was; the follower an octave or more above it (the
    // interval class that was checked), in the soprano if it fits there, else in the alto — nearer to where that voice was
    const fits = (notes, [lo, hi]) => { const ns = notes.map(e => e[1]); return Math.min(...ns) >= lo - 2 && Math.max(...ns) <= hi + 2 }
    let lead = subjectIn(home, T, ranges.b)
    const wasB = lastNote('b', T)
    for (const o of [-12, 12]) { const alt = shiftLine(lead, 0, o); if (wasB != null && fits(alt, ranges.b) && Math.abs(alt[0][1] - wasB) < Math.abs(lead[0][1] - wasB)) lead = alt }
    let fv = null, follow = null, bestF = Infinity
    for (const v of ['s', 'a']) for (const iv of [interval - 12, interval, interval + 12, interval + 24]) {
      if (iv < 12) continue
      const f = shiftLine(lead, delay, iv)
      if (!fits(f, ranges[v])) continue
      const was = lastNote(v, T + delay), c = (v === 's' ? 0 : 2) + (was != null ? Math.abs(f[0][1] - was) / 3 : 0)
      if (c < bestF) (bestF = c), (fv = v), (follow = f)
    }
    if (!follow) (fv = interval >= 24 ? 's' : 'a'), (follow = shiftLine(lead, delay, interval))
    const other = fv === 's' ? 'a' : 's'
    enter('b', lead), enter(fv, follow)
    entries.push({ at: T, voice: 'b', kind: 'subject (stretto)', key: home }, { at: T + delay, voice: fv, kind: `subject in stretto, ${delay} beats later`, key: home })
    // the follower's voice before its entry, the bass after the lead's end (V – I under the follower's cadence), the
    // third voice throughout: free
    freeVoice(fv, T, T + delay, fv === 's' ? [] : ['s'], ['b'], home, {})
    const endB = T + delay + S.line[S.line.length - 1][0]
    freeVoice('b', T + L, T + L + delay, [fv], [], home, { bass: true, pins: [[endB - 1, [(home.tonic + 7) % 12]], [endB, [home.tonic]]] })
    freeVoice(other, T, T + L + delay, other === 's' ? [] : ['s'], other === 's' ? ['a', 'b'] : ['b'], home, {})
    T += L + delay
  } else middleEntry(home, 's')
  // the coda: iv – V | I (a Picardy third in minor), the bass 4̂ 5̂ | 1̂
  sections.push([T, 'coda'])
  {
    const t = home.tonic, sc = scaleOf(home), tri = d => [0, 2, 4].map(s => (t + sc[(d + s) % 7]) % 12)
    const phrygian = sc[1] === 1
    const iv = tri(3), V5 = phrygian ? tri(1) : tri(4), I = tri(0)
    if (!phrygian && (((V5[1] - V5[0]) % 12) + 12) % 12 === 3) V5[1] = (V5[1] + 1) % 12
    if ((((I[1] - I[0]) % 12) + 12) % 12 === 3) I[1] = (I[1] + 1) % 12
    const chAt = b => (b < T + 2 ? iv : b < T + 4 ? V5 : I)
    const pcsCoda = [...new Set([...keyPcs(home), ...V5, ...I])]
    const rb = [[T, 1], [T + 1, 1], [T + 2, 2], [T + 4, 4]]
    const bass = counterVoice({ contexts: [{ voices: [] }], rhythm: rb, key: home, lo: ranges.b[0], hi: ranges.b[1] - 3, r, chordAt: chAt, pins: [[T, [iv[0]]], [T + 2, [V5[0]]], [T + 4, [t]]], prev: lastNote('b'), bass: true, pcs: pcsCoda })
    put('b', bass)
    const rs = [[T, 1], [T + 1, 0.5], [T + 1.5, 0.5], [T + 2, 1], [T + 3, 1], [T + 4, 4]]
    const sopr = counterVoice({ contexts: [{ voices: [{ notes: V.b, above: false }] }], rhythm: rs, key: home, lo: ranges.s[0] + 5, hi: ranges.s[1] - 3, r, chordAt: chAt, pins: [[T + 4, [t]], [T + 3, phrygian ? V5 : [V5[1], V5[2]]]], prev: lastNote('s'), pcs: pcsCoda })
    put('s', sopr)
    const ra = [[T, 2], [T + 2, 1], [T + 3, 1], [T + 4, 4]]
    put('a', counterVoice({ contexts: [{ voices: [{ notes: V.s, above: true }, { notes: V.b, above: false }] }], rhythm: ra, key: home, lo: ranges.a[0], hi: ranges.a[1], r, chordAt: chAt, pins: [[T + 4, [I[1]]]], prev: lastNote('a'), pcs: pcsCoda }))
    harmony.push([T, 2, iv[0], chordQuality(iv)], [T + 2, 2, V5[0], chordQuality(V5)], [T + 4, 4, t, chordQuality(I)])
    T += 8
  }

  // the harmony the voices make, where it was not planned (the continuo's chords)
  const keyAt = b => { let k = home; for (const [a, kk] of keys) if (a <= b + 1e-6) k = kk; return k }
  const planned = new Set(harmony.map(h => Math.round(h[0] * 2)))
  for (const h of impliedChords([V.s, V.a, V.b], 0, T, keyAt, 2)) if (!planned.has(Math.round(h[0] * 2)) && !harmony.some(g => h[0] >= g[0] - 1e-6 && h[0] < g[0] + g[1] - 1e-6)) harmony.push(h)
  harmony.sort((a, b) => a[0] - b[0])
  return { voices: V, sections, keys, harmony, entries, length: T, subject: { notes: subjectIn(home, 0, ranges.a), L, tonal, start: S.start, stretto: S.stretto, skeleton: S.skel }, answer: answerIn(0, ranges.s), cs: csRel, check: () => check([V.s, V.a, V.b], { key: home }) }

  // ---- helpers that need the voices --------------------------------------------------------------------------------
  function freeVoice(v, from, to, above, below, k, { prevV = v, bass = false, soprano = false, pins = [], chordAt = null } = {}) {
    const after = V[v].find(e => Math.abs(e[0] - to) < 1e-6)?.[1] ?? null
    const others = [...above.map(n => ({ notes: V[n], above: true })), ...below.map(n => ({ notes: V[n], above: false }))]
    const rh = freeRhythm(others.map(o => o.notes.filter(e => e[0] + e[2] > from - 1e-6 && e[0] < to + 1e-6)), from, to, r, { end: 1, busy: bass ? 0.35 : 0.6 })
    const range = ranges[v]
    let line = counterVoice({ contexts: [{ voices: others }], rhythm: rh, key: k, lo: range[0], hi: range[1], r, bass, prev: lastNote(prevV, from), next: after, pins, chordAt })
    // cornered by where the voice was: it takes a breath and starts afresh
    if (line.cost >= 300) {
      const again = counterVoice({ contexts: [{ voices: others }], rhythm: rh, key: k, lo: range[0], hi: range[1], r, bass, prev: null, next: after, pins, chordAt })
      const was = lastNote(prevV, from), x = was == null ? 0 : Math.abs(again[0][1] - was)
      if (again.cost < line.cost - 100 && (x <= 7 && x !== 6 || breathe(v, from))) line = again
    }
    put(v, line)
    return line
  }
  // an entry of the subject in key k in voice v, the CS in another voice, the third free
  function middleEntry(k, v) {
    const order = ['s', 'a', 'b']
    let sub = subjectIn(k, T, ranges[v])
    // the octave nearer to where the voice was, if it stays in its range
    const was = lastNote(v, T), [lo, hi] = ranges[v]
    if (was != null) for (const o of [-12, 12]) {
      const alt = shiftLine(sub, 0, o), ns = alt.map(e => e[1])
      if (Math.min(...ns) >= lo - 2 && Math.max(...ns) <= hi + 2 && Math.abs(alt[0][1] - was) < Math.abs(sub[0][1] - was)) sub = alt
    }
    enter(v, sub)
    entries.push({ at: T, voice: v, kind: 'subject', key: k })
    // the CS moved into k, in the voice next to the subject (above it if it can)
    const csV = v === 'b' ? 'a' : v === 's' ? 'a' : 's'
    const csAbove = order.indexOf(csV) < order.indexOf(v)
    // as in the exposition, the CS was made against the subject from above (context 2) and against the answer from
    // below (context 1) — both placements are safe; it moves by the interval between the keys
    const dk = ((k.tonic - home.tonic) % 12 + 12) % 12
    let line
    if (home.iv) line = csRel.map(([b, n, d]) => [b + T, degreeMidi(degreeOf(n, home, B0) + k.deg, home, B0), d])
    else {
      line = shiftLine(csRel, T, dk)
      if (k.mode !== home.mode) line = modeShift(line, k)
    }
    const o = fitOct(line, ...ranges[csV])
    line = line.map(([b, n, d]) => [b, n + o, d])
    // keep the CS on its side of the subject
    if (csAbove) while (line.some(([b, n]) => { const s = at(sub, b); return s != null && n <= s })) line = line.map(([b, n, d]) => [b, n + 12, d])
    else while (line.some(([b, n]) => { const s = at(sub, b); return s != null && n >= s })) line = line.map(([b, n, d]) => [b, n - 12, d])
    // the CS fits a relative-key entry only by its degrees: check it, and compose a new counter-voice if it does not
    const trial = check([csAbove ? line : sub, csAbove ? sub : line], { key: k })
    if (!trial.length && line.every(([, n]) => n >= ranges[csV][0] - 3 && n <= ranges[csV][1] + 3)) enter(csV, line)
    else freeVoice(csV, T, T + L, csAbove ? [] : [v], csAbove ? [v] : [], k, { soprano: csV === 's' })
    const third = order.find(x => x !== v && x !== csV)
    const ab = order.filter(x => x !== third && order.indexOf(x) < order.indexOf(third)), be = order.filter(x => x !== third && order.indexOf(x) > order.indexOf(third))
    const endB = T + S.line[S.line.length - 1][0]
    freeVoice(third, T, T + L, ab, be, k, { bass: third === 'b', pins: third === 'b' ? [[endB - 1, [(k.tonic + 7) % 12]], [endB, [k.tonic]]] : [] })
    T += L
  }
  // an episode: a sequence by descending fifths to the dominant of `to`
  function episode(name, to, bars) {
    sections.push([T, name])
    keys.push([T, to])
    const chain = fifthsChain(to, bars)
    const chordAt = b => chain[Math.min(chain.length - 1, Math.floor((b - T) / 2))].tones
    // the soprano: a motif from the subject (its first bar or its running second bar) moved a step down per bar; of the
    // diatonic positions the one where every note on a beat is a tone of its chord and every other is one too or passes
    // by step — else a line composed on the motif's rhythm
    const window = (line, o) => line.filter(([b]) => b >= o - 1e-6 && b < o + 4 - 1e-6).map(([b, d, l]) => [b - o, d, l])
    const csDeg = csRel.map(([b, n, l]) => [b, degreeOf(n, home), l])
    const sources = [0, 1, 2, 3, 4].flatMap(o => [window(S.line, o), window(csDeg, o)]).filter(w => w.length >= 3 && w[0][0] === 0)
    const prevS = lastNote('s', T)
    let sopr = null, bestC = Infinity
    for (const src of sources) for (let sh = -12; sh <= 12; sh++) {
      const line = []
      for (let j = 0; j < bars; j++) for (const [b, d, l] of src) line.push([T + 4 * j + b, d + sh - j, Math.min(l, 4 - b)])
      const cand = realize(line, to, tonicBase(to, 60), b => b >= T + 4 * bars - 2)
      let c = 0
      cand.forEach(([b, n], k) => {
        if (chordAt(b).includes(pc(n))) return
        if (Math.abs(b - Math.round(b)) < 1e-6) c += Math.abs(b / 2 - Math.round(b / 2)) < 1e-6 ? 100 : passable(cand, k) ? 4 : 100
        else if (!passable(cand, k)) c += 100
      })
      const ns = cand.map(e => e[1]), mid = (Math.min(...ns) + Math.max(...ns)) / 2, want = (ranges.s[0] + ranges.s[1]) / 2 + 1
      if (Math.max(...ns) > ranges.s[1] + 1 || Math.min(...ns) < ranges.s[0] - 1) c += 100
      c += Math.abs(mid - want) / 4 + (prevS != null ? Math.abs(cand[0][1] - prevS) / 3 : 0)
      for (let k = 1; k < cand.length; k++) { const x = Math.abs(cand[k][1] - cand[k - 1][1]); if (x === 6 || x === 10 || x === 11 || x > 12) c += 100 }
      if (c < bestC) (bestC = c), (sopr = cand)
    }
    if (bestC >= 100) sopr = counterVoice({ contexts: [{ voices: [] }], rhythm: sopr.map(([b, , d]) => [b, d]), key: to, lo: ranges.s[0], hi: ranges.s[1], r, chordAt, prev: prevS })
    enter('s', sopr)
    // the bass on the roots (half bars), passing between; the alto free between them
    const rb = []
    for (let b = T; b < T + 4 * bars - 1e-6; b += 1) rb.push([b, 1])
    const pins = chain.map((c, i) => [T + 2 * i, [c.root]])
    put('b', counterVoice({ contexts: [{ voices: [{ notes: V.s, above: true }] }], rhythm: rb, key: to, lo: ranges.b[0], hi: ranges.b[1] - 2, r, bass: true, pins, chordAt, prev: lastNote('b') }))
    freeVoice('a', T, T + 4 * bars, ['s'], ['b'], to, { chordAt })
    for (let i = 0; i < chain.length; i++) harmony.push([T + 2 * i, 2, chain[i].root, chordQuality(chain[i].tones)])
    T += 4 * bars
  }
}
const chordQuality = ([r, t, f]) => { const a = ((t - r) % 12 + 12) % 12, b = ((f - r) % 12 + 12) % 12; return a === 4 ? '' : b === 6 ? 'dim' : 'm' }
// a line moved from one mode to another (minor ↔ its relative major): each note to the same degree
// (the line already moved to the new tonic): minor → major 3̂ 6̂ 7̂ up a semitone; major → minor down, the 7̂ kept raised
// where it rises to the tonic
const TO_MAJOR = { 3: 4, 8: 9, 10: 11 }, TO_MINOR = { 4: 3, 9: 8, 11: 10 }
function modeShift(line, to) {
  return line.map(([b, n, d], i) => {
    const g = pc(n - to.tonic), next = line[i + 1]
    if (to.mode === 'major') return [b, n + ((TO_MAJOR[g] ?? g) - g), d]
    if (g === 11 && next && next[1] === n + 1) return [b, n, d]
    return [b, n + ((TO_MINOR[g] ?? g) - g), d]
  })
}
// a rhythm complementary to a line: eighths where it holds, quarters where it runs; the CS begins after an eighth rest
function complementary(line, from, to, r) {
  const out = []
  for (let b = from; b < to - 1e-6; b += 1) {
    const inBeat = line.filter(([nb]) => nb > b + 1e-6 && nb < b + 1 - 1e-6).length
    const first = b === from
    if (first) { out.push([b + 0.5, 0.5]); continue }
    if (b >= to - 1 - 1e-6) { out.push([b, to - b]); continue }
    if (inBeat === 0) out.push(...(r() < 0.75 ? [[b, 0.5], [b + 0.5, 0.5]] : [[b, 0.75], [b + 0.75, 0.25]]))
    else out.push([b, 1])
  }
  return out
}
// does the subject work in stretto with itself: the follower δ beats later an octave (or two) above, no strong-beat
// dissonance, no parallels — the best δ, or null
function strettoOf(c, home, vOf) {
  const notes = realize(c.line, home, tonicBase(home, 48), vOf)
  for (const delay of [2, 4, 3, 1]) {
    if (delay >= c.L - 2) continue
    for (const oct of [12, 24]) {
      const follow = shiftLine(notes, delay, oct)
      const f = check([follow, notes], { key: home, from: delay, to: c.L })
      if (!f.length) return { delay, interval: oct }
    }
  }
  return null
}
