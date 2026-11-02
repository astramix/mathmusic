// A style from a recording: the analyser hears the tempo, the key, the chords and the backbeat of a synthetic band whose
// answers are known; a measured instrument comes back with its partials, decays and vibrato, and resynthesised it plays as
// loud as computed; a style becomes songs that render, and a song made again from its generator field is the same song.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { analyzeAudio } from '../src/analyze.js'
import { extractTimbre, loudnessOf } from '../src/timbre.js'
import { styleFromAudio } from '../src/audiostyle.js'
import { generate } from '../src/generate.js'
import { poly, resynthTone } from '../src/instruments.js'
import { render, SR } from '../src/engine.js'

const TAU = 2 * Math.PI, hz = n => 440 * 2 ** ((n - 69) / 12)
// a little band at 120 BPM in A minor: Am – F – C – G a bar each, the bass on the roots, a kick on 1 and 3, a snare on 2
// and 4, hats on the eighths, a sine-and-third melody on the chord tones
function band(sr = 22050, bars = 24) {
  const spb = 0.5, n = Math.round(bars * 4 * spb * sr), x = new Float32Array(n)
  const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
  let seed = 7, w1 = 0, w2 = 0
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1
  for (let i = 0; i < n; i++) {
    const t = i / sr, beat = t / spb, bar = Math.floor(beat / 4), b = beat - 4 * bar, ch = prog[bar % 4]
    let y = 0
    for (const m of ch) y += 0.05 * Math.sin(TAU * hz(m) * t) + 0.02 * Math.sin(TAU * 2 * hz(m) * t)
    y += 0.25 * Math.sin(TAU * hz(ch[0] - 24) * t) * Math.exp(-3 * (b % 1)) * Math.min(1, (b % 1) * 40)
    const tb = (b % 2) * spb, th = (b % 0.5) * spb
    y += 0.8 * Math.sin(TAU * (50 * tb + 40 * (1 - Math.exp(-tb * 30)))) * Math.exp(-tb * 18)
    if (Math.floor(b) % 2 === 1) y += 0.35 * rnd() * Math.exp(-(b % 1) * spb * 25)
    const w = rnd(), hp = w - 2 * w1 + w2 // hats: noise twice differenced — high-passed
    w2 = w1; w1 = w
    y += 0.05 * hp * Math.exp(-th * 90)
    const mel = ch[(Math.floor(beat) % 3)] + 12
    y += 0.12 * Math.sin(TAU * hz(mel) * t) * Math.min(1, (beat % 1) * 20)
    x[i] = y * 0.6
  }
  return x
}

test('the analyser hears tempo, key, chords and the backbeat', () => {
  const x = band(), a = analyzeAudio(x, 22050)
  assert.ok(Math.abs(a.bpm - 120) < 1.5, `bpm ${a.bpm}`)
  assert.equal(a.key.tonic, 9, `tonic ${a.key.tonic}`)
  assert.equal(a.key.mode, 'minor')
  const romans = new Set(a.bars.flatMap(b => b.chords.map(c => c.roman.replace(/7|maj7/, ''))))
  for (const r of ['i', 'VI', 'III', 'VII']) assert.ok(romans.has(r), `${r} in ${[...romans]}`)
  // the low band's onsets (the kick, the bass) on the beats, not between them: the grid sits on the music
  const low = Array.from({ length: 16 }, (_, s) => a.bars.reduce((t, b) => t + b.drums.kick[s], 0))
  assert.ok(low[0] + low[4] + low[8] + low[12] > 3 * (low[2] + low[6] + low[10] + low[14]), `low ${low.map(v => v.toFixed(1)).join(' ')}`)
})

test('a measured instrument comes back: partials, decays, vibrato; resynthesised it is as loud as computed', () => {
  const sr = 44100
  // a struck bar: partials 1, 2.76, 5.40 dying at 2, 5, 9 per second, three notes
  const bell = new Float32Array(sr * 6), notes = [[0.2, 69], [2.2, 64], [4.2, 72]]
  for (const [t0, n] of notes) for (let i = Math.round(t0 * sr); i < bell.length; i++) {
    const t = i / sr - t0, f = hz(n)
    bell[i] += 0.3 * (Math.exp(-2 * t) * Math.sin(TAU * f * t) + 0.5 * Math.exp(-5 * t) * Math.sin(TAU * 2.76 * f * t) + 0.25 * Math.exp(-9 * t) * Math.sin(TAU * 5.4 * f * t)) * (t < 1.9 ? 1 : 0)
  }
  const M = extractTimbre(bell, sr, notes.map(([t, n]) => ({ t, d: 1.8, n })))
  assert.equal(M.kind, 'struck')
  for (const [r, a, d] of [[1, 1, 2], [2.76, 0.5, 5], [5.4, 0.25, 9]]) {
    const p = M.p.find(q => Math.abs(q[0] - r) < 0.02)
    assert.ok(p, `partial ${r} in ${M.p.map(q => q[0])}`)
    assert.ok(Math.abs(20 * Math.log10(p[1] / a)) < 2.5, `level of ${r}: ${p[1]} vs ${a}`)
    assert.ok(Math.abs(p[3] / d - 1) < 0.35, `decay of ${r}: ${p[3]} vs ${d}`)
  }
  // a held tone with a vibrato of 5.5 Hz, 20 cents, after 0.3 s
  const flute = new Float32Array(sr * 5), held = [[0.2, 72], [2.6, 76]]
  for (const [t0, n] of held) {
    let ph = 0
    for (let i = Math.round(t0 * sr); i < Math.round((t0 + 2) * sr); i++) {
      const t = i / sr - t0, f = hz(n) * 2 ** ((20 * Math.min(1, Math.max(0, t - 0.3) / 0.3) * Math.sin(TAU * 5.5 * t)) / 1200)
      ph += (TAU * f) / sr
      flute[i] += 0.3 * Math.min(1, t / 0.08) * (Math.sin(ph) + 0.2 * Math.sin(3 * ph))
    }
  }
  const F = extractTimbre(flute, sr, held.map(([t, n]) => ({ t, d: 2, n })))
  assert.equal(F.kind, 'sustained')
  assert.ok(F.vib && Math.abs(F.vib.rate - 5.5) < 1 && Math.abs(F.vib.depth - 20) < 8, `vibrato ${JSON.stringify(F.vib)}`)
  assert.ok(F.p.some(q => Math.abs(q[0] - 3) < 0.02), 'the third harmonic')
  // loudness: computed vs played
  for (const T of [M, F]) {
    const p = poly(resynthTone(T), { release: T.release ?? 0.2, life: 3 }), n = Math.round(1.2 * SR)
    p.hit(T.f0, 0.8, 0.9)
    let e = 0
    for (let i = 0; i < n; i++) { const y = p(); assert.ok(Number.isFinite(y)); e += y * y }
    const played = Math.sqrt(e / n), computed = loudnessOf(T)
    assert.ok(Math.abs(20 * Math.log10(played / computed)) < 2, `${T.kind}: played ${played} vs computed ${computed}`)
  }
})

test('a style from audio makes songs that render; made again from the song it is the same song', async () => {
  const x = band(44100, 32)
  const { style } = styleFromAudio(x, 44100, { name: 'test band', regions: { lead: [0, 16] } })
  assert.equal(style.source.bpm, 120)
  assert.ok(style.forms[0].length >= 1 && style.ownThemes.length === 2)
  // the backbeat (the kick's click taken out of the snare's band): the snare on 2 and 4, not on 1 and 3
  const sn = style.drums.full.snare ?? style.drums.full.rim ?? ''
  assert.ok(sn[4] === 'x' && sn[12] === 'x' && sn[0] !== 'x' && sn[8] !== 'x', `snare ${sn}`)
  // the lead's timbre from the solo region: the sine and its third partial
  assert.ok(style.timbres.lead && style.lead[0] === 'timbre:lead', 'lead timbre')
  const { source, meta } = generate({ styleDef: style, seed: 3, length: 'short' })
  const again = generate({ styleDef: JSON.parse(JSON.stringify(style)), seed: 3, length: 'short' }).source
  assert.equal(again, source)
  const dir = path.join('out', '_test_audio'), file = path.join(dir, `${meta.title}.js`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file.replace(/\.js$/, '.mjs'), source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  const song = (await import(pathToFileURL(path.resolve(file.replace(/\.js$/, '.mjs'))).href)).default
  assert.equal(song.generator.styleDef.id, style.id)
  // the song's own generator field makes it again
  assert.equal(generate({ ...song.generator, seed: song.generator.seed, length: 'short' }).source, source)
  // every formula parses in KaTeX with the app's macros (the timbres', the measured kit's)
  const km = { exports: {} }
  Function('module', 'exports', fs.readFileSync('viz/vendor/katex.min.js', 'utf8'))(km, km.exports)
  const katex = km.exports.default ?? km.exports, macros = Function(`return ${fs.readFileSync('viz/app/formula.js', 'utf8').match(/export const MACROS = (\{[\s\S]*?\n\})/)[1]}`)()
  const warn = console.warn
  console.warn = () => {}
  try {
    for (const [k, t] of Object.entries(song.tracks)) for (const s of [].concat(t.formula ?? [])) assert.doesNotThrow(() => katex.renderToString(s, { throwOnError: true, strict: false, macros: { ...macros } }), `${k}: ${s}`)
  } finally { console.warn = warn }
  const stems = render({ ...song, length: Math.min(song.length, 48) }, { tail: 0 })
  for (const [name, [L]] of Object.entries(stems)) for (let i = 0; i < L.length; i += 97) assert.ok(Number.isFinite(L[i]), `${name} NaN at ${i}`)
})
