// Залы чозо 2 and Brinstar Depths 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// Two places of a lonely planet, in the idiom of their games' scores (themes of our own, none of theirs):
// · the halls: bell arpeggios that answer themselves in a dotted echo, a breathing choir on «у», a sine voice that
//   glides from note to note like a far signal, a sub that pulses, deep hand drums far away, a sonar ping in the dark;
// · the depths: what the sources say of that arrangement — atmospheric, all synthesizers, an ostinato; the drums come only
//   in the second half, with a key change. Here: a soft square arpeggio in triplets that never stops, a slow line above
//   it, a pad, a pulsing bass; then a kick on every beat, hats between, a clap, and everything a tone higher.
import { defineStyle } from './define.js'
import { ambience, keysLead, sectionChords, sectionPad, studioKit, subBass, synthBass, tonedArp } from './studio.js'

defineStyle('prime2', {
  family: 'game', after: 'prime',
  names: [['chozo', 'phazon', 'frozen', 'sunken', 'hollow', 'ancient', 'silent'], ['halls', 'ruins', 'mines', 'sanctum', 'drifts', 'crater', 'elevator']],
  borrow: ['prime-chozo', 'prime-phazon', 'prime-frozen'],
  style: {
    label: 'Залы чозо 2', emoji: '👁️', theme: 'void', of: 'prime', ver: 2, bpm: [88, 104], swing: 0.5, stage: true,
    about: 'версия 2 — одиночество чужой планеты: арпеджио колоколов в пунктирном эхе, дышащий хор на «у», синусовый голос с глиссандо, пульсирующий саб, далёкие глубокие томы, сонар',
    gains: { lead: 1, lead2: 0.9, counter: 0.8, pad: 1, bass: 1, arp: 1, chords: 1 },
    themes: { 'prime2-drifts': 5, 'prime2-tallon': 5, 'prime-chozo': 3, 'prime-phazon': 3, 'prime-frozen': 3 },
    keys: ['Em', 'Dm', 'Am', 'Bm', 'F#m', 'Cm', 'Gm'], modes: [null, 'dorian', null, 'phrygian'], moods: ['dark', 'space', 'game'],
    voicing: 'open', chordRange: [50, 72], bassRange: [28, 40],
    lead: ['softlead', 'voice2'], lead2: ['glassbell', 'crystal'], counter: 'glassbell', chords: ['glassswell'], bass: ['pulsebass'], pad: ['chozochoir', 'chozoglass'], arp: ['echoarp'], texture: ['chozo'], kit: 'prime2',
    forms: [
      [['the landing', 4, 'intro', 0], ['ruins', 8, 'themeB', 1], ['the halls', 16, 'theme', 2], ['frozen drifts', 8, 'bridge', 1], ['the scan', 8, 'solo', 2], ['phazon', 16, 'final', 3], ['the elevator', 4, 'outro', 0]],
      [['the landing', 4, 'intro', 0], ['the halls', 16, 'theme', 2], ['ruins', 8, 'themeB', 1], ['frozen drifts', 8, 'bridge', 1], ['phazon', 16, 'final', 3, { keyUp: 2 }], ['the elevator', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 1.5], [2, 'R', 0.5], [2.5, '8', 0.5], [3, '5', 1]], arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    // crystalline: long notes a fourth, a fifth, an octave apart over i – VI – III – VII, i – VI – iv – i (all in the natural minor)
    id: 'prime2-drifts', title: 'Glass Drifts (стеклянные сугробы)', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: true,
    moods: ['dark', 'space'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'i'],
    notes: [[0, 7, 2], [2, 12, 1.5], [3.5, 10, 0.5], [4, 8, 2], [6, 3, 2], [8, 10, 1.5], [9.5, 7, 0.5], [10, 3, 2], [12, 5, 2], [14, 2, 1], [15, 5, 1],
      [16, 7, 2], [18, 15, 1.5], [19.5, 14, 0.5], [20, 12, 2], [22, 8, 2], [24, 12, 1.5], [25.5, 10, 0.5], [26, 8, 2], [28, 7, 4]],
  }, {
    // a signal across the surface: rising fourths, a held note, the answer a step lower (i – i – VII – VII – VI – VI – VII – i)
    id: 'prime2-tallon', title: 'Overworld Signal (сигнал с поверхности)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: true,
    moods: ['space', 'game'], chords: ['i', 'i', 'VII', 'VII', 'VI', 'VI', 'VII', 'i'],
    notes: [[0, 0, 1], [1, 7, 1], [2, 3, 1.5], [3.5, 5, 0.5], [4, 7, 3], [7, 5, 0.5], [7.5, 3, 0.5], [8, 2, 1], [9, 5, 1], [10, 10, 1.5], [11.5, 7, 0.5], [12, 5, 3], [15, 7, 1],
      [16, 8, 1], [17, 12, 1], [18, 15, 1.5], [19.5, 12, 0.5], [20, 8, 2], [22, 3, 2], [24, 5, 1], [25, 10, 1], [26, 14, 1.5], [27.5, 12, 0.5], [28, 12, 2], [30, 7, 2]],
  }],
  leads: {
    crystal: keysLead('celestaTone', { color: '#d8f3ff', up: 12, echo: 0.3, in: 'space', wet: 0.36, gain: 1.7, release: 0.6 }),
  },
  counter: { crystal: 'softlead' },
  chords: {
    glassswell: sectionChords([['glass', 4, 0, 1, { attack: 0.6, release: 1.2 }], ['sine', 2, 12, 0.3, { attack: 0.8, release: 1.2 }]], { color: '#bde0fe', from: 1, in: 'space', gain: 1.3 }),
  },
  pads: {
    chozochoir: sectionPad([['ooh', 5, 0, 1, { centre: -0.15 }], ['mm', 3, -12, 0.45, { centre: 0.25 }]], { color: '#d0bfff', always: true, in: 'cathedral', wet: 0.38, gain: 1.3 }),
    chozoglass: sectionPad([['glass', 4, 0, 0.9], ['warm', 3, -12, 0.5]], { color: '#caf0f8', always: true, ens: 0.35, in: 'space', wet: 0.4, gain: 1.6 }),
  },
  basses: {
    pulsebass: subBass({ color: '#4361ee', gain: 0.8, cut: 0.75 }),
  },
  arps: {
    // the halls' signature: bells walking up the chord in eighths, each answered a dotted eighth later, left and right
    echoarp: tonedArp('glassBellTone', { color: '#b8f0ff', rate: 2, pattern: [0, 2, 1, 3, 2, 4, 3, 5], up: 12, echo: 0.42, in: 'space', wet: 0.4, gain: 0.65, roles: ['intro', 'theme', 'themeB', 'bridge', 'break', 'final', 'solo', 'outro'], from: 0, life: 4, release: 0.6, hold: 1.5, accent: 8 }),
  },
  kits: {
    prime2: studioKit({
      color: '#9d4edd', in: 'big', wet: 0.6, gain: 0.8,
      imports: ['kick2', 'taikoDrum', 'rimDrum', 'shakerDrum', 'cymbal2'],
      pieces: {
        kick: ["kick2({ f: 46, drop: 2, decay: 0.34, click: 0.2 })", 36, 0.8, 0, 0.25],
        tomL: ["taikoDrum({ pitch: 62, decay: 0.7, bend: 2.5, crack: 0.2, boom: 0.35, seed: 71 })", 41, 0.6, -0.45, 0.7],
        tomH: ["taikoDrum({ pitch: 93, decay: 0.5, bend: 2, crack: 0.25, boom: 0.25, seed: 73 })", 45, 0.5, 0.45, 0.7],
        rim: ["rimDrum()", 37, 0.4, 0.2, 0.8],
        shaker: ["shakerDrum()", 70, 0.2, -0.3, 0.3],
        hat: ["cymbal2({ kind: 'hat', seed: 311 })", 42, 0.22, 0.35, 0.3],
      },
      graph: [['kick', 3.6, 0.6], ['tomL', 3.1, 0.6], ['tomH', 2.8, 0.5], ['rim', 2.5, 0.4]],
      body: `      if (e >= 3) {
        steps('kick', 1, 'x-----x---x-----')
        steps('rim', 0.9, '----x-------x---')
        steps('tomL', 0.8, '-------x------x-')
        steps('shaker', 0.8, 'xoxoxoxoxoxoxoxo')
        steps('hat', 0.8, '--x---x---x---x-')
        if (fill) steps('tomH', 0.9, '--------x-x--xx-')
      } else if (e === 2) {
        steps('kick', 0.9, 'x---------x-----')
        steps('rim', 0.8, '--------x-------')
        steps('tomL', 0.7, b % 2 ? '------x-------o-' : '------x---------')
        steps('shaker', 0.7, 'x-o-x-o-x-o-x-o-')
        if (fill) steps('tomH', 0.8, '----------x--x-x')
      } else if (e === 1) {
        steps('shaker', 0.5, 'x---x---x---x---')
        if (b % 2) steps('tomL', 0.6, '----------x-----')
      }`,
      formula: ['D = 0.8K + 0.6T_{62} + 0.5T_{93} + 0.4\\,\\text{Rim} + 0.2\\,\\text{Sh} + 0.22H + \\Rev[\\ldots]\\ \\text{— глубокие томы 62 и 93 Гц по сторонам, далеко в большом зале}'],
    }),
  },
  textures: {
    chozo: ambience({ color: '#7b6d8d', drone: 0.1, wind: 0.07, windF: [220, 1100], ping: { every: 16, f: 1318.5, level: 0.035 }, swell: 0.3 }),
  },
})

defineStyle('brinstar2', {
  family: 'game', after: 'brinstar',
  names: [['mossy', 'spore', 'hollow', 'drowned', 'sunken', 'silent', 'buried'], ['depths', 'roots', 'lair', 'caverns', 'grotto', 'chamber', 'shaft']],
  style: {
    label: 'Brinstar Depths 2', emoji: '🌿', theme: 'jungle', of: 'brinstar', ver: 2, bpm: [84, 96], swing: 0.5, stage: true,
    about: 'версия 2 — как в той аранжировке: атмосферно и на одних синтезаторах — остинато триолями не умолкает, над ним медленная линия; ударные вступают только во второй половине, вместе со сменой тональности',
    gains: { lead: 1, lead2: 0.9, counter: 0.8, pad: 1, bass: 1, arp: 1, chords: 1 },
    themes: { 'brin2-lair': 5, 'brin2-secret': 5 },
    keys: ['Em', 'Dm', 'Am', 'F#m', 'Bm', 'Cm'], modes: [null], moods: ['dark', 'game'],
    voicing: 'close', chordRange: [50, 70], bassRange: [28, 40],
    lead: ['softlead', 'squarelead2'], lead2: ['glassbell', 'voice2'], counter: 'glassbell', chords: ['lairpad'], bass: ['lairbass'], pad: ['lairchoir', null], arp: ['lairarp'], texture: ['depths'], kit: 'brinstar2',
    forms: [
      [['the descent', 4, 'intro', 0], ['the lair', 16, 'theme', 1], ['secret room', 8, 'bridge', 1], ['deeper', 8, 'themeB', 2], ['the lair wakes', 16, 'final', 3, { keyUp: 2 }], ['stillness', 4, 'outro', 0]],
      [['the descent', 4, 'intro', 0], ['the lair', 16, 'theme', 1], ['secret room', 8, 'themeB', 1], ['stillness', 4, 'break', 0], ['the lair wakes', 16, 'final', 3, { keyUp: 2 }], ['deeper', 8, 'bridge', 2], ['surface', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'eighths', arpStep: 1 / 3, arpPoly: false,
  },
  themes: [{
    // a slow line of long notes over the ostinato: the fifth with its upper neighbour, down through the chord; ♭II before the dominant
    id: 'brin2-lair', title: 'The Lair Below (логово внизу)', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false,
    moods: ['dark'], chords: ['i', 'i', 'VI', 'V', 'i', 'iv', 'bII', 'V'],
    notes: [[0, 7, 3], [3, 8, 1], [4, 7, 2], [6, 3, 2], [8, 8, 3], [11, 7, 1], [12, 11, 2], [14, 7, 2],
      [16, 12, 3], [19, 10, 1], [20, 8, 2], [22, 5, 2], [24, 5, 2], [26, 1, 2], [28, 2, 2], [30, -1, 2]],
  }, {
    // the secret room: a question that climbs the tonic chord, the Neapolitan's answer, home by the dominant
    id: 'brin2-secret', title: 'Secret Room (тайная комната)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false,
    moods: ['dark', 'game'], chords: ['i', 'bII', 'i', 'VII', 'iv', 'bII', 'V', 'i'],
    notes: [[0, 0, 1.5], [1.5, 3, 0.5], [2, 7, 2], [4, 8, 1.5], [5.5, 5, 0.5], [6, 1, 2], [8, 3, 1.5], [9.5, 7, 0.5], [10, 12, 2], [12, 10, 1.5], [13.5, 7, 0.5], [14, 5, 2],
      [16, 8, 1.5], [17.5, 10, 0.5], [18, 12, 2], [20, 13, 1.5], [21.5, 12, 0.5], [22, 8, 2], [24, 7, 1.5], [25.5, 4, 0.5], [26, 1, 2], [28, 0, 4]],
  }],
  chords: {
    lairpad: sectionChords([['warm', 4, 0, 1, { attack: 0.4, release: 0.9 }]], { color: '#74c69d', from: 0, in: 'big', gain: 1.2 }),
  },
  pads: {
    lairchoir: sectionPad([['ooh', 5, 0, 1, { centre: -0.15 }], ['mm', 3, -12, 0.45, { centre: 0.25 }]], { color: '#b7e4c7', always: true, in: 'cathedral', wet: 0.38, gain: 1.2 }),
  },
  basses: {
    lairbass: synthBass('square', { color: '#2d6a4f', accent: 0.5, sub: 0.8, gain: 0.9, cut: 0.7 }),
  },
  arps: {
    // the ostinato: a soft square (three odd harmonics) up and down the chord in triplets, from the first bar to the last
    lairarp: tonedArp('(f, t, v) => 0.55 * v * exp(-t / 0.3) * (1 - exp(-t / 0.002)) * (sin(TAU * f * t) + 0.33 * sin(TAU * 3 * f * t) + 0.18 * sin(TAU * 5 * f * t))', {
      color: '#95d5b2', rate: 3, pattern: [0, 1, 2, 3, 2, 1], up: 0, echo: 0.22, in: 'big', gain: 1.1, roles: ['intro', 'theme', 'themeB', 'bridge', 'break', 'final', 'solo', 'outro'], from: 0, life: 1.5, release: 0.15, hold: 0.9, accent: 3,
      formula: ['\\text{остинато триолями: } n_j = v_{(0,1,2,3,2,1)_{j \\bmod 6}},\\quad y = e^{-t/0.3}\\big(\\sin\\varphi + \\tfrac13\\sin 3\\varphi + 0.18\\sin 5\\varphi\\big)\\ \\text{— мягкий меандр}'],
    }),
  },
  kits: {
    // nothing until the second half; then a kick on every beat, a hat between, a clap on two and four, toms into the phrases
    brinstar2: studioKit({
      color: '#52b788', in: 'club', wet: 0.5, gain: 1.2,
      imports: ['kick2', 'clapDrum', 'cymbal2', 'taikoDrum', 'shakerDrum'],
      pieces: {
        kick: ["kick2({ f: 50, drop: 2.4, decay: 0.24, click: 0.45 })", 36, 0.9, 0, 0.15],
        clap: ["clapDrum({ center: 1250 })", 39, 0.7, 0.05, 0.7],
        hat: ["cymbal2({ kind: 'hat', seed: 321 })", 42, 0.3, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 322 })", 46, 0.22, -0.3, 0.2],
        shaker: ["shakerDrum()", 70, 0.2, -0.35, 0.2],
        tom: ["taikoDrum({ pitch: 84, decay: 0.45, bend: 2, crack: 0.3, boom: 0.25, seed: 77 })", 45, 0.55, 0.3, 0.6],
      },
      graph: [['kick', 3.6, 0.6], ['clap', 3.1, 0.5], ['tom', 2.7, 0.5]],
      body: `      if (e >= 3) {
        steps('kick', 1, 'x---x---x---x---')
        steps('clap', 0.9, '----x-------x---')
        steps('hat', 0.8, '--x---x---x---x-')
        steps('shaker', 0.7, 'xoxoxoxoxoxoxoxo')
        if (b % 4 === 3) steps('open', 0.8, '--------------x-')
        if (fill) steps('tom', 0.9, '----------x-x-xx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-------')
        steps('hat', 0.6, '--x---x---x---x-')
        steps('shaker', 0.6, 'x-o-x-o-x-o-x-o-')
        if (fill) steps('tom', 0.8, '------------x-xx')
      }`,
      formula: ['D = 0.9K + 0.7\\,\\text{Clap} + 0.3H + 0.2\\,\\text{Sh} + 0.55\\,\\text{Tom} + \\Rev[\\ldots]\\ \\text{— молчат до второй половины; затем бочка на каждую долю}'],
    }),
  },
  textures: {
    depths: ambience({ color: '#40916c', drone: 0.06, wind: 0.03, windF: [120, 520], swell: 0.35, boom: 0.5 }),
  },
})
