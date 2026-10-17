// A Hindustani raga performance composed by the raga's grammar — for the generator's 'raga' style.
//
//   the raga  its notes (swaras, semitones from Sa), the way up (aroha) and the way down (avaroha) as sequences — a
//             zigzag (vakra) raga like Darbari goes Ṡ d n P M g M R S —, the king and the minister notes (vadi,
//             samvadi), resting notes (nyas), its catch phrases (pakad), the notes sung with a slow swing (andolan), and
//             its intonation: just ratios (shruti) — Darbari's ga and dha "ati komal", lower than a just minor third.
//   alap      free time over the tanpura: phrases that go up by the aroha and down by the avaroha, glide into their notes
//             (meend), rest on nyas notes; low register first (mandra), then the middle, then up to the high Sa.
//   jor       a steady pulse: a note on each beat and the chikari (the drone strings) between.
//   gat       a composition in teentaal (16 beats: X 2 0 3 — the sam, two claps, the empty khali, a clap) on the tabla,
//             its phrase leading to the sam; the antara in the upper register.
//   taans     fast runs on the raga's ways, sitar and bansuri answering each other (sawal-jawab), and a tihai: a phrase
//             three times with equal gaps, so that its last note falls exactly on the sam: s₁ = C − e − 2(p + g).
//   jhala     a note and three chikari strokes on every beat, the tabla doubled, a tihai to the end.
// Notes: [beat, semitones from Sa (0 = the middle Sa; −12 the low one), length, ornament?]; ornaments { meend: from,
// andolan: true, chikari: true }.

export const RAGAS = {
  yaman: {
    name: 'Яман', thaat: 'kalyan', time: 'вечер, первая стража ночи', swaras: [0, 2, 4, 6, 7, 9, 11],
    aroha: [-1, 2, 4, 6, 9, 11, 12], avaroha: [12, 11, 9, 7, 6, 4, 2, 0], vadi: 4, samvadi: 11, nyas: [0, 4, 11, 7, 2],
    pakad: [[-1, 2, 4, 2], [7, 2], [-1, 2, 0]], andolan: [], drone: 7, shruti: { 6: [45, 32], 9: [27, 16] },
  },
  bhairav: {
    name: 'Бхайрав', thaat: 'bhairav', time: 'рассвет', swaras: [0, 1, 4, 5, 7, 8, 11],
    aroha: [0, 1, 4, 5, 7, 8, 11, 12], avaroha: [12, 11, 8, 7, 5, 4, 1, 0], vadi: 8, samvadi: 1, nyas: [0, 8, 1, 5, 7],
    pakad: [[0, 4, 5, 8, 8, 7], [5, 4, 1, 1, 0]], andolan: [1, 8], drone: 7, shruti: { 1: [256, 243], 8: [128, 81] },
  },
  bhupali: {
    name: 'Бхупали', thaat: 'kalyan', time: 'вечер', swaras: [0, 2, 4, 7, 9],
    aroha: [0, 2, 4, 7, 9, 12], avaroha: [12, 9, 7, 4, 2, 0], vadi: 4, samvadi: 9, nyas: [0, 4, 7, 9],
    pakad: [[4, 2, 0, -3], [0, 2, 4], [7, 4], [9, 7, 4, 2, 0]], andolan: [], drone: 7, shruti: {},
  },
  bhimpalasi: {
    name: 'Бхимпаласи', thaat: 'kafi', time: 'после полудня', swaras: [0, 2, 3, 5, 7, 9, 10],
    aroha: [-2, 0, 3, 5, 7, 10, 12], avaroha: [12, 10, 9, 7, 5, 3, 2, 0], vadi: 5, samvadi: 0, nyas: [0, 5, 7, 3],
    pakad: [[-2, 0, 3, 5], [7, 5, 3, 5], [3, 2, 0]], andolan: [], drone: 7, shruti: { 10: [16, 9] },
  },
  darbari: {
    name: 'Дарбари Канада', thaat: 'asavari', time: 'глубокая ночь', swaras: [0, 2, 3, 5, 7, 8, 10],
    aroha: [0, 2, 3, 5, 7, 8, 10, 12], avaroha: [12, 8, 10, 7, 5, 3, 5, 2, 0], vadi: 2, samvadi: 7, nyas: [0, 2, 7, 3],
    pakad: [[3, 5, 2, 0], [8, 10, 7], [5, 7, 3, 5, 2, 0]], andolan: [3, 8], drone: 7, shruti: { 3: [32, 27], 8: [128, 81], 10: [16, 9] },
  },
  malkauns: {
    name: 'Малкаунс', thaat: 'bhairavi', time: 'полночь', swaras: [0, 3, 5, 8, 10],
    aroha: [0, 3, 5, 8, 10, 12], avaroha: [12, 10, 8, 5, 3, 0], vadi: 5, samvadi: 0, nyas: [0, 5, 3, 8],
    pakad: [[5, 3, 5, 3, 0], [-2, 0, 3, 5], [8, 10, 8, 5]], andolan: [], drone: 5, shruti: { 10: [16, 9] },
  },
}
// 5-limit just intonation of the twelve swaras (Sa = 1/1), and a raga's own: cents from 12-TET by pitch class of Sa
const JUST = { 1: [16, 15], 2: [9, 8], 3: [6, 5], 4: [5, 4], 5: [4, 3], 6: [45, 32], 7: [3, 2], 8: [8, 5], 9: [5, 3], 10: [9, 5], 11: [15, 8] }
export function shrutiCents(raga) {
  const R = RAGAS[raga]
  return Array.from({ length: 12 }, (_, s) => {
    if (!s) return 0
    const [a, b] = R.shruti[s] ?? JUST[s]
    return Math.round((1200 * Math.log2(a / b) - 100 * s) * 10) / 10
  })
}
export const THEKA = ['dha', 'dhin', 'dhin', 'dha', 'dha', 'dhin', 'dhin', 'dha', 'dha', 'tin', 'tin', 'na', 'na', 'dhin', 'dhin', 'dha'] // teentaal
export const TALI = { 0: 'sam', 4: 'tali', 8: 'khali', 12: 'tali' }

// the raga's ways. Up: the next note of the aroha (its notes in every octave). Down: the avaroha read as a sequence, octave
// after octave, so its zigzags stay (Darbari: Ṡ d n P M g M R S — after g comes M again, then R); a note that is twice
// in it (M) is found after the note it came from.
const pcOf = s => ((s % 12) + 12) % 12
function up(R, s) {
  const pcs = new Set(R.aroha.map(pcOf))
  for (let k = 1; k <= 12; k++) if (pcs.has(pcOf(s + k))) return s + k
  return s + 12
}
function downWay(R) {
  const base = R.avaroha.slice(0, -1) // 12 … down to (not including) 0
  const way = []
  for (let o = 2; o >= -2; o--) for (const v of base) way.push(v + 12 * (o - 1))
  return way
}
function down(R, s, from = null) {
  const way = downWay(R)
  let i = -1
  for (let j = 0; j < way.length; j++) if (way[j] === s && (i < 0 || (from != null && way[j - 1] === from))) i = j
  if (i < 0) { // not on the way down: the next lower note that is
    const j = way.findIndex(v => v < s)
    return j < 0 ? s - 12 : way[j]
  }
  return way[Math.min(way.length - 1, i + 1)]
}
// a walk from s to the target along the ways; prev = the note before s (for a zigzag)
function walk(R, s, target, maxLen = 16, prev = null) {
  const path = []
  let cur = s, last = prev, guard = 0
  while (cur !== target && guard++ < maxLen) {
    const next = target > cur ? up(R, cur) : down(R, cur, last)
    // a zigzag may step past the target on its way: then the target comes next
    if ((target > cur && next > target) || (target < cur && next < target)) { path.push(target); cur = target; break }
    path.push(next)
    last = cur
    cur = next
  }
  if (path[path.length - 1] !== target) path.push(target)
  return path
}
// exactly n notes from just after s to the target: the walk, with a detour (up or down first, then on) to fit
function line(R, s, target, n, r) {
  const opts = []
  for (const dir of [1, -1]) {
    let via = s
    for (let d = 0; d <= 7; d++) {
      const p = d ? [...walk(R, s, via, 12), ...walk(R, via, target, 16)] : walk(R, s, target, 16)
      if (p.length >= n) opts.push(p)
      via = dir > 0 ? up(R, via) : down(R, via)
    }
  }
  if (!opts.length) { const p = walk(R, s, target, 16); while (p.length < n) p.unshift(p[0] ?? target); return p.slice(-n) }
  opts.sort((a, b) => Math.abs(a.length - n) - Math.abs(b.length - n) || r() - 0.5)
  const best = opts.filter(p => p.length === opts[0].length)
  return best[Math.floor(r() * best.length)].slice(-n)
}
const inRaga = (R, s) => R.swaras.includes(pcOf(s))

// ---- the sections -------------------------------------------------------------------------------------------------------
// a resting note other than where the line is, in [lo, hi]
function nyasIn(R, lo, hi, cur, r, prefer = null) {
  const c = []
  for (const v of [...R.nyas, R.vadi, R.samvadi, ...(prefer ?? [])]) for (const o of [-12, 0, 12]) { const n = v + o; if (n >= lo && n <= hi && n !== cur && inRaga(R, n)) c.push(n) }
  return c.length ? c[Math.floor(r() * c.length)] : 0
}
function alap({ R, at, beats, r }) {
  const out = []
  // the stages: low register, the middle, up to the high Sa, home
  const stages = [[-12, 2, [0]], [-3, 9, [R.vadi]], [4, 14, [12]], [-1, 12, [0]]]
  let t = at, cur = 0
  const per = beats / stages.length
  out.push([t, 0, 3, {}])
  t += 3.5
  stages.forEach(([lo, hi, close], si) => {
    const stop = at + per * (si + 1)
    while (t < stop - 2) {
      const closing = t > stop - 6
      let target = closing ? close[0] : nyasIn(R, lo, hi, cur, r)
      if (target === cur) target = nyasIn(R, lo, hi, cur, r)
      const pak = !closing && r() < 0.25 ? R.pakad[Math.floor(r() * R.pakad.length)] : null
      const path = pak && Math.abs(pak[0] - cur) <= 4 ? pak : line(R, cur, target, 2 + Math.floor(r() * 4), r)
      for (let i = 0; i < path.length && t < stop - 0.5; i++) {
        const last = i === path.length - 1, n = path[i]
        const d = last ? Math.min(stop - t, [2, 2.5, 3, 4][Math.floor(r() * 4)]) : [0.5, 0.75, 1, 1, 1.5][Math.floor(r() * 5)]
        const prev = out[out.length - 1], orn = {}
        if (prev && Math.abs(prev[1] - n) <= 4 && prev[1] !== n && r() < 0.5) orn.meend = prev[1] - n
        if (R.andolan.includes(pcOf(n)) && d >= 1) orn.andolan = true
        out.push([t, n, d, orn])
        t += d
      }
      cur = out[out.length - 1][1]
      t += r() < 0.5 ? 0.5 : 1 // a breath
    }
    t = Math.max(t, stop)
  })
  return out
}
// jor: a note per beat along the ways toward resting notes, the chikari on the off-beats
function jor({ R, at, beats, r }) {
  const out = []
  let cur = 0, path = []
  for (let b = at; b < at + beats - 1e-6; b += 1) {
    if (!path.length) path = line(R, cur, nyasIn(R, -3, 12, cur, r), 4, r)
    const n = path.shift()
    out.push([b, n, 0.5, {}], [b + 0.5, 12, 0.25, { chikari: true }], [b + 0.75, 12, 0.25, { chikari: true }])
    cur = n
  }
  return out
}
// a gat (16-beat cycles): 4-beat phrases each heading for a resting note, the last leading to the sam's note
function gat({ R, at, cycles, r, register = 0, land = 0 }) {
  const out = []
  const RH = [[1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1, 1, 1, 1], [2, 1, 1]]
  const lo = register - 3, hi = Math.min(register + 12, 15)
  let cur = register
  for (let c = 0; c < cycles; c++) {
    const t0 = at + 16 * c
    for (let q = 0; q < 4; q++) {
      const rh = RH[Math.floor(r() * RH.length)], last = q === 3 && c === cycles - 1
      const target = last ? down(R, land) === land ? land : up(R, down(R, land)) === land ? down(R, land) : land : nyasIn(R, lo, hi, cur, r)
      const notes = line(R, cur, target, rh.length, r)
      let b = t0 + 4 * q
      for (let i = 0; i < rh.length; i++) { out.push([b, notes[i], rh[i], {}]); b += rh[i] }
      cur = notes[notes.length - 1]
    }
  }
  // the sam: the landing note on beat 1 of the next cycle
  out.push([at + 16 * cycles, land, 1, {}])
  return out
}
// a tihai of a phrase ending exactly on the sam C: the phrase (p beats, its last note at e), gaps g
export function tihai(phrase, C, g = 0.5) {
  const p = phrase.reduce((m, [b, , d]) => Math.max(m, b + d), 0), e = phrase[phrase.length - 1][0]
  const out = []
  for (let k = 0; k < 3; k++) {
    const s = C - e - (2 - k) * (p + g)
    for (const [b, n, d, o] of phrase) out.push([s + b, n, d, { ...(o ?? {}), tihai: k + 1 }])
  }
  return out
}
// taans: 16th-note runs up the aroha and down the avaroha, in groups (alankars) — `beats` beats from `at`
function taans({ R, at, beats, r }) {
  const out = []
  let t = at, cur = 0
  while (t < at + beats - 1e-6) {
    const kind = r()
    let seq = []
    if (kind < 0.4) seq = [...walk(R, cur, 12, 12), ...walk(R, 12, 0, 12)] // up and down
    else if (kind < 0.7) { // groups of three up the aroha: S R G, R G M, …
      let a = 0
      for (let j = 0; j < 4; j++) { const b = up(R, a), c = up(R, b); seq.push(a, b, c); a = b }
      seq.push(...walk(R, a, 0, 8))
    } else seq = [...walk(R, cur, R.vadi + 12 > 14 ? R.vadi : R.vadi + 12, 8), ...walk(R, R.vadi + 12 > 14 ? R.vadi : R.vadi + 12, 0, 12)]
    for (const n of seq) {
      if (t >= at + beats - 1e-6) break
      out.push([t, n, 0.25, {}])
      t += 0.25
    }
    cur = out[out.length - 1][1]
    // round up to the beat
    t = Math.ceil(t - 1e-6)
  }
  return out
}

// the whole performance on Sa (MIDI)
export function composeRaga({ raga, r, length = 'normal' }) {
  const R = RAGAS[raga]
  const plan = length === 'short'
    ? [['alap', 24], ['gat', 32], ['taans', 32], ['jhala', 16]]
    : [['alap', length === 'long' ? 48 : 40], ['jor', 24], ['gat', 32], ['antara', 32], ['taans', 32], ['jhala', 32]]
  const sections = [], sitar = [], bansuri = [], tabla = [], swar = [], manjira = []
  let at = 0
  let gatStart = null
  for (const [name, beats] of plan) {
    sections.push([at, name])
    if (name === 'alap') { sitar.push(...alap({ R, at, beats, r })); swar.push([at, 1]) }
    if (name === 'jor') sitar.push(...jor({ R, at, beats, r }))
    if (name === 'gat' || name === 'antara') {
      if (gatStart == null) gatStart = at
      const g = gat({ R, at, cycles: beats / 16, r, register: name === 'antara' ? 7 : 0, land: name === 'antara' ? 12 : R.vadi > 7 ? R.vadi - 12 : R.vadi })
      sitar.push(...g.filter(([b]) => b < at + beats))
      if (name === 'antara') bansuri.push(...g.filter(([b]) => b < at + beats).map(([b, n, d]) => [b + 0.5, n, Math.max(0.5, d), {}]).filter(([b]) => b < at + beats)) // the flute shadows the sitar half a beat later
      swar.push([at, 0.7])
    }
    if (name === 'taans') {
      // sawal-jawab: 4 beats sitar, 4 beats bansuri; the last 8 beats a tihai on the sitar and the flute together
      const run = taans({ R, at, beats: beats - 8, r })
      for (const e of run) (Math.floor((e[0] - at) / 4) % 2 ? bansuri : sitar).push(e)
      const ph = walk(R, 7, 0, 6).map((n, i) => [i * 0.5, n, 0.5, {}])
      const th = tihai(ph, at + beats, 0.5)
      sitar.push(...th)
      bansuri.push(...th.map(([b, n, d, o]) => [b, n + 12, d, o]))
    }
    if (name === 'jhala') {
      let cur = 0, path = []
      for (let b = at; b < at + beats - 8 - 1e-6; b += 1) {
        if (!path.length) path = line(R, cur, nyasIn(R, -3, 12, cur, r), 4, r)
        const n = path.shift()
        sitar.push([b, n, 0.25, {}], [b + 0.25, 12, 0.25, { chikari: true }], [b + 0.5, 12, 0.25, { chikari: true }], [b + 0.75, 12, 0.25, { chikari: true }])
        cur = n
      }
      const ph = [[0, 12, 0.25, {}], [0.25, 11 % 12 === 11 && inRaga(R, 11) ? 11 : down(R, 12), 0.25, {}], [0.5, 7, 0.5, {}], [1, 0, 0.5, {}]]
      sitar.push(...tihai(ph.filter(([, n]) => inRaga(R, n)), at + beats, 0.5))
      bansuri.push([at + beats, 12, 2, {}])
    }
    // the tabla: the theka in every cycle of the gat on (doubled in the jhala), a tukda before the end
    if (['gat', 'antara', 'taans', 'jhala'].includes(name)) {
      for (let b = at; b < at + beats - 1e-6; b += 1) {
        const m = ((b - gatStart) % 16 + 16) % 16
        const dugun = name === 'jhala'
        tabla.push([b, THEKA[m], m === 0 ? 1 : 0.75])
        if (dugun) tabla.push([b + 0.5, THEKA[(2 * m + 1) % 16], 0.55])
        if (TALI[m]) manjira.push([b, TALI[m]])
      }
    }
    at += beats
  }
  tabla.push([at, 'dha', 1])
  manjira.push([at, 'sam'])
  swar.push([at, 1])
  sitar.sort((a, b) => a[0] - b[0])
  bansuri.sort((a, b) => a[0] - b[0])
  // the end: the last note held on the sam
  sitar.push([at, 0, 3, {}])
  return { sections, sitar, bansuri, tabla, swar, manjira, length: at + 3, gatStart }
}
