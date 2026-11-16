// Подсказка 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// The first version was «some other style»: one sound for everything. That score is many musics under one roof, so this
// style is three kinds (drawn by the arrangement seed; S.kinds), each in the idiom of one of the pieces the user named —
// with themes of our own, none of the game's:
// · bones    a skeleton's battle: 142–152, a staccato riff on a xylophone or a trumpet over organ chords on every
//            off-beat, a bass that bounces root – octave – fifth, a tight kit, a square arpeggio when it heats up;
// · glamour  a show: 144–150, four on the floor, a house piano on the off-beats, a saw lead with a glide, an octave
//            bass, strings, claps, a key change for the encore;
// · waterfall 70–82, a music box in a long echo over a felt piano and a quiet choir, drops of glass, a sub that
//            barely moves, almost no drums; major keys.
import { defineStyle } from './define.js'
import { ambience, keysComp, keysLead, sectionChords, studioKit, tonedArp, tonedBass } from './studio.js'
import { ROLL } from './stage.js'

const SQUARE_PLUCK = '(f, t, v) => 0.5 * v * exp(-t / 0.16) * (1 - exp(-t / 0.002)) * (sin(TAU * f * t) + 0.33 * sin(TAU * 3 * f * t) + 0.2 * sin(TAU * 5 * f * t) + 0.12 * sin(TAU * 7 * f * t))'
const MINOR = ['Dm', 'Em', 'Am', 'Gm', 'Cm', 'Bm', 'F#m'], MAJOR = ['D', 'F', 'G', 'C', 'A', 'Bb', 'Eb']

defineStyle('podskazka2', {
  family: 'retro', after: 'podskazka',
  names: [['tiny', 'lost', 'snowy', 'echo', 'last', 'cool', 'dazzling', 'quiet'], ['hopes', 'ruins', 'heart', 'path', 'puzzle', 'spaghetti', 'show', 'waterfall']],
  style: {
    label: 'Подсказка 2', emoji: '❤️', theme: 'chip', of: 'podskazka', ver: 2, bpm: [142, 152], swing: 0.5, stage: true,
    about: 'версия 2 — три рода песен: «кости» (битва скелета: стаккатный рифф ксилофона и трубы, аккорды органа на слабые доли, прыгающий бас), «гламур» (шоу: прямая бочка, хаус-рояль, пила с глиссандо, смена тональности на бис) и «водопад» (музыкальная шкатулка в эхе, войлочное пианино, тихий хор, почти без ударных)',
    gains: { lead: 1, lead2: 0.9, counter: 0.8, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'ut2-riff': 5, 'ut2-cool': 5 },
    keys: MINOR, moods: ['game', 'epic'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 43],
    lead: ['bonexylo', 'trumpet2'], lead2: ['squarelead2', 'trumpet2'], counter: 'squarelead2', chords: ['skachords'], bass: ['bonebass'], pad: [null], arp: ['nesarp'], texture: [null], kit: 'bones',
    forms: [
      [['encounter', 4, 'intro', 1], ['the riff', 16, 'theme', 3], ['spaghetti', 8, 'themeB', 2], ['cool dude', 8, 'bridge', 2], ['blue attack', 8, 'solo', 3], ['the riff II', 16, 'final', 3, { keyUp: 1 }], ['spared', 4, 'outro', 1]],
      [['encounter', 4, 'intro', 1], ['spaghetti', 8, 'themeB', 2], ['the riff', 16, 'theme', 3], ['cool dude', 8, 'bridge', 2], ['special attack', 4, 'build', 2], ['the riff II', 16, 'final', 3, { keyUp: 2 }], ['spared', 4, 'outro', 1]],
    ],
    kinds: [
      { kind: 'bones' },
      {
        kind: 'glamour', bpm: [144, 150], themes: { 'ut2-glamour': 5, 'ut2-ratings': 5 },
        lead: ['sawlead2', 'squarelead2'], lead2: ['grand', 'glassbell'], counter: 'glassbell', chords: ['housepiano'], bass: ['showbass'], pad: ['stringpad'], arp: ['softarp'], kit: 'glamour',
        forms: [
          [['showtime', 4, 'intro', 1], ['ratings', 8, 'themeB', 2], ['the stage', 16, 'theme', 3], ['quiz', 8, 'bridge', 1], ['pose', 4, 'build', 2], ['encore', 16, 'final', 3, { keyUp: 2 }], ['oh yes', 4, 'outro', 1]],
          [['showtime', 4, 'intro', 1], ['the stage', 16, 'theme', 3], ['ratings', 8, 'themeB', 2], ['quiz', 8, 'bridge', 1], ['legs', 8, 'solo', 3], ['pose', 4, 'build', 2], ['encore', 16, 'final', 3, { keyUp: 2 }], ['oh yes', 4, 'outro', 1]],
        ],
        comp: { 0: [[0, 0.5, 3.5]], 1: [[0, 0.6, 1.5], [2.5, 0.5, 1]], 2: [[0.5, 0.6, 0.4], [1.5, 0.6, 0.4], [2.5, 0.6, 0.4], [3.5, 0.6, 0.4]], 3: [[0, 0.7, 0.4], [0.75, 0.6, 0.4], [1.5, 0.65, 0.4], [2.5, 0.65, 0.4], [3, 0.55, 0.4], [3.5, 0.6, 0.4]] },
        bassline: 'octaves',
      },
      {
        kind: 'waterfall', bpm: [70, 82], keys: MAJOR, gains: { lead: 1, lead2: 0.9, counter: 0.8, chords: 1, pad: 1, arp: 1, bass: 0.8 }, themes: { 'ut2-waterfall': 5, 'ut2-echoflower': 5 }, moods: ['calm'], voicing: 'open',
        lead: ['musicbox2', 'felt'], lead2: ['softlead', 'flute2'], counter: 'softlead', chords: ['waterkeys'], bass: ['sub2'], pad: ['airchoir', 'warmpad'], arp: ['droparp'], kit: 'quietwater', texture: ['cavewater'],
        forms: [
          [['a drop', 4, 'intro', 0], ['echo flowers', 8, 'theme', 1], ['the wishing room', 8, 'themeB', 1], ['quiet water', 4, 'bridge', 0], ['memory', 8, 'final', 2], ['rain', 4, 'break', 0], ['umbrella', 4, 'outro', 0]],
          [['a drop', 4, 'intro', 0], ['the wishing room', 8, 'themeB', 1], ['echo flowers', 8, 'theme', 1], ['quiet water', 4, 'bridge', 0], ['rain', 4, 'break', 0], ['memory', 8, 'final', 2, { keyUp: 2 }], ['umbrella', 4, 'outro', 0]],
        ],
        comp: { 0: [[0, 0.5, 3.8]], 1: [[0, 0.55, 1.9], [2, 0.45, 1.9]], 2: [[0, 0.6, 1.4], [1.5, 0.5, 0.5], [2, 0.55, 1.9]], 3: [[0, 0.6, 1.4], [1.5, 0.5, 0.5], [2, 0.55, 1.9]] },
        bassline: [[0, 'R', 3.5]],
      },
    ],
    drums: {}, comp: {},
    bassline: [[0, 'R', 0.5], [0.5, '8', 0.5], [1, 'R', 0.5], [1.5, '5', 0.5], [2, 'R', 0.5], [2.5, '8', 0.5], [3, '5', 0.5], [3.5, 'A', 0.5]],
    arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    // bones: three stabs on the tonic, a leap of an octave, a chromatic step on the way down; the same over VI and VII
    id: 'ut2-riff', title: 'Cool Skeleton (крутой скелет)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false,
    moods: ['game'], chords: ['i', 'i', 'VI', 'VII', 'i', 'i', 'VI', 'V'],
    notes: [[0, 0, 0.5], [0.5, 0, 0.25], [0.75, 0, 0.25], [1, 12, 0.5], [1.5, 7, 0.5], [2, 7, 0.5], [2.5, 6, 0.5], [3, 5, 0.5], [3.5, 3, 0.5],
      [4, 0, 0.5], [4.5, 3, 0.5], [5, 5, 0.5], [5.5, 3, 0.25], [5.75, 5, 0.25], [6, 7, 1], [7, 3, 0.5], [7.5, 5, 0.5],
      [8, 8, 0.5], [8.5, 8, 0.25], [8.75, 8, 0.25], [9, 15, 0.5], [9.5, 12, 0.5], [10, 12, 0.5], [10.5, 10, 0.5], [11, 8, 0.5], [11.5, 7, 0.5],
      [12, 10, 0.5], [12.5, 14, 0.5], [13, 17, 0.5], [13.5, 14, 0.5], [14, 14, 1], [15, 12, 0.5], [15.5, 10, 0.5],
      [16, 12, 0.5], [16.5, 12, 0.25], [16.75, 12, 0.25], [17, 19, 0.5], [17.5, 15, 0.5], [18, 15, 0.5], [18.5, 14, 0.5], [19, 12, 0.5], [19.5, 10, 0.5],
      [20, 7, 0.5], [20.5, 10, 0.5], [21, 12, 0.5], [21.5, 10, 0.25], [21.75, 12, 0.25], [22, 15, 1], [23, 12, 0.5], [23.5, 10, 0.5],
      [24, 8, 0.5], [24.5, 12, 0.5], [25, 15, 0.5], [25.5, 12, 0.5], [26, 20, 1], [27, 17, 0.5], [27.5, 15, 0.5],
      [28, 13, 0.5], [28.5, 16, 0.5], [29, 19, 0.5], [29.5, 16, 0.5], [30, 13, 1], [31, 7, 1]],
  }, {
    id: 'ut2-cool', title: 'Spaghetti Trap (ловушка со спагетти)', key: 'Gm', base: 'G4', feel: 'straight', per: 4, modal: false,
    moods: ['game'], chords: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'],
    notes: [[0, 7, 0.75], [0.75, 7, 0.25], [1, 10, 0.5], [1.5, 12, 0.5], [2, 15, 0.75], [2.75, 14, 0.25], [3, 12, 0.5], [3.5, 10, 0.5],
      [4, 10, 0.75], [4.75, 10, 0.25], [5, 14, 0.5], [5.5, 17, 0.5], [6, 14, 0.75], [6.75, 12, 0.25], [7, 10, 0.5], [7.5, 10, 0.5],
      [8, 8, 0.75], [8.75, 8, 0.25], [9, 12, 0.5], [9.5, 15, 0.5], [10, 12, 0.75], [10.75, 10, 0.25], [11, 8, 0.5], [11.5, 7, 0.5],
      [12, 7, 0.5], [12.5, 11, 0.5], [13, 14, 0.5], [13.5, 11, 0.5], [14, 14, 1], [15, 11, 0.5], [15.5, 7, 0.5],
      [16, 12, 0.75], [16.75, 12, 0.25], [17, 15, 0.5], [17.5, 19, 0.5], [18, 19, 0.75], [18.75, 17, 0.25], [19, 15, 0.5], [19.5, 12, 0.5],
      [20, 14, 0.75], [20.75, 14, 0.25], [21, 17, 0.5], [21.5, 22, 0.5], [22, 17, 0.75], [22.75, 14, 0.25], [23, 10, 0.5], [23.5, 14, 0.5],
      [24, 15, 0.75], [24.75, 12, 0.25], [25, 8, 0.5], [25.5, 12, 0.5], [26, 15, 0.75], [26.75, 17, 0.25], [27, 20, 0.5], [27.5, 17, 0.5],
      [28, 18, 1], [29, 14, 0.5], [29.5, 11, 0.5], [30, 7, 2]],
  }, {
    // glamour: a hook that repeats its first two notes and turns, a step higher each time the chord changes
    id: 'ut2-glamour', title: 'Fabulous Ratings (сногсшибательные рейтинги)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false,
    moods: ['game', 'epic'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 12, 0.5], [0.5, 12, 0.5], [1, 10, 0.25], [1.25, 12, 0.25], [1.5, 15, 0.5], [2, 12, 1], [3, 7, 0.5], [3.5, 10, 0.5],
      [4, 12, 0.5], [4.5, 12, 0.5], [5, 10, 0.25], [5.25, 12, 0.25], [5.5, 15, 0.5], [6, 15, 1], [7, 12, 0.5], [7.5, 10, 0.5],
      [8, 10, 0.5], [8.5, 10, 0.5], [9, 7, 0.25], [9.25, 10, 0.25], [9.5, 12, 0.5], [10, 15, 1], [11, 19, 0.5], [11.5, 17, 0.5],
      [12, 17, 1.5], [13.5, 14, 0.5], [14, 10, 1], [15, 12, 0.5], [15.5, 14, 0.5],
      [16, 15, 0.5], [16.5, 15, 0.5], [17, 14, 0.25], [17.25, 15, 0.25], [17.5, 19, 0.5], [18, 19, 1], [19, 15, 0.5], [19.5, 12, 0.5],
      [20, 20, 0.5], [20.5, 20, 0.5], [21, 19, 0.25], [21.25, 20, 0.25], [21.5, 24, 0.5], [22, 20, 1], [23, 17, 0.5], [23.5, 15, 0.5],
      [24, 17, 1], [25, 15, 0.5], [25.5, 12, 0.5], [26, 12, 1], [27, 10, 0.5], [27.5, 8, 0.5],
      [28, 13, 1], [29, 16, 0.5], [29.5, 19, 0.5], [30, 19, 2]],
  }, {
    id: 'ut2-ratings', title: 'Quiz Show (викторина)', key: 'Am', base: 'A3', feel: 'straight', per: 4, modal: false,
    moods: ['game'], chords: ['i', 'i', 'iv', 'iv', 'VI', 'VII', 'i', 'V'],
    notes: [[0, 7, 0.5], [0.5, 10, 0.25], [0.75, 12, 0.75], [1.5, 10, 0.5], [2, 7, 0.5], [2.5, 3, 0.5], [3, 7, 1],
      [4, 12, 0.5], [4.5, 15, 0.25], [4.75, 19, 0.75], [5.5, 15, 0.5], [6, 12, 1], [7, 10, 0.5], [7.5, 7, 0.5],
      [8, 8, 0.5], [8.5, 12, 0.25], [8.75, 17, 0.75], [9.5, 12, 0.5], [10, 8, 0.5], [10.5, 5, 0.5], [11, 8, 1],
      [12, 12, 0.5], [12.5, 17, 0.25], [12.75, 20, 0.75], [13.5, 17, 0.5], [14, 12, 1], [15, 8, 0.5], [15.5, 12, 0.5],
      [16, 15, 1], [17, 12, 0.5], [17.5, 8, 0.5], [18, 12, 1], [19, 15, 0.5], [19.5, 20, 0.5],
      [20, 22, 1], [21, 17, 0.5], [21.5, 14, 0.5], [22, 17, 1], [23, 14, 0.5], [23.5, 10, 0.5],
      [24, 12, 0.5], [24.5, 15, 0.25], [24.75, 19, 0.75], [25.5, 15, 0.5], [26, 19, 1], [27, 24, 1],
      [28, 23, 1], [29, 19, 0.5], [29.5, 16, 0.5], [30, 11, 2]],
  }, {
    // waterfall: long steps through the chords of a major key, each phrase ending a third or a fifth lower
    id: 'ut2-waterfall', title: 'Quiet Water (тихая вода)', key: 'D', base: 'D5', feel: 'straight', per: 4, modal: true,
    moods: ['calm'], chords: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'I'],
    notes: [[0, 4, 1.5], [1.5, 7, 0.5], [2, 12, 2], [4, 11, 1.5], [5.5, 9, 0.5], [6, 7, 2], [8, 9, 1.5], [9.5, 12, 0.5], [10, 16, 2], [12, 12, 1.5], [13.5, 9, 0.5], [14, 5, 2],
      [16, 4, 1], [17, 7, 1], [18, 12, 1.5], [19.5, 14, 0.5], [20, 16, 1.5], [21.5, 14, 0.5], [22, 11, 2], [24, 9, 1], [25, 12, 1], [26, 17, 1.5], [27.5, 16, 0.5], [28, 16, 2], [30, 12, 2]],
  }, {
    id: 'ut2-echoflower', title: 'Echo Flowers (эхо-цветы)', key: 'F', base: 'F5', feel: 'straight', per: 4, modal: true,
    moods: ['calm'], chords: ['IV', 'I', 'IV', 'V', 'vi', 'IV', 'V', 'I'],
    notes: [[0, 9, 2], [2, 12, 1], [3, 9, 1], [4, 7, 2], [6, 4, 2], [8, 5, 1], [9, 9, 1], [10, 12, 1.5], [11.5, 14, 0.5], [12, 14, 2], [14, 11, 2],
      [16, 12, 1.5], [17.5, 9, 0.5], [18, 16, 2], [20, 17, 1], [21, 14, 1], [22, 12, 2], [24, 11, 1], [25, 14, 1], [26, 19, 1.5], [27.5, 16, 0.5], [28, 16, 2], [30, 12, 2]],
  }],
  leads: {
    bonexylo: keysLead('marimbaTone', { color: '#fff3b0', up: 12, also: [12, 0.3], in: 'room', wet: 0.22, gain: 1.3, release: 0.15, life: 2 }),
    musicbox2: keysLead('celestaTone', { color: '#ffd6e0', up: 12, echo: 0.34, in: 'big', wet: 0.34, gain: 2.3, release: 0.8 }),
  },
  counter: { bonexylo: 'squarelead2', musicbox2: 'softlead' },
  chords: {
    // the organ's chords on every off-beat (the «and» of each beat), a doubled stroke when everything plays
    skachords: sectionChords([['organ', 2, 0, 1, { attack: 0.008, release: 0.05, vib: 0, spread: 0.5 }]], {
      color: '#f6bd60', gain: 2.9, in: 'room', gate: 0.5, rhythm: { 1: '--x---x---x---x-', 2: '--x---x---x---x-', 3: '--x-x-x---x-x-x-' },
      formula: ['Sk = \\Rev\\sum_j W^{\\text{орган}}(f_j)\\ \\text{— аккорд на каждую слабую долю, как в ска}'],
    }),
    housepiano: keysComp('grandTone', { color: '#f1e3d3', gain: 0.85, low: 0.7, roll: 0.004, in: 'club', wet: 0.22, release: 0.15 }),
    waterkeys: keysComp('feltTone', { color: '#e6ccb2', gain: 1.9, low: 0.8, roll: 0.06, soft: 0.1, in: 'big', wet: 0.3, release: 0.6 }),
  },
  basses: {
    bonebass: tonedBass('fingerBassTone', { color: '#5aa7ff', gain: 0.7, cut: 0.8, in: 'room', wet: 0.1, release: 0.06 }),
    showbass: tonedBass('fingerBassTone', { color: '#5aa7ff', gain: 1.05, cut: 0.85, in: 'room', wet: 0.08, release: 0.06 }),
  },
  arps: {
    nesarp: tonedArp(SQUARE_PLUCK, { color: '#9fffd0', rate: 4, pattern: [0, 2, 1, 3], up: 12, echo: 0.18, in: 'room', gain: 0.75, roles: ['theme', 'final', 'solo'], from: 3, life: 0.8, release: 0.05, hold: 0.8, accent: 4 }),
    droparp: tonedArp('glassBellTone', { color: '#b8f0ff', rate: 2, pattern: [0, 2, 1, 3, 2, 1], up: 12, echo: 0.4, in: 'big', wet: 0.36, gain: 0.4, roles: ['intro', 'theme', 'themeB', 'bridge', 'break', 'final', 'outro'], from: 0, life: 4, release: 0.6, hold: 1.5, accent: 6 }),
  },
  kits: {
    bones: studioKit({
      color: '#f28482', in: 'room', wet: 0.45, gain: 0.6,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'taikoDrum'],
      pieces: {
        kick: ["kick2({ f: 56, drop: 2.2, decay: 0.18, click: 0.55 })", 36, 0.85, 0, 0.2],
        snare: ["snareDrum({ tone: 220, cutoff: 1600, decay: 15 })", 38, 0.7, 0.05, 0.45],
        hat: ["cymbal2({ kind: 'hat', seed: 341 })", 42, 0.3, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 342 })", 46, 0.24, 0.3, 0.2],
        tom: ["taikoDrum({ pitch: 120, decay: 0.32, bend: 2, crack: 0.3, boom: 0.18, seed: 85 })", 45, 0.5, -0.25, 0.5],
        crash: ["cymbal2({ kind: 'crash', seed: 343 })", 49, 0.4, -0.15, 0.4],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.6], ['crash', 4, 0.4]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x--x--x-x--x--x-')
        steps('snare', 1, fill ? '----x-------x-xx' : '----x-------x---')
        steps('hat', 0.8, 'x-x-x-x-x-x-x-x-')
        if (b % 2) steps('open', 0.8, '--------------x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('tom', 0.9, '--------x-x-----')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.9, '----x-------x---')
        steps('hat', 0.7, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('hat', 0.6, 'x-x-x-x-x-x-x-x-')
        steps('kick', 0.7, 'x-------x-------')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`,
    }),
    glamour: studioKit({
      color: '#f15bb5', in: 'club', wet: 0.45, gain: 0.9,
      imports: ['kick2', 'snareDrum', 'clapDrum', 'cymbal2', 'shakerDrum'],
      pieces: {
        kick: ["kick2({ f: 52, drop: 2.5, decay: 0.22, click: 0.5 })", 36, 0.9, 0, 0.15],
        snare: ["snareDrum({ tone: 210, cutoff: 1700, decay: 16 })", 38, 0.5, 0.05, 0.45],
        clap: ["clapDrum({ center: 1300 })", 39, 0.75, -0.05, 0.7],
        hat: ["cymbal2({ kind: 'hat', seed: 351 })", 42, 0.26, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 352 })", 46, 0.3, 0.3, 0.2],
        shaker: ["shakerDrum()", 70, 0.2, -0.35, 0.15],
        crash: ["cymbal2({ kind: 'crash', seed: 353 })", 49, 0.4, -0.15, 0.4],
      },
      graph: [['kick', 3.6, 0.6], ['clap', 3.2, 0.6], ['crash', 4, 0.4]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x---x---x---x---')
        steps('clap', 1, '----x-------x---')
        steps('open', 0.9, '--x---x---x---x-')
        steps('hat', 0.6, 'x---x---x---x---')
        steps('shaker', 0.7, 'xoxoxoxoxoxoxoxo')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('snare', 0.9, '----------x-xxxx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x---x---x---x---')
        steps('clap', 0.8, '----x-------x---')
        steps('hat', 0.7, '--x---x---x---x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('kick', 0.7, 'x-------x-------')
        steps('shaker', 0.6, 'x-x-x-x-x-x-x-x-')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`,
    }),
    quietwater: studioKit({
      color: '#90e0ef', in: 'big', wet: 0.6, gain: 0.7,
      imports: ['kick2', 'rimDrum', 'shakerDrum'],
      pieces: {
        kick: ["kick2({ f: 44, drop: 1.8, decay: 0.3, click: 0.12 })", 36, 0.7, 0, 0.3],
        rim: ["rimDrum()", 37, 0.3, 0.2, 0.8],
        shaker: ["shakerDrum()", 70, 0.16, -0.3, 0.4],
      },
      graph: [['kick', 3.4, 0.5], ['rim', 2.8, 0.4]],
      body: `      if (e >= 2) {
        steps('kick', 0.9, 'x---------x-----')
        steps('rim', 0.8, '--------x-------')
        steps('shaker', 0.7, 'x-o-x-o-x-o-x-o-')
      } else if (e === 1) {
        steps('shaker', 0.5, 'x---x---x---x---')
        if (b % 2 === 0) steps('kick', 0.6, 'x---------------')
      }`,
    }),
  },
  textures: {
    cavewater: ambience({ color: '#48cae4', in: 'big', wet: 0.4, drone: 0.06, wind: 0.07, windF: [300, 1400], ping: { every: 6, f: 2093, level: 0.018 }, swell: 0.15 }),
  },
})
