// The ambient style: loops of lengths that share no common measure (the whole repeats only after their LCM, far beyond the
// piece), each note a tone of the scale — the harmonic series' own cents when it is that — and the songs render.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { composeAmbient, lcmOf } from '../src/ambient.js'
import { generate, rng } from '../src/generate.js'
import { MODES } from '../src/modes.js'
import { render } from '../src/engine.js'

test('LCM of the loops and the scale', () => {
  assert.equal(lcmOf([4, 6]), 12)
  assert.equal(lcmOf([17, 20.5]), 697)
  const iv = MODES.harmonic.iv
  for (const seed of [1, 2, 3]) {
    const f = composeAmbient({ iv, tonic: 62, r: rng(seed) })
    assert.ok(f.lcm > 1000 * f.length, `${f.lcm} vs ${f.length}`)
    for (const l of f.loops) for (const [, n] of l.notes) {
      const c = ((((n - 62) * 100) % 1200) + 1200) % 1200
      assert.ok(iv.some(v => Math.abs(v * 100 - c) < 0.6), `${n}: ${c} ¢ is not an overtone 8–15`)
    }
    // the loops come and go: every loop has an entry before its exit
    for (const l of f.loops) assert.ok(l.from < l.to)
  }
})

test('ambient songs load and render (harmonic series and a mode)', async () => {
  const DIR = path.resolve('out/_test_ambient')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 2, mode: 'harmonic' }, { seed: 3, length: 'short' }].entries()) {
    const { source } = generate({ style: 'ambient', ...opts })
    const file = path.join(DIR, `a${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    if (opts.mode) assert.equal(song.mode, 'harmonic')
    assert.ok(Object.keys(song.tracks).length >= 7)
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
  }
})
