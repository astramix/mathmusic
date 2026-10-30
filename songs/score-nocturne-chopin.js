// Партитура: ноктюрн в духе Шопена. Ноктюрн в духе Шопена (наша тема): кантилена правой руки над широким арпеджио левой, во второй раз в октаву.
// E♭ мажор, 60 BPM: вступление на тонике → тема ×2: фортепиано, фортепиано +1 окт. с 2-го раза → каденция V – I.
// The score is written as the composer wrote it (MIDI, C4 = 60); the harmony — one chord per 4 beats, chord tones on
// the strong beats — is voice-led by voiceChords (least motion, no parallel fifths or octaves). Made by tools/scores.js.
import { mod, floor, exp, clamp, filter, reverb } from '../src/engine.js'
import { notesAt, pan, poly, trigger, voiceChords, strings, bowed, reed, horn, flute, organ, pianoTone, timpaniTone, chorus } from '../src/instruments.js'

const BPM = 60, SEC = 60 / BPM
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
// the score: [beat, MIDI, length]
const SCORE = [
  [0, 79, 1.5], [1.5, 77, 0.25], [1.75, 79, 0.25], [2, 82, 2],
  [4, 84, 1.5], [5.5, 82, 0.5], [6, 79, 1], [7, 75, 1],
  [8, 80, 1.5], [9.5, 79, 0.5], [10, 77, 1.5], [11.5, 79, 0.5],
  [12, 80, 1], [13, 79, 0.5], [13.5, 77, 0.5], [14, 74, 1], [15, 77, 1],
  [16, 87, 1.5], [17.5, 86, 0.25], [17.75, 87, 0.25], [18, 82, 2],
  [20, 84, 1.5], [21.5, 82, 0.5], [22, 80, 1], [23, 87, 1],
  [24, 86, 1], [25, 89, 0.5], [25.5, 87, 0.5], [26, 80, 1], [27, 77, 1],
  [28, 75, 4],
]
const L = 32 // beats in the theme
// the harmony: [beat, length, chord, pitch classes (root, 3rd, 5th, 7th)]
const HARMONY = [
  [0, 4, 'E♭', [3, 7, 10]],
  [4, 4, 'Cm', [0, 3, 7]],
  [8, 4, 'Fm7', [5, 8, 0, 3]],
  [12, 4, 'B♭7', [10, 2, 5, 8]],
  [16, 4, 'E♭', [3, 7, 10]],
  [20, 4, 'A♭', [8, 0, 3]],
  [24, 4, 'B♭7', [10, 2, 5, 8]],
  [28, 4, 'E♭', [3, 7, 10]],
]
const CADENCE = [['B♭7', [10, 2, 5, 8]], ['E♭', [3, 7, 10]]] // V7 – I after the theme
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
const TONIC = 3
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

const fig = x => { const c = chordAt(x), b = c.bass + 12, v = c.v; return [b, b + 7, v[1], v[2], v[3] ?? v[0] + 12, v[2], v[1], b + 7][mod(floor(2 * x), 8)] }

// ---- фортепиано
const track0 = part('piano', 0, 0, true, '#ffd9a8', 0.1)

// ---- фортепиано +1
const track1 = part('piano', 12, 1, false, '#b8f0ff', -0.3)

// ---- левая рука
const track2 = {
  color: '#ffffff',
  graph: x => { const c = chordAt(x); return c ? -1.5 + (fig(x) - 36) / 30 : null },
  midi: x => (chordAt(x) && mod(x, 0.5) < 0.1 ? [fig(x)] : []),
  formula: ["\\text{левая рука ноктюрна: } (b,\\ b + 7,\\ v_2, v_3, v_4, v_3, v_2,\\ b + 7)_{\\lfloor 2x\\rfloor \\bmod 8}\\ \\text{восьмыми, с педалью}"],
  audio() {
    const keys = poly(pianoTone, { release: 0.5, life: 6 }), fire = trigger(), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.35 })
    return x => {
      const c = chordAt(x)
      if (c && fire(floor(2 * x))) keys.hit(mf(fig(x)), mod(floor(2 * x), 8) === 0 ? 0.55 : 0.34, 2 * SEC)
      return verb(...pan(0.2 * keys(), -0.15))
    }
  },
}

export default {
  name: 'score-nocturne-chopin',
  bpm: BPM,
  key: 'E♭',
  style: 'classical',
  theme: 'classical',
  length: END,
  sections: SECTIONS,
  tracks: { "фортепиано": track0, "фортепиано +1": track1, "левая рука": track2 },
}
