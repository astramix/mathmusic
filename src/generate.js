// The song generator — no AI, just music theory, the melody library and dice with a seed.
//
//   generate({ style, seed }) → { source, meta }: the source of an ordinary song file (it imports the
//   engine and the instruments like every hand-written song), deterministic for its seeds.
//
// How a song is made:
//   1. the style (STYLES) gives tempo, keys, forms, instruments for each role, grooves, voicings;
//   2. the arrangement seed picks key, tempo and a form: sections with roles (intro, theme, theme II,
//      bridge, solo, break, final, outro) and their energy;
//   3. the melody seed picks themes from the library (src/melodies.js — melodies of the other songs,
//      each with its own harmony) and varies them: as written, ornamented, or recomposed — the same
//      rhythm with new pitches written by voice-leading rules over the theme's chords. The themes
//      move to the new key (and mode, with the leading tone over V, the accidentals following the
//      chord). The bridge gets a new progression and a newly composed melody;
//   4. the instrument seed picks a sound for every role from the style's palette;
//   5. chords are voiced with smooth voice leading, the bass gets the style's pattern (roots, fifths,
//      octaves, chromatic approach notes), drums the style's grooves with fills; computed parts are
//      added: an improvised solo, a counter-melody from the chords, a canon, a 4:3 arpeggio, the
//      theme at half speed in the outro, a key change up in the final chorus of pop styles.
// "Another one like this" = the same seeds except the melody seed.
// opts.mode (an id of src/modes.js — dorian, phrygian, hirajoshi, blues…): the song is made in the major or minor
// with the same third, then every pitch moves into the mode by its scale degree (D minor → D dorian: B♭ → B♮,
// the chords follow: iv becomes IV); scales of other sizes take the nearest note of the scale. Microtonal modes
// work the same way — C major → C Rast puts E𝄳 and B𝄳 in the melody and the chords (C–E𝄳–G is a neutral triad, "Cn");
// a quarter-tone tonic (Sikah on E𝄳) is made on its neighbour and moved down a quarter tone at the end.
// opts.micro ('quarter' | 'eighth', or the modes quarter24 / eighth48): microtonal writing in the melodies — neutral
// steps, quarter-tone passing notes and slides, or the eighth tones of expressive intonation (microMelody below).
// opts.temperament (an id of src/tuning.js): the song sounds in that tuning — Werckmeister III, just intonation,
// ¼-comma meantone by the spelling, adaptive just intonation on every chord… (the notes stay as written).
// None of these options draws on the other dice: without them a seed gives exactly the song it always gave.
import { MELODIES, PROGRESSIONS } from './melodies.js'
import { parseKey, roman, voiceLead, spell, keyName, keyLabel, SCALES, pc, chordName, QUALITIES } from './theory.js'
import { composeFugue, fugueMode } from './fugue.js'
import { at as pitchAt } from './counterpoint.js'
import { composeMaqam, MAQAMAT, IQA } from './maqam.js'
import { composeRaga, RAGAS, shrutiCents, THEKA } from './raga.js'
import { composeGamelan, PATHET, LARAS, FORMS } from './gamelan.js'
import { modeOf, parentMode, keyWithMode, MODES } from './modes.js'
import { temperOf, temperOffsets } from './tuning.js'

// ---- randomness ----------------------------------------------------------------------------------
export function rng(seed) {
  let a = (seed >>> 0) ^ 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, a) => a[Math.floor(r() * a.length)]
const weighted = (r, items) => { // [[item, weight], …]
  const total = items.reduce((s, [, w]) => s + w, 0)
  let u = r() * total
  for (const [it, w] of items) if ((u -= w) <= 0) return it
  return items[items.length - 1][0]
}
const shuffle = (r, a) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
const round = v => +(+v).toFixed(4)
const midiOf = name => {
  const m = String(name).match(/^([A-G])(#|♯|b|♭)?(-?\d)$/)
  return 12 * (+m[3] + 1) + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1])] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0)
}

// ---- styles ----------------------------------------------------------------------------------------
// Sections: [name, bars, role, energy 0–3, opts]. role ∈ intro theme themeB bridge solo break final outro.
// Drum patterns: 16 steps per bar; x = hit, o = ghost (soft), - = rest.
export const STYLES = {
  lofi: {
    label: 'Лоу-фай хип-хоп', emoji: '☕', theme: 'lofi', bpm: [72, 86], swing: 0.6,
    themes: { 'lofi-flute': 4, 'lofi-flute-2': 4, 'template-flute': 3, 'bossa-theme': 2, 'meow-verse': 1, 'void-orbit': 1.5, 'chip-cave': 1, 'synthwave-lead': 1 },
    keys: ['F', 'Eb', 'Ab', 'D', 'Bb', 'G', 'Dm', 'Cm', 'Fm', 'Am'], moods: ['calm', 'jazzy', 'warm', 'night'],
    voicing: 'rootless', chordRange: [53, 77], bassRange: [33, 50],
    lead: ['flute', 'vibes', 'epiano'], lead2: ['vibes', 'piano', 'marimba'], chords: ['rhodes', 'piano'], bass: ['upright', 'warmbass'],
    pad: ['strings'], arp: ['piano', 'marimba'], texture: ['rain', 'vinyl'], kit: 'boombap',
    forms: [
      [['intro', 4, 'intro', 0], ['theme', 8, 'theme', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['break', 4, 'break', 0], ['final', 8, 'final', 3], ['outro', 4, 'outro', 0]],
      [['rain', 4, 'intro', 0], ['beat', 8, 'theme', 2], ['solo', 8, 'solo', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['final', 8, 'final', 3], ['sleep', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-----x-x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-', open: '--------------x-' },
      busy: { kick: 'x-----x-x-x-----', snare: '----x--o----x---', hat: 'x-x-x-x-x-x-x-x-', open: '------x-------x-' },
      light: { kick: 'x---------x-----', rim: '----x-------x---', hat: '--x---x---x---x-' },
      fill: { snare: '--------x-o-xoxx' },
    },
    comp: { 0: [[0, 0.55, 4]], 1: [[0, 0.6, 2.5], [2.5, 0.45, 1.5]], 2: [[0, 0.75, 1.6], [1.6, 0.45, 1.4], [3, 0.5, 1]], 3: [[0, 0.8, 1.6], [1.6, 0.5, 1.4], [3, 0.55, 1]] },
    bassline: [[0, 'R', 1.4], [1.6, 'R', 0.9], [3, '5', 0.9]],
    arpStep: 0.5, arpPoly: true,
  },
  bossa: {
    label: 'Босса-нова', emoji: '🌴', theme: 'bossa', bpm: [116, 136], swing: 0.5,
    themes: { 'bossa-theme': 5, 'bossa-bridge': 4, 'lofi-flute': 2, 'lofi-flute-2': 2, 'meow-chorus': 1, 'template-flute': 1.5, 'kawaii-hook': 1 },
    keys: ['C', 'F', 'G', 'D', 'Bb', 'Eb', 'Am', 'Dm'], moods: ['jazzy', 'warm', 'sunny', 'calm'],
    voicing: 'rootless', chordRange: [52, 74], bassRange: [33, 50],
    lead: ['vibes', 'flute', 'scat'], lead2: ['piano', 'vibes', 'flute'], chords: ['guitar'], bass: ['upright'],
    pad: ['strings'], arp: ['vibes', 'marimba'], texture: [null], kit: 'bossa',
    forms: [
      [['intro', 4, 'intro', 1], ['theme', 8, 'theme', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 2], ['solo', 8, 'solo', 2], ['final', 8, 'final', 3], ['tag', 6, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['theme', 8, 'theme', 2], ['solo', 8, 'solo', 2], ['bridge', 8, 'bridge', 2], ['theme II', 8, 'themeB', 2], ['final', 8, 'final', 3], ['tag', 6, 'outro', 1]],
    ],
    drums: {
      full: { kick: 'x-----x-x-----x-', rim: 'x--x--x---x--x--', shaker: 'xoxoxoxoxoxoxoxo', brush: '----x-------x---' },
      busy: { kick: 'x-----x-x-----x-', rim: 'x--x--x---x--x--', shaker: 'xoxoxoxoxoxoxoxo', ride: 'x---x-x-x---x-x-' },
      light: { shaker: 'xoxoxoxoxoxoxoxo', kick: 'x-------x-------' },
      fill: { rim: '------------x-xx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.5, 0.7], [0.75, 0.4, 0.7], [1.5, 0.45, 1], [2.5, 0.4, 0.7], [3.25, 0.45, 0.7]], 2: [[0, 0.55, 0.7], [0.75, 0.45, 0.7], [1.5, 0.5, 1], [2.5, 0.45, 0.7], [3.25, 0.5, 0.7]], 3: [[0, 0.6, 0.7], [0.75, 0.5, 0.7], [1.5, 0.55, 1], [2.5, 0.5, 0.7], [3.25, 0.55, 0.7]] },
    bassline: [[0, 'R', 1.4], [1.5, '5', 1.9], [3.5, 'R', 0.45]],
    arpStep: 0.75, arpPoly: true,
  },
  chiptune: {
    label: '8-бит, игра', emoji: '👾', theme: 'chip', bpm: [138, 160], swing: 0.5,
    themes: { 'chip-level': 4, 'chip-level-b': 4, 'chip-cave': 2, 'chip-boss': 2, 'kawaii-hook': 2, 'meow-chorus': 1.5, 'void-orbit': 1.5 },
    keys: ['C', 'G', 'D', 'F', 'A', 'Am', 'Em', 'Dm', 'Cm'], moods: ['bright', 'game', 'sunny', 'epic'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 52],
    lead: ['pulse'], lead2: ['pulse12'], chords: ['chiparp'], bass: ['triangle'], pad: [null], arp: ['pulsearp'], texture: [null], kit: 'chip',
    forms: [
      [['title', 4, 'intro', 1], ['level 1', 8, 'theme', 2], ['level 1 B', 8, 'themeB', 2], ['cave', 8, 'bridge', 1], ['boss', 8, 'solo', 3], ['level 2', 8, 'final', 3, { keyUp: 2 }], ['credits', 6, 'outro', 1]],
      [['title', 4, 'intro', 1], ['world', 8, 'theme', 2], ['underground', 8, 'bridge', 1], ['world B', 8, 'themeB', 2], ['sky', 8, 'solo', 3], ['castle', 8, 'final', 3, { keyUp: 1 }], ['the end', 4, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      busy: { kick: 'x-----x-x-------', snare: '----x-------x-x-', hat: 'xxxxxxxxxxxxxxxx' },
      light: { kick: 'x-------x-------', hat: '--x---x---x---x-' },
      fill: { snare: '--------xxxxxxxx' },
    },
    comp: null, bassline: [[0, 'R', 0.4], [0.5, '8', 0.4], [1, 'R', 0.4], [1.5, '8', 0.4], [2, 'R', 0.4], [2.5, '8', 0.4], [3, '5', 0.4], [3.5, '8', 0.4]],
    arpStep: 0.25, arpPoly: false,
  },
  synthwave: {
    label: 'Синтвейв', emoji: '🌆', theme: 'synth', bpm: [96, 118], swing: 0.5,
    themes: { 'synthwave-lead': 5, 'void-orbit': 3, 'void-nebula': 3, 'chip-cave': 1.5, 'template-flute': 2, 'kawaii-hook': 1 },
    keys: ['Em', 'Am', 'Dm', 'F#m', 'Cm', 'Bm', 'C', 'F'], moods: ['epic', 'night', 'dark'],
    voicing: 'close', chordRange: [52, 76], bassRange: [28, 45],
    lead: ['sawlead'], lead2: ['sawlead', 'pulse'], chords: ['sawpad'], bass: ['octbass'], pad: ['strings'], arp: ['sawarp'], texture: [null], kit: 'electro',
    forms: [
      [['sunset', 8, 'intro', 1], ['drive', 8, 'theme', 2], ['neon', 8, 'themeB', 2], ['tunnel', 8, 'bridge', 1], ['overdrive', 8, 'solo', 3], ['final drive', 8, 'final', 3], ['fade', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-' },
      busy: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'x-xxx-xxx-xxx-xx' },
      light: { kick: 'x-------x-------', hat: '--x---x---x---x-' },
      fill: { tom: '--------x-x-xxxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.6, 4]], 2: [[0, 0.7, 4]], 3: [[0, 0.8, 4]] },
    bassline: 'eighths', arpStep: 0.25, arpPoly: false,
  },
  // Baroque and Classical: Bach, Mozart, Haydn, Beethoven — harpsichord or pipe organ continuo, a Bach prelude figure
  // or an Alberti bass on the piano, violin / oboe / flute / clarinet leads, harp, timpani
  classical: {
    label: 'Барокко и классицизм', emoji: '🎻', theme: 'classical', bpm: [68, 96], swing: 0.5,
    themes: { canon: 4, 'canon-halves': 3, 'bach-fugue': 4, 'bach-toccata': 3, 'mozart-nachtmusik': 4, 'mozart-40': 4, 'beethoven-joy': 3, 'beethoven-fate': 3, 'void-orbit': 0.5, 'template-flute': 0.5 },
    keys: ['D', 'G', 'C', 'A', 'F', 'Bb', 'Dm', 'Am', 'Gm', 'Cm'], moods: ['classical', 'warm', 'epic', 'calm'],
    voicing: 'close', chordRange: [50, 74], bassRange: [31, 50],
    lead: ['violin', 'oboe', 'flute'], lead2: ['violin', 'flute', 'oboe', 'clarinet'], chords: ['harpsichord', 'alberti', 'prelude', 'pipeorgan'], bass: ['cello'], pad: ['strings'], arp: ['harpsichordarp', 'harp'], texture: [null], kit: 'orchestral',
    forms: [
      [['prelude', 4, 'intro', 0], ['theme', 8, 'theme', 1], ['canon', 8, 'final', 2, { canon: true }], ['episode', 8, 'bridge', 1], ['theme II', 8, 'themeB', 2], ['cadenza', 8, 'solo', 2], ['finale', 8, 'final', 3, { canon: true }], ['coda', 4, 'outro', 0]],
    ],
    drums: {
      full: { timp: 'x-------x-------' }, busy: { timp: 'x-------x---x-x-' }, light: { timp: 'x---------------' }, fill: { timp: '--------x-x-xxxx' },
    },
    comp: { 0: [[0, 0.4, 2], [2, 0.35, 2]], 1: [[0, 0.45, 1], [1, 0.3, 1], [2, 0.4, 1], [3, 0.3, 1]], 2: [[0, 0.5, 1], [1, 0.35, 1], [2, 0.45, 1], [3, 0.35, 1]], 3: [[0, 0.55, 0.5], [0.5, 0.3, 0.5], [1, 0.4, 0.5], [1.5, 0.3, 0.5], [2, 0.5, 0.5], [2.5, 0.3, 0.5], [3, 0.4, 0.5], [3.5, 0.3, 0.5]] },
    bassline: [[0, 'R', 0.95], [1, 'R', 0.95], [2, '5', 0.95], [3, '8', 0.95]],
    arpStep: 0.25, arpPoly: false,
  },
  // A canon and a three-voice fugue composed by the rules of counterpoint (src/counterpoint.js, src/fugue.js): a subject
  // by rule, a tonal or real answer, an invertible countersubject, episodes by sequence down the circle of fifths,
  // middle entries in the relative key and the subdominant, a stretto, a coda with a Picardy third — on a chamber
  // ensemble, strings, the organ or the harpsichord (generateFugue). A church mode makes a modal fugue.
  fugue: {
    label: 'Фуга и канон', emoji: '🎹', theme: 'classical', bpm: [60, 80], swing: 0.5,
    keys: ['Dm', 'Gm', 'Cm', 'Am', 'Em', 'Fm', 'Bm', 'C', 'D', 'G', 'F', 'Bb', 'Eb', 'A'], moods: ['classical'],
    about: 'канон в октаву и трёхголосная фуга по правилам контрапункта: тема, тональный/реальный ответ, обратимое противосложение, интермедии-секвенции, средние проведения, стретта, кода с пикардийской терцией · камерный ансамбль / струнные / орган / клавесин',
    lead: ['violin', 'flute', 'organ', 'harpsichord'], chords: ['continuo'], bass: ['cello', 'pedal 16′'], kit: '—', forms: [], drums: {}, themes: {},
  },
  // Arabic music in quarter tones (src/maqam.js): a maqam's sayr in phrases AA′BA, a tahwil to a related maqam, taqsims
  // over a drone, heterophony of a takht (oud, qanun, ney, violin, cello), the iqa' on darbuka and riq (generateMaqam)
  maqam: {
    label: 'Макам', emoji: '🪘', theme: 'desert', bpm: [88, 112], swing: 0.5,
    keys: ['D', 'C', 'G'], moods: ['world'],
    about: 'арабский макам в четвертитонах: баяти, раст, саба, хиджаз, сика, хузам, сузнак, ирак — сайр (нижний джинс → гаммаз → верх → кафла), тахвиль в родственный макам, таксимы уда и ная, гетерофония такхта, икаа на дарбуке и рике',
    lead: ['oud', 'qanun', 'ney', 'violin'], chords: ['—'], bass: ['cello'], kit: 'darbuka, riq', forms: [], drums: {}, themes: {},
  },
  // A Hindustani raga (src/raga.js): alap, jor, gat and antara in teentaal, taans with sawal-jawab and tihais, jhala — sitar
  // with tarab strings and chikari, bansuri, tanpura, tabla, swarmandal, manjira, in the raga's shrutis (generateRaga)
  raga: {
    label: 'Рага', emoji: '🪷', theme: 'india', bpm: [72, 92], swing: 0.5,
    keys: ['D', 'C'], moods: ['world'],
    about: 'хиндустани: Яман, Бхайрав, Бхупали, Бхимпаласи, Дарбари, Малкаунс — алап, джор, гат в тинтале, таны с ответами бансури, тихаи на сам, джхала; ситар с тарабом, танпура, табла; строй — шрути раги (чистые интервалы, ати-комал у Дарбари)',
    lead: ['sitar', 'bansuri'], chords: ['tanpura'], bass: ['—'], kit: 'tabla, manjira', forms: [], drums: {}, themes: {},
  },
  // Central Javanese gamelan in the measured slendro and pelog (src/gamelan.js): colotomic cycles (ketawang, ladrang), the
  // balungan in gatras, the garap of peking and bonang, irama II, the suling, every bronze a beating pair (generateGamelan)
  gamelan: {
    label: 'Гамелан', emoji: '🔔', theme: 'java', bpm: [60, 76], swing: 0.5,
    keys: ['D'], moods: ['world'],
    about: 'яванский гамелан в измеренных строях слендро и пелог (Kyai Madu Laras): кетаванг и ладранг, колотомия гонга, кенонга, кемпула, кетука, балунган по гатрам, гарап пекинга и бонанга, ирама II, сулинг, омбак — биения парных инструментов',
    lead: ['saron', 'bonang', 'suling'], chords: ['—'], bass: ['gong', 'kempul'], kit: 'kendhang', forms: [], drums: {}, themes: {},
  },
  // Jazz: heads of our own on ii – V – I changes (A/B rootless voicings), a walking bass, a swing kit (ride "ding ding-a
  // ding", hi-hat on 2 and 4, feathered kick, snare comping; brushes when quiet), piano comping in the Charleston rhythm, a
  // solo over the changes, trading fours with the drums, the head out with the horns in harmony
  jazz: {
    label: 'Джаз', emoji: '🎷', theme: 'jazz', bpm: [116, 168], swing: 0.66,
    themes: { 'jazz-corner': 5, 'jazz-rhythm': 5, 'jazz-night': 5 },
    keys: ['F', 'Bb', 'Eb', 'C', 'G', 'Ab'], moods: ['jazzy', 'night'],
    voicing: 'jazz', chordRange: [52, 72], bassRange: [28, 43],
    lead: ['sax', 'trumpet', 'sax'], lead2: ['sax', 'trumpet', 'vibes'], chords: ['piano', 'rhodes'], bass: ['upright'],
    pad: [null], arp: [null], texture: ['club'], kit: 'jazz',
    forms: [
      [['intro', 4, 'intro', 1], ['head', 16, 'theme', 2], ['bridge', 8, 'themeB', 2], ['head', 8, 'theme', 2], ['solo', 16, 'solo', 2], ['trading fours', 16, 'trade', 3], ['head out', 16, 'final', 3], ['tag', 4, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['head', 16, 'theme', 2], ['bridge', 8, 'themeB', 1], ['solo', 16, 'solo', 2], ['trading fours', 16, 'trade', 3], ['head out', 16, 'final', 2], ['tag', 4, 'outro', 1]],
    ],
    drums: {
      full: { ride: 'x---x-x-x---x-x-', hat: '----x-------x---', kick: 'o---o---o---o---', snare: '------o-------o-' },
      busy: { ride: 'x---x-x-x---x-x-', hat: '----x-------x---', kick: 'o---o---o--xo---', snare: '--o---o-o---o-oo' },
      light: { brush: 'x---x---x---x---', hat: '----x-------x---' },
      fill: { snare: '--------x-xxx-x-', kick: '--------------x-' },
    },
    // piano comping by energy: a whole note; the Charleston (1, the "and" of 2 — swung); anticipations; busier
    comp: { 0: [[0, 0.5, 3.5]], 1: [[0, 0.5, 1.4], [1.66, 0.42, 1.2]], 2: [[0, 0.5, 1.3], [1.66, 0.45, 0.9], [3.66, 0.42, 0.3]], 3: [[0.66, 0.5, 0.8], [2, 0.45, 0.6], [2.66, 0.5, 1]] },
    bassline: 'walking', arpStep: 0.5, arpPoly: false,
  },
  // the Romantic orchestra: Tchaikovsky, Grieg, Dvořák, Chopin — horn, oboe or a singing cello over a nocturne piano,
  // harp rolls, a brass choir, celesta, strings and a choir; timpani
  romantic: {
    label: 'Романтический оркестр', emoji: '🎼', theme: 'romantic', bpm: [64, 92], swing: 0.5,
    themes: { 'romance-tchaikovsky': 5, 'nocturne-chopin': 5, 'dvorak-largo': 4, 'grieg-mountain': 3, 'beethoven-joy': 1.5, 'mozart-40': 1.5, 'beethoven-fate': 1.5, 'canon-halves': 1 },
    keys: ['Bm', 'Eb', 'Db', 'Gm', 'Em', 'F', 'Ab', 'Cm', 'D', 'Fm'], moods: ['classical', 'warm', 'dark', 'epic'],
    voicing: 'close', chordRange: [48, 72], bassRange: [28, 48],
    lead: ['horn', 'oboe', 'violin', 'cellolead'], lead2: ['clarinet', 'flute', 'violin', 'celesta'], chords: ['nocturne', 'harpchords', 'brasschoir'], bass: ['cello', 'upright'], pad: ['strings', 'choirpad'], arp: ['harp', 'celesta'], texture: [null], kit: 'orchestral',
    forms: [
      [['introduction', 4, 'intro', 0], ['theme', 8, 'theme', 1], ['theme II', 8, 'themeB', 2], ['development', 8, 'bridge', 2], ['cadenza', 8, 'solo', 1], ['finale', 8, 'final', 3, { canon: true }], ['coda', 6, 'outro', 0]],
      [['introduction', 4, 'intro', 0], ['theme II', 8, 'themeB', 1], ['theme', 8, 'theme', 2], ['storm', 8, 'bridge', 3], ['nocturne', 8, 'solo', 1], ['finale', 8, 'final', 3, { keyUp: 1 }], ['coda', 6, 'outro', 0]],
    ],
    drums: {
      full: { timp: 'x-------x-------' }, busy: { timp: 'x-------x---x-x-' }, light: { timp: 'x---------------' }, fill: { timp: '--------x-xxxxxx' },
    },
    comp: { 0: [[0, 0.4, 4]], 1: [[0, 0.45, 2], [2, 0.35, 2]], 2: [[0, 0.5, 2], [2, 0.4, 2]], 3: [[0, 0.6, 1.5], [1.5, 0.45, 1], [2.5, 0.5, 1.5]] },
    bassline: [[0, 'R', 1.9], [2, '5', 1.9]],
    arpStep: 0.5, arpPoly: true,
  },
  // A Japanese battle: shinobue or shakuhachi over koto and shamisen, horn stabs, timpani as the bass, a taiko
  // ensemble — and the boss machinery underneath: a hardstyle kick on the tonic, the reverse bass, the sidechain in
  // the drops, build-ups with a run to the dominant. Themes from songs/raiden, kagekiri, oni-matsuri, shogun-requiem.
  jbattle: {
    label: 'Японская битва', emoji: '⛩️', theme: 'ink', bpm: [140, 164], swing: 0.5, hard: true,
    themes: { 'raiden-theme': 5, 'raiden-eternity': 3, 'kagekiri-theme': 5, 'oni-theme': 4, 'shogun-theme': 4, 'shogun-clash': 4 },
    keys: ['Em', 'Dm', 'Am', 'Cm', 'F#m', 'Bm', 'Gm', 'C#m'], moods: ['epic', 'dark', 'game'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['shinobue', 'shakuhachi'], lead2: ['koto', 'shamisen'], chords: ['hornstabs'], bass: ['timpani'], pad: ['strings'], arp: ['kotoarp'], texture: ['thunder'], kit: 'taiko',
    forms: [
      [['kaminari', 4, 'intro', 1], ['bayashi', 8, 'themeB', 2], ['build', 4, 'build', 2], ['storm', 16, 'theme', 3], ['sakoku', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['duel', 8, 'solo', 3], ['final storm', 16, 'final', 3, { keyUp: 2 }], ['zanshin', 4, 'outro', 0]],
      [['iai', 2, 'intro', 1], ['kamae', 8, 'themeB', 2], ['build', 4, 'build', 2], ['kagekiri', 16, 'theme', 3], ['koto solo', 8, 'solo', 2], ['tsuki', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final kessen', 16, 'final', 3, { keyUp: 1 }], ['yoake', 4, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3]], 1: [[0, 0.55, 3.5]], 2: [[0, 0.7, 1.5], [2.5, 0.6, 1.5]], 3: [[0, 0.9, 1.5], [1.5, 0.75, 1.5], [3, 0.6, 1]] },
    bassline: [[0, 'R', 0.9], [1.5, 'R', 0.4], [2, '5', 0.9], [3, 'R', 0.9]], arpStep: 0.25, arpPoly: false,
  },
  kawaii: {
    label: 'Аниме J-pop', emoji: '🌸', theme: 'kawaii', bpm: [160, 176], swing: 0.5,
    themes: { 'kawaii-hook': 5, 'meow-chorus': 3, 'chip-level': 3, 'chip-level-b': 2, 'meow-verse': 2, canon: 1 },
    keys: ['A', 'E', 'D', 'G', 'C', 'F'], moods: ['bright', 'pop', 'sunny', 'cute'],
    voicing: 'close', chordRange: [55, 79], bassRange: [33, 52],
    lead: ['pulse', 'sawlead'], lead2: ['bells', 'pulse12'], chords: ['sawpad'], bass: ['octbass'], pad: [null], arp: ['bells'], texture: [null], kit: 'electro',
    forms: [
      [['kira-kira', 4, 'intro', 1], ['verse', 8, 'themeB', 1], ['chorus', 8, 'theme', 3], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['key up!', 8, 'final', 3, { keyUp: 1 }], ['♪', 4, 'outro', 1]],
    ],
    drums: {
      full: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-', open: '------x-------x-' },
      busy: { kick: 'x---x---x---x-x-', snare: '----x-------x---', hat: 'xxxxxxxxxxxxxxxx' },
      light: { kick: 'x-------x-------', hat: 'x-x-x-x-x-x-x-x-' },
      fill: { snare: '--------x-xxxxxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.6, 4]], 2: [[0, 0.7, 4]], 3: [[0, 0.8, 4]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  space: {
    label: 'Космос, эмбиент', emoji: '🌌', theme: 'void', bpm: [70, 96], swing: 0.5,
    themes: { 'void-orbit': 4, 'void-nebula': 4, 'canon-halves': 3, 'synthwave-lead': 2, 'template-flute': 2, 'chip-cave': 1 },
    keys: ['Dm', 'Em', 'Am', 'Cm', 'F#m', 'D', 'F'], moods: ['space', 'dark', 'calm', 'epic'],
    voicing: 'close', chordRange: [50, 74], bassRange: [26, 45],
    lead: ['bells', 'choir'], lead2: ['sawlead', 'flute'], chords: ['organ'], bass: ['warmbass'], pad: ['strings', 'choirpad'], arp: ['bells'], texture: ['wind'], kit: 'space',
    forms: [
      [['launch', 4, 'intro', 0], ['orbit', 8, 'theme', 1], ['nebula', 8, 'themeB', 2], ['dark side', 8, 'bridge', 1], ['pulsar', 8, 'solo', 2], ['eclipse', 8, 'final', 3, { canon: true }], ['silence', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-------', snare: '--------x-------', hat: '--x---x---x---x-' },
      busy: { kick: 'x-----x-x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      light: { kick: 'x---------------' },
      fill: { snare: '------------xxxx' },
    },
    comp: { 0: [[0, 0.5, 8]], 1: [[0, 0.55, 4]], 2: [[0, 0.6, 4]], 3: [[0, 0.7, 4]] },
    bassline: [[0, 'R', 3.8]], arpStep: 0.75, arpPoly: true,
  },
  meow: {
    label: 'Кошачий поп', emoji: '🐱', theme: 'meow', bpm: [96, 112], swing: 0.5,
    themes: { 'meow-verse': 5, 'meow-chorus': 5, 'kawaii-hook': 2, 'chip-level': 1.5, 'lofi-flute': 1 },
    keys: ['F', 'G', 'C', 'D', 'Bb', 'A'], moods: ['cute', 'bright', 'pop', 'sunny'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 50],
    lead: ['meow'], lead2: ['bells', 'vibes'], chords: ['piano', 'rhodes'], bass: ['warmbass'], pad: ['strings'], arp: ['bells', 'marimba'], texture: ['purr'], kit: 'boombap',
    forms: [
      [['purr', 4, 'intro', 0], ['meow', 8, 'themeB', 2], ['two cats', 8, 'theme', 3], ['nap', 8, 'bridge', 1], ['music box', 8, 'solo', 2], ['all cats', 8, 'final', 3, { keyUp: 2 }], ['zzz', 4, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-x-----', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      busy: { kick: 'x-----x-x-x-----', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-xx', open: '------x---------' },
      light: { kick: 'x-------x-------', hat: '----x-------x---' },
      fill: { snare: '------------xoxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.55, 2], [2, 0.45, 2]], 2: [[0, 0.6, 1.5], [1.5, 0.45, 1], [2.5, 0.5, 1.5]], 3: [[0, 0.65, 1.5], [1.5, 0.5, 1], [2.5, 0.55, 1.5]] },
    bassline: [[0, 'R', 0.9], [1.5, '5', 0.4], [2, '8', 0.9], [3, '5', 0.9]], arpStep: 0.5, arpPoly: false,
  },
  // Boss music — the sound of overclock and finalbattle: a hardstyle kick tuned to the tonic, a reverse bass
  // between the kicks (rolling in the final), everything ducking under the kick, a supersaw hook, a chip lead,
  // brass stabs, the 60 Hz chip arpeggio, build-ups with a snare roll and a riser. Roles: 'build' is the
  // countdown before a drop (VI – VII – V – V, a run up to the dominant); energy 3 = a drop.
  boss: {
    label: 'Босс-битва', emoji: '⚔️', theme: 'chip', bpm: [148, 164], swing: 0.5,
    themes: { 'boss-ascent': 5, 'boss-requiem': 5, 'boss-overdrive': 5, 'overclock-hook': 3, 'finalbattle-theme': 3, 'chip-boss': 1 },
    keys: ['F#m', 'Em', 'Gm', 'Am', 'Dm', 'Cm', 'Bm', 'C#m'], moods: ['epic', 'dark', 'game'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['supersaw'], lead2: ['pulse', 'pulse12'], chords: ['brass'], bass: ['growl', 'chiptri'], pad: ['strings'], arp: ['chip60'], texture: ['riser'], kit: 'hardstyle',
    forms: [
      [['boot', 4, 'intro', 1], ['theme', 8, 'themeB', 2], ['build', 4, 'build', 2], ['drop', 16, 'theme', 3], ['break', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['equation', 8, 'solo', 3], ['final', 16, 'final', 3, { keyUp: 2 }], ['shutdown', 4, 'outro', 0]],
      [['encounter', 2, 'intro', 1], ['menu', 8, 'themeB', 2], ['attack', 4, 'build', 2], ['phase 1', 16, 'theme', 3], ['equation', 8, 'solo', 3], ['mercy', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final phase', 16, 'final', 3, { keyUp: 3 }], ['victory', 4, 'outro', 0]],
    ],
    drums: {},
    // brass stabs per bar, by energy: one long chord when calm, 1 and the "and" of 3 in the chip sections, 3-3-2 in the drops
    comp: { 0: [[0, 0.5, 3]], 1: [[0, 0.55, 3.5]], 2: [[0, 0.7, 1.5], [2.5, 0.6, 1.5]], 3: [[0, 0.9, 1.5], [1.5, 0.75, 1.5], [3, 0.6, 1]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
}
export const STYLE_LIST = Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, emoji: s.emoji }))

// ---- melodies → a key ------------------------------------------------------------------------------
const MAJ = SCALES.major, MIN = SCALES.minor
// semitones above the tonic → { deg (0–6), oct, alt } in a mode (the leading tone of minor = deg 6, alt +1)
function toDegree(s, mode) {
  const sc = mode === 'minor' ? MIN : MAJ, oct = Math.floor(s / 12), p = ((s % 12) + 12) % 12
  const d = sc.indexOf(p)
  if (d >= 0) return { deg: d, oct, alt: 0 }
  const below = sc.findLastIndex(v => v < p)
  return { deg: below, oct, alt: p - sc[below] }
}
// Theme in a new key: notes in MIDI, chords as objects. Same mode: a plain transposition. Other mode
// (modal themes only): degrees map; a degree's accidental follows the chord sounding over it.
export function adaptTheme(mel, key) {
  const src = parseKey(mel.key), base = midiOf(mel.base)
  const tonicSrc = Math.floor((base - src.tonic) / 12) * 12 + src.tonic // a tonic at or below the base
  const per = mel.per, n = mel.chords.length, length = per * n
  const chordsSrc = mel.chords.map(s => roman(s, src))
  let chords, notes
  if (src.mode === key.mode) {
    const shift = ((key.tonic - src.tonic + 18) % 12) - 6 // the nearer direction
    chords = mel.chords.map(s => roman(s, key))
    notes = mel.notes.map(([b, m, d]) => [b, base + m + shift, d])
  } else {
    chords = mel.chords.map(s => roman(swapMode(s, src.mode), key))
    const sc = key.mode === 'minor' ? MIN : MAJ
    const shift = ((key.tonic - src.tonic + 18) % 12) - 6
    notes = mel.notes.map(([b, m, d]) => {
      const s = base + m - tonicSrc, dg = toDegree(s, src.mode)
      let alt = src.mode === 'minor' && dg.deg === 6 && dg.alt === 1 ? 0 : dg.alt // leading tone → the major 7th
      if (src.mode === 'minor' && dg.deg === 5 && dg.alt === 1) alt = 0 // melodic-minor 6th → major 6th
      const ch = chords[Math.floor(b / per) % n], root = tonicSrc + shift + 12 * dg.oct + sc[dg.deg]
      let midi = root + alt
      // the degree's accidental follows the chord: if the other variant is a chord tone, use it
      for (const v of [root - 1, root + 1, root]) if (v !== midi && ch.tones.includes(pc(v)) && !ch.tones.includes(pc(midi)) && Math.abs(v - root) <= 1) midi = v
      // the leading tone over the dominant in minor
      if (key.mode === 'minor' && dg.deg === 6 && pc(ch.root - key.tonic) === 7) midi = root + 1
      return [b, midi, d]
    })
  }
  return { id: mel.id, title: mel.title, from: mel.from, feel: mel.feel, per, length, chords, notes, chordsSrc }
}
const SWAP_MAJ_TO_MIN = { I: 'i', ii: 'iiø', iii: 'III', IV: 'iv', V: 'V', vi: 'VI', vii: 'VII' }
const SWAP_MIN_TO_MAJ = { i: 'I', ii: 'ii', III: 'iii', iv: 'IV', V: 'V', v: 'V', VI: 'vi', VII: 'bVII' }
function swapMode(sym, from) {
  const m = sym.match(/^(b|#)?(iv|i{1,3}|vi{0,2}|IV|I{1,3}|VI{0,2})(ø|°)?(.*)$/)
  if (!m || m[1]) return sym
  const [, , num, dim, q] = m
  const table = from === 'major' ? SWAP_MAJ_TO_MIN : SWAP_MIN_TO_MAJ
  let out = table[num] ?? num
  // qualities: drop what no longer fits the new chord's type
  let quality = q
  if (from === 'major') {
    if (num === 'I' || num === 'IV') quality = /maj|add|^$/.test(q) ? (q.includes('7') || q.includes('9') ? '7' : '') : q // i7, iv7
    else if (num === 'ii') quality = /7|9/.test(q) ? '7' : ''
    else if (num === 'iii' || num === 'vi') quality = /7|9/.test(q) ? 'maj7' : ''
    else if (num === 'V') quality = /13|9/.test(q) ? '7' : q.replace('add9', '')
  } else {
    if (num === 'i' || num === 'iv') quality = /7|9/.test(q) ? 'maj7' : ''
    else if (num === 'III' || num === 'VI') quality = /7/.test(q) ? '7' : ''
    if (num === 'ii') out = 'ii'
    if (dim) quality = '7'.repeat(q.includes('7') ? 1 : 0)
  }
  return out + quality
}

// ---- composing melodies -------------------------------------------------------------------------
// New pitches for a rhythm over chords: chord tones on strong beats and long notes, scale steps in
// between, an arch-shaped contour, leaps filled by steps the other way, cadence on the tonic (or on
// the fifth/second degree for an open "question" ending).
export function compose({ rhythm, chordAt, key, lo, hi, r, end = 'close' }) {
  const scale = (key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12)
  const out = []
  let prev = null, leap = 0
  const span = rhythm.length ? rhythm[rhythm.length - 1][0] + rhythm[rhythm.length - 1][1] : 1
  const peakAt = 0.45 + 0.3 * r(), height = (hi - lo) * (0.55 + 0.35 * r())
  rhythm.forEach(([b, d], i) => {
    const ch = chordAt(b), last = i === rhythm.length - 1
    const strong = (Math.abs(b - Math.round(b)) < 1e-6 && Math.round(b) % 2 === 0) || d >= 1.5
    let pcs = strong ? ch.tones : scale
    // over V in minor the scale has the leading tone, never the minor 7th
    if (key.mode === 'minor' && pc(ch.root - key.tonic) === 7) pcs = pcs.map(p => (p === (key.tonic + 10) % 12 ? (key.tonic + 11) % 12 : p))
    if (last) pcs = end === 'close' ? [key.tonic] : [(key.tonic + 7) % 12, (key.tonic + 2) % 12].filter(p => ch.tones.includes(p) || p === (key.tonic + 7) % 12)
    const u = b / span, target = lo + (hi - lo) * 0.25 + height * Math.max(0, 1 - Math.abs(u - peakAt) / Math.max(peakAt, 1 - peakAt))
    let best = null, bestCost = Infinity
    for (let m = lo; m <= hi; m++) {
      if (!pcs.includes(pc(m))) continue
      let cost = 0.35 * Math.abs(m - target)
      if (prev != null) {
        const iv = m - prev, a = Math.abs(iv)
        cost += a <= 2 ? 0 : a <= 4 ? 1 : a <= 7 ? 2.6 : 5 + a
        if (a === 6) cost += 6 // no tritone leaps
        if (a === 0) cost += out.length > 1 && out[out.length - 2][1] === prev ? 4 : 0.8 // not three in a row
        if (leap && Math.sign(iv) === Math.sign(leap)) cost += 2.5 // after a leap: step back
        if (key.mode === 'minor' && a === 3 && [pc(m), pc(prev)].every(p => [8, 11].includes((p - key.tonic + 12) % 12))) cost += 8 // no augmented second
      }
      cost += 1.6 * r()
      if (cost < bestCost) (bestCost = cost), (best = m)
    }
    if (best == null) best = prev ?? Math.round((lo + hi) / 2)
    leap = prev != null && Math.abs(best - prev) > 4 ? best - prev : 0
    prev = best
    out.push([b, best, d])
  })
  return out
}
// small variations of a theme: an upper neighbour on some long notes, passing tones in some leaps
function ornament(notes, key, chordAt, r) {
  const scale = (key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12)
  const out = []
  const scaleStep = (m, dir) => {
    let v = m + dir
    while (!scale.includes(pc(v))) v += dir
    return v
  }
  notes.forEach(([b, m, d], i) => {
    const next = notes[i + 1]
    // a turn at the end of a long note (upper neighbour and back), in its last quarter — on a weak part
    if (d >= 1.5 && r() < 0.35) {
      const q = d / 4
      out.push([b, m, d - q], [b + d - q, scaleStep(m, 1), q / 2], [b + d - q / 2, m, q / 2])
    } else if (next && Math.abs(next[1] - m) >= 3 && Math.abs(next[1] - m) <= 5 && d >= 1 && r() < 0.5) {
      // a passing tone into the next note, in the last quarter
      const q = d / 4, p = scaleStep(m, Math.sign(next[1] - m))
      out.push([b, m, d - q], [b + d - q, p, q])
    } else out.push([b, m, d])
  })
  return out
}

// ---- voicing ----------------------------------------------------------------------------------------
function chordTones(ch, style) {
  const ivs = ch.ivs
  if (style === 'rootless' && ivs.length >= 4) return ivs.slice(1).map(i => (ch.root + i) % 12) // 3–7–9(–13): the bass has the root
  // jazz: the rootless A/B voicings of the pianists — 3 5 7 9 on a maj7 or m7, 3 13 7 9 on a dominant, ♭3 ♭5 ♭7 11 on a ø7
  if (style === 'jazz' && ivs.length >= 4) {
    const q = ivs.join()
    const set = q === '0,4,7,10' ? [4, 9, 10, 2] : q === '0,3,6,10' ? [3, 6, 10, 5] : q === '0,3,6,9' ? [3, 6, 9, 0] : [ivs[1], ivs[2], ivs[3], 2]
    return set.map(i => (ch.root + i) % 12)
  }
  if (ivs.length >= 5) return [0, ivs[1], ivs[3], ivs[4]].map(i => (ch.root + i) % 12)
  return ivs.map(i => (ch.root + i) % 12)
}

// ---- the song plan ----------------------------------------------------------------------------------
const NAMES = {
  lofi: [['rainy', 'sleepy', 'velvet', 'amber', 'midnight', 'cozy', 'foggy'], ['cat', 'window', 'tram', 'tea', 'vinyl', 'balcony', 'letter']],
  bossa: [['seaside', 'golden', 'lazy', 'salty', 'sunny', 'coral'], ['café', 'breeze', 'hammock', 'harbor', 'sunset', 'samba']],
  chiptune: [['pixel', 'super', 'mega', 'tiny', 'turbo', 'hyper'], ['quest', 'castle', 'hero', 'dungeon', 'star', 'island']],
  synthwave: [['neon', 'chrome', 'midnight', 'laser', 'outrun', 'retro'], ['highway', 'city', 'sunset', 'grid', 'drive', 'arcade']],
  classical: [['little', 'grand', 'royal', 'gentle', 'baroque', 'autumn'], ['canon', 'suite', 'prelude', 'fugue', 'sonata', 'air']],
  kawaii: [['kira', 'sakura', 'sparkle', 'candy', 'magical', 'starry'], ['heart', 'dream', 'girl', 'sky', 'parade', 'wish']],
  space: [['silent', 'deep', 'cold', 'distant', 'dark', 'lunar'], ['orbit', 'nebula', 'comet', 'void', 'station', 'signal']],
  meow: [['fluffy', 'sleepy', 'tiny', 'ginger', 'purring', 'naughty'], ['kitten', 'paws', 'whiskers', 'tail', 'meow', 'nap']],
  boss: [['crimson', 'final', 'iron', 'binary', 'fatal', 'glitch', 'overclocked', 'null'], ['algorithm', 'kernel', 'protocol', 'overlord', 'core', 'equation', 'warden', 'daemon']],
  romantic: [['autumn', 'white', 'northern', 'moonlit', 'tender', 'stormy', 'distant'], ['romance', 'nocturne', 'ballade', 'elegy', 'serenade', 'rhapsody', 'waltz']],
  maqam: [['layali', 'nasim', 'qamar', 'sahra', 'bahr', 'nur', 'warda', 'shams'], ['al-andalus', 'dimashq', 'al-qahira', 'halab', 'baghdad', 'tunis', 'al-layl', 'as-subh']],
  raga: [['sandhya', 'prabhat', 'chandni', 'megh', 'nadi', 'deepak', 'basant', 'ratri'], ['ki-dhun', 'alap', 'vistar', 'jhala', 'tarang', 'bandish', 'swar', 'gat']],
  gamelan: [['ladrang', 'ketawang', 'gendhing', 'lancaran', 'bubaran'], ['wilujeng', 'pangkur', 'sekar-melati', 'udan-mas', 'kebo-giro', 'asmaradana', 'sri-rejeki', 'mega-mendung']],
  jazz: [['blue', 'midnight', 'smoky', 'late', 'velvet', 'uptown', 'moody', 'cool'], ['corner', 'train', 'avenue', 'session', 'lounge', 'walk', 'changes', 'stroll']],
  fugue: [['fuga', 'ricercar', 'contrapunctus', 'fughetta', 'canon-e-fuga'], ['dorica', 'notturna', 'aurea', 'di-vetro', 'serena', 'antica', 'stellata', 'd-inverno', 'del-lago']],
  jbattle: [['thunder', 'crimson', 'silent', 'moonlit', 'shadow', 'fox', 'iron', 'storm'], ['blade', 'shrine', 'ronin', 'oni', 'shogun', 'kitsune', 'lotus', 'raijin']],
}

export function generate(opts = {}) {
  const styleId = STYLES[opts.style] ? opts.style : 'lofi', S = STYLES[styleId]
  const seed = (opts.seed ?? 1) >>> 0
  const seeds = {
    arrangement: (opts.arrangement ?? seed) >>> 0,
    melody: (opts.melody ?? (seed * 7919 + 17)) >>> 0,
    instruments: (opts.instruments ?? (seed * 104729 + 3)) >>> 0,
  }
  // the fugue: its own composer (src/fugue.js) and writer
  if (styleId === 'fugue') return generateFugue(opts, S, seeds)
  if (styleId === 'maqam') return generateMaqam(opts, S, seeds)
  if (styleId === 'gamelan') return generateGamelan(opts, S, seeds)
  if (styleId === 'raga') return generateRaga({ ...opts, raga: opts.raga ?? { kalyan: 'yaman', bhairav: 'bhairav', kafi: 'bhimpalasi', bhairavi: 'malkauns', aeolian: 'darbari' }[opts.mode] }, S, seeds)
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)

  // key, tempo, form
  const key = { ...(parseKey(opts.key) ?? parseKey(pick(RA, S.keys))) }
  // a quarter-tone tonic (E𝄳): the song is made on the semitone above, then moved down (shiftPitches)
  const tonicShift = key.tonic - Math.round(key.tonic), tonicLabel = key.name ?? null
  if (tonicShift) { key.tonic = Math.round(key.tonic) % 12; delete key.name }
  const modeIn = opts.mode && !['major', 'minor'].includes(opts.mode) ? modeOf(opts.mode) : null
  // the 24- and 48-step chromatic "modes" keep the key's own scale and write microtones into the melodies
  const mode = modeIn?.grid ? null : modeIn
  if (opts.mode && !modeIn?.grid) key.mode = opts.mode === 'major' || opts.mode === 'minor' ? opts.mode : parentMode(mode.iv)
  const micro = opts.micro ?? (modeIn?.grid === 24 ? 'quarter' : modeIn?.grid === 48 ? 'eighth' : null)
  // a meter other than 4/4 (not for the hardstyle machinery of boss and jbattle: its kick is four on the floor)
  const meter = opts.meter && METERS[opts.meter] && !S.hard && styleId !== 'boss' ? METERS[opts.meter] : null
  const temperament = opts.temperament && opts.temperament !== 'equal' && !(modeIn && !modeIn.grid && modeIn.iv.some(v => v !== Math.round(v))) ? temperOf(opts.temperament) : null
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  let form = pick(RA, S.forms).map(([name, bars, role, energy, o]) => ({ name, bars, role, energy, ...(o ?? {}) }))
  const target = { short: 95, normal: 160, long: 220 }[opts.length ?? 'normal'] // seconds
  form = fitForm(form, meter ? (target * meter.pin) / meter.pout : target, bpm, RA)
  // modulations: their own dice; none in a mode of its own or on a quarter-tone tonic
  const RMod = rng((seeds.arrangement ^ 0xa11ce) >>> 0)
  const mods = opts.modulations && !mode && !tonicShift ? planModulations(form, key, styleId, RMod) : {}
  const iBridge = form.findIndex(f => f.role === 'bridge'), bridgeKey = mods[iBridge]?.key ?? key

  // themes from the library: the style's own list (weights), only those that can live in this mode;
  // A and B preferably from different songs. A melody marked `only` belongs to its style alone
  const LIB = MELODIES.filter(m => !m.only || [].concat(m.only).includes(styleId))
  const allowed = LIB.filter(m => !opts.sources || opts.sources.includes(m.from))
  const fits = m => parseKey(m.key).mode === key.mode || m.modal
  const weightOf = m => S.themes?.[m.id] ?? 0.15 * (1 + m.moods.filter(x => S.moods.includes(x)).length)
  const pickTheme = (avoid = null) => {
    let cands = allowed.filter(fits)
    if (!cands.length) cands = LIB.filter(fits)
    // the style's own list when it has one (the moods decide only for themes outside every list)
    const listed = cands.filter(m => S.themes?.[m.id] && m.id !== avoid?.id)
    if (listed.length) cands = listed
    cands = cands.filter(m => m.id !== avoid?.id)
    return weighted(RM, cands.map(m => [m, weightOf(m) * (avoid && m.from === avoid.from ? 0.35 : 1)]))
  }
  // opts.theme: the id of theme A, chosen by hand (if it can live in this key)
  const melA = (opts.theme && LIB.find(m => m.id === opts.theme && fits(m))) || pickTheme()
  const melB = pickTheme(melA)
  const ranges = { lead: [62, 84], lead2: [60, 82] }
  const shape = (th, lo, hi) => { // octave so the theme sits in [lo, hi]
    const ns = th.notes.map(e => e[1]), mid = (Math.min(...ns) + Math.max(...ns)) / 2
    let s = Math.round(((lo + hi) / 2 - mid) / 12) * 12
    th.notes = th.notes.map(([b, m, d]) => [b, m + s, d])
    return th
  }
  const treat = (mel, role) => {
    const th = shape(adaptTheme(mel, key), ...ranges.lead)
    const chordAt = b => th.chords[Math.floor(b / th.per) % th.chords.length]
    const how = weighted(RM, [['as written', 5], ['ornamented', 2], ['recomposed', role === 'B' ? 3 : 1.5]])
    if (how === 'ornamented') th.notes = ornament(th.notes, key, chordAt, RM)
    if (how === 'recomposed') {
      const ns = th.notes.map(e => e[1])
      th.notes = compose({ rhythm: th.notes.map(([b, , d]) => [b, d]), chordAt, key, lo: Math.min(...ns) - 2, hi: Math.max(...ns) + 2, r: RM })
    }
    th.how = how
    return th
  }
  const A = treat(melA, 'A'), B = treat(melB, 'B')
  // the bridge: a new progression, a new melody on the rhythm of a third theme
  const progs = PROGRESSIONS[bridgeKey.mode]
  const bridgeProg = pick(RA, progs).map(s => roman(s, bridgeKey))
  const melR = pick(RM, LIB.filter(m => m.id !== melA.id && m.id !== melB.id))
  const bridgeLen = 16, bridgeAt = b => bridgeProg[Math.floor(b / 4) % 4]
  const rhythm = melR.notes.filter(([b]) => b < bridgeLen).map(([b, , d]) => [b, Math.min(d, bridgeLen - b)])
  const BR = { notes: compose({ rhythm, chordAt: bridgeAt, key: bridgeKey, lo: 64, hi: 81, r: RM, end: 'open' }), chords: bridgeProg, per: 4, length: bridgeLen, from: melR.from }
  // theme II in another key: the relative key needs the theme written in that mode (a modal theme, or one born in it);
  // the dominant is the theme moved up a fifth or down a fourth, whichever keeps it in its register
  let BL = null
  const iB = form.findIndex(f => f.role === 'themeB'), mB = mods[iB]
  if (mB?.type === 'relative') {
    if (melB.modal || parseKey(melB.key).mode === mB.key.mode) {
      BL = shape(adaptTheme(melB, mB.key), ...ranges.lead)
      const chordAt = b => BL.chords[Math.floor(b / BL.per) % BL.chords.length]
      if (B.how === 'ornamented') BL.notes = ornament(BL.notes, mB.key, chordAt, RMod)
      if (B.how === 'recomposed') { const ns = BL.notes.map(e => e[1]); BL.notes = compose({ rhythm: BL.notes.map(([b, , d]) => [b, d]), chordAt, key: mB.key, lo: Math.min(...ns) - 2, hi: Math.max(...ns) + 2, r: RMod }) }
    } else mods[iB] = { key: { tonic: (key.tonic + 7) % 12, mode: key.mode }, type: 'dominant' }
  }
  const midOf = th => { const ns = th.notes.map(e => e[1]); return (Math.min(...ns) + Math.max(...ns)) / 2 }
  const trOf = (i, th) => { const t = (((mods[i].key.tonic - key.tonic) % 12) + 12) % 12; return t === 0 ? 0 : midOf(th) + t <= 78 ? t : t - 12 }
  // the build-up (the 'build' role, 16 beats): the theme's opening rhythm recomposed over VI – VII, eight
  // eighths up the (harmonic) scale from the dominant, then a trill on it — the countdown before a drop
  let RUN = null
  if (form.some(f => f.role === 'build')) {
    const chords = (key.mode === 'minor' ? ['VI', 'VII', 'V', 'V'] : ['IV', 'V', 'V', 'V']).map(s => roman(s, key))
    const at = b => chords[Math.floor(b / 4) % 4]
    const ns = A.notes.map(e => e[1]), lo = Math.min(...ns), hi = Math.max(...ns)
    const head = compose({ rhythm: A.notes.filter(([b]) => b < 8).map(([b, , d]) => [b, Math.min(d, 8 - b)]), chordAt: at, key, lo, hi, r: RM, end: 'open' })
    const scale = key.mode === 'minor' ? SCALES.harmonic : MAJ
    const dom = lo - 5 + pc(key.tonic + 7 - (lo - 5)) // the dominant at or above a fourth under the theme
    const run = []
    for (let n = dom; run.length < 8; n++) if (scale.includes(pc(n - key.tonic))) run.push([8 + run.length / 2, n, 0.5])
    const top = dom + 12, up = top + (key.mode === 'minor' ? 1 : 2) // minor: the ♭9 over V (E–F in A minor)
    const trill = Array.from({ length: 16 }, (_, i) => [12 + i / 4, i % 2 ? up : top, 0.25])
    RUN = { notes: [...head, ...run, ...trill], chords, per: 4, length: 16 }
  }

  // instruments
  const inst = {
    lead: pick(RI, S.lead), lead2: pick(RI, S.lead2), chords: pick(RI, S.chords), bass: pick(RI, S.bass),
    pad: pick(RI, S.pad), arp: pick(RI, S.arp), texture: pick(RI, S.texture),
  }
  if (inst.lead2 === inst.lead) inst.lead2 = S.lead2.find(x => x !== inst.lead) ?? inst.lead2

  // timeline: sections, harmony, who plays what
  const sections = [], harmony = [], plans = { lead: [], lead2: [], counter: [] }, sectionInfo = []
  let at = 0
  for (const [si, sec] of form.entries()) {
    const md = mods[si], beats = sec.bars * 4
    // a section in another key of the same mode is its music moved there; the bridge and a relative theme II are
    // written in their key already
    const tr = md && sec.role === 'themeB' && !BL ? trOf(si, B) : md ? 0 : sec.keyUp ?? 0
    sections.push([at, sec.name])
    // the harmony of the section: a theme's chords, the bridge progression, or the A chords
    const src = sec.role === 'themeB' ? (md && BL ? BL : B) : sec.role === 'bridge' ? BR : sec.role === 'build' && RUN ? RUN : A
    for (let b = 0; b < beats; b += src.per) {
      const ch = src.chords[Math.floor(b / src.per) % src.chords.length]
      const len = Math.min(src.per, beats - b)
      harmony.push({ at: at + b, len, ch, tr, ...(md ? { lk: md.key } : {}) })
    }
    // melodic plans: [start, phrase, transpose, stretch]
    const repeat = (plan, ph, phLen) => { for (let b = 0; b + phLen <= beats + 1e-6; b += phLen) plan.push([at + b, ph, tr, 1]) }
    if (sec.role === 'theme') repeat(plans.lead, 'A', A.length)
    else if (sec.role === 'themeB') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, md && BL ? 'BL' : 'B', B.length) }
    else if (sec.role === 'bridge') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'BRIDGE', BR.length) }
    else if (sec.role === 'solo' && styleId === 'boss') { plans.lead.push([at, 'SOLO', 0, 1]); plans.lead2.push([at, 'REST', 0, 1]) } // the hook sings the equation
    else if (sec.role === 'solo') { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'SOLO', 0, 1]) }
    else if (sec.role === 'trade') { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'TRADE', 0, 1]) } // trading fours with the drums
    else if (sec.role === 'final') {
      repeat(plans.lead, 'A', A.length)
      plans.counter.push([at, sec.canon ? 'CANON' : 'HARMONY', 0, 1])
    } else if (sec.role === 'outro') plans.lead.push([at, 'A', tr, 2]) // the theme at half speed
    else if (sec.role === 'break') plans.lead.push([at, 'A', 0, 1]) // a fragment of the theme over the break
    else if (sec.role === 'build') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'RUN', RUN.length) }
    else plans.lead.push([at, 'REST', 0, 1])
    if (!['bridge', 'solo', 'themeB', 'build', 'trade'].includes(sec.role)) plans.lead2.push([at, 'REST', 0, 1])
    if (sec.role !== 'final') plans.counter.push([at, 'REST', 0, 1])
    sectionInfo.push({ ...sec, at, beats, ...(md ? { lk: md.key, modType: md.type } : {}) })
    at += beats
  }
  let END = at
  // transition bars: the last bar before a section in another key (and before the one that comes home) gets
  // [pivot, V7 of the new key] and a link in the melody — composed over those chords, ending open on 5̂ or 2̂
  const LINKS = []
  const keyOfSec = i => sectionInfo[i]?.lk ?? key
  sectionInfo.forEach((s, i) => {
    if (!i) return
    const a = keyOfSec(i - 1), b = keyOfSec(i)
    if (!mods[i] && !mods[i - 1]) return
    if (a.tonic === b.tonic && a.mode === b.mode) return
    const T = s.at, type = mods[i]?.type ?? 'home'
    const [c1, c2] = transitionChords(a, b, type === 'home' ? 'pivot' : type)
    for (const h of harmony) if (h.at < T && h.at + h.len > T - 4) h.len = Math.max(0, T - 4 - h.at)
    for (let k = harmony.length - 1; k >= 0; k--) if (harmony[k].len <= 0) harmony.splice(k, 1)
    harmony.push({ at: T - 4, len: 2, ch: c1, tr: 0, lk: type === 'enharmonic' ? a : b, transition: type }, { at: T - 2, len: 2, ch: c2, tr: 0, lk: b, transition: type })
    harmony.sort((x, y) => x.at - y.at)
    // the voice singing at that bar gets the link
    for (const plan of [plans.lead, plans.lead2]) {
      const row = [...plan].reverse().find(r => r[0] <= T - 4)
      if (!row || row[1] === 'REST' || row[1] === 'SOLO') continue
      const ph = { A, B, BL, BRIDGE: BR, RUN }[row[1]]
      if (!ph) continue
      const rel = (T - 4 - row[0]) / row[3]
      const inBar = ph.notes.filter(([b]) => b >= rel - 1e-6 && b < rel + 4 / row[3] - 1e-6).map(([b, , d]) => [(b - rel) * row[3], Math.min(d * row[3], 4 - (b - rel) * row[3])])
      if (!inBar.length) continue
      const ns = ph.notes.map(e => e[1] + row[2])
      const notes = compose({ rhythm: inBar, chordAt: b => (b < 2 ? c1 : c2), key: b, lo: Math.min(...ns) - 1, hi: Math.max(...ns) + 1, r: RMod, end: 'open' })
      const name = 'LINK' + (LINKS.length + 1)
      LINKS.push({ name, notes, at: T - 4, from: keyName(a), to: keyName(b), type })
      plan.push([T - 4, name, 0, 1])
      plan.sort((x, y) => x[0] - y[0])
      // the phrase that was singing goes on after the link if its section does
      break
    }
  })
  // voicings with voice leading, the bass root in its range
  let prev = null
  for (const h of harmony) {
    const ch = h.ch, tones = chordTones(ch, S.voicing)
    const v = voiceLead(tones.map(p => (p + h.tr + 12) % 12), prev, { lo: S.chordRange[0], hi: S.chordRange[1], voices: Math.min(4, Math.max(3, tones.length)) })
    prev = v
    let bass = S.bassRange[0] + ((pc(ch.root + h.tr) - S.bassRange[0]) % 12 + 12) % 12
    if (bass < S.bassRange[0] + 4) bass += 12
    h.voicing = v
    h.bass = bass
    h.symbol = chordName({ ...ch, root: (ch.root + h.tr) % 12 }, h.lk ?? key)
    // the chord's own third, fifth and seventh above the root (the fifth of a ø7 chord is diminished!)
    h.ivs = [ch.ivs.find(i => i === 3 || i === 4) ?? 4, ch.ivs.find(i => i === 6 || i === 7 || i === 8) ?? 7, ch.ivs.find(i => i === 9 || i === 10 || i === 11) ?? 10]
  }
  if (mode) toMode({ key, iv: mode.iv, themes: [A, B, BR, RUN], harmony, id: opts.mode })
  // microtonal writing in the melodies, with its own dice (the other choices stay as they were)
  if (micro) {
    const RU = rng((seeds.melody ^ 0x51ce5) >>> 0)
    for (const th of [A, B, BR]) th.notes = microMelody(th.notes, { kind: micro, key, iv: mode?.iv, chordAt: b => th.chords[Math.floor(b / th.per) % th.chords.length], r: RU })
  }
  if (tonicShift) shiftPitches({ key, by: tonicShift, name: tonicLabel, themes: [A, B, BR, RUN], harmony, id: opts.mode })
  const solo = sectionInfo.find(s => s.role === 'solo')
  // the meter: everything made in 4/4 is mapped onto it
  let variants = null
  if (meter) {
    const P = { sections, sectionInfo, harmony, plans, END, phrases: { A: A.notes, B: B.notes, BRIDGE: BR.notes, ...(BL ? { BL: BL.notes } : {}), ...Object.fromEntries(LINKS.map(l => [l.name, l.notes])) } }
    variants = toMeter(meter, P)
    END = P.END
  }
  const names = NAMES[styleId] ?? NAMES.lofi
  // the name follows the arrangement; a mutated melody or sound gets a variant number
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const meta = {
    style: styleId, seed, seeds, length: opts.length ?? 'normal', key: keyName(key), mode: modeIn ? opts.mode : null, modeName: modeIn?.name ?? null, bpm, title, form: form.map(f => f.name),
    fixedKey: opts.key ?? null, micro: opts.micro ?? null, temperament: temperament?.id ?? null,
    meter: meter ? opts.meter : null,
    modulations: opts.modulations ? sectionInfo.filter(s => s.lk).map(s => ({ at: s.at, section: s.name, key: keyName(s.lk), type: s.modType })) : null,
    themes: { A: { from: melA.from, title: melA.title, how: A.how }, B: { from: melB.from, title: melB.title, how: B.how }, bridge: { rhythmFrom: melR.from } },
    instruments: inst,
  }
  MT = meter
  let source
  try {
    source = emit({ S, styleId, key, mode, modeIn, micro, temperament, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r: RI, BL, LINKS, meter, variants })
  } finally {
    MT = null
  }
  return { source, meta }
}

// form → about `target` seconds: drop optional sections when long, repeat themes when short
function fitForm(form, target, bpm, r) {
  const secs = f => f.reduce((s, x) => s + x.bars, 0) * 4 * 60 / bpm
  let f = form.map(x => ({ ...x }))
  while (secs(f) > target * 1.15) {
    const i = f.findIndex(x => x.role === 'solo' || x.role === 'break' || x.role === 'bridge')
    if (i < 0) break
    f.splice(i, 1)
  }
  let guard = 0
  while (secs(f) < target * 0.85 && guard++ < 6) {
    const i = f.findIndex(x => x.role === (guard % 2 ? 'theme' : 'solo')) ?? -1
    const j = i >= 0 ? i : f.findIndex(x => x.role === 'themeB')
    if (j < 0) break
    f[j].bars += 8
  }
  return f
}

// ---- code emission --------------------------------------------------------------------------------------
const fmtNotes = (notes, indent = '') => {
  const bars = new Map()
  for (const [b, n, d] of notes) {
    const k = Math.floor(b / 4 + 1e-9)
    if (!bars.has(k)) bars.set(k, [])
    bars.get(k).push(`[${round(b)}, ${round(n)}, ${round(d)}]`)
  }
  return '[\n' + [...bars.values()].map(l => indent + '  ' + l.join(', ') + ',').join('\n') + '\n' + indent + ']'
}
// the pad plays in the intro, theme B, the bridge, the break and the final
const PAD_ON = `const padOn = x => chordAt(x) && ['themeB', 'bridge', 'break', 'final', 'intro'].includes(role(x)) && x < END - 2`
const lane = { lead: [1.1, 3], lead2: [1, 2.9], counter: [0.8, 2.4], chords: [-1, 0.4], bass: [-3, -2], pad: [-1.7, -0.6], arp: [0.3, 1.2], texture: [-2.95, -2.85] }

let MT = null // the meter of the song being written (emit), null in 4/4
function emit(P) {
  const { S, styleId, key, mode, modeIn = mode, micro = null, temperament = null, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r, BL = null, LINKS = [], meter = null, variants = null } = P
  // a phrase as the song plays it (mapped onto the meter)
  const ph = (name, notes) => variants?.get(name) ?? notes
  const skey = keyWithMode(key, meta.mode) // the key the notes are spelt in (with a microtonal mode's degrees)
  const ivText = m => (m.grid ? `${m.grid}-EDO` : m.iv.map(round).join(' '))
  const used = { engine: new Set(['mod', 'floor', 'exp', 'sin', 'TAU', 'hz', 'filter', 'reverb', 'delay', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'arrangement', 'trigger', 'poly']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const tracks = []
  const sw = S.swing
  const roles = sectionInfo.map(s => [s.at, s.role, s.energy])
  const keyText = modeIn ? `${spell(key.tonic + 60, skey, false)} — ${modeIn.name.toLowerCase()}` : keyLabel(key)
  const boss = styleId === 'boss', hard = boss || !!S.hard // hard: the hardstyle kick, the reverse bass, the sidechain
  const trade = sectionInfo.find(s => s.role === 'trade')

  // ---- data
  const H = harmony.map(h => `  [${h.at}, ${h.len}, ${round(h.bass)}, [${h.voicing.map(round).join(', ')}], '${h.symbol}', [${h.ivs.map(round).join(', ')}]],`).join('\n')
  const head = []
  head.push(`// ${meta.title} — ${S.label.toLowerCase()} in ${spell(key.tonic + 60, skey, false)} ${modeIn ? modeIn.name.toLowerCase() + ` (${ivText(modeIn)})` : key.mode}, ${bpm} BPM. Generated by MathMusic`)
  head.push(`// (style ${styleId}, seed ${meta.seed}): ${sections.map(s => s[1]).join(' → ')}.`)
  head.push(`// Themes: A — ${meta.themes.A.title} (${meta.themes.A.how}), B — ${meta.themes.B.title} (${meta.themes.B.how}); the bridge melody is newly`)
  head.push(`// composed on the rhythm of a theme from ${BR.from}. Computed parts: ${[solo ? (boss ? 'a solo that is an equation (the graph of two sines)' : 'an improvised solo') : null, 'a counter-melody from the chords', plans.counter.some(p => p[1] === 'CANON') ? 'a canon' : null, RUN ? 'a run up to the dominant in every build-up' : null, hard ? 'a reverse bass that rolls in the final' : null, 'the theme at half speed in the outro', sectionInfo.some(s => s.keyUp) ? 'a key change up' : null].filter(Boolean).join(', ')}.`)
  if (hard && !boss) head.push(`// Japanese instruments over the boss machinery: the hardstyle kick's tail and the reverse bass sit on the tonic,\n// every part ducks under the kick in the drops, d(t) = 1 − 0.7(1 − t/0.18)²; the taiko roll doubles through each build.`)
  if (boss) head.push(`// The hardstyle kick's tail and the reverse bass sit on the tonic; every part ducks under the kick in the drops,\n// d(t) = 1 − 0.7(1 − t/0.18)². \`boss\` below makes it a Glitch Forest boss song (tools/score-export.mjs).`)
  if (meter) head.push(`// In ${meter.label}: made in 4/4, then mapped bar by bar onto the meter (${meter.compound ? 'every eighth becomes the triplet one' : 'the notes stay on the grid'}); the drums, the\n// comping and the bass are made for its groups of beats.`)
  if (meta.modulations?.length) head.push(`// Modulations: ${meta.modulations.map(m => `${m.section} in ${keyLabel(parseKey(m.key))} (${MOD_NAMES[m.type]})`).join(', ')}; every change is prepared by a bar of\n// [pivot, V7 of the new key] with a composed link in the melody, and the music comes home by its dominant seventh.`)
  head.push(`// It is an ordinary song file: change anything; the melodies can be drawn in the piano roll (P).`)
  head.push(`// x is time in beats; n counts semitones from C4 (MIDI 60).`)

  const roleOf = `const ROLE = ${JSON.stringify(roles)} // [start, role, energy 0–3] per section\nconst sectionOf = x => { let s = ROLE[0]; for (const r of ROLE) if (r[0] <= x) s = r; return s }\nconst energy = x => (x < END ? sectionOf(x)[2] : -1)\nconst role = x => (x < END ? sectionOf(x)[1] : 'end')`
  const data = `
const SECTIONS = ${JSON.stringify(sections)}
const END = ${END}
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz, exact equal temperament
const SW = ${sw} // the off-beat eighth lands at ${sw} of the beat
${roleOf}
${meter ? meterCode(meta.meter, meter) + '\n' : ''}
// ---- harmony: [start beat, length, bass MIDI, voicing MIDI (voice-led), chord, [3rd, 5th, 7th]] --
const HARMONY = [
${H}
]
${meter ? `const BY_EIGHTH = [] // chords change on bar lines, and bars may end on a half beat
for (const h of HARMONY) for (let b = Math.round(h[0] * 2); b < Math.round((h[0] + h[1]) * 2); b++) BY_EIGHTH[b] = h
const chordAt = x => BY_EIGHTH[floor(2 * x)] ?? null` : `const BY_BEAT = []
for (const h of HARMONY) for (let b = h[0]; b < h[0] + h[1]; b++) BY_BEAT[b] = h
const chordAt = x => BY_BEAT[floor(x)] ?? null`}
${PAD_ON} // pads play here
const SCALE = [${(mode ? mode.iv : key.mode === 'minor' ? MIN : MAJ).map(i => round((i + key.tonic) % 12)).join(', ')}] // ${keyText}, pitch classes from C
${hard ? bossData({ need, key, bpm, sectionInfo }) : ''}${temperament ? temperData({ temperament, key, sectionInfo }) + '\n' : ''}
// ---- melodies: [beat, n from C4, length] — draw them in the piano roll ------------------------------
// A — ${meta.themes.A.title}, ${meta.themes.A.how}; in ${keyText}
const THEME_A = ${fmtNotes(ph('A', A.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
// B — ${meta.themes.B.title}, ${meta.themes.B.how}
const THEME_B = ${fmtNotes(ph('B', B.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
// the bridge — composed over ${BR.chords.map(c => chordName(c, key)).join(' – ')}
const BRIDGE = ${fmtNotes(ph('BRIDGE', BR.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
const REST = []
${RUN ? `// the build-up: the theme's opening over ${RUN.chords.slice(0, 2).map(c => chordName(c, key)).join(' – ')}, a run up from the dominant, a trill on it
const RUN = ${fmtNotes(RUN.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
` : ''}${micro && solo && !boss ? microSoloCode(micro, key) + '\n' : ''}${solo && boss ? equationSolo({ need, key, solo, r }) : solo ? `// the solo: a random walk over the scale, chord tones on the beats (improvise)
const SOLO = improvise({
  start: ${solo.at}, length: ${solo.beats - 2}, rate: 2, seed: ${1 + Math.floor(r() * 999)}, swing: SW, lo: ${A.notes.reduce((a, e) => Math.min(a, e[1]), 99) - 60 - 2}, hi: ${A.notes.reduce((a, e) => Math.max(a, e[1]), 0) - 60 + 3},
  phrase: 8, rest: 0.2, hold: 0.3, scale: () => SCALE, chord: x => (chordAt(x)?.[3] ?? [0]).map(n => mod(n, 12)),
}).map(${micro ? `([b, n, d], j, a) => [b - ${solo.at}, n + MICRO(n, b, a[j + 1]?.[1]), d]` : `([b, n, d]) => [b - ${solo.at}, n, d]`})` : 'const SOLO = []'}
${BL ? `// theme II in ${keyLabel(meta.modulations?.find(m => m.type === 'relative') ? sectionInfo.find(s => s.modType === 'relative').lk : key)} — the same theme written in that mode
const THEME_BL = ${fmtNotes(ph('BL', BL.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
` : ''}${LINKS.map(l => `// a link into ${l.to} (${MOD_NAMES[l.type] ?? l.type}): composed over the transition's pivot and V7
const ${l.name} = ${fmtNotes(ph(l.name, l.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
`).join('')}${variants ? [...variants].filter(([id]) => /_\d/.test(id)).map(([id, notes]) => `// ${id.replace(/_(\d+(?:_\d+)?)_(\d)$/, (m, o, k) => ` from beat ${o.replace('_', '.')} of the period${k !== '1' ? `, at 1/${k} speed` : ''}`)} — the phrase as the meter places it there
const ${id} = ${fmtNotes(notes.map(([b, m, d]) => [round(b), m - 60, d]))}
`).join('') : ''}${trade ? `// trading fours: four bars improvised, four bars for the drums (they solo while the horn rests)
const TRADE = improvise({
  start: ${trade.at}, length: ${trade.beats}, rate: 2, seed: ${1 + Math.floor(r() * 999)}, swing: SW, lo: ${A.notes.reduce((a, e) => Math.min(a, e[1]), 99) - 60 - 2}, hi: ${A.notes.reduce((a, e) => Math.max(a, e[1]), 0) - 60 + 3},
  phrase: 8, rest: 0.15, hold: 0.25, scale: () => SCALE, chord: x => (chordAt(x)?.[3] ?? [0]).map(n => mod(n, 12)),
}).filter(([b]) => floor((b - ${trade.at}) / 16) % 2 === 0).map(([b, n, d]) => [b - ${trade.at}, n, Math.min(d, 16 - mod(b - ${trade.at}, 16))])
` : ''}const PHRASES = { A: THEME_A, B: THEME_B, BRIDGE, REST, SOLO${trade ? ', TRADE' : ''}${RUN ? ', RUN' : ''}${BL ? ', BL: THEME_BL' : ''}${LINKS.map(l => ', ' + l.name).join('')}${variants ? [...variants.keys()].filter(id => /_\d/.test(id)).map(id => ', ' + id).join('') : ''} }

// who plays which phrase: [start beat, phrase, transpose, stretch (2 = half speed)]
const LEAD = ${JSON.stringify(plans.lead.map(([s, p, t, k]) => [s, p, t, k]))}
const LEAD2 = ${JSON.stringify(plans.lead2.map(([s, p, t, k]) => [s, p, t, k]))}
const COUNTER = ${JSON.stringify(plans.counter.map(([s, p, t, k]) => [s, p, t, k]))}
// the note of a voice at x → { n, d, τ, u, at } or null
function voiceAt(plan, x) {
  if (x >= END) return null
  let row = null
  for (const r of plan) if (r[0] <= x) row = r
  if (!row) return null
  const [s, name, tr, k] = row, m = notesAt(PHRASES[name] ?? REST, (x - s) / k)
  return m && { n: m.n + tr, d: m.d * k, τ: m.τ * k, u: m.u, at: s + m.at * k }
}
const leadAt = x => voiceAt(LEAD, x)
const lead2At = x => voiceAt(LEAD2, x)
// the counter-voice: HARMONY = the highest chord tone at least a third below the lead (computed from
// the chords); CANON = the lead itself two beats later, an octave down
const counterAt = x => {
  let row = null
  for (const r of COUNTER) if (r[0] <= x) row = r
  if (!row || x >= END) return null
  if (row[1] === 'CANON') {
    const m = x - 2 >= row[0] ? leadAt(x - 2) : null
    return m && { ...m, n: m.n - 12, at: m.at + 2 }
  }
  if (row[1] !== 'HARMONY') return null
  const m = leadAt(x), c = chordAt(x)
  if (!m || !c) return null
${micro || (modeIn && modeIn.iv.some(v => v !== Math.round(v))) || key.shift ? `  // (microtonal: the chord tones themselves, in every octave)
  let best = null
  for (const v of c[3]) for (let o = -48; o <= 0; o += 12) { const n = v - 60 + o; if (n <= m.n - 3 + 1e-6 && n > m.n - 12 && (best == null || n > best)) best = n }
  return best == null ? null : { ...m, n: best }` : `  const pcs = c[3].map(n => mod(n, 12))
  for (let n = m.n - 3; n > m.n - 12; n--) if (pcs.includes(mod(n + 60, 12))) return { ...m, n }
  return null`}
}
`
  need('instruments', 'improvise')
  // ---- tracks
  const T = (name, code) => tracks.push({ name, code })
  const leadCode = (id, at, laneR, gainMul = 1, panv = 0.15) => LEADS[id]({ at, lane: laneR, gain: gainMul, pan: panv, need, sw, hard })
  T(inst.lead, leadCode(inst.lead, 'leadAt', lane.lead, 1, 0.12))
  // bells carry a melody alone at full level, but next to another lead they cut through: softer
  const LEAD2_GAIN = { bells: 0.45 }
  // boss: the chip lead and its counter stand up to the supersaw and the kick
  const louder = boss ? 1.6 : 1
  T(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2, leadCode(inst.lead2, 'lead2At', lane.lead2, 0.9 * louder * (LEAD2_GAIN[inst.lead2] ?? 1), -0.3))
  // named by its instrument too ("vibes counter"), so a MIDI export knows what plays it
  const counterVoice = COUNTER_VOICE[inst.lead] ?? inst.lead2
  T(counterVoice + ' counter', leadCode(counterVoice, 'counterAt', lane.counter, 0.5 * louder * (boss ? 2 : 1), -0.4))
  T(inst.chords, CHORDS[inst.chords]({ need, comp: S.comp, lane: lane.chords, hard }))
  if (inst.pad) T(inst.pad === 'strings' ? 'strings' : inst.pad, PADS[inst.pad]({ need, lane: lane.pad, gain: boss ? 3 : hard ? 4 : 1, hard: hard && !boss }))
  T('bass', BASSES[inst.bass]({ need, line: S.bassline, lane: lane.bass, hard }))
  if (hard) T('rbass', reverseBassTrack({ need, lane: lane.bass, gain: boss ? 1 : 0.7 }))
  if (inst.arp) T(inst.arp + ' arp', ARPS[inst.arp]({ need, step: S.arpStep, poly: S.arpPoly, lane: lane.arp, hard }))
  if (hard) T('kick', hardKickTrack({ need, gain: boss ? 1 : 0.6 }))
  T('drums', KITS[S.kit]({ need, drums: S.drums }))
  if (inst.texture) T(inst.texture, TEXTURES[inst.texture]({ need }))

  // unique keys
  const seen = {}
  for (const t of tracks) {
    let k = t.name.replace(/[^\w ]/g, '').trim() || 'track'
    if (seen[k]) k += ' ' + ++seen[k]
    else seen[k] = 1
    t.key = k
  }
  // a boss song also tells Glitch Forest how to fight it
  let bossField = ''
  if (boss) {
    const attacks = {}
    const add = (name, tile, move) => { const t = tracks.find(q => q.name === name); if (t) attacks[t.key] = { tile, move } }
    add(inst.lead, 'slime', 'snake')
    add(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2, 'acid', 'snake')
    add('rbass', 'tree', 'wave'), add('bass', 'lava', 'wave'), add('kick', 'water', 'pulse')
    add(inst.chords, 'corrupt', 'stab'), add(inst.arp + ' arp', 'corrupt', 'spray'), add(inst.pad === 'strings' ? 'strings' : inst.pad, 'frost', 'rain')
    const modes = Object.fromEntries(sectionInfo.map(s => [s.name, s.role === 'build' ? 'build' : s.energy >= 3 ? 'live' : 'turn']))
    const live = sectionInfo.filter(s => s.energy >= 3), outro = sectionInfo.find(s => s.role === 'outro')
    bossField = `
  // for Glitch Forest (tools/score-export.mjs): how each section runs the fight (turn / build / live), which
  // tracks strike the arena and how, the chord on every beat, where an undefeated fight loops (the last drop)
  // and where the victory jumps (the outro)
  boss: {
    modes: ${JSON.stringify(modes)},
    attacks: ${JSON.stringify(attacks)},
    chord: x => chordAt(x)?.[4] ?? '',
    loop: ${live.length ? live[live.length - 1].at : 0},
    outro: ${outro ? outro.at : END},
  },`
  }
  const imp = mod => [...used[mod]].sort().map(x => (temperament && mod === 'engine' && x === 'hz' ? 'hz as hz12' : x))
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.key} ${'-'.repeat(Math.max(4, 90 - t.key.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${meta.title}',
  bpm: ${bpm},
  key: '${keyName(key)}',${modeIn ? `
  mode: '${meta.mode}', // ${modeIn.name}: ${ivText(modeIn)}` : ''}${temperament ? `
  tuning: { id: '${temperament.id}', name: ${JSON.stringify(temperament.name)}, offsets: TEMPER }, // cents of C … B from 12-TET` : ''}
  length: END,
  theme: '${S.theme}',
  style: '${styleId}',
  generator: ${JSON.stringify({ style: styleId, seed: meta.seed, seeds: meta.seeds, length: meta.length, ...(meta.fixedKey ? { key: meta.fixedKey } : {}), ...(meta.mode ? { mode: meta.mode } : {}), ...(meta.micro ? { micro: meta.micro } : {}), ...(meta.temperament ? { temperament: meta.temperament } : {}), ...(meta.modulations ? { modulations: true } : {}), ...(meta.meter ? { meter: meta.meter } : {}) })},${meta.meter ? `
  meter: '${METERS[meta.meter].text}', // ${METERS[meta.meter].label}${METERS[meta.meter].compound ? ' — a beat (x) is a dotted quarter' : ''}` : ''}${meta.modulations?.length ? `
  keys: ${JSON.stringify(keysField(key, sectionInfo))}, // the key of each stretch (the score's signatures, note names)` : ''}
  sections: SECTIONS,${bossField}
  tracks: ${temperament ? 'withNow(' : ''}{ ${tracks.map((t, i) => `${JSON.stringify(t.key)}: track${i}`).join(', ')} }${temperament ? ')' : ''},
}
`,
  ]
  return out.join('\n')
}
const COUNTER_VOICE = { flute: 'vibes', vibes: 'piano', epiano: 'vibes', pulse: 'pulse12', sawlead: 'pulse12', violin: 'violin', meow: 'meow', bells: 'flute', choir: 'flute', scat: 'flute', piano: 'vibes', marimba: 'vibes', pulse12: 'pulse' }

// ---- instrument recipes: each returns the code of a track object ----------------------------------------
const graphLead = (at, [y0, y1]) => `graph: x => { const m = ${at}(x); return m ? ${y0} + (m.n + 5) * ${round((y1 - y0) / 34)} : null },
  midi: x => { const m = ${at}(x); return m && m.u < 0.92 ? [60 + m.n] : [] },`
const struck = (tone, imports, { release, life, gain, extra = '', fx, formula, vel = '0.7 + 0.2 * hash(floor(4 * x), 3)' }) => o => {
  o.need('instruments', ...imports)
  return `{
  color: '${o.color ?? '#b8f0ff'}',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(${tone}, { release: ${release}, life: ${life} }), fire = trigger()${fx.init}
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), ${vel}, m.d * sec + ${release})
      const y = ${round(gain * o.gain)} * p()${extra}
      return ${fx.out('y', o.pan)}
    }
  },
}`
}
const FX = {
  hall: { init: ', verb = reverb({ room: 0.86, damp: 0.35, wet: 0.35 })', out: (y, p) => `verb(...pan(${y}, ${p}))` },
  echoHall: { init: ', echo = delay({ time: sec * 0.75, feedback: 0.32, wet: 0.22 }), verb = reverb({ room: 0.85, wet: 0.33 })', out: (y, p) => `verb(...echo(...pan(${y}, ${p})))` },
  room: { init: ', verb = reverb({ room: 0.7, damp: 0.5, wet: 0.22 })', out: (y, p) => `verb(...pan(${y}, ${p}))` },
}
const LEADS = {
  vibes: o => struck('vibesTone', ['vibesTone'], { release: 0.5, life: 6, gain: 0.25, fx: FX.hall, extra: ' * (1 - 0.35 * (0.5 + 0.5 * sin(TAU * 5.5 * x * sec)))', formula: ['V(f,t,v) = v\\,e^{-t/2.2}\\big(\\sin 2\\pi ft + 0.3e^{-5t}\\sin 2\\pi\\,3.98ft + 0.08e^{-20t}\\sin 2\\pi\\,9.8ft\\big)\\cdot\\big(1 - 0.35\\,\\tfrac{1+\\sin 2\\pi\\,5.5T}{2}\\big)', 'f = 261.63\\cdot 2^{n/12}'] })({ ...o, color: o.color ?? '#b8f0ff' }),
  piano: o => struck('pianoTone', ['pianoTone'], { release: 0.4, life: 6, gain: 0.3, fx: FX.hall, formula: ['P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\big(\\sin 2\\pi f_k t+\\sin(2\\pi\\cdot1.0006 f_k t+k)\\big)', 'f_k = kf\\sqrt{1+0.0004k^2}'] })({ ...o, color: '#ffffff' }),
  marimba: o => struck('marimbaTone', ['marimbaTone'], { release: 0.2, life: 3, gain: 0.32, fx: FX.room, formula: ['M(f,t,v) = v\\,e^{-t(2+f/500)}\\big(\\sin 2\\pi ft + 0.25e^{-12t}\\sin 2\\pi\\,3.93ft + 0.06e^{-40t}\\sin 2\\pi\\,9.9ft\\big)'] })({ ...o, color: '#ffc38a' }),
  epiano: o => struck('epianoTone', ['epianoTone'], { release: 0.35, life: 6, gain: 0.2, fx: FX.echoHall, formula: ['E(f,t,v) = v\\Big(\\sin\\!\\big(2\\pi ft + (0.5+1.8v^2)e^{-4t}\\sin 2\\pi ft\\big)\\,e^{-t/(1+250/f)} + 0.2v\\,e^{-35t}\\sin 2\\pi\\,14ft\\Big)'] })({ ...o, color: '#ffcf9f' }),
  bells: o => {
    o.need('instruments', 'fm')
    return struck('(f, t, v) => v * fm(f, t, { ratio: 3.5, index: 2.2, decay: 1.6, idecay: 4 })', [], { release: 0.8, life: 5, gain: 0.56, fx: FX.echoHall, formula: ['B = v\\,e^{-1.6t}\\sin\\!\\big(2\\pi ft + 2.2e^{-4t}\\sin 2\\pi\\,3.5ft\\big)'] })({ ...o, color: '#fff3b0' })
  },
  flute: o => {
    o.need('instruments', 'flute')
    return `{
  color: '#e8f4ff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Fl = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.06\\,\\BP_{2g}\\,\\eta + 0.5e^{-25t}\\,\\HP_{3000}\\,\\eta\\big)', 'g = f\\cdot 2^{\\,0.2\\min(1,\\,t/0.6)\\sin(2\\pi\\cdot 5.2T)/12},\\quad f = 261.63\\cdot 2^{n/12}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fl = flute(), echo = delay({ time: sec * 0.75, feedback: 0.33, wet: 0.22 }), verb = reverb({ room: 0.85, wet: 0.33 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(0.34 * o.gain)} * fl(hz(n, C4), m && m.u < 0.92)
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
  },
  pulse: o => chipLead(o, 0.25, '#c9a2ff'),
  pulse12: o => chipLead(o, 0.125, '#9fd0ff'),
  sawlead: o => {
    o.need('engine', 'supersaw', 'osc')
    return `{
  color: '#ff9ff3',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['L = \\Rev\\,\\Dly\\big[a\\,\\LP_{4500}\\big(\\SS_7(g) + 0.3\\sq(g/2)\\big)\\big]', 'g = f\\cdot 2^{\\,0.2\\min(1,\\tau/0.75)\\sin(2\\pi\\cdot5.5T)/12}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, saws = supersaw({ voices: 7, detune: 0.18, seed: 9 }), sq = osc('square'), lpL = filter('lp'), lpR = filter('lp')
    const glide = smooth(30), env = smooth(8), echo = delay({ time: sec * 0.75, feedback: 0.33, wet: 0.28 }), verb = reverb({ room: 0.85, wet: 0.32 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const t = x * sec, vib = m ? 0.2 * Math.min(1, m.τ * sec / 0.75) * sin(TAU * 5.5 * t) : 0
      const f = hz(glide(n) + vib, C4), a = env(m && m.u < 0.93 ? 1 : 0)
      const [l, r] = saws(f), s = 0.3 * sq(f / 2)
      return verb(...echo(${round(0.22 * o.gain)} * a * lpL(l + s, 4500), ${round(0.22 * o.gain)} * a * lpR(r + s, 4500)))
    }
  },
}`
  },
  violin: o => {
    o.need('instruments', 'bowed')
    return `{
  color: '#ffd9a8',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Vn = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{\\,0.18\\min(1,t/0.4)\\sin(2\\pi\\cdot5.6T)/12}\\big) + 0.04\\eta', 'R = (300, 520, 1100, 2700)\\ \\text{Гц — резонансы корпуса}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bow = bowed({ base: C4, sec }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.4 })
    return x => verb(...pan(${round(0.36 * o.gain)} * bow(${o.at}(x), x * sec), ${o.pan}))
  },
}`
  },
  choir: o => {
    o.need('instruments', 'voice', 'VOWELS', 'blend')
    return `{
  color: '#e0c8ff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Ch = \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\,\\BP_{F_i}\\big(\\saw(f) + 0.05\\eta\\big),\\quad F:\\ \\text{«а»} \\to \\text{«о»}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, v = voice({ size: 1, breath: 0.06 }), v2 = voice({ size: 0.94, breath: 0.06 }), glide = smooth(60), verb = reverb({ room: 0.9, wet: 0.5 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m) n = m.n
      const F = blend(VOWELS.a, VOWELS.o, 0.5 + 0.5 * sin(TAU * x / 8)), vib = 0.15 * sin(TAU * 5 * t)
      const on = m && m.u < 0.95 ? 1 : 0, f = glide(hz(n + vib, C4))
      return verb(${round(0.55 * o.gain)} * v(f, F, on), ${round(0.55 * o.gain)} * v2(f * 1.004, F, on))
    }
  },
}`
  },
  scat: o => {
    o.need('instruments', 'voice', 'VOWELS')
    return `{
  color: '#fff3a0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Sc = \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\BP_{F_i(j)}\\big(\\saw(f\\cdot 2^{(s+v)/12})\\big),\\ j\\text{ — слог «ду-ба-да-ди…»},\\ s = -\\max(0, 1 - t/0.08)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, v = voice({ size: 1.08, breath: 0.08 }), glide = smooth(40), vowel = [smooth(25), smooth(25), smooth(25)]
    const echo = delay({ time: sec * 0.75, feedback: 0.25, wet: 0.2 }), verb = reverb({ room: 0.8, wet: 0.33 }), SYL = ['u', 'a', 'a', 'i', 'a', 'o', 'u', 'a', 'e', 'a']
    let n = 0, j = 0, last = null
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m && m.at !== last) (last = m.at), j++
      if (m) n = m.n
      const held = m ? m.τ * sec : 0, scoop = m ? -Math.max(0, 1 - held / 0.08) : 0, vib = 0.25 * Math.min(1, held / 0.5) * sin(TAU * 5.5 * t)
      const F = VOWELS[SYL[j % SYL.length]].map((f, i) => vowel[i](f))
      return verb(...echo(...pan(${round(0.9 * o.gain)} * v(glide(hz(n + scoop + vib, C4)), F, m && m.u < 0.9 ? 1 : 0), ${o.pan})))
    }
  },
}`
  },
  meow: o => {
    o.need('instruments', 'meower', 'meowBend')
    return `{
  color: '#ffb3d9',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5 + 3 * sin(Math.PI * m.u)) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m ? [60 + m.n] : [] },
  formula: ${JSON.stringify(['f = 261.63\\cdot 2^{\\,(n + \\beta(u) + v)/12},\\quad \\beta(u) = 3\\sin(\\pi u^{0.7}) - 2u^2', 'F_i(u):\\ \\text{«и»}\\to\\text{«а»}\\to\\text{«у»} \\text{ — кошачье мяу}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, c = meower({ size: 0.95 }), lp = filter('lp'), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.85, wet: 0.38 })
    return x => {
      const m = ${o.at}(x)
      const y = ${round(0.5 * o.gain)} * lp(c(m ? m.n - 17 : 0, m ? Math.min(1, m.u * 1.05) : null, x * sec), 5000) // n from F5 = C4 + 17
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
  },
}
function chipLead(o, duty, color) {
  o.need('instruments', 'pulse', 'vol4')
  return `{
  color: '${color}',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify([`\\Pi_{${duty}}(f) = \\tfrac12\\big(\\saw(\\varphi) - \\saw(\\varphi + ${duty})\\big),\\quad y = \\vol(1 - 0.35\\min(1, t/0.4))\\cdot\\Pi_{${duty}}`, 'f = 261.63\\cdot 2^{(n + 0.2\\sin 2\\pi\\,5.5T)/12}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(${duty}), lp = filter('lp'), gate = smooth(1.5), echo = delay({ time: sec * 0.75, feedback: 0.4, wet: 0.3 }), verb = reverb({ room: 0.7, wet: 0.2 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec, held = m ? m.τ * sec : 0
      if (m) n = m.n
      const vib = held > 0.25 ? 0.2 * sin(TAU * 5.5 * t) : 0
      const g = gate(m && m.u < 0.9 ? vol4(1 - 0.35 * Math.min(1, held / 0.4)) : 0)
      return verb(...echo(...pan(${round(0.5 * o.gain)} * g * lp(p(hz(n + vib, C4)), 9000), ${o.pan})))
    }
  },
}`
}

// comping: hits from the style's pattern [position in bar, velocity, length], by section energy
const compHit = comp => (MT ? compHitMeter() : `const COMP = ${JSON.stringify(comp)}
const compAt = x => {
  const e = energy(x)
  if (e < 0 || role(x) === 'end') return null
  let h = null
  for (const c of COMP[e] ?? COMP[1]) if (c[0] <= mod(x, 4)) h = c
  return h && { at: floor(x / 4) * 4 + h[0], vel: h[1], d: h[2] }
}`)
// the comping of a song in another meter: by its groups of beats (compFor), a list per kind of bar
const compHitMeter = () => {
  const lists = MT.bars.map(bm => compFor(bm)), COMP = Object.fromEntries([0, 1, 2, 3].map(e => [e, lists.length > 1 ? lists.map(l => l[e]) : lists[0][e]]))
  return `const COMP = ${JSON.stringify(COMP)} // by energy: [beat in the bar, velocity, length]${lists.length > 1 ? ', a list per kind of bar' : ''}
const compAt = x => {
  const e = energy(x)
  if (e < 0 || role(x) === 'end') return null
  const b = barIndex(x), P = COMP[e] ?? COMP[1], list = Array.isArray(P[0][0]) ? P[b % 2] : P
  let h = null
  for (const c of list) if (c[0] <= x - barStartOf(b) + 1e-9) h = c
  return h && { at: barStartOf(b) + h[0], vel: h[1], d: h[2] }
}`
}
// a chord held through the bar, let go just before its end
const GATE = v => (MT ? `inBar(x) < barLen(x) - ${round(4 - v)}` : `mod(x, 4) < ${v}`)
const CHORDS = {
  rhodes: o => polyComp(o, 'epianoTone', '#ffcf9f', 0.09, 'rhodes', ['E(f,t,v) = v\\Big(\\sin\\!\\big(2\\pi ft + (0.5+1.8v^2)e^{-4t}\\sin 2\\pi ft\\big)\\,e^{-t/(1+250/f)} + \\ldots\\Big)', 'y = \\Tape\\,\\Cho\\big[(1 \\mp 0.25\\sin 2\\pi\\,3.5T)\\sum_j E(f_j, t, v)\\big]']),
  piano: o => polyComp(o, 'pianoTone', '#ffffff', 0.16, 'piano', ['P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\big(\\sin 2\\pi f_k t+\\sin(2\\pi\\cdot1.0006 f_k t+k)\\big)', 'y = \\Rev\\sum_j P(f_j, t, v),\\quad f_j \\text{ — голоса аккорда}']),
  guitar: o => {
    o.need('instruments', 'plucker', 'guitarBody', 'chorus')
    return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffcf9f',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.2 ? c[3] : [] },
  formula: ${JSON.stringify(['y_{k+N} = \\rho\\big(b\\,y_k + (1-b)\\,y_{k+1}\\big),\\quad N = \\tfrac{44100}{f}\\ \\text{(Карплус — Стронг)}', 'y = \\Rev\\,\\Cho\\,\\text{Корпус}\\big(\\textstyle\\sum \\text{струны}\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, strum = plucker({ life: 3, decay: 0.997 }), body = guitarBody(), fire = trigger()
    const ch = chorus({ mix: 0.25, rate: 0.3 }), verb = reverb({ room: 0.75, damp: 0.4, wet: 0.25 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) {
        strum.hit(hz(c[2] - 48 + 12, 130.81), 0.5 * h.vel + 0.2, { bright: 0.45 })
        c[3].forEach((n, i) => strum.hit(hz(n - 60, C4), (0.3 + 0.1 * hash(floor(4 * x), i)) * h.vel + 0.1, { bright: 0.5, at: floor((i + 1) * 0.006 * 44100) }))
      }
      return verb(...ch(...pan(0.34 * body(strum()), -0.15)))
    }
  },
}})()`
  },
  harpsichord: o => {
    o.need('instruments', 'plucker')
    return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#f2d38a',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(['y_{k+N} = 0.996\\big(0.65\\,y_k + 0.35\\,y_{k+1}\\big)\\quad\\text{(клавесин: яркое щипковое Карплус — Стронг)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, harp = plucker({ life: 2.5, decay: 0.995 }), fire = trigger(), hp = filter('hp'), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) c[3].forEach((n, i) => harp.hit(hz(n - 60, C4), 0.25 * h.vel + 0.12, { bright: 0.65, at: floor(i * 0.01 * 44100) }))
      return verb(...pan(0.62 * hp(harp(), 150), 0.2))
    }
  },
}})()`
  },
  chiparp: o => {
    o.need('instruments', 'pulse', 'vol4')
    return `{
  color: '#7f6bd6',
  graph: x => (chordAt(x) && energy(x) >= 0 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['y = \\vol(v)\\,\\Pi_{1/4}\\big(f_{\\lfloor 60T\\rfloor \\bmod 3}\\big)\\quad\\text{— аккорд по ноте за кадр 60 Гц, как в NES}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.25), lp = filter('lp'), level = smooth(20)
    return x => {
      const c = chordAt(x), e = energy(x), t = x * sec
      const a = level(c && e >= 0 ? vol4([0.35, 0.5, 0.6, 0.7][e]) : 0)
      const n = c ? c[3][mod(floor(60 * t), 3)] : 60
      return pan(0.32 * a * lp(p(hz(n - 60, C4)), 7000), 0.25)
    }
  },
}`
  },
  organ: o => {
    o.need('instruments', 'pulse')
    return `{
  color: '#7f6bd6',
  graph: x => (chordAt(x) && energy(x) >= 0 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['O = \\Rev\\Big[g\\,\\LP_{2500}\\tfrac13\\sum_{j}\\Pi_{1/2}(f_j)\\Big]\\quad\\text{— орган из квадратов}'])},
  audio() {
    const voices = [0, 1, 2, 3].map(() => pulse(0.5)), lp = filter('lp'), level = smooth(120), verb = reverb({ room: 0.92, damp: 0.5, wet: 0.5 })
    return x => {
      const c = chordAt(x), e = energy(x), a = level(c && e >= 0 ? [0.6, 0.7, 0.8, 0.9][e] : 0)
      let y = 0
      voices.forEach((p, j) => (y += p(hz((c ? c[3][j % c[3].length] : 60) - 60, C4))))
      return verb(...pan(0.07 * a * lp(y, 2200), 0.2))
    }
  },
}`
  },
  sawpad: o => {
    o.need('engine', 'supersaw')
    return `{
  color: '#ff6fd8',
  graph: x => (chordAt(x) && energy(x) >= 0 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['P = \\Rev\\Big[a\\,\\LP_{f_c}\\sum_{j}\\SS_5(f_j)\\Big],\\quad a = 1 - 0.6e^{-6\\tau}\\ \\text{(накачка от бочки)}'])},
  audio({ bpm }) {
    const saws = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.22, width: 0.9, seed: 11 + j })), lp = [filter('lp'), filter('lp')], level = smooth(150), cut = smooth(300)
    const verb = reverb({ room: 0.88, wet: 0.4 })
    return x => {
      const c = chordAt(x), e = energy(x), a = level(c && e >= 0 ? [0.5, 0.7, 0.85, 1][e] : 0), pump = e >= 2 ? 1 - 0.55 * exp(-6 * mod(x, 1)) : 1
      let l = 0, r = 0
      saws.forEach((s, j) => { const [p, q] = s(hz((c ? c[3][j % c[3].length] : 60) - 60, C4)); l += p; r += q })
      const fc = cut(e >= 2 ? 3800 : 1400)
      return verb(0.07 * a * pump * lp[0](l, fc), 0.07 * a * pump * lp[1](r, fc))
    }
  },
}`
  },
}
function polyComp(o, tone, color, gain, label, formula) {
  o.need('instruments', tone, 'chorus', 'tape')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '${color}',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(${tone}, { release: 0.3, life: 8 }), fire = trigger(), lp = [filter('lp'), filter('lp')], cut = smooth(400)
    const ch = chorus({ mix: 0.4 }), tp = tape({ wow: 0.0008 }), verb = reverb({ room: 0.8, wet: 0.28 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) c[3].forEach((n, i) => keys.hit(hz(n - 60, C4), h.vel * (0.9 + 0.1 * hash(floor(x), i)), h.d * sec * 0.95, i * 0.012))
      const t = x * sec, y = ${gain} * keys(), trem = ${tone === 'epianoTone' ? '0.25 * sin(TAU * 3.5 * t)' : '0'}, f = cut(energy(x) <= 0 ? 1600 : 6000)
      return verb(...tp(...ch(lp[0]((1 - trem) * y, f), lp[1]((1 + trem) * y, f))))
    }
  },
}})()`
}

const PADS = {
  strings: o => {
    o.need('instruments', 'strings', 'chorus')
    return `{
  color: '#d9b8ff',
  graph: x => (padOn(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (padOn(x) && ${GATE(3.9)} ? chordAt(x)[3].map(n => n - 12 * (n > 64)) : []),
  formula: ${JSON.stringify(['S = \\Rev\\,\\Cho\\,\\LP\\,\\HP\\sum_{j}\\sum_{u=-1}^{1}\\saw\\!\\Big(f_j\\,2^{\\,(0.09u + 0.12\\sin 2\\pi r_{j,u}T)/12}\\Big)'])},
  audio() {
    const s = strings({ voices: 4, attack: 700, release: 1400, cutoff: 2600, gain: ${round(0.036 * (o.gain ?? 1))} }), ch = chorus({ mix: 0.4 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => {
      const [l, r] = s(padOn(x) ? chordAt(x)[3].map(n => hz(n - 60 - 12 * (n > 64), C4)) : [])${o.hard ? ', d = pumpAt(x)' : ', d = 1'}
      return verb(...ch(d * l, d * r))
    }
  },
}`
  },
  choirpad: o => {
    o.need('instruments', 'voice', 'VOWELS')
    return `{
  color: '#c9b6ff',
  graph: x => (padOn(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (padOn(x) && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['Ch = \\Rev\\sum_{j} \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\BP_{F_i}\\,\\saw(f_j),\\quad F = \\text{«а»}'])},
  audio() {
    const vs = [0, 1, 2, 3].map(j => voice({ size: 1 - 0.04 * j, breath: 0.05 })), level = smooth(400), verb = reverb({ room: 0.92, wet: 0.55 })
    return x => {
      const c = chordAt(x), a = level(padOn(x) ? 1 : 0)
      let l = 0, r = 0
      vs.forEach((v, j) => { const y = v(hz((c ? c[3][j % c[3].length] : 60) - 60, C4) * (1 + 0.002 * j), VOWELS.a, 1); l += y * (j % 2 ? 0.4 : 0.6); r += y * (j % 2 ? 0.6 : 0.4) })
      return verb(0.24 * a * l, 0.24 * a * r)
    }
  },
}`
  },
}

// bass: the style's line from the chord's root ('R'), fifth, octave, third, or a chromatic approach
// to the next root ('A'); 'eighths' = octave-jumping eighths; 'octaves' = root/octave bounce
const bassData = line => (MT ? bassDataMeter(line) : `const BASS_LINE = ${JSON.stringify(line)}
const bassAt = x => {
  const c = chordAt(x), e = energy(x)
  if (!c || e < 1 || x >= END - 1) return null
  const p = mod(x, 4), bar = floor(x / 4) * 4
  ${line === 'eighths' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.4 ? { n: c[2] + 12 * (k % 2), at: bar + k / 2, d: 0.4 } : null`
    : line === 'walking' ? `// a walking bass: the root on a chord's first beat, chord tones up or down the beats between, and on the beat
  // before the next chord a half step above or below its root (the chromatic approach)
  const b = floor(x), j = b - c[0], L = c[1], nx = chordAt(c[0] + L) ?? c, up = hash(c[0], 17) < 0.6
  if (x - b > 0.9) return null
  let n = c[2]
  if (j === L - 1 && L > 1) n = nx[2] + (hash(b, 23) < 0.5 ? -1 : 1)
  else if (j > 0) { const steps = up ? [0, c[5][0], c[5][1], 12] : [12, c[5][1], c[5][0], 0]; n = c[2] + steps[j % 4] - (up ? 0 : 12) }
  while (n < 28) n += 12
  while (n > 45) n -= 12
  return { n, at: b, d: 0.9 }`
    : line === 'octaves' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.42 ? { n: c[2] + (k === 7 ? c[5][1] : k % 2 ? 12 : 0), at: bar + k / 2, d: 0.42 } : null`
    : `let hit = null
  for (const h of BASS_LINE) if (h[0] <= p && p < h[0] + h[2]) hit = h
  if (!hit) return null
  const next = chordAt(bar + 4) ?? c, [third, fifth] = c[5]
  const n = hit[1] === 'R' ? c[2] : hit[1] === '5' ? c[2] + fifth : hit[1] === '8' ? c[2] + 12 : hit[1] === '3' ? c[2] + third : next[2] - 1
  return { n, at: bar + hit[0], d: hit[2] }`}
}`)
// the bass in another meter: eighths and octaves fill the bar; a line goes root – octave – … – fifth by the groups
const bassDataMeter = line => {
  const lines = MT.bars.map(bassFor)
  return `const BASS_LINE = ${JSON.stringify(lines.length > 1 ? lines : lines[0])} // [beat in the bar, R / 8 / 5, length], by the meter's groups
const bassAt = x => {
  const c = chordAt(x), e = energy(x)
  if (!c || e < 1 || x >= END - 1) return null
  const p = inBar(x), bar = barStart(x), L = barLen(x)
  ${line === 'eighths' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.4 ? { n: c[2] + 12 * (k % 2), at: bar + k / 2, d: 0.4 } : null`
    : line === 'octaves' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.42 ? { n: c[2] + (k === floor(2 * L) - 1 ? c[5][1] : k % 2 ? 12 : 0), at: bar + k / 2, d: 0.42 } : null`
    : `const list = Array.isArray(BASS_LINE[0][0]) ? BASS_LINE[barIndex(x) % 2] : BASS_LINE
  let hit = null
  for (const h of list) if (h[0] <= p && p < h[0] + h[2]) hit = h
  if (!hit) return null
  const fifth = c[5][1]
  return { n: hit[1] === 'R' ? c[2] : hit[1] === '5' ? c[2] + fifth : c[2] + 12, at: bar + hit[0], d: hit[2] }`}
}`
}
const BASSES = {
  upright: o => {
    o.need('instruments', 'uprightTone')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#9fd3ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['U(f,t,v) = v\\big(e^{-1.2t}\\sin 2\\pi ft + 0.45e^{-2.5t}\\sin 4\\pi ft + 0.18e^{-4.5t}\\sin 6\\pi ft + 0.4e^{-60t}\\sin 2\\pi\\,1.5ft\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = poly(uprightTone, { release: 0.08, life: 4 }), fire = trigger(), lp = filter('lp')
    return x => {
      const m = bassAt(x)
      if (fire(m ? m.at : null)) b.hit(hz(m.n - 60, C4), 0.85 + 0.15 * hash(floor(2 * x), 6), m.d * sec)
      return 0.115 * lp(b(), 1600)
    }
  },
}})()`
  },
  warmbass: o => {
    o.need('engine', 'osc')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['B = 0.3\\,\\LP_{250+1400a}\\big(a\\,\\saw(f)\\big) + 0.28\\,a\\sin 2\\pi\\!\\int\\! f,\\quad a = e^{-2.5\\tau}'])},
  audio() {
    const saw = osc('saw'), sine = osc('sine'), lp = filter('lp'), gate = filter('lp')
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const f = hz(n - 60, C4), a = gate(m && x - m.at < m.d * 0.92 ? exp((-2.5 * (x - m.at)) / Math.max(1, m.d)) : 0, 60)
      return 0.32 * lp(a * saw(f), 250 + 1400 * a) + 0.3 * a * sine(f)
    }
  },
}})()`
  },
  triangle: o => {
    o.need('instruments', 'triangle4')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['T(f) = \\lfloor 8\\,\\tri(\\varphi)\\rfloor/8\\quad\\text{— 4-битный треугольник NES}'])},
  audio() {
    const tri = triangle4(), lp = filter('lp'), gate = smooth(1)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      return 0.105 * gate(m && x - m.at < m.d ? 1 : 0) * lp(tri(hz(n - 60, C4)), 7000)
    }
  },
}})()`
  },
  octbass: o => {
    o.need('engine', 'osc')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['B = \\LP_{300 + 2500e^{-12\\tau}}\\big(e^{-3\\tau}\\saw(f)\\big) + 0.3e^{-3\\tau}\\sin 2\\pi\\!\\int\\! f'])},
  audio() {
    const saw = osc('saw'), sine = osc('sine'), lp = filter('lp'), gate = smooth(2)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const τ = m ? x - m.at : 9, a = gate(m ? exp(-3 * τ) : 0), f = hz(n - 60, C4)
      return 0.28 * lp(a * saw(f), 300 + 2500 * exp(-12 * τ)) + 0.2 * a * sine(f)
    }
  },
}})()`
  },
  cello: o => {
    o.need('instruments', 'bowed')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#c08a5a',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\ s = \\saw(f) + 0.04\\eta\\quad\\text{— виолончель}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bow = bowed({ base: C4, body: 0.6, sec }), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.32 })
    return x => {
      const m = bassAt(x)
      return verb(...pan(0.17 * bow(m && { n: m.n - 60, d: m.d, τ: x - m.at }, x * sec), -0.1))
    }
  },
}})()`
  },
}

// arpeggios: voicing tones an octave up, cycling up and down; with poly = a note every 3/4 beat
// (a 4-against-3 polyrhythm), else straight steps
const arpData = (step, poly) => `const ARP_STEP = ${poly ? 0.75 : step} // beats${poly ? ': a note every 3/4 beat — 4 against 3' : ''}
const arpAt = x => {
  const e = energy(x)
  if (e < 0 || !['intro', 'bridge', 'break', 'final', 'solo'].includes(role(x))) return null
  const j = floor(x / ARP_STEP), c = chordAt(j * ARP_STEP)
  if (!c) return null
  const v = c[3], cyc = [0, 1, 2, 3, 2, 1], i = cyc[j % cyc.length] % v.length
  return { n: v[i] + 12 - 60, at: j * ARP_STEP, d: ARP_STEP * 0.9, vel: 0.35 + 0.15 * (j % 2 === 0) }
}`
const arpGraph = lane => `graph: x => (arpAt(x) ? ${lane[0]} + (arpAt(x).n + 5) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? [60 + arpAt(x).n] : []),`
const ARPS = {
  marimba: o => polyArp(o, 'marimbaTone', '#ffc38a', 0.19, ['M(f,t,v) = v\\,e^{-t(2+f/500)}\\big(\\sin 2\\pi ft + 0.25e^{-12t}\\sin 2\\pi\\,3.93ft + \\ldots\\big)']),
  vibes: o => polyArp(o, 'vibesTone', '#b8f0ff', 0.11, ['V(f,t,v) = v\\,e^{-t/2.2}\\big(\\sin 2\\pi ft + 0.3e^{-5t}\\sin 2\\pi\\,3.98ft + \\ldots\\big)']),
  piano: o => polyArp(o, 'pianoTone', '#ffffff', 0.18, ['P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(\\ldots\\big)\\sin 2\\pi f_k t']),
  bells: o => {
    o.need('instruments', 'fm')
    return polyArp(o, '(f, t, v) => v * fm(f, t, { ratio: 3.5, index: 1.8, decay: 2.2, idecay: 6 })', '#fff3b0', 0.11, ['B = v\\,e^{-2.2t}\\sin\\!\\big(2\\pi ft + 1.8e^{-6t}\\sin 2\\pi\\,3.5ft\\big)'])
  },
  harpsichordarp: o => {
    o.need('instruments', 'plucker')
    return `(() => {
  ${arpData(o.step, o.poly)}
  return {
  color: '#f2d38a',
  ${arpGraph(o.lane)}
  formula: ${JSON.stringify(['y_{k+N} = 0.995\\big(0.65y_k + 0.35y_{k+1}\\big)'])},
  audio() {
    const p = plucker({ life: 2, decay: 0.995 }), fire = trigger(), verb = reverb({ room: 0.8, wet: 0.3 })
    return x => {
      const m = arpAt(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), m.vel, { bright: 0.65 })
      return verb(...pan(0.32 * p(), -0.3))
    }
  },
}})()`
  },
  pulsearp: o => {
    o.need('instruments', 'pulse', 'vol4')
    return `(() => {
  ${arpData(o.step, false)}
  return {
  color: '#9fe8ff',
  ${arpGraph(o.lane)}
  formula: ${JSON.stringify(['y = \\vol(e^{-6\\tau})\\,\\Pi_{1/8}(f)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.125), lp = filter('lp'), gate = smooth(1.5), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.25 })
    let n = 0
    return x => {
      const m = arpAt(x)
      if (m) n = m.n
      return echo(...pan(0.25 * gate(m ? vol4(exp(-6 * (x - m.at))) : 0) * lp(p(hz(n, C4)), 8000), -0.3))
    }
  },
}})()`
  },
  sawarp: o => {
    o.need('engine', 'osc')
    return `(() => {
  ${arpData(o.step, false)}
  return {
  color: '#58e1ff',
  ${arpGraph(o.lane)}
  formula: ${JSON.stringify(['y = \\Dly\\big[\\LP_{800 + 4000e^{-10\\tau}}\\big(e^{-5\\tau}\\saw(f)\\big)\\big]\\quad\\text{— пинг-понг эхо на 3/4 доли}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, o = osc('saw'), lp = filter('lp'), gate = smooth(2), echo = delay({ time: sec * 0.75, feedback: 0.45, wet: 0.45 })
    let n = 0
    return x => {
      const m = arpAt(x), τ = m ? x - m.at : 9
      if (m) n = m.n
      return echo(...pan(0.13 * gate(m ? exp(-5 * τ) : 0) * lp(o(hz(n, C4)), 800 + 4000 * exp(-10 * τ)), -0.25))
    }
  },
}})()`
  },
}
function polyArp(o, tone, color, gain, formula) {
  if (/^\w+$/.test(tone)) o.need('instruments', tone)
  return `(() => {
  ${arpData(o.step, o.poly)}
  return {
  color: '${color}',
  ${arpGraph(o.lane)}
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(${tone}, { release: 0.4, life: 4 }), fire = trigger(), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.85, wet: 0.35 })
    return x => {
      const m = arpAt(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), m.vel, m.d * sec + 0.3)
      return verb(...echo(...pan(${gain} * p(), -0.35)))
    }
  },
}})()`
}

// drums: patterns as strings, 16 steps per bar; swing moves the off-beat eighths to SW
const drumData = drums => (MT ? drumDataMeter(drums) : `// drum patterns: 16 steps per bar — x hit, o ghost, - rest; by section energy
const GROOVES = ${JSON.stringify(drums, null, 2).replace(/\n/g, '\n')}
const GROOVE_BY_ENERGY = [null, 'light', 'full', 'busy']
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = 4 * b, e = energy(x), hits = []
  const name = e >= 0 ? GROOVE_BY_ENERGY[e] : null
  const last = b % 8 === 7 || (x + 4 < END && energy(x + 4) !== e)
  if (name) {
    const g = { ...GROOVES[name], ...(last && e >= 2 ? GROOVES.fill : {}) }
    for (const [drum, steps] of Object.entries(g)) {
      for (let i = 0; i < 16; i++) {
        const c = steps[i]
        if (c !== 'x' && c !== 'o') continue
        const pos = Math.floor(i / 4) + (i % 4 === 2 ? SW : (i % 4) / 4)
        hits.push([pos, drum, (c === 'x' ? 1 : 0.4) * (0.82 + 0.18 * hash(16 * b + i, drum.length))])
      }
    }
  }
  if (role(x) === 'outro' && x === sectionOf(x)[0]) hits.push([0, 'kick', 0.8]) // a last downbeat
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
  return hits
}
// the latest hit of a drum at x → { τ (beats), vel } or null
function lastHit(x, drum) {
  for (let b = floor(x / 4); b >= floor(x / 4) - 1 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v }
    if (best) return best
  }
  return null
}`)
// the drums of another meter: the style's grooves made again for its bars (grooveFor) — kicks and backbeats on its groups
const drumDataMeter = drums => {
  const G = Object.fromEntries(Object.entries(drums).map(([name, lines]) => [name, MT.bars.length > 1 ? MT.bars.map(bm => grooveFor(lines, bm, name)) : grooveFor(lines, MT.bars[0], name)]))
  const comp = MT.compound
  return `// drum patterns in ${MT.label}: ${comp ? 'triplet eighths (3 a beat)' : 'sixteenths'} — x hit, o ghost, - rest; by section energy${MT.bars.length > 1 ? '; a pattern per kind of bar' : ''}
const GROOVES = ${JSON.stringify(G, null, 2)}
const GROOVE_BY_ENERGY = [null, 'light', 'full', 'busy']
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = barStartOf(b), L = barLenOf(b), e = energy(x), hits = []
  const name = e >= 0 ? GROOVE_BY_ENERGY[e] : null
  const last = b % 8 === 7 || (x + L < END && energy(x + L) !== e)
  const pick = g => (Array.isArray(g) ? g[b % 2] : g)
  if (name) {
    const g = { ...pick(GROOVES[name]), ...(last && e >= 2 && GROOVES.fill ? pick(GROOVES.fill) : {}) }
    for (const [drum, steps] of Object.entries(g)) {
      for (let i = 0; i < steps.length; i++) {
        const c = steps[i]
        if (c !== 'x' && c !== 'o') continue
        const pos = ${comp ? 'i / 3' : 'Math.floor(i / 4) + (i % 4 === 2 ? SW : (i % 4) / 4)'}
        hits.push([pos, drum, (c === 'x' ? 1 : 0.4) * (0.82 + 0.18 * hash(16 * b + i, drum.length))])
      }
    }
  }
  if (role(x) === 'outro' && x === sectionOf(x)[0]) hits.push([0, 'kick', 0.8]) // a last downbeat
  barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
  return hits
}
// the latest hit of a drum at x → { τ (beats), vel } or null
function lastHit(x, drum) {
  for (let b = barIndex(x); b >= barIndex(x) - 1 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && barStartOf(b) + p <= x) best = { τ: x - barStartOf(b) - p, vel: v }
    if (best) return best
  }
  return null
}`
}
const drumGraph = `graph: x => {
    const h = lastHit(x, 'kick') ?? lastHit(x, 'timp')
    return h && h.τ < 2 ? 3 + 1.4 * h.vel * exp(-5 * h.τ) : null
  },
  midi: x => {
    const notes = []
    for (const [d, n] of [['kick', 36], ['snare', 38], ['rim', 37], ['clap', 39], ['hat', 42], ['open', 46], ['ride', 51], ['shaker', 70], ['brush', 38], ['tom', 45], ['timp', 41]]) {
      const h = lastHit(x, d)
      if (h && h.τ < 0.1) notes.push(n)
    }
    return notes
  },`
const KITS = {
  boombap: o => {
    o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'rimDrum', 'tape')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify(['K = e^{-7\\tau}\\tanh\\!\\Big(2\\sin 2\\pi\\!\\int\\!\\big(45 + 110e^{-40\\tau}\\big)dT\\Big),\\quad S = 0.6e^{-14t}\\HP_{900}\\eta + 0.4e^{-28t}\\sin 2\\pi\\,180t', 'y = \\Rev\\,\\Tape\\,\\LP_{6000}\\big(0.8K + 0.4S + 0.1H + 0.25\\,\\text{rim}\\big),\\quad \\text{свинг } 0.6'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 45, f1: 110, decay: 7, drive: 2 }), snare = snareDrum({ tone: 180, cutoff: 900, decay: 14 })
    const hat = hatDrum({ decay: 70 }), open = hatDrum({ decay: 9 }), rim = rimDrum(), lp = filter('lp'), tp = tape({ drive: 1.6 }), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.16 })
    const play = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const y = 0.56 * play(x, 'kick', kick, 1) + 0.28 * play(x, 'snare', snare, sec) + 0.07 * play(x, 'hat', hat, sec)
        + 0.056 * play(x, 'open', open, sec) + 0.18 * play(x, 'rim', rim, sec)
      return verb(...tp(...pan(lp(y, 6000))))
    }
  },
}})()`
  },
  bossa: o => {
    o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'rimDrum', 'shakerDrum')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify(['\\text{клаве: кросс-стик } e^{-60t}(0.6\\sin 2\\pi\\,1700t + 0.4\\sin 2\\pi\\,560t),\\quad \\text{шейкер: } (1-e^{-400t})e^{-35t}\\BP_{6500}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 70, sweep: 25, decay: 5, drive: 1 }), rim = rimDrum(), tap = snareDrum({ tone: 200, cutoff: 1500, decay: 18 })
    const shaker = shakerDrum(), ride = hatDrum({ decay: 2.5, cutoff: 4500, ring: 0.85 }), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.2 })
    const hit = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const y = 0.64 * hit(x, 'kick', kick, 1) + 0.21 * hit(x, 'rim', rim, sec) + 0.14 * hit(x, 'brush', tap, sec) + 0.11 * hit(x, 'shaker', shaker, sec) + 0.08 * hit(x, 'ride', ride, sec)
      return verb(...pan(y, 0.1))
    }
  },
}})()`
  },
  electro: o => {
    o.need('instruments', 'kickDrum', 'snareDrum', 'clapDrum', 'hatDrum')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify(['K = e^{-6\\tau}\\tanh\\!\\Big(1.6\\sin 2\\pi\\!\\int\\!\\big(50 + 170e^{-35\\tau}\\big)dT\\Big),\\quad \\text{снейр + хлопок в «гейтованном» ревербе}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 170, sweep: 35, decay: 6, drive: 1.6 }), snare = snareDrum({ tone: 200, cutoff: 1200, decay: 11 }), clap = clapDrum()
    const hat = hatDrum({ decay: 55, cutoff: 8000 }), open = hatDrum({ decay: 8 }), tom = kickDrum({ f0: 110, f1: 90, sweep: 12, decay: 9, drive: 1.2 })
    const verb = reverb({ room: 0.55, damp: 0.6, wet: 0.2 }), gateVerb = reverb({ room: 0.7, damp: 0.3, wet: 0.6 }), hp = filter('hp')
    const hit = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const s = lastHit(x, 'snare'), g = s && s.τ * sec < 0.22 ? 1 : 0.05 // the 80s gate
      const [sl, sr] = gateVerb(...pan(0.23 * hit(x, 'snare', snare, sec) + 0.14 * hit(x, 'clap', clap, sec)))
      const y = 0.53 * hit(x, 'kick', kick, 1) + 0.065 * hp(hit(x, 'hat', hat, sec), 6000) + 0.05 * hit(x, 'open', open, sec) + 0.21 * hit(x, 'tom', tom, 1)
      const [l, r] = verb(...pan(y))
      return [l + g * sl, r + g * sr]
    }
  },
}})()`
  },
  chip: o => {
    o.need('instruments', 'lfsr', 'triangle4')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify(['\\text{бочка: }\\tri\\big(2\\pi\\!\\int\\!(60 + 200e^{-30\\tau})\\big)e^{-10\\tau},\\quad \\text{снейр/хэт: } \\lfsr(f_r)\\,e^{-k t}\\ \\text{(шумовой канал NES)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, tri = triangle4(), white = lfsr(), tick = lfsr({ metal: true })
    const hit = (x, d) => lastHit(x, d)
    return x => {
      const k = hit(x, 'kick'), s = hit(x, 'snare'), h = hit(x, 'hat')
      const kick = k && k.τ < 0.5 ? k.vel * exp(-10 * k.τ) * tri(60 + 200 * exp(-30 * k.τ)) : (tri(60), 0)
      const sn = white(12000), snare = s && s.τ * sec < 0.3 ? s.vel * exp(-14 * s.τ * sec) * sn : 0
      const tk = tick(30000), hat = h && h.τ * sec < 0.08 ? h.vel * exp(-50 * h.τ * sec) * tk : 0
      return pan(0.7 * kick + 0.32 * snare + 0.11 * hat)
    }
  },
}})()`
  },
  orchestral: o => {
    o.need('instruments', 'kickDrum')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#d98b5f',
  ${drumGraph}
  formula: ${JSON.stringify(['\\text{литавры: } e^{-3\\tau}\\tanh\\!\\big(\\sin 2\\pi\\!\\int\\!(f_{\\text{осн}} + 30e^{-20\\tau})\\big),\\ f_{\\text{осн}} \\text{ — бас аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, verb = reverb({ room: 0.9, damp: 0.4, wet: 0.45 }), lp = filter('lp')
    let ph = 0
    return x => {
      const h = lastHit(x, 'timp'), c = chordAt(x)
      const f0 = c ? hz(c[2] - 60 + (c[2] < 43 ? 12 : 0), C4) : 73.4
      ph += (f0 + (h ? 30 * exp(-20 * h.τ * sec) : 0)) / 44100
      const y = h ? h.vel * exp(-3 * h.τ * sec) * Math.tanh(1.5 * sin(TAU * ph)) : 0
      return verb(...pan(0.34 * lp(y, 1200), -0.2))
    }
  },
}})()`
  },
  space: o => {
    o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum')
    return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify(['K = e^{-5\\tau}\\tanh\\!\\Big(\\sin 2\\pi\\!\\int\\!\\big(42 + 90e^{-30\\tau}\\big)dT\\Big),\\quad \\text{снейр в бесконечном ревербе}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 42, f1: 90, sweep: 30, decay: 5, drive: 1 }), snare = snareDrum({ tone: 160, cutoff: 700, decay: 9 }), hat = hatDrum({ decay: 40 })
    const verb = reverb({ room: 0.93, damp: 0.3, wet: 0.5 })
    const hit = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => verb(...pan(0.8 * hit(x, 'kick', kick, 1) + 0.3 * hit(x, 'snare', snare, sec) + 0.06 * hit(x, 'hat', hat, sec)))
  },
}})()`
  },
}

const TEXTURES = {
  // a jazz club: the room's murmur (noise through two moving vowel-like bands), a glass touching another now and then
  club: o => {
    o.need('engine', 'noise')
    return `{
  color: '#8f7f6a',
  graph: x => (x < END ? -2.95 + 0.03 * sin(TAU * x / 2) : null),
  formula: ${JSON.stringify(['\text{клуб: } \BP_{F_1(T)}\eta + \BP_{F_2(T)}\eta\ \text{(гул голосов)} + \sum e^{-t/0.3}\sin 2\pi\,(2.6\text{к}, 4.1\text{к})\,t\ \text{(бокалы)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(5), b1 = filter('bp'), b2 = filter('bp'), lp = filter('lp')
    return x => {
      const T = x * sec, n = η(), m = 0.5 + 0.5 * sin(TAU * 0.13 * T)
      const talk = 0.5 * b1(n, 450 + 200 * m, 3) + 0.35 * b2(n, 1300 + 400 * sin(TAU * 0.07 * T), 4)
      const j = floor(x / 3), t = (x - 3 * j - 1.3 * hash(j, 41)) * sec, clink = hash(j, 43) < 0.25 && t > 0 && t < 1.5 ? exp(-t / 0.3) * (sin(TAU * 2630 * t) + 0.6 * sin(TAU * 4120 * t)) : 0
      const a = x < END ? 1 : 0
      return [a * (0.05 * lp(talk, 2500) + 0.012 * clink), a * (0.05 * lp(talk, 2500) + 0.009 * clink)]
    }
  },
}`
  },
  rain: o => {
    o.need('instruments', 'rain', 'vinyl', 'ar')
    return `{
  color: '#7f8fa6',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x) : null),
  formula: ${JSON.stringify(['\\text{дождь: } \\HP_{400}\\LP_{6000}\\eta + \\sum_i a_i e^{-60t_i}\\sin 2\\pi f_i(1 + 2t_i)t_i\\quad\\text{+ треск винила}'])},
  audio() {
    const r = rain({ wash: 0.06, drops: 0.12 }), v = vinyl({ hiss: 0.01, crackle: 0.3 }), level = ar(1500, 3000)
    return x => {
      const a = level(x > END + 1 ? 0 : ['intro', 'outro', 'break'].includes(role(x)) ? 1 : 0.3), [l, rr] = r(), c = v()
      return [a * l + c, a * rr + c]
    }
  },
}`
  },
  vinyl: o => {
    o.need('instruments', 'vinyl')
    return `{
  color: '#7f8fa6',
  graph: x => (x < END ? -2.95 + 0.03 * sin(TAU * x / 2) : null),
  formula: ${JSON.stringify(['\\text{винил: } 0.012\\,\\LP_{5000}\\eta + \\HP_{1000}(\\text{треск})'])},
  audio() {
    const v = vinyl({ hiss: 0.012, crackle: 0.35 })
    return x => (x < END + 1 ? v() : (v(), 0))
  },
}`
  },
  wind: o => {
    o.need('engine', 'noise')
    return `{
  color: '#6f7fa8',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 8) : null),
  formula: ${JSON.stringify(['\\text{космический ветер: } \\BP_{f(T)}\\eta,\\quad f = 400\\cdot 2^{1.5\\sin(2\\pi T/11)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, n = noise(77), bl = filter('bp'), br = filter('bp'), level = smooth(800)
    return x => {
      const t = x * sec, a = level(x < END ? 0.12 : 0), f = 400 * 2 ** (1.5 * sin(TAU * t / 11))
      return [a * bl(n(), f, 3), a * br(n(), f * 1.07, 3)]
    }
  },
}`
  },
  purr: o => {
    o.need('engine', 'noise')
    return `{
  color: '#c9a27f',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x * 2) : null),
  formula: ${JSON.stringify(['\\text{мурчание: } \\LP_{300}(\\eta)\\cdot\\big(0.6 + 0.4\\sin 2\\pi\\,25T\\big)\\cdot\\big(0.6 + 0.4\\sin \\pi x\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, n = noise(5), lp = filter('lp'), level = smooth(500)
    return x => {
      const t = x * sec, a = level(x < END && ['intro', 'outro', 'bridge'].includes(role(x)) ? 1.5 : 0.5)
      return pan(a * lp(n(), 300) * (0.6 + 0.4 * sin(TAU * 25 * t)) * (0.6 + 0.4 * sin(Math.PI * x)))
    }
  },
}`
  },
}

// ---- boss music: the hardstyle × chiptune sound of overclock and finalbattle ----------------------------------
// The shared part of a boss song: the kick's grid, the sidechain, key changes, the tonic in octave 1
function bossData({ need, key, bpm, sectionInfo }) {
  need('instruments', 'duck')
  const tonic1 = 24 + key.tonic < 27 ? 36 + key.tonic : 24 + key.tonic // D♯1…D2: 39–73 Hz
  const f1 = 440 * 2 ** ((tonic1 - 69) / 12)
  return `
// ---- the fight: the kick, the sidechain, the key changes --------------------------------------------------------
const SEC = 60 / ${bpm} // seconds per beat
const sectionEnd = x => ROLE.find(r => r[0] > x)?.[0] ?? END
const KEY_UP = ${JSON.stringify(sectionInfo.filter(s => s.keyUp).map(s => [s.at, s.keyUp]))} // [start, semitones up]
const trAt = x => { let t = 0; for (const [s, k] of KEY_UP) if (s <= x) t = k; return t }
const TONIC1 = ${tonic1} // MIDI: the tonic in octave 1 — the kick's tail and the reverse bass sit on it
const KICK_GAIN = ${round(1.7 * Math.min(1, (46 / f1) ** 1.2))} // a higher tail carries more energy: (46 Hz / f)^1.2
// the kick: three hits to open ("!"), every beat in a drop; in a build-up it comes in halfway and doubles
// (1, ½, ¼ beat); one last hit to close  → { τ beats since the hit, vel, g the grid }
const kickAt = x => {
  if (x < 0 || x >= END) return null
  const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
  if (r === 'intro') return t < 5 ? { τ: t - [0, 2, 3.5].filter(q => q <= t).pop(), vel: 0.8, g: 2 } : null
  if (r === 'outro') return t < 4 ? { τ: t, vel: 0.9, g: 4 } : null
  const g = e >= 3 ? 1 : r === 'build' ? (t < L / 2 ? 0 : t < 0.75 * L ? 1 : t < 0.875 * L ? 0.5 : 0.25) : 0
  return g ? { τ: mod(t, g), vel: r === 'build' ? 0.55 + (0.4 * t) / L : 1, g } : null
}
// the sidechain: in a drop every part dips under the kick and comes back in 0.18 s
const pumpAt = x => { const k = kickAt(x); return k && energy(x) >= 3 ? duck(k.τ * SEC) : 1 }
`
}
// The boss's solo: a melody that is a graph — two sines, snapped to the chord on the beat and to the scale
// between (finalbattle's "equation"); the coefficients come from the seed
function equationSolo({ need, key, solo, r }) {
  need('engine', 'PI')
  const a = round(4 + 2 * r()), b = round(3 + 2 * r()), ph = round(2 * Math.PI * r()), center = 13 // C♯5, the middle of the hook's range
  return `// the solo is an equation: one note per eighth j, n(j) = ⌊${a} sin(πj/8) + ${b} sin(3πj/16 + ${ph})⌉ around ${spell(center + 60, key)},
// snapped to the chord on the beat and to the scale between — the attack you dodge is the formula you hear
const snapTo = (n, pcs) => { for (let d = 0; d < 7; d++) for (const k of [n - d, n + d]) if (pcs.includes(mod(k, 12))) return k; return n }
const SOLO = Array.from({ length: ${2 * (solo.beats - 2)} }, (_, j) => {
  const c = chordAt(${solo.at} + j / 2), raw = ${center} + Math.round(${a} * sin((PI * j) / 8) + ${b} * sin((3 * PI * j) / 16 + ${ph}))
  return [j / 2, snapTo(raw, j % 2 === 0 && c ? c[3].map(n => mod(n, 12)) : SCALE), 0.5]
})`
}

// H(x) — the supersaw hook: 7 saws and 5 an octave up, portamento, ducked under the kick
LEADS.supersaw = o => {
  o.need('engine', 'supersaw')
  return `{
  color: '#ffffff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.5\\,d(t_k)\\,\\LP_{7000}\\big(\\SS_7(f) + 0.5\\,\\SS_5(2f)\\big)\\Big],\\qquad f = 261.63\\cdot 2^{n/12}\\ \\text{(портаменто 18 мс)}', 'd(t_k) = 1 - 0.7\\big(1 - t_k/0.18\\big)^2\\ \\text{(сайдчейн от бочки в дропах)}'])},
  audio() {
    const main = supersaw({ voices: 7, detune: 0.27, seed: 3 }), oct = supersaw({ voices: 5, detune: 0.21, seed: 5 })
    const lpL = filter('lp'), lpR = filter('lp'), gate = smooth(6), glide = smooth(18), fx = reverb({ room: 0.88, wet: 0.4 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const a = ${round(0.5 * o.gain)} * gate(m && m.u < 0.92 ? 1 : 0) * pumpAt(x), f = glide(hz(n, C4))
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f)
      return fx(a * lpL(l1 + 0.5 * l2, 7000, 0.8), a * lpR(r1 + 0.5 * r2, 7000, 0.8))
    }
  },
}`
}
COUNTER_VOICE.supersaw = 'pulse12'

// O(x) — brass stabs: the voicing on four 5-voice supersaws, a low-pass snapping shut after each hit
CHORDS.brass = o => {
  o.need('engine', 'supersaw')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffb347',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.4 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(0.35, h.d * 0.9) ? c[3] : [] },
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.4\\,d\\,v\\,(1 - e^{-t/5\\text{мс}})\\,e^{-t/0.3}\\,\\LP_{400 + 6000e^{-t/60\\text{мс}}}\\sum_{j=1}^{4}\\SS_5(f_j)\\Big],\\quad f_j \\text{ — голоса аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, voices = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.12, seed: 40 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), fx = reverb({ room: 0.9, wet: 0.42 })
    let v = [57, 60, 64, 69]
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (c) v = c[3]
      const t = h ? (x - h.at) * sec : 9, a = h && c ? h.vel * (1 - exp(-t / 0.005)) * exp(-t / 0.3) : 0
      let l = 0, r = 0
      voices.forEach((s, j) => { const [p, q] = s(hz(v[j % v.length] - 60, C4)); l += p; r += q })
      const k = 0.25 * a * pumpAt(x), fc = 400 + 6000 * exp(-t / 0.06)
      return fx(k * lpL(l, fc, 0.9), k * lpR(r, fc, 0.9))
    }
  },
}})()`
}

// G(x) — the growl: saw + square driven into tanh, a resonant low-pass snapping shut after each sixteenth
// (0, 0, 12, 0, 0, 7, 0, 10 over the root); a note a beat when calm; the drops belong to the reverse bass
BASSES.growl = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const GROWL = [0, 0, 12, 0, 0, 7, 0, 10]
  const growlAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || e >= 3 || x >= END - 1) return null
    const [s, r] = sectionOf(x), t = x - s, j = floor(4 * x), τ = mod(x, 0.25)
    if (r === 'bridge' || r === 'intro' || (r === 'build' && t >= (sectionEnd(x) - s) / 2)) return r !== 'build' && mod(x, 1) < 0.85 ? { n: c[2], τ: mod(x, 1) } : null
    return τ < 0.18 ? { n: c[2] + GROWL[mod(j, 8)], τ } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (growlAt(x) ? ${o.lane[0]} + (growlAt(x).n - 28) / 24 : null),
  midi: x => (growlAt(x) ? [growlAt(x).n] : []),
  formula: ${JSON.stringify(['y = 0.3\\tanh\\!\\Big(1.5\\Big[\\LP_{180 + 2600e^{-t/70\\text{мс}}}^{\\,Q=2}\\tanh\\!\\big(5(\\saw(f) + 0.6\\sq(1.003f))\\big) + 0.6\\sin 2\\pi\\!\\int\\! f\\,dT\\Big]\\Big)', 'f = 261.63\\cdot 2^{(r + g_j - 60)/12},\\qquad g = (0, 0, 12, 0, 0, 7, 0, 10)_{\\lfloor 4x\\rfloor \\bmod 8}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, sw = osc('saw'), sq = osc('square'), sub = osc('sine'), lp = filter('lp'), gate = smooth(3), glide = smooth(4)
    let n = 40
    return x => {
      const g = growlAt(x)
      if (g) n = g.n
      const f = glide(hz(n - 60, C4)), a = gate(g ? 1 : 0), t = g ? g.τ * sec : 1
      const y = lp(tanh(5 * (sw(f) + 0.6 * sq(1.003 * f))), 180 + 2600 * exp(-t / 0.07), 2) + 0.6 * sub(f)
      return 0.3 * a * tanh(1.5 * y)
    }
  },
}})()`
}
// T(x) — the 4-bit triangle bass of the chip sections: octave eighths; a whole bar when calm
BASSES.chiptri = o => {
  o.need('instruments', 'triangle4')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || e >= 3 || x >= END - 1) return null
    const [s, r] = sectionOf(x)
    if (r === 'build' && x - s >= (sectionEnd(x) - s) / 2) return null
    if (r === 'bridge' || r === 'intro' || r === 'build') return mod(x, 1) < 0.8 ? { n: c[2], at: floor(x) } : null
    return mod(x, 0.5) < 0.4 ? { n: c[2] + 12 * mod(floor(2 * x), 2), at: floor(2 * x) / 2 } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['T(f) = \\lfloor 8\\,\\tri(\\varphi)\\rfloor/8\\quad\\text{— 4-битный треугольник NES, октавы восьмыми}'])},
  audio() {
    const tri = triangle4(), lp = filter('lp'), gate = smooth(1)
    let n = 40
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      return 0.3 * gate(m ? 1 : 0) * lp(tri(hz(n - 60, C4)), 8000)
    }
  },
}})()`
}

// R(x) — the reverse bass: a swell u² between the kicks of a drop, on the chord's root in octave 1;
// rolling (two swells a beat) in the final
function reverseBassTrack(o) {
  o.need('instruments', 'reverseBass')
  return `(() => {
  const rbassAt = x => {
    const c = chordAt(x)
    if (!c || energy(x) < 3 || x >= END) return null
    const p = mod(x, 1)
    if (p < 0.5) return null
    return { u: role(x) === 'final' ? mod(p - 0.5, 0.25) / 0.25 : (p - 0.5) / 0.5, n: 27 + mod(c[2] - 27, 12) }
  }
  return {
  color: '#b0123e',
  graph: x => { const b = rbassAt(x); return b ? ${o.lane[0]} + 0.1 + 0.8 * b.u * b.u + (b.n - 27) / 40 : null },
  midi: x => (rbassAt(x) && rbassAt(x).u > 0.3 ? [rbassAt(x).n] : []),
  formula: ${JSON.stringify(['y = \\HP_{25}\\,\\LP_{150\\cdot 2^{4.2u}}\\tanh\\!\\Big(5u^2\\big(0.4\\saw(f) + 0.4\\saw(1.006f) + 0.8\\sin 2\\pi\\!\\int\\! f\\,dT\\big)\\Big)', 'u = \\frac{(x \\bmod 1) - \\tfrac12}{\\tfrac12}\\ \\text{(дроп)},\\qquad u = \\frac{(x - \\tfrac12) \\bmod \\tfrac14}{\\tfrac14}\\ \\text{(катящийся бас в финале)}'])},
  audio() {
    const rb = reverseBass({ drive: 5, open: 4.2, q: 1.4 }), lp = filter('lp')
    return x => {
      const b = rbassAt(x)
      return ${round(0.7 * (o.gain ?? 1))} * lp(rb(b ? b.u : null, hz(b ? b.n - 60 : -24, C4)), 2500)
    }
  },
}})()`
}

// P(x) — the 60 Hz chip arpeggio: the chord a note per frame (⌊60T⌋ mod 3); in a drop a sixteenth broken
// chord over two octaves (0 1 2 3 4 3 2 1), eighths in the chip sections, a slow beat when calm
ARPS.chip60 = o => {
  o.need('instruments', 'pulse', 'vol4')
  return `(() => {
  const arpAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END) return null
    const v = c[3].slice(0, 3)
    if (e >= 3) {
      const i = [0, 1, 2, 3, 4, 3, 2, 1][mod(floor(4 * x), 8)]
      return { notes: [v[i % 3] + 12 * floor(i / 3)], a: 0.55 * exp(-10 * mod(x, 0.25)) }
    }
    if (e === 2) return { notes: v, a: 0.5 * exp(-4 * mod(x, 0.5)) }
    return { notes: v, a: 0.35 * exp(-2 * mod(x, 1)) }
  }
  return {
  color: '#ffe08a',
  graph: x => (arpAt(x) && arpAt(x).a > 0.12 ? arpAt(x).notes.map(n => ${o.lane[0]} + (n - 55) / 40) : null),
  midi: x => (arpAt(x) && arpAt(x).a > 0.15 ? arpAt(x).notes : []),
  formula: ${JSON.stringify(['y = \\Rev\\Big[d\\,\\vol(0.1 + a)\\,\\LP_{11\\text{k}}\\,\\Pi_{1/8}\\big(f_{c_i}\\big)\\Big],\\qquad i = \\lfloor 60T\\rfloor \\bmod 3', 'a = 0.55e^{-10(x \\bmod \\frac14)},\\ c = (0,1,2,3,4,3,2,1)_{\\lfloor 4x\\rfloor \\bmod 8}\\ \\text{(дроп)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.125), lp = filter('lp'), verb = reverb({ room: 0.78, wet: 0.35 })
    return x => {
      const s = arpAt(x), n = s ? s.notes[mod(floor(60 * x * sec), s.notes.length)] : 69
      const y = 1.5 * pumpAt(x) * (s ? vol4(0.1 + s.a) : 0) * lp(p(hz(n - 60, C4)), 11000)
      return verb(...pan(y, 0.35))
    }
  },
}})()`
}

// K(x) — the hardstyle kick: a pitch dive f(1 + 30e^{−t/4ms} + 2e^{−t/30ms}) through two tanh stages, its tail
// on the tonic (following the key changes); MIDI 36 on every hit — Glitch Forest takes its rhythm from it
function hardKickTrack(o) {
  o.need('instruments', 'hardKick')
  return `{
  color: '#ff3b6b',
  graph: x => { const k = kickAt(x); return k && k.τ < 0.5 ? 2.6 + 1.9 * k.vel * exp(-6 * k.τ) : null },
  midi: x => { const k = kickAt(x); return k && k.τ < Math.min(0.25, k.g / 2) ? [36] : [] },
  formula: ${JSON.stringify(['y = 0.8\\tanh\\!\\Big(2.2\\,\\LP_{5200}\\big[\\tanh(8(s + 0.3)) - \\tanh 2.4\\big]\\Big) + 0.5e^{-t/1.5\\text{мс}}\\HP_{3000}\\eta + 0.55\\,a\\sin 2\\pi\\!\\int\\! f\\,dT', 's = a\\sin 2\\pi\\!\\int f\\big(1 + 30e^{-t/4\\text{мс}} + 2e^{-t/30\\text{мс}}\\big)\\,2^{-7\\min(1,\\,(t-0.3)^+/0.12)/12}\\,dT,\\qquad f \\text{ — тоника в 1-й октаве}'])},
  audio() {
    const k = hardKick({ tail: 0.3, drop: 7, drive: 8, bias: 0.3, tone: 5200, sub: 0.55 })
    return x => {
      const h = kickAt(x)
      return ${o.gain && o.gain !== 1 ? `${o.gain} * ` : ''}KICK_GAIN * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, hz(TONIC1 + trAt(x) - 60, C4), !!h)
    }
  },
}`
}
// D(x) — the kit around the kick: clap on 2 and 4, off-beat hats and a crash in a drop; a chip groove (triangle
// kick, noise snare) in the chip sections; a snare roll doubling (1, ½, ¼, ⅛) through a build-up
KITS.hardstyle = o => {
  o.need('instruments', 'clapDrum', 'hatDrum', 'lfsr', 'triangle4', 'vol4')
  o.need('engine', 'noise')
  return `(() => {
  const barCache = new Map()
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, drum.length))]))
    if (x < END) {
      const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
      if (r === 'build') {
        const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
        for (let p = 0; p < 4; p += step) add('snare', 0.35 + (0.5 * (t + p)) / L, p)
      } else if (e >= 3) {
        add('clap', 1, 1, 3)
        for (let i = 0; i < 4; i++) add('hat', 0.8, i + 0.5)
        if (r === 'final' || r === 'solo') for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.25, i + 0.75)
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (b % 8 === 7) add('clap', 0.7, 3.5, 3.75)
      } else if (e === 2) {
        add('chip', 1, 0, 2.5)
        add('snare', 0.8, 1, 3)
        for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.45 : 0.7, i / 2)
        if (b % 4 === 3) add('snare', 0.6, 3.25, 3.5, 3.75)
      } else if (r === 'intro') {
        if (t === 0) add('crash', 1, 0)
        if (t + 4 >= L) for (let i = 0; i < 8; i++) add('snare', 0.4 + 0.07 * i, 2 + i / 4) // a roll into the theme
      } else if (r === 'outro') {
        if (t === 0) add('crash', 1, 0)
      } else if (t >= L / 2) for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.5)
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
  return {
  color: '#ff6f91',
  graph: x => {
    const c = lastHit(x, 'clap'), s = lastHit(x, 'snare')
    if (x >= END) return null
    if (c && c.τ < 0.3) return 3.6 + 0.7 * c.vel * exp(-8 * c.τ)
    return s && s.τ < 0.2 ? 3.2 + 0.6 * s.vel * exp(-10 * s.τ) : null
  },
  midi: x => (x >= END ? [] : [['chip', 35], ['snare', 38], ['clap', 39], ['hat', 42], ['crash', 49]].filter(([d]) => lastHit(x, d)?.τ < 0.1).map(([, n]) => n)),
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.9\\,\\text{Clap}(t) + 0.36\\,\\vol(e^{-12t})\\lfsr_{12\\text{k}} + 0.3\\,\\text{Hat}(t) + 0.3e^{-2t}\\HP_{4000}\\eta + 0.6\\,\\tri_4(60 + 300e^{-30t})\\Big]', '\\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18\\ \\text{доли}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, clap = clapDrum({ center: 1450 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), tri = triangle4()
    const sn = lfsr(), η = noise(31), hp = filter('hp'), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const at = d => { const h = x < END ? lastHit(x, d) : null; return h ? { t: h.τ * sec, v: h.vel } : { t: 9, v: 0 } }
      const c = at('clap'), s = at('snare'), h = at('hat'), k = at('chip'), cr = at('crash')
      const y = 0.9 * c.v * clap(c.t, c.t < 0.4) + 0.36 * s.v * vol4(exp(-12 * s.t)) * sn(12000) + 0.3 * h.v * hat(h.t, h.t < 0.1)
        + 0.3 * cr.v * exp(-2 * cr.t) * hp(η(), 4000) + 0.6 * k.v * (k.t < 0.15 ? tri(60 + 300 * exp(-30 * k.t)) : (tri(60), 0))
      return verb(1.2 * y, 1.2 * y)
    }
  },
}})()`
}
// F(x) — fx: the "!" alarm at the start (dominant and tonic in square waves), the build-ups' riser (a noise
// band climbing 300 → 12 000 Hz and a pulse siren), a falling sweep into every drop
TEXTURES.riser = o => {
  o.need('engine', 'noise')
  o.need('instruments', 'pulse')
  return `{
  color: '#c9b8ff',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.5
    return r === 'intro' && t < 2 ? 4.5 : null
  },
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.08\\,\\Pi_{1/2}\\big(f_5 \\,|\\, f_1\\big) + 0.6a^2\\,\\BP_{300\\cdot 2^{5.3a}}\\eta + 0.12a\\,\\Pi_{1/2}(220\\cdot 2^{4a}) + 0.5e^{-1.5t}\\BP_{8000\\cdot 2^{-4t}}\\eta\\Big],\\quad a = t/L'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(23), bp = filter('bp'), bp2 = filter('bp'), siren = pulse(0.5), alarm = pulse(0.5), verb = reverb({ room: 0.85, wet: 0.45 })
    const f5 = hz(TONIC1 + 55 - 60, C4), f1 = hz(TONIC1 + 60 - 60, C4)
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, a = r === 'build' ? t / (sectionEnd(x) - s) : 0
      let y = 0.6 * a * a * bp(η(), 300 * 2 ** (5.3 * a), 1.5) + 0.12 * a * siren(220 * 2 ** (4 * a))
      const down = e >= 3 && t < 3 ? t * sec : 9
      y += 0.5 * exp(-1.5 * down) * bp2(η(), 8000 * 2 ** (-4 * down), 1)
      const al = alarm(mod(floor(2 * t), 2) ? f1 : f5)
      if (r === 'intro' && t < 2 && mod(t, 0.5) < 0.4) y += 0.08 * al
      return verb(y, y)
    }
  },
}`
}

// ---- the orchestra of the classical and romantic styles ---------------------------------------------------------
// a sustained solo instrument built once and fed (f, on): horn, oboe, clarinet; n shifted by `dn` semitones
const sustainedLead = ({ make, imports, color, gain, dn = 0, formula, fx = 'hall' }) => o => {
  o.need('instruments', ...imports)
  return `{
  color: '${color}',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [${60 + dn} + m.n] : [] },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, inst = ${make}, ${FX[fx].init.slice(2)}
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(gain * o.gain)} * inst(hz(n + ${dn}, C4), !!m && m.u < 0.93)${o.hard ? ' * pumpAt(x)' : ''}
      return ${FX[fx].out('y', o.pan)}
    }
  },
}`
}
LEADS.horn = sustainedLead({
  make: 'horn({ bright: 0.6 })', imports: ['horn'], color: '#f4a261', gain: 0.5, dn: -12,
  formula: ['Hn = 0.7y + 0.5\\,\\BP_{450}y,\\quad y = \\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g + \\saw 1.0023g\\big)\\,e(t),\\quad f_c = 250 + 2500\\,e(t)^{1.6}', 'g = f\\cdot 2^{(-0.5e^{-t/25\\text{мс}} + 0.12\\,s(t)\\sin 2\\pi\\,5.2T)/12}\\ \\text{— валторна, октавой ниже темы}'],
})
LEADS.oboe = sustainedLead({
  make: "reed({ kind: 'oboe' })", imports: ['reed'], color: '#ffe8a3', gain: 0.4,
  formula: ['Ob = a\\big(0.3\\,s + \\BP_{1100}^{Q=4}s + 0.6\\BP_{2800}^{Q=4}s\\big),\\quad s = \\LP\\,\\HP_{350}\\,\\Pi_{0.18}(g)\\quad\\text{— узкий импульс, носовые форманты гобоя}'],
})
LEADS.clarinet = sustainedLead({
  make: "reed({ kind: 'clarinet' })", imports: ['reed'], color: '#d8f3dc', gain: 0.75,
  formula: ['Cl = a\\big(0.3\\,s + 0.3\\BP_{1500}s + 0.15\\BP_{3000}s\\big),\\quad s = \\LP_{3200}\\,\\Pi_{1/2}(f)\\quad\\text{— меандр: только нечётные гармоники (шалюмо)}'],
})
LEADS.cellolead = o => {
  o.need('instruments', 'bowed')
  return `{
  color: '#c08a5a',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [48 + m.n] : [] },
  formula: ${JSON.stringify(['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{(n - 12 + v)/12}\\big)\\quad\\text{— виолончель поёт тему октавой ниже}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bow = bowed({ base: C4, body: 0.6, sec }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.4 })
    return x => { const m = ${o.at}(x); return verb(...pan(${round(0.3 * o.gain)} * bow(m && { ...m, n: m.n - 12 }, x * sec), ${o.pan})) }
  },
}`
}
LEADS.celesta = o => struck('celestaTone', ['celestaTone'], { release: 0.5, life: 4, gain: 0.35, fx: FX.echoHall, formula: ['Ce = v\\,e^{-t(1.2 + f/900)}\\big(\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,4ft + 0.08v\\,e^{-60t}\\sin 2\\pi\\,9.2ft\\big)'] })({ ...o, color: '#fff3b0' })
Object.assign(COUNTER_VOICE, { horn: 'clarinet', oboe: 'clarinet', clarinet: 'oboe', cellolead: 'violin', celesta: 'flute' })

// ---- jazz -----------------------------------------------------------------------------------------------------------------
LEADS.sax = sustainedLead({
  make: 'sax()', imports: ['sax'], color: '#ffc46b', gain: 0.28, fx: 'room',
  formula: ['Sx = a\\big(0.35\\,\\LP_{f_c}s + 0.8\\BP_{600}s + 0.55\\BP_{1700}s + 0.3\\BP_{2900}s\\big) + 0.07\\BP_{2g}\\eta,\\quad s = \\saw(g) + 0.3\\sin 2\\pi g t', 'f_c = 600 + 3800a^{1.5}\\ \\text{(громче — ярче)},\\quad g = f\\cdot 2^{(-0.35e^{-t/40\\text{мс}} + 0.16\\,s(t)\\sin 2\\pi\\cdot5.4T)/12}\\ \\text{— тенор-саксофон'],
})
LEADS.trumpet = sustainedLead({
  make: 'horn({ bright: 2.2 })', imports: ['horn'], color: '#ffe08a', gain: 0.32, fx: 'room',
  formula: ['Tp = 0.7y + 0.5\\,\\BP_{450}y,\\quad y = \\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g + \\saw 1.0023g\\big)e(t),\\quad f_c = 250 + 9200\\,e(t)^{1.6}\\ \\text{— труба'],
})
Object.assign(COUNTER_VOICE, { sax: 'trumpet', trumpet: 'sax' })
// the swing kit: the ride ("ding ding-a ding"), the hi-hat closed by the foot on 2 and 4, the bass drum feathered, the snare
// comping; brushes in the quiet sections; when the horn rests in trading fours, the drummer solos (snare, toms, kick, the
// crash on the last bar's downbeat) on a swung triplet grid
KITS.jazz = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'brushDrum', 'metal', 'taikoDrum')
  return `(() => {
  ${drumData(o.drums)}
  // trading fours: the bars where the drums answer the soloist
  const drumSolo = x => role(x) === 'trade' && mod(floor((x - sectionOf(x)[0]) / 16), 2) === 1
  const soloCache = new Map()
  function soloHits(b) {
    if (soloCache.has(b)) return soloCache.get(b)
    const hits = [], first = mod(b, 4) === 0
    for (let i = 0; i < 12; i++) { // triplet eighths: 3 a beat
      const r = hash(12 * b + i, 31), pos = floor(i / 3) + [0, 1 / 3, 2 / 3][i % 3]
      if (first && i === 0) { hits.push([0, 'crash', 1]); continue }
      if (r < 0.32) hits.push([pos, 'snare', 0.55 + 0.4 * hash(i, b)])
      else if (r < 0.48) hits.push([pos, 'tom', 0.7])
      else if (r < 0.58) hits.push([pos, 'kick', 0.8])
    }
    soloCache.set(b, hits)
    return hits
  }
  const soloHit = (x, drum) => { let best = null; for (const [p, d, v] of soloHits(floor(x / 4))) if (d === drum && 4 * floor(x / 4) + p <= x) best = { τ: x - 4 * floor(x / 4) - p, vel: v }; return best }
  return {
  color: '#7fb0ff',
  ${drumGraph.replace("lastHit(x, 'kick') ?? lastHit(x, 'timp')", "lastHit(x, 'ride') ?? lastHit(x, 'kick')")}
  formula: ${JSON.stringify(['Ride = e^{-t/0.9}\\BP_{6.5\\text{к}}\\,m(t) + 0.4e^{-t/0.015}\\HP_{9\\text{к}}\\eta + 0.3e^{-t/0.6}\\sin 2\\pi\\,3.2\\text{к}t,\\quad m \\text{ — шесть квадратных волн 808 (металл)}', '\\text{райд «динг — динг-а — динг» со свингом 0.66, хай-хэт ногой на 2 и 4; в обмене квадратами — соло барабанов триолями'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 52, f1: 90, decay: 9, drive: 1.2 }), snare = snareDrum({ tone: 210, cutoff: 1500, decay: 16 })
    const hat = hatDrum({ decay: 55, cutoff: 7000 }), brush = brushDrum(), cym = metal(1), cym2 = metal(0.83), bp = filter('bp'), hp = filter('hp'), bp2 = filter('bp')
    const tom = taikoDrum({ pitch: 130, decay: 0.35, bend: 1, crack: 0.25, boom: 0.15, seed: 71 }), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.18 })
    const play = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const m1 = cym(), m2 = cym2(), solo = drumSolo(x)
      // the ride (or, in a drum solo, the crash)
      const r = solo ? soloHit(x, 'crash') : lastHit(x, 'ride'), t = r ? r.τ * sec : 9
      const ride = r ? r.vel * (exp(-t / (solo ? 1.6 : 0.9)) * bp(m1 + m2, solo ? 5200 : 6500, 1.2) + 0.4 * exp(-t / 0.015) * hp(m1, 9000) + (solo ? 0 : 0.3 * exp(-t / 0.6) * Math.sin(6.283 * 3200 * t))) : (bp(m1 + m2, 6500, 1.2), hp(m1, 9000), 0)
      let y = 0.16 * ride
      if (solo) {
        const sn = soloHit(x, 'snare'), tm = soloHit(x, 'tom'), kk = soloHit(x, 'kick')
        y += 0.3 * (sn ? sn.vel * snare(sn.τ * sec, true) : snare(1, false)) + 0.4 * (tm ? tm.vel * tom(tm.τ * sec, true) : tom(9, false)) + 0.5 * (kk ? kk.vel * kick(kk.τ, true) : kick(1, false))
        y += 0.05 * play(x, 'hat', hat, sec)
      } else {
        y += 0.45 * play(x, 'kick', kick, 1) + 0.22 * play(x, 'snare', snare, sec) + 0.07 * play(x, 'hat', hat, sec) + (tom(9, false), 0)
        const b = lastHit(x, 'brush')
        y += 0.5 * brush(b ? b.vel * exp(-b.τ * 2.2) : 0)
      }
      return verb(...pan(y, 0.05))
    }
  },
}})()`
}

// Alberti bass: low – high – middle – high in eighths from the voicing (Mozart, Haydn, Clementi); a held chord when calm
CHORDS.alberti = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const albertiAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3]
    if (e === 0) return { notes: v, at: floor(x / 2) * 2, d: 2, vel: 0.4 }
    const j = floor(2 * x)
    return { notes: [[v[0], v[v.length - 1], v[1], v[v.length - 1]][j % 4]], at: j / 2, d: 0.5, vel: (j % 4 ? 0.32 : 0.45) + 0.08 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const a = albertiAt(x); return a ? a.notes.map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const a = albertiAt(x); return a && x - a.at < a.d * 0.9 ? a.notes : [] },
  formula: ${JSON.stringify(['\\text{Альберти: } (v_1, v_4, v_2, v_4)_{\\lfloor 2x\\rfloor \\bmod 4}\\ \\text{восьмыми},\\quad P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\sin 2\\pi f_k t'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.3, life: 5 }), fire = trigger(), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.3 })
    return x => {
      const a = albertiAt(x)
      if (a && fire(a.at)) a.notes.forEach((n, i) => keys.hit(hz(n - 60, C4), a.vel, a.d * sec * 1.6, i * 0.01))
      return verb(...pan(0.32 * keys(), 0.15))
    }
  },
}})()`
}
// the figure of Bach's C major Prelude: two low notes, then three repeated twice — (v₁ v₂ v₃ v₄ v₂′ v₃ v₄ v₂′) per half bar
CHORDS.prelude = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const figureAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3], j = floor(4 * x), fig = [c[2] + 12, v[0], v[1], v[2], v[3] ?? v[0] + 12, v[1], v[2], v[3] ?? v[0] + 12]
    return { n: fig[j % 8], at: j / 4, d: j % 8 < 2 ? 2 - (j % 8) / 4 : 0.25, vel: (j % 8 === 0 ? 0.5 : 0.36) + 0.05 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const f = figureAt(x); return f ? ${o.lane[0]} + (f.n - 48) / 20 : null },
  midi: x => { const f = figureAt(x); return f && x - f.at < 0.2 ? [f.n] : [] },
  formula: ${JSON.stringify(['\\text{фигура прелюдии Баха: } (b,\\ v_1, v_2, v_3, v_4, v_2, v_3, v_4)_{\\lfloor 4x\\rfloor \\bmod 8}\\ \\text{шестнадцатыми, ноты тянутся (педаль)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.4, life: 5 }), fire = trigger(), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.32 })
    return x => {
      const f = figureAt(x)
      if (f && fire(f.at)) keys.hit(hz(f.n - 60, C4), f.vel, (2 - mod(f.at, 2)) * sec)
      return verb(...pan(0.3 * keys(), 0.1))
    }
  },
}})()`
}
// pipe organ: the voicing held on flue pipes 8′ 4′ 2⅔′ 2′, louder stops in the louder sections
CHORDS.pipeorgan = o => {
  o.need('instruments', 'organ')
  return `{
  color: '#c9a227',
  graph: x => (chordAt(x) && energy(x) >= 0 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['O = \\Rev\\sum_{j}\\sum_{s \\in \\{1, 2, 3, 4\\}} a_s\\sin\\big(2\\pi\\,s f_j\\,(1 \\pm 0.0008)\\,t\\big) + \\text{«чифф»}\\ 0.25e^{-t/0.05}\\BP_{3f}\\eta\\quad\\text{— регистры } 8^\\prime, 4^\\prime, 2\\tfrac23^\\prime, 2^\\prime'])},
  audio() {
    const o = organ({ voices: 4, gain: 0.1 }), level = smooth(200), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => {
      const c = chordAt(x), e = energy(x), a = level(c && e >= 0 ? [0.6, 0.75, 0.9, 1][e] : 0)
      const [l, r] = o(c && e >= 0 && ${GATE(3.95)} ? c[3].map(n => hz(n - 60, C4)) : [])
      return verb(a * l, a * r)
    }
  },
}`
}
// nocturne piano: the bass, then a wide broken chord over two octaves in eighths (Chopin's left hand)
CHORDS.nocturne = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const nocAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3], j = floor(2 * x), b = c[2] + (c[2] < 40 ? 12 : 0)
    const fig = [b, b + 7, v[1], v[2], v[3] ?? v[0] + 12, v[2], v[1], b + 7]
    return { n: fig[j % 8], at: j / 2, vel: (j % 8 === 0 ? 0.55 : 0.34) + 0.05 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const f = nocAt(x); return f ? ${o.lane[0]} + (f.n - 40) / 24 : null },
  midi: x => { const f = nocAt(x); return f && x - f.at < 0.4 ? [f.n] : [] },
  formula: ${JSON.stringify(['\\text{левая рука ноктюрна: } (b,\\ b + 7,\\ v_2, v_3, v_4, v_3, v_2,\\ b + 7)_{\\lfloor 2x\\rfloor \\bmod 8}\\ \\text{— широкое арпеджио на две октавы, педаль'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.5, life: 6 }), fire = trigger(), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.35 })
    return x => {
      const f = nocAt(x)
      if (f && fire(f.at)) keys.hit(hz(f.n - 60, C4), f.vel, (4 - mod(f.at, 4)) * sec)
      return verb(...pan(0.3 * keys(), 0.1))
    }
  },
}})()`
}
// harp: the chord rolled upwards (35 ms a string) with the bass under it, on the comping hits
CHORDS.harpchords = o => {
  o.need('instruments', 'harpTone')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffd6e0',
  graph: x => (compAt(x) && chordAt(x) && x - compAt(x).at < 1 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(1, h.d * 0.9) ? [c[2] + 12, ...c[3]] : [] },
  formula: ${JSON.stringify(['Hp(f,t,v) = 0.55\\sum_{k=1}^{10}\\frac{|\\sin(\\pi k/7)|}{k^{1.4}}\\,v^{0.3+0.12k}e^{-0.4\\sqrt{f/220}\\,(1 + 0.35k^{1.3})t}\\sin 2\\pi kft,\\quad \\text{арпеджато вверх по 35 мс}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(harpTone, { release: 0.6, life: 6, max: 24 }), fire = trigger(), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) [c[2] + 12, ...c[3], c[3][1] + 12].forEach((n, i) => p.hit(hz(n - 60, C4), h.vel * 0.9, h.d * sec + 1, i * 0.035))
      return verb(...pan(0.34 * p(), -0.2))
    }
  },
}})()`
}
// a brass choir: the voicing held on four horn-like voices, swelling with the section's energy
CHORDS.brasschoir = o => {
  o.need('instruments', 'brass')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#f4a261',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(['Br = \\sum_{j}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)e(t),\\quad f_c = 250 + 2100\\,e(t)^{1.6}\\ \\text{(чем громче, тем ярче)}'])},
  audio() {
    const b = brass({ voices: 4, bright: 0.5, gain: 0.26 }), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => {
      const h = compAt(x), c = chordAt(x), on = h && c && x - h.at < h.d * 0.92
      return verb(...b(on ? c[3].map(n => hz(n - 60, C4)) : [], h ? 0.5 + 0.5 * h.vel : 0.6))
    }
  },
}})()`
}
ARPS.harp = o => polyArp(o, 'harpTone', '#ffd6e0', 0.26, ['Hp(f,t,v) = 0.55\\sum_{k=1}^{10}\\frac{|\\sin(\\pi k/7)|}{k^{1.4}}\\,v^{0.3+0.12k}e^{-d_k t}\\sin 2\\pi kft\\quad\\text{— арфа, щипок на } 1/7 \\text{ струны}'])
ARPS.celesta = o => polyArp(o, 'celestaTone', '#fff3b0', 0.2, ['Ce = v\\,e^{-t(1.2 + f/900)}\\big(\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,4ft + \\ldots\\big)\\quad\\text{— челеста'])
// the orchestral kit: real timpani (the kettle's modes) on the chord's bass
KITS.orchestral = o => {
  o.need('instruments', 'timpaniTone')
  return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#d98b5f',
  ${drumGraph}
  formula: ${JSON.stringify(['Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\\big),\\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65),\\ f \\text{ — бас аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(timpaniTone, { release: 0.8, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.4 })
    return x => {
      const h = lastHit(x, 'timp'), c = chordAt(x)
      if (h && h.τ < 0.05 && fire(x - h.τ)) p.hit(hz((c ? c[2] : 38) + ((c ? c[2] : 38) < 41 ? 12 : 0) - 60, C4), h.vel)
      return verb(...pan(0.26 * p(), -0.2))
    }
  },
}})()`
}

// ---- the Japanese battle (jbattle) -----------------------------------------------------------------------------
const pumpIf = o => (o.hard ? ' * pumpAt(x)' : '')
// shinobue an octave above the theme; shakuhachi as written (meri attacks, yuri on the long notes)
LEADS.shinobue = o => {
  o.need('instruments', 'shinobue')
  return `{
  color: '#ff5a5f',
  ${graphLead(o.at, o.lane).replace('[60 + m.n]', '[72 + m.n]')}
  formula: ${JSON.stringify(['Sb = a\\Big(0.55\\sin 2\\pi\\!\\!\\int\\! g + 0.28\\sin 4\\pi\\!\\!\\int\\! g + 0.15\\sin 6\\pi\\!\\!\\int\\! g + 0.05\\sin 8\\pi\\!\\!\\int\\! g + 0.05\\BP_{2g}\\eta + 0.4e^{-t/30\\text{мс}}\\HP_{4000}\\eta\\Big)', 'g = 2f\\cdot 2^{0.15\\,s(t)\\sin(2\\pi\\cdot 5.8T)/12}\\ \\text{— синобуэ, октавой выше темы}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fl = shinobue(), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(0.9 * o.gain)} * fl(hz(n + 12, C4), !!m && m.u < 0.93)${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
LEADS.shakuhachi = o => {
  o.need('instruments', 'shakuhachi')
  return `{
  color: '#c8e6a0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Sh = a\\Big(\\tanh\\big(1.2(0.62\\sin 2\\pi\\!\\!\\int\\! g + 0.15\\sin 4\\pi\\!\\!\\int\\! g + 0.06\\sin 6\\pi\\!\\!\\int\\! g)\\big) + 0.16\\big(\\BP_{g}\\eta + \\tfrac12\\BP_{2g}\\eta\\big) + \\text{мураики}\\Big)', 'g = f\\cdot 2^{\\big(-0.7(1 - s(t/0.14)) + 0.3\\,s(\\frac{t - 0.35}{0.55})\\sin(2\\pi\\cdot4.6T)\\big)/12}\\quad\\text{— мэри снизу, юри на долгих нотах}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, sh = shakuhachi(), echo = delay({ time: sec * 1.5, feedback: 0.25, wet: 0.18 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.42 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(1.0 * o.gain)} * sh(hz(n, C4), !!m && m.u < 0.95, { accent: m && m.d * sec > 0.8 ? 0.6 : 0.1 })${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
// koto: a pluck per note, oshide (pressed up to the next note of the key and let go) on some long notes
LEADS.koto = o => {
  o.need('instruments', 'koto')
  return `{
  color: '#8ecae6',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y[k] = e[k] + g\\big(a\\,y[k - D] + (1 - a)\\,y[k - D - 1]\\big),\\ D = \\tfrac{44100}{f(t)} - \\delta,\\quad f(t) = f_0\\,2^{\\,b\\,(s(\\frac{t - 0.25}{0.1}) - s(\\frac{t - t_r}{0.1}))/12}\\ \\text{(осидэ)}', 'Ko = 0.75\\,\\LP_{6500}y + 0.7\\BP_{210}y + 0.4\\BP_{650}y + 0.35\\HP_{2500}(\\text{цумэ})'])},
  audio({ bpm }) {
    const sec = 60 / bpm, k = koto(), fire = trigger(), verb = reverb({ room: 0.86, damp: 0.35, wet: 0.34 })
    const upStep = n => { for (let s = 1; s < 3; s++) if (SCALE.includes(mod(n + s + 60, 12))) return s; return 0 }
    return x => {
      const m = ${o.at}(x)
      if (m && fire(m.at)) {
        const press = m.d * sec > 0.7 && SCALE.includes(mod(m.n + 60, 12)) && hash(floor(m.at * 2), 5) < 0.45 ? upStep(m.n) : 0
        k.hit(hz(m.n, C4), 0.8, { bend: press, bendAt: 0.25, bendTime: 0.1, back: press ? 0.25 + 0.6 * m.d * sec : 0 })
      }
      return verb(...pan(${round(4 * o.gain)} * k()${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
// shamisen: a pluck per note, sixteenth tremolo on notes of a beat or longer
LEADS.shamisen = o => {
  o.need('instruments', 'shamisen')
  return `{
  color: '#ffd166',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y[k] = e[k] + g\\big(a\\,y[k - D] + \\ldots\\big),\\quad D = \\tfrac{44100}{f}\\big(1 - 0.012\\max(0, y[k-1])\\big)\\ \\text{— савари}', 'Sm = 0.45\\HP y + 1.1\\BP_{450}y + 0.75\\BP_{1800}y + 0.35\\BP_{3200}y + 0.5\\BP_{1700}(\\text{бати}),\\quad \\text{тремоло шестнадцатыми на долгих нотах}'])},
  audio() {
    const s = shamisen(), fire = trigger(), verb = reverb({ room: 0.8, damp: 0.45, wet: 0.24 })
    return x => {
      const m = ${o.at}(x)
      if (m && fire(m.d >= 1 ? m.at + floor(4 * m.τ) / 4 : m.at)) s.hit(hz(m.n, C4), m.τ < 0.25 ? 0.9 : 0.55)
      return verb(...pan(${round(2.4 * o.gain)} * s()${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { shinobue: 'shakuhachi', shakuhachi: 'koto', koto: 'shakuhachi', shamisen: 'koto' })
// horn stabs: the voicing on a brass section, cut short (0.4 beat), ducked in the drops
CHORDS.hornstabs = o => {
  o.need('instruments', 'brass')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#f4a261',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.45 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.4 ? c[3] : [] },
  formula: ${JSON.stringify(['Br = \\sum_{j}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)e(t),\\quad f_c = 250 + 4600\\,e(t)^{1.6},\\quad g_j = f_j\\,2^{-0.5e^{-t/25\\text{мс}}/12}'])},
  audio() {
    const b = brass({ voices: 4, bright: 1.1, gain: 0.6 }), verb = reverb({ room: 0.88, wet: 0.38 })
    return x => {
      const h = compAt(x), c = chordAt(x), on = h && c && x - h.at < Math.min(0.42, h.d)
      const [l, r] = b(on ? c[3].map(n => hz(n - 60, C4)) : [], h ? h.vel : 0.5), g = 1${pumpIf(o)}
      return verb(g * l, g * r)
    }
  },
}})()`
}
// timpani as the bass: the style's line on the root and fifth; softer in the drops, where the reverse bass rules
BASSES.timpani = o => {
  o.need('instruments', 'timpaniTone')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#9c6644',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < 0.25 ? [bassAt(x).n + (bassAt(x).n < 38 ? 12 : 0)] : []),
  formula: ${JSON.stringify(['Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\\big),\\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)\\ \\text{— литавры вместо баса'])},
  audio() {
    const p = poly(timpaniTone, { release: 0.6, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n + (m.n < 38 ? 12 : 0) - 60, C4), (energy(x) >= 3 ? 0.55 : 0.85) + 0.1 * hash(floor(2 * x), 4))
      return verb(...pan(0.6 * p(), -0.1))
    }
  },
}})()`
}
// the koto's arpeggio: the voicing an octave up in sixteenths in the drops, eighths in the themes, quarters when calm
ARPS.kotoarp = o => {
  o.need('instruments', 'koto')
  return `(() => {
  const arpAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1 || role(x) === 'build') return null
    const step = e >= 3 ? 0.25 : e === 2 ? 0.5 : 1, j = floor(x / step), v = c[3], cyc = [0, 1, 2, 3, 2, 1]
    return { n: v[cyc[j % 6] % v.length] + 12, at: j * step, vel: e >= 3 ? 0.45 + 0.15 * (j % 4 === 0) : 0.5 }
  }
  return {
  color: '#8ecae6',
  graph: x => (arpAt(x) && x - arpAt(x).at < 0.25 ? ${o.lane[0]} + (arpAt(x).n - 55) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? [arpAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{кото: } n_j = v_{(0,1,2,3,2,1)_{j \\bmod 6}} + 12,\\quad j = \\lfloor x/s\\rfloor,\\ s = \\tfrac14 \\text{ (дроп)},\\ \\tfrac12,\\ 1'])},
  audio() {
    const k = koto({ sustain: 2.4, seed: 29 }), fire = trigger(), verb = reverb({ room: 0.86, wet: 0.34 })
    return x => {
      const m = arpAt(x)
      if (m && fire(m.at)) k.hit(hz(m.n - 60, C4), m.vel)
      return verb(...pan(2.8 * k()${pumpIf(o)}, -0.35))
    }
  },
}})()`
}
// the taiko ensemble: odaiko, nagado, shime-daiko, rims and the atarigane; patterns by role and energy, a roll
// doubling 1 → ½ → ¼ → ⅛ through every build-up
KITS.taiko = o => {
  o.need('instruments', 'taikoDrum', 'woodClack', 'kaneDrum')
  return `(() => {
  const barCache = new Map()
  const PAT = {
    3: { don: 'x---------------', naga: '----x-------x---', shime: 'xoxoxoxoxoxoxoxo', ka: '--x---x---x---x-' },
    2: { don: 'x-----x---x-----', naga: '----x-------x---', shime: 'x-oox-oox-oox-oo', ka: '--x---x---x---x-', kane: 'x---x---x---x---' },
    1: { don: 'x-------x-------', shime: 'x---x---x---x---' },
  }
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, drum.length))]))
    if (x < END) {
      const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
      if (r === 'build') {
        const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
        for (let p = 0; p < 4; p += step) add('naga', 0.35 + (0.55 * (t + p)) / L, p)
        if (t === 0) add('don', 1, 0)
      } else if (r === 'intro') {
        if (t === 0) add('don', 1, 0), add('kane', 1, 0)
        if (t + 4 >= L) for (let i = 0; i < 8; i++) add('naga', 0.4 + 0.07 * i, 2 + i / 4)
      } else if (r === 'outro') {
        if (t === 0) add('don', 1, 0, 1.5, 3), add('naga', 1, 0, 1.5, 3), add('kane', 1, 0)
      } else if (e >= 1) {
        const pat = { ...PAT[Math.min(3, e)] }
        if (e >= 3 && mod(t, 16) === 0) pat.don = 'x-------x-------'
        if (b % 8 === 7 || x + 4 >= sectionEnd(x)) pat.naga = '----x---x-x-xxxx'
        for (const [drum, steps] of Object.entries(pat)) for (let i = 0; i < 16; i++) if (steps[i] === 'x' || steps[i] === 'o') add(drum, steps[i] === 'x' ? 1 : 0.45, i / 4)
      }
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
  return {
  color: '#e63946',
  graph: x => {
    if (x >= END) return null
    const d = lastHit(x, 'don'), n = lastHit(x, 'naga'), s = lastHit(x, 'shime')
    if (d && d.τ < 0.6) return 3.1 + 1.3 * d.vel * exp(-4 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.12 ? 2.3 + 0.5 * s.vel : null
  },
  midi: x => (x >= END ? [] : [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37], ['kane', 80]].filter(([d]) => lastHit(x, d)?.τ < 0.1).map(([, n]) => n)),
  formula: ${JSON.stringify(['T = \\tanh\\!\\Big(1.4\\,\\LP_{3000}\\Big[\\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\\sin\\big(R_k\\,2\\pi f\\,(t + \\gamma\\tau(1 - e^{-t/\\tau}))\\big) + c\\,e^{-t/4\\text{мс}}\\HP\\eta + b\\,e^{-t/0.35d}\\BP_f\\eta\\Big]\\Big)', 'R = (1, 1.52, 1.98, 2.46, 2.92),\\quad f:\\ \\text{одайко } 62,\\ \\text{нагадо } 120,\\ \\text{симэ } 420\\ \\text{Гц};\\quad \\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18'])},
  audio({ bpm }) {
    const sec = 60 / bpm, don = taikoDrum({ pitch: 62, decay: 1.3, crack: 0.25, boom: 0.4, seed: 1 }), naga = taikoDrum({ pitch: 120, decay: 0.55, crack: 0.4, seed: 2 })
    const shime = taikoDrum({ pitch: 420, decay: 0.12, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 1900 }), kane = kaneDrum({ f: 1250, decay: 0.5 })
    const verb = reverb({ room: 0.86, damp: 0.45, wet: 0.3 })
    const hit = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => verb(...pan(0.5 * hit('don', don, x) + 0.28 * hit('naga', naga, x) + 0.15 * hit('shime', shime, x) + 0.08 * hit('ka', ka, x) + 0.12 * hit('kane', kane, x)))
  },
}})()`
}
// fx: the temple bell and thunder at the start, wind in the calm, the riser of every build, a sweep into each drop
TEXTURES.thunder = o => {
  o.need('engine', 'noise')
  o.need('instruments', 'templeBellTone')
  return `{
  color: '#6c757d',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.2
    return r === 'intro' && t < 4 ? -2.9 + 0.2 * sin(9 * x) : null
  },
  formula: ${JSON.stringify(['\\text{гром: } \\LP_{120 + 900e^{-t}}\\eta\\,e^{-t/2};\\ \\text{бонсё: } \\tfrac12, 1, 1.2, 1.5, 2\\ldots f;\\ \\text{подъём: } 0.5u^2\\BP_{300\\cdot 2^{5.3u}}\\eta;\\ \\text{спуск в дроп}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(23), lp = filter('lp'), bp = filter('bp'), bp2 = filter('bp'), wind = filter('bp'), verb = reverb({ room: 0.92, wet: 0.5 })
    const bellF = hz(TONIC1 + 12 - 60, C4)
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), T = x * sec, a = r === 'build' ? t / (sectionEnd(x) - s) : 0
      const th = r === 'intro' ? t * sec : 9
      let y = th < 6 ? 0.45 * exp(-th / 2) * (1 + 3 * exp(-th / 0.05)) * lp(n, 120 + 900 * exp(-th)) : lp(0, 200)
      y += 0.5 * a * a * bp(n, 300 * 2 ** (5.3 * a), 1.5)
      const down = e >= 3 && t < 3 ? t * sec : 9
      y += 0.4 * exp(-1.5 * down) * bp2(n, 8000 * 2 ** (-4 * down), 1)
      y += (r === 'bridge' ? 0.07 : 0) * wind(n, 400 * 2 ** (1.5 * sin((TAU * T) / 9)), 3)
      if (r === 'intro' || r === 'outro') y += 0.4 * templeBellTone(bellF, t * sec, 0.9)
      return verb(2 * y, 2 * y)
    }
  },
}`
}

// ---- modes ----------------------------------------------------------------------------------------------------
// A pitch of the major/minor song → the mode on the same tonic. Seven-note modes map degree to degree; a chromatic
// note (the leading tone of minor, a ♭II) goes to whichever neighbouring degree of the mode lies nearer (ties: the
// lower). Scales of other sizes: the nearest note of the scale (ties: down).
export function modeMapper(key, iv, tr = 0) {
  const PS = key.mode === 'minor' ? MIN : MAJ
  return n => {
    const rel = n - tr - key.tonic, oct = Math.floor(rel / 12), p = rel - 12 * oct
    let to
    if (iv.length === 7) {
      const d = PS.indexOf(p)
      if (d >= 0) to = iv[d]
      else {
        const below = PS.findLastIndex(v => v < p), lo = iv[below], hi = below + 1 < 7 ? iv[below + 1] : 12 + iv[0]
        to = Math.abs(hi - p) < Math.abs(lo - p) ? hi : lo
      }
    } else {
      let bd = 99
      for (const o of [-12, 0, 12]) for (const v of iv) if (Math.abs(v + o - p) < bd) (bd = Math.abs(v + o - p)), (to = v + o)
    }
    return key.tonic + tr + 12 * oct + to
  }
}
// the whole song into the mode: themes, voicings, bass; each chord's third/fifth/seventh and name found again
function toMode({ key, iv, themes, harmony, id }) {
  const M = modeMapper(key, iv), micro = iv.some(v => v !== Math.round(v))
  for (const th of themes) if (th) th.notes = th.notes.map(([b, n, d]) => [b, M(n), d])
  for (const h of harmony) {
    const Mt = modeMapper(key, iv, h.tr)
    h.voicing = h.voicing.map(Mt)
    h.bass = Mt(h.bass)
    if (micro) { describeChord(h, keyWithMode(key, id)); continue }
    const pcs = h.voicing.map(n => pc(n - h.bass)), has = i => pcs.includes(i)
    const third = [4, 3].find(has), fifth = [7, 6, 8].find(has) ?? pc(Mt(h.bass + 7) - h.bass), sev = [10, 11, 9].find(has)
    h.ivs = [third ?? (has(5) ? 5 : 2), fifth, sev ?? 10]
    const q = third === 4 ? (fifth === 8 ? 'aug' : sev === 10 ? '7' : sev === 11 ? 'maj7' : '') : third === 3 ? (fifth === 6 ? (sev === 10 ? 'm7b5' : 'dim') : sev === 10 ? 'm7' : 'm') : has(5) ? 'sus4' : 'sus2'
    h.symbol = chordName({ root: pc(h.bass), quality: q }, key)
  }
}

// A chord in any tuning: its third, fifth and seventh above the bass (fractional in a microtonal mode) and its name —
// a neutral third (3½ semitones) is 'n': C–E𝄳–G = 'Cn', with B𝄳 'Cnⁿ7'
function describeChord(h, skey) {
  const rel = h.voicing.map(n => (((n - h.bass) % 12) + 12) % 12)
  const find = (lo, hi, pref) => rel.filter(v => v > lo && v < hi).reduce((a, v) => (a == null || Math.abs(v - pref) < Math.abs(a - pref) ? v : a), null)
  const third = find(2.6, 4.6, 3.5), fifth = find(5.6, 8.4, 7), sev = find(8.6, 11.6, 10.25)
  const sus = rel.some(v => Math.abs(v - 5) < 0.3) ? 5 : 2
  h.ivs = [third ?? sus, fifth ?? 7, sev ?? 10].map(round)
  const t = third == null ? `sus${sus === 5 ? 4 : 2}` : third < 3.25 ? 'm' : third > 3.75 ? '' : 'n'
  const f = fifth == null || Math.abs(fifth - 7) < 0.25 ? '' : fifth < 7 ? (t === 'm' ? '°' : '♭5') : t === '' ? '+' : '♯5'
  const s = sev == null ? '' : Math.abs(sev - 9) < 0.25 ? '6' : Math.abs(sev - 11) < 0.25 ? 'maj7' : Math.abs(sev - 10.5) < 0.25 ? 'ⁿ7' : '7'
  let q = t.startsWith('sus') ? (s === '7' ? '7' : '') + t : t + f + s
  if (t === 'm' && f === '°') q = sev == null ? '°' : Math.abs(sev - 9) < 0.25 ? '°7' : 'ø7'
  h.symbol = spell(60 + h.bass, skey, false) + q
}
// a quarter-tone tonic: everything made on the semitone above moves down (E → E𝄳), the chords are named again
function shiftPitches({ key, by, name, themes, harmony, id }) {
  for (const th of themes) if (th) th.notes = th.notes.map(([b, n, d]) => [b, round(n + by), d])
  key.tonic = (key.tonic + by + 12) % 12
  key.name = name
  key.shift = by
  const skey = keyWithMode(key, id)
  for (const h of harmony) {
    h.voicing = h.voicing.map(n => round(n + by))
    h.bass = round(h.bass + by)
    describeChord(h, skey)
  }
}

// ---- microtones in a melody (opts.micro) ------------------------------------------------------------------------
// quarter tones: a step of a minor third (or an augmented second) is split by its neutral midpoint (D–F → D E𝄳 F,
//   the gesture of maqam Bayati); a semitone step passes through the quarter tone between (E–F → E E𝄲 F); a long note
//   is reached by a slide from a quarter tone below and turns a quarter tone up before it ends; off the beat the 3rd
//   and 7th degrees turn neutral where the chord doesn't hold them (the colour of maqam Rast);
// eighth tones: expressive intonation — a leading tone rising to the tonic is played an eighth tone high, a ♭6 or ♭2
//   falling a semitone an eighth tone low (as string players and singers do); long notes are scooped from an eighth
//   tone below; semitone steps glide through 25-cent steps.
// Grace notes take their time from the end of the note before them, never from the next beat: the rhythm stays.
function microMelody(notes, { kind, key, chordAt, r }) {
  const out = [], tonic = key.tonic, minor = key.mode === 'minor', q = kind === 'quarter'
  const deg = n => ((Math.round(n - tonic) % 12) + 12) % 12
  const onBeat = b => Math.abs(b - Math.round(b)) < 1e-6
  const chordTone = (n, b) => { const ch = chordAt(b); return !!ch && ch.tones.includes(pc(n)) }
  const push = (b, n, d) => { if (d > 1e-6) out.push([round(b), round(n), round(d)]) }
  notes.forEach(([b, n, d], i) => {
    const next = notes[i + 1], step = next ? next[1] - n : 0, gapless = !!next && Math.abs(next[0] - (b + d)) < 1e-6
    let m = n
    if (q && !onBeat(b) && d <= 1 && n === Math.round(n) && !chordTone(n, b) && r() < 0.6) {
      const g = deg(n)
      if (!minor && (g === 4 || g === 11)) m = n - 0.5
      if (minor && (g === 3 || g === 10)) m = n + 0.5
    }
    if (!q && gapless) {
      const g = deg(n), gn = deg(next[1])
      if (g === 11 && gn === 0 && step === 1) m = n + 0.25 // the leading tone, high
      if (step === -1 && ((minor && g === 8 && gn === 7) || (g === 1 && gn === 0))) m = n - 0.25 // ♭6 → 5, ♭2 → 1, low
    }
    let start = b, len = d
    if (d >= 1.5 && r() < (q ? 0.45 : 0.55)) { // a slide into a long note
      const g = Math.min(0.125, d / 8)
      push(b, m - (q ? 0.5 : 0.25), g)
      start += g
      len -= g
    }
    let tail = null
    if (gapless && len >= 0.5) {
      const a = Math.abs(step), s = Math.sign(step)
      if (q && a === 3 && r() < 0.7) tail = [n + 1.5 * s] // the neutral step
      else if (q && a === 1 && r() < 0.6) tail = [n + 0.5 * s]
      else if (!q && a === 1 && r() < 0.5) tail = [n + 0.25 * s, n + 0.5 * s, n + 0.75 * s] // a glide
    }
    if (!tail && q && len >= 2 && r() < 0.35) tail = [m + 0.5, m] // a quarter-tone turn
    if (tail) {
      const each = Math.min(q ? 0.125 : 1 / 12, len / (2 * tail.length))
      push(start, m, len - each * tail.length)
      tail.forEach((p, k) => push(start + len - each * (tail.length - k), p, each))
    } else push(start, m, len)
  })
  return out
}
// the solo is improvised inside the song: the same inflections, as code (applied to each improvised note)
const microSoloCode = (kind, key) => kind === 'quarter'
  ? `// microtones in the solo: off the beat the ${key.mode === 'minor' ? 'minor 3rd and 7th rise' : '3rd and 7th fall'} a quarter tone (neutral, as in maqam Rast)
const MICRO = (n, b, next) => { const g = mod(Math.round(n) - ${round(key.tonic)}, 12); return mod(b, 1) > 0.01 && (${key.mode === 'minor' ? 'g === 3 || g === 10' : 'g === 4 || g === 11'}) && hash(floor(8 * b), 41) < 0.6 ? ${key.mode === 'minor' ? '0.5' : '-0.5'} : 0 }`
  : `// microtones in the solo: expressive intonation — a leading tone rising to the tonic an eighth tone high, ♭6 → 5 and ♭2 → 1 an eighth tone low
const MICRO = (n, b, next) => { const g = mod(Math.round(n) - ${round(key.tonic)}, 12), h = next == null ? -1 : mod(Math.round(next) - ${round(key.tonic)}, 12); return g === 11 && h === 0 ? 0.25 : (g === 8 && h === 7) || (g === 1 && h === 0) ? -0.25 : 0 }`

// ---- temperaments (opts.temperament) -----------------------------------------------------------------------------
// The song keeps its notes; every frequency passes through tuneHz — the note's offset from 12-TET in cents, by pitch
// class, interpolated between neighbouring notes (so glides and vibrato stay smooth). After a key change up a tuning
// built on the tonic or on the spelling moves with it. Adaptive just intonation tunes every note by its interval to the
// root of the chord sounding at that moment.
function temperData({ temperament: t, key, sectionInfo }) {
  const ups = [...new Set(sectionInfo.map(s => s.keyUp ?? 0))].filter(Boolean)
  const offs = tr => temperOffsets(t.id, { ...key, tonic: (((key.tonic + tr) % 12) + 12) % 12 })
  const head = `
// ---- the tuning: ${t.name}${t.alt ? ` (${t.alt})` : ''} — ${t.short}
// every frequency passes through tuneHz: its note's offset from 12-TET in cents, interpolated between notes`
  const interp = `const tuneHz = f => {
  if (!(f > 0)) return f
  const m = 69 + 12 * Math.log2(f / 440), a = Math.floor(m), u = m - a
  const c = u <= 0.35 ? off(a) : u >= 0.65 ? off(a + 1) : off(a) + ((off(a + 1) - off(a)) * (u - 0.35)) / 0.3
  return f * 2 ** (c / 1200)
}
const hz = (n, base = 110) => tuneHz(hz12(n, base))
let NOW = 0 // the beat being rendered: every track's audio sets it (withNow, at the end)
const withNow = tracks => {
  for (const t of Object.values(tracks)) { const a = t.audio; t.audio = ctx => { const f = a(ctx); return x => ((NOW = x), f(x)) } }
  return tracks
}`
  if (t.kind === 'adaptive') return `${head}
// adaptive: a note k semitones above the root of the chord at NOW — third 5/4 or 6/5, fifth 3/2, the dominant's seventh
// 7/4, a minor seventh 9/5, a major seventh 15/8 (cents from 12-TET); the root itself stays where 12-TET has it
const JUST = [0, 11.731, 3.91, 15.641, -13.686, -1.955, -9.776, 1.955, 13.686, -15.641, 17.596, -11.731]
const off = m => {
  const c = chordAt(NOW)
  if (!c) return 0
  const k = mod(m - Math.round(c[2]), 12), [t3, t5, t7] = c[5]
  if (k === 10) return t3 === 4 && t5 === 7 ? -31.174 : 17.596
  if (k === 6 && t5 === 6) return 9.776
  if (k === 9 && t7 === 9) return 25.39
  return JUST[k]
}
const TEMPER = JUST
${interp}`
  return `${head}
const TEMPER = [${offs(0).join(', ')}] // C C♯ D … B
${ups.length && t.kind !== 'fixed' ? `const TEMPER_UP = { ${ups.map(u => `${u}: [${offs(u).join(', ')}]`).join(', ')} } // after the key changes up
const KEY_UPS = ${JSON.stringify(sectionInfo.filter(s => s.keyUp).map(s => [s.at, s.keyUp]))}
const temperNow = () => { let T = TEMPER; for (const [s, k] of KEY_UPS) if (s <= NOW) T = TEMPER_UP[k]; return T }
const off = m => temperNow()[mod(m, 12)]` : 'const off = m => TEMPER[mod(m, 12)]'}
${interp}`
}

// ---- meters (opts.meter) ---------------------------------------------------------------------------------------------
// A song is made in 4/4 and then its whole time is mapped onto the meter by a piecewise-linear w over a period of `pin`
// beats of 4/4 → `pout` beats, chosen so the notes stay on the grid: 7/8 halves the last beat (2+2+3 eighths), 9/8
// doubles the last eighth (2+2+2+3, aksak), 5/4 doubles the second beat (3+2, as in «Take Five»), 3/4 doubles the first
// beat of every half bar (a waltz), 7/4 halves the last two beats of every two bars (4+3), 7/8+9/8 alternates (2+2+3 |
// 2+2+2+3, two bars of 4/4 in all), 12/8 and 6/8 turn every eighth into the triplet one (a beat = a dotted quarter).
// The drums, the comping and the bass are made for the meter itself: by its groups of beats.
export const METERS = {
  '3/4': { label: '3/4 — вальс', text: '3/4', pin: 2, pout: 3, w: u => (u < 1 ? 2 * u : u + 1), bars: [{ len: 3, groups: [1, 1, 1], kick: [0], back: [2, 4] }] },
  '5/4': { label: '5/4 — 3 + 2', text: '3+2/4', pin: 4, pout: 5, w: u => (u <= 1 ? u : u <= 2 ? 1 + 2 * (u - 1) : u + 1), bars: [{ len: 5, groups: [3, 2], kick: [0, 6], back: [4, 8] }] },
  '7/8': { label: '7/8 — 2 + 2 + 3', text: '2+2+3/8', pin: 4, pout: 3.5, w: u => (u <= 3 ? u : 3 + (u - 3) / 2), bars: [{ len: 3.5, groups: [1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '9/8': { label: '9/8 — 2 + 2 + 2 + 3 (аксак)', text: '2+2+2+3/8', pin: 4, pout: 4.5, w: u => (u <= 3.5 ? u : 3.5 + (u - 3.5) * 2), bars: [{ len: 4.5, groups: [1, 1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '7/4': { label: '7/4 — 4 + 3', text: '4+3/4', pin: 8, pout: 7, w: u => (u <= 6 ? u : 6 + (u - 6) / 2), bars: [{ len: 7, groups: [2, 2, 3], kick: [0, 8], back: [4, 12] }] },
  '7/8+9/8': { label: '7/8 + 9/8 — чередуются', text: '2+2+3/8 | 2+2+2+3/8', pin: 8, pout: 8, w: u => (u <= 3 ? u : u <= 4 ? 3 + (u - 3) / 2 : u <= 7.5 ? u - 0.5 : 7 + (u - 7.5) * 2),
    bars: [{ len: 3.5, groups: [1, 1, 1.5], kick: [0, 4], back: [2, 6] }, { len: 4.5, groups: [1, 1, 1, 1.5], kick: [0, 4], back: [2, 6] }] },
  '12/8': { label: '12/8 — четыре доли по три восьмых', text: '12/8', compound: true, pin: 1, pout: 1, w: u => (u <= 0.5 ? (u * 4) / 3 : 2 / 3 + ((u - 0.5) * 2) / 3), bars: [{ len: 4, groups: [1, 1, 1, 1], kick: [0, 6], back: [3, 9], compound: true }] },
  '6/8': { label: '6/8 — две доли по три восьмых', text: '6/8', compound: true, pin: 1, pout: 1, w: u => (u <= 0.5 ? (u * 4) / 3 : 2 / 3 + ((u - 0.5) * 2) / 3), bars: [{ len: 2, groups: [1, 1], kick: [0], back: [3], compound: true }] },
}
export const METER_LIST = [['4/4', '4/4 — как всегда'], ...Object.entries(METERS).map(([id, m]) => [id, m.label])]
// the song's time in 4/4 → in the meter
const warpOf = M => x => {
  const k = Math.floor(x / M.pin + 1e-9), u = x - k * M.pin
  return round(k * M.pout + M.w(Math.max(0, Math.min(M.pin, u))))
}
// a drum groove of the style, made again for one kind of bar: kicks and backbeats where the meter's groups put them, the
// time-keepers as dense as in 4/4 (16ths, eighths, off-beat eighths, quarters), the open hat on the last eighth, the fill
// across the last group. Steps: sixteenths (or triplet eighths in a compound meter)
function grooveFor(lines, bm, name) {
  const s = bm.compound ? 3 : 4, N = Math.round(bm.len * s), e8 = bm.compound ? 1 : 2, out = {}
  const starts = []
  let acc = 0
  for (const g of bm.groups) { starts.push(Math.round(acc * s)); acc += g }
  const eighthStep = i => (bm.compound ? i : i * 2) // the positions in the bar tables are eighths
  for (const [drum, str] of Object.entries(lines)) {
    const arr = Array(N).fill('-'), hits = [...str].filter(c => c === 'x').length
    if (name === 'fill') {
      const from = starts[starts.length - 1]
      for (let i = from; i < N; i++) arr[i] = (i - from) % e8 === 0 ? 'x' : 'o'
      out[drum] = arr.join('')
      continue
    }
    const kind = /kick|timp|don/.test(drum) ? 'kick' : /snare|clap|rim|brush|tom|naga/.test(drum) ? 'back' : /open|crash/.test(drum) ? 'open' : 'time'
    if (kind === 'kick') {
      for (const p of bm.kick) arr[eighthStep(p)] = 'x'
      if (name === 'busy' || hits >= 4) for (const p of bm.back) { const q = eighthStep(p) - e8; if (q > 0 && arr[q] === '-') arr[q] = 'x' }
      if (name === 'light') for (let i = 1; i < N; i++) if (i !== eighthStep(bm.kick[0])) arr[i] = '-'
    } else if (kind === 'back') {
      const list = name === 'light' ? bm.back.slice(0, 1) : bm.back
      for (const p of list) arr[eighthStep(p)] = 'x'
      if (name === 'busy') for (const p of bm.back) { const q = eighthStep(p) + (bm.compound ? 2 : 3); if (q < N && arr[q] === '-') arr[q] = 'o' }
    } else if (kind === 'open') {
      arr[N - e8] = 'x'
    } else {
      // how dense was it in 4/4: sixteenths, eighths, off-beat eighths only, or quarters
      const on = [...str].map((c, i) => (c !== '-' ? i : -1)).filter(i => i >= 0)
      const six = on.some(i => i % 2 === 1), off = on.length && on.every(i => i % 4 === 2), quarters = on.length && on.every(i => i % 4 === 0)
      for (let i = 0; i < N; i++) {
        const isE8 = i % e8 === 0, isBeat = i % s === 0, groupStart = starts.includes(i)
        if (bm.compound) { if (!off || i % 3 === 2) arr[i] = groupStart ? 'x' : isBeat ? 'x' : 'o' }
        else if (six) arr[i] = isE8 ? 'x' : 'o'
        else if (off) arr[i] = isE8 && !isBeat && i % 4 === 2 ? 'x' : '-'
        else if (quarters) arr[i] = isBeat ? 'x' : '-'
        else arr[i] = isE8 ? 'x' : '-'
      }
    }
    out[drum] = arr.join('')
  }
  return out
}
// comping hits and the bass line for a kind of bar, by energy: [pos, vel, length] / [pos, 'R' | '5' | '8', length]
function compFor(bm, vel = 0.6) {
  const starts = [], out = {}
  let acc = 0
  for (const g of bm.groups) { starts.push([acc, g]); acc += g }
  out[0] = [[0, vel * 0.8, bm.len * 0.95]]
  out[1] = starts.map(([p, g]) => [p, vel * 0.85, g * 0.9])
  out[2] = starts.flatMap(([p, g], i) => (g >= 1.5 && !bm.compound ? [[p, vel, g / 2], [p + g / 2, vel * 0.75, g / 2 * 0.9]] : [[p, i ? vel * 0.85 : vel, g * 0.9]]))
  out[3] = starts.flatMap(([p, g]) => {
    const step = bm.compound ? 1 / 3 * 2 : 0.5, hits = []
    for (let q = 0; q < g - 1e-6; q += step) hits.push([round(p + q), q ? vel * 0.7 : vel, step * 0.9])
    return hits
  })
  return out
}
function bassFor(bm) {
  const out = []
  let acc = 0
  bm.groups.forEach((g, i) => {
    out.push([acc, i === bm.groups.length - 1 && bm.groups.length > 1 ? '5' : i % 2 ? '8' : 'R', round(g * 0.9)])
    acc += g
  })
  return out
}
// the meter's own code in the song: the bar geometry everything else asks
const meterCode = (id, M) => {
  const b = M.bars
  const geo = b.length === 1
    ? `const BAR = ${b[0].len} // beats a bar
const barIndex = x => floor(x / BAR + 1e-9), barStartOf = i => i * BAR, barLenOf = i => BAR`
    : `const PERIOD = ${b.reduce((s, x) => s + x.len, 0)}, BAR_LENS = [${b.map(x => x.len).join(', ')}] // bars alternate
const barIndex = x => { const k = floor(x / PERIOD + 1e-9), u = x - k * PERIOD; return 2 * k + (u >= BAR_LENS[0] - 1e-9 ? 1 : 0) }
const barStartOf = i => PERIOD * floor(i / 2) + (i % 2 ? BAR_LENS[0] : 0), barLenOf = i => BAR_LENS[i % 2]`
  return `// ---- the meter: ${M.label} -----------------------------------------------------------------------
${geo}
const barStart = x => barStartOf(barIndex(x)), inBar = x => x - barStart(x), barLen = x => barLenOf(barIndex(x))`
}
// the 4/4 song → the meter: sections, harmony, phrases (a copy per offset in the period and per speed), plans, the solo
function toMeter(M, P) {
  const W = warpOf(M)
  for (const s of P.sections) s[0] = W(s[0])
  for (const s of P.sectionInfo) { const a = W(s.at), b = W(s.at + s.beats); s.at = a; s.beats = round(b - a) }
  for (const h of P.harmony) { const a = W(h.at), b = W(h.at + h.len); h.at = a; h.len = round(b - a) }
  P.END = W(P.END)
  // phrases: each plan row plays its phrase from s at speed k → the phrase warped from there
  const variants = new Map()
  const warpPhrase = (notes, s, k) => notes.map(([b, n, d]) => {
    const t0 = W(s + k * b), t1 = W(s + k * (b + d))
    return [round((t0 - W(s)) / k), n, round((t1 - t0) / k)]
  }).filter(e => e[2] > 1e-3)
  for (const plan of Object.values(P.plans)) for (const row of plan) {
    const [s, name, , k] = row
    if (!P.phrases[name]) { row[0] = W(s); continue }
    const o = round(s % M.pin), id = o || k !== 1 ? `${name}_${String(o).replace('.', '_')}_${k}` : name
    if (!variants.has(id)) variants.set(id, warpPhrase(P.phrases[name], o, k))
    row[0] = W(s)
    row[1] = id
  }
  return variants
}

// ---- modulations (opts.modulations) --------------------------------------------------------------------------------
// Which sections leave home and how. Theme II goes to a closely related key by a pivot chord (classical: the dominant
// of a major key, the relative major of a minor one); the bridge goes further — the parallel key, a key a minor third
// away by the enharmonic diminished seventh (B°7 in C is D°7 in E♭), a chromatic mediant (C → A♭: a common tone), the
// relative or the subdominant; the section after a modulated one comes home by the dominant seventh. Every change
// gets a transition bar: [pivot, V7 of the new key] in the harmony and a newly composed link in the melody.
const MOD_STYLE = {
  classical: { themeB: true, bridge: ['enharmonic', 'subdominant', 'relative'] },
  romantic: { themeB: true, bridge: ['enharmonic', 'mediant', 'parallel'] },
  lofi: { themeB: false, bridge: ['mediant', 'parallel', 'relative'] },
  bossa: { themeB: false, bridge: ['mediant', 'relative', 'subdominant'] },
  space: { themeB: false, bridge: ['enharmonic', 'mediant', 'parallel'] },
  default: { themeB: false, bridge: ['relative', 'parallel', 'mediant'] },
}
const MOD_NAMES = { dominant: 'доминанта', relative: 'параллельная', subdominant: 'субдоминанта', parallel: 'одноимённая', enharmonic: 'энгармоническая (через Ум7)', mediant: 'хроматическая медианта', home: 'домой' }
// → { [section index]: { key: the local key, type } } — keys as { tonic, mode }
function planModulations(form, key, styleId, r) {
  const st = MOD_STYLE[styleId] ?? MOD_STYLE.default, plan = {}
  const iA = form.findIndex(f => f.role === 'theme'), iB = form.findIndex(f => f.role === 'themeB')
  const iBr = form.findIndex(f => f.role === 'bridge')
  const rel = key.mode === 'major' ? { tonic: (key.tonic + 9) % 12, mode: 'minor' } : { tonic: (key.tonic + 3) % 12, mode: 'major' }
  const by = (t, mode = key.mode) => ({ tonic: (((key.tonic + t) % 12) + 12) % 12, mode })
  if (st.themeB && iB > iA && iA >= 0) plan[iB] = key.mode === 'major' ? { key: by(7), type: 'dominant' } : { key: rel, type: 'relative' }
  if (iBr >= 0) {
    const type = st.bridge[Math.floor(r() * st.bridge.length)]
    const k = type === 'parallel' ? by(0, key.mode === 'major' ? 'minor' : 'major')
      : type === 'enharmonic' ? by(r() < 0.5 ? 3 : -3)
      : type === 'mediant' ? by(key.mode === 'major' ? (r() < 0.6 ? -4 : 4) : -4)
      : type === 'relative' ? rel : by(5)
    plan[iBr] = { key: k, type }
  }
  return plan
}
// the song's keys field: [[beat, 'G'], …] — home, each modulated section and the way back
function keysField(key, sectionInfo) {
  const out = []
  for (const s of sectionInfo) {
    const k = keyName(s.lk ?? key)
    if (!out.length || out[out.length - 1][1] !== k) out.push([s.at, k])
  }
  return out
}
// the two chords of a transition bar from key a to key b (as roman() objects, absolute roots)
function transitionChords(a, b, type) {
  const V7 = roman('V7', b)
  const sc = k => (k.mode === 'minor' ? SCALES.harmonic : MAJ).map(i => (i + k.tonic) % 12)
  // the enharmonic one: the old key's leading-tone °7 (C♯°7 in D) is the new key's too (E°7 in F: C♯ = D♭) — written as heard
  if (type === 'enharmonic') {
    const old = roman('vii°7', { ...a, mode: 'major' }), nu = roman('vii°7', { ...b, mode: 'major' })
    return [old.tones.every(t => nu.tones.includes(t)) ? old : nu, V7]
  }
  if (type === 'mediant') return [roman(a.mode === 'minor' ? 'i' : 'I', a), V7] // the old tonic, straight to the new V7
  if (type === 'parallel') return [roman(b.mode === 'minor' ? 'iv' : 'IV', b), V7]
  // a pivot: a chord of the new key (ii / IV / vi, or iv / VI / iiø) whose notes are all in the old key
  const cands = (b.mode === 'minor' ? ['iv', 'VI', 'iiø7', 'i'] : ['ii', 'IV', 'vi', 'I']).map(s => roman(s, b))
  const inA = sc(a), pivot = cands.find(c => c.tones.every(t => inA.includes(t))) ?? cands[0]
  return [pivot, V7]
}

// describe a generated song for the UI
// ---- the fugue style: a canon and a three-voice fugue, composed by the rules (src/fugue.js) ----------------------------
// The voices are data (SOPRANO, ALTO, BASS); instruments take them over by phase: the canon (winds, flute stops, the
// lute stop), the fugue (strings, principals, the harpsichord), the tutti from the stretto on (+ violone or 16′, organ
// chords, mixture and trombone). The continuo plays the chords the voices make.
const PH = ['canon', 'fugue', 'tutti']
const ENSEMBLES = {
  chamber: { label: 'флейта, гобой, фагот → скрипка, альт, виолончель; клавесин-континуо; виолоне и орган в tutti', theme: 'classical', tracks: [
    ['flute', 's', ['canon'], 'flute'], ['oboe', 'a', ['canon'], 'oboe'], ['bassoon', 'b', ['canon'], 'bassoon'],
    ['violin', 's', ['fugue', 'tutti'], 'violin'], ['viola', 'a', ['fugue', 'tutti'], 'viola'], ['cello', 'b', ['fugue', 'tutti'], 'cello'],
    ['violone', 'b', ['tutti'], 'violone', -12], ['harpsichord', 'continuo', PH, 'continuo'], ['organ', 'chords', ['tutti'], 'organchords'],
  ] },
  strings: { label: 'струнные: две скрипки, альт, виолончель; клавесин-континуо; виолоне и орган в tutti', theme: 'classical', tracks: [
    ['violin I', 's', PH, 'violin'], ['violin II', 'a', ['canon'], 'violin2'], ['viola', 'a', ['fugue', 'tutti'], 'viola'], ['cello', 'b', PH, 'cello'],
    ['violone', 'b', ['tutti'], 'violone', -12], ['harpsichord', 'continuo', PH, 'continuo'], ['organ', 'chords', ['tutti'], 'organchords'],
  ] },
  organ: { label: 'орган: гедакт и флейта 4′ в каноне, принципалы двух мануалов и педаль 16′ в фуге, микстура и тромбон 16′ в tutti', theme: 'gothic', tracks: [
    ['gedackt', 's', ['canon'], 'gedackt'], ['flute 4', 'a', ['canon'], 'flute4'], ['pedal 8', 'b', ['canon'], 'pedalSoft'],
    ['principal', 's', ['fugue', 'tutti'], 'principal'], ['octave', 'a', ['fugue', 'tutti'], 'octave'], ['pedal 16', 'b', ['fugue', 'tutti'], 'pedal16'],
    ['mixture', 's', ['tutti'], 'mixture'], ['posaune', 'b', ['tutti'], 'posaune'],
  ] },
  harpsichord: { label: 'клавесин: лютневый регистр в каноне, 8′ + 8′ в фуге, 4′ и 16′ в tutti', theme: 'classical', tracks: [
    ['lute stop', 's', ['canon'], 'lute'], ['lute stop II', 'a', ['canon'], 'lute'], ['harpsichord bass', 'b', PH, 'harpsichordV'],
    ['harpsichord', 's', ['fugue', 'tutti'], 'harpsichordV'], ['harpsichord II', 'a', ['fugue', 'tutti'], 'harpsichordV'],
    ['4 foot', 's', ['tutti'], 'harpsichord4', 12], ['16 foot', 'b', ['tutti'], 'harpsichord16', -12],
  ] },
}
const VOICE_ARR = { s: 'SOPRANO', a: 'ALTO', b: 'BASS' }
const VOICE_LANE = { s: [1.3, 3.2, 62, 84], a: [-0.2, 1.4, 53, 74], b: [-3, -1.6, 34, 62] } // y0, y1, n0, n1 (MIDI)
function fugueTrack([name, voice, phases, inst, dn = 0], { need }) {
  const ph = JSON.stringify(phases), color = { flute: '#e8f4ff', oboe: '#ffe8a3', bassoon: '#c9a46a', violin: '#ffd9a8', violin2: '#ffc58a', viola: '#e0a878', cello: '#c08a5a', violone: '#8a5a3a',
    gedackt: '#9fd8c8', flute4: '#c8f0e0', pedalSoft: '#6a8a9a', principal: '#e8c27a', octave: '#f2d38a', pedal16: '#a07a3a', mixture: '#fff1c4', posaune: '#d07a4a',
    lute: '#d8c8a8', harpsichordV: '#f2d38a', harpsichord4: '#fff3c8', harpsichord16: '#a88a4a', continuo: '#f2d38a', organchords: '#c9a227' }[inst] ?? '#ffffff'
  if (inst === 'continuo' || inst === 'organchords') {
    const on = `x => ${ph}.some(p => x >= PHASES[p][0] && x < PHASES[p][1]) && chordAt(x)`
    if (inst === 'continuo') {
      need('instruments', 'plucker')
      return `(() => {
  const on = ${on}
  return {
  color: '${color}',
  graph: x => (on(x) && x - chordAt(x)[0] < 1 ? chordAt(x)[3].map(n => -1 + (n - 50) / 20) : null),
  midi: x => (on(x) && x - chordAt(x)[0] < chordAt(x)[1] * 0.9 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['y_{k+N} = 0.994\\big(0.62\\,y_k + 0.38\\,y_{k+1}\\big)\\quad\\text{— континуо: аккорды, которые образуют голоса, правой рукой (Карплус — Стронг)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, harp = plucker({ life: 2.2, decay: 0.994 }), fire = trigger(), hp = filter('hp'), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.3 })
    return x => {
      const c = on(x) ? chordAt(x) : null
      if (fire(c ? c[0] : null)) c[3].forEach((n, i) => harp.hit(hz(n - 60, C4), 0.3 + 0.05 * hash(floor(x), i), { bright: 0.62, at: floor(i * 0.012 * 44100) }))
      return verb(...pan(0.75 * hp(harp(), 140), 0.25))
    }
  },
}})()`
    }
    need('instruments', 'organ')
    return `(() => {
  const on = ${on}
  return {
  color: '${color}',
  graph: x => (on(x) ? chordAt(x)[3].map(n => -1 + (n - 50) / 20) : null),
  midi: x => (on(x) && x - chordAt(x)[0] < chordAt(x)[1] - 0.1 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['O = \\Rev\\sum_j \\big(\\sin 2\\pi f_j t + 0.35\\sin 4\\pi f_j t\\big)\\quad\\text{— позитив: аккорды континуо в tutti, 8′ + 4′}'])},
  audio() {
    const o = organ({ voices: 3, stops: [[1, 1], [2, 0.35]], gain: 0.08 }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => {
      const c = on(x) ? chordAt(x) : null, [l, r] = o(c && x - c[0] < c[1] - 0.08 ? c[3].map(n => hz(n - 60, C4)) : [])
      return verb(l, r)
    }
  },
}})()`
  }
  const arr = VOICE_ARR[voice], [y0, y1, n0, n1] = VOICE_LANE[voice], k = round((y1 - y0) / (n1 - n0))
  const at = `x => playing(${arr}, x, ${ph}${dn ? `, ${dn}` : ''})`
  const head = `color: '${color}',
  graph: x => { const m = at(x); return m ? ${y0} + (m.n + 60 - ${n0}) * ${k} : null },
  midi: x => { const m = at(x); return m && m.u < 0.92 ? [60 + m.n] : [] },`
  const wrap = (formula, init, body) => `(() => {
  const at = ${at}
  return {
  ${head}
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, ${init}
    return x => {
      const m = at(x)
${body}
    }
  },
}})()`
  const P = { s: 0.28, a: -0.22, b: 0.05 }[voice]
  const bowedI = (body, gain, verbWet = 0.38) => {
    need('instruments', 'bowed')
    return wrap(['V = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{' + body + 'R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{\\,0.18\\min(1,t/0.4)\\sin(2\\pi\\cdot5.6T)/12}\\big) + 0.04\\eta', 'R = (300, 520, 1100, 2700)\\ \\text{Гц — резонансы корпуса}'],
      `bow = bowed({ base: C4, body: ${body}, sec }), verb = reverb({ room: 0.86, damp: 0.38, wet: ${verbWet} })`,
      `      return verb(...pan(${gain} * bow(m, x * sec), ${P}))`)
  }
  const reedI = (kind, gain, formula) => {
    need('instruments', 'reed')
    return wrap(formula, `r = reed({ kind: '${kind}' }), verb = reverb({ room: 0.84, damp: 0.4, wet: 0.34 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(${gain} * r(hz(n, C4), !!m && m.u < 0.93), ${P}))`)
  }
  const organI = (stops, gain, formula) => {
    need('instruments', 'organ')
    return wrap(formula, `o = organ({ voices: 1, stops: ${JSON.stringify(stops)}, gain: ${gain} }), verb = reverb({ room: 0.95, damp: 0.32, wet: 0.5 })`,
      `      const [l, r] = o(m && m.u < 0.94 ? [hz(m.n, C4)] : [])
      return verb(...pan(l + r, ${P}))`)
  }
  const harpI = (bright, decay, gain, formula) => {
    need('instruments', 'plucker')
    return wrap(formula, `p = plucker({ life: 1.8, decay: ${decay} }), fire = trigger(), hp = filter('hp'), damp = smooth(25), verb = reverb({ room: 0.8, damp: 0.42, wet: 0.28 })`,
      `      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.45 + 0.1 * hash(floor(4 * x), 5), { bright: ${bright} })
      return verb(...pan(${round(gain * { s: 1.7, a: 1.2, b: 0.7 }[voice])} * damp(m && m.u < 0.97 ? 1 : 0.25) * hp(p(), 90), ${P})) // the damper falls when the key is let go (a high string dies sooner: the treble louder)`)
  }
  switch (inst) {
    case 'violin': return bowedI(1, 0.4)
    case 'violin2': return bowedI(0.92, 0.3)
    case 'viola': return bowedI(0.8, 0.27)
    case 'cello': return bowedI(0.6, 0.3)
    case 'violone': return bowedI(0.45, 0.2, 0.3)
    case 'flute':
      need('instruments', 'flute')
      return wrap(['Fl = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.06\\,\\BP_{2g}\\,\\eta + 0.5e^{-25t}\\,\\HP_{3000}\\,\\eta\\big)\\quad\\text{— траверс-флейта'], `fl = flute(), verb = reverb({ room: 0.84, damp: 0.4, wet: 0.34 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(0.36 * fl(hz(n, C4), !!m && m.u < 0.92), ${P}))`)
    case 'oboe': return reedI('oboe', 0.36, ['Ob = a\\big(0.3\\,s + \\BP_{1100}^{Q=4}s + 0.6\\BP_{2800}^{Q=4}s\\big),\\quad s = \\LP\\,\\HP_{350}\\,\\Pi_{0.18}(g)\\quad\\text{— гобой'])
    case 'bassoon': return reedI('bassoon', 0.5, ['Fg = a\\big(0.5\\,s + \\BP_{450}^{Q=3}s + 0.5\\BP_{1150}^{Q=4}s\\big),\\quad s = \\LP_{3500}\\,\\Pi_{1/4}(g)\\quad\\text{— фагот'])
    case 'gedackt': return organI([[1, 1], [3, 0.12], [5, 0.04]], 0.2, ['G = \\sin 2\\pi ft + 0.12\\sin 2\\pi\\,3ft + 0.04\\sin 2\\pi\\,5ft\\quad\\text{— гедакт 8′: закрытая труба, нечётные гармоники'])
    case 'flute4': return organI([[2, 1], [4, 0.15]], 0.15, ['F_4 = \\sin 4\\pi ft + 0.15\\sin 8\\pi ft\\quad\\text{— флейта 4′: октавой выше написанного'])
    case 'pedalSoft': return organI([[0.5, 0.7], [1, 1], [2, 0.2]], 0.2, ['P = 0.7\\sin \\pi ft + \\sin 2\\pi ft + 0.2\\sin 4\\pi ft\\quad\\text{— педаль: суббас 16′ + бурдон 8′'])
    case 'principal': return organI([[1, 1], [2, 0.5], [3, 0.12], [4, 0.22]], 0.17, ['Pr = \\sum_{s} a_s \\sin 2\\pi s f t,\\ s \\in \\{1, 2, 3, 4\\}\\quad\\text{— принципал 8′ + октава 4′ (+ квинта, суперoктава)'])
    case 'octave': return organI([[1, 1], [2, 0.6], [4, 0.15]], 0.15, ['Pr_{II} = \\sin 2\\pi ft + 0.6\\sin 4\\pi ft + 0.15\\sin 8\\pi ft\\quad\\text{— второй мануал: 8′ + 4′'])
    case 'pedal16': return organI([[0.5, 1], [1, 0.8], [2, 0.35], [4, 0.1]], 0.2, ['P = \\sin \\pi ft + 0.8\\sin 2\\pi ft + 0.35\\sin 4\\pi ft + \\ldots\\quad\\text{— педаль 16′ + 8′ + 4′'])
    case 'mixture': return organI([[2, 0.6], [3, 0.4], [4, 0.45], [6, 0.3], [8, 0.25]], 0.09, ['M = \\sum_{s \\in \\{2,3,4,6,8\\}} a_s \\sin 2\\pi s f t\\quad\\text{— микстура: 4′, 2⅔′, 2′, 1⅓′, 1′ поверх сопрано'])
    case 'posaune': {
      need('instruments', 'horn')
      return wrap(['Pos = \\LP_{f_c}\\tfrac12\\big(\\saw\\,\\tfrac f2 + \\saw\\,1.0023\\tfrac f2\\big)\\,e(t)\\quad\\text{— язычковый тромбон 16′ в педали'], `h = horn({ bright: 1.6 }), verb = reverb({ room: 0.95, damp: 0.32, wet: 0.45 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(0.22 * h(hz(n - 12, C4), !!m && m.u < 0.94, 0.75), ${P}))`)
    }
    case 'lute': return harpI(0.3, 0.986, 0.55, ['y_{k+N} = 0.986\\big(0.3\\,y_k + 0.7\\,y_{k+1}\\big)\\quad\\text{— лютневый регистр: войлок приглушает струну'])
    case 'harpsichordV': return harpI(0.66, 0.993, 0.5, ['y_{k+N} = 0.993\\big(0.66\\,y_k + 0.34\\,y_{k+1}\\big)\\quad\\text{— клавесин 8′, демпфер при отпускании клавиши'])
    case 'harpsichord4': return harpI(0.72, 0.99, 0.6, ['y_{k+N} = 0.99\\big(0.72\\,y_k + 0.28\\,y_{k+1}\\big)\\quad\\text{— регистр 4′: октавой выше'])
    case 'harpsichord16': return harpI(0.6, 0.995, 0.45, ['y_{k+N} = 0.995\\big(0.6\\,y_k + 0.4\\,y_{k+1}\\big)\\quad\\text{— регистр 16′: октавой ниже'])
  }
  throw new Error('fugue: no instrument ' + inst)
}

function generateFugue(opts, S, seeds) {
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)
  const parsed = parseKey(opts.key) ?? parseKey(pick(RA, S.keys))
  const key = { tonic: Math.round(parsed.tonic) % 12, mode: parsed.mode }
  // a church mode makes a modal fugue (its entries on the degrees of the same scale); other modes are not for a fugue
  const modeIn = opts.mode && !['major', 'minor'].includes(opts.mode) ? modeOf(opts.mode) : null
  const asTonal = modeIn && (modeIn.iv.join() === SCALES.major.join() ? 'major' : modeIn.iv.join() === SCALES.minor.join() ? 'minor' : null)
  const modal = modeIn && !asTonal && fugueMode(modeIn.iv) ? modeIn : null
  if (opts.mode === 'major' || opts.mode === 'minor') key.mode = opts.mode
  if (asTonal) key.mode = asTonal
  if (modal) key.mode = parentMode(modal.iv)
  const temperament = opts.temperament && opts.temperament !== 'equal' ? temperOf(opts.temperament) : null
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  const length = opts.length ?? 'normal'
  const canonBars = { short: 0, normal: 10, long: 14 }[length] ?? 10
  const ensembleId = pick(RI, Object.keys(ENSEMBLES)), ens = ENSEMBLES[ensembleId]
  const fkey = modal ? { tonic: key.tonic, mode: 'modal', iv: modal.iv } : key
  const F = composeFugue({ key: fkey, r: RM, canon: canonBars > 0, canonBars })
  const names = NAMES.fugue
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const skey = keyWithMode(key, modal ? opts.mode : null)
  const kname = k => (k.mode === 'modal' ? spell(k.tonic + 60, skey, false) : keyName(k))
  const FUGUE = F.sections.find(s => s[1] === 'exposition')[0], TUTTI = F.sections.find(s => s[1] === 'stretto' || s[1] === 'final entry')[0], END = F.length
  // the continuo's chords, voiced (tenor register, voice-led), spelt in their local key
  const keyAtB = b => { let k = F.keys[0]?.[1] ?? fkey; for (const [a, kk] of F.keys) if (a <= b + 1e-6) k = kk; return k }
  let prev = null
  const H = F.harmony.map(([b, len, root, q]) => {
    const iv = QUALITIES[q] ?? QUALITIES['']
    const v = voiceLead(iv.map(i => (root + i) % 12), prev, { lo: 52, hi: 67, voices: 3 })
    prev = v
    const lk = keyAtB(b), sk = lk.mode === 'modal' ? skey : lk
    const bass = pitchAt(F.voices.b, b) ?? v[0] - 12
    return { at: b, len, bass, v, symbol: chordName({ root, quality: q }, sk) }
  })
  const sp = n => spell(n, skey)
  const subjText = F.subject.notes.map(([, n]) => sp(n)).join(' ')
  const entryText = F.entries.map(e => `${e.at}: ${{ s: 'сопрано', a: 'альт', b: 'бас' }[e.voice]} — ${e.kind} (${kname(e.key)})`).join('\n//   ')
  const meta = {
    style: 'fugue', seed: (opts.seed ?? 1) >>> 0, seeds, length, key: keyName(key), mode: modal ? opts.mode : null, modeName: modal?.name ?? null, bpm, title,
    form: F.sections.map(s => s[1]), fixedKey: opts.key ?? null, micro: null, temperament: temperament?.id ?? null, meter: null, modulations: null,
    themes: { A: { from: 'контрапункт', title: `тема фуги ${subjText}`, how: F.subject.tonal ? 'тональный ответ' : 'реальный ответ' }, B: { from: 'контрапункт', title: 'противосложение (обратимое в октаву)', how: 'composed' }, bridge: { rhythmFrom: null } },
    instruments: { ensemble: ensembleId }, fugue: { entries: F.entries.length, stretto: F.subject.stretto, faults: F.faults.length, attempt: F.attempt },
  }
  const used = { engine: new Set(['floor', 'mod', 'hz', 'filter', 'reverb', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const tracks = ens.tracks.filter(t => canonBars > 0 || t[2].some(p => p !== 'canon')).map(t => ({ name: t[0], code: fugueTrack(t, { need }), voice: t[1] }))
  const seen = {}
  for (const t of tracks) { let k = t.name.replace(/[^\w ]/g, '').trim(); if (seen[k]) k += ' ' + ++seen[k]; else seen[k] = 1; t.key = k }
  const localKeys = []
  if (!modal) for (const [a, k] of F.keys) { const n = keyName(k); if (localKeys[localKeys.length - 1]?.[1] !== n) localKeys.push([a, n]) }
  const notes = list => fmtNotes(list.map(([b, n, d]) => [round(b), n - 60, round(d)]))
  const keyText = modal ? `${spell(key.tonic + 60, skey, false)} ${modal.name.toLowerCase()}` : keyLabel(key)
  const st = F.subject.stretto
  const head = [
    `// ${title} — ${S.label.toLowerCase()} in ${keyText}, ${bpm} BPM. Generated by MathMusic (style fugue, seed ${meta.seed}):`,
    `// ${F.sections.map(s => s[1]).join(' → ')}. ${ens.label[0].toUpperCase() + ens.label.slice(1)}.`,
    `// Composed by the rules of counterpoint (src/counterpoint.js, src/fugue.js) — consonance wherever a note begins on a beat,`,
    `// dissonance only as a passing or neighbour note, the fourth dissonant over the lowest voice, no parallel fifths or`,
    `// octaves, no crossing, leaps answered by steps, the raised 6th and 7th of minor going up; check() finds ${F.faults.length} faults.`,
    canonBars ? `// The canon: the soprano is followed by the alto a bar later and an octave lower, chosen note by note against that echo;` : null,
    canonBars ? `// the bass is free; at the end the follower leaves the canon for the cadence.` : null,
    `// The subject (${F.subject.L} beats): ${subjText}; the answer is ${F.subject.tonal ? 'tonal (its head answers 5̂ by 1̂)' : 'real'}; the countersubject`,
    `// was written against the answer below it and the subject above it at once — invertible at the octave.`,
    `// Episodes: sequences down the circle of fifths, the soprano's motif (from the subject or the countersubject) a step lower`,
    `// each bar, the bass on the roots. ${st ? `Stretto: the subject against itself ${st.delay} beat${st.delay > 1 ? 's' : ''} later.` : 'No stretto fits this subject: a last entry instead.'} Coda: iv – V – I${key.mode === 'minor' || modal ? ' with a Picardy third' : ''}.`,
    `// Entries:\n//   ${entryText}`,
    `// x is time in beats; n counts semitones from C4 (MIDI 60). Draw the voices in the piano roll (P).`,
  ].filter(Boolean)
  const data = `
const SECTIONS = ${JSON.stringify(F.sections)}
const END = ${END}
const FUGUE = ${FUGUE} // the fugue begins (before it: the canon)
const TUTTI = ${TUTTI} // the stretto or the last entry, and the coda: everyone
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz, exact equal temperament
const PHASES = { canon: [0, FUGUE], fugue: [FUGUE, TUTTI], tutti: [TUTTI, END] }
// the note of a voice at x in the given phases (moved by dn semitones: a 4′ or a 16′ doubling) → { n, d, τ, u, at } or null
const playing = (list, x, phases, dn = 0) => {
  if (!phases.some(p => x >= PHASES[p][0] && x < PHASES[p][1])) return null
  const m = notesAt(list, x)
  return m && (dn ? { ...m, n: m.n + dn } : m)
}
${temperament ? temperData({ temperament, key, sectionInfo: [] }) + '\n' : ''}
// ---- the voices: [beat, n from C4, length] ---------------------------------------------------------------------------
const SOPRANO = ${notes(F.voices.s)}
const ALTO = ${notes(F.voices.a)}
const BASS = ${notes(F.voices.b)}

// ---- the continuo: the chords the voices make (planned in the episodes and the coda) — [start, length, bass MIDI,
// voicing MIDI (voice-led), chord]
const HARMONY = [
${H.map(h => `  [${h.at}, ${h.len}, ${h.bass}, [${h.v.join(', ')}], '${h.symbol}'],`).join('\n')}
]
const BY_HALF = []
for (const h of HARMONY) for (let b = Math.round(h[0] * 2); b < Math.round((h[0] + h[1]) * 2); b++) BY_HALF[b] = h
const chordAt = x => BY_HALF[floor(2 * x)] ?? null
`
  const imp = mod => [...used[mod]].sort().map(x => (temperament && mod === 'engine' && x === 'hz' ? 'hz as hz12' : x))
  const parts = tracks.filter(t => t.voice !== 'continuo' && t.voice !== 'chords' && !/foot|violone|mixture|posaune/.test(t.name)).map(t => t.key)
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.key} ${'-'.repeat(Math.max(4, 90 - t.key.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${title}',
  bpm: ${bpm},
  key: '${keyName(key)}',${modal ? `
  mode: '${opts.mode}', // ${modal.name}: ${modal.iv.join(' ')}` : ''}${temperament ? `
  tuning: { id: '${temperament.id}', name: ${JSON.stringify(temperament.name)}, offsets: TEMPER }, // cents of C … B from 12-TET` : ''}
  length: END,
  theme: '${ens.theme}',
  style: 'fugue',
  generator: ${JSON.stringify({ style: 'fugue', seed: meta.seed, seeds, length, ...(meta.fixedKey ? { key: meta.fixedKey } : {}), ...(meta.mode ? { mode: meta.mode } : {}), ...(meta.temperament ? { temperament: meta.temperament } : {}) })},${localKeys.length > 1 ? `
  keys: ${JSON.stringify(localKeys)}, // the key of each entry and episode — for the note names
  signature: 'home', // the score keeps the home key signature (accidentals for the entries elsewhere, as Bach wrote them)` : ''}
  parts: ${JSON.stringify(parts)}, // the staves of the score
  sections: SECTIONS,
  tracks: ${temperament ? 'withNow(' : ''}{ ${tracks.map((t, i) => `${JSON.stringify(t.key)}: track${i}`).join(', ')} }${temperament ? ')' : ''},
}
`,
  ]
  return { source: out.join('\n'), meta }
}

// ---- the maqam style: Arabic music in quarter tones, composed by its sayr (src/maqam.js) -------------------------------
// A takht: oud, qanun, ney, violin, cello, darbuka, riq. The ensemble plays one melody in heterophony — each instrument
// its own way (the qanun's tremolo and octaves, the oud's risha strokes, the ney's legato, the cello on the beats);
// the taqsims are free solos over the cello's drone; the iqa' on darbuka and riq.
const MAQAM_STYLE_MODES = ['bayati', 'rast', 'saba', 'hijazRast', 'sikah', 'huzam', 'suznak', 'iraq']
function generateMaqam(opts, S, seeds) {
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)
  // the maqam: opts.mode if it is one of these, else drawn; the tonic its usual one unless a key is given
  const mode = MAQAMAT[opts.mode] ? opts.mode : pick(RA, MAQAM_STYLE_MODES)
  const M = modeOf(mode)
  const home = parseKey(opts.key ?? M.home ?? 'D')
  const tonicName = home.name ?? spell(Math.round(home.tonic) + 60, { tonic: 0, mode: 'major' }, false)
  const tonic = 60 + home.tonic - (home.tonic > 6.5 ? 12 : 0) // the qarar between F♯3 and F♯4
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  const length = opts.length ?? 'normal'
  const temperament = null
  const F = composeMaqam({ mode, tonic, r: RM, length })
  const soloist = pick(RI, ['ney', 'qanun', 'violin']) // who plays the second taqsim
  const names = NAMES.maqam
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const key = { tonic: home.tonic, mode: parentMode(M.iv) }
  const skey = keyWithMode({ ...key, ...(home.name ? { name: home.name } : {}) }, mode)
  const sp = n => spell(n, skey)
  const ENS = new Set(['dulab', 'lower jins', 'ghammaz', 'tahwil', 'qafla'])
  const ens = F.sections.filter(s => ENS.has(s[1])).map(s => s[0])
  const T1 = F.taqsims[0], T2 = F.taqsims[1] ?? null
  const fmt = list => fmtNotes(list.map(([b, n, d]) => [round(b), round(n - 60), round(d)]))
  const modName = id => MODES[id]?.name ?? id
  const keysField = F.keys.filter((k, i, A) => !i || k[1] !== A[i - 1][1] || k[2] !== A[i - 1][2]).map(([a, m, sh]) => [a, spell(Math.round((tonic + sh) * 2) / 2, skey, false).replace(/\d+$/, ''), m])
  const meta = {
    style: 'maqam', seed: (opts.seed ?? 1) >>> 0, seeds, length, key: tonicName, mode, modeName: M.name, bpm, title, form: F.sections.map(s => s[1]),
    fixedKey: opts.key ?? null, micro: null, temperament: null, meter: null, modulations: [{ at: F.keys[1]?.[0], section: 'tahwil', key: `${tonicName} ${F.modulation.mode}`, type: 'maqam' }],
    themes: { A: { from: 'сайр', title: `макам ${M.name}`, how: `сайр, икаа ${F.iqaA}` }, B: { from: 'сайр', title: `тахвиль в ${modName(F.modulation.mode)}`, how: 'composed' }, bridge: { rhythmFrom: null } },
    instruments: { soloist },
  }
  const used = { engine: new Set(['floor', 'mod', 'hz', 'filter', 'reverb', 'smooth', 'exp']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger', 'oud', 'qanun', 'ney', 'bowed', 'darbukaDrum', 'riqDrum']) }
  const head = [
    `// ${title} — макам ${M.name} (${mode}) on ${tonicName}, ${bpm} BPM. Generated by MathMusic (style maqam, seed ${meta.seed}):`,
    `// ${F.sections.map(s => s[1]).join(' → ')}.`,
    `// The scale is ${M.name}'s in quarter tones (24-EDO, the Cairo 1932 theory): ${M.iv.map(v => sp(tonic + v)).join(' ')}${MAQAMAT[mode].down ? ` — descending, ${Object.entries(MAQAMAT[mode].down).map(([k, v]) => `${sp(tonic + M.iv[k])} becomes ${sp(tonic + v)}`).join(', ')}` : ''}.`,
    `// Sayr: the lower jins around the qarar ${sp(tonic)}, the climb to the ghammaz ${sp(tonic + M.iv[MAQAMAT[mode].ghammaz])}, the upper jins, the qafla from above;`,
    `// a section is AA′BA in two-bar phrases. Tahwil: ${modName(F.modulation.mode)} ${F.modulation.shift ? `on ${sp(tonic + F.modulation.shift)}` : 'on the same tonic'}, then home.`,
    `// Heterophony: one melody, every instrument its own way. Taqsims: the oud, then the ${soloist}, free over the cello's drone.`,
    `// Iqa' on a sixteenth grid (D dum, T tek, k ka): ${[...new Set(F.iqa.map(i => i[1]).filter(Boolean))].map(n => `${n} ${IQA[n]}`).join(', ')}.`,
    `// x is time in beats; n counts semitones from C4 (MIDI 60) — 3.5 is E𝄳4. Draw the melody in the piano roll (P, ¼-tone rows).`,
  ]
  const data = `
const SECTIONS = ${JSON.stringify(F.sections)}
const END = ${F.length}
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz, exact equal temperament (quarter tones: 2^(n/12) with n = 3.5 …)
const ENSEMBLE = ${JSON.stringify(ens)} // the sections the takht plays together (32 beats each, the dulab 16)
const ENS_LEN = { ${F.sections.filter(s => ENS.has(s[1])).map((s, i, a) => `${s[0]}: ${(F.sections[F.sections.indexOf(s) + 1]?.[0] ?? F.length) - s[0]}`).join(', ')} }
const together = x => ENSEMBLE.some(a => x >= a && x < a + ENS_LEN[a])

// ---- the melody (the sayr), the taqsims, the drone: [beat, n from C4, length] -----------------------------------------
const MELODY = ${fmt(F.melody)}
// taqsim I — the oud, free, from beat ${T1.at}
const TAQSIM_1 = ${fmt(T1.notes)}
${T2 ? `// taqsim II — the ${soloist}, from beat ${T2.at}
const TAQSIM_2 = ${fmt(T2.notes)}` : 'const TAQSIM_2 = []'}
// the cello's drone on the qarar under the taqsims
const DRONE = ${fmt(F.drone)}
const melodyAt = x => (together(x) ? notesAt(MELODY, x) : null)

// ---- the iqa': [start beat, cycle | null] per section; a cycle is 16 sixteenths of one bar
const IQA = ${JSON.stringify(Object.fromEntries(Object.entries(IQA)))}
const IQA_PLAN = ${JSON.stringify(F.iqa)}
const cycleAt = x => { let c = null; for (const [a, n] of IQA_PLAN) if (a <= x) c = n; return x < END ? c : null }
// the stroke struck last at x: { s: 'D' | 'T' | 'k', τ (beats since), v }; fills (k between, a tek roll) in every 4th bar
function strokeAt(x) {
  for (let j = floor(4 * x); j >= floor(4 * x) - 8; j--) {
    const c = cycleAt(j / 4)
    if (!c) return null
    const bar = floor(j / 16), i = mod(j, 16), fill = mod(bar, 4) === 3 && i >= 12
    let s = IQA[c][i]
    if (s === '-' && (fill || hash(j, 7) < 0.3)) s = fill ? 'T' : 'k'
    if (s !== '-') return { s, τ: x - j / 4, v: s === 'D' ? 0.9 : s === 'T' ? 0.75 : 0.4 + 0.15 * hash(j, 3) }
  }
  return null
}
`
  const track = (name, color, lane, formula, init, body, midi = null) => ({ name, code: `{
  color: '${color}',
  graph: x => { ${lane} },
  midi: x => { ${midi ?? 'return []'} },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, ${init}
    return x => {
${body}
    }
  },
}` })
  const laneOf = (y0, k) => `const m = playAt(x); return m ? ${y0} + (m.n + 12) * ${k} : null`
  const tracks = [
    track('oud', '#e0a060', laneOf(0.75, 0.05).replace('playAt', 'oudAt'), ['O = \\Rev\\big[0.55\\LP s + 0.5\\BP_{110}s + 0.6\\BP_{250}s + 0.35\\BP_{600}s\\big],\\quad s:\\ y[n] = e[n] + g\\big(a\\,y[n - D] + (1 - a)\\,y[n - D - 1]\\big),\\ D = \\tfrac{SR}{f} - \\varphi(f)', 'f = 261.63\\cdot 2^{n/12},\\ n \\in \\tfrac12\\mathbb Z\\ \\text{— четверти тона точно: дробная задержка струны}'],
      `o = oud(), fire = trigger(), verb = reverb({ room: 0.78, damp: 0.45, wet: 0.26 })`,
      `      const m = oudAt(x)
      // the melody's notes, and on a long one the risha strikes again every half beat (softer)
      if (m && fire(m.at + floor(m.τ * 2) / 2)) o.hit(hz(m.n, C4), m.τ < 0.25 ? 0.75 : 0.45, { from: m.slide ? -0.5 : 0, glide: 0.05 })
      return verb(...pan(1.25 * o(), -0.25))`, `const m = oudAt(x); return m && m.u < 0.9 ? [60 + m.n] : []`),
    track('qanun', '#f2d38a', laneOf(0.95, 0.05).replace('playAt', 'qanunAt'), ['Q = \\sum_{c \\in \\{-3, 0, 3\\}} s\\big(f\\cdot 2^{c/1200}\\big)\\quad\\text{— три струны хора; тремоло на долгих нотах: щипок каждую } \\tfrac18 \\text{ доли'],
      `q = qanun(), fire = trigger(), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.3 })`,
      `      const m = qanunAt(x)
      // a note: plucked with its lower octave; a long one in tremolo, alternating the hands
      if (m) {
        const j = m.d >= 1 ? floor(m.τ * 8) : 0
        if (fire(m.at + j / 8)) { q.hit(hz(m.n, C4), j ? 0.32 + 0.08 * (j % 2) : 0.6); if (!j) q.hit(hz(m.n - 12, C4), 0.35) }
      }
      return verb(...pan(1.3 * q(), 0.3))`, `const m = qanunAt(x); return m && m.u < 0.9 ? [60 + m.n] : []`),
    track('ney', '#d8f0e0', laneOf(1.15, 0.05).replace('playAt', 'neyAt'), ['N = a\\big(\\tanh 1.3(0.55\\sin 2\\pi\\!\\int\\! g + 0.12\\sin 4\\pi\\!\\int\\! g + 0.05\\sin 6\\pi\\!\\int\\! g) + 0.3(\\BP_g + 0.6\\BP_{2g})\\eta\\big)', 'g = f\\cdot 2^{(0.22\\,v(t)\\sin 2\\pi\\cdot5.2T - 0.25(1 - s(t)))/12}\\ \\text{— дыхание громче тона, позднее вибрато'],
      `n = ney(), verb = reverb({ room: 0.85, damp: 0.35, wet: 0.38 })
    let p = 0`, `      const m = neyAt(x)
      if (m) p = m.n
      return verb(...pan(0.3 * n(hz(p, C4), !!m && m.u < 0.95), 0.1))`, `const m = neyAt(x); return m && m.u < 0.9 ? [60 + m.n] : []`),
    track('violin', '#ffd0a0', laneOf(0.85, 0.05).replace('playAt', 'violinAt'), ['Vn = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{R_i}\\,s\\Big),\\quad s = \\saw\\big(f\\cdot 2^{0.18\\min(1,t/0.4)\\sin(2\\pi\\cdot5.6T)/12}\\big)\\ \\text{— скрипка такхта, глиссандо между нотами'],
      `bow = bowed({ base: C4, sec }), verb = reverb({ room: 0.84, damp: 0.38, wet: 0.36 })`,
      `      return verb(...pan(0.26 * bow(violinAt(x), x * sec), 0.42))`, `const m = violinAt(x); return m && m.u < 0.9 ? [60 + m.n] : []`),
    track('cello', '#c08a5a', `const m = celloAt(x); return m ? -3 + (m.n + 24) * 0.05 : null`, ['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big)\\quad\\text{— мелодия октавой ниже на долях; бурдон на караре под таксимами'],
      `bow = bowed({ base: C4, body: 0.6, sec }), verb = reverb({ room: 0.8, damp: 0.45, wet: 0.3 })`,
      `      return verb(...pan(0.22 * bow(celloAt(x), x * sec), -0.05))`, `const m = celloAt(x); return m && m.u < 0.9 ? [60 + m.n] : []`),
    track('darbuka', '#d98b5f', `const s = strokeAt(x); return s && s.τ < 0.25 ? (s.s === 'D' ? 3 : s.s === 'T' ? 3.9 : 3.5) : null`, ['D(t) = e^{-t/0.22}\\sin\\varphi + 0.35e^{-t/0.08}\\sin 1.59\\varphi + \\ldots,\\ \\varphi = 2\\pi\\cdot95\\,(t + \\ldots)\\ \\text{(дум)};\\quad T(t) = e^{-t/0.045}\\sum a_i\\sin 2\\pi f_i t\\ \\text{(тек)}'],
      `d = darbukaDrum(), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.16 })`,
      `      const s = strokeAt(x)
      return verb(...pan(s ? 0.55 * s.v * d(s.τ * sec, s.s === 'D' ? 'dum' : s.s === 'T' ? 'tek' : 'ka') : (d(9, 'dum', false), 0), -0.1))`,
      `const s = strokeAt(x); return s && s.τ < 0.1 ? [s.s === 'D' ? 41 : s.s === 'T' ? 60 : 61] : []`),
    track('riq', '#fff0b0', `const s = strokeAt(x); return s && s.τ < 0.2 ? 4.4 : null`, ['R = e^{-t/0.09}\\big(0.75 + 0.25\\sin 2\\pi\\cdot38t\\big)\\big(\\BP_{7.2\\text{к}} + \\BP_{9.1\\text{к}}\\big)\\eta\\ \\text{— тарелочки бубна; кожа на дум'],
      `ri = riqDrum(), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.14 })`,
      `      // the jingles on every eighth, the skin with the darbuka's dum and tek
      const s = strokeAt(x), j = floor(2 * x), c = cycleAt(x)
      const t8 = (x - j / 2) * sec, y = c ? 0.32 * ri(t8, 'jingle') * (mod(j, 2) ? 0.6 : 1) : ri(9, 'jingle', false)
      return verb(...pan(y + (s && s.s !== 'k' && s.τ < 0.5 ? 0.3 * s.v * ri(s.τ * sec, s.s === 'D' ? 'dum' : 'tek') : 0), 0.35))`,
      `const c = cycleAt(x); return c && x - floor(2 * x) / 2 < 0.1 ? [54] : []`),
  ]
  const players = `
// who plays what: the oud the first taqsim and the melody; the qanun, the ney and the violin the melody (the ${soloist}
// also the second taqsim); the cello the melody an octave down on the beats, and the drone under the taqsims
const solo = (list, x) => notesAt(list, x)
const oudAt = x => solo(TAQSIM_1, x) ?? melodyAt(x)
const qanunAt = x => ${soloist === 'qanun' ? 'solo(TAQSIM_2, x) ?? ' : ''}melodyAt(x)
// the ney leaves out the quickest notes between the beats (it holds the note before)
const neyAt = x => {
  ${soloist === 'ney' ? 'const s = solo(TAQSIM_2, x)\n  if (s) return s\n  ' : ''}const m = melodyAt(x)
  if (!m || m.d >= 0.5 || mod(m.at, 0.5) === 0) return m
  return melodyAt(m.at - 0.01) ?? m
}
const violinAt = x => ${soloist === 'violin' ? 'solo(TAQSIM_2, x) ?? ' : ''}(together(x) && !SECTIONS.some(([a, n]) => n === 'dulab' && x >= a && x < a + 16) ? melodyAt(x) : null)
const celloAt = x => {
  const d = notesAt(DRONE, x)
  if (d) return d
  const m = melodyAt(floor(x))
  return m && { ...m, n: m.n - 12, at: Math.max(m.at, floor(x)), τ: x - Math.max(m.at, floor(x)), d: Math.min(1, m.at + m.d - floor(x)), u: (x - floor(x)) / Math.min(1, m.at + m.d - floor(x)) }
}
`
  const imp = mod => [...used[mod]].sort()
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data + players,
    ...tracks.map((t, i) => `// ---- ${t.name} ${'-'.repeat(Math.max(4, 90 - t.name.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${title}',
  bpm: ${bpm},
  key: '${tonicName}',
  mode: '${mode}', // ${M.name}: ${M.iv.join(' ')}
  length: END,
  theme: '${S.theme}',
  style: 'maqam',
  generator: ${JSON.stringify({ style: 'maqam', seed: meta.seed, seeds, length, ...(meta.fixedKey ? { key: meta.fixedKey } : {}), ...(opts.mode && MAQAMAT[opts.mode] ? { mode } : {}) })},
  keys: ${JSON.stringify(keysField)}, // the maqam of each stretch (the tahwil) — for the note names
  signature: 'home',
  parts: ['oud', 'qanun', 'ney', 'violin', 'cello'],
  sections: SECTIONS,
  tracks: { ${tracks.map((t, i) => `${JSON.stringify(t.name)}: track${i}`).join(', ')} },
}
`,
  ]
  return { source: out.join('\n'), meta }
}

// ---- the raga style: a Hindustani performance composed by the raga's grammar (src/raga.js) ----------------------------
// Sitar (with its tarab strings tuned to the raga, the chikari on its own strings), bansuri, tanpura, tabla, swarmandal,
// manjira; everything in the raga's shrutis (just intonation; Darbari's ati komal ga and dha lower still).
const RAGA_THAAT_MODE = { kalyan: 'kalyan', bhairav: 'bhairav', kafi: 'kafi', asavari: 'aeolian', bhairavi: 'bhairavi' }
function generateRaga(opts, S, seeds) {
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)
  const raga = RAGAS[opts.raga] ? opts.raga : pick(RA, Object.keys(RAGAS))
  const R = RAGAS[raga]
  const keyIn = parseKey(opts.key ?? pick(RA, S.keys))
  const saPc = Math.round(keyIn.tonic) % 12, Sa = 48 + saPc - (saPc > 6 ? 12 : 0) // the sitar's Sa: C3 or D3 (F♯2 … F♯3)
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  const length = opts.length ?? 'normal'
  const F = composeRaga({ raga, r: RM, length })
  const cents = shrutiCents(raga) // by swara (semitones from Sa)
  const TEMPER = Array.from({ length: 12 }, (_, pcAbs) => cents[(((pcAbs - saPc) % 12) + 12) % 12])
  const names = NAMES.raga
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const thaatMode = RAGA_THAAT_MODE[R.thaat]
  const key = { tonic: saPc, mode: parentMode(modeOf(thaatMode).iv) }
  const SARGAM = ['S', 'r', 'R', 'g', 'G', 'M', 'M′', 'P', 'd', 'D', 'n', 'N']
  const sg = v => SARGAM[((v % 12) + 12) % 12]
  const tarab = [...new Set(R.swaras)].map(v => Sa + 12 + v).concat([Sa + 24])
  const meta = {
    style: 'raga', seed: (opts.seed ?? 1) >>> 0, seeds, length, key: keyName(key), mode: thaatMode, modeName: modeOf(thaatMode).name, bpm, title, form: F.sections.map(s => s[1]),
    fixedKey: opts.key ?? null, micro: null, temperament: 'shruti', meter: null, modulations: null,
    themes: { A: { from: 'рага', title: `рага ${R.name}`, how: `${R.time}; ваади ${sg(R.vadi)}, самваади ${sg(R.samvadi)}` }, B: { from: 'рага', title: 'гат в тинтале', how: 'composed' }, bridge: { rhythmFrom: null } },
    instruments: {}, raga,
  }
  const notes = list => fmtNotes(list.map(([b, n, d]) => [round(b), n, round(d)]))
  const orn = list => JSON.stringify(list.map(([b, , , o], i) => [i, o]).filter(([, o]) => o && (o.meend || o.andolan)).map(([i, o]) => [i, o.meend ?? 0, o.andolan ? 1 : 0]))
  const melodic = F.sitar.filter(e => !e[3]?.chikari), chik = F.sitar.filter(e => e[3]?.chikari)
  const head = [
    `// ${title} — рага ${R.name} (${raga}, thaat ${R.thaat}; ${R.time}), Sa = ${spell(Sa, key)}, ${bpm} BPM. Generated by MathMusic (style raga, seed ${meta.seed}):`,
    `// ${F.sections.map(s => s[1]).join(' → ')}.`,
    `// The raga: ${R.swaras.map(sg).join(' ')} — aroha ${R.aroha.map(v => sg(v) + (v < 0 ? '̣' : v >= 12 ? '̇' : '')).join(' ')}, avaroha ${R.avaroha.map(v => sg(v) + (v >= 12 ? '̇' : '')).join(' ')}; vadi ${sg(R.vadi)}, samvadi ${sg(R.samvadi)};`,
    `// pakad ${R.pakad.map(p => p.map(sg).join(' ')).join(', ')}${R.andolan.length ? `; andolan (a slow swing below the note) on ${R.andolan.map(sg).join(', ')}` : ''}.`,
    `// Shrutis — every swara in just intonation (cents from 12-TET): ${R.swaras.map(v => `${sg(v)} ${cents[v] >= 0 ? '+' : ''}${cents[v]}`).join(', ')}.`,
    `// Alap in free time over the tanpura; jor (a pulse, chikari between); gat and antara in teentaal (X 2 0 3) with the tabla;`,
    `// taans answered by the bansuri, a tihai — three times the phrase, its last note on the sam: s₁ = C − e − 2(p + g); jhala.`,
    `// x is time in beats; n counts semitones from Sa (0 = the middle Sa, ${spell(Sa, key)}).`,
  ]
  const data = `
const SECTIONS = ${JSON.stringify(F.sections)}
const END = ${F.length}
const SA = ${Sa} // the sitar's Sa (MIDI), ${spell(Sa, key)}
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz
// ---- the shrutis: cents from 12-TET of C … B (Sa = ${spell(Sa, key, false)} keeps its pitch); every frequency goes through tuneHz
const TEMPER = [${TEMPER.join(', ')}]
const off = m => TEMPER[mod(m, 12)]
const tuneHz = f => {
  if (!(f > 0)) return f
  const m = 69 + 12 * Math.log2(f / 440), a = Math.floor(m), u = m - a
  const c = u <= 0.35 ? off(a) : u >= 0.65 ? off(a + 1) : off(a) + ((off(a + 1) - off(a)) * (u - 0.35)) / 0.3
  return f * 2 ** (c / 1200)
}
const hz = (n, base) => tuneHz(hz12(n, base))
const sw = n => hz(SA + n - 60, C4) // a swara (semitones from Sa) → Hz

// ---- the sitar's line [beat, swara, length]; ORN: [index, meend from (semitones), andolan] -------------------------------
const SITAR = ${notes(melodic)}
const ORN = new Map(${orn(melodic)}.map(([i, m, a]) => [i, { meend: m, andolan: a }]))
// the chikari strokes (the high drone strings) in the jor and the jhala
const CHIKARI = ${JSON.stringify(chik.map(([b]) => [round(b)]))}
// the bansuri: the antara a shadow of the sitar, the answers in the taans, the tihai an octave up
const BANSURI = ${notes(F.bansuri)}
// the tabla: [beat, bol, velocity] — teentaal's theka: ${THEKA.join(' ')}
const TABLA = ${JSON.stringify(F.tabla.map(([b, bol, v]) => [round(b), bol, round(v)]))}
const MANJIRA = ${JSON.stringify(F.manjira)}
const SWAR = ${JSON.stringify(F.swar)} // swarmandal strums
const SWARAS = ${JSON.stringify(R.swaras)}
const GAT = ${F.gatStart}
const sitarAt = x => notesAt(SITAR, x)
const lastOf = (list, x) => { let lo = 0, hi = list.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m][0] <= x) (k = m), (lo = m + 1); else hi = m - 1 } return k }
`
  const used = { engine: new Set(['floor', 'mod', 'hz as hz12', 'filter', 'reverb', 'exp']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger', 'sitar', 'tanpura', 'tablaDrum', 'flute', 'poly', 'harpTone', 'kaneDrum']) }
  const T = (name, color, graph, midi, formula, init, body) => ({ name, code: `{
  color: '${color}',
  graph: x => { ${graph} },
  midi: x => { ${midi} },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, ${init}
    return x => {
${body}
    }
  },
}` })
  const tracks = [
    T('sitar', '#ffb060', `const m = sitarAt(x); return m ? 0.8 + (m.n + 12) * 0.06 : null`, `const m = sitarAt(x); return m && m.u < 0.9 ? [SA + m.n] : []`,
      ['Si = 0.55x + 0.6\\BP_{180}x + 0.35\\BP_{2400}x + \\textstyle\\sum_j \\BP^{Q=60}_{f_j}x,\\quad x:\\ D(t) = \\big(\\tfrac{SR}{f} - \\varphi\\big)\\big(1 - 0.03\\max(0, y)\\big)', '\\text{джавари укорачивает струну на одной стороне колебания (жужжание); } f_j \\text{ — тараб: ноты раги; мінд — } f\\cdot 2^{\\,m(1 - s(t))/12}'],
      `s = sitar({ tarab: ${JSON.stringify(tarab)}.map(m => hz(m - 60, C4)) }), fire = trigger(), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.3 })`,
      `      const k = lastOf(SITAR, x), m = k >= 0 && x < SITAR[k][0] + SITAR[k][2] + 2 ? SITAR[k] : null
      if (m && fire(k)) {
        const o = ORN.get(k), d = m[2] * sec
        s.hit(sw(m[1]), 0.75 + 0.15 * hash(k, 3), o ? { from: o.meend, glide: 0.12, ...(o.andolan ? { bend: -0.3, bendAt: 0.25 * d, bendTime: 0.35 * d, back: 0.65 * d } : {}) } : {})
      }
      return verb(...pan(0.5 * s(), -0.1))`),
    T('chikari', '#ffe0b0', `const k = lastOf(CHIKARI, x); return k >= 0 && x - CHIKARI[k][0] < 0.2 ? 3.6 : null`, `const k = lastOf(CHIKARI, x); return k >= 0 && x - CHIKARI[k][0] < 0.15 ? [SA + 24] : []`,
      ['Ch = s(f_{\\dot S}) + s(f_{\\ddot S})\\quad\\text{— чикари: две высокие струны Са, ритм между нотами'],
      `a = sitar({ sawari: 0.02, sustain: 1.2, seed: 73 }), b = sitar({ sawari: 0.02, sustain: 1, seed: 79 }), fire = trigger(), hp = filter('hp'), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.3 })`,
      `      const k = lastOf(CHIKARI, x)
      if (k >= 0 && fire(k)) { a.hit(sw(12), 0.4); b.hit(sw(24), 0.3) }
      return verb(...pan(1.5 * hp(a() + b(), 300), 0.2))`),
    T('bansuri', '#d8f0ff', `const m = notesAt(BANSURI, x); return m ? 1.2 + m.n * 0.06 : null`, `const m = notesAt(BANSURI, x); return m && m.u < 0.9 ? [SA + 12 + m.n] : []`,
      ['B = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.1\\,\\BP_{2g}\\eta\\big)\\quad\\text{— бансури, октавой выше ситара'],
      `fl = flute({ breath: 0.12 }), verb = reverb({ room: 0.86, damp: 0.35, wet: 0.38 })
    let p = 0`,
      `      const m = notesAt(BANSURI, x)
      if (m) p = m.n
      return verb(...pan(0.8 * fl(sw(p + 12), !!m && m.u < 0.93), 0.3))`),
    T('tanpura', '#c0a0ff', `return x < END ? -2.9 : null`, `return []`,
      ['Tp = \\sum_{k} s\\big(f_k\\big)\\ \\text{по кругу } (\\text{${sg(R.drone)}̣},\\ S,\\ S,\\ \\text{S̲}) \\text{ каждые 1.2 с; сильное джавари — облако обертонов'],
      `tp = tanpura(), lp = filter('lp'), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.35 })
    const strings = [sw(${R.drone - 12}), sw(0), sw(0), sw(-12)]`,
      `      const y = tp(strings, 1.2, x < END - 1)
      return verb(...pan(1.6 * lp(y, 4000), -0.3))`),
    T('tabla', '#d98b5f', `const k = lastOf(TABLA, x); return k >= 0 && x - TABLA[k][0] < 0.2 ? (/^(dha|dhin|ge)/.test(TABLA[k][1]) ? 2.6 : 3.4) : null`,
      `const k = lastOf(TABLA, x); return k >= 0 && x - TABLA[k][0] < 0.1 ? [/^(dha|dhin|ge)/.test(TABLA[k][1]) ? 41 : 60] : []`,
      ['Dayan = \\sum_{h=1}^{5} a_h e^{-t/T_h}\\sin 2\\pi h f_{Sa} t\\ \\text{(сьяхи делает моды гармоническими)};\\quad Bayan = e^{-t/0.5}\\sin 2\\pi\\big(85t + 25(t - 0.12(1 - e^{-t/0.12}))\\big)'],
      `tb = tablaDrum({ f: sw(12) }), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.18 })`,
      `      const k = lastOf(TABLA, x)
      const y = k >= 0 ? TABLA[k][2] * tb((x - TABLA[k][0]) * sec, TABLA[k][1]) : 0
      return verb(...pan(0.42 * y, 0.05))`),
    T('swarmandal', '#fff0c0', `const k = lastOf(SWAR, x); return k >= 0 && x - SWAR[k][0] < 1 ? 4 - (x - SWAR[k][0]) : null`, `return []`,
      ['Sm = \\sum_{j} Hp(f_j, t - 0.04j)\\quad\\text{— сурмандал: глиссандо вверх по нотам раги, две октавы'],
      `p = poly(harpTone, { release: 1.2, life: 6, max: 24 }), fire = trigger(), verb = reverb({ room: 0.9, wet: 0.45 })
    const notes = [...SWARAS.map(v => v + 12), ...SWARAS.map(v => v + 24), 36]`,
      `      const k = lastOf(SWAR, x)
      if (k >= 0 && fire(k)) notes.forEach((v, j) => p.hit(sw(v), 0.35 * SWAR[k][1], 2.5, j * 0.045))
      return verb(...pan(0.8 * p(), 0.4))`),
    T('manjira', '#ffe8a0', `const k = lastOf(MANJIRA, x); return k >= 0 && x - MANJIRA[k][0] < 0.3 ? 4.3 : null`, `const k = lastOf(MANJIRA, x); return k >= 0 && x - MANJIRA[k][0] < 0.1 ? [80] : []`,
      ['M = \\sum_k a_k e^{-t(1 + k)/d}\\sin 2\\pi r_k f t\\quad\\text{— манджира на сам и тали (1, 5, 13), приглушённая на кхали (9)'],
      `k1 = kaneDrum({ f: 2650, decay: 1 }), verb = reverb({ room: 0.7, wet: 0.2 })`,
      `      const k = lastOf(MANJIRA, x), e = k >= 0 ? MANJIRA[k] : null
      return verb(...pan(e ? 0.6 * (e[1] === 'sam' ? 1 : 0.7) * k1((x - e[0]) * sec, true, e[1] === 'khali') : 0, -0.35))`),
  ]
  const imp = mod => [...used[mod]].sort((a, b) => a.replace(' as hz12', '').localeCompare(b.replace(' as hz12', '')))
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.name} ${'-'.repeat(Math.max(4, 90 - t.name.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${title}',
  bpm: ${bpm},
  key: '${keyName(key)}',
  mode: '${thaatMode}', // thaat ${R.thaat}
  tuning: { id: 'shruti', name: 'шрути раги ${R.name} (чистый строй)', offsets: TEMPER }, // cents of C … B from 12-TET
  length: END,
  theme: '${S.theme}',
  style: 'raga',
  generator: ${JSON.stringify({ style: 'raga', seed: meta.seed, seeds, length, raga, ...(opts.key ? { key: opts.key } : {}) })},
  parts: ['sitar', 'bansuri'],
  sections: SECTIONS,
  tracks: { ${tracks.map((t, i) => `${JSON.stringify(t.name)}: track${i}`).join(', ')} },
}
`,
  ]
  return { source: out.join('\n'), meta }
}

// ---- the gamelan style: Central Javanese gamelan in the measured slendro and pelog (src/gamelan.js) ---------------------
function generateGamelan(opts, S, seeds) {
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)
  const byMode = { slendro: ['slendro manyura', 'slendro sanga', 'slendro nem'], slendroKunst: ['slendro manyura', 'slendro sanga'], pelog: ['pelog nem', 'pelog lima', 'pelog barang'], pelogBem: ['pelog nem', 'pelog lima'], pelogBarang: ['pelog barang'] }
  const pathet = PATHET[opts.pathet] ? opts.pathet : pick(RA, byMode[opts.mode] ?? Object.keys(PATHET))
  const P = PATHET[pathet], form = pick(RA, ['ketawang', 'ladrang'])
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  const length = opts.length ?? 'normal'
  const F = composeGamelan({ pathet, r: RM, form, length })
  const mode = P.laras === 'slendro' ? 'slendro' : 'pelog'
  const names = NAMES.gamelan
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const key = { tonic: 2, mode: 'major' }
  const meta = {
    style: 'gamelan', seed: (opts.seed ?? 1) >>> 0, seeds, length, key: 'D', mode, modeName: MODES[mode].name, bpm, title, form: F.sections.map(s => s[1]),
    fixedKey: null, micro: null, temperament: null, meter: null, modulations: null,
    themes: { A: { from: 'гамелан', title: `${form} · ${pathet}`, how: `гонган A: ${F.A.join(' ')}` }, B: { from: 'гамелан', title: 'нгелик', how: `гонган B: ${F.B.join(' ')}` }, bridge: { rhythmFrom: null } },
    instruments: {}, pathet,
  }
  const fmt = list => fmtNotes(list.map(([b, n, d]) => [round(b), round(n - 60), round(d)]))
  const cents = LARAS[P.laras].cents
  const head = [
    `// ${title} — ${form} in ${pathet}, ${bpm} BPM (balungan beats). Generated by MathMusic (style gamelan, seed ${meta.seed}):`,
    `// ${F.sections.map(s => s[1]).join(' → ')}.`,
    `// The laras as measured (Kyai Madu Laras, Oxford): ${Object.entries(cents).map(([t, c]) => `${t} = ${c} ¢`).join(', ')} — tone 1 on D4; not 12-TET, so the`,
    `// notes are fractional (n = 2.63 is slendro 2). Pathet ${pathet.split(' ')[1]}: tones ${P.tones.join(' ')}, the gong tone ${P.gong}.`,
    `// Gongan A: ${F.A.join(' ')}   B: ${F.B.join(' ')}   (gatras of four; the last note of each the seleh, the goal).`,
    `// Colotomy (${form}): kethuk ${FORMS[form].kethuk.join(' ')}, kempul ${FORMS[form].kempul.join(' ')}, kenong ${FORMS[form].kenong.join(' ')}, gong ${FORMS[form].beats} — a cycle halved and halved again.`,
    `// Garap: peking a a b b, bonang barung a b a b, panerus twice as fast; irama II: the balungan at half speed, the`,
    `// elaborations twice as dense against it; the suling floats there. Every bronze is a pair a few Hz apart (ombak).`,
  ]
  const data = `
const SECTIONS = ${JSON.stringify(F.sections.map(([a, n]) => [round(a), n]))}
const END = ${round(F.length)}
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz; the laras' cents make the fractional n
// ---- the balungan (saron; the demung an octave down) and the garap: [beat, n from C4, length] ---------------------------
const BALUNGAN = ${fmt(F.balungan)}
const PEKING = ${fmt(F.peking)}
const BONANG = ${fmt(F.bonang)}
const PANERUS = ${fmt(F.panerus)}
const SULING = ${fmt(F.suling)}
// the colotomic gongs: [beat, instrument, n from C4]
const COLOTOMY = ${JSON.stringify(F.colot.map(([b, k, n]) => [round(b), k, round(n - 60)]))}
const KENDHANG = ${JSON.stringify(F.kendhang.map(([b, k]) => [round(b), k]))}
const lastOf = (list, x) => { let lo = 0, hi = list.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m][0] <= x) (k = m), (lo = m + 1); else hi = m - 1 } return k }
const BY_KIND = {}
for (const c of COLOTOMY) (BY_KIND[c[1]] ??= []).push(c)
const struck = kind => BY_KIND[kind] ?? []
`
  const used = { engine: new Set(['hz', 'reverb', 'floor']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger', 'poly', 'saronTone', 'bonangTone', 'kenongTone', 'kempulTone', 'kethukTone', 'gongTone', 'taikoDrum', 'woodClack', 'flute']) }
  const T = (name, color, graph, midi, formula, init, body) => ({ name, code: `{
  color: '${color}',
  graph: x => { ${graph} },
  midi: x => { ${midi} },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, ${init}
    return x => {
${body}
    }
  },
}` })
  // a metallophone part over a note list: struck on each note, damped at the next (its duration)
  const metal = (name, color, list, tone, gain, y0, k, panv, oct = '', extra = '') => T(name, color,
    `const m = notesAt(${list}, x); return m ? ${y0} + (m.n + 12) * ${k} : null`, `const m = notesAt(${list}, x); return m && m.u < 0.9 ? [60 + Math.round(m.n * 100) / 100] : []`,
    [`${name}(f, t) = \\tfrac12\\big(s(f, t) + s(f + \\omega, t)\\big)\\quad\\text{— пара инструментов в нескольких Гц друг от друга: омбак (биения)}`],
    `p = poly(${tone}, { release: 0.25, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.34 })`,
    `      const m = notesAt(${list}, x)
      if (m && fire(m.at)) { p.hit(hz(m.n${oct}, C4), 0.6 + 0.15 * hash(floor(m.at * 4), 3), m.d * sec + 0.15)${extra} }
      return verb(...pan(${gain} * p(), ${panv}))`)
  const colotomic = (name, kind, tone, gain, y, panv, life) => T(name, '#e8c27a',
    `const k = lastOf(struck('${kind}'), x); return k >= 0 && x - struck('${kind}')[k][0] < 1 ? ${y} : null`,
    `const s = struck('${kind}'), k = lastOf(s, x); return k >= 0 && x - s[k][0] < 0.5 ? [60 + Math.round(s[k][2] * 100) / 100] : []`,
    [`${kind}:\\ \\text{колотомия — удар на позициях цикла (${FORMS[form][kind]?.join(' ') ?? FORMS[form].beats})'`],
    `p = poly(${tone}, { release: ${life}, life: ${life + 2}, max: 6 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.4 }), list = struck('${kind}')`,
    `      const k = lastOf(list, x)
      if (k >= 0 && fire(k)) p.hit(hz(list[k][2], C4), 0.8, ${life})
      return verb(...pan(${gain} * p(), ${panv}))`)
  const tracks = [
    metal('saron', '#f2d38a', 'BALUNGAN', 'saronTone', 0.3, 0.6, 0.05, -0.15, '', '; p.hit(hz(m.n - 12, C4), 0.55, m.d * sec + 0.2) /* the demung, an octave down */'),
    metal('peking', '#fff3c0', 'PEKING', 'saronTone', 0.3, 1.6, 0.05, 0.35),
    metal('bonang', '#ffd090', 'BONANG', 'bonangTone', 0.38, 1.1, 0.05, 0.25),
    metal('bonang panerus', '#ffe8b0', 'PANERUS', 'bonangTone', 0.22, 2, 0.04, -0.3),
    colotomic('kenong', 'kenong', 'kenongTone', 0.32, -0.6, 0.2, 3),
    colotomic('kempul', 'kempul', 'kempulTone', 0.36, -1.4, -0.25, 3),
    colotomic('kethuk', 'kethuk', 'kethukTone', 0.8, 0.2, 0.1, 0.3),
    colotomic('gong', 'gong', 'gongTone', 0.28, -2.6, 0, 9),
    T('kendhang', '#d98b5f', `const k = lastOf(KENDHANG, x); return k >= 0 && x - KENDHANG[k][0] < 0.25 ? (KENDHANG[k][1] === 'dhah' ? 3 : 3.8) : null`,
      `const k = lastOf(KENDHANG, x); return k >= 0 && x - KENDHANG[k][0] < 0.1 ? [KENDHANG[k][1] === 'dhah' ? 41 : 38] : []`,
      ['K:\\ \\text{dhah — низкий открытый удар, tak — шлепок, ket — малый барабан ketipung'],
      `dhah = taikoDrum({ pitch: 105, decay: 0.45, bend: 2, crack: 0.15, boom: 0.25, seed: 83 }), ket = taikoDrum({ pitch: 230, decay: 0.2, bend: 1, crack: 0.2, seed: 89 }), tak = woodClack({ f: 1100, seed: 97 }), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.2 })`,
      `      const k = lastOf(KENDHANG, x), e = k >= 0 ? KENDHANG[k] : null, t = e ? (x - e[0]) * sec : 9
      const y = 0.5 * dhah(t, !!e && e[1] === 'dhah') + 0.35 * ket(t, !!e && e[1] === 'ket') + 0.3 * tak(t, !!e && e[1] === 'tak')
      return verb(...pan(0.9 * y, -0.05))`),
    T('suling', '#d8f0e0', `const m = notesAt(SULING, x); return m ? 2.2 + m.n * 0.04 : null`, `const m = notesAt(SULING, x); return m && m.u < 0.9 ? [60 + Math.round(m.n * 100) / 100] : []`,
      ['S = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.15\\,\\BP_{2g}\\eta\\big)\\quad\\text{— бамбуковая флейта, плывёт над ирамой II'],
      `fl = flute({ breath: 0.15 }), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.45 })
    let n = 0`,
      `      const m = notesAt(SULING, x)
      if (m) n = m.n
      return verb(...pan(0.35 * fl(hz(n, C4), !!m && m.u < 0.95), 0.4))`),
  ]
  const imp = mod => [...used[mod]].sort()
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.name} ${'-'.repeat(Math.max(4, 90 - t.name.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${title}',
  bpm: ${bpm},
  key: 'D',
  mode: '${mode}', // the measured ${mode}: tone 1 = D4
  length: END,
  theme: '${S.theme}',
  style: 'gamelan',
  generator: ${JSON.stringify({ style: 'gamelan', seed: meta.seed, seeds, length, pathet })},
  parts: ['saron', 'bonang'],
  sections: SECTIONS,
  tracks: { ${tracks.map((t, i) => `${JSON.stringify(t.name)}: track${i}`).join(', ')} },
}
`,
  ]
  return { source: out.join('\n'), meta }
}

export const describe = meta => `${STYLES[meta.style]?.emoji ?? ''} ${meta.title} · ${meta.key}${meta.modeName ? ' ' + meta.modeName.toLowerCase() : ''} · ${meta.bpm} BPM · темы: ${meta.themes.A.title} + ${meta.themes.B.title}`
