// MathMusic Live — the app: menus, transport, song loading and live updates, legend, inspector,
// live formulas, the drawing loop. Feature modules (editor, piano roll, generator, export, video,
// gallery) load on first use.
import { app } from './app.js'
import { $, h, esc, menubar, toast, modal, ask, closeMenus } from './ui.js'
import { Player } from './player.js'
import { makeRuntime, trackList, SR, errorLine } from './runtime.js'
import { Library, nameIn, setName, cleanName, lf, shelfOf } from './library.js'
import { Scene, GRID } from './view.js'
import { THEMES, themeFor, applyUiTheme } from './themes.js'
import { formulaOf, formulaHTML, substitute, tex, formulaImage } from './formula.js'
import { songKey, spell, keyLabel, freq, tonicName, pc } from './theory.js'
import { keyWithMode, MODES } from './modes.js'

const SRC = MM.SRC
app.SRC = SRC
app.rt = makeRuntime(SRC)
app.lib = new Library(SRC)
app.player = new Player(SRC)
const player = app.player
const lazy = name => import(MM.url(name))

// ---- view options (remembered) -----------------------------------------------------------------
const VIEW_DEFAULTS = { style: 'classic', live: false, fx: true, scenery: true, labels: true, scope: true, theme: 'auto', loop: true, zoom: 22, volume: 0.9 }
app.view = { ...VIEW_DEFAULTS }
try { Object.assign(app.view, JSON.parse(localStorage.getItem('mm.view') || '{}')) } catch {}
const saveView = () => { try { localStorage.setItem('mm.view', JSON.stringify(app.view)) } catch {} }
const V = app.view
$('zoom').value = V.zoom
$('vol').value = V.volume
player.setVolume(V.volume)

// ---- canvas ----------------------------------------------------------------------------------------
const cv = $('c'), g = cv.getContext('2d')
let W = 0, H = 0
const resize = () => {
  const r = $('stage').getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1)
  W = r.width
  H = r.height
  cv.width = Math.max(1, W * d)
  cv.height = Math.max(1, H * d)
  g.setTransform(d, 0, 0, d, 0, 0)
}
new ResizeObserver(resize).observe($('stage'))
resize()

// ---- songs -------------------------------------------------------------------------------------------
function refreshSongList() {
  const sel = $('song'), cur = app.current?.id
  sel.innerHTML = ''
  // built-in songs, then yours (my_songs/), then the 🎲 songs nobody saved yet (generated/)
  const groups = { builtin: h('optgroup', { label: 'Песни' }), mine: h('optgroup', { label: 'Мои' }), gen: h('optgroup', { label: 'Сгенерированные' }) }
  for (const e of app.lib.list()) groups[e.kind === 'builtin' ? 'builtin' : shelfOf(e)].append(new Option((e.kind === 'generated' && shelfOf(e) === 'mine' ? '🎲 ' : '') + e.name + (e.kind === 'user' && e.base ? ' ✎' : '') + (e.where === 'pending' ? ' ⏳' : ''), e.id))
  for (const gr of Object.values(groups)) if (gr.children.length) sel.append(gr)
  if (cur) sel.value = cur
}
app.refreshSongList = refreshSongList

// the key notes are spelt in: with a microtonal mode's degrees and spelling system (E𝄳, B♭¹, D♯−37¢)
const keyOf = song => keyWithMode(songKey(song), song.mode)
// 'F мажор', 'E𝄳 сика', 'D дорийский · Веркмейстер III'
const tonalityOf = (song, k) => {
  const m = song.mode && MODES[song.mode]
  return (m ? `${tonicName(k)} ${m.name.replace(/^Натуральный /, '').toLowerCase()}` : keyLabel(k)) + (song.tuning?.name ? ` · ${song.tuning.name}` : '')
}
app.tonalityOf = tonalityOf
// what a written note sounds at: a temperament moves it by its pitch class's cents (song.tuning.offsets)
const soundOf = (song, n) => { const o = song?.tuning?.offsets?.[pc(n)] ?? 0; return { hz: freq(n + o / 100), cents: o } }
function makeTracks(song, songName, old) {
  return trackList(song).map(([key, t], i) => {
    const f = formulaOf(SRC, songName, key, t)
    return {
      key, i, graph: t.graph, midi: t.midi, color: t.color ?? `hsl(${(i * 47) % 360} 80% 65%)`,
      formula: f, formulaHTML: formulaHTML(f), muted: old?.find(o => o.key === key)?.muted ?? false, bad: null,
    }
  })
}
function setScene(song, tracks, key, keepTime) {
  const theme = V.theme !== 'auto' && THEMES[V.theme] ? { id: V.theme, ...THEMES[V.theme] } : themeFor(song)
  applyUiTheme(theme)
  const old = app.scene
  app.scene = new Scene(song, tracks, { key, theme })
  if (keepTime && old) {
    app.scene.time = old.time
    app.scene.section = old.section
    app.scene.sectionAt = old.sectionAt
    app.scene.bgHue = old.bgHue
    app.scene.formulaImgs = old.formulaImgs
  }
  loadFormulaImages()
}
async function loadFormulaImages() {
  const sc = app.scene
  if (V.style !== 'paper' || !sc) return
  for (const t of sc.tracks) {
    if (!t.formula || sc.formulaImgs.has(t.key)) continue
    try { sc.formulaImgs.set(t.key, await formulaImage(t.formula, { size: 20, color: '#1d1a2e' })) } catch (e) { console.warn(e) }
  }
}

// Load a song module in the page; errors → { error, line }
async function loadModule(source) {
  try {
    return app.rt.load(source)
  } catch (err) {
    console.warn(err)
    return { error: err?.message ?? String(err), line: err?.line ?? errorLine(err)?.line ?? null }
  }
}

let opening = 0 // the latest open() wins when songs are switched quickly
// opts: { ab: switch the audio over at the same beat (A/B — playing or paused stays), source: this code, not the draft }
async function open(idOrEntry, from = 0, opts = {}) {
  const entry = typeof idOrEntry === 'string' ? app.lib.get(idOrEntry) : idOrEntry
  if (!entry) return toast('нет такой песни', { kind: 'err' })
  const my = ++opening
  const source = opts.source ?? app.drafts.get(entry.id) ?? entry.source
  const mod = await loadModule(source)
  if (my !== opening) return
  if (mod.error) {
    toast(`${entry.name}: ${mod.error}${mod.line ? ` (строка ${mod.line})` : ''}`, { kind: 'err', ms: 8000 })
    app.current = { id: entry.id, entry, source, song: null, broken: mod }
    app.editor?.load(app.current)
    return
  }
  const { song, body } = mod
  const tracks = makeTracks(song, entry.kind === 'builtin' ? entry.name : song.name)
  const key = keyOf(song)
  app.current = { id: entry.id, entry, source, song, key, tracks }
  setScene(song, tracks, key, false)
  buildLegend()
  refreshSongList()
  $('song').value = entry.id
  $('hint').style.display = 'none'
  $('err').textContent = ''
  pin = null
  if (opts.ab) {
    await player.switchTo({ source, song })
    player.setMuted(tracks.filter(t => t.muted).map(t => t.key))
  } else {
    if (!app.ab) app.loopRegion = null
    await player.open({ source, song }, from)
    if (my !== opening) return
    player.setMuted(tracks.filter(t => t.muted).map(t => t.key))
    await player.play()
  }
  if (my !== opening) return
  updatePlayButton()
  updateLoopButton()
  if (!opts.ab) app.masterSong?.()
  app.editor?.load(app.current)
  app.pianoroll?.load?.(app.current)
  if (app.scoreview?.visible) app.scoreview.load(app.current)
  try { localStorage.setItem('mm.last', entry.id) } catch {}
}
app.open = open

// Live update of the current song from new source (editor, sliders, piano roll). of: the song (the
// app.current object) the source belongs to, or its id — an edit that arrives after a switch to another
// song is dropped (stale), so one song's code never lands in another. The object survives Ctrl+S turning
// a built-in into a copy with a new id.
async function apply(source, { of, id } = {}) {
  const cur = app.current
  if (!cur) return { ok: false, error: 'нет песни' }
  const stale = { ok: false, stale: true, error: 'песня сменилась' }
  if ((of && of !== cur) || (id != null && cur.id !== id)) return stale
  const mod = await loadModule(source)
  if (app.current !== cur) return stale
  if (mod.error) return { ok: false, error: mod.error, line: mod.line }
  const { song } = mod
  // quick sanity run of graph/midi on a few points; errors are reported, not fatal
  const problems = []
  for (const [k, t] of trackList(song)) {
    for (const x of [0, song.length * 0.37, song.length * 0.71]) {
      for (const fn of ['graph', 'midi']) {
        if (typeof t[fn] !== 'function') continue
        try { t[fn](x) } catch (err) {
          problems.push({ key: k, message: `${k}.${fn}(${x.toFixed(1)}): ${err.message}`, line: errorLine(err)?.line ?? null })
          break
        }
      }
    }
  }
  const tracks = makeTracks(song, cur.entry.kind === 'builtin' ? cur.entry.name : song.name, app.scene?.tracks)
  const key = keyOf(song)
  Object.assign(cur, { source, song, key, tracks, broken: null })
  setScene(song, tracks, key, true)
  buildLegend()
  await player.update({ source, song })
  player.setMuted(tracks.filter(t => t.muted).map(t => t.key))
  if (app.scoreview?.visible) app.scoreview.load(cur)
  return { ok: true, problems }
}
app.apply = apply

// The text of a song as edited (editor, piano roll): a draft while it differs from the saved code.
// A radio song that isn't in the library yet goes into it (generated/), so the edit has a song to belong to;
// a generated song stays in generated/ until Ctrl+S (the generator never tidies away one with a draft).
function setDraft(cur, src) {
  const e = cur?.entry
  if (!e) return
  app.drafts.put(cur.id, src, e.source)
  if (src !== e.source && e.kind === 'generated' && !app.lib.get(cur.id) && !e.saving) {
    e.saving = true // right away: the next keystroke doesn't save it again
    app.lib.save({ ...e, saving: undefined }).then(saved => { if (cur.entry === e) cur.entry = saved })
  }
}
app.setDraft = setDraft
// a song's code as you see it: the editor's text when the editor holds this song, else its draft
const sourceOf = cur => (app.editor?.owner?.() === cur ? app.editor.value() : app.drafts.get(cur.id) ?? cur.source)
app.sourceOf = sourceOf

// ---- player events -------------------------------------------------------------------------------------
player.addEventListener('problem', e => {
  const d = e.detail, t = app.scene?.tracks.find(t => t.key === d.key)
  if (t) {
    t.bad = d.message
    t.row?.classList.add('bad')
    t.row && (t.row.title = d.message)
  }
  app.editor?.problem?.(d)
  if (!app.editor?.visible) toast('⚠ ' + d.message + (d.line ? ` (строка ${d.line})` : ''), { kind: 'err', ms: 7000 })
})
player.addEventListener('error', e => {
  const d = e.detail
  $('err').textContent = 'ошибка: ' + d.message
  console.error(d)
  app.editor?.problem?.({ message: d.message, line: null })
})
player.addEventListener('end', () => {
  if (app.radio?.on) return app.radio.next()
  if (V.loop) nextSong()
  else player.pause().then(updatePlayButton)
})

// ---- transport ------------------------------------------------------------------------------------------
const updatePlayButton = () => ($('play').textContent = player.playing ? '⏸' : '▶')
async function togglePlay() {
  if (!player.song) return open($('song').value)
  if (player.playing) await player.pause()
  else await player.play()
  updatePlayButton()
}
const seek = b => app.current?.song && player.seek(Math.max(0, Math.min(app.current.song.length - 0.01, b)))
// the next / previous song in the list (built-in, my_songs/, generated/), round the ends
function nextSong(step = 1) {
  const ids = app.lib.list().map(e => e.id), i = (ids.indexOf(app.current?.id) + step + ids.length) % ids.length
  open(ids[i])
}
$('play').onclick = togglePlay
// ---- the loop: a section (L), bars from [ to ], a stretch dragged with Shift on the timeline, bars Shift-clicked in the score
const barOf = b => Math.floor(b / 4 + 1e-9) * 4
function sectionAround(x) {
  const secs = app.current?.song?.sections ?? [[0, '']], L = app.current?.song?.length ?? 0
  const i = secs.findLastIndex(s => s[0] <= x + 1e-6)
  return [secs[Math.max(0, i)][0], secs[i + 1]?.[0] ?? L]
}
function setLoop(range) {
  app.loopRegion = range
  player.setLoop(range)
  updateLoopButton()
}
app.setLoop = setLoop
function toggleLoop() {
  if (!app.current?.song) return
  if (player.loop) return setLoop(null), toast('🔁 петля выключена', { ms: 1500 })
  const r = app.loopRegion ?? sectionAround(player.x)
  setLoop(r)
  toast(`🔁 по кругу: такты ${Math.floor(r[0] / 4) + 1}–${Math.ceil(r[1] / 4)}`, { ms: 2000 })
}
function updateLoopButton() {
  const r = player.loopBeats
  $('loop').classList.toggle('on', !!r)
  $('loop').title = r ? `петля: такты ${Math.floor(r[0] / 4 + 1e-9) + 1}–${Math.ceil(r[1] / 4 - 1e-9)} — клик выключит (L) · [ ] — сдвинуть края · ПКМ — забыть` : 'петля: раздел по кругу (L) · [ и ] — начало и конец по тактам · Shift+тяни по шкале внизу · ПКМ — убрать'
}
$('loop').onclick = toggleLoop
$('loop').oncontextmenu = e => { e.preventDefault(); app.loopRegion = null; setLoop(null) }
$('abbtn').onclick = () => (app.ab ? lazy('abui.js').then(m => m.closeAB()) : lazy('abui.js').then(m => m.openAB())).then(() => $('abbtn').classList.toggle('on', !!app.ab))
$('next').onclick = () => nextSong(1)
$('prev').onclick = () => nextSong(-1)
$('back').onclick = () => seek(Math.floor(player.x / 4) * 4 - 16)
$('fwd').onclick = () => seek(Math.floor(player.x / 4) * 4 + 16)
$('song').onchange = () => open($('song').value)
$('vol').oninput = () => { V.volume = +$('vol').value; player.setVolume(V.volume); saveView() }
$('zoom').oninput = () => { V.zoom = +$('zoom').value; saveView() }

const typing = e => e.target.closest?.('.CodeMirror, input, textarea, select, [contenteditable]')
addEventListener('keydown', e => {
  if ((e.altKey && e.code === 'Enter') || e.code === 'F11') { e.preventDefault(); return toggleFullscreen() }
  if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); return saveCurrent() }
  if (e.ctrlKey && e.code === 'KeyE' && !typing(e)) { e.preventDefault(); return exportAudio('mp3') }
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  else if (e.code === 'ArrowLeft') $('back').onclick()
  else if (e.code === 'ArrowRight') $('fwd').onclick()
  else if (e.code === 'Home') seek(0)
  else if (e.code === 'KeyN') nextSong(e.shiftKey ? -1 : 1)
  else if (e.code === 'KeyE') toggleEditor()
  else if (e.code === 'KeyP') togglePianoRoll()
  else if (e.code === 'KeyS') toggleScore()
  else if (e.code === 'KeyL') toggleLoop()
  else if (e.code === 'KeyK') lazy('masterui.js').then(m => m.openMaster())
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    const r = app.loopRegion ?? sectionAround(player.x), x = player.x
    const n = e.code === 'BracketLeft' ? [barOf(x), Math.max(r[1], barOf(x) + 4)] : [Math.min(r[0], barOf(x)), barOf(x) + 4]
    setLoop(n)
  } else if (e.code === 'KeyB') {
    if (app.ab) lazy('abui.js').then(m => m.toggle())
    else lazy('abui.js').then(m => m.openAB()).then(() => $('abbtn').classList.add('on'))
  }
  else if (e.code === 'KeyF') { V.live = !V.live; saveView(); updateLive(true) }
  else if (e.code === 'KeyG') openGallery()
  else if (e.code === 'KeyC') toggleCinema()
  else if (e.code === 'KeyM') lazy('genui.js').then(m => m.mutate('melody'))
  else if (e.code === 'Digit1') setStyle('classic')
  else if (e.code === 'Digit2') setStyle('paper')
  else if (e.code === 'Digit3') setStyle('space')
  else if (e.code === 'Escape') { pin = null; $('insp').classList.remove('pinned'); document.body.classList.remove('cinema') }
})

// ---- save / files ------------------------------------------------------------------------------------------
async function saveCurrent() {
  const cur = app.current
  if (!cur) return
  const source = sourceOf(cur), was = cur.entry, builtin = was.kind === 'builtin'
  const e = await app.lib.save({ ...was, id: builtin ? null : was.id, kind: builtin ? 'user' : was.kind, base: builtin ? was.id : was.base, source, pristine: false }, { pick: true })
  app.drafts.delete(was.id) // a built-in song's copy gets a new id: the built-in keeps no draft
  cur.entry = e
  cur.id = e.id
  if (app.editor?.owner?.() === cur) app.editor.saved()
  if (app.current === cur) {
    refreshSongList()
    try { localStorage.setItem('mm.last', e.id) } catch {}
  }
  savedNote(e, `💾 «${e.name}» сохранена`)
}
// where a saved song went: my_songs/<file> (or generated/), or waiting for the folder (with a button to connect it)
function savedNote(e, what) {
  if (e.where === 'disk') return toast(`${what} → ${e.shelf === 'gen' ? 'generated' : 'my_songs'}/${e.file}`, { kind: 'ok' })
  toast(`${what} — пока в браузере: папка my_songs не подключена`, { ms: 9000, action: app.lib.canConnect ? { label: '📁 подключить', run: connectFolder } : null })
}
// my_songs/: the project's folder or my_songs itself (fresh: choose another one)
async function connectFolder(fresh = false) {
  if (app.lib.server) return toast('📁 песни и так сохраняются в my_songs — приложение запущено через Visualizer.bat', { kind: 'ok' })
  if (!app.lib.canConnect) return toast('этот браузер не умеет писать в папки — открой приложение в Chrome или Edge', { kind: 'err', ms: 7000 })
  const waiting = app.lib.pending.length
  if (!(await app.lib.connect({ pick: true, fresh: fresh === true }))) return
  const moved = waiting - app.lib.pending.length
  toast(`📁 папка my_songs подключена${app.lib.genDir ? ' (и generated)' : ' — для generated выбери папку проекта (Песня → «выбрать другую»)'}${moved ? ` — ${moved} ${songsWord(moved)} из браузера перенесены туда` : ''}`, { kind: 'ok', ms: 7000 })
}
// back to the saved code — with the editor open or not (edits may come from the piano roll alone)
async function revertCurrent() {
  const cur = app.current
  if (!cur || !app.dirty(cur)) return
  app.drafts.delete(cur.id)
  if (app.editor?.owner?.() === cur) return app.editor.revert()
  if (cur.source !== cur.entry.source || cur.broken) await apply(cur.entry.source, { of: cur })
  app.pianoroll?.load?.(cur)
  toast('↺ вернулась сохранённая версия')
}
async function saveToFolder(choose) {
  const cur = app.current
  if (!cur) return
  const source = sourceOf(cur)
  const confirm = ({ file, copy, builtin }) => ask('Такой файл уже есть',
    `<p><b>${esc(file)}</b> уже лежит в папке${builtin ? ' — это встроенная песня проекта' : ''}, и код в нём другой.</p><p>Записать эту версию рядом, как <b>${esc(copy)}</b>, или заменить старую?</p>`,
    [{ label: 'Отмена', value: null }, { label: 'Заменить', value: 'replace' }, { label: `Записать как ${copy}`, value: 'copy', primary: true }])
  const r = await app.lib.saveToDisk(nameIn(source, cur.entry.name), source, { ask: choose, confirm })
  if (!r) return
  if (r.same) toast(`📁 ${r.where} — там уже ровно эта версия`, { kind: 'ok' })
  else toast(`📁 записано: ${r.where}\nrender.js и Ableton увидят песню после «npm run viz» / рендера`, { kind: 'ok', ms: 6000 })
}
// a new song in "Мои" under a name no other song has (the code's name is changed only if it must)
async function addSong(source, fallbackName) {
  const name = app.lib.uniqueName(nameIn(source, fallbackName))
  if (name !== nameIn(source, null)) source = setName(source, name)
  const e = await app.lib.save({ name, source, kind: 'user' }, { pick: true })
  if (e.where !== 'disk') savedNote(e, `«${e.name}» добавлена`)
  return e
}
function openFile() {
  const inp = h('input', { type: 'file', accept: '.js,text/javascript' })
  inp.onchange = async () => {
    const f = inp.files[0]
    if (!f) return
    const source = lf(await f.text())
    // the same file opened again: that song, not a second copy of it
    const same = app.lib.list().find(e => e.source === source)
    if (same) {
      toast(`эта песня уже есть: ${same.name}`)
      return open(same)
    }
    open(await addSong(source, f.name.replace(/\.js$/, '')))
  }
  inp.click()
}
async function newSong() {
  const e = await addSong((await lazy('editor.js')).TEMPLATE, 'my-song')
  await open(e)
  toggleEditor(true)
}

// ---- song actions (menu and gallery) ------------------------------------------------------------------------
const entryOf = id => (app.current?.id === id ? app.current.entry : app.lib.get(id))
const codeOf = id => (app.current?.id === id ? sourceOf(app.current) : app.drafts.get(id) ?? app.lib.get(id)?.source)
const songsWord = n => (n % 10 === 1 && n % 100 !== 11 ? 'песня' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'песни' : 'песен')

// a copy under a new name, with the code as you see it (unsaved edits included)
async function duplicateSong(id = app.current?.id) {
  const e = entryOf(id)
  if (!e) return
  const name = app.lib.uniqueName(`${e.name} копия`)
  const copy = await app.lib.save({
    name, source: setName(codeOf(id), name), kind: e.kind === 'generated' ? 'generated' : 'user',
    base: e.kind === 'builtin' ? e.id : e.base, meta: e.meta, pristine: false,
  }, { pick: true })
  const edits = app.drafts.has(id)
  await open(copy)
  toast(`⧉ копия: ${name}${edits ? ' — вместе с несохранёнными правками' : ''}`, { kind: 'ok' })
}

// renames in the saved code and in the draft, nothing else: unsaved edits stay unsaved
function renameSong(id = app.current?.id) {
  const e = entryOf(id)
  if (!e) return
  if (e.kind === 'builtin') return toast('встроенная песня называется по файлу в songs/ — сделай копию (⧉ Дублировать) и назови её как хочешь')
  const inp = h('input', { type: 'text', value: e.name, style: 'width:100%' })
  const err = h('div', { style: 'color:var(--danger);min-height:1.3em;margin-top:6px;font-size:13px' })
  const go = async () => {
    const name = cleanName(inp.value)
    if (!name) return (err.textContent = 'нужно имя'), false
    if (name === e.name) return
    if (app.lib.uniqueName(name, id) !== name) return (err.textContent = `«${name}» уже есть — выбери другое имя`), false
    const now = app.lib.get(id) ?? e // a radio song isn't in the library yet: it gets in now
    const saved = await app.lib.save({ ...now, source: setName(now.source, name), pristine: false }, { pick: true })
    if (app.drafts.has(id)) app.drafts.put(id, setName(app.drafts.get(id), name), saved.source)
    const cur = app.current
    if (cur?.id === id) {
      cur.entry = saved
      cur.source = setName(cur.source, name)
      if (cur.song) cur.song.name = name
      if (app.editor?.owner?.() === cur) app.editor.load(cur)
    }
    toast(`✎ теперь «${name}»`, { kind: 'ok' })
  }
  const m = modal('Переименовать', h('div', {}, inp, err), [{ label: 'Отмена' }, { label: 'OK', primary: true, action: go }])
  inp.addEventListener('keydown', async ev => {
    if (ev.key !== 'Enter') return
    ev.preventDefault()
    if ((await go()) !== false) m.close()
  })
  inp.addEventListener('input', () => (err.textContent = ''))
  setTimeout(() => inp.select(), 50)
}

// removes at once, with "↶ вернуть" in the toast for 10 s (the song and its unsaved draft come back)
async function deleteSong(id = app.current?.id) {
  const e = entryOf(id)
  if (!e) return
  if (e.kind === 'builtin') return toast('встроенные песни живут в папке songs/ — отсюда они не удаляются')
  const saved = app.lib.get(id), draft = app.drafts.get(id), wasCurrent = app.current?.id === id
  let next = null
  if (wasCurrent) {
    const ids = app.lib.list().map(x => x.id), i = ids.indexOf(id)
    next = i < 0 ? ids[0] : ids[i + 1] ?? ids[i - 1] ?? null
  }
  if (saved) {
    try {
      await app.lib.remove(id)
    } catch (err) {
      return toast(`«${e.name}» не удалена: ${err.message}`, { kind: 'err', ms: 6000 })
    }
  }
  app.drafts.delete(id)
  if (next) open(next)
  toast(`🗑 «${e.name}» удалена${saved?.file ? ` (и файл ${saved.shelf === 'gen' ? 'generated' : 'my_songs'}/${saved.file})` : ''}`, {
    ms: 10000,
    action: {
      label: '↶ вернуть',
      run: async () => {
        if (saved) await app.lib.save(saved)
        if (draft != null) app.drafts.set(id, draft)
        if (wasCurrent) open(saved ?? e)
        toast(`↶ «${e.name}» снова на месте`, { kind: 'ok' })
      },
    },
  })
}
app.songs = { duplicate: duplicateSong, rename: renameSong, remove: deleteSong }
// before the browser's folder dialog opens the first time: what to choose there
app.lib.beforePick = () => ask('Где хранить твои песни?',
  `<p>Сейчас браузер спросит, <b>где этот сайт может сохранять изменения</b>. Выбери <b>папку проекта</b> — ту, где лежит «MathMusic Live.html»
  (или любую другую, например «Документы»): в ней будут папки <b>my_songs</b> (твои песни) и <b>generated</b> (последние 20 из 🎲).
  Можно выбрать и саму my_songs — тогда сгенерированные будут ждать в браузере. Спрашивать будет только один раз.</p>
  <p>Проще всего запускать приложение через <b>Visualizer.bat</b>: тогда песни сохраняются в my_songs сами, без этого окна.</p>`,
  [{ label: 'Отмена', value: false }, { label: '📁 Выбрать папку', value: true, primary: true }])

// the library changed: here, in another tab of the app ('tab') or in the folder itself ('disk')
app.lib.on((id, e, remote) => {
  refreshSongList()
  const cur = app.current
  if (!remote || cur?.id !== id) return
  const where = remote === 'disk' ? 'в папке my_songs' : 'в другой вкладке'
  if (!e) return toast(`«${cur.entry.name}» нет ${where} — Ctrl+S сохранит её снова`, { ms: 7000 })
  cur.entry = e
  const mine = app.drafts.get(id)
  if (mine == null) apply(e.source, { of: cur }).then(() => app.editor?.owner?.() === cur && app.editor.load(cur))
  else app.drafts.put(id, mine, e.source)
  toast(`«${e.name}» ${remote === 'disk' ? 'в папке my_songs новее — открыта она' : 'сохранили в другой вкладке'}${mine != null ? ' — твои несохранённые правки здесь остались' : ''}`, { ms: 6000 })
})

// ---- panels: editor (right), piano roll (bottom), gallery, cinema ---------------------------------------------
function splitter(el, target, axis, min, max) {
  el.onmousedown = e => {
    e.preventDefault()
    const start = axis === 'x' ? e.clientX : e.clientY, size = axis === 'x' ? target.offsetWidth : target.offsetHeight
    const move = ev => {
      const d = (axis === 'x' ? ev.clientX : ev.clientY) - start
      const v = Math.max(min, Math.min(max(), size - d))
      target.style[axis === 'x' ? 'width' : 'height'] = v + 'px'
      app.editor?.refresh?.()
      app.pianoroll?.resize?.()
    }
    const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up) }
    addEventListener('mousemove', move)
    addEventListener('mouseup', up)
  }
}
splitter($('vsplit'), $('side'), 'x', 300, () => innerWidth - 300)
splitter($('hsplit'), $('bottom'), 'y', 140, () => innerHeight - 200)
async function toggleEditor(force) {
  const show = force ?? $('side').style.display === 'none'
  $('side').style.display = show ? '' : 'none'
  $('vsplit').style.display = show ? '' : 'none'
  if (show) {
    const m = await lazy('editor.js')
    app.editor ??= m.createEditor($('side'))
    app.editor.load(app.current)
    app.editor.visible = true
    app.editor.refresh()
    app.editor.focus()
  } else if (app.editor) app.editor.visible = false
}
async function togglePianoRoll(force) {
  const show = force ?? $('bottom').style.display === 'none'
  $('bottom').style.display = show ? '' : 'none'
  $('hsplit').style.display = show ? '' : 'none'
  if (show) {
    const m = await lazy('pianoroll.js')
    app.pianoroll ??= m.createPianoRoll($('bottom'))
    app.pianoroll.load(app.current)
    app.pianoroll.visible = true
  } else if (app.pianoroll) app.pianoroll.visible = false
}
app.toggleEditor = toggleEditor
app.togglePianoRoll = togglePianoRoll
// «Ноты»: the score over the stage (scoreview.js)
async function toggleScore(force) {
  const el = $('scorepane'), show = force ?? el.style.display === 'none'
  el.style.display = show ? '' : 'none'
  if (show) {
    const m = await lazy('scoreview.js')
    app.scoreview ??= m.createScoreView(el)
    app.scoreview.visible = true
    app.scoreview.load(app.current)
  } else if (app.scoreview) app.scoreview.visible = false
}
app.toggleScore = toggleScore
const openGallery = () => lazy('gallery.js').then(m => m.openGallery())
const toggleCinema = () => document.body.classList.toggle('cinema')

// ---- the window: окно / полноэкранное окно (the whole work area, the taskbar stays) / полный экран -------------
// The page sizes its own window — that works in the app window of MathMusic.exe (Chrome / Edge --app),
// not in a browser tab. The mode and the window's own size are remembered; full screen comes back with the
// first click or key (browsers allow it only then).
const win = { mode: 'window', rect: null, before: 'window' }
try { Object.assign(win, JSON.parse(localStorage.getItem('mm.window') || '{}')) } catch {}
const saveWin = () => { try { localStorage.setItem('mm.window', JSON.stringify({ mode: win.mode, rect: win.rect, before: win.before })) } catch {} }
const WIN_MODES = [['window', 'Окно'], ['maxi', 'Полноэкранное окно'], ['full', 'Полный экран']]
function sizeWindow(mode) {
  if (mode === 'maxi') {
    moveTo(screen.availLeft ?? 0, screen.availTop ?? 0)
    resizeTo(screen.availWidth, screen.availHeight)
  } else if (win.rect) {
    const [x, y, w, h] = win.rect
    resizeTo(w, h)
    moveTo(x, y)
  }
}
async function setWindowMode(mode, quiet = false) {
  if (mode === 'full') {
    if (win.mode !== 'full') win.before = win.mode
    win.mode = 'full'
    saveWin()
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => !quiet && toast('браузер не дал включить полный экран'))
    return
  }
  if (win.mode === 'window' && !document.fullscreenElement) keepRect()
  win.mode = mode
  saveWin()
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
  const was = [outerWidth, outerHeight]
  sizeWindow(mode)
  // a browser tab ignores resizeTo
  setTimeout(() => {
    if (!quiet && mode === 'maxi' && outerWidth === was[0] && outerHeight === was[1] && outerWidth < screen.availWidth - 8)
      toast('во вкладке браузера размер окна меняет сам браузер — в MathMusic.exe это работает', { ms: 6000 })
  }, 300)
}
const toggleFullscreen = () => setWindowMode(document.fullscreenElement ? (win.before ?? 'window') : 'full')
// Esc (or the browser) left full screen: back to the mode before it
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && win.mode === 'full') { win.mode = win.before ?? 'window'; saveWin(); sizeWindow(win.mode) }
})
// the window's own place and size, as you leave it (at a fractional screen scale the frame rounds a
// resize by a few pixels — that is still the same window, or it would creep on every switch)
function keepRect() {
  const now = [screenX, screenY, outerWidth, outerHeight]
  if (win.rect && win.rect.every((v, i) => Math.abs(v - now[i]) <= 6)) return
  win.rect = now
  saveWin()
}
let winTimer = 0
addEventListener('resize', () => {
  clearTimeout(winTimer)
  winTimer = setTimeout(() => win.mode === 'window' && !document.fullscreenElement && keepRect(), 500)
})
if (win.mode === 'maxi') sizeWindow('maxi')
else if (win.mode === 'full') {
  sizeWindow(win.before === 'maxi' ? 'maxi' : 'window')
  const again = () => { removeEventListener('pointerdown', again, true); removeEventListener('keydown', again, true); if (win.mode === 'full') setWindowMode('full', true) }
  addEventListener('pointerdown', again, true)
  addEventListener('keydown', again, true)
}
function setStyle(s) {
  V.style = s
  saveView()
  loadFormulaImages()
}
function setTheme(id) {
  V.theme = id
  saveView()
  if (app.current?.song) setScene(app.current.song, app.scene.tracks, app.current.key, true)
}
const exportAudio = fmt => lazy('export.js').then(m => m.exportAudio(fmt))

// ---- menus ----------------------------------------------------------------------------------------------------
const STYLE_ITEMS = [['classic', 'Классика — светящиеся функции', '1'], ['paper', 'Бумага — координатная плоскость', '2'], ['space', '3D — дорожки летят в пространстве', '3']]
menubar($('menus'), [
  {
    label: 'Песня',
    items: () => [
      { icon: '🖼', label: 'Все песни — галерея', kbd: 'G', action: openGallery },
      { icon: '📜', label: 'Открыть', items: () => app.lib.list().map(e => ({ icon: e.kind === 'builtin' ? '♪' : e.kind === 'generated' ? '🎲' : '✎', label: e.name, action: () => open(e.id), checked: app.current?.id === e.id ? true : undefined })) },
      '-',
      { icon: '✚', label: 'Новая песня из шаблона', action: newSong },
      { icon: '📂', label: 'Открыть файл .js…', action: openFile },
      { icon: '💾', label: 'Сохранить в my_songs', kbd: 'Ctrl+S', action: saveCurrent },
      { icon: '⧉', label: 'Дублировать', action: () => duplicateSong(), disabled: () => !app.current, note: 'копия под новым именем — с правками, как сейчас в коде' },
      { icon: '✎', label: 'Переименовать…', action: () => renameSong(), disabled: () => !app.current || app.current.entry.kind === 'builtin' },
      { icon: '🗑', label: 'Удалить', action: () => deleteSong(), disabled: () => !app.current || app.current.entry.kind === 'builtin' },
      '-',
      app.lib.server ? { icon: '📂', label: 'Песни сохраняются в my_songs и generated', disabled: true, note: 'приложение запущено через Visualizer.bat — папка подключена сама' } : { icon: '📂', label: () => (app.lib.dir ? 'Папка my_songs подключена — выбрать другую…' : 'Подключить папку my_songs…'), action: () => connectFolder(!!app.lib.dir), note: app.lib.pending.length ? `⏳ ${app.lib.pending.length} ${songsWord(app.lib.pending.length)} ждут папку` : 'мои песни лежат там файлами .js' },
      { icon: '📁', label: 'Записать во встроенные (songs/)…', action: () => saveToFolder(false), note: 'песня станет встроенной: её увидят render.js и Ableton' },
      { icon: '📁', label: 'Записать в другую папку…', action: () => saveToFolder(true) },
      '-',
      { label: 'После песни — следующая', checked: () => V.loop, action: () => { V.loop = !V.loop; saveView() } },
      '-',
      { icon: '🔁', label: 'Петля — раздел по кругу', kbd: 'L', checked: () => !!player.loop, action: toggleLoop, note: '[ и ] — начало и конец по тактам · Shift+тяни по шкале · Shift+клик по тактам в нотах' },
      { icon: '⇄', label: 'Сравнить A/B — две версии в одной точке', kbd: 'B', checked: () => !!app.ab, action: () => (app.ab ? lazy('abui.js').then(m => m.closeAB()) : lazy('abui.js').then(m => m.openAB())).then(() => $('abbtn').classList.toggle('on', !!app.ab)), note: 'оригинал и копия в другом ладу, правки и сохранённая версия, любые две песни — с равной громкостью' },
    ],
  },
  {
    label: 'Редактор',
    items: () => [
      { icon: '⌨', label: 'Код песни', kbd: 'E', checked: () => $('side').style.display !== 'none', action: () => toggleEditor() },
      { icon: '🎹', label: 'Пианоролл — рисовать мелодию', kbd: 'P', checked: () => $('bottom').style.display !== 'none', action: () => togglePianoRoll() },
      { icon: '📜', label: 'Ноты — партитура на нотном стане', kbd: 'S', checked: () => $('scorepane').style.display !== 'none', action: () => toggleScore(), note: 'по тональности и ладу, микротоны, аккорды; клик по такту — оттуда играть' },
      '-',
      { icon: '✔', label: 'Проверить песню целиком', action: () => lazy('editor.js').then(m => m.fullCheck()) },
      { icon: '📖', label: 'Справочник функций', action: () => lazy('editor.js').then(m => m.apiReference()) },
      { icon: '↺', label: 'Откатить несохранённые правки', action: revertCurrent, disabled: () => !app.dirty(app.current) },
      { html: 'Клик по числу в коде — слайдер (тянешь <b>e<sup>−8τ</sup></b> — бочка короче) · <kbd>Ctrl+Space</kbd> — подсказки · правки звучат сразу' },
    ],
  },
  {
    label: '🎲 Генерация',
    items: () => lazy('genui.js').then(m => m.menuItems()),
  },
  {
    label: 'Экспорт',
    items: () => [
      { html: `Мастеринг: <b>${app.master?.on ? esc(app.masterLabel?.() ?? 'вкл') : 'выключен'}</b> — <kbd>K</kbd>` },
      { icon: '🎵', label: 'MP3 · 320 кбит/с', kbd: 'Ctrl+E', action: () => exportAudio('mp3') },
      { icon: '🎚', label: 'WAV · 24 бит, 44.1 кГц', action: () => exportAudio('wav') },
      { icon: '🌀', label: 'OGG · Opus 256 кбит/с', action: () => exportAudio('ogg') },
      { icon: '🎼', label: 'MIDI · все дорожки', action: () => exportAudio('mid') },
      { icon: '🎼', label: 'MIDI · микротоны и строй (MPE)', action: () => exportAudio('mpe'), note: 'каждая нота со своим питч-бендом — четверти, восьмые тона, темперации до цента' },
      { icon: '📜', label: 'MusicXML · ноты для MuseScore, Dorico, Sibelius', action: async () => { await toggleScore(true); app.scoreview.exportXml() }, note: 'партии, выбранные в «Нотах» (S); микротоны — точным alter' },
      { icon: '🎚', label: 'Строй для синтезатора · .scl .kbm .ascl', action: () => lazy('export.js').then(m => m.exportTuning()), note: 'Scala и Ableton Live 12 — строй или микротоновый лад песни' },
      { icon: '🗂', label: 'Стемы — WAV каждой дорожки', action: () => exportAudio('stems') },
      '-',
      { icon: '🎬', label: 'Видео MP4 с формулами…', action: () => lazy('video.js').then(m => m.videoDialog()) },
      '-',
      { icon: '📄', label: 'Исходник песни (.js)', action: () => lazy('export.js').then(m => m.exportSource()) },
      { html: 'Экспорт учитывает выключенные дорожки — так можно сохранить любую из них отдельно.' },
    ],
  },
  {
    label: 'Вид',
    items: () => [
      { header: 'Режим' },
      ...STYLE_ITEMS.map(([id, label, k]) => ({ label, kbd: k, checked: () => V.style === id, action: () => setStyle(id) })),
      '-',
      { label: 'Формулы вживую — с текущими числами', kbd: 'F', checked: () => V.live, action: () => { V.live = !V.live; saveView(); updateLive(true) } },
      { label: 'Частицы на нотах', checked: () => V.fx, action: () => { V.fx = !V.fx; saveView() } },
      { label: 'Тематический фон — пейзаж по стилю, в такт', checked: () => V.scenery, action: () => { V.scenery = !V.scenery; saveView() } },
      { label: 'Названия нот у плейхеда', checked: () => V.labels, action: () => { V.labels = !V.labels; saveView() } },
      { label: 'Осциллограф (фигура Лиссажу)', checked: () => V.scope, action: () => { V.scope = !V.scope; saveView() } },
      { icon: '🎨', label: 'Тема', items: () => [{ label: 'Авто — по стилю песни', checked: () => V.theme === 'auto', action: () => setTheme('auto') }, '-', ...Object.entries(THEMES).map(([id, t]) => ({ label: t.label, checked: () => V.theme === id, action: () => setTheme(id) }))] },
      '-',
      { icon: '🖼', label: 'Сетка всех песен', kbd: 'G', action: openGallery },
      { icon: '🎞', label: 'Кино — спрятать панели', kbd: 'C', action: toggleCinema },
      { icon: '🎛', label: 'Мастеринг и громкость (LUFS)', kbd: 'K', action: () => lazy('masterui.js').then(m => m.openMaster()), note: 'мастер-шина в плеере, цель стриминга −14 LUFS, истинный пик, измеритель' },
      '-',
      { header: 'Окно' },
      ...WIN_MODES.map(([id, label]) => ({ label, kbd: id === 'full' ? 'Alt+Enter' : '', checked: () => (document.fullscreenElement ? id === 'full' : win.mode === id), action: () => setWindowMode(id) })),
    ],
  },
])

// on the right, side by side: «Лады» (every mode, a card each) and the key menu (every key round the circle of fifths;
// its button shows the tonality chosen). Picking one keeps the music playing and asks: this music in it, or the next
menubar($('keynav'), [
  { label: 'Лады', items: () => lazy('modesui.js').then(m => m.modeItems()) },
  { label: '🎼 Тональность: авто', items: () => lazy('modesui.js').then(m => m.keyItems()) },
  { label: '🎚 Строй: 12-TET', items: () => lazy('modesui.js').then(m => m.temperItems()) },
])
lazy('modesui.js').then(m => {
  m.onTonality(t => ($('keynav').querySelectorAll('.mbtn')[1].textContent = m.keyButtonLabel(t)))
  m.onTemperament(id => ($('keynav').querySelectorAll('.mbtn')[2].textContent = m.temperButtonLabel(id)))
})

// ---- legend: click = mute, shift/right click = solo, hover = highlight ------------------------------------------
let legendHover = null
function buildLegend() {
  const el = $('legend')
  el.style.display = ''
  el.innerHTML = ''
  for (const t of app.scene.tracks) {
    const row = h('div', { class: 't' + (t.muted ? ' muted' : '') }, h('span', { class: 'dot', style: `background:${t.color}` }), h('span', {}, t.key), h('span', { class: 'm' }, h('i', { style: `background:${t.color}` })))
    t.row = row
    t.meter = row.querySelector('i')
    row.onclick = e => { e.shiftKey ? solo(t) : (t.muted = !t.muted); applyMute() }
    row.oncontextmenu = e => { e.preventDefault(); solo(t); applyMute() }
    row.onmouseenter = () => (legendHover = t)
    row.onmouseleave = () => (legendHover = null)
    el.append(row)
  }
  const k = app.current?.key
  el.append(h('div', { class: 'help' }, `${k ? tonalityOf(app.current.song, k) + ' · ' : ''}${app.current.song.bpm} BPM`), h('div', { class: 'help' }, 'клик — выкл · shift/ПКМ — соло'))
}
function solo(t) {
  const tr = app.scene.tracks, only = tr.every(o => o === t || o.muted) && !t.muted
  tr.forEach(o => (o.muted = only ? false : o !== t))
}
function applyMute() {
  const tr = app.scene.tracks
  tr.forEach(t => t.row.classList.toggle('muted', t.muted))
  player.setMuted(tr.filter(t => t.muted).map(t => t.key))
}

// ---- mouse: hover a curve → inspector; click → pin; timeline → seek; wheel → zoom ----------------------------------
let mouse = null, pin = null, idle = 0, geo = null, hover = null
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect()
  mouse = { x: e.clientX - r.left, y: e.clientY - r.top }
})
cv.addEventListener('mouseleave', () => (mouse = null))
addEventListener('mousemove', () => { idle = 0; document.body.classList.remove('idle') })
cv.addEventListener('wheel', e => {
  e.preventDefault()
  V.zoom = Math.max(4, Math.min(96, V.zoom * (e.deltaY > 0 ? 1.12 : 1 / 1.12)))
  $('zoom').value = V.zoom
}, { passive: false })
// Shift + drag on the timeline: a loop over the bars it covers
let loopDrag = null
cv.addEventListener('mousedown', e => {
  if (!e.shiftKey || !app.current?.song || !mouse || !geo?.tl || mouse.y <= H - 44) return
  const b = ((mouse.x - 16) / (W - 32)) * app.current.song.length
  loopDrag = { from: b }
  e.preventDefault()
})
addEventListener('mouseup', () => {
  if (!loopDrag || !mouse || !app.current?.song) return (loopDrag = null)
  const L = app.current.song.length, b = ((mouse.x - 16) / (W - 32)) * L
  const a = Math.max(0, barOf(Math.min(loopDrag.from, b))), z = Math.min(L, barOf(Math.max(loopDrag.from, b)) + 4)
  loopDrag = null
  skipClick = true
  setLoop([a, z])
  toast(`🔁 по кругу: такты ${a / 4 + 1}–${z / 4}`, { ms: 2000 })
})
let skipClick = false
cv.addEventListener('click', () => {
  if (skipClick) return (skipClick = false)
  if (!app.current?.song || !mouse) return
  const song = app.current.song
  if (geo?.tl && mouse.y > H - 44) { // timeline: snap to a section start if close, else to the bar
    const b = (mouse.x - 16) / (W - 32) * song.length
    const s = (song.sections ?? []).find(([s]) => Math.abs(s - b) < song.length * 0.015)
    return seek(s ? s[0] : Math.round(b / 4) * 4)
  }
  if (V.style !== 'classic' && geo?.Bx) return seek(Math.round(geo.Bx(mouse.x) * 4) / 4)
  if (hover) { pin = { ...hover }; $('insp').classList.add('pinned') } else { pin = null; $('insp').classList.remove('pinned') }
})

// ---- inspector card & live formulas ------------------------------------------------------------------------------------
const DRUMS = { 35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 41: 'tom', 42: 'hat', 43: 'tom', 45: 'tom', 46: 'open hat', 49: 'crash', 51: 'ride', 70: 'shaker' }
const isDrum = t => /drum|kick|snare|hat|clap|paw|hiss|claw|perc|tom|crash|beat/i.test(t.key)
// current values for a track: n, f, τ (beats since its note began), t (s), T (s), x
function valuesFor(t, x) {
  const sec = app.current.song ? 60 / app.current.song.bpm : 0.5
  const notes = app.scene.midiAt(t, x), v = { x, T: x * sec }
  if (notes.length && !isDrum(t)) {
    v.n = notes[0]
    v.f = soundOf(app.current.song, notes[0]).hz
  }
  const sc = app.scene.tracks.find(o => o.key === t.key)
  if (sc && sc.onset > -1e8 && x >= sc.onset) {
    v['τ'] = x - sc.onset
    v.t = v['τ'] * sec
  }
  return v
}
function liveFormula(t, x) {
  if (!t.formula) return ''
  const vals = valuesFor(t, x), main = substitute(t.formula[0], vals)
  const list = Object.entries(vals).filter(([k]) => k !== 'x').map(([k, v]) => `${k} = ${k === 'n' ? v + ' (' + spell(v, app.current.key) + ')' : (+v).toFixed(k === 'f' ? 2 : 3)}`).join('   ')
  return `<div class="vals">${esc(list)}</div>` + tex(main) + (t.formula.length > 1 ? '<div class="def">' + t.formula.slice(1).map(s => tex(substitute(s, vals))).join('') + '</div>' : '')
}
let inspKey = '', liveAt = 0
function showInspector(ins) {
  const el = $('insp'), t = ins.t
  let notes = app.scene.midiAt(t, ins.x)
  for (let b = 1; !notes.length && b <= 16; b++) notes = app.scene.midiAt(t, ins.x - b / GRID)
  const live = V.live && !pin
  const key = [t.key, notes.join(','), pin ? 1 : 0, live ? Math.floor(performance.now() / 120) : 0].join('|')
  if (key !== inspKey) {
    inspKey = key
    const k = app.current.key
    const list = notes.length
      ? notes.map(n => (isDrum(t) ? `<span><b>${DRUMS[n] ?? 'drum'}</b></span>` : `<span><b>${spell(n, k)}</b><small>${soundOf(app.current.song, n).hz.toFixed(2)} Гц${Math.abs(soundOf(app.current.song, n).cents) >= 0.5 ? ` · ${soundOf(app.current.song, n).cents > 0 ? '+' : '−'}${Math.abs(soundOf(app.current.song, n).cents).toFixed(1)} ¢` : ''}</small></span>`)).join('')
      : '<span class="rest">без ноты</span>'
    const f = live ? liveFormula(t, player.x) : t.formulaHTML || '<span class="rest">у этой дорожки нет формулы</span>'
    el.innerHTML = `<h3><span class="dot" style="background:${t.color}"></span>${esc(t.key)}${t.bad ? ' · <span style="color:var(--danger)">' + esc(t.bad) + '</span>' : ''}</h3><div class="notes">${list}</div><div class="f">${f}</div>`
  }
  el.style.display = 'block'
  if (!pin) {
    const r = el.getBoundingClientRect(), mx = mouse?.x ?? W / 2, my = mouse?.y ?? H / 2
    el.style.left = `${Math.max(16, Math.min(W - r.width - 16, mx + (mx > W * 0.55 ? -r.width - 20 : 20)))}px`
    el.style.top = `${Math.max(16, Math.min(H - r.height - 56, my - 40))}px`
  }
}
// "Formulas live": every sounding track's formula with the current numbers in it
function updateLive(force) {
  const el = $('live')
  if (!V.live || !app.scene) { el.style.display = 'none'; return }
  const now = performance.now()
  if (!force && now - liveAt < 125) return
  liveAt = now
  const x = player.x, sounding = app.scene.tracks.filter(t => t.formula && !t.muted && app.scene.val(t, Math.round(x * GRID)) != null).slice(0, 5)
  el.style.display = ''
  el.innerHTML = '<h3>формулы вживую</h3>' + (sounding.length
    ? sounding.map(t => `<div class="row"><h3><span class="dot" style="background:${t.color}"></span>${esc(t.key)}</h3><div class="f">${liveFormula(t, x)}</div></div>`).join('')
    : '<div class="rest">тишина…</div>')
}

// ---- the frame loop ------------------------------------------------------------------------------------------------
let last = performance.now(), fps = 60
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  fps = fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05
  if ((idle += dt) > 3 && player.playing && $('side').style.display === 'none') document.body.classList.add('idle')
  const sc = app.scene, cur = app.current
  if (!sc || !cur?.song) {
    g.fillStyle = '#07060f'
    g.fillRect(0, 0, W, H)
    return
  }
  const x = player.x, lv = player.levels()
  sc.update(x, dt, lv, player.playing && !player.stalled)
  for (const t of sc.tracks) if (t.meter) t.meter.style.width = `${Math.min(100, 100 * t.lvl)}%`
  // hover target: the curve nearest the mouse (classic view)
  hover = null
  if (V.style === 'classic' && geo && mouse && mouse.y < H - 44) {
    const bx = geo.Bx(mouse.x)
    let best = 18
    for (const t of sc.tracks) {
      let v = null
      try { v = t.graph?.(bx) } catch {}
      for (const y of [].concat(v ?? []).filter(Number.isFinite)) {
        const d = Math.abs(geo.Yf(y) - mouse.y)
        if (d < best) (best = d), (hover = { t, x: bx })
      }
    }
  }
  const ins = pin ?? hover
  const focus = ins?.t ?? legendHover
  geo = sc.draw(g, {
    style: V.style, W, H, zoom: V.zoom, fx: V.fx, scenery: V.scenery, labels: V.labels, focus, inspect: V.style === 'classic' ? ins : null,
    scope: V.scope && player.playing ? player.scope() : null, cached: player.cachedRanges?.(), mouseX: mouse && mouse.y > H - 44 ? mouse.x : null,
    loop: loopDrag && mouse ? [Math.min(loopDrag.from, ((mouse.x - 16) / (W - 32)) * cur.song.length), Math.max(loopDrag.from, ((mouse.x - 16) / (W - 32)) * cur.song.length)] : player.loopBeats,
    title: cur.song.name, subtitle: `${tonalityOf(cur.song, cur.key)} · ${cur.song.bpm} BPM`, left: $('legend').style.display === 'none' ? 0 : 190,
  })
  if (app.scoreview?.visible) app.scoreview.update(x)
  app.masterTick?.()
  if (ins && V.style === 'classic') showInspector(ins)
  else $('insp').style.display = 'none'
  updateLive(false)
  const tm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const sec = 60 / cur.song.bpm
  const xs = Math.min(x, cur.song.length)
  $('status').textContent = player.stalled ? 'считаю…' : `${tm(xs * sec)} / ${tm(cur.song.length * sec)} · такт ${Math.min(Math.floor(xs / 4) + 1, Math.ceil(cur.song.length / 4))}${player.loop ? ' · 🔁' : ''}${app.ab ? ` · ${app.ab.side.toUpperCase()}` : ''}`
  if (Math.random() < 0.02) for (const t of sc.tracks) for (const k of t.cache.keys()) if (Math.abs(k / GRID - x) > 200) t.cache.delete(k)
}
requestAnimationFrame(frame)

// ---- start ------------------------------------------------------------------------------------------------------------
lazy('masterui.js').then(m => (app.masterLabel = () => m.masterLabel(app.master)))
await app.lib.init()
// drafts of songs that are gone (deleted, or an old radio song) and drafts equal to the saved code go
for (const [id, src] of [...app.drafts]) {
  const e = app.lib.get(id)
  if (!e || e.source === src) app.drafts.delete(id)
}
app.drafts.flush()
refreshSongList()
let first = null
try { first = localStorage.getItem('mm.last') } catch {}
if (!app.lib.get(first)) first = app.lib.get('builtin:voidchip') ? 'builtin:voidchip' : app.lib.list()[0]?.id
$('song').value = first
// show the song (paused) without audio until the first click — browsers need a gesture for sound
{
  const e = app.lib.get(first)
  let source = app.drafts.get(e.id) ?? e.source, mod = await loadModule(source)
  if (!mod.song && source !== e.source) mod = await loadModule((source = e.source)) // a draft that doesn't run yet: show the saved version
  if (mod.song) {
    const tracks = makeTracks(mod.song, e.kind === 'builtin' ? e.name : mod.song.name)
    const key = keyOf(mod.song)
    app.current = { id: e.id, entry: e, source, song: mod.song, key, tracks }
    setScene(mod.song, tracks, key, false)
    buildLegend()
  }
}
if (app.drafts.size) {
  const names = [...app.drafts.keys()].map(id => app.lib.get(id)?.name).filter(Boolean)
  const list = names.slice(0, 3).join(', ') + (names.length > 3 ? ` и ещё ${names.length - 3}` : '')
  toast(`✎ несохранённые правки на месте: ${list} — Ctrl+S сохранит, ↺ откатит`, { ms: 7000 })
}
// my_songs/ is remembered but the browser wants a click to allow it again, or songs wait for it
if (!app.lib.dir && app.lib.canConnect && (app.lib.stored || app.lib.pending.length)) {
  const n = app.lib.pending.length
  toast(n ? `⏳ ${n} ${songsWord(n)} ждут папку my_songs — подключи её, и они станут файлами` : '📁 разрешить приложению писать в папку my_songs?', { ms: 15000, action: { label: '📁 подключить', run: connectFolder } })
}
// drafts go to localStorage right away when the page closes; warn only if that can't work
addEventListener('pagehide', () => app.drafts.flush())
addEventListener('beforeunload', e => {
  app.drafts.flush()
  if (app.drafts.size && !app.drafts.ok) e.preventDefault()
})
window.mathMusic = { app, player, get x() { return player.x }, get fps() { return fps } } // for debugging and tests
