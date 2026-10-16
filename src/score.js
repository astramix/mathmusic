// A song as a score — the notes its tracks play, written the way a musician reads them: bars in the song's meter,
// note values split at the beats (classical grouping), ties, rests, triplets where the beat divides in three,
// beams by the beat, accidentals by the key signature and the bar, chord symbols, microtonal ornaments as grace
// notes. Shared by the app's staff view (viz/app/scoreview.js), MusicXML export (src/musicxml.js) and the tests.
//
//   buildScore(song, { parts: ['flute', 'piano'], key, mode, harmony }) → {
//     title, bpm, key, signature, bars: [{ n, at, len, time: '4/4', key, sig (its signature), section?, chords: [{ at, symbol }] }],
//     parts: [{ key, name, clef, bars: [[event…] per bar] }] }
//   event: { at (ticks in the bar), dur, rest?, notes: [{ midi, sp (theory.spellParts), show (accidental drawn), tieStart, tieStop }],
//            type ('whole' … '64th'), dots, tuplet?: { actual: 3, normal: 2, first, last }, grace?: [note…], beams: ['begin'…] }
// Ticks: a quarter note = 48 (MusicXML divisions), so 64ths (3), triplet eighths (16) and triplet sixteenths (8) are whole.
// x (the song's beats) is a quarter note, or a dotted quarter in compound meters (song.meter '12/8': 112 BPM counts
// dotted quarters). Meters: song.meter ('4/4', '12/8', '7/8'…) or song.meters [[beat, '7/8'], …] per section.
import { spellParts, pc, chordName, roman, keyAt } from './theory.js'

export const DIV = 48 // ticks per quarter note
const VALUES = [[288, 'whole', 1], [192, 'whole', 0], [144, 'half', 1], [96, 'half', 0], [72, 'quarter', 1], [48, 'quarter', 0], [36, 'eighth', 1], [24, 'eighth', 0],
  [18, '16th', 1], [12, '16th', 0], [9, '32nd', 1], [6, '32nd', 0], [3, '64th', 0]]
const TRIPLET = [[32, 'quarter', 0], [24, 'eighth', 1], [16, 'eighth', 0], [8, '16th', 0], [4, '32nd', 0]] // inside a 3:2 beat
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e

// ---- meters --------------------------------------------------------------------------------------------------------
// '7/8' → { beats: 7, unit: 8, compound, xTicks (ticks per x), barTicks, groups (beat groups in ticks) }
export function parseMeter(m = '4/4') {
  const [N, D] = String(m).split('/').map(Number)
  const compound = D === 8 && N % 3 === 0 && N > 3
  const unitTicks = (4 / D) * DIV, barTicks = N * unitTicks
  let groups
  if (compound) groups = Array(N / 3).fill(3 * unitTicks)
  else if (D === 8) { // aksak: twos and a three at the end (7/8 = 2+2+3, 5/8 = 2+3, 9/8 = 2+2+2+3, 11/8 = 2+2+3+2+2)
    groups = N === 11 ? [2, 2, 3, 2, 2] : N % 2 ? [...Array((N - 3) / 2).fill(2), 3] : Array(N / 2).fill(2)
    groups = groups.map(g => g * unitTicks)
  } else groups = Array(N).fill(unitTicks)
  return { text: `${N}/${D}`, beats: N, unit: D, compound, xTicks: compound ? 72 : DIV, barTicks, groups }
}
// (a song that modulates says so in song.keys: each bar takes the signature and the spelling of its key)
// the song's bars: [{ n, at (x), len (x), meter }]
export function songBars(song) {
  const list = song.meters?.length ? song.meters : [[0, song.meter ?? '4/4']]
  const bars = []
  let x = 0, n = 1
  for (let i = 0; i < list.length; i++) {
    const m = parseMeter(list[i][1]), end = list[i + 1]?.[0] ?? song.length, len = m.barTicks / m.xTicks
    x = Math.max(x, list[i][0])
    while (x < end - 1e-6) {
      bars.push({ n: n++, at: x, len: Math.min(len, Math.max(len, 0)), meter: m })
      x += len
    }
  }
  return bars
}

// ---- reading a track ------------------------------------------------------------------------------------------------
// midi(x) sampled 48 times a beat → [{ n, s, e }] (x), a note held while it stays
export function readNotes(midi, length, rate = 48) {
  const out = [], open = new Map()
  const last = Math.ceil(length * rate)
  for (let k = 0; k <= last; k++) {
    const x = k / rate
    let now = []
    if (k < last) try { now = [].concat(midi(x) ?? []).filter(Number.isFinite).map(v => Math.round(v * 100) / 100) } catch {}
    const set = new Set(now)
    for (const [n, s] of open) if (!set.has(n)) { out.push({ n, s, e: x }); open.delete(n) }
    for (const n of set) if (!open.has(n)) open.set(n, x)
  }
  return out.sort((a, b) => a.s - b.s || a.n - b.n)
}
// onsets and ends onto a grid chosen beat by beat: sixteenths, triplet eighths or sixteenths, thirty-seconds — the one
// that fits best (the simplest when equal); a gate-shortened note (midi() off for the last 8%) keeps its full value
export function quantize(notes, bars, { swing = null } = {}) {
  const beatOf = x => { const b = bars.findLast(b => b.at <= x + 1e-9) ?? bars[0]; return { b, len: b.meter.compound ? 1 : (b.meter.groups[0] / b.meter.xTicks) } }
  const grids = (compound) => (compound ? [1 / 3, 1 / 6, 1 / 12] : [1 / 4, 1 / 3, 1 / 8, 1 / 6, 1 / 12, 1 / 16])
  const cost = { 0.25: 0, [1 / 3]: 0.02, 0.125: 0.01, [1 / 6]: 0.03, [1 / 12]: 0.05, 0.0625: 0.04 }
  // the grid of every beat, from the onsets in it
  const byBeat = new Map()
  for (const nt of notes) {
    const key = Math.floor(nt.s + 1e-6)
    if (!byBeat.has(key)) byBeat.set(key, [])
    byBeat.get(key).push(nt.s)
  }
  const gridAt = new Map()
  for (const [beat, ts] of byBeat) {
    const { b } = beatOf(beat)
    let best = null, bestC = Infinity
    for (const g of grids(b.meter.compound)) {
      let c = cost[g] ?? 0.05
      for (const t of ts) {
        const u = t - beat
        // a swung off-beat eighth (0.6) is an eighth: straight in the score, the swing is a direction
        const v = swing && near(u, swing, 0.03) ? 0.5 : u
        c += Math.abs(v - Math.round(v / g) * g) * 4
      }
      if (c < bestC - 1e-9) (bestC = c), (best = g)
    }
    gridAt.set(beat, best)
  }
  const q = x => {
    const beat = Math.floor(x + 1e-6), g = gridAt.get(beat) ?? gridAt.get(beat - 1) ?? 0.25, u = x - beat
    const v = swing && near(u, swing, 0.03) ? 0.5 : u
    return beat + Math.round(v / g) * g
  }
  // the written end: instruments let go a little early (a note sounds 78–97% of its value) — the nearest point after it
  // on the grid of its beat (the one the onsets chose) that it fits; else simply the nearest grid point
  const writtenEnd = (s, e) => {
    const beat = Math.floor(e - 1e-6), g = gridAt.get(beat) ?? gridAt.get(beat - 1) ?? 0.25
    for (let R = beat + Math.ceil((e - beat) / g - 1e-9) * g; R <= e + 0.55; R += g) {
      const f = (e - s) / (R - s)
      if (f >= 0.78 && f <= 0.97) return R
    }
    return q(e)
  }
  const out = notes.map(nt => { const s = q(nt.s); return { ...nt, s, e: Math.max(s + 1 / 16, writtenEnd(s, nt.e)) } })
  // legato: a note that stops just short of the next onset (articulation) is written up to it
  const starts = [...new Set(out.map(n => n.s))].sort((a, b) => a - b)
  for (const nt of out) {
    const next = starts.find(s => s > nt.s + 1e-9)
    if (next != null && nt.e < next && next - nt.e <= 0.07) nt.e = next
    if (next != null && nt.e > next && nt.e - next < 0.05) nt.e = next
  }
  return out
}

// ---- key signature --------------------------------------------------------------------------------------------------
const LETTERS = 'CDEFGAB', LF = [0, 2, 4, -1, 1, 3, 5] // letters on the chain of fifths
const SHARPS = 'FCGDAEB', FLATS = 'BEADGCF'
// → { fifths (a traditional signature), items: [{ letter, acc, sp }] — the altered letters in drawing order, alter }
export function keySignature(key, mode = null) {
  const tl = key.name ?? null
  const steps = key.steps ?? mode?.iv
  // a microtonal mode: a signature of its own (Rast: B𝄳 E𝄳 — as Arabic scores write it; Turkish Rast: B♭¹ F♯⁴)
  if (steps?.length === 7 && key.system !== 'cents' && (key.system || steps.some(v => !near(v, Math.round(v))))) {
    const sp = steps.map(v => spellParts(60 + key.tonic + v, key))
    const items = sp.filter(s => !near(s.acc, 0)).map(s => ({ letter: s.letter, acc: s.acc, sp: s }))
    // flats first, then sharps, each in its usual order (a mixed signature, as Turkish and Balkan scores write it)
    const order = it => (it.acc < 0 ? FLATS.indexOf(it.letter) : 10 + SHARPS.indexOf(it.letter))
    items.sort((a, b) => order(a) - order(b))
    return { fifths: null, items, alter: Object.fromEntries(items.map(it => [it.letter, it.acc])) }
  }
  if (key.system === 'cents') return { fifths: 0, items: [], alter: {} }
  // a seven-note mode whose notes are a diatonic set: its own signature (D dorian: none, E♭ dorian: five flats)
  let fifths = null
  if (steps?.length === 7) {
    const sp = steps.map(v => spellParts(60 + key.tonic + v, { ...key, steps }))
    const sh = sp.filter(s => s.acc === 1).map(s => s.letter), fl = sp.filter(s => s.acc === -1).map(s => s.letter)
    const ok = sp.every(s => [-1, 0, 1].includes(s.acc)) && (!sh.length || !fl.length)
    if (ok && sh.every(l => SHARPS.indexOf(l) < sh.length) && fl.every(l => FLATS.indexOf(l) < fl.length)) fifths = sh.length - fl.length
  }
  if (fifths == null) {
    const t = spellParts(60 + key.tonic, key), f = LF[LETTERS.indexOf(t.letter)] + 7 * Math.round(t.acc)
    fifths = f - (key.mode === 'minor' ? 3 : 0)
    if (fifths > 7) fifths -= 12
    if (fifths < -7) fifths += 12
  }
  const items = fifths > 0 ? [...SHARPS.slice(0, fifths)].map(l => ({ letter: l, acc: 1 })) : [...FLATS.slice(0, -fifths)].map(l => ({ letter: l, acc: -1 }))
  return { fifths, items, alter: Object.fromEntries(items.map(it => [it.letter, it.acc])) }
}

// ---- chords ---------------------------------------------------------------------------------------------------------
const TEMPLATES = [['', [0, 4, 7]], ['m', [0, 3, 7]], ['7', [0, 4, 7, 10]], ['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]], ['dim', [0, 3, 6]], ['m7b5', [0, 3, 6, 10]],
  ['dim7', [0, 3, 6, 9]], ['aug', [0, 4, 8]], ['sus4', [0, 5, 7]], ['6', [0, 4, 7, 9]], ['m6', [0, 3, 7, 9]],
  ['9', [0, 4, 7, 10, 2]], ['m9', [0, 3, 7, 10, 2]], ['maj9', [0, 4, 7, 11, 2]], ['13', [0, 4, 10, 2, 9]], ['7sus4', [0, 5, 7, 10]]]
const UNPITCHED = /drum|kick|snare|hat|perc|clap|paw|hiss|claw|beat|fx|sfx|noise|ambience|rain|vinyl|riser|taiko|tsuzumi|kane|crash|thunder|wind|purr/i
// The chord symbols of a song: a generated song's own HARMONY (its source), else found from what sounds — every half
// bar the pitch classes of the pitched tracks (the lowest note counts more) against triad and seventh templates
export function songChords(song, bars, key, source = null) {
  const rows = source && /const HARMONY = \[/.test(source) ? [...source.matchAll(/^\s*\[([\d.]+), ([\d.]+), [-\d.]+, \[[^\]]*\], '([^']*)'/gm)].map(m => ({ at: +m[1], len: +m[2], symbol: m[3] })) : null
  const out = []
  if (rows?.length) {
    for (const r of rows) if (!out.length || out[out.length - 1].symbol !== r.symbol || r.at >= out[out.length - 1].at + 4 - 1e-6) out.push({ at: r.at, symbol: r.symbol })
    return dedupe(out)
  }
  const tracks = Object.entries(song.tracks ?? {}).filter(([k, t]) => t && typeof t.midi === 'function' && !UNPITCHED.test(k)).map(([, t]) => t)
  let prev = null
  for (const b of bars) {
    const halves = b.len >= 3.5 && !b.meter.compound ? [[b.at, b.len / 2], [b.at + b.len / 2, b.len / 2]] : [[b.at, b.len]]
    for (const [a, len] of halves) {
      const hist = new Array(12).fill(0), bass = new Array(12).fill(0)
      for (let x = a; x < a + len - 1e-6; x += 0.25) {
        let lo = Infinity
        for (const t of tracks) {
          let m = []
          try { m = [].concat(t.midi(x) ?? []) } catch {}
          for (const v of m) if (Number.isFinite(v)) (hist[pc(v)] += 1), (lo = Math.min(lo, v))
        }
        if (lo < Infinity) (hist[pc(lo)] += 2), (bass[pc(lo)] += 1)
      }
      const total = hist.reduce((s, v) => s + v, 0)
      if (total < 3) continue
      let best = null, bestS = -Infinity
      const score = (r, q, iv) => {
        const inC = iv.reduce((s, i) => s + hist[(r + i) % 12], 0), outC = total - inC
        // tones the template names but nobody plays cost a little (a missing fifth hardly: rootless voicings drop it)
        const missing = iv.reduce((s, i) => s + (hist[(r + i) % 12] ? 0 : i === 7 ? 0.2 : 1), 0)
        return inC - 0.9 * outC - 0.25 * iv.length - 0.12 * total * missing / iv.length + 0.5 * hist[r] + 1.5 * bass[r] - (q === 'aug' || q === 'sus4' || q === 'dim7' ? 1 : 0)
      }
      for (let r = 0; r < 12; r++) for (const [q, iv] of TEMPLATES) {
        const s = score(r, q, iv)
        if (s > bestS) (bestS = s), (best = { root: r, quality: q })
      }
      // the chord before stays unless the new one explains the notes clearly better (no flicker inside a bar)
      if (prev && score(prev.root, prev.quality, TEMPLATES.find(t => t[0] === prev.quality)[1]) >= bestS - 0.15 * total) continue
      if (best && bestS > 0.25 * total) out.push({ at: a, symbol: chordName(best, keyAt(song, a, key)) }), (prev = best)
    }
  }
  return dedupe(out)
}
const dedupe = list => list.filter((c, i) => i === 0 || c.symbol !== list[i - 1].symbol)

// ---- which parts ----------------------------------------------------------------------------------------------------
// the melody (the highest part that sings one note at a time and is there a good while), the chords (the part with the
// most notes at once) and the bass (the lowest single line) — by listening to midi(), not by the tracks' names
export function guessParts(song) {
  const stats = []
  for (const [k, t] of Object.entries(song.tracks ?? {})) {
    if (!t || typeof t.midi !== 'function' || UNPITCHED.test(k)) continue
    let on = 0, mono = 0, sum = 0, cnt = 0, poly = 0, starts = 0, prev = ''
    for (let x = 0; x < song.length; x += 0.25) {
      let m = []
      try { m = [].concat(t.midi(x) ?? []).filter(Number.isFinite) } catch {}
      const key = m.join(',')
      if (key && key !== prev) starts++
      prev = key
      if (!m.length) continue
      on++
      if (m.length === 1) mono++
      poly += m.length
      for (const v of m) (sum += v), cnt++
    }
    if (on) stats.push({ k, density: on / (song.length * 4), mono: mono / on, mean: sum / cnt, poly: poly / on, len: (on * 0.25) / Math.max(1, starts) })
  }
  const lines = stats.filter(s => s.mono > 0.8 && s.density > 0.12)
  // a melody sings: it is there a lot, its notes are longer than an arpeggio's, it sits high; names help
  const LEAD = /lead|melod|theme|flute|violin|oboe|clarinet|voice|vocal|scat|hook|meow|shinobue|shakuhachi|horn|sax|trumpet|whistle|fiddle|ney|sitar|bansuri|epiano|sawlead|supersaw|pulse/i
  const NOT = /arp|counter|pad|star|sparkle|bell|chime|music ?box|harmony|bass|echo/i
  const melodic = s => s.density * Math.sqrt(s.len) * (LEAD.test(s.k) ? 1.8 : 1) * (NOT.test(s.k) ? 0.35 : 1) * (s.mean >= 58 ? 1 : 0.4)
  const lead = [...lines].sort((a, b) => melodic(b) - melodic(a))[0]?.k ?? stats[0]?.k
  const chords = stats.filter(s => s.poly >= 2.2 && s.density > 0.15 && s.k !== lead).sort((a, b) => b.density * b.poly - a.density * a.poly)[0]?.k
  const bass = lines.filter(s => s.k !== lead && s.mean < 55).sort((a, b) => a.mean - b.mean)[0]?.k
  return [lead, chords, bass].filter(Boolean)
}

// ---- writing durations ----------------------------------------------------------------------------------------------
// a stretch of `len` ticks from `p` (ticks in the bar) → notatable pieces [{ at, dur, type, dots, tuplet? }]: whole
// beats where the meter allows (a half on 1 or 3 of 4/4, a whole bar), otherwise split at the beats; inside a triplet
// beat the 3:2 values
function pieces(p, len, meter, triplet) {
  const out = [], bounds = [0]
  for (const g of meter.groups) bounds.push(bounds[bounds.length - 1] + g)
  const T = meter.barTicks
  const nextBound = q => bounds.find(b => b > q + 1e-9) ?? T
  while (len > 1e-9) {
    const beatStart = bounds.findLast(b => b <= p + 1e-9) ?? 0, onBeat = near(p, beatStart)
    const isTrip = triplet(beatStart)
    let take = null
    if (onBeat && !isTrip) {
      // whole groups: as long as it stays a single value and doesn't hide the middle of the bar (4/4: beats 1–2 | 3–4)
      const half = meter.beats === 4 && meter.unit === 4 ? 96 : null
      for (const [v, type, dots] of VALUES) {
        if (v > len + 1e-9 || !bounds.some(b => near(b, p + v)) && !near(p + v, T)) continue
        if (half && p < half && p + v > half && !(p === 0 && (v === 192 || v === 144))) continue
        if (half && p === 48 && v === 144) continue
        take = { dur: v, type, dots }
        break
      }
    }
    if (!take) {
      const end = Math.min(p + len, nextBound(p)), seg = end - p
      if (isTrip) {
        const rel = p - beatStart
        const ALIGN = { 32: 16, 24: 8, 16: 8, 8: 4, 4: 4 }
        for (const [v, type, dots] of TRIPLET) if (v <= seg + 1e-9 && near(rel % ALIGN[v], 0)) { take = { dur: v, type, dots, tuplet: true }; break }
        if (!take) take = { dur: Math.min(seg, 4), type: '32nd', dots: 0, tuplet: true }
      } else {
        for (const [v, type, dots] of VALUES) if (v <= seg + 1e-9 && near(p % (dots ? v / 3 : v / 2), 0)) { take = { dur: v, type, dots }; break }
        if (!take) take = { dur: Math.min(seg, 3), type: '64th', dots: 0 }
      }
    }
    out.push({ at: p, ...take })
    p += take.dur
    len -= take.dur
  }
  return out
}

// ---- the score ----------------------------------------------------------------------------------------------------
const CLEF = ns => {
  if (!ns.length) return 'treble'
  const s = [...ns].sort((a, b) => a - b), med = s[Math.floor(s.length / 2)]
  return med < 55 ? 'bass' : 'treble'
}
// staff position of a written note: 0 = the bottom line, steps of a line or space
export function staffStep(sp, clef) {
  const d = 7 * (sp.oct + 1) + 'CDEFGAB'.indexOf(sp.letter) // diatonic number, C-1 = 0
  return d - (clef === 'bass' ? 7 * 3 + 4 : 7 * 5 + 2) // bottom line: G2 in the bass clef, E4 in the treble
}
export function buildScore(song, { parts = null, key, mode = null, source = null, from = 0, to = null } = {}) {
  const bars = songBars(song).filter(b => b.at + b.len > from + 1e-6 && (to == null || b.at < to - 1e-6))
  const sig = keySignature(key, mode)
  const keys = parts ?? guessParts(song)
  const sw = (() => { const m = source?.match(/const SW = ([\d.]+)/); return m && +m[1] > 0.52 ? +m[1] : null })()
  const sections = song.sections ?? []
  const outBars = bars.map(b => {
    const k = keyAt(song, b.at, key)
    return { n: b.n, at: b.at, len: b.len, time: b.meter.text, meter: b.meter, key: k, sig: k === key ? sig : keySignature(k), section: sections.find(s => s[0] >= b.at - 1e-6 && s[0] < b.at + b.len - 1e-6)?.[1] ?? null, chords: [] }
  })
  for (const c of songChords(song, bars, key, source)) {
    const b = outBars.findLast(b => b.at <= c.at + 1e-6)
    if (b) b.chords.push({ at: Math.round((c.at - b.at) * b.meter.xTicks), symbol: c.symbol })
  }
  const out = { title: song.name, bpm: song.bpm, key, signature: sig, swing: sw, bars: outBars, parts: [] }
  for (const k of keys) {
    const t = song.tracks[k]
    if (!t?.midi) continue
    const raw = readNotes(t.midi, song.length)
    const notes = quantize(raw, songBars(song), { swing: sw })
    // chords by onset: notes starting together share the shortest sensible length (until the next onset)
    const onsets = [...new Set(notes.map(n => n.s))].sort((a, b) => a - b)
    const groups = onsets.map((s, i) => {
      const ns = notes.filter(n => near(n.s, s))
      const next = onsets[i + 1] ?? Infinity
      return { s, e: Math.min(Math.max(...ns.map(n => n.e)), next), ns: ns.map(n => n.n) }
    })
    // grace notes: very short notes running straight into a longer one (the microtonal slides, turns and glides) lean on
    // it. A slide on the beat (the long note comes just after it) gives the long note its beat back; a run at the end of
    // a note (the long note starts on its beat) gives its time back to the note before
    const short = g => g.ns.length === 1 && g.e - g.s < 0.15
    const round = x => near(x * 4, Math.round(x * 4)) || near(x * 3, Math.round(x * 3))
    const graced = []
    for (let i = 0; i < groups.length; i++) {
      let j = i
      while (j < groups.length && short(groups[j]) && groups[j + 1] && near(groups[j].e, groups[j + 1].s)) j++
      const main = groups[j]
      if (j > i && main && main.e - main.s >= 0.24) {
        const run = groups.slice(i, j), first = run[0], prev = graced[graced.length - 1]
        main.grace = run.map(g => g.ns[0])
        if (round(main.s) && prev && near(prev.e, first.s)) prev.e = main.s
        else main.s = first.s
        graced.push(main)
        i = j
        continue
      }
      graced.push(groups[i])
    }
    // a keyboard part over a wide range (chords, a left hand far below): two staves, split at middle C
    const ns = notes.map(n => n.n), wide = graced.some(g => g.ns.length > 1) && ns.length && Math.max(...ns) - Math.min(...ns) > 28 && Math.min(...ns) < 55 && Math.max(...ns) > 64
    if (wide) {
      const upper = graced.map(g => ({ ...g, ns: g.ns.filter(v => v >= 60), grace: g.grace?.filter(v => v >= 60) })).filter(g => g.ns.length)
      const lower = graced.map(g => ({ ...g, ns: g.ns.filter(v => v < 60), grace: g.grace?.filter(v => v < 60) })).filter(g => g.ns.length)
      writePart(k, k + ' ↑', 'treble', upper)
      writePart(k, k + ' ↓', 'bass', lower)
    } else writePart(k, k, CLEF(ns), graced)
  }
  function writePart(k, name, clef, graced) {
    const part = { key: k, name, clef, bars: [] }
    out.parts.push(part)
    for (const b of bars) {
      const m = b.meter, T = m.barTicks, xt = m.xTicks, evs = []
      const inBar = graced.filter(g => g.e > b.at + 1e-6 && g.s < b.at + b.len - 1e-6)
      // which beats divide in three
      const tripBeats = new Set()
      if (!m.compound) for (const g of inBar) for (const x of [g.s, g.e]) {
        const tk = Math.round((x - b.at) * xt)
        if (tk > 0 && tk < T && tk % 3 !== 0) tripBeats.add(Math.floor(tk / 48) * 48) // 16, 32, 8…: thirds of a beat
      }
      const triplet = beat => tripBeats.has(beat)
      let p = 0
      const place = (s, e, ns, grace, tieIn) => {
        const list = pieces(s, e - s, m, triplet)
        list.forEach((pc, i) => evs.push({
          at: pc.at, dur: pc.dur, type: pc.type, dots: pc.dots, tuplet: pc.tuplet ? {} : null, rest: !ns,
          notes: ns ? ns.map(v => ({ midi: v, tieStop: i > 0 || tieIn, tieStart: i < list.length - 1 })) : [],
          grace: i === 0 && grace ? grace : null,
        }))
      }
      for (const g of inBar) {
        const s = Math.max(0, Math.round((g.s - b.at) * xt)), e = Math.min(T, Math.round((g.e - b.at) * xt))
        if (e <= s) continue
        if (s > p) place(p, s, null)
        if (s < p) continue // overlapping (a held note under a new onset): written from where the bar stands
        place(s, e, g.ns, g.s >= b.at - 1e-6 ? g.grace : null, g.s < b.at - 1e-6)
        if (g.e > b.at + b.len + 1e-6) evs[evs.length - 1].notes.forEach(n => (n.tieStart = true))
        p = e
      }
      if (p < T) place(p, T, null)
      // a whole bar of rest is one whole rest
      if (evs.every(e => e.rest)) evs.splice(0, evs.length, { at: 0, dur: T, rest: true, type: 'whole', dots: 0, measureRest: true, notes: [] })
      tuplets(evs)
      part.bars.push(evs)
    }
    accidentals(part, outBars)
    beams(part, bars)
  }
  return out
}
// mark the first and last note of each triplet (3 eighths in one beat)
function tuplets(evs) {
  let run = null
  for (const e of evs) {
    if (!e.tuplet) { run = null; continue }
    const beat = Math.floor(e.at / 48)
    if (!run || run.beat !== beat) { run = { beat, list: [] }; e.tuplet.first = true }
    run.list.push(e)
    e.tuplet.actual = 3
    e.tuplet.normal = 2
    const sum = run.list.reduce((s, x) => s + x.dur, 0)
    if (sum >= 32 - 1e-6 && (sum % 16 === 0)) { if ((e.at + e.dur) % 48 === 0) e.tuplet.last = true }
  }
  for (let i = 0; i < evs.length; i++) if (evs[i].tuplet && (!evs[i + 1]?.tuplet || Math.floor(evs[i + 1].at / 48) !== Math.floor(evs[i].at / 48))) evs[i].tuplet.last = true
}
// accidentals: shown where the note's alteration differs from the signature or from what the bar already said for that
// letter and octave; a tied note never repeats it
function accidentals(part, bars) {
  for (const [bi, evs] of part.bars.entries()) {
    const said = new Map(), sig = bars[bi].sig, key = bars[bi].key
    for (const e of evs) for (const n of [...(e.grace ?? []).map(g => ({ midi: g, grace: true })), ...e.notes]) {
      const sp = spellParts(n.midi, key)
      const where = sp.letter + sp.oct, now = said.has(where) ? said.get(where) : sig.alter[sp.letter] ?? 0
      const show = !n.tieStop && !near(sp.acc, now)
      if (!n.grace) Object.assign(n, { sp, show })
      said.set(where, sp.acc)
    }
    for (const e of evs) if (e.grace) e.grace = e.grace.map(g => { const sp = spellParts(g, key); return { midi: g, sp, show: true } })
  }
}
// beams: eighths and shorter within one beat group (a compound beat: three eighths) are joined; levels for 16ths…
function beams(part, bars) {
  const LEVEL = { eighth: 1, '16th': 2, '32nd': 3, '64th': 4 }
  part.bars.forEach((evs, bi) => {
    const m = bars[bi].meter, bounds = [0]
    for (const g of m.groups) bounds.push(bounds[bounds.length - 1] + g)
    const groupOf = at => bounds.findLast(b => b <= at + 1e-9)
    let run = []
    const flush = () => {
      if (run.length >= 2) run.forEach((e, i) => {
        const lv = LEVEL[e.type]
        e.beams = []
        for (let l = 1; l <= lv; l++) {
          const prev = run[i - 1] && LEVEL[run[i - 1].type] >= l, next = run[i + 1] && LEVEL[run[i + 1].type] >= l
          e.beams.push(prev && next ? 'continue' : prev ? 'end' : next ? 'begin' : i === 0 ? 'forward hook' : 'backward hook')
        }
      })
      run = []
    }
    for (const e of evs) {
      if (e.rest || !LEVEL[e.type]) { flush(); continue }
      if (run.length && groupOf(run[0].at) !== groupOf(e.at)) flush()
      run.push(e)
    }
    flush()
  })
}
