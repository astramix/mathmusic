// Джаз 2, Лоу-фай хип-хоп 2, Космос 2, Романтический оркестр 2, Аниме J-pop 2 — a part of the generator
// (src/generate.js; the map of its parts is at the top of that file).
// · Джаз 2: a quartet in a small room. Eight bars of the trio alone before the horn comes in; a tenor (a scoop into the note,
//   breath, a late vibrato) or a trumpet, a real piano's comping, a plucked double bass that walks, a ride cymbal that
//   says ding ding-a-ding with the hi-hat on two and four; two solos — the piano's and then the horn's, each its own
//   improvisation —, trading fours with the drums; six heads to draw from instead of three;
// · Лоу-фай 2: the first one's drums were out of step — its ghost sixteenths stood straight against swung eighths. Here
//   the eighths are straight and every second sixteenth is late (58 %), the snare leans back a hair, the kit is soft and
//   dusty, the piano is felt, the bass a round sub;
// · Космос 2: slow and far — long notes a fifth or an octave apart (themes of its own: the first one bent other styles'
//   tunes), glass and choir pads in a nine-second hall, bells that answer themselves, a sub, a pulse like a heart, no solo;
// · Романтический оркестр 2: first violins on the theme, a solo cello or a woodwind answering, strings holding the
//   harmony or a piano's rolled chords, horns and clarinets under them, a harp, low strings, a soft drum and cymbals where
//   the music rises;
// · Аниме J-pop 2: a band — a singing lead, a piano driving in eighths, strings with a counter-line, an active fingered
//   bass, a kit with a fill and a crash at every phrase; verse – pre-chorus – chorus on the royal road IV – V – iii – vi,
//   the last chorus a semitone up.
import { defineStyle } from './define.js'
import { ambience, keysComp, keysLead, sectionPad, soloLead, studioKit, subBass, tonedArp, tonedBass } from './studio.js'
import { ROLL } from './stage.js'

// ---- Джаз 2 ----
defineStyle('jazz2', {
  family: 'night', after: 'jazz',
  names: [['blue', 'midnight', 'smoky', 'late', 'velvet', 'uptown', 'quiet', 'amber'], ['corner', 'train', 'avenue', 'session', 'lounge', 'walk', 'changes', 'lamplight']],
  borrow: ['jazz-corner', 'jazz-rhythm', 'jazz-night'],
  style: {
    label: 'Джаз 2', emoji: '🎷', theme: 'jazz', of: 'jazz', ver: 2, bpm: [104, 152], swing: 0.66, stage: true, soloTurns: true,
    about: 'версия 2 — квартет в маленькой комнате: восемь тактов трио до вступления духового; тенор (подъезд к ноте, дыхание, позднее вибрато) или труба, настоящий рояль, щипковый контрабас шагом, райд «динь динь-а-динь» и хай-хэт на вторую и четвёртую; два разных соло — рояля и духового, — обмен четвёрками с барабанами; шесть тем',
    gains: { lead: 1, lead2: 0.9, counter: 0.8, chords: 1, bass: 0.6 },
    themes: { 'jazz2-lamplight': 5, 'jazz2-sidewalk': 5, 'jazz2-rainwindow': 5, 'jazz-corner': 4, 'jazz-rhythm': 4, 'jazz-night': 4 },
    keys: ['F', 'Bb', 'Eb', 'C', 'G', 'Ab'], moods: ['jazzy', 'night'],
    voicing: 'jazz', chordRange: [52, 72], bassRange: [28, 43],
    lead: ['sax2', 'trumpet2', 'sax2'], lead2: ['grand', 'vibes2'], counter: 'trumpet2', chords: ['jazzkeys'], bass: ['pizz2'], pad: [null], arp: [null], texture: ['club'], kit: 'jazz2',
    forms: [
      [['the trio', 8, 'intro', 1], ['head', 16, 'theme', 2], ['bridge', 8, 'themeB', 2], ['piano solo', 16, 'solo', 2], ['horn solo', 16, 'solo', 2], ['trading fours', 16, 'trade', 3], ['head out', 16, 'final', 3], ['tag', 4, 'outro', 1]],
      [['the trio', 8, 'intro', 1], ['head', 16, 'theme', 2], ['piano solo', 16, 'solo', 2], ['bridge', 8, 'themeB', 1], ['horn solo', 16, 'solo', 2], ['head out', 16, 'final', 2], ['tag', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.5]], 1: [[0, 0.5, 1.3], [1.66, 0.45, 0.8]], 2: [[0, 0.55, 1.3], [1.66, 0.5, 0.8], [3.66, 0.45, 0.3]], 3: [[0, 0.6, 0.6], [1.66, 0.55, 0.8], [2.66, 0.5, 0.3], [3.66, 0.5, 0.3]] },
    bassline: 'walking', arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    id: 'jazz2-lamplight', title: 'Lamplight (свет фонаря)', key: 'C', base: 'C4', feel: 'swing', per: 4, modal: false,
    moods: ['jazzy', 'night', 'calm'], chords: ['Imaj7', 'vi7', 'ii7', 'V7', 'iii7', 'VI7', 'ii7', 'V7'],
    notes: [[0, 7, 1.5], [1.5, 9, 0.5], [2, 11, 1], [3, 7, 1], [4, 12, 2], [6, 9, 1], [7, 7, 0.5], [7.5, 4, 0.5], [8, 5, 1.5], [9.5, 7, 0.5], [10, 9, 1], [11, 12, 1], [12, 11, 2], [14, 7, 1], [15, 5, 0.5], [15.5, 2, 0.5],
      [16, 4, 1.5], [17.5, 7, 0.5], [18, 11, 1], [19, 14, 1], [20, 13, 2], [22, 9, 1], [23, 7, 0.5], [23.5, 4, 0.5], [24, 5, 1], [25, 9, 0.5], [25.5, 12, 0.5], [26, 14, 1.5], [27.5, 12, 0.5], [28, 11, 1], [29, 9, 0.5], [29.5, 7, 0.5], [30, 5, 2]],
  }, {
    id: 'jazz2-sidewalk', title: 'Sidewalk Blues (блюз на тротуаре)', key: 'C', base: 'C4', feel: 'swing', per: 4, modal: false,
    moods: ['jazzy', 'night'], chords: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'V7'],
    notes: [[0, 4, 0.5], [0.5, 7, 0.5], [1, 10, 1], [2, 7, 1], [3, 4, 0.5], [3.5, 3, 0.5], [4, 5, 1.5], [5.5, 3, 0.5], [6, 0, 2], [8, 4, 0.5], [8.5, 7, 0.5], [9, 10, 1], [10, 12, 1], [11, 10, 0.5], [11.5, 7, 0.5], [12, 4, 3], [15, 7, 1],
      [16, 9, 0.5], [16.5, 12, 0.5], [17, 15, 1], [18, 12, 1], [19, 9, 0.5], [19.5, 8, 0.5], [20, 9, 1.5], [21.5, 5, 0.5], [22, 3, 2], [24, 4, 0.5], [24.5, 7, 0.5], [25, 10, 0.5], [25.5, 12, 0.5], [26, 16, 1.5], [27.5, 12, 0.5], [28, 11, 1], [29, 7, 1], [30, 2, 2]],
  }, {
    id: 'jazz2-rainwindow', title: 'Rain on the Window (дождь по стеклу)', key: 'C', base: 'C4', feel: 'swing', per: 4, modal: false,
    moods: ['jazzy', 'calm', 'night'], chords: ['IVmaj7', 'iv7', 'iii7', 'VI7', 'ii7', 'V7', 'Imaj7', 'Imaj7'],
    notes: [[0, 9, 2], [2, 12, 1], [3, 16, 1], [4, 15, 2], [6, 12, 1], [7, 8, 1], [8, 7, 1.5], [9.5, 11, 0.5], [10, 14, 2], [12, 13, 2], [14, 9, 1], [15, 7, 1],
      [16, 5, 1], [17, 9, 1], [18, 12, 1.5], [19.5, 14, 0.5], [20, 14, 1], [21, 11, 1], [22, 7, 1.5], [23.5, 5, 0.5], [24, 4, 2], [26, 7, 1], [27, 11, 1], [28, 12, 4]],
  }],
  leads: {
    vibes2: keysLead('vibesTone', { color: '#b8f0ff', gain: 0.55, in: 'club', wet: 0.26, release: 0.5, life: 5, width: 0.4 }),
  },
  counter: { vibes2: 'sax2' },
  chords: {
    jazzkeys: keysComp('grandTone', { color: '#f1e3d3', gain: 0.9, roll: 0.012, in: 'club', wet: 0.22, release: 0.18, soft: 0.08 }),
  },
  kits: {
    jazz2: studioKit({
      color: '#e9c46a', in: 'club', wet: 0.4, gain: 1.8,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'taikoDrum'],
      pieces: {
        ride: ["cymbal2({ kind: 'ride', seed: 411 })", 51, 0.34, 0.3, 0.25],
        hat: ["cymbal2({ kind: 'hat', tune: 0.9, seed: 412 })", 44, 0.26, -0.3, 0.15],
        kick: ["kick2({ f: 58, drop: 1.6, decay: 0.2, click: 0.15, body: 0.2 })", 36, 0.45, 0, 0.3],
        snare: ["snareDrum({ tone: 200, cutoff: 1100, decay: 14 })", 38, 0.45, 0.1, 0.4],
        tom: ["taikoDrum({ pitch: 130, decay: 0.3, bend: 1.5, crack: 0.3, boom: 0.12, seed: 121 })", 45, 0.45, -0.2, 0.4],
        crash: ["cymbal2({ kind: 'crash', tune: 1.05, seed: 413 })", 49, 0.3, -0.2, 0.4],
      },
      graph: [['ride', 3.8, 0.4], ['snare', 3.2, 0.5], ['kick', 2.8, 0.4]],
      body: `      const SWG = 0.66, solo = r === 'trade' && mod(floor(t / 16), 2) === 1
      if (solo) {
        // the drums' four bars: triplets round the kit, the hash says where; a crash to hand it back
        for (let i = 0; i < 12; i++) {
          const h = hash(b * 12 + i, 91), p = i / 3
          if (h < 0.5) add('snare', 0.6 + 0.4 * (i % 3 === 0), p)
          else if (h < 0.75) add('tom', 0.8, p)
          else if (h < 0.88) add('kick', 1.6, p)
        }
        add('hat', 0.9, 1, 3)
        if (mod(t, 16) === 12) add('crash', 0.9, 3.66)
      } else if (e >= 1) {
        // ding, ding-a-ding: the ride on every beat and on the swung «and» of two and four; the hat closes on two and four
        add('ride', 0.9, 0, 2)
        add('ride', 0.7, 1, 3)
        add('ride', 0.55, 1 + SWG, 3 + SWG)
        add('hat', 0.8, 1, 3)
        // the kick only feathered; the snare comments where the hash says, softly
        add('kick', e >= 3 ? 0.7 : 0.45, 0, 1, 2, 3)
        if (e >= 2) for (let q = 0; q < 4; q++) if (hash(b * 4 + q, 97) < (e >= 3 ? 0.4 : 0.25)) add('snare', 0.35 + 0.3 * hash(b * 4 + q, 99), q + SWG)
        if (e >= 3 && fill) { add('snare', 0.8, 2 + SWG, 3, 3 + SWG); add('kick', 1.6, 3 + SWG) }
        if (r === 'final' && t === 0) add('crash', 0.8, 0)
      }`,
      formula: ['D = 0.34\\,\\text{Ride}_{1,\\,2,\\,2\\tfrac23,\\,3,\\,4,\\,4\\tfrac23} + 0.26H_{2,4} + 0.45K + 0.45S + \\Rev[\\ldots]\\ \\text{— «динь динь-а-динь», бочка едва слышна, малый отвечает солисту}'],
    }),
  },
})

// ---- Лоу-фай хип-хоп 2 ----
defineStyle('lofi2', {
  family: 'night', after: 'lofi',
  names: [['rainy', 'sleepy', 'velvet', 'amber', 'midnight', 'cozy', 'foggy', 'quiet'], ['cat', 'window', 'tram', 'tea', 'vinyl', 'balcony', 'letter', 'kettle']],
  style: {
    label: 'Лоу-фай хип-хоп 2', emoji: '☕', theme: 'lofi', of: 'lofi', ver: 2, bpm: [70, 88], swing: 0.5, stage: true,
    about: 'версия 2 — ударные в одном шаге со всеми: восьмые ровные, каждая вторая шестнадцатая опаздывает (58 %), малый чуть оттянут; мягкая «пыльная» установка, войлочное пианино, круглый саб, вибрафон или флейта',
    gains: { lead: 1.3, lead2: 0.5, counter: 0.8, chords: 1, pad: 0.6, bass: 1 },
    themes: { 'lofi2-window': 5, 'lofi2-kettle': 5, 'lofi-flute': 4, 'lofi-flute-2': 4 },
    keys: ['F', 'Eb', 'Ab', 'D', 'Bb', 'G', 'C'], moods: ['calm', 'jazzy', 'warm', 'night'],
    voicing: 'jazz', chordRange: [52, 72], bassRange: [28, 43],
    lead: ['felt', 'flute2', 'felt'], lead2: ['vibes2', 'glassbell'], counter: 'flute2', chords: ['lofikeys'], bass: ['lofisub'], pad: ['warmpad', null], arp: [null], texture: ['rain', 'vinyl'], kit: 'lofi2',
    forms: [
      [['intro', 4, 'intro', 0], ['theme', 8, 'theme', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['break', 4, 'break', 0], ['final', 8, 'final', 3], ['outro', 4, 'outro', 0]],
      [['rain', 4, 'intro', 0], ['beat', 8, 'theme', 2], ['solo', 8, 'solo', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['final', 8, 'final', 3], ['sleep', 6, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3.8]], 1: [[0, 0.55, 2.4], [2.5, 0.45, 1.4]], 2: [[0, 0.6, 1.5], [1.5, 0.45, 0.9], [2.5, 0.5, 1.4]], 3: [[0, 0.65, 1.5], [1.5, 0.5, 0.9], [2.5, 0.5, 0.9], [3.5, 0.45, 0.4]] },
    bassline: [[0, 'R', 1.4], [1.5, 'R', 0.4], [2.5, '5', 0.9], [3.5, 'A', 0.4]], arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    id: 'lofi2-window', title: 'Window Seat (место у окна)', key: 'C', base: 'C4', feel: 'straight', per: 4, modal: true,
    moods: ['calm', 'warm', 'night'], chords: ['IVmaj7', 'iii7', 'ii7', 'Imaj7', 'IVmaj7', 'iii7', 'ii7', 'V7'],
    notes: [[0, 9, 1.5], [1.5, 7, 0.5], [2, 4, 2], [4, 7, 1.5], [5.5, 4, 0.5], [6, 2, 2], [8, 5, 1], [9, 9, 0.5], [9.5, 12, 0.5], [10, 9, 2], [12, 7, 3], [15, 4, 1],
      [16, 12, 1.5], [17.5, 9, 0.5], [18, 16, 2], [20, 14, 1.5], [21.5, 11, 0.5], [22, 7, 2], [24, 9, 1], [25, 12, 1], [26, 14, 1.5], [27.5, 12, 0.5], [28, 11, 2], [30, 7, 2]],
  }, {
    id: 'lofi2-kettle', title: 'Kettle On (чайник на плите)', key: 'C', base: 'C4', feel: 'straight', per: 4, modal: true,
    moods: ['calm', 'warm'], chords: ['Imaj7', 'Imaj7', 'vi7', 'vi7', 'ii7', 'V7', 'Imaj7', 'V7'],
    notes: [[0, 4, 1], [1, 7, 1], [2, 11, 1.5], [3.5, 9, 0.5], [4, 7, 3], [7, 4, 1], [8, 12, 1], [9, 9, 1], [10, 7, 1.5], [11.5, 4, 0.5], [12, 9, 3], [15, 7, 1],
      [16, 5, 1], [17, 9, 1], [18, 12, 2], [20, 11, 1], [21, 14, 1], [22, 7, 2], [24, 4, 1.5], [25.5, 7, 0.5], [26, 11, 2], [28, 5, 2], [30, 2, 2]],
  }],
  chords: {
    lofikeys: keysComp('feltTone', { color: '#e6ccb2', gain: 1.5, low: 0.8, roll: 0.025, soft: 0.1, in: 'room', wet: 0.22, release: 0.4 }),
  },
  basses: {
    lofisub: subBass({ color: '#6d597a', gain: 0.5, drive: 1.3, cut: 0.85 }),
  },
  kits: {
    lofi2: studioKit({
      color: '#b08968', in: 'room', wet: 0.3, gain: 0.9,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'rimDrum', 'shakerDrum'],
      pieces: {
        kick: ["kick2({ f: 50, drop: 1.9, decay: 0.22, click: 0.2, body: 0.25 })", 36, 0.9, 0, 0.15],
        snare: ["snareDrum({ tone: 185, cutoff: 900, decay: 13 })", 38, 0.55, 0.05, 0.4],
        rim: ["rimDrum()", 37, 0.28, -0.25, 0.4],
        hat: ["cymbal2({ kind: 'hat', tune: 0.85, seed: 421 })", 42, 0.16, 0.3, 0.1],
        shaker: ["shakerDrum()", 70, 0.1, -0.35, 0.15],
      },
      graph: [['kick', 3.5, 0.5], ['snare', 3.1, 0.5], ['hat', 2.6, 0.25]],
      body: `      // the grid: straight eighths; the second sixteenth of each eighth 58 % of the way (not 50); the snare 0.03 beat late
      const g = i => floor(i / 2) / 2 + (i % 2 ? 0.29 : 0), LATE = 0.03
      if (e >= 2) {
        add('kick', 1, g(0), g(7), g(10))
        if (e >= 3 && b % 2) add('kick', 0.8, g(15))
        add('snare', 1, g(4) + LATE, g(12) + LATE)
        for (let i = 0; i < 16; i += 2) add('hat', i % 4 ? 0.6 : 0.9, g(i))
        // ghost notes on the late sixteenths, where the hash says
        for (let i = 1; i < 16; i += 2) if (hash(b * 16 + i, 53) < 0.3) add(hash(b * 16 + i, 57) < 0.5 ? 'hat' : 'rim', 0.4, g(i))
        if (e >= 3) for (let i = 0; i < 16; i += 2) add('shaker', 0.6, g(i))
        if (fill) add('snare', 0.5, g(14) + LATE, g(15))
      } else if (e === 1) {
        add('kick', 0.8, g(0), g(10))
        add('rim', 0.8, g(4) + LATE, g(12) + LATE)
        for (let i = 0; i < 16; i += 4) add('hat', 0.6, g(i))
      }`,
      formula: ['D = 0.9K + 0.55S(\\tau - 0.03) + 0.16H + 0.28\\,\\text{Rim},\\quad x_i = \\tfrac12\\lfloor i/2\\rfloor + 0.29\\,[i \\text{ нечёт}]\\ \\text{— каждая вторая шестнадцатая на 0.58 восьмой, малый чуть позже}'],
    }),
  },
})

// ---- Космос 2 ----
defineStyle('space2', {
  family: 'cosmos', after: 'space',
  names: [['silent', 'deep', 'cold', 'distant', 'dark', 'lunar', 'slow'], ['orbit', 'nebula', 'comet', 'void', 'station', 'signal', 'drift']],
  style: {
    label: 'Космос, эмбиент 2', emoji: '🌌', theme: 'void', of: 'space', ver: 2, bpm: [60, 84], swing: 0.5, stage: true,
    about: 'версия 2 — медленно и далеко: долгие ноты через квинту и октаву (свои темы), стеклянные и хоровые пэды в зале с затуханием 9 секунд, колокола, отвечающие сами себе, саб, пульс как сердце; без соло',
    gains: { lead: 1, lead2: 1.3, counter: 0.8, chords: 1, pad: 1, arp: 1, bass: 0.9 },
    themes: { 'space2-orbit': 5, 'space2-drift': 5, 'space2-signal': 5 },
    keys: ['Dm', 'Em', 'Am', 'Cm', 'F#m', 'D', 'F', 'C'], modes: [null, 'dorian', null, 'lydian'], moods: ['space', 'dark', 'calm'],
    voicing: 'open', chordRange: [48, 72], bassRange: [26, 38],
    lead: ['softlead', 'voice2', 'glassbell'], lead2: ['glassbell', 'softpluck'], counter: 'softlead', chords: ['glassswell'], bass: ['sub2'], pad: ['starpad', 'starchoir'], arp: ['glassarp', 'starseq'], texture: ['cosmos'], kit: 'space2',
    forms: [
      [['launch', 4, 'intro', 0], ['orbit', 8, 'theme', 1], ['nebula', 8, 'themeB', 2], ['dark side', 8, 'bridge', 1], ['drift', 4, 'break', 0], ['eclipse', 8, 'final', 3, { canon: true }], ['silence', 6, 'outro', 0]],
      [['launch', 4, 'intro', 0], ['nebula', 8, 'themeB', 1], ['orbit', 8, 'theme', 2], ['drift', 4, 'break', 0], ['dark side', 8, 'bridge', 1], ['eclipse', 8, 'final', 3, { keyUp: 2 }], ['silence', 6, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.8]], arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    id: 'space2-orbit', title: 'Slow Orbit (медленная орбита)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: true,
    moods: ['space', 'calm'], chords: ['i', 'VII', 'VI', 'VII', 'i', 'III', 'VI', 'i'],
    notes: [[0, 7, 4], [4, 5, 2], [6, 10, 2], [8, 8, 3], [11, 7, 1], [12, 5, 4], [16, 12, 2], [18, 7, 2], [20, 10, 3], [23, 7, 1], [24, 8, 2], [26, 3, 2], [28, 0, 4]],
  }, {
    id: 'space2-drift', title: 'Weightless (невесомость)', key: 'D', base: 'D4', feel: 'straight', per: 4, modal: true,
    moods: ['space', 'calm'], chords: ['I', 'V', 'IV', 'I', 'vi', 'IV', 'I', 'V'],
    notes: [[0, 4, 3], [3, 7, 1], [4, 11, 2], [6, 7, 2], [8, 9, 3], [11, 7, 1], [12, 4, 4], [16, 9, 2], [18, 12, 2], [20, 12, 3], [23, 9, 1], [24, 7, 2], [26, 16, 2], [28, 14, 4]],
  }, {
    id: 'space2-signal', title: 'Distant Signal (далёкий сигнал)', key: 'Am', base: 'A3', feel: 'straight', per: 4, modal: true,
    moods: ['space', 'dark'], chords: ['i', 'i', 'VI', 'VI', 'III', 'III', 'VII', 'i'],
    notes: [[0, 0, 2], [2, 7, 2], [4, 12, 3], [7, 10, 1], [8, 8, 2], [10, 12, 2], [12, 15, 4], [16, 10, 2], [18, 7, 2], [20, 3, 3], [23, 7, 1], [24, 5, 2], [26, 10, 2], [28, 7, 4]],
  }],
  pads: {
    starpad: sectionPad([['glass', 4, 0, 0.9], ['warm', 4, -12, 0.55]], { color: '#caf0f8', always: true, ens: 0.4, in: 'space', wet: 0.45, gain: 1.2 }),
    starchoir: sectionPad([['ooh', 5, 0, 1, { centre: -0.15 }], ['mm', 4, -12, 0.5, { centre: 0.25 }]], { color: '#d0bfff', always: true, in: 'space', wet: 0.45, gain: 1.3 }),
  },
  arps: {
    starseq: tonedArp('softPluckTone', { color: '#7ff5d0', rate: 2, pattern: [0, 2, 1, 3, 2, 1, 3, 2], up: 12, echo: 0.4, in: 'space', wet: 0.42, gain: 0.3, roles: ['theme', 'themeB', 'bridge', 'final'], from: 1, life: 3, release: 0.4, hold: 0.9, accent: 8 }),
  },
  kits: {
    space2: studioKit({
      color: '#577590', in: 'space', wet: 0.6, gain: 0.7,
      imports: ['kick2', 'cymbal2', 'rimDrum'],
      pieces: {
        pulse: ["kick2({ f: 40, drop: 1.6, decay: 0.4, click: 0.05, body: 0.2 })", 35, 0.8, 0, 0.4],
        dust: ["cymbal2({ kind: 'hat', tune: 1.25, seed: 431 })", 42, 0.08, 0.4, 0.6],
        tick: ["rimDrum()", 37, 0.14, -0.4, 0.9],
      },
      graph: [['pulse', 3.4, 0.5], ['tick', 2.8, 0.3]],
      body: `      if (e >= 3) {
        steps('pulse', 1, 'x-x-------------')
        steps('tick', 0.8, '--------x-------')
        for (let i = 0; i < 16; i++) if (hash(b * 16 + i, 61) < 0.3) add('dust', 0.5 + 0.5 * hash(i, b), i / 4)
      } else if (e === 2) {
        steps('pulse', 0.9, 'x-x-------------')
        for (let i = 0; i < 16; i++) if (hash(b * 16 + i, 61) < 0.15) add('dust', 0.6, i / 4)
      } else if (e === 1 && b % 2 === 0) steps('pulse', 0.7, 'x---------------')`,
      formula: ['D = \\text{пульс}_{40\\text{ Гц}}(\\text{два удара, как сердце}) + \\text{звёздная пыль там, где скажет хэш} + \\Rev_{9\\text{с}}[\\ldots]'],
    }),
  },
  textures: {
    cosmos: ambience({ color: '#4d6d8d', drone: 0.08, wind: 0.07, windF: [500, 3000], ping: { every: 12, f: 1760, level: 0.02 }, swell: 0.25 }),
  },
})

// ---- Романтический оркестр 2 ----
defineStyle('romantic2', {
  family: 'hall', after: 'romantic',
  names: [['autumn', 'white', 'northern', 'moonlit', 'tender', 'stormy', 'distant', 'last'], ['romance', 'nocturne', 'ballade', 'elegy', 'serenade', 'rhapsody', 'waltz', 'adagio']],
  borrow: ['romance-tchaikovsky', 'nocturne-chopin'],
  style: {
    label: 'Романтический оркестр 2', emoji: '🎼', theme: 'romantic', of: 'romantic', ver: 2, bpm: [60, 88], swing: 0.5, stage: true,
    about: 'версия 2 — первые скрипки на теме, им отвечает соло виолончели или деревянные духовые; струнные держат гармонию или рояль берёт аккорды арпеджиато, под ними валторны и кларнеты, арфа, низкие струнные; большой барабан и тарелки там, где музыка поднимается',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, chords: 0.8, pad: 0.9, arp: 1, bass: 1 },
    themes: { 'romance-tchaikovsky': 5, 'nocturne-chopin': 5, 'dvorak-largo': 4, 'grieg-mountain': 3, 'beethoven-joy': 1.5, 'mozart-40': 1.5, 'beethoven-fate': 1.5, 'canon-halves': 1 },
    keys: ['Bm', 'Eb', 'Db', 'Gm', 'Em', 'F', 'Ab', 'Cm', 'D', 'Fm'], moods: ['classical', 'warm', 'dark', 'epic'],
    voicing: 'open', chordRange: [50, 74], bassRange: [28, 43],
    lead: ['violinsline', 'cello2', 'oboe2', 'clarinet2', 'violinsline'], lead2: ['cello2', 'flute2', 'clarinet2', 'horn2'], counter: 'cello2', chords: ['stringchords', 'nocturne2'], bass: ['bowed2', 'pizz2'], pad: ['windpad', null], arp: ['harp2'], texture: [null], kit: 'orch2',
    forms: [
      [['introduction', 4, 'intro', 0], ['theme', 8, 'theme', 1], ['theme II', 8, 'themeB', 2], ['development', 8, 'bridge', 2], ['cadenza', 8, 'solo', 1], ['finale', 8, 'final', 3, { canon: true }], ['coda', 6, 'outro', 0]],
      [['introduction', 4, 'intro', 0], ['theme II', 8, 'themeB', 1], ['theme', 8, 'theme', 2], ['storm', 8, 'bridge', 3], ['nocturne', 8, 'solo', 1], ['finale', 8, 'final', 3, { keyUp: 1 }], ['coda', 6, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 1.9], [2, 0.45, 1.9]], 2: [[0, 0.55, 0.9], [1, 0.45, 0.9], [2, 0.5, 0.9], [3, 0.45, 0.9]], 3: [[0, 0.65, 0.9], [1, 0.5, 0.9], [2, 0.6, 0.9], [3, 0.5, 0.9]] },
    bassline: [[0, 'R', 1.9], [2, '5', 1.9]], arpStep: 0.5, arpPoly: false,
  },
  chords: {
    // the piano's chords rolled from the bottom, a tenth of a second from note to note — a nocturne's left hand
    nocturne2: keysComp('grandTone', { color: '#f1e3d3', gain: 1.1, low: 0.9, roll: 0.09, in: 'hall', wet: 0.3, release: 0.5, soft: 0.06 }),
  },
  pads: {
    windpad: sectionPad([['horns', 3, -12, 0.7, { centre: -0.2, spread: 0.4 }], ['clarinet', 2, 0, 0.35, { centre: 0.15, spread: 0.3 }], ['flute', 2, 12, 0.22, { centre: 0.3, spread: 0.3 }]], { color: '#f4a261', in: 'hall', gain: 1.1 }),
  },
  kits: {
    orch2: studioKit({
      color: '#bc6c25', in: 'big', wet: 0.7, gain: 0.8,
      imports: ['kick2', 'cymbal2'],
      pieces: {
        cassa: ["kick2({ f: 40, drop: 1.5, decay: 0.55, click: 0.05, body: 0.2 })", 35, 0.8, 0, 0.6],
        piatti: ["cymbal2({ kind: 'crash', tune: 0.85, seed: 441 })", 49, 0.3, 0.1, 0.7],
        triangle: ["cymbal2({ kind: 'splash', tune: 1.6, seed: 443 })", 81, 0.08, 0.4, 0.6],
      },
      graph: [['cassa', 3.5, 0.5], ['piatti', 4, 0.4]],
      body: `      if (e >= 3) {
        if (mod(t, 8) === 0) add('cassa', 1, 0)
        if (t === 0) add('piatti', 1, 0)
        if (fill) add('cassa', 0.6, 2, 3)
      } else if (e === 2) {
        if (mod(t, 16) === 0) add('cassa', 0.7, 0)
        if (b % 2) add('triangle', 0.8, 2)
      }`,
      formula: ['D = \\text{большой барабан в начале каждой второй фразы} + \\text{тарелки в начале кульминации} + \\text{треугольник}\\ \\text{— в большом зале}'],
    }),
  },
})

// ---- Аниме J-pop 2 ----
defineStyle('kawaii2', {
  family: 'radio', after: 'kawaii',
  names: [['kira', 'sakura', 'sparkle', 'starry', 'summer', 'first', 'hikari'], ['heart', 'dream', 'sky', 'parade', 'wish', 'melody', 'season']],
  style: {
    label: 'Аниме J-pop 2', emoji: '🌸', theme: 'kawaii', of: 'kawaii', ver: 2, bpm: [148, 176], swing: 0.5, stage: true,
    about: 'версия 2 — группа, как в опенинге: поющий лид, рояль восьмыми, струнные с контрмелодией, подвижный пальцевый бас, барабаны со сбивкой и тарелкой в каждую фразу; куплет — предприпев — припев на «королевской дороге» IV – V – iii – vi, последний припев на полтона выше',
    gains: { lead: 1, lead2: 0.55, counter: 0.9, chords: 1, pad: 0.9, arp: 1, bass: 1 },
    themes: { 'jpop2-sabi': 5, 'jpop2-amelo': 5, 'kawaii-hook': 3 },
    keys: ['A', 'E', 'D', 'G', 'C', 'F', 'Bb'], moods: ['bright', 'pop', 'sunny', 'cute'],
    voicing: 'close', chordRange: [55, 79], bassRange: [33, 50],
    lead: ['jvocal', 'sawlead2'], lead2: ['grand', 'violinsline', 'glassbell'], counter: 'violinsline', chords: ['popkeys'], bass: ['popbass'], pad: ['stringpad'], arp: ['softarp', 'glassarp'], texture: [null], kit: 'jpop2',
    forms: [
      [['intro', 4, 'intro', 2], ['A-melo', 8, 'themeB', 1], ['B-melo', 4, 'build', 2], ['sabi', 16, 'theme', 3], ['interlude', 8, 'bridge', 2], ['solo', 8, 'solo', 2], ['B-melo II', 4, 'build', 2], ['last sabi', 16, 'final', 3, { keyUp: 1 }], ['outro', 4, 'outro', 1]],
      [['intro', 4, 'intro', 2], ['sabi', 8, 'theme', 3], ['A-melo', 8, 'themeB', 1], ['B-melo', 4, 'build', 2], ['sabi II', 8, 'theme', 3], ['interlude', 8, 'bridge', 1], ['last sabi', 16, 'final', 3, { keyUp: 1 }], ['outro', 4, 'outro', 1]],
    ],
    drums: {},
    comp: {
      0: [[0, 0.5, 3.5]], 1: [[0, 0.6, 1.9], [2, 0.5, 1.9]],
      2: [[0, 0.65, 0.9], [1, 0.5, 0.4], [1.5, 0.55, 0.9], [2.5, 0.5, 0.4], [3, 0.55, 0.9]],
      3: [[0, 0.7, 0.45], [0.5, 0.5, 0.45], [1, 0.6, 0.45], [1.5, 0.6, 0.45], [2, 0.65, 0.45], [2.5, 0.5, 0.45], [3, 0.6, 0.45], [3.5, 0.6, 0.45]],
    },
    bassline: [[0, 'R', 0.5], [0.5, 'R', 0.5], [1, '8', 0.5], [1.5, 'R', 0.5], [2, 'R', 0.5], [2.5, '5', 0.5], [3, '8', 0.5], [3.5, 'A', 0.5]],
    arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    // the chorus: pushed eighths (a note held across the half bar), the royal road IV – V – iii – vi, home at the end
    id: 'jpop2-sabi', title: 'Hikari no Melody (мелодия света)', key: 'C', base: 'C4', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'pop'], chords: ['IV', 'V', 'iii', 'vi', 'IV', 'V', 'I', 'I'],
    notes: [[0, 9, 0.5], [0.5, 9, 0.5], [1, 12, 0.5], [1.5, 14, 1], [2.5, 12, 0.5], [3, 9, 0.5], [3.5, 11, 0.5],
      [4, 11, 1], [5, 14, 0.5], [5.5, 16, 1], [6.5, 14, 0.5], [7, 11, 0.5], [7.5, 7, 0.5],
      [8, 7, 0.5], [8.5, 7, 0.5], [9, 11, 0.5], [9.5, 12, 1], [10.5, 11, 0.5], [11, 7, 0.5], [11.5, 9, 0.5],
      [12, 9, 1.5], [13.5, 12, 0.5], [14, 16, 1.5], [15.5, 14, 0.5],
      [16, 12, 0.5], [16.5, 12, 0.5], [17, 14, 0.5], [17.5, 17, 1], [18.5, 16, 0.5], [19, 14, 0.5], [19.5, 12, 0.5],
      [20, 14, 1], [21, 11, 0.5], [21.5, 14, 1], [22.5, 19, 0.5], [23, 17, 0.5], [23.5, 14, 0.5],
      [24, 16, 1.5], [25.5, 12, 0.5], [26, 7, 1], [27, 12, 0.5], [27.5, 14, 0.5], [28, 16, 3], [31, 12, 1]],
  }, {
    id: 'jpop2-amelo', title: 'Kaerimichi (дорога домой)', key: 'C', base: 'C4', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'cute'], chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'ii', 'V'],
    notes: [[0, 4, 1], [1, 7, 0.5], [1.5, 7, 0.5], [2, 12, 1.5], [3.5, 11, 0.5], [4, 11, 1], [5, 7, 0.5], [5.5, 7, 0.5], [6, 14, 1.5], [7.5, 12, 0.5],
      [8, 12, 1], [9, 9, 0.5], [9.5, 9, 0.5], [10, 16, 1.5], [11.5, 14, 0.5], [12, 11, 2], [14, 7, 1], [15, 11, 1],
      [16, 9, 1], [17, 12, 0.5], [17.5, 12, 0.5], [18, 17, 1.5], [19.5, 16, 0.5], [20, 16, 1], [21, 12, 0.5], [21.5, 12, 0.5], [22, 7, 2],
      [24, 5, 1], [25, 9, 0.5], [25.5, 9, 0.5], [26, 14, 1.5], [27.5, 12, 0.5], [28, 11, 2], [30, 14, 2]],
  }],
  leads: {
    jvocal: soloLead('aah', {
      color: '#ff8fab', scoop: 20, unison: 0.5, vib: 1.2, glide: 0.035, echo: 0.1, in: 'hall', wet: 0.26, gain: 2.3,
      formula: ['V = \\Rev\\big[W^{\\text{а}}_d(f) + 0.5\\,W^{\\text{а}}_d(1.0023f)\\big],\\quad W^{\\text{а}} = \\sum_k \\frac{F(kf)}{k^{1.75 - 0.5d}}\\sin(2\\pi kft + \\varphi_k),\\ F \\text{ — форманты гласной «а» 790 / 1180 / 2750 Гц}'],
    }),
  },
  counter: { jvocal: 'violinsline' },
  chords: {
    popkeys: keysComp('grandTone', { color: '#fdfcdc', gain: 0.8, low: 0.8, roll: 0.006, in: 'hall', wet: 0.22, release: 0.18 }),
  },
  basses: {
    popbass: tonedBass('fingerBassTone', { color: '#5aa7ff', gain: 0.75, cut: 0.85, in: 'room', wet: 0.08, release: 0.06 }),
  },
  kits: {
    jpop2: studioKit({
      color: '#ff5d8f', in: 'room', wet: 0.45, gain: 0.75,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'taikoDrum'],
      pieces: {
        kick: ["kick2({ f: 55, drop: 2.3, decay: 0.19, click: 0.55 })", 36, 0.85, 0, 0.2],
        snare: ["snareDrum({ tone: 215, cutoff: 1500, decay: 14 })", 38, 0.7, 0.05, 0.45],
        hat: ["cymbal2({ kind: 'hat', seed: 451 })", 42, 0.28, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 452 })", 46, 0.25, 0.3, 0.2],
        tomH: ["taikoDrum({ pitch: 150, decay: 0.3, bend: 2, crack: 0.3, boom: 0.15, seed: 131 })", 48, 0.5, -0.3, 0.5],
        tomL: ["taikoDrum({ pitch: 100, decay: 0.36, bend: 2, crack: 0.3, boom: 0.2, seed: 133 })", 45, 0.55, 0.3, 0.5],
        crash: ["cymbal2({ kind: 'crash', seed: 453 })", 49, 0.4, -0.15, 0.4],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.6], ['crash', 4, 0.4]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x---x---x---x-x-')
        steps('snare', 1, fill ? '----x-------x-xx' : '----x-------x---')
        steps('open', 0.8, '--x---x---x---x-')
        steps('hat', 0.6, 'x---x---x---x---')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) { steps('tomH', 0.9, '--------x-x-----'); steps('tomL', 0.9, '----------x-x---') }
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.9, fill ? '----x-------x-xx' : '----x-------x---')
        steps('hat', 0.7, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('kick', 0.7, 'x-------x-------')
        steps('hat', 0.6, 'x-x-x-x-x-x-x-x-')
        steps('snare', 0.5, '------------x---')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`,
    }),
  },
})
