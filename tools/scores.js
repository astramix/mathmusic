// Writes songs/score-<id>.js: every classical theme of src/melodies.js as a song of its own — the score as
// written, in the composer's key, over its harmony, orchestrated for its piece: an intro on the tonic, the
// theme, then the theme again (2–4 times in all) with more voices each time, a cadence V – I.
// parts: [instrument, shift in semitones, from which pass on (0 = always, 1 = from the second, …)]
//   node tools/scores.js        (run it again after changing a classical melody)
import fs from 'node:fs'
import { MELODIES } from '../src/melodies.js'
import { parseKey, roman, chordName, spell } from '../src/theory.js'

const midiOf = name => {
  const m = String(name).match(/^([A-G])(#|♯|b|♭)?(-?\d)$/)
  return 12 * (+m[3] + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1])] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0)
}
// per piece: the key it is heard in (Dvořák's Largo is in D♭), tempo, the voices of the two passes, the accompaniment
const PIECES = {
  'beethoven-joy': { bpm: 116, parts: [['oboe', 12, 0], ['violin', 12, 1], ['horn', 0, 1]], acc: 'strings', bass: 'cello', timp: true,
    about: 'Бетховен, Симфония № 9, финал (1824): тема «Оды к радости» — сначала гобой, потом скрипки и валторна.' },
  'mozart-nachtmusik': { bpm: 132, passes: 3, parts: [['violin', 0, 0], ['flute', 12, 1], ['oboe', 0, 2]], acc: 'strings', bass: 'cello',
    about: 'Моцарт, Серенада № 13 соль мажор «Маленькая ночная серенада», K. 525 (1787): начало первой части.' },
  'mozart-40': { bpm: 200, passes: 3, parts: [['violin', 0, 0], ['violin', -12, 1], ['flute', 12, 2]], acc: 'strings', bass: 'cello',
    about: 'Моцарт, Симфония № 40 соль минор, K. 550 (1788): главная тема — скрипки, во второй раз в октаву.' },
  'beethoven-fate': { bpm: 180, passes: 3, parts: [['violin', 0, 0], ['cello', -12, 0], ['horn', -12, 1], ['flute', 12, 2]], acc: 'strings', bass: 'cello', timp: true,
    about: 'Бетховен, Симфония № 5 до минор (1808): мотив «судьбы» в унисон струнных, во второй раз с валторнами.' },
  'bach-fugue': { bpm: 84, parts: [['organ', 0, 0], ['organ', -12, 1]], acc: 'organ', bass: 'pedal',
    about: 'Бах, Малая фуга соль минор, BWV 578: тема и ответ в доминанте на органе; во второй раз — в октаву.' },
  'bach-toccata': { bpm: 56, parts: [['organ', 0, 0], ['organ', -12, 0]], acc: 'organ', bass: 'pedal',
    about: 'Бах, Токката ре минор, BWV 565: мордент и пассаж к вводному тону — в октавах, как у Баха.' },
  'grieg-mountain': { bpm: 112, passes: 4, parts: [['bassoon', -24, 0], ['clarinet', -12, 1], ['violin', 0, 2], ['flute', 12, 3]], acc: 'strings', bass: 'cello', timp: true,
    about: 'Григ, «Пер Гюнт», «В пещере горного короля» (1875): тема у фагота в низком регистре, и с каждым проведением вступают новые голоса — выше и громче, как у Грига.' },
  'dvorak-largo': { bpm: 52, transpose: 1, key: 'Db', parts: [['oboe', -12, 0], ['flute', 0, 1]], acc: 'strings', bass: 'cello',
    about: 'Дворжак, Симфония № 9 «Из Нового света», Ларго (1893), ре-бемоль мажор: песня английского рожка (здесь — гобой октавой ниже), во второй раз с флейтой.' },
  'romance-tchaikovsky': { bpm: 76, parts: [['violin', 0, 0], ['cello', -12, 1], ['horn', -12, 1]], acc: 'strings', bass: 'cello', timp: true,
    about: 'Романс в духе Чайковского (наша тема): скрипка, во второй раз виолончель и валторна октавой ниже.' },
  'nocturne-chopin': { bpm: 60, parts: [['piano', 0, 0], ['piano', 12, 1]], acc: 'nocturne',
    about: 'Ноктюрн в духе Шопена (наша тема): кантилена правой руки над широким арпеджио левой, во второй раз в октаву.' },
}
const NAMES = { violin: 'скрипка', cello: 'виолончель', oboe: 'гобой', clarinet: 'кларнет', bassoon: 'фагот', flute: 'флейта', horn: 'валторна', organ: 'орган', piano: 'фортепиано' }
const round = v => +(+v).toFixed(4)

for (const mel of MELODIES.filter(m => PIECES[m.id])) {
  const P = PIECES[mel.id], N = P.passes ?? 2, tr = P.transpose ?? 0, key = parseKey(P.key ?? mel.key), base = midiOf(mel.base) + tr
  const score = mel.notes.map(([b, n, d]) => [round(b), base + n, round(d)])
  const L = mel.per * mel.chords.length
  const chords = mel.chords.map((s, i) => { const c = roman(s, key); return [i * mel.per, mel.per, chordName(c, key), c.tones] })
  const V = roman('V7', key), I = roman(key.mode === 'minor' ? 'i' : 'I', key)
  const keyName = spell(key.tonic + 60, key, false) + (key.mode === 'minor' ? 'm' : '')
  const name = 'score-' + mel.id
  const lines = []
  const bars = (list, f) => { const out = new Map(); for (const e of list) { const k = Math.floor(e[0] / 4 + 1e-9); if (!out.has(k)) out.set(k, []); out.get(k).push(f(e)) } return [...out.values()].map(l => '  ' + l.join(', ') + ',').join('\n') }
  lines.push(`// Партитура: ${mel.title}. ${P.about}`)
  lines.push(`// ${spell(key.tonic + 60, key, false)} ${key.mode === 'minor' ? 'минор' : 'мажор'}, ${P.bpm} BPM: вступление на тонике → тема ×${N}: ${P.parts.map(p => NAMES[p[0]] + (p[1] ? ` ${p[1] > 0 ? '+' : ''}${p[1] / 12} окт.` : '') + (p[2] ? ` с ${p[2] + 1}-го раза` : '')).join(', ')} → каденция V – I.`)
  lines.push(`// The score is written as the composer wrote it (MIDI, C4 = 60); the harmony — one chord per ${mel.per} beats, chord tones on`)
  lines.push(`// the strong beats — is voice-led by voiceChords (least motion, no parallel fifths or octaves). Made by tools/scores.js.`)
  lines.push(`import { mod, floor, exp, clamp, filter, reverb } from '../src/engine.js'`)
  lines.push(`import { notesAt, pan, poly, trigger, voiceChords, strings, bowed, reed, horn, flute, organ, pianoTone, timpaniTone, chorus } from '../src/instruments.js'`)
  lines.push(`
const BPM = ${P.bpm}, SEC = 60 / BPM
const mf = n => 440 * 2 ** ((n - 69) / 12) // MIDI → Hz, A4 = 440
// the score: [beat, MIDI, length]
const SCORE = [
${bars(score, ([b, n, d]) => `[${b}, ${n}, ${d}]`)}
]
const L = ${L} // beats in the theme
// the harmony: [beat, length, chord, pitch classes (root, 3rd, 5th, 7th)]
const HARMONY = [
${chords.map(([b, l, n, t]) => `  [${b}, ${l}, '${n}', [${t.join(', ')}]],`).join('\n')}
]
const CADENCE = [['${chordName(V, key)}', [${V.tones.join(', ')}]], ['${chordName(I, key)}', [${I.tones.join(', ')}]]] // V7 – I after the theme
const N = ${N} // the theme's passes
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
const TONIC = ${key.tonic}
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
  formula: ${JSON.stringify(['\\text{партитура: } n(x) = \\text{SCORE}\\big((x - 4) \\bmod L\\big) + \\text{сдвиг}', '\\text{инструмент: смычковые (корпус: 4 резонанса), трости (импульс через форманты), валторна, орган (регистры), фортепиано (6 парциалов)'])},
  audio() {
    const v = voiceOf(kind), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.38 })
    return x => verb(...pan(GAIN[kind] * v(scoreAt(x, from, shift, last), x), panv))
  },
})
`)
  const COLORS = ['#ffd9a8', '#b8f0ff', '#f4a261', '#e8f4ff']
  const tracks = []
  P.parts.forEach(([kind, shift, passes], i) => {
    const key0 = NAMES[kind] + (P.parts.filter(p => p[0] === kind).length > 1 ? (shift ? ` ${shift > 0 ? '+' : ''}${shift / 12}` : '') : '')
    tracks.push([key0, `part('${kind}', ${shift}, ${passes}, ${i === 0}, '${COLORS[i % 4]}', ${[0.1, -0.3, 0.3, -0.1][i % 4]})`])
  })
  // the accompaniment
  if (P.acc === 'strings') tracks.push(['струнные', `{
  color: '#cdb4db',
  graph: x => { const c = chordAt(x); return c ? c.v.map(n => -1 + (n - 50) / 24) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? c.v : [] },
  formula: ${JSON.stringify(['S = \\Rev\\,\\Cho\\sum_{j=1}^{4}\\sum_{u=-1}^{1}\\saw\\!\\Big(f_j\\,2^{(0.09u + 0.12\\sin 2\\pi r_{j,u}T)/12}\\Big),\\quad f_j \\text{ — голоса аккорда'])},
  audio() {
    const s = strings({ voices: 4, attack: 300, release: 900, cutoff: 3000, gain: 0.05 }), ch = chorus({ mix: 0.3 }), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => { const c = chordAt(x); return verb(...ch(...s(c && x - c.at < c.len - 0.08 ? c.v.map(mf) : []))) }
  },
}`])
  if (P.acc === 'organ') tracks.push(['орган (аккорды)', `{
  color: '#c9a227',
  graph: x => { const c = chordAt(x); return c ? c.v.map(n => -1 + (n - 50) / 24) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? c.v : [] },
  formula: ${JSON.stringify(['O = \\Rev\\sum_{j}\\sum_{s} a_s\\sin(2\\pi\\,s f_j t) + \\text{«чифф»}\\quad\\text{— регистры } 8^\\prime, 4^\\prime, 2^\\prime'])},
  audio() {
    const o = organ({ voices: 4, gain: 0.05, stops: [[1, 1], [2, 0.4]] }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => { const c = chordAt(x); return verb(...o(c && x >= T0 && x - c.at < c.len - 0.05 ? c.v.map(mf) : [])) }
  },
}`])
  if (P.acc === 'nocturne') tracks.push(['левая рука', `{
  color: '#ffffff',
  graph: x => { const c = chordAt(x); return c ? -1.5 + (fig(x) - 36) / 30 : null },
  midi: x => (chordAt(x) && mod(x, 0.5) < 0.1 ? [fig(x)] : []),
  formula: ${JSON.stringify(['\\text{левая рука ноктюрна: } (b,\\ b + 7,\\ v_2, v_3, v_4, v_3, v_2,\\ b + 7)_{\\lfloor 2x\\rfloor \\bmod 8}\\ \\text{восьмыми, с педалью'])},
  audio() {
    const keys = poly(pianoTone, { release: 0.5, life: 6 }), fire = trigger(), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.35 })
    return x => {
      const c = chordAt(x)
      if (c && fire(floor(2 * x))) keys.hit(mf(fig(x)), mod(floor(2 * x), 8) === 0 ? 0.55 : 0.34, 2 * SEC)
      return verb(...pan(0.2 * keys(), -0.15))
    }
  },
}`])
  if (P.bass === 'cello') tracks.push(['бас', `{
  color: '#c08a5a',
  graph: x => { const c = chordAt(x); return c ? -2.8 + (c.bass - 36) / 24 : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? [c.bass] : [] },
  formula: ${JSON.stringify(['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\ s = \\saw(f_{\\text{корень}})\\quad\\text{— виолончели и контрабасы на корне аккорда'])},
  audio() {
    const b = bowed({ base: mf(60), body: 0.55, sec: SEC }), verb = reverb({ room: 0.88, wet: 0.32 })
    return x => { const c = chordAt(x); return verb(...pan(0.2 * b(c && { n: c.bass - 60, d: c.len, τ: x - c.at }, x * SEC), -0.1)) }
  },
}`])
  if (P.bass === 'pedal') tracks.push(['педаль', `{
  color: '#a07a2a',
  graph: x => { const c = chordAt(x); return c ? -2.8 + (c.bass - 36) / 24 : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < c.len - 0.1 ? [c.bass - 12] : [] },
  formula: ${JSON.stringify(['\\text{педаль органа: } 16^\\prime + 8^\\prime + 4^\\prime\\ \\text{на корне аккорда}'])},
  audio() {
    const o = organ({ voices: 1, gain: 0.22, stops: [[1, 1], [2, 0.5], [4, 0.2]] }), verb = reverb({ room: 0.94, wet: 0.45 })
    return x => { const c = chordAt(x); return verb(...o(c && x - c.at < c.len - 0.05 ? [mf(c.bass - 12)] : [])) }
  },
}`])
  if (P.timp) tracks.push(['литавры', `{
  color: '#9c6644',
  graph: x => { const c = chordAt(x); return c && x - c.at < 0.6 && timpOn(c) ? 3 + 1.2 * exp(-4 * (x - c.at)) : null },
  midi: x => { const c = chordAt(x); return c && x - c.at < 0.2 && timpOn(c) ? [timpNote(c)] : [] },
  formula: ${JSON.stringify(['Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + \\ldots)\\big),\\ R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)\\quad\\text{— только на тонике и доминанте, как в классическом оркестре'])},
  audio() {
    const p = poly(timpaniTone, { release: 0.8, life: 4 }), fire = trigger(), verb = reverb({ room: 0.9, wet: 0.35 })
    return x => {
      const c = chordAt(x)
      if (c && timpOn(c) && fire(c.at)) p.hit(mf(timpNote(c)), x >= T0 + N * L ? 0.95 : 0.7)
      return verb(...pan(0.4 * p(), -0.2))
    }
  },
}`])
  const helpers = []
  if (P.acc === 'nocturne') helpers.push(`const fig = x => { const c = chordAt(x), b = c.bass + 12, v = c.v; return [b, b + 7, v[1], v[2], v[3] ?? v[0] + 12, v[2], v[1], b + 7][mod(floor(2 * x), 8)] }`)
  if (P.timp) helpers.push(`const timpOn = c => [0, 7].includes(mod(c.pcs[0] - TONIC, 12)) // the two drums: tonic and dominant\nconst timpNote = c => 41 + mod(c.pcs[0] - 41, 12) // F2…E3`)
  const src = [...lines, ...helpers, '', ...tracks.map(([k, code], i) => `// ---- ${k}\nconst track${i} = ${code}\n`),
    `export default {
  name: '${name}',
  bpm: BPM,
  key: '${keyName}',
  style: 'classical',
  theme: 'classical',
  length: END,
  sections: SECTIONS,
  tracks: { ${tracks.map(([k], i) => `${JSON.stringify(k)}: track${i}`).join(', ')} },
}
`].join('\n')
  fs.writeFileSync(`songs/${name}.js`, src)
  console.log(`songs/${name}.js  ${keyName}  ${P.bpm} BPM  ${((4 + N * L + 10) * 60 / P.bpm).toFixed(0)} s`)
}
