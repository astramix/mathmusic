// Drift phonk at 130 BPM in G minor: the 808 cowbell riff (the machine's two square waves pitched to the notes, driven
// hard), a distorted 808 that slides between its notes, the clap on 3 (half time), trap hats rolling into every other bar,
// Memphis voices from an old tape, a steel pan answering the cowbell, a dark choir under it all. 2½ minutes:
// intro → drift → memphis → no brakes → build → drift II → steel → last lap → outro.
//
// x is time in beats. The riffs are [beat, MIDI, length] lists looping every four bars over Gm – Gm – E♭ – D
// (i – i – VI – V, the leading tone F♯ only over D); every pitch is 440 · 2^((n − 69)/12) Hz, exactly.
import { mod, floor, exp, sin, tanh, TAU, noise, osc, filter, smooth, reverb, delay, sampleLayer } from '../src/engine.js'
import {
  notesAt, hash, pan, poly, trigger, arrangement, cowbellTone, steelpanTone, kickDrum, clapDrum, snareDrum, hatDrum,
  crashCymbal, voice, choir, VOWELS, blend, smoothstep, vinyl, tape, chorus,
} from '../src/instruments.js'

const SECTIONS = [[0, 'intro'], [16, 'drift'], [80, 'memphis'], [112, 'no brakes'], [128, 'build'], [144, 'drift II'], [240, 'steel'], [288, 'last lap'], [320, 'outro']]
const END = 336
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const drop = x => is(x, 'drift', 'drift II', 'last lap')
const groove = x => drop(x) || is(x, 'memphis', 'steel')
const F = n => 440 * 2 ** ((n - 69) / 12)

// ---- harmony: a chord a bar, four bars round — the voicings for the choir (voice-led), the 808's roots
const CHORDS = [
  { name: 'Gm', v: [55, 58, 62], root: 31 },
  { name: 'Gm', v: [55, 58, 62], root: 31 },
  { name: 'E♭', v: [55, 58, 63], root: 27 },
  { name: 'D', v: [54, 57, 62], root: 26 },
]
const chordAt = x => CHORDS[mod(floor(x / 4), 4)]

// ---- the riffs: [beat in the loop, MIDI, length] ---------------------------------------------------------------------
// the cowbell: sixteenths around D5, chord tones on the beats (D over Gm, E♭ over E♭, D and F♯ over D)
const RIFF = [
  [0, 74, 0.25], [0.5, 74, 0.25], [0.75, 72, 0.25], [1.25, 74, 0.25], [1.75, 77, 0.25], [2, 74, 0.25], [2.5, 72, 0.25], [2.75, 70, 0.25], [3.25, 72, 0.25], [3.75, 70, 0.25],
  [4, 70, 0.25], [4.5, 70, 0.25], [4.75, 72, 0.25], [5.25, 70, 0.25], [5.75, 67, 0.25], [6, 67, 0.25], [6.5, 69, 0.25], [6.75, 67, 0.25], [7.25, 65, 0.25], [7.75, 67, 0.25],
  [8, 75, 0.25], [8.5, 75, 0.25], [8.75, 74, 0.25], [9.25, 75, 0.25], [9.75, 79, 0.25], [10, 75, 0.25], [10.5, 74, 0.25], [10.75, 72, 0.25], [11.25, 70, 0.25], [11.75, 67, 0.25],
  [12, 74, 0.25], [12.5, 74, 0.25], [12.75, 75, 0.25], [13.25, 74, 0.25], [13.75, 69, 0.25], [14, 66, 0.25], [14.5, 67, 0.25], [14.75, 69, 0.25], [15.25, 72, 0.25], [15.75, 69, 0.25],
]
// the steel pan's tune: G – B♭ on the beats of Gm, G – B♭ over E♭, F♯ – D over D
const STEEL = [
  [0, 79, 1], [1, 77, 0.5], [1.5, 74, 0.5], [2, 70, 1], [3, 74, 0.5], [3.5, 77, 0.5],
  [4, 79, 1.5], [5.5, 81, 0.5], [6, 82, 1], [7, 81, 0.5], [7.5, 79, 0.5],
  [8, 79, 1], [9, 75, 0.5], [9.5, 77, 0.5], [10, 82, 1.5], [11.5, 79, 0.5],
  [12, 78, 1], [13, 81, 1], [14, 74, 2],
]
// the 808: roots in octave 1, an octave jump that slides back down, a pickup into the next chord
const BASS = [
  [0, 31, 0.75], [0.75, 31, 0.75], [1.5, 43, 0.5], [2, 31, 1], [3, 34, 1],
  [4, 31, 0.75], [4.75, 31, 0.75], [5.5, 31, 1], [6.5, 34, 0.5], [7, 36, 1],
  [8, 27, 0.75], [8.75, 27, 0.75], [9.5, 39, 0.5], [10, 27, 1.5], [11.5, 29, 0.5],
  [12, 26, 0.75], [12.75, 26, 0.75], [13.5, 38, 0.5], [14, 26, 1], [15, 30, 0.5], [15.5, 33, 0.5],
]
const loop = (list, x) => { const m = notesAt(list, mod(x, 16)); return m && { ...m, at: floor(x / 16) * 16 + m.at } }
const cowbellOn = x => is(x, 'intro', 'drift', 'no brakes', 'drift II', 'last lap', 'outro') || (is(x, 'build') && x < 136)
const riffAt = x => (cowbellOn(x) ? loop(RIFF, x) : null)
// the steel pan: its tune in the memphis and steel sections; in the drops it answers in the last two bars of every four
const steelAt = x => {
  if (is(x, 'memphis', 'steel')) return loop(STEEL, x)
  if (is(x, 'drift II', 'last lap') && mod(x, 16) >= 8) { const m = loop(STEEL, x); return m && { ...m, n: m.n + 12 } }
  return null
}
const bassAt = x => (drop(x) || is(x, 'memphis', 'steel') || (is(x, 'build') && x < 136) ? loop(BASS, x) : null)

// ---- the kit: [beat in the bar, drum, velocity] per bar ------------------------------------------------------------
const kitCache = new Map()
function barHits(b) {
  if (kitCache.has(b)) return kitCache.get(b)
  const x = 4 * b, hits = [], add = (d, v, ...ps) => ps.forEach(p => hits.push([p, d, v * (0.85 + 0.15 * hash(13 * b + 7 * p, d.length))]))
  if (is(x, 'build')) {
    const t = x - 128, step = t < 8 ? 0.5 : t < 12 ? 0.25 : 0.125
    for (let p = 0; p < 4; p += step) add('snare', 0.35 + 0.04 * (t + p), p)
    add('kick', 0.9, 0, 1, 2, 3)
  } else if (groove(x)) {
    const half = is(x, 'steel')
    for (const [p, n, d] of BASS) if (p >= mod(x, 16) && p < mod(x, 16) + 4 && n < 40 && !(half && p % 2)) add('kick', 1, p - mod(x, 16))
    add('clap', 1, 2)
    const roll = b % 2 === 1 && !half
    for (let i = 0; i < 8; i++) if (!(roll && i >= 6)) add('hat', i % 2 ? 0.45 : 0.62, i / 2)
    if (roll) { add('hat', 0.5, 3, 3.25); for (let k = 0; k < 4; k++) add('hat', 0.38 + 0.1 * k, 3.5 + k / 8) }
    if (is(x, 'drift II', 'last lap') && b % 4 === 1) for (let k = 0; k < 3; k++) add('hat', 0.55, 1 + k / 3)
    if (drop(x)) add('open', 0.5, 3.5)
    if (SECTIONS.some(([s]) => s === x)) add('crash', 1, 0)
  } else if (is(x, 'outro') && x === 320) add('crash', 0.8, 0)
  hits.sort((a, c) => a[0] - c[0])
  kitCache.set(b, hits)
  return hits
}
function lastHit(x, drum) {
  for (let b = floor(x / 4); b >= floor(x / 4) - 1 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v }
    if (best) return best
  }
  return null
}

// CB(x) — the cowbell: two squares at f and 1.48f, partial by partial through the 808's band-pass (4.9f, Q 1.3), the
// two-stage VCA, then tanh(2.4·) and a high-pass; the intro opens a low-pass over four bars, the outro closes it
const cowbell = {
  color: '#ffffff',
  graph: x => { const m = riffAt(x); return m && m.τ < 0.2 ? 0.6 + (m.n - 65) / 8 : null },
  midi: x => { const m = riffAt(x); return m && m.τ < 0.22 ? [m.n] : [] },
  formula: ['CB = \\Rev\\,\\Dly\\Big[\\LP_{f_c}\\HP_{250}\\tanh\\!\\big(2.4\\,C(f,t)\\big)\\Big],\\quad C = \\big(0.62e^{-t/12\\text{мс}} + 0.38e^{-t/0.32}\\big)\\sum_{k\\ \\text{нечёт}}\\tfrac{1}{k}\\big(H(kf)\\sin 2\\pi kft + 0.85H(1.48kf)\\sin 2\\pi\\,1.48kft\\big)', 'H(\\nu) = \\Big(1 + 1.3^2\\big(\\tfrac{\\nu}{4.9f} - \\tfrac{4.9f}{\\nu}\\big)^2\\Big)^{-1/2}\\ \\text{— полоса 808: 2.64 кГц над 540 Гц}'],
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(cowbellTone, { release: 0.05, life: 1.4, max: 8 }), fire = trigger(), hp = filter('hp'), lp = filter('lp')
    const echo = delay({ time: 0.75 * sec, feedback: 0.3, wet: 0.24 }), verb = reverb({ room: 0.84, damp: 0.4, wet: 0.3 })
    return x => {
      const m = riffAt(x)
      if (m && fire(m.at)) p.hit(F(m.n), 0.82 + 0.18 * hash(floor(4 * x), 9), 1.2)
      const fc = x < 16 ? 400 * 2 ** (x / 3) : x >= 320 ? 16000 * 2 ** (-(x - 320) / 3) : 18000
      const y = 0.8 * lp(hp(tanh(2.4 * p()), 250), Math.min(18000, fc))
      return verb(...echo(...pan(y, 0.12)))
    }
  },
}

// SP(x) — the steel pan: the note area's modes f, 2.004f, 3f; the octave and the twelfth swell in after the stick
const steelpan = {
  color: '#7fdbca',
  graph: x => { const m = steelAt(x); return m ? 1.2 + (m.n - 70) / 10 : null },
  midi: x => { const m = steelAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: ['SP = \\Rev\\,\\Cho\\Big[v\\big(e^{-t/1.3d}\\sin 2\\pi ft + (0.5 + 0.45v)(1 - e^{-t/8\\text{мс}})e^{-t/0.7d}\\sin 2\\pi\\,2.004ft + (0.15 + 0.3v)(1 - e^{-t/12\\text{мс}})e^{-t/0.3d}\\sin 2\\pi\\,3ft\\big)\\Big]', 'd = (440/f)^{0.35}\\ \\text{— стил-пэн; в дропах отвечает колокольчику октавой выше}'],
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(steelpanTone, { release: 0.4, life: 3, max: 12 }), fire = trigger(), ch = chorus({ mix: 0.25, rate: 0.4 }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.34 })
    return x => {
      const m = steelAt(x)
      if (m && fire(m.at)) p.hit(F(m.n), 0.7 + 0.2 * hash(floor(2 * x), 4), m.d * sec + 0.4)
      return verb(...ch(...pan(0.42 * p(), -0.3)))
    }
  },
}

// 808 — a sine driven into tanh, its pitch sliding to each new note in 50 ms, dying over 1.1 s; low-passed
const b808 = {
  color: '#c9b8ff',
  graph: x => { const m = bassAt(x); return m ? -3 + (m.n - 26) / 18 : null },
  midi: x => { const m = bassAt(x); return m && m.u < 0.95 ? [m.n] : [] },
  formula: ['808 = a\\,\\LP_{2800}\\tanh\\!\\big(2.8\\sin 2\\pi\\!\\int\\! g\\big) + 0.3a\\sin 2\\pi\\!\\int\\! g,\\quad a = e^{-t/1.1},\\ g \\to f \\text{ за 50 мс (глайд)}'],
  audio({ bpm }) {
    const sec = 60 / bpm, o = osc('sine'), lp = filter('lp'), glide = smooth(50), gate = smooth(4)
    let n = 31
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const t = m ? (x - m.at) * sec : 9, s = o(F(glide(n))), a = gate(m && m.u < 0.97 ? exp(-t / 1.1) : 0)
      return 0.17 * a * (lp(tanh(2.8 * s), 2800) + 0.3 * s)
    }
  },
}

// K, C, H — the kit: a kick with the 808's hits, the clap (layered with a snare) on 3, eighth hats that roll — sixteenths,
// then thirty-seconds — at the end of every other bar, triplets in the second drop, an open hat on the "and" of 4,
// a crash on every section; through tape
const kit = {
  color: '#ff5f6f',
  graph: x => {
    const k = lastHit(x, 'kick'), c = lastHit(x, 'clap'), h = lastHit(x, 'hat')
    if (c && c.τ < 0.25) return 3.6 + 0.7 * exp(-8 * c.τ)
    if (k && k.τ < 0.3) return 3 + 0.8 * exp(-8 * k.τ)
    return h && h.τ < 0.06 ? 2.3 + 0.2 * h.vel : null
  },
  midi: x => [['kick', 36], ['snare', 38], ['clap', 39], ['hat', 42], ['open', 46], ['crash', 49]].filter(([d]) => lastHit(x, d)?.τ < 0.06).map(([, n]) => n),
  formula: ['D = \\Tape\\big[0.6K + 0.5\\,\\text{Clap} + 0.22S + 0.09H + 0.07H_o + 0.28\\,\\text{Crash}\\big],\\quad K = e^{-5\\tau}\\tanh\\!\\big(2.2\\sin 2\\pi\\!\\int\\!(48 + 160e^{-38\\tau})\\big)', '\\text{хэты: восьмые; в конце каждого второго такта } \\tfrac{1}{16}, \\tfrac{1}{32};\\ \\text{в дропе II — триоли}'],
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 48, f1: 160, sweep: 38, decay: 5, drive: 2.2 }), clap = clapDrum({ center: 1250 }), body = snareDrum({ tone: 190, cutoff: 1200, decay: 14 })
    const snare = snareDrum({ tone: 205, cutoff: 1400, decay: 15 }), hat = hatDrum({ cutoff: 9000, decay: 95 }), open = hatDrum({ cutoff: 7000, decay: 11 }), crash = crashCymbal({ decay: 1.5, seed: 103 })
    const tp = tape({ drive: 1.5, wow: 0.0006 }), verb = reverb({ room: 0.7, damp: 0.45, wet: 0.18 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.6 * at('kick', kick, x, 1) + 0.5 * at('clap', clap, x) + 0.22 * at('clap', body, x) + 0.3 * at('snare', snare, x) + 0.09 * at('hat', hat, x) + 0.07 * at('open', open, x) + 0.28 * at('crash', crash, x)
      return verb(...tp(...pan(1.25 * y, 0)))
    }
  },
}

// V(x) — Memphis: a voice from an old tape, pitched down (95 Hz, falling), «ха» / «эй» / «йе» on beats 2½ and 3 of every other
// bar of a drop, through a telephone band, the tape wobbling
const VOX = [['a', 'a'], ['e', 'i'], ['i', 'e']]
const voxAt = x => {
  if (!drop(x) && !is(x, 'memphis')) return null
  const b = floor(x / 4), p = x - 4 * b
  if (b % 2 !== 1) return null
  const slot = p >= 2.5 && p < 3 ? 0 : p >= 3 && p < 3.5 ? 1 : -1
  return slot < 0 || hash(2 * b + slot, 19) > 0.75 ? null : { at: 4 * b + 2.5 + 0.5 * slot, j: floor(3 * hash(2 * b + slot, 17)) }
}
const memphis = {
  color: '#9d8189',
  graph: x => { const v = voxAt(x); return v && x - v.at < 0.3 ? -2.4 + 0.3 * sin(TAU * 6 * x) : null },
  formula: ['V = \\BP^{Q=0.8}_{1.2\\text{к}}\\,\\text{Голос}\\big(95\\cdot 2^{-3t}(1 + 0.004\\sin 2\\pi\\,0.7T),\\ F_a \\to F_e\\big)\\,(1 - e^{-t/15\\text{мс}})e^{-t/0.18}\\ \\text{— замедленная кассета}'],
  audio({ bpm }) {
    const sec = 60 / bpm, vo = voice({ size: 0.82, breath: 0.12, rough: 0.45 }), tel = filter('bp'), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.25 })
    return x => {
      const v = voxAt(x), t = v ? (x - v.at) * sec : 9, [fa, fb] = VOX[v ? v.j : 0]
      const a = t < 0.5 ? (1 - exp(-t / 0.015)) * exp(-t / 0.18) : 0
      const y = 5 * tel(vo(95 * 2 ** (-3 * Math.min(t, 0.5)) * (1 + 0.004 * sin(TAU * 0.7 * x * sec)), blend(VOWELS[fa], VOWELS[fb], smoothstep(0.03, 0.2, t)), a), 1200, 0.8)
      return verb(...pan(y, -0.1))
    }
  },
}

// P(x) — the dark choir: the chord's voicing on «о», swelling in the quiet sections, an octave down in the drops
const choirPad = {
  color: '#c9b6ff',
  graph: x => (x < END ? chordAt(x).v.map(n => -1.4 + (n - 54) / 30) : null),
  midi: x => (x < END - 2 && mod(x, 4) < 3.9 ? chordAt(x).v : []),
  formula: ['P = \\Rev\\sum_{j}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{F_i}\\big(\\saw(f_j) + 0.06\\eta\\big),\\quad F = F_{\\text{«о»}},\\quad \\text{Gm – Gm – E♭ – D}'],
  audio() {
    const c = choir({ voices: 3, size: 0.95, breath: 0.06, gain: 0.3 }), level = smooth(600), verb = reverb({ room: 0.93, damp: 0.35, wet: 0.5 })
    return x => {
      const quiet = is(x, 'intro', 'memphis', 'no brakes', 'steel', 'outro') ? 1 : is(x, 'build') ? 0.7 : 0.45, a = level(x < END - 2 ? quiet : 0)
      const [l, r] = c(x < END - 2 ? chordAt(x).v.map(n => F(n - (drop(x) ? 12 : 0))) : [], VOWELS.o)
      return verb(a * l, a * r)
    }
  },
}

// R(x) — the riser through the build: a noise band climbing 300 → 12 000 Hz, a sweep down into the second drop; vinyl always
const air = {
  color: '#7f8fa6',
  graph: x => (is(x, 'build') ? -2 + ((x - 128) / 16) ** 2 * 3 : x < END ? -2.95 + 0.03 * sin(TAU * x / 2) : null),
  formula: ['\\text{подъём: } 0.5u^2\\,\\BP_{300\\cdot 2^{5.3u}}\\eta,\\ u = \\tfrac{x - 128}{16};\\quad \\text{спуск: } e^{-1.5t}\\BP_{8000\\cdot 2^{-4t}}\\eta;\\quad \\text{винил}'],
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(130), bp = filter('bp'), bp2 = filter('bp'), v = vinyl({ hiss: 0.008, crackle: 0.35 })
    return x => {
      const n = η(), u = is(x, 'build') ? (x - 128) / 16 : 0, down = x >= 144 && x < 148 ? (x - 144) * sec : 9, c = x < END + 1 ? v() : 0
      const y = 0.5 * u * u * bp(n, 300 * 2 ** (5.3 * u), 1.5) + 0.4 * exp(-1.5 * down) * bp2(n, 8000 * 2 ** (-4 * down), 1)
      return [y + c, y + c]
    }
  },
}

export default {
  name: 'phonk',
  style: 'phonk',
  bpm: 130,
  key: 'Gm',
  length: END,
  sections: SECTIONS,
  tracks: {
    cowbell, steelpan, b808, kit, memphis, choir: choirPad, air,
    sample_a: sampleLayer('A', x => drop(x) && lastHit(x, 'clap')?.τ < 0.25, { gain: 0.5 }),
    sample_b: sampleLayer('B', x => drop(x) && lastHit(x, 'kick')?.τ < 0.2, { gain: 0.6 }),
  },
}
