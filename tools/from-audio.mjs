// A style from a recording, and songs in it:
//   node tools/from-audio.mjs file.wav [--name "Имя"] [--lead 12.5-16] [--bass 40-44] [--keys 60-63] [--seed 1] [--songs 1] [--render]
// --lead / --bass / --keys: seconds where that instrument plays alone (its timbre is resynthesised from there; the lead is
// also looked for by itself). Writes out/<style id>/style.json (the style: open it in the app, or pass --style-json to
// generate again) and songs/<title>.js per song; --render renders them.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readWav } from './wav.mjs'
import { styleFromAudio } from '../src/audiostyle.js'
import { generate, describe } from '../src/generate.js'

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }, flag = k => args.includes('--' + k)
const file = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const styleJson = opt('style-json')
if (!file && !styleJson) { console.log('usage: node tools/from-audio.mjs file.wav [--name N] [--lead a-b] [--bass a-b] [--keys a-b] [--seed 1] [--songs 1] [--render]'); process.exit(1) }
const range = s => (s ? s.split('-').map(Number) : undefined)
let style
if (styleJson) style = JSON.parse(fs.readFileSync(styleJson, 'utf8'))
else {
  const w = readWav(file), name = opt('name', path.basename(file).replace(/\.\w+$/, ''))
  const t0 = Date.now()
  const regions = Object.fromEntries(['lead', 'bass', 'keys'].map(k => [k, range(opt(k))]).filter(([, v]) => v))
  let last = ''
  const res = styleFromAudio(w.mono, w.sr, { name, regions, progress: s => { if (s !== last) process.stdout.write(`\r  ${(last = s)}…`.padEnd(40)) } })
  process.stdout.write('\r'.padEnd(42) + '\r')
  style = res.style
  console.log(`${style.label} — проанализировано за ${((Date.now() - t0) / 1000).toFixed(1)} с`)
  for (const line of res.report) console.log('  ' + line)
  for (const [role, M] of Object.entries(res.timbres)) console.log(`  тембр ${role}: ${M.kind === 'struck' ? 'щипок/удар' : 'тянущийся'}, ${M.p.length} партиалов (${M.p.slice(0, 5).map(p => p[0]).join(', ')}…), ${M.notes} нот${M.vib ? `, вибрато ${M.vib.rate} Гц ±${M.vib.depth} ¢` : ''}`)
  const dir = path.join('out', style.id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'style.json'), JSON.stringify(style, null, 1))
  console.log(`  стиль → ${path.join(dir, 'style.json')}`)
}
const n = +opt('songs', 1), seed0 = +opt('seed', 1), written = []
for (let s = seed0; s < seed0 + n; s++) {
  const { source, meta } = generate({ styleDef: style, seed: s })
  const out = path.join('songs', meta.title + '.js')
  fs.writeFileSync(out, source)
  written.push(out)
  console.log(`  ${describe(meta)} → ${out}`)
}
if (flag('render')) execFileSync(process.execPath, ['render.js', ...written], { stdio: 'inherit' })
