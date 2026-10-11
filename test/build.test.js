// The app builds into one HTML file with every song and module, and every module parses
// (the browser code is otherwise only exercised in the browser).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import * as acorn from '../viz/vendor/acorn.min.mjs'
import { build } from '../viz/build.js'

test('MathMusic Live.html builds with every song and module', async () => {
  const out = await build({ quiet: true })
  const html = fs.readFileSync(out, 'utf8')
  for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) assert.ok(html.includes(`"${f.slice(0, -3)}":`), f)
  for (const f of fs.readdirSync('viz/app')) assert.ok(html.includes(`"${f}":`), f)
  assert.ok(html.length < 8e6, `${(html.length / 1e6).toFixed(1)} MB`)
})
for (const f of fs.readdirSync('viz/app').filter(f => f.endsWith('.js'))) {
  test(`viz/app/${f} parses`, () => {
    const src = fs.readFileSync('viz/app/' + f, 'utf8')
    acorn.parse(src, { ecmaVersion: 'latest', sourceType: f === 'worker.js' || f === 'worklet.js' ? 'script' : 'module' })
    // V8's own early errors too (acorn lets a name declared twice in one scope through)
    const r = spawnSync(process.execPath, ['--check', `viz/app/${f}`], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
  })
}
test('songs compile for the browser runtime (imports → __mods)', async () => {
  // the same transform the page applies (runtime.js), here in Node with acorn
  const rt = fs.readFileSync('viz/app/runtime.js', 'utf8').replace("import * as acorn from './acorn.js'", "import * as acorn from '../vendor/acorn.min.mjs'")
  const tmp = 'viz/app/.runtime.test.mjs'
  fs.writeFileSync(tmp, rt)
  try {
    const { compile } = await import(new URL('../' + tmp, import.meta.url).href)
    for (const f of fs.readdirSync('songs').filter(f => f.endsWith('.js'))) {
      const body = compile(fs.readFileSync('songs/' + f, 'utf8'))
      assert.ok(body.includes('__mods.engine'), f)
      new Function('__mods', body) // syntax of the compiled body
    }
  } finally {
    fs.rmSync(tmp)
  }
})
