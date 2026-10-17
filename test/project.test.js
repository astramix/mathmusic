// Projects (src/project.js): every instrument plays (finite, audible), the block reads and writes back unchanged, a song
// becomes a project and keeps its own tracks, notes come back from midi(), an arrangement under a melody leaves the
// melody to its track and brings the style's parts in time with it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as acorn from '../viz/vendor/acorn.min.mjs'
import { INSTRUMENTS, newProjectSource, readProject, writeProject, isProject, trackKeys, readTrackNotes, alignedParts, instrumentFor } from '../src/project.js'
import { generate } from '../src/generate.js'
import { midiFile } from '../src/midi.js'

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..')
let n = 0
// a song source as a module (it imports ../src/…, so it lives next to the tests for the moment)
async function load(source) {
  const file = path.join(HERE, `_project_tmp_${process.pid}_${n++}.js`)
  fs.writeFileSync(file, source)
  try { return (await import(pathToFileURL(file).href)).default } finally { fs.rmSync(file, { force: true }) }
}
const SR = 44100

test('every instrument plays a phrase: finite, audible, in time', async () => {
  const tracks = INSTRUMENTS.map((d, i) => {
    const mid = Math.round((d.range[0] + d.range[1]) / 2)
    const notes = d.kind === 'drums' ? [[0, 36, 0.25, 0.9], [0.5, 42, 0.25, 0.7], [1, 38, 0.25, 0.9], [1.5, 46, 0.25, 0.7]] : [[0, mid, 1, 0.8], [1, mid + 2, 0.5, 0.7], [1.5, mid + 3.5, 0.5, 0.7]]
    if (d.kind === 'chord') notes.push([0, mid + 4, 2, 0.8], [0, mid + 7, 2, 0.8])
    return { id: 't' + i, name: d.id, inst: d.id, notes }
  })
  const song = await load(newProjectSource({ name: 'all', bpm: 120, key: 'C', bars: 1, tracks }))
  assert.equal(Object.keys(song.tracks).length, INSTRUMENTS.length)
  const sec = 60 / song.bpm
  for (const [k, t] of Object.entries(song.tracks)) {
    const f = t.audio({ bpm: song.bpm })
    let peak = 0, early = 0
    for (let s = 0; s < 2.5 * sec * SR; s++) {
      const y = f(s / SR / sec), [l, r] = typeof y === 'number' ? [y, y] : y
      assert.ok(Number.isFinite(l) && Number.isFinite(r), `${k}: not finite at sample ${s}`)
      peak = Math.max(peak, Math.abs(l), Math.abs(r))
      if (s < 0.4 * sec * SR) early = Math.max(early, Math.abs(l), Math.abs(r))
    }
    assert.ok(peak > 1e-3, `${k} is silent (${peak})`)
    assert.ok(early > 1e-4, `${k} doesn't sound on its first beat`)
    assert.ok(peak < 4, `${k} far too loud (${peak})`)
    assert.ok(Array.isArray(t.formula) && t.formula.length, `${k} has a formula`)
    assert.ok(Number.isInteger(t.program), `${k} has a GM program`)
  }
  // a quarter tone stays one: midi() reports 63.5 for E𝄳
  const t = Object.values(song.tracks)[0]
  assert.deepEqual(t.midi(1.6), [INSTRUMENTS[0].range[0] + Math.round((INSTRUMENTS[0].range[1] - INSTRUMENTS[0].range[0]) / 2) + 3.5])
})

test('the block reads back and writes back unchanged', () => {
  const src = newProjectSource({ name: 'x', bpm: 90, key: 'Dm', mode: 'dorian', bars: 4, tracks: [{ id: 't1', name: 'Флейта', inst: 'flute', vol: 0.8, pan: -0.3, fx: 'hall', notes: [[0, 62, 1, 0.8], [1, 64.5, 0.5, 0.6]], gen: { style: 'lofi', seed: 3, kind: 'melody' } }] })
  assert.ok(isProject(src))
  const p = readProject(src)
  assert.equal(p.song.mode, 'dorian')
  assert.deepEqual(p.tracks[0].notes[1], [1, 64.5, 0.5, 0.6])
  assert.equal(writeProject(src, p), src)
  p.tracks[0].notes.push([2, 65, 1, 0.8])
  assert.equal(readProject(writeProject(src, p)).tracks[0].notes.length, 3)
})

test('a song becomes a project: its own tracks stay, new ones come, removed ones go', async () => {
  const src = fs.readFileSync(path.join(ROOT, 'songs/bossa.js'), 'utf8').replace(/\r/g, '')
  const before = await load(src)
  const own = Object.keys(before.tracks).filter(k => before.tracks[k])
  const p = { removed: [own[0]], tracks: [{ id: 't1', name: own[1], inst: 'harp', notes: [[0, 60, 1, 0.8]] }, { id: 't2', name: 'Виолончель', inst: 'cello', notes: [[0, 48, 400, 0.8]] }] }
  const out = writeProject(src, p, { parse: acorn.parse })
  assert.match(out, /export default __project\(\{/)
  const song = await load(out)
  const keys = Object.keys(song.tracks)
  assert.ok(!keys.includes(own[0]), 'the removed track is gone')
  for (const k of own.slice(1)) assert.ok(keys.includes(k), `${k} stays`)
  const pk = trackKeys(p, own)
  assert.deepEqual(keys.slice(-2), [pk.t1, pk.t2])
  assert.notEqual(pk.t1, own[1], 'a name taken by the song gets a number')
  assert.equal(song.length, Math.max(before.length, 400))
  assert.equal(song.name, before.name)
  assert.equal(writeProject(out, readProject(out)), out)
  // the MIDI export plays the harp as a harp (GM 46), whatever its name
  const mid = midiFile({ ...song, tracks: { [pk.t1]: song.tracks[pk.t1] } })
  const bytes = [...mid]
  assert.ok(bytes.some((b, i) => (b & 0xf0) === 0xc0 && bytes[i + 1] === 46), 'program change 46')
})

test('notes come back from midi(): onsets, written lengths behind a gate, microtones', () => {
  const N = [[0, 60, 1], [1, 62, 0.5], [1.5, 63.5, 0.5], [2, 65, 2], [4, 65, 0.25], [4.25, 65, 0.25]]
  const midi = x => N.filter(([b, , d]) => x >= b && x < b + d * 0.92).map(e => e[1])
  const got = readTrackNotes(midi, 6)
  assert.deepEqual(got.map(e => [e[0], e[1], e[2]]), N)
})

test('an arrangement under a melody: the style\'s parts in time with it, the melody left alone', async () => {
  const mel = [[0, 62, 1], [1, 65, 0.5], [1.5, 64, 0.5], [2, 62, 2], [4, 69, 1], [5, 67, 1], [6, 65, 1], [7, 64, 1], [8, 62, 2], [10, 60, 1], [11, 64, 1], [12, 62, 4]]
  for (const style of ['jazz', 'lofi', 'classical']) {
    const { source } = generate({ style, seed: 3, userTheme: { notes: mel }, modulations: false })
    const song = await load(source)
    const parts = Object.entries(song.tracks).filter(([, t]) => t?.midi).map(([k, t]) => [k, readTrackNotes(t.midi, song.length)])
    const al = alignedParts(parts, mel, 16)
    assert.ok(al, `${style}: the theme is found`)
    const roles = al.parts.map(x => x.role)
    for (const r of ['bass', 'drums']) if (style !== 'classical' || r === 'bass') assert.ok(roles.includes(r), `${style}: a ${r} part (${roles})`)
    for (const x of al.parts) for (const e of x.notes) assert.ok(e[0] >= 0 && e[0] < 16, `${style} ${x.name}: in the melody's 4 bars`)
    // the bass on beat 1 holds the harmony's root: a chord tone of the melody's key
    const bass = al.parts.find(x => x.role === 'bass')
    assert.ok(bass.notes.some(e => e[0] === 0), `${style}: the bass begins with the melody`)
  }
  // a melody longer than the style's theme section still plays whole
  const long = Array.from({ length: 64 }, (_, i) => [i, 60 + [0, 2, 4, 5, 7, 5, 4, 2][i % 8], 1])
  const { source } = generate({ style: 'lofi', seed: 2, userTheme: { notes: long }, modulations: false })
  const song = await load(source)
  const al = alignedParts(Object.entries(song.tracks).map(([k, t]) => [k, readTrackNotes(t.midi, song.length)]), long, 64)
  assert.ok(al, 'a 16-bar melody is played as theme A')
})

test('instruments for parts of other songs', () => {
  assert.equal(instrumentFor('rhodes'), 'epiano')
  assert.equal(instrumentFor('trumpet counter'), 'trumpet')
  assert.equal(instrumentFor('bass', 'bossa'), 'upright')
  assert.equal(instrumentFor('bass', 'synthwave'), 'synthbass')
  assert.equal(instrumentFor('bass', 'chiptune'), 'chiptri')
  assert.equal(instrumentFor('drums'), 'drums')
  assert.equal(instrumentFor('marimba arp'), 'marimba')
})
