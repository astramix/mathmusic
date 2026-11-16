// A style in one file — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// defineStyle(id, { family, after, style, names, themes, leads, chords, pads, basses, arps, kits, textures, counter })
// puts everything a style brings where the generator looks for it: its entry in STYLES, its place in a family (right
// after `after`, or at the family's end), the words of its titles, its themes (each with only: id — no other style's
// dice ever see them), its recipes. The second generation of styles (src/gen/v2-*.js) is written this way; a style that
// is a later version of another says `of: '<id>'` and `ver: 2` in its entry and sits beside it in the menus.
import { MELODIES } from '../melodies.js'
import { STYLES, STYLE_FAMILIES, relist } from './styles.js'
import { NAMES } from './names.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, PADS, TEXTURES } from './recipes.js'

export function defineStyle(id, d) {
  if (STYLES[id]) throw new Error(`the style ${id} is defined twice`)
  STYLES[id] = d.style
  const fam = STYLE_FAMILIES.find(f => f.id === d.family)
  if (!fam) throw new Error(`${id}: no family ${d.family}`)
  const at = d.after ? fam.styles.indexOf(d.after) : -1
  fam.styles.splice(at < 0 ? fam.styles.length : at + 1, 0, id)
  if (d.names) NAMES[id] = d.names
  for (const [table, own, what] of [[LEADS, d.leads, 'lead'], [CHORDS, d.chords, 'chords'], [PADS, d.pads, 'pad'], [BASSES, d.basses, 'bass'], [ARPS, d.arps, 'arp'], [KITS, d.kits, 'kit'], [TEXTURES, d.textures, 'texture']]) {
    for (const [name, recipe] of Object.entries(own ?? {})) {
      if (table[name]) throw new Error(`${id}: the ${what} recipe ${name} exists already`)
      table[name] = recipe
    }
  }
  Object.assign(COUNTER_VOICE, d.counter ?? {})
  // borrow: themes of another style this one may draw too (their own style's dice are not touched by it)
  for (const tid of d.borrow ?? []) {
    const m = MELODIES.find(o => o.id === tid)
    if (!m) throw new Error(`${id}: no theme ${tid} to borrow`)
    if (m.only) m.only = [...new Set([].concat(m.only, id))]
  }
  for (const m of d.themes ?? []) {
    if (MELODIES.some(o => o.id === m.id)) throw new Error(`${id}: the theme ${m.id} exists already`)
    MELODIES.push({ from: id, only: id, ...m })
  }
  relist()
}
