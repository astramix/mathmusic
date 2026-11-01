// A generator style at a glance — what /style needs between edits:
//   node tools/style-check.mjs <style> [--seeds 1-12] [--levels 1,2]
// For every seed: title, key, mode, micro, tempo, length, sections, tracks, the instruments drawn, the themes (and how they
// were treated), and the generator test's check — the lead's notes on the strong beats that are not chord tones (FAIL at
// 25 %; a microtonal slide into a note counts as that note, as in test/generate.test.js). For the --levels seeds (the first
// seed by default): every track rendered in full, in parallel, measured like render.js (peak / RMS dB, quiet? hot? NaN!).
// The songs go to out/_style/ (deleted again unless --keep).
import fs from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { generate, STYLES } from '../src/generate.js'
import { pc } from '../src/theory.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'out', '_style')
const args = process.argv.slice(2), style = args[0], opt = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1] }
if (!STYLES[style]) {
  console.log(`usage: node tools/style-check.mjs <style> [--seeds 1-12] [--levels 1,2] [--keep]\nstyles: ${Object.keys(STYLES).join(' ')}`)
  process.exit(1)
}
const [s0, s1] = (opt('--seeds') ?? '1-6').split('-').map(Number), seeds = Array.from({ length: (s1 ?? s0) - s0 + 1 }, (_, i) => s0 + i)
const levels = (opt('--levels') ?? String(seeds[0])).split(',').map(Number)
fs.mkdirSync(DIR, { recursive: true })
const fileOf = seed => path.join(DIR, `${style}-${seed}.js`)

let fails = 0
for (const seed of seeds) {
  const { source, meta } = generate({ style, seed })
  fs.writeFileSync(fileOf(seed), source.replace(/(['"])\.\.\/src\//g, '$1../../src/'))
  const song = (await import(pathToFileURL(fileOf(seed)).href)).default
  const lead = Object.values(song.tracks)[0], others = Object.entries(song.tracks).filter(([k, tr]) => tr.midi && !/drum|counter/.test(k)).slice(1)
  let notes = 0, strong = 0, prev = []
  for (let x = 0; x < song.length; x += 0.25) {
    const m = lead.midi(x), on = m.filter(n => !prev.includes(n))
    prev = m
    if (!on.length || x % 2 !== 0) continue
    const ch = new Set([-0.25, 0, 0.25, 0.5, 0.75].flatMap(dx => others.flatMap(([, tr]) => tr.midi(x + dx))).map(pc)), after = lead.midi(x + 0.13)
    for (const o of on) { const n = after.find(a => a !== o && Math.abs(a - o) <= 0.5 + 1e-9) ?? o; notes++; if (ch.size && !ch.has(pc(n))) strong++ }
  }
  const pct = notes ? Math.round((100 * strong) / notes) : 0, min = (song.length * 60) / song.bpm / 60, i = meta.instruments
  if (pct >= 25 || min <= 1.7 || min >= 4 || song.sections.length < 6 || Object.keys(song.tracks).length < 7) fails++
  console.log([
    `#${seed}`, meta.title, meta.key, meta.mode ?? '', meta.micro ?? '', `${meta.bpm} BPM`, `${min.toFixed(1)} min`, `${song.sections.length} sections`, `${Object.keys(song.tracks).length} tracks`,
    `| ${i.lead} · ${i.lead2} · ${i.chords} · ${i.bass} · ${i.pad ?? '–'} · ${i.arp ?? '–'} · ${i.texture ?? '–'}`,
    `| A ${meta.themes.A.title} (${meta.themes.A.how}) + B ${meta.themes.B.title}`,
    `| strong ${strong}/${notes} = ${pct}%${pct >= 25 ? '  FAIL' : ''}`,
  ].filter(Boolean).join(' '))
}

// the levels, every --levels seed in its own worker (test/levels.js renders and measures like render.js)
const dB = v => (v > 0 ? 20 * Math.log10(v) : -Infinity), fmt = v => (Number.isFinite(v) ? v.toFixed(1) : '-inf').padStart(7)
const measure = file => new Promise(res => {
  const w = new Worker(path.join(ROOT, 'test', 'levels.js'), { workerData: { file } })
  w.on('message', res)
  w.on('error', e => res({ error: String(e) }))
})
const results = await Promise.all(levels.map(seed => { if (!fs.existsSync(fileOf(seed))) { const { source } = generate({ style, seed }); fs.writeFileSync(fileOf(seed), source.replace(/(['"])\.\.\/src\//g, '$1../../src/')) } return measure(fileOf(seed)) }))
results.forEach((r, k) => {
  if (r.error) return console.log(`\n#${levels[k]}: ${r.error.slice(0, 400)}`)
  const loud = Math.max(...Object.values(r.tracks).map(t => dB(t.rms)))
  console.log(`\n#${levels[k]} ${r.name} (${r.seconds.toFixed(0)} s)          peak dB  rms dB`)
  for (const [name, t] of Object.entries(r.tracks)) console.log(`${name.padEnd(30)}${fmt(dB(t.peak))} ${fmt(dB(t.rms))}${t.nan ? '  NaN!' : dB(t.rms) < loud - 22 ? '  quiet?' : dB(t.peak) > -1.5 ? '  hot?' : ''}`)
})
if (!args.includes('--keep')) fs.rmSync(DIR, { recursive: true, force: true })
console.log(fails ? `\n${fails} seed(s) would fail test/generate.test.js` : '\nevery seed passes the generator test\'s checks')
