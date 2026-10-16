// The code editor: the song's source next to the picture. Every edit is checked (syntax, imports,
// undeclared names) and — if it is valid — applied live: the music and the picture change without
// rendering, the new version cross-fades in. Click a number for a slider (drag e^{−8τ} and the kick
// gets shorter), Alt+drag a number to scrub it, Ctrl+Space for hints (picking an engine function
// imports it), hover a function for its signature. Runtime problems (an exception or NaN inside a
// track) come back from the audio workers with their line.
import { app } from './app.js'
import { h, esc, toast, modal } from './ui.js'
import { compile, trackList } from './runtime.js'
import * as acorn from './acorn.js'
import { API, TRACK_FIELDS } from './api.js'
import { renderSong } from './player.js'
import { spell, keyLabel, pc } from './theory.js'

export const TEMPLATE = `// My song — a template: drums, bass, Rhodes chords and a flute melody in A minor.
// x is time in beats. Edit anything: the music changes as you type.
//   Am – F – C – G, one bar per chord.
import { mod, floor, exp, hz, osc, filter, reverb, delay } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, trigger, poly, epianoTone, flute as breathyFlute, kickDrum, snareDrum, hatDrum, chorus } from '../src/instruments.js'

const SECTIONS = [[0, 'intro'], [8, 'groove'], [24, 'melody'], [40, 'outro']]
const END = 48
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const A2 = 110, A3 = 220, A4 = 440

// ---- harmony: semitones from A3, roots from A2 -------------------------------------------------
const CHORDS = [[0, 3, 7, 10], [-4, 0, 3, 7], [-9, -5, -2, 2], [-2, 2, 5, 7]] // Am7 Fmaj7 Cmaj7 G6
const ROOTS = [0, -4, 3, -2]
const k = x => mod(floor(x / 4), 4)

// ---- drums ------------------------------------------------------------------------------------
const kickAt = x => (is(x, 'groove', 'melody') || (is(x, 'outro') && x < END - 4) ? mod(x, 2) : null)
const snareAt = x => (is(x, 'groove', 'melody') && mod(x - 1, 2) < 1 ? mod(x - 1, 2) : null)
const drums = {
  color: '#ff4f8b',
  graph: x => (kickAt(x) !== null ? 3 + 1.4 * exp(-6 * kickAt(x)) : null),
  midi: x => [...(kickAt(x) !== null && kickAt(x) < 0.1 ? [36] : []), ...(snareAt(x) !== null && snareAt(x) < 0.1 ? [38] : [])],
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 48, f1: 140, decay: 8 }), snare = snareDrum({ decay: 14 }), hat = hatDrum({ decay: 60 })
    return x => {
      const kt = kickAt(x), st = snareAt(x), on = is(x, 'groove', 'melody')
      const y = 0.8 * kick(kt ?? 1, kt !== null) + 0.35 * snare((st ?? 1) * sec, st !== null) + 0.08 * hat(mod(x, 0.5) * sec, on)
      return pan(y)
    }
  },
}

// ---- bass ---------------------------------------------------------------------------------------
const bassAt = x => (x < END - 2 ? notesAt([[0, 0, 1.5], [1.5, 12, 0.5], [2, 7, 1.5], [3.5, 0, 0.5]], mod(x, 4)) : null)
const bass = {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? -2.6 + (ROOTS[k(x)] + bassAt(x).n) / 14 : null),
  midi: x => (bassAt(x) && bassAt(x).u < 0.9 ? [45 + ROOTS[k(x)] + bassAt(x).n] : []), // A2 = MIDI 45
  audio() {
    const saw = osc('saw'), sine = osc('sine'), lp = filter('lp'), gate = filter('lp')
    let n = 0
    return x => {
      const m = bassAt(x)
      if (m) n = ROOTS[k(x)] + m.n
      const f = hz(n, A2), env = gate(m && m.u < 0.92 ? exp(-2.5 * m.τ) : 0, 60)
      return 0.3 * lp(env * saw(f), 250 + 1400 * env) + 0.25 * env * sine(f)
    }
  },
}

// ---- Rhodes chords ------------------------------------------------------------------------------
const rhodes = {
  color: '#ffcf9f',
  graph: x => (x < END ? CHORDS[k(x)].map(n => -0.6 + n / 24) : null),
  midi: x => (x < END && mod(x, 4) < 3.8 ? CHORDS[k(x)].map(n => 57 + n) : []), // A3 = MIDI 57
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(epianoTone, { release: 0.4 }), fire = trigger(), ch = chorus({ mix: 0.4 }), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      if (x < END && fire(floor(x / 4) * 4)) CHORDS[k(x)].forEach((n, i) => keys.hit(hz(n, A3), 0.6 + 0.1 * hash(i, floor(x)), 3.8 * sec, i * 0.015))
      return verb(...ch(...pan(0.12 * keys(), -0.2)))
    }
  },
}

// ---- flute melody: [beat, n from A4, length] ----------------------------------------------------
const MELODY = [
  [0, 7, 1], [1, 3, 0.5], [1.5, 2, 0.5], [2, 0, 2],
  [4, 0, 0.5], [4.5, 3, 0.5], [5, 7, 1], [6, 8, 2],
  [8, 7, 1.5], [9.5, 5, 0.5], [10, 3, 1], [11, 2, 1],
  [12, 3, 1], [13, 2, 1], [14, -2, 2],
]
const fluteAt = x => (is(x, 'melody') ? notesAt(MELODY, mod(part(x).t, 16)) : null)
const flute = {
  color: '#e8f4ff',
  graph: x => (fluteAt(x) ? 1.3 + fluteAt(x).n / 12 : null),
  midi: x => (fluteAt(x) && fluteAt(x).u < 0.92 ? [69 + fluteAt(x).n] : []), // A4 = MIDI 69
  formula: [String.raw\`y = a\\big(0.6\\sin 2\\pi\\!\\int\\! f + 0.1\\sin 4\\pi\\!\\int\\! f + \\BP_{2f}\\,\\eta\\big),\\quad f = 440\\cdot 2^{n/12}\`],
  audio({ bpm }) {
    const fl = breathyFlute(), echo = delay({ time: (60 / bpm) * 0.75, feedback: 0.35, wet: 0.25 }), verb = reverb({ room: 0.85, wet: 0.35 })
    let n = 0
    return x => {
      const m = fluteAt(x)
      if (m) n = m.n
      return verb(...echo(...pan(0.3 * fl(hz(n, A4), m && m.u < 0.92), 0.2)))
    }
  },
}

export default {
  name: 'my-song',
  bpm: 92,
  length: END,
  key: 'Am',
  sections: SECTIONS,
  tracks: { drums, bass, rhodes, flute },
}
`

// ---- static analysis --------------------------------------------------------------------------------
const GLOBALS = new Set(('Math Number Array Object String JSON Infinity NaN undefined console Set Map WeakMap Float32Array Float64Array Int16Array Int32Array Uint8Array Uint32Array ' +
  'Boolean Symbol Error TypeError RangeError Date RegExp Promise BigInt parseInt parseFloat isFinite isNaN globalThis structuredClone arguments').split(' '))
let EXPORTS = null
function exportsOf() {
  if (EXPORTS) return EXPORTS
  const names = src => {
    const out = new Set()
    for (const n of acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }).body) {
      if (n.type !== 'ExportNamedDeclaration' || !n.declaration) continue
      const d = n.declaration
      if (d.type === 'VariableDeclaration') for (const v of d.declarations) collect(v.id, out)
      else out.add(d.id.name)
    }
    return out
  }
  return (EXPORTS = { engine: names(app.SRC.engine), instruments: names(app.SRC.instruments) })
}
function collect(p, out) {
  if (!p) return out
  if (p.type === 'Identifier') out.add(p.name)
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => collect(q.type === 'RestElement' ? q.argument : q.value, out))
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => collect(e, out))
  else if (p.type === 'AssignmentPattern') collect(p.left, out)
  else if (p.type === 'RestElement') collect(p.argument, out)
  return out
}
// every node, depth first, with its parent
function walk(node, f, parent = null) {
  if (!node || typeof node.type !== 'string') return
  f(node, parent)
  for (const k in node) {
    if (k === 'loc' || k === 'start' || k === 'end') continue
    const v = node[k]
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, f, node))
    else if (v && typeof v.type === 'string') walk(v, f, node)
  }
}
// → [{ line, col, message, severity, fix? }]
export function lint(src) {
  const out = []
  try {
    compile(src)
  } catch (e) {
    return [{ line: e.line ?? 1, col: e.col ?? 0, message: e.message, severity: 'error' }]
  }
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true })
  const ex = exportsOf(), declared = new Set()
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue
    const mod = /engine/.test(node.source.value) ? 'engine' : /instruments/.test(node.source.value) ? 'instruments' : null
    for (const s of node.specifiers) {
      declared.add(s.local.name)
      if (mod && s.imported && !ex[mod].has(s.imported.name)) {
        const other = mod === 'engine' ? 'instruments' : 'engine'
        out.push({ line: s.loc.start.line, col: s.loc.start.column, severity: 'error', message: `в ${mod}.js нет «${s.imported.name}»` + (ex[other].has(s.imported.name) ? ` — она в ${other}.js` : '') })
      }
    }
  }
  walk(ast, n => {
    if (n.type === 'VariableDeclarator') collect(n.id, declared)
    else if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') {
      if (n.id) declared.add(n.id.name)
      n.params.forEach(p => collect(p, declared))
    } else if (n.type === 'CatchClause') collect(n.param, declared)
    else if (n.type === 'ClassDeclaration' && n.id) declared.add(n.id.name)
  })
  const seen = new Set()
  walk(ast, (n, parent) => {
    if (n.type !== 'Identifier' || declared.has(n.name) || GLOBALS.has(n.name) || seen.has(n.name)) return
    if (parent?.type === 'MemberExpression' && parent.property === n && !parent.computed) return
    if (parent?.type === 'Property' && parent.key === n && !parent.computed && !parent.shorthand) return
    if (parent?.type === 'MethodDefinition' || parent?.type === 'LabeledStatement' || parent?.type === 'BreakStatement' || parent?.type === 'ContinueStatement') return
    if ((parent?.type === 'ImportSpecifier' || parent?.type === 'ExportSpecifier')) return
    seen.add(n.name)
    const api = API[n.name]
    out.push({ line: n.loc.start.line, col: n.loc.start.column, severity: 'error', message: `«${n.name}» не объявлена` + (api ? ` — импортируй из ${api[0]}.js (клик — добавить)` : ''), fix: api ? { name: n.name, mod: api[0] } : null })
  })
  return out
}
// checks of the loaded song object → warnings
function songChecks(song) {
  const out = [], w = message => out.push({ line: null, message, severity: 'warning' })
  if (!(song.bpm > 20 && song.bpm < 400)) w(`bpm = ${song.bpm}: ожидается 20…400`)
  if (!(song.length > 0)) w('length должна быть > 0 (в долях)')
  const s = song.sections ?? []
  for (let i = 1; i < s.length; i++) if (s[i][0] <= s[i - 1][0]) w(`sections: «${s[i][1]}» начинается не позже «${s[i - 1][1]}»`)
  for (const [key, t] of trackList(song)) {
    if (typeof t.audio !== 'function') w(`${key}: нет audio({ bpm }) — дорожка не звучит`)
    if (t.color && !/^#[0-9a-f]{6}$/i.test(t.color) && !/^hsl/.test(t.color)) w(`${key}: color '${t.color}' — нужен вид '#rrggbb'`)
  }
  return out
}

// Adds `name` to the import from ../src/<mod>.js (creating the import if needed)
export function addImport(cm, name, mod) {
  const src = cm.getValue(), re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*(['"])\\.\\./src/${mod}\\.js\\2`)
  const m = src.match(re)
  if (m) {
    const inner = m[1], end = src.indexOf(m[0]) + m[0].indexOf('}')
    const names = inner.split(',').map(s => s.trim()).filter(Boolean)
    if (names.some(s => s.split(/\s+as\s+/).pop() === name)) return
    const pos = cm.posFromIndex(end - (inner.match(/\s*$/)?.[0].length ?? 0))
    cm.replaceRange((inner.trim().endsWith(',') ? ' ' : ', ') + name, pos)
  } else {
    const lines = src.split('\n')
    let at = lines.findLastIndex(l => /^import\b/.test(l))
    if (at < 0) at = lines.findIndex(l => !/^\s*\/\//.test(l)) - 1
    cm.replaceRange(`import { ${name} } from '../src/${mod}.js'\n`, { line: Math.max(0, at + 1), ch: 0 })
  }
}

// ---- the editor panel ----------------------------------------------------------------------------------
export function createEditor(root) {
  root.innerHTML = ''
  const title = h('span', { class: 'title' }, 'код песни'), state = h('span', { class: 'state' }, '')
  const autoBtn = h('button', { class: 'on', title: 'применять правки сразу (иначе Ctrl+Enter)' }, '⚡ сразу')
  const head = h('div', { class: 'ed-head' }, title, state,
    h('button', { title: 'применить (Ctrl+Enter)', onclick: () => check(true) }, '▶ применить'), autoBtn,
    h('button', { title: 'пианоролл — рисовать мелодию (P)', onclick: () => app.togglePianoRoll(true) }, '🎹'),
    h('button', { title: 'справочник функций', onclick: apiReference }, '📖'),
    h('button', { title: 'закрыть (E)', onclick: () => app.toggleEditor(false) }, '✕'))
  const body = h('div', { class: 'ed-body' }), probs = h('div', { class: 'ed-problems' })
  root.append(head, body, probs)
  let annotations = []
  const cm = CodeMirror(body, {
    value: '', mode: 'javascript', theme: 'mm', lineNumbers: true, matchBrackets: true, autoCloseBrackets: true,
    styleActiveLine: true, tabSize: 2, indentUnit: 2, lineWrapping: false, gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers'],
    lint: { getAnnotations: () => annotations, lintOnChange: false },
    extraKeys: {
      'Ctrl-Space': c => c.showHint({ hint: hinter, completeSingle: false }),
      'Ctrl-Enter': () => check(true), 'Cmd-Enter': () => check(true),
      'Ctrl-/': c => c.toggleComment(), 'Cmd-/': c => c.toggleComment(),
      Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  ')),
    },
  })
  let cur = null, timer = null, auto = true, applying = false, pending = false, runtime = [], lastStatic = []
  autoBtn.onclick = () => { auto = !auto; autoBtn.classList.toggle('on', auto) }
  const setState = (text, kind = '') => { state.textContent = text; state.className = 'state ' + kind }
  // the title: the song's name, with ● while its code differs from the saved one
  const markTitle = () => (title.textContent = (app.dirty(cur) ? '● ' : '') + (cur?.song?.name ?? cur?.entry?.name ?? 'песня'))

  function show(list) {
    const all = [...list, ...runtime]
    annotations = all.filter(p => p.line).map(p => ({
      from: CodeMirror.Pos(p.line - 1, 0), to: CodeMirror.Pos(p.line - 1, 1e4), message: p.message, severity: p.severity === 'warning' ? 'warning' : 'error',
    }))
    cm.performLint()
    probs.innerHTML = ''
    for (const p of all) {
      const row = h('div', { class: p.severity === 'warning' ? 'warn' : '' }, (p.line ? `стр. ${p.line}: ` : '') + p.message)
      row.onclick = () => {
        if (p.fix) { addImport(cm, p.fix.name, p.fix.mod); return }
        if (p.line) {
          cm.setCursor({ line: p.line - 1, ch: p.col ?? 0 })
          cm.scrollIntoView(null, 120)
          cm.focus()
        }
      }
      probs.append(row)
    }
  }
  async function check(applyIt = auto) {
    clearTimeout(timer)
    const src = cm.getValue()
    if (!cur) return
    const list = lint(src)
    lastStatic = list
    if (list.some(p => p.severity === 'error')) {
      show(list)
      setState('✗ ошибка — звучит прошлая версия', 'err')
      return
    }
    if (src === cur.source && !cur.broken) {
      show(list)
      setState(app.dirty(cur) ? '● не сохранено' : '✓', app.dirty(cur) ? '' : 'ok')
      markTitle()
      return
    }
    if (!applyIt) {
      show(list)
      setState('Ctrl+Enter — применить')
      return
    }
    if (applying) { pending = true; return }
    applying = true
    runtime = []
    setState('применяю…')
    // this song's edit: if another song is opened meanwhile, the result is dropped (apply says stale)
    const c = cur
    let r
    try {
      r = await app.apply(src, { of: c })
    } finally {
      applying = false
    }
    if (cur !== c || r.stale) {
      // another song is in the editor now (or about to be): nothing here is about it
    } else if (!r.ok) {
      show([...list, { line: r.line, message: r.error, severity: 'error' }])
      setState('✗ ошибка — звучит прошлая версия', 'err')
    } else {
      app.setDraft(c, src)
      show([...list, ...(r.problems ?? []).map(p => ({ ...p, severity: 'error' })), ...songChecks(c.song)])
      setState(app.dirty(c) ? '♪ звучит · ● не сохранено' : '♪ звучит · ✓ как сохранено', 'ok')
      markTitle()
      app.pianoroll?.load?.(c)
    }
    if (pending) {
      pending = false
      check(true)
    }
  }
  cm.on('change', (_, ch) => {
    if (ch.origin === 'setValue') return
    // every keystroke is a draft (applied or not) until saved or reverted — or undone back to the saved code
    if (cur?.entry) {
      app.setDraft(cur, cm.getValue())
      markTitle()
    }
    clearTimeout(timer)
    timer = setTimeout(() => check(), sliderFast ? 90 : 450)
  })
  // auto-hints after two identifier characters
  cm.on('inputRead', (c, ch) => {
    if (!/^[\w$]$/.test(ch.text[0])) return
    const tok = c.getTokenAt(c.getCursor())
    if (tok.string.length >= 2 && !/comment|string/.test(tok.type ?? '')) c.showHint({ hint: hinter, completeSingle: false })
  })

  // ---- hints ----
  function hinter(c) {
    const pos = c.getCursor(), tok = c.getTokenAt(pos)
    const word = /^[\w$]+$/.test(tok.string) ? tok.string.slice(0, pos.ch - tok.start) : ''
    const from = CodeMirror.Pos(pos.line, word ? tok.start : pos.ch), to = CodeMirror.Pos(pos.line, word ? tok.end : pos.ch)
    const prev = c.getRange(CodeMirror.Pos(pos.line, Math.max(0, from.ch - 1)), from)
    const list = []
    const add = (text, sig, desc, mod) => list.push({
      text, displayText: text,
      render: el => el.append(h('b', {}, text), h('span', { class: 'hs' }, sig ? ' ' + sig.replace(/^\w+/, '') : ''), desc ? h('span', { class: 'hs' }, ' — ' + desc) : ''),
      hint: (cmi, data, comp) => {
        cmi.replaceRange(comp.text, data.from, data.to)
        if (mod) addImport(cmi, text, mod)
      },
    })
    if (prev === '.') {
      for (const [k, d] of Object.entries(TRACK_FIELDS)) if (k.startsWith(word)) add(k, '', d)
    } else {
      const src = c.getValue(), imported = new Set(src.match(/import\s*\{[^}]*\}/g)?.join(',').match(/[\w$]+/g) ?? [])
      for (const [k, [mod, sig, desc]] of Object.entries(API)) if (k.toLowerCase().startsWith(word.toLowerCase())) add(k, sig, desc, imported.has(k) ? null : mod)
      const locals = new Set(src.match(/[A-Za-zА-я_$][\w$]*/g))
      for (const k of locals) if (k !== word && k.startsWith(word) && !API[k] && k.length > 1) add(k)
    }
    return { list: list.slice(0, 60), from, to }
  }

  // ---- hover tips for API names ----
  const tip = h('div', { class: 'api-tip', style: 'display:none' })
  document.body.append(tip)
  cm.getWrapperElement().addEventListener('mousemove', e => {
    const p = cm.coordsChar({ left: e.clientX, top: e.clientY }), tok = cm.getTokenAt(p, true)
    const api = tok.string && API[tok.string], field = tok.type === 'property' && TRACK_FIELDS[tok.string]
    if ((api || field) && p.ch > tok.start && p.ch <= tok.end) {
      tip.innerHTML = api ? `<code>${esc(api[1])}</code><div>${esc(api[2])}</div><div class="m">${api[0]}.js</div>` : `<code>${esc(tok.string)}</code><div>${esc(field)}</div>`
      tip.style.display = ''
      tip.style.left = Math.min(innerWidth - 540, e.clientX + 14) + 'px'
      tip.style.top = e.clientY + 18 + 'px'
    } else tip.style.display = 'none'
  })
  cm.getWrapperElement().addEventListener('mouseleave', () => (tip.style.display = 'none'))

  // ---- number sliders: click a number → slider; Alt+drag → scrub ----
  let pop = null, sliderFast = false, mark = null
  const numberAt = pos => {
    const tok = cm.getTokenAt(pos, true)
    if (tok.type !== 'number' || !/^\d*\.?\d+(e[+-]?\d+)?$/i.test(tok.string)) return null
    return { line: pos.line, from: tok.start, to: tok.end, text: tok.string }
  }
  const fmt = (v, like) => {
    const dec = (like.split('.')[1] ?? '').length, isInt = !like.includes('.')
    if (isInt && Math.abs(v) >= 2) return String(Math.round(v))
    const sig = Math.max(dec, Math.max(0, 2 - Math.floor(Math.log10(Math.max(1e-9, Math.abs(v))))))
    return v.toFixed(Math.min(6, sig))
  }
  function closePop() {
    pop?.remove()
    pop = null
    mark?.clear()
    mark = null
    sliderFast = false
  }
  function openSlider(num) {
    closePop()
    const v0 = Number(num.text), lin = v0 === 0
    const lo = lin ? -1 : v0 / 8, hi = lin ? 1 : v0 * 8
    const toV = s => (lin ? lo + (hi - lo) * s : lo * (hi / lo) ** s), toS = v => (lin ? (v - lo) / (hi - lo) : Math.log(v / lo) / Math.log(hi / lo))
    const range = h('input', { type: 'range', min: 0, max: 1000, value: Math.round(1000 * toS(v0)) })
    const out = h('span', { class: 'v' }, num.text)
    pop = h('div', { class: 'slider-pop' }, h('span', { style: 'color:var(--dim)' }, lin ? '−1' : '÷8'), range, h('span', { style: 'color:var(--dim)' }, lin ? '+1' : '×8'), out,
      h('button', { title: 'вернуть', onclick: () => setNum(num.text) }, '↺'), h('button', { onclick: closePop }, '✕'))
    document.body.append(pop)
    const place = () => {
      const c = cm.charCoords({ line: num.line, ch: num.from }, 'window')
      pop.style.left = Math.max(8, Math.min(innerWidth - 420, c.left - 30)) + 'px'
      pop.style.top = c.bottom + 6 + 'px'
    }
    place()
    let curNum = { ...num }
    mark = cm.markText({ line: num.line, ch: num.from }, { line: num.line, ch: num.to }, { className: 'cm-num-hot' })
    function setNum(t) {
      sliderFast = true
      cm.replaceRange(t, { line: curNum.line, ch: curNum.from }, { line: curNum.line, ch: curNum.to }, '+slider')
      curNum.to = curNum.from + t.length
      out.textContent = t
      mark?.clear()
      mark = cm.markText({ line: curNum.line, ch: curNum.from }, { line: curNum.line, ch: curNum.to }, { className: 'cm-num-hot' })
    }
    range.oninput = () => setNum(fmt(toV(range.value / 1000), num.text))
    range.onkeydown = e => e.key === 'Escape' && closePop()
  }
  cm.on('mousedown', (c, e) => {
    const pos = c.coordsChar({ left: e.clientX, top: e.clientY }), num = numberAt(pos)
    if (!num) { if (pop && !pop.contains(e.target)) closePop(); return }
    if (e.altKey) { // scrub
      e.preventDefault()
      let x0 = e.clientX, v = Number(num.text), n = { ...num }
      const step = v === 0 ? 0.01 : Math.abs(v) * 0.01
      const move = ev => {
        const dv = (ev.clientX - x0) * step * (ev.shiftKey ? 0.1 : 1)
        const t = fmt(Math.max(v + dv, num.text.includes('.') ? -1e9 : 0), num.text)
        sliderFast = true
        c.replaceRange(t, { line: n.line, ch: n.from }, { line: n.line, ch: n.to }, '+slider')
        n.to = n.from + t.length
      }
      const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); sliderFast = false }
      addEventListener('mousemove', move)
      addEventListener('mouseup', up)
      return
    }
    setTimeout(() => { if (!c.somethingSelected()) openSlider(num) }, 0)
  })
  cm.on('keydown', (c, e) => { if (pop && e.key === 'Escape') closePop() })
  cm.on('scroll', () => closePop())

  const ed = {
    cm, visible: true,
    load(c) {
      // a check pending for the song shown before must not run on this one
      clearTimeout(timer)
      pending = false
      cur = c
      if (!c) return
      const src = app.drafts.get(c.id) ?? c.source
      if (cm.getValue() !== src) {
        const keepScroll = cm.getValue() && cur?.id === c.id
        cm.setValue(src)
        if (!keepScroll) cm.clearHistory()
      }
      runtime = []
      markTitle()
      if (c.broken) show([{ line: c.broken.line, message: c.broken.error, severity: 'error' }])
      else check(false)
    },
    owner: () => cur, // the song (app.current object) this editor holds
    value: () => cm.getValue(),
    refresh: () => cm.refresh(),
    focus: () => cm.focus(),
    // after Ctrl+S: typing that came in while it saved stays a draft
    saved() {
      if (!cur) return
      app.drafts.put(cur.id, cm.getValue(), cur.entry.source)
      markTitle()
      setState(app.dirty(cur) ? '● не сохранено' : '✓ сохранено', app.dirty(cur) ? '' : 'ok')
    },
    revert() {
      if (!cur) return
      app.drafts.delete(cur.id)
      cm.setValue(cur.entry.source)
      markTitle()
      check(true)
    },
    problem(d) {
      if (runtime.some(p => p.message === d.message)) return
      runtime.push({ line: d.line, message: d.message, severity: 'error' })
      show(lastStatic)
      setState('⚠ ошибка в дорожке — она заглушена', 'err')
    },
    // replace a source range (piano roll) → applied like an edit
    replaceIndex(from, to, text) {
      cm.replaceRange(text, cm.posFromIndex(from), cm.posFromIndex(to), '+pianoroll')
    },
  }
  return ed
}

// ---- the reference of the API ---------------------------------------------------------------------------
export function apiReference() {
  const groups = { engine: [], instruments: [] }
  for (const [k, [mod, sig, desc]] of Object.entries(API)) groups[mod].push(`<tr><td><code>${esc(sig)}</code></td><td>${esc(desc)}</td></tr>`)
  const fields = Object.entries(TRACK_FIELDS).map(([k, d]) => `<tr><td><code>${k}</code></td><td>${esc(d)}</td></tr>`).join('')
  modal('Справочник функций', `
    <p class="dim">x — время в долях; τ — долей с удара; t — секунд с ноты. Песня: <code>export default { name, bpm, length, key?, sections, tracks }</code>.
    Импорт: <code>import { … } from '../src/engine.js'</code> и <code>'../src/instruments.js'</code>. Нажми <kbd>Ctrl+Space</kbd> в коде — подскажет и сам допишет импорт.</p>
    <h3>Дорожка</h3><table>${fields}</table>
    <h3>engine.js</h3><table>${groups.engine.join('')}</table>
    <h3>instruments.js</h3><table>${groups.instruments.join('')}</table>
    <style>.modal table{border-collapse:collapse;width:100%;font-size:12px}.modal td{padding:3px 6px;border-top:1px solid var(--line);vertical-align:top}.modal td:first-child{white-space:nowrap}.modal h3{margin:14px 0 4px;font-size:14px}</style>`)
}

// ---- full check: render the whole song off-line, measure every track ------------------------------------------
const dB = v => (v > 0 ? 20 * Math.log10(v) : -Infinity)
// ITU-R BS.1770 integrated loudness (K-weighting, 400 ms blocks, −70 LUFS absolute and −10 LU relative gates)
export function lufs(L, R, sr = 44100) {
  const biquad = (b0, b1, b2, a1, a2) => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    return x => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = x; y2 = y1; y1 = y
      return y
    }
  }
  // the BS.1770 pre-filter (high shelf) and RLB high-pass, coefficients for 48 kHz recomputed for sr
  const shelf = () => {
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / sr)
    const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K
    return biquad((Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0)
  }
  const hp = () => {
    const f0 = 38.13547087602444, Q = 0.5003270373238773, K = Math.tan(Math.PI * f0 / sr), a0 = 1 + K / Q + K * K
    return biquad(1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0)
  }
  const chans = [L, R].map(x => {
    const s = shelf(), p = hp(), y = new Float32Array(x.length)
    for (let i = 0; i < x.length; i++) y[i] = p(s(x[i]))
    return y
  })
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), z = []
  for (let i = 0; i + block <= L.length; i += hop) {
    let e = 0
    for (const y of chans) for (let j = i; j < i + block; j++) e += y[j] * y[j]
    z.push(e / block)
  }
  const ld = e => -0.691 + 10 * Math.log10(e)
  let gated = z.filter(e => ld(e) > -70)
  if (!gated.length) return -Infinity
  const rel = ld(gated.reduce((a, b) => a + b, 0) / gated.length) - 10
  gated = gated.filter(e => ld(e) > rel)
  return ld(gated.reduce((a, b) => a + b, 0) / gated.length)
}
export async function fullCheck() {
  const cur = app.current
  if (!cur?.song) return toast('нет песни')
  const source = app.editor?.value?.() ?? cur.source
  const t = toast('проверяю: рендер всей песни…', { progress: true })
  const problems = []
  let r
  try {
    r = await renderSong(app.SRC, source, { onProgress: p => t.set(null, p), onProblem: d => problems.push(d), stats: true })
  } catch (e) {
    t.done('ошибка: ' + e.message, 'err')
    return
  }
  t.close()
  const loudest = Math.max(...r.keys.map(k => dB(r.stats[k].rms)))
  const rows = r.keys.map(k => {
    const s = r.stats[k], tr = trackList(r.song).find(([key]) => key === k)?.[1]
    let lo = Infinity, hi = -Infinity
    if (tr?.midi && !/drum|kick|snare|hat|perc|clap|beat/i.test(k)) {
      for (let x = 0; x < r.song.length; x += 0.25) {
        let m = []
        try { m = tr.midi(x) ?? [] } catch {}
        for (const n of m) if (Number.isFinite(n)) (lo = Math.min(lo, n)), (hi = Math.max(hi, n))
      }
    }
    const flag = s.nan ? '<b style="color:var(--danger)">NaN</b>' : dB(s.rms) < loudest - 22 ? 'тихо?' : dB(s.peak) > -1.5 ? '<span style="color:var(--danger)">горячо?</span>' : ''
    const range = lo <= hi ? `${spell(lo, cur.key)}–${spell(hi, cur.key)}` : ''
    return `<tr><td>${esc(k)}</td><td>${dB(s.peak).toFixed(1)}</td><td>${dB(s.rms).toFixed(1)}</td><td>${range}</td><td>${flag}</td></tr>`
  }).join('')
  const L = lufs(r.L, r.R), secs = r.end / 44100
  modal('Проверка песни', `
    <p>${esc(r.song.name)} · ${esc(app.tonalityOf?.(r.song, cur.key) ?? keyLabel(cur.key))} · ${r.song.bpm} BPM · ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} ·
    громкость микса <b>${L.toFixed(1)} LUFS</b> <span class="dim">(после нормализации к −1 dBFS; стриминг ≈ −14)</span></p>
    <table><tr><th>дорожка</th><th>пик dB</th><th>RMS dB</th><th>диапазон</th><th></th></tr>${rows}</table>
    ${problems.length ? '<h3>ошибки</h3><pre>' + esc(problems.map(p => (p.line ? `стр. ${p.line}: ` : '') + p.message).join('\n')) + '</pre>' : '<p style="color:var(--ok)">✓ без NaN и исключений</p>'}
    <p class="dim">«тихо?» — RMS на 22 дБ ниже самой громкой дорожки; «горячо?» — пик выше −1.5 dBFS после нормализации микса. Бас обычно стоит на 2–4 дБ тише лида.</p>
    <style>.modal table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}.modal td,.modal th{padding:3px 8px;border-top:1px solid var(--line);text-align:left}</style>`)
}
