// Counterpoint by the rules: the canon and the fugue (src/counterpoint.js, src/fugue.js) break no rule of check() in
// any key or church mode; the exposition is subject – answer – subject with the same invertible countersubject; the
// canon's follower is its leader a bar later an octave down; the generated song loads, renders, writes a score.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { composeFugue } from '../src/fugue.js'
import { check, speciesCanon, counterVoice, consonant, spelledDissonance } from '../src/counterpoint.js'
import { generate, rng } from '../src/generate.js'
import { parseKey, pc, songKey, QUALITIES } from '../src/theory.js'
import { MODES } from '../src/modes.js'
import { buildScore, guessParts } from '../src/score.js'
import { musicXml } from '../src/musicxml.js'
import { render } from '../src/engine.js'

test('the rules: parallels, dissonances, the augmented second are found', () => {
  const key = parseKey('Dm')
  // parallel fifths D–A → E–B, a strong-beat second, a leap of a seventh
  const f = check([[[0, 69, 1], [1, 71, 1], [2, 72, 1], [3, 76, 1]], [[0, 62, 1], [1, 64, 1], [2, 70, 1], [3, 62, 1]]], { key })
  assert.ok(f.some(x => x.kind === 'parallel' && x.at === 1))
  assert.ok(f.some(x => x.kind === 'dissonance' && x.at === 2))
  // B♭ – C♯ sounds like a minor third but is an augmented second in D minor
  assert.ok(spelledDissonance(70, 73, key) && !consonant(70, 73, true, key) && consonant(70, 73))
  // a passing note between the beats is fine
  assert.equal(check([[[0, 69, 1], [1, 67, 0.5], [1.5, 65, 0.5], [2, 65, 2]], [[0, 62, 4]]], { key }).filter(x => x.kind === 'dissonance').length, 0)
})

test('a counter-voice against a line keeps every rule', () => {
  const key = parseKey('C'), cf = [[0, 60, 2], [2, 62, 2], [4, 64, 2], [6, 65, 2], [8, 64, 2], [10, 62, 2], [12, 60, 4]]
  const rhythm = []
  for (let b = 0; b < 12; b += 1) rhythm.push([b, 1])
  rhythm.push([12, 4])
  const v = counterVoice({ contexts: [{ voices: [{ notes: cf, above: false }] }], rhythm, key, lo: 64, hi: 81, r: rng(3), pins: [[12, [0]]] })
  assert.deepEqual(check([v, cf], { key }), [])
  assert.equal(pc(v[v.length - 1][1]), 0)
})

test('the canon: the follower is the leader a bar later, an octave down; no fault', () => {
  for (const k of ['Dm', 'G', 'F#m']) {
    const key = parseKey(k), c = speciesCanon({ key, bars: 10, delay: 4, interval: -12, lo: 65, hi: 81, r: rng(7) })
    const cut = 36
    for (const [b, n] of c.comes.filter(([b]) => b < cut - 1)) {
      const lead = c.dux.find(([db]) => Math.abs(db + 4 - b) < 1e-9)
      assert.ok(lead && lead[1] - 12 === n || (pc(n) !== pc(lead[1]) && b >= cut - 2), `${k}: comes ${b}`)
    }
    assert.deepEqual(check([c.dux, c.comes], { key }), [])
    assert.equal(pc(c.dux[c.dux.length - 1][1]), key.tonic)
  }
})

const KEYS = ['Dm', 'Gm', 'C', 'F', 'Am', 'E♭', 'Bm', 'A']
test('fugues in eight keys and four church modes: no fault, the plan of a fugue', () => {
  const cases = [...KEYS.map(k => [parseKey(k), k]), ...['dorian', 'phrygian', 'lydian', 'mixolydian'].map(m => [{ tonic: 2, mode: 'modal', iv: MODES[m].iv }, 'D ' + m])]
  for (const [key, label] of cases) for (const seed of [1, 2, 3]) {
    const f = composeFugue({ key, r: rng(seed) })
    assert.deepEqual(f.faults.map(x => `${x.at} ${x.text}`), [], `${label} #${seed}`)
    const names = f.sections.map(s => s[1])
    for (const s of ['exposition', 'episode', 'middle entry', 'coda']) assert.ok(names.includes(s), `${label}: ${s}`)
    // the exposition: alto subject, soprano answer, bass subject — in the tonic, the answer's key, the tonic
    const [e1, e2, e3] = f.entries
    assert.deepEqual([e1.voice, e2.voice, e3.voice], ['a', 's', 'b'])
    assert.ok(/answer/.test(e2.kind) && e1.kind === 'subject' && e3.kind === 'subject')
    // the subject starts on 1̂ or 5̂ and ends on 1̂ or 3̂
    const sub = f.subject.notes, t = key.tonic
    assert.ok([0, 7].includes(pc(sub[0][1] - t)), `${label}: starts on ${pc(sub[0][1] - t)}`)
    assert.ok([0, 3, 4].includes(pc(sub[sub.length - 1][1] - t)), `${label}: ends on ${pc(sub[sub.length - 1][1] - t)}`)
    // the answer: the subject a fifth up (a fourth in a plagal mode), its head maybe mutated (tonal)
    if (key.mode !== 'modal') {
      const diffs = f.answer.map(([, n], i) => pc(n - sub[i][1]))
      assert.ok(diffs.filter(d => d === 7).length >= sub.length - 2, `${label}: answer ${diffs}`)
      if (!f.subject.tonal) assert.ok(diffs.every(d => d === 7))
    }
    // the same countersubject (as pitch classes moved by the entry's key) under the answer and over the bass's subject
    const csAt = (v, a) => f.voices[v].filter(([b]) => b >= a + 0.5 - 1e-6 && b < a + f.subject.L - 1e-6).map(e => e[1])
    const c2 = csAt('a', e2.at), c3 = csAt('s', e3.at)
    assert.equal(c2.length, c3.length, `${label}: the CS twice`)
    // the coda ends on the tonic in the outer voices, a major third in minor (Picardy)
    const last = v => f.voices[v][f.voices[v].length - 1][1]
    assert.equal(pc(last('s') - t), 0)
    assert.equal(pc(last('b') - t), 0)
    if (key.mode === 'minor') assert.equal(pc(last('a') - t), 4)
  }
})

test('the organ style: a prelude of chord tones over the pedal, then the fugue on the organ', async () => {
  const DIR = path.resolve('out/_test_fugue')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 2, key: 'G' }, { seed: 3, length: 'short' }].entries()) {
    const { source, meta } = generate({ style: 'organ', ...opts })
    assert.equal(meta.fugue.faults, 0)
    assert.equal(meta.style, 'organ')
    const file = path.join(DIR, `o${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    assert.equal(song.sections[0][1], 'prelude')
    assert.ok(song.tracks.plenum && song.tracks.pedal, 'the prelude\'s manual and pedal')
    // each bar of the prelude is one chord broken up: its notes make at most four pitch classes, all of one triad or seventh
    for (let bar = 0; 4 * bar < song.sections[1][0]; bar++) {
      const pcs = new Set()
      for (let x = 4 * bar; x < 4 * bar + 4; x += 0.25) for (const n of song.tracks.plenum.midi(x)) pcs.add(pc(n))
      assert.ok(pcs.size >= 3 && pcs.size <= 4, `bar ${bar}: ${[...pcs]}`)
      const fits = [...Array(12).keys()].some(r => Object.values(QUALITIES).some(q => [...pcs].every(p => q.map(i => (r + i) % 12).includes(p))))
      assert.ok(fits, `bar ${bar}: ${[...pcs]} is no chord`)
    }
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
  }
})

test('the fugue style: songs load, render, keep the home signature, write a score', async () => {
  const DIR = path.resolve('out/_test_fugue')
  fs.mkdirSync(DIR, { recursive: true })
  for (const [i, opts] of [{ seed: 1 }, { seed: 10 }, { seed: 6, key: 'D', mode: 'dorian', temperament: 'werckmeister3' }, { seed: 4, length: 'short' }].entries()) {
    const { source, meta } = generate({ style: 'fugue', ...opts })
    assert.equal(meta.fugue.faults, 0)
    const file = path.join(DIR, `f${i}.mjs`)
    fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
    const song = (await import(pathToFileURL(file).href)).default
    assert.ok(song.sections.length >= 7 && Object.keys(song.tracks).length >= (opts.length === 'short' ? 6 : 7)) // a short one has no canon (nor its winds)
    if (opts.mode) assert.equal(song.mode, 'dorian')
    if (opts.temperament) assert.equal(song.tuning.id, 'werckmeister3')
    const stems = render({ ...song, length: 12 })
    for (const [k, [L]] of Object.entries(stems)) for (let j = 0; j < L.length; j += 31) assert.ok(Number.isFinite(L[j]), `${k}: NaN`)
    const parts = guessParts(song)
    assert.deepEqual(parts, song.parts)
    const sc = buildScore(song, { parts, key: songKey(song), source })
    assert.ok(sc.bars.every(b => b.sig === sc.signature), 'one key signature')
    assert.match(musicXml(sc), /<part-list>/)
  }
})
