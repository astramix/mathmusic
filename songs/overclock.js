// Boss pattern 1 — "Overclock": euphoric hardstyle × chiptune, 150 BPM, F♯ minor.
// A boss fight in ten sections. Each section carries the fight mode it is written for (`boss.modes`):
// turn = the world waits for the player's step, build = the countdown to real time, live = the beat
// drives the world. boot → theme → build → DROP → break → build II → DROP II (rolling bass) →
// stuck (the record skips) → FINAL (a tone up) → shutdown.
//
// The math: the hardstyle kick is a pitch curve f·(1 + 30e^{−t/4ms} + 2e^{−t/30ms}) through two
// tanh stages, its tail tuned to the tonic; the reverse bass swells as u² between kicks (one swell
// per beat, then two: the rolling bass); every other part ducks under the kick, 1 − 0.7(1 − t/0.18)².
// In DROP II the chip lead is computed from the chords: the nearest chord tone a third or more above
// the hook. In "stuck" time itself is warped: W(x) = 236 + ((x − 240) mod 2^{2 − ⌊(x − 240)/4⌋}) —
// the last bar of DROP II looped in 4, 2, 1 and ½ beats.
//
// Chords: F♯m – D – A – E;  break Bm – F♯m – G (Neapolitan) – C♯ (V, E♯ leading tone);
// builds D – E – C♯ – C♯ (dominant pedal into the drop).
import { mod, floor, exp, sin, TAU, hz, filter, reverb, delay, smooth, supersaw, noise } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, pulse, triangle4, lfsr, vol4, strings, chorus, hardKick, reverseBass, duck, clapDrum, hatDrum } from '../src/instruments.js'

const SECTIONS = [
  [0, 'boot'], [16, 'theme'], [48, 'build'], [64, 'drop'], [128, 'break'], [160, 'build II'],
  [176, 'drop II'], [240, 'stuck'], [256, 'final'], [288, 'shutdown'],
]
const MODES = {
  boot: 'turn', theme: 'turn', build: 'build', drop: 'live', break: 'turn', 'build II': 'build',
  'drop II': 'live', stuck: 'live', final: 'live', shutdown: 'turn',
}
const END = 304
const SEC = 60 / 150
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const η = noise(77)
const Fs1 = 46.249, Fs2 = 92.499, Fs4 = 369.99, Fs5 = 739.99

// ---- time: the jammed record ------------------------------------------------------------------------
const W = x => {
  if (!is(x, 'stuck')) return x
  const t = x - 240
  return 236 + mod(t, 2 ** (2 - floor(t / 4)))
}

// ---- harmony (semitones from F♯4, voice-led; roots from F♯1) -----------------------------------------
const CH = { 'F#m': [0, 3, 7], D: [0, 3, 8], A: [-2, 3, 7], E: [-2, 2, 5], Bm: [0, 5, 8], G: [1, 5, 8], 'C#': [-1, 2, 7] }
const ROOT = { 'F#m': 0, D: 8, A: 3, E: 10, Bm: 5, G: 1, 'C#': 7 }
const MAIN = ['F#m', 'D', 'A', 'E'], BRIDGE = ['Bm', 'F#m', 'G', 'C#'], RISE = ['D', 'E', 'C#', 'C#']
const PROG = { break: BRIDGE, build: RISE, 'build II': RISE, shutdown: ['F#m'] }
const BAR = { shutdown: 16 }
const tr = x => (is(x, 'final') ? 2 : 0) // FINAL: G♯ minor
const chordAt = x => {
  const { name, t } = part(x), p = PROG[name] ?? MAIN
  return p[mod(floor(t / (BAR[name] ?? 4)), p.length)]
}
const LIVE = x => MODES[part(x).name] === 'live'
const ROOT_PC = { 'F#m': 6, D: 2, A: 9, E: 4, Bm: 11, G: 7, 'C#': 1 }
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

// ---- melodies [beat, n from F♯5, length] — the 3-3-2 euphoric hook -------------------------------------
const A = [
  [0, 7, 0.75], [0.75, 3, 0.75], [1.5, 0, 0.5], [2, 3, 0.5], [2.5, 7, 0.5], [3, 12, 0.75], [3.75, 10, 0.25],
  [4, 8, 0.75], [4.75, 7, 0.75], [5.5, 3, 0.5], [6, 8, 0.5], [6.5, 12, 0.5], [7, 15, 0.75], [7.75, 12, 0.25],
  [8, 10, 0.75], [8.75, 7, 0.75], [9.5, 3, 0.5], [10, 7, 0.5], [10.5, 10, 0.5], [11, 15, 1],
  [12, 14, 0.75], [12.75, 10, 0.75], [13.5, 5, 0.5], [14, 2, 1], [15, -2, 0.5], [15.5, 2, 0.5],
]
const A2 = [...A.slice(0, -2), [14, 2, 0.5], [14.5, -2, 0.5], [15, 0, 1]]
const B = [ // the break: Bm – F♯m – G – C♯, the leading tone E♯ at the end
  [0, 5, 1.5], [1.5, 3, 0.5], [2, 0, 2], [4, 3, 1.5], [5.5, 0, 0.5], [6, -5, 2],
  [8, 1, 1.5], [9.5, 5, 0.5], [10, 8, 2], [12, 11, 1], [13, 7, 1], [14, 2, 1], [15, -1, 1],
]
const BOOT = [[8, 7, 1], [9, 3, 1], [10, 0, 2], [12, 12, 1], [13, 10, 1], [14, 7, 2]]
const RUN = [ // build: the hook's first half, then a run up the dominant and a C♯ trill of sixteenths
  ...A.slice(0, 14),
  ...[-5, -4, -1, 0, 2, 3, 5, 7].map((n, i) => [8 + 0.5 * i, n, 0.5]),
  ...Array.from({ length: 16 }, (_, i) => [12 + 0.25 * i, i % 2 ? 7 : 8, 0.25]),
]
const BYE = [[0, 7, 1.5], [1.5, 3, 1.5], [3, 0, 1], [4, 3, 1], [5, -2, 1], [6, 0, 6]]

const hookIn = t => notesAt(mod(floor(t / 16), 2) ? A2 : A, mod(t, 16))
const hookAt = x => {
  if (x >= END) return null
  const w = W(x)
  if (!is(w, 'drop', 'drop II', 'final')) return null
  const m = hookIn(part(w).t)
  return m && { ...m, n: m.n + tr(w) }
}
// the chord tone ≥ a minor third above n (DROP II, FINAL): harmony computed from the chords
const above = (n, x) => {
  const pcs = CH[chordAt(x)].map(c => mod(c + tr(x), 12))
  for (let k = n + 3; k < n + 15; k++) if (pcs.includes(mod(k, 12))) return k
  return n + 12
}
const LEAD = {
  boot: t => notesAt(BOOT, t),
  theme: t => notesAt(t < 16 ? A : A2, mod(t, 16)),
  build: t => notesAt(RUN, t),
  'build II': t => notesAt(RUN, t),
  drop: t => hookIn(t),
  'drop II': t => {
    const m = hookIn(t)
    return m && { ...m, n: above(m.n, 176 + t) }
  },
  break: t => notesAt(B, mod(t, 16)),
  final: t => {
    const m = hookIn(t)
    return m && { ...m, n: above(m.n + 2, 256 + t) - 2 }
  },
  shutdown: t => notesAt(BYE, t),
}
const leadAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w), m = LEAD[name](t)
  return m && { ...m, n: m.n + tr(w), at: w - m.τ }
}

// ---- the kick grid: beats between kicks (null = none) ----------------------------------------------------
const kickGrid = x => {
  const { name, t } = part(x)
  if (name === 'drop' || name === 'drop II' || name === 'final') return 1
  if (name === 'build' || name === 'build II') return t < 8 ? null : t < 12 ? 1 : t < 14 ? 0.5 : 0.25
  if (name === 'boot') return t >= 8 ? 2 : null
  return null
}
const kickAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w)
  if (name === 'shutdown') return t < 4 ? { τ: t, vel: 1 } : null
  const g = kickGrid(w)
  if (!g) return null
  const vel = name === 'boot' ? 0.45 : name.startsWith('build') ? 0.55 + 0.03 * t : 1
  return { τ: mod(w, g), vel }
}
const pumpAt = x => {
  const k = kickAt(x)
  return k && LIVE(W(x)) ? duck(k.τ * SEC) : 1
}

// K(x) — the hardstyle kick, tail on the tonic F♯1 (G♯1 in the FINAL)
const kick = {
  color: '#ff3b6b',
  graph: x => {
    const k = kickAt(x)
    return k && k.τ < 0.5 ? 2.6 + 1.9 * k.vel * exp(-6 * k.τ) : null
  },
  midi: x => (kickAt(x) && kickAt(x).τ < 0.25 ? [36] : []),
  formula: [
    String.raw`y = 0.8\tanh\!\Big(2.2\,\LP_{5000}\big[\tanh(7(s + 0.3)) - \tanh 2.1\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP_{3000}\eta + 0.5\,a\sin 2\pi\!\int\! f\,dT`,
    String.raw`s = a\sin 2\pi\!\int f\big(1 + 30e^{-t/4\text{мс}} + 2e^{-t/30\text{мс}}\big)\,2^{-7\min(1,\,(t-0.3)^+/0.12)/12}\,dT,\qquad a = \min\!\big(1, (0.4 - t)^+/0.1\big)`,
    String.raw`f = 46.25\cdot 2^{\text{tr}/12}\ \text{Гц (F♯1)},\qquad \text{удары: каждая доля в дропах; } 1, \tfrac12, \tfrac14 \text{ в разгоне}`,
  ],
  audio() {
    const k = hardKick({ tail: 0.32, drop: 7, drive: 8, bias: 0.3, tone: 5200, sub: 0.55 })
    return x => {
      const h = kickAt(x), f = Fs1 * 2 ** (tr(W(x)) / 12)
      return 1.9 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, f, !!h)
    }
  },
}

// R(x) — the reverse bass between kicks: one swell per beat in DROP, two (rolling) in DROP II and FINAL
const rbassAt = x => {
  if (x >= END) return null
  const w = W(x)
  if (!is(w, 'drop', 'drop II', 'final')) return null
  const r = mod(w, 1), rolling = is(w, 'drop II', 'final')
  const u = rolling ? (r < 0.5 ? null : mod(r - 0.5, 0.25) / 0.25) : r < 0.5 ? null : (r - 0.5) / 0.5
  return u === null ? null : { u, n: ROOT[chordAt(w)] + tr(w) }
}
const rbass = {
  color: '#b0123e',
  graph: x => {
    const b = rbassAt(x)
    return b ? -2.9 + 0.8 * b.u * b.u + b.n / 30 : null
  },
  midi: x => (rbassAt(x) && rbassAt(x).u > 0.3 ? [30 + rbassAt(x).n] : []), // F♯1 = MIDI 30
  formula: [
    String.raw`y = \HP_{25}\,\LP_{150\cdot 2^{4u}}\tanh\!\Big(4u^2\big(0.4\saw(f) + 0.4\saw(1.006f) + 0.8\sin 2\pi\!\int\! f\,dT\big)\Big)`,
    String.raw`u = \frac{(x \bmod 1) - \tfrac12}{\tfrac12}\ \text{(дроп)},\qquad u = \frac{(x - \tfrac12) \bmod \tfrac14}{\tfrac14}\ \text{(катящийся бас)},\qquad f = 46.25\cdot 2^{r_k/12}`,
  ],
  audio() {
    const rb = reverseBass({ drive: 5, open: 4.2, q: 1.4 }), sub = filter('lp')
    return x => {
      const b = rbassAt(x), y = rb(b ? b.u : null, hz(b ? b.n : 0, Fs1))
      return 0.75 * sub(y, 2500)
    }
  },
}

// H(x) — the supersaw hook: 7 + 5 saws (an octave up), portamento 20 ms, ducked under the kick
const hook = {
  color: '#ffffff',
  graph: x => (hookAt(x) ? 1.4 + hookAt(x).n / 12 : null),
  midi: x => (hookAt(x) && hookAt(x).u < 0.92 ? [66 + hookAt(x).n] : []), // F♯4 = MIDI 66
  formula: [
    String.raw`y = \Rev\Big[0.55\,d(t_k)\,\LP_{7000}\big(\SS_7(f) + 0.5\,\SS_5(2f)\big)\Big],\qquad f = 369.99\cdot 2^{n/12}`,
    String.raw`d(t_k) = 1 - 0.7\big(1 - t_k/0.18\big)^2\ \text{(сайдчейн от бочки)}`,
  ],
  audio() {
    const main = supersaw({ voices: 7, detune: 0.28, seed: 3 }), oct = supersaw({ voices: 5, detune: 0.22, seed: 5 })
    const lpL = filter('lp'), lpR = filter('lp'), gate = smooth(6), glide = smooth(20), fx = reverb({ room: 0.88, wet: 0.4 })
    let n = 0
    return x => {
      const m = hookAt(x)
      if (m) n = m.n
      const a = gate(m && m.u < 0.92 ? 1 : 0) * pumpAt(x), f = glide(hz(n, Fs4))
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f)
      return fx(0.55 * a * lpL(l1 + 0.5 * l2, 7000, 0.8), 0.55 * a * lpR(r1 + 0.5 * r2, 7000, 0.8))
    }
  },
}

// L(x) — pulse 1, the chip lead: 25 % duty (12.5 % in the break), vibrato on long notes, echo in the break
const lead = {
  color: '#ff9ad5',
  graph: x => (leadAt(x) ? 1.1 + leadAt(x).n / 14 : null),
  midi: x => (leadAt(x) && leadAt(x).u < 0.9 ? [78 + leadAt(x).n] : []), // F♯5 = MIDI 78
  formula: [
    String.raw`y = \Rev\Big[\Dly\Big[0.5\,d\,\vol\!\big(1 - 0.3\min(1, t/0.3)\big)\,\LP_{10\text{k}}\,\Pi_{1/4}\big(739.99\cdot 2^{(n + v)/12}\big)\Big]\Big]`,
    String.raw`v = 0.3\sin 2\pi\,6T\ \ (t > 0.3),\qquad n_{\text{дроп II}} = \min\{k \ge n + 3 : k \bmod 12 \in \text{аккорд}\}`,
  ],
  audio() {
    const p25 = pulse(0.25), p12 = pulse(0.125), lp = filter('lp'), echo = delay({ time: SEC * 0.75, feedback: 0.45, wet: 0.4 })
    const verb = reverb({ room: 0.84, damp: 0.35, wet: 0.35 })
    return x => {
      const m = leadAt(x), held = m ? m.τ * SEC : 0, w = W(x)
      const vib = held > 0.3 ? 0.3 * sin(TAU * 6 * x * SEC) : 0
      const f = hz((m?.n ?? 0) + vib, Fs5), a25 = p25(f), a12 = p12(f)
      const g = m && m.u < 0.9 ? vol4(1 - 0.3 * Math.min(1, held / 0.3)) : 0
      const y = 0.5 * g * pumpAt(x) * lp(is(w, 'break') ? a12 : a25, 10000)
      const [l, r] = pan(y, -0.2), wet = is(w, 'break', 'boot', 'shutdown') ? 1 : 0.3
      const [el, er] = echo(l * wet, r * wet)
      return verb(l + el, r + er)
    }
  },
}

// P(x) — pulse 2, the 60 Hz chip arpeggio ⌊60t⌋ mod 3: eighths (turn), sixteenths broken over two octaves
// (live), slow quarters (break)
const arpAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w), c = CH[chordAt(w)].map(n => n + tr(w))
  if (name === 'boot') return { notes: c, a: 0.25 * Math.min(1, t / 8) }
  if (LIVE(w)) {
    const k = mod(floor(4 * w), 8), i = [0, 1, 2, 3, 4, 3, 2, 1][k]
    return { notes: [c[i % 3] + 12 * floor(i / 3) + 12], a: 0.55 * exp(-10 * mod(w, 0.25)) }
  }
  if (name === 'break') return { notes: c, a: 0.35 * exp(-2 * mod(w, 1)) }
  if (name === 'shutdown') return { notes: c, a: 0.35 * Math.max(0, 1 - t / 14) }
  return { notes: c, a: 0.5 * exp(-4 * mod(w, 0.5)) }
}
const chiparp = {
  color: '#ffe08a',
  graph: x => (arpAt(x) && arpAt(x).a > 0.12 ? arpAt(x).notes.map(n => -0.4 + n / 24) : null),
  midi: x => (arpAt(x) && arpAt(x).a > 0.15 ? arpAt(x).notes.map(n => 66 + n) : []),
  formula: [
    String.raw`y = \Rev\Big[1.3\,d\,\vol\!\big(0.1 + a\big)\,\LP_{11\text{k}}\,\Pi_{1/8}\big(369.99\cdot 2^{c_i/12}\big)\Big],\qquad i = \lfloor 60T\rfloor \bmod 3`,
    String.raw`a = 0.5e^{-4(x \bmod \frac12)}\ \text{(ход)},\qquad 0.55e^{-10(x \bmod \frac14)},\ c = (0,1,2,3,4,3,2,1)_{\lfloor 4x\rfloor \bmod 8}\ \text{(дроп)}`,
  ],
  audio() {
    const p = pulse(0.125), lp = filter('lp'), verb = reverb({ room: 0.78, wet: 0.35 })
    return x => {
      const s = arpAt(x), n = s ? s.notes[mod(floor(60 * x * SEC), s.notes.length)] : 0
      const y = 1.3 * pumpAt(x) * (s ? vol4(0.1 + s.a) : 0) * lp(p(hz(n, Fs4)), 11000)
      return verb(...pan(y, 0.35))
    }
  },
}

// S(x) — the pads: three 5-voice supersaws on the voice-led chord, filter opening through the break;
// a darker, quieter bed under the sparse turn sections
const padsOn = x => x < END && is(W(x), 'break', 'drop', 'drop II', 'final', 'build II', 'boot', 'theme', 'build', 'shutdown')
const PAD_SOFT = { boot: 0.45, theme: 0.5, build: 0.6, shutdown: 0.6 }
const pads = {
  color: '#9fd3ff',
  graph: x => (padsOn(x) ? CH[chordAt(W(x))].map(n => -1 + (n + tr(W(x))) / 16) : null),
  midi: x => (padsOn(x) ? CH[chordAt(W(x))].map(n => 54 + n + tr(W(x))) : []), // F♯3 = MIDI 54
  formula: [String.raw`y = \Rev\Big[\Cho\Big[0.2\,d\,g\,\LP_{f_c}\sum_{j=1}^{3}\SS_5\big(184.99\cdot 2^{c_{k,j}/12}\big)\Big]\Big],\qquad f_c = 600\cdot 2^{3\min(1,\,t/32)}\ \text{(брейк)},\ 1400\ \text{(тихая подложка)},\ 3500`],
  audio() {
    const voices = [0, 1, 2].map(j => supersaw({ voices: 5, detune: 0.18, seed: 21 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), g = smooth(300), ch = chorus({ rate: 0.4, mix: 0.4 }), fx = reverb({ room: 0.92, wet: 0.5 })
    return x => {
      const on = padsOn(x), w = W(x), a = g(on ? PAD_SOFT[part(w).name] ?? 1 : 0)
      let l = 0, r = 0
      if (a > 1e-4) for (const [j, n] of CH[chordAt(w)].entries()) {
        const [vl, vr] = voices[j](hz(n + tr(w), Fs4 / 2))
        l += vl
        r += vr
      }
      const fc = is(w, 'break') ? 600 * 2 ** (3 * Math.min(1, part(w).t / 32)) : PAD_SOFT[part(w).name] ? 1400 : 3500
      const k = 0.2 * a * pumpAt(x)
      return fx(...ch(k * lpL(l, fc), k * lpR(r, fc)))
    }
  },
}

// T(x) — the 4-bit triangle bass of the turn sections: octave eighths (theme), half notes (boot),
// whole notes (break), the last F♯ (shutdown)
const bassAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w), r = ROOT[chordAt(w)]
  if (name === 'theme') return mod(w, 0.5) < 0.4 ? r + 12 * mod(floor(2 * w), 2) : null
  if (name === 'boot') return t >= 8 && mod(w, 2) < 1.8 ? r : null
  if (name === 'break') return mod(w, 4) < 3.8 ? r : null
  if (name === 'build' || name === 'build II') return t < 8 && mod(w, 1) < 0.8 ? r : null
  if (name === 'shutdown') return t < 10 ? 0 : null
  return null
}
const bass = {
  color: '#5aa7ff',
  graph: x => (bassAt(x) !== null ? -2.3 + bassAt(x) / 24 : null),
  midi: x => (bassAt(x) !== null ? [42 + bassAt(x)] : []), // F♯2 = MIDI 42
  formula: [String.raw`y = 0.2\,\frac{\lfloor 8\,\tri(\varphi)\rfloor}{8},\qquad \varphi = \!\int 92.5\cdot 2^{r/12}\,dT`],
  audio() {
    const tri = triangle4(), lp = filter('lp')
    let n = 0
    return x => {
      const b = bassAt(x)
      if (b !== null) n = b
      return 0.32 * (b !== null ? 1 : 0) * lp(tri(hz(n, Fs2)), 8000)
    }
  },
}

// D(x) — drums: a chip kit in the turn sections, a snare roll doubling in the builds (1, ½, ¼, ⅛),
// clap + hats + crash in the drops
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, { name, t } = part(x), hits = []
  const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, 3))]))
  if (name === 'theme') {
    add('chip', 1, 0, 2.5)
    add('snare', 0.8, 1, 3)
    for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.45 : 0.7, i / 2)
    if (b % 4 === 3) add('snare', 0.6, 3.25, 3.5, 3.75)
  } else if (name === 'boot' && t >= 8) {
    for (let i = 0; i < 4; i++) add('hat', 0.5, i + 0.5)
  } else if (name === 'build' || name === 'build II') {
    const step = t < 8 ? 1 : t < 12 ? 0.5 : t < 14 ? 0.25 : 0.125
    for (let p = 0; p < 4; p += step) add('snare', 0.35 + 0.04 * (t + p), p)
  } else if (name === 'drop' || name === 'drop II' || name === 'final') {
    add('clap', 1, 1, 3)
    for (let i = 0; i < 4; i++) add('hat', 0.8, i + 0.5)
    if (name !== 'drop') for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.25, i + 0.75)
    if (mod(t, 16) === 0) add('crash', 1, 0)
    if (b % 8 === 7) add('clap', 0.7, 3.5, 3.75)
  } else if (name === 'break' && t >= 16) {
    for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.5)
  }
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
  return hits
}
function lastHit(x, drum) {
  for (let b = floor(x / 4); b >= floor(x / 4) - 2 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v }
    if (best) return best
  }
  return null
}
const drums = {
  color: '#ff6f91',
  graph: x => {
    const w = W(x), c = lastHit(w, 'clap'), s = lastHit(w, 'snare')
    if (x >= END) return null
    if (c && c.τ < 0.3) return 3.6 + 0.7 * c.vel * exp(-8 * c.τ)
    return s && s.τ < 0.2 ? 3.2 + 0.6 * s.vel * exp(-10 * s.τ) : null
  },
  midi: x => {
    if (x >= END) return []
    const w = W(x), notes = []
    for (const [d, n] of [['chip', 36], ['snare', 38], ['clap', 39], ['hat', 42], ['crash', 49]]) {
      const h = lastHit(w, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  formula: [
    String.raw`y = \Rev\Big[0.3\,\text{Clap}(t) + 0.12\,\vol(e^{-12t})\,\lfsr_{12\text{k}} + 0.1\,\text{Hat}(t) + 0.12e^{-2t}\HP_{4000}\eta + 0.25\,\tri_4\big(60 + 300e^{-30t}\big)\Big]`,
    String.raw`\text{Clap} = \BP_{1500}\eta\Big(0.5e^{-18t} + \sum_{m=0}^{2} e^{-300(t - 0.012m)}\Big),\qquad \text{дробь: } 1, \tfrac12, \tfrac14, \tfrac18\ \text{доли}`,
  ],
  audio() {
    const clap = clapDrum({ center: 1400 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), tri = triangle4()
    const sn = lfsr(), hp = filter('hp'), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const w = W(x), on = x < END
      const at = d => { const h = on ? lastHit(w, d) : null; return h ? { t: h.τ * SEC, v: h.vel } : { t: 9, v: 0 } }
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

// F(x) — fx: the builds' riser (noise band-pass 300 → 12 000 Hz and a pulse siren 2^{t/4}), a falling
// sweep at every drop, a bit-crushed glitch in "stuck"
const riser = {
  color: '#c9b8ff',
  graph: x => {
    const { name, t } = part(x)
    if (name === 'build' || name === 'build II') return -2 + (t / 16) ** 2 * 3.5
    if (name === 'stuck') return 4.6 - 0.2 * mod(t, 1)
    return null
  },
  formula: [String.raw`y = \Rev\Big[0.3\,a^2\,\BP_{300\cdot 2^{5.3a}}\,\eta + 0.06\,a\,\Pi_{1/2}\big(220\cdot 2^{4a}\big) + 0.25e^{-1.5t}\,\BP_{8000\cdot 2^{-4t}}\,\eta\Big],\qquad a = t/16`],
  audio() {
    const bp = filter('bp'), bp2 = filter('bp'), siren = pulse(0.5), verb = reverb({ room: 0.85, wet: 0.45 })
    return x => {
      const { name, t } = part(x), build = name === 'build' || name === 'build II'
      const a = build ? t / 16 : 0
      let y = 0.6 * a * a * bp(η(), 300 * 2 ** (5.3 * a), 1.5) + 0.12 * a * siren(220 * 2 ** (4 * a))
      const down = (name === 'drop' || name === 'drop II' || name === 'final') && t < 3 ? t * SEC : 9
      y += 0.5 * exp(-1.5 * down) * bp2(η(), 8000 * 2 ** (-4 * down), 1)
      if (name === 'stuck') y += 0.05 * Math.sign(sin(TAU * 110 * 2 ** floor(t) * x * SEC)) * (mod(t, 0.5) < 0.1 ? 1 : 0)
      return verb(y, y)
    }
  },
}

export default {
  name: 'overclock',
  bpm: 150,
  key: 'F#m',
  length: END,
  sections: SECTIONS,
  theme: 'chip',
  // for Glitch Forest: how each section runs the fight (turn / build / live), which tracks strike the
  // arena and how, the chord on every beat, where an undefeated fight loops (the record skips back to
  // "stuck") and where the victory jumps (the shutdown)
  boss: {
    modes: MODES,
    // every track's graph(x) flies at the player as a Glitch Forest tile, moving its own way
    // (snake, wave, spray, rain, pulse, stab); the kick also sets the rhythm
    attacks: {
      rbass: { tile: 'tree', move: 'wave' }, bass: { tile: 'lava', move: 'wave' }, kick: { tile: 'water', move: 'pulse' },
      hook: { tile: 'slime', move: 'snake' }, lead: { tile: 'acid', move: 'snake' }, chiparp: { tile: 'corrupt', move: 'spray' },
      pads: { tile: 'frost', move: 'rain' },
    },
    chord: x => {
      const w = W(x), c = chordAt(w)
      return NAMES[mod(ROOT_PC[c] + tr(w), 12)] + (c.endsWith('m') ? 'm' : '')
    },
    loop: 240,
    outro: 288,
  },
  tracks: { kick, rbass, hook, lead, chiparp, pads, bass, drums, riser },
}
