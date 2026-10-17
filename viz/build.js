// Builds the standalone app: node viz/build.js → "MathMusic Live.html" in the project root.
// Everything is embedded — the engine, the instruments, the generator, every song, the formulas
// (viz/formulas.js), your songs in my_songs/ (with its library.json), the app modules (viz/app/*.js)
// and the vendored libraries (KaTeX with its fonts, CodeMirror, acorn, lamejs, mp4-muxer) — so the
// page opens with a double click: no server, no internet. At runtime the page turns the sources into blob: modules; `import … from './x.js'`
// between app modules is resolved there (see the bootstrap in viz/template.html).
// render.js runs this after each render; `npm run dev` rebuilds on every change.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { iconDataUrl } from './icon.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
// sources with plain \n line ends whatever the checkout has: the editor (CodeMirror) gives \n, and a
// built-in song must equal its own text in the editor, or it looks edited the moment it opens
const text = f => read(f).replace(/\r\n?/g, '\n')
const jsIn = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.js')).sort()

// mine: false leaves my_songs/ and generated/ out (MathMusic.exe reads the folders itself, and the page you hand out
// shouldn't carry your songs)
export async function build({ quiet = false, mine: withMine = true } = {}) {
  const songs = Object.fromEntries(jsIn('songs').map(f => [f.slice(0, -3), text(`songs/${f}`)]))
  const formulas = (await import(pathToFileURL(path.join(ROOT, 'viz/formulas.js')).href + `?${Date.now()}`)).default
  // my_songs/: shown at once; the page reads the folder itself again once it may (viz/app/library.js)
  const mineDir = path.join(ROOT, 'my_songs')
  const mine = withMine && fs.existsSync(mineDir) ? Object.fromEntries(jsIn('my_songs').map(f => [f, { source: text(`my_songs/${f}`), mtime: fs.statSync(path.join(mineDir, f)).mtimeMs }])) : {}
  let mineIndex = null
  try { if (withMine) mineIndex = JSON.parse(read('my_songs/library.json')) } catch {}
  // generated/: the untouched 🎲 songs, the same way
  const genDir = path.join(ROOT, 'generated')
  const gen = withMine && fs.existsSync(genDir) ? Object.fromEntries(jsIn('generated').map(f => [f, { source: text(`generated/${f}`), mtime: fs.statSync(path.join(genDir, f)).mtimeMs }])) : {}
  let genIndex = null
  try { if (withMine) genIndex = JSON.parse(read('generated/library.json')) } catch {}
  const SRC = { engine: text('src/engine.js'), instruments: text('src/instruments.js'), songs, mine, mineIndex, gen, genIndex, formulas }
  // app modules; the shared pure modules of src/ (theory, generator, melodies, midi, modes) are importable as './x.js'
  const APP = Object.fromEntries(jsIn('viz/app').map(f => [f, text(`viz/app/${f}`)]))
  for (const f of ['theory.js', 'generate.js', 'melodies.js', 'midi.js', 'modes.js', 'retune.js', 'tuning.js', 'score.js', 'musicxml.js', 'loudness.js', 'master.js', 'counterpoint.js', 'fugue.js', 'maqam.js', 'raga.js']) if (fs.existsSync(path.join(ROOT, 'src', f))) APP[f] = text(`src/${f}`)
  APP['acorn.js'] = read('viz/vendor/acorn.min.mjs')
  APP['lame.js'] = read('viz/vendor/lame.min.js') // raw text: the MP3 encoder runs in a worker
  const safe = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')

  // KaTeX: fonts inlined as woff2 data URIs
  const katexCss = read('viz/vendor/katex.min.css').replace(/src:url\(fonts\/([^)]+\.woff2)\)[^;}]*/g, (_, f) =>
    `src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'viz/vendor/fonts', f)).toString('base64')}) format("woff2")`)
  const vendorJs = ['katex.min.js', 'codemirror.min.js', 'mp4-muxer.min.js'].map(f => safe(read(`viz/vendor/${f}`))).join('\n;\n')

  const html = read('viz/template.html')
    // the favicon: the app window of MathMusic.exe and the taskbar show it (the same picture as the .exe)
    .replace('<!--__ICON__-->', () => `<link rel="icon" type="image/png" sizes="32x32" href="${iconDataUrl(32)}">
<link rel="icon" type="image/png" sizes="192x192" href="${iconDataUrl(192)}">`)
    .replace('/*__KATEX_CSS__*/', () => katexCss)
    .replace('/*__CM_CSS__*/', () => read('viz/vendor/codemirror.min.css'))
    .replace('/*__APP_CSS__*/', () => read('viz/app.css'))
    // Bravura, the SMuFL music font (SIL OFL, viz/vendor/bravura/OFL.txt): the staff view's notes and signs
    .replace('/*__FONTS__*/', () => `@font-face{font-family:Bravura;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'viz/vendor/bravura/Bravura.woff2')).toString('base64')}) format("woff2");font-display:block}`)
    .replace('/*__VENDOR_JS__*/', () => vendorJs)
    .replace('/*__SRC__*/null', () => safe(JSON.stringify(SRC)))
    .replace('/*__APP__*/null', () => safe(JSON.stringify(APP)))
  const out = path.join(ROOT, 'MathMusic Live.html')
  fs.writeFileSync(out, html)
  if (!quiet) console.log(`visualiser → ${out} (${Object.keys(songs).length} songs + ${Object.keys(mine).length} in my_songs + ${Object.keys(gen).length} in generated, ${(html.length / 1e6).toFixed(1)} MB)`)
  return out
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build()
