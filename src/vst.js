// The user's VST plugins in MathMusic (Node: render.js, viz/serve.js; MathMusic.exe does the same in viz/launcher.cs). A track
// of a song may say `vst: { plugin: 'DSK ChoirZ', preset: 'Magma depths — 4-DSK ChoirZ', program, gain }`: where the plugin is
// installed, that track's notes (its midi()) are played through it by our own VST 2.4 host (vst/vsthost.cs) and its audio
// replaces the track's own; elsewhere (the APK, a browser tab, a machine without it) the track's math sound plays.
// Plugins: the usual VST folders; a jBridge stub (a few KB, its .txt names the original) leads to the original DLL — 32-bit ones
// run in vsthost32.exe, no bridge needed. Presets: the plugins' states out of the user's Ableton sets (tools/als.mjs presets),
// kept on this computer only, in ~/.mathmusic/vst-presets/<plugin>/<name>.json. Renders are cached in ~/.mathmusic/vst-cache/.
// Not imported by songs.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { readWav } from '../tools/wav.mjs'
import { readTrackNotes } from './project.js'

const HOME = path.join(os.homedir(), '.mathmusic')
export const PRESET_DIR = path.join(HOME, 'vst-presets')
export const CACHE_DIR = path.join(HOME, 'vst-cache')
const PF = process.env.ProgramFiles || 'C:\\Program Files', PF86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
export const PLUGIN_DIRS = [
  ...(process.env.MATHMUSIC_VST_PATH ?? '').split(';').filter(Boolean),
  path.join(PF, 'VSTPlugins'), path.join(PF, 'VSTPlugX'), path.join(PF, 'Common Files', 'VST2'), path.join(PF, 'Steinberg', 'VSTPlugins'),
  path.join(PF86, 'VSTPlugins'), path.join(PF86, 'Steinberg', 'VSTPlugins'), path.join(PF, 'Common Files', 'VST3'),
]
const HOSTS = { 32: path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'vst', 'bin', 'vsthost32.exe') }
HOSTS[64] = HOSTS[32].replace('vsthost32', 'vsthost64')

// a DLL's machine: 32 | 64 | null (not a PE file)
export function peBits(file) {
  try {
    const fd = fs.openSync(file, 'r'), b = Buffer.alloc(4096)
    fs.readSync(fd, b, 0, 4096, 0)
    fs.closeSync(fd)
    if (b.toString('latin1', 0, 2) !== 'MZ') return null
    const pe = b.readUInt32LE(0x3c), m = pe + 6 < 4096 ? b.readUInt16LE(pe + 4) : 0
    return m === 0x8664 ? 64 : m === 0x14c ? 32 : null
  } catch { return null }
}
// a jBridge stub (a small DLL with a .txt beside it naming the original in quotes) → the original's path; anything else → itself
export function resolveStub(dll) {
  const txt = dll.replace(/\.dll$/i, '.txt')
  if (fs.existsSync(txt) && fs.statSync(dll).size < 64 << 10) {
    const m = fs.readFileSync(txt, 'latin1').match(/^\s*"([^"]+\.dll)"/i)
    if (m && fs.existsSync(m[1])) return m[1]
  }
  return dll
}
function walk(dir, depth, out) {
  let list = []
  try { list = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of list) {
    const p = path.join(dir, e.name)
    if (/\.vst3$/i.test(e.name)) out.push(p)
    else if (e.isDirectory() && depth > 0) walk(p, depth - 1, out)
    else if (/\.dll$/i.test(e.name)) out.push(p)
  }
}
// every plugin found → [{ name, path (the original DLL), bits, kind: 'vst2' | 'vst3', hosted: can our host play it, via (the stub) }]
export function scanPlugins(dirs = PLUGIN_DIRS) {
  const found = new Map()
  for (const d of dirs) {
    const files = []
    walk(d, 4, files)
    for (const f of files) {
      const name = path.basename(f).replace(/\.(dll|vst3)$/i, '')
      if (/\.vst3$/i.test(f)) { if (!found.has(name)) found.set(name, { name, path: f, bits: 64, kind: 'vst3', hosted: false }); continue }
      const orig = resolveStub(f), bits = peBits(orig)
      if (!bits) continue
      const have = found.get(name) // (a stub and its original lead to the same file: the first one found stays)
      if (have?.kind === 'vst2') { if (have.path === orig && orig !== f && !have.via) have.via = f; continue }
      found.set(name, { name, path: orig, bits, kind: 'vst2', hosted: true, ...(orig !== f ? { via: f } : {}) })
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}
export const findPlugin = name => scanPlugins().find(p => p.name.toLowerCase() === String(name).toLowerCase()) ?? null

// the host for a plugin's bitness (built on demand from vst/vsthost.cs)
async function hostFor(bits) {
  if (!fs.existsSync(HOSTS[bits])) (await import('../vst/build.js')).buildHosts({ quiet: true })
  return HOSTS[bits]
}
// a plugin's name, vendor and programs (asked once, cached by file and date)
export async function pluginInfo(p) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const file = path.join(CACHE_DIR, 'info.json'), all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const key = p.path + '|' + fs.statSync(p.path).mtimeMs
  if (all[key]) return all[key]
  const r = spawnSync(await hostFor(p.bits), ['--info', p.path], { encoding: 'utf8', timeout: 60000, windowsHide: true })
  if (r.status !== 0) throw new Error(`${p.name}: ${r.stderr || r.error?.message || 'the host failed'}`)
  all[key] = JSON.parse(r.stdout.trim().split('\n').pop())
  fs.writeFileSync(file, JSON.stringify(all, null, 1))
  return all[key]
}

// ---- presets: the plugins' states from the user's sets (local, outside git) ----------------------------------------------
const safe = s => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()
export function savePreset({ plugin, name, program = -1, chunk = null, uniqueId = null, set = null, track = null }) {
  const dir = path.join(PRESET_DIR, safe(plugin))
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, safe(name) + '.json')
  fs.writeFileSync(file, JSON.stringify({ plugin, name, program, uniqueId, set, track, chunk: chunk ? Buffer.from(chunk).toString('base64') : null }, null, 1))
  return file
}
export function listPresets(plugin = null) {
  const out = []
  let dirs = []
  try { dirs = fs.readdirSync(PRESET_DIR) } catch { return out }
  for (const d of dirs) for (const f of fs.readdirSync(path.join(PRESET_DIR, d)).filter(f => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(PRESET_DIR, d, f), 'utf8'))
      if (!plugin || j.plugin.toLowerCase() === plugin.toLowerCase()) out.push({ plugin: j.plugin, name: j.name, program: j.program, set: j.set, track: j.track })
    } catch {}
  }
  return out
}
export function readPreset(plugin, name) {
  const file = path.join(PRESET_DIR, safe(plugin), safe(name) + '.json')
  if (!fs.existsSync(file)) return null
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { ...j, chunk: j.chunk ? Buffer.from(j.chunk, 'base64') : null }
}

// ---- rendering a part ------------------------------------------------------------------------------------------------
// a process → { status, stdout, stderr } (killed after ms)
function run(exe, args, ms) {
  return new Promise(resolve => {
    const p = spawn(exe, args, { windowsHide: true }), out = [], err = []
    const timer = setTimeout(() => p.kill(), ms)
    p.stdout.on('data', d => out.push(d)); p.stderr.on('data', d => err.push(d))
    p.on('error', e => { clearTimeout(timer); resolve({ status: -1, stdout: '', stderr: e.message }) })
    p.on('close', status => { clearTimeout(timer); resolve({ status, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') }) })
  })
}
// notes [[start s, length s, MIDI, velocity 0..1]] through a plugin → { L, R } (Float32Array, sr), cached
export async function renderPart({ plugin, preset = null, program = null, notes, seconds, sr = 44100 }) {
  const p = typeof plugin === 'string' ? findPlugin(plugin) : plugin
  if (!p) throw new Error(`плагин «${plugin}» не найден в папках VST`)
  if (!p.hosted) throw new Error(`${p.name}: ${p.kind.toUpperCase()} — наш хост пока играет только VST2`)
  const pr = preset ? readPreset(p.name, preset) : null
  if (preset && !pr) console.warn(`vst: no preset «${preset}» for ${p.name} — its own program ${program ?? 0}`)
  const prog = program ?? pr?.program ?? (pr ? -1 : 0)
  const list = notes.map(([t, d, n, v]) => `${t.toFixed(5)} ${Math.max(0.005, d).toFixed(5)} ${Math.round(n)} ${Math.max(1, Math.min(127, Math.round((v ?? 0.8) * 127)))}`).join('\n')
  const key = crypto.createHash('sha1').update([p.path, fs.statSync(p.path).mtimeMs, pr?.chunk?.toString('base64') ?? '', prog, seconds.toFixed(3), sr, list].join('|')).digest('hex').slice(0, 20)
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const wav = path.join(CACHE_DIR, key + '.wav')
  if (!fs.existsSync(wav)) {
    const nf = path.join(CACHE_DIR, key + '.notes'), cf = path.join(CACHE_DIR, key + '.chunk')
    fs.writeFileSync(nf, list)
    if (pr?.chunk) fs.writeFileSync(cf, pr.chunk)
    // (asynchronous: a server keeps answering, and several parts render at once on several cores)
    const r = await run(await hostFor(p.bits), [p.path, pr?.chunk ? cf : '-', String(prog), nf, seconds.toFixed(3), wav, String(sr)], 600000)
    fs.rmSync(nf, { force: true }); fs.rmSync(cf, { force: true })
    if (r.status !== 0 || !fs.existsSync(wav)) throw new Error(`${p.name}: ${(r.stderr || r.stdout || 'the host failed').trim()}`)
  }
  const w = readWav(wav)
  return { L: w.channels[0], R: w.channels[1] ?? w.channels[0], sr: w.sr }
}
// a track's notes in seconds, from its midi() (the lengths restored from the gate; velocity as project.js guesses it)
export function partNotes(track, song) {
  const sec = 60 / song.bpm, drums = !!track.vst?.drums
  const oct = track.vst?.octaves ?? [0] // (a part the plugin should double: [0, -12] = with its lower octave, as the user writes strings and choir)
  return readTrackNotes(track.midi, song.length, { rate: 48, drums }).flatMap(([b, n, d, v]) => oct.map(o => [b * sec, d * sec, n + o, v ?? 0.8]))
}
// the song's tracks with a `vst` whose plugin is here → { key: [L, R] } (n samples at sr), the others left to their own audio
export async function vstStems(song, { sr = 44100, tail = 2, keys = null, onError = e => console.warn('vst:', e.message) } = {}) {
  const out = {}, sec = 60 / song.bpm, n = Math.ceil((song.length * sec + tail) * sr)
  // all the parts at once (each its own host process)
  await Promise.all(Object.entries(song.tracks ?? {}).map(async ([key, t]) => {
    if (!t?.vst || typeof t.midi !== 'function' || (keys && !keys.includes(key))) return
    try {
      const { L, R } = await renderPart({ plugin: t.vst.plugin, preset: t.vst.preset ?? null, program: t.vst.program ?? null, notes: partNotes(t, song), seconds: n / sr + 0.5, sr })
      const g = t.vst.gain ?? 1, l = new Float32Array(n), r = new Float32Array(n)
      for (let i = 0; i < n && i < L.length; i++) (l[i] = g * L[i]), (r[i] = g * R[i])
      out[key] = [l, r]
    } catch (e) { onError(e, key) }
  }))
  return out
}
