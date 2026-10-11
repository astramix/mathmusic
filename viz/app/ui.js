// Small UI kit: a desktop-style menu bar with dropdowns (and submenus), toasts with progress bars,
// modal dialogs, HTML escaping.
export const $ = id => document.getElementById(id)
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
export const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k === 'html') el.innerHTML = v
    else if (v === true) el.setAttribute(k, '')
    else if (v !== false && v != null) el.setAttribute(k, v)
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c))
  return el
}

// ---- menus -------------------------------------------------------------------------------------
// menus: [{ label, items: () => [item | '-' | { header }] }]
// item: { label, icon, kbd, note, action(), checked: bool | () => bool, disabled, items: () => [...] (submenu) }
let openMenus = [], openBtn = null
const val = v => (typeof v === 'function' ? v() : v)
export function closeMenus() {
  openMenus.forEach(m => m.remove())
  openMenus = []
  openBtn?.classList.remove('open')
  openBtn = null
}
async function showMenu(items, x, y, depth = 0) {
  const list = await val(items) // a menu may be built lazily (a module loading)
  openMenus.slice(depth).forEach(m => m.remove())
  openMenus = openMenus.slice(0, depth)
  const el = h('div', { class: 'menu' })
  for (const it of list) {
    if (it === '-') { el.append(h('div', { class: 'sep' })); continue }
    if (it.header) { el.append(h('div', { class: 'hd' }, it.header)); continue }
    if (it.html) { el.append(h('div', { class: 'note', html: it.html })); continue }
    const checked = val(it.checked)
    const row = h('div', { class: 'it' + (val(it.disabled) ? ' dis' : '') },
      h('span', { class: 'ic' }, checked === true ? '✓' : checked === false ? '' : it.icon ?? ''),
      h('span', {}, val(it.label)),
      h('span', { class: it.items ? 'sub' : 'k' }, it.items ? '▸' : it.kbd ?? ''))
    if (it.items) {
      const open = () => {
        el.querySelectorAll('.it.hot').forEach(r => r.classList.remove('hot'))
        row.classList.add('hot')
        const r = row.getBoundingClientRect()
        showMenu(it.items, r.right - 4, r.top - 6, depth + 1)
      }
      row.addEventListener('mouseenter', open)
      row.addEventListener('click', open)
    } else {
      row.addEventListener('mouseenter', () => openMenus.slice(depth + 1).forEach(m => m.remove()))
      row.addEventListener('click', () => {
        closeMenus()
        it.action?.()
      })
    }
    el.append(row)
    if (it.note) el.append(h('div', { class: 'note' }, it.note))
  }
  document.body.append(el)
  const r = el.getBoundingClientRect()
  el.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 6)) + 'px'
  el.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 6)) + 'px'
  openMenus.push(el)
  return el
}
export function contextMenu(items, x, y) {
  closeMenus()
  showMenu(items, x, y)
}
export function menubar(nav, menus) {
  for (const m of menus) {
    const b = h('button', { class: 'mbtn' }, m.label)
    const open = () => {
      closeMenus()
      openBtn = b
      b.classList.add('open')
      const r = b.getBoundingClientRect()
      showMenu(m.items, r.left, r.bottom + 4)
    }
    b.addEventListener('click', e => {
      e.stopPropagation()
      openBtn === b ? closeMenus() : open()
    })
    b.addEventListener('mouseenter', () => openBtn && openBtn !== b && open())
    nav.append(b)
  }
  addEventListener('mousedown', e => {
    if (!e.target.closest('.menu, .mbtn')) closeMenus()
  })
  addEventListener('keydown', e => e.key === 'Escape' && closeMenus())
}

// ---- toasts ------------------------------------------------------------------------------------------
export function toast(text, { kind = '', ms = 3500, progress = false } = {}) {
  const el = h('div', { class: 'toast ' + kind }, h('div', { class: 'tx' }, text))
  let bar = null
  if (progress) el.append(h('div', { class: 'bar' }, (bar = h('i'))))
  $('toasts').append(el)
  const close = () => {
    el.style.transition = 'opacity .3s'
    el.style.opacity = 0
    setTimeout(() => el.remove(), 300)
  }
  if (!progress && ms) setTimeout(close, ms)
  return {
    set: (t, p) => {
      if (t != null) el.querySelector('.tx').textContent = t
      if (bar && p != null) bar.style.width = `${Math.round(100 * p)}%`
    },
    close,
    done: (t, k = 'ok') => {
      el.className = 'toast ' + k
      el.querySelector('.tx').textContent = t
      bar?.parentElement.remove()
      setTimeout(close, 4000)
    },
  }
}

// ---- modal --------------------------------------------------------------------------------------------
// modal(title, body: Node | html, buttons: [{label, primary, action(close) → false keeps it open}])
export function modal(title, body, buttons = [{ label: 'OK', primary: true }]) {
  const box = h('div', { class: 'modal' }, h('h2', {}, title))
  if (typeof body === 'string') box.append(h('div', { html: body }))
  else box.append(body)
  const bg = h('div', { class: 'modal-bg' }, box)
  const close = () => {
    bg.remove()
    removeEventListener('keydown', onKey, true)
  }
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
  }
  addEventListener('keydown', onKey, true)
  const row = h('div', { class: 'btns' })
  for (const b of buttons) {
    row.append(h('button', {
      class: b.primary ? 'primary' : '',
      onclick: async () => {
        if ((await b.action?.(close)) !== false) close()
      },
    }, b.label))
  }
  box.append(row)
  bg.addEventListener('mousedown', e => e.target === bg && close())
  document.body.append(bg)
  return { close, box }
}
// A segmented control: seg(['a','b'], 'a', v => …) → element; el.value
export function seg(options, value, onchange) {
  const el = h('span', { class: 'seg' })
  el.value = value
  for (const o of options) {
    const [v, label] = Array.isArray(o) ? o : [o, o]
    const b = h('button', { class: v === value ? 'on' : '' }, label)
    b.onclick = () => {
      el.value = v
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
      onchange?.(v)
    }
    el.append(b)
  }
  return el
}
export function download(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }))
  const a = h('a', { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
