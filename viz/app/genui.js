// The 🎲 menu: a new song in a style, mutations of the current generated song (new melodies / new
// arrangement / new instruments, everything else kept), the endless radio and the generation
// dialog. Generated songs land in "Сгенерированные" (files in generated/, the last 20); Ctrl+S moves one to my_songs/.
import { app } from './app.js'
import { h, esc, toast, modal, seg } from './ui.js'
import { generate, STYLES, STYLE_LIST, describe, METER_LIST, styleGroups, familyOf } from './generate.js'
import { MELODIES } from './melodies.js'
import { keyLabel, parseKey } from './theory.js'
import { MODE_GROUPS, keyFor, tonalityLabel } from './modes.js'
import { TEMPERAMENTS, temperOf } from './tuning.js'
import { retuneSource, retunePlan } from './retune.js'
import { isProject, retuneProject } from './project.js'
import { modeOf } from './modes.js'
import { themeFor } from './themes.js'
import * as acorn from './acorn.js'
import { shelfOf } from './library.js'
import { audioStyleDialog, audioStyles, forgetStyle } from './audiostyleui.js'

const newSeed = () => 1 + Math.floor(Math.random() * 999998)
const KEEP = 20 // songs kept in generated/: the 21st new one takes the place of the oldest
let last = { style: 'lofi', length: 'normal', key: null, bpm: null, sources: null }
try { Object.assign(last, JSON.parse(localStorage.getItem('mm.gen') || '{}')) } catch {}
const remember = () => { try { localStorage.setItem('mm.gen', JSON.stringify(last)) } catch {} }

export const radio = { on: false, style: 'same', next: () => radioNext() }
app.radio = radio

const genOf = () => app.current?.song?.generator ?? null

// from: the beat to start at (the same music in another mode goes on where it was)
// keep generated/ to the last KEEP after a new song (🎲 or a copy in another mode) went in: the oldest goes — never
// one saved with Ctrl+S, renamed or copied (those are in my_songs/) or one with unsaved edits; the one playing is
// about to give way to the new one anyway
async function tidy(entry) {
  const old = app.lib.list().filter(e => shelfOf(e) === 'gen' && !app.drafts.has(e.id) && e.id !== entry.id)
  for (const e of old.slice(KEEP - 1)) await app.lib.remove(e.id, { pick: false }).catch(() => {}) // the folder isn't connected: next time
  app.refreshSongList()
}

async function create(opts,{ save = true, quiet = false, from = 0 } = {}) {
  // the tonality chosen in «Лады» / the key menu, unless the call brings its own key (a mutation keeps the song's)
  if (app.tonality && !('key' in opts)) opts = { ...opts, key: keyFor(app.tonality.tonic, app.tonality.mode), mode: app.tonality.mode }
  // the tuning chosen in «Строй», unless the call brings its own (a mutation keeps the song's)
  if (app.temperament && !('temperament' in opts)) opts = { ...opts, temperament: app.temperament }
  // new songs modulate (the dialog can say no); a song made again keeps what it had (older ones: none)
  if (!('modulations' in opts)) opts = { ...opts, modulations: last.modulations ?? true }
  for (const k of ['key', 'mode', 'temperament', 'micro', 'modulations', 'meter']) if (opts[k] == null) delete opts[k]
  const t = quiet ? null : toast(`${opts.styleDef?.emoji ?? STYLES[opts.style]?.emoji ?? '🎲'} сочиняю…`, { progress: true })
  await new Promise(r => setTimeout(r, 30))
  let res
  try {
    res = generate({ length: last.length, ...opts, seed: opts.seed ?? newSeed() })
  } catch (e) {
    console.error(e)
    t?.done('не получилось: ' + e.message, 'err')
    return
  }
  const { source, meta } = res
  let entry = { id: 'radio:' + Date.now().toString(36), name: meta.title, source, kind: 'generated', meta, pristine: true }
  if (save) {
    entry = await app.lib.save({ name: meta.title, source, kind: 'generated', meta, pristine: true }, { pick: !quiet })
    await tidy(entry)
  }
  await app.open(entry, from)
  t?.done(describe(meta) + (!save ? '' : entry.where === 'disk' ? ` · ${entry.shelf === 'gen' ? 'generated' : 'my_songs'}/${entry.file}` : ' · ⏳ ждёт папку проекта (Песня → Подключить)'), 'ok')
  return meta
}

export async function mutate(which) {
  const g = genOf()
  if (!g) return toast('это не сгенерированная песня — сначала 🎲 «Новая песня в стиле…»')
  const seeds = { ...g.seeds, [which]: newSeed() }
  const label = { melody: '🔁 новые мелодии', arrangement: '🎚 новая аранжировка', instruments: '🎻 новые инструменты' }[which]
  toast(label + '…', { ms: 1500 })
  return create({ style: g.style, seed: g.seed, length: g.length, key: g.key ?? null, mode: g.mode ?? null, micro: g.micro ?? null, temperament: g.temperament ?? null, modulations: g.modulations ?? false, meter: g.meter ?? null, ...(g.userTheme ? { userTheme: g.userTheme } : {}), ...(g.styleDef ? { styleDef: g.styleDef } : {}), ...seeds })
}
// the current generated song again — the same seeds, in another tonic and mode
export function regenerate(t, { from = 0 } = {}) {
  const g = genOf()
  if (!g) return toast('пересочинить можно только сгенерированную песню — 🎲 «Новая песня в этом ладу»')
  toast(`↻ ${g.style} · seed ${g.seed} → ${t.tonic} …`, { ms: 1500 })
  return create({ style: g.style, seed: g.seed, length: g.length, ...g.seeds, key: keyFor(t.tonic, t.mode), mode: t.mode, micro: g.micro ?? null, temperament: 'temperament' in t ? t.temperament : g.temperament ?? null, modulations: g.modulations ?? false, meter: g.meter ?? null, ...(g.userTheme ? { userTheme: g.userTheme } : {}), ...(g.styleDef ? { styleDef: g.styleDef } : {}) }, { from })
}
// the music playing now, in another tonic and mode, going on from the same beat (paused stays paused): a generated
// song is made again from its seeds; any other — a built-in one too — becomes a retuned copy (src/retune.js: every
// note to the same degree of the new mode, then to the new tonic; modulations kept). Both wait in generated/ until Ctrl+S
export async function sameIn(t) {
  const cur = app.current, p = app.player
  if (!cur?.song) return toast('сначала выбери песню')
  const was = p.playing, from = p.x
  const src = app.sourceOf(cur), proj = isProject(src) // a project's notes are data: moved note by note (src/project.js)
  if (cur.song.generator && !proj) await regenerate(t, { from })
  else {
    let r
    try {
      r = proj ? retuneProject(src, cur.song, t, { parse: acorn.parse, theme: themeFor(cur.song).id, retunePlan, retuneSource, modeOf })
        : retuneSource(src, cur.song, t, { parse: acorn.parse, theme: themeFor(cur.song).id })
    } catch (e) {
      console.error(e)
      return toast('не получилось перенести: ' + e.message, { kind: 'err', ms: 8000 })
    }
    const base = cur.entry?.kind === 'builtin' ? cur.id : cur.entry?.base
    const entry = await app.lib.save({ name: r.name, source: r.source, kind: 'user', base, pristine: true }, { pick: true })
    await tidy(entry)
    await app.open(entry, from)
    const mods = r.plan.sect.length > 1 ? ` · модуляции сохранены (${r.plan.sect.length - 1})` : ''
    toast(`🎼 ${r.name}${mods}${entry.where === 'disk' ? ` · generated/${entry.file} — Ctrl+S сохранит в «Мои»` : ' · ⏳ ждёт папку проекта'}`, { kind: 'ok', ms: 6000 })
  }
  if (!was && p.playing) await p.pause()
}
// a new song in a tonality: the style of the current generated song, else the last one used
// a melody played or drawn in the piano roll → a whole song in a style, the melody as theme A (harmonized)
export const fromMelody = (notes, style, title) => create({ style, userTheme: { notes, title } })
export const createIn = t => create({ style: genOf()?.style ?? last.style, key: keyFor(t.tonic, t.mode), mode: t.mode })
// the same music in another tuning: a target with the song's own tonic and mode (modesui.js) and a temperament

async function radioNext() {
  const g = genOf()
  const style = radio.style === 'all' || !g ? STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)].id : g.style
  const meta = await create(radio.style !== 'all' && g?.styleDef ? { styleDef: g.styleDef } : { style }, { save: false, quiet: true })
  if (meta) toast(`📻 ${describe(meta)}`, { ms: 6000 })
}
function toggleRadio(style) {
  radio.on = style ? true : !radio.on
  if (style) radio.style = style
  toast(radio.on ? `📻 радио: после песни — новая ${radio.style === 'all' ? 'в случайном стиле' : 'в том же стиле'}` : '📻 радио выключено', { ms: 3000 })
  if (radio.on && !genOf()) radioNext()
}

export function menuItems() {
  const g = genOf()
  return [
    { header: 'Новая песня в стиле…' },
    // a submenu per family, the most finished first
    ...styleGroups().map(f => ({ icon: f.emoji, label: f.label, note: f.about, items: () => f.list.map(s => ({ icon: s.emoji, label: s.label, checked: s.id === last.style, action: () => { last.style = s.id; remember(); create({ style: s.id }) } })) })),
    { icon: '🎲', label: 'Случайный стиль', action: () => create({ style: STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)].id }) },
    // styles made from audio files (src/audiostyle.js): kept in this browser, each song carries its own
    { icon: '🎧', label: 'Стили из аудио', note: 'стиль по вашему аудиофайлу: темп, свинг, тональность, гармония, форма, ритм, звуки ударных, тембры', items: () => [
      { icon: '📂', label: 'Новый стиль из аудиофайла…', action: () => audioStyleDialog(create) },
      ...audioStyles().map(s => ({ icon: '🎧', label: s.label.replace(/^🎧 /, ''), note: `${s.source?.bpm ?? ''} BPM · ${s.source?.key ?? ''}`, items: () => [
        { icon: '🎲', label: 'Сочинить песню', action: () => create({ styleDef: s }) },
        { icon: '🗑', label: 'Удалить стиль', action: () => { forgetStyle(s.id); toast(`стиль «${s.label}» удалён (песни в нём остаются)`) } },
      ] })),
    ] },
    '-',
    { header: g ? `Эта песня: ${g.styleDef ? g.styleDef.label : `${STYLES[g.style]?.emoji ?? ''} ${STYLES[g.style]?.label ?? g.style}`} · seed ${g.seed}` : 'Мутации — для сгенерированной песни' },
    { icon: '🔁', label: 'Ещё такую же, но другую', kbd: 'M', disabled: !g, action: () => mutate('melody'), note: 'те же аранжировка, тональность и инструменты — новые мелодии' },
    { icon: '🎚', label: 'Другая аранжировка', disabled: !g, action: () => mutate('arrangement'), note: 'тональность, темп, форма — мелодии и инструменты те же' },
    { icon: '🎻', label: 'Другие инструменты', disabled: !g, action: () => mutate('instruments') },
    '-',
    { label: '📻 Радио — бесконечно, тот же стиль', checked: radio.on && radio.style === 'same', action: () => (radio.on && radio.style === 'same' ? toggleRadio() : toggleRadio('same')) },
    { label: '📻 Радио — все стили вперемешку', checked: radio.on && radio.style === 'all', action: () => (radio.on && radio.style === 'all' ? toggleRadio() : toggleRadio('all')) },
    '-',
    { icon: '⚙', label: 'Параметры генерации…', action: dialog },
    { html: 'Мелодии берутся из песен проекта вместе с их гармонией, переносятся в новую тональность и лад, варьируются или сочиняются заново по правилам голосоведения.' },
  ]
}

// ---- the dialog ---------------------------------------------------------------------------------------
function dialog() {
  const box = h('div')
  const style = h('select')
  for (const f of styleGroups()) style.append(h('optgroup', { label: `${f.emoji} ${f.label}` }, ...f.list.map(s => new Option(`${s.emoji} ${s.label}`, s.id))))
  style.value = last.style
  const key = h('select')
  key.append(new Option('авто — из стиля', ''))
  for (const m of ['major', 'minor']) for (const t of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
    const k = parseKey(t + (m === 'minor' ? 'm' : ''))
    key.append(new Option(keyLabel(k), t + (m === 'minor' ? 'm' : '')))
  }
  key.value = last.key ?? ''
  const mode = h('select')
  mode.append(new Option('авто — мажор / минор', ''))
  for (const g of MODE_GROUPS) {
    const og = h('optgroup', { label: g.label })
    for (const m of g.modes) og.append(new Option(m.name, m.id))
    mode.append(og)
  }
  mode.value = last.mode ?? ''
  const temper = h('select')
  for (const t of TEMPERAMENTS) temper.append(new Option(t.name + (t.alt ? ` — ${t.alt}` : ''), t.id === 'equal' ? '' : t.id))
  temper.value = last.temperament ?? app.temperament ?? ''
  const micro = seg([['', 'нет'], ['quarter', '¼ тона'], ['eighth', '⅛ тона']], last.micro ?? '', v => (last.micro = v || null))
  const mods = h('input', { type: 'checkbox', checked: last.modulations ?? true })
  const meterSel = h('select')
  for (const [id, label] of METER_LIST) meterSel.append(new Option(label, id))
  meterSel.value = last.meter ?? '4/4'
  const bpm = h('input', { type: 'number', min: 40, max: 220, placeholder: 'авто', value: last.bpm ?? '', style: 'width:90px' })
  const length = seg([['short', '≈ 1.5 мин'], ['normal', '≈ 2.5 мин'], ['long', '≈ 3.5 мин']], last.length, v => (last.length = v))
  const seed = h('input', { type: 'number', min: 1, value: newSeed(), style: 'width:110px' })
  const reroll = h('button', { onclick: () => (seed.value = newSeed()) }, '🎲')
  const songs = [...new Set(MELODIES.map(m => m.from))]
  const srcBoxes = songs.map(s => {
    const cb = h('input', { type: 'checkbox', checked: !last.sources || last.sources.includes(s) })
    return [s, cb, h('label', { style: 'display:inline-flex;gap:4px;align-items:center;margin-right:10px' }, cb, s)]
  })
  const info = h('div', { class: 'dim' })
  const describeStyle = () => {
    const S = STYLES[style.value]
    const F = familyOf(style.value)
    info.innerHTML = `${F.emoji} ${esc(F.label)} — ${esc(F.about)}<br>` + (S.about ? `${esc(S.label)}: ${S.bpm[0]}–${S.bpm[1]} BPM · ${esc(S.about)}` : `${esc(S.label)}: ${S.bpm[0]}–${S.bpm[1]} BPM · тональности ${S.keys.join(', ')} · лид: ${S.lead.join(' / ')} · аккорды: ${S.chords.join(' / ')} · бас: ${S.bass.join(' / ')} · барабаны: ${S.kit}`)
  }
  style.onchange = describeStyle
  describeStyle()
  box.append(
    h('div', { class: 'row' }, h('label', {}, 'Стиль'), style),
    info,
    h('div', { class: 'row' }, h('label', {}, 'Тональность'), key),
    h('div', { class: 'row' }, h('label', {}, 'Лад'), mode, h('span', { class: 'dim' }, 'тоника — из тональности')),
    h('div', { class: 'row' }, h('label', {}, 'Строй'), temper, h('span', { class: 'dim' }, 'как звучат 12 нот: темперации, чистый строй')),
    h('div', { class: 'row' }, h('label', {}, 'Микротоны'), micro, h('span', { class: 'dim' }, 'мелодии в четвертях или восьмых тона')),
    h('div', { class: 'row' }, h('label', {}, 'Размер'), meterSel, h('span', { class: 'dim' }, 'кроме битв, EDM, диско и конвейеров: у них бочка на каждую долю')),
    h('div', { class: 'row' }, h('label', {}, 'Модуляции'), h('label', { style: 'display:inline-flex;gap:6px;align-items:center' }, mods, 'тема II и бридж в других тональностях'), h('span', { class: 'dim' }, 'через общий аккорд, Ум7, одноимённую, медианту')),
    h('div', { class: 'row' }, h('label', {}, 'Темп, BPM'), bpm),
    h('div', { class: 'row' }, h('label', {}, 'Длина'), length),
    h('div', { class: 'row' }, h('label', {}, 'Seed'), seed, reroll, h('span', { class: 'dim' }, 'одинаковый seed — одинаковая песня')),
    h('div', { class: 'row' }, h('label', {}, 'Мелодии из'), h('div', {}, ...srcBoxes.map(s => s[2]))),
  )
  modal('🎲 Новая песня', box, [{ label: 'Отмена' }, {
    label: 'Сочинить', primary: true, action: () => {
      const sources = srcBoxes.filter(s => s[1].checked).map(s => s[0])
      last = { style: style.value, length: length.value, key: key.value || null, mode: mode.value || null, bpm: +bpm.value || null, sources: sources.length === songs.length ? null : sources, temperament: temper.value || null, micro: last.micro || null, modulations: mods.checked, meter: meterSel.value === '4/4' ? null : meterSel.value }
      remember()
      create({ style: last.style, key: last.key ?? null, mode: last.mode ?? null, bpm: last.bpm ?? undefined, seed: +seed.value || newSeed(), sources: last.sources ?? undefined, length: last.length, temperament: last.temperament, micro: last.micro, modulations: last.modulations, meter: last.meter ?? undefined })
    },
  }])
}
