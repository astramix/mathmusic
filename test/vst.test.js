// The user's plugins: an Ableton set read (notes, a plugin's state), a jBridge stub followed to its original, a DLL's bitness,
// stems from elsewhere replacing a track's audio, and — where our host and a plugin are installed — a real render through it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { readSet } from '../tools/als.mjs'
import { peBits, resolveStub, scanPlugins, renderPart, partNotes } from '../src/vst.js'
import { render } from '../src/engine.js'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mm-vst-'))

test('an Ableton set: tempo, a track’s notes (clip place, loop start), its plugin state; drum pads', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Ableton Creator="Ableton Live 10.1.6"><LiveSet><Tracks>
  <MidiTrack Id="1"><Name><EffectiveName Value="1-DSK ChoirZ" /></Name>
    <MidiClip Id="1" Time="8"><CurrentStart Value="8" /><CurrentEnd Value="12" /><Loop><LoopStart Value="4" /><LoopEnd Value="8" /><LoopOn Value="false" /></Loop>
      <Notes><KeyTracks><KeyTrack Id="0"><Notes><MidiNoteEvent Time="4" Duration="2" Velocity="127" OffVelocity="64" IsEnabled="true" /><MidiNoteEvent Time="6" Duration="1" Velocity="64" OffVelocity="64" IsEnabled="false" /></Notes><MidiKey Value="62" /></KeyTrack></KeyTracks></Notes></MidiClip>
    <VstPluginInfo Id="0"><FileName Value="DSK ChoirZ.dll" /><PlugName Value="DSK ChoirZ" /><UniqueId Value="1685285731" />
      <Preset><VstPreset Id="4"><Type Value="1178747752" /><ProgramNumber Value="5" /><Buffer>CAFE0042</Buffer></VstPreset></Preset></VstPluginInfo>
  </MidiTrack>
  <MidiTrack Id="2"><Name><EffectiveName Value="7-Kit" /></Name><DrumBranch Id="0"><ReceivingNote Value="92" /></DrumBranch></MidiTrack>
  </Tracks><MasterTrack><Tempo><Manual Value="139" /></Tempo></MasterTrack></LiveSet></Ableton>`
  const dir = tmp(), f = path.join(dir, 'Test.als')
  fs.writeFileSync(f, zlib.gzipSync(xml))
  const s = readSet(f)
  assert.equal(s.tempo, 139)
  const [choir, kit] = s.tracks
  assert.deepEqual(choir.notes, [[8, 62, 2, 1]]) // at the clip's place (8), counted from LoopStart (4); the disabled note left out
  assert.equal(choir.plugin.name, 'DSK ChoirZ')
  assert.equal(choir.plugin.program, 5)
  assert.ok(choir.plugin.bank)
  assert.deepEqual([...choir.plugin.chunk], [0xca, 0xfe, 0x00, 0x42])
  assert.equal(kit.pads[0].note, 36) // ReceivingNote 92 = MIDI 36
})

test('a jBridge stub leads to its original; a DLL’s bitness from its PE header', () => {
  const dir = tmp(), pe = bits => {
    const b = Buffer.alloc(512)
    b.write('MZ', 0, 'latin1'); b.writeUInt32LE(0x80, 0x3c); b.write('PE\0\0', 0x80, 'latin1'); b.writeUInt16LE(bits === 64 ? 0x8664 : 0x14c, 0x84)
    return b
  }
  const orig = path.join(dir, 'real', 'Choir.dll'), stub = path.join(dir, 'stub', 'Choir.dll')
  fs.mkdirSync(path.dirname(orig)); fs.mkdirSync(path.dirname(stub))
  fs.writeFileSync(orig, pe(32))
  fs.writeFileSync(stub, pe(64))
  fs.writeFileSync(stub.replace(/\.dll$/, '.txt'), `"${orig}"\nID: 1\nflags: effFlagsIsSynth\n`)
  assert.equal(resolveStub(stub), orig)
  assert.equal(peBits(orig), 32)
  assert.equal(peBits(stub), 64)
  assert.equal(peBits(stub.replace(/\.dll$/, '.txt')), null)
  const found = scanPlugins([path.join(dir, 'stub'), path.join(dir, 'real')])
  assert.equal(found.length, 1)
  assert.deepEqual([found[0].name, found[0].path, found[0].bits, found[0].via], ['Choir', orig, 32, stub])
})

test('stems rendered elsewhere replace a track’s own audio; the plugin gets the notes its midi() says, doubled by octaves', () => {
  const song = { name: 't', bpm: 120, length: 4, tracks: {
    a: { audio: () => () => 0.5, midi: x => (x < 1 ? [60] : []), vst: { plugin: 'X', octaves: [0, -12] } },
    b: { audio: () => () => 0.25 },
  } }
  const n = Math.ceil((4 * 0.5 + 2) * 44100), given = [new Float32Array(n).fill(0.1), new Float32Array(n).fill(0.2)]
  const stems = render(song, { stems: { a: given } })
  assert.equal(stems.a[0][100], given[0][100])
  assert.equal(stems.a[1][100], given[1][100])
  assert.equal(stems.b[0][100], 0.25)
  const notes = partNotes(song.tracks.a, song)
  assert.deepEqual(notes.map(([t, d, m]) => [t, +d.toFixed(2), m]), [[0, 0.5, 60], [0, 0.5, 48]])
})

const choir = scanPlugins().find(p => p.name === 'DSK ChoirZ' && p.hosted)
test('a real render through an installed plugin (skipped where there is none)', { skip: !choir && 'DSK ChoirZ is not installed here' }, async () => {
  const { L, R } = await renderPart({ plugin: choir, program: 1, notes: [[0, 1, 62, 0.8], [0, 1, 69, 0.8]], seconds: 2, sr: 44100 })
  let peak = 0
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  assert.ok(L.length >= 88200)
  assert.ok(peak > 0.01, 'the plugin sang (peak ' + peak + ')')
})
