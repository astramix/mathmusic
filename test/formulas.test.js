// Every formula the visualiser shows parses in KaTeX (with the app's macros): the instruments of projects (the library's
// and the generator's "как в песне"), every song in songs/, the generator's songs of every style (a few seeds each, so
// every recipe of a style comes up), the older songs' formulas in viz/formulas.js. A brace left open shows the raw LaTeX
// in red when one hovers a note.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { INSTRUMENTS, GEN_INSTRUMENTS } from '../src/project.js'
import { generate, STYLES } from '../src/generate.js'

const km = { exports: {} }
Function('module', 'exports', fs.readFileSync('viz/vendor/katex.min.js', 'utf8'))(km, km.exports)
const katex = km.exports.default ?? km.exports
const MACROS = Function(`return ${fs.readFileSync('viz/app/formula.js', 'utf8').match(/export const MACROS = (\{[\s\S]*?\n\})/)[1]}`)()
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tex-'))
let n = 0
const load = async s => {
  const f = path.join(dir, `s${n++}.mjs`)
  fs.writeFileSync(f, s.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  return (await import(pathToFileURL(f).href)).default
}
test.after(() => fs.rmSync(dir, { recursive: true, force: true }))

function checker() {
  const bad = []
  const warn = console.warn
  return {
    check(where, f) {
      console.warn = () => {} // (KaTeX's fonts have no metrics for «»: a warning, not an error)
      try {
        for (const s of [].concat(f ?? [])) {
          if (typeof s !== 'string') continue
          try { katex.renderToString(s, { throwOnError: true, strict: false, macros: { ...MACROS } }) } catch (e) { bad.push(`${where}: ${e.message.slice(0, 140)}`) }
        }
      } finally { console.warn = warn }
    },
    done: () => assert.deepEqual(bad, []),
  }
}

test('formulas: the instruments of projects', () => {
  const c = checker()
  for (const d of [...INSTRUMENTS, ...GEN_INSTRUMENTS]) c.check(d.id, d.formula)
  c.done()
})
test('formulas: every song in songs/ and viz/formulas.js', async () => {
  const c = checker()
  for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) {
    const song = (await import(pathToFileURL(path.resolve('songs', f)).href)).default
    for (const [k, t] of Object.entries(song.tracks ?? {})) c.check(`${f} · ${k}`, t?.formula)
  }
  const FM = await import(pathToFileURL(path.resolve('viz/formulas.js')).href), FS = FM.default ?? FM.FORMULAS ?? FM
  for (const [song, tracks] of Object.entries(FS)) if (tracks && typeof tracks === 'object') for (const [k, f] of Object.entries(tracks)) c.check(`formulas.js ${song} · ${k}`, f)
  c.done()
})
test('formulas: the generator, every style', async () => {
  const c = checker()
  for (const style of Object.keys(STYLES)) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const song = await load(generate({ style, seed }).source)
    for (const [k, t] of Object.entries(song.tracks)) c.check(`${style} #${seed} · ${k}`, t?.formula)
  }
  c.done()
})
