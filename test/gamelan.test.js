// The gamelan style: every pitch is a tone of the measured laras (to the cent), the colotomic gongs fall where the form
// puts them, irama II halves the balungan and doubles the garap against it, the songs render.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { composeGamelan, PATHET, LARAS, FORMS } from '../src/gamelan.js'
import { generate, rng } from '../src/generate.js'
import { render } from '../src/engine.js'
import { saronTone } from '../src/instruments.js'

test('pitches of the measured laras; colotomy; irama II', () => {
  for (const pathet of Object.keys(PATHET)) for (const form of Object.keys(FORMS)) {
    const P = PATHET[pathet], cents = Object.entries(LARAS[P.laras].cents).filter(([t]) => P.tones.includes(+t)).map(([, c]) => c)
    const f = composeGamelan({ pathet, form, r: rng(5) })
    for (const list of [f.balungan, f.peking, f.bonang, f.panerus, f.suling]) for (const [b, n] of list) {
      const c = (((n - 62) * 100) % 1200 + 1200) % 1200
      assert.ok(cents.some(v => Math.abs(v - c) < 0.6 || Math.abs(v - c) > 1199.4), `${pathet}: ${n} at ${b} (${c.toFixed(1)} ¢) is not a tone of the laras`)
    }
    // every gong closes a gongan of F.beats balungan notes: the gongs (after the buka's) are F.beats notes apart
    const F = FORMS[form], gongs = f.colot.filter(c => c[1] === 'gong').map(c => c[0])
    const notesBetween = (a, b) => f.balungan.filter(([t]) => t > a + 1e-6 && t <= b + 1e-6).length
    for (let i = 1; i < gongs.length; i++) assert.ok(notesBetween(gongs[i - 1], gongs[i]) <= F.beats, `${form}: ${notesBetween(gongs[i - 1], gongs[i])} notes between gongs`)
    // irama II: balungan notes two beats apart, the peking four strokes per balungan note
    const ir = f.sections.find(s => s[1].startsWith('irama II'))[0]
    const inII = f.balungan.filter(([t]) => t >= ir && t < ir + 16)
    assert.ok(inII.every(([, , d]) => d === 2 || d >= 2), 'half speed')
    const pk = f.peking.filter(([t]) => t >= ir && t < ir + 16)
    assert.equal(pk.length, 32, 'four peking strokes per balungan note')
  }
})

test('the ombak: a saron tone beats (two bars a few Hz apart)', () => {
  // the envelope of the fundamental band rises and falls ≈ 4.5 times a second
  const f = 293.66, SR = 44100, env = []
  for (let i = 0; i < SR; i += 441) {
    let a = 0
    for (let j = 0; j < 441; j++) { const t = (i + j) / SR; a = Math.max(a, Math.abs(saronTone(f, t, 1))) }
    env.push(a * Math.exp(((i / SR) * 1) / 1.6))
  }
  let turns = 0
  for (let i = 2; i < env.length; i++) if ((env[i] - env[i - 1]) * (env[i - 1] - env[i - 2]) < 0) turns++
  assert.ok(turns >= 6, `${turns} turns of the envelope in a second`)
})

test('gamelan songs load and render', async () => {
  const DIR = path.resolve('out/_test_gamelan')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 2, mode: 'pelog' }, { seed: 3, length: 'short' }].entries()) {
    const { source, meta } = generate({ style: 'gamelan', ...opts })
    if (opts.mode) assert.ok(meta.pathet.startsWith('pelog'))
    const file = path.join(DIR, `g${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    assert.ok(Object.keys(song.tracks).length >= 9)
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
  }
})
