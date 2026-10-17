// The celtic style: its modes and meters come from its own dice (jigs in 6/8, reels in 4/4; mixolydian, dorian…), the tunes
// carry cuts and rolls, the drone holds the tonic and the fifth; the songs load and render.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate } from '../src/generate.js'
import { render } from '../src/engine.js'
import { MODES } from '../src/modes.js'
import { parseKey } from '../src/theory.js'

const DIR = path.resolve('out/_test_celtic')
fs.mkdirSync(DIR, { recursive: true })
const pc = n => ((n % 12) + 12) % 12

test('celtic: modes and meters of its own, ornaments, the drone, renders', async () => {
  const seen = { meter: new Set(), mode: new Set() }
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { source, meta } = generate({ style: 'celtic', seed })
    seen.meter.add(meta.meter ?? '4/4')
    seen.mode.add(meta.mode ?? 'major/minor')
    if (seed > 3) continue
    const file = path.join(DIR, `c${seed}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    // ornaments: grace notes (a sixteenth of a beat or shorter) in the tunes
    const theme = source.match(/const THEME_A = \[([\s\S]*?)\n\]/)[1]
    const graces = [...theme.matchAll(/\[[\d.]+, -?[\d.]+, ([\d.]+)\]/g)].filter(m => +m[1] <= 0.07).length
    assert.ok(graces >= 3, `#${seed}: ${graces} graces`)
    // the drone: the tonic and its fifth
    const d = song.tracks.bass.midi(song.sections[1][0] + 1)
    assert.equal(d.length, 2)
    assert.equal(d[1] - d[0], 7)
    assert.equal(pc(d[0]), pc(parseKey(meta.key).tonic))
    if (song.mode) assert.ok(MODES[song.mode])
    const stems = render({ ...song, length: 10 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
  }
  assert.ok(seen.meter.has('6/8') && seen.meter.has('4/4'), [...seen.meter].join())
  assert.ok(seen.mode.size >= 2, [...seen.mode].join())
})
