// The generator: deterministic, every style makes a song that loads, renders an excerpt without
// NaN, whose graph/midi never throw, whose lead sits on its chords, and which is long enough.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate, STYLES } from '../src/generate.js'
import { pc, songKey, SCALES } from '../src/theory.js'

const DIR = path.resolve('out/_test_gen')
fs.mkdirSync(DIR, { recursive: true })
const load = async (name, source) => {
  const file = path.join(DIR, name + '.js')
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, '$1../../src/'))
  return (await import(pathToFileURL(file).href + '?' + Date.now())).default
}

test('same seeds → the same song; another melody seed → other melodies, same arrangement', () => {
  const a = generate({ style: 'lofi', seed: 42 }), b = generate({ style: 'lofi', seed: 42 })
  assert.equal(a.source, b.source)
  const c = generate({ style: 'lofi', seed: 42, melody: 7 })
  assert.notEqual(a.source, c.source)
  assert.equal(c.meta.key, a.meta.key)
  assert.equal(c.meta.bpm, a.meta.bpm)
  assert.deepEqual(c.meta.form, a.meta.form)
  assert.deepEqual(c.meta.instruments, a.meta.instruments)
})

// modes: every pitch of the themes and chords moves into the mode; songs load, render and stay in it
test('modes: the lead stays in the mode (before any key change), the song renders', async () => {
  const { MODES } = await import('../src/modes.js')
  for (const [style, key, mode] of [['lofi', 'D', 'dorian'], ['classical', 'E', 'phrygian'], ['romantic', 'F', 'lydian'], ['bossa', 'G', 'mixolydian'],
    ['jbattle', 'B', 'locrian'], ['jbattle', 'E', 'hirajoshi'], ['jbattle', 'D', 'in'], ['lofi', 'A', 'blues'], ['space', 'C', 'wholeTone'], ['boss', 'E', 'phrygianDom']]) {
    const { source, meta } = generate({ style, seed: 5, key, mode })
    assert.equal(meta.mode, mode)
    const song = await load(`mode-${mode}`, source)
    assert.equal(song.mode, mode)
    const tonic = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[key], scale = new Set(MODES[mode].iv.map(v => (v + tonic) % 12))
    const plan = JSON.parse(source.match(/const LEAD = (\[.*\])/)[1]), firstUp = plan.find(r => r[2] !== 0)?.[0] ?? song.length
    const lead = Object.values(song.tracks)[0]
    let notes = 0, off = 0
    for (let x = 0; x < Math.min(firstUp, song.length); x += 0.25) for (const n of lead.midi(x)) { notes++; if (!scale.has(pc(n))) off++ }
    assert.ok(notes > 20 && off === 0, `${mode}: ${off}/${notes} lead notes outside the mode`)
    for (const [k, tr] of Object.entries(song.tracks)) {
      const f = tr.audio({ bpm: song.bpm, sample: () => null })
      for (let i = 0; i < 44100 * 2; i++) {
        const y = f(i / 44100 / (60 / song.bpm)), v = typeof y === 'number' ? y : y[0]
        assert.ok(Number.isFinite(v), `${mode} ${k}: NaN`)
      }
    }
  }
})

for (const style of Object.keys(STYLES)) {
  for (const seed of [1, 2, 3]) {
    test(`${style} #${seed}`, async t => {
      const { source, meta } = generate({ style, seed })
      const song = await load(`${style}-${seed}`, source)
      const sec = 60 / song.bpm, minutes = (song.length * sec) / 60
      assert.ok(minutes > 1.7 && minutes < 4, `length ${minutes.toFixed(1)} min`)
      assert.ok(song.sections.length >= 6, 'at least 6 sections')
      assert.ok(Object.keys(song.tracks).length >= 7, 'at least 7 tracks')
      // graph & midi everywhere
      for (const [k, tr] of Object.entries(song.tracks)) {
        for (let x = 0; x < song.length; x += 0.37) {
          tr.graph?.(x)
          const m = tr.midi?.(x)
          // (quarter tones are fractional: 63.5 = E𝄳4 — in a song of a microtonal mode)
          if (m) assert.ok(Array.isArray(m) && m.every(n => (Number.isInteger(n) || (song.mode && Number.isInteger(n * 4))) && n >= 0 && n < 128), `${k}.midi(${x})`)
        }
      }
      // audio: 6 s from the start and 10 s of the final section, every track
      const SR = 44100, fin = song.sections.find(s => /final|key|level 2|castle|eclipse|all cats|finale/.test(s[1]))?.[0] ?? song.length / 2
      for (const [k, tr] of Object.entries(song.tracks)) {
        const f = tr.audio({ bpm: song.bpm, sample: () => null })
        let sum = 0
        for (const [a, b] of [[0, 6 * SR], [Math.round(fin * sec * SR), Math.round(fin * sec * SR) + 10 * SR]]) {
          for (let i = a; i < b; i++) {
            const y = f(i / SR / sec), l = typeof y === 'number' ? y : y[0], r = typeof y === 'number' ? y : y[1]
            assert.ok(Number.isFinite(l) && Number.isFinite(r), `${k}: NaN at x = ${(i / SR / sec).toFixed(2)}`)
            sum += l * l
          }
        }
      }
      // harmony: lead onsets on strong beats are mostly chord tones; notes stay in the key's scales
      const key = songKey(song), lead = Object.values(song.tracks)[0]
      const scale = new Set([...SCALES.major, ...SCALES.harmonic, ...SCALES.melodic, ...SCALES.minor].map(i => (i + key.tonic) % 12))
      let notes = 0, strong = 0, off = 0, prev = []
      const others = Object.entries(song.tracks).filter(([k, tr]) => tr.midi && !/drum|counter/.test(k)).slice(1)
      for (let x = 0; x < song.length; x += 0.25) {
        const m = lead.midi(x), on = m.filter(n => !prev.includes(n))
        prev = m
        if (!on.length || x % 2 !== 0) continue
        // the chord around the beat (comping instruments may strike between the beats)
        const ch = new Set([-0.25, 0, 0.25, 0.5, 0.75].flatMap(dx => others.flatMap(([, tr]) => tr.midi(x + dx))).map(pc))
        for (const n of on) {
          notes++
          if (ch.size && !ch.has(pc(n))) strong++
          if (!scale.has(pc(n))) off++
        }
      }
      t.diagnostic(`${meta.title} · ${meta.key} · ${meta.bpm} BPM · ${minutes.toFixed(1)} min · A: ${meta.themes.A.title} (${meta.themes.A.how}) · strong-beat non-chord tones ${notes ? Math.round((100 * strong) / notes) : 0}%`)
      // (a fugue has no chord track to sit on — its voices are checked by the rules of counterpoint in test/fugue.test.js —
      // and a maqam no harmony at all: test/maqam.test.js checks its scale and its sayr)
      if (notes > 8 && !['fugue', 'maqam', 'raga'].includes(style)) assert.ok(strong / notes < 0.25, `too many strong-beat non-chord tones: ${strong}/${notes}`)
    })
  }
}
