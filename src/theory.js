// Music theory shared by the generator, the visualiser and the tests.
// Pitches are MIDI numbers (C4 = 60, A4 = 69 = 440 Hz); pitch classes 0…11 from C. A pitch may carry a fraction —
// 63.5 is a quarter tone under E4 (E𝄳4), 60.25 an eighth tone over C4 (C𝄮4) — for the microtonal modes of modes.js.
//
// Spelling follows the key: every pitch is named by the scale degree it plays in the key, so
// D minor has B♭ and C♯, E♭ major has A♭, F♯ major has E♯ — never "A♯" in F major. Microtones are spelt by the
// Stein–Zimmermann–Gould system: quarter tones by Stein–Zimmermann signs (𝄲 half sharp, 𝄳 half flat, ♯𝄲, ♭𝄳), an
// eighth tone (25 ¢, one step of 48-EDO) by an arrow on the semitone accidental beside it (𝄮 = ♮↑ +25 ¢, 𝄱 = ♯↓
// +75 ¢); Turkish makamlar by the commas of Arel–Ezgi–Uzdilek (♭¹ koma, ♭⁴ bakiye, ♭⁵ küçük, ♭⁸ büyük mücenneb),
// Persian dastgah-ha by koron and sori. A pitch off every grid (a measured gamelan) is the nearest note ± cents.

export const A4 = 440
export const freq = n => A4 * 2 ** ((n - 69) / 12)
export const pc = n => ((Math.round(n) % 12) + 12) % 12

// ---- keys ----------------------------------------------------------------------------------------
const LETTERS = 'CDEFGAB', NAT = [0, 2, 4, 5, 7, 9, 11]
// conventional tonic spellings (fewest accidentals in the signature)
const MAJOR_TONIC = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const MINOR_TONIC = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']
// interval above the tonic (semitones) → letter steps: m2/M2 → 1, m3/M3 → 2, P4/♯4 → 3, P5 → 4, m6/M6 → 5, m7/M7 → 6
const STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6]
const ACC = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' }
// accidental signs as written in a name, with how much each changes the pitch (semitones)
const ACC_IN = { '𝄫': -2, '♭𝄳': -1.5, '𝄭': -1.25, '♭': -1, b: -1, '𝄬': -0.75, '𝄳': -0.5, d: -0.5, '𝄯': -0.25, '': 0, '♮': 0, '𝄮': 0.25, '𝄲': 0.5, '‡': 0.5, '𝄱': 0.75, '♯': 1, '#': 1, '𝄰': 1.25, '♯𝄲': 1.5, '𝄪': 2, x: 2 }

// key: { tonic: pitch class, mode: 'major' | 'minor' } — or a name like 'F', 'Dm', 'E♭', 'C#m', 'E𝄳' (a quarter-tone
// tonic: maqam Sikah). A microtonal key may also carry steps (its mode's degrees), system ('aeu' | 'persian' |
// 'cents') and the tonic's name.
export function parseKey(k) {
  if (!k) return null
  if (typeof k === 'object') return k
  const m = String(k).trim().match(/^([A-Ga-g])(♭𝄳|♯𝄲|[#♯b♭𝄳𝄲‡d𝄫𝄪𝄬𝄭𝄮𝄯𝄰𝄱]?)\s*(m|min|minor|moll)?$/u)
  if (!m) return null
  const a = ACC_IN[m[2]] ?? 0, t = NAT[LETTERS.indexOf(m[1].toUpperCase())] + a, key = { tonic: (t + 12) % 12, mode: m[3] ? 'minor' : 'major' }
  if (a !== Math.round(a)) key.name = m[1].toUpperCase() + ({ d: '𝄳', '‡': '𝄲' }[m[2]] ?? m[2])
  return key
}
export const tonicName = key => key.name ?? (key.tonic === Math.round(key.tonic) ? (key.mode === 'minor' ? MINOR_TONIC : MAJOR_TONIC)[key.tonic] : spellParts(60 + key.tonic, { tonic: 0, mode: 'major' }).name)
export const keyName = key => tonicName(key) + (key.mode === 'minor' ? 'm' : '')
export const keyLabel = key => `${tonicName(key)} ${key.mode === 'minor' ? 'минор' : 'мажор'}`

// ---- microtonal accidentals --------------------------------------------------------------------------------------
// [semitones, text, SMuFL glyph, MusicXML accidental] — Stein–Zimmermann–Gould on the 48-EDO grid
export const ACCIDENTALS = [
  [-2, '𝄫', 'accidentalDoubleFlat', 'flat-flat'],
  [-1.75, '𝄫↑', 'accidentalThreeQuarterTonesFlatArrowUp', 'flat-flat-up'],
  [-1.5, '♭𝄳', 'accidentalThreeQuarterTonesFlatZimmermann', 'three-quarters-flat'],
  [-1.25, '𝄭', 'accidentalThreeQuarterTonesFlatArrowDown', 'flat-down'],
  [-1, '♭', 'accidentalFlat', 'flat'],
  [-0.75, '𝄬', 'accidentalQuarterToneFlatArrowUp', 'flat-up'],
  [-0.5, '𝄳', 'accidentalQuarterToneFlatStein', 'quarter-flat'],
  [-0.25, '𝄯', 'accidentalQuarterToneFlatNaturalArrowDown', 'natural-down'],
  [0, '', 'accidentalNatural', 'natural'],
  [0.25, '𝄮', 'accidentalQuarterToneSharpNaturalArrowUp', 'natural-up'],
  [0.5, '𝄲', 'accidentalQuarterToneSharpStein', 'quarter-sharp'],
  [0.75, '𝄱', 'accidentalQuarterToneSharpArrowDown', 'sharp-down'],
  [1, '♯', 'accidentalSharp', 'sharp'],
  [1.25, '𝄰', 'accidentalThreeQuarterTonesSharpArrowUp', 'sharp-up'],
  [1.5, '♯𝄲', 'accidentalThreeQuarterTonesSharpStein', 'three-quarters-sharp'],
  [1.75, '𝄪↓', 'accidentalThreeQuarterTonesSharpArrowDown', 'double-sharp-down'],
  [2, '𝄪', 'accidentalDoubleSharp', 'double-sharp'],
]
// Persian: koron and sori instead of the quarter-tone signs
const PERSIAN = { '-0.5': ['𝄳', 'accidentalKoron', 'koron'], 0.5: ['𝄲', 'accidentalSori', 'sori'] }
// Turkish (Arel–Ezgi–Uzdilek), in commas of 53-EDO above the Pythagorean natural
const AEU = {
  '-8': ['♭⁸', 'accidentalBuyukMucennebFlat'], '-5': ['♭⁵', 'accidentalKucukMucennebFlat'], '-4': ['♭⁴', 'accidentalBakiyeFlat'], '-1': ['♭¹', 'accidentalKomaFlat'],
  0: ['', 'accidentalNatural'], 1: ['♯¹', 'accidentalKomaSharp'], 4: ['♯⁴', 'accidentalBakiyeSharp'], 5: ['♯⁵', 'accidentalKucukMucennebSharp'], 8: ['♯⁸', 'accidentalBuyukMucennebSharp'],
}
const COMMA = 1200 / 53, FIFTHS = [0, 2, 4, -1, 1, 3, 5]
const wrap12 = v => ((((v + 6) % 12) + 12) % 12) - 6
const near = (a, b, eps) => Math.abs(a - b) < eps

// The written form of a pitch in a key → { letter, li, acc (semitones as written), alter (exact, for MusicXML),
// oct, cents (what the written note misses), text, glyph (SMuFL), xml (MusicXML accidental), name (letter + sign) }
export function spellParts(n, key = { tonic: 0, mode: 'major' }) {
  const tonic = key.tonic, intTonic = tonic === Math.round(tonic), sys = key.system ?? null
  const tl = LETTERS.indexOf(tonicName(key)[0])
  const integral = near(n, Math.round(n), 0.005)
  // the written pitch: on the 12-EDO grid for measured scales, else on the 48-EDO grid (AEU: exact)
  const q = sys === 'cents' ? Math.round(n) : sys === 'aeu' ? n : integral ? Math.round(n) : Math.round(n * 4) / 4
  const rel = ((q - tonic) % 12 + 12) % 12
  let li = null
  // a degree of the key's mode
  if (key.steps?.length === 7) for (let d = 0; d < 7 && li == null; d++) if (near(wrap12(rel - key.steps[d]), 0, 0.02)) li = (tl + d) % 7
  // a whole semitone above an ordinary tonic: by the scale degree it plays (E♯ in F♯ major, B♭ in D minor)
  if (li == null && intTonic && near(rel, Math.round(rel), 0.005)) li = (tl + STEPS[Math.round(rel) % 12]) % 7
  // a microtone: the letter with the smallest accidental; a tie goes to the half flat (E𝄳 rather than D♯𝄲)
  if (li == null) {
    let best = Infinity
    for (let L = 0; L < 7; L++) {
      const a = wrap12(q - NAT[L]), c = Math.abs(a) + (a > 0 ? 0.001 : 0)
      if (c < best) (best = c), (li = L)
    }
  }
  const letter = LETTERS[li]
  if (sys === 'aeu') {
    // commas above the Pythagorean natural, counted from the tonic's natural letter
    const tAcc = wrap12(tonic - NAT[tl]), natT = tonic - tAcc
    const natC = ((((FIFTHS[li] - FIFTHS[tl]) * 701.955) % 1200) + 1200) % 1200
    const noteC = ((((n - natT) * 100) % 1200) + 1200) % 1200
    const d = ((((noteC - natC + 600) % 1200) + 1200) % 1200) - 600, k = Math.round(d / COMMA)
    if (AEU[k]) {
      const nat = Math.round(n - wrap12(n - NAT[li]))
      const [text, glyph] = AEU[k]
      return { letter, li, acc: (k * COMMA) / 100, alter: Math.round((n - nat) * 1e4) / 1e4, oct: Math.floor(nat / 12) - 1, cents: Math.round((d - k * COMMA) * 10) / 10, text, glyph, xml: k === 0 ? 'natural' : 'other', name: letter + text }
    }
    return spellParts(n, { ...key, system: null })
  }
  const acc = Math.round(wrap12(q - NAT[li]) * 4) / 4, nat = Math.round(q - acc)
  const row = ACCIDENTALS.find(r => r[0] === acc)
  const p = sys === 'persian' && PERSIAN[acc]
  const text = p ? p[0] : row ? row[1] : '?', glyph = p ? p[1] : row?.[2] ?? null, xml = p ? p[2] : row?.[3] ?? 'other'
  return { letter, li, acc, alter: acc, oct: Math.floor(nat / 12) - 1, cents: Math.round((n - q) * 1000) / 10, text, glyph, xml, name: letter + text }
}
// what a note misses its written pitch by: '' or ' +13¢'
export const centsText = c => (Math.abs(c) >= 1 ? `${c > 0 ? '+' : '−'}${Math.round(Math.abs(c))}¢` : '')

// Name of MIDI note n in the key (with octave by default): spell(61, Dm) → 'C♯4', spell(70, F) → 'B♭4',
// spell(63.5, C) → 'E𝄳4'; a pitch off the grids gets its cents: 'D♯4−37¢'
export function spell(n, key = { tonic: 0, mode: 'major' }, octave = true) {
  if (key.tonic === Math.round(key.tonic) && !key.steps && !key.system && near(n, Math.round(n), 0.005)) {
    n = Math.round(n)
    const tn = tonicName(key), tl = LETTERS.indexOf(tn[0])
    const rel = (((n - key.tonic) % 12) + 12) % 12
    const li = (tl + STEPS[rel]) % 7, letter = LETTERS[li]
    let acc = pc(n) - NAT[li]
    if (acc > 6) acc -= 12
    if (acc < -6) acc += 12
    // the octave belongs to the letter: B♯3 sounds as C4, C♭4 as B3
    const oct = Math.floor((n - acc) / 12) - 1
    return letter + (ACC[acc] ?? '?') + (octave ? oct : '')
  }
  const s = spellParts(n, key)
  return s.name + (octave ? s.oct : '') + centsText(s.cents)
}

// the key at beat x of a song that changes key (song.keys: [[beat, 'G'], …]) — else `home`
// (an entry may name a mode: [beat, 'D', 'saba'] — modes.js lends keyWithMode for its spelling)
let MODE_KEY = null
export const setModeKey = f => (MODE_KEY = f)
export function keyAt(song, x, home) {
  if (!song?.keys?.length) return home
  let e = null
  for (const k of song.keys) if (k[0] <= x + 1e-6) e = k
  e ??= song.keys[0]
  let p = parseKey(e[1])
  if (p && e[2] && MODE_KEY) p = MODE_KEY(p, e[2])
  const same = p && p.tonic === home?.tonic && p.mode === home?.mode && String(p.steps ?? '') === String(home?.steps ?? '')
  return p && !same ? p : home
}

// Krumhansl–Kessler key profiles → the most likely key of a pitch-class histogram (weights ≥ 0)
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
export function detectKey(hist) {
  const corr = (a, b) => {
    const ma = a.reduce((s, v) => s + v, 0) / 12, mb = b.reduce((s, v) => s + v, 0) / 12
    let num = 0, da = 0, db = 0
    for (let i = 0; i < 12; i++) {
      num += (a[i] - ma) * (b[i] - mb)
      da += (a[i] - ma) ** 2
      db += (b[i] - mb) ** 2
    }
    return da && db ? num / Math.sqrt(da * db) : 0
  }
  let best = { tonic: 0, mode: 'major', r: -2 }
  for (let t = 0; t < 12; t++) {
    for (const [mode, prof] of [['major', KK_MAJOR], ['minor', KK_MINOR]]) {
      const rot = Array.from({ length: 12 }, (_, i) => prof[(i - t + 12) % 12])
      const r = corr(hist, rot)
      if (r > best.r) best = { tonic: t, mode, r }
    }
  }
  return best
}

// ---- scales & chords ---------------------------------------------------------------------------
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9], minorPentatonic: [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10],
}
// chord qualities: intervals from the root
export const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], mMaj7: [0, 3, 7, 11], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], 13: [0, 4, 10, 14, 21], '7sus4': [0, 5, 7, 10],
}
// Roman numeral in a key → { root (pc), quality, tones (pcs) }:  'ii7', 'V7', 'bVI', 'IVmaj7', 'v', 'V/V'
const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 }
export function roman(sym, key) {
  const sec = sym.split('/')
  if (sec.length === 2) { // secondary chord: V/V = V of the fifth degree
    const target = roman(sec[1], key)
    return roman(sec[0], { tonic: target.root, mode: /^[iv]/.test(sec[1]) ? 'minor' : 'major' })
  }
  const m = sym.match(/^([b#♭♯]?)(iv|i{1,3}|vi{0,2}|IV|I{1,3}|VI{0,2})(.*)$/)
  if (!m) throw new Error(`bad roman numeral ${sym}`)
  const [, acc, num, rest] = m, minorChord = num === num.toLowerCase()
  // degrees are counted in the major scale (♭VI = a minor sixth above), as in common usage — but a sharp in minor raises
  // the minor's own degree (♯vii°7 in D minor = C♯°7, the leading tone; ♯vi = B♮), and no accidental is the minor's
  const deg = ROMAN[num.toLowerCase()], scale = key.mode === 'minor' && (!acc || acc === '#' || acc === '♯') ? SCALES.minor : SCALES.major
  const root = (key.tonic + scale[deg] + (acc === 'b' || acc === '♭' ? -1 : acc ? 1 : 0) + 12) % 12
  let q = rest.replace(/ø7?/, 'm7b5').replace(/°7/, 'dim7').replace('°', 'dim')
  if (minorChord && !/^(m|dim)/.test(q)) q = 'm' + q
  if (minorChord && q === 'mmaj7') q = 'mMaj7'
  if (!QUALITIES[q]) throw new Error(`unknown chord quality ${rest} in ${sym}`)
  return { sym, root, quality: q, tones: QUALITIES[q].map(i => (root + i) % 12), ivs: QUALITIES[q] }
}
// Chord symbol for display: root spelt in the key + quality ('B♭maj7', 'C♯dim')
// (microtonal chords: 'n' — a neutral third, 3½ semitones, between minor and major)
export function chordName(ch, key) {
  const q = { '': '', m: 'm', dim: '°', aug: '+', m7b5: 'ø7', dim7: '°7' }[ch.quality] ?? ch.quality
  return spell(ch.root + 60, key, false) + q
}

// ---- voice leading -------------------------------------------------------------------------------
// The voicing of `tones` (pcs, root first) in [lo, hi] closest to the previous voicing `prev`
// (sum of absolute movements; no voice crossing, chord tones each used, the root doubled if needed).
export function voiceLead(tones, prev, { lo = 52, hi = 76, voices = 4 } = {}) {
  const cands = []
  const pcs = tones.slice(0, voices)
  while (pcs.length < voices) pcs.push(tones[pcs.length % tones.length])
  // enumerate close and open positions: each voice picks an octave of its pc, sorted ascending
  const options = pcs.map(p => {
    const out = []
    for (let n = lo; n <= hi; n++) if (pc(n) === p) out.push(n)
    return out
  })
  const rec = (i, acc) => {
    if (i === options.length) {
      const s = [...acc].sort((a, b) => a - b)
      if (s[s.length - 1] - s[0] <= 19 && new Set(s).size === s.length) cands.push(s)
      return
    }
    for (const n of options[i]) rec(i + 1, [...acc, n])
  }
  rec(0, [])
  if (!cands.length) return pcs.map(p => lo + ((p - lo) % 12 + 12) % 12).sort((a, b) => a - b)
  // shape: keep the voicing within about a tenth, no minor ninths between voices, no gaps over an octave
  const shape = c => {
    let s = 0.5 * spread(c) + 2.5 * Math.max(0, spread(c) - 15)
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if (c[j] - c[i] === 13) s += 6
    for (let i = 1; i < c.length; i++) if (c[i] - c[i - 1] > 9) s += 2 * (c[i] - c[i - 1] - 9)
    for (let i = 1; i < c.length; i++) if (c[i] - c[i - 1] === 1) s += 2.5 // a semitone cluster (major 7th under the root)
    return s
  }
  const mid = (lo + hi) / 2
  const cost = prev
    ? c => c.reduce((s, n, i) => s + Math.abs(n - (prev[i] ?? prev[prev.length - 1])), 0) + shape(c) + 0.15 * Math.abs(avg(c) - mid)
    : c => Math.abs(avg(c) - mid) + shape(c)
  return cands.reduce((b, c) => (cost(c) < cost(b) ? c : b))
}
const avg = a => a.reduce((s, v) => s + v, 0) / a.length
const spread = a => a[a.length - 1] - a[0]

// Nearest pitch to n (MIDI) whose pitch class is in pcs
export function snap(n, pcs) {
  for (let d = 0; d < 12; d++) {
    if (pcs.includes(pc(n - d))) return n - d
    if (pcs.includes(pc(n + d))) return n + d
  }
  return n
}

// The key of a song: song.key if given, else Krumhansl–Kessler over every pitched note sampled each
// half beat; the lowest note (the bass carries the harmony — rootless voicings alone fool the
// profiles) counts three times, and the first and last bass notes (where the tonic usually is) a lot.
const UNPITCHED = /drum|kick|snare|hat|perc|clap|paw|hiss|claw|beat|fx|sfx|noise|ambience|rain|vinyl|riser/i
export function songKey(song) {
  const k = parseKey(song.key)
  if (k) return k
  const hist = new Array(12).fill(0)
  const tracks = Object.entries(song.tracks).filter(([key, t]) => t && typeof t.midi === 'function' && !UNPITCHED.test(key))
  let first = null, last = null
  for (let x = 0; x < song.length; x += 0.5) {
    let low = Infinity
    for (const [, t] of tracks) {
      let m = null
      try { m = t.midi(x) } catch {}
      if (Array.isArray(m)) for (const n of m) if (Number.isFinite(n)) (hist[pc(n)] += 1), (low = Math.min(low, n))
    }
    if (low < Infinity) {
      hist[pc(low)] += 3
      first ??= low
      last = low
    }
  }
  if (first == null) return { tonic: 0, mode: 'major' }
  const w = 0.08 * hist.reduce((a, b) => a + b, 0)
  hist[pc(first)] += w
  hist[pc(last)] += w
  return detectKey(hist)
}
