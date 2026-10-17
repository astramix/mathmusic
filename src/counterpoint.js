// Counterpoint by the rules — the generator's fugue style (src/fugue.js) and the tests.
//   · counterVoice: a voice composed against voices already there, slot by slot (dynamic programming over the notes
//     of the key) with the costs of the species rules: consonance wherever a note begins on a beat (thirds and sixths
//     best, fifths and octaves allowed — fifths avoided where the line must invert at the octave), dissonance only
//     between the beats and only as a passing or neighbour note (stepped into, stepped out of), the fourth dissonant
//     against the lowest voice, no parallel fifths or octaves, no hidden ones in the outer voices, no crossing, steps
//     first, a leap answered by a step back, no tritone or augmented second, the leading tone rising. `contexts` lets
//     one line be judged against several textures at once: a countersubject against the answer (below it) and against
//     the subject (above it) — invertible counterpoint at the octave by construction;
//   · check: every rule above as a list of faults (the tests run it over whole fugues);
//   · speciesCanon: a melody that agrees with its own echo d beats later an octave (or a fifth) lower, found by a
//     beam search — each new note is chosen against the note the echo plays then, which is already known;
//   · impliedChords: the chords the voices make (for the continuo).
// Notes are [beat, MIDI, length]; a key is { tonic, mode } or { tonic, pcs } (a mode's own scale).
import { pc, SCALES } from './theory.js'

export const ic = (a, b) => (((b - a) % 12) + 12) % 12
const PERFECT = new Set([0, 7]), IMPERFECT = new Set([3, 4, 8, 9])
const mapIn = (C, p) => (C.map ? C.map(p) : p + C.shift)
// is the interval between a and b consonant; `lowest`: the lower note is the lowest of the texture (then the fourth
// is a dissonance)
export const consonant = (a, b, lowest = true, key = null) => {
  const k = ic(Math.min(a, b), Math.max(a, b))
  return (PERFECT.has(k) || IMPERFECT.has(k) || (!lowest && k === 5)) && !spelledDissonance(a, b, key)
}
// in minor the raised 7th against ♭6̂ or ♭3̂ only sounds like a third or a sixth: it is an augmented second / diminished
// seventh (B♭ – C♯ in D minor), a diminished fourth / augmented fifth (C♯ – F)
export function spelledDissonance(a, b, key) {
  if (!key || key.mode !== 'minor' || key.pcs) return false
  const t = ((key.tonic % 12) + 12) % 12, x = pc(a - t), y = pc(b - t)
  return (x === 11 && (y === 8 || y === 3)) || (y === 11 && (x === 8 || x === 3))
}
// the note sounding in a voice at beat t (null in a rest), and the index of that note
export function noteAt(notes, t) {
  let lo = 0, hi = notes.length - 1, k = -1
  while (lo <= hi) { const m = (lo + hi) >> 1; if (notes[m][0] <= t + 1e-9) (k = m), (lo = m + 1); else hi = m - 1 }
  return k >= 0 && t < notes[k][0] + notes[k][2] - 1e-9 ? k : -1
}
export const at = (notes, t) => { const k = noteAt(notes, t); return k < 0 ? null : notes[k][1] }
// the last note a voice began before t, if it ended no more than a beat before (a breath between)
const lastBefore = (notes, t) => {
  for (let k = notes.length - 1; k >= 0; k--) { const [b, n, d] = notes[k]; if (b < t - 1e-6) return b + d > t - 1 - 1e-6 ? n : null }
  return null
}
// the key's notes: natural minor plus the raised 6th and 7th (melodic and harmonic minor); a mode's own scale as given
export function keyPcs(key) {
  if (key.pcs) return key.pcs.map(p => ((p % 12) + 12) % 12)
  const base = (key.mode === 'minor' ? SCALES.minor : SCALES.major).map(v => (v + key.tonic) % 12)
  return key.mode === 'minor' ? [...base, (key.tonic + 9) % 12, (key.tonic + 11) % 12] : base
}
const onBeat = b => Math.abs(b - Math.round(b)) < 1e-6
const halfBar = b => Math.abs(b / 2 - Math.round(b / 2)) < 1e-6
// a note that may be dissonant: short, between the half bars, stepped into and out of (a passing or neighbour note)
export function passable(notes, k) {
  const [b, n, d] = notes[k], p = notes[k - 1], q = notes[k + 1]
  if (d > 1 + 1e-6 || halfBar(b) || (d > 0.5 + 1e-6 && onBeat(b))) return false
  return !!p && !!q && Math.abs(p[0] + p[2] - b) < 1e-6 && Math.abs(q[0] - b - d) < 1e-6 && Math.abs(n - p[1]) <= 2 && Math.abs(q[1] - n) <= 2 && n !== p[1] && n !== q[1]
}

// ---- a voice against others ------------------------------------------------------------------------------------------
// rhythm: [[b, d], …] (slots); contexts: [{ voices: [{ notes, above }], shift }] — the new note p sounds as p + shift
// in that context, `above` = that voice is above the new one; pins: [[beat, [pcs]]] — the slot starting there takes one of
// those pitch classes; chordAt(b) → pcs of the chord (strong slots prefer its tones); bass: the new voice is the bass
// (prefers roots); prev: the note before the first slot (the line goes on from it).
export function counterVoice({ contexts, rhythm: rhythmIn, key, lo, hi, r = () => 0.5, invertible = false, pins = [], chordAt = null, bass = false, prev = null, next = null, maxHold = bass ? 2 : 3, pcs: pcsIn = null, roots = null, noise = 0.6 }) {
  const pcs = pcsIn ?? keyPcs(key), cands = []
  for (let m = Math.ceil(lo); m <= hi; m++) if (pcs.includes(pc(m))) cands.push(m)
  const tonic = ((key.tonic % 12) + 12) % 12, leading = (tonic + 11) % 12, raised6 = (tonic + 9) % 12, minor = key.mode === 'minor' && !key.pcs
  // a long note under another voice's note that is not a passing note must agree with it: such a slot is cut where
  // that note begins, so it may move there — the pieces that keep the same pitch are tied back together afterwards
  const rhythm = []
  for (const [b, d] of rhythmIn) {
    const cuts = new Set()
    for (const C of contexts) for (const v of C.voices) {
      for (let j = Math.max(0, noteAt(v.notes, b)); j < v.notes.length; j++) {
        const vb = v.notes[j][0]
        if (vb >= b + d - 1e-6) break
        if (vb > b + 1e-6 && !passable(v.notes, j)) cuts.add(Math.round(vb * 1000) / 1000)
      }
    }
    const pts = [b, ...[...cuts].sort((x, y) => x - y), b + d]
    for (let k = 0; k + 1 < pts.length; k++) rhythm.push(k ? [pts[k], pts[k + 1] - pts[k], true] : [pts[k], pts[k + 1] - pts[k]])
  }
  const S = rhythm.length
  const chromaticStep = (a, b) => minor && [[(tonic + 10) % 12, leading], [(tonic + 8) % 12, raised6]].some(([u, v]) => (pc(a) === u && pc(b) === v) || (pc(a) === v && pc(b) === u))
  const strong = i => rhythm[i][2] || onBeat(rhythm[i][0]) || rhythm[i][1] >= 1 - 1e-6
  // per context and slot: what each voice sounds at the slot's start, and the notes beginning inside the slot
  const ctx = contexts.map(c => ({
    shift: c.shift ?? 0,
    map: c.map ?? null,
    voices: c.voices,
    slots: rhythm.map(([b, d]) => c.voices.map(v => {
      const k = noteAt(v.notes, b), inside = []
      for (let j = Math.max(0, k); j < v.notes.length; j++) {
        const [vb] = v.notes[j]
        if (vb >= b + d - 1e-6) break
        if (vb > b + 1e-6) inside.push(j)
      }
      return { k, start: k < 0 ? null : v.notes[k][1], inside }
    })),
  }))
  const pinAt = new Map(pins.map(([b, p]) => [Math.round(b * 1000), p]))
  // tie: the note goes on from the slot before (no new attack): only what begins in the other voices here is judged
  const vertical = (i, p, tie = false) => {
    let c = 0
    const st = strong(i), ch = chordAt?.(rhythm[i][0])
    for (const C of ctx) {
      const q = mapIn(C, p), os = C.slots[i]
      const sounding = os.filter(o => o.start != null).map(o => o.start)
      const lowest = Math.min(q, ...sounding)
      os.forEach((o, vi) => {
        const v = C.voices[vi]
        if (o.start != null) {
          if (v.above ? o.start < q : o.start > q) c += 400 // crossing
          const low = Math.min(q, o.start), k = ic(low, Math.max(q, o.start))
          const cons = (PERFECT.has(k) || IMPERFECT.has(k) || (low !== lowest && k === 5)) && !spelledDissonance(q, o.start, key)
          if (tie) {
            if (!cons && Math.abs(v.notes[o.k][0] - rhythm[i][0]) < 1e-6) c += passable(v.notes, o.k) ? 1.5 : 1000
          } else if (!cons) c += st ? 1000 : 0 // weak dissonances are judged by their approach and departure (move)
          else if (tie) { /* judged above */ } else if (k === 0 && q === o.start) c += 8 // a unison
          else if (PERFECT.has(k)) c += invertible && k === 7 ? 9 : 1.2
          if (Math.abs(q - o.start) > 19) c += 4
        }
        // the other voice moves while this note holds: its note must agree, unless it is itself a passing note
        for (const j of o.inside) {
          const n = v.notes[j][1], low = Math.min(q, n)
          const lw = low === Math.min(q, ...C.slots[i].map((x, y) => at(C.voices[y].notes, v.notes[j][0])).filter(x => x != null))
          if (!consonant(q, n, lw, key)) c += passable(v.notes, j) ? 1.5 : 1000
          if (v.above ? n < q : n > q) c += 400
        }
      })
      // three voices: the bass prefers the root of the sonority, the inner and upper voices a complete triad
      if (st && sounding.length >= 1) {
        const set = new Set([...sounding, q].map(pc))
        if (set.size === 1) c += 3
        if (bass) {
          const up = [...set].map(s => ic(pc(q), s))
          const rootPos = up.every(u => [0, 3, 4, 7].includes(u)), sixth = up.every(u => [0, 3, 4, 8, 9].includes(u))
          c += rootPos ? 0 : sixth ? 1.5 : 3
        }
      }
    }
    if (ch && st && !ch.includes(pc(p))) c += 25
    if (roots && st && halfBar(rhythm[i][0]) && roots(rhythm[i][0]) != null && pc(p) !== roots(rhythm[i][0])) c += 6
    const pin = pinAt.get(Math.round(rhythm[i][0] * 1000))
    if (pin && !pin.includes(pc(p))) c += 200
    return c
  }
  const dissonantAt = (i, p) => ctx.some(C => {
    const q = mapIn(C, p), os = C.slots[i], lowest = Math.min(q, ...os.filter(o => o.start != null).map(o => o.start))
    return os.some(o => o.start != null && !consonant(q, o.start, Math.min(q, o.start) === lowest, key))
  })
  const melodic = (i, a, b, prevLeap) => {
    if (rhythm[i]?.[2] && a === b) return 0 // a piece of a held note
    let c = 0
    const s = b - a, x = Math.abs(s)
    c += x === 0 ? (bass ? 4 : 3) : x <= 2 ? 0 : x <= 4 ? 1.2 : x === 5 || x === 7 ? 2.5 : x === 6 ? 1000 : x === 8 || x === 9 ? 4.5 : x === 12 ? 5 : 1000
    if (x === 1 && chromaticStep(a, b)) c += 1000 // C – C♯: the same degree raised (an augmented unison)
    if (x === 0 && prevLeap === 0) c += 4 // three times the same note
    if (minor && x === 3 && ((pc(a) === (tonic + 8) % 12 && pc(b) === leading) || (pc(b) === (tonic + 8) % 12 && pc(a) === leading))) c += 1000 // ♭6 – ♯7: an augmented second
    if (prevLeap && Math.abs(prevLeap) > 4 && (Math.sign(prevLeap) === Math.sign(s) || x > 2)) c += 6 // a leap is answered by a step back
    if (prevLeap && Math.abs(prevLeap) > 2 && x > 2 && Math.sign(prevLeap) === Math.sign(s)) c += 3 // two leaps one way
    if (minor && pc(a) === leading && pc(b) !== tonic) c += 60 // the raised 7th goes to the tonic
    if (minor && pc(a) === raised6 && pc(b) !== leading) c += 60 // the raised 6th goes on up to it (melodic minor)
    if (minor && pc(b) === raised6 && s < 0) c += 60
    if (minor && pc(b) === leading && s < 0) c += 60
    if (!minor && pc(a) === leading && pc(b) !== tonic && strong(i)) c += 1.5
    if (!strong(i) && dissonantAt(i, b) && (x > 2 || x === 0)) c += 1000
    if (i >= 1 && !strong(i - 1) && dissonantAt(i - 1, a) && (x > 2 || x === 0)) c += 1000
    return c
  }
  const harmonic = (i, a, b) => {
    let c = 0
    for (const C of ctx) {
      const qa = mapIn(C, a), qb = mapIn(C, b)
      C.voices.forEach((v, k) => {
        const o1 = C.slots[i][k]
        // the other voice's note just before this slot (it may have moved inside the previous one)
        const n0 = lastBefore(v.notes, rhythm[i][0]), n1 = o1.start
        if (n0 == null || n1 == null) return
        const i0 = ic(Math.min(qa, n0), Math.max(qa, n0)), i1 = ic(Math.min(qb, n1), Math.max(qb, n1))
        const both = qb !== qa && n1 !== n0
        if (both && PERFECT.has(i1) && i0 === i1) c += 1000 // parallel (or contrary) fifths and octaves
        const outer = bass || C.voices.every(w => !w.above) || C.voices.every(w => w.above)
        if (outer && both && PERFECT.has(i1) && Math.sign(qb - qa) === Math.sign(n1 - n0) && (v.above ? Math.abs(n1 - n0) > 2 : Math.abs(qb - qa) > 2)) c += 12 // hidden, the upper voice leaping
      })
    }
    return c
  }
  // dynamic programming
  const best = [], from = [], leap = [], tied = [], held = []
  for (let i = 0; i < S; i++) {
    tied.push(new Uint8Array(cands.length))
    held.push(new Float64Array(cands.length))
    best.push(new Float64Array(cands.length).fill(Infinity))
    from.push(new Int32Array(cands.length).fill(-1))
    leap.push(new Float64Array(cands.length))
    for (let j = 0; j < cands.length; j++) {
      const p = cands[j]
      const u = vertical(i, p) + noise * r()
      if (u >= 1e9) continue
      if (i === 0) {
        best[0][j] = u + (prev != null ? melodic(0, prev, p, 0) + harmonic(0, prev, p) : 0)
        leap[0][j] = prev != null ? p - prev : 0
        continue
      }
      for (let k = 0; k < cands.length; k++) {
        if (best[i - 1][k] === Infinity) continue
        const c = best[i - 1][k] + melodic(i, cands[k], p, leap[i - 1][k]) + harmonic(i, cands[k], p) + u
        if (c < best[i][j]) (best[i][j] = c), (from[i][j] = k), (leap[i][j] = p - cands[k]), (tied[i][j] = 0)
      }
      // or held on from the slot before (a longer note — not past maxHold beats), if that one was no passing dissonance
      const holdLen = (tied[i - 1][j] ? held[i - 1][j] : rhythm[i - 1][1]) + rhythm[i][1]
      if (best[i - 1][j] < Infinity && !(!strong(i - 1) && dissonantAt(i - 1, p)) && (rhythm[i][2] || holdLen <= maxHold + 1e-6)) {
        const c = best[i - 1][j] + vertical(i, p, true) + (rhythm[i][2] ? 0 : 1.2)
        if (c < best[i][j]) (best[i][j] = c), (from[i][j] = j), (leap[i][j] = leap[i - 1][j]), (tied[i][j] = 1), (held[i][j] = holdLen)
      }
    }
  }
  // the last note held on a strong slot: a weak dissonance there has no way out
  for (let j = 0; j < cands.length; j++) {
    if (!strong(S - 1) && dissonantAt(S - 1, cands[j])) best[S - 1][j] += 1000
    if (next == null && minor && pc(cands[j]) === raised6) best[S - 1][j] += 60
    // the note that follows (already written): reached by a singable interval
    if (next != null) {
      const x = Math.abs(next - cands[j]), tEnd = rhythm[S - 1][0] + rhythm[S - 1][1]
      best[S - 1][j] += x === 6 || x === 10 || x === 11 || x > 12 ? 1000 : x > 4 ? 3 : 0
      // and no parallels into it
      for (const C of ctx) for (const v of C.voices) {
        const n0 = lastBefore(v.notes, tEnd), n1 = at(v.notes, tEnd), qa = mapIn(C, cands[j]), qb = mapIn(C, next)
        if (n0 == null || n1 == null || n0 === n1 || qa === qb) continue
        const i0 = ic(Math.min(qa, n0), Math.max(qa, n0)), i1 = ic(Math.min(qb, n1), Math.max(qb, n1))
        if (PERFECT.has(i1) && i0 === i1) best[S - 1][j] += 1000
      }
    }
  }
  let j = 0
  for (let k = 1; k < cands.length; k++) if (best[S - 1][k] < best[S - 1][j]) j = k
  const raw = new Array(S)
  for (let i = S - 1; i >= 0; i--) { raw[i] = [rhythm[i][0], cands[j], rhythm[i][1], tied[i][j] === 1]; j = from[i][j] }
  const out = []
  for (const [b, n, d, tie] of raw) {
    const last = out[out.length - 1]
    if (tie && last && last[1] === n) last[2] += d
    else out.push([b, n, d])
  }
  out.cost = best[S - 1].reduce((a, v) => Math.min(a, v), Infinity)
  return out
}

// a rhythm against other voices: eighths where they hold, quarters where they run, a half now and then on beat 1 or 3
export function freeRhythm(others, from, to, r, { busy = 0.65, halves = 0.2, end = 2 } = {}) {
  const out = []
  let b = from
  const moving = (t0, t1) => others.reduce((n, v) => n + v.filter(([vb]) => vb > t0 + 1e-6 && vb < t1 - 1e-6).length, 0)
  while (b < to - end - 1e-6) {
    const m = moving(b - 1e-3, b + 1)
    if (halfBar(b) && b + 2 <= to - end + 1e-6 && moving(b - 1e-3, b + 2) >= 3 && r() < halves) { out.push([b, 2]); b += 2; continue }
    if (m === 0 && r() < busy) { out.push([b, 0.5], [b + 0.5, 0.5]); b += 1; continue }
    if (m === 0 && r() < 0.3) { out.push([b, 0.75], [b + 0.75, 0.25]); b += 1; continue }
    out.push([b, 1])
    b += 1
  }
  if (b < to - 1e-6) out.push([b, to - b])
  return out
}

// ---- the rules, as faults ----------------------------------------------------------------------------------------------
// voices: [notes…] from the top down; returns [{ at, kind, voices, text }] — strong-beat dissonances, dissonances that are
// not passing or neighbour notes, parallel fifths and octaves, crossings, augmented seconds and tritone leaps
export function check(voices, { key = null, from = -Infinity, to = Infinity, skip = [] } = {}) {
  const faults = [], add = (at, kind, vs, text) => { if (at >= from - 1e-6 && at < to - 1e-6 && !skip.some(([a, b]) => at >= a - 1e-6 && at < b - 1e-6)) faults.push({ at, kind, voices: vs, text }) }
  const times = [...new Set(voices.flatMap(v => v.map(([b]) => Math.round(b * 1000) / 1000)))].sort((a, b) => a - b)
  for (let a = 0; a < voices.length; a++) for (let b = a + 1; b < voices.length; b++) {
    let last = null
    for (const t of times) {
      const ka = noteAt(voices[a], t), kb = noteAt(voices[b], t)
      if (ka < 0 || kb < 0) { last = null; continue }
      const na = voices[a][ka][1], nb = voices[b][kb][1]
      const startA = Math.abs(voices[a][ka][0] - t) < 1e-6, startB = Math.abs(voices[b][kb][0] - t) < 1e-6
      if (!startA && !startB) continue
      if (na < nb) add(t, 'crossing', [a, b], `voices ${a + 1} and ${b + 1} cross`)
      const sounding = voices.map(v => at(v, t)).filter(x => x != null), lowest = Math.min(...sounding)
      const lo = Math.min(na, nb)
      if (!consonant(na, nb, lo === lowest, key)) {
        const ok = (startA ? passable(voices[a], ka) : true) && (startB ? passable(voices[b], kb) : true)
        if (!ok) add(t, 'dissonance', [a, b], `${ic(lo, Math.max(na, nb))} semitones between voices ${a + 1} and ${b + 1}`)
      }
      if (last && last.ka !== ka && last.kb !== kb) {
        const i0 = ic(Math.min(last.na, last.nb), Math.max(last.na, last.nb)), i1 = ic(lo, Math.max(na, nb))
        if (PERFECT.has(i1) && i0 === i1 && last.na !== na && last.nb !== nb) add(t, 'parallel', [a, b], `parallel ${i1 ? 'fifths' : 'octaves'} between voices ${a + 1} and ${b + 1}`)
      }
      last = { ka, kb, na, nb }
    }
  }
  voices.forEach((v, i) => {
    for (let k = 1; k < v.length; k++) {
      const [b, n] = v[k], [pb, p, pd] = v[k - 1]
      if (Math.abs(pb + pd - b) > 1e-6) continue
      const x = Math.abs(n - p)
      if (x === 6 || x === 10 || x === 11 || x > 12) add(b, 'leap', [i], `a leap of ${x} semitones in voice ${i + 1}`)
      if (key && key.mode === 'minor' && x === 3) {
        const t = ((key.tonic % 12) + 12) % 12
        if ([pc(n), pc(p)].includes((t + 8) % 12) && [pc(n), pc(p)].includes((t + 11) % 12)) add(b, 'augmented second', [i], `♭6–♯7 in voice ${i + 1}`)
      }
    }
  })
  return faults
}

// ---- the canon -------------------------------------------------------------------------------------------------------
// the leader (dux) of a canon whose follower (comes) plays it `delay` beats later, `interval` semitones away (−12: an
// octave below, −7: a fifth below: the same notes moved, a real canon); the
// rhythm is chosen bar by bar from florid patterns (the follower has the same rhythm a bar later), and the notes by a beam
// search: consonance where either voice begins a note on a beat, between the beats passing notes only, no parallels,
// steps and filled leaps. The follower stops before the end and both cadence: leader 2̂–1̂, follower 7̂–1̂ or onto 3̂.
const FLORID = [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [1, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [2, 0.5, 0.5, 1], [1, 0.5, 0.5, 0.5, 0.5, 1]]
export function speciesCanon({ key, bars, delay = 4, interval = -12, lo, hi, r = () => 0.5, width = 48 }) {
  const pcs = keyPcs(key).filter(p => key.mode !== 'minor' || p !== (key.tonic + 9) % 12) // the raised 6th only by step to ♯7 — leave it out
  const cands = []
  for (let m = lo; m <= hi; m++) if (pcs.includes(pc(m))) cands.push(m)
  const tonic = ((key.tonic % 12) + 12) % 12, leading = (tonic + 11) % 12
  // the rhythm: florid bars, the first a plain one, the last two a cadence (a half, then a whole)
  const rhythm = []
  for (let bar = 0; bar < bars; bar++) {
    const pat = bar === 0 ? [2, 1, 1] : bar === bars - 1 ? [4] : bar === bars - 2 ? [1, 1, 1, 1] : FLORID[Math.floor(r() * FLORID.length)]
    let b = bar * 4
    for (const d of pat) { rhythm.push([b, d]); b += d }
  }
  const N = rhythm.length
  const strongAt = b => onBeat(b)
  // the follower's note at beat t, given the leader's notes so far
  const comesAt = (dux, t) => { const k = noteAt(dux, t - delay); return k < 0 ? null : { n: dux[k][1] + interval, k, start: Math.abs(dux[k][0] + delay - t) < 1e-6 } }
  let beam = [{ notes: [], cost: 0 }]
  for (let i = 0; i < N; i++) {
    const [b, d] = rhythm[i], next = []
    for (const st of beam) {
      const prev = st.notes[st.notes.length - 1]
      for (const m of cands) {
        if (i === 0 && pc(m) !== tonic) continue
        if (i === N - 1 && pc(m) !== tonic) continue
        let c = st.cost + 0.7 * r()
        if (prev) {
          const s = m - prev[1], x = Math.abs(s)
          c += x === 0 ? 4 : x <= 2 ? 0 : x <= 4 ? 1.3 : x === 5 || x === 7 ? 2.6 : x === 8 || x === 9 ? 5 : x === 12 ? 6 : 1e4
          if (key.mode === 'minor' && x === 3 && [pc(m), pc(prev[1])].includes(leading)) c += 1e4
          if (pc(prev[1]) === leading && pc(m) !== tonic) c += 1e4
          if (pc(m) === leading && s < 0) c += 12
          if (x === 1 && [[(tonic + 10) % 12, leading]].some(([u, v]) => (pc(m) === u && pc(prev[1]) === v) || (pc(m) === v && pc(prev[1]) === u))) c += 1e4
          if (i === N - 1 && x === 0) c += 20
          if (i === N - 1 && x > 2) c += 1e4 // the cadence: 2̂ – 1̂ or 7̂ – 1̂
          if (i === N - 1) c += Math.abs(m - (lo + hi) / 2) / 3 // the last note not at the bottom
          const ppp = st.notes[st.notes.length - 3], pp2 = st.notes[st.notes.length - 2]
          if (ppp && pp2 && ppp[1] === prev[1] && pp2[1] === m) c += 6 // no swinging between two notes
          if (i === N - 1 && key.mode === 'minor' && pc(prev[1]) === (tonic + 10) % 12) c += 30 // … with the leading tone, not the subtonic
          const pp = st.notes[st.notes.length - 2]
          if (pp) { const l = prev[1] - pp[1]; if (Math.abs(l) > 4 && (Math.sign(l) === Math.sign(s) || x > 2)) c += 6 }
          // a short note between the beats that the follower makes dissonant must be a passing note: check the previous
          // short note now that we know how it is left
          if (st.pendingStep && (x > 2 || x === 0)) c += 1e4
        }
        // every moment inside this note where either voice begins one
        const cand = [...st.notes, [b, m, d]]
        let pending = false
        const pts = [b]
        for (let t = b + 0.25; t < b + d - 1e-6; t += 0.25) { const e = comesAt(cand, t); if (e && e.start) pts.push(t) }
        for (const t of pts) {
          const e = comesAt(cand, t)
          if (!e || t >= (bars - 1) * 4 - 1e-6) continue // the last bar is a cadence of its own
          if (m <= e.n) c += 1e4 // the follower stays below
          const k = ic(e.n, m), cons = (PERFECT.has(k) || IMPERFECT.has(k)) && !spelledDissonance(e.n, m, key)
          if (!cons) {
            // ours, if it begins here: a passing note if it is left by step; theirs, if it begins here: one in the leader's line
            let ok = true
            if (t === b) { if (!strongAt(b) && d <= 0.5 + 1e-6 && prev && Math.abs(m - prev[1]) <= 2 && m !== prev[1]) pending = true; else ok = false }
            if (ok && e.start && !(passable(cand, e.k) && !strongAt(t))) ok = false
            c += ok ? 1 : 1e4
          } else if (PERFECT.has(k)) c += 2.5
          if (m - e.n > 19) c += 5
          // parallels: the previous simultaneity
          const t0 = t - 1e-3, pk = noteAt(cand, t0), pe = comesAt(cand, t0)
          if (pk >= 0 && pe && cand[pk][1] !== m && pe.n !== e.n) {
            const i0 = ic(pe.n, cand[pk][1])
            if (PERFECT.has(k) && i0 === k) c += 1e4
          }
        }
        if (c < 1e4) next.push({ notes: cand, cost: c, pendingStep: pending })
      }
    }
    next.sort((a, b) => a.cost - b.cost)
    // keep the beam varied: at most a few states ending on the same note
    const seen = new Map()
    beam = next.filter(s => { const k = s.notes[s.notes.length - 1][1]; const n = (seen.get(k) ?? 0) + 1; seen.set(k, n); return n <= Math.ceil(width / 6) }).slice(0, width)
    if (!beam.length) return null
  }
  const dux = beam[0].notes
  // the follower: the leader moved, up to the bar before the end; then a cadence under the leader's last two notes
  const cut = (bars - 1) * 4
  const comes = dux.filter(([b]) => b + delay < cut - 1e-6).map(([b, n, d]) => [b + delay, n + interval, Math.min(d, cut - b - delay)])
  // the follower's last note: under the leader's tonic its root or third (a sixth below), by step if it can
  const end = dux[dux.length - 1][1], third = end - (key.mode === 'minor' ? 9 : 8), lastC = comes[comes.length - 1]?.[1] ?? end + interval
  const duxPrev = dux[dux.length - 2][1], triad = [0, key.mode === 'minor' ? 3 : 4, 7].map(v => (tonic + v) % 12)
  const opts = []
  for (let n = end - 24; n < end - 2; n++) {
    if (!triad.includes(pc(n))) continue
    const x = Math.abs(n - lastC), k0 = ic(Math.min(lastC, duxPrev), Math.max(lastC, duxPrev)), k1 = ic(n, end)
    if (x === 6 || x === 10 || x === 11 || x > 12) continue
    if (PERFECT.has(k1) && k0 === k1 && n !== lastC) continue // no parallels into the last chord
    opts.push([n, x + (pc(n) === (tonic + 7) % 12 ? 8 : pc(n) === tonic ? 3 : 0)])
  }
  let fin = opts.sort((a, b) => a[1] - b[1])[0]?.[0] ?? third
  // musica ficta at the cadence: the follower's subtonic before the end becomes the leading tone, rising to the tonic
  const lc = comes[comes.length - 1]
  if (key.mode === 'minor' && lc && pc(lc[1]) === (tonic + 10) % 12) {
    const clash = dux.some(([b, n, d]) => b < lc[0] + lc[2] - 1e-6 && b + d > lc[0] + 1e-6 && [3, 8].includes(pc(n - tonic)))
    const duxEnd = ic(end, lc[1] + 2) // the final interval must not be a parallel perfect one
    if (!clash && end > lc[1] + 2 && !(PERFECT.has(duxEnd) && PERFECT.has(ic(Math.min(lc[1] + 1, duxPrev), Math.max(lc[1] + 1, duxPrev))) && ic(Math.min(lc[1] + 1, duxPrev), Math.max(lc[1] + 1, duxPrev)) === duxEnd)) {
      lc[1] += 1
      fin = lc[1] + 1
    }
  }
  comes.push([cut, fin, 4])
  return { dux, comes, rhythm }
}

// ---- the harmony the voices imply ------------------------------------------------------------------------------------
// every `step` beats the chord whose notes the voices sound most on the beats (the bass weighted), from the chords of
// the local key — [at, len, root pc, quality]; keyAt(b) gives the local key
const TRIADS = [['', [0, 4, 7]], ['m', [0, 3, 7]], ['dim', [0, 3, 6]]]
export function impliedChords(voices, from, to, keyAt, step = 2) {
  const out = []
  for (let b = from; b < to - 1e-6; b += step) {
    const key = keyAt(b), pcs = keyPcs(key), natural = pcs.slice(0, 7)
    const hist = new Array(12).fill(0)
    let low = Infinity
    for (let t = b; t < b + step - 1e-6; t += 0.5) for (const v of voices) {
      const n = at(v, t)
      if (n == null) continue
      hist[pc(n)] += onBeat(t) ? (halfBar(t) ? 3 : 2) : 0.5
      if (halfBar(t - b) || t === b) low = Math.min(low, n)
    }
    if (low === Infinity) continue
    hist[pc(low)] += 3
    // a bare octave or unison: the key's own triad on it
    const present = hist.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0)
    if (present.length === 1) {
      const rt = present[0], g = pc(rt - key.tonic), sc = key.mode === 'minor' ? SCALES.minor : SCALES.major, i = sc.indexOf(g)
      const third = i < 0 ? 'm' : key.mode === 'minor' && g === 7 ? '' : pc(sc[(i + 2) % 7] - g) === 4 ? '' : 'm'
      out.push([b, step, rt, third])
      continue
    }
    let best = null, bs = -Infinity
    for (let rt = 0; rt < 12; rt++) {
      if (!pcs.includes(rt)) continue
      for (const [q, iv] of TRIADS) {
        const tones = iv.map(v => (rt + v) % 12)
        if (!tones.every(t => pcs.includes(t))) continue
        if (tones.some(t => hist[t] === 0 && t !== (rt + 7) % 12 && t !== rt) && tones.filter(t => hist[t] > 0).length < 2) continue
        let s = tones.reduce((a, t) => a + hist[t], 0) - 1.2 * hist.reduce((a, v, i) => a + (tones.includes(i) ? 0 : v), 0) + (pc(low) === rt ? 3 : pc(low) === tones[1] ? 1 : 0)
        if (tones.every(t => natural.includes(t))) s += 0.3
        if (q === 'dim' && ![(key.tonic + 11) % 12, ...(key.mode === 'minor' ? [(key.tonic + 2) % 12] : [])].includes(rt)) continue
        if (q === 'dim') s -= 1
        // a missing third decides by the leading tone: V is major in minor
        if (key.mode === 'minor' && rt === (key.tonic + 7) % 12 && q === '' && hist[(rt + 3) % 12] === 0) s += 0.6
        if (s > bs) (bs = s), (best = { root: rt, quality: q })
      }
    }
    if (best) out.push([b, step, best.root, best.quality])
  }
  return out
}
