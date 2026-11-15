// The user's VST plugins in the app: when the page comes from MathMusic.exe or Visualizer.bat (viz/serve.js), a track with
// `vst: { plugin, preset, program, octaves, gain }` is played through that plugin — the server's VST host renders its notes (read
// from the track's midi()) and the player / the exports use that audio instead of the track's own. Opened as a file, in the APK
// or where the plugin isn't installed, nothing changes: the track's own sound plays.
const H = { 'x-mathmusic': '1' }
let state = null
// → { host, plugins: [{ name, kind, hosted, programs }], presets: [{ plugin, name, program, set, track }] } | null
export function vstState() {
  if (!state) state = typeof location !== 'undefined' && location.protocol.startsWith('http')
    ? fetch('/api/vst', { headers: H }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    : Promise.resolve(null)
  return state
}
let readNotes = null
async function notesOf(t, song) {
  readNotes ??= (await import(MM.url('project.js'))).readTrackNotes
  const sec = 60 / song.bpm, oct = t.vst.octaves ?? [0]
  return readNotes(t.midi, song.length, { rate: 48, drums: !!(t.vst.drums || t.vst.kit) }).flatMap(([b, n, d, v]) => oct.map(o => [b * sec, d * sec, n + o, v ?? 0.8]))
}
// the song's tracks whose plugin is here → [[key, track]]
export async function vstTracks(song, trackList) {
  const st = await vstState()
  if (!st) return []
  const have = new Set(st.plugins.filter(p => p.hosted).map(p => p.name.toLowerCase())), kits = new Set((st.kits ?? []).map(k => k.name))
  return trackList(song).filter(([, t]) => t?.vst && typeof t.midi === 'function' && (t.vst.kit ? kits.has(t.vst.kit) : have.has(String(t.vst.plugin).toLowerCase())))
}
// one track through its plugin → { L, R } at sr (the same request is asked once; the server caches renders on disk too)
const asked = new Map()
export async function vstAudio(song, t, { sr, seconds }) {
  const body = JSON.stringify(t.vst.kit ? { kit: t.vst.kit, notes: await notesOf(t, song), seconds, sr } : { plugin: t.vst.plugin, preset: t.vst.preset ?? null, program: t.vst.program ?? null, notes: await notesOf(t, song), seconds, sr })
  if (!asked.has(body)) {
    asked.set(body, fetch('/api/vst/render', { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body }).then(async r => {
      if (!r.ok) throw new Error(await r.text())
      const n = +r.headers.get('x-samples'), a = new Float32Array(await r.arrayBuffer())
      return { L: a.subarray(0, n), R: a.subarray(n, 2 * n) }
    }))
    while (asked.size > 40) asked.delete(asked.keys().next().value)
  }
  let a
  try { a = await asked.get(body) } catch (e) { asked.delete(body); throw e }
  const g = t.vst.gain ?? 1
  return g === 1 ? a : { L: a.L.map(v => v * g), R: a.R.map(v => v * g) }
}
// samples [from, from + n) of a rendered track (zeros past its end)
export function sliceOf(a, from, n) {
  const L = new Float32Array(n), R = new Float32Array(n)
  if (from < a.L.length) { L.set(a.L.subarray(from, Math.min(a.L.length, from + n))); R.set(a.R.subarray(from, Math.min(a.R.length, from + n))) }
  return [L, R]
}
