// The gallery: every song as a card with its cover — the song's own graph, all of it, drawn from
// graph(x) like graph.png — key, tempo, length. The built-in songs first, then yours (my_songs/) on a
// row of their own; the chips above show only one style. "▶ оживить все" sets every cover playing at
// once (each one scrolling through its song at its own tempo): all the songs at the same time.
import { app } from './app.js'
import { h, esc, contextMenu } from './ui.js'
import { themeFor } from './themes.js'
import { songKey, keyLabel, tonicName } from './theory.js'
import { MODES } from './modes.js'
import { trackList } from './runtime.js'
import { sandboxLoad } from './sandbox.js'
import { styleIn, shelfOf } from './library.js'
import { STYLE_LIST, STYLE_FAMILIES, familyOf } from './generate.js'

let el = null, alive = false, raf = 0, unwatch = null
const covers = []

// the generator's styles, then the ones only the original songs have
const STYLE_INFO = Object.fromEntries([
  ...STYLE_LIST.map(s => [s.id, s]),
  ...[['project', 'Проекты', '🎛'], ['dnb', 'Драм-н-бейс', '🥁'], ['hardstyle', 'Хардстайл', '🔨'], ['phonk', 'Фонк', '🚗'], ['gothic', 'Готика', '🦇'], ['minimal', 'Минимал', '✏️']].filter(([id]) => !STYLE_LIST.some(s => s.id === id)).map(([id, label, emoji]) => [id, { id, label, emoji }]),
  ['other', { id: 'other', label: 'Без стиля', emoji: '·' }],
])
const styleOf = e => (STYLE_INFO[styleIn(e.source)] ? styleIn(e.source) : 'other')
// the families of the generator's styles, then the songs that have none of them — each a chip; a family opens its styles
const OWN = { project: ['project', 'Проекты', '🎛'], first: ['first', 'Первые песни', '✏️'], other: ['other', 'Без стиля', '·'] }
const famOf = style => (style === 'project' || style === 'other' ? style : STYLE_LIST.some(s => s.id === style) ? familyOf(style).id : 'first')
const FAMS = [...STYLE_FAMILIES.map(f => [f.id, f.label, f.emoji]), ...Object.values(OWN)]
const SORTS = [
  ['', 'как есть'], ['az', 'по алфавиту: А → Я'], ['za', 'по алфавиту: Я → А'], ['style', 'по стилю'], ['new', 'сначала новые'],
  ['slow', 'темп: от медленных'], ['fast', 'темп: от быстрых'], ['short', 'длина: от коротких'], ['long', 'длина: от длинных'],
]
const num = (c, k) => +c.dataset[k] || 0
const ORDER = {
  '': (a, b) => num(a, 'i') - num(b, 'i'),
  az: (a, b) => a.dataset.name.localeCompare(b.dataset.name, ['ru', 'en'], { numeric: true }),
  za: (a, b) => b.dataset.name.localeCompare(a.dataset.name, ['ru', 'en'], { numeric: true }),
  style: (a, b) => num(a, 'rank') - num(b, 'rank') || a.dataset.name.localeCompare(b.dataset.name, ['ru', 'en'], { numeric: true }),
  new: (a, b) => num(b, 'date') - num(a, 'date'),
  slow: (a, b) => num(a, 'bpm') - num(b, 'bpm'), fast: (a, b) => num(b, 'bpm') - num(a, 'bpm'),
  short: (a, b) => num(a, 'secs') - num(b, 'secs'), long: (a, b) => num(b, 'secs') - num(a, 'secs'),
}
// what shows: a family (or 'all'), one of its styles (or none), the words typed, the order — remembered
let filter = 'all', sub = '', query = '', sort = '', serial = 0
try {
  const saved = JSON.parse(localStorage.getItem('mm.gallery') || '{}')
  filter = FAMS.some(f => f[0] === saved.filter) ? saved.filter : 'all'
  sub = saved.sub ?? ''
  sort = ORDER[saved.sort] ? saved.sort : ''
} catch {}
const remember = () => { try { localStorage.setItem('mm.gallery', JSON.stringify({ filter, sub, sort })) } catch {} }

export function openGallery() {
  if (el) return closeGallery()
  alive = false
  el = h('div', { class: 'gallery' })
  const animate = h('button', { onclick: () => { alive = !alive; animate.classList.toggle('on', alive); animate.textContent = alive ? '⏸ остановить' : '▶ оживить все' } }, '▶ оживить все')
  const chips = h('div', { class: 'chips' }), subchips = h('div', { class: 'chips sub2' })
  const search = h('input', { type: 'search', class: 'q', placeholder: 'поиск: название, стиль, тональность, темп…', value: query, oninput: () => { query = search.value; refilter() } })
  const order = h('select', { title: 'порядок песен', onchange: () => { sort = order.value; remember(); refilter() } }, ...SORTS.map(([v, label]) => new Option(label, v)))
  order.value = sort
  const found = h('span', { class: 'n' })
  const builtGrid = h('div', { class: 'grid' }), mineGrid = h('div', { class: 'grid' }), genGrid = h('div', { class: 'grid' })
  const builtHead = h('h3', {}, 'Встроенные — songs/'), mineHead = h('h3', {}, 'Мои — my_songs/'), genHead = h('h3', {}, 'Сгенерированные — generated/')
  const empty = h('div', { class: 'sub empty' }, 'в этом стиле песен нет')
  el.append(
    h('button', { class: 'close', onclick: closeGallery, title: 'закрыть (Esc, G)' }, '✕'),
    h('h2', {}, 'Все песни'),
    h('div', { class: 'sub' }, 'клик — открыть и играть · правый клик — дублировать, переименовать, удалить · ', animate),
    h('div', { class: 'tools' }, search, order, found),
    chips, subchips, builtHead, builtGrid, mineHead, mineGrid, genHead, genGrid, empty,
  )
  // built-in, then yours (my_songs/), then the 🎲 songs nobody saved yet (generated/, the last 20)
  const gridOf = e => (e.kind === 'builtin' ? builtGrid : shelfOf(e) === 'gen' ? genGrid : mineGrid)
  const cards = () => [...builtGrid.children, ...mineGrid.children, ...genGrid.children]
  // the style chips (with how many songs each has) and which cards show
  const refilter = () => {
    const list = app.lib.list(), count = { all: list.length }, byStyle = {}
    for (const e of list) {
      const st = styleOf(e), fam = famOf(st)
      count[fam] = (count[fam] ?? 0) + 1
      byStyle[st] = (byStyle[st] ?? 0) + 1
    }
    if (!count[filter]) (filter = 'all'), (sub = '')
    const chip = (on, label, n, pick) => h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => { pick(); remember(); refilter() } }, label, h('span', { class: 'n' }, String(n)))
    chips.replaceChildren(chip(filter === 'all', 'Все', count.all, () => { filter = 'all'; sub = '' }),
      ...FAMS.filter(f => count[f[0]]).map(([id, label, emoji]) => chip(filter === id, `${emoji} ${label}`, count[id], () => { filter = id; sub = '' })))
    // the chosen family's styles (when it has more than one with songs)
    const inFam = Object.keys(STYLE_INFO).filter(st => byStyle[st] && famOf(st) === filter)
    if (!inFam.includes(sub)) sub = ''
    subchips.replaceChildren(...(filter !== 'all' && inFam.length > 1 ? inFam.map(st => chip(sub === st, `${STYLE_INFO[st].emoji} ${STYLE_INFO[st].label}`, byStyle[st], () => { sub = sub === st ? '' : st })) : []))
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    let n = 0
    for (const c of cards()) {
      c.hidden = (filter !== 'all' && c.dataset.fam !== filter) || (sub && c.dataset.style !== sub) || !words.every(w => (c.dataset.text ?? '').includes(w))
      if (!c.hidden) n++
    }
    found.textContent = words.length || filter !== 'all' ? `найдено: ${n}` : ''
    // the order, in each folder's own row (appending a node moves it; only when something is out of place)
    for (const g of [builtGrid, mineGrid, genGrid]) {
      const now = [...g.children], want = [...now].sort(ORDER[sort])
      if (want.some((c, i) => c !== now[i])) g.append(...want)
    }
    const shown = g => [...g.children].some(c => !c.hidden)
    builtHead.hidden = !shown(builtGrid)
    mineHead.hidden = !shown(mineGrid) && !(filter === 'all' && !mineGrid.children.length)
    mineHead.textContent = mineGrid.children.length ? 'Мои — my_songs/' : 'Мои — my_songs/ (пока пусто: Ctrl+S положит песню сюда)'
    genHead.hidden = !shown(genGrid)
    genHead.textContent = 'Сгенерированные — generated/ (последние 20; Ctrl+S переносит в «Мои»)'
    empty.textContent = words.length ? 'ничего не найдено' : 'в этом стиле песен нет'
    empty.hidden = shown(builtGrid) || shown(mineGrid) || shown(genGrid) || cards().length < list.length
  }
  // the library changes (here or in another tab): the card goes, gets its new look, or a new one comes
  // (the newest of yours first)
  unwatch = app.lib.on((id, e) => {
    const old = cards().find(c => c.dataset.id === id)
    if (!e) old?.remove()
    else if (old && old.parentNode === gridOf(e)) old.replaceWith(card(e))
    else (old?.remove(), gridOf(e).prepend(card(e))) // new, or moved to another folder (Ctrl+S on a 🎲 song)
    refilter()
  })
  document.body.append(el)
  covers.length = 0
  const list = app.lib.list()
  let i = 0
  refilter()
  // build the cards a few at a time so the page stays responsive
  const step = () => {
    if (!el) return
    for (let k = 0; k < 3 && i < list.length; k++, i++) {
      // the library may have changed while the cards were being built
      const e = app.lib.get(list[i].id)
      if (e && !cards().some(c => c.dataset.id === e.id)) gridOf(e).append(card(e))
    }
    refilter()
    if (i < list.length) setTimeout(step, 0)
  }
  step()
  addEventListener('keydown', onKey, true)
  const loop = t => {
    raf = requestAnimationFrame(loop)
    if (alive) for (const c of covers) if (c.cv.isConnected && !c.cv.closest('[hidden]')) c.draw(t / 1000)
  }
  raf = requestAnimationFrame(loop)
}
function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); closeGallery() }
}
export function closeGallery() {
  el?.remove()
  el = null
  unwatch?.()
  unwatch = null
  cancelAnimationFrame(raf)
  removeEventListener('keydown', onKey, true)
}

function card(entry, made = null) {
  const cv = h('canvas', { width: 520, height: 240 })
  const meta = h('div', { class: 'meta' })
  const c = h('div', { class: 'card', title: entry.name }, cv, meta)
  c.dataset.id = entry.id
  c.dataset.style = styleOf(entry)
  c.dataset.fam = famOf(c.dataset.style)
  c.dataset.i = serial++
  c.dataset.rank = Object.keys(STYLE_INFO).indexOf(c.dataset.style)
  c.dataset.name = entry.name
  c.dataset.date = entry.updated ?? entry.created ?? 0
  c.dataset.text = entry.name.toLowerCase()
  c.onclick = async () => {
    closeGallery()
    await app.open(entry.id ?? entry)
  }
  c.oncontextmenu = ev => {
    ev.preventDefault()
    const mine = entry.kind !== 'builtin'
    contextMenu([
      { icon: '▶', label: 'Открыть', action: () => c.onclick() },
      { icon: '⧉', label: 'Дублировать', action: () => { closeGallery(); app.songs.duplicate(entry.id) } },
      { icon: '✎', label: 'Переименовать…', disabled: !mine, action: () => app.songs.rename(entry.id) },
      { icon: '🗑', label: 'Удалить', disabled: !mine, action: () => app.songs.remove(entry.id), note: mine ? (entry.file ? `и файл ${shelfOf(entry) === 'gen' ? 'generated' : 'my_songs'}/${entry.file}` : null) : 'встроенные песни живут в папке songs/' },
    ], ev.clientX, ev.clientY)
  }
  // a song from somewhere else never runs in the page: its card waits for the sandbox (sandbox.js) and is drawn from its tables
  if (entry.foreign && !made) {
    meta.innerHTML = `<b>${esc(entry.name)}</b><span class="tag">🛡 чужая</span><div class="d">в песочнице…</div>`
    sandboxLoad(app.rt.lib, entry.source, { id: entry.id }).then(r => { if (c.isConnected) c.replaceWith(card(entry, r.song)) },
      e => { meta.innerHTML = `<b>${esc(entry.name)}</b><span class="tag">🛡 чужая</span><div class="d" style="color:var(--danger)">ошибка: ${esc(e.message)}</div>` })
    return c
  }
  let song = made
  try {
    song ??= app.rt.load(entry.source, { own: true }).song
  } catch (e) {
    meta.innerHTML = `<b>${esc(entry.name)}</b><div class="d" style="color:var(--danger)">ошибка: ${esc(e.message)}</div>`
    return c
  }
  const key = songKey(song), th = themeFor(song), secs = (song.length * 60) / song.bpm
  const st = STYLE_INFO[c.dataset.style]
  const keyText = song.mode && MODES[song.mode] ? `${tonicName(key)} ${MODES[song.mode].name}` : keyLabel(key)
  c.dataset.name = song.name ?? entry.name
  c.dataset.bpm = song.bpm
  c.dataset.secs = Math.round(secs)
  c.dataset.text = `${song.name} ${entry.name} ${st.label} ${FAMS.find(f => f[0] === c.dataset.fam)?.[1] ?? ''} ${keyText} ${song.bpm} bpm`.toLowerCase()
  const tag = [entry.foreign ? '🛡 чужая' : entry.kind === 'generated' ? '🎲' : entry.kind === 'user' ? 'моя' : '', entry.where === 'pending' ? '⏳ не в папке' : '', st.id !== 'other' ? st.emoji : ''].filter(Boolean).join(' ')
  meta.innerHTML = `<b>${esc(song.name)}</b>${tag ? `<span class="tag">${tag}</span>` : ''}<div class="d">${song.mode && MODES[song.mode] ? `${tonicName(key)} ${MODES[song.mode].name.replace(/^Натуральный /, '').toLowerCase()}` : keyLabel(key)}${song.tuning?.name ? ` · ${song.tuning.name}` : ''} · ${song.bpm} BPM · ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} · ${trackList(song).length} дорожек</div>`
  // sample every curve once
  const W = 520, H = 240, res = Math.max(1, Math.round(W * 3 / song.length))
  const lines = trackList(song).filter(([, t]) => t.graph).map(([, t], i) => {
    const pts = []
    for (let k = 0; k <= song.length * res; k++) {
      let v = null
      try { v = t.graph(k / res) } catch {}
      pts.push(v == null ? null : [].concat(v).filter(Number.isFinite))
    }
    return { color: t.color ?? `hsl(${i * 47} 80% 65%)`, pts }
  })
  const g = cv.getContext('2d')
  const Y = y => H * (0.08 + 0.84 * (5 - Math.max(-3, Math.min(5, y))) / 8)
  const paint = (x0, span) => {
    const grd = g.createLinearGradient(0, 0, 0, H)
    grd.addColorStop(0, `hsl(${th.hue} ${th.sat}% 10%)`)
    grd.addColorStop(1, `hsl(${th.hue + 40} ${th.sat}% 3%)`)
    g.globalAlpha = 1
    g.fillStyle = grd
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#ffffff10'
    for (const [b] of song.sections ?? []) if (b >= x0 && b <= x0 + span) g.fillRect(((b - x0) / span) * W, 0, 1, H)
    g.lineJoin = 'round'
    for (const l of lines) {
      g.strokeStyle = l.color
      for (const [w, a] of [[5, 0.12], [1.6, 0.9]]) {
        g.lineWidth = w
        g.globalAlpha = a
        g.beginPath()
        const k0 = Math.floor(x0 * res), k1 = Math.min(l.pts.length - 1, Math.ceil((x0 + span) * res))
        const prev = []
        for (let k = k0; k <= k1; k++) {
          const v = l.pts[k], x = ((k / res - x0) / span) * W
          if (!v) { prev.length = 0; continue }
          v.forEach((y, j) => {
            if (prev[j] == null || Math.abs(prev[j] - y) > 1.2) g.moveTo(x, Y(y))
            else g.lineTo(x, Y(y))
            prev[j] = y
          })
          prev.length = v.length
        }
        g.stroke()
      }
    }
  }
  paint(0, song.length)
  // alive: a 16-beat window scrolling at the song's own tempo
  covers.push({ cv, draw: t => { const x = ((t * song.bpm) / 60) % song.length; paint(Math.max(0, x - 6), 16) } })
  c.onmouseleave = () => !alive && paint(0, song.length)
  return c
}
