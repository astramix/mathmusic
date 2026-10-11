// npm run dev — rebuilds "MathMusic Live.html" whenever a song, the engine, the generator or the app
// changes (debounced). Reload the page to see the result.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from './build.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let timer = null, busy = false
const rebuild = why => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (busy) return rebuild(why)
    busy = true
    try {
      const t0 = Date.now()
      await build({ quiet: true })
      console.log(`${new Date().toLocaleTimeString()} rebuilt (${why}) in ${Date.now() - t0} ms`)
    } catch (e) {
      console.error('build failed:', e.message)
    }
    busy = false
  }, 250)
}
for (const dir of ['songs', 'src', 'viz/app', 'viz']) {
  fs.watch(path.join(ROOT, dir), (ev, file) => {
    if (!file || !/\.(js|css|html)$/.test(file)) return
    rebuild(`${dir}/${file}`)
  })
}
await build()
console.log('watching songs/, src/, viz/ — Ctrl+C to stop')
