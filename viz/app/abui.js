// A/B: two versions side by side at the same beat — the song playing and another: the original of a retuned copy, the
// saved code under your edits, or any song. B (or the buttons) switches with a 30 ms cross-fade; the beat and the
// loop stay. «Равная громкость» measures both (ITU-R BS.1770, over the loop or the half minute around the playhead)
// and turns the louder one down, so the ear judges the music, not the level.
import { app } from './app.js'
import { h, esc, toast } from './ui.js'
import { lufs } from './loudness.js'
import { SR } from './runtime.js'
import { CH } from './player.js'

let panel = null
const fmt = v => (Number.isFinite(v) ? v.toFixed(1) : '—')

// the candidates for B: the original of a copy, the saved version under a draft, the other songs
function candidates(cur) {
  const out = []
  const base = cur.entry?.base && app.lib.get(cur.entry.base)
  if (base) out.push({ id: 'base', label: `оригинал: ${base.name}`, entry: base, source: app.drafts.get(base.id) ?? base.source })
  if (app.dirty(cur)) out.push({ id: 'saved', label: 'сохранённая версия (без правок)', entry: cur.entry, source: cur.entry.source })
  for (const e of app.lib.list()) if (e.id !== cur.id && e.id !== base?.id) out.push({ id: e.id, label: e.name, entry: e, source: app.drafts.get(e.id) ?? e.source })
  return out
}

export function openAB() {
  const cur = app.current
  if (!cur?.song) return toast('сначала выбери песню')
  if (panel) { panel.remove(); panel = null }
  const cands = candidates(cur)
  const ab = (app.ab = { a: { label: cur.entry?.name ?? cur.song.name, entry: cur.entry, source: app.sourceOf(cur) }, b: cands[0], side: 'a', match: true, L: {}, trim: { a: 1, b: 1 } })
  const sel = h('select', { title: 'с чем сравнить' })
  cands.forEach((c, i) => sel.append(new Option(c.label, i)))
  sel.onchange = async () => {
    ab.b = cands[+sel.value]
    ab.L.b = undefined
    if (ab.side === 'b') await go('b', true)
    measureSoon()
  }
  const btnA = h('button', { class: 'ab-btn on', onclick: () => go('a') }, 'A'), btnB = h('button', { class: 'ab-btn', onclick: () => go('b') }, 'B')
  const match = h('input', { type: 'checkbox', checked: true, onchange: () => { ab.match = match.checked; applyTrim() } })
  const read = h('div', { class: 'ab-read dim' }, 'громкость измеряется…')
  panel = h('div', { class: 'panel abpanel' },
    h('div', { class: 'ab-row' }, h('b', {}, '⇄ A/B'), h('span', { class: 'sp' }), h('button', { title: 'закрыть (версия, что звучит, остаётся)', onclick: closeAB }, '✕')),
    h('div', { class: 'ab-row' }, btnA, h('span', { class: 'ab-name', title: ab.a.label }, ab.a.label)),
    h('div', { class: 'ab-row' }, btnB, sel),
    h('label', { class: 'ab-row', title: 'громче звучащая версия убавляется — сравнение по музыке, а не по громкости' }, match, 'равная громкость (LUFS)'),
    read,
    h('div', { class: 'dim', style: 'font-size:11px' }, 'B — переключить · такт и петля сохраняются'))
  document.getElementById('stage').append(panel)
  ab.ui = { btnA, btnB, read }
  measureSoon()
}
export function closeAB() {
  panel?.remove()
  panel = null
  app.player.setTrim(1)
  app.ab = null
}
// switch to side s (same beat, cross-faded)
export async function go(s, force = false) {
  const ab = app.ab
  if (!ab || (!force && ab.side === s)) return
  ab.side = s
  const v = ab[s]
  ab.ui.btnA.classList.toggle('on', s === 'a')
  ab.ui.btnB.classList.toggle('on', s === 'b')
  await app.open(v.entry, 0, { ab: true, source: v.source })
  applyTrim()
  measureSoon()
}
export const toggle = () => app.ab && go(app.ab.side === 'a' ? 'b' : 'a')

// the rendered audio of a version: { cache, peak }
const stateOf = source => {
  const p = app.player
  return source === p.source ? { cache: p.cache, peak: p.peak } : p.kept.get(source)
}
// the loudness of both versions over the same stretch — the loop, or up to ±15 s around the playhead — counting only
// the pieces both have rendered (at least 1.5 s of them); { a, b } in LUFS or null
function loudnessBoth(ab) {
  const p = app.player, A = stateOf(ab.a.source), B = stateOf(ab.b.source)
  if (!A || !B) return null
  const lp = p.loop, here = p.pos
  const a = lp ? lp.a : Math.max(0, here - 15 * SR), b = lp ? lp.b : here + 15 * SR
  const range = []
  for (let i = Math.floor(a / CH); i * CH < b; i++) range.push(i)
  let idx = range.filter(i => A.cache.get(i) && B.cache.get(i))
  // not enough in common yet (two different songs, B just started): each over what it has
  const own = st => range.filter(i => st.cache.get(i))
  if (idx.length < 8 && (own(A).length < 8 || own(B).length < 8)) return null
  const one = st => {
    const parts = (idx.length >= 8 ? idx : own(st)).map(i => st.cache.get(i)), n = parts.reduce((s, c) => s + c.L.length, 0), L = new Float32Array(n), R = new Float32Array(n), g = 0.89 / st.peak
    let o = 0
    for (const c of parts) { for (let i = 0; i < c.L.length; i++) (L[o + i] = c.L[i] * g), (R[o + i] = c.R[i] * g); o += c.L.length }
    return lufs(L, R)
  }
  return { a: one(A), b: one(B) }
}
let timer = 0
function measureSoon() {
  clearTimeout(timer)
  timer = setTimeout(measure, 1500)
}
function measure() {
  const ab = app.ab
  if (!ab) return
  const m = loudnessBoth(ab)
  if (m) ab.L = m
  const { a, b } = ab.L
  ab.ui.read.innerHTML = `A <b>${fmt(a)}</b> · B <b>${fmt(b)}</b> LUFS${Number.isFinite(a) && Number.isFinite(b) ? ` · разница ${esc(fmt(Math.abs(a - b)))} дБ` : ' · B измерится, когда прозвучит'}`
  applyTrim()
  if (!Number.isFinite(a) || !Number.isFinite(b)) measureSoon()
}
function applyTrim() {
  const ab = app.ab
  if (!ab) return
  const { a, b } = ab.L
  ab.trim = { a: 1, b: 1 }
  if (ab.match && Number.isFinite(a) && Number.isFinite(b)) {
    if (a > b) ab.trim.a = 10 ** ((b - a) / 20)
    else ab.trim.b = 10 ** ((a - b) / 20)
  }
  app.player.setTrim(ab.trim[ab.side])
}
