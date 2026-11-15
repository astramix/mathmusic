// Ableton Live sets (.als — gzipped XML) read for MathMusic:
//   node tools/als.mjs info <set.als>                    tempo, length, key, every track: its plugin (and program), notes, clips
//   node tools/als.mjs notes <set.als> [out.json]        the arrangement's notes per track: [beat, MIDI, length, velocity 0..1]
//   node tools/als.mjs presets <set.als | folder> …      every VST plugin's state (its bank chunk and program) → the local
//                                                        presets of src/vst.js (~/.mathmusic/vst-presets), named "<set> — <track>"
// What a set says: <MidiTrack>s with <EffectiveName>; arrangement clips (outside <ClipSlotList>): Time = the place, CurrentStart /
// CurrentEnd = its span in the arrangement, the notes count from LoopStart (looped when LoopOn); notes in <KeyTrack> (<MidiKey>)
// as <MidiNoteEvent Time Duration Velocity IsEnabled>; a drum rack's pads: <DrumBranch> with ReceivingNote = 128 − MIDI note;
// <VstPluginInfo>: PlugName, FileName, UniqueId, <VstPreset> ProgramNumber and <Buffer> (the plugin's chunk in hex; Type 'FBCh' = a bank).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

export function readSetXml(file) {
  const raw = fs.readFileSync(file)
  return raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw).toString('utf8') : raw.toString('utf8')
}
const val = (s, tag) => s.match(new RegExp(`<${tag} Value="([^"]*)"`))?.[1]
// → { tempo, live, tracks: [{ name, kind, plugin: { name, file, uniqueId, program, chunk: Buffer, bank } | null, notes, clips, pads }] }
export function readSet(file) {
  const xml = readSetXml(file)
  const tempo = +(xml.match(/<Tempo>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 120)
  const tracks = []
  for (const [, kind, body] of xml.matchAll(/<(MidiTrack|AudioTrack|GroupTrack)\s+Id="\d+"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const name = val(body, 'EffectiveName') ?? kind
    const vi = body.match(/<VstPluginInfo[\s\S]*?<\/VstPluginInfo>/)?.[0]
    let plugin = null
    if (vi) {
      const hex = vi.match(/<Buffer>([\s\S]*?)<\/Buffer>/)?.[1]?.replace(/\s/g, '') ?? ''
      const type = +(vi.match(/<VstPreset[\s\S]*?<Type Value="(\d+)"/)?.[1] ?? 0)
      plugin = { name: val(vi, 'PlugName'), file: val(vi, 'FileName'), uniqueId: +val(vi, 'UniqueId'), program: +(val(vi, 'ProgramNumber') ?? 0), chunk: hex ? Buffer.from(hex, 'hex') : null, bank: type === 0x46424368 }
    }
    const arr = body.replace(/<ClipSlotList>[\s\S]*?<\/ClipSlotList>/g, ''), notes = [], clips = []
    for (const [clip] of arr.matchAll(/<MidiClip [\s\S]*?<\/MidiClip>/g)) {
      const at = +clip.match(/Time="([^"]+)"/)[1], start = +val(clip, 'CurrentStart'), end = +val(clip, 'CurrentEnd')
      const loopStart = +val(clip, 'LoopStart'), loopEnd = +val(clip, 'LoopEnd'), looping = val(clip, 'LoopOn') === 'true', len = end - start, period = loopEnd - loopStart
      clips.push({ at, len, name: val(clip, 'Name') ?? '' })
      const raw = []
      for (const [, kt] of clip.matchAll(/<KeyTrack [^>]*>([\s\S]*?)<\/KeyTrack>/g)) {
        const key = +kt.match(/<MidiKey Value="(\d+)"/)[1]
        for (const [, t, d, v, en] of kt.matchAll(/<MidiNoteEvent Time="([^"]+)" Duration="([^"]+)" Velocity="([^"]+)"[^>]*?IsEnabled="([^"]+)"/g)) if (en === 'true') raw.push([+t, key, +d, +v / 127])
      }
      for (let o = 0; o < len; o += looping && period > 0 ? period : Infinity) {
        for (const [t, k, d, v] of raw) {
          const rel = t - loopStart + o
          if ((looping && (t < loopStart || t >= loopEnd)) || rel < 0 || rel >= len) continue
          notes.push([+(at + rel).toFixed(4), k, +Math.min(d, len - rel).toFixed(4), +v.toFixed(3)])
        }
        if (!looping || period <= 0) break
      }
    }
    notes.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const pads = [...body.matchAll(/<DrumBranch [\s\S]*?<\/DrumBranch>/g)].map(([b]) => ({
      note: 128 - +(b.match(/<ReceivingNote Value="(\d+)"/)?.[1] ?? 0), name: val(b, 'UserName') || '', sample: b.match(/<Name Value="([^"]+\.(?:wav|aif|aiff|mp3|flac))"/i)?.[1] ?? null,
      transpose: +(b.match(/<TransposeKey>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 0), volume: +(b.match(/<Volume>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 0),
    }))
    tracks.push({ name, kind, plugin, notes, clips, pads })
  }
  return { tempo, live: xml.match(/Creator="([^"]+)"/)?.[1] ?? '', tracks }
}
// every VST state of a set → the local presets (src/vst.js); → the files written
export async function importPresets(file) {
  const { savePreset } = await import('../src/vst.js')
  const set = path.basename(file).replace(/\.als$/i, ''), out = []
  for (const t of readSet(file).tracks) if (t.plugin?.name) out.push(savePreset({ plugin: t.plugin.name, name: `${set} — ${t.name}`, program: t.plugin.program, chunk: t.plugin.chunk, uniqueId: t.plugin.uniqueId, set, track: t.name }))
  return out
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2)
  const sets = rest.flatMap(f => (fs.existsSync(f) && fs.statSync(f).isDirectory() ? fs.readdirSync(f).filter(x => x.endsWith('.als')).map(x => path.join(f, x)) : [f]))
  if (cmd === 'info') for (const f of sets) {
    const s = readSet(f), end = Math.max(0, ...s.tracks.flatMap(t => t.notes.map(n => n[0] + n[2])))
    console.log(`${path.basename(f)} — ${s.live}, ${s.tempo} BPM, ${(end / 4).toFixed(0)} bars (${((end * 60) / s.tempo / 60).toFixed(1)} min)`)
    for (const t of s.tracks) console.log(`  ${t.name.padEnd(26)} ${t.plugin ? `${t.plugin.name} (program ${t.plugin.program}${t.plugin.chunk ? `, state ${t.plugin.chunk.length} B` : ''})` : t.pads.length ? `drum rack, ${t.pads.length} pads` : ''}${t.notes.length ? ` · ${t.notes.length} notes` : ''}`)
  } else if (cmd === 'notes') {
    const s = readSet(sets[0]), json = JSON.stringify({ tempo: s.tempo, tracks: s.tracks.map(t => ({ name: t.name, plugin: t.plugin?.name ?? null, notes: t.notes })) })
    rest[1] ? fs.writeFileSync(rest[1], json) : console.log(json)
  } else if (cmd === 'presets') {
    for (const f of sets) { const w = await importPresets(f); console.log(`${path.basename(f)}: ${w.length} presets`) }
    console.log('→', (await import('../src/vst.js')).PRESET_DIR)
  } else console.log('usage: node tools/als.mjs info|notes|presets <set.als | folder> …')
}
