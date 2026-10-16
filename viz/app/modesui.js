// «Лады» and «Тональность», side by side on the right: a tonic and a mode (src/modes.js), or auto (each song keeps
// its own). Choosing one never stops the music; it asks what to do with it: the same music in it now (a generated
// song made again from its seeds, any other — built-in too — a retuned copy, src/retune.js; it goes on from the same
// beat) or the next music in it (🎲 makes new songs in it). Every mode has a card: what it is, its steps and degrees,
// its notes spelt on the tonic, the triads on its degrees, and it plays.
import { app } from './app.js'
import { h, esc, toast, modal } from './ui.js'
import { MODE_GROUPS, MODES, modeOf, KEYS, signature, spellScale, stepFormula, degreeFormula, modeTriads, tonalityLabel, tonicPc } from './modes.js'
import { keyLabel } from './theory.js'
import { sameIn } from './genui.js'

const TONICS = ['C', 'C♯', 'D♭', 'D', 'D♯', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'G♯', 'A♭', 'A', 'A♯', 'B♭', 'B', 'C♭']
app.tonality = null // { tonic: 'D', mode: 'dorian' } | null = auto
try { app.tonality = JSON.parse(localStorage.getItem('mm.tonality') || 'null') } catch {}
const listeners = new Set()
export const onTonality = f => (listeners.add(f), f(app.tonality))
export function setTonality(t, { quiet = false } = {}) {
  app.tonality = t
  try { localStorage.setItem('mm.tonality', JSON.stringify(t)) } catch {}
  listeners.forEach(f => f(t))
  if (quiet) return
  toast(t ? `🎲 следующая музыка — ${tonalityLabel(t)}` : '🎼 тональность: авто — как задумано в каждой песне', { ms: 4000 })
}
// a tonality was picked: the same music in it now, or the next music in it — the music keeps playing meanwhile
export function offer(t) {
  const label = tonalityLabel(t), cur = app.current
  const now = cur?.song ? `«${esc(cur.entry?.name ?? cur.song.name)}»${cur.key ? ` · ${esc(keyLabel(cur.key))}${cur.song.mode && MODES[cur.song.mode] ? ` (${esc(MODES[cur.song.mode].name.toLowerCase())})` : ''}` : ''}` : ''
  const how = !cur?.song ? '' : cur.song.generator
    ? 'Сгенерированная песня сочинится заново с теми же зёрнами — мелодии, аранжировка и инструменты те же.'
    : `Получится копия в «Сгенерированные» (Ctrl+S сохранит её в «Мои»): каждая нота встанет на ту же ступень нового лада${cur.entry?.kind === 'builtin' ? ', встроенная песня не изменится' : ''}; модуляции внутри песни сохранятся.`
  modal(`🎼 ${label}`, `${now ? `<p>Сейчас: ${now}</p>` : ''}<p class="dim">${how}</p>`, [
    { label: 'Отмена' },
    { label: `🎲 Следующая музыка → ${label}`, action: () => setTonality(t) },
    ...(cur?.song ? [{ label: `↻ Эта же музыка → ${label}`, primary: true, action: () => sameIn(t) }] : []),
  ])
}
const tonicNow = () => app.tonality?.tonic ?? (app.current?.key ? keyLabel(app.current.key).split(' ')[0] : 'C')

// ---- sound: a little additive keyboard for the cards ----------------------------------------------------------
let ctx = null
function playNotes(list) { // [[when s, midi, length s], …]
  ctx ??= new AudioContext()
  const t0 = ctx.currentTime + 0.05, out = ctx.createGain()
  out.gain.value = 0.22
  out.connect(ctx.destination)
  for (const [at, n, d] of list) {
    const f = 440 * 2 ** ((n - 69) / 12), g = ctx.createGain()
    g.gain.setValueAtTime(0, t0 + at)
    g.gain.linearRampToValueAtTime(0.5, t0 + at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + at + d + 0.6)
    g.connect(out)
    for (const [mul, a] of [[1, 1], [2, 0.3], [3, 0.12]]) {
      const o = ctx.createOscillator(), og = ctx.createGain()
      o.frequency.value = f * mul
      og.gain.value = a
      o.connect(og).connect(g)
      o.start(t0 + at)
      o.stop(t0 + at + d + 0.7)
    }
  }
}
const base = tonic => 60 + tonicPc(tonic) - (tonicPc(tonic) > 6 ? 12 : 0) // the tonic between F♯3 and F4
const playScale = (tonic, iv) => {
  const b = base(tonic), up = [...iv, 12].map(v => b + v), down = [...up].reverse().slice(1)
  playNotes([...up, ...down].map((n, i) => [i * 0.28, n, 0.3]))
}
const playChords = (tonic, iv) => {
  const b = base(tonic)
  playNotes([...iv, 12].flatMap((v, i) => {
    const deg = i % 7, note = k => b + iv[(deg + k) % 7] + 12 * Math.floor((deg + k) / 7) + (i === 7 ? 12 : 0)
    return [0, 2, 4].map(k => [i * 0.75, note(k), 0.7])
  }))
}

// ---- the card of a mode ---------------------------------------------------------------------------------------------
export function modeCard(id, tonicIn = tonicNow()) {
  const m = modeOf(id)
  let tonic = tonicIn
  const body = h('div', { class: 'modecard' })
  const sel = h('select', { title: 'тоника' })
  for (const t of TONICS) sel.append(new Option(t, t))
  sel.value = TONICS.includes(tonic) ? tonic : 'C'
  const notes = h('div', { class: 'notes' }), chords = h('div', { class: 'chords' })
  const render = () => {
    const names = spellScale(tonic, m.iv)
    notes.replaceChildren(...names.map((n, i) => h('span', { class: 'note' + (i === 0 ? ' tonic' : '') }, n)))
    const tri = modeTriads(m.iv)
    chords.replaceChildren(...(tri.length ? [h('div', { class: 'dim' }, 'Трезвучия на ступенях:'), h('div', { class: 'row' }, ...tri.map(c => h('span', { class: 'chord', title: c.q === '?' ? 'не терцовое трезвучие' : '' },
      h('b', {}, c.roman), ' ', names[c.i] + { '': '', m: 'm', '°': '°', '+': '+', '?': '(?)' }[c.q])))] : [h('div', { class: 'dim' }, m.iv.length < 7 ? 'Лад из ' + m.iv.length + ' ступеней: аккорды берутся из соседнего мажора/минора, мелодия — только по этим нотам.' : 'Многоступенный лад: генератор берёт ближайшие ноты лада.')]))
  }
  sel.onchange = () => { tonic = sel.value; render() }
  render()
  body.append(
    h('div', { class: 'alt' }, m.alt ? `Ещё называют: ${m.alt}` : ''),
    h('p', { class: 'short' }, m.short),
    h('p', {}, m.text),
    h('div', { class: 'row' }, h('span', { class: 'dim' }, 'Тоника'), sel,
      h('button', { onclick: () => playScale(tonic, m.iv) }, '▶ гамма'),
      m.iv.length === 7 ? h('button', { onclick: () => playChords(tonic, m.iv) }, '▶ аккорды') : ''),
    notes,
    h('div', { class: 'formula' }, h('span', { class: 'dim' }, 'Шаги: '), stepFormula(m.iv), h('span', { class: 'dim' }, '   ступени: '), degreeFormula(m.iv)),
    chords,
  )
  const name = () => tonalityLabel({ tonic, mode: id })
  let dlg = null
  const go = h('button', { class: 'primary', onclick: () => (dlg?.close(), sameIn({ tonic, mode: id })) }), next = h('button', { onclick: () => (dlg?.close(), setTonality({ tonic, mode: id })) })
  const relabel = () => { go.textContent = `↻ Эта же музыка → ${name()}`; next.textContent = `🎲 Следующая музыка → ${name()}` }
  sel.addEventListener('change', relabel)
  relabel()
  if (!app.current?.song) go.style.display = 'none'
  body.append(h('div', { class: 'row actions' }, next, go))
  dlg = modal(`${m.name}`, body, [{ label: 'Закрыть' }])
}

// ---- the menus ---------------------------------------------------------------------------------------------------
const songLine = () => {
  const s = app.current?.song
  if (!s) return null
  return { header: `В песне: ${s.mode && MODES[s.mode] ? `${keyLabel(app.current.key).split(' ')[0]} ${MODES[s.mode].name.toLowerCase()}` : keyLabel(app.current.key)}` }
}
export function modeItems() {
  const cur = app.tonality
  return [
    { header: cur ? `Выбрано: ${tonalityLabel(cur)}` : 'Выбрано: авто' },
    ...[songLine()].filter(Boolean),
    { label: 'Авто — лад каждой песни', checked: () => !app.tonality, action: () => setTonality(null) },
    '-',
    ...MODE_GROUPS.map(g => ({
      label: g.label,
      items: () => [{ header: g.label }, ...g.modes.map(m => ({ label: m.name, note: m.short, checked: cur?.mode === m.id ? true : undefined, action: () => modeCard(m.id) }))],
    })),
    '-',
    { html: 'Клик по ладу — карточка: ноты, шаги, аккорды, ▶ послушать; оттуда — эта же музыка в нём (любая песня, встроенная тоже — копией) или следующая.' },
  ]
}
export function keyItems() {
  const cur = app.tonality, custom = cur && !['major', 'minor', 'ionian', 'aeolian'].includes(cur.mode)
  const item = ([name, tonic, mode, sig]) => ({
    label: `${tonic} ${mode === 'major' ? 'мажор' : 'минор'}`, kbd: signature(sig),
    checked: cur?.tonic === tonic && cur?.mode === mode ? true : undefined, action: () => offer({ tonic, mode }),
  })
  return [
    ...[songLine()].filter(Boolean),
    { label: 'Авто — тональность песни', checked: () => !app.tonality, action: () => setTonality(null) },
    ...(custom ? ['-', { header: `Тоника для лада «${modeOf(cur.mode).name}»` }, { label: 'выбрать…', items: () => TONICS.map(t => ({ label: `${t} ${modeOf(cur.mode).name.toLowerCase()}`, checked: cur.tonic === t ? true : undefined, action: () => offer({ tonic: t, mode: cur.mode }) })) }] : []),
    '-', { header: 'Мажор — по квинтовому кругу' },
    ...KEYS.filter(k => k[2] === 'major').map(item),
    '-', { header: 'Минор — по квинтовому кругу' },
    ...KEYS.filter(k => k[2] === 'minor').map(item),
    '-',
    { icon: '🎼', label: 'Лады этой тоники…', disabled: !cur, action: () => modeCard(cur?.mode ?? 'major', cur?.tonic) },
  ]
}
export const keyButtonLabel = t => (t ? `🎼 ${tonalityLabel(t)}` : '🎼 Тональность: авто')
