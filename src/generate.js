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
import { MELODIES, PROGRESSIONS } from './melodies.js'
import { parseKey, roman, voiceLead, spell, keyName, keyLabel, SCALES, pc, chordName } from './theory.js'

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
  classical: {
    label: 'Барокко / оркестр', emoji: '🎻', theme: 'classical', bpm: [68, 88], swing: 0.5,
    themes: { canon: 5, 'canon-halves': 4, 'void-orbit': 1.5, 'template-flute': 1.5, 'meow-verse': 1 },
    keys: ['D', 'G', 'C', 'A', 'F', 'Dm', 'Am', 'Gm'], moods: ['classical', 'warm', 'epic', 'calm'],
    voicing: 'close', chordRange: [50, 74], bassRange: [31, 50],
    lead: ['violin'], lead2: ['violin', 'flute'], chords: ['harpsichord'], bass: ['cello'], pad: ['strings'], arp: ['harpsichordarp'], texture: [null], kit: 'orchestral',
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
}

export function generate(opts = {}) {
  const styleId = STYLES[opts.style] ? opts.style : 'lofi', S = STYLES[styleId]
  const seed = (opts.seed ?? 1) >>> 0
  const seeds = {
    arrangement: (opts.arrangement ?? seed) >>> 0,
    melody: (opts.melody ?? (seed * 7919 + 17)) >>> 0,
    instruments: (opts.instruments ?? (seed * 104729 + 3)) >>> 0,
  }
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)

  // key, tempo, form
  const key = parseKey(opts.key) ?? parseKey(pick(RA, S.keys))
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  let form = pick(RA, S.forms).map(([name, bars, role, energy, o]) => ({ name, bars, role, energy, ...(o ?? {}) }))
  const target = { short: 95, normal: 160, long: 220 }[opts.length ?? 'normal'] // seconds
  form = fitForm(form, target, bpm, RA)

  // themes from the library: the style's own list (weights), only those that can live in this mode;
  // A and B preferably from different songs. A melody marked `only` belongs to its style alone
  const LIB = MELODIES.filter(m => !m.only || m.only === styleId)
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
  const progs = PROGRESSIONS[key.mode]
  const bridgeProg = pick(RA, progs).map(s => roman(s, key))
  const melR = pick(RM, LIB.filter(m => m.id !== melA.id && m.id !== melB.id))
  const bridgeLen = 16, bridgeAt = b => bridgeProg[Math.floor(b / 4) % 4]
  const rhythm = melR.notes.filter(([b]) => b < bridgeLen).map(([b, , d]) => [b, Math.min(d, bridgeLen - b)])
  const BR = { notes: compose({ rhythm, chordAt: bridgeAt, key, lo: 64, hi: 81, r: RM, end: 'open' }), chords: bridgeProg, per: 4, length: bridgeLen, from: melR.from }
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
  for (const sec of form) {
    const beats = sec.bars * 4, tr = sec.keyUp ?? 0
    sections.push([at, sec.name])
    // the harmony of the section: a theme's chords, the bridge progression, or the A chords
    const src = sec.role === 'themeB' ? B : sec.role === 'bridge' ? BR : sec.role === 'build' && RUN ? RUN : A
    for (let b = 0; b < beats; b += src.per) {
      const ch = src.chords[Math.floor(b / src.per) % src.chords.length]
      const len = Math.min(src.per, beats - b)
      harmony.push({ at: at + b, len, ch, tr })
    }
    // melodic plans: [start, phrase, transpose, stretch]
    const repeat = (plan, ph, phLen) => { for (let b = 0; b + phLen <= beats + 1e-6; b += phLen) plan.push([at + b, ph, tr, 1]) }
    if (sec.role === 'theme') repeat(plans.lead, 'A', A.length)
    else if (sec.role === 'themeB') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'B', B.length) }
    else if (sec.role === 'bridge') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'BRIDGE', BR.length) }
    else if (sec.role === 'solo' && styleId === 'boss') { plans.lead.push([at, 'SOLO', 0, 1]); plans.lead2.push([at, 'REST', 0, 1]) } // the hook sings the equation
    else if (sec.role === 'solo') { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'SOLO', 0, 1]) }
    else if (sec.role === 'final') {
      repeat(plans.lead, 'A', A.length)
      plans.counter.push([at, sec.canon ? 'CANON' : 'HARMONY', 0, 1])
    } else if (sec.role === 'outro') plans.lead.push([at, 'A', tr, 2]) // the theme at half speed
    else if (sec.role === 'break') plans.lead.push([at, 'A', 0, 1]) // a fragment of the theme over the break
    else if (sec.role === 'build') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'RUN', RUN.length) }
    else plans.lead.push([at, 'REST', 0, 1])
    if (!['bridge', 'solo', 'themeB', 'build'].includes(sec.role)) plans.lead2.push([at, 'REST', 0, 1])
    if (sec.role !== 'final') plans.counter.push([at, 'REST', 0, 1])
    sectionInfo.push({ ...sec, at, beats })
    at += beats
  }
  const END = at
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
    h.symbol = chordName({ ...ch, root: (ch.root + h.tr) % 12 }, key)
    // the chord's own third, fifth and seventh above the root (the fifth of a ø7 chord is diminished!)
    h.ivs = [ch.ivs.find(i => i === 3 || i === 4) ?? 4, ch.ivs.find(i => i === 6 || i === 7 || i === 8) ?? 7, ch.ivs.find(i => i === 9 || i === 10 || i === 11) ?? 10]
  }
  const solo = sectionInfo.find(s => s.role === 'solo')
  const names = NAMES[styleId] ?? NAMES.lofi
  // the name follows the arrangement; a mutated melody or sound gets a variant number
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const meta = {
    style: styleId, seed, seeds, length: opts.length ?? 'normal', key: keyName(key), bpm, title, form: form.map(f => f.name),
    themes: { A: { from: melA.from, title: melA.title, how: A.how }, B: { from: melB.from, title: melB.title, how: B.how }, bridge: { rhythmFrom: melR.from } },
    instruments: inst,
  }
  const source = emit({ S, styleId, key, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r: RI })
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
    bars.get(k).push(`[${round(b)}, ${n}, ${round(d)}]`)
  }
  return '[\n' + [...bars.values()].map(l => indent + '  ' + l.join(', ') + ',').join('\n') + '\n' + indent + ']'
}
// the pad plays in the intro, theme B, the bridge, the break and the final
const PAD_ON = `const padOn = x => chordAt(x) && ['themeB', 'bridge', 'break', 'final', 'intro'].includes(role(x)) && x < END - 2`
const lane = { lead: [1.1, 3], lead2: [1, 2.9], counter: [0.8, 2.4], chords: [-1, 0.4], bass: [-3, -2], pad: [-1.7, -0.6], arp: [0.3, 1.2], texture: [-2.95, -2.85] }

function emit(P) {
  const { S, styleId, key, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r } = P
  const used = { engine: new Set(['mod', 'floor', 'exp', 'sin', 'TAU', 'hz', 'filter', 'reverb', 'delay', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'arrangement', 'trigger', 'poly']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const tracks = []
  const sw = S.swing
  const roles = sectionInfo.map(s => [s.at, s.role, s.energy])
  const keyText = keyLabel(key)
  const boss = styleId === 'boss'

  // ---- data
  const H = harmony.map(h => `  [${h.at}, ${h.len}, ${h.bass}, [${h.voicing.join(', ')}], '${h.symbol}', [${h.ivs.join(', ')}]],`).join('\n')
  const head = []
  head.push(`// ${meta.title} — ${S.label.toLowerCase()} in ${spell(key.tonic + 60, key, false)} ${key.mode}, ${bpm} BPM. Generated by MathMusic`)
  head.push(`// (style ${styleId}, seed ${meta.seed}): ${sections.map(s => s[1]).join(' → ')}.`)
  head.push(`// Themes: A — ${meta.themes.A.title} (${meta.themes.A.how}), B — ${meta.themes.B.title} (${meta.themes.B.how}); the bridge melody is newly`)
  head.push(`// composed on the rhythm of a theme from ${BR.from}. Computed parts: ${[solo ? (boss ? 'a solo that is an equation (the graph of two sines)' : 'an improvised solo') : null, 'a counter-melody from the chords', plans.counter.some(p => p[1] === 'CANON') ? 'a canon' : null, RUN ? 'a run up to the dominant in every build-up' : null, boss ? 'a reverse bass that rolls in the final' : null, 'the theme at half speed in the outro', sectionInfo.some(s => s.keyUp) ? 'a key change up' : null].filter(Boolean).join(', ')}.`)
  if (boss) head.push(`// The hardstyle kick's tail and the reverse bass sit on the tonic; every part ducks under the kick in the drops,\n// d(t) = 1 − 0.7(1 − t/0.18)². \`boss\` below makes it a Glitch Forest boss song (tools/score-export.mjs).`)
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

// ---- harmony: [start beat, length, bass MIDI, voicing MIDI (voice-led), chord, [3rd, 5th, 7th]] --
const HARMONY = [
${H}
]
const BY_BEAT = []
for (const h of HARMONY) for (let b = h[0]; b < h[0] + h[1]; b++) BY_BEAT[b] = h
const chordAt = x => BY_BEAT[floor(x)] ?? null
${PAD_ON} // pads play here
const SCALE = [${(key.mode === 'minor' ? MIN : MAJ).map(i => (i + key.tonic) % 12).join(', ')}] // ${keyText}, pitch classes from C
${boss ? bossData({ need, key, bpm, sectionInfo }) : ''}
// ---- melodies: [beat, n from C4, length] — draw them in the piano roll ------------------------------
// A — ${meta.themes.A.title}, ${meta.themes.A.how}; in ${keyText}
const THEME_A = ${fmtNotes(A.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
// B — ${meta.themes.B.title}, ${meta.themes.B.how}
const THEME_B = ${fmtNotes(B.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
// the bridge — composed over ${BR.chords.map(c => chordName(c, key)).join(' – ')}
const BRIDGE = ${fmtNotes(BR.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
const REST = []
${RUN ? `// the build-up: the theme's opening over ${RUN.chords.slice(0, 2).map(c => chordName(c, key)).join(' – ')}, a run up from the dominant, a trill on it
const RUN = ${fmtNotes(RUN.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
` : ''}${solo && boss ? equationSolo({ need, key, solo, r }) : solo ? `// the solo: a random walk over the scale, chord tones on the beats (improvise)
const SOLO = improvise({
  start: ${solo.at}, length: ${solo.beats - 2}, rate: 2, seed: ${1 + Math.floor(r() * 999)}, swing: SW, lo: ${A.notes.reduce((a, e) => Math.min(a, e[1]), 99) - 60 - 2}, hi: ${A.notes.reduce((a, e) => Math.max(a, e[1]), 0) - 60 + 3},
  phrase: 8, rest: 0.2, hold: 0.3, scale: () => SCALE, chord: x => (chordAt(x)?.[3] ?? [0]).map(n => mod(n, 12)),
}).map(([b, n, d]) => [b - ${solo.at}, n, d])` : 'const SOLO = []'}
const PHRASES = { A: THEME_A, B: THEME_B, BRIDGE, REST, SOLO${RUN ? ', RUN' : ''} }

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
  const pcs = c[3].map(n => mod(n, 12))
  for (let n = m.n - 3; n > m.n - 12; n--) if (pcs.includes(mod(n + 60, 12))) return { ...m, n }
  return null
}
`
  need('instruments', 'improvise')
  // ---- tracks
  const T = (name, code) => tracks.push({ name, code })
  const leadCode = (id, at, laneR, gainMul = 1, panv = 0.15) => LEADS[id]({ at, lane: laneR, gain: gainMul, pan: panv, need, sw })
  T(inst.lead, leadCode(inst.lead, 'leadAt', lane.lead, 1, 0.12))
  // bells carry a melody alone at full level, but next to another lead they cut through: softer
  const LEAD2_GAIN = { bells: 0.45 }
  // boss: the chip lead and its counter stand up to the supersaw and the kick
  const louder = boss ? 1.6 : 1
  T(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2, leadCode(inst.lead2, 'lead2At', lane.lead2, 0.9 * louder * (LEAD2_GAIN[inst.lead2] ?? 1), -0.3))
  // named by its instrument too ("vibes counter"), so a MIDI export knows what plays it
  const counterVoice = COUNTER_VOICE[inst.lead] ?? inst.lead2
  T(counterVoice + ' counter', leadCode(counterVoice, 'counterAt', lane.counter, 0.5 * louder * (boss ? 2 : 1), -0.4))
  T(inst.chords, CHORDS[inst.chords]({ need, comp: S.comp, lane: lane.chords }))
  if (inst.pad) T(inst.pad === 'strings' ? 'strings' : inst.pad, PADS[inst.pad]({ need, lane: lane.pad, gain: boss ? 3 : 1 }))
  T('bass', BASSES[inst.bass]({ need, line: S.bassline, lane: lane.bass }))
  if (boss) T('rbass', reverseBassTrack({ need, lane: lane.bass }))
  if (inst.arp) T(inst.arp + ' arp', ARPS[inst.arp]({ need, step: S.arpStep, poly: S.arpPoly, lane: lane.arp }))
  if (S.kit === 'hardstyle') T('kick', hardKickTrack({ need }))
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
  const imp = mod => [...used[mod]].sort()
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.key} ${'-'.repeat(Math.max(4, 90 - t.key.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${meta.title}',
  bpm: ${bpm},
  key: '${keyName(key)}',
  length: END,
  theme: '${S.theme}',
  style: '${styleId}',
  generator: ${JSON.stringify({ style: styleId, seed: meta.seed, seeds: meta.seeds, length: meta.length })},
  sections: SECTIONS,${bossField}
  tracks: { ${tracks.map((t, i) => `${JSON.stringify(t.key)}: track${i}`).join(', ')} },
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
const compHit = comp => `const COMP = ${JSON.stringify(comp)}
const compAt = x => {
  const e = energy(x)
  if (e < 0 || role(x) === 'end') return null
  let h = null
  for (const c of COMP[e] ?? COMP[1]) if (c[0] <= mod(x, 4)) h = c
  return h && { at: floor(x / 4) * 4 + h[0], vel: h[1], d: h[2] }
}`
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
  midi: x => (chordAt(x) && energy(x) >= 0 && mod(x, 4) < 3.9 ? chordAt(x)[3] : []),
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
  midi: x => (chordAt(x) && energy(x) >= 0 && mod(x, 4) < 3.9 ? chordAt(x)[3] : []),
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
  midi: x => (chordAt(x) && energy(x) >= 0 && mod(x, 4) < 3.9 ? chordAt(x)[3] : []),
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
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? chordAt(x)[3].map(n => n - 12 * (n > 64)) : []),
  formula: ${JSON.stringify(['S = \\Rev\\,\\Cho\\,\\LP\\,\\HP\\sum_{j}\\sum_{u=-1}^{1}\\saw\\!\\Big(f_j\\,2^{\\,(0.09u + 0.12\\sin 2\\pi r_{j,u}T)/12}\\Big)'])},
  audio() {
    const s = strings({ voices: 4, attack: 700, release: 1400, cutoff: 2600, gain: ${round(0.036 * (o.gain ?? 1))} }), ch = chorus({ mix: 0.4 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => verb(...ch(...s(padOn(x) ? chordAt(x)[3].map(n => hz(n - 60 - 12 * (n > 64), C4)) : [])))
  },
}`
  },
  choirpad: o => {
    o.need('instruments', 'voice', 'VOWELS')
    return `{
  color: '#c9b6ff',
  graph: x => (padOn(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (padOn(x) && mod(x, 4) < 3.9 ? chordAt(x)[3] : []),
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
const bassData = line => `const BASS_LINE = ${JSON.stringify(line)}
const bassAt = x => {
  const c = chordAt(x), e = energy(x)
  if (!c || e < 1 || x >= END - 1) return null
  const p = mod(x, 4), bar = floor(x / 4) * 4
  ${line === 'eighths' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.4 ? { n: c[2] + 12 * (k % 2), at: bar + k / 2, d: 0.4 } : null`
    : line === 'octaves' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.42 ? { n: c[2] + (k === 7 ? c[5][1] : k % 2 ? 12 : 0), at: bar + k / 2, d: 0.42 } : null`
    : `let hit = null
  for (const h of BASS_LINE) if (h[0] <= p && p < h[0] + h[2]) hit = h
  if (!hit) return null
  const next = chordAt(bar + 4) ?? c, [third, fifth] = c[5]
  const n = hit[1] === 'R' ? c[2] : hit[1] === '5' ? c[2] + fifth : hit[1] === '8' ? c[2] + 12 : hit[1] === '3' ? c[2] + third : next[2] - 1
  return { n, at: bar + hit[0], d: hit[2] }`}
}`
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
const drumData = drums => `// drum patterns: 16 steps per bar — x hit, o ghost, - rest; by section energy
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
}`
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
      return 0.7 * lp(rb(b ? b.u : null, hz(b ? b.n - 60 : -24, C4)), 2500)
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
      return KICK_GAIN * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, hz(TONIC1 + trAt(x) - 60, C4), !!h)
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

// describe a generated song for the UI
export const describe = meta => `${STYLES[meta.style]?.emoji ?? ''} ${meta.title} · ${meta.key} · ${meta.bpm} BPM · темы: ${meta.themes.A.title} + ${meta.themes.B.title}`
