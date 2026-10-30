// Партитура: Бах: Токката ре минор. Бах, Токката ре минор, BWV 565: мордент и пассаж к вводному тону — в октавах, как у Баха.
// D минор, 56 BPM: вступление на тонике → тема ×2: орган, орган -1 окт. → каденция V – I.
// The score is written as the composer wrote it (MIDI, C4 = 60); the harmony — one chord per 2 beats, chord tones on
// the strong beats — is voice-led by voiceChords (least motion, no parallel fifths or octaves). Made by tools/scores.js.
import { mod, floor, exp, clamp, filter, reverb } from '../src/engine.js'
import { notesAt, pan, poly, trigger, voiceChords, strings, bowed, reed, horn, flute, organ, pianoTone, timpaniTone, chorus } from '../src/instruments.js'

const BPM = 56, SEC = 60 / BPM
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
// the score: [beat, MIDI, length]
const SCORE = [
  [0, 81, 0.25], [0.25, 79, 0.25], [0.5, 81, 3.5],
  [4, 79, 0.125], [4.125, 77, 0.125], [4.25, 76, 0.125], [4.375, 74, 0.125], [4.5, 73, 0.5], [5, 74, 3],
  [8, 69, 0.25], [8.25, 67, 0.25], [8.5, 69, 3.5],
  [12, 67, 0.125], [12.125, 65, 0.125], [12.25, 64, 0.125], [12.375, 62, 0.125], [12.5, 61, 0.5], [13, 62, 3],
]
const L = 16 // beats in the theme
// the harmony: [beat, length, chord, pitch classes (root, 3rd, 5th, 7th)]
const HARMONY = [
  [0, 2, 'Dm', [2, 5, 9]],
  [2, 2, 'Dm', [2, 5, 9]],
  [4, 2, 'A7', [9, 1, 4, 7]],
  [6, 2, 'Dm', [2, 5, 9]],
  [8, 2, 'Dm', [2, 5, 9]],
  [10, 2, 'Dm', [2, 5, 9]],
  [12, 2, 'A7', [9, 1, 4, 7]],
  [14, 2, 'Dm', [2, 5, 9]],
]
const CADENCE = [['A7', [9, 1, 4, 7]], ['Dm', [2, 5, 9]]] // V7 – I after the theme
const N = 2 // the theme's passes
const T0 = 4, END = T0 + N * L + 10
const SECTIONS = [[0, 'вступление'], ...Array.from({ length: N }, (_, p) => [T0 + p * L, 'тема' + ['', ' II', ' III', ' IV'][p]]), [T0 + N * L, 'каденция']]
// every chord of the piece in order, voice-led once: the intro's tonic, the theme N times, the cadence
const SPANS = [[0, T0, HARMONY[0][2], HARMONY[0][3]], ...Array.from({ length: N }, (_, p) => HARMONY.map(h => [T0 + p * L + h[0], h[1], h[2], h[3]])).flat(),
  [T0 + N * L, 4, ...CADENCE[0]], [T0 + N * L + 4, 6, ...CADENCE[1]]]
const VOICES = voiceChords(SPANS.map(s => s[3]), { lo: 53, hi: 74 })
const chordAt = x => {
  for (let i = SPANS.length - 1; i >= 0; i--) if (SPANS[i][0] <= x) return x < END ? { at: SPANS[i][0], len: SPANS[i][1], name: SPANS[i][2], pcs: SPANS[i][3], v: VOICES[i], bass: 36 + mod(SPANS[i][3][0] - 36, 12) } : null
  return null
}
const TONIC = 2
// a voice of the score from pass "from" on (0 = the first); the first voice ends on the tonic in the cadence
const scoreAt = (x, from, shift, last) => {
  if (x >= T0 && x < T0 + N * L) {
    const p = floor((x - T0) / L)
    if (p < from) return null
    const m = notesAt(SCORE, x - T0 - p * L)
    return m && { n: m.n + shift, d: m.d, τ: m.τ, u: m.u, at: T0 + p * L + m.at }
  }
  if (last && x >= T0 + N * L + 4 && x < END - 1) { // the final tonic, near the theme's last note
    const n0 = SCORE[SCORE.length - 1][1] + shift, n = n0 - mod(n0 - TONIC, 12) + (mod(n0 - TONIC, 12) > 6 ? 12 : 0)
    return { n, d: 5, τ: x - T0 - N * L - 4, u: (x - T0 - N * L - 4) / 5, at: T0 + N * L + 4 }
  }
  return null
}
// an instrument for a voice: m (the note or null), x → sample
function voiceOf(kind) {
  let n = 60
  if (kind === 'violin' || kind === 'cello') { const b = bowed({ base: mf(60), body: kind === 'cello' ? 0.6 : 1, sec: SEC }); return (m, x) => b(m && { n: m.n - 60, d: m.d, τ: m.τ }, x * SEC) }
  if (kind === 'organ') { const o = organ({ voices: 1, gain: 0.5, stops: [[1, 1], [2, 0.5], [4, 0.25]] }); return m => o(m && m.u < 0.96 ? [mf(m.n)] : [])[0] }
  if (kind === 'piano') { const p = poly(pianoTone, { release: 0.4, life: 6 }), fire = trigger(); return m => { if (m && fire(m.at)) p.hit(mf(m.n), 0.75, m.d * SEC); return p() } }
  const inst = kind === 'horn' ? horn() : kind === 'flute' ? flute() : reed({ kind })
  return m => { if (m) n = m.n; return inst(mf(n), !!m && m.u < 0.93, 0.8) }
}
const GAIN = { violin: 0.42, cello: 0.34, organ: 1.1, piano: 0.55, horn: 0.6, flute: 0.42, oboe: 0.5, clarinet: 0.9, bassoon: 0.55 }
const part = (kind, shift, from, last, color, panv) => ({
  color,
  graph: x => { const m = scoreAt(x, from, shift, last); return m ? 1 + (m.n - 40) / 30 : null },
  midi: x => { const m = scoreAt(x, from, shift, last); return m && m.u < 0.92 ? [m.n] : [] },
  formula: ["\\text{партитура: } n(x) = \\text{SCORE}\\big((x - 4) \\bmod L\\big) + \\text{сдвиг}","\\text{инструмент: смычковые (корпус: 4 резонанса), трости (импульс через форманты), валторна, орган (регистры), фортепиано (6 парциалов)}"],
  audio() {
    const v = voiceOf(kind), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.38 })
    return x => verb(...pan(GAIN[kind] * v(scoreAt(x, from, shift, last), x), panv))
  },
})


// ---- орган
const track0 = part('organ', 0, 0, true, '#ffd9a8', 0.1)

// ---- орган -1
const track1 = part('organ', -12, 0, false, '#b8f0ff', -0.3)

// ---- орган (аккорды)
const track2 = {
  color: '#c9a227',
  graph: x => { const c = chordAt(x); return c ? c.v.map(n => -1 + (n - 50) / 24) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? c.v : [] },
  formula: ["O = \\Rev\\sum_{j}\\sum_{s} a_s\\sin(2\\pi\\,s f_j t) + \\text{«чифф»}\\quad\\text{— регистры } 8^\\prime, 4^\\prime, 2^\\prime"],
  audio() {
    const o = organ({ voices: 4, gain: 0.05, stops: [[1, 1], [2, 0.4]] }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => { const c = chordAt(x); return verb(...o(c && x >= T0 && x - c.at < c.len - 0.05 ? c.v.map(mf) : [])) }
  },
}

// ---- педаль
const track3 = {
  color: '#a07a2a',
  graph: x => { const c = chordAt(x); return c ? -2.8 + (c.bass - 36) / 24 : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? [c.bass - 12] : [] },
  formula: ["\\text{педаль органа: } 16^\\prime + 8^\\prime + 4^\\prime\\ \\text{на корне аккорда}"],
  audio() {
    const o = organ({ voices: 1, gain: 0.22, stops: [[1, 1], [2, 0.5], [4, 0.2]] }), verb = reverb({ room: 0.94, wet: 0.45 })
    return x => { const c = chordAt(x); return verb(...o(c && x - c.at < c.len - 0.05 ? [mf(c.bass - 12)] : [])) }
  },
}

export default {
  name: 'score-bach-toccata',
  bpm: BPM,
  key: 'Dm',
  style: 'classical',
  theme: 'classical',
  length: END,
  sections: SECTIONS,
  tracks: { "орган": track0, "орган -1": track1, "орган (аккорды)": track2, "педаль": track3 },
}
