// Tunings — how notes become frequencies. Shared by the generator, retune.js, the app (note names, the tuning menu,
// export) and the tests; songs themselves carry the result as data (they import only engine and instruments).
//
// A pitch is a MIDI number that may carry a fraction: 60 = C4, 60.5 = a quarter tone higher (C𝄲4), 60.25 = an
// eighth tone (C𝄮4); A4 = 69 = 440 Hz. Microtonal *modes* (maqamat, makamlar, dastgah-ha, gamelan) are in modes.js —
// their degrees are fractional semitones. Here are the *temperaments*: the twelve notes of the octave tuned otherwise
// than in 12-TET —
//   · fixed: the well temperaments of Werckmeister, Kirnberger, Vallotti (A4 = 440 kept);
//   · on the tonic: 5-limit just intonation (the tonic keeps its 12-TET pitch);
//   · by spelling: Pythagorean, ¼-comma meantone, 19-, 31- and 53-EDO — a note is placed on the chain of fifths by how
//     it is spelt in its key, so G♯ and A♭ are different pitches (as on a harpsichord with split keys);
//   · adaptive just intonation: every chord pure on its own root (like Hermode tuning) — the generator only, it needs
//     to know the chords.
// And the files other programs read: Scala .scl/.kbm and Ableton Live 12 .ascl.
import { spellParts, parseKey, keyName } from './theory.js'

export const freqOf = n => 440 * 2 ** ((n - 69) / 12)
export const midiOfHz = f => 69 + 12 * Math.log2(f / 440)
const mod = (a, n) => ((a % n) + n) % n
const cents = r => 1200 * Math.log2(r)
// ±600 around 0
const wrap = c => mod(c + 600, 1200) - 600

export const COMMA_53 = 1200 / 53 // the Holdrian comma of Turkish theory (Arel–Ezgi–Uzdilek), 22.64 ¢
export const SYNTONIC = cents(81 / 80) // 21.51 ¢
export const PYTH_FIFTH = cents(3 / 2) // 701.955 ¢
export const MEANTONE_FIFTH = (1200 * Math.log2(5)) / 4 // ¼-comma: four fifths make a pure major third, 696.578 ¢

// 5-limit just intonation on the tonic (Ptolemy's intense diatonic + the usual chromatic ratios)
const JUST = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8]

export const TEMPERAMENTS = [
  { id: 'equal', name: 'Равномерная темперация', alt: '12-TET', kind: 'equal', short: 'все полутоны по 100 ¢ — стандарт с XIX века',
    text: 'Октава поделена на 12 равных полутонов, отношение соседних нот 2^(1/12). Все тональности звучат одинаково; чистая только октава, квинта на 2 ¢ уже чистой, большая терция на 14 ¢ шире. A4 = 440 Гц.' },
  { id: 'just', name: 'Чистый строй', alt: '5-предельный, от тоники', kind: 'tonic', ratios: JUST,
    short: 'терции и квинты без биений — от тоники',
    text: 'Ступени — простые отношения к тонике: 9/8, 5/4, 4/3, 3/2, 5/3, 15/8 (в миноре 6/5, 8/5, 9/5). Тоническое, субдоминантовое и доминантовое трезвучия звучат идеально чисто (4 : 5 : 6), зато у II ступени квинта узкая на синтоническую комму (−21,5 ¢) — «волк». Тоника стоит там же, где в 12-TET.' },
  { id: 'adaptive', name: 'Адаптивный чистый строй', alt: 'как Hermode Tuning', kind: 'adaptive',
    short: 'каждый аккорд чист на своём основном тоне',
    text: 'Строй подстраивается под гармонию: в каждом аккорде терция берётся 5/4 или 6/5, квинта 3/2, септима доминантсептаккорда 7/4 (натуральная), малая септима 9/5, большая 15/8; основной тон аккорда остаётся на месте (12-TET), поэтому строй не «уплывает». Так звучат хор а капелла и струнный квартет. Только для сгенерированных песен — генератор знает аккорды.' },
  { id: 'pythagorean', name: 'Пифагоров строй', alt: 'цепь чистых квинт', kind: 'spelled', fifth: PYTH_FIFTH,
    short: 'чистые квинты 3/2; G♯ выше A♭ на комму',
    text: 'Все ноты — цепь чистых квинт (3/2) по написанию: D = две квинты от C, E — четыре. Большая терция 81/64 (408 ¢) звонкая и напряжённая, полутоны неравные: диатонический 90 ¢, хроматический 114 ¢. Средневековая музыка, а также интонация скрипача в мелодии (высокие вводные тоны). Тоника на месте 12-TET.' },
  { id: 'meantone', name: 'Среднетоновый строй ¼ коммы', alt: 'Аарон, 1523', kind: 'spelled', fifth: MEANTONE_FIFTH,
    short: 'чистые большие терции 5/4 — Ренессанс и ранний барокко',
    text: 'Квинта сужена на ¼ синтонической коммы (696,6 ¢), так что четыре квинты дают чистую большую терцию 5/4. Звук Монтеверди, Пёрселла, раннего Генделя: сладкие терции, «тёмные» хроматизмы. Ноты ставятся по написанию — G♯ ниже A♭ на 41 ¢ (диеса), как на клавесине с разделёнными клавишами, поэтому «волчьей» квинты нет.' },
  { id: 'werckmeister3', name: 'Веркмейстер III', alt: 'хорошо темперированный, 1691', kind: 'fixed',
    cents: [0, 90.225, 192.18, 294.135, 390.225, 498.045, 588.27, 696.09, 792.18, 888.27, 996.09, 1092.18],
    short: 'у каждой тональности свой цвет — эпоха Баха',
    text: 'Четыре квинты (C–G–D–A и B–F♯) сужены на ¼ пифагоровой коммы, остальные чистые. Все тональности играбельны, но различны: C-dur спокойная и чистая, F♯-dur и D♭-dur острые и яркие. Таблица от C, A4 = 440 Гц.' },
  { id: 'kirnberger3', name: 'Кирнбергер III', alt: '1779', kind: 'fixed',
    cents: [0, 90.225, 193.157, 294.135, 386.314, 498.045, 590.224, 696.578, 792.18, 889.735, 996.09, 1088.269],
    short: 'чистая терция C–E и чистые квинты на краях круга',
    text: 'Квинты C–G–D–A–E сужены на ¼ синтонической коммы (терция C–E чистая 5/4), F♯–C♯ — на схизму, остальные чистые. Ученик Баха; яркая разница между «белыми» и «чёрными» тональностями. A4 = 440 Гц.' },
  { id: 'vallotti', name: 'Валлотти', alt: '1754', kind: 'fixed',
    cents: [0, 94.135, 196.09, 298.045, 392.18, 501.955, 592.18, 698.045, 796.09, 894.135, 1000, 1090.225],
    short: 'мягкий хорошо темперированный — любимец органистов',
    text: 'Шесть квинт F–C–G–D–A–E–B сужены на ⅙ пифагоровой коммы, шесть остальных чистые. Близок к равномерной темперации, но терции в тональностях с малым числом знаков чище. A4 = 440 Гц.' },
  { id: 'edo19', name: '19-EDO', alt: '19 равных ступеней', kind: 'spelled', edo: 19,
    short: 'квинта 694,7 ¢, малая терция почти чистая; C♯ ≠ D♭',
    text: 'Октава из 19 равных шагов по 63,2 ¢. Нота ставится по написанию: квинта = 11 шагов, диатонический полутон 2 шага, хроматический 1 — C♯ ниже D♭. Близок к среднетоновому строю ⅓ коммы; малая терция 6/5 почти идеальна.' },
  { id: 'edo31', name: '31-EDO', alt: 'Гюйгенс — Фоккер', kind: 'spelled', edo: 31,
    short: 'почти среднетоновый строй; и натуральная септима 7/4',
    text: 'Октава из 31 шага по 38,7 ¢ (Гюйгенс, 1691; орган Фоккера в Харлеме, 1950). По написанию: квинта 18 шагов (696,8 ¢ ≈ ¼ коммы), большая терция 10 шагов (387 ¢ ≈ 5/4), C♯ и D♭ различаются на диесу.' },
  { id: 'edo53', name: '53-EDO', alt: 'Меркатор, Холдер', kind: 'spelled', edo: 53,
    short: 'квинта 701,9 ¢ — почти пифагорова; основа турецкой теории',
    text: 'Октава из 53 коммы по 22,6 ¢: квинта 31 комма (на 0,07 ¢ от чистой). Хроматический полутон 5 коммы, диатонический 4. На этой сетке построена турецкая теория Арель — Эзги — Уздилек.' },
]
export const TEMPERS = Object.fromEntries(TEMPERAMENTS.map(t => [t.id, t]))
export const temperOf = id => TEMPERS[id] ?? TEMPERS.equal

// ---- cents offsets of the twelve notes from 12-TET ---------------------------------------------------------------
// (id, key) → an array of 12 offsets in cents, by absolute pitch class (C = 0), or null for 12-TET / adaptive.
// key: { tonic, mode } (theory.parseKey) — the tonic stays where 12-TET has it (tonic and spelled kinds)
export function temperOffsets(id, key = { tonic: 0, mode: 'major' }) {
  const t = temperOf(id)
  if (t.kind === 'equal' || t.kind === 'adaptive') return null
  const out = new Array(12).fill(0)
  if (t.kind === 'fixed') {
    const a = t.cents[9] - 900 // A4 = 440
    for (let p = 0; p < 12; p++) out[p] = round3(t.cents[p] - 100 * p - a)
    return out
  }
  const tonic = Math.round(key.tonic)
  if (t.kind === 'tonic') {
    for (let k = 0; k < 12; k++) out[mod(tonic + k, 12)] = round3(cents(t.ratios[k]) - 100 * k)
    return out
  }
  // spelled: the note's place on the chain of fifths (its letter and accidental in this key)
  const fifth = t.fifth ?? (Math.round(t.edo * Math.log2(3 / 2)) * 1200) / t.edo
  const at = n => {
    const s = spellParts(n, key), f = LETTER_FIFTHS[s.li] + 7 * Math.round(s.acc)
    return wrap(f * fifth - 100 * mod(n, 12))
  }
  const ref = at(tonic + 60)
  for (let p = 0; p < 12; p++) out[p] = round3(wrap(at(60 + p) - ref))
  return out
}
const LETTER_FIFTHS = [0, 2, 4, -1, 1, 3, 5] // C D E F G A B on the chain of fifths
const round3 = v => Math.round(v * 1000) / 1000

// Adaptive just intonation: the offset (cents) of a note `k` semitones above the root of a chord whose third, fifth and
// seventh are [third, fifth, seventh] semitones (generate.js keeps them per chord)
export function adaptiveOffset(k, [third = 4, fifth = 7, seventh = 10] = []) {
  k = mod(Math.round(k), 12)
  if (k === 10 && third === 4 && fifth === 7) return cents(7 / 4) - 1000 // the dominant seventh: the natural seventh
  if (k === 10) return cents(9 / 5) - 1000
  if (k === 6 && fifth === 6) return cents(64 / 45) - 600 // the diminished fifth of ø7 / °
  if (k === 8 && fifth === 8) return cents(25 / 16) - 800
  if (k === 9 && seventh === 9) return cents(128 / 75) - 900 // the diminished seventh
  return cents(JUST[k]) - 100 * k
}

// ---- where a microtonal pitch sits on the EDO grids --------------------------------------------------------------
// the finest of 12 / 24 / 48 that holds n (within half a cent), else null (a measured scale, a temperament)
export function gridOf(n) {
  for (const e of [12, 24, 48]) if (Math.abs(n * (e / 12) - Math.round(n * (e / 12))) < 0.005 * (e / 12)) return e
  return null
}
export const quantize = (n, edo = 24) => Math.round((n * edo) / 12) / (edo / 12)

// ---- files for other programs ------------------------------------------------------------------------------------
const fmtCents = c => (Math.abs(c - Math.round(c)) < 1e-9 ? `${Math.round(c)}.` : c.toFixed(5).replace(/0+$/, ''))
// Scala .scl: description, the number of notes, every degree above the first in cents (the last line is the octave)
export function scl(description, degrees, octave = 1200) {
  const lines = [`! ${description.replace(/[\r\n]+/g, ' ')}`, '!', description.replace(/[\r\n]+/g, ' '), ` ${degrees.length}`, '!']
  for (const c of degrees.slice(1)) lines.push(` ${fmtCents(c)}`)
  lines.push(` ${fmtCents(octave)}`)
  return lines.join('\n') + '\n'
}
// Scala .kbm for a 12-note .scl: MIDI note `ref` plays degree 0, with frequency `hz`
export function kbm(ref, hz, size = 12) {
  return [
    `! keyboard mapping for a ${size}-note scale`, `${size}`, '0', '127', `${ref}`, `${ref}`, `${hz.toFixed(6)}`, `${size}`,
    '! mapping', ...Array.from({ length: size }, (_, i) => `${i}`),
  ].join('\n') + '\n'
}
// Ableton Live 12 .ascl: Scala with @ABL directives — the reference pitch (Live calls MIDI 60 "C3") and the note names
export function ascl(description, degrees, { names = null, refOctave = 3, refIndex = 0, refHz = freqOf(60), octave = 1200 } = {}) {
  let s = scl(description, degrees, octave)
  s += `! @ABL REFERENCE_PITCH ${refOctave} ${refIndex} ${refHz.toFixed(4)}\n`
  if (names) s += `! @ABL NOTE_NAMES ${names.map(n => JSON.stringify(n)).join(' ')}\n`
  return s
}
// the tuning of a song as files: { 'name.scl', 'name.kbm', 'name.ascl' } — 12 notes from C (a temperament), or the
// song's microtonal mode as its own scale (degrees from the tonic)
export function tuningFiles(song, { mode = null, base = 'tuning' } = {}) {
  const key = parseKey(song.key) ?? { tonic: 0, mode: 'major' }
  const out = {}
  if (mode && mode.iv.some(v => Math.abs(v - Math.round(v)) > 1e-6)) {
    const deg = mode.iv.map(v => v * 100), tonic = key.tonic
    const names = mode.iv.map(v => spellParts(60 + tonic + v, { ...key, steps: mode.iv, system: mode.system }).name)
    const ref = 60 + Math.round(tonic), hz = freqOf(60 + tonic)
    const desc = `${song.name}: ${mode.name} on ${names[0]}`
    out[`${base}.scl`] = scl(desc, deg)
    out[`${base}.kbm`] = kbm(ref, hz, deg.length)
    out[`${base}.ascl`] = ascl(desc, deg, { names, refIndex: 0, refHz: hz })
    return out
  }
  const off = song.tuning?.offsets ?? temperOffsets(song.tuning?.id ?? 'equal', key) ?? new Array(12).fill(0)
  const deg = off.map((o, p) => 100 * p + o - off[0])
  const names = Array.from({ length: 12 }, (_, p) => spellParts(60 + p, key).name)
  const desc = `${song.name}: ${temperOf(song.tuning?.id).name} (${keyName(key)})`
  out[`${base}.scl`] = scl(desc, deg)
  out[`${base}.kbm`] = kbm(60, freqOf(60 + off[0] / 100), 12)
  out[`${base}.ascl`] = ascl(desc, deg, { names, refHz: freqOf(60 + off[0] / 100) })
  return out
}
