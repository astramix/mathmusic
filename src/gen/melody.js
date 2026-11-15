// Melodies: a theme moved to a key and mode, composed on chords, ornamented — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { parseKey, roman, SCALES, pc } from '../theory.js'
import { midiOf } from './util.js'

// ---- melodies → a key ------------------------------------------------------------------------------
const MAJ = SCALES.major, MIN = SCALES.minor
// semitones above the tonic → { deg (0–6), oct, alt } in a mode (the leading tone of minor = deg 6, alt +1)
function toDegree(s, mode) {
  const sc = mode === 'minor' ? MIN : MAJ, oct = Math.floor(s / 12), p = ((s % 12) + 12) % 12
  const d = sc.indexOf(p)
  if (d >= 0) return { deg: d, oct, alt: 0 }
  const below = sc.findLastIndex(v => v < p)
  return { deg: below, oct, alt: p - sc[below] }
}
// Theme in a new key: notes in MIDI, chords as objects. Same mode: a plain transposition. Other mode
// (modal themes only): degrees map; a degree's accidental follows the chord sounding over it.
export function adaptTheme(mel, key) {
  const src = parseKey(mel.key), base = midiOf(mel.base)
  const tonicSrc = Math.floor((base - src.tonic) / 12) * 12 + src.tonic // a tonic at or below the base
  const per = mel.per, n = mel.chords.length, length = per * n
  const chordsSrc = mel.chords.map(s => roman(s, src))
  let chords, notes
  if (src.mode === key.mode) {
    const shift = ((key.tonic - src.tonic + 18) % 12) - 6 // the nearer direction
    chords = mel.chords.map(s => roman(s, key))
    notes = mel.notes.map(([b, m, d]) => [b, base + m + shift, d])
  } else {
    chords = mel.chords.map(s => roman(swapMode(s, src.mode), key))
    const sc = key.mode === 'minor' ? MIN : MAJ
    const shift = ((key.tonic - src.tonic + 18) % 12) - 6
    notes = mel.notes.map(([b, m, d]) => {
      const s = base + m - tonicSrc, dg = toDegree(s, src.mode)
      let alt = src.mode === 'minor' && dg.deg === 6 && dg.alt === 1 ? 0 : dg.alt // leading tone → the major 7th
      if (src.mode === 'minor' && dg.deg === 5 && dg.alt === 1) alt = 0 // melodic-minor 6th → major 6th
      const ch = chords[Math.floor(b / per) % n], root = tonicSrc + shift + 12 * dg.oct + sc[dg.deg]
      let midi = root + alt
      // the degree's accidental follows the chord: if the other variant is a chord tone, use it
      for (const v of [root - 1, root + 1, root]) if (v !== midi && ch.tones.includes(pc(v)) && !ch.tones.includes(pc(midi)) && Math.abs(v - root) <= 1) midi = v
      // the leading tone over the dominant in minor
      if (key.mode === 'minor' && dg.deg === 6 && pc(ch.root - key.tonic) === 7) midi = root + 1
      return [b, midi, d]
    })
  }
  return { id: mel.id, title: mel.title, from: mel.from, feel: mel.feel, per, length, chords, notes, chordsSrc }
}
const SWAP_MAJ_TO_MIN = { I: 'i', ii: 'iiø', iii: 'III', IV: 'iv', V: 'V', vi: 'VI', vii: 'VII' }
const SWAP_MIN_TO_MAJ = { i: 'I', ii: 'ii', III: 'iii', iv: 'IV', V: 'V', v: 'V', VI: 'vi', VII: 'bVII' }
function swapMode(sym, from) {
  const m = sym.match(/^(b|#)?(iv|i{1,3}|vi{0,2}|IV|I{1,3}|VI{0,2})(ø|°)?(.*)$/)
  if (!m || m[1]) return sym
  const [, , num, dim, q] = m
  const table = from === 'major' ? SWAP_MAJ_TO_MIN : SWAP_MIN_TO_MAJ
  let out = table[num] ?? num
  // qualities: drop what no longer fits the new chord's type
  let quality = q
  if (from === 'major') {
    if (num === 'I' || num === 'IV') quality = /maj|add|^$/.test(q) ? (q.includes('7') || q.includes('9') ? '7' : '') : q // i7, iv7
    else if (num === 'ii') quality = /7|9/.test(q) ? '7' : ''
    else if (num === 'iii' || num === 'vi') quality = /7|9/.test(q) ? 'maj7' : ''
    else if (num === 'V') quality = /13|9/.test(q) ? '7' : q.replace('add9', '')
  } else {
    if (num === 'i' || num === 'iv') quality = /7|9/.test(q) ? 'maj7' : ''
    else if (num === 'III' || num === 'VI') quality = /7/.test(q) ? '7' : ''
    if (num === 'ii') out = 'ii'
    if (dim) quality = '7'.repeat(q.includes('7') ? 1 : 0)
  }
  return out + quality
}

// ---- composing melodies -------------------------------------------------------------------------
// New pitches for a rhythm over chords: chord tones on strong beats and long notes, scale steps in
// between, an arch-shaped contour, leaps filled by steps the other way, cadence on the tonic (or on
// the fifth/second degree for an open "question" ending).
export function compose({ rhythm, chordAt, key, lo, hi, r, end = 'close' }) {
  const scale = (key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12)
  const out = []
  let prev = null, leap = 0
  const span = rhythm.length ? rhythm[rhythm.length - 1][0] + rhythm[rhythm.length - 1][1] : 1
  const peakAt = 0.45 + 0.3 * r(), height = (hi - lo) * (0.55 + 0.35 * r())
  rhythm.forEach(([b, d], i) => {
    const ch = chordAt(b), last = i === rhythm.length - 1
    const strong = (Math.abs(b - Math.round(b)) < 1e-6 && Math.round(b) % 2 === 0) || d >= 1.5
    let pcs = strong ? ch.tones : scale
    // over V in minor the scale has the leading tone, never the minor 7th
    if (key.mode === 'minor' && pc(ch.root - key.tonic) === 7) pcs = pcs.map(p => (p === (key.tonic + 10) % 12 ? (key.tonic + 11) % 12 : p))
    if (last) pcs = end === 'close' ? [key.tonic] : [(key.tonic + 7) % 12, (key.tonic + 2) % 12].filter(p => ch.tones.includes(p) || p === (key.tonic + 7) % 12)
    const u = b / span, target = lo + (hi - lo) * 0.25 + height * Math.max(0, 1 - Math.abs(u - peakAt) / Math.max(peakAt, 1 - peakAt))
    let best = null, bestCost = Infinity
    for (let m = lo; m <= hi; m++) {
      if (!pcs.includes(pc(m))) continue
      let cost = 0.35 * Math.abs(m - target)
      if (prev != null) {
        const iv = m - prev, a = Math.abs(iv)
        cost += a <= 2 ? 0 : a <= 4 ? 1 : a <= 7 ? 2.6 : 5 + a
        if (a === 6) cost += 6 // no tritone leaps
        if (a === 0) cost += out.length > 1 && out[out.length - 2][1] === prev ? 4 : 0.8 // not three in a row
        if (leap && Math.sign(iv) === Math.sign(leap)) cost += 2.5 // after a leap: step back
        if (key.mode === 'minor' && a === 3 && [pc(m), pc(prev)].every(p => [8, 11].includes((p - key.tonic + 12) % 12))) cost += 8 // no augmented second
      }
      cost += 1.6 * r()
      if (cost < bestCost) (bestCost = cost), (best = m)
    }
    if (best == null) best = prev ?? Math.round((lo + hi) / 2)
    leap = prev != null && Math.abs(best - prev) > 4 ? best - prev : 0
    prev = best
    out.push([b, best, d])
  })
  return out
}
// small variations of a theme: an upper neighbour on some long notes, passing tones in some leaps
function ornament(notes, key, chordAt, r) {
  const scale = (key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12)
  const out = []
  const scaleStep = (m, dir) => {
    let v = m + dir
    while (!scale.includes(pc(v))) v += dir
    return v
  }
  notes.forEach(([b, m, d], i) => {
    const next = notes[i + 1]
    // a turn at the end of a long note (upper neighbour and back), in its last quarter — on a weak part
    if (d >= 1.5 && r() < 0.35) {
      const q = d / 4
      out.push([b, m, d - q], [b + d - q, scaleStep(m, 1), q / 2], [b + d - q / 2, m, q / 2])
    } else if (next && Math.abs(next[1] - m) >= 3 && Math.abs(next[1] - m) <= 5 && d >= 1 && r() < 0.5) {
      // a passing tone into the next note, in the last quarter
      const q = d / 4, p = scaleStep(m, Math.sign(next[1] - m))
      out.push([b, m, d - q], [b + d - q, p, q])
    } else out.push([b, m, d])
  })
  return out
}

// Irish and Scottish ornaments: a cut — a grace note a step (or two) above, a sixteenth of a beat before the note it
// sharpens; a roll on a long note — the note, the step above, the note, the step below, the note (as quick graces)
function celticOrnament(notes, key, r) {
  const scale = (key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12)
  const step = (m, dir) => { let v = m + dir; while (!scale.includes(pc(v))) v += dir; return v }
  const out = [], g = 0.0625
  notes.forEach(([b, m, d], i) => {
    const prev = notes[i - 1]
    if (d >= 1 && r() < 0.45) {
      // a roll: graces in the first eighth of the note
      out.push([b, m, 2 * g], [b + 2 * g, step(m, 1), g], [b + 3 * g, m, g], [b + 4 * g, step(m, -1), g], [b + 5 * g, m, d - 5 * g])
    } else if (prev && (prev[1] === m || d >= 0.5) && b - prev[0] >= 2 * g && r() < 0.3) {
      // a cut: the grace above taken from the end of the note before
      const last = out[out.length - 1]
      if (last && last[0] + last[2] > b - g + 1e-9 && last[2] > 2 * g) last[2] -= g
      out.push([b - g, step(m, d >= 1 ? 2 : 1), g], [b, m, d])
    } else out.push([b, m, d])
  })
  return out.sort((x, y) => x[0] - y[0])
}

// ---- voicing ----------------------------------------------------------------------------------------
function chordTones(ch, style) {
  const ivs = ch.ivs
  if (style === 'rootless' && ivs.length >= 4) return ivs.slice(1).map(i => (ch.root + i) % 12) // 3–7–9(–13): the bass has the root
  // jazz: the rootless A/B voicings of the pianists — 3 5 7 9 on a maj7 or m7, 3 13 7 9 on a dominant, ♭3 ♭5 ♭7 11 on a ø7
  if (style === 'jazz' && ivs.length >= 4) {
    const q = ivs.join()
    const set = q === '0,4,7,10' ? [4, 9, 10, 2] : q === '0,3,6,10' ? [3, 6, 10, 5] : q === '0,3,6,9' ? [3, 6, 9, 0] : [ivs[1], ivs[2], ivs[3], 2]
    return set.map(i => (ch.root + i) % 12)
  }
  if (ivs.length >= 5) return [0, ivs[1], ivs[3], ivs[4]].map(i => (ch.root + i) % 12)
  return ivs.map(i => (ch.root + i) % 12)
}

export { MAJ, MIN, celticOrnament, chordTones, ornament }
