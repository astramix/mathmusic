// Boss pattern 3 — "Final Battle": a battle theme with a hardstyle heart, 160 BPM, E minor → G minor → G major.
// encounter (!) → menu → attack → PHASE 1 → chaos (7/8) → mercy → equation → PHASE 2 → PHASE 3 (a minor
// third up) → victory. `boss.modes` tells Glitch Forest how each section runs the fight: turn (the
// world waits), build (countdown), live (the beat drives the world).
//
// The math: the growl bass chugs sixteenths on the pattern (0, 0, 12, 0, 0, 7, 0, 10) over the chord
// root; in PHASE 1 it leaves every downbeat to the hardstyle kick. "chaos" is in 7/8: bars of 3½ beats
// grouped 2 + 2 + 3, over E minor and its Phrygian F. "equation" and PHASE 2 sing a melody that is
// literally a graph: n(j) = ⌊5 sin(πj/8) + 4 sin(3πj/16 + 1)⌉ + 7 per eighth j, snapped to E harmonic
// minor and to the chord on the beat — the attack you will dodge is the formula you hear. PHASE 3 moves
// up a minor third; the victory fanfare turns the same tonic to major.
//
// Chords: Em – C – Am – B;  chaos Em – F;  mercy C – G – Am – B;  equation B pedal;  victory E – A – B – E.
import { mod, floor, exp, sin, tanh, PI, TAU, hz, filter, reverb, delay, smooth, supersaw, noise, osc } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, pulse, triangle4, lfsr, vol4, strings, chorus, poly, trigger, pianoTone, hardKick, reverseBass, duck, clapDrum, hatDrum } from '../src/instruments.js'

const SECTIONS = [
  [0, 'encounter'], [8, 'menu'], [40, 'attack'], [56, 'phase 1'], [120, 'chaos'], [148, 'mercy'],
  [180, 'equation'], [196, 'phase 2'], [260, 'phase 3'], [308, 'victory'],
]
const MODES = {
  encounter: 'turn', menu: 'turn', attack: 'build', 'phase 1': 'live', chaos: 'live', mercy: 'turn',
  equation: 'build', 'phase 2': 'live', 'phase 3': 'live', victory: 'turn',
}
const END = 324
const SEC = 60 / 160
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const LIVE = x => MODES[part(x).name] === 'live'
const ROOT_PC = { Em: 4, C: 0, Am: 9, B: 11, D: 2, F: 5, G: 7, E: 4, A: 9 }
const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'], FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
const η = noise(19)
const E1 = 41.2, E2 = 82.41, E4 = 329.63, E5 = 659.26

// ---- harmony (semitones from E4, voice-led; roots from E2) --------------------------------------------
const CH = {
  Em: [0, 3, 7], C: [0, 3, 8], Am: [0, 5, 8], B: [-1, 2, 7], D: [-2, 2, 5], F: [1, 5, 8], G: [-2, 3, 7],
  E: [0, 4, 7], A: [0, 5, 9],
}
const ROOT = { Em: 0, C: -4, Am: 5, B: 7, D: -2, F: 1, G: 3, E: 0, A: 5 }
const MAIN = ['Em', 'C', 'Am', 'B'], MERCY = ['C', 'G', 'Am', 'B']
const PROG = {
  encounter: ['Em'], attack: ['C', 'D', 'B', 'B'], chaos: ['Em', 'F'], mercy: MERCY, equation: ['B'],
  victory: ['E', 'A', 'B', 'E', 'E', 'E', 'E', 'E'],
}
const BAR = { encounter: 8, chaos: 3.5, equation: 16, victory: 2 }
const tr = x => (is(x, 'phase 3', 'victory') ? 3 : 0) // G minor, then G major
const chordAt = x => {
  const { name, t } = part(x)
  const p = name === 'phase 3' && t >= 32 ? MERCY : PROG[name] ?? MAIN
  return p[mod(floor(t / (BAR[name] ?? 4)), p.length)]
}
const SCALE = [0, 2, 3, 5, 7, 8, 11] // E harmonic minor, pcs from E
const toScale = (n, pcs) => {
  for (let d = 0; d < 7; d++) for (const k of [n - d, n + d]) if (pcs.includes(mod(k, 12))) return k
  return n
}

// ---- melodies [beat, n from E5, length] -----------------------------------------------------------------
const A = [ // the battle theme over Em – C – Am – B
  [0, 0, 0.25], [0.25, 0, 0.25], [0.5, 12, 0.5], [1, 7, 0.5], [1.5, 5, 0.25], [1.75, 3, 0.25], [2, 7, 0.5], [2.5, 10, 0.5], [3, 12, 0.75], [3.75, 10, 0.25],
  [4, 8, 0.25], [4.25, 8, 0.25], [4.5, 15, 0.5], [5, 12, 0.5], [5.5, 10, 0.25], [5.75, 8, 0.25], [6, 7, 0.5], [6.5, 8, 0.5], [7, 3, 0.75], [7.75, 5, 0.25],
  [8, 5, 0.25], [8.25, 5, 0.25], [8.5, 17, 0.5], [9, 12, 0.5], [9.5, 10, 0.25], [9.75, 8, 0.25], [10, 12, 0.5], [10.5, 15, 0.5], [11, 17, 1],
  [12, 14, 0.5], [12.5, 11, 0.5], [13, 7, 0.5], [13.5, 11, 0.5], [14, 14, 0.25], [14.25, 15, 0.25], [14.5, 14, 0.25], [14.75, 11, 0.25], [15, 7, 0.5], [15.5, -1, 0.5],
]
const A2 = [...A.slice(0, -6), [14, 12, 2]]
const B = [ // mercy, over C – G – Am – B
  [0, 12, 1.5], [1.5, 10, 0.5], [2, 8, 2], [4, 7, 1.5], [5.5, 3, 0.5], [6, -2, 2],
  [8, 0, 1], [9, 5, 1], [10, 8, 1], [11, 12, 1], [12, 11, 2], [14, 7, 1], [15, 2, 1],
]
const CHAOS = [[0, 7, 12, 7, 15, 12, 7], [1, 8, 13, 8, 17, 13, 8]] // eighths, seven per 7/8 bar
const RUN = (() => { // attack: the theme's first half, then a sixteenth run up E harmonic minor and a trill
  const up = []
  for (let n = -5; up.length < 16; n++) if (SCALE.includes(mod(n, 12))) up.push(n)
  return [...A.slice(0, 20), ...up.map((n, i) => [8 + i / 4, n, 0.25]), ...Array.from({ length: 16 }, (_, i) => [12 + i / 4, i % 2 ? 23 : 24, 0.25])]
})()
const VICTORY = [
  [0, 7, 0.5], [0.5, 12, 0.5], [1, 16, 1], [2, 9, 0.5], [2.5, 12, 0.5], [3, 17, 1],
  [4, 14, 0.5], [4.5, 11, 0.5], [5, 19, 1], [6, 16, 0.5], [6.5, 19, 0.5], [7, 24, 1], [8, 24, 6],
]
// the equation: one note per eighth j, the graph of 5 sin(πj/8) + 4 sin(3πj/16 + 1)
const eqAt = x => {
  const j = floor(2 * x), raw = Math.round(5 * sin((PI * j) / 8) + 4 * sin((3 * PI * j) / 16 + 1)) + 7
  const pcs = j % 2 === 0 ? CH[chordAt(x)].map(c => mod(c, 12)) : SCALE
  const n = toScale(raw, pcs), τ = mod(x, 0.5)
  return { n, τ, u: τ / 0.5, d: 0.5 }
}
const themeIn = t => notesAt(mod(floor(t / 16), 2) ? A2 : A, mod(t, 16))
const LEAD = {
  encounter: () => null,
  menu: t => themeIn(t),
  attack: t => notesAt(RUN, t),
  'phase 1': t => themeIn(t),
  chaos: t => {
    const k = floor(t / 3.5), p = mod(t, 3.5), i = floor(2 * p)
    return { n: CHAOS[k % 2][i], τ: mod(p, 0.5), u: mod(p, 0.5) / 0.5, d: 0.5 }
  },
  mercy: () => null,
  equation: (t, x) => (t >= 4 ? eqAt(x) : null),
  'phase 2': (t, x) => (t < 32 ? eqAt(x) : themeIn(t - 32)),
  'phase 3': t => (t < 32 ? themeIn(t) : notesAt(B, mod(t, 16))),
  victory: t => notesAt(VICTORY, t),
}
const leadAt = x => {
  if (x >= END) return null
  const { name, t } = part(x), m = LEAD[name](t, x)
  return m && { ...m, n: m.n + tr(x) }
}
const hookAt = x => (is(x, 'phase 1', 'phase 2', 'phase 3') ? leadAt(x) : null)

// ---- every drum hit of the song, laid out once (bars of 4 beats, and of 3½ in the chaos) ---------------
const HITS = {}
const add = (drum, at, vel = 1) => (HITS[drum] ??= []).push([at, vel * (0.88 + 0.12 * hash(floor(at * 8), drum.length))])
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let b = start; b < end; b += name === 'chaos' ? 3.5 : 4) {
    const t = b - start
    if (name === 'encounter' && t === 0) {
      ;[0, 2, 3.5].forEach(p => add('kick', b + p))
      add('crash', b)
      for (let i = 0; i < 8; i++) add('snare', b + 6 + i / 4, 0.4 + 0.07 * i)
    } else if (name === 'menu') {
      ;[0, 0.75, 2, 2.75].forEach(p => add('chip', b + p))
      add('snare', b + 1, 0.8), add('snare', b + 3, 0.8)
      for (let i = 0; i < 16; i++) add('hat', b + i / 4, i % 2 ? 0.35 : 0.6)
      if (mod(t, 16) === 12) for (let i = 0; i < 4; i++) add('snare', b + 3 + i / 4, 0.5)
    } else if (name === 'attack' || name === 'equation') {
      const step = t < 8 ? 1 : t < 12 ? 0.5 : 0.25
      for (let p = 0; p < 4; p += step) add('snare', b + p, 0.35 + 0.035 * (t + p))
      if (t >= 8) for (let p = 0; p < 4; p += t < 12 ? 1 : 0.5) add('kick', b + p, 0.6 + 0.03 * t)
    } else if (name === 'phase 1' || name === 'phase 2' || name === 'phase 3') {
      for (let p = 0; p < 4; p++) add('kick', b + p)
      add('clap', b + 1), add('clap', b + 3)
      for (let i = 0; i < 4; i++) add('hat', b + i + 0.5, 0.8)
      if (name !== 'phase 1') for (let i = 0; i < 16; i += 2) add('hat', b + i / 4 + 0.25, 0.3)
      if (mod(t, name === 'phase 3' ? 8 : 16) === 0) add('crash', b)
      if (mod(t, 16) === 12) add('clap', b + 3.5, 0.7), add('clap', b + 3.75, 0.8)
    } else if (name === 'chaos') { // 7/8: 2 + 2 + 3 eighths
      ;[0, 1, 2].forEach(p => add('kick', b + p))
      add('clap', b + 1), add('clap', b + 2.5, 0.7)
      for (let i = 0; i < 7; i++) add('hat', b + i / 2, i % 2 ? 0.4 : 0.7)
      if (t === 0) add('crash', b)
    } else if (name === 'mercy' && t >= 16) {
      for (let i = 0; i < 4; i++) add('hat', b + i + 0.5, 0.3)
    } else if (name === 'victory' && t === 0) {
      add('kick', b), add('crash', b), add('kick', b + 8), add('crash', b + 8)
      for (let i = 0; i < 6; i++) add('snare', b + 6.5 + i / 4, 0.5 + 0.08 * i)
    }
  }
}
for (const list of Object.values(HITS)) list.sort((a, c) => a[0] - c[0])
const lastOf = (drum, x) => {
  const a = HITS[drum]
  if (!a || x >= END) return null
  let lo = 0, hi = a.length - 1, r = -1
  while (lo <= hi) {
    const m = (lo + hi) >> 1
    if (a[m][0] <= x) (r = m), (lo = m + 1)
    else hi = m - 1
  }
  return r < 0 ? null : { τ: x - a[r][0], vel: a[r][1] }
}
const pumpAt = x => {
  const k = lastOf('kick', x)
  return k && LIVE(x) ? duck(k.τ * SEC, 0.7, 0.16) : 1
}

// K(x) — the hardstyle kick, tail on E1 (G1 in PHASE 3)
const kick = {
  color: '#ff3b6b',
  graph: x => {
    const k = lastOf('kick', x)
    return k && k.τ < 0.5 ? 2.6 + 1.9 * k.vel * exp(-6 * k.τ) : null
  },
  midi: x => (lastOf('kick', x)?.τ < 0.25 ? [36] : []),
  formula: [
    String.raw`y = 0.8\tanh\!\Big(2.2\,\LP_{5000}\big[\tanh(9(s + 0.35)) - \tanh 3.15\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP_{3000}\eta + 0.6\,a\sin 2\pi\!\int\! f\,dT`,
    String.raw`s = a\sin 2\pi\!\int f\big(1 + 30e^{-t/4\text{мс}} + 2e^{-t/30\text{мс}}\big)\,2^{-5\min(1,\,(t - 0.27)^+/0.12)/12}\,dT,\qquad f = 41.2\cdot 2^{\text{tr}/12}\ \text{(E1)}`,
    String.raw`\text{хаос } 7/8:\ \text{удары в } \{0, 1, 2\} + 3.5k`,
  ],
  audio() {
    const k = hardKick({ tail: 0.27, drop: 5, drive: 9, bias: 0.35, tone: 5000, sub: 0.6 })
    return x => {
      const h = lastOf('kick', x)
      return 1.9 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, E1 * 2 ** (tr(x) / 12), !!h)
    }
  },
}

// G(x) — the growl bass: saw + square driven into tanh, a resonant low-pass snapping shut after each
// sixteenth, a sine sub under it
const GROWL = [0, 0, 12, 0, 0, 7, 0, 10]
const growlAt = x => {
  if (x >= END) return null
  const { name, t } = part(x), r = ROOT[chordAt(x)] + tr(x), j = floor(4 * x), τ = mod(x, 0.25)
  if (name === 'menu' || name === 'equation') return τ < 0.18 ? { n: r + GROWL[mod(j, 8)], τ } : null
  if (name === 'phase 1') return mod(j, 4) && τ < 0.18 ? { n: r + GROWL[mod(j, 8)], τ } : null
  if (name === 'phase 3') return mod(j, 4) === 1 && τ < 0.2 ? { n: r + 12, τ } : null
  if (name === 'chaos') {
    const p = mod(t, 3.5), i = floor(2 * p), e = mod(p, 0.5)
    return e < 0.38 ? { n: r + [0, 0, 12, 0, 0, 12, 10][i], τ: e } : null
  }
  if (name === 'encounter') return t < 1.5 || (t >= 2 && t < 3) || (t >= 3.5 && t < 5) ? { n: r, τ: t < 2 ? t : t < 3.5 ? t - 2 : t - 3.5 } : null
  if (name === 'victory') return t < 1 || (t >= 8 && t < 10) ? { n: r, τ: mod(t, 8) } : null
  return null
}
const growl = {
  color: '#5aa7ff',
  graph: x => (growlAt(x) ? -2.6 + growlAt(x).n / 20 : null),
  midi: x => (growlAt(x) ? [40 + growlAt(x).n] : []), // E2 = MIDI 40
  formula: [
    String.raw`y = 0.5\tanh\!\Big(1.5\Big[\LP_{180 + 2600e^{-t/70\text{мс}}}^{\,Q=2}\tanh\!\big(5(\saw(f) + 0.6\sq(1.003f))\big) + 0.6\sin 2\pi\!\int\! f\,dT\Big]\Big)`,
    String.raw`f = 82.41\cdot 2^{(r + g_j)/12},\qquad g = (0, 0, 12, 0, 0, 7, 0, 10)_{j \bmod 8},\quad j = \lfloor 4x\rfloor`,
  ],
  audio() {
    const sw = osc('saw'), sq = osc('square'), sub = osc('sine'), lp = filter('lp'), gate = smooth(3), glide = smooth(4)
    let n = 0
    return x => {
      const g = growlAt(x)
      if (g) n = g.n
      const f = glide(hz(n, E2)), a = gate(g ? 1 : 0), t = g ? g.τ * SEC : 1
      const src = tanh(5 * (sw(f) + 0.6 * sq(1.003 * f)))
      const y = lp(src, 180 + 2600 * exp(-t / 0.07), 2) + 0.6 * sub(f)
      return 0.5 * a * tanh(1.5 * y)
    }
  },
}

// R(x) — reverse bass: one swell per beat in PHASE 2, rolling in PHASE 3
const rbassAt = x => {
  if (x >= END || !is(x, 'phase 2', 'phase 3')) return null
  const r = mod(x, 1)
  if (r < 0.5) return null
  return { u: is(x, 'phase 3') ? mod(r - 0.5, 0.25) / 0.25 : (r - 0.5) / 0.5, n: ROOT[chordAt(x)] + tr(x) - 12 }
}
const rbass = {
  color: '#b0123e',
  graph: x => {
    const b = rbassAt(x)
    return b ? -2.9 + 0.8 * b.u * b.u + b.n / 40 : null
  },
  midi: x => (rbassAt(x) && rbassAt(x).u > 0.3 ? [40 + rbassAt(x).n] : []),
  formula: [String.raw`y = \HP_{25}\,\LP_{150\cdot 2^{4u}}\tanh\!\Big(5u^2\big(0.4\saw(f) + 0.4\saw(1.006f) + 0.8\sin 2\pi\!\int\! f\,dT\big)\Big),\qquad f = 41.2\cdot 2^{r_k/12}`],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4.3, q: 1.4 }), lp = filter('lp')
    return x => {
      const b = rbassAt(x)
      return 0.75 * lp(rb(b ? b.u : null, hz(b ? b.n : 0, E2)), 2500)
    }
  },
}

// H(x) — the supersaw hook in the three phases (the theme, then the equation)
const hook = {
  color: '#ffffff',
  graph: x => (hookAt(x) ? 1.4 + hookAt(x).n / 14 : null),
  midi: x => (hookAt(x) && hookAt(x).u < 0.9 ? [64 + hookAt(x).n] : []), // E4 = MIDI 64
  formula: [
    String.raw`y = \Rev\Big[0.5\,d\,\LP_{7000}\big(\SS_7(f) + 0.5\,\SS_5(2f)\big)\Big],\qquad f = 329.63\cdot 2^{n/12}`,
    String.raw`n_{\text{фаза 2}}(j) = \text{snap}\Big(\big\lfloor 5\sin\tfrac{\pi j}{8} + 4\sin\big(\tfrac{3\pi j}{16} + 1\big)\big\rceil + 7\Big),\qquad j = \lfloor 2x\rfloor`,
  ],
  audio() {
    const main = supersaw({ voices: 7, detune: 0.26, seed: 8 }), oct = supersaw({ voices: 5, detune: 0.2, seed: 9 })
    const lpL = filter('lp'), lpR = filter('lp'), gate = smooth(5), glide = smooth(15), fx = reverb({ room: 0.86, wet: 0.35 })
    let n = 0
    return x => {
      const m = hookAt(x)
      if (m) n = m.n
      const a = gate(m && m.u < 0.9 ? 1 : 0) * pumpAt(x), f = glide(hz(n, E4))
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f)
      return fx(0.5 * a * lpL(l1 + 0.5 * l2, 7000, 0.8), 0.5 * a * lpR(r1 + 0.5 * r2, 7000, 0.8))
    }
  },
}

// L(x) — pulse 1, the chip lead: the theme (menu), the run (attack), the 7/8 ostinato, the equation, the fanfare
const lead = {
  color: '#ff9ad5',
  graph: x => (leadAt(x) && !hookAt(x) ? 1.1 + leadAt(x).n / 14 : null),
  midi: x => (leadAt(x) && leadAt(x).u < 0.9 ? [76 + leadAt(x).n] : []), // E5 = MIDI 76
  formula: [String.raw`y = \Rev\Big[\Dly\Big[0.7\,d\,\ell\,\vol\!\big(1 - 0.3\min(1, t/0.3)\big)\,\LP_{10\text{k}}\,\Pi_{1/4}\big(659.26\cdot 2^{(n + v)/12}\big)\Big]\Big],\qquad v = 0.3\sin 2\pi\,6T\ (t > 0.3),\quad \ell = 0.55\ \text{под хуком}`],
  audio() {
    const p = pulse(0.25), p12 = pulse(0.125), lp = filter('lp'), echo = delay({ time: SEC * 0.75, feedback: 0.35, wet: 0.3 })
    const verb = reverb({ room: 0.84, damp: 0.35, wet: 0.32 })
    return x => {
      const m = leadAt(x), held = m ? m.τ * SEC : 0
      const vib = held > 0.3 ? 0.3 * sin(TAU * 6 * x * SEC) : 0
      const f = hz((m?.n ?? 0) + vib, E5), a = p(f), b = p12(f)
      const g = m && m.u < 0.9 ? vol4(1 - 0.3 * Math.min(1, held / 0.3)) : 0
      const live = LIVE(x) && !is(x, 'chaos') ? 0.55 : 1 // under the hook it only doubles
      const y = 0.7 * live * g * pumpAt(x) * lp(is(x, 'chaos') ? b : a, 10000)
      return verb(...echo(...pan(y, -0.2)))
    }
  },
}

// O(x) — orchestral stabs: the chord on three 5-voice supersaws through a low-pass that snaps shut,
// 400 + 6000e^{−t/60 ms}, on the accents of every section
const stabAt = x => {
  if (x >= END) return null
  const { name, t } = part(x)
  let τ = null
  if (name === 'encounter') τ = [0, 2, 3.5].filter(p => p <= t).map(p => t - p).pop() ?? null
  else if (name === 'menu' || name === 'phase 1' || name === 'phase 3') {
    const p = mod(t, 4)
    τ = p < 1.5 ? p : p - 1.5
  } else if (name === 'chaos') τ = mod(t, 3.5)
  else if (name === 'attack') τ = mod(t, t < 8 ? 2 : 1)
  else if (name === 'victory') τ = t < 8 ? mod(t, 2) : t - 8
  return τ === null || τ > 1.5 ? null : { τ, c: CH[chordAt(x)].map(n => n + tr(x)) }
}
const brass = {
  color: '#ffb347',
  graph: x => (stabAt(x) && stabAt(x).τ < 0.4 ? stabAt(x).c.map(n => 0 + n / 16) : null),
  midi: x => (stabAt(x) && stabAt(x).τ < 0.35 ? stabAt(x).c.map(n => 64 + n) : []),
  formula: [String.raw`y = \Rev\Big[0.5\,d\,(1 - e^{-t/5\text{мс}})\,e^{-t/0.3}\,\LP_{400 + 6000e^{-t/60\text{мс}}}\sum_{j=1}^{3}\SS_5\big(329.63\cdot 2^{c_j/12}\big)\Big]`],
  audio() {
    const voices = [0, 1, 2].map(j => supersaw({ voices: 5, detune: 0.12, seed: 40 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), fx = reverb({ room: 0.9, wet: 0.45 })
    let c = [0, 3, 7]
    return x => {
      const s = stabAt(x)
      if (s) c = s.c
      const t = s ? s.τ * SEC : 9, a = s ? (1 - exp(-t / 0.005)) * exp(-t / 0.3) : 0
      let l = 0, r = 0
      for (let j = 0; j < 3; j++) {
        const [vl, vr] = voices[j](hz(c[j], E4))
        l += vl
        r += vr
      }
      const fc = 400 + 6000 * exp(-t / 0.06), k = 0.5 * a * pumpAt(x)
      return fx(k * lpL(l, fc, 0.9), k * lpR(r, fc, 0.9))
    }
  },
}

// P(x) — piano: the mercy theme over broken chords; chords under the victory fanfare
const pianoAt = x => {
  if (x >= END) return []
  const { name, t } = part(x), out = []
  if (name === 'mercy') {
    const m = notesAt(B, mod(t, 16))
    if (m) out.push({ n: m.n + 12, at: x - m.τ, d: m.d, v: 0.7 })
    const c = CH[chordAt(x)], j = floor(2 * t), bass = [ROOT[chordAt(x)] - 12, c[0], c[1], c[2]] // from E4
    out.push({ n: bass[mod(j, 4)], at: x - mod(t, 0.5), d: 0.5, v: 0.45 })
  } else if (name === 'victory' && t < 8 && mod(t, 2) < 0.5) {
    for (const n of CH[chordAt(x)]) out.push({ n: n + tr(x), at: x - mod(t, 2), d: 1.5, v: 0.6 })
  }
  return out
}
const piano = {
  color: '#e8e0d0',
  graph: x => (pianoAt(x).length ? pianoAt(x).map(p => -0.6 + p.n / 24) : null),
  midi: x => pianoAt(x).filter(p => x - p.at < p.d * 0.9).map(p => 64 + p.n),
  formula: [
    String.raw`P(f,t,v) = 0.35\sum_{k=1}^{6}\frac{v^{0.4+0.25k}}{k^{1.15}}\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\big)\big(\sin 2\pi f_k t+\sin(2\pi\cdot1.0006 f_k t+k)\big) + 0.15v\,e^{-90t}\sin 2\pi\,2.7ft`,
    String.raw`f = 329.63\cdot 2^{n/12},\qquad \text{левая рука: } (r - 12, c_1, c_2, c_3)_{\lfloor 2x\rfloor \bmod 4}`,
  ],
  audio() {
    const keys = poly(pianoTone, { release: 0.35, life: 5 }), fires = [trigger(), trigger(), trigger(), trigger()]
    const verb = reverb({ room: 0.88, wet: 0.4 })
    return x => {
      const ps = pianoAt(x)
      for (let i = 0; i < 4; i++) {
        const p = ps[i]
        if (fires[i](p ? p.at + p.n / 100 : null)) keys.hit(hz(p.n, E4), p.v, p.d * SEC + 0.2)
      }
      const y = 0.8 * keys()
      return verb(...pan(y, 0.1))
    }
  },
}

// S(x) — strings/choir: the mercy, PHASE 3 and the equation
// a quiet bed under the sparse turn sections, full in the mercy and PHASE 3
const choirOn = x => x < END && is(x, 'mercy', 'phase 3', 'equation', 'menu', 'encounter', 'victory')
const CHOIR_SOFT = { menu: 0.45, encounter: 0.5, victory: 0.7 }
const choir = {
  color: '#9b8fb8',
  graph: x => (choirOn(x) ? CH[chordAt(x)].map(n => -1 + (n + tr(x)) / 18) : null),
  midi: x => (choirOn(x) ? CH[chordAt(x)].map(n => 64 + n + tr(x)) : []),
  formula: [String.raw`y = \Rev\big[\Cho[\,0.5\,d\,S\,]\big],\qquad f_j = 329.63\cdot 2^{c_{k,j}/12}`],
  audio() {
    const s = strings({ voices: 4, attack: 800, release: 1400, cutoff: 3400, gain: 0.3 })
    const ch = chorus({ rate: 0.3, depth: 0.004, mix: 0.5 }), verb = reverb({ room: 0.92, wet: 0.5 })
    return x => {
      const on = choirOn(x)
      const [l, r] = s(on ? CH[chordAt(x)].map(n => hz(n + tr(x), E4)) : [])
      const k = 0.5 * (CHOIR_SOFT[part(x).name] ?? 1) * pumpAt(x)
      return verb(...ch(k * l, k * r))
    }
  },
}

// A(x) — pulse 2, the 60 Hz chip arpeggio
const arpAt = x => {
  if (x >= END) return null
  const { name, t } = part(x), c = CH[chordAt(x)].map(n => n + tr(x))
  if (name === 'chaos') return { notes: [c[mod(floor(2 * t), 3)] + 12], a: 0.45 * exp(-6 * mod(t, 0.5)) }
  if (LIVE(x) || name === 'equation') {
    const k = mod(floor(4 * x), 8), i = [0, 1, 2, 3, 4, 3, 2, 1][k]
    return { notes: [c[i % 3] + 12 * floor(i / 3) + 12], a: 0.5 * exp(-10 * mod(x, 0.25)) }
  }
  if (name === 'menu' || name === 'attack') return { notes: c, a: 0.45 * exp(-5 * mod(x, 0.5)) }
  if (name === 'victory') return { notes: c.map(n => n + 12), a: 0.4 * Math.max(0, 1 - t / 16) }
  return null
}
const chiparp = {
  color: '#ffe08a',
  graph: x => (arpAt(x) && arpAt(x).a > 0.12 ? arpAt(x).notes.map(n => -0.4 + n / 24) : null),
  midi: x => (arpAt(x) && arpAt(x).a > 0.15 ? arpAt(x).notes.map(n => 64 + n) : []),
  formula: [String.raw`y = 1.6\,d\,\vol(0.1 + a)\,\LP_{11\text{k}}\,\Pi_{1/8}\big(329.63\cdot 2^{c_i/12}\big),\qquad i = \lfloor 60T\rfloor \bmod 3;\quad \text{хаос: } c_{\lfloor 2x\rfloor \bmod 3}`],
  audio() {
    const p = pulse(0.125), lp = filter('lp'), verb = reverb({ room: 0.7, wet: 0.25 })
    return x => {
      const s = arpAt(x), n = s ? s.notes[mod(floor(60 * x * SEC), s.notes.length)] : 0
      const y = 1.6 * pumpAt(x) * (s ? vol4(0.1 + s.a) : 0) * lp(p(hz(n, E4)), 11000)
      return verb(...pan(y, 0.35))
    }
  },
}

// D(x) — drums
const drums = {
  color: '#ff6f91',
  graph: x => {
    const c = lastOf('clap', x), s = lastOf('snare', x)
    if (c && c.τ < 0.3) return 3.6 + 0.7 * c.vel * exp(-8 * c.τ)
    return s && s.τ < 0.2 ? 3.2 + 0.6 * s.vel * exp(-10 * s.τ) : null
  },
  midi: x => [['chip', 36], ['snare', 38], ['clap', 39], ['hat', 42], ['crash', 49]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`y = \Rev\Big[0.9\,\text{Clap}(t) + 0.36\,\vol(e^{-12t})\lfsr_{12\text{k}} + 0.3\,\text{Hat}(t) + 0.3e^{-2t}\HP_{4000}\eta + 0.6\,\tri_4(60 + 300e^{-30t})\Big],\qquad \text{такты по } 3\tfrac12 \text{ доли в хаосе}`],
  audio() {
    const clap = clapDrum({ center: 1500 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), tri = triangle4()
    const sn = lfsr(), hp = filter('hp'), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const at = d => { const h = lastOf(d, x); return h ? { t: h.τ * SEC, v: h.vel } : { t: 9, v: 0 } }
      const c = at('clap'), s = at('snare'), h = at('hat'), k = at('chip'), cr = at('crash')
      const y = 0.9 * c.v * clap(c.t, c.t < 0.4)
        + 0.36 * s.v * vol4(exp(-12 * s.t)) * sn(12000)
        + 0.3 * h.v * hat(h.t, h.t < 0.1)
        + 0.3 * cr.v * exp(-2 * cr.t) * hp(η(), 4000)
        + 0.6 * k.v * (k.t < 0.15 ? tri(60 + 300 * exp(-30 * k.t)) : (tri(60), 0))
      return verb(y, y)
    }
  },
}

// F(x) — fx: the encounter alarm "!" (square 988/1319 Hz in eighths), risers, downlifters
const fx = {
  color: '#c9b8ff',
  graph: x => {
    const { name, t } = part(x)
    if (name === 'attack' || name === 'equation') return -2 + (t / 16) ** 2 * 3.5
    if (name === 'encounter' && t < 2) return 4.5
    return null
  },
  formula: [String.raw`y = \Rev\Big[0.08\,\Pi_{1/2}\big(988 \,|\, 1319\big) + 0.6a^2\,\BP_{300\cdot 2^{5.3a}}\eta + 0.5e^{-1.5t}\BP_{8000\cdot 2^{-4t}}\eta\Big]`],
  audio() {
    const sq = pulse(0.5), bp = filter('bp'), bp2 = filter('bp'), verb = reverb({ room: 0.8, wet: 0.35 })
    return x => {
      const { name, t } = part(x), build = name === 'attack' || name === 'equation', a = build ? t / 16 : 0
      const alarm = sq(mod(floor(2 * t), 2) ? 1318.5 : 987.77)
      let y = name === 'encounter' && t < 2 && mod(t, 0.5) < 0.4 ? 0.08 * alarm : 0
      y += 0.6 * a * a * bp(η(), 300 * 2 ** (5.3 * a), 1.5)
      const down = LIVE(x) && t < 3 ? t * SEC : 9
      y += 0.5 * exp(-1.5 * down) * bp2(η(), 8000 * 2 ** (-4 * down), 1)
      return verb(y, y)
    }
  },
}

export default {
  name: 'finalbattle',
  style: 'boss',
  bpm: 160,
  key: 'Em',
  length: END,
  sections: SECTIONS,
  theme: 'chip',
  // for Glitch Forest: how each section runs the fight (turn / build / live), which tracks strike the
  // arena and how, the chord on every beat, where an undefeated fight loops (PHASE 3 again) and where
  // the victory jumps (the fanfare)
  boss: {
    modes: MODES,
    // every track's graph(x) flies at the player as a Glitch Forest tile, moving its own way
    // (snake, wave, spray, rain, pulse, stab); the kick also sets the rhythm
    attacks: {
      growl: { tile: 'lava', move: 'wave' }, rbass: { tile: 'tree', move: 'wave' }, kick: { tile: 'water', move: 'pulse' },
      hook: { tile: 'slime', move: 'snake' }, lead: { tile: 'acid', move: 'snake' }, brass: { tile: 'corrupt', move: 'stab' },
      chiparp: { tile: 'corrupt', move: 'spray' }, choir: { tile: 'frost', move: 'rain' }, piano: { tile: 'water', move: 'rain' },
    },
    chord: x => {
      const c = chordAt(x), pc = mod(ROOT_PC[c] + tr(x), 12)
      return (tr(x) ? FLATS : SHARPS)[pc] + (c.endsWith('m') ? 'm' : '')
    },
    loop: 260,
    outro: 308,
  },
  tracks: { kick, growl, rbass, hook, lead, brass, piano, choir, chiparp, drums, fx },
}
