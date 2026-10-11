// Formulas: a track's `formula` (or viz/formulas.js for the older songs) rendered with KaTeX;
// "live" mode substitutes the current numbers (f, n, τ, t, T, x) into the formula so you can watch
// it breathe; formula images (SVG with the KaTeX fonts inlined) for drawing onto a canvas — the
// paper view and the video export use them.
import { esc } from './ui.js'

export const MACROS = {
  '\\saw': '\\operatorname{saw}', '\\sq': '\\operatorname{sq}', '\\tri': '\\operatorname{tri}', '\\lfsr': '\\operatorname{lfsr}',
  '\\LP': '\\operatorname{LP}', '\\HP': '\\operatorname{HP}', '\\BP': '\\operatorname{BP}', '\\SS': '\\operatorname{SS}',
  '\\Rev': '\\mathcal{R}', '\\Dly': '\\mathcal{D}', '\\Cho': '\\mathcal{C}', '\\Tape': '\\mathcal{T}', '\\vol': '\\operatorname{vol}',
  '\\ol': '\\overline',
}
// [main, …definitions] for a track, or null
export function formulaOf(SRC, songName, key, track) {
  let f = track.formula ?? SRC.formulas[songName]?.[key]
  if (!f) return null
  return Array.isArray(f) ? f : [f]
}
export const tex = (s, display = true) => {
  try {
    return katex.renderToString(s, { displayMode: display, throwOnError: false, macros: { ...MACROS }, strict: false })
  } catch {
    return '<code>' + esc(s) + '</code>'
  }
}
export function formulaHTML(f) {
  if (!f) return ''
  return tex(f[0]) + (f.length > 1 ? '<div class="def">' + f.slice(1).map(s => tex(s)).join('') + '</div>' : '')
}

// ---- live substitution ---------------------------------------------------------------------------
// Replaces the free symbols f, n, τ, t, T, x of a LaTeX formula by numbers (highlighted). Symbols
// with a subscript (f_k, t_0), inside \text{}/\operatorname{}/… or part of a command are kept.
const SKIP_ARG = /^\\(text|operatorname|mathrm|mathcal|mathbf|color|textcolor|begin|end|label|hbox|mbox)$/
export function substitute(src, vals, color = '#ffd479') {
  const out = []
  let i = 0, prevNum = false
  const num = v => {
    const a = Math.abs(v)
    const s = a >= 1000 ? v.toFixed(0) : a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3)
    return s.replace(/\.?0+$/, m => (m.startsWith('.') ? '' : m)) || '0'
  }
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') {
      const m = src.slice(i).match(/^\\([A-Za-z]+|.)/)
      const cmd = m[0]
      i += cmd.length
      if (SKIP_ARG.test(cmd)) {
        // copy the command and its braced argument(s) verbatim
        out.push(cmd)
        let depth = 0
        while (i < src.length) {
          const ch = src[i]
          if (ch === '{') depth++
          if (ch === '}') depth--
          out.push(ch)
          i++
          if (depth === 0 && ch === '}') {
            if (src[i] !== '{') break
          }
        }
        prevNum = false
        continue
      }
      const name = cmd === '\\tau' ? 'τ' : null
      if (name && vals[name] != null && !/^\s*_/.test(src.slice(i)) && !/^[A-Za-z]/.test(src[i] ?? '')) {
        out.push((prevNum ? '\\cdot ' : '') + `{\\color{${color}}${num(vals[name])}}`)
        prevNum = true
        continue
      }
      out.push(cmd)
      prevNum = false
      continue
    }
    if (/[A-Za-z]/.test(c)) {
      const sub = src[i + 1] === '_'
      const v = vals[c]
      if (v != null && !sub && 'fntTx'.includes(c)) {
        out.push((prevNum ? '\\cdot ' : '') + `{\\color{${color}}${num(v)}}`)
        prevNum = true
      } else {
        out.push(c)
        prevNum = false
      }
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      const m = src.slice(i).match(/^[0-9.]+/)[0]
      out.push((prevNum ? '\\cdot ' : '') + m)
      i += m.length
      prevNum = true
      continue
    }
    out.push(c)
    if (!/\s/.test(c)) prevNum = false
    i++
  }
  return out.join('')
}

// ---- formula images for canvases --------------------------------------------------------------------
// One KaTeX stylesheet with the fonts as data URIs (from the page), inlined into every SVG image.
let katexCss = null
const css = () => (katexCss ??= [...document.querySelectorAll('style')].map(s => s.textContent).find(t => t.includes('KaTeX_Main')) ?? '')
// → Promise<{ img, w, h }> of the formula as an image (CSS px at `size`), colour `color`
export async function formulaImage(lines, { size = 22, color = '#1d1a2e', maxWidth = 900 } = {}) {
  const html = lines.map((s, i) => `<div style="font-size:${i ? 0.72 : 1}em;margin:${i ? 2 : 0}px 0">${katex.renderToString(s, { displayMode: false, throwOnError: false, macros: { ...MACROS }, strict: false })}</div>`).join('')
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;left:-99999px;top:0;display:inline-block;font-size:${size}px;color:${color};white-space:nowrap;line-height:1.35`
  probe.innerHTML = html
  document.body.append(probe)
  const r = probe.getBoundingClientRect()
  const w = Math.ceil(Math.max(r.width, probe.scrollWidth)) + 10, hgt = Math.ceil(Math.max(r.height, probe.scrollHeight)) + 10
  probe.remove()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${size}px;color:${color};white-space:nowrap;line-height:1.35;padding:4px"><style>${css()}</style>${html}</div></foreignObject></svg>`
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  return { img, w, h: hgt }
}
