// MathMusic Live — the app: menus, transport, song loading and live updates, legend, inspector,
// live formulas, the drawing loop. Feature modules (editor, piano roll, generator, export, video,
// gallery) load on first use.
import { app } from './app.js'
import { $, h, esc, menubar, toast, modal, closeMenus } from './ui.js'
import { Player } from './player.js'
import { makeRuntime, trackList, SR, errorLine } from './runtime.js'
import { Library, nameIn } from './library.js'
import { Scene, GRID } from './view.js'
import { THEMES, themeFor, applyUiTheme } from './themes.js'
import { formulaOf, formulaHTML, substitute, tex, formulaImage } from './formula.js'
import { songKey, spell, keyLabel, freq } from './theory.js'

const SRC = MM.SRC
app.SRC = SRC
app.rt = makeRuntime(SRC)
app.lib = new Library(SRC)
app.player = new Player(SRC)
const player = app.player
const lazy = name => import(MM.url(name))

// ---- view options (remembered) -----------------------------------------------------------------
const VIEW_DEFAULTS = { style: 'classic', live: false, fx: true, labels: true, scope: true, theme: 'auto', loop: true, zoom: 22, volume: 0.9 }
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
  const groups = { builtin: h('optgroup', { label: 'Песни' }), user: h('optgroup', { label: 'Мои' }), generated: h('optgroup', { label: 'Сгенерированные' }) }
  for (const e of app.lib.list()) (groups[e.kind] ?? groups.user).append(new Option(e.name + (e.kind === 'user' && e.base ? ' ✎' : ''), e.id))
  for (const gr of Object.values(groups)) if (gr.children.length) sel.append(gr)
  if (cur) sel.value = cur
}
app.refreshSongList = refreshSongList

const keyOf = song => songKey(song)
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

async function open(idOrEntry, from = 0) {
  const entry = typeof idOrEntry === 'string' ? app.lib.get(idOrEntry) : idOrEntry
  if (!entry) return toast('нет такой песни', { kind: 'err' })
  const source = app.drafts.get(entry.id) ?? entry.source
  const mod = await loadModule(source)
  if (mod.error) {
    toast(`${entry.name}: ${mod.error}${mod.line ? ` (строка ${mod.line})` : ''}`, { kind: 'err', ms: 8000 })
    app.current = { id: entry.id, entry, source, song: null, broken: mod }
    app.editor?.load(app.current)
    return
  }
  const { song, body } = mod
  const tracks = makeTracks(song, entry.kind === 'builtin' ? entry.name : song.name)
  const key = keyOf(song)
  app.current = { id: entry.id, entry, source, song, key, tracks, dirty: source !== entry.source }
  setScene(song, tracks, key, false)
  buildLegend()
  refreshSongList()
  $('song').value = entry.id
  $('hint').style.display = 'none'
  $('err').textContent = ''
  pin = null
  await player.open({ source, song }, from)
  player.setMuted(tracks.filter(t => t.muted).map(t => t.key))
  await player.play()
  updatePlayButton()
  app.editor?.load(app.current)
  app.pianoroll?.load?.(app.current)
  try { localStorage.setItem('mm.last', entry.id) } catch {}
}
app.open = open

// Live update of the current song from new source (editor, sliders, piano roll)
async function apply(source, { reason = 'edit' } = {}) {
  const cur = app.current
  if (!cur) return { ok: false, error: 'нет песни' }
  const mod = await loadModule(source)
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
  Object.assign(cur, { source, song, key, tracks, dirty: true, broken: null })
  setScene(song, tracks, key, true)
  buildLegend()
  await player.update({ source, song })
  player.setMuted(tracks.filter(t => t.muted).map(t => t.key))
  return { ok: true, problems }
}
app.apply = apply

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
function nextSong() {
  const ids = app.lib.list().map(e => e.id), i = (ids.indexOf(app.current?.id) + 1) % ids.length
  open(ids[i])
}
$('play').onclick = togglePlay
$('next').onclick = nextSong
$('back').onclick = () => seek(Math.floor(player.x / 4) * 4 - 16)
$('fwd').onclick = () => seek(Math.floor(player.x / 4) * 4 + 16)
$('song').onchange = () => open($('song').value)
$('vol').oninput = () => { V.volume = +$('vol').value; player.setVolume(V.volume); saveView() }
$('zoom').oninput = () => { V.zoom = +$('zoom').value; saveView() }

const typing = e => e.target.closest?.('.CodeMirror, input, textarea, select, [contenteditable]')
addEventListener('keydown', e => {
  if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); return saveCurrent() }
  if (e.ctrlKey && e.code === 'KeyE' && !typing(e)) { e.preventDefault(); return exportAudio('mp3') }
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  else if (e.code === 'ArrowLeft') $('back').onclick()
  else if (e.code === 'ArrowRight') $('fwd').onclick()
  else if (e.code === 'Home') seek(0)
  else if (e.code === 'KeyN') nextSong()
  else if (e.code === 'KeyE') toggleEditor()
  else if (e.code === 'KeyP') togglePianoRoll()
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
  const source = app.editor?.value?.() ?? cur.source
  const base = cur.entry.kind === 'builtin' ? cur.entry.id : cur.entry.base
  const e = await app.lib.save({ ...cur.entry, id: cur.entry.kind === 'builtin' ? null : cur.entry.id, kind: cur.entry.kind === 'builtin' ? 'user' : cur.entry.kind, base, source })
  app.drafts.delete(cur.id) // a built-in song's copy gets a new id: the built-in keeps no draft
  cur.entry = e
  cur.id = e.id
  cur.dirty = false
  refreshSongList()
  app.editor?.saved?.()
  toast(`💾 сохранено в «Мои»: ${e.name}`, { kind: 'ok' })
}
async function saveToFolder(ask) {
  const cur = app.current
  if (!cur) return
  const source = app.editor?.value?.() ?? cur.source
  const r = await app.lib.saveToDisk(nameIn(source, cur.entry.name), source, { ask })
  if (r) toast(`📁 записано: ${r.where}\nrender.js и Ableton увидят песню после «npm run viz» / рендера`, { kind: 'ok', ms: 6000 })
}
function openFile() {
  const inp = h('input', { type: 'file', accept: '.js,text/javascript' })
  inp.onchange = async () => {
    const f = inp.files[0]
    if (!f) return
    const source = await f.text()
    const e = await app.lib.save({ name: f.name.replace(/\.js$/, ''), source, kind: 'user' })
    refreshSongList()
    open(e)
  }
  inp.click()
}
async function newSong() {
  const src = (await lazy('editor.js')).TEMPLATE
  const e = await app.lib.save({ name: 'my-song', source: src, kind: 'user' })
  refreshSongList()
  await open(e)
  toggleEditor(true)
}
async function renameCurrent() {
  const cur = app.current
  if (!cur || cur.entry.kind === 'builtin') return toast('встроенные песни переименовываются в файле; сначала сохрани копию (Ctrl+S)')
  const inp = h('input', { type: 'text', value: cur.entry.name, style: 'width:100%' })
  modal('Переименовать', h('div', {}, inp), [{ label: 'Отмена' }, {
    label: 'OK', primary: true, action: async () => {
      const name = inp.value.trim().replace(/['"`\\]/g, '')
      if (!name) return false
      const source = (app.editor?.value?.() ?? cur.source).replace(/(\bname\s*:\s*)(['"`])[^'"`]*\2/, `$1'${name}'`)
      cur.entry = await app.lib.save({ ...cur.entry, source })
      app.drafts.delete(cur.id)
      cur.source = source
      app.editor?.load(cur)
      refreshSongList()
    },
  }])
  setTimeout(() => inp.select(), 50)
}
async function deleteCurrent() {
  const cur = app.current
  if (!cur || cur.entry.kind === 'builtin') return toast('встроенные песни не удаляются отсюда')
  modal('Удалить песню?', `<p>«${esc(cur.entry.name)}» исчезнет из «Моих». Файлы на диске не трогаются.</p>`, [{ label: 'Отмена' }, {
    label: 'Удалить', primary: true, action: async () => {
      await app.lib.remove(cur.entry.id)
      app.drafts.delete(cur.entry.id)
      refreshSongList()
      nextSong()
    },
  }])
}

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
const openGallery = () => lazy('gallery.js').then(m => m.openGallery())
const toggleCinema = () => document.body.classList.toggle('cinema')
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
      { icon: '💾', label: 'Сохранить в «Мои»', kbd: 'Ctrl+S', action: saveCurrent },
      { icon: '📁', label: 'Записать в папку songs/…', action: () => saveToFolder(false), note: 'тогда render.js и устройство в Ableton увидят песню' },
      { icon: '📁', label: 'Выбрать другую папку…', action: () => saveToFolder(true) },
      { icon: '✎', label: 'Переименовать…', action: renameCurrent, disabled: () => app.current?.entry.kind === 'builtin' },
      { icon: '🗑', label: 'Удалить из «Моих»', action: deleteCurrent, disabled: () => !app.current || app.current.entry.kind === 'builtin' },
      '-',
      { label: 'После песни — следующая', checked: () => V.loop, action: () => { V.loop = !V.loop; saveView() } },
    ],
  },
  {
    label: 'Редактор',
    items: () => [
      { icon: '⌨', label: 'Код песни', kbd: 'E', checked: () => $('side').style.display !== 'none', action: () => toggleEditor() },
      { icon: '🎹', label: 'Пианоролл — рисовать мелодию', kbd: 'P', checked: () => $('bottom').style.display !== 'none', action: () => togglePianoRoll() },
      '-',
      { icon: '✔', label: 'Проверить песню целиком', action: () => lazy('editor.js').then(m => m.fullCheck()) },
      { icon: '📖', label: 'Справочник функций', action: () => lazy('editor.js').then(m => m.apiReference()) },
      { icon: '↺', label: 'Откатить несохранённые правки', action: () => app.editor?.revert(), disabled: () => !app.current?.dirty },
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
      { icon: '🎵', label: 'MP3 · 320 кбит/с', kbd: 'Ctrl+E', action: () => exportAudio('mp3') },
      { icon: '🎚', label: 'WAV · 24 бит, 44.1 кГц', action: () => exportAudio('wav') },
      { icon: '🌀', label: 'OGG · Opus 256 кбит/с', action: () => exportAudio('ogg') },
      { icon: '🎼', label: 'MIDI · все дорожки', action: () => exportAudio('mid') },
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
      { label: 'Названия нот у плейхеда', checked: () => V.labels, action: () => { V.labels = !V.labels; saveView() } },
      { label: 'Осциллограф (фигура Лиссажу)', checked: () => V.scope, action: () => { V.scope = !V.scope; saveView() } },
      { icon: '🎨', label: 'Тема', items: () => [{ label: 'Авто — по стилю песни', checked: () => V.theme === 'auto', action: () => setTheme('auto') }, '-', ...Object.entries(THEMES).map(([id, t]) => ({ label: t.label, checked: () => V.theme === id, action: () => setTheme(id) }))] },
      '-',
      { icon: '🖼', label: 'Сетка всех песен', kbd: 'G', action: openGallery },
      { icon: '🎞', label: 'Кино — спрятать панели', kbd: 'C', action: toggleCinema },
    ],
  },
])

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
  el.append(h('div', { class: 'help' }, `${k ? keyLabel(k) + ' · ' : ''}${app.current.song.bpm} BPM`), h('div', { class: 'help' }, 'клик — выкл · shift/ПКМ — соло'))
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
cv.addEventListener('click', () => {
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
    v.f = freq(notes[0])
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
      ? notes.map(n => (isDrum(t) ? `<span><b>${DRUMS[n] ?? 'drum'}</b></span>` : `<span><b>${spell(n, k)}</b><small>${freq(n).toFixed(2)} Гц</small></span>`)).join('')
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
    style: V.style, W, H, zoom: V.zoom, fx: V.fx, labels: V.labels, focus, inspect: V.style === 'classic' ? ins : null,
    scope: V.scope && player.playing ? player.scope() : null, cached: player.cachedRanges?.(), mouseX: mouse && mouse.y > H - 44 ? mouse.x : null,
    title: cur.song.name, subtitle: `${keyLabel(cur.key)} · ${cur.song.bpm} BPM`, left: $('legend').style.display === 'none' ? 0 : 190,
  })
  if (ins && V.style === 'classic') showInspector(ins)
  else $('insp').style.display = 'none'
  updateLive(false)
  const tm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const sec = 60 / cur.song.bpm
  const xs = Math.min(x, cur.song.length)
  $('status').textContent = player.stalled ? 'считаю…' : `${tm(xs * sec)} / ${tm(cur.song.length * sec)} · такт ${Math.min(Math.floor(xs / 4) + 1, Math.ceil(cur.song.length / 4))}`
  if (Math.random() < 0.02) for (const t of sc.tracks) for (const k of t.cache.keys()) if (Math.abs(k / GRID - x) > 200) t.cache.delete(k)
}
requestAnimationFrame(frame)

// ---- start ------------------------------------------------------------------------------------------------------------
await app.lib.init()
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
    app.current = { id: e.id, entry: e, source, song: mod.song, key, tracks, dirty: source !== e.source }
    setScene(mod.song, tracks, key, false)
    buildLegend()
  }
}
if (app.drafts.size) toast(`✎ восстановлены несохранённые правки (${app.drafts.size}) — Ctrl+S сохранит, ↺ откатит`, { ms: 6000 })
// drafts go to localStorage right away when the page closes; warn only if that can't work
addEventListener('pagehide', () => app.drafts.flush())
addEventListener('beforeunload', e => {
  app.drafts.flush()
  if (app.drafts.size && !app.drafts.ok) e.preventDefault()
})
window.mathMusic = { app, player, get x() { return player.x }, get fps() { return fps } } // for debugging and tests
