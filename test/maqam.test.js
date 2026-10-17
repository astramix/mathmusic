// The maqam style: every note in its maqam (the tahwil's maqam in the tahwil, Rast's B♭ only going down), quarter
// tones exact in the sound, the sayr's resting notes, the iqa' cycles; the songs load, render and write a score.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { composeMaqam, maqamPcs, MAQAMAT, IQA } from '../src/maqam.js'
import { MODES } from '../src/modes.js'
import { generate, rng } from '../src/generate.js'
import { parseKey, songKey, spell, keyAt } from '../src/theory.js'
import { buildScore, guessParts } from '../src/score.js'
import { musicXml } from '../src/musicxml.js'
import { render, SR } from '../src/engine.js'
import { oud, qanun } from '../src/instruments.js'

const inScale = (n, pcs) => pcs.some(p => Math.abs((((n - p) % 12) + 12) % 12) < 1e-6 || Math.abs((((n - p) % 12) + 12) % 12 - 12) < 1e-6)

test('every maqam: notes in the maqam, the tahwil in its own, the qafla on the qarar', () => {
  for (const mode of Object.keys(MAQAMAT)) for (const seed of [1, 2, 3]) {
    const home = parseKey(MODES[mode].home), tonic = 60 + home.tonic - (home.tonic > 6.5 ? 12 : 0)
    const f = composeMaqam({ mode, tonic, r: rng(seed) })
    const keyOf = b => { let k = f.keys[0]; for (const x of f.keys) if (x[0] <= b) k = x; return k }
    for (const [b, n] of [...f.melody, ...f.taqsims.flatMap(t => t.notes)]) {
      const [, m, sh] = keyOf(b)
      assert.ok(inScale(n, maqamPcs(m, tonic + sh)), `${mode} #${seed}: ${n} at ${b} is not in ${m}`)
      assert.ok(Number.isInteger(n * 2), `${mode}: ${n} is not on the quarter-tone grid`)
    }
    // Rast's B♭ comes only on the way down
    if (mode === 'rast') for (let i = 0; i + 1 < f.melody.length; i++) {
      const [b, n] = f.melody[i]
      if (keyOf(b)[1] === 'rast' && Math.abs((((n - tonic) % 12) + 12) % 12 - 10) < 1e-6) assert.ok(f.melody[i + 1][1] < n, `B♭ going up at ${b}`)
    }
    // the last note of the piece: the qarar
    const last = f.melody[f.melody.length - 1]
    assert.equal((((last[1] - tonic) % 12) + 12) % 12, 0, `${mode}: the qafla ends on ${last[1]}`)
    // a tahwil and two taqsims (normal length); the iqa' cycles are 16 sixteenths
    assert.equal(f.taqsims.length, 2)
    assert.ok(f.keys.some(k => k[1] !== mode || k[2] !== 0))
  }
  for (const p of Object.values(IQA)) assert.equal(p.length, 16)
})

test('a quarter tone sounds as one: the oud and the qanun are tuned to the cent', () => {
  // E𝄳4 = 440 · 2^(−5.5/12) = 320.24 Hz: count the period of the plucked string by zero crossings of a low-passed tone
  for (const make of [oud, qanun]) {
    const s = make(), f = 440 * 2 ** (-5.5 / 12)
    s.hit(f, 0.8)
    const y = Float64Array.from({ length: SR }, () => s())
    // autocorrelation peak near the expected period
    const P = SR / f, lo = Math.floor(P * 0.97), hi = Math.ceil(P * 1.03), seg = y.subarray(SR / 4, SR / 4 + 8192)
    let best = 0, bestL = 0
    for (let L = lo; L <= hi; L++) { let c = 0; for (let i = 0; i + L < seg.length; i++) c += seg[i] * seg[i + L]; if (c > best) (best = c), (bestL = L) }
    // parabolic interpolation of the peak
    const ac = L => { let c = 0; for (let i = 0; i + L < seg.length; i++) c += seg[i] * seg[i + L]; return c }
    const a = ac(bestL - 1), b = ac(bestL), c = ac(bestL + 1), L = bestL + (0.5 * (a - c)) / (a - 2 * b + c)
    const cents = 1200 * Math.log2(SR / L / f)
    assert.ok(Math.abs(cents) < 4, `${make.name}: ${cents.toFixed(1)} cents off`)
  }
})

test('maqam songs: load, render, spell the tahwil in its maqam, write a score in quarter tones', async () => {
  const DIR = path.resolve('out/_test_maqam')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 2, mode: 'bayati' }, { seed: 3, mode: 'sikah' }, { seed: 4, mode: 'saba', length: 'short' }].entries()) {
    const { source, meta } = generate({ style: 'maqam', ...opts })
    if (opts.mode) assert.equal(meta.mode, opts.mode)
    const file = path.join(DIR, `m${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    assert.ok(song.sections.length >= 6 && Object.keys(song.tracks).length >= 7)
    const minutes = (song.length * 60) / song.bpm / 60
    assert.ok(minutes > (opts.length === 'short' ? 1.2 : 1.7) && minutes < 4, `${minutes} min`)
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
    const key = songKey(song)
    // the tahwil's notes are spelt in its maqam (Saba: G♭, not F♯)
    if (meta.mode === 'bayati' && song.keys.some(k => k[2] === 'saba')) {
      const at = song.keys.find(k => k[2] === 'saba')[0]
      const k = keyAt(song, at, key)
      assert.equal(spell(66, k), 'G♭4')
    }
    const sc = buildScore(song, { parts: guessParts(song), key, mode: song.mode, source })
    const xml = musicXml(sc)
    assert.match(xml, /<alter>-0\.5<\/alter>|<alter>0\.5<\/alter>/)
  }
})
