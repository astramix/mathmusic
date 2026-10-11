// Node for Max side of the MathMusic device (runs inside Ableton via node.script).
//
// Loads a song file, renders it at Live's tempo into a WAV that the device plays in sync
// with the transport, draws the graph, re-renders whenever the song file is saved, and
// exports stems + MIDI on request.
//
// Max → here:  tempo <bpm> | open <file> | edit | export | sample <A|B> <file> | clear <A|B>
// here → Max:  buffer <wav> | timing <ms per beat> <buffer ms> <song ms> | graph <png> | status <text>
import maxApi from 'max-api'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SR, render, mixdown, writeWav, plotPng, exportSong } from '../src/engine.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here)
const stateFile = path.join(here, 'state.json')
const tmp = path.join(os.tmpdir(), 'mathmusic', String(process.pid))
fs.mkdirSync(tmp, { recursive: true })

// Last opened song and dropped samples survive restarts of Live.
const state = { song: path.join(root, 'songs', 'hardstyle.js'), samples: {} }
try {
  Object.assign(state, JSON.parse(fs.readFileSync(stateFile, 'utf8')))
} catch {}
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))

const maxPath = p => p.replace(/\\/g, '/')
const status = text => maxApi.outlet('status', text)

let song = null, tempo = 0, version = 0, watcher = null
let timer = null, reloadPending = false, running = false

async function loadSong() {
  // A fresh URL makes import() read the edited file instead of its module cache.
  song = (await import(`${pathToFileURL(state.song).href}?v=${Date.now()}`)).default
  watcher?.close()
  watcher = fs.watch(state.song, () => schedule({ reload: true }))
}

// Debounced (re)render; editors fire several change events per save.
function schedule({ reload = false, delay = 300 } = {}) {
  reloadPending ||= reload
  clearTimeout(timer)
  timer = setTimeout(run, delay)
}

async function run() {
  if (running) return schedule()
  running = true
  try {
    if (reloadPending || !song) {
      reloadPending = false
      status(`Loading ${path.basename(state.song)}...`)
      await loadSong()
    }
    const bpm = tempo || song.bpm
    status(`Rendering ${song.name} at ${bpm} BPM...`)
    const t0 = Date.now()
    const { mix } = mixdown(render({ ...song, bpm }, { samples: state.samples }))
    const n = ++version
    const wav = path.join(tmp, `mix-${n}.wav`), png = path.join(tmp, `graph-${n}.png`)
    writeWav(wav, mix)
    plotPng(png, song)
    const msPerBeat = 60000 / bpm
    await maxApi.outlet('buffer', maxPath(wav))
    await maxApi.outlet('timing', msPerBeat, (mix[0].length / SR) * 1000, song.length * msPerBeat)
    await maxApi.outlet('graph', maxPath(png))
    const secs = ((Date.now() - t0) / 1000).toFixed(1)
    const written = Math.abs(bpm - song.bpm) > 0.01 ? `, written for ${song.bpm} BPM` : ''
    status(`${song.name}: ${song.length} beats at ${bpm} BPM (rendered in ${secs} s${written})`)
    for (const f of fs.readdirSync(tmp)) {
      if (Number(f.match(/-(\d+)\./)?.[1]) < n - 1) fs.rmSync(path.join(tmp, f), { force: true })
    }
  } catch (err) {
    status(`Error: ${err.message}`)
    maxApi.post(err.stack ?? String(err))
  } finally {
    running = false
  }
}

maxApi.addHandlers({
  tempo: bpm => {
    if (!(bpm >= 20 && bpm <= 999) || Math.abs(bpm - tempo) < 0.01) return
    const first = !tempo
    tempo = bpm
    schedule({ delay: first ? 0 : 500 })
  },
  open: file => {
    state.song = path.resolve(String(file))
    save()
    schedule({ reload: true, delay: 0 })
  },
  edit: () => {
    // VS Code if it is on PATH, Notepad otherwise. Never `start`: Windows runs .js files.
    exec(`code "${state.song}"`, err => err && exec(`notepad "${state.song}"`))
  },
  export: () => {
    if (!song) return status('Nothing to export yet')
    try {
      const dir = path.join(root, 'out', song.name)
      status(`Exporting to out/${song.name}...`)
      exportSong({ ...song, bpm: tempo || song.bpm }, dir, { samples: state.samples })
      exec(`explorer "${dir}"`)
      status(`Exported stems + MIDI to out/${song.name}`)
    } catch (err) {
      status(`Error: ${err.message}`)
      maxApi.post(err.stack ?? String(err))
    }
  },
  sample: (slot, file) => {
    if (!file || !fs.existsSync(String(file)) || state.samples[slot] === String(file)) return
    state.samples[slot] = String(file)
    save()
    schedule({ delay: 0 })
  },
  clear: slot => {
    delete state.samples[slot]
    save()
    schedule({ delay: 0 })
  },
})

status('Engine started, waiting for Live...')
// Normally the first tempo message triggers the first render; this covers a silent transport.
setTimeout(() => !song && !running && schedule({ delay: 0 }), 1500)
