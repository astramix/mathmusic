// Builds the standalone visualiser: node viz/build.js → "MathMusic Live.html" in the project root.
// The engine, the instruments, every song, the formulas (viz/formulas.js) and KaTeX with its fonts
// are embedded; the page turns the sources into blob: modules at runtime, so it opens with a double
// click — no server, no internet. render.js runs this after each render.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const songs = Object.fromEntries(
  fs.readdirSync(path.join(ROOT, 'songs')).filter(f => f.endsWith('.js')).map(f => [f.slice(0, -3), read(`songs/${f}`)]),
)
const formulas = (await import(pathToFileURL(path.join(ROOT, 'viz/formulas.js')).href + `?${Date.now()}`)).default
const SRC = { engine: read('src/engine.js'), instruments: read('src/instruments.js'), songs, formulas }
const safe = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')

// KaTeX: fonts inlined as woff2 data URIs
const css = read('viz/vendor/katex.min.css').replace(/src:url\(fonts\/([^)]+\.woff2)\)[^;}]*/g, (_, f) =>
  `src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'viz/vendor/fonts', f)).toString('base64')}) format("woff2")`)

const html = read('viz/template.html')
  .replace('/*__KATEX_CSS__*/', () => css)
  .replace('/*__KATEX_JS__*/', () => safe(read('viz/vendor/katex.min.js')))
  .replace('/*__SRC__*/null', () => safe(JSON.stringify(SRC)))
const out = path.join(ROOT, 'MathMusic Live.html')
fs.writeFileSync(out, html)
console.log(`visualiser → ${out} (${Object.keys(songs).length} songs)`)
