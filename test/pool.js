// Runs test/levels.js on many song files in parallel worker threads → Map(file → result)
import os from 'node:os'
import { Worker } from 'node:worker_threads'

export async function measureAll(files, threads = Math.max(1, Math.min(files.length, os.availableParallelism?.() ?? os.cpus().length) - 1)) {
  const out = new Map(), queue = [...files]
  const run = async () => {
    while (queue.length) {
      const file = queue.shift()
      out.set(file, await new Promise(resolve => {
        const w = new Worker(new URL('./levels.js', import.meta.url), { workerData: { file } })
        w.once('message', resolve)
        w.once('error', e => resolve({ error: String(e?.stack ?? e) }))
      }))
    }
  }
  await Promise.all(Array.from({ length: threads }, run))
  return out
}

export const dB = v => (v > 0 ? 20 * Math.log10(v) : -Infinity)
export const AMBIENT = /ambience|rain|vinyl|wind|purr|texture|sfx|^fx|riser|thunder|sample|space|stars|noise|crackle/i
// render.js's flags: quiet? = RMS more than 22 dB under the loudest track, hot? = peak over −1.5 dBFS
export function flags(result) {
  const t = Object.entries(result.tracks ?? {})
  const loudest = Math.max(...t.map(([, v]) => dB(v.rms)))
  return t.map(([k, v]) => ({
    key: k, peak: dB(v.peak), rms: dB(v.rms), nan: v.nan,
    hot: dB(v.peak) > -1.5, quiet: dB(v.rms) < loudest - 22 && !AMBIENT.test(k),
  }))
}
