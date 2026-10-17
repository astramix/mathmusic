// Generative ambient in the manner of "Music for Airports": loops of a few notes, each going round in its own time —
// 17, 23½, 29, 31¼ … beats, lengths that share no common measure — so the notes meet in ever new constellations and the
// whole only repeats after the least common multiple of the loops (here far longer than the piece). Over them a slow pad
// whose filter breathes on a 64-beat cycle. For the generator's 'ambient' style.
//
// Pitches: a scale on the tonic — a church mode, or the harmonic series (the overtones 8–15 of one low note: the 7th
// harmonic 31 ¢ below B♭, the 11th almost a quarter tone) — given as fractional MIDI numbers.

export const LOOP_PERIODS = [17, 20.5, 23.5, 25.75, 29, 31.25, 34.5, 37, 39.75, 41.5]
const gcd = (a, b) => (b < 1e-9 ? a : gcd(b, a % b))
// the least common multiple of periods given in quarter beats (exact)
export function lcmOf(periods) {
  let l = 1
  for (const p of periods.map(v => Math.round(v * 4))) l = (l * p) / gcd(l, p)
  return l / 4
}

// the piece: sections by how many loops sound; each loop: a period, an entry and exit, an instrument, 1–3 notes at offsets
export function composeAmbient({ iv, tonic, r, length = 'normal' }) {
  const deg = (d, oct = 0) => tonic + 12 * (oct + Math.floor(d / iv.length)) + iv[((d % iv.length) + iv.length) % iv.length]
  const plan = length === 'short'
    ? [['first light', 32, 2], ['drift', 48, 4], ['bloom', 48, 6], ['dusk', 32, 2]]
    : [['first light', 32, 2], ['drift', 40, 4], ['bloom', 48, 6], ['tide', 32, 5], ['dusk', 24, 3], ['silence', 16, 1]]
  const sections = []
  let at = 0
  for (const [name, beats] of plan) { sections.push([at, name]); at += beats }
  const END = at
  // the loops: the first ones enter at once, the others when their section needs them; they leave in the same order
  const instruments = ['piano', 'bells', 'glass', 'piano', 'choir', 'bells', 'glass', 'piano', 'bells', 'choir']
  const nLoops = Math.max(...plan.map(p => p[2]))
  const periods = [...LOOP_PERIODS]
  for (let i = periods.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [periods[i], periods[j]] = [periods[j], periods[i]] }
  periods.length = nLoops
  const loops = []
  for (let k = 0; k < nLoops; k++) {
    // it enters in the first section that has room for it, and stays until a section with fewer loops
    let from = null, to = END
    let t = 0
    for (const [, beats, count] of plan) {
      if (from == null && count > k) from = t + (k % 2) * 4 + Math.floor(r() * 4)
      else if (from != null && count <= k && to === END) to = t + Math.floor(r() * 6)
      t += beats
    }
    const inst = instruments[k % instruments.length]
    const n = inst === 'choir' ? 1 : 1 + Math.floor(r() * 3)
    // notes: chord tones of the tonic's sonority (1, 3, 5, 9 degrees and the harmonic series' own), in a register per kind
    const oct = inst === 'bells' || inst === 'glass' ? 1 : inst === 'choir' ? -1 : 0
    const pool = [0, 2, 4, 1, 5, 6]
    const notes = []
    let off = r() * 3
    for (let j = 0; j < n; j++) {
      const d = pool[Math.floor(r() * pool.length)] + (r() < 0.3 ? iv.length : 0)
      notes.push([Math.round(off * 4) / 4, Math.round(deg(d, oct) * 100) / 100, inst === 'choir' ? 8 + Math.floor(r() * 5) : 3 + Math.floor(r() * 4)])
      off += 1.5 + r() * 3
    }
    loops.push({ period: periods[k], from, to, inst, notes, vel: 0.45 + 0.3 * r(), pan: Math.round((2 * r() - 1) * 70) / 100 })
  }
  // the pad: the tonic's chord (root, fifth, the ninth or the third), changing colour in the 'tide' (a step up the scale)
  const pad = sections.map(([a, name], i) => {
    const b = sections[i + 1]?.[0] ?? END
    const shift = name === 'tide' ? 3 : 0 // the fourth degree: the harmony leans away and comes back
    return [a, b - a, [deg(shift, -1), deg(shift + 4, -1), deg(shift + 2, 0), deg(shift + 1, 0)].map(v => Math.round(v * 100) / 100)]
  })
  return { sections, loops, pad, length: END + 8, lcm: lcmOf(periods) }
}
