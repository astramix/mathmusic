// Generates songs from the command line — the same generator as the 🎲 menu of the app.
//   node generate.js --style lofi [--seed 42] [--key Dm] [--bpm 80] [--length short|normal|long]
//                    [--melody N --arrangement N --instruments N] [--theme melody-id] [--out songs/name.js] [--render]
//                    [--mode rast] [--micro quarter|eighth] [--temperament werckmeister3] [--modulations] [--meter 7/8]
//   node generate.js --list            styles and melody sources
// Without --out the song goes to songs/<title>.js. --render renders it at once (render.js).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { generate, STYLES, describe } from './src/generate.js'
import { MELODIES } from './src/melodies.js'

const args = process.argv.slice(2), opt = {}
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) continue
  const k = args[i].slice(2), v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
  opt[k] = v
}
if (opt.list || !opt.style) {
  console.log('styles:\n' + Object.entries(STYLES).map(([id, s]) => `  ${id.padEnd(10)} ${s.emoji} ${s.label} · ${s.bpm.join('–')} BPM`).join('\n'))
  console.log('\nmelodies:\n' + MELODIES.map(m => `  ${m.id.padEnd(16)} ${m.title} (${m.key})`).join('\n'))
  if (!opt.style) console.log('\nexample: node generate.js --style bossa --seed 7 --render')
  process.exit(0)
}
const num = v => (v == null || v === true ? undefined : +v)
const { source, meta } = generate({
  style: opt.style, seed: num(opt.seed) ?? 1 + Math.floor(Math.random() * 999998), key: opt.key, bpm: num(opt.bpm), length: opt.length,
  melody: num(opt.melody), arrangement: num(opt.arrangement), instruments: num(opt.instruments),
  theme: typeof opt.theme === 'string' ? opt.theme : undefined, // theme A by its id (--list)
  mode: typeof opt.mode === 'string' ? opt.mode : undefined, micro: typeof opt.micro === 'string' ? opt.micro : undefined,
  temperament: typeof opt.temperament === 'string' ? opt.temperament : undefined, modulations: !!opt.modulations || undefined,
  meter: typeof opt.meter === 'string' ? opt.meter : undefined,
})
const out = path.resolve(opt.out ?? `songs/${meta.title}.js`)
fs.mkdirSync(path.dirname(out), { recursive: true })
// imports are written for songs/; elsewhere they point at src/ from the target folder
const rel = path.relative(path.dirname(out), path.resolve('src')).split(path.sep).join('/')
fs.writeFileSync(out, rel === '../src' ? source : source.replace(/(['"])\.\.\/src\//g, `$1${rel}/`))
console.log(`${describe(meta)}\nseed ${meta.seed} (melody ${meta.seeds.melody}, arrangement ${meta.seeds.arrangement}, instruments ${meta.seeds.instruments}) → ${path.relative(process.cwd(), out)}`)
if (opt.render) execFileSync(process.execPath, ['render.js', out], { stdio: 'inherit' })
