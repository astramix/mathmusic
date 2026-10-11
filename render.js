// Renders song files:  node render.js [songs/a.js songs/b.js ...]   (no arguments = every song)
// → out/<song>/mix.wav, one WAV stem + one MIDI clip per track, graph.svg, graph.png
// Flags tracks whose RMS is far below the loudest one ("quiet?") or that clip near 0 dB ("hot?").
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { exportSong, plotPng } from './src/engine.js'

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync('songs').filter(f => f.endsWith('.js')).map(f => path.join('songs', f))
const dB = v => (v > 0 ? 20 * Math.log10(v) : -Infinity)
const fmt = v => (Number.isFinite(v) ? v.toFixed(1) : '-inf').padStart(7)

for (const file of files) {
  const song = (await import(pathToFileURL(path.resolve(file)).href)).default
  const dir = path.resolve('out', song.name)
  const t0 = performance.now()
  const { levels, seconds } = exportSong(song, dir)
  plotPng(path.join(dir, 'graph.png'), song, { width: 1200, height: 300 })
  const loudest = Math.max(...Object.values(levels).map(l => dB(l.rms)))
  console.log(`\n${song.name}\ntrack          peak dB  rms dB`)
  for (const [name, { peak, rms }] of Object.entries(levels)) {
    const note = dB(rms) < loudest - 22 ? '  quiet?' : dB(peak) > -1.5 ? '  hot?' : ''
    console.log(`${name.padEnd(14)}${fmt(dB(peak))} ${fmt(dB(rms))}${note}`)
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1)
  console.log(`${seconds.toFixed(1)} s of audio at ${song.bpm} BPM rendered in ${secs} s → ${dir}`)
}

await import("./viz/build.js") // refresh "MathMusic Live.html" with the new songs
