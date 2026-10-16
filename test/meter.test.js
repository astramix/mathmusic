// Meters in the generator (opts.meter): a song made in 4/4 mapped onto 3/4, 5/4, 7/8, 9/8, 7/4, 7/8 + 9/8, 12/8, 6/8 —
// its chords change on bar lines, its drums keep the meter's groups, it writes out bar by bar, it renders.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate, METERS } from '../src/generate.js'
import { buildScore, guessParts, songBars } from '../src/score.js'
import { songKey } from '../src/theory.js'
import { musicXml } from '../src/musicxml.js'
import { render } from '../src/engine.js'

const DIR = path.resolve('out/_test_meter')
fs.mkdirSync(DIR, { recursive: true })
let n = 0
const load = async source => {
  const file = path.join(DIR, `m${n++}.mjs`)
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  return (await import(pathToFileURL(file).href)).default
}

test('in 4/4 nothing changes; a meter is declared and described', () => {
  const plain = generate({ style: 'lofi', seed: 2 })
  assert.ok(!/\n {2}meter:/.test(plain.source))
  const m = generate({ style: 'lofi', seed: 2, meter: '7/8' })
  assert.match(m.source, /\n {2}meter: '2\+2\+3\/8'/)
  assert.equal(m.meta.meter, '7/8')
  // the hardstyle styles keep four on the floor
  assert.equal(generate({ style: 'boss', seed: 2, meter: '7/8' }).meta.meter, null)
})

for (const meter of Object.keys(METERS)) {
  test(`${meter}: chords on the bar lines, the score adds up, it renders`, async () => {
    for (const style of ['lofi', 'classical']) {
      const { source } = generate({ style, seed: 3, meter })
      const song = await load(source)
      const bars = songBars(song), starts = bars.map(b => b.at)
      const minutes = (song.length * 60) / song.bpm / 60
      assert.ok(minutes > 1.7 && minutes < 3.6, `${style}: ${minutes.toFixed(1)} min`)
      // every chord starts on a bar line, a boundary of the bar's groups or one of its beats — never off the beat
      const H = [...source.matchAll(/^ {2}\[([\d.]+), ([\d.]+), [\d.]+, \[/gm)].map(m => +m[1])
      for (const a of H) {
        const b = bars.findLast(x => x.at <= a + 1e-6), rel = a - b.at
        const bounds = [0]
        for (const g of b.meter.groups) bounds.push(bounds[bounds.length - 1] + g / b.meter.xTicks)
        const perBeat = b.meter.compound ? 1 : b.meter.unit / 4 // the meter's own beats: quarters, or eighths in /8
        assert.ok(bounds.some(v => Math.abs(v - rel) < 1e-6) || Math.abs(rel * perBeat - Math.round(rel * perBeat)) < 1e-6, `${style}: a chord at ${a}, ${rel} into bar ${b.n} (${b.meter.text})`)
      }
      assert.ok(starts.length > 20)
      const sc = buildScore(song, { parts: guessParts(song), key: songKey(song), source })
      for (const p of sc.parts) p.bars.forEach((evs, i) => assert.equal(evs.reduce((s, e) => s + e.dur, 0), sc.bars[i].meter.barTicks, `${style} ${p.name} bar ${i + 1}`))
      assert.match(musicXml(sc), new RegExp(`<beats>${sc.bars[0].meter.text.split('/')[0].replace(/\+/g, '\\+')}</beats>`))
      const stems = render({ ...song, length: 10 })
      for (const [k, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 23) assert.ok(Number.isFinite(L[i]), `${style} ${k}: NaN`)
    }
  })
}
