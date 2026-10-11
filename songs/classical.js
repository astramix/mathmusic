// Baroque canon at 76 BPM: a cello ground bass, a harpsichord continuo, timpani and three
// violins in canon. A canon is a time shift: every violin plays the same melody V(t),
// violin j starts 16 beats after the one before,  v_j(x) = V(x − 16(j + 1)).
// The melody gets faster each phrase: half notes, quarters, an eighth-note arpeggio and a
// sixteenth-note scale run — the last two are computed from the chord, not written out.
//
// x is time in beats. D major ground: D – A – Bm – F♯m – G – D – G – A, two beats per chord.
import { SR, mod, floor, exp, sin, tanh, TAU, between, clamp, hz, noise, osc, filter, smooth, reverb } from '../src/engine.js'

const CANON = 80, END = 88 // ground from 0, violins enter at 16, 32, 48; final chord 80–86
const η = noise(1685)
const D3 = 146.83, D4 = 293.66
const SEC = 60 / 76 // seconds per beat at the written tempo, for timings that feel natural

// k = ⌊x/2⌋ mod 8;  after the canon the final chord is D (k = 0)
const chord = x => (x < CANON ? mod(floor(x / 2), 8) : 0)
const root = [0, -5, -3, -8, -7, -12, -7, -5] // b_k: D3 A2 B2 F♯2 G2 D2 G2 A2
const pcs = [[0, 4, 7], [7, 11, 2], [9, 0, 4], [4, 7, 11], [5, 9, 0], [0, 4, 7], [5, 9, 0], [7, 11, 2]] // chord tones mod 12
const minor = k => k === 2 || k === 3

// ---- the melody V(t) --------------------------------------------------------------------
// phrase p = ⌊t/16⌋, s = t mod 16, k = ⌊s/2⌋; note length d_p = 2^{1−p} beats; n = semitones from D4
const HALVES = [16, 14, 12, 11, 9, 7, 9, 11]
const QUARTERS = [0, 4, 7, 5, 4, 0, 4, 2, 0, -3, 0, 7, 5, 9, 7, 5].map(n => n + 12)
// p = 2, arpeggio:  r_k = root folded into [−7, 5) + 12,  tones (r, r + 3|4, r + 7, r + 12), up on even k, down on odd
const fold = v => (v >= 5 ? v - 12 : v)
const arp = (k, i) => {
  const r = fold(pcs[k][0]) + 12, tones = [r, r + (minor(k) ? 3 : 4), r + 7, r + 12]
  return tones[k % 2 ? 3 - i : i]
}
// p = 3, scale run:  D-major degree g → 12⌊g/7⌋ + (0 2 4 5 7 9 11)_{g mod 7};  from the root's
// degree g_k: down g_k + 7 − i on even k, up g_k + i on odd k  (eight sixteenths per chord)
const SCALE = [0, 2, 4, 5, 7, 9, 11], DEG = [7, 4, 5, 9, 3, 7, 3, 4]
const degree = g => 12 * floor(g / 7) + SCALE[mod(g, 7)]
const run = (k, i) => degree(k % 2 ? DEG[k] + i : DEG[k] + 7 - i)

const V = t => {
  const p = floor(t / 16), s = mod(t, 16), k = floor(s / 2), d = 2 ** (1 - p), i = floor(mod(s, 2) / d)
  const n = p === 0 ? HALVES[k] : p === 1 ? QUARTERS[floor(s)] : p === 2 ? arp(k, i) : run(k, i)
  return { n, d, τ: mod(s, d) }
}
// v_j(x): what violin j plays at beat x, or null;  final chord F♯5, A4, D4
const FINAL = [16, 7, 0]
const violinAt = (j, x) => {
  const t = x - 16 * (j + 1)
  if (t < 0 || x >= END - 2) return null
  return x < CANON ? V(t) : { n: FINAL[j], d: END - 2 - CANON, τ: x - CANON }
}

// ---- a bowed string ---------------------------------------------------------------------
// saw at f = base·2^{(n + v)/12},  vibrato v = 0.18·min(1, age/0.4 s)·sin(2π·5.6t),
// bow gate on until a short gap before the note ends,  then the body: four band-pass resonances
function bowed({ base, body = 1, phase = 0 }) {
  const o = osc('saw', phase), gate = smooth(25), glide = smooth(10), lp = filter('lp')
  const RES = [300, 520, 1100, 2700], RQ = [3, 4, 3, 2], RG = [1, 0.8, 0.6, 0.5], bps = RES.map(() => filter('bp'))
  let n = 0
  return (note, t) => {
    if (note) n = note.n
    const on = note && note.τ < note.d - Math.min(0.1, 0.08 * note.d) ? 1 : 0
    const age = note ? note.τ * SEC : 0
    const vib = 0.18 * Math.min(1, age / 0.4) * sin(TAU * 5.6 * t)
    const src = o(glide(hz(n + vib, base))) + 0.04 * η()
    let y = 0.3 * lp(src, 4500 * body)
    for (let i = 0; i < 4; i++) y += (RG[i] / RQ[i]) * bps[i](src, RES[i] * body, RQ[i])
    return gate(on) * y
  }
}

const violin = (j, color, pan) => ({
  color,
  graph: x => (violinAt(j, x) ? 1 + violinAt(j, x).n / 12 : null),
  midi: x => {
    const v = violinAt(j, x)
    return v && v.τ < v.d * 0.9 ? [62 + v.n] : [] // D4 = MIDI 62
  },
  audio({ bpm }) {
    const bow = bowed({ base: D4, phase: 0.3 * j }), fx = reverb({ room: 0.88, damp: 0.35, wet: 0.45 })
    const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2)
    return x => {
      const y = 0.5 * bow(violinAt(j, x), (x * 60) / bpm)
      return fx(l * y, r * y)
    }
  },
})

// C(x) — cello on the ground bass, a half note per chord, an octave-lower D to finish
const celloAt = x => (x < CANON ? { n: root[chord(x)], d: 2, τ: mod(x, 2) } : x < END - 2 ? { n: -12, d: END - 2 - CANON, τ: x - CANON } : null)
const cello = {
  color: '#c98a5a',
  graph: x => (celloAt(x) ? -2 + celloAt(x).n / 12 : null),
  midi: x => (celloAt(x) && celloAt(x).τ < 1.8 ? [50 + celloAt(x).n] : []), // D3 = MIDI 50
  audio({ bpm }) {
    const bow = bowed({ base: D3, body: 0.6 }), fx = reverb({ room: 0.88, damp: 0.4, wet: 0.35 })
    return x => {
      const y = 0.4 * bow(celloAt(x), (x * 60) / bpm)
      return fx(0.9 * y, y)
    }
  },
}

// H(x) — harpsichord (Karplus–Strong): a strand of N = SR/f noise samples, combed at 1/7 of
// its length (the plucking point), read in a loop, each pass y ← 0.996·(0.65y_i + 0.35y_{i+1}).
// It strums the chord on every beat from bar 3, root and all on the chord's first beat.
function string(f, vel) {
  const n = Math.max(2, Math.round(SR / f)), buf = new Float32Array(n), p = Math.max(1, floor(n / 7))
  for (let i = 0; i < n; i++) buf[i] = η()
  for (let i = n - 1; i >= p; i--) buf[i] = vel * (buf[i] - buf[i - p])
  let i = 0
  const s = () => {
    const a = buf[i], j = i + 1 === n ? 0 : i + 1
    buf[i] = 0.996 * (0.65 * a + 0.35 * buf[j])
    i = j
    return a
  }
  s.life = 4 * SR
  return s
}
const keys = x => between(x, 8, CANON + 1)
const strum = b => {
  const k = chord(b), first = mod(b, 2) === 0
  const upper = pcs[k].map(p => 12 + p) // one octave above D3
  return first ? [root[chord(b)], ...upper] : upper
}
const harpsichord = {
  color: '#e6c870',
  graph: x => (keys(x) && mod(x, 1) < 0.5 ? strum(floor(x)).map(n => -0.8 + n / 24) : null),
  midi: x => (keys(x) && mod(x, 1) < 0.9 ? strum(floor(x)).map(n => 50 + n) : []),
  audio() {
    const voices = [], queue = [], hp = filter('hp'), fx = reverb({ room: 0.8, wet: 0.3 })
    let beat = -1
    return x => {
      const b = floor(x)
      if (b !== beat && keys(x)) {
        strum(b).forEach((n, i) => queue.push({ at: b + 0.03 * i, f: hz(n, D3), vel: mod(b, 2) === 0 || b === CANON ? 0.5 : 0.3 }))
      }
      beat = b
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].at <= x) voices.push(string(queue[i].f, queue[i].vel)), queue.splice(i, 1)
      }
      let y = 0
      for (let i = voices.length - 1; i >= 0; i--) {
        y += voices[i]()
        if (--voices[i].life <= 0) voices.splice(i, 1)
      }
      y = hp(y, 90)
      return fx(0.6 * y, 0.55 * y)
    }
  },
}

// T(x) — timpani on D2 and A1:  Σ_i a_i·e^{−λ_i t}·sin 2πr_i·φ(t),  membrane modes r = (1, 1.504, 1.742, 2, 2.245),
// pitch drops 3% as the skin relaxes:  φ(t) = f·t + 0.03f·(1 − e^{−20t})/20;  a roll into the last chord
const D2 = 73.42, A1 = 55
const HITS = [[32, D2, 0.5], [48, D2, 0.8], [62, A1, 0.6], [64, D2, 0.9], [78 - 2, A1, 0.6]]
for (let i = 0; i < 16; i++) HITS.push([78 + i / 8, A1, 0.15 + 0.04 * i])
HITS.push([CANON, D2, 1.2])
const MODES = [[1, 1, 2.5], [1.504, 0.5, 4], [1.742, 0.3, 5], [2, 0.25, 6], [2.245, 0.15, 7]]
const timpani = {
  color: '#ff4f8b',
  graph: x => {
    let y = 0
    for (const [h, , v] of HITS) if (x >= h && x - h < 3) y = Math.max(y, v * exp(-2 * (x - h)))
    return y > 0.02 ? -2.7 + y : null
  },
  midi: x => (HITS.some(([h]) => x >= h && x - h < 0.12) ? [HITS.find(([h]) => x >= h && x - h < 0.12)[1] === D2 ? 38 : 33] : []),
  audio() {
    const lp = filter('lp'), fx = reverb({ room: 0.9, wet: 0.5 })
    return x => {
      let y = 0, thump = 0
      for (const [h, f, v] of HITS) {
        const t = (x - h) * SEC
        if (t < 0 || t > 6) continue
        const φ = f * t + (0.03 * f * (1 - exp(-20 * t))) / 20
        for (const [r, a, λ] of MODES) y += v * a * exp(-λ * t) * sin(TAU * r * φ)
        thump += v * exp(-30 * t)
      }
      y = 0.35 * tanh(y) + 0.2 * thump * lp(η(), 300)
      return fx(y, y)
    }
  },
}

export default {
  name: 'classical',
  bpm: 76,
  length: END,
  sections: [[0, 'ground'], [16, 'violin I'], [32, 'violin II'], [48, 'violin III'], [CANON, 'fine']],
  tracks: {
    cello, harpsichord, timpani,
    violin1: violin(0, '#ffffff', -0.5),
    violin2: violin(1, '#ffd27a', 0.5),
    violin3: violin(2, '#9fd3ff', 0),
  },
}
