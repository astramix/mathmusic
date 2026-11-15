// Modes, microtones and temperaments: every pitch moved into a mode by scale degree, quarter and eighth tones, tuning data — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { spell, pc, chordName } from '../theory.js'
import { keyWithMode } from '../modes.js'
import { temperOffsets } from '../tuning.js'
import { round } from './util.js'
import { MAJ, MIN } from './melody.js'

// ---- modes ----------------------------------------------------------------------------------------------------
// A pitch of the major/minor song → the mode on the same tonic. Seven-note modes map degree to degree; a chromatic
// note (the leading tone of minor, a ♭II) goes to whichever neighbouring degree of the mode lies nearer (ties: the
// lower). Scales of other sizes: the nearest note of the scale (ties: down).
export function modeMapper(key, iv, tr = 0) {
  const PS = key.mode === 'minor' ? MIN : MAJ
  return n => {
    const rel = n - tr - key.tonic, oct = Math.floor(rel / 12), p = rel - 12 * oct
    let to
    if (iv.length === 7) {
      const d = PS.indexOf(p)
      if (d >= 0) to = iv[d]
      else {
        const below = PS.findLastIndex(v => v < p), lo = iv[below], hi = below + 1 < 7 ? iv[below + 1] : 12 + iv[0]
        to = Math.abs(hi - p) < Math.abs(lo - p) ? hi : lo
      }
    } else {
      let bd = 99
      for (const o of [-12, 0, 12]) for (const v of iv) if (Math.abs(v + o - p) < bd) (bd = Math.abs(v + o - p)), (to = v + o)
    }
    return key.tonic + tr + 12 * oct + to
  }
}
// the whole song into the mode: themes, voicings, bass; each chord's third/fifth/seventh and name found again
function toMode({ key, iv, themes, harmony, id }) {
  const M = modeMapper(key, iv), micro = iv.some(v => v !== Math.round(v))
  for (const th of themes) if (th) th.notes = th.notes.map(([b, n, d]) => [b, M(n), d])
  for (const h of harmony) {
    const Mt = modeMapper(key, iv, h.tr)
    h.voicing = h.voicing.map(Mt)
    h.bass = Mt(h.bass)
    if (micro) { describeChord(h, keyWithMode(key, id)); continue }
    const pcs = h.voicing.map(n => pc(n - h.bass)), has = i => pcs.includes(i)
    const third = [4, 3].find(has), fifth = [7, 6, 8].find(has) ?? pc(Mt(h.bass + 7) - h.bass), sev = [10, 11, 9].find(has)
    h.ivs = [third ?? (has(5) ? 5 : 2), fifth, sev ?? 10]
    const q = third === 4 ? (fifth === 8 ? 'aug' : sev === 10 ? '7' : sev === 11 ? 'maj7' : '') : third === 3 ? (fifth === 6 ? (sev === 10 ? 'm7b5' : 'dim') : sev === 10 ? 'm7' : 'm') : has(5) ? 'sus4' : 'sus2'
    h.symbol = chordName({ root: pc(h.bass), quality: q }, key)
  }
}

// A chord in any tuning: its third, fifth and seventh above the bass (fractional in a microtonal mode) and its name —
// a neutral third (3½ semitones) is 'n': C–E𝄳–G = 'Cn', with B𝄳 'Cnⁿ7'
function describeChord(h, skey) {
  const rel = h.voicing.map(n => (((n - h.bass) % 12) + 12) % 12)
  const find = (lo, hi, pref) => rel.filter(v => v > lo && v < hi).reduce((a, v) => (a == null || Math.abs(v - pref) < Math.abs(a - pref) ? v : a), null)
  const third = find(2.6, 4.6, 3.5), fifth = find(5.6, 8.4, 7), sev = find(8.6, 11.6, 10.25)
  const sus = rel.some(v => Math.abs(v - 5) < 0.3) ? 5 : 2
  h.ivs = [third ?? sus, fifth ?? 7, sev ?? 10].map(round)
  const t = third == null ? `sus${sus === 5 ? 4 : 2}` : third < 3.25 ? 'm' : third > 3.75 ? '' : 'n'
  const f = fifth == null || Math.abs(fifth - 7) < 0.25 ? '' : fifth < 7 ? (t === 'm' ? '°' : '♭5') : t === '' ? '+' : '♯5'
  const s = sev == null ? '' : Math.abs(sev - 9) < 0.25 ? '6' : Math.abs(sev - 11) < 0.25 ? 'maj7' : Math.abs(sev - 10.5) < 0.25 ? 'ⁿ7' : '7'
  let q = t.startsWith('sus') ? (s === '7' ? '7' : '') + t : t + f + s
  if (t === 'm' && f === '°') q = sev == null ? '°' : Math.abs(sev - 9) < 0.25 ? '°7' : 'ø7'
  h.symbol = spell(60 + h.bass, skey, false) + q
}
// a quarter-tone tonic: everything made on the semitone above moves down (E → E𝄳), the chords are named again
function shiftPitches({ key, by, name, themes, harmony, id }) {
  for (const th of themes) if (th) th.notes = th.notes.map(([b, n, d]) => [b, round(n + by), d])
  key.tonic = (key.tonic + by + 12) % 12
  key.name = name
  key.shift = by
  const skey = keyWithMode(key, id)
  for (const h of harmony) {
    h.voicing = h.voicing.map(n => round(n + by))
    h.bass = round(h.bass + by)
    describeChord(h, skey)
  }
}

// ---- microtones in a melody (opts.micro) ------------------------------------------------------------------------
// quarter tones: a step of a minor third (or an augmented second) is split by its neutral midpoint (D–F → D E𝄳 F,
//   the gesture of maqam Bayati); a semitone step passes through the quarter tone between (E–F → E E𝄲 F); a long note
//   is reached by a slide from a quarter tone below and turns a quarter tone up before it ends; off the beat the 3rd
//   and 7th degrees turn neutral where the chord doesn't hold them (the colour of maqam Rast);
// eighth tones: expressive intonation — a leading tone rising to the tonic is played an eighth tone high, a ♭6 or ♭2
//   falling a semitone an eighth tone low (as string players and singers do); long notes are scooped from an eighth
//   tone below; semitone steps glide through 25-cent steps.
// Grace notes take their time from the end of the note before them, never from the next beat: the rhythm stays.
function microMelody(notes, { kind, key, chordAt, r }) {
  const out = [], tonic = key.tonic, minor = key.mode === 'minor', q = kind === 'quarter'
  const deg = n => ((Math.round(n - tonic) % 12) + 12) % 12
  const onBeat = b => Math.abs(b - Math.round(b)) < 1e-6
  const chordTone = (n, b) => { const ch = chordAt(b); return !!ch && ch.tones.includes(pc(n)) }
  const push = (b, n, d) => { if (d > 1e-6) out.push([round(b), round(n), round(d)]) }
  notes.forEach(([b, n, d], i) => {
    const next = notes[i + 1], step = next ? next[1] - n : 0, gapless = !!next && Math.abs(next[0] - (b + d)) < 1e-6
    let m = n
    if (q && !onBeat(b) && d <= 1 && n === Math.round(n) && !chordTone(n, b) && r() < 0.6) {
      const g = deg(n)
      if (!minor && (g === 4 || g === 11)) m = n - 0.5
      if (minor && (g === 3 || g === 10)) m = n + 0.5
    }
    if (!q && gapless) {
      const g = deg(n), gn = deg(next[1])
      if (g === 11 && gn === 0 && step === 1) m = n + 0.25 // the leading tone, high
      if (step === -1 && ((minor && g === 8 && gn === 7) || (g === 1 && gn === 0))) m = n - 0.25 // ♭6 → 5, ♭2 → 1, low
    }
    let start = b, len = d
    if (d >= 1.5 && r() < (q ? 0.45 : 0.55)) { // a slide into a long note
      const g = Math.min(0.125, d / 8)
      push(b, m - (q ? 0.5 : 0.25), g)
      start += g
      len -= g
    }
    let tail = null
    if (gapless && len >= 0.5) {
      const a = Math.abs(step), s = Math.sign(step)
      if (q && a === 3 && r() < 0.7) tail = [n + 1.5 * s] // the neutral step
      else if (q && a === 1 && r() < 0.6) tail = [n + 0.5 * s]
      else if (!q && a === 1 && r() < 0.5) tail = [n + 0.25 * s, n + 0.5 * s, n + 0.75 * s] // a glide
    }
    if (!tail && q && len >= 2 && r() < 0.35) tail = [m + 0.5, m] // a quarter-tone turn
    if (tail) {
      const each = Math.min(q ? 0.125 : 1 / 12, len / (2 * tail.length))
      push(start, m, len - each * tail.length)
      tail.forEach((p, k) => push(start + len - each * (tail.length - k), p, each))
    } else push(start, m, len)
  })
  return out
}
// the solo is improvised inside the song: the same inflections, as code (applied to each improvised note)
const microSoloCode = (kind, key) => kind === 'quarter'
  ? `// microtones in the solo: off the beat the ${key.mode === 'minor' ? 'minor 3rd and 7th rise' : '3rd and 7th fall'} a quarter tone (neutral, as in maqam Rast)
const MICRO = (n, b, next) => { const g = mod(Math.round(n) - ${round(key.tonic)}, 12); return mod(b, 1) > 0.01 && (${key.mode === 'minor' ? 'g === 3 || g === 10' : 'g === 4 || g === 11'}) && hash(floor(8 * b), 41) < 0.6 ? ${key.mode === 'minor' ? '0.5' : '-0.5'} : 0 }`
  : `// microtones in the solo: expressive intonation — a leading tone rising to the tonic an eighth tone high, ♭6 → 5 and ♭2 → 1 an eighth tone low
const MICRO = (n, b, next) => { const g = mod(Math.round(n) - ${round(key.tonic)}, 12), h = next == null ? -1 : mod(Math.round(next) - ${round(key.tonic)}, 12); return g === 11 && h === 0 ? 0.25 : (g === 8 && h === 7) || (g === 1 && h === 0) ? -0.25 : 0 }`

// ---- temperaments (opts.temperament) -----------------------------------------------------------------------------
// The song keeps its notes; every frequency passes through tuneHz — the note's offset from 12-TET in cents, by pitch
// class, interpolated between neighbouring notes (so glides and vibrato stay smooth). After a key change up a tuning
// built on the tonic or on the spelling moves with it. Adaptive just intonation tunes every note by its interval to the
// root of the chord sounding at that moment.
function temperData({ temperament: t, key, sectionInfo }) {
  const ups = [...new Set(sectionInfo.map(s => s.keyUp ?? 0))].filter(Boolean)
  const offs = tr => temperOffsets(t.id, { ...key, tonic: (((key.tonic + tr) % 12) + 12) % 12 })
  const head = `
// ---- the tuning: ${t.name}${t.alt ? ` (${t.alt})` : ''} — ${t.short}
// every frequency passes through tuneHz: its note's offset from 12-TET in cents, interpolated between notes`
  const interp = `const tuneHz = f => {
  if (!(f > 0)) return f
  const m = 69 + 12 * Math.log2(f / 440), a = Math.floor(m), u = m - a
  const c = u <= 0.35 ? off(a) : u >= 0.65 ? off(a + 1) : off(a) + ((off(a + 1) - off(a)) * (u - 0.35)) / 0.3
  return f * 2 ** (c / 1200)
}
const hz = (n, base = 110) => tuneHz(hz12(n, base))
let NOW = 0 // the beat being rendered: every track's audio sets it (withNow, at the end)
const withNow = tracks => {
  for (const t of Object.values(tracks)) { const a = t.audio; t.audio = ctx => { const f = a(ctx); return x => ((NOW = x), f(x)) } }
  return tracks
}`
  if (t.kind === 'adaptive') return `${head}
// adaptive: a note k semitones above the root of the chord at NOW — third 5/4 or 6/5, fifth 3/2, the dominant's seventh
// 7/4, a minor seventh 9/5, a major seventh 15/8 (cents from 12-TET); the root itself stays where 12-TET has it
const JUST = [0, 11.731, 3.91, 15.641, -13.686, -1.955, -9.776, 1.955, 13.686, -15.641, 17.596, -11.731]
const off = m => {
  const c = chordAt(NOW)
  if (!c) return 0
  const k = mod(m - Math.round(c[2]), 12), [t3, t5, t7] = c[5]
  if (k === 10) return t3 === 4 && t5 === 7 ? -31.174 : 17.596
  if (k === 6 && t5 === 6) return 9.776
  if (k === 9 && t7 === 9) return 25.39
  return JUST[k]
}
const TEMPER = JUST
${interp}`
  return `${head}
const TEMPER = [${offs(0).join(', ')}] // C C♯ D … B
${ups.length && t.kind !== 'fixed' ? `const TEMPER_UP = { ${ups.map(u => `${u}: [${offs(u).join(', ')}]`).join(', ')} } // after the key changes up
const KEY_UPS = ${JSON.stringify(sectionInfo.filter(s => s.keyUp).map(s => [s.at, s.keyUp]))}
const temperNow = () => { let T = TEMPER; for (const [s, k] of KEY_UPS) if (s <= NOW) T = TEMPER_UP[k]; return T }
const off = m => temperNow()[mod(m, 12)]` : 'const off = m => TEMPER[mod(m, 12)]'}
${interp}`
}

export { microMelody, microSoloCode, shiftPitches, temperData, toMode }
