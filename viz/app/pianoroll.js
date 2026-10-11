// The piano roll: finds the melody arrays of the song — any `const NAME = [[beat, n, length], …]`
// — and lets you draw them with the mouse. Every change rewrites that array in the code, so the
// song plays the new melody at once.
//   click — a note (length = the last one used) · drag — move · drag the right edge — length
//   right click / double click / Del — delete · ↑↓ — semitone (Shift: octave) · ←→ — by the grid
//   wheel — scroll · Ctrl+wheel — zoom · Shift — no snapping
// n counts semitones from a base note: read from the comment near the array ("n from F4"),
// changeable in the header. Rows of the song's scale are lighter; names follow the key.
import { app } from './app.js'
import { h, toast } from './ui.js'
import * as acorn from './acorn.js'
import { spell, pc, freq, SCALES, parseKey } from './theory.js'

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
  const play = h('button', { title: 'прослушать мелодию отдельно (по кругу)' }, '▶ слушать')
  const info = h('span', { class: 'dim' })
  root.append(h('div', { class: 'pr-head' }, h('span', { class: 'title' }, '🎹 пианоролл'), sel, baseSel, gridSel, play,
    h('button', { title: 'новая мелодия в коде', onclick: () => newMelody() }, '＋ новая'), info, h('span', { class: 'sp' }),
    h('span', { class: 'dim' }, 'клик — нота · тяни — сдвиг/длина · ПКМ — удалить · ↑↓←→'),
    h('button', { onclick: () => app.togglePianoRoll(false), title: 'закрыть (P)' }, '✕')))
  const body = h('div', { class: 'pr-body', tabindex: 0 }), cv = h('canvas')
  body.append(cv)
  root.append(body)
  const g = cv.getContext('2d')
  let W = 0, H = 0, mels = [], cur = null, notes = [], base = 69, px = 48, row = 14, scrollX = 0, top = 84, selIdx = new Set(), lastDur = 0.5
  let drag = null, hover = null, playing = null

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
  const source = () => app.editor?.value?.() ?? app.drafts.get(app.current?.id) ?? app.current?.source ?? ''

  function load(c, keep = true) {
    const src = source(), prev = cur?.name
    mels = findMelodies(src)
    sel.innerHTML = ''
    for (const m of mels) sel.append(new Option(`${m.name} · ${m.notes.length} нот`, m.name))
    if (!mels.length) {
      sel.append(new Option('в коде нет мелодий [[доля, n, длина], …]', ''))
      cur = null
      notes = []
      info.textContent = ''
      draw()
      return
    }
    const pick = (keep && mels.find(m => m.name === prev)) || mels[0]
    sel.value = pick.name
    select(pick, keep && pick.name === prev)
  }
  function select(m, keepView) {
    cur = m
    notes = m.notes.map(e => [...e])
    if (!keepView) {
      base = midiOf(m.base ?? '') ?? guessBase(m)
      baseSel.value = base
      const ns = notes.map(e => e[1])
      top = (ns.length ? Math.max(...ns) : 12) + base + 6
      scrollX = 0
      selIdx.clear()
    }
    info.textContent = m.base ? `n от ${m.base}` : 'база не указана в коде — выбери'
    draw()
  }
  // no "n from X" comment: assume the song's tonic in octave 4 or 5
  function guessBase(m) {
    const k = app.current?.key ?? { tonic: 9 }
    const ns = m.notes.map(e => e[1]), mid = ns.length ? (Math.min(...ns) + Math.max(...ns)) / 2 : 0
    let b = 60 + k.tonic
    while (b + mid > 76) b -= 12
    while (b + mid < 60) b += 12
    return b
  }
  sel.onchange = () => select(mels.find(m => m.name === sel.value), false)
  baseSel.onchange = () => { base = +baseSel.value; draw() }

  // ---- geometry ----
  const KEYS = 52
  const X = b => KEYS + (b - scrollX) * px, B = sx => (sx - KEYS) / px + scrollX
  const Yr = midi => (top - midi) * row + 0, M = sy => Math.floor(top - sy / row + 1)
  const grid = () => +gridSel.value
  const snap = (b, e) => (e?.shiftKey ? b : Math.round(b / grid()) * grid())
  const noteAt = (sx, sy) => {
    for (let i = notes.length - 1; i >= 0; i--) {
      const [b, n, d] = notes[i], x0 = X(b), x1 = X(b + d), y0 = Yr(base + n)
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy < y0 + row) return { i, edge: x1 - sx < Math.min(8, (x1 - x0) / 3) }
    }
    return null
  }

  function draw() {
    if (!W) return
    const key = app.current?.key ?? parseKey('C'), scale = SCALES[key.mode === 'minor' ? 'minor' : 'major'].map(i => (i + key.tonic) % 12)
    g.fillStyle = '#100d22'
    g.fillRect(0, 0, W, H)
    // rows
    for (let m = M(H) - 1; m <= top + 1; m++) {
      const y = Yr(m), inScale = scale.includes(pc(m))
      g.fillStyle = pc(m) === key.tonic ? '#2a2350' : inScale ? '#1b1638' : '#130f28'
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
    // notes
    notes.forEach(([b, n, d], i) => {
      const x0 = X(b), y0 = Yr(base + n), w = Math.max(3, d * px - 1), s = selIdx.has(i)
      g.fillStyle = s ? '#ffd479' : hover?.i === i ? '#d9c9ff' : '#b9a2ff'
      g.fillRect(x0, y0 + 1, w, row - 2)
      g.fillStyle = '#ffffff55'
      g.fillRect(x0 + w - 3, y0 + 2, 2, row - 4)
      if (w > 26 && row >= 12) {
        g.fillStyle = '#1b1238'
        g.font = '10px system-ui'
        g.fillText(spell(base + n, key, true), x0 + 3, y0 + row - 4)
      }
    })
    // the preview playhead
    if (playing) {
      const b = ((app.player.actx.currentTime - playing.t0) / playing.sec) % playing.len
      g.fillStyle = '#ffffffaa'
      g.fillRect(X(b), 0, 1.5, H)
    }
    // keyboard
    for (let m = M(H) - 1; m <= top + 1; m++) {
      const y = Yr(m), black = [1, 3, 6, 8, 10].includes(pc(m))
      g.fillStyle = black ? '#1c1a24' : '#e9e6f2'
      g.fillRect(0, y, KEYS - 2, row - 1)
      if (pc(m) === 0 || pc(m) === key.tonic || row >= 13) {
        g.fillStyle = black ? '#cfcbe0' : '#2b2840'
        g.font = `${pc(m) === key.tonic ? 'bold ' : ''}10px system-ui`
        g.fillText(spell(m, key), 4, y + row - 3)
      }
    }
    if (!cur) {
      g.fillStyle = '#ffffff99'
      g.font = '14px system-ui'
      g.fillText('В коде нет массивов мелодий. «＋ новая» создаст const MELODY = [[доля, n, длина], …]', KEYS + 20, 40)
    }
  }

  // ---- audition ----
  function beep(m, dur = 0.35, when = 0) {
    const a = app.player.actx
    if (!a) return
    const t = a.currentTime + when, o = a.createOscillator(), o2 = a.createOscillator(), gn = a.createGain()
    o.frequency.value = freq(m)
    o2.frequency.value = 2 * freq(m)
    o2.type = 'triangle'
    gn.gain.setValueAtTime(0, t)
    gn.gain.linearRampToValueAtTime(0.18, t + 0.008)
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
        for (const [b, n, d] of notes) {
          const at = loopStart + b
          if (at >= playing.next && at < playing.next + 0.25) beep(base + n, d * sec * 0.95, playing.t0 + at * sec - now)
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
    if (!cur) return
    const src = source()
    const now = findMelodies(src).find(m => m.name === cur.name)
    if (!now) return toast('мелодия пропала из кода — обнови', { kind: 'err' })
    const lineStart = src.lastIndexOf('\n', now.start) + 1, indent = src.slice(lineStart).match(/^\s*/)[0]
    const text = formatMelody(notes, indent)
    if (app.editor) app.editor.replaceIndex(now.start, now.end, text)
    else {
      const next = src.slice(0, now.start) + text + src.slice(now.end)
      app.drafts.set(app.current.id, next)
      clearTimeout(writeTimer)
      writeTimer = setTimeout(() => app.apply(next), 200)
    }
    cur = { ...now, notes: notes.map(e => [...e]) }
    const o = [...sel.options].find(o => o.value === cur.name)
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
    if (app.editor) app.editor.replaceIndex(pos, pos, decl)
    else app.apply(src.slice(0, pos) + decl + src.slice(pos))
    setTimeout(() => {
      load(app.current, false)
      const m = mels.find(m => m.name === name)
      if (m) { sel.value = name; select(m, false) }
      toast(`＋ ${name} — теперь используй её в дорожке: notesAt(${name}, …)`, { ms: 6000 })
    }, 600)
  }

  // ---- mouse & keys ----
  cv.addEventListener('contextmenu', e => {
    e.preventDefault()
    const r = cv.getBoundingClientRect(), hit = noteAt(e.clientX - r.left, e.clientY - r.top)
    if (hit) { notes.splice(hit.i, 1); selIdx.clear(); commit(); draw() }
  })
  cv.addEventListener('dblclick', e => {
    const r = cv.getBoundingClientRect(), hit = noteAt(e.clientX - r.left, e.clientY - r.top)
    if (hit) { notes.splice(hit.i, 1); selIdx.clear(); commit(); draw() }
  })
  cv.addEventListener('mousedown', e => {
    if (e.button !== 0 || !cur) return
    body.focus()
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top
    if (sx < KEYS) { beep(M(sy)); return }
    let hit = noteAt(sx, sy)
    if (!hit) {
      const b = Math.max(0, e.shiftKey ? B(sx) : Math.floor(B(sx) / grid() + 1e-9) * grid()), n = M(sy) - base
      notes.push([+b.toFixed(4), n, lastDur])
      hit = { i: notes.length - 1, edge: false, fresh: true }
      beep(base + n)
    } else beep(base + notes[hit.i][1])
    if (!e.ctrlKey) selIdx.clear()
    selIdx.add(hit.i)
    const [b0, n0, d0] = notes[hit.i]
    drag = { i: hit.i, edge: hit.edge, sx, sy, b0, n0, d0, moved: !!hit.fresh }
    draw()
  })
  addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top
    if (!drag) {
      if (e.target === cv) {
        const hit = noteAt(sx, sy)
        cv.style.cursor = hit ? (hit.edge ? 'ew-resize' : 'grab') : sx < KEYS ? 'pointer' : 'crosshair'
        if (hit?.i !== hover?.i) { hover = hit; draw() }
      }
      return
    }
    const db = (sx - drag.sx) / px, dn = Math.round(-(sy - drag.sy) / row), e0 = notes[drag.i]
    if (drag.edge) e0[2] = Math.max(grid() / (e.shiftKey ? 4 : 1), snap(drag.d0 + db, e))
    else {
      const nb = Math.max(0, snap(drag.b0 + db, e)), nn = drag.n0 + dn
      if (nn !== e0[1]) beep(base + nn, 0.2)
      e0[0] = +nb.toFixed(4)
      e0[1] = nn
    }
    drag.moved = true
    draw()
  })
  addEventListener('mouseup', () => {
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
    else top = Math.max(24, Math.min(120, top + (e.deltaY > 0 ? -2 : 2)))
    draw()
  }, { passive: false })
  body.addEventListener('keydown', e => {
    if (!selIdx.size) return
    const sel = [...selIdx].map(i => notes[i])
    if (e.key === 'Delete' || e.key === 'Backspace') {
      notes = notes.filter((_, i) => !selIdx.has(i))
      selIdx.clear()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1)
      sel.forEach(n => (n[1] += d))
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

  const pr = {
    visible: true,
    load: c => load(c, true),
    resize,
  }
  setTimeout(resize, 0)
  return pr
}
