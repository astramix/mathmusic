// Meters: the 4/4 song mapped onto 3/4, 5/4, 7/8, 12/8…, grooves, comping and bass by the meter's groups — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'

let MT = null

// ---- meters (opts.meter) ---------------------------------------------------------------------------------------------
// A song is made in 4/4 and then its whole time is mapped onto the meter by a piecewise-linear w over a period of `pin`
// beats of 4/4 → `pout` beats, chosen so the notes stay on the grid: 7/8 halves the last beat (2+2+3 eighths), 9/8
// doubles the last eighth (2+2+2+3, aksak), 5/4 doubles the second beat (3+2, as in «Take Five»), 3/4 doubles the first
// beat of every half bar (a waltz), 7/4 halves the last two beats of every two bars (4+3), 7/8+9/8 alternates (2+2+3 |
// 2+2+2+3, two bars of 4/4 in all), 12/8 and 6/8 turn every eighth into the triplet one (a beat = a dotted quarter).
// The drums, the comping and the bass are made for the meter itself: by its groups of beats.
export const METERS = {
  '3/4': { label: '3/4 — вальс', text: '3/4', pin: 2, pout: 3, w: u => (u < 1 ? 2 * u : u + 1), bars: [{ len: 3, groups: [1, 1, 1], kick: [0], back: [2, 4] }] },
  '5/4': { label: '5/4 — 3 + 2', text: '3+2/4', pin: 4, pout: 5, w: u => (u <= 1 ? u : u <= 2 ? 1 + 2 * (u - 1) : u + 1), bars: [{ len: 5, groups: [3, 2], kick: [0, 6], back: [4, 8] }] },
  '7/8': { label: '7/8 — 2 + 2 + 3', text: '2+2+3/8', pin: 4, pout: 3.5, w: u => (u <= 3 ? u : 3 + (u - 3) / 2), bars: [{ len: 3.5, groups: [1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '9/8': { label: '9/8 — 2 + 2 + 2 + 3 (аксак)', text: '2+2+2+3/8', pin: 4, pout: 4.5, w: u => (u <= 3.5 ? u : 3.5 + (u - 3.5) * 2), bars: [{ len: 4.5, groups: [1, 1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '7/4': { label: '7/4 — 4 + 3', text: '4+3/4', pin: 8, pout: 7, w: u => (u <= 6 ? u : 6 + (u - 6) / 2), bars: [{ len: 7, groups: [2, 2, 3], kick: [0, 8], back: [4, 12] }] },
  '7/8+9/8': { label: '7/8 + 9/8 — чередуются', text: '2+2+3/8 | 2+2+2+3/8', pin: 8, pout: 8, w: u => (u <= 3 ? u : u <= 4 ? 3 + (u - 3) / 2 : u <= 7.5 ? u - 0.5 : 7 + (u - 7.5) * 2),
    bars: [{ len: 3.5, groups: [1, 1, 1.5], kick: [0, 4], back: [2, 6] }, { len: 4.5, groups: [1, 1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '12/8': { label: '12/8 — четыре доли по три восьмых', text: '12/8', compound: true, pin: 1, pout: 1, w: u => (u <= 0.5 ? (u * 4) / 3 : 2 / 3 + ((u - 0.5) * 2) / 3), bars: [{ len: 4, groups: [1, 1, 1, 1], kick: [0, 6], back: [3, 9], compound: true }] },
  '6/8': { label: '6/8 — две доли по три восьмых', text: '6/8', compound: true, pin: 1, pout: 1, w: u => (u <= 0.5 ? (u * 4) / 3 : 2 / 3 + ((u - 0.5) * 2) / 3), bars: [{ len: 2, groups: [1, 1], kick: [0], back: [3], compound: true }] },
}
export const METER_LIST = [['4/4', '4/4 — как всегда'], ...Object.entries(METERS).map(([id, m]) => [id, m.label])]
// the song's time in 4/4 → in the meter
const warpOf = M => x => {
  const k = Math.floor(x / M.pin + 1e-9), u = x - k * M.pin
  return round(k * M.pout + M.w(Math.max(0, Math.min(M.pin, u))))
}
// a drum groove of the style, made again for one kind of bar: kicks and backbeats where the meter's groups put them, the
// time-keepers as dense as in 4/4 (16ths, eighths, off-beat eighths, quarters), the open hat on the last eighth, the fill
// across the last group. Steps: sixteenths (or triplet eighths in a compound meter)
function grooveFor(lines, bm, name) {
  const s = bm.compound ? 3 : 4, N = Math.round(bm.len * s), e8 = bm.compound ? 1 : 2, out = {}
  const starts = []
  let acc = 0
  for (const g of bm.groups) { starts.push(Math.round(acc * s)); acc += g }
  const eighthStep = i => (bm.compound ? i : i * 2) // the positions in the bar tables are eighths
  for (const [drum, str] of Object.entries(lines)) {
    const arr = Array(N).fill('-'), hits = [...str].filter(c => c === 'x').length
    if (name === 'fill') {
      const from = starts[starts.length - 1]
      for (let i = from; i < N; i++) arr[i] = (i - from) % e8 === 0 ? 'x' : 'o'
      out[drum] = arr.join('')
      continue
    }
    const kind = /kick|timp|don/.test(drum) ? 'kick' : /snare|clap|rim|brush|tom|naga/.test(drum) ? 'back' : /open|crash/.test(drum) ? 'open' : 'time'
    if (kind === 'kick') {
      for (const p of bm.kick) arr[eighthStep(p)] = 'x'
      if (name === 'busy' || hits >= 4) for (const p of bm.back) { const q = eighthStep(p) - e8; if (q > 0 && arr[q] === '-') arr[q] = 'x' }
      if (name === 'light') for (let i = 1; i < N; i++) if (i !== eighthStep(bm.kick[0])) arr[i] = '-'
    } else if (kind === 'back') {
      const list = name === 'light' ? bm.back.slice(0, 1) : bm.back
      for (const p of list) arr[eighthStep(p)] = 'x'
      if (name === 'busy') for (const p of bm.back) { const q = eighthStep(p) + (bm.compound ? 2 : 3); if (q < N && arr[q] === '-') arr[q] = 'o' }
    } else if (kind === 'open') {
      arr[N - e8] = 'x'
    } else {
      // how dense was it in 4/4: sixteenths, eighths, off-beat eighths only, or quarters
      const on = [...str].map((c, i) => (c !== '-' ? i : -1)).filter(i => i >= 0)
      const six = on.some(i => i % 2 === 1), off = on.length && on.every(i => i % 4 === 2), quarters = on.length && on.every(i => i % 4 === 0)
      for (let i = 0; i < N; i++) {
        const isE8 = i % e8 === 0, isBeat = i % s === 0, groupStart = starts.includes(i)
        if (bm.compound) { if (!off || i % 3 === 2) arr[i] = groupStart ? 'x' : isBeat ? 'x' : 'o' }
        else if (six) arr[i] = isE8 ? 'x' : 'o'
        else if (off) arr[i] = isE8 && !isBeat && i % 4 === 2 ? 'x' : '-'
        else if (quarters) arr[i] = isBeat ? 'x' : '-'
        else arr[i] = isE8 ? 'x' : '-'
      }
    }
    out[drum] = arr.join('')
  }
  return out
}
// comping hits and the bass line for a kind of bar, by energy: [pos, vel, length] / [pos, 'R' | '5' | '8', length]
function compFor(bm, vel = 0.6) {
  const starts = [], out = {}
  let acc = 0
  for (const g of bm.groups) { starts.push([acc, g]); acc += g }
  out[0] = [[0, vel * 0.8, bm.len * 0.95]]
  out[1] = starts.map(([p, g]) => [p, vel * 0.85, g * 0.9])
  out[2] = starts.flatMap(([p, g], i) => (g >= 1.5 && !bm.compound ? [[p, vel, g / 2], [p + g / 2, vel * 0.75, g / 2 * 0.9]] : [[p, i ? vel * 0.85 : vel, g * 0.9]]))
  out[3] = starts.flatMap(([p, g]) => {
    const step = bm.compound ? 1 / 3 * 2 : 0.5, hits = []
    for (let q = 0; q < g - 1e-6; q += step) hits.push([round(p + q), q ? vel * 0.7 : vel, step * 0.9])
    return hits
  })
  return out
}
function bassFor(bm) {
  const out = []
  let acc = 0
  bm.groups.forEach((g, i) => {
    out.push([acc, i === bm.groups.length - 1 && bm.groups.length > 1 ? '5' : i % 2 ? '8' : 'R', round(g * 0.9)])
    acc += g
  })
  return out
}
// the meter's own code in the song: the bar geometry everything else asks
const meterCode = (id, M) => {
  const b = M.bars
  const geo = b.length === 1
    ? `const BAR = ${b[0].len} // beats a bar
const barIndex = x => floor(x / BAR + 1e-9), barStartOf = i => i * BAR, barLenOf = i => BAR`
    : `const PERIOD = ${b.reduce((s, x) => s + x.len, 0)}, BAR_LENS = [${b.map(x => x.len).join(', ')}] // bars alternate
const barIndex = x => { const k = floor(x / PERIOD + 1e-9), u = x - k * PERIOD; return 2 * k + (u >= BAR_LENS[0] - 1e-9 ? 1 : 0) }
const barStartOf = i => PERIOD * floor(i / 2) + (i % 2 ? BAR_LENS[0] : 0), barLenOf = i => BAR_LENS[i % 2]`
  return `// ---- the meter: ${M.label} -----------------------------------------------------------------------
${geo}
const barStart = x => barStartOf(barIndex(x)), inBar = x => x - barStart(x), barLen = x => barLenOf(barIndex(x))`
}
// the 4/4 song → the meter: sections, harmony, phrases (a copy per offset in the period and per speed), plans, the solo
function toMeter(M, P) {
  const W = warpOf(M)
  for (const s of P.sections) s[0] = W(s[0])
  for (const s of P.sectionInfo) { const a = W(s.at), b = W(s.at + s.beats); s.at = a; s.beats = round(b - a) }
  for (const h of P.harmony) { const a = W(h.at), b = W(h.at + h.len); h.at = a; h.len = round(b - a) }
  P.END = W(P.END)
  // phrases: each plan row plays its phrase from s at speed k → the phrase warped from there
  const variants = new Map()
  const warpPhrase = (notes, s, k) => notes.map(([b, n, d]) => {
    const t0 = W(s + k * b), t1 = W(s + k * (b + d))
    return [round((t0 - W(s)) / k), n, round((t1 - t0) / k)]
  }).filter(e => e[2] > 1e-3)
  for (const plan of Object.values(P.plans)) for (const row of plan) {
    const [s, name, , k] = row
    if (!P.phrases[name]) { row[0] = W(s); continue }
    const o = round(s % M.pin), id = o || k !== 1 ? `${name}_${String(o).replace('.', '_')}_${k}` : name
    if (!variants.has(id)) variants.set(id, warpPhrase(P.phrases[name], o, k))
    row[0] = W(s)
    row[1] = id
  }
  return variants
}

// (an imported binding is read-only: the other parts set these through here)
export const setMT = v => (MT = v)

export { MT, bassFor, compFor, grooveFor, meterCode, toMeter }
