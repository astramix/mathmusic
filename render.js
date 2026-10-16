// Renders song files:  node render.js [songs/a.js songs/b.js ...] [--master [-14]]   (no files = every song)
// → out/<song>/mix.wav, one WAV stem + one MIDI clip per track, graph.svg, graph.png; with --master also
// mix-mastered.wav: the master bus of src/master.js (glue compressor, bass in mono, true-peak limiter at −1 dBTP)
// and the loudness target (−14 LUFS unless given), with its measured loudness and true peak.
// Flags tracks whose RMS is far below the loudest one ("quiet?") or that clip near 0 dB ("hot?").
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { exportSong, plotPng, writeWav } from './src/engine.js'
import { masterOffline, MASTER_DEFAULTS } from './src/master.js'
import { lufs } from './src/loudness.js'

const args = process.argv.slice(2), mi = args.indexOf('--master')
const masterTarget = mi < 0 ? null : Number.isFinite(+args[mi + 1]) && args[mi + 1] !== '' ? +args[mi + 1] : -14
const rest = args.filter((a, i) => i !== mi && !(mi >= 0 && i === mi + 1 && Number.isFinite(+a)))
const files = rest.length ? rest : fs.readdirSync('songs').filter(f => f.endsWith('.js')).map(f => path.join('songs', f))
const dB = v => (v > 0 ? 20 * Math.log10(v) : -Infinity)
const fmt = v => (Number.isFinite(v) ? v.toFixed(1) : '-inf').padStart(7)

for (const file of files) {
  const song = (await import(pathToFileURL(path.resolve(file)).href)).default
  const dir = path.resolve('out', song.name)
  const t0 = performance.now()
  const { levels, seconds, mix } = exportSong(song, dir)
  plotPng(path.join(dir, 'graph.png'), song, { width: 1200, height: 300 })
  const loudest = Math.max(...Object.values(levels).map(l => dB(l.rms)))
  console.log(`\n${song.name}\ntrack          peak dB  rms dB`)
  for (const [name, { peak, rms }] of Object.entries(levels)) {
    const note = dB(rms) < loudest - 22 ? '  quiet?' : dB(peak) > -1.5 ? '  hot?' : ''
    console.log(`${name.padEnd(14)}${fmt(dB(peak))} ${fmt(dB(rms))}${note}`)
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1)
  console.log(`${seconds.toFixed(1)} s of audio at ${song.bpm} BPM rendered in ${secs} s → ${dir}`)
  if (masterTarget != null) {
    const m = masterOffline(mix[0], mix[1], MASTER_DEFAULTS, { lufs, target: masterTarget })
    writeWav(path.join(dir, 'mix-mastered.wav'), [m.L, m.R])
    console.log(`mastered: ${m.lufs.toFixed(1)} LUFS, true peak ${m.tp.toFixed(1)} dBTP (gain ${m.gainDb >= 0 ? '+' : ''}${m.gainDb.toFixed(1)} dB) → mix-mastered.wav`)
  }
}

await import("./viz/build.js") // refresh "MathMusic Live.html" with the new songs
