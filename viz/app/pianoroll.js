// The piano roll: finds the melody arrays of the song — any `const NAME = [[beat, n, length], …]`
// — and lets you draw them with the mouse. Every change rewrites that array in the code, so the
// song plays the new melody at once.
//   click — a note (length = the last one used) · drag on empty space — select by area (Ctrl: add to it) · Ctrl+A — all
//   drag a note — move (the selected ones together) · drag the right edge — length · right click / double click / Del —
//   delete · ↑↓ — a row (Shift: octave) · ←→ — by the grid · Alt+↑↓ — louder / softer
//   wheel — scroll · Ctrl+wheel — zoom · Shift — no snapping
//   A project track has a velocity lane at the bottom: drag a stem (a selected one moves all selected), or paint across.
//   Drum tracks: a row is a drum (General MIDI), so their pitch grid is whole notes only; nothing transposes them.
//   🎹 играть — a MIDI keyboard (Web MIDI; pitch bend ±2 semitones makes quarter and eighth tones on those pitch grids) or
//   the computer's keys (A W S E D F T G Y H U J K O L P = C … E′, Z / X an octave down / up, Shift = one step of the pitch
//   grid higher: E𝄳 on the ¼-tone grid); ⏺ запись — while the song plays, notes land on its beats (snapped to the grid);
//   paused, step by step from the cursor (a chord: keys pressed together); ✨ песня — a whole song on this melody in a
//   style: its key and harmony found by the harmonizer (src/harmonize.js), the melody as theme A
// Rows are semitones, quarter tones or eighth tones (the pitch grid in the header): n may be 3.5 (E𝄳) or 0.25 (C𝄮);
// names follow the song's key and mode (Stein–Zimmermann–Gould accidentals, Turkish commas, cents).
// n counts semitones from a base note: read from the comment near the array ("n from F4"),
// changeable in the header. Rows of the song's scale are lighter; names follow the key.
// On the left, the song's tracks (projectui.js): a project's tracks of notes (absolute MIDI, n from C−1 = 0) are drawn
// and written here like the melodies of the code, the code's own tracks shown as the notes they play (read only: ❄ makes
// one editable); the other project tracks show faintly behind the one being edited.
import { app } from './app.js'
import { h, toast } from './ui.js'
import * as acorn from './acorn.js'
import { spell, pc, freq, SCALES, parseKey } from './theory.js'
import { MODES } from './modes.js'
import { styleGroups } from './generate.js'
import { fromMelody } from './genui.js'
import { createTrackList, projectOf, setProject, codeNotes, trackInfo } from './projectui.js'
import { INSTRUMENT } from './project.js'

// General MIDI drum names for the rows of a drum track
const DRUM_NAMES = { 35: 'бочка 2', 36: 'бочка', 37: 'римшот', 38: 'малый', 39: 'хлопок', 40: 'малый 2', 41: 'том 1', 42: 'хэт', 43: 'том 2', 44: 'хэт педаль', 45: 'том 3', 46: 'откр. хэт', 47: 'том 4', 48: 'том 5', 49: 'тарелка', 50: 'том 6', 51: 'райд', 52: 'китайская', 53: 'колокол райда', 54: 'бубен', 55: 'сплэш', 56: 'ковбелл', 57: 'тарелка 2', 59: 'райд 2', 69: 'кабаса', 70: 'шейкер', 75: 'клавес', 76: 'вудблок', 77: 'вудблок 2' }

const NOTE_RE = /\b(?:n|semitones|notes?)?\s*(?:from|от)\s+([A-G](?:#|♯|b|♭)?-?\d)\b/i
const midiOf = name => {
  const m = name.match(/^([A-G])(#|♯|b|♭)?(-?\d)$/)
  if (!m) return null
  return 12 * (+m[3] + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1])] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0)
}
const num = v => +(+v).toFixed(4) + ''

// every top-level-ish const whose value is an array of [number, number, number]
export function findMelodies(src) {
  let ast
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }) } catch { return [] }
  const out = []
  const isNum = e => e && (e.type === 'Literal' && typeof e.value === 'number' || (e.type === 'UnaryExpression' && e.operator === '-' && e.argument.type === 'Literal' && typeof e.argument.value === 'number'))
  const val = e => (e.type === 'Literal' ? e.value : -e.argument.value)
  const visit = node => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'VariableDeclarator' && node.init?.type === 'ArrayExpression' && node.id.type === 'Identifier') {
      const els = node.init.elements
      // a melody: [beat, n, length] rows, beats in order, positive lengths (empty arrays and chord
      // triads are not melodies)
      const rows = els.every(e => e?.type === 'ArrayExpression' && e.elements.length === 3 && e.elements.every(isNum))
      const v = rows ? els.map(e => e.elements.map(val)) : []
      if (rows && v.length && (node.id.name.length > 1 || /^[A-Z]$/.test(node.id.name)) && v.every((r, i) => r[2] > 0 && (i === 0 || r[0] >= v[i - 1][0]))) {
        const lines = src.split('\n').slice(Math.max(0, node.loc.start.line - 4), node.loc.start.line).join('\n')
        const base = lines.match(NOTE_RE)?.[1] ?? null
        out.push({ name: node.id.name, start: node.init.start, end: node.init.end, line: node.loc.start.line, base, notes: els.map(e => e.elements.map(val)) })
      }
    }
    for (const k in node) {
      if (k === 'loc') continue
      const v = node[k]
      if (Array.isArray(v)) v.forEach(visit)
      else if (v && typeof v.type === 'string') visit(v)
    }
  }
  visit(ast)
  const score = m => (/THEME|MEL|LEAD|BRIDGE|HOOK|SOLO|MEOW|TITLE|CAVE|BOSS|FANFARE|ANSWER|VERSE|CHORUS|TAG|^[AB]\d?$/.test(m.name) ? 2 : /^[A-Z_\d]+$/.test(m.name) ? 1 : 0) + (m.base ? 1 : 0)
  return out.sort((a, b) => score(b) - score(a) || a.line - b.line)
}
// [[b, n, d], …] → source text, one bar per line, indented like the declaration
export function formatMelody(notes, indent = '') {
  const s = [...notes].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (!s.length) return '[]'
  const bars = new Map()
  for (const e of s) {
    const b = Math.floor(e[0] / 4 + 1e-9)
    if (!bars.has(b)) bars.set(b, [])
    bars.get(b).push(`[${e.map(num).join(', ')}]`)
  }
  return '[\n' + [...bars.values()].map(l => indent + '  ' + l.join(', ') + ',').join('\n') + '\n' + indent + ']'
}

export function createPianoRoll(root) {
  root.innerHTML = ''
  const sel = h('select', { title: 'мелодия из кода' }), baseSel = h('select', { title: 'нота, от которой считается n' })
  for (let m = 36; m <= 84; m++) baseSel.append(new Option(`n = 0 → ${spell(m, { tonic: 0, mode: 'major' })}`, m))
  const gridSel = h('select', { title: 'сетка' })
  for (const [v, l] of [[1, '1 доля'], [0.5, '1/8'], [0.25, '1/16'], [1 / 3, 'триоль 1/8'], [1 / 6, 'триоль 1/16'], [2, '1/2']]) gridSel.append(new Option(l, v))
  gridSel.value = 0.25
  // the pitch grid: semitones, quarter tones (24-EDO), eighth tones (48-EDO)
  const resSel = h('select', { title: 'шаг по высоте: полутон, четверть тона, восьмая тона' })
  for (const [v, l] of [[1, 'полутоны'], [0.5, '¼ тона'], [0.25, '⅛ тона']]) resSel.append(new Option(l, v))
  const play = h('button', { title: 'прослушать мелодию отдельно (по кругу)' }, '▶ слушать')
  const info = h('span', { class: 'dim' })
  const kbBtn = h('button', { title: 'играть: MIDI-клавиатура или компьютерная (A W S E D F T G Y H U J K O L P — от до; Z/X — октава; Shift — +шаг сетки высоты, например E𝄳). Питч-бенд ±2 полутона даёт ¼ и ⅛ тона' }, '🎹 играть')
  const recBtn = h('button', { title: 'запись: пока песня играет — ноты ложатся на её доли (по сетке); на паузе — пошагово от курсора (аккорд — клавиши вместе)' }, '⏺ запись')
  const styleSel = h('select', { title: 'стиль песни для «✨ песня»' })
  for (const f of styleGroups(st => !['fugue', 'maqam', 'raga', 'gamelan', 'ambient'].includes(st.id))) styleSel.append(h('optgroup', { label: `${f.emoji} ${f.label}` }, ...f.list.map(st => new Option(`${st.emoji} ${st.label}`, st.id))))
  const songBtn = h('button', { title: 'сочинить целую песню на эту мелодию: тональность и гармония — по ней (гармонизатор), мелодия — тема A' }, '✨ песня')
  root.append(h('div', { class: 'pr-head' }, h('span', { class: 'title' }, '🎹 пианоролл'), sel, baseSel, gridSel, resSel, play,
    h('button', { title: 'новая мелодия в коде', onclick: () => newMelody() }, '＋ новая'), kbBtn, recBtn, styleSel, songBtn, info, h('span', { class: 'sp' }),
    h('span', { class: 'dim' }, 'клик — нота · тяни по пустому — выделить область · тяни ноту — сдвиг/длина · ПКМ — удалить · ↑↓←→ · Alt+↑↓ — громкость'),
    h('button', { onclick: () => app.togglePianoRoll(false), title: 'закрыть (P)' }, '✕')))
  const body = h('div', { class: 'pr-body', tabindex: 0 }), cv = h('canvas'), side = h('div', { class: 'pr-tracks' })
  body.append(cv)
  root.append(h('div', { class: 'pr-main' }, side, body))
  const g = cv.getContext('2d')
  let W = 0, H = 0, mels = [], cur = null, notes = [], base = 69, px = 48, row = 14, scrollX = 0, top = 84, selIdx = new Set(), lastDur = 0.5, res = 1
  let drag = null, hover = null, playing = null, ghosts = [], wanted = null, marquee = null, velDrag = null, lastVel = 0.8, pendingLoad = false
  const tl = createTrackList(side, { current: () => cur, want: v => want(v) })
  const drumsNow = () => cur?.kind === 'project' && INSTRUMENT[cur.inst]?.kind === 'drums'
  // the velocity lane under a project track's notes (the code's melodies are [beat, n, length]: no velocity)
  const VEL_H = 72, velOn = () => cur?.kind === 'project', laneTop = () => H - (velOn() ? VEL_H : 0)
  const velOf = e => e[3] ?? 0.8, velY = v => H - 6 - v * (VEL_H - 18), yVel = sy => Math.round(Math.max(0.05, Math.min(1, (H - 6 - sy) / (VEL_H - 18))) * 100) / 100

  function resize() {
    const r = body.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1)
    W = r.width
    H = r.height
    cv.width = Math.max(1, W * d)
    cv.height = Math.max(1, H * d)
    g.setTransform(d, 0, 0, d, 0, 0)
    draw()
  }
  new ResizeObserver(resize).observe(body)
  const source = () => (app.current ? app.sourceOf(app.current) : '')

  // everything that can be edited or looked at: the project's tracks, the code's melodies, the code's tracks (read only)
  const valueOf = e => (e.kind === 'project' ? 'p:' + e.id : e.kind === 'view' ? 'v:' + e.key : 'm:' + e.name)
  function load(c, keep = true) {
    const src = source(), prev = cur ? valueOf(cur) : null
    let info0 = { project: [], code: [] }
    try { if (app.current?.song) info0 = trackInfo() } catch {}
    const proj = info0.project.map(({ t, key }) => ({ kind: 'project', id: t.id, name: t.name, key, inst: t.inst, notes: t.notes.map(e => [...e]) }))
    const code = findMelodies(src).map(m => ({ ...m, kind: 'code' }))
    const views = info0.code.map(key => ({ kind: 'view', key, name: key, get notes() { return codeNotes(key) } }))
    mels = [...proj, ...code, ...views]
    ghosts = proj
    sel.innerHTML = ''
    const group = (label, list) => {
      if (!list.length) return
      const og = h('optgroup', { label })
      for (const m of list) og.append(new Option(m.kind === 'project' ? `🎛 ${m.name} · ${m.notes.length} нот` : m.kind === 'view' ? `ƒ ${m.key}` : `${m.name} · ${m.notes.length} нот`, valueOf(m)))
      sel.append(og)
    }
    group('Дорожки проекта', proj)
    group('Мелодии в коде [[доля, n, длина]]', code)
    group('Дорожки из кода (просмотр)', views)
    if (!mels.length) {
      sel.append(new Option('нет дорожек — «＋» слева добавит инструмент', ''))
      cur = null
      notes = []
      info.textContent = ''
      tl.render()
      draw()
      return
    }
    const w = wanted && mels.find(m => valueOf(m) === wanted)
    if (w) wanted = null
    const pick = w || (keep && mels.find(m => valueOf(m) === prev)) || proj[0] || code[0] || mels[0]
    sel.value = valueOf(pick)
    select(pick, !w && keep && valueOf(pick) === prev)
  }
  // select a track by its value ('p:t3', 'v:bass', 'm:MELODY') — now, or when the next load brings it
  function want(v) {
    const m = mels.find(m => valueOf(m) === v)
    if (!m) { wanted = v; return }
    sel.value = v
    select(m, false)
    body.focus()
  }
  function select(m, keepView) {
    // the same notes stay selected after a reload (a project writes its notes back sorted: the indices change)
    const was = keepView ? [...selIdx].map(i => notes[i]).filter(Boolean).map(e => e.slice(0, 3).join()) : []
    cur = m
    notes = m.notes.map(e => [...e])
    hover = null
    if (keepView) {
      selIdx = new Set()
      notes.forEach((e, i) => { const k = was.indexOf(e.slice(0, 3).join()); if (k >= 0) { selIdx.add(i); was.splice(k, 1) } })
    }
    baseSel.style.display = m.kind === 'code' ? '' : 'none'
    if (m.kind !== 'code') {
      base = 0
      if (!keepView) {
        const d = INSTRUMENT[m.inst], ns = notes.map(e => e[1])
        top = (ns.length ? Math.max(...ns) : d ? Math.round((d.range[0] + d.range[1]) / 2) + 6 : 72) + 6
        scrollX = notes.length ? Math.max(0, Math.floor(Math.min(...notes.map(e => e[0])) / 4) * 4) : 0 // from its first note
        selIdx.clear()
        setRes(drumsNow() ? 1 : fineness(ns))
        if (drumsNow()) lastDur = 0.25
      }
      if (drumsNow() && res !== 1) setRes(1)
      resSel.disabled = drumsNow()
      resSel.title = drumsNow() ? 'ударные: строка — это барабан, их высота не дробится и не транспонируется' : 'шаг по высоте: полутон, четверть тона, восьмая тона'
      info.textContent = m.kind === 'project' ? `${INSTRUMENT[m.inst]?.label ?? m.inst} · ${notes.length} нот` : 'дорожка из кода — только просмотр: ⋯ → ❄ «в ноты», чтобы править'
      tl.render()
      draw()
      return
    }
    if (!keepView) {
      base = midiOf(m.base ?? '') ?? guessBase(m)
      baseSel.value = base
      const ns = notes.map(e => e[1])
      top = (ns.length ? Math.max(...ns) : 12) + base + 6
      scrollX = 0
      selIdx.clear()
    }
    resSel.disabled = false
    info.textContent = m.base ? `n от ${m.base}` : 'база не указана в коде — выбери'
    if (!keepView) setRes(fineness(notes.map(e => e[1])))
    tl.render()
    draw()
  }
  // no "n from X" comment: assume the song's tonic in octave 4 or 5
  function guessBase(m) {
    // the nearest "n from X" above the array (one comment heading a group of melodies), else a song that plays its notes
    // as hz(m.n, C4) counts them from C4 (the generator's maqam, raga, gamelan… arrays)
    const src = source(), above = [...src.slice(0, m.start).matchAll(new RegExp(NOTE_RE.source, 'gi'))].at(-1)
    const named = above && midiOf(above[1])
    if (named != null) return named
    if (/hz\(\s*[\w.]*\bn\b[^,)]*,\s*C4\s*\)/.test(src)) return 60
    const k = app.current?.key ?? { tonic: 9 }
    const ns = m.notes.map(e => e[1]), mid = ns.length ? (Math.min(...ns) + Math.max(...ns)) / 2 : 0
    let b = 60 + k.tonic
    while (b + mid > 76) b -= 12
    while (b + mid < 60) b += 12
    return b
  }
  // the finest grid the notes (or the song's mode) need: 1, 0.5 or 0.25
  function fineness(ns) {
    const mode = app.current?.song?.mode && MODES[app.current.song.mode], vals = [...ns, ...(mode ? mode.iv : [])]
    if (mode?.grid === 48 || vals.some(v => Math.abs(v * 2 - Math.round(v * 2)) > 0.01)) return 0.25
    if (mode?.grid === 24 || vals.some(v => Math.abs(v - Math.round(v)) > 0.01)) return 0.5
    return 1
  }
  function setRes(r) {
    const c = top
    res = r
    resSel.value = r
    row = r === 1 ? 14 : r === 0.5 ? 12 : 9
    top = Math.round(c / r) * r
  }
  resSel.onchange = () => { setRes(+resSel.value); draw() }
  sel.onchange = () => want(sel.value)
  baseSel.onchange = () => { base = +baseSel.value; draw() }

  // ---- geometry ----
  const KEYS = 52
  const X = b => KEYS + (b - scrollX) * px, B = sx => (sx - KEYS) / px + scrollX
  const Yr = midi => ((top - midi) / res) * row, M = sy => top - (Math.floor(sy / row) - 0) * res
  const rows = () => { const out = []; for (let m = M(H) - res; m <= top + res; m += res) out.push(Math.round(m * 4) / 4); return out }
  const grid = () => +gridSel.value
  const snap = (b, e) => (e?.shiftKey ? b : Math.round(b / grid()) * grid())
  const noteAt = (sx, sy) => {
    if (sy >= laneTop()) return null
    for (let i = notes.length - 1; i >= 0; i--) {
      const [b, n, d] = notes[i], x0 = X(b), x1 = X(b + d), y0 = Yr(base + n)
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy < y0 + row) return { i, edge: x1 - sx < Math.min(8, (x1 - x0) / 3) }
    }
    return null
  }

  function draw() {
    if (!W) return
    const key = app.current?.key ?? parseKey('C'), mode = app.current?.song?.mode && MODES[app.current.song.mode]
    const scale = (mode && !mode.grid ? mode.iv : SCALES[key.mode === 'minor' ? 'minor' : 'major']).map(i => (((i + key.tonic) % 12) + 12) % 12)
    const pcf = m => ((m % 12) + 12) % 12, isIn = m => scale.some(p => Math.abs(pcf(m) - p) < 0.13 * Math.min(1, res * 2) || Math.abs(pcf(m) - p - 12) < 0.01)
    g.fillStyle = '#100d22'
    g.fillRect(0, 0, W, H)
    g.save()
    g.beginPath()
    g.rect(0, 0, W, laneTop())
    g.clip()
    // rows (microtonal rows a little darker, so the semitones still read)
    for (const m of rows()) {
      const y = Yr(m), on12 = Math.abs(m - Math.round(m)) < 1e-6
      g.fillStyle = Math.abs(pcf(m) - key.tonic) < 1e-6 ? '#2a2350' : isIn(m) ? '#1b1638' : on12 ? '#130f28' : '#0f0c20'
      g.fillRect(KEYS, y, W - KEYS, row - 1)
    }
    // beats & bars
    const b0 = Math.floor(B(KEYS)), b1 = Math.ceil(B(W)), gr = grid()
    for (let b = Math.floor(b0 / gr) * gr; b <= b1; b += gr) {
      const isBeat = Math.abs(b - Math.round(b)) < 1e-6, isBar = isBeat && Math.round(b) % 4 === 0
      g.fillStyle = isBar ? '#ffffff40' : isBeat ? '#ffffff1c' : '#ffffff0a'
      g.fillRect(X(b), 0, 1, H)
      if (isBar) {
        g.fillStyle = '#ffffff70'
        g.font = '10px system-ui'
        g.fillText(String(Math.round(b) / 4 + 1), X(b) + 3, 10)
      }
    }
    // the other project tracks, faintly
    if (cur?.kind !== 'code') for (const gt of ghosts) {
      if (cur?.kind === 'project' && gt.id === cur.id) continue
      g.fillStyle = (INSTRUMENT[gt.inst]?.color ?? '#ffffff') + '30'
      for (const [b, n, d] of gt.notes) {
        const x0 = X(b)
        if (x0 > W || X(b + d) < KEYS) continue
        g.fillRect(x0, Yr(n) + 3, Math.max(2, d * px - 1), row - 6)
      }
    }
    // notes
    const ro = cur?.kind === 'view'
    notes.forEach(([b, n, d], i) => {
      const x0 = X(b), y0 = Yr(base + n), w = Math.max(3, d * px - 1), s = selIdx.has(i)
      g.fillStyle = ro ? '#8a86a8' : s ? '#ffd479' : hover?.i === i ? '#d9c9ff' : cur?.kind === 'project' ? INSTRUMENT[cur.inst]?.color ?? '#b9a2ff' : '#b9a2ff'
      g.globalAlpha = velOn() ? 0.4 + 0.6 * velOf(notes[i]) : 1 // softer notes paler
      g.fillRect(x0, y0 + 1, w, row - 2)
      g.globalAlpha = 1
      g.fillStyle = '#ffffff55'
      g.fillRect(x0 + w - 3, y0 + 2, 2, row - 4)
      if (w > 26 && row >= 12) {
        g.fillStyle = '#1b1238'
        g.font = '10px system-ui'
        g.fillText(drumsNow() ? DRUM_NAMES[Math.round(n)] ?? String(n) : spell(base + n, key, true), x0 + 3, y0 + row - 4)
      }
    })
    // the step-input cursor
    if (recording && !app.player.playing) {
      g.fillStyle = '#7dff9b'
      g.fillRect(X(stepAt) - 1, 0, 2, H)
    }
    // the preview playhead
    if (playing) {
      const b = ((app.player.actx.currentTime - playing.t0) / playing.sec) % playing.len
      g.fillStyle = '#ffffffaa'
      g.fillRect(X(b), 0, 1.5, H)
    }
    // keyboard
    for (const m of rows()) {
      const y = Yr(m), on12 = Math.abs(m - Math.round(m)) < 1e-6, black = on12 && [1, 3, 6, 8, 10].includes(pc(m))
      // microtonal keys: a narrow strip between the keys, tinted (¼ violet, ⅛ blue)
      g.fillStyle = !on12 ? (Math.abs(m * 2 - Math.round(m * 2)) < 1e-6 ? '#6b5bb8' : '#3f5f9a') : black ? '#1c1a24' : '#e9e6f2'
      g.fillRect(on12 ? 0 : 10, y, KEYS - 2 - (on12 ? 0 : 10), row - 1)
      const tonic = Math.abs(pcf(m) - key.tonic) < 1e-6
      if (pc(m) === 0 && on12 || tonic || row >= 13 || (!on12 && row >= 9 && isIn(m))) {
        g.fillStyle = black || !on12 ? '#e4e0f2' : '#2b2840'
        g.font = `${tonic ? 'bold ' : ''}${row >= 12 ? 10 : 8}px system-ui`
        g.fillText(drumsNow() ? (DRUM_NAMES[m] ?? spell(m, key)).slice(0, 8) : spell(m, key).replace(/[+−]\d+¢$/, ''), on12 ? 4 : 12, y + row - 2)
      }
    }
    g.restore()
    // the area being selected
    if (marquee?.moved) {
      const x = Math.min(marquee.sx, marquee.x), y = Math.min(marquee.sy, marquee.y)
      g.fillStyle = '#ffd47922'
      g.strokeStyle = '#ffd479cc'
      g.lineWidth = 1
      g.fillRect(x, y, Math.abs(marquee.x - marquee.sx), Math.abs(marquee.y - marquee.sy))
      g.strokeRect(x + 0.5, y + 0.5, Math.abs(marquee.x - marquee.sx), Math.abs(marquee.y - marquee.sy))
    }
    // the velocity lane: a stem per note, its height the note's loudness
    if (velOn()) {
      const t0 = laneTop()
      g.fillStyle = '#0b0918'
      g.fillRect(0, t0, W, VEL_H)
      g.fillStyle = '#ffffff30'
      g.fillRect(0, t0, W, 1)
      for (const v of [0.25, 0.5, 0.75, 1]) { g.fillStyle = '#ffffff0d'; g.fillRect(KEYS, Math.round(velY(v)), W - KEYS, 1) }
      g.fillStyle = '#ffffff80'
      g.font = '10px system-ui'
      g.fillText('громк.', 4, t0 + 14)
      const color = INSTRUMENT[cur.inst]?.color ?? '#b9a2ff'
      notes.forEach((e, i) => {
        const x0 = X(e[0])
        if (x0 < KEYS - 2 || x0 > W) return
        const y = velY(velOf(e)), s = selIdx.has(i)
        g.fillStyle = s ? '#ffd479' : color
        g.fillRect(x0, y, 2, H - 6 - y)
        g.beginPath()
        g.arc(x0 + 1, y, s ? 3.5 : 2.5, 0, 2 * Math.PI)
        g.fill()
      })
      const shown = velDrag ? velDrag.show : hover?.vel
      if (shown != null) { g.fillStyle = '#ffffffcc'; g.fillText(`${Math.round(shown * 100)} %`, 4, t0 + 28) }
    }
    if (!cur) {
      g.fillStyle = '#ffffff99'
      g.font = '14px system-ui'
      g.fillText('Нет дорожек: «＋» слева — инструмент (ноты пишутся здесь), «＋ новая» — мелодия в коде', KEYS + 20, 40)
    }
  }

  // ---- audition ----
  function beep(m, dur = 0.35, when = 0, vel = 0.8) {
    const a = app.player.actx
    if (!a) return
    const t = a.currentTime + when, o = a.createOscillator(), o2 = a.createOscillator(), gn = a.createGain()
    o.frequency.value = freq(m)
    o2.frequency.value = 2 * freq(m)
    o2.type = 'triangle'
    gn.gain.setValueAtTime(0, t)
    gn.gain.linearRampToValueAtTime(0.06 + 0.15 * vel, t + 0.008)
    gn.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.15, dur))
    o.connect(gn)
    const g2 = a.createGain()
    g2.gain.value = 0.25
    o2.connect(g2).connect(gn)
    gn.connect(a.destination)
    o.start(t)
    o2.start(t)
    o.stop(t + dur + 0.1)
    o2.stop(t + dur + 0.1)
  }
  play.onclick = async () => {
    if (playing) { clearInterval(playing.timer); playing = null; play.textContent = '▶ слушать'; draw(); return }
    await app.player.ensureAudio()
    await app.player.actx.resume()
    if (app.player.playing) await app.player.pause()
    const sec = 60 / (app.current?.song?.bpm ?? 100), len = Math.max(4, Math.ceil(Math.max(0, ...notes.map(e => e[0] + e[1] * 0 + e[2])) / 4) * 4)
    playing = { t0: app.player.actx.currentTime + 0.05, sec, len, next: 0 }
    play.textContent = '■ стоп'
    const sched = () => {
      const now = app.player.actx.currentTime, horizon = now + 0.3
      while (playing && playing.t0 + playing.next * sec < horizon) {
        const loopStart = Math.floor(playing.next / len) * len
        for (const [b, n, d, v] of notes) {
          const at = loopStart + b
          if (at >= playing.next && at < playing.next + 0.25) beep(base + n, d * sec * 0.95, playing.t0 + at * sec - now, v ?? 0.8)
        }
        playing.next += 0.25
      }
      draw()
    }
    playing.timer = setInterval(sched, 50)
    sched()
  }

  // ---- write back ----
  let writeTimer = null
  function commit() {
    if (!cur || cur.kind === 'view') return
    if (cur.kind === 'project') {
      const p = projectOf(), t = p.tracks.find(t => t.id === cur.id)
      if (!t) return toast('дорожка пропала из проекта — обнови', { kind: 'err' })
      t.notes = notes.map(e => [e[0], e[1], e[2], e[3] ?? 0.8]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
      setProject(p)
      info.textContent = `${INSTRUMENT[cur.inst]?.label ?? cur.inst} · ${notes.length} нот`
      return
    }
    const src = source()
    const now = findMelodies(src).find(m => m.name === cur.name)
    if (!now) return toast('мелодия пропала из кода — обнови', { kind: 'err' })
    const lineStart = src.lastIndexOf('\n', now.start) + 1, indent = src.slice(lineStart).match(/^\s*/)[0]
    const text = formatMelody(notes, indent)
    if (app.editor?.owner?.() === app.current) app.editor.replaceIndex(now.start, now.end, text)
    else {
      const song = app.current, next = src.slice(0, now.start) + text + src.slice(now.end)
      app.setDraft(song, next)
      clearTimeout(writeTimer)
      writeTimer = setTimeout(() => app.apply(next, { of: song }), 200)
    }
    cur = { ...now, kind: 'code', notes: notes.map(e => [...e]) }
    const o = [...sel.options].find(o => o.value === 'm:' + cur.name)
    if (o) o.text = `${cur.name} · ${notes.length} нот`
  }
  function newMelody() {
    const src = source()
    let name = 'MELODY', i = 1
    while (new RegExp(`\\b${name}\\b`).test(src)) name = `MELODY_${++i}`
    const k = app.current?.key ?? { tonic: 9, mode: 'minor' }, b = 60 + k.tonic
    const decl = `\n// [beat, n from ${spell(b, k)}, length] — drawn in the piano roll\nconst ${name} = [\n  [0, 0, 1], [1, ${k.mode === 'minor' ? 3 : 4}, 1], [2, 7, 2],\n]\n`
    const at = src.search(/\nexport default/)
    const pos = at < 0 ? src.length : at
    if (app.editor?.owner?.() === app.current) app.editor.replaceIndex(pos, pos, decl)
    else {
      const song = app.current, next = src.slice(0, pos) + decl + src.slice(pos)
      app.setDraft(song, next)
      app.apply(next, { of: song })
    }
    setTimeout(() => {
      load(app.current, false)
      want('m:' + name)
      toast(`＋ ${name} — теперь используй её в дорожке: notesAt(${name}, …)`, { ms: 6000 })
    }, 600)
  }

  // ---- mouse & keys ----
  // right click / double click: delete the note (and the others selected with it)
  const remove = e => {
    const r = cv.getBoundingClientRect(), hit = noteAt(e.clientX - r.left, e.clientY - r.top)
    if (!hit || cur?.kind === 'view') return
    if (selIdx.has(hit.i) && selIdx.size > 1) notes = notes.filter((_, i) => !selIdx.has(i))
    else notes.splice(hit.i, 1)
    selIdx.clear()
    commit()
    draw()
  }
  cv.addEventListener('contextmenu', e => { e.preventDefault(); remove(e) })
  cv.addEventListener('dblclick', remove)
  // the notes whose velocity stem is at sx (the nearest within 6 px)
  const stemsAt = sx => {
    let best = Infinity
    const out = []
    notes.forEach((e, i) => {
      const d = Math.abs(X(e[0]) + 1 - sx)
      if (d > 6) return
      if (d < best - 0.5) { best = d; out.length = 0 }
      if (d <= best + 0.5) out.push(i)
    })
    return out
  }
  cv.addEventListener('mousedown', e => {
    if (e.button !== 0 || !cur) return
    body.focus()
    if (cur.kind === 'view') { const r0 = cv.getBoundingClientRect(); if (e.clientX - r0.left < KEYS) beep(M(e.clientY - r0.top)); else toast('это дорожка из кода — ⋯ слева → ❄ «в ноты», и её можно править', { ms: 3000 }); return }
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top
    // the velocity lane: a selected stem moves all the selected ones (by the same amount), else paint the stems under the mouse
    if (velOn() && sy >= laneTop()) {
      const at = stemsAt(sx), group = at.some(i => selIdx.has(i)) && selIdx.size > 1
      velDrag = group ? { group: [...selIdx].map(i => [i, velOf(notes[i])]), sy, show: velOf(notes[at[0]]) } : { paint: true, show: yVel(sy) }
      if (!group) for (const i of at) notes[i][3] = yVel(sy)
      draw()
      return
    }
    if (sx < KEYS) { beep(M(sy)); return }
    const hit = noteAt(sx, sy)
    if (!hit) { // empty space: a click writes a note, a drag selects an area
      marquee = { sx, sy, x: sx, y: sy, moved: false, keep: e.ctrlKey ? new Set(selIdx) : new Set(), shift: e.shiftKey }
      if (!e.ctrlKey) selIdx.clear()
      draw()
      return
    }
    beep(base + notes[hit.i][1], 0.35, 0, velOf(notes[hit.i]))
    if (e.ctrlKey && selIdx.has(hit.i)) { selIdx.delete(hit.i); draw(); return }
    if (!e.ctrlKey && !selIdx.has(hit.i)) selIdx.clear()
    selIdx.add(hit.i)
    const [b0, n0, d0] = notes[hit.i]
    drag = { i: hit.i, edge: hit.edge, sx, sy, b0, n0, d0, moved: false, group: [...selIdx].map(i => [i, ...notes[i].slice(0, 3)]) }
    draw()
  })
  addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top
    if (velDrag) {
      if (velDrag.paint) { const v = yVel(sy); for (const i of stemsAt(sx)) notes[i][3] = v; velDrag.show = v }
      else {
        const dv = (velDrag.sy - sy) / (VEL_H - 18)
        for (const [i, v0] of velDrag.group) notes[i][3] = Math.round(Math.max(0.05, Math.min(1, v0 + dv)) * 100) / 100
        velDrag.show = notes[velDrag.group[0][0]][3]
      }
      velDrag.moved = true
      draw()
      return
    }
    if (marquee) {
      marquee.x = Math.max(KEYS, Math.min(W, sx))
      marquee.y = Math.max(0, Math.min(laneTop(), sy))
      if (Math.abs(sx - marquee.sx) + Math.abs(sy - marquee.sy) > 4) marquee.moved = true
      if (marquee.moved) {
        const bA = B(Math.min(marquee.sx, marquee.x)), bB = B(Math.max(marquee.sx, marquee.x))
        const yA = Math.min(marquee.sy, marquee.y), yB = Math.max(marquee.sy, marquee.y)
        selIdx = new Set(marquee.keep)
        notes.forEach(([b, n, d], i) => { const y0 = Yr(base + n); if (b < bB && b + d > bA && y0 + row > yA && y0 < yB) selIdx.add(i) })
      }
      draw()
      return
    }
    if (!drag) {
      if (e.target === cv) {
        const hit = noteAt(sx, sy), stem = velOn() && sy >= laneTop() ? stemsAt(sx)[0] : undefined
        cv.style.cursor = hit ? (hit.edge ? 'ew-resize' : 'grab') : stem != null ? 'ns-resize' : sx < KEYS ? 'pointer' : 'crosshair'
        const h1 = hit ?? (stem != null ? { i: stem, vel: velOf(notes[stem]) } : null)
        if (h1?.i !== hover?.i || h1?.vel !== hover?.vel) { hover = h1; draw() }
      }
      return
    }
    // the selected notes move together, by the dragged note's snapped step
    const db = (sx - drag.sx) / px, dn = Math.round(-(sy - drag.sy) / row) * res
    if (drag.edge) {
      const dd = Math.max(grid() / (e.shiftKey ? 4 : 1), snap(drag.d0 + db, e)) - drag.d0
      for (const [i, , , d0] of drag.group) notes[i][2] = +Math.max(grid() / (e.shiftKey ? 4 : 1), d0 + dd).toFixed(4)
    } else {
      const lo = Math.min(...drag.group.map(g0 => g0[1])), step = Math.max(-lo, snap(drag.b0 + db, e) - drag.b0)
      const was = notes[drag.i][1]
      for (const [i, b0, n0] of drag.group) {
        notes[i][0] = +(b0 + step).toFixed(4)
        notes[i][1] = Math.round((n0 + dn) * 4) / 4
      }
      if (notes[drag.i][1] !== was) beep(base + notes[drag.i][1], 0.2, 0, velOf(notes[drag.i]))
    }
    drag.moved = true
    draw()
  })
  addEventListener('mouseup', e => {
    if (pendingLoad) setTimeout(() => { if (pendingLoad && !drag && !velDrag && !marquee) { pendingLoad = false; load(app.current, true) } }, 0)
    if (velDrag) {
      if (velDrag.show != null) lastVel = velDrag.show
      velDrag = null
      commit()
      draw()
      return
    }
    if (marquee) {
      const m = marquee
      marquee = null
      if (!m.moved) { // a click: a note here
        const b = Math.max(0, m.shift ? B(m.sx) : Math.floor(B(m.sx) / grid() + 1e-9) * grid()), n = M(m.sy) - base
        notes.push(velOn() ? [+b.toFixed(4), n, lastDur, lastVel] : [+b.toFixed(4), n, lastDur])
        selIdx = new Set([notes.length - 1])
        beep(base + n, 0.35, 0, lastVel)
        commit()
      }
      draw()
      return
    }
    if (!drag) return
    const e0 = notes[drag.i]
    lastDur = e0[2]
    if (drag.moved) commit()
    drag = null
  })
  cv.addEventListener('wheel', e => {
    e.preventDefault()
    if (e.ctrlKey) px = Math.max(10, Math.min(240, px * (e.deltaY > 0 ? 0.88 : 1.14)))
    else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) scrollX = Math.max(0, scrollX + (e.deltaX || e.deltaY) / px)
    else top = Math.max(24, Math.min(120, top + (e.deltaY > 0 ? -2 : 2) * res))
    draw()
  }, { passive: false })
  body.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && cur && cur.kind !== 'view') {
      selIdx = new Set(notes.map((_, i) => i))
      e.preventDefault()
      e.stopPropagation()
      return draw()
    }
    if (e.key === 'Escape' && selIdx.size) { selIdx.clear(); e.stopPropagation(); return draw() }
    if (!selIdx.size) return
    const sel = [...selIdx].map(i => notes[i])
    if (e.altKey && velOn() && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { // louder / softer
      const d = e.key === 'ArrowUp' ? 0.05 : -0.05
      sel.forEach(n => (n[3] = Math.round(Math.max(0.05, Math.min(1, velOf(n) + d)) * 100) / 100))
      lastVel = sel[0][3]
      beep(base + sel[0][1], 0.3, 0, sel[0][3])
      hover = { i: [...selIdx][0], vel: sel[0][3] }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      notes = notes.filter((_, i) => !selIdx.has(i))
      selIdx.clear()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : res) // drums: res is 1, a row is the next drum
      sel.forEach(n => (n[1] = Math.round((n[1] + d) * 4) / 4))
      beep(base + sel[0][1])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const d = (e.key === 'ArrowRight' ? 1 : -1) * grid()
      sel.forEach(n => (n[0] = Math.max(0, +(n[0] + d).toFixed(4))))
    } else return
    e.preventDefault()
    e.stopPropagation()
    commit()
    draw()
  })

  // ---- playing in: a MIDI keyboard or the computer's keys ----
  let inputOn = false, midiAccess = null, recording = false, stepAt = 0, octave = 0, lastOnAt = -1
  const held = new Map(), bend = new Map() // key → { midi, voice, rec }; channel → semitones
  const quant = m => Math.round(m / res) * res // to the pitch grid (semitones, ¼ or ⅛ tones)
  function voiceOn(midi, vel = 0.8) {
    const a = app.player.actx
    if (!a) return null
    const t = a.currentTime, o = a.createOscillator(), o2 = a.createOscillator(), gn = a.createGain(), g2 = a.createGain()
    o.type = 'triangle'
    o.frequency.value = freq(midi)
    o2.frequency.value = 2 * freq(midi)
    g2.gain.value = 0.2
    gn.gain.setValueAtTime(0, t)
    gn.gain.linearRampToValueAtTime(0.16 * vel, t + 0.01)
    gn.gain.setTargetAtTime(0.09 * vel, t + 0.05, 0.3)
    o.connect(gn)
    o2.connect(g2).connect(gn)
    gn.connect(a.destination)
    o.start(t)
    o2.start(t)
    return { o, o2, gn, set: m => { o.frequency.setTargetAtTime(freq(m), a.currentTime, 0.01); o2.frequency.setTargetAtTime(2 * freq(m), a.currentTime, 0.01) } }
  }
  function voiceOff(v) {
    if (!v) return
    const a = app.player.actx, t = a.currentTime
    v.gn.gain.cancelScheduledValues(t)
    v.gn.gain.setTargetAtTime(0, t, 0.06)
    v.o.stop(t + 0.4)
    v.o2.stop(t + 0.4)
  }
  function noteOn(id, midi, vel = 0.8) {
    if (held.has(id)) return
    midi = quant(midi)
    const v = voiceOn(midi, vel)
    let rec = null
    if (recording && cur && cur.kind !== 'view') {
      const live = app.player.playing, now = performance.now()
      const b = live ? Math.max(0, Math.round(app.player.x / grid()) * grid()) : (now - lastOnAt < 60 ? held.size ? [...held.values()].find(h => h.rec)?.rec.b ?? stepAt : stepAt : stepAt)
      lastOnAt = now
      const n = Math.round((midi - base) * 4) / 4, d = live ? grid() : lastDur
      notes.push(velOn() ? [+b.toFixed(4), n, d, Math.round(vel * 100) / 100] : [+b.toFixed(4), n, d])
      rec = { b, i: notes.length - 1, live, x0: app.player.x }
      if (!live && b === stepAt) stepAt = +(stepAt + lastDur).toFixed(4)
      if (b < scrollX || b > B(W) - 1) scrollX = Math.max(0, b - 2)
      draw()
    }
    held.set(id, { midi, v, rec })
  }
  function noteOff(id) {
    const h0 = held.get(id)
    if (!h0) return
    held.delete(id)
    voiceOff(h0.v)
    if (h0.rec?.live) {
      const e = notes[h0.rec.i]
      if (e) e[2] = Math.max(grid(), Math.round((app.player.x - h0.rec.x0) / grid()) * grid())
    }
    if (h0.rec) { commit(); draw() }
  }
  function onMidi(ev) {
    const [st, d1, d2] = ev.data, kind = st & 0xf0, ch = st & 0x0f
    if (kind === 0xe0) {
      // pitch bend ±2 semitones: held notes follow, the recorded note takes the bent pitch (on the pitch grid)
      const semis = (((d2 << 7) | d1) - 8192) / 8192 * 2
      bend.set(ch, semis)
      for (const [id, h0] of held) if (id.startsWith(`m${ch}:`)) {
        const m = quant(h0.midi + semis)
        h0.v?.set(m)
        if (h0.rec && notes[h0.rec.i]) { notes[h0.rec.i][1] = Math.round((m - base) * 4) / 4; draw() }
      }
      return
    }
    if (kind === 0x90 && d2 > 0) noteOn(`m${ch}:${d1}`, d1 + (bend.get(ch) ?? 0), d2 / 127)
    else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) noteOff(`m${ch}:${d1}`)
  }
  async function toggleInput() {
    inputOn = !inputOn
    kbBtn.classList.toggle('on', inputOn)
    if (!inputOn) { for (const id of [...held.keys()]) noteOff(id); return }
    await app.player.ensureAudio()
    await app.player.actx.resume()
    body.focus()
    let msg = 'компьютерная клавиатура: A W S E D F T G Y H U J K — от до · Z/X — октава · Shift — +шаг сетки высоты'
    try {
      if (!midiAccess && navigator.requestMIDIAccess) midiAccess = await navigator.requestMIDIAccess({ sysex: false })
      const ins = midiAccess ? [...midiAccess.inputs.values()] : []
      for (const i of ins) i.onmidimessage = onMidi
      if (midiAccess) midiAccess.onstatechange = () => { for (const i of midiAccess.inputs.values()) i.onmidimessage = onMidi }
      if (ins.length) msg = `MIDI: ${ins.map(i => i.name).join(', ')} · и компьютерная клавиатура`
    } catch {}
    toast('🎹 ' + msg, { ms: 6000 })
  }
  kbBtn.onclick = toggleInput
  recBtn.onclick = () => {
    recording = !recording
    recBtn.classList.toggle('on', recording)
    if (recording) {
      if (!inputOn) toggleInput()
      stepAt = notes.length ? Math.max(...notes.map(e => e[0] + e[2])) : 0
      if (!cur) newMelody()
      toast(app.player.playing ? '⏺ запись на доли песни' : '⏺ пошаговая запись: каждая нота за предыдущей (длина — последняя использованная; сетка — в шапке)', { ms: 4000 })
    }
    draw()
  }
  const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 }
  body.addEventListener('keydown', e => {
    if (!inputOn || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.code === 'KeyZ' || e.code === 'KeyX') { octave = Math.max(-3, Math.min(3, octave + (e.code === 'KeyZ' ? -1 : 1))); toast(`октава ${octave >= 0 ? '+' : ''}${octave}`, { ms: 800 }); e.preventDefault(); e.stopPropagation(); return }
    if (!(e.code in KEYMAP)) return
    e.preventDefault()
    e.stopPropagation()
    if (!e.repeat) noteOn('k' + e.code, 60 + 12 * octave + KEYMAP[e.code] + (e.shiftKey && res < 1 ? res : 0))
  }, true)
  body.addEventListener('keyup', e => { if (inputOn && e.code in KEYMAP) { e.stopPropagation(); noteOff('k' + e.code) } }, true)
  body.addEventListener('blur', () => { for (const id of [...held.keys()]) if (id.startsWith('k')) noteOff(id) })
  // a whole song on this melody
  songBtn.onclick = async () => {
    if (!notes.length) return toast('в мелодии нет нот — сыграй или нарисуй её')
    const abs = [...notes].sort((a, b) => a[0] - b[0]).map(([b, n, d]) => [b, base + n, d])
    await fromMelody(abs, styleSel.value, cur ? `мелодия ${cur.name}` : 'ваша мелодия')
  }

  const pr = {
    visible: true,
    // a reload while the mouse is down (a drag, an area, the velocity lane) waits for its release: it would swap the notes under it
    load: c => { if (drag || velDrag || marquee) pendingLoad = true; else load(c, true) },
    want,
    current: () => cur,
    resize,
  }
  setTimeout(resize, 0)
  return pr
}
