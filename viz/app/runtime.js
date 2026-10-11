// Song sources → live code, in the page and in the audio workers.
//
// A page opened from disk (file://) may not start module workers, nor import blob: modules inside
// workers — only classic scripts run there. So the engine, the instruments and every song are
// compiled here from ES modules into plain function bodies: `import {a as b} from '…/engine.js'`
// becomes `const {a: b} = __mods.engine`, `export` is dropped (the names are returned), `export
// default` assigns __default. Each replacement keeps its line count, so error line numbers still
// point into the song source (minus the 2 header lines `new Function` adds).
import * as acorn from './acorn.js'

export const SR = 44100
export const TAIL = 3 // seconds rendered after the last beat (reverb tails)
export const LINE_OFFSET = 2 // lines that `new Function` puts before the body

const MODS = { '../src/engine.js': 'engine', '../src/instruments.js': 'instruments', './engine.js': 'engine', './instruments.js': 'instruments', '../src/theory.js': 'theory', './theory.js': 'theory' }

// names bound by a declaration pattern
function names(p, out = []) {
  if (!p) return out
  if (p.type === 'Identifier') out.push(p.name)
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => names(q.type === 'RestElement' ? q.argument : q.value, out))
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => names(e, out))
  else if (p.type === 'AssignmentPattern') names(p.left, out)
  else if (p.type === 'RestElement') names(p.argument, out)
  return out
}
const keepLines = (text, repl) => repl + '\n'.repeat((text.match(/\n/g) ?? []).length)

// ES module source → function body (string) taking __mods, returning the exports.
// Throws a SyntaxError with .line/.col for bad code.
export function compile(source, file = 'song.js') {
  let ast
  try {
    ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true })
  } catch (err) {
    const e = new SyntaxError(err.message.replace(/\s*\(\d+:\d+\)$/, ''))
    e.line = err.loc?.line
    e.col = err.loc?.column
    throw e
  }
  const edits = [], exported = []
  for (const node of ast.body) {
    const text = source.slice(node.start, node.end)
    if (node.type === 'ImportDeclaration') {
      const from = node.source.value, mod = from.startsWith('node:') ? 'node' : MODS[from]
      if (!mod) {
        const e = new SyntaxError(`импорт из «${from}» недоступен — можно из '../src/engine.js' и '../src/instruments.js'`)
        e.line = node.loc.start.line
        throw e
      }
      const parts = node.specifiers.map(s =>
        s.type === 'ImportDefaultSpecifier' ? `default: ${s.local.name}`
        : s.type === 'ImportNamespaceSpecifier' ? null
        : s.imported.name === s.local.name ? s.local.name : `${s.imported.name}: ${s.local.name}`)
      const ns = node.specifiers.find(s => s.type === 'ImportNamespaceSpecifier')
      const repl = (parts.filter(Boolean).length ? `const { ${parts.filter(Boolean).join(', ')} } = __mods.${mod};` : '') + (ns ? `const ${ns.local.name} = __mods.${mod};` : '')
      edits.push([node.start, node.end, keepLines(text, repl)])
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        edits.push([node.start, node.declaration.start, ''])
        const d = node.declaration
        if (d.type === 'VariableDeclaration') d.declarations.forEach(v => exported.push(...names(v.id)))
        else exported.push(d.id.name)
      } else {
        if (node.source) {
          const e = new SyntaxError('export … from не поддерживается в песнях')
          e.line = node.loc.start.line
          throw e
        }
        node.specifiers.forEach(s => exported.push(s.local.name === s.exported.name ? s.local.name : `${s.exported.name}: ${s.local.name}`))
        edits.push([node.start, node.end, keepLines(text, '')])
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      const d = node.declaration
      if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) {
        edits.push([node.start, d.start, ''])
        exported.push(`default: ${d.id.name}`)
      } else edits.push([node.start, d.start, '__default = '])
    }
  }
  let out = source
  for (const [a, b, r] of edits.sort((p, q) => q[0] - p[0])) out = out.slice(0, a) + r + out.slice(b)
  const ret = `\n;return { ${[...exported, 'default: __default'].join(', ')} }`
  return `"use strict"; let __default; ${out}${ret}\n//# sourceURL=mm-${file}`
}

const NODE_STUB = { default: { existsSync: () => false, readFileSync: () => { throw new Error('not in the browser') }, writeFileSync: () => {}, mkdirSync: () => {}, join: (...p) => p.join('/'), deflateSync: () => { throw new Error('not in the browser') } } }
// run compiled bodies in order → modules
export function instantiate(bodies) {
  const mods = { node: { ...NODE_STUB, ...NODE_STUB.default } }
  for (const [name, body] of bodies) mods[name] = new Function('__mods', body)(mods)
  return mods
}

export function makeRuntime(SRC) {
  const lib = [['engine', compile(SRC.engine, 'engine.js')], ['instruments', compile(SRC.instruments, 'instruments.js')]]
  const base = instantiate(lib)
  return {
    lib, // [name, body] for the workers
    // a fresh instance of the song (module-level state starts over) → { song, body }
    load(source) {
      const body = compile(source)
      let mod
      try {
        mod = new Function('__mods', body)({ ...base })
      } catch (err) {
        err.line ??= errorLine(err)?.line
        throw err
      }
      const song = mod.default
      if (!song || typeof song !== 'object' || !song.tracks) throw new Error('файл песни должен делать export default { name, bpm, length, tracks }')
      return { song, body }
    },
  }
}

// The song line (1-based) of an error thrown inside compiled code, or null
export function errorLine(err, file = 'song.js') {
  const m = String(err?.stack ?? '').match(new RegExp(`mm-${file.replace('.', '\\.')}:(\\d+):(\\d+)`))
  return m ? { line: +m[1] - LINE_OFFSET, col: +m[2] } : null
}

// [key, track] for every track that is set (a song may switch tracks off with null/false)
export const trackList = song => Object.entries(song.tracks).filter(([, t]) => t)
