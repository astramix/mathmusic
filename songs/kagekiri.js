// Kagekiri (影斬り, "the cut through the shadow") — rawstyle hardstyle with a samurai's instruments: the screech is
// a shamisen with its sawari pushed into a scream (driven, crushed, a wah that follows the note), the euphoric hook
// a supersaw doubled by the koto, a biwa telling the story at the start and in the breakdown, shakuhachi over it.
// D minor with the in-scale ♭2 (E♭ — the Phrygian chord over the tonic pedal in the drops); 150 BPM.
//
// iai (the drawn blade: biwa, bell) → kamae (the stance: kick + riff) → build → KAGEKIRI (drop: the screech) →
// tsuba (the kick plays the melody) → breakdown (biwa, shakuhachi, then the euphoric theme) → build II →
// CLIMAX (the hook) → KESSEN (hook and screech together, the bass rolling) → zanshin (the calm after the cut).
//
// The math: in "tsuba" the kick's tail is the melody — every hit's tail tuned to a note of K = (D D F D E♭ D C A),
// f = 440·2^{(k − 69)/12}; the reverse bass is a parabola u² between the kicks (rolling, two a beat, in kessen);
// the screech of kessen is written relative to the chord's root (0, 0, 12, 7, 12, 7, 12, 0), so it fits any chord;
// the build doubles its snare 1 → ½ → ¼ → ⅛ and its riser climbs 300·2^{5.3u} Hz.
import { mod, floor, exp, sin, tanh, TAU, clamp, filter, reverb, delay, smooth, noise, supersaw } from '../src/engine.js'
import {
  notesAt, hash, pan, arrangement, voiceChords, shamisen, koto, biwa, shakuhachi, taikoDrum, woodClack, templeBellTone,
  poly, trigger, strings, hardKick, reverseBass, duck, chorus, choir, VOWELS, clapDrum, hatDrum,
} from '../src/instruments.js'

const BPM = 150, SEC = 60 / BPM
const SECTIONS = [
  [0, 'iai'], [16, 'kamae'], [48, 'build'], [64, 'kagekiri'], [112, 'tsuba'], [144, 'breakdown'],
  [192, 'build II'], [208, 'climax'], [256, 'kessen'], [288, 'zanshin'],
]
const END = 304
const part = arrangement(SECTIONS)
const is = (x, ...names) => x < END && names.includes(part(x).name)
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440

// ---- harmony -------------------------------------------------------------------------------------------------
const CH = { Dm: [2, 5, 9], Eb: [3, 7, 10], Bb: [10, 2, 5], F: [5, 9, 0], C: [0, 4, 7], Gm: [7, 10, 2], A: [9, 1, 4] } // root, 3rd, 5th
const THEME_CH = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']
const DROP_CH = ['Dm', 'Dm', 'Eb', 'Dm', 'Dm', 'Dm', 'Bb', 'A']
const PROG = {
  iai: ['Dm'], kamae: ['Dm', 'Dm', 'Eb', 'Dm'], build: ['Bb', 'C', 'A', 'A'], kagekiri: DROP_CH, tsuba: ['Dm', 'Eb', 'Dm', 'C', 'Dm', 'Eb', 'Bb', 'A'],
  breakdown: ['Dm', 'Dm', 'Bb', 'Bb', ...THEME_CH], 'build II': ['Bb', 'C', 'A', 'A'], climax: [...THEME_CH, 'Dm', 'Bb', 'F', 'C'], kessen: THEME_CH,
  zanshin: ['Dm', 'Dm', 'Eb', 'Dm'],
}
const BARS = []
for (let b = 0; b < END / 4; b++) {
  const { name, t } = part(4 * b), sym = PROG[name][floor(t / 4) % PROG[name].length]
  BARS.push({ sym, pcs: CH[sym] })
}
voiceChords(BARS.map(c => c.pcs), { lo: 57, hi: 77 }).forEach((v, i) => (BARS[i].v = v))
for (const c of BARS) c.bass = 36 + mod(c.pcs[0] - 36, 12)
const chordAt = x => BARS[clamp(floor(x / 4), 0, BARS.length - 1)]

// ---- melodies [beat, MIDI, length] -----------------------------------------------------------------------------
const THEME = [ // the euphoric theme over Dm – B♭ – F – C – Dm – B♭ – Gm – A
  [0, 81, 0.75], [0.75, 77, 0.75], [1.5, 74, 0.5], [2, 81, 0.5], [2.5, 79, 0.5], [3, 77, 0.5], [3.5, 76, 0.5],
  [4, 86, 0.75], [4.75, 82, 0.75], [5.5, 77, 0.5], [6, 86, 0.5], [6.5, 84, 0.5], [7, 82, 0.5], [7.5, 81, 0.5],
  [8, 84, 0.75], [8.75, 81, 0.75], [9.5, 77, 0.5], [10, 84, 0.5], [10.5, 82, 0.5], [11, 81, 0.5], [11.5, 79, 0.5],
  [12, 79, 1.5], [13.5, 81, 0.5], [14, 79, 1], [15, 76, 1],
  [16, 86, 0.75], [16.75, 81, 0.75], [17.5, 77, 0.5], [18, 86, 0.5], [18.5, 84, 0.5], [19, 81, 0.5], [19.5, 77, 0.5],
  [20, 89, 0.75], [20.75, 86, 0.75], [21.5, 82, 0.5], [22, 89, 0.5], [22.5, 86, 0.5], [23, 84, 0.5], [23.5, 82, 0.5],
  [24, 79, 0.75], [24.75, 82, 0.75], [25.5, 86, 0.5], [26, 82, 0.5], [26.5, 81, 0.5], [27, 79, 0.5], [27.5, 77, 0.5],
  [28, 81, 0.75], [28.75, 76, 0.75], [29.5, 81, 0.5], [30, 85, 1.5], [31.5, 88, 0.5],
]
// the drop's screech over the tonic pedal, D in-scale (D E♭ G A B♭): [beat, MIDI, length, slide from (semitones)]
const SCREECH = [
  [0, 62, 0.25], [0.25, 62, 0.25], [0.75, 74, 0.5, -2], [1.5, 69, 0.25], [2, 75, 0.5, -1], [2.5, 74, 0.25], [3, 70, 0.5], [3.5, 67, 0.5],
  [4, 62, 0.25], [4.25, 62, 0.25], [4.75, 74, 0.5, -2], [5.5, 69, 0.25], [6, 81, 0.75, -12], [7, 75, 0.5, 1], [7.5, 74, 0.5],
]
const SCREECH_EB = [[0, 63, 0.25], [0.25, 63, 0.25], [0.75, 75, 0.5, -2], [1.5, 70, 0.25], [2, 79, 0.5, -1], [2.5, 75, 0.25], [3, 70, 0.5], [3.5, 67, 0.5]]
const RAW = [0, 0, 12, 7, 12, 7, 12, 0] // kessen: eighths over the chord's root
const KMEL = [38, 38, 41, 38, 39, 38, 36, 33] // tsuba: the kick's tail, a note a beat (D2 D2 F2 D2 E♭2 D2 C2 A1)
const BIWA = [ // the tale: [beat, MIDI, length, chord?]
  [0, 50, 3, true], [3, 62, 0.5], [3.5, 63, 0.5], [4, 62, 2], [6, 57, 1], [7, 58, 1],
  [8, 50, 3, true], [11, 67, 0.5], [11.5, 69, 0.5], [12, 70, 1.5], [13.5, 69, 0.5], [14, 62, 2],
]
const SHAKU = THEME.filter(e => e[0] < 8).map(([b, n, d]) => [2 * b, n - 12, 2 * d]) // the theme's head, half speed, an octave down

const play = (list, x, at, k = 1) => { const m = notesAt(list, (x - at) / k); return m && { n: m.n, d: m.d * k, τ: m.τ * k, u: m.u, at: at + m.at * k, s: m.slide } }
const hookAt = x => {
  const { name, t } = part(x), s = x - t
  if (name === 'climax' || name === 'kessen') return play(THEME, x, s + (t >= 32 && name === 'climax' ? 32 : 0))
  if (name === 'build II') return t < 8 ? play(THEME.filter(e => e[0] < 8), x, s) : null
  return null
}
// screech: the drop riff (E♭ bars use their own), kessen's root-relative riff, a long slide into the build
const screechAt = x => {
  const { name, t } = part(x), s = x - t, c = chordAt(x)
  if (name === 'kagekiri' || name === 'kamae') {
    if (name === 'kamae' && t < 16 && mod(t, 8) >= 4) return null
    const bar = floor(t / 4)
    if (c.sym === 'Eb') { const m = notesAt(SCREECH_EB, mod(t, 4)); return m && { n: m.n, at: s + bar * 4 + m.at, d: m.d, slide: SCREECH_EB.find(e => e[0] === m.at)[3] ?? 0 } }
    if (c.sym === 'Bb' || c.sym === 'A') { const j = floor(2 * t); return mod(t, 0.5) < 0.4 ? { n: c.bass + 24 + RAW[mod(j, 8)], at: s + j / 2, d: 0.4, slide: 0 } : null }
    const m = notesAt(SCREECH, mod(t, 8))
    return m && { n: m.n, at: s + floor(t / 8) * 8 + m.at, d: m.d, slide: SCREECH.find(e => e[0] === m.at)[3] ?? 0 }
  }
  if (name === 'kessen') { const j = floor(2 * t); return mod(t, 0.5) < 0.35 ? { n: c.bass + 12 + RAW[mod(j, 8)], at: s + j / 2, d: 0.35, slide: mod(j, 8) === 2 ? -5 : 0 } : null }
  if (name === 'build') return t >= 8 ? { n: 69 + floor(t - 8), at: s + floor(t), d: 1, slide: -1 } : null
  return null
}
const kotoNotes = x => { // → [{ n, at, d, v }]
  const { name, t } = part(x), s = x - t, out = [], c = chordAt(x)
  if (name === 'climax' || name === 'kessen') { const m = hookAt(x); if (m) out.push({ n: m.n - 12, at: m.at, d: m.d, v: 0.6 }) }
  if (name === 'breakdown' || name === 'build II') {
    const j = floor(2 * x), cyc = [0, 1, 2, 3, 2, 1, 2, 3], v = c.v
    if (t >= (name === 'breakdown' ? 16 : 0)) out.push({ n: v[cyc[j % 8] % v.length] + 12, at: j / 2, d: 1, v: 0.5 })
    if (name === 'breakdown' && t >= 16) { const m = play(THEME, x, s + 16); if (m) out.push({ n: m.n, at: m.at, d: m.d, v: 0.75 }) }
  }
  if (name === 'tsuba') { const j = floor(4 * x); if (mod(j, 4) === 2) out.push({ n: c.v[mod(floor(j / 4), 3) + 1] + 12, at: j / 4, d: 0.5, v: 0.45 }) }
  return out
}
const BIWA_CHORDS = BIWA.filter(e => e[3]).map(e => e[0])
const biwaAt = x => {
  const { name, t } = part(x), s = x - t
  const m = name === 'iai' || (name === 'breakdown' && t < 16) ? play(BIWA, x, s) : name === 'zanshin' ? play(BIWA.slice(0, 6), x, s) : null
  return m && { ...m, chord: BIWA_CHORDS.includes(m.at - s) }
}
const shakuAt = x => (is(x, 'breakdown') && part(x).t < 16 ? play(SHAKU, x, 144) : null)

// ---- the beat ------------------------------------------------------------------------------------------------------
const HITS = {}
const add = (drum, at, vel = 1, data) => (HITS[drum] ??= []).push([at, vel * (0.88 + 0.12 * hash(floor(at * 8), drum.length)), data])
for (const [start, name] of SECTIONS) {
  const end = SECTIONS.find(([s]) => s > start)?.[0] ?? END
  for (let b = start; b < end; b += 4) {
    const t = b - start, L = end - start, last = b + 4 === end
    const four = (vel = 1) => { for (let p = 0; p < 4; p++) add('kick', b + p, vel, 38) }
    if (name === 'iai') { if (t === 0) add('crash', b), add('don', b); if (t === 12) [2, 3, 3.5].forEach(p => add('don', b + p, 0.8)) }
    else if (name === 'kamae') {
      four(0.9)
      if (t >= 16) add('clap', b + 1), add('clap', b + 3)
      for (let i = 0; i < 4; i++) add('hat', b + i + 0.5, 0.7)
      if (t >= 16) for (let i = 0; i < 16; i++) add('shime', b + i / 4, i % 4 ? 0.4 : 0.8)
      if (t === 0) add('crash', b)
      if (last) for (let i = 0; i < 4; i++) add('naga', b + 2 + i / 2, 0.7 + 0.1 * i)
    } else if (name === 'build' || name === 'build II') {
      const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
      for (let p = 0; p < 4; p += step) add('shime', b + p, 0.4 + (0.6 * (t + p)) / L)
      if (t >= L / 2) for (let p = 0; p < 4; p += t < 0.75 * L ? 1 : 0.5) add('kick', b + p, 0.7 + (0.3 * t) / L, 38)
      if (t === 0) add('naga', b, 1)
    } else if (name === 'kagekiri' || name === 'climax' || name === 'kessen') {
      four()
      add('clap', b + 1), add('clap', b + 3)
      for (let i = 0; i < 4; i++) add('hat', b + i + 0.5, 0.8)
      if (name !== 'kagekiri') for (let i = 0; i < 4; i++) add('hat', b + i + 0.25, 0.3), add('hat', b + i + 0.75, 0.3)
      if (mod(t, 16) === 0) add('crash', b), add('don', b)
      add('naga', b + 1, 0.6), add('naga', b + 3, 0.6)
      if (mod(t, 16) === 12) for (let i = 0; i < 8; i++) add('naga', b + 2 + i / 4, 0.5 + 0.06 * i)
    } else if (name === 'tsuba') {
      for (let p = 0; p < 4; p++) add('kick', b + p, 1, KMEL[mod(floor(t) + p, 8)])
      if (mod(t, 8) === 4) add('kick', b + 3.5, 0.8, KMEL[7]), add('kick', b + 3.75, 0.7, KMEL[7]) // a double at the end of every phrase
      add('clap', b + 1), add('clap', b + 3)
      for (let i = 0; i < 8; i++) add('ka', b + i / 2 + 0.25, 0.6)
      if (mod(t, 16) === 0) add('crash', b)
    } else if (name === 'breakdown') {
      if (t === 0 || t === 16) add('crash', b), add('don', b)
      if (t >= 16) add('don', b, 0.6), add('naga', b + 2, 0.5)
      if (last) for (let i = 0; i < 8; i++) add('naga', b + i / 2, 0.4 + 0.07 * i)
    } else if (name === 'zanshin') {
      if (t === 0) [0, 2, 3, 4].forEach(p => add('kick', b + p, 1 - 0.15 * p, 38)), add('crash', b), add('don', b)
      if (t === 8) add('don', b), add('crash', b, 0.6)
    }
  }
}
for (const list of Object.values(HITS)) list.sort((a, c) => a[0] - c[0])
const lastOf = (drum, x) => {
  const a = HITS[drum]
  if (!a || x >= END + 4) return null
  let lo = 0, hi = a.length - 1, r = -1
  while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m][0] <= x) (r = m), (lo = m + 1); else hi = m - 1 }
  return r < 0 ? null : { τ: x - a[r][0], vel: a[r][1], data: a[r][2], at: a[r][0] }
}
const HARD = x => is(x, 'kamae', 'kagekiri', 'tsuba', 'climax', 'kessen')
const pumpAt = x => { const k = lastOf('kick', x); return k && HARD(x) ? duck(k.τ * SEC, 0.7, 0.18) : 1 }
const y01 = (n, lo, hi, y0, y1) => y0 + ((n - lo) / (hi - lo)) * (y1 - y0)

// ---- tracks ---------------------------------------------------------------------------------------------------------
// K(x) — the raw kick: crushed to 22 kHz, its tail on D2 — or on the melody K in tsuba
const kickT = {
  color: '#ff006e',
  graph: x => { const k = lastOf('kick', x); return k && k.τ < 0.5 ? 2.5 + 1.9 * k.vel * exp(-6 * k.τ) + (is(x, 'tsuba') ? (k.data - 38) / 12 : 0) : null },
  midi: x => { const k = lastOf('kick', x); return k && k.τ < 0.2 ? [k.data] : [] },
  formula: [
    String.raw`K = 0.8\,\text{crush}_2\tanh\!\Big(2.2\,\LP_{4500}\big[\tanh(9(s + 0.35)) - \tanh 3.15\big]\Big) + 0.5e^{-t/1.5\text{мс}}\HP\eta + 0.5\sin 2\pi\!\!\int\! f`,
    String.raw`f = 440\cdot 2^{(k - 69)/12},\quad k = 38\ (D2);\qquad \text{цуба: } k = (38, 38, 41, 38, 39, 38, 36, 33)_{\lfloor x\rfloor \bmod 8}`,
  ],
  audio() {
    const k = hardKick({ tail: 0.3, drop: 6, drive: 9, bias: 0.35, tone: 4500, sub: 0.55, crush: 2 })
    return x => { const h = lastOf('kick', x); return 0.45 * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, mf(h ? h.data : 38), !!h) }
  },
}

// R(x) — the reverse bass: u² between the kicks; rolling in kessen
const rbassAt = x => {
  if (!is(x, 'kagekiri', 'climax', 'kessen')) return null
  const p = mod(x, 1)
  if (p < 0.5) return null
  return { u: is(x, 'kessen') ? mod(p - 0.5, 0.25) / 0.25 : (p - 0.5) / 0.5, n: 33 + mod(chordAt(x).pcs[0] - 9, 12) } // the root in A1…G♯2
}
const rbassT = {
  color: '#7b2cbf',
  graph: x => { const b = rbassAt(x); return b ? -2.9 + 0.8 * b.u * b.u + (b.n - 33) / 30 : null },
  midi: x => (rbassAt(x)?.u > 0.3 ? [rbassAt(x).n] : []),
  formula: [String.raw`R = \HP_{25}\LP_{150\cdot 2^{4.3u}}\tanh\!\Big(5u^2\big(0.4\saw f + 0.4\saw 1.006f + 0.8\sin 2\pi\!\!\int\! f\big)\Big),\quad u = \tfrac{(x \bmod 1) - 1/2}{1/2}\ \ \big(\text{кэссэн: } \tfrac{(x - 1/2) \bmod 1/4}{1/4}\big)`],
  audio() {
    const rb = reverseBass({ drive: 6, open: 4.3, q: 1.4 }), lp = filter('lp')
    return x => { const b = rbassAt(x); return 0.45 * lp(rb(b ? b.u : null, mf(b ? b.n : 38)), 2500) }
  },
}

// Sc(x) — the screech: a shamisen with its sawari at 0.04 into tanh(9·), a band-pass wah riding the note, crushed
const screechT = {
  color: '#ffbe0b',
  graph: x => { const m = screechAt(x); return m && x - m.at < m.d ? y01(m.n, 40, 90, 0.6, 3) : null },
  midi: x => { const m = screechAt(x); return m && x - m.at < m.d * 0.9 ? [m.n] : [] },
  formula: [
    String.raw`Sc = \text{crush}_3\Big[\BP_{w}\tanh\big(9\,Sm(f)\big) + 0.4\tanh\big(9\,Sm(f)\big)\Big],\quad w = 3f\,(1 + 1.5e^{-t/80\text{мс}})`,
    String.raw`f(t) = f_0\cdot 2^{\,\sigma(1 - s(t/0.08))/12}\ \ (\text{подъезд с } \sigma \text{ полутонов}),\qquad \text{кэссэн: } r + (0, 0, 12, 7, 12, 7, 12, 0)_{\lfloor 2x\rfloor \bmod 8}`,
  ],
  audio() {
    const s = shamisen({ sawari: 0.04, sustain: 1.4, bright: 0.95, slap: 0.9, seed: 5 }), fire = trigger(), bp = filter('bp'), hp = filter('hp'), lp = filter('lp')
    const verb = reverb({ room: 0.82, wet: 0.25 }), echo = delay({ time: SEC * 0.75, feedback: 0.3, wet: 0.2 })
    let held = 0, k = 0, f = 300
    return x => {
      const m = screechAt(x)
      if (m && fire(m.at + m.n / 1000)) { s.hit(mf(m.n), 0.95, { from: m.slide ?? 0, glide: 0.08 }); f = mf(m.n) }
      const t = m ? (x - m.at) * SEC : 1, raw = tanh(9 * s())
      let y = bp(raw, clamp(3 * f * (1 + 1.5 * exp(-t / 0.08)), 200, 9000), 2.2) + 0.4 * raw
      if (++k >= 3) (k = 0), (held = y)
      y = lp(hp(held, 120), 9000)
      return verb(...echo(...pan(0.5 * pumpAt(x) * y, -0.2)))
    }
  },
}

// H(x) — the euphoric hook: 7 saws and 5 an octave up, portamento, ducked under the kick
const hookT = {
  color: '#ffffff',
  graph: x => { const m = hookAt(x); return m ? y01(m.n, 72, 92, 1.4, 3) : null },
  midi: x => { const m = hookAt(x); return m && m.u < 0.9 ? [m.n] : [] },
  formula: [String.raw`H = \Rev\Big[0.5\,d(t_k)\,\LP_{f_c}\big(\SS_7(f) + 0.5\,\SS_5(2f)\big)\Big],\quad f_c = 7000\ \ (\text{разгон II: } 600 \to 7000),\quad d = 1 - 0.7(1 - t_k/0.18)^2`],
  audio() {
    const main = supersaw({ voices: 7, detune: 0.26, seed: 3 }), oct = supersaw({ voices: 5, detune: 0.2, seed: 4 })
    const lpL = filter('lp'), lpR = filter('lp'), gate = smooth(6), glide = smooth(16), fx = reverb({ room: 0.88, wet: 0.4 })
    let n = 81
    return x => {
      const m = hookAt(x)
      if (m) n = m.n
      const fc = is(x, 'build II') ? 600 * 2 ** (3.5 * part(x).t / 16) : 7000
      const a = 0.85 * gate(m && m.u < 0.92 ? 1 : 0) * pumpAt(x), f = glide(mf(n))
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f)
      return fx(a * lpL(l1 + 0.5 * l2, fc, 0.8), a * lpR(r1 + 0.5 * r2, fc, 0.8))
    }
  },
}

// Ko(x) — the koto: the theme an octave under the hook, broken chords through the breakdown, off-beat plucks in tsuba
const kotoT = {
  color: '#8ecae6',
  graph: x => { const ns = kotoNotes(x); return ns.length ? ns.map(e => y01(e.n, 55, 92, 0.3, 2.5)) : null },
  midi: x => kotoNotes(x).filter(e => x - e.at < Math.min(e.d, 0.9) * 0.9).map(e => e.n),
  formula: [String.raw`Ko = 0.75\,\LP_{6500}y + 0.7\BP_{210}y + 0.4\BP_{650}y + 0.35\HP_{2500}(\text{цумэ}),\quad y[k] = e[k] + g\big(a\,y[k - D] + (1-a)\,y[k - D - 1]\big)`],
  audio() {
    const k = koto({ sustain: 3 }), fires = [trigger(), trigger()], verb = reverb({ room: 0.88, wet: 0.38 }), echo = delay({ time: SEC * 0.75, feedback: 0.3, wet: 0.2 })
    return x => {
      kotoNotes(x).forEach((e, i) => { if (fires[i](e.at + e.n / 1000)) k.hit(mf(e.n), e.v) })
      return verb(...echo(...pan(2.8 * pumpAt(x) * k(), 0.3)))
    }
  },
}

// Bw(x) — the biwa: the tale in the intro, the breakdown and the end; chords strummed downwards with the bachi
const biwaT = {
  color: '#d4a373',
  graph: x => { const m = biwaAt(x); return m ? y01(m.n, 45, 75, 0, 1.6) : null },
  midi: x => { const m = biwaAt(x); return m && m.u < 0.9 ? (m.chord ? [m.n, m.n + 7, m.n + 12] : [m.n]) : [] },
  formula: [String.raw`Bw = 0.6\,\LP_{3500}y + \BP_{300}y + 0.45\BP_{1100}y + 0.6\BP_{900}(\text{бати}),\quad \text{савари } 0.02,\ \text{аккорд: } (n, n + 7, n + 12)\ \text{через 25 мс}`],
  audio() {
    const b = biwa(), b2 = biwa({ seed: 21 }), b3 = biwa({ seed: 22 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.42 })
    return x => {
      const m = biwaAt(x)
      if (m && fire(m.at + m.n / 1000)) {
        b.hit(mf(m.n), 0.85, { bend: m.d >= 2 ? 1 : 0, bendAt: 0.5, bendTime: 0.2, back: m.d >= 2 ? 0.5 + m.d * SEC * 0.6 : 0 })
        if (m.chord) b2.hit(mf(m.n + 7), 0.7, { at: floor(0.025 * 44100) }), b3.hit(mf(m.n + 12), 0.6, { at: floor(0.05 * 44100) })
      }
      return verb(...pan(2.2 * (b() + b2() + b3()), -0.1))
    }
  },
}

// Sh(x) — the shakuhachi over the biwa: the theme's head at half speed, an octave down
const shakuT = {
  color: '#c8e6a0',
  graph: x => { const m = shakuAt(x); return m ? y01(m.n, 60, 80, 1, 2.6) : null },
  midi: x => { const m = shakuAt(x); return m && m.u < 0.92 ? [m.n] : [] },
  formula: [String.raw`Sh = a\Big(\tanh\big(1.2\textstyle\sum_k c_k\sin 2\pi k\!\!\int\! g\big) + 0.17\BP_{g}\eta\Big),\quad g = f\,2^{(-0.7(1 - s(t/0.14)) + \text{юри})/12}`],
  audio() {
    const sh = shakuhachi({ breath: 0.18 }), verb = reverb({ room: 0.93, wet: 0.48 })
    let n = 69
    return x => {
      const m = shakuAt(x)
      if (m) n = m.n
      return verb(...pan(1.0 * sh(mf(n), !!m && m.u < 0.95, { accent: m && m.d >= 1.5 ? 0.5 : 0 }), 0.15))
    }
  },
}

// Ta(x) — taiko: odaiko on the downbeats of the phrases, nagado on 2 and 4 and in the fills, shime rolls, rims
const taikoT = {
  color: '#e63946',
  graph: x => {
    const d = lastOf('don', x), n = lastOf('naga', x), s = lastOf('shime', x)
    if (d && d.τ < 0.8) return 3.1 + 1.3 * d.vel * exp(-3 * d.τ)
    if (n && n.τ < 0.3) return 2.9 + 0.8 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.12 ? 2.3 + 0.6 * s.vel : null
  },
  midi: x => [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`T = \tanh\!\Big(1.4\LP_{3000}\Big[\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\sin\big(R_k 2\pi f(t + \gamma\tau(1 - e^{-t/\tau}))\big) + c\,e^{-t/4\text{мс}}\HP\eta + b\,e^{-t/0.35d}\BP_f\eta\Big]\Big)`],
  audio() {
    const don = taikoDrum({ pitch: 58, decay: 1.5, crack: 0.25, boom: 0.45, seed: 1 }), naga = taikoDrum({ pitch: 130, decay: 0.5, crack: 0.45, seed: 2 })
    const shime = taikoDrum({ pitch: 430, decay: 0.11, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 2100 })
    const verb = reverb({ room: 0.86, damp: 0.45, wet: 0.3 })
    const hit = (d, f, x) => { const h = lastOf(d, x); return h ? h.vel * f(h.τ * SEC, true) : f(1, false) }
    return x => verb(...pan(0.6 * hit('don', don, x) + 0.32 * pumpAt(x) * hit('naga', naga, x) + 0.17 * hit('shime', shime, x) + 0.1 * hit('ka', ka, x)))
  },
}

// D(x) — the hardstyle kit: clap on 2 and 4, off-beat hats, crash
const drumsT = {
  color: '#ff6f91',
  graph: x => { const c = lastOf('clap', x); return c && c.τ < 0.3 ? 3.5 + 0.7 * c.vel * exp(-8 * c.τ) : null },
  midi: x => [['clap', 39], ['hat', 42], ['crash', 49]].filter(([d]) => lastOf(d, x)?.τ < 0.1).map(([, n]) => n),
  formula: [String.raw`D = \Rev\big[0.9\,\text{Clap}(t) + 0.3\,\text{Hat}(t) + 0.3e^{-2t}\HP_{4000}\eta\big]`],
  audio() {
    const clap = clapDrum({ center: 1400 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), hp = filter('hp'), η = noise(7), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const at = d => { const h = lastOf(d, x); return h ? { t: h.τ * SEC, v: h.vel } : { t: 9, v: 0 } }
      const c = at('clap'), h = at('hat'), cr = at('crash')
      const y = 0.9 * c.v * clap(c.t, c.t < 0.4) + 0.3 * h.v * hat(h.t, h.t < 0.1) + 0.3 * cr.v * exp(-2 * cr.t) * hp(η(), 4000)
      return verb(1.7 * y, 1.7 * y)
    }
  },
}

// St(x) — strings: a bed in the breakdown, the builds and under the hook
const padOn = x => is(x, 'iai', 'breakdown', 'build', 'build II', 'climax', 'kessen', 'zanshin')
const stringsT = {
  color: '#cdb4db',
  graph: x => (padOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1, 0.4)) : null),
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v : []),
  formula: [String.raw`S = \Rev\,\Cho\sum_{j=1}^{4}\sum_{u=-1}^{1}\saw\!\Big(f_j\,2^{(0.09u + 0.12\sin 2\pi r_{j,u}T)/12}\Big),\quad f_j \text{ — голоса аккорда (поиск без параллелей)}`],
  audio() {
    const s = strings({ voices: 4, attack: 450, release: 1200, cutoff: 3200, gain: 0.07 }), ch = chorus({ mix: 0.35 }), verb = reverb({ room: 0.9, wet: 0.42 })
    return x => {
      const [l, r] = s(padOn(x) ? chordAt(x).v.map(mf) : []), g = pumpAt(x)
      return verb(...ch(g * l, g * r))
    }
  },
}

// Ch(x) — a choir on "a" through the euphoric breakdown and the climax
const choirOn = x => (is(x, 'breakdown') && part(x).t >= 16) || is(x, 'climax', 'build II')
const choirT = {
  color: '#a2d2ff',
  graph: x => (choirOn(x) ? chordAt(x).v.map(n => y01(n, 50, 80, -1.6, -0.6)) : null),
  midi: x => (choirOn(x) && mod(x, 4) < 3.9 ? chordAt(x).v.map(n => n - 12) : []),
  formula: [String.raw`Ch = \Rev\sum_{j}\sum_{i=1}^{3}\tfrac{G_i}{Q_i}\BP_{F_i}\big(\saw(f_j/2) + 0.06\eta\big),\quad F = \text{«а»}`],
  audio() {
    const c = choir({ voices: 4, size: 0.92, gain: 0.4 }), verb = reverb({ room: 0.93, wet: 0.5 })
    return x => { const [l, r] = c(choirOn(x) ? chordAt(x).v.map(n => mf(n - 12)) : [], VOWELS.a), g = pumpAt(x); return verb(g * l, g * r) }
  },
}

// Fx(x) — wind, the temple bell, the risers of the builds, a sweep down into every drop
const fxT = {
  color: '#6c757d',
  graph: x => (is(x, 'build', 'build II') ? -2 + (part(x).t / 16) ** 2 * 3.2 : is(x, 'iai') ? -2.9 + 0.05 * sin(x) : null),
  formula: [String.raw`\text{ветер: }\BP_{400\cdot 2^{1.5\sin(2\pi T/9)}}\eta;\quad \text{подъём: } 0.6u^2\BP_{300\cdot 2^{5.3u}}\eta;\quad \text{колокол (бонсё)}`],
  audio() {
    const η = noise(8), bp = filter('bp'), bp2 = filter('bp'), wind = filter('bp'), bell = poly((f, t, v) => templeBellTone(f, t, v), { life: 12, release: 2 }), fire = trigger()
    const verb = reverb({ room: 0.93, wet: 0.5 })
    return x => {
      const { name, t } = x < END ? part(x) : { name: 'end', t: 0 }, n = η(), T = x * SEC
      if ((x < 0.1 || (x >= 288 && x < 288.1)) && fire(x < 1 ? 0 : 288)) bell.hit(mf(38), 0.9)
      const u = name === 'build' || name === 'build II' ? t / 16 : 0
      let y = 0.6 * u * u * bp(n, 300 * 2 ** (5.3 * u), 1.5)
      const down = ['kagekiri', 'climax', 'kessen', 'tsuba'].includes(name) && t < 3 ? t * SEC : 9
      y += 0.4 * exp(-1.5 * down) * bp2(n, 8000 * 2 ** (-4 * down), 1)
      y += (name === 'iai' || name === 'zanshin' ? 0.08 : 0) * wind(n, 400 * 2 ** (1.5 * sin((TAU * T) / 9)), 3)
      const bl = 0.5 * bell()
      return verb(y + bl, y + bl)
    }
  },
}

export default {
  name: 'kagekiri',
  bpm: BPM,
  key: 'Dm',
  style: 'jbattle',
  theme: 'ink',
  length: END,
  sections: SECTIONS,
  tracks: {
    kick: kickT, rbass: rbassT, screech: screechT, hook: hookT, koto: kotoT, biwa: biwaT, shakuhachi: shakuT,
    taiko: taikoT, drums: drumsT, strings: stringsT, choir: choirT, fx: fxT,
  },
}
