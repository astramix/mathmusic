// Arabic maqam music composed by its sayr — the path a melody takes through the maqam — for the generator's 'maqam'
// style. Pitches are MIDI numbers with quarter tones (63.5 = E𝄳4), the scales those of src/modes.js (24-EDO, the
// Cairo 1932 theory).
//
//   sayr      a section dwells in a region of the maqam and its phrases come to rest on its pillars: the lower jins
//             around the tonic (qarar), the climb to the ghammaz (the note where the upper jins begins), the upper jins
//             up to the octave, the way down — descending, Rast takes B♭ instead of B𝄳 (its upper jins becomes Nahawand)
//             — and the qafla, the closing cadence onto the tonic from above.
//   phrases   two bars each, a section AA′BA: the second phrase keeps the first one's opening bar and finds another
//             ending, the third climbs, the fourth brings back the opening bar and closes. Notes move by step; the
//             pillars fall on the strong beats.
//   taqsim    a free improvisation (irregular durations, breaths between the phrases) over a drone: it starts low,
//             rises to the ghammaz, peaks, comes down and closes with a qafla.
//   taḥwīl    a modulation: one section in a related maqam on the same tonic (Bayati → Saba, Rast → Suznak, Sikah →
//             Huzam…) or on the ghammaz, then back.
//   iqa'      the rhythm cycles on a sixteenth grid: maqsum, baladi, saidi, malfuf (D = dum, T = tek, k = ka).
import { MODES } from './modes.js'

// the maqamat this style plays: the ghammaz degree, the pillars, the modulations ([mode id, tonic shift in semitones]),
// the descending alterations (degree → semitones from the tonic)
export const MAQAMAT = {
  rast: { ghammaz: 4, pillars: [0, 2, 4], mods: [['suznak', 0], ['bayati', 2]], down: { 6: 10 } },
  bayati: { ghammaz: 3, pillars: [0, 2, 3], mods: [['saba', 0], ['hijazRast', 0]] },
  saba: { ghammaz: 2, pillars: [0, 2, 3], mods: [['bayati', 0]] },
  sikah: { ghammaz: 2, pillars: [0, 2, 4], mods: [['huzam', 0]] },
  huzam: { ghammaz: 2, pillars: [0, 2, 4], mods: [['sikah', 0]] },
  hijazRast: { ghammaz: 3, pillars: [0, 2, 3], mods: [['bayati', 0]] },
  suznak: { ghammaz: 4, pillars: [0, 2, 4], mods: [['rast', 0]] },
  iraq: { ghammaz: 2, pillars: [0, 2, 4], mods: [['bayati', 3.5]] },
}
export const IQA = {
  maqsum: 'D-T---T-D---T---', baladi: 'D-D---T-D---T---', saidi: 'D-T---D-D---T---', malfuf: 'D--T--T-D--T--T-',
}
const BAR_RHYTHMS = [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [0.25, 0.25, 0.5, 1, 1, 1], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]]
const END_RHYTHMS = [[1, 1, 2], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2], [1.5, 0.5, 2]]

// a scale on a tonic (MIDI, may be fractional) → the pitch of degree d (any octave); `down`: the descending form
export function degreePitch(mode, tonic, d, down = false) {
  const iv = MODES[mode].iv, o = Math.floor(d / 7), k = ((d % 7) + 7) % 7
  const alt = down ? MAQAMAT[mode]?.down?.[k] : undefined
  return tonic + 12 * o + (alt != null ? alt : iv[k])
}
// the pitch classes (fractional, from C) a mode allows on a tonic, both directions
export function maqamPcs(mode, tonic) {
  const iv = MODES[mode].iv, pcs = iv.map(v => (((tonic + v) % 12) + 12) % 12)
  for (const v of Object.values(MAQAMAT[mode]?.down ?? {})) pcs.push((((tonic + v) % 12) + 12) % 12)
  return pcs
}

// one phrase of `bars` bars ending on degree `end`: a beam search over degrees in [lo, hi]
function phrase({ rhythm, lo, hi, end, start = null, pillars, r }) {
  const slots = []
  let b = 0
  for (const d of rhythm) { slots.push([b, d]); b += d }
  let beam = [{ line: [], cost: 0 }]
  slots.forEach(([b, d], i) => {
    const next = [], last = i === slots.length - 1, strong = Math.abs(b - Math.round(b)) < 1e-6 && Math.round(b) % 2 === 0
    for (const st of beam) {
      const p = st.line[st.line.length - 1]
      for (let g = lo - 1; g <= hi + 1; g++) {
        let c = st.cost + 0.9 * r()
        if (g < lo || g > hi) c += 6
        const k = ((g % 7) + 7) % 7
        if (strong && !pillars.includes(k)) c += 2.5
        if (last && g !== end) c += 1e4
        if (i === 0 && start != null && g !== start) c += 1e4
        if (p) {
          const x = Math.abs(g - p[1])
          c += x === 0 ? (d < 0.5 || p[2] < 0.5 ? 2.5 : 4) : x === 1 ? 0 : x === 2 ? 1.6 : x === 3 ? 3.5 : 9
          const pp = st.line[st.line.length - 2]
          if (pp && Math.abs(p[1] - pp[1]) >= 2 && (Math.sign(p[1] - pp[1]) === Math.sign(g - p[1]))) c += 3 // a leap is followed by a step back
          if (pp && pp[1] === g && p[1] !== g && d >= 1) c += 1.5 // a long note no neighbour turn
          if (last && g !== p[1] - 1 && g !== p[1] + 1) c += 3 // the cadence by step…
          if (last && g === p[1] - 1) c -= 1 // …from above (the qafla)
        }
        next.push({ line: [...st.line, [b, g, d]], cost: c })
      }
    }
    next.sort((a, b) => a.cost - b.cost)
    beam = next.slice(0, 30)
  })
  return beam[0].line
}

// a section of `bars` bars (a multiple of 8): AA′BA over a region; the last phrase closes on `close`
function section({ mode, at, bars, region: [lo, hi], ends, close, r, pillars, lead = null }) {
  const out = [], phrases = bars / 2
  const pick = a => a[Math.floor(r() * a.length)]
  let first = null
  for (let p = 0; p < phrases; p++) {
    const kind = p % 4 // A A′ B A
    const end = p === phrases - 1 ? close : ends[p % ends.length]
    let line
    if ((kind === 1 || kind === 3) && first) {
      // the opening bar again, a new second bar to another resting note
      const r2 = pick(END_RHYTHMS)
      const open = first.filter(([b]) => b < 4)
      const tail = phrase({ rhythm: r2, lo, hi, end, start: null, pillars, r })
      // the tail must begin near where the opening bar left off
      line = [...open, ...tail.map(([b, g, d]) => [b + 4, g, d])]
      const j = open.length
      if (Math.abs(line[j][1] - line[j - 1][1]) > 2) line = phrase({ rhythm: [...first.filter(([b]) => b < 4).map(e => e[2]), ...r2], lo, hi, end, start: open[0][1], pillars, r })
    } else {
      const rh = [...pick(BAR_RHYTHMS), ...pick(END_RHYTHMS)]
      line = phrase({ rhythm: rh, lo: kind === 2 ? lo + 1 : lo, hi: kind === 2 ? hi + 1 : hi, end, start: lead, pillars, r })
      if (p === 0) first = line
    }
    lead = null
    const t0 = at + 8 * p
    for (const [b, g, d] of line) out.push([t0 + b, g, d])
  }
  return out
}

// a taqsim of `beats` beats: phrases separated by breaths, its sayr low → ghammaz → high → down → qafla. A phrase walks
// from where the last one rested to its own resting note by step (a turn or a skip of a third now and then), in
// sixteenths and eighths, and holds the resting note; everything on a sixteenth grid.
function taqsim({ at, beats, gh, r }) {
  const out = [], q = v => Math.round(v * 4) / 4
  // [lowest, highest, resting notes] per stage
  const stages = [[-2, 3, [0, 2, 1]], [0, gh + 1, [gh, 2, gh]], [gh - 1, 8, [7, gh + 2, 7]], [gh - 2, 7, [gh, 4, gh]], [-2, gh, [2, 1, 0]]]
  let t = at, cur = 0
  const per = beats / stages.length
  stages.forEach(([lo, hi, rests], si) => {
    const stop = at + per * (si + 1)
    let k = 0
    while (t < stop - 1.5) {
      const target = si === stages.length - 1 && t > stop - 4 ? 0 : Math.max(lo, Math.min(hi, rests[k++ % rests.length]))
      // the path: steps toward the target, with a neighbour turn or an overshoot now and then
      const path = []
      let g = cur
      if (g === target) path.push(g + (r() < 0.5 ? 1 : -1))
      let guard = 0
      while (g !== target && guard++ < 12) {
        const dir = Math.sign(target - g)
        if (r() < 0.15 && Math.abs(target - g) > 2) g += 2 * dir // a skip of a third
        else if (r() < 0.12 && path.length) { path.push(g - dir); g = g } // a turn: the note below, then on
        else g += dir
        path.push(g)
      }
      if (path[path.length - 1] !== target) path.push(target)
      for (let i = 0; i < path.length && t < stop - 0.25; i++) {
        const last = i === path.length - 1
        const d = last ? Math.min(stop - t, [1.5, 2, 2.5, 3][Math.floor(r() * 4)]) : [0.25, 0.25, 0.5, 0.5, 0.75][Math.floor(r() * 5)]
        out.push([q(t), Math.max(lo - 1, Math.min(hi + 1, path[i])), q(Math.max(0.25, Math.min(d, stop - t)))])
        t = q(t + d)
      }
      cur = out[out.length - 1][1]
      t = q(t + (r() < 0.6 ? 0.5 : 1)) // a breath
    }
    t = Math.max(t, stop)
  })
  return out.filter(([b]) => b < at + beats - 1e-6).map(([b, g, d]) => [b, g, Math.min(d, at + beats - b)])
}

// the whole piece on a tonic (MIDI, the octave of the melody's qarar) → { sections, melody, taqsims, drone, iqa, keys }:
// notes [beat, MIDI (quarter tones fractional), length]; keys [[beat, mode, tonic shift]]
export function composeMaqam({ mode, tonic, r, length = 'normal' }) {
  const M = MAQAMAT[mode], gh = M.ghammaz, pillars = M.pillars
  const [modMode, modShift] = M.mods[Math.floor(r() * M.mods.length)]
  const iqaA = ['maqsum', 'baladi', 'saidi'][Math.floor(r() * 3)]
  const long = length === 'long', short = length === 'short'
  const plan = [
    ['taqsim', 'taqsim', 8],
    ['dulab', 'A', 4],
    ['lower jins', 'A', 8],
    ['ghammaz', 'B', 8],
    ...(short ? [] : [['tahwil', 'M', 8]]),
    ...(short ? [] : [['taqsim II', 'taqsim', 8]]),
    ['lower jins', 'A2', 8],
    ...(long ? [['ghammaz', 'B', 8]] : []),
    ['qafla', 'F', 8],
  ]
  const sections = [], melody = [], taqsims = [], drone = [], iqa = [], keys = []
  let at = 0
  for (const [name, kind, bars] of plan) {
    sections.push([at, name])
    const beats = bars * 4, inMod = kind === 'M'
    keys.push([at, inMod ? modMode : mode, inMod ? modShift : 0])
    if (kind === 'taqsim') {
      taqsims.push({ at, beats, notes: taqsim({ at, beats, gh, r }) })
      for (let b = at; b < at + beats - 1e-6; b += 4) drone.push([b, 0, 4])
      iqa.push([at, null])
    } else {
      const reg = kind === 'B' ? [gh - 1, 8] : kind === 'F' ? [-1, gh + 3] : kind === 'M' ? [-1, gh + 2] : [-2, gh + 1]
      const ends = kind === 'B' ? [gh, 7, gh + 2, gh] : kind === 'F' ? [gh, 2, 1] : [2, 0, gh, 1]
      const close = kind === 'B' ? gh : 0
      const bodyBars = kind === 'A' && bars === 4 ? 4 : bars
      const notes = bodyBars === 4
        ? (() => { const l = phrase({ rhythm: [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 1, 2, 2], lo: -1, hi: gh + 1, end: 0, start: 0, pillars, r }); return l.map(([b, g, d]) => [at + b, g, d]) })()
        : section({ mode: inMod ? modMode : mode, at, bars: bodyBars, region: reg, ends, close, r, pillars })
      for (const e of notes) melody.push([...e, inMod ? 1 : 0])
      iqa.push([at, kind === 'F' ? 'malfuf' : kind === 'B' ? (iqaA === 'maqsum' ? 'baladi' : 'maqsum') : iqaA])
    }
    at += beats
  }
  // degrees → pitches, in the mode of each section; a degree with a descending form takes it when the line goes down
  const keyOf = b => { let k = keys[0]; for (const x of keys) if (x[0] <= b + 1e-6) k = x; return k }
  const toPitch = line => line.map(([b, g, d], i) => {
    const [, m, sh] = keyOf(b), next = line[i + 1]
    const down = next ? next[1] < g : (line[i - 1]?.[1] ?? g) > g
    return [b, degreePitch(m, tonic + sh, g, down), d]
  })
  return {
    sections, keys, iqa, length: at, modulation: { mode: modMode, shift: modShift }, iqaA,
    melody: toPitch(melody.map(([b, g, d]) => [b, g, d])),
    taqsims: taqsims.map(t => ({ ...t, notes: toPitch(t.notes) })),
    drone: drone.map(([b, g, d]) => [b, tonic + g - 12, d]),
  }
}
