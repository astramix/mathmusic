// The raga style: every note of the sitar and the bansuri is a note of the raga; up the aroha and down the avaroha (the
// zigzag of Darbari included); tihais end exactly on the sam; the shrutis are just ratios; the songs render.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { composeRaga, RAGAS, shrutiCents, tihai } from '../src/raga.js'
import { generate, rng } from '../src/generate.js'
import { render } from '../src/engine.js'
import { songKey } from '../src/theory.js'
import { buildScore, guessParts } from '../src/score.js'

const pcOf = n => ((n % 12) + 12) % 12

test('every raga: its notes only; ascending steps by the aroha, descending by the avaroha', () => {
  for (const raga of Object.keys(RAGAS)) for (const seed of [1, 2, 3]) {
    const R = RAGAS[raga], f = composeRaga({ raga, r: rng(seed) })
    const up = new Set(R.aroha.map(pcOf)), down = new Set(R.avaroha.map(pcOf))
    for (const list of [f.sitar.filter(e => !e[3]?.chikari), f.bansuri]) {
      for (const [b, n] of list) assert.ok(R.swaras.includes(pcOf(n)), `${raga} #${seed}: ${n} at ${b}`)
      // a step up lands on an aroha note, a step down on an avaroha note (steps of a scale degree or two)
      let badUp = 0, badDown = 0, steps = 0
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1][1], b = list[i][1], d = b - a
        if (Math.abs(list[i][0] - list[i - 1][0] - list[i - 1][2]) > 0.6 || !d || Math.abs(d) > 4) continue
        steps++
        if (d > 0 && !up.has(pcOf(b))) badUp++
        if (d < 0 && !down.has(pcOf(b))) badDown++
      }
      assert.ok(badUp + badDown <= Math.max(2, 0.04 * steps), `${raga} #${seed}: ${badUp} up, ${badDown} down of ${steps}`)
    }
    assert.ok(f.sections.length >= 6)
  }
})

test('a tihai: three times the phrase with equal gaps, the last note on the sam', () => {
  const ph = [[0, 7, 0.5], [0.5, 4, 0.5], [1, 2, 0.5], [1.5, 0, 0.5]]
  for (const [C, g] of [[64, 0.5], [80, 1], [96, 0]]) {
    const t = tihai(ph, C, g), last = t[t.length - 1]
    assert.equal(last[0], C)
    const starts = [0, 4, 8].map(i => t[i][0])
    assert.equal(starts[1] - starts[0], starts[2] - starts[1])
    assert.equal(starts[1] - starts[0], 2 + g)
  }
})

test('the shrutis: just ratios (Yaman\'s tivra Ma 45/32, Darbari\'s ati komal ga 32/27)', () => {
  const y = shrutiCents('yaman'), d = shrutiCents('darbari')
  assert.equal(y[4], -13.7) // G = 5/4: 386.3 ¢
  assert.equal(y[6], -9.8) // M′ = 45/32: 590.2 ¢
  assert.equal(d[3], -5.9) // g = 32/27: 294.1 ¢ — lower than the just 6/5 (315.6 ¢)
  assert.ok(shrutiCents('bhairav')[1] < -9) // r = 256/243
})

test('raga songs load, render, carry their tuning and a score', async () => {
  const DIR = path.resolve('out/_test_raga')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 2, mode: 'aeolian' }, { seed: 3, length: 'short' }].entries()) {
    const { source, meta } = generate({ style: 'raga', ...opts })
    if (opts.mode === 'aeolian') assert.equal(meta.raga, 'darbari')
    const file = path.join(DIR, `r${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    assert.equal(song.tuning.id, 'shruti')
    assert.equal(song.tuning.offsets.length, 12)
    assert.ok(Object.keys(song.tracks).length >= 7 && song.sections.length >= 4)
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
    const sc = buildScore(song, { parts: guessParts(song), key: songKey(song), source })
    assert.ok(sc.parts.length === 2)
  }
})
