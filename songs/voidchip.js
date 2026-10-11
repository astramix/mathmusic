// Gothic chiptune in space, 120 BPM, D harmonic minor: a cathedral organ made of NES pulse waves,
// drifting through the void. launch → orbit → nebula → dark side (canon) → eclipse (bells & choir,
// 3-against-4 starlight) → pulsar (improvised lead, blast beat) → wormhole (chromatic riser) →
// orbit II (a tone up, E minor, lead in canon with itself) → requiem (half-speed theme) → silence.
//
// The math: canon V(x − 2) in the dark side and V(x − 1) − 12 in orbit II; starlight pings on
// multiples of 3/4 and of 1 beat (a 4:3 polyrhythm), pitches hashed from the chord; bells sum pure
// FM partials of every hit (no state); the pulsar lead is a random walk over D harmonic minor;
// the wormhole rises one semitone per beat, 2^{t/12}, until it lands a whole tone higher.
//
// Chords: Dm – Bb – Gm – A;  nebula Dm – C – Bb – A;  eclipse Gm – Dm – Bb – A.
import { SR, mod, floor, exp, sin, TAU, hz, filter, reverb, delay, smooth } from '../src/engine.js'
import { notesAt, hash, pan, arrangement, pulse, triangle4, lfsr, vol4, improvise, fm, strings, chorus } from '../src/instruments.js'

const SECTIONS = [
  [0, 'launch'], [16, 'orbit'], [48, 'nebula'], [80, 'dark side'], [112, 'eclipse'], [144, 'pulsar'],
  [176, 'wormhole'], [192, 'orbit II'], [240, 'requiem'], [272, 'silence'],
]
const END = 296
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const D2 = 73.42, D4 = 293.66, D5 = 587.33, D6 = 1174.66

// ---- harmony (semitones from D4; roots from D2) --------------------------------------------------
const CH = { Dm: [0, 3, 7], Bb: [-4, 0, 3], Gm: [-7, -4, 0], A: [-5, -1, 2], C: [-2, 2, 5] }
const ROOT = { Dm: 0, Bb: -4, Gm: 5, A: 7, C: -2 }
const MAIN = ['Dm', 'Bb', 'Gm', 'A']
const PROG = { nebula: ['Dm', 'C', 'Bb', 'A'], eclipse: ['Gm', 'Dm', 'Bb', 'A'], silence: ['Dm'] }
const BAR = { 'dark side': 8, requiem: 8, eclipse: 8 } // beats per chord
const TR = { 'orbit II': 2 }
const tr = x => {
  const { name, t } = part(x)
  return name === 'wormhole' ? floor(t / 8) : TR[name] ?? 0 // wormhole: D, then D# – the floor gives way
}
const chordAt = x => {
  const { name, t } = part(x), p = PROG[name] ?? MAIN
  return p[mod(floor(t / (BAR[name] ?? 4)), p.length)]
}

// ---- melodies [beat, n from D5, length] ------------------------------------------------------------
const THEME_A = [
  [0, 0, 1], [1, 3, 0.5], [1.5, 7, 0.5], [2, 12, 1.5], [3.5, 10, 0.5],
  [4, 8, 1.5], [5.5, 7, 0.5], [6, 5, 1], [7, 3, 1],
  [8, 5, 1], [9, 7, 0.5], [9.5, 8, 0.5], [10, 10, 1], [11, 8, 1],
  [12, 7, 1], [13, 11, 0.5], [13.5, 12, 0.5], [14, 11, 1], [15, 7, 1],
]
const THEME_B = [
  [0, 12, 1], [1, 10, 0.5], [1.5, 8, 0.5], [2, 7, 2],
  [4, 14, 1], [5, 12, 0.5], [5.5, 10, 0.5], [6, 5, 2],
  [8, 15, 1], [9, 12, 0.5], [9.5, 10, 0.5], [10, 8, 2],
  [12, 7, 0.5], [12.5, 8, 0.5], [13, 11, 1], [14, 14, 1], [15, 11, 1],
]
const SLOW_A = THEME_A.map(([b, n, d]) => [2 * b, n, 2 * d])
const LAUNCH = [[8, -5, 2], [10, 0, 2], [12, 7, 1], [13, 3, 1], [14, 2, 2]]
const PULSAR = improvise({
  start: 0, length: 32, rate: 4, seed: 13, lo: -2, hi: 19, phrase: 8, rest: 0.12, hold: 0.25, breathe: 1,
  scale: () => [0, 2, 3, 5, 7, 8, 11], // D harmonic minor, pcs from D
  chord: t => CH[MAIN[mod(floor(t / 4), 4)]].map(n => mod(n, 12)),
})
const PULSAR_D = PULSAR
const LEAD = {
  launch: t => notesAt(LAUNCH, t),
  orbit: t => notesAt(THEME_A, mod(t, 16)),
  nebula: t => notesAt(THEME_B, mod(t, 16)),
  'dark side': t => notesAt(SLOW_A, t) && { ...notesAt(SLOW_A, t), n: notesAt(SLOW_A, t).n - 12 },
  eclipse: () => null,
  pulsar: t => notesAt(PULSAR_D, t),
  wormhole: t => ({ n: floor(t) - 4, τ: mod(t, 1), u: mod(t, 1), d: 1 }), // one semitone per beat
  'orbit II': t => notesAt(t < 16 || t >= 32 ? THEME_A : THEME_B, mod(t, 16)),
  requiem: t => notesAt(SLOW_A, t),
  silence: t => notesAt([[0, 0, 8]], t),
}
const leadAt = x => {
  if (x < 0 || x >= END) return null
  const { name, t } = part(x), m = LEAD[name](t)
  return m && { ...m, n: m.n + (name === 'wormhole' ? 0 : tr(x)) }
}
// the canon voice: the lead itself, delayed
const canonAt = x => {
  if (is(x, 'dark side')) { const m = leadAt(x - 2); return is(x - 2, 'dark side') && m ? { ...m, n: m.n + 7 } : null }
  if (is(x, 'orbit II')) { const m = leadAt(x - 1); return is(x - 1, 'orbit II') && m ? { ...m, n: m.n - 12 } : null }
  return null
}

// L(x) — pulse lead, 25 % duty (12.5 % in the void sections), chip envelope, vibrato on long notes,
// long cathedral echo
const lead = {
  color: '#c9a2ff',
  graph: x => (leadAt(x) ? 1 + (leadAt(x).n + 12) / 14 : null),
  midi: x => (leadAt(x) && leadAt(x).u < 0.9 ? [74 + leadAt(x).n] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, p25 = pulse(0.25), p12 = pulse(0.125), lp = filter('lp')
    const echo = delay({ time: sec * 0.75, feedback: 0.45, wet: 0.35 }), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.3 })
    return x => {
      const m = leadAt(x), t = x * sec, held = m ? m.τ * sec : 0
      const vib = held > 0.3 ? 0.25 * sin(TAU * 5.5 * t) : 0
      const f = hz((m?.n ?? 0) + vib, D5), a = p25(f), b = p12(f)
      const wave = is(x, 'dark side', 'requiem', 'pulsar') ? b : a
      const g = m && m.u < 0.9 ? vol4(1 - 0.35 * Math.min(1, held / 0.4)) : 0
      const y = 0.3 * g * lp(wave, 9000)
      const [l, r] = pan(y, -0.15), [el, er] = echo(l, r)
      return verb(l + el, r + er)
    }
  },
}

// O(x) — the chip organ: chord arpeggiated at 60 Hz on one pulse (⌊60t⌋ mod 3) over a sustained
// square chord an octave down; plus the canon voice when there is one. Swells per section.
const ORGAN_VOL = { launch: 0.8, orbit: 0.55, nebula: 0.6, 'dark side': 0.8, eclipse: 0.7, pulsar: 0.5, wormhole: 0.7, 'orbit II': 0.55, requiem: 0.9, silence: 0.9 }
const organ = {
  color: '#7f6bd6',
  graph: x => (x < END ? CH[chordAt(x)].map(n => -0.6 + (n + tr(x)) / 16) : null),
  midi: x => {
    if (x >= END) return []
    const c = canonAt(x)
    return [...CH[chordAt(x)].map(n => 62 + n + tr(x)), ...(c && c.u < 0.9 ? [74 + c.n] : [])]
  },
  audio({ bpm }) {
    const sec = 60 / bpm, arp = pulse(0.25), sus = [0, 1, 2].map(() => pulse(0.5)), cv = pulse(0.125)
    const lp = filter('lp'), lp2 = filter('lp'), gain = smooth(80), verb = reverb({ room: 0.9, damp: 0.5, wet: 0.45 })
    return x => {
      const t = x * sec, { name, t: st } = part(x), on = x < END
      const c = CH[chordAt(x)].map(n => n + tr(x))
      const fade = name === 'silence' ? Math.max(0, 1 - st / 22) : name === 'launch' ? Math.min(1, st / 6) : 1
      const g = gain(on ? (ORGAN_VOL[name] ?? 0.6) * fade : 0)
      const a = arp(hz(c[mod(floor(60 * t), 3)] + 12, D4))
      const s = sus.reduce((acc, p, i) => acc + p(hz(c[i], D4)), 0) / 3
      const cn = canonAt(x), cw = cv(hz(cn?.n ?? 0, D5)) * (cn && cn.u < 0.9 ? vol4(0.8) : 0)
      const y = g * (0.33 * lp(a, 6000) + 0.27 * lp2(s, 2500)) + 0.4 * cw
      return verb(...pan(y, 0.2))
    }
  },
}

// B(x) — triangle bass. orbit: octave eighths · dark side / requiem: half notes · eclipse: whole
// notes · pulsar: sixteenth chugs · wormhole: pedal that climbs with the floor · silence: one last D
const bassAt = x => {
  if (x >= END) return null
  const { name, t } = part(x), r = ROOT[chordAt(x)] + tr(x)
  if (name === 'launch') return t >= 8 && mod(x, 2) < 1.8 ? r : null
  if (name === 'dark side' || name === 'requiem') return mod(x, 2) < 1.85 ? r + (mod(floor(x / 2), 4) === 3 ? 7 : 0) : null
  if (name === 'eclipse') return mod(x, 4) < 3.8 ? r : null
  if (name === 'pulsar') return mod(x, 0.25) < 0.18 ? r + (mod(floor(4 * x), 8) === 7 ? 12 : 0) : null
  if (name === 'wormhole') return mod(x, 0.5) < 0.4 ? floor(t) - 4 + 12 * mod(floor(2 * x), 2) : null
  if (name === 'silence') return t < 8 ? 0 : null
  return mod(x, 0.5) < 0.4 ? r + 12 * mod(floor(2 * x), 2) : null
}
const bass = {
  color: '#5aa7ff',
  graph: x => (bassAt(x) !== null ? -2.5 + bassAt(x) / 14 : null),
  midi: x => (bassAt(x) !== null ? [38 + bassAt(x)] : []),
  audio() {
    const tri = triangle4(), lp = filter('lp')
    let n = 0
    return x => {
      const b = bassAt(x)
      if (b !== null) n = b
      return 0.16 * (b !== null ? 1 : 0) * lp(tri(hz(n, D2)), 7000)
    }
  },
}

// ---- noise channel drums -------------------------------------------------------------------------
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, { name, t } = part(x), hits = []
  const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 31 + p * 7, 5))]))
  if (['orbit', 'nebula', 'orbit II'].includes(name)) {
    add('kick', 1, 0, 1.5, 2.5)
    add('snare', 1, 1, 3)
    for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.5 : 0.8, i / 2)
    if (b % 8 === 7) add('snare', 0.7, 3.25, 3.5, 3.75)
  } else if (name === 'launch' && t >= 8) {
    add('kick', 0.8, 0, 1, 2, 3)
  } else if (name === 'dark side') {
    add('kick', 1, 0)
    add('snare', 1, 2)
    for (let i = 0; i < 4; i++) add('hat', 0.4, i + 0.5)
    if (b % 4 === 3) add('kick', 0.7, 3.5)
  } else if (name === 'pulsar') {
    for (let i = 0; i < 8; i++) add('kick', i % 2 ? 0.6 : 1, i / 2)
    add('snare', 1, 1, 3)
    for (let i = 0; i < 16; i++) add('hat', i % 2 ? 0.4 : 0.7, i / 4)
    if (b % 4 === 3) add('snare', 0.8, 2.5, 2.75, 3.25, 3.5, 3.75)
  } else if (name === 'wormhole') {
    const n = 2 ** (1 + floor(t / 4)) // roll doubles every bar: 2, 4, 8, 16 per bar
    for (let i = 0; i < n; i++) add('snare', 0.4 + 0.15 * floor(t / 4), (4 * i) / n)
    add('kick', 1, 0)
  } else if (name === 'requiem') {
    add('kick', 0.8, 0)
    if (b % 2) add('snare', 0.6, 2)
  } else if (name === 'silence' && t === 0) {
    add('kick', 1, 0)
  }
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
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
const drums = {
  color: '#ff4f6d',
  graph: x => {
    const h = lastHit(x, 'kick'), s = lastHit(x, 'snare')
    if (h && h.τ < 0.5) return 3 + 1.4 * h.vel * exp(-8 * h.τ)
    return s && s.τ < 0.3 ? 2.4 + s.vel * exp(-10 * s.τ) : null
  },
  midi: x => {
    const notes = []
    for (const [d, n] of [['kick', 36], ['snare', 38], ['hat', 42]]) {
      const h = lastHit(x, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },
  audio({ bpm }) {
    const sec = 60 / bpm, tri = triangle4(), white = lfsr(), white2 = lfsr(), tick = lfsr({ metal: true })
    const verb = reverb({ room: 0.7, wet: 0.18 })
    return x => {
      const k = lastHit(x, 'kick'), s = lastHit(x, 'snare'), h = lastHit(x, 'hat')
      const kt = k ? k.τ * sec : 1, st = s ? s.τ * sec : 1, ht = h ? h.τ * sec : 1
      const kick = k && kt < 0.18 ? k.vel * (tri(55 + 280 * exp(-28 * kt)) + 0.3 * exp(-80 * kt) * white(4000)) : (tri(55), white(4000), 0)
      const snare = s && st < 0.3 ? s.vel * vol4(exp(-10 * st)) * white2(10000) : (white2(10000), 0)
      const hat = h && ht < 0.06 ? h.vel * vol4(exp(-50 * ht)) * tick(30000) : (tick(30000), 0)
      const y = 0.32 * kick + 0.14 * snare + 0.06 * hat
      return verb(y, y)
    }
  },
}

// ---- bells: Σ over recent hits of fm(f, t) — pure in t, so no voices to manage ---------------------
// every chord change rings the root; in the eclipse and requiem a bell every 1.5 beats walks the chord
const bellHits = x => {
  const hits = []
  for (let k = floor(x / 0.5); k >= floor(x / 0.5) - 16 && k >= 0; k--) {
    const at = k * 0.5, { name, t } = part(at)
    if (at >= END - 8) continue
    const c = CH[chordAt(at)].map(n => n + tr(at)), per = BAR[name] ?? 4
    if (mod(t, per) === 0 && name !== 'pulsar' && name !== 'wormhole') hits.push([at, c[0] + 12, 0.9])
    else if ((name === 'eclipse' || name === 'requiem') && mod(t, 1.5) === 0) hits.push([at, c[floor(hash(k, 3) * 3)] + 24, 0.5])
  }
  return hits
}
const bells = {
  color: '#ffe6a8',
  graph: x => {
    const h = bellHits(x)[0]
    return h && x - h[0] < 1.5 ? 0.8 + h[1] / 24 : null
  },
  midi: x => bellHits(x).filter(([at]) => x - at < 0.5).map(([, n]) => 62 + n),
  audio({ bpm }) {
    const sec = 60 / bpm, verb = reverb({ room: 0.92, damp: 0.3, wet: 0.5 })
    return x => {
      let y = 0
      for (const [at, n, v] of bellHits(x)) y += v * fm(hz(n, D4), (x - at) * sec, { ratio: 3.5, index: 3, decay: 1.6, idecay: 4 })
      return verb(...pan(0.5 * y, -0.35))
    }
  },
}

// ---- choir: string pad on the chord an octave up, only in the dark places -------------------------
const choirOn = x => x < END - 2 && is(x, 'launch', 'dark side', 'eclipse', 'requiem', 'silence')
const choir = {
  color: '#9b8fb8',
  graph: x => (choirOn(x) ? CH[chordAt(x)].map(n => -0.2 + (n + tr(x)) / 20) : null),
  midi: x => (choirOn(x) ? CH[chordAt(x)].map(n => 74 + n + tr(x)) : []),
  audio({ bpm }) {
    const s = strings({ voices: 5, attack: 1200, release: 2000, cutoff: 3000, gain: 0.3 })
    const ch = chorus({ rate: 0.3, depth: 0.004, mix: 0.5 }), verb = reverb({ room: 0.9, wet: 0.5 }), g = smooth(400)
    return x => {
      const on = choirOn(x), fade = is(x, 'silence') ? Math.max(0, 1 - part(x).t / 20) : 1
      const [l, r] = s(on ? CH[chordAt(x)].map(n => hz(n + tr(x) + 12, D4)) : [])
      const k = 0.35 * g(on ? fade : 0)
      return verb(...ch(k * l, k * r))
    }
  },
}

// ---- starlight: pings on multiples of 3/4 beat (high) and of 1 beat (low) — 4 against 3 ------------
const starsOn = x => is(x, 'launch', 'nebula', 'eclipse', 'requiem')
const starAt = x => {
  if (!starsOn(x) || x >= END) return null
  const c = CH[chordAt(x)].map(n => n + tr(x))
  const k3 = floor(x / 0.75), τ3 = mod(x, 0.75), k4 = floor(x), τ4 = mod(x, 1)
  return τ3 < τ4
    ? { n: c[floor(hash(k3, 11) * 3)] + 12, τ: τ3, hi: true }
    : { n: c[floor(hash(k4, 17) * 3)], τ: τ4, hi: false }
}
const stars = {
  color: '#e8f4ff',
  graph: x => (starAt(x) && starAt(x).τ < 0.2 ? 4.3 + (starAt(x).hi ? 0.4 : 0) : null),
  midi: x => (starAt(x) && starAt(x).τ < 0.1 ? [86 + starAt(x).n] : []),
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.125), dl = delay({ time: sec * 0.5, feedback: 0.55, wet: 0.5 })
    return x => {
      const s = starAt(x), w = p(hz(s?.n ?? 0, D6))
      const y = s ? 0.7 * vol4(exp(-9 * s.τ * sec)) * w : 0
      const [l, r] = pan(y, s?.hi ? 0.6 : -0.6)
      return dl(l, r)
    }
  },
}

// ---- void: LFSR wind through a band-pass sweeping 400·2^{2 sin(2πx/32)} Hz; the wormhole adds a
// sine riser 110·2^{t/4}; the launch has a countdown of blips ----------------------------------------
const space = {
  color: '#3a4b78',
  graph: x => (x < END ? -2.9 + 0.08 * sin(TAU * x / 32) : null),
  audio({ bpm }) {
    const sec = 60 / bpm, wind = lfsr(), bp = filter('bp'), verb = reverb({ room: 0.95, wet: 0.6 }), blip = pulse(0.5)
    let ph = 0
    return x => {
      const { name, t } = part(x), on = x < END ? 1 : 0
      const fc = 400 * 2 ** (2 * sin(TAU * x / 32))
      const loud = name === 'pulsar' || name === 'orbit' ? 0.5 : 1
      let y = on * 0.04 * loud * bp(wind(20000), fc, 4)
      if (name === 'wormhole') { ph += 110 * 2 ** (t / 4) / SR; y += 0.02 * Math.min(1, t / 4) * sin(TAU * ph) }
      const cd = name === 'launch' && t < 8 && mod(t, 2) < 0.15
      y += cd ? 0.03 * blip(t < 6 ? 880 : 1760) : (blip(880), 0)
      return verb(y, y)
    }
  },
}

export default {
  name: 'voidchip',
  bpm: 120,
  key: 'Dm',
  length: END,
  sections: SECTIONS,
  tracks: { lead, organ, bass, drums, bells, choir, stars, space },
}
