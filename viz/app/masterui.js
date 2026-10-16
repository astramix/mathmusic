// «🎛 Мастеринг» (K): the master bus of src/master.js in the player — what you hear is what export writes — with a
// preset, the loudness target of the platform (Spotify/YouTube −14, Apple −16, EBU R128 −23, club −9 LUFS; −1 dBTP),
// stereo width, the low end in mono, the glue compressor, the ceiling; and a meter: momentary / short-term /
// integrated loudness, true peak, gain reduction. The player gets the gain that should reach the target from the
// loudness of what is rendered, and corrects it once by the meter after a quarter minute; export measures the whole
// song and lands on the target within 0.05 LU (masterOffline).
import { app } from './app.js'
import { h, esc, toast } from './ui.js'
import { MASTER_PRESETS, TARGETS, MASTER_DEFAULTS } from './master.js'
import { lufs } from './loudness.js'
import { SR } from './runtime.js'

app.master = { on: false, ...MASTER_DEFAULTS }
try { Object.assign(app.master, JSON.parse(localStorage.getItem('mm.master') || '{}')) } catch {}
const save = () => { try { localStorage.setItem('mm.master', JSON.stringify(app.master)) } catch {} }
export const targetOf = m => TARGETS.find(t => t[0] === m.target) ?? TARGETS[1]
export const masterLabel = m => (m.on ? `${MASTER_PRESETS[m.preset]?.label.split(' — ')[0] ?? 'свой'} · ${targetOf(m)[2] != null ? targetOf(m)[2] + ' LUFS' : 'пик'} · ${m.ceiling} dBTP` : 'выключен')
// the chain's settings for src/master.js
export const chainParams = (m = app.master) => ({ width: m.width, monoBelow: m.monoBelow, threshold: m.threshold, ratio: m.ratio, attack: m.attack, release: m.release, ceiling: m.ceiling, knee: 6 })

let panel = null, raf = 0, drive = 0, corrected = false, song = null
// the gain to the target from what the player has rendered (its own peak normalisation included)
function estimateDrive() {
  const p = app.player, t = targetOf(app.master)[2]
  if (t == null || !p.cache?.size) return 0
  const idx = [...p.cache.keys()].sort((a, b) => a - b).slice(0, 380) // up to ~70 s
  const n = idx.reduce((s, i) => s + p.cache.get(i).L.length, 0), L = new Float32Array(n), R = new Float32Array(n), g = (0.89 / p.peak) * p.trim
  let o = 0
  for (const i of idx) { const c = p.cache.get(i); for (let k = 0; k < c.L.length; k++) (L[o + k] = c.L[k] * g), (R[o + k] = c.R[k] * g); o += c.L.length }
  const raw = lufs(L, R)
  // the compressor takes a little off; the meter corrects the rest after a while
  return Number.isFinite(raw) ? t - raw + (app.master.ratio > 1 ? 1 : 0) : 0
}
// (re)start the bus in the player with the current settings
export function applyMaster({ reset = true } = {}) {
  const p = app.player
  if (!app.master.on) { p.setMaster(null); return }
  drive = estimateDrive()
  corrected = false
  song = app.current?.id
  p.setMaster({ ...chainParams(), drive }, { reset })
}
export function toggleMaster(force) {
  app.master.on = force ?? !app.master.on
  save()
  applyMaster()
  toast(app.master.on ? `🎛 мастер-шина: ${masterLabel(app.master)}` : '🎛 мастер-шина выключена — звучит сырой микс', { ms: 3000 })
  panel?.refresh?.()
}

export function openMaster() {
  if (panel) { panel.el.remove(); cancelAnimationFrame(raf); panel = null; return }
  const m = app.master
  const on = h('input', { type: 'checkbox', checked: m.on, onchange: () => toggleMaster(on.checked) })
  const preset = h('select')
  for (const [id, p] of Object.entries(MASTER_PRESETS)) preset.append(new Option(p.label, id))
  preset.append(new Option('свой', 'custom'))
  preset.value = MASTER_PRESETS[m.preset] ? m.preset : 'custom'
  const target = h('select')
  for (const [id, label] of TARGETS) target.append(new Option(label, id))
  target.value = m.target
  const sliders = {}
  const slider = (key, label, min, max, step, fmt) => {
    const out = h('span', { class: 'mv' }), inp = h('input', { type: 'range', min, max, step, value: m[key] })
    const show = () => (out.textContent = fmt(+inp.value))
    inp.oninput = () => { m[key] = +inp.value; m.preset = 'custom'; preset.value = 'custom'; show(); save(); live() }
    show()
    sliders[key] = { inp, show }
    return h('label', { class: 'mrow' }, h('span', { class: 'ml' }, label), inp, out)
  }
  let liveT = 0
  const live = () => { clearTimeout(liveT); liveT = setTimeout(() => app.master.on && app.player.setMaster({ ...chainParams(), drive }), 60) }
  preset.onchange = () => {
    if (preset.value !== 'custom') Object.assign(m, MASTER_PRESETS[preset.value], { preset: preset.value })
    for (const [k, s] of Object.entries(sliders)) { s.inp.value = m[k]; s.show() }
    save()
    applyMaster({ reset: false })
  }
  target.onchange = () => { m.target = target.value; save(); applyMaster() }
  const meters = h('div', { class: 'mmeters' })
  const bar = (label) => {
    const fill = h('i'), val = h('span', { class: 'mv' })
    meters.append(h('div', { class: 'mrow' }, h('span', { class: 'ml' }, label), h('span', { class: 'mbar' }, fill), val))
    return { fill, val }
  }
  const M = bar('M (0.4 с)'), S = bar('S (3 с)'), I = bar('I (вся)'), TP = bar('пик TP'), GR = bar('лимитер'), CG = bar('компрессор')
  const note = h('div', { class: 'dim', style: 'font-size:11px' })
  const el = h('div', { class: 'panel masterpanel' },
    h('div', { class: 'mrow' }, h('b', {}, '🎛 Мастеринг'), h('span', { class: 'sp' }), h('button', { title: 'закрыть (K)', onclick: () => openMaster() }, '✕')),
    h('label', { class: 'mrow' }, on, 'мастер-шина в плеере — слышно то, что запишет экспорт'),
    h('div', { class: 'mrow' }, h('span', { class: 'ml' }, 'пресет'), preset),
    h('div', { class: 'mrow' }, h('span', { class: 'ml' }, 'громкость'), target),
    slider('width', 'ширина стерео', 0, 1.6, 0.05, v => `${Math.round(v * 100)} %`),
    slider('monoBelow', 'бас в моно ниже', 0, 300, 10, v => (v ? `${v} Гц` : 'выкл')),
    slider('threshold', 'компрессор, порог', -40, 0, 1, v => `${v} дБ`),
    slider('ratio', 'компрессор, ratio', 1, 6, 0.5, v => (v <= 1 ? 'выкл' : `${v}:1`)),
    slider('ceiling', 'потолок (истинный пик)', -3, -0.1, 0.1, v => `${v.toFixed(1)} dBTP`),
    meters, note)
  document.getElementById('stage').append(el)
  const show = (o, v, lo, hi, unit, warn) => {
    const ok = Number.isFinite(v)
    o.fill.style.width = `${ok ? Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)) : 0}%`
    o.fill.style.background = warn ? 'var(--danger)' : ''
    o.val.textContent = ok ? `${v.toFixed(1)} ${unit}` : '—'
  }
  const tick = () => {
    raf = requestAnimationFrame(tick)
    const r = app.player.meter, t = targetOf(m)[2]
    if (!r) return
    show(M, r.M, -40, 0, 'LUFS', t != null && r.M > t + 6)
    show(S, r.S, -40, 0, 'LUFS')
    show(I, r.I, -40, 0, 'LUFS')
    show(TP, r.tp, -30, 3, 'dBTP', r.tp > m.ceiling + 0.05)
    // gain reduction: the bar grows with it (12 dB = full)
    const red = (o, v) => { o.fill.style.width = `${Math.min(100, (v / 12) * 100)}%`; o.fill.style.background = 'var(--accent2)'; o.val.textContent = `−${v.toFixed(1)} дБ` }
    red(GR, r.gr)
    red(CG, r.comp)
    note.textContent = m.on ? `экспорт MP3/WAV/OGG и видео: ${masterLabel(m)} — точно по всей песне; стемы остаются сырыми` : 'выключено: экспорт нормализует микс к пику −1 dBFS, как раньше'
  }
  tick()
  panel = { el, refresh: () => (on.checked = app.master.on) }
}
// every frame (main.js): once a quarter minute of the song has been measured, the gain is put right by what the
// meter heard (the compressor and the limiter take some loudness the estimate can't know)
let heard = 0, last = 0
export function masterTick() {
  const m = app.master, p = app.player, t = targetOf(m)[2], now = performance.now()
  if (p.playing && !p.stalled) heard += Math.min(0.1, (now - last) / 1000)
  last = now
  if (!m.on || t == null || corrected || heard < 25 || song !== app.current?.id) return
  const I = p.meter?.I
  if (!Number.isFinite(I)) return
  corrected = true
  if (Math.abs(I - t) > 0.4) { drive += t - I; p.setMaster({ ...chainParams(), drive }) }
}
// a new song in the player: its gain to the target is measured anew once some of it is rendered
export function songChanged() {
  heard = 0
  if (app.master.on) setTimeout(() => applyMaster(), 2500)
}
app.masterTick = masterTick
app.masterSong = songChanged
if (app.master.on) setTimeout(() => app.player.node && applyMaster(), 500)
