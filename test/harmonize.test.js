// The harmonizer and songs on a melody you played: the key found, chord tones on the strong parts, a V – I cadence, and
// the generator keeping the melody as written as theme A, in its key, with its harmony.
import test from 'node:test'
import assert from 'node:assert/strict'
import { harmonize, userMelody } from '../src/harmonize.js'
import { generate } from '../src/generate.js'
import { pc, roman } from '../src/theory.js'

// Ode to Joy as one would play it (quarters, the cadences dotted), D major
const ode = (() => {
  const a = [66, 66, 67, 69, 69, 67, 66, 64, 62, 62, 64, 66].map((n, i) => [i, n, 1])
  const b = [66, 66, 67, 69, 69, 67, 66, 64, 62, 62, 64, 66].map((n, i) => [16 + i, n, 1])
  return [...a, [12, 66, 1.5], [13.5, 64, 0.5], [14, 64, 2], ...b, [28, 64, 1.5], [29.5, 62, 0.5], [30, 62, 2]]
})()
const minor = [[0, 69, 1], [1, 72, 1], [2, 76, 2], [4, 74, 1], [5, 72, 1], [6, 71, 2], [8, 69, 1], [9, 71, 1], [10, 72, 1], [11, 74, 1], [12, 71, 2], [14, 68, 2], [16, 69, 4]]

test('the harmonizer: key, chord tones on the strong parts, the cadence', () => {
  const h = harmonize(ode)
  assert.equal(h.keyName, 'D')
  assert.equal(h.chords.at(-1), 'I')
  assert.match(h.chords.at(-2), /^V7?$/)
  assert.equal(h.chords[0], 'I')
  // every note on a half-bar step's start is a tone of its chord
  for (const [b, n] of h.notes) if (Math.abs(b / h.per - Math.round(b / h.per)) < 1e-9) {
    const ch = roman(h.chords[Math.floor(b / h.per)], h.key)
    assert.ok(ch.tones.includes(pc(n)), `${n} at ${b} over ${h.chords[Math.floor(b / h.per)]}`)
  }
  const m = harmonize(minor)
  assert.equal(m.key.mode, 'minor')
  assert.equal(m.chords.at(-1), 'i')
  assert.ok(m.fit > 0.8)
})

test('a song on your melody: theme A as written (moved by octaves only), in its key, harmonized', () => {
  for (const style of ['lofi', 'jazz', 'classical', 'celtic']) {
    const { source, meta } = generate({ style, seed: 2, userTheme: { notes: ode } })
    assert.equal(meta.key, 'D')
    assert.equal(meta.themes.A.how, 'as written')
    assert.deepEqual(meta.userTheme.chords, harmonize(ode).chords)
    const theme = [...source.match(/const THEME_A = \[([\s\S]*?)\n\]/)[1].matchAll(/\[([\d.]+), (-?[\d.]+), ([\d.]+)\]/g)].map(m => [+m[1], +m[2], +m[3]])
    const shift = theme[0][1] + 60 - ode[0][1]
    assert.equal(shift % 12, 0, `${style}: moved by ${shift}`)
    assert.deepEqual(theme.map(([b, n, d]) => [b, n + 60 - shift, d]), ode, style)
    // made again from the song's own generator field: the same song
    const g = JSON.parse(source.match(/generator: (\{.*\}),/)[1])
    assert.equal(generate({ style, seed: g.seed, userTheme: g.userTheme }).source, source)
  }
  assert.equal(userMelody(minor).key, harmonize(minor).keyName)
})
