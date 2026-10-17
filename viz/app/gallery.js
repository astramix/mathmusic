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
import { styleIn, shelfOf } from './library.js'
import { STYLE_LIST } from './generate.js'

let el = null, alive = false, raf = 0, unwatch = null
const covers = []

// the generator's styles, then the ones only the original songs have
const STYLE_INFO = Object.fromEntries([
  ...STYLE_LIST.map(s => [s.id, s]),
  ...[['project', 'Проекты', '🎛'], ['dnb', 'Драм-н-бейс', '🥁'], ['hardstyle', 'Хардстайл', '🔨'], ['phonk', 'Фонк', '🚗'], ['gothic', 'Готика', '🦇'], ['minimal', 'Минимал', '✏️']].map(([id, label, emoji]) => [id, { id, label, emoji }]),
  ['other', { id: 'other', label: 'Без стиля', emoji: '·' }],
])
const styleOf = e => (STYLE_INFO[styleIn(e.source)] ? styleIn(e.source) : 'other')
let filter = 'all'
try { filter = localStorage.getItem('mm.galleryStyle') || 'all' } catch {}

export function openGallery() {
  if (el) return closeGallery()
  alive = false
  el = h('div', { class: 'gallery' })
  const animate = h('button', { onclick: () => { alive = !alive; animate.classList.toggle('on', alive); animate.textContent = alive ? '⏸ остановить' : '▶ оживить все' } }, '▶ оживить все')
  const chips = h('div', { class: 'chips' })
  const builtGrid = h('div', { class: 'grid' }), mineGrid = h('div', { class: 'grid' }), genGrid = h('div', { class: 'grid' })
  const builtHead = h('h3', {}, 'Встроенные — songs/'), mineHead = h('h3', {}, 'Мои — my_songs/'), genHead = h('h3', {}, 'Сгенерированные — generated/')
  const empty = h('div', { class: 'sub empty' }, 'в этом стиле песен нет')
  el.append(
    h('button', { class: 'close', onclick: closeGallery, title: 'закрыть (Esc, G)' }, '✕'),
    h('h2', {}, 'Все песни'),
    h('div', { class: 'sub' }, 'клик — открыть и играть · правый клик — дублировать, переименовать, удалить · ', animate),
    chips, builtHead, builtGrid, mineHead, mineGrid, genHead, genGrid, empty,
  )
  // built-in, then yours (my_songs/), then the 🎲 songs nobody saved yet (generated/, the last 20)
  const gridOf = e => (e.kind === 'builtin' ? builtGrid : shelfOf(e) === 'gen' ? genGrid : mineGrid)
  const cards = () => [...builtGrid.children, ...mineGrid.children, ...genGrid.children]
  // the style chips (with how many songs each has) and which cards show
  const refilter = () => {
    const list = app.lib.list(), count = { all: list.length }
    for (const e of list) count[styleOf(e)] = (count[styleOf(e)] ?? 0) + 1
    if (!count[filter]) filter = 'all'
    chips.replaceChildren(...['all', ...Object.keys(STYLE_INFO)].filter(id => count[id]).map(id => {
      const s = STYLE_INFO[id]
      return h('button', {
        class: 'chip' + (id === filter ? ' on' : ''),
        onclick: () => { filter = id; try { localStorage.setItem('mm.galleryStyle', id) } catch {} refilter() },
      }, id === 'all' ? 'Все' : `${s.emoji} ${s.label}`, h('span', { class: 'n' }, String(count[id])))
    }))
    for (const c of cards()) c.hidden = filter !== 'all' && c.dataset.style !== filter
    const shown = g => [...g.children].some(c => !c.hidden)
    builtHead.hidden = !shown(builtGrid)
    mineHead.hidden = !shown(mineGrid) && !(filter === 'all' && !mineGrid.children.length)
    mineHead.textContent = mineGrid.children.length ? 'Мои — my_songs/' : 'Мои — my_songs/ (пока пусто: Ctrl+S положит песню сюда)'
    genHead.hidden = !shown(genGrid)
    genHead.textContent = 'Сгенерированные — generated/ (последние 20; Ctrl+S переносит в «Мои»)'
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

function card(entry) {
  const cv = h('canvas', { width: 520, height: 240 })
  const meta = h('div', { class: 'meta' })
  const c = h('div', { class: 'card', title: entry.name }, cv, meta)
  c.dataset.id = entry.id
  c.dataset.style = styleOf(entry)
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
  let song = null
  try {
    song = app.rt.load(entry.source).song
  } catch (e) {
    meta.innerHTML = `<b>${esc(entry.name)}</b><div class="d" style="color:var(--danger)">ошибка: ${esc(e.message)}</div>`
    return c
  }
  const key = songKey(song), th = themeFor(song), secs = (song.length * 60) / song.bpm
  const st = STYLE_INFO[c.dataset.style]
  const tag = [entry.kind === 'generated' ? '🎲' : entry.kind === 'user' ? 'моя' : '', entry.where === 'pending' ? '⏳ не в папке' : '', st.id !== 'other' ? st.emoji : ''].filter(Boolean).join(' ')
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
