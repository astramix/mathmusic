// src/retune.js: the same music in another tonic and mode. Every song that isn't generated (those are made again
// from their seeds) is retuned into two modes: it loads, its midi() is the original mapped degree by degree into the
// new mode and tonic (modulations kept), a few bars render without NaN; a copy retuned again starts from the original.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as acorn from '../viz/vendor/acorn.min.mjs'
import { retuneSource, degreeTable, modulations, UNPITCHED } from '../src/retune.js'
import { songKey } from '../src/theory.js'
import { MODES } from '../src/modes.js'
import { render } from '../src/engine.js'

const SRC = pathToFileURL(path.resolve('src')).href + '/'
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retune-'))
let n = 0
// a copy as a module: its imports pointed at src/ by absolute URL
const load = async source => {
  const file = path.join(dir, `s${n++}.mjs`)
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${SRC}`))
  return (await import(pathToFileURL(file).href)).default
}
test.after(() => fs.rmSync(dir, { recursive: true, force: true }))

test('degree table: same degree in the new mode, alterations kept', () => {
  const t = degreeTable(MODES.major.iv, MODES.minor.iv)
  assert.deepEqual([0, 2, 4, 5, 7, 9, 11].map(p => p + t[p]), [0, 2, 3, 5, 7, 8, 10]) // E → E♭, A → A♭, B → B♭
  const h = degreeTable(MODES.minor.iv, MODES.major.iv)
  assert.equal(11 + h[11], 11) // the raised seventh of minor (G♯ in A) is the major's leading tone, not the tonic
  const l = degreeTable(MODES.major.iv, MODES.lydian.iv)
  assert.equal(5 + l[5], 6) // IV → ♯IV
})

test('modulations: real key changes found, builds on the dominant are not', async () => {
  const mods = async f => {
    const song = (await import(pathToFileURL(path.resolve(`songs/${f}.js`)).href)).default, key = songKey(song)
    return modulations(song, key, key.mode === 'minor' ? MODES.minor.iv : MODES.major.iv)
  }
  assert.deepEqual(await mods('raiden'), [[0, 0], [240, 2]]) // Em → F♯m
  assert.deepEqual(await mods('kitsune-bi'), [[0, 0], [208, 2]]) // Am → Bm
  assert.deepEqual(await mods('kagekiri'), [[0, 0]]) // Dm throughout (its builds sit on A)
})

const files = fs.readdirSync('songs').filter(f => f.endsWith('.js'))
for (const target of [{ tonic: 'D', mode: 'dorian' }, { tonic: 'B♭', mode: 'major' }]) {
  test(`every hand-written song → ${target.tonic} ${target.mode}`, async () => {
    for (const f of files) {
      const src = fs.readFileSync(`songs/${f}`, 'utf8'), song = (await import(pathToFileURL(path.resolve(`songs/${f}`)).href)).default
      if (song.generator) continue
      const r = retuneSource(src, song, target, { parse: acorn.parse, theme: 'void' })
      const copy = await load(r.source), p = r.plan
      assert.equal(copy.name, `${song.name} · ${p.label}`, f)
      assert.equal(copy.key, target.mode === 'major' ? 'Bb' : 'Dm', f)
      const want = (v, x) => { let o = 0; for (const s of p.sect) if (s[0] <= x) o = s[1]; return v + p.to[(((v - p.tonic - o) % 12) + 12) % 12] + p.tr }
      for (const [k, t] of Object.entries(song.tracks)) {
        if (typeof t?.midi !== 'function') continue
        for (let x = 0.5; x < song.length; x += 3.7) {
          const a = [].concat(t.midi(x) ?? []), b = [].concat(copy.tracks[k].midi(x) ?? [])
          // drums keep their notes (GM: 36 stays the kick)
          a.forEach((v, i) => Number.isFinite(v) && assert.equal(b[i], UNPITCHED.test(k) ? v : want(Math.round(v), x), `${f} ${k} at ${x}`))
        }
      }
      const stems = render({ ...copy, length: Math.min(copy.length, 8) })
      for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 11) assert.ok(Number.isFinite(L[i]), `${f} ${k}: NaN`)
    }
  })
}

// a kick tuned with hz() (at the top and inside audio) stays where it was; the lead moves
const TUNED = `import { hz, sin, TAU } from '../src/engine.js'
const KICK_F = hz(-21)
const kick = { midi: x => [36], audio({ bpm }) { const f2 = hz(-9); let p = 0, q = 0; return x => { p += KICK_F / 44100; q += f2 / 44100; return sin(TAU * p) + sin(TAU * q) } } }
const lead = { midi: x => [64], audio({ bpm }) { const f = hz(7); let p = 0; return x => { p += f / 44100; return sin(TAU * p) } } }
export default { name: 'tuned', bpm: 120, length: 8, key: 'C', tracks: { kick, lead } }
`
test('drums keep their notes and their own pitch', async () => {
  const song = await load(TUNED), r = retuneSource(TUNED, song, { tonic: 'D', mode: 'major' }, { parse: acorn.parse }), copy = await load(r.source)
  assert.deepEqual(copy.tracks.kick.midi(1), [36])
  assert.deepEqual(copy.tracks.lead.midi(1), [66])
  const one = (s, k) => render({ ...s, tracks: { [k]: s.tracks[k] } })[k][0]
  const a = one(song, 'kick'), b = one(copy, 'kick')
  assert.ok(a.every((y, i) => y === b[i]), 'the kick moved')
  const la = one(song, 'lead'), lb = one(copy, 'lead')
  assert.ok(!la.every((y, i) => y === lb[i]), 'the lead stayed')
})

test('a copy retuned again starts from the original', async () => {
  const src = fs.readFileSync('songs/raiden.js', 'utf8'), song = (await import(pathToFileURL(path.resolve('songs/raiden.js')).href)).default
  const a = retuneSource(src, song, { tonic: 'D', mode: 'minor' }, { parse: acorn.parse })
  const copy = await load(a.source)
  const b = retuneSource(a.source, copy, { tonic: 'G', mode: 'phrygian' }, { parse: acorn.parse })
  const again = await load(b.source), direct = await load(retuneSource(src, song, { tonic: 'G', mode: 'phrygian' }, { parse: acorn.parse }).source)
  assert.equal(again.name, 'raiden · G фригийский')
  for (let x = 1; x < song.length; x += 5.3) assert.deepEqual(again.tracks.koto.midi(x), direct.tracks.koto.midi(x), `at ${x}`)
})
