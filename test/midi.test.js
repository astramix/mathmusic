// MIDI export (src/midi.js): every note survives, parts get the right instrument, drums go to channel 10.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { midiFile, scanNotes, gmProgram } from '../src/midi.js'

const load = async name => (await import(pathToFileURL(path.resolve('songs', name + '.js')).href)).default

// a small reader: per track { name, channel, program, notes: [[tick, note, length]] }
function readMidi(bytes) {
  const u = bytes, tracks = []
  let p = 14
  const ppq = (u[12] << 8) | u[13]
  while (p < u.length) {
    const len = (u[p + 4] << 24) | (u[p + 5] << 16) | (u[p + 6] << 8) | u[p + 7], end = p + 8 + len
    const t = { name: '', channel: null, program: null, notes: [] }, open = new Map()
    let q = p + 8, tick = 0
    const vlq = () => { let v = 0, b; do { b = u[q++]; v = (v << 7) | (b & 0x7f) } while (b & 0x80); return v }
    while (q < end) {
      tick += vlq()
      const st = u[q++]
      if (st === 0xff) {
        const type = u[q++], n = vlq()
        if (type === 3) t.name = new TextDecoder().decode(u.slice(q, q + n))
        q += n
      } else if ((st & 0xf0) === 0xc0) {
        t.program = u[q++]
      } else {
        const note = u[q++], vel = u[q++]
        t.channel = st & 15
        if ((st & 0xf0) === 0x90 && vel) open.set(note, tick)
        else { t.notes.push([open.get(note), note, tick - open.get(note)]); open.delete(note) }
      }
    }
    assert.equal(open.size, 0, `${t.name}: every note-on has its note-off`)
    tracks.push(t)
    p = end
  }
  return { ppq, tracks }
}

test('fast repeats keep every hit: the timpani roll, the kawaii clap roll', async () => {
  const timp = readMidi(midiFile(await load('classical'))).tracks.find(t => t.name === 'timpani')
  assert.equal(timp.notes.length, 22) // 5 single hits + a roll of 16 eighths-of-a-beat + the canon hit
  assert.equal(timp.channel === 9, false, 'timpani are pitched (GM 47), not the drum channel')
  assert.equal(timp.program, 47)
  const clap = readMidi(midiFile(await load('kawaii'))).tracks.find(t => t.name === 'clap')
  assert.equal(clap.channel, 9)
  assert.equal(clap.notes.length, scanNotes((await load('kawaii')).tracks.clap.midi, (await load('kawaii')).length, 1920).filter(e => e[1]).length)
})

test('every part gets a fitting General MIDI program; drums go to channel 10', async () => {
  const drums = ['clap', 'crash', 'toms', 'paw', 'hiss', 'claws', 'hats', 'kick', 'snare', 'drums']
  for (const k of drums) assert.equal(gmProgram(k), -1, k)
  const want = { timpani: 47, tomcat: 54, mrrp: 54, b808: 38, cowbell: 113, musicbox: 10, sparkles: 9, pads: 89, strings: 48,
    'marimba arp': 12, 'harpsichordarp arp': 6, 'vibes counter': 11, 'pulse12 counter': 80, chiparp: 80, sawpad: 89, hook: 81, arp: 81 }
  for (const [k, v] of Object.entries(want)) assert.equal(gmProgram(k), v, k)
  // the drum channel is never given to a melodic part, however many there are
  for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) {
    const song = await load(f.slice(0, -3)), { tracks } = readMidi(midiFile(song))
    for (const t of tracks.slice(1)) if (t.notes.length) assert.equal(t.channel === 9, gmProgram(t.name) === -1, `${f} ${t.name}`)
  }
})

test('muted parts are left out', async () => {
  const song = await load('example')
  const all = readMidi(midiFile(song)).tracks.length, less = readMidi(midiFile(song, { muted: new Set(['kick']) })).tracks.length
  assert.equal(less, all - 1)
})
