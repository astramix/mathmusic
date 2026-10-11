// Every song renders completely: no NaN/∞, no track hotter than −1.5 dBFS after the mixdown
// ("hot?" in render.js). "quiet?" tracks (except ambience) are reported as warnings.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { measureAll, flags } from './pool.js'

const files = fs.readdirSync('songs').filter(f => f.endsWith('.js')).map(f => 'songs/' + f)
const results = await measureAll(files)

for (const file of files) {
  test(`${file} renders cleanly`, t => {
    const r = results.get(file)
    assert.ok(!r.error, r.error)
    const f = flags(r)
    assert.ok(f.length > 0, 'no audible tracks')
    for (const x of f) {
      assert.ok(!x.nan, `${x.key}: NaN/∞ in the output`)
      assert.ok(!x.hot, `${x.key}: hot? — peak ${x.peak.toFixed(1)} dBFS after the mixdown`)
      if (x.quiet) t.diagnostic(`quiet? ${x.key}: RMS ${x.rms.toFixed(1)} dB`)
    }
    t.diagnostic(`${r.seconds.toFixed(0)} s`)
  })
}
