// The multitrack editor around the piano roll: every song's tracks in a list on the left — a project's tracks of notes
// (src/project.js: an instrument each, volume, pan, room; up to 32), the song's own tracks written in code (turned into
// notes with ❄, or removed and brought back), and the generator at hand: a melody in any style for a track, a part for
// one track under the melody of another, or a whole arrangement in a style under it. «Песня → Новый проект» starts one
// from scratch. Edits go into the code (PROJECT is plain data in the song file) — a draft until Ctrl+S, like any edit.
import { app } from './app.js'
import { h, esc, toast, modal, contextMenu, ask } from './ui.js'
import * as acorn from './acorn.js'
import { INSTRUMENTS, INSTRUMENT, GROUPS, GEN_INSTRUMENTS, genId, MAX_TRACKS, readProject, writeProject, isProject, newProjectSource, readTrackNotes, roleOf, instrumentFor, alignedParts } from './project.js'
import { generate, generatedPart, STYLES, STYLE_LIST, styleGroups } from './generate.js'
import { MODE_GROUPS, keyFor, MODES } from './modes.js'
import { harmonize } from './harmonize.js'
import { parentMode } from './modes.js'

const OWN = ['fugue', 'maqam', 'raga', 'gamelan', 'ambient'] // styles with a composer of their own: no arrangement under your melody
const newSeed = () => 1 + Math.floor(Math.random() * 999998)
const styleLabel = id => `${STYLES[id]?.emoji ?? ''} ${STYLES[id]?.label ?? id}`

// ---- the project of the song open now --------------------------------------------------------------------------------
const src = () => (app.current ? app.sourceOf(app.current) : '')
export const projectOf = () => readProject(src()) ?? { tracks: [] }
let applyTimer = null
// the song's code with the project written in: through the editor when it holds the song, else a draft applied at once
export function setProject(p) {
  const cur = app.current
  if (!cur) return
  const old = src()
  let next
  try {
    next = writeProject(old, p, { parse: acorn.parse })
  } catch (e) {
    return toast('не получилось: ' + e.message, { kind: 'err', ms: 7000 })
  }
  if (next === old) return
  if (app.editor?.owner?.() === cur) {
    let a = 0, b = 0
    while (a < old.length && a < next.length && old[a] === next[a]) a++
    while (b < old.length - a && b < next.length - a && old[old.length - 1 - b] === next[next.length - 1 - b]) b++
    app.editor.replaceIndex(a, old.length - b, next.slice(a, next.length - b))
  } else {
    app.setDraft(cur, next)
    clearTimeout(applyTimer)
    applyTimer = setTimeout(() => app.apply(next, { of: cur }).then(r => { if (r?.ok) app.pianoroll?.load?.(cur) }), 120)
  }
}
// the song's tracks: the project's (each with its key in song.tracks — __project adds them last, in order), the code's
// own, the removed ones
export function trackInfo() {
  const p = projectOf(), song = app.current?.song, keys = Object.keys(song?.tracks ?? {}).filter(k => song.tracks[k])
  const n = p.tracks.length, pk = keys.slice(Math.max(0, keys.length - n))
  return { p, project: p.tracks.map((t, i) => ({ t, key: pk[i] ?? t.name })), code: keys.slice(0, Math.max(0, keys.length - n)), removed: p.removed ?? [] }
}
const nextId = p => 't' + (1 + Math.max(0, ...p.tracks.map(t => +String(t.id).replace(/\D/g, '') || 0)))
const nameFor = (p, base) => { let n = base, j = 2; while (p.tracks.some(t => t.name === n)) n = `${base} ${j++}`; return n }

// a code track's notes (read from its midi()), kept per song version
const viewCache = new WeakMap()
export function codeNotes(key) {
  const song = app.current?.song, t = song?.tracks?.[key]
  if (!t?.midi) return []
  let m = viewCache.get(song)
  if (!m) viewCache.set(song, (m = new Map()))
  if (!m.has(key)) m.set(key, readTrackNotes(t.midi, song.length, { rate: 48, drums: roleOf(key) === 'drums' }))
  return m.get(key)
}

// ---- tracks ---------------------------------------------------------------------------------------------------------
export function addTrack(inst, { name, notes = [], gen = null, select = true } = {}) {
  const p = projectOf()
  if (p.tracks.length >= MAX_TRACKS) { toast(`в проекте уже ${MAX_TRACKS} дорожки — больше нельзя`, { kind: 'err' }); return null }
  const t = { id: nextId(p), name: nameFor(p, name ?? INSTRUMENT[inst].label), inst, vol: 1, pan: 0, notes, ...(gen ? { gen } : {}) }
  p.tracks.push(t)
  setProject(p)
  if (select) app.pianoroll?.want?.('p:' + t.id)
  return t
}
export function updateTrack(id, f) {
  const p = projectOf(), t = p.tracks.find(t => t.id === id)
  if (!t) return
  f(t, p)
  setProject(p)
}
export function removeTrack(id) {
  const p = projectOf(), t = p.tracks.find(t => t.id === id)
  if (!t) return
  p.tracks = p.tracks.filter(x => x !== t)
  setProject(p)
  toast(`🗑 дорожка «${t.name}» удалена`, { ms: 8000, action: { label: '↶ вернуть', run: () => { const q = projectOf(); q.tracks.push(t); setProject(q) } } })
}
// a track of the song's code: removed (the code stays, __project leaves it out) or back
export function removeCode(key, on = true) {
  const p = projectOf(), r = new Set(p.removed ?? [])
  on ? r.add(key) : r.delete(key)
  p.removed = [...r]
  setProject(p)
}
// ❄ a code track into notes: a project track with what it plays — a generated song's voice or kit on its very recipe ("как в
// песне": the same sound, the same level and side), any other on the instrument its name suggests; the code's track goes
export function freeze(key) {
  const notes = codeNotes(key)
  if (!notes.length) return toast(`«${key}» не отдаёт ноты (у неё нет midi()) — её можно только удалить`, { kind: 'err', ms: 6000 })
  const p = projectOf()
  if (p.tracks.length >= MAX_TRACKS) return toast(`в проекте уже ${MAX_TRACKS} дорожки`, { kind: 'err' })
  const part = generatedPart(app.current.song.generator, key)
  const t = part ? { id: nextId(p), name: nameFor(p, key + ' ♪'), inst: genId(part), vol: +part.vol.toFixed(3), pan: part.pan, notes }
    : { id: nextId(p), name: nameFor(p, key + ' ♪'), inst: instrumentFor(key, app.current.song.style ?? app.current.song.generator?.style), vol: 1, pan: 0, notes }
  p.tracks.push(t)
  p.removed = [...new Set([...(p.removed ?? []), key])]
  setProject(p)
  app.pianoroll?.want?.('p:' + t.id)
  toast(`❄ «${key}» теперь ноты: ${notes.length} — ${INSTRUMENT[t.inst].label} (инструмент можно сменить)`, { kind: 'ok', ms: 6000 })
}

// ---- the generator ---------------------------------------------------------------------------------------------------
// the song's tempo, key and mode as the generator takes them
function songOpts() {
  const s = app.current?.song ?? {}, m = s.mode && MODES[s.mode]
  return { bpm: s.bpm ?? 100, key: s.key ? String(s.key).replace('♯', '#').replace('♭', 'b') : undefined, mode: m && !m.grid ? s.mode : undefined }
}
function made(opts) {
  const { source, meta } = generate({ modulations: false, length: 'normal', ...opts })
  const { song } = app.rt.load(source)
  return { song, meta, parts: Object.entries(song.tracks).filter(([, t]) => t?.midi).map(([k, t]) => [k, readTrackNotes(t.midi, song.length, { drums: roleOf(k) === 'drums' })]) }
}
// octaves so the notes sit in the instrument's range (drums stay)
function fit(notes, inst) {
  const d = INSTRUMENT[inst]
  if (!notes.length || d.kind === 'drums') return notes
  const ns = notes.map(e => e[1]), mid = (Math.min(...ns) + Math.max(...ns)) / 2, want = (d.range[0] + d.range[1]) / 2
  let s = Math.round((want - mid) / 12) * 12
  while (s > 0 && Math.max(...ns) + s > d.range[1]) s -= 12
  while (s < 0 && Math.min(...ns) + s < d.range[0]) s += 12
  return notes.map(([b, n, l, v]) => [b, n + s, l, v])
}
const length = () => app.current?.song?.length ?? 64
// a melody in a style: the lead of a song the generator makes in this key and tempo, from its first note, as long as the song
export async function composeMelody(id, style, seed = newSeed()) {
  const p = projectOf(), t = p.tracks.find(t => t.id === id)
  if (!t) return
  const wait = toast(`${styleLabel(style)}: сочиняю мелодию для «${t.name}»…`, { progress: true })
  await new Promise(r => setTimeout(r, 30))
  try {
    const { parts } = made({ style, seed, ...songOpts() })
    const cands = parts.filter(([k, ns]) => roleOf(k) !== 'drums' && ns.length)
    // the lead: the generator's first track; a style of its own composer — the busiest high part
    const med = ns => [...ns].map(e => e[1]).sort((a, b) => a - b)[ns.length >> 1]
    const lead = OWN.includes(style) ? cands.filter(([, ns]) => med(ns) >= 55).sort((a, b) => b[1].length - a[1].length)[0] ?? cands[0] : cands[0]
    if (!lead) throw new Error('у стиля не вышло мелодии')
    const b0 = Math.floor(lead[1][0][0] / 4) * 4, L = Math.max(16, length())
    const notes = fit(lead[1].filter(e => e[0] >= b0 && e[0] < b0 + L).map(([b, n, d, v]) => [b - b0, n, Math.min(d, b0 + L - b), v]), t.inst)
    updateTrack(id, x => { x.notes = notes; x.gen = { style, seed, kind: 'melody' } })
    wait.done(`🎵 «${t.name}»: мелодия в стиле ${styleLabel(style)} — ${notes.length} нот (из «${lead[0]}»)`, 'ok')
  } catch (e) {
    console.error(e)
    wait.done('не получилось: ' + e.message, 'err')
  }
}
// the melody to arrange under: a track's notes (absolute MIDI) — a project track or one of the code
export function melodyNotes(ref) {
  if (!ref) return []
  if (ref.startsWith('p:')) return (projectOf().tracks.find(t => t.id === ref.slice(2))?.notes ?? []).map(e => [...e])
  return codeNotes(ref.slice(2))
}
// the parts of a style under a melody: the generator harmonizes it (theme A as written) and arranges it; the parts that play
// with the theme, cut to its length and put where the melody is
function partsUnder(ref, style, seed) {
  const mel = melodyNotes(ref).filter(e => e[2] > 0)
  if (mel.length < 3) throw new Error('в мелодии меньше трёх нот')
  const t0 = Math.floor(Math.min(...mel.map(e => e[0])) / 4) * 4, end = Math.max(...mel.map(e => e[0] + e[2])) - t0
  const len = Math.max(8, Math.ceil(end / 8) * 8)
  const o = songOpts(), hm = harmonize(mel.map(([b, n, d]) => [b, n, d]))
  // the song's mode, when the melody harmonizes in its parent key on the same tonic
  const m = o.mode && MODES[o.mode], same = m && hm && hm.key.mode === parentMode(m.iv) && Math.round(hm.key.tonic) % 12 === Math.round(app.current.key?.tonic ?? -1) % 12
  const { parts, meta } = made({ style, seed, bpm: o.bpm, ...(same ? { mode: o.mode } : {}), userTheme: { notes: mel.map(([b, n, d]) => [b, n, d]), title: 'мелодия проекта' } })
  const al = alignedParts(parts, mel, len)
  if (!al) throw new Error('генератор не сыграл мелодию как написано')
  // the bass on the instrument the style chose for it (a walking bass on the upright, the pipes' drone on reeds…)
  const bassInst = meta.instruments?.bass ? instrumentFor(meta.instruments.bass) : null
  return al.parts.map(x => ({ ...x, inst: x.name === 'bass' && bassInst ? bassInst : x.inst, notes: x.notes.map(([b, n, d, v]) => [b + t0, n, d, v]) }))
}
// which part a track takes, by its instrument's role
const WANT = { lead: ['counter', 'arp', 'lead', 'chords'], keys: ['chords', 'arp', 'pad'], pad: ['pad', 'chords'], bass: ['bass'], drums: ['drums'] }
const pickPart = (parts, inst) => {
  for (const r of WANT[INSTRUMENT[inst].role] ?? ['chords']) { const x = parts.filter(q => q.role === r).sort((a, b) => b.notes.length - a.notes.length)[0]; if (x) return x }
  return null
}
// one track: its part under the melody `ref`
export async function partFor(id, ref, style, seed = newSeed()) {
  const t = projectOf().tracks.find(t => t.id === id)
  if (!t) return
  const wait = toast(`${styleLabel(style)}: партия «${t.name}» под мелодию…`, { progress: true })
  await new Promise(r => setTimeout(r, 30))
  try {
    const x = pickPart(partsUnder(ref, style, seed), t.inst)
    if (!x) throw new Error('в этом стиле нет партии для такого инструмента')
    const notes = fit(x.notes, t.inst)
    updateTrack(id, q => { q.notes = notes; q.gen = { style, seed, kind: 'part', ref } })
    wait.done(`🎼 «${t.name}»: ${notes.length} нот — партия «${x.name}» стиля ${styleLabel(style)}`, 'ok')
  } catch (e) {
    console.error(e)
    wait.done('не получилось: ' + e.message, 'err')
  }
}
// every part of a style under the melody: tracks made before by the same arrangement are written over, the others added
export async function arrange(ref, style, seed = newSeed()) {
  const wait = toast(`${styleLabel(style)}: аранжирую под мелодию…`, { progress: true })
  await new Promise(r => setTimeout(r, 30))
  try {
    const parts = partsUnder(ref, style, seed), p = projectOf()
    let added = 0, kept = 0
    for (const x of parts) {
      const old = p.tracks.find(t => t.gen?.kind === 'arrangement' && t.gen.part === x.name && t.gen.ref === ref)
      const gen = { style, seed, kind: 'arrangement', part: x.name, ref }
      if (old) { old.notes = fit(x.notes, old.inst); old.gen = gen; kept++; continue }
      if (p.tracks.length >= MAX_TRACKS) break
      p.tracks.push({ id: nextId(p), name: nameFor(p, INSTRUMENT[x.inst].label), inst: x.inst, vol: x.role === 'drums' ? 0.9 : 1, pan: [-0.35, 0.3, -0.2, 0.25, 0][p.tracks.length % 5], notes: fit(x.notes, x.inst), gen })
      added++
    }
    setProject(p)
    wait.done(`🎼 ${styleLabel(style)}: ${parts.map(x => x.name).join(', ')} — ${added} новых дорожек${kept ? `, ${kept} переписаны` : ''}`, 'ok')
  } catch (e) {
    console.error(e)
    wait.done('не получилось: ' + e.message, 'err')
  }
}
// «переписать»: the track's generation again with a new seed
export function rewrite(id) {
  const t = projectOf().tracks.find(t => t.id === id)
  if (!t?.gen) return melodyDialog(id)
  if (t.gen.kind === 'melody') return composeMelody(id, t.gen.style)
  return partFor(id, t.gen.ref, t.gen.style)
}

// ---- dialogs -----------------------------------------------------------------------------------------------------------
const row = (label, ...kids) => h('div', { class: 'row' }, h('label', {}, label), ...kids)
function styleSelect(own = true, value = null) {
  const s = h('select')
  for (const f of styleGroups(st => own || !OWN.includes(st.id))) s.append(h('optgroup', { label: `${f.emoji} ${f.label}` }, ...f.list.map(st => new Option(`${st.emoji} ${st.label}`, st.id))))
  s.value = value ?? (app.current?.song?.generator?.style && (own || !OWN.includes(app.current.song.generator.style)) ? app.current.song.generator.style : 'lofi')
  return s
}
// the instruments the song's tracks play now: id → [{ name, color }] — the project's tracks, and the code's by their names
// (a generated song's tracks are named after their recipes: "pluck counter" plays the pluck)
export function usedInstruments() {
  const out = new Map(), add = (id, name, color) => { if (!id) return; if (!out.has(id)) out.set(id, []); out.get(id).push({ name, color }) }
  let info
  try { info = trackInfo() } catch { return out }
  for (const { t } of info.project) add(t.inst, t.name, t.color ?? INSTRUMENT[t.inst]?.color ?? '#ffffff')
  const style = app.current?.song?.style ?? app.current?.song?.generator?.style
  for (const key of info.code) { const part = generatedPart(app.current?.song?.generator, key); add(part ? genId(part) : instrumentFor(key, style, null), key, app.scene?.tracks.find(x => x.key === key)?.color ?? '#888888') }
  return out
}
// an instrument in use: in the colour of the (first) track playing it, with the tracks' names
const usedLabel = (i, used) => (used.has(i.id) ? `● ${i.label} — ${used.get(i.id).map(u => u.name).join(', ')}` : i.label)
// the generator's recipes this song plays (a generated song's voices and kit), as instruments "как в песне"
export function songSounds() {
  const song = app.current?.song
  if (!song?.generator) return []
  let keys = []
  try { keys = [...trackInfo().code, ...(projectOf().removed ?? [])] } catch {}
  return [...new Set(keys.map(k => generatedPart(song.generator, k)).filter(Boolean).map(genId))].map(id => INSTRUMENT[id]).filter(Boolean)
}
// the menus' groups: the song's own sounds, the library's groups, the generator's sounds
export const pickerGroups = () => [...(songSounds().length ? [['Звуки этой песни', songSounds()]] : []), ...GROUPS.map(g => [g, INSTRUMENTS.filter(i => i.group === g)]), ['Звуки генератора (как в песнях)', GEN_INSTRUMENTS]]
export function instSelect(value = 'piano', used = usedInstruments()) {
  const s = h('select')
  for (const [g, list] of pickerGroups()) {
    const og = h('optgroup', { label: g })
    for (const i of list) {
      const o = new Option(usedLabel(i, used), i.id)
      if (used.has(i.id)) { o.style.color = used.get(i.id)[0].color; o.style.fontWeight = '600' }
      og.append(o)
    }
    s.append(og)
  }
  s.value = value
  const tint = () => { const u = used.get(s.value); s.style.color = u ? u[0].color : '' }
  s.addEventListener('change', tint)
  tint()
  return s
}
// the melodies one can arrange under: project tracks with notes, the code's melodic tracks
function refSelect(exclude = null) {
  const s = h('select'), { project, code } = trackInfo()
  for (const { t } of project) if (t.id !== exclude && t.notes.length >= 3 && INSTRUMENT[t.inst]?.kind !== 'drums') s.append(new Option(`🎛 ${t.name} · ${t.notes.length} нот`, 'p:' + t.id))
  for (const k of code) if (roleOf(k) !== 'drums' && roleOf(k) !== 'texture') s.append(new Option(`ƒ ${k}`, 'c:' + k))
  return s
}
// ＋ a track: an instrument, and what goes in it — nothing, a melody in a style, a part under a melody
export function addTrackDialog({ compose = false } = {}) {
  if (!app.current?.song) return toast('сначала открой песню или создай проект')
  const inst = instSelect(compose ? 'flute' : 'piano'), what = h('select'), style = styleSelect(), ref = refSelect()
  what.append(new Option('пустая — напишу сам', 'empty'), new Option('сочинить мелодию в стиле…', 'melody'))
  if (ref.options.length) what.append(new Option('партия под мелодию другой дорожки…', 'part'))
  what.value = compose ? 'melody' : 'empty'
  const styleRow = row('Стиль', style), refRow = row('Под мелодию', ref)
  const show = () => { styleRow.style.display = what.value === 'empty' ? 'none' : ''; refRow.style.display = what.value === 'part' ? '' : 'none' }
  what.onchange = show
  show()
  modal('＋ Новая дорожка', h('div', {}, row('Инструмент', inst), row('Ноты', what), styleRow, refRow,
    h('div', { class: 'dim' }, `${trackInfo().p.tracks.length}/${MAX_TRACKS} дорожек · ноты пишутся в пианоролле: мышью, MIDI-клавиатурой, клавишами A W S E D…`)), [
    { label: 'Отмена' },
    { label: 'Добавить', primary: true, action: () => {
      const t = addTrack(inst.value)
      if (!t) return
      setTimeout(() => (what.value === 'melody' ? composeMelody(t.id, style.value) : what.value === 'part' ? partFor(t.id, ref.value, style.value) : null), 250)
    } },
  ])
}
// 🎵 a melody for a track
export function melodyDialog(id) {
  const t = projectOf().tracks.find(t => t.id === id)
  if (!t) return
  const style = styleSelect(true, t.gen?.style)
  modal(`🎵 Мелодия для «${t.name}»`, h('div', {}, row('Стиль', style), h('div', { class: 'dim' }, 'Ноты дорожки заменятся мелодией стиля в тональности и темпе песни (↶ Ctrl+Z в коде или «Откатить»).')), [
    { label: 'Отмена' }, { label: 'Сочинить', primary: true, action: () => composeMelody(id, style.value) },
  ])
}
// 🎼 arrangement: every part, or the chosen track's
export function arrangeDialog(only = null) {
  if (!app.current?.song) return toast('сначала открой песню или создай проект')
  const ref = refSelect(only)
  if (!ref.options.length) return toast('нужна мелодия: дорожка с нотами (хотя бы три) — нарисуй, сыграй или «🎵 сочини»', { ms: 6000 })
  const sel = app.pianoroll?.current?.(), style = styleSelect(false)
  const target = h('select')
  target.append(new Option('все партии стиля — новые дорожки', 'all'))
  for (const { t } of trackInfo().project) if (t.id !== ref.value.slice(2)) target.append(new Option(`только «${t.name}» (${INSTRUMENT[t.inst]?.label})`, t.id))
  target.value = only ?? (sel?.kind === 'project' && [...target.options].some(o => o.value === sel.id) ? sel.id : 'all')
  modal('🎼 Аранжировка под мелодию', h('div', {}, row('Мелодия', ref), row('Стиль', style), row('Для', target),
    h('div', { class: 'dim' }, 'Генератор гармонизует мелодию (аккорды — по сильным долям) и аранжирует её в стиле: аккомпанемент, бас, пэд, арпеджио, подголосок, барабаны — ровно под её такты. Мелодия остаётся как написана.')), [
    { label: 'Отмена' },
    { label: 'Аранжировать', primary: true, action: () => (target.value === 'all' ? arrange(ref.value, style.value) : partFor(target.value, ref.value, style.value)) },
  ])
}
// 🎛 a new project
export function newProjectDialog() {
  const name = h('input', { type: 'text', value: app.lib.uniqueName('Мой проект'), style: 'width:100%' })
  const bpm = h('input', { type: 'number', min: 30, max: 260, value: 100, style: 'width:90px' })
  const bars = h('input', { type: 'number', min: 1, max: 256, value: 16, style: 'width:90px' })
  const tonic = h('select')
  for (const t of ['C', 'C♯', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']) tonic.append(new Option(t, t))
  const mode = h('select')
  for (const g of MODE_GROUPS) { const og = h('optgroup', { label: g.label }); for (const m of g.modes) og.append(new Option(m.name, m.id)); mode.append(og) }
  if (app.tonality) { tonic.value = [...tonic.options].some(o => o.value === app.tonality.tonic) ? app.tonality.tonic : 'C'; mode.value = app.tonality.mode }
  const inst = instSelect('piano'), what = h('select'), style = styleSelect()
  what.append(new Option('пустая — напишу сам', 'empty'), new Option('сочинить мелодию в стиле…', 'melody'))
  const styleRow = row('Стиль', style)
  what.onchange = () => (styleRow.style.display = what.value === 'melody' ? '' : 'none')
  what.onchange()
  modal('🎛 Новый проект', h('div', {}, row('Название', name), row('Темп, BPM', bpm), row('Тоника', tonic), row('Лад', mode), row('Длина, тактов', bars),
    row('Первая дорожка', inst), row('Ноты', what), styleRow,
    h('div', { class: 'dim' }, 'Проект — песня из дорожек нот: до 32 инструментов, каждый можно править, удалять, сочинять ему мелодию или партию под мелодию другого, или аранжировать всё в любом стиле.')), [
    { label: 'Отмена' },
    { label: 'Создать', primary: true, action: async () => {
      const m = mode.value, key = keyFor(tonic.value, m), title = app.lib.uniqueName(name.value.trim() || 'Мой проект')
      const source = newProjectSource({ name: title, bpm: +bpm.value || 100, key, mode: m === 'major' || m === 'minor' ? null : m, bars: Math.max(1, +bars.value || 16), tracks: [{ id: 't1', name: INSTRUMENT[inst.value].label, inst: inst.value, vol: 1, pan: 0, notes: [] }] })
      const e = await app.lib.save({ name: title, source, kind: 'user' }, { pick: true })
      await app.open(e)
      await app.togglePianoRoll(true)
      app.pianoroll?.want?.('p:t1')
      if (what.value === 'melody') setTimeout(() => composeMelody('t1', style.value), 200)
      toast(`🎛 «${title}» — ${INSTRUMENT[inst.value].label}; ＋ слева в пианоролле добавит инструменты`, { kind: 'ok', ms: 6000 })
    } },
  ])
}

// ---- the track list -------------------------------------------------------------------------------------------------------
const muted = key => app.scene?.tracks.find(t => t.key === key)?.muted
export function createTrackList(root, pr) {
  root.innerHTML = ''
  const head = h('div', { class: 'tl-head' })
  const list = h('div', { class: 'tl-list' })
  root.append(head, list)
  const menuAt = (e, items) => { e.preventDefault(); e.stopPropagation(); contextMenu(items, e.clientX, e.clientY) }
  function projectMenu(t) {
    const others = refSelect(t.id).options.length > 0
    return [
      { icon: '🎵', label: 'Сочинить мелодию в стиле', items: () => styleGroups().map(f => ({ icon: f.emoji, label: f.label, items: () => f.list.map(s => ({ icon: s.emoji, label: s.label, action: () => composeMelody(t.id, s.id) })) })) },
      { icon: '🎼', label: 'Партия под мелодию другой дорожки…', disabled: !others, action: () => arrangeDialog(t.id), note: others ? 'бас, аккорды, подголосок, барабаны — по роли инструмента' : 'нужна другая дорожка с мелодией' },
      { icon: '🔁', label: 'Переписать', disabled: !t.gen, action: () => rewrite(t.id), note: t.gen ? `${styleLabel(t.gen.style)} — новый вариант` : 'для дорожки, сочинённой стилем' },
      '-',
      { icon: '🎻', label: 'Инструмент', items: () => { const used = usedInstruments(); return pickerGroups().map(([g, list]) => ({ label: g, color: used.get(list.find(i => used.has(i.id))?.id)?.[0].color, items: () => list.map(i => ({ label: usedLabel(i, used), color: used.get(i.id)?.[0].color, checked: t.inst === i.id, action: () => updateTrack(t.id, x => { if (x.name === INSTRUMENT[x.inst]?.label) x.name = nameFor(projectOf(), i.label); x.inst = i.id }) })) })) } },
      { icon: '🏛', label: 'Пространство', items: () => [['', 'как у инструмента'], ['hall', 'зал'], ['room', 'комната'], ['echo', 'эхо + зал'], ['dry', 'сухо']].map(([v, l]) => ({ label: l, checked: (t.fx ?? '') === v, action: () => updateTrack(t.id, x => { if (v) x.fx = v; else delete x.fx }) })) },
      { icon: '✎', label: 'Переименовать…', action: () => renameTrack(t) },
      { icon: '⧉', label: 'Дублировать дорожку', action: () => addTrack(t.inst, { name: t.name, notes: t.notes.map(e => [...e]) }) },
      // drums: a note is a drum (GM 36 = kick), not a pitch — moved only by hand in the piano roll
      INSTRUMENT[t.inst]?.kind === 'drums'
        ? { icon: '↕', label: 'Транспонировать', disabled: true, note: 'ударные не транспонируются: нота — это барабан; перетащи в пианоролле' }
        : { icon: '↕', label: 'Транспонировать', items: () => [[12, '+ октава'], [7, '+ квинта'], [1, '+ полутон'], [0.5, '+ ¼ тона'], [-0.5, '− ¼ тона'], [-1, '− полутон'], [-7, '− квинта'], [-12, '− октава']].map(([s, l]) => ({ label: l, action: () => updateTrack(t.id, x => { x.notes = x.notes.map(([b, n, d, v]) => [b, n + s, d, v]) }) })) },
      { icon: '🧹', label: 'Очистить ноты', disabled: !t.notes.length, action: () => updateTrack(t.id, x => { x.notes = [] }) },
      { icon: '🗑', label: 'Удалить дорожку', action: () => removeTrack(t.id) },
    ]
  }
  function renameTrack(t) {
    const inp = h('input', { type: 'text', value: t.name, style: 'width:100%' })
    const go = () => { const n = inp.value.trim(); if (n && n !== t.name) updateTrack(t.id, x => { x.name = nameFor({ tracks: projectOf().tracks.filter(q => q.id !== t.id) }, n) }) }
    const m = modal('Название дорожки', inp, [{ label: 'Отмена' }, { label: 'OK', primary: true, action: go }])
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { go(); m.close() } })
    setTimeout(() => inp.select(), 50)
  }
  const ms = (key, cls = '') => {
    const m = h('button', { class: 'ms' + (muted(key) ? ' on' : ''), title: 'выключить (как клик в легенде)', onclick: e => { e.stopPropagation(); app.muteTrack?.(key); render() } }, 'M')
    const s = h('button', { class: 'ms', title: 'соло', onclick: e => { e.stopPropagation(); app.soloTrack?.(key); render() } }, 'S')
    return h('span', { class: 'mss ' + cls }, m, s)
  }
  function render() {
    const info = trackInfo(), sel = pr.current()
    head.innerHTML = ''
    head.append(h('span', { class: 'title' }, `Дорожки · ${info.p.tracks.length}/${MAX_TRACKS}`), h('span', { class: 'sp' }),
      h('button', { title: 'новая дорожка: инструмент, пустая или с мелодией в стиле', onclick: () => addTrackDialog() }, '＋'),
      h('button', { title: 'аранжировка в стиле под мелодию: все партии или одна дорожка', onclick: () => arrangeDialog() }, '🎼'))
    list.innerHTML = ''
    for (const { t, key } of info.project) {
      const d = INSTRUMENT[t.inst] ?? INSTRUMENT.piano, on = sel?.kind === 'project' && sel.id === t.id
      const r = h('div', { class: 'tl-row' + (on ? ' sel' : ''), title: `${t.name} — ${d.label} · ${t.notes.length} нот${t.gen ? ` · ${styleLabel(t.gen.style)}` : ''} · ПКМ — меню` },
        h('span', { class: 'dot', style: `background:${t.color ?? d.color}` }),
        h('span', { class: 'nm' }, t.name, h('small', {}, d.label + (t.notes.length ? ` · ${t.notes.length}` : ' · пусто'))),
        ms(key), h('button', { class: 'more', title: 'меню дорожки', onclick: e => menuAt(e, projectMenu(t)) }, '⋯'))
      r.onclick = () => pr.want('p:' + t.id)
      r.oncontextmenu = e => menuAt(e, projectMenu(t))
      r.ondblclick = () => renameTrack(t)
      list.append(r)
      if (on) {
        const inst = instSelect(t.inst)
        inst.onchange = () => updateTrack(t.id, x => { if (x.name === INSTRUMENT[x.inst]?.label) x.name = nameFor(projectOf(), INSTRUMENT[inst.value].label); x.inst = inst.value })
        const vol = h('input', { type: 'range', min: 0, max: 2, step: 0.05, value: t.vol ?? 1, title: 'громкость' })
        const pan = h('input', { type: 'range', min: -1, max: 1, step: 0.05, value: t.pan ?? 0, title: 'панорама: влево — вправо' })
        vol.onchange = () => updateTrack(t.id, x => { x.vol = +vol.value })
        pan.onchange = () => updateTrack(t.id, x => { x.pan = +pan.value })
        list.append(h('div', { class: 'tl-ctl' }, inst, h('label', {}, '🔊', vol), h('label', {}, '↔', pan),
          h('div', { class: 'tl-btns' },
            h('button', { onclick: () => melodyDialog(t.id), title: 'сочинить мелодию в стиле' }, '🎵'),
            h('button', { onclick: () => arrangeDialog(t.id), title: 'партия под мелодию другой дорожки' }, '🎼'),
            h('button', { onclick: () => rewrite(t.id), disabled: !t.gen, title: 'переписать — новый вариант того же стиля' }, '🔁'),
            h('button', { onclick: () => removeTrack(t.id), title: 'удалить дорожку' }, '🗑'))))
      }
    }
    if (info.code.length) list.append(h('div', { class: 'tl-sub' }, 'из кода песни'))
    for (const key of info.code) {
      const on = sel?.kind === 'view' && sel.key === key, color = app.scene?.tracks.find(t => t.key === key)?.color ?? '#888'
      const menu = [
        { icon: '❄', label: 'В ноты — сделать редактируемой', action: () => freeze(key), note: 'дорожка станет нотами на инструменте библиотеки; код останется в файле' },
        { icon: '🗑', label: 'Удалить из песни', action: () => removeCode(key), note: 'код остаётся в файле, песня его не играет — ↶ вернёт' },
      ]
      const r = h('div', { class: 'tl-row code' + (on ? ' sel' : ''), title: `${key} — написана формулами в коде · клик — посмотреть ноты · ПКМ — меню` },
        h('span', { class: 'dot', style: `background:${color}` }), h('span', { class: 'nm' }, key, h('small', {}, 'ƒ код')), ms(key),
        h('button', { class: 'more', title: '❄ в ноты · 🗑 удалить', onclick: e => menuAt(e, menu) }, '⋯'))
      r.onclick = () => pr.want('v:' + key)
      r.oncontextmenu = e => menuAt(e, menu)
      list.append(r)
    }
    if (info.removed.length) {
      list.append(h('div', { class: 'tl-sub' }, 'удалённые'))
      for (const key of info.removed) list.append(h('div', { class: 'tl-row gone', title: 'вернуть в песню', onclick: () => removeCode(key, false) }, h('span', { class: 'nm' }, key), h('button', { class: 'more' }, '↶')))
    }
  }
  return { render }
}
