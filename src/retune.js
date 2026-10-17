// The same music in another tonic and mode — for any song, written by hand or not (a generated song is
// simply made again from its seeds instead). The copy is the song's own code with a prelude:
//   · every pitch made from a note number goes through __N — the engine's hz(), the song's own
//     `BASE * 2 ** (expr / 12)` (or Math.pow) formulas, meower() and bowed();
//   · __N moves the note to the same scale degree of the new mode (an altered note keeps its alteration
//     unless that lands on a scale note), then the whole song to the new tonic (the nearest way, ≤ a tritone);
//     between the notes it is continuous, so bends, vibrato and glides keep their shape;
//   · a section that modulates (its notes fit the scale a few semitones away much better) is mapped in its
//     own key and keeps its modulation;
//   · the tracks' midi() go through the same map (note names, MIDI export), name/key/mode are the new ones.
// The prelude keeps its parameters (__RT), so a copy can be retuned again from the original's scale.
// Microtonal modes work the same way (C major → C Rast: E → E𝄳, B → B𝄳; to a measured slendro: the nearest of its
// five notes) and midi() then reports the microtones (63.5). A temperament (src/tuning.js) re-tunes the twelve notes
// of the result: every frequency gets its note's offset in cents, per the key of each section.
// A project (src/project.js) keeps its notes as data: those are moved by retuneProject there, note by note; here its
// tracks (project: true) are left alone, the prelude goes in front of the project's block, and the song's literal is
// found inside __project(…).
// parse: acorn's parse (the app has viz/app/acorn.js), passed in so this file runs in Node and in the page.
import { MODES, modeOf, tonicPc, keyFor, tonalityLabel, isMicro } from './modes.js'
import { songKey, parseKey } from './theory.js'
import { temperOf, temperOffsets } from './tuning.js'

const UNPITCHED = /drum|kick|snare|hat|perc|clap|paw|hiss|claw|beat|fx|sfx|noise|ambience|rain|vinyl|riser|taiko|tsuzumi|kane/i
const pcOf = n => ((n % 12) + 12) % 12
const parentOf = iv => (iv.includes(3) && !iv.includes(4) ? 'minor' : 'major')
const r4 = v => Math.round(v * 1e4) / 1e4

// semitone shift of every pitch class (relative to the tonic) from scale src to scale dst (dst may be microtonal)
export function degreeTable(src, dst) {
  const inDst = v => dst.some(d => Math.abs(pcOf(v) - d) < 1e-6 || Math.abs(pcOf(v) - d - 12) < 1e-6)
  const S = i => (i < 7 ? src[i] : 12), D = i => (i < dst.length ? dst[i] : 12 + dst[0])
  return Array.from({ length: 12 }, (_, p) => {
    if (dst.length !== 7 || src.length !== 7) { // a pentatonic or other size: the nearest note of the new scale
      let best = 0
      for (const o of [-12, 0, 12]) for (const v of dst) if (Math.abs(v + o - p) < Math.abs(best - p) || (Math.abs(v + o - p) === Math.abs(best - p) && v + o < best)) best = v + o
      return r4(best - p)
    }
    const d = src.indexOf(p)
    if (d >= 0) return r4(dst[d] - p)
    const below = src.findLastIndex(v => v < p), lo = D(below) + (p - S(below)), hi = D(below + 1) - (S(below + 1) - p)
    const inLo = inDst(lo), inHi = inDst(hi)
    const v = inLo !== inHi ? (inLo ? hi : lo) : Math.abs(hi - p) <= Math.abs(lo - p) ? hi : lo
    return r4(v - p)
  })
}

// the song's own scale: its mode if it has seven notes, else its major / minor
function scaleOf(song, key) {
  const m = song.mode && MODES[song.mode]
  return m && m.iv.length === 7 ? m.iv : MODES[key.mode === 'minor' ? 'minor' : 'major'].iv
}

// sections in another key: [[beat, t], …]. A section modulates when its notes (the bass weighted) no longer
// correlate with the home key's Krumhansl–Kessler profile (r ≤ 0.2) but do with the same mode t semitones
// away (r ≥ 0.5, at least 0.5 more): a real key change, not a build on the dominant (those keep r(0) ≈ 0.3–0.5)
const KK = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] }
const corr = (a, b) => {
  const ma = a.reduce((x, y) => x + y) / 12, mb = b.reduce((x, y) => x + y) / 12
  let n = 0, da = 0, db = 0
  for (let i = 0; i < 12; i++) (n += (a[i] - ma) * (b[i] - mb)), (da += (a[i] - ma) ** 2), (db += (b[i] - mb) ** 2)
  return da && db ? n / Math.sqrt(da * db) : 0
}
export function modulations(song, key, iv) {
  const secs = song.sections?.length ? song.sections.map(s => s[0]) : [0]
  const tracks = Object.entries(song.tracks ?? {}).filter(([k, t]) => t && typeof t.midi === 'function' && !UNPITCHED.test(k)).map(([, t]) => t)
  const out = []
  secs.forEach((b0, i) => {
    const b1 = secs[i + 1] ?? song.length, hist = new Array(12).fill(0)
    let total = 0
    for (let x = b0; x < b1; x += 0.25) {
      let lo = Infinity
      for (const t of tracks) {
        let m = null
        try { m = t.midi(x) } catch {}
        for (const n of [].concat(m ?? [])) if (Number.isFinite(n)) (hist[pcOf(Math.round(n))]++), (lo = Math.min(lo, n)), total++
      }
      if (lo < Infinity) hist[pcOf(Math.round(lo))] += 3
    }
    let off = 0
    if (total >= 24 && b1 - b0 >= 8) {
      const prof = KK[parentOf(iv)], r = t => corr(hist, prof.map((_, j) => prof[pcOf(j - key.tonic - t)]))
      let best = 0
      for (let t = -5; t <= 6; t++) if (r(t) > r(best)) best = t
      // …and its notes must fit that scale better: a section in the relative minor has the same notes — no shift
      const fit = t => iv.reduce((a, v) => a + hist[pcOf(key.tonic + t + v)], 0)
      if (best && r(0) <= 0.2 && r(best) >= 0.5 && r(best) - r(0) >= 0.5 && fit(best) > fit(0) * 1.05) off = best
    }
    if (!out.length || out[out.length - 1][1] !== off) out.push([b0, off])
  })
  return out.length ? out : [[0, 0]]
}

// the parameters of a retuned copy: { name, tonic, iv (the original's scale), tr, to, sect, key, mode, tm }
// target: { tonic: 'D' | 'E𝄳', mode, temperament? } — tm: the temperament's cents of the twelve notes per section
// offset (a tuning on the tonic or on the spelling follows each modulation), null in 12-TET or a microtonal mode
export function retunePlan(song, target, prev = null) {
  const key = prev ? { tonic: prev.tonic } : songKey(song)
  const iv = prev ? prev.iv : scaleOf(song, key), m = modeOf(target.mode), dst = m.iv
  let tr = r4(pcOf(tonicPc(target.tonic) - key.tonic))
  if (tr > 5.75) tr = r4(tr - 12)
  const sect = prev ? prev.sect : modulations(song, key, iv)
  const t = target.temperament && !isMicro(m) ? temperOf(target.temperament) : null
  const tkey = parseKey(keyFor(target.tonic, target.mode))
  const tm = t && t.kind !== 'equal' && t.kind !== 'adaptive'
    ? Object.fromEntries([...new Set(sect.map(s => s[1]))].map(o => [o, temperOffsets(t.id, { ...tkey, tonic: pcOf(tkey.tonic + o) })]))
    : null
  return {
    name: prev?.name ?? song.name, tonic: key.tonic, iv, tr, to: degreeTable(iv, dst), sect,
    key: keyFor(target.tonic, target.mode), mode: ['major', 'minor'].includes(target.mode) ? null : target.mode,
    label: tonalityLabel(target) + (tm ? ` · ${t.name}` : ''), tm, temperament: tm ? t : null,
  }
}

const rtData = rt => ({ name: rt.name, label: rt.label, key: rt.key, mode: rt.mode, tonic: rt.tonic, iv: rt.iv, tr: rt.tr, to: rt.to, sect: rt.sect, ...(rt.tm ? { tm: rt.tm } : {}) })

// ---- the code -----------------------------------------------------------------------------------------------
const PRELUDE_END = '// ---- end of the retune prelude'
const PRELUDE = rt => `
// ---- a retuned copy: «${rt.name}» in ${rt.label} (Лады → «эта же музыка в …») ----------------------------
// every pitch made from a note number goes through __N: the note moves to the same degree of the new mode, then
// to the new tonic; continuous between notes (bends, vibrato and glides keep their shape); __X = the beat now.
// __T: a temperament's offset of the note (cents, by pitch class of the section's key), between notes interpolated.
const __RT = ${JSON.stringify(rtData(rt))}
let __X = 0
const __off = () => { let o = 0; for (const s of __RT.sect) if (s[0] <= __X) o = s[1]; return o }
const __map = n => {
  const o = __off()
  return n + __RT.to[(((n - __RT.tonic - o) % 12) + 12) % 12] + __RT.tr
}
const __N = n => {
  const a = Math.floor(n), u = n - a
  if (u <= 0.35) return __map(a) + u
  if (u >= 0.65) return __map(a + 1) - (1 - u)
  const lo = __map(a) + 0.35, hi = __map(a + 1) - 0.35
  return lo + ((hi - lo) * (u - 0.35)) / 0.3
}
const __T = m => {
  if (!__RT.tm) return m
  const T = __RT.tm[__off()] ?? __RT.tm[0], at = k => T[((k % 12) + 12) % 12] / 100, a = Math.floor(m), u = m - a
  return m + (u <= 0.35 ? at(a) : u >= 0.65 ? at(a + 1) : at(a) + ((at(a + 1) - at(a)) * (u - 0.35)) / 0.3)
}
const __R = f => (f > 0 && Number.isFinite(f) ? 440 * 2 ** ((__T(__N(69 + 12 * Math.log2(f / 440))) - 69) / 12) : f)
const __Nrel = (n, base) => { const b = 69 + 12 * Math.log2(base / 440); return __T(__N(n + b)) - b }
const __retuneSong = s => {
  for (const t of Object.values(s.tracks ?? {})) {
    if (!t || typeof t !== 'object' || t.project) continue // a project's notes were moved as data
    if (typeof t.midi === 'function') {
      const m = t.midi, one = (n, x) => (Number.isFinite(n) ? ((__X = x), Math.round(__N(n) * 100) / 100) : n)
      t.midi = x => { const v = m(x); return Array.isArray(v) ? v.map(n => one(n, x)) : one(v, x) }
    }
    if (typeof t.audio === 'function') {
      const a = t.audio
      t.audio = ctx => { const f = a(ctx); return typeof f === 'function' ? x => ((__X = x), f(x)) : f }
    }
  }
  return s
}
${PRELUDE_END}
`
const WRAPPERS = {
  hz: `const hz = (n, base = 110) => __R(__hz(n, base))`,
  meower: `const meower = o => { const c = __meower(o); return (n, u, t, base = 698.46) => c(n == null ? n : __Nrel(n, base), u, t, base) }`,
  bowed: `const bowed = (o = {}) => {
  const b = __bowed(o), base = o.base ?? 110, tmp = {}
  return (note, t) => b(note && ((tmp.n = __Nrel(note.n, base)), (tmp.d = note.d), (tmp.τ = note.τ), (tmp.u = note.u), (tmp.at = note.at), tmp), t)
}`,
}

// visit every node with its parent
function walk(node, fn, parent = null) {
  if (!node || typeof node.type !== 'string') return
  fn(node, parent)
  for (const k in node) {
    if (k === 'loc') continue
    const v = node[k]
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, fn, node))
    else if (v && typeof v.type === 'string') walk(v, fn, node)
  }
}
// the same with the chain of ancestors (root first)
function walkUp(node, fn, up = []) {
  if (!node || typeof node.type !== 'string') return
  fn(node, up)
  up.push(node)
  for (const k in node) {
    if (k === 'loc') continue
    const v = node[k]
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walkUp(c, fn, up))
    else if (v && typeof v.type === 'string') walkUp(v, fn, up)
  }
  up.pop()
}
// a number made only of numbers and earlier constants (440 * 2 ** (-9 / 12), C4 / 4), else null
function evalConst(n, env) {
  if (n.type === 'Literal') return typeof n.value === 'number' ? n.value : null
  if (n.type === 'Identifier') return env.has(n.name) ? env.get(n.name) : null
  if (n.type === 'UnaryExpression' && n.operator === '-') { const v = evalConst(n.argument, env); return v === null ? null : -v }
  if (n.type === 'BinaryExpression') {
    const a = evalConst(n.left, env), b = evalConst(n.right, env)
    if (a === null || b === null) return null
    return { '+': a + b, '-': a - b, '*': a * b, '/': a / b, '**': a ** b }[n.operator] ?? null
  }
  return null
}
// a frequency of an equal-tempered note (A4 = 440) within 3 cents, 20 Hz – 8 kHz
const isNoteHz = v => v >= 20 && v <= 8000 && Math.abs(12 * Math.log2(v / 440) - Math.round(12 * Math.log2(v / 440))) < 0.03
const hasId = n => { let y = false; walk(n, c => { if (c.type === 'Identifier') y = true }); return y }
const callsHz = n => { let y = false; walk(n, c => { if (c.type === 'CallExpression' && c.callee.type === 'Identifier' && c.callee.name === 'hz') y = true }); return y }
// 2 ** (e / 12) or Math.pow(2, e / 12) with a variable e: a note number becoming a frequency ratio
const isNoteRatio = n => {
  let base, exp
  if (n.type === 'BinaryExpression' && n.operator === '**') (base = n.left), (exp = n.right)
  else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Math' && n.callee.property.name === 'pow' && n.arguments.length === 2) [base, exp] = n.arguments
  else return false
  return base.type === 'Literal' && base.value === 2 && exp.type === 'BinaryExpression' && exp.operator === '/' && exp.right.type === 'Literal' && exp.right.value === 12 && hasId(exp.left)
}

// → { source, name, plan } of the copy. song: the loaded song (its key, sections, midi), target: { tonic, mode },
// theme: the visualiser theme it had (a new name would lose one chosen by name)
export function retuneSource(source, song, target, { parse, theme = null }) {
  let prev = null
  const m = source.match(/^const __RT = (\{.*\})$/m)
  if (m) prev = JSON.parse(m[1])
  const rt = retunePlan(song, target, prev)
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const def = ast.body.find(n => n.type === 'ExportDefaultDeclaration')
  if (!def) throw new Error('в песне нет export default')
  if (prev) { // a copy again: new parameters and fields, the same original underneath
    const obj = objOf(def.declaration)
    const line = source.indexOf(m[0]), head = source.lastIndexOf('// ---- a retuned copy:', line), end = source.indexOf(PRELUDE_END, line)
    const edits = [...fieldEdits(obj, rt, null)]
    // the whole prelude anew (older copies, without its end mark, get new parameters only)
    if (head >= 0 && end > 0) edits.push([head, end + PRELUDE_END.length, PRELUDE(rt).trim()])
    else {
      edits.push([line, line + m[0].length, `const __RT = ${JSON.stringify(rtData(rt))}`])
      if (head >= 0) edits.push([head, source.indexOf('\n', head), `// ---- a retuned copy: «${rt.name}» in ${rt.label} (Лады → «эта же музыка в …») ----------------------------`])
    }
    return { source: apply(source, edits), name: `${rt.name} · ${rt.label}`, plan: rt }
  }
  const edits = [] // [pos, text]: inserted, from the end
  const wrapped = []
  let lastImport = null
  const block = source.indexOf('// ==== MathMusic project') // a project's block: its own imports; the prelude stays out of it
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      if (block >= 0 && node.start > block) continue
      lastImport = node
      for (const s of node.specifiers) {
        if (s.type !== 'ImportSpecifier' || !WRAPPERS[s.imported.name] || s.local.name !== s.imported.name) continue
        edits.push([s.end, ` as __${s.local.name}`])
        wrapped.push(s.local.name)
      }
    }
  }
  // BASE * 2 ** (n / 12): the whole product is a frequency; a product already made of hz() is left alone
  const products = new Set()
  walk(ast, (n, parent) => {
    if (!isNoteRatio(n) || !parent || parent.type !== 'BinaryExpression' || parent.operator !== '*') return
    const other = parent.left === n ? parent.right : parent.left
    if (callsHz(other)) return
    products.add(parent)
    edits.push([parent.start, '__R('], [parent.end, ')'])
  })
  // pitches written as numbers: sin(TAU * 73.42 * t), or a constant D2 = 73.42 used as a frequency. Wrapped where they
  // scale (* /) or are passed to a call — not as a base for hz()/meower/bowed, not inside the note → Hz functions
  // (mf…), not where constants are defined, never in note data (arrays) or comparisons
  const consts = new Map(), converters = new Set(['hz', 'meower', 'bowed', '__hz', '__meower', '__bowed'])
  for (const node of ast.body) {
    if (node.type !== 'VariableDeclaration' || node.kind !== 'const') continue
    for (const d of node.declarations) {
      if (d.id.type !== 'Identifier' || !d.init) continue
      const v = evalConst(d.init, consts)
      if (v !== null) consts.set(d.id.name, v)
      if (d.init.type === 'ArrowFunctionExpression' || d.init.type === 'FunctionExpression') {
        let conv = false
        walk(d.init, c => { if (products.has(c)) conv = true })
        if (conv) converters.add(d.id.name)
      }
    }
  }
  const pitchConsts = new Set([...consts].filter(([, v]) => isNoteHz(v)).map(([k]) => k))
  walkUp(ast, (n, up) => {
    const lit = n.type === 'Literal' && typeof n.value === 'number' && isNoteHz(n.value)
    const id = n.type === 'Identifier' && pitchConsts.has(n.name)
    if (!lit && !id) return
    const p = up[up.length - 1]
    if (!p) return
    const scales = p.type === 'BinaryExpression' && (p.operator === '*' || p.operator === '/')
    const arg = p.type === 'CallExpression' && p.arguments.includes(n)
    if (!scales && !arg) return
    if (scales) { // the start of a sweep (220 · e^{−40τ}, 220 · 2^{4a}) is a drum or an effect, not a note
      const other = p.left === n ? p.right : p.left
      if ((other.type === 'CallExpression' && other.callee.name === 'exp') || (other.type === 'BinaryExpression' && other.operator === '**' && !isNoteRatio(other))) return
    }
    for (let i = up.length - 1; i >= 0; i--) {
      const a = up[i], child = up[i + 1] ?? n
      const named = a.type === 'Property' ? a.key.name ?? a.key.value : a.type === 'VariableDeclarator' && a.id.type === 'Identifier' ? a.id.name : null
      if (named && (UNPITCHED.test(named) || /^(graph|midi|formula|color)$/.test(named))) return // drums, effects, the picture
      if (products.has(a)) return
      if (a.type === 'CallExpression' && a.callee.type === 'Identifier' && converters.has(a.callee.name)) return
      if (a.type === 'CallExpression' && a.callee.type === 'MemberExpression' && a.callee.object.name === 'Math') return
      if (a.type === 'Property' && a.key.name === 'base') return
      if (a.type === 'VariableDeclarator' && a.id.type === 'Identifier' && (converters.has(a.id.name) || (consts.has(a.id.name) && a.init === child))) return
      if (a.type === 'ArrayExpression' || (a.type === 'BinaryExpression' && /[<>=!]/.test(a.operator))) return
    }
    edits.push([n.start, '__R('], [n.end, ')'])
  })
  // the prelude right after the imports; export default __retuneSong({ … }) with the new name, key, mode, theme
  edits.push([lastImport ? lastImport.end : Math.max(0, block), '\n' + PRELUDE(rt) + wrapped.map(w => WRAPPERS[w]).join('\n') + '\n'])
  edits.push([def.declaration.start, '__retuneSong('], [def.declaration.end, ')'])
  edits.push(...fieldEdits(objOf(def.declaration), rt, theme))
  return { source: apply(source, edits), name: `${rt.name} · ${rt.label}`, plan: rt }
}

// the song's object literal inside its wrappers: __retuneSong(__project({ … }))
const objOf = n => { while (n?.type === 'CallExpression' && n.arguments[0]) n = n.arguments[0]; return n }
// insertions [pos, text] and replacements [start, end, text], from the end; at one place an opening goes
// before a closing one: …a)__R(b…
function apply(source, edits) {
  const E = edits.map(e => (e.length === 2 ? [e[0], e[0], e[1]] : e))
  E.sort((a, b) => b[0] - a[0] || b[1] - a[1] || (a[2] === ')' ? 1 : 0) - (b[2] === ')' ? 1 : 0))
  let out = source
  for (const [s, e, text] of E) out = out.slice(0, s) + text + out.slice(e)
  return out
}
// the song object's name / key / mode / theme, set in its own literal (the library reads and renames it there)
function fieldEdits(obj, rt, theme) {
  if (obj.type !== 'ObjectExpression') return []
  const prop = k => obj.properties.find(p => p.type === 'Property' && (p.key.name ?? p.key.value) === k)
  const out = [], first = obj.properties[0]
  const set = (k, v) => {
    const p = prop(k)
    if (p) out.push([p.value.start, p.value.end, v])
    else if (first) out.push([first.start, first.start, `${k}: ${v}, `])
  }
  set('name', JSON.stringify(`${rt.name} · ${rt.label}`))
  set('key', JSON.stringify(rt.key))
  if (rt.mode || prop('mode')) set('mode', rt.mode ? JSON.stringify(rt.mode) : 'null')
  if (rt.temperament || prop('tuning')) set('tuning', rt.temperament ? JSON.stringify({ id: rt.temperament.id, name: rt.temperament.name, offsets: rt.tm[0] ?? Object.values(rt.tm)[0] }) : 'null')
  if (theme && !prop('theme')) set('theme', JSON.stringify(theme))
  return out
}
