// Renders one song file completely and measures it like render.js — run in a worker thread by the
// tests (workerData: { file }) or directly: node test/levels.js songs/lofi.js
// → { name, seconds, tracks: { key: { peak, rms, nan } }, error }
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isMainThread, parentPort, workerData } from 'node:worker_threads'
import { render, mixdown } from '../src/engine.js'

export async function measure(file) {
  try {
    const song = (await import(pathToFileURL(path.resolve(file)).href)).default
    const stems = render(song)
    const tracks = {}
    for (const [k, [L, R]] of Object.entries(stems)) {
      let nan = false
      for (let i = 0; i < L.length; i++) if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) { nan = true; break }
      tracks[k] = { nan }
      if (nan) for (let i = 0; i < L.length; i++) { if (!Number.isFinite(L[i])) L[i] = 0; if (!Number.isFinite(R[i])) R[i] = 0 }
    }
    const { gain, mix } = mixdown(stems)
    for (const [k, [L]] of Object.entries(stems)) {
      let peak = 0, sum = 0
      for (let i = 0; i < L.length; i++) {
        const v = L[i] * gain
        peak = Math.max(peak, Math.abs(v))
        sum += v * v
      }
      Object.assign(tracks[k], { peak, rms: Math.sqrt(sum / L.length) })
    }
    return { name: song.name, seconds: mix[0].length / 44100, tracks }
  } catch (e) {
    return { error: String(e?.stack ?? e) }
  }
}

if (!isMainThread) parentPort.postMessage(await measure(workerData.file))
else if (process.argv[2]) console.log(JSON.stringify(await measure(process.argv[2]), null, 1))
