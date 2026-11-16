// Эпический трейлер 2, Is there any hope? 2, Северные горы 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// The big screen with an orchestra that sounds like one (sections of players, a hall, a choir) instead of saws:
// · the trailer: horns and trombones in octaves on the theme, a spiccato ostinato of violins and violas (3 + 3 + 2, then
//   sixteenths), a choir on «а», low strings, a harp, taiko left, centre and right over a boom, a low swell into every part;
// · no hope: a lament — a solo cello, a single voice or the low brass —, strings trembling, a choir, a slow heavy kit in
//   half time with a double kick, a great room; nothing bright;
// · the north: men singing in octaves in a stone hall, a horn answering, a flute or a fiddle, a lyre's figure 1 5 3 5 8 5 3 5,
//   a great drum in 3 + 3 + 2 at half speed with frame drums, wind.
import { defineStyle } from './define.js'
import { ambience, groupLead, sectionChords, studioKit, tonedArp } from './studio.js'
import { ROLL } from './stage.js'

const BRASS_F = ['Br = \\Rev\\Big[\\textstyle\\sum_{i=1}^{4} W^{\\text{влт}}_d(f\\,2^{\\delta_i/1200}) + 0.7\\sum_{i=1}^{3} W^{\\text{трб}}_d(\\tfrac f2\\,2^{\\delta_i/1200})\\Big]\\ \\text{— валторны и тромбоны октавой ниже; чем громче, тем больше обертонов}']
defineStyle('epic2', {
  family: 'cinema', after: 'epic',
  names: [['last', 'iron', 'fallen', 'eternal', 'burning', 'rising', 'silent'], ['stand', 'crown', 'legion', 'banners', 'oath', 'kingdom', 'dawn']],
  borrow: ['epic-banners', 'epic-laststand'],
  style: {
    label: 'Эпический трейлер 2', emoji: '🎬', theme: 'arena', of: 'epic', ver: 2, bpm: [84, 100], swing: 0.5, stage: true,
    about: 'версия 2 — оркестр, а не пилы: валторны и тромбоны в октаву на теме, остинато спиккато скрипок и альтов (3 + 3 + 2, потом шестнадцатые), хор на «а», низкие струнные, арфа, тайко слева, в центре и справа над глубоким ударом, большой зал',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'epic2-dawn': 5, 'epic-banners': 5, 'epic-laststand': 5 },
    keys: ['Dm', 'Cm', 'Em', 'Gm', 'Am', 'Bm', 'Fm', 'C#m'], moods: ['epic', 'dark'],
    voicing: 'open', chordRange: [50, 74], bassRange: [26, 40],
    lead: ['brassline'], lead2: ['violinsline', 'grand'], counter: 'violinsline', chords: ['spiccato2'], bass: ['bowed2'], pad: ['choir2', 'stringpad'], arp: ['harp2', null], texture: ['braam2'], kit: 'epic2',
    forms: [
      [['prologue', 4, 'intro', 0], ['rising', 8, 'themeB', 2], ['build', 4, 'build', 2], ['main title', 16, 'theme', 3], ['reflection', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['last stand', 16, 'final', 3, { keyUp: 1 }], ['epilogue', 4, 'outro', 0]],
      [['prologue', 4, 'intro', 0], ['main title', 8, 'theme', 2], ['the fall', 8, 'bridge', 1], ['rising', 8, 'themeB', 2], ['build', 4, 'build', 2], ['charge', 16, 'final', 3, { canon: true }], ['epilogue', 6, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 1.9], [2, 'R', 1.9]], arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    // a rising call in dotted steps: tonic – third – fifth, the sixth leaning down, up to the octave and the dominant's third
    id: 'epic2-dawn', title: 'Before the Charge (перед атакой)', key: 'Cm', base: 'C4', feel: 'straight', per: 4, modal: false,
    moods: ['epic', 'dark'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 0, 1.5], [1.5, 3, 0.5], [2, 7, 2], [4, 8, 1.5], [5.5, 7, 0.5], [6, 3, 2], [8, 10, 1.5], [9.5, 12, 0.5], [10, 15, 2], [12, 14, 3], [15, 12, 1],
      [16, 12, 1.5], [17.5, 15, 0.5], [18, 19, 2], [20, 20, 1.5], [21.5, 19, 0.5], [22, 15, 2], [24, 17, 1.5], [25.5, 15, 0.5], [26, 12, 2], [28, 14, 2], [30, 11, 2]],
  }],
  leads: {
    brassline: groupLead([['horns', 4, 0, 1, { centre: -0.25, spread: 0.5 }], ['trombones', 3, -12, 0.7, { centre: 0.3, spread: 0.4 }]], { color: '#f4a261', in: 'big', gain: 2.8, formula: BRASS_F }),
    violinsline: groupLead([['violins', 6, 0, 1, { centre: -0.35, spread: 0.6 }], ['violas', 4, -12, 0.55, { centre: 0.15, spread: 0.5 }]], { color: '#ffd166', in: 'big', gain: 2.4 }),
  },
  counter: { brassline: 'violinsline', violinsline: 'flute2' },
  chords: {
    spiccato2: sectionChords([['violins', 4, 0, 1, { attack: 0.012, release: 0.07, centre: -0.4, spread: 0.5, vib: 0 }], ['violas', 3, -12, 0.8, { attack: 0.012, release: 0.07, centre: 0.2, spread: 0.4, vib: 0 }]], {
      color: '#e9c46a', gain: 1.6, in: 'big', gate: 0.5, rhythm: { 1: 'x-------x-------', 2: 'x--x--x-x--x--x-', 3: 'xoxoxoxoxoxoxoxo' },
      formula: ['Sp = \\Rev\\sum_j\\sum_i W^{\\text{скр}}_d\\big(f_j\\,2^{\\delta_i/1200}\\big)\\ \\text{— спиккато: смычок отскакивает; 3 + 3 + 2, в кульминации шестнадцатые с акцентом на каждую вторую}'],
    }),
    tremolo2: sectionChords([['violins', 5, 0, 1, { attack: 0.02, release: 0.09, centre: -0.4, spread: 0.5, vib: 0 }], ['violas', 4, -12, 0.8, { attack: 0.02, release: 0.09, centre: 0.2, spread: 0.4, vib: 0 }]], {
      color: '#adb5bd', gain: 1.1, in: 'big', gate: 0.7, rhythm: { 1: 'x---x---x---x---', 2: 'xxxxxxxxxxxxxxxx', 3: 'xxxxxxxxxxxxxxxx' },
      formula: ['Tr = \\Rev\\sum_j\\sum_i W^{\\text{скр}}_d\\big(f_j\\,2^{\\delta_i/1200}\\big)\\ \\text{— тремоло: смычок туда и обратно на каждую шестнадцатую}'],
    }),
  },
  arps: {
    kantele2: tonedArp('harpTone', { color: '#a8dadc', rate: 2, pattern: [0, 2, 1, 2, 3, 2, 1, 2], up: 12, in: 'big', wet: 0.3, gain: 0.7, roles: ['intro', 'theme', 'themeB', 'bridge', 'final', 'outro'], from: 0, life: 3, release: 0.4, hold: 1.5, accent: 4 }),
  },
  kits: {
    epic2: studioKit({
      color: '#e76f51', in: 'big', wet: 0.7, gain: 0.7,
      imports: ['kick2', 'taikoDrum', 'snareDrum', 'cymbal2'],
      pieces: {
        boom: ["kick2({ f: 36, drop: 2, decay: 0.6, click: 0.1, body: 0.2 })", 35, 1, 0, 0.5],
        taikoL: ["taikoDrum({ pitch: 58, decay: 0.8, bend: 2.5, crack: 0.3, boom: 0.4, seed: 101 })", 41, 0.7, -0.5, 0.6],
        taikoM: ["taikoDrum({ pitch: 80, decay: 0.6, bend: 2.5, crack: 0.35, boom: 0.3, seed: 103 })", 43, 0.6, 0, 0.6],
        taikoH: ["taikoDrum({ pitch: 115, decay: 0.45, bend: 2, crack: 0.4, boom: 0.2, seed: 105 })", 45, 0.55, 0.5, 0.6],
        snare: ["snareDrum({ tone: 180, cutoff: 1300, decay: 12 })", 38, 0.5, 0.1, 0.7],
        crash: ["cymbal2({ kind: 'crash', tune: 0.9, seed: 391 })", 49, 0.4, -0.1, 0.6],
      },
      graph: [['boom', 3.8, 0.6], ['taikoL', 3.3, 0.6], ['taikoM', 3, 0.5], ['taikoH', 2.7, 0.5]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('taikoL', 0.7 + 0.3 * t / L, 'x-x-x-x-x-x-x-x-')
      } else if (e >= 3) {
        steps('boom', 1, 'x---------------')
        steps('taikoL', 1, 'x--x--x-x--x--x-')
        steps('taikoM', 0.8, '--x--x----x--x--')
        steps('snare', 0.7, '----x-------x---')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('taikoH', 0.9, '--------x-x-xxxx')
      } else if (e === 2) {
        if (t === 0) { add('boom', 1, 0); add('crash', 0.7, 0) }
        steps('taikoL', 0.8, 'x--x--x---------')
        steps('taikoM', 0.6, '----------x--x--')
      } else if (e === 1) {
        steps('taikoL', 0.6, 'x-------------x-')
      } else if (r === 'outro' && t === 0) { add('boom', 1, 0); add('crash', 0.8, 0) }`,
      formula: ['D = \\text{удар}_{36 \\to 72\\text{ Гц}} + 0.7T_{58} + 0.6T_{80} + 0.55T_{115} + 0.5S + 0.4\\,\\text{Crash} + \\Rev_{3.6\\text{с}}[\\ldots]\\ \\text{— тайко слева, в центре, справа}'],
    }),
    doom2: studioKit({
      color: '#6c757d', in: 'big', wet: 0.6, gain: 0.75,
      imports: ['kick2', 'taikoDrum', 'snareDrum', 'cymbal2'],
      pieces: {
        kick: ["kick2({ f: 48, drop: 2.6, decay: 0.2, click: 0.6 })", 36, 0.9, 0, 0.2],
        snare: ["snareDrum({ tone: 170, cutoff: 1100, decay: 9 })", 38, 0.85, 0.05, 0.9],
        china: ["cymbal2({ kind: 'splash', tune: 0.85, seed: 401 })", 52, 0.3, 0.35, 0.4],
        crash: ["cymbal2({ kind: 'crash', tune: 0.9, seed: 403 })", 49, 0.4, -0.2, 0.5],
        tomH: ["taikoDrum({ pitch: 110, decay: 0.4, bend: 2, crack: 0.35, boom: 0.2, seed: 107 })", 47, 0.55, -0.35, 0.6],
        tomL: ["taikoDrum({ pitch: 70, decay: 0.55, bend: 2.5, crack: 0.3, boom: 0.3, seed: 109 })", 41, 0.65, 0.35, 0.6],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.7], ['tomL', 2.8, 0.5]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x-xxx-x-x-xxx-x-')
        steps('snare', 1, '--------x-------')
        steps('china', 0.8, '----x-------x---')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) { steps('tomH', 0.9, '----------x-x---'); steps('tomL', 0.9, '--------------xx') }
      } else if (e === 2) {
        steps('kick', 0.9, 'x-----x---------')
        steps('snare', 0.9, '--------x-------')
        if (t === 0) add('crash', 0.8, 0)
        if (fill) steps('tomL', 0.8, '------------x-xx')
      } else if (e === 1) {
        if (b % 2 === 0) steps('tomL', 0.7, 'x---------------')
      }`,
      formula: ['D = 0.9K + 0.85S + 0.3\\,\\text{China} + 0.4\\,\\text{Crash} + 0.6\\,\\text{Tom} + \\Rev_{3.6\\text{с}}[\\ldots]\\ \\text{— половинный темп: малый на третью долю, под ним двойная бочка}'],
    }),
    nord2: studioKit({
      color: '#8ecae6', in: 'cathedral', wet: 0.6, gain: 0.75,
      imports: ['kick2', 'taikoDrum', 'snareDrum'],
      pieces: {
        drum: ["kick2({ f: 42, drop: 1.9, decay: 0.5, click: 0.15, body: 0.25 })", 35, 1, 0, 0.5],
        frameL: ["taikoDrum({ pitch: 105, decay: 0.35, bend: 1.5, crack: 0.3, boom: 0.15, seed: 111 })", 45, 0.5, -0.45, 0.6],
        frameH: ["taikoDrum({ pitch: 150, decay: 0.28, bend: 1.5, crack: 0.35, boom: 0.1, seed: 113 })", 48, 0.45, 0.45, 0.6],
        snare: ["snareDrum({ tone: 175, cutoff: 1200, decay: 12 })", 38, 0.45, 0.1, 0.7],
      },
      graph: [['drum', 3.7, 0.6], ['frameL', 3.1, 0.5], ['frameH', 2.8, 0.5]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('drum', 0.9, 'x-------x-------')
      } else if (e >= 3) {
        steps('drum', 1, 'x-----x-----x---')
        steps('frameL', 0.9, 'x--x--x-x--x--x-')
        steps('frameH', 0.8, '--x--x----x--x--')
        if (fill) steps('snare', 0.8, '--------x-x-xxxx')
      } else if (e === 2) {
        steps('drum', 0.9, 'x-----------x---')
        steps('frameL', 0.7, 'x-----x---x-----')
      } else if (e === 1) {
        steps('drum', 0.7, 'x---------------')
      }`,
      formula: ['D = \\text{большой барабан}_{3+3+2} + 0.5F_{105} + 0.45F_{150} + \\Rev_{6\\text{с}}[\\ldots]\\ \\text{— рамочные бубны по сторонам, каменный зал}'],
    }),
  },
  textures: {
    braam2: ambience({ color: '#9d6b53', in: 'big', wet: 0.4, drone: 0.09, wind: 0.04, windF: [150, 800], swell: 0.5, boom: 0.6 }),
    ashes2: ambience({ color: '#6c757d', in: 'big', wet: 0.45, drone: 0.08, wind: 0.1, windF: [150, 700], swell: 0.3, boom: 0.5 }),
    northwind: ambience({ color: '#a8dadc', in: 'cathedral', wet: 0.45, drone: 0.05, wind: 0.12, windF: [200, 1200], swell: 0.25 }),
  },
})

defineStyle('ishope2', {
  family: 'cinema', after: 'ishope',
  names: [['iron', 'no', 'broken', 'grey', 'final', 'burnt', 'black'], ['rain', 'dawn', 'wall', 'watch', 'march', 'hope', 'front']],
  borrow: ['hope-ironrain', 'hope-lastwatch', 'hope-nodawn'],
  style: {
    label: 'Is there any hope? 2', emoji: '🔥', theme: 'phonk', of: 'ishope', ver: 2, bpm: [74, 88], swing: 0.5, stage: true, variant: 'danger',
    about: 'версия 2 — плач и тяжесть: соло виолончели, одинокий голос или низкая медь, тремоло струнных, хор, медленные тяжёлые барабаны в половинном темпе с двойной бочкой, огромный зал; ничего светлого',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'hope-ironrain': 5, 'hope-lastwatch': 5, 'hope-nodawn': 5 },
    keys: ['Em', 'Dm', 'Cm', 'C#m', 'Bm', 'F#m', 'Am'], modes: [null, null, 'phrygian'], moods: ['dark', 'epic'],
    voicing: 'open', chordRange: [48, 72], bassRange: [26, 40],
    lead: ['cello2', 'voice2', 'brassline'], lead2: ['violinsline', 'felt'], counter: 'cello2', chords: ['tremolo2'], bass: ['bowed2'], pad: ['choir2', 'airchoir'], arp: [null], texture: ['ashes2'], kit: 'doom2',
    forms: [
      [['the ruins', 4, 'intro', 1], ['march', 8, 'themeB', 2], ['build', 4, 'build', 2], ['no hope', 16, 'theme', 3], ['requiem', 8, 'bridge', 1], ['the wall', 8, 'solo', 2], ['build II', 4, 'build', 2], ['last stand', 16, 'final', 3], ['ashes', 4, 'outro', 1]],
      [['the ruins', 4, 'intro', 1], ['no hope', 8, 'theme', 2], ['march', 8, 'themeB', 3], ['requiem', 8, 'bridge', 1], ['build', 4, 'build', 2], ['last stand', 16, 'final', 3, { canon: true }], ['ashes', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.8]], arpStep: 0.5, arpPoly: false,
  },
})

defineStyle('nordic2', {
  family: 'cinema', after: 'nordic',
  names: [['frost', 'iron', 'high', 'storm', 'winter', 'ancient', 'white'], ['fall', 'peak', 'hold', 'barrow', 'throat', 'song', 'crown']],
  borrow: ['nord-dovah', 'nord-steps', 'nord-frostfall'],
  style: {
    label: 'Северные горы 2', emoji: '🏔️', theme: 'snow', of: 'nordic', ver: 2, bpm: [76, 92], swing: 0.5, stage: true,
    about: 'версия 2 — мужчины поют в октаву в каменном зале, им отвечает валторна, флейта или скрипка; фигура лиры 1 5 3 5 8 5 3 5, большой барабан в 3 + 3 + 2 на половинной скорости с рамочными бубнами, низкие струнные, ветер',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'nord-dovah': 5, 'nord-steps': 5, 'nord-frostfall': 5 },
    keys: ['Dm', 'Em', 'Am', 'Bm', 'Gm', 'Cm', 'F#m'], modes: [null, 'dorian', 'aeolian'], moods: ['epic', 'dark'],
    voicing: 'open', chordRange: [48, 72], bassRange: [26, 40],
    lead: ['menchoir', 'horn2'], lead2: ['flute2', 'violin2', 'cello2'], counter: 'horn2', chords: ['spiccato2', 'stringchords'], bass: ['bowed2'], pad: ['stringpad', 'airchoir'], arp: ['kantele2'], texture: ['northwind'], kit: 'nord2',
    forms: [
      [['the throat of the world', 4, 'intro', 0], ['the road north', 8, 'themeB', 1], ['dragonborn', 16, 'theme', 2], ['frost', 8, 'bridge', 1], ['the march', 4, 'build', 2], ['sovngarde', 16, 'final', 3], ['the summit', 8, 'outro', 0]],
      [['the throat of the world', 4, 'intro', 0], ['dragonborn', 8, 'theme', 2], ['the road north', 8, 'themeB', 2], ['frost', 8, 'bridge', 1], ['the march', 4, 'build', 2], ['sovngarde', 16, 'final', 3, { canon: true }], ['the summit', 8, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.8]], arpStep: 0.5, arpPoly: false,
  },
  leads: {
    menchoir: groupLead([['aah', 6, 0, 1, { centre: -0.2, spread: 0.6 }], ['ooh', 5, -12, 0.7, { centre: 0.2, spread: 0.6 }]], {
      color: '#bde0fe', dn: -12, in: 'cathedral', gain: 2.4,
      formula: ['Ch = \\Rev_{6\\text{с}}\\Big[\\textstyle\\sum_{i=1}^{6} W^{\\text{а}}_d(\\tfrac f2\\,2^{\\delta_i/1200}) + 0.7\\sum_{i=1}^{5} W^{\\text{о}}_d(\\tfrac f4\\,2^{\\delta_i/1200})\\Big]\\ \\text{— мужской хор в октаву: гласная = источник −10 дБ/окт через форманты}'],
    }),
  },
  counter: { menchoir: 'horn2' },
})
