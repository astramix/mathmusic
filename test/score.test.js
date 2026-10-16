// The score (src/score.js) and MusicXML (src/musicxml.js): every song writes out with bars that add up, ties, triplets,
// swing, 12/8 and 7/8, key signatures of modes and maqamat, and a MusicXML file whose measures add up too.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildScore, keySignature, songBars, guessParts, parseMeter } from '../src/score.js'
import { musicXml } from '../src/musicxml.js'
import { songKey, parseKey } from '../src/theory.js'
import { keyWithMode, MODES } from '../src/modes.js'
import { generate } from '../src/generate.js'

const load = async f => (await import(pathToFileURL(path.resolve('songs', f)).href)).default
const scoreOf = async (f, parts) => {
  const song = await load(f), source = fs.readFileSync(path.join('songs', f), 'utf8'), key = keyWithMode(songKey(song), song.mode)
  return buildScore(song, { parts: parts ?? guessParts(song), key, mode: song.mode ? MODES[song.mode] : null, source })
}
const SYM = { whole: 'w', half: 'h', quarter: 'q', eighth: 'e', '16th': 's', '32nd': 't', '64th': 'x' }
const barText = evs => evs.map(e => {
  const v = SYM[e.type] + '.'.repeat(e.dots) + (e.tuplet ? '3' : '')
  if (e.rest) return 'r' + v
  return e.notes.map(n => (n.tieStop ? '~' : '') + (n.show ? n.sp.name : n.sp.letter) + n.sp.oct + (n.tieStart ? '~' : '')).join('+') + '/' + v
}).join(' ')

// a light MusicXML check: tags close in order, every measure of every part adds up to its time signature
function checkXml(xml) {
  const stack = []
  for (const m of xml.matchAll(/<(\/?)([a-zA-Z-]+)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m
    if (name === 'xml' || name === 'DOCTYPE' || self) continue
    if (close) assert.equal(stack.pop(), name, `</${name}> out of order`)
    else stack.push(name)
  }
  assert.equal(stack.length, 0)
  for (const part of xml.split('<part id=').slice(1)) {
    let beats = 4, type = 4
    for (const meas of part.split('<measure ').slice(1)) {
      const t = meas.match(/<beats>(\d+)<\/beats><beat-type>(\d+)<\/beat-type>/)
      if (t) (beats = +t[1]), (type = +t[2])
      let sum = 0
      for (const n of meas.split('<note>').slice(1)) if (!n.includes('<grace') && !n.includes('<chord/>')) sum += +(n.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0)
      assert.equal(sum, beats * (4 / type) * 48, `measure ${meas.match(/number="(\d+)"/)[1]}`)
    }
  }
}

test('meters: 4/4, 12/8 (a beat = a dotted quarter), 7/8 as 2 + 2 + 3, bars per section', async () => {
  assert.deepEqual(parseMeter('7/8').groups, [48, 48, 72])
  assert.equal(parseMeter('12/8').xTicks, 72)
  const fb = songBars(await load('finalbattle.js'))
  const chaos = fb.filter(b => b.at >= 120 && b.at < 148)
  assert.equal(chaos.length, 8)
  assert.ok(chaos.every(b => b.meter.text === '7/8' && b.len === 3.5))
  assert.equal(fb.find(b => b.at === 148)?.meter.text, '4/4')
})

test('every song writes out: bars add up, MusicXML adds up', async () => {
  for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) {
    const sc = await scoreOf(f)
    assert.ok(sc.parts.length >= 1, f)
    for (const p of sc.parts) p.bars.forEach((evs, i) => {
      const T = sc.bars[i].meter.barTicks, sum = evs.reduce((s, e) => s + e.dur, 0)
      assert.equal(sum, T, `${f} ${p.name} bar ${sc.bars[i].n}: ${sum} of ${T}`)
      for (const e of evs) assert.ok(e.type, `${f} ${p.name} bar ${sc.bars[i].n}: a value without a type (${e.dur})`)
    })
    checkXml(musicXml(sc))
  }
})

test('lofi: the swung flute melody in straight eighths, ties over the beat, chords ii9 V13 Imaj9 vi9', async () => {
  const sc = await scoreOf('lofi.js', ['flute'])
  assert.equal(sc.swing, 0.6)
  const i = sc.bars.findIndex(b => b.n === 17)
  assert.equal(barText(sc.parts[0].bars[i]), 're G5~/e ~G5/e F5/e D5~/q ~D5/e C5/e')
  assert.deepEqual(sc.bars.slice(i, i + 4).map(b => b.chords[0]?.symbol), ['Gm9', 'C13', 'Fmaj9', 'Dm9'])
  const bass = await scoreOf('lofi.js', ['bass'])
  assert.equal(barText(bass.parts[0].bars[5]), 'C3~/q ~C3/e C3~/e ~C3/e re G3/q')
})

test('kitsune-bi in 12/8 and the chaos of finalbattle in 7/8, beamed by their beats', async () => {
  const k = await scoreOf('kitsune-bi.js', ['shinobue'])
  const b = k.bars.findIndex(b => b.n === 9)
  assert.equal(k.bars[b].time, '12/8')
  assert.equal(barText(k.parts[0].bars[b]), 'A5/q B5/e C6/q E6/e A6/q. E6/q C6/e')
  const f = await scoreOf('finalbattle.js', ['lead'])
  const c = f.bars.findIndex(b => b.time === '7/8')
  assert.deepEqual(f.parts[0].bars[c].map(e => e.beams?.[0]), ['begin', 'end', 'begin', 'end', 'begin', 'continue', 'end'])
})

test('key signatures: keys, church modes, maqamat with half flats, Turkish commas', () => {
  const sig = (k, m) => keySignature(keyWithMode(parseKey(k), m), m ? MODES[m] : null)
  assert.equal(sig('D').fifths, 2)
  assert.equal(sig('Cm').fifths, -3)
  assert.equal(sig('Dm', 'dorian').fifths, 0)
  assert.equal(sig('Ebm', 'dorian').fifths, -5)
  assert.equal(sig('Am', 'harmonic').fifths, 0) // G♯ is written in the music, not in the signature
  assert.deepEqual(sig('C', 'rast').items.map(i => i.letter + i.sp.name.slice(1)), ['B𝄳', 'E𝄳'])
  assert.deepEqual(sig('Dm', 'bayati').items.map(i => i.sp.name), ['B♭', 'E𝄳'])
  assert.deepEqual(sig('G', 'trRast').items.map(i => i.sp.name), ['B♭¹', 'F♯⁴'])
  assert.deepEqual(sig('Am', 'trHicaz').items.map(i => i.sp.name), ['B♭⁴', 'F♯⁴', 'C♯⁴'])
})

test('a generated Rast song: microtones in the score and in MusicXML <alter>, its key signature written out', async () => {
  const { source } = generate({ style: 'lofi', seed: 3, key: 'C', mode: 'rast' })
  const dir = path.resolve('out/_test_score')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'rast.mjs')
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  const song = (await import(pathToFileURL(file).href)).default
  const key = keyWithMode(songKey(song), song.mode)
  const sc = buildScore(song, { parts: guessParts(song), key, mode: MODES.rast, source })
  const xml = musicXml(sc)
  checkXml(xml)
  assert.match(xml, /<key><key-step>B<\/key-step><key-alter>-0\.5<\/key-alter><key-accidental>quarter-flat<\/key-accidental><key-step>E<\/key-step>/)
  assert.match(xml, /<step>E<\/step><alter>-0\.5<\/alter>/)
  assert.match(xml, /<swing><first>3<\/first><second>2<\/second>/)
})
