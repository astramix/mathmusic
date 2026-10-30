// Microtones and tunings: spelling (Stein–Zimmermann–Gould, Turkish commas, koron/sori, cents), the microtonal modes,
// the temperaments, the generator's microtonal modes / ¼- and ⅛-tone writing / tunings, retuning into them, MPE MIDI
// and the Scala / Ableton tuning files.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { spell, spellParts, parseKey } from '../src/theory.js'
import { MODES, MODE_GROUPS, spellScale, stepFormula, isMicro, keyWithMode } from '../src/modes.js'
import { temperOffsets, TEMPERAMENTS, tuningFiles, adaptiveOffset } from '../src/tuning.js'
import { generate } from '../src/generate.js'
import { retuneSource } from '../src/retune.js'
import { midiFile, scanNotes, bendValue, isMicrotonal } from '../src/midi.js'
import * as acorn from '../viz/vendor/acorn.min.mjs'
import { render } from '../src/engine.js'

const DIR = path.resolve('out/_test_micro')
fs.mkdirSync(DIR, { recursive: true })
let n = 0
const load = async source => {
  const file = path.join(DIR, `m${n++}.mjs`)
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  return (await import(pathToFileURL(file).href)).default
}
const C = parseKey('C')
const pcf = v => ((v % 12) + 12) % 12
const near = (a, b, e = 0.011) => Math.abs(a - b) < e

test('12-TET spelling is unchanged; microtones get Stein–Zimmermann–Gould accidentals', () => {
  assert.equal(spell(61, parseKey('Dm')), 'C♯4')
  assert.equal(spell(77, parseKey('F#')), 'E♯5')
  // quarter tones: half flat / half sharp; a tie goes to the half flat (E𝄳, not D♯𝄲)
  assert.deepEqual([63.5, 70.5, 62.5, 66.5].map(v => spell(v, C)), ['E𝄳4', 'B𝄳4', 'D𝄲4', 'G𝄳4'])
  // eighth tones: an arrow on the semitone accidental beside it
  assert.deepEqual([60.25, 59.75, 60.75, 61.25, 69.75].map(v => spell(v, C)), ['C𝄮4', 'C𝄯4', 'C𝄱4', 'D𝄬4', 'A𝄱4'])
  const p = spellParts(63.5, C)
  assert.deepEqual([p.letter, p.alter, p.glyph, p.xml], ['E', -0.5, 'accidentalQuarterToneFlatStein', 'quarter-flat'])
  assert.equal(spellParts(60.25, C).xml, 'natural-up')
  assert.equal(spellParts(60.75, C).glyph, 'accidentalQuarterToneSharpArrowDown')
  // the octave belongs to the letter: C𝄳4 is just under C4
  assert.equal(spell(59.5, C), 'C𝄳4')
  // off every grid: the nearest note with its cents
  assert.equal(spell(64.63, { tonic: 2, mode: 'major', system: 'cents' }), 'F4−37¢')
})

test('a quarter-tone tonic: E𝄳 is parsed and spelt', () => {
  const k = parseKey('E𝄳')
  assert.equal(k.tonic, 3.5)
  assert.equal(k.name, 'E𝄳')
  assert.equal(parseKey('Bdm').tonic, 10.5)
})

test('microtonal modes: real values, seven letters, Turkish commas add up to 53', () => {
  assert.deepEqual(spellScale('C', MODES.rast.iv), ['C', 'D', 'E𝄳', 'F', 'G', 'A', 'B𝄳'])
  assert.deepEqual(spellScale('D', MODES.bayati.iv), ['D', 'E𝄳', 'F', 'G', 'A', 'B♭', 'C'])
  assert.deepEqual(spellScale('E𝄳', MODES.sikah.iv), ['E𝄳', 'F', 'G', 'A', 'B𝄳', 'C', 'D'])
  assert.deepEqual(spellScale('D', MODES.saba.iv), ['D', 'E𝄳', 'F', 'G♭', 'A', 'B♭', 'C'])
  // Arel–Ezgi–Uzdilek: Rast has the segah one comma under B, eviç is F♯ by a bakiye; Hicaz: dik kürdi and nim hicaz
  assert.deepEqual(spellScale('G', MODES.trRast.iv, 'aeu'), ['G', 'A', 'B♭¹', 'C', 'D', 'E', 'F♯⁴'])
  assert.deepEqual(spellScale('A', MODES.trHicaz.iv, 'aeu'), ['A', 'B♭⁴', 'C♯⁴', 'D', 'E', 'F♯⁴', 'G'])
  assert.deepEqual(spellScale('A', MODES.kurdi.iv, 'aeu'), ['A', 'B♭⁵', 'C', 'D', 'E', 'F', 'G'])
  for (const m of MODE_GROUPS.find(g => g.id === 'makam').modes) assert.equal(stepFormula(m.iv, 'aeu').split(' ')[0].split('–').map(Number).reduce((a, b) => a + b), 53, m.id)
  // Persian: koron
  assert.equal(spellParts(67 + 1.5, keyWithMode({ tonic: 7, mode: 'minor' }, 'shur')).xml, 'koron')
  // measured gamelan: Kyai Madu Laras (1987) — slendro 263 237 223 238 239 ¢
  assert.equal(stepFormula(MODES.slendro.iv, 'cents'), '263–237–223–238–239 ¢')
  assert.deepEqual(MODES.pelog.iv.map(v => Math.round(v * 100)), [0, 120, 267, 538, 667, 779, 977])
  // every microtonal mode: ascending, inside the octave, flagged
  for (const g of MODE_GROUPS.filter(g => g.micro)) for (const m of g.modes) {
    assert.ok(isMicro(m), m.id)
    assert.ok(m.iv.every((v, i) => v >= 0 && v < 12 && (i === 0 || v > m.iv[i - 1])), m.id)
  }
  assert.equal(MODES.pelogSelisir.id, 'pelogBem') // old ids keep working
})

test('temperaments: Werckmeister III keeps A4 = 440, meantone parts G♯ from A♭ by a diesis, just intonation on the tonic', () => {
  const w = temperOffsets('werckmeister3', C)
  assert.equal(w[9], 0)
  assert.ok(near(w[0], 11.73, 0.01) && near(w[4] - w[0], -9.775 - 0, 0.01)) // C–E = 390.225 ¢
  // by spelling: in C minor the key G♯/A♭ is A♭ (four fifths down, 813.7 ¢), in A minor it is G♯ (a major seventh
  // above A, 1082.9 ¢) — the same key on the piano, a diesis (41 ¢) apart as notes
  const cMinor = temperOffsets('meantone', parseKey('Cm')), aMinor = temperOffsets('meantone', parseKey('Am'))
  assert.ok(near(cMinor[8], 13.686, 0.001), `A♭ ${cMinor[8]}`)
  assert.ok(near(aMinor[8], -17.107, 0.002), `G♯ ${aMinor[8]}`)
  assert.equal(cMinor[0], 0)
  assert.equal(aMinor[9], 0)
  const j = temperOffsets('just', parseKey('D'))
  assert.equal(j[2], 0)
  assert.ok(near(j[6], -13.686, 0.001) && near(j[9], 1.955, 0.001)) // F♯ = 5/4, A = 3/2 above D
  assert.ok(near(adaptiveOffset(10, [4, 7, 10]), -31.174, 0.001)) // the natural seventh of a dominant
  for (const t of TEMPERAMENTS) if (t.kind !== 'equal' && t.kind !== 'adaptive') assert.equal(temperOffsets(t.id, C).length, 12, t.id)
})

test('generator: a maqam song sounds in its mode, microtones reach midi(), chords get neutral names', async () => {
  const { source, meta } = generate({ style: 'lofi', seed: 3, key: 'C', mode: 'rast' })
  assert.equal(meta.mode, 'rast')
  const song = await load(source)
  assert.equal(song.mode, 'rast')
  const lead = Object.values(song.tracks)[0], scale = MODES.rast.iv
  const plan = JSON.parse(source.match(/const LEAD = (\[.*\])/)[1]), firstUp = plan.find(r => r[2] !== 0)?.[0] ?? song.length
  let notes = 0, micro = 0
  for (let x = 0; x < firstUp; x += 0.125) for (const v of lead.midi(x)) {
    notes++
    assert.ok(scale.some(d => near(pcf(v), d)), `${v} not in rast`)
    if (!Number.isInteger(v)) micro++
  }
  assert.ok(notes > 20 && micro > 0, `${micro} microtones of ${notes}`)
  assert.match(source, /'[A-G]𝄳?n(ⁿ7|7|maj7)?'/) // a neutral chord somewhere
  const stems = render({ ...song, length: 16 })
  for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 13) assert.ok(Number.isFinite(L[i]), `${k}: NaN`)
})

test('generator: Sikah on E𝄳 — the whole song a quarter tone under E', async () => {
  const { source, meta } = generate({ style: 'bossa', seed: 2, key: 'E𝄳', mode: 'sikah' })
  assert.equal(meta.key, 'E𝄳')
  const song = await load(source)
  assert.equal(song.key, 'E𝄳')
  const steps = MODES.sikah.iv.map(v => pcf(v + 3.5))
  const lead = Object.values(song.tracks)[0], plan = JSON.parse(source.match(/const LEAD = (\[.*\])/)[1]), firstUp = plan.find(r => r[2] !== 0)?.[0] ?? song.length
  for (let x = 0; x < firstUp; x += 0.25) for (const v of lead.midi(x)) assert.ok(steps.some(d => near(pcf(v), d)), `${v} outside sikah on E𝄳`)
})

test('generator: ¼- and ⅛-tone writing keeps the rhythm and the beats', async () => {
  for (const [micro, step] of [['quarter', 0.5], ['eighth', 0.25]]) {
    const plain = generate({ style: 'classical', seed: 4, key: 'Am' }), m = generate({ style: 'classical', seed: 4, key: 'Am', micro })
    assert.equal(m.meta.micro, micro)
    const notesOf = src => JSON.parse('[' + src.match(/const THEME_A = \[([\s\S]*?)\n\]/)[1].replace(/,\s*$/, '') + ']')
    const a = notesOf(plain.source), b = notesOf(m.source)
    assert.ok(b.some(([, v]) => !Number.isInteger(v)), `${micro}: no microtones`)
    assert.ok(b.every(([, v]) => near(v / step, Math.round(v / step), 1e-6)), `${micro}: off the ${step} grid`)
    // every onset of the plain theme is still an onset, and the theme ends where it ended
    const on = new Set(b.map(e => e[0]))
    for (const [t] of a) assert.ok(on.has(t), `${micro}: the beat ${t} moved`)
    assert.ok(near(Math.max(...a.map(e => e[0] + e[2])), Math.max(...b.map(e => e[0] + e[2])), 1e-6))
    const song = await load(m.source), stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 13) assert.ok(Number.isFinite(L[i]), `${micro} ${k}: NaN`)
  }
})

test('generator: tunings — the notes stay, the sound moves, the song says which tuning', async () => {
  for (const t of ['werckmeister3', 'meantone', 'just', 'adaptive', 'edo31']) {
    const plain = generate({ style: 'romantic', seed: 6, key: 'D' }), g = generate({ style: 'romantic', seed: 6, key: 'D', temperament: t })
    assert.equal(g.meta.temperament, t)
    const melody = s => s.match(/const THEME_A = \[[\s\S]*?\n\]/)[0]
    assert.equal(melody(g.source), melody(plain.source), `${t}: the written notes changed`)
    const song = await load(g.source)
    assert.equal(song.tuning.id, t)
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 13) assert.ok(Number.isFinite(L[i]), `${t} ${k}: NaN`)
  }
})

test('retune: any song into a maqam (E → E𝄳) and into a temperament', async () => {
  const src = fs.readFileSync('songs/lofi.js', 'utf8'), song = (await import(pathToFileURL(path.resolve('songs/lofi.js')).href)).default
  const r = retuneSource(src, song, { tonic: 'F', mode: 'rast' }, { parse: acorn.parse })
  const copy = await load(r.source)
  assert.equal(copy.mode, 'rast')
  const flute = copy.tracks.flute
  const seen = new Set()
  for (let x = 16; x < 100; x += 0.25) for (const v of [].concat(flute.midi(x) ?? [])) seen.add(pcf(v))
  assert.ok([...seen].some(v => near(v, 8.5)), 'A𝄳 in F rast') // the third of F, a quarter tone down
  const t = retuneSource(src, song, { tonic: 'F', mode: 'major', temperament: 'werckmeister3' }, { parse: acorn.parse })
  const tc = await load(t.source)
  assert.equal(tc.tuning.id, 'werckmeister3')
  assert.equal(tc.tuning.offsets[9], 0)
  const stems = render({ ...tc, length: 8 })
  for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 11) assert.ok(Number.isFinite(L[i]), `${k}: NaN`)
})

test('MPE MIDI: each microtone on its own channel with the right pitch bend', async () => {
  const { source } = generate({ style: 'lofi', seed: 3, key: 'C', mode: 'rast' })
  const song = await load(source)
  assert.ok(isMicrotonal(song))
  const bytes = midiFile(song, { mpe: true }), lead = Object.keys(song.tracks)[0]
  // walk the lead's track: every note-on is preceded by a bend on its channel; bend − 8192 = (n − note) · 8192 / 48
  let p = 14, found = 0, checked = 0
  while (p < bytes.length) {
    const len = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7], end = p + 8 + len
    let q = p + 8, name = '', run = 0
    const bend = new Array(16).fill(8192)
    const vlq = () => { let v = 0, b; do { b = bytes[q++]; v = (v << 7) | (b & 0x7f) } while (b & 0x80); return v }
    const ons = []
    while (q < end) {
      vlq()
      let st = bytes[q]
      if (st & 0x80) q++
      else st = run
      run = st
      if (st === 0xff) { const type = bytes[q++], l = vlq(); if (type === 3) name = new TextDecoder().decode(bytes.slice(q, q + l)); q += l; continue }
      const hi = st & 0xf0, ch = st & 15
      if (hi === 0xc0) { q++; continue }
      const a = bytes[q++], b = bytes[q++]
      if (hi === 0xe0) bend[ch] = a | (b << 7)
      if (hi === 0x90 && b) ons.push([ch, a, bend[ch]])
    }
    if (name === lead) {
      found++
      for (const [ch] of ons) assert.ok(ch >= 1 && ch <= 8, 'member channel 2–9')
      const micro = ons.filter(([, , v]) => v !== 8192)
      assert.ok(micro.length > 0, 'microtones bent')
      for (const [, note, v] of micro) { checked++; assert.ok(near(v, bendValue(-0.5), 1) || near(v, bendValue(0.5), 1), `bend ${v} for ${note}`) }
    }
    p = end
  }
  assert.equal(found, 1)
  assert.ok(checked > 0)
  // every note survives with its cents
  const ev = scanNotes(song.tracks[lead].midi, song.length, 480, { exact: true })
  assert.ok(ev.some(e => e[1] && !Number.isInteger(e[2])))
})

test('tuning files: Scala .scl/.kbm and Ableton .ascl', () => {
  const t = tuningFiles({ name: 'w', key: 'C', tuning: { id: 'werckmeister3' } })
  const scl = t['tuning.scl'].split('\n').filter(l => !l.startsWith('!'))
  assert.equal(scl[1].trim(), '12')
  assert.equal(scl[2].trim(), '90.225')
  assert.equal(scl[13].trim(), '1200.')
  assert.match(t['tuning.ascl'], /@ABL REFERENCE_PITCH 3 0 263\.40\d\d/) // C4 so that A4 = 440
  assert.match(t['tuning.ascl'], /@ABL NOTE_NAMES "C" /)
  const r = tuningFiles({ name: 'r', key: 'C' }, { mode: MODES.rast })
  assert.match(r['tuning.ascl'], /@ABL NOTE_NAMES "C" "D" "E𝄳" "F" "G" "A" "B𝄳"/)
  assert.ok(r['tuning.scl'].includes(' 350.'))
})

// an improvised solo over a theme with quarter tones: its range (8.5 … 30) is taken in whole notes — it used to find no note
// of the scale and play NaN
test('generator: a solo over a microtonal theme plays notes, not NaN', async () => {
  const { source } = generate({ style: 'darkecho', seed: 202626, melody: 1604595311, arrangement: 202626, instruments: 4040949173, key: 'Ebm', micro: 'quarter', modulations: true })
  const song = await load(source)
  for (const [k, t] of Object.entries(song.tracks)) if (t.midi) for (let x = 0; x < song.length; x += 0.25) assert.ok(t.midi(x).every(Number.isFinite), `${k} at ${x}`)
})
