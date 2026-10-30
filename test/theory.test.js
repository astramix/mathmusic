// Music theory: spelling by key, Roman numerals, voice leading, key detection.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { spell, parseKey, roman, chordName, voiceLead, songKey, keyName, freq } from '../src/theory.js'

const K = s => parseKey(s)
test('A4 = 440 Hz, equal temperament', () => {
  assert.equal(freq(69), 440)
  assert.ok(Math.abs(freq(60) - 261.6256) < 1e-4)
})
test('notes are spelt by the key', () => {
  assert.deepEqual([70, 73].map(n => spell(n, K('Dm'))), ['B♭4', 'C♯5'])
  assert.deepEqual([63, 68].map(n => spell(n, K('Eb'))), ['E♭4', 'A♭4'])
  assert.equal(spell(77, K('F#')), 'E♯5')
  assert.equal(spell(71, K('Cm')), 'B4')
  assert.equal(spell(61, K('A')), 'C♯4')
})
test('Roman numerals', () => {
  const c = s => chordName(roman(s, K('C')), K('C'))
  assert.deepEqual(['ii7', 'V7', 'Imaj7', 'vi7', 'bVI', 'iv', 'V/V', 'viiø7'].map(c), ['Dm7', 'G7', 'Cmaj7', 'Am7', 'A♭', 'Fm', 'D', 'Bø7'])
  const d = s => chordName(roman(s, K('Dm')), K('Dm'))
  assert.deepEqual(['i', 'iv', 'V7', 'VI', 'VII', 'bII'].map(d), ['Dm', 'Gm', 'A7', 'B♭', 'C', 'E♭'])
  // a sharp in minor raises the minor's own degree (the leading tone), a flat counts from the major scale
  assert.deepEqual(['#vii°7', '#vii°', '#iv°7', 'bVI', 'bVII'].map(d), ['C♯°7', 'C♯°', 'G♯°7', 'B♭', 'C'])
})
test('voice leading keeps common tones and stays compact', () => {
  const c = voiceLead([0, 4, 7], null)
  const f = voiceLead([5, 9, 0], c)
  assert.ok(f.some(n => c.includes(n)), 'C stays')
  assert.ok(f[f.length - 1] - f[0] <= 17, 'within a tenth or so')
  assert.ok(f.reduce((s, n, i) => s + Math.abs(n - c[i]), 0) <= 16, 'small movement')
})
test('songs declare the right key or it is detected', async () => {
  let ok = 0, n = 0
  for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) {
    const song = (await import(pathToFileURL('songs/' + f).href)).default
    // (a song in a mode of its own — a maqam, a raga's thaat — is not a major or minor key to detect)
    if (!song.key || song.mode) continue
    n++
    const d = songKey({ ...song, key: undefined }), k = K(song.key)
    if (d.tonic === k.tonic && d.mode === k.mode) ok++
  }
  assert.ok(ok / n >= 0.7, `key detection ${ok}/${n}`)
})
