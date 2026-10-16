// Modulations in the generator (opts.modulations): theme II and the bridge in other keys, each change prepared by a
// bar of [pivot, V7 of the new key], the melody of a modulated section in its key, chords spelt by it, the score's
// signatures following song.keys; without the option the song is exactly what the seed always gave.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate } from '../src/generate.js'
import { parseKey, roman, chordName, SCALES, songKey } from '../src/theory.js'
import { buildScore, guessParts } from '../src/score.js'
import { musicXml } from '../src/musicxml.js'
import { render } from '../src/engine.js'

const DIR = path.resolve('out/_test_mod')
fs.mkdirSync(DIR, { recursive: true })
let n = 0
const load = async source => {
  const file = path.join(DIR, `m${n++}.mjs`)
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  return (await import(pathToFileURL(file).href)).default
}
const rows = source => [...source.matchAll(/^  \[([\d.]+), ([\d.]+), [\d.]+, \[[^\]]*\], '([^']*)'/gm)].map(m => ({ at: +m[1], len: +m[2], symbol: m[3] }))
const CASES = [['classical', 3, 'D'], ['classical', 5, 'Gm'], ['romantic', 2, 'Eb'], ['romantic', 7, 'Bm'], ['lofi', 4, 'F'], ['bossa', 3, 'C'], ['kawaii', 1, 'A'], ['space', 2, 'Dm'], ['synthwave', 6, 'Em']]

test('without the option nothing changes; with it the song says where it goes', () => {
  const plain = generate({ style: 'classical', seed: 3, key: 'D' })
  assert.ok(!/keys: \[/.test(plain.source) && plain.meta.modulations == null)
  const m = generate({ style: 'classical', seed: 3, key: 'D', modulations: true })
  assert.ok(m.meta.modulations.length >= 1)
  assert.match(m.source, /keys: \[\[0,"D"\]/)
  assert.match(m.source, /"modulations":true/)
})

test('every key change is prepared: [pivot, V7 of the new key] in the bar before it', () => {
  for (const [style, seed, key] of CASES) {
    const { source } = generate({ style, seed, key, modulations: true })
    const keys = JSON.parse(source.match(/keys: (\[.*\]),/)[1]), H = rows(source)
    for (const [at, name] of keys.slice(1)) {
      const k = parseKey(name), v7 = chordName(roman('V7', k), k)
      const before = H.find(h => h.at === at - 2)
      assert.ok(before, `${style} ${seed}: no chord at ${at - 2}`)
      assert.equal(before.symbol, v7, `${style} ${seed}: the bar before ${name} at ${at} ends on ${before.symbol}, not ${v7}`)
      assert.ok(H.find(h => h.at === at - 4), `${style} ${seed}: no pivot at ${at - 4}`)
    }
  }
})

test('a modulated section sings in its key, its chords are spelt by it, the song renders', async () => {
  for (const [style, seed, key] of CASES) {
    const { source, meta } = generate({ style, seed, key, modulations: true })
    const song = await load(source)
    const keys = song.keys
    const tracks = Object.entries(song.tracks).filter(([k]) => !/drum|kick|bass|arp|counter|pad|strings|choir|riser|wind|rain|vinyl|purr|thunder/i.test(k))
    for (const m of meta.modulations) {
      const i = keys.findIndex(k => k[0] === m.at), end = keys[i + 1]?.[0] ?? song.length, k = parseKey(m.key)
      const scale = new Set([...SCALES.major, ...SCALES.harmonic, ...SCALES.melodic, ...SCALES.minor].map(v => (v + k.tonic) % 12))
      let notes = 0, off = 0
      for (let x = m.at; x < end - 4; x += 0.25) for (const [, t] of tracks) for (const v of t.midi?.(x) ?? []) { notes++; if (!scale.has(((v % 12) + 12) % 12)) off++ }
      assert.ok(notes > 8 && off / notes < 0.12, `${style} ${seed} ${m.section} in ${m.key}: ${off}/${notes} notes outside it`)
    }
    // a chord of a section in G says F♯, never G♭
    for (const h of rows(source)) assert.ok(!/[A-G]♯♭|[A-G]♭♯/.test(h.symbol), h.symbol)
    if (style !== 'classical' && style !== 'lofi') continue
    const stems = render({ ...song, length: 12 })
    for (const [t, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 17) assert.ok(Number.isFinite(L[j]), `${style} ${t}: NaN`)
  }
})

test('the score follows the keys: new signatures, the notes spelt by them, MusicXML <key> where they change', async () => {
  const { source } = generate({ style: 'classical', seed: 3, key: 'D', modulations: true })
  const song = await load(source), key = songKey(song)
  const sc = buildScore(song, { parts: guessParts(song), key, source })
  const f = sc.bars.find(b => b.at === 80), a = sc.bars.find(b => b.at === 112)
  assert.equal(f.sig.fifths, -1) // F major
  assert.equal(a.sig.fifths, 3) // A major
  assert.equal(sc.bars[0].sig.fifths, 2)
  const xml = musicXml(sc)
  assert.equal((xml.match(/<key><fifths>/g) ?? []).length / sc.parts.length, song.keys.length)
})
