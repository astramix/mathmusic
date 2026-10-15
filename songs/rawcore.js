// Boss pattern 2 — "Rawcore": rawstyle × dark chiptune, 155 BPM, C minor (C♯ minor at the end).
// signal → riff (the Echo enters) → charge → RAW DROP → echo chamber → overdrive → GALLOP → collapse
// (half time) → LAST STAND (a semitone up) → flatline. `boss.modes` tells Glitch Forest how each
// section runs the fight: turn (the world waits), build (countdown), live (the beat drives the world).
//
// The math: the Echo is the lead itself four beats late and an octave down, E(x) = L(x − 4) − 12 —
// the same four-step lag as the Echo in the game; over the i–♭II vamp (2 + 2 beats) it is a true
// canon, in the echo chamber it is bent into the present chord (the nearest chord tone). The raw kick
// is the hardstyle kick crushed to 14.7 kHz with a 12-semitone tail drop; in GALLOP the kicks fall on
// the 3-3-2 sixteenths {0, ¾, 1½, 2, 2¾, 3½}, the chip arpeggio runs in threes against the 4/4 beat
// (a 4:3 polyrhythm) and the lead is improvised over C harmonic minor. "collapse" is time dilated:
// W(x) = 224 + (x − 240)/2 — the end of GALLOP at half speed. LAST STAND moves up a semitone.
//
// Chords: riff Cm – D♭ (two beats each);  drop Cm – A♭ – Fm – G;  chamber A♭ – E♭ – B♭ – G;
// gallop Cm – D♭ – Cm – G.
import { mod, floor, exp, sin, tanh, TAU, hz, filter, reverb, delay, smooth, noise, osc } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, pulse, triangle4, lfsr, vol4, strings, chorus, improvise, hardKick, reverseBass, duck, clapDrum, hatDrum } from '../src/instruments.js'

const SECTIONS = [
  [0, 'signal'], [16, 'riff'], [48, 'charge'], [64, 'raw drop'], [128, 'echo chamber'], [160, 'overdrive'],
  [176, 'gallop'], [240, 'collapse'], [256, 'last stand'], [304, 'flatline'],
]
const MODES = {
  signal: 'turn', riff: 'turn', charge: 'build', 'raw drop': 'live', 'echo chamber': 'turn', overdrive: 'build',
  gallop: 'live', collapse: 'live', 'last stand': 'live', flatline: 'turn',
}
const END = 320
const SEC = 60 / 155
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const η = noise(31)
const C2 = 65.41, C3 = 130.81, C4 = 261.63, C5 = 523.25

// ---- time: "collapse" replays the end of GALLOP at half speed -------------------------------------------
const W = x => (is(x, 'collapse') ? 224 + (x - 240) / 2 : x)
const LIVE = x => MODES[part(x).name] === 'live'

// ---- harmony (semitones from C4, voice-led; roots from C2) ----------------------------------------------
const CH = { Cm: [0, 3, 7], Db: [1, 5, 8], Ab: [0, 3, 8], Fm: [0, 5, 8], G: [-1, 2, 7], Eb: [-2, 3, 7], Bb: [-2, 2, 5] }
const ROOT = { Cm: 0, Db: 1, Ab: -4, Fm: 5, G: 7, Eb: 3, Bb: -2 }
const VAMP = ['Cm', 'Db'], DROP = ['Cm', 'Ab', 'Fm', 'G'], CHAMBER = ['Ab', 'Eb', 'Bb', 'G'], GALLOP = ['Cm', 'Db', 'Cm', 'G']
const PROG = { signal: VAMP, riff: VAMP, charge: ['Ab', 'G'], 'raw drop': DROP, 'echo chamber': CHAMBER, overdrive: ['Ab', 'G'], gallop: GALLOP, 'last stand': DROP, flatline: ['Cm'] }
const BAR = { signal: 2, riff: 2, charge: 8, overdrive: 8, flatline: 16 }
const tr = x => (is(x, 'last stand') ? 1 : 0)
const chordAt = x => {
  const { name, t } = part(x), p = PROG[name] ?? DROP
  return p[mod(floor(t / (BAR[name] ?? 4)), p.length)]
}
const snap = (n, x) => { // the nearest tone of the chord sounding at x
  const pcs = CH[chordAt(x)].map(c => mod(c + tr(x), 12))
  for (let d = 0; d < 7; d++) for (const k of [n - d, n + d]) if (pcs.includes(mod(k, 12))) return k
  return n
}

// ---- melodies [beat, n from C5, length] -----------------------------------------------------------------
const RIFF = [ // over Cm (2 beats) – D♭ (2 beats), four bars
  [0, 0, 0.5], [0.5, 3, 0.25], [0.75, 7, 0.5], [1.25, 3, 0.25], [1.5, 12, 0.5], [2, 13, 0.75], [2.75, 8, 0.25], [3, 5, 0.5], [3.5, 1, 0.5],
  [4, 7, 0.75], [4.75, 3, 0.75], [5.5, 0, 0.5], [6, 1, 0.5], [6.5, 5, 0.5], [7, 8, 0.5], [7.5, 13, 0.5],
  [8, 12, 0.25], [8.25, 7, 0.25], [8.5, 3, 0.25], [8.75, 7, 0.25], [9, 12, 0.5], [9.5, 15, 0.5], [10, 13, 1], [11, 8, 0.5], [11.5, 5, 0.5],
  [12, 3, 1], [13, 0, 1], [14, 1, 1.5], [15.5, 5, 0.5],
]
const SCREAM = [ // n from C4: the rawstyle call over Cm – A♭ – Fm – G, 3-3-2 stabs
  [0, 0, 0.75], [0.75, 0, 0.75], [1.5, 3, 0.5], [2, 7, 0.75], [2.75, 7, 0.75], [3.5, 10, 0.5],
  [4, 8, 0.75], [4.75, 8, 0.75], [5.5, 7, 0.5], [6, 3, 0.75], [6.75, 3, 0.75], [7.5, 0, 0.5],
  [8, 5, 0.75], [8.75, 5, 0.75], [9.5, 8, 0.5], [10, 12, 1], [11, 8, 1],
  [12, 7, 0.75], [12.75, 11, 0.75], [13.5, 14, 0.5], [14, 11, 1], [15, 7, 0.5], [15.5, 2, 0.5],
]
const SCREAM2 = [...SCREAM.slice(0, -3), [14, 12, 2]]
const CHAMBER_MEL = [ // A♭ – E♭ – B♭ – G
  [0, 12, 2], [2, 8, 1], [3, 7, 1], [4, 7, 2], [6, 3, 1], [7, 10, 1],
  [8, 10, 2], [10, 5, 1], [11, 2, 1], [12, 11, 2], [14, 7, 1], [15, 2, 1],
]
const SOLO = improvise({ // GALLOP: a walk over C harmonic minor, sixteenths
  start: 0, length: 64, rate: 4, seed: 23, lo: 0, hi: 19, phrase: 8, rest: 0.18, hold: 0.25, breathe: 1,
  scale: () => [0, 2, 3, 5, 7, 8, 11],
  chord: t => CH[GALLOP[mod(floor(t / 4), 4)]].map(n => mod(n, 12)),
})
const BYE = [[0, 0, 1], [1, 3, 1], [2, 7, 2], [4, 1, 2], [6, -1, 2], [8, 0, 8]]

const screamIn = t => notesAt(mod(floor(t / 16), 2) ? SCREAM2 : SCREAM, mod(t, 16))
const LEAD = {
  signal: t => notesAt(RIFF, t),
  riff: t => notesAt(RIFF, mod(t, 16)),
  charge: t => (t < 8 ? notesAt(RIFF, t + 8) : notesAt(Array.from({ length: 16 }, (_, i) => [8 + i / 2, i % 2 ? 7 : 11, 0.5]), t)),
  'raw drop': () => null,
  'echo chamber': t => notesAt(CHAMBER_MEL, mod(t, 16)),
  overdrive: t => notesAt(Array.from({ length: 32 }, (_, i) => [i / 2, (i < 16 ? [0, 3, 8, 12] : [-1, 2, 7, 11])[i % 4] + (i % 8 >= 4 ? 12 : 0), 0.5]), t),
  gallop: t => notesAt(SOLO, t),
  'last stand': t => null,
  flatline: t => notesAt(BYE, t),
}
const leadAt = x => {
  if (x < 0 || x >= END) return null
  const w = W(x), { name, t } = part(w), m = LEAD[name](t)
  return m && { ...m, n: m.n + tr(w) }
}
// the screech: the call in the drops, stabs on the gallop kicks, a distant call in the signal
const screechAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w)
  if (name === 'raw drop' || name === 'last stand') {
    const m = screamIn(t)
    return m && { ...m, n: m.n + tr(w) }
  }
  if (name === 'gallop' && t >= 32) {
    const k = kickAt(x)
    return k && k.τ < 0.25 ? { n: ROOT[chordAt(w)] + (mod(floor(t), 2) ? 12 : 0), τ: k.τ, u: k.τ / 0.25, d: 0.25 } : null
  }
  if (name === 'signal' && mod(t, 4) < 0.75) return { n: 0, τ: mod(t, 4), u: mod(t, 4) / 0.75, d: 0.75 }
  return null
}
// the Echo: the lead four beats ago, an octave down; bent into the chord in the chamber; in the drops
// it answers the screech half a beat late, an octave up, snapped to the chord
const echoAt = x => {
  if (x >= END) return null
  const w = W(x)
  if (is(w, 'riff') && part(w).t >= 4) {
    const m = leadAt(x - 4)
    return m && { ...m, n: m.n - 12 }
  }
  if (is(w, 'echo chamber') && part(w).t >= 4) {
    const m = leadAt(x - 4)
    return m && { ...m, n: snap(m.n - 12, w) }
  }
  if (is(w, 'raw drop', 'last stand')) {
    const m = screechAt(x - 0.5)
    return m && { ...m, n: snap(m.n, w) }
  }
  return null
}

// ---- kicks ---------------------------------------------------------------------------------------------
const GALLOP_HITS = [0, 0.75, 1.5, 2, 2.75, 3.5]
const kickAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w)
  if (name === 'raw drop' || name === 'last stand') return { τ: mod(w, 1), vel: 1, tail: 0.36 }
  if (name === 'gallop') {
    const p = mod(w, 4), h = GALLOP_HITS.filter(q => q <= p).pop()
    return { τ: p - h, vel: h === 0 || h === 2 ? 1 : 0.85, tail: 0.17 }
  }
  if (name === 'charge' || name === 'overdrive') {
    if (t < 8) return null
    const g = t < 12 ? 1 : t < 15 ? 0.5 : 0.25
    return { τ: mod(w, g), vel: 0.6 + 0.025 * t, tail: 0.2 }
  }
  if (name === 'signal' && t >= 8) return { τ: mod(w, 4), vel: 0.5, tail: 0.36 }
  if (name === 'flatline') return t < 8 ? { τ: t, vel: 1, tail: 0.5 } : null
  return null
}
const pumpAt = x => {
  const k = kickAt(x)
  return k && LIVE(W(x)) ? duck(k.τ * SEC, 0.75, 0.16) : 1
}

// K(x) — the raw kick: tail on C2, crushed every 3rd sample, tail drops an octave
const kick = {
  color: '#ff2a55',
  graph: x => {
    const k = kickAt(x)
    return k && k.τ < 0.5 ? 2.6 + 1.9 * k.vel * exp(-6 * k.τ) : null
  },
  midi: x => (kickAt(x) && kickAt(x).τ < 0.2 ? [36] : []),
  formula: [
    String.raw`y = S_3\Big[0.8\tanh\!\Big(2.2\,\LP_{4200}\big[\tanh(12(s + 0.4)) - \tanh 4.8\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP_{3000}\eta + 0.4\,a\sin 2\pi\!\int\! f\,dT\Big]`,
    String.raw`s = a\sin 2\pi\!\int f\big(1 + 30e^{-t/4\text{мс}} + 2e^{-t/30\text{мс}}\big)\,2^{-\min(1,\,(t - t_h)^+/0.12)}\,dT,\qquad f = 65.41\cdot 2^{\text{tr}/12}`,
    String.raw`S_3:\ \text{каждый 3-й отсчёт держится (14.7 кГц)},\qquad \text{галоп: } x \bmod 4 \in \{0, \tfrac34, \tfrac32, 2, \tfrac{11}4, \tfrac72\}`,
  ],
  audio() {
    const long = hardKick({ tail: 0.36, drop: 12, drive: 12, bias: 0.4, tone: 4200, sub: 0.4, crush: 3 })
    const short = hardKick({ tail: 0.17, drop: 12, drive: 12, bias: 0.4, tone: 4200, sub: 0.4, crush: 3 })
    return x => {
      const h = kickAt(x), f = C2 * 2 ** (tr(W(x)) / 12), t = h ? h.τ * SEC : 1
      const a = long(t, f, !!h && h.tail >= 0.36), b = short(t, f, !!h && h.tail < 0.36)
      return 0.85 * (h ? h.vel : 0) * (a + b)
    }
  },
}

// R(x) — reverse bass: one swell per beat in the RAW DROP, rolling in the LAST STAND
const rbassAt = x => {
  if (x >= END) return null
  const w = W(x)
  if (!is(w, 'raw drop', 'last stand')) return null
  const r = mod(w, 1)
  if (r < 0.5) return null
  const u = is(w, 'last stand') ? mod(r - 0.5, 0.25) / 0.25 : (r - 0.5) / 0.5
  return { u, n: ROOT[chordAt(w)] + tr(w) }
}
const rbass = {
  color: '#a3002a',
  graph: x => {
    const b = rbassAt(x)
    return b ? -2.9 + 0.8 * b.u * b.u + b.n / 30 : null
  },
  midi: x => (rbassAt(x) && rbassAt(x).u > 0.3 ? [36 + rbassAt(x).n] : []),
  formula: [String.raw`y = \HP_{25}\,\LP_{150\cdot 2^{4.5u}}\tanh\!\Big(6u^2\big(0.4\saw(f) + 0.4\saw(1.006f) + 0.8\sin 2\pi\!\int\! f\,dT\big)\Big),\qquad f = 65.41\cdot 2^{r_k/12}`],
  audio() {
    const rb = reverseBass({ drive: 6, open: 4.5, q: 1.5 }), lp = filter('lp')
    return x => {
      const b = rbassAt(x)
      return 0.7 * lp(rb(b ? b.u : null, hz(b ? b.n : 0, C2)), 2500)
    }
  },
}

// Q(x) — the screech: saw + square a quarter-tone apart, bent down 5 semitones over 60 ms at every
// attack, driven into two band-passes whose centres wobble at 4 per beat, then tanh again
const screech = {
  color: '#f5f5f5',
  graph: x => (screechAt(x) ? 1.6 + screechAt(x).n / 12 : null),
  midi: x => (screechAt(x) && screechAt(x).u < 0.9 ? [60 + screechAt(x).n] : []), // C4 = MIDI 60
  formula: [
    String.raw`y = \Rev\Big[0.75\,d\,\LP_{7000}\tanh\!\Big(3\big(\BP_{F_1}(z) + \BP_{F_2}(z)\big)\Big)\Big],\qquad z = \tanh\!\Big(8\big(\saw(g) + \sq(1.015g)\big)\Big)`,
    String.raw`g = 261.63\cdot 2^{(n + 5e^{-t/60\text{мс}})/12},\qquad F_{1,2} = (900, 2400)\cdot 2^{\,0.8\sin(2\pi\cdot 4x)}`,
  ],
  audio() {
    const sw = osc('saw'), sq = osc('square'), b1 = filter('bp'), b2 = filter('bp'), lp = filter('lp'), gate = smooth(4)
    const fx = reverb({ room: 0.85, wet: 0.35 }), dl = delay({ time: SEC * 0.5, feedback: 0.3, wet: 0.25 })
    return x => {
      const m = screechAt(x), w = W(x), dist = is(w, 'signal') ? 0.25 : 1
      const g = hz((m?.n ?? 0) + (m ? 5 * exp(-(m.τ * SEC) / 0.06) : 0), C4)
      const z = tanh(8 * (sw(g) + sq(1.015 * g))), wob = 2 ** (0.8 * sin(TAU * 4 * w))
      const y = tanh(3 * (b1(z, 900 * wob, 4) + b2(z, 2400 * wob, 5)))
      const a = gate(m && m.u < 0.9 ? 1 : 0) * pumpAt(x) * dist
      const s = 0.75 * a * lp(y, is(w, 'signal') ? 1500 : 7000)
      return fx(...dl(...pan(s, 0.05)))
    }
  },
}

// L(x) — pulse 1, the chip lead (25 %), vibrato on long notes
const lead = {
  color: '#ff9ad5',
  graph: x => (leadAt(x) ? 1.1 + leadAt(x).n / 14 : null),
  midi: x => (leadAt(x) && leadAt(x).u < 0.9 ? [72 + leadAt(x).n] : []),
  formula: [String.raw`y = \Rev\Big[0.7\,d\,\vol\!\big(1 - 0.3\min(1, t/0.3)\big)\,\LP_{f_c}\,\Pi_{1/4}\big(523.25\cdot 2^{(n + v)/12}\big)\Big],\qquad f_c = 500\cdot 2^{4t_s/16}\ \text{(сигнал)}`],
  audio() {
    const p = pulse(0.25), lp = filter('lp'), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const m = leadAt(x), held = m ? m.τ * SEC : 0, w = W(x), { name, t } = part(w)
      const vib = held > 0.3 ? 0.3 * sin(TAU * 6 * x * SEC) : 0
      const g = m && m.u < 0.9 ? vol4(1 - 0.3 * Math.min(1, held / 0.3)) : 0
      const fc = name === 'signal' ? 500 * 2 ** ((4 * t) / 16) : 10000
      const y = 0.7 * g * pumpAt(x) * lp(p(hz((m?.n ?? 0) + vib, C5)), fc)
      return verb(...pan(y, -0.25))
    }
  },
}

// E(x) — pulse 3, the Echo: the lead four beats late and an octave down (12.5 %), panned right
const echo = {
  color: '#7fffd4',
  graph: x => (echoAt(x) ? 0.9 + echoAt(x).n / 14 : null),
  midi: x => (echoAt(x) && echoAt(x).u < 0.9 ? [72 + echoAt(x).n] : []),
  formula: [
    String.raw`y = \Dly\Big[1.2\,d\,\vol(0.8)\,\Pi_{1/8}\big(523.25\cdot 2^{E(x)/12}\big)\Big]`,
    String.raw`E(x) = L(x - 4) - 12\ \text{(рифф)},\qquad \text{snap}\big(L(x - 4) - 12\big)\ \text{(эхо-камера)},\qquad \text{snap}\big(Q(x - \tfrac12) + 12\big)\ \text{(дропы; } Q \text{ от C4)}\ \text{(дропы)}`,
  ],
  audio() {
    const p = pulse(0.125), lp = filter('lp'), dl = delay({ time: SEC * 0.75, feedback: 0.4, wet: 0.35 })
    return x => {
      const m = echoAt(x), g = m && m.u < 0.85 ? vol4(0.8) : 0
      const y = 1.2 * g * pumpAt(x) * lp(p(hz(m?.n ?? 0, C5)), 9000)
      return dl(...pan(y, 0.55))
    }
  },
}

// P(x) — the 60 Hz chip arpeggio; in GALLOP it runs in threes against the beat (4:3)
const arpAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w), c = CH[chordAt(w)].map(n => n + tr(w))
  if (name === 'gallop' || name === 'collapse') {
    const k = floor(4 * w), i = mod(k, 3) // groups of three sixteenths: the accent drifts across the bar
    return { notes: [c[i] + 12], a: 0.45 * exp(-10 * mod(w, 0.25)) * (i === 0 ? 1 : 0.6) }
  }
  if (LIVE(w)) return { notes: c, a: 0.35 * exp(-8 * mod(w, 0.5)) }
  if (name === 'echo chamber') return { notes: c, a: 0.35 * exp(-1.5 * mod(w, 2)) }
  if (name === 'flatline') return { notes: c, a: 0.3 * Math.max(0, 1 - t / 12) }
  if (name === 'signal') return t >= 8 ? { notes: c, a: 0.25 } : null
  return { notes: c, a: 0.45 * exp(-4 * mod(w, 0.5)) }
}
const chiparp = {
  color: '#ffe08a',
  graph: x => (arpAt(x) && arpAt(x).a > 0.12 ? arpAt(x).notes.map(n => -0.5 + n / 24) : null),
  midi: x => (arpAt(x) && arpAt(x).a > 0.15 ? arpAt(x).notes.map(n => 60 + n) : []),
  formula: [
    String.raw`y = 2.2\,d\,\vol(0.1 + a)\,\LP_{11\text{k}}\,\Pi_{1/8}\big(261.63\cdot 2^{c_i/12}\big),\qquad i = \lfloor 60T\rfloor \bmod 3`,
    String.raw`\text{галоп: } i = \lfloor 4x\rfloor \bmod 3\ \ (\text{тройки против четырёх}),\qquad a = 0.45e^{-10(x \bmod \frac14)}`,
  ],
  audio() {
    const p = pulse(0.125), lp = filter('lp'), verb = reverb({ room: 0.7, wet: 0.25 })
    return x => {
      const s = arpAt(x), n = s ? s.notes[mod(floor(60 * x * SEC), s.notes.length)] : 0
      const y = 2.2 * pumpAt(x) * (s ? vol4(0.1 + s.a) : 0) * lp(p(hz(n, C4)), 11000)
      return verb(...pan(y, 0.35))
    }
  },
}

// C(x) — the choir: a string pad an octave up in the echo chamber and the LAST STAND
const choirOn = x => x < END && is(W(x), 'echo chamber', 'last stand', 'overdrive')
const choir = {
  color: '#9b8fb8',
  graph: x => (choirOn(x) ? CH[chordAt(W(x))].map(n => -0.9 + (n + tr(W(x))) / 18) : null),
  midi: x => (choirOn(x) ? CH[chordAt(W(x))].map(n => 60 + n + tr(W(x))) : []),
  formula: [String.raw`y = \Rev\big[\Cho[\,0.45\,d\,S\,]\big],\qquad f_j = 261.63\cdot 2^{c_{k,j}/12}`],
  audio() {
    const s = strings({ voices: 4, attack: 900, release: 1500, cutoff: 3200, gain: 0.3 })
    const ch = chorus({ rate: 0.3, depth: 0.004, mix: 0.5 }), verb = reverb({ room: 0.92, wet: 0.5 })
    return x => {
      const on = choirOn(x), w = W(x)
      const [l, r] = s(on ? CH[chordAt(w)].map(n => hz(n + tr(w), C4)) : [])
      const k = 0.45 * pumpAt(x)
      return verb(...ch(k * l, k * r))
    }
  },
}

// T(x) — the triangle bass of the turn sections
const bassAt = x => {
  if (x >= END) return null
  const w = W(x), { name, t } = part(w), r = ROOT[chordAt(w)]
  if (name === 'riff') return mod(w, 0.5) < 0.35 ? r + 12 * (mod(floor(2 * w), 4) === 3 ? 1 : 0) : null
  if (name === 'echo chamber') return mod(w, 2) < 1.85 ? r : null
  if (name === 'signal') return t >= 8 && mod(w, 1) < 0.5 ? r : null
  if (name === 'charge' || name === 'overdrive') return t < 8 && mod(w, 0.5) < 0.35 ? r : null
  if (name === 'flatline') return t < 12 ? 0 : null
  return null
}
const bass = {
  color: '#5aa7ff',
  graph: x => (bassAt(x) !== null ? -2.3 + bassAt(x) / 24 : null),
  midi: x => (bassAt(x) !== null ? [48 + bassAt(x)] : []),
  formula: [String.raw`y = 0.32\,\frac{\lfloor 8\,\tri(\varphi)\rfloor}{8},\qquad \varphi = \!\int 130.81\cdot 2^{r/12}\,dT`],
  audio() {
    const tri = triangle4(), lp = filter('lp')
    let n = 0
    return x => {
      const b = bassAt(x)
      if (b !== null) n = b
      return 0.32 * (b !== null ? 1 : 0) * lp(tri(hz(n, C3)), 8000)
    }
  },
}

// D(x) — drums: chip kit (turn), rolls (builds), clap + hats + crash and a ride of LFSR sixteenths (live)
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, { name, t } = part(x), hits = []
  const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 17 + p * 3, 9))]))
  if (name === 'riff') {
    add('chip', 1, 0, 1.5, 2.5)
    add('snare', 0.8, 1, 3)
    for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.45 : 0.7, i / 2)
    if (b % 4 === 3) add('snare', 0.6, 3.5, 3.75)
  } else if (name === 'echo chamber') {
    add('chip', 0.8, 0)
    if (b % 2) add('snare', 0.7, 2)
    for (let i = 0; i < 4; i++) add('hat', 0.4, i + 0.5)
  } else if (name === 'charge' || name === 'overdrive') {
    const step = t < 8 ? 1 : t < 12 ? 0.5 : t < 14 ? 0.25 : 0.125
    for (let p = 0; p < 4; p += step) add('snare', 0.35 + 0.04 * (t + p), p)
  } else if (name === 'raw drop' || name === 'last stand' || name === 'gallop') {
    add('clap', 1, 1, 3)
    for (let i = 0; i < 16; i++) add('ride', i % 4 === 2 ? 0.7 : 0.3, i / 4)
    if (mod(t, 16) === 0) add('crash', 1, 0)
    if (b % 8 === 7) add('clap', 0.7, 3.25, 3.5, 3.75)
  } else if (name === 'signal' && t >= 8) {
    for (let i = 0; i < 4; i++) add('hat', 0.4, i + 0.5)
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
    if (x >= END) return null
    const w = W(x), c = lastHit(w, 'clap'), s = lastHit(w, 'snare')
    if (c && c.τ < 0.3) return 3.6 + 0.7 * c.vel * exp(-8 * c.τ)
    return s && s.τ < 0.2 ? 3.2 + 0.6 * s.vel * exp(-10 * s.τ) : null
  },
  midi: x => {
    if (x >= END) return []
    const w = W(x), notes = []
    for (const [d, n] of [['chip', 36], ['snare', 38], ['clap', 39], ['hat', 42], ['ride', 51], ['crash', 49]]) {
      const h = lastHit(w, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  formula: [
    String.raw`y = \Rev\Big[0.9\,\text{Clap}(t) + 0.36\,\vol(e^{-12t})\lfsr_{12\text{k}} + 0.3\,\text{Hat}(t) + 0.12\,\vol(e^{-25t})\lfsr^{\text{metal}}_{24\text{k}} + 0.3e^{-2t}\HP_{4000}\eta + 0.6\,\tri_4(60 + 300e^{-30t})\Big]`,
  ],
  audio() {
    const clap = clapDrum({ center: 1300 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), tri = triangle4()
    const sn = lfsr(), ride = lfsr({ metal: true }), hp = filter('hp'), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const w = W(x), on = x < END
      const at = d => { const h = on ? lastHit(w, d) : null; return h ? { t: h.τ * SEC, v: h.vel } : { t: 9, v: 0 } }
      const c = at('clap'), s = at('snare'), h = at('hat'), k = at('chip'), cr = at('crash'), rd = at('ride')
      const y = 0.9 * c.v * clap(c.t, c.t < 0.4)
        + 0.36 * s.v * vol4(exp(-12 * s.t)) * sn(12000)
        + 0.3 * h.v * hat(h.t, h.t < 0.1)
        + 0.12 * rd.v * vol4(exp(-25 * rd.t)) * ride(24000)
        + 0.3 * cr.v * exp(-2 * cr.t) * hp(η(), 4000)
        + 0.6 * k.v * (k.t < 0.15 ? tri(60 + 300 * exp(-30 * k.t)) : (tri(60), 0))
      return verb(y, y)
    }
  },
}

// F(x) — fx: risers in the builds, a downlifter at each drop, a falling "gravity" sine in the collapse,
// and the flatline: a 1 kHz monitor beep every beat that finally holds
const fx = {
  color: '#c9b8ff',
  graph: x => {
    const { name, t } = part(x)
    if (name === 'charge' || name === 'overdrive') return -2 + (t / 16) ** 2 * 3.5
    if (name === 'flatline') return 4.4
    return null
  },
  formula: [String.raw`y = \Rev\Big[0.6a^2\,\BP_{300\cdot 2^{5.3a}}\eta + 0.5e^{-1.5t}\BP_{8000\cdot 2^{-4t}}\eta + 0.08\sin 2\pi\!\int\! 220\cdot 2^{-t_c/8}dT + 0.05\sin 2\pi\,1000T\cdot[\text{пик}]\Big]`],
  audio() {
    const bp = filter('bp'), bp2 = filter('bp'), sine = osc('sine'), beep = osc('sine'), verb = reverb({ room: 0.85, wet: 0.4 })
    return x => {
      const { name, t } = part(x), build = name === 'charge' || name === 'overdrive', a = build ? t / 16 : 0
      let y = 0.6 * a * a * bp(η(), 300 * 2 ** (5.3 * a), 1.5)
      const down = (name === 'raw drop' || name === 'gallop' || name === 'last stand') && t < 3 ? t * SEC : 9
      y += 0.5 * exp(-1.5 * down) * bp2(η(), 8000 * 2 ** (-4 * down), 1)
      const fall = sine(220 * 2 ** (-(name === 'collapse' ? t : 0) / 8))
      if (name === 'collapse') y += 0.08 * Math.min(1, t / 2) * fall
      const b = beep(1000)
      if (name === 'flatline' && t >= 4) y += 0.05 * (t >= 12 ? Math.max(0, 1 - (t - 14) / 2) : mod(t, 1) < 0.15 ? 1 : 0) * b
      return verb(y, y)
    }
  },
}

export default {
  name: 'rawcore',
  bpm: 155,
  key: 'Cm',
  length: END,
  sections: SECTIONS,
  theme: 'chip',
  // for Glitch Forest: how each section runs the fight, and how each track strikes the arena
  boss: {
    modes: MODES,
    attacks: { kick: 'shockwave', rbass: 'floor', screech: 'beam', lead: 'snake', echo: 'echo', chiparp: 'zigzag', choir: 'blocks', drums: 'columns', bass: 'rows', fx: 'warning' },
  },
  tracks: { kick, rbass, screech, lead, echo, chiparp, choir, bass, drums, fx },
}
