// The gallery: every song as a card with its cover — the song's own graph, all of it, drawn from
// graph(x) like graph.png — key, tempo, length. "▶ оживить все" sets every cover playing at once
// (each one scrolling through its song at its own tempo): all the songs at the same time.
import { app } from './app.js'
import { h, esc } from './ui.js'
import { themeFor } from './themes.js'
import { songKey, keyLabel } from './theory.js'
import { trackList } from './runtime.js'

let el = null, alive = false, raf = 0
const covers = []

export function openGallery() {
  if (el) return closeGallery()
  alive = false
  el = h('div', { class: 'gallery' })
  const animate = h('button', { onclick: () => { alive = !alive; animate.classList.toggle('on', alive); animate.textContent = alive ? '⏸ остановить' : '▶ оживить все' } }, '▶ оживить все')
  el.append(
    h('button', { class: 'close', onclick: closeGallery, title: 'закрыть (Esc, G)' }, '✕'),
    h('h2', {}, 'Все песни'),
    h('div', { class: 'sub' }, 'клик — открыть и играть · ', animate),
  )
  const grid = h('div', { class: 'grid' })
  el.append(grid)
  document.body.append(el)
  covers.length = 0
  const list = app.lib.list()
  let i = 0
  // build the cards a few at a time so the page stays responsive
  const step = () => {
    if (!el) return
    for (let k = 0; k < 3 && i < list.length; k++, i++) grid.append(card(list[i]))
    if (i < list.length) setTimeout(step, 0)
  }
  step()
  addEventListener('keydown', onKey, true)
  const loop = t => {
    raf = requestAnimationFrame(loop)
    if (alive) for (const c of covers) c.draw(t / 1000)
  }
  raf = requestAnimationFrame(loop)
}
function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); closeGallery() }
}
export function closeGallery() {
  el?.remove()
  el = null
  cancelAnimationFrame(raf)
  removeEventListener('keydown', onKey, true)
}

function card(entry) {
  const cv = h('canvas', { width: 520, height: 240 })
  const meta = h('div', { class: 'meta' })
  const c = h('div', { class: 'card', title: entry.name }, cv, meta)
  c.onclick = async () => {
    closeGallery()
    await app.open(entry.id ?? entry)
  }
  let song = null
  try {
    song = app.rt.load(entry.source).song
  } catch (e) {
    meta.innerHTML = `<b>${esc(entry.name)}</b><div class="d" style="color:var(--danger)">ошибка: ${esc(e.message)}</div>`
    return c
  }
  const key = songKey(song), th = themeFor(song), secs = (song.length * 60) / song.bpm
  const tag = entry.kind === 'generated' ? '🎲' : entry.kind === 'user' ? 'моя' : ''
  meta.innerHTML = `<b>${esc(song.name)}</b>${tag ? `<span class="tag">${tag}</span>` : ''}<div class="d">${keyLabel(key)} · ${song.bpm} BPM · ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} · ${trackList(song).length} дорожек</div>`
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
  covers.push({ draw: t => { const x = ((t * song.bpm) / 60) % song.length; paint(Math.max(0, x - 6), 16) } })
  c.onmouseleave = () => !alive && paint(0, song.length)
  return c
}
