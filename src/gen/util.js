// Dice and small helpers: the seeded random numbers, picks, note lists as text, graph lanes — a part of the generator (src/generate.js; the map of its parts is at the top of that file).

// ---- randomness ----------------------------------------------------------------------------------
export function rng(seed) {
  let a = (seed >>> 0) ^ 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, a) => a[Math.floor(r() * a.length)]
const weighted = (r, items) => { // [[item, weight], …]
  const total = items.reduce((s, [, w]) => s + w, 0)
  let u = r() * total
  for (const [it, w] of items) if ((u -= w) <= 0) return it
  return items[items.length - 1][0]
}
const shuffle = (r, a) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
const round = v => +(+v).toFixed(4)
const midiOf = name => {
  const m = String(name).match(/^([A-G])(#|♯|b|♭)?(-?\d)$/)
  return 12 * (+m[3] + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1])] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0)
}

// ---- code emission --------------------------------------------------------------------------------------
const fmtNotes = (notes, indent = '') => {
  const bars = new Map()
  for (const [b, n, d] of notes) {
    const k = Math.floor(b / 4 + 1e-9)
    if (!bars.has(k)) bars.set(k, [])
    bars.get(k).push(`[${round(b)}, ${round(n)}, ${round(d)}]`)
  }
  return '[\n' + [...bars.values()].map(l => indent + '  ' + l.join(', ') + ',').join('\n') + '\n' + indent + ']'
}
const lane = { lead: [1.1, 3], lead2: [1, 2.9], counter: [0.8, 2.4], chords: [-1, 0.4], bass: [-3, -2], pad: [-1.7, -0.6], arp: [0.3, 1.2], texture: [-2.95, -2.85] }

export { fmtNotes, lane, midiOf, pick, round, weighted }
