// Партитура: Бетховен: Пятая симфония. Бетховен, Симфония № 5 до минор (1808): мотив «судьбы» в унисон струнных, во второй раз с валторнами.
// C минор, 180 BPM: вступление на тонике → тема ×3: скрипка, виолончель -1 окт., валторна -1 окт. с 2-го раза, флейта +1 окт. с 3-го раза → каденция V – I.
// The score is written as the composer wrote it (MIDI, C4 = 60); the harmony — one chord per 4 beats, chord tones on
// the strong beats — is voice-led by voiceChords (least motion, no parallel fifths or octaves). Made by tools/scores.js.
import { mod, floor, exp, clamp, filter, reverb } from '../src/engine.js'
import { notesAt, pan, poly, trigger, voiceChords, strings, bowed, reed, horn, flute, organ, pianoTone, timpaniTone, chorus } from '../src/instruments.js'

const BPM = 180, SEC = 60 / BPM
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
// the score: [beat, MIDI, length]
const SCORE = [
  [0.5, 67, 0.5], [1, 67, 0.5], [1.5, 67, 0.5], [2, 63, 2],
  [4.5, 65, 0.5], [5, 65, 0.5], [5.5, 65, 0.5], [6, 62, 2],
  [8.5, 68, 0.5], [9, 68, 0.5], [9.5, 68, 0.5], [10, 67, 2],
  [12.5, 75, 0.5], [13, 75, 0.5], [13.5, 75, 0.5], [14, 72, 2],
  [16.5, 67, 0.5], [17, 67, 0.5], [17.5, 67, 0.5], [18, 65, 2],
  [20.5, 63, 0.5], [21, 63, 0.5], [21.5, 63, 0.5], [22, 62, 2],
  [24.5, 72, 0.5], [25, 72, 0.5], [25.5, 72, 0.5], [26, 71, 2],
  [28, 72, 4],
]
const L = 32 // beats in the theme
// the harmony: [beat, length, chord, pitch classes (root, 3rd, 5th, 7th)]
const HARMONY = [
  [0, 4, 'Cm', [0, 3, 7]],
  [4, 4, 'G7', [7, 11, 2, 5]],
  [8, 4, 'Cm', [0, 3, 7]],
  [12, 4, 'Cm', [0, 3, 7]],
  [16, 4, 'G7', [7, 11, 2, 5]],
  [20, 4, 'G7', [7, 11, 2, 5]],
  [24, 4, 'G', [7, 11, 2]],
  [28, 4, 'Cm', [0, 3, 7]],
]
const CADENCE = [['G7', [7, 11, 2, 5]], ['Cm', [0, 3, 7]]] // V7 – I after the theme
const N = 3 // the theme's passes
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
const TONIC = 0
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

const timpOn = c => [0, 7].includes(mod(c.pcs[0] - TONIC, 12)) // the two drums: tonic and dominant
const timpNote = c => 41 + mod(c.pcs[0] - 41, 12) // F2…E3

// ---- скрипка
const track0 = part('violin', 0, 0, true, '#ffd9a8', 0.1)

// ---- виолончель
const track1 = part('cello', -12, 0, false, '#b8f0ff', -0.3)

// ---- валторна
const track2 = part('horn', -12, 1, false, '#f4a261', 0.3)

// ---- флейта
const track3 = part('flute', 12, 2, false, '#e8f4ff', -0.1)

// ---- струнные
const track4 = {
  color: '#cdb4db',
  graph: x => { const c = chordAt(x); return c ? c.v.map(n => -1 + (n - 50) / 24) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? c.v : [] },
  formula: ["S = \\Rev\\,\\Cho\\sum_{j=1}^{4}\\sum_{u=-1}^{1}\\saw\\!\\Big(f_j\\,2^{(0.09u + 0.12\\sin 2\\pi r_{j,u}T)/12}\\Big),\\quad f_j \\text{ — голоса аккорда}"],
  audio() {
    const s = strings({ voices: 4, attack: 300, release: 900, cutoff: 3000, gain: 0.05 }), ch = chorus({ mix: 0.3 }), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => { const c = chordAt(x); return verb(...ch(...s(c && x - c.at < c.len - 0.08 ? c.v.map(mf) : []))) }
  },
}

// ---- бас
const track5 = {
  color: '#c08a5a',
  graph: x => { const c = chordAt(x); return c ? -2.8 + (c.bass - 36) / 24 : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? [c.bass] : [] },
  formula: ["Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\ s = \\saw(f_{\\text{корень}})\\quad\\text{— виолончели и контрабасы на корне аккорда}"],
  audio() {
    const b = bowed({ base: mf(60), body: 0.55, sec: SEC }), verb = reverb({ room: 0.88, wet: 0.32 })
    return x => { const c = chordAt(x); return verb(...pan(0.2 * b(c && { n: c.bass - 60, d: c.len, τ: x - c.at }, x * SEC), -0.1)) }
  },
}

// ---- литавры
const track6 = {
  color: '#9c6644',
  graph: x => { const c = chordAt(x); return c && x - c.at < 0.6 && timpOn(c) ? 3 + 1.2 * exp(-4 * (x - c.at)) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < 0.2 && timpOn(c) ? [timpNote(c)] : [] },
  formula: ["Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + \\ldots)\\big),\\ R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)\\quad\\text{— только на тонике и доминанте, как в классическом оркестре}"],
  audio() {
    const p = poly(timpaniTone, { release: 0.8, life: 4 }), fire = trigger(), verb = reverb({ room: 0.9, wet: 0.35 })
    return x => {
      const c = chordAt(x)
      if (c && timpOn(c) && fire(c.at)) p.hit(mf(timpNote(c)), x >= T0 + N * L ? 0.95 : 0.7)
      return verb(...pan(0.4 * p(), -0.2))
    }
  },
}

export default {
  name: 'score-beethoven-fate',
  bpm: BPM,
  key: 'Cm',
  style: 'classical',
  theme: 'classical',
  length: END,
  sections: SECTIONS,
  tracks: { "скрипка": track0, "виолончель": track1, "валторна": track2, "флейта": track3, "струнные": track4, "бас": track5, "литавры": track6 },
}
