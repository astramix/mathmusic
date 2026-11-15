// Ableton Live sets (.als — gzipped XML) read for MathMusic:
//   node tools/als.mjs info <set.als>                    tempo, length, key, every track: its plugin (and program), notes, clips
//   node tools/als.mjs notes <set.als> [out.json]        the arrangement's notes per track: [beat, MIDI, length, velocity 0..1]
//   node tools/als.mjs presets <set.als | folder> …      every VST plugin's state (its bank chunk and program) → the local
//                                                        presets of src/vst.js (~/.mathmusic/vst-presets), named "<set> — <track>"
//   node tools/als.mjs kit <set.als> <drum track> [--freeze <wav>]   a drum rack → a sample kit of the user's (~/.mathmusic/kits), its samples found here
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

// a set's drum rack → a sample kit of the user's (src/vst.js plays it like a plugin): each pad's sample found on this computer — the
// set's own path, the same path under any installed Live's Core Library (Live 10's "Samples/Drums/…" is "Samples/One Shots/Drums/…" in
// Live 11 and 12), the set's project folder, or a file of that name in the user's other projects — with its transpose, volume and the
// part of the sample it plays. The kit only points at the files (nothing is copied): ~/.mathmusic/kits/<set> — <track>.json
export async function importKit(file, trackName) {
  const { saveKit } = await import('../src/vst.js')
  const xml = readSetXml(file), set = path.basename(file).replace(/\.als$/i, '').replace(/ \[\d{4}-\d\d-\d\d \d+\]$/, '')
  const tracks = [...xml.matchAll(/<MidiTrack\s+Id="\d+"[^>]*>([\s\S]*?)<\/MidiTrack>/g)].map(m => m[1])
  const body = tracks.find(b => (val(b, 'EffectiveName') ?? '') === trackName) ?? tracks.find(b => (val(b, 'EffectiveName') ?? '').includes(trackName))
  if (!body) throw new Error(`${path.basename(file)}: no track «${trackName}»`)
  const name = val(body, 'EffectiveName')
  const pd = 'C:/ProgramData/Ableton', libs = fs.existsSync(pd) ? fs.readdirSync(pd).map(d => path.join(pd, d, 'Resources', 'Core Library')).filter(p => fs.existsSync(p)) : []
  const projDir = path.dirname(file).replace(/[\\/]Backup$/, ''), projects = path.dirname(projDir)
  const byName = new Map() // the user's other projects' samples, by file name (asked only when needed)
  const findByName = f => {
    if (!byName.size) for (const p of fs.readdirSync(projects)) {
      const walk = (d, depth) => { let l = []; try { l = fs.readdirSync(d, { withFileTypes: true }) } catch {} for (const e of l) { const q = path.join(d, e.name); if (e.isDirectory() && depth > 0) walk(q, depth - 1); else if (!byName.has(e.name)) byName.set(e.name, q) } }
      walk(path.join(projects, p, 'Samples'), 3)
    }
    return byName.get(f) ?? null
  }
  const pads = {}
  for (const [b] of body.matchAll(/<DrumBranch [\s\S]*?<\/DrumBranch>/g)) {
    const note = 128 - +(b.match(/<ReceivingNote Value="(\d+)"/)?.[1] ?? 0)
    const rel = b.match(/<RelativePath Value="([^"]+\.(?:aif|aiff|wav))"/i)?.[1], abs = b.match(/<Path Value="([^"]+\.(?:aif|aiff|wav))"/i)?.[1]
    const fname = b.match(/<Name Value="([^"]+\.(?:aif|aiff|wav))"/i)?.[1] ?? (rel ?? abs ?? '').split(/[\\/]/).pop()
    const relDirs = rel ? [rel, rel.replace(/^Samples\/Drums\//, 'Samples/One Shots/Drums/')] : []
    const here = [abs, ...libs.flatMap(l => relDirs.map(r => path.join(l, r))), ...relDirs.map(r => path.join(projDir, r))].find(p => p && fs.existsSync(p)) ?? (fname ? findByName(fname) : null)
    const padName = b.match(/<EffectiveName Value="([^"]*)"/)?.[1] || fname?.replace(/\.\w+$/, '') || String(note)
    if (!here) { console.warn(`  pad ${note} «${padName}»: no sample here (${rel ?? abs ?? 'a compressed or missing file'})`); continue }
    pads[note] = {
      name: padName, file: here,
      transpose: +(b.match(/<TransposeKey>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 0) + +(b.match(/<TransposeFine>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 0) / 100,
      volume: +(b.match(/<Volume>[\s\S]*?<Manual Value="([^"]+)"/)?.[1] ?? 0),
      start: +(b.match(/<SampleStart Value="([^"]+)"/)?.[1] ?? 0), end: +(b.match(/<SampleEnd Value="([^"]+)"/)?.[1] ?? 0),
    }
  }
  return saveKit({ name: `${set} — ${name}`, set, track: name, pads })
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
  } else if (cmd === 'kit') {
    const out = await importKit(rest[0], rest[1] ?? 'Kit')
    console.log('→', out)
    // --freeze <wav>: Ableton's own render of that track → the kit's sound matched to it (the track's effects as a measured curve + gain)
    const fi = process.argv.indexOf('--freeze')
    if (fi > 0) {
      const s = readSet(rest[0]), t = s.tracks.find(x => x.name === (rest[1] ?? 'Kit')) ?? s.tracks.find(x => x.name.includes(rest[1] ?? 'Kit')), sec = 60 / s.tempo
      const { matchKit } = await import('../src/vst.js')
      const name = JSON.parse(fs.readFileSync(out, 'utf8')).name
      const m = await matchKit(name, t.notes.map(([b, n, d, v]) => [b * sec, d * sec, n, v]), process.argv[fi + 1])
      console.log('matched to', m.from, '— gain', m.gain, 'dB, curve', m.bands.join(' '))
    }
  } else console.log('usage: node tools/als.mjs info|notes|presets <set.als | folder> … | kit <set.als> <drum track>')
}
