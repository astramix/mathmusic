// Синтвейв 2, Дрифт-фонк 2, Брейккор 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// · Синтвейв 2: the night drive with more air — saws in unison far in the hall, glass bells, a string-machine pad through
//   the ensemble chorus, a rolling bass with a closing edge, a snare that blooms in the big room, long fades;
// · Дрифт-фонк 2: the first one was sour — the 808 cowbell's two squares stand 1 : 1.48 apart, a fifth 23 cents flat,
//   and a formant choir sat on top. Here the cowbell is in tune with itself (a pure fifth), the choir is a low breathing
//   «у» far in a cathedral, the felt piano plays the chords, the 808 slides underneath, the hats roll in a room;
// · Брейккор 2: the first one drew every sixteenth of the break at random and sounded broken. A break is cut by the
//   eighth and put back in patterns a drummer could have played: the four bars of the classic break (kick, snare, ghost
//   notes, the ride on every eighth) are the source; each bar is its own eighths in one of a few orders, the phrase ends
//   in a roll — over a felt piano, a pad and a sub that hardly move.
import { defineStyle } from './define.js'
import { ambience, keysLead, sectionChords, sectionPad, studioKit, synthBass } from './studio.js'
import { ROLL } from './stage.js'

defineStyle('synthwave2', {
  family: 'club', after: 'synthwave',
  names: [['neon', 'chrome', 'midnight', 'laser', 'violet', 'distant', 'coastal'], ['highway', 'city', 'sunset', 'grid', 'drive', 'arcade', 'horizon']],
  style: {
    label: 'Синтвейв 2', emoji: '🌆', theme: 'synth', of: 'synthwave', ver: 2, bpm: [84, 108], swing: 0.5, stage: true,
    about: 'версия 2 — ночная дорога, больше воздуха: пилы в унисон далеко в зале, стеклянные колокола, пэд струнной машины через ансамбль-хорус, катящийся бас, малый барабан, расцветающий в большом зале',
    gains: { lead: 1, lead2: 1.3, counter: 0.8, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'sw2-coast': 5, 'sw2-afterhours': 5, 'synthwave-lead': 4, 'void-orbit': 2, 'void-nebula': 2 },
    keys: ['Em', 'Am', 'Dm', 'F#m', 'Cm', 'Bm', 'Gm'], moods: ['epic', 'night', 'dark'],
    voicing: 'close', chordRange: [52, 76], bassRange: [28, 45],
    lead: ['sawlead2', 'softlead'], lead2: ['glassbell', 'softpluck'], counter: 'glassbell', chords: ['junochords'], bass: ['rollbass'], pad: ['warmpad', 'glasspad'], arp: ['softarp', 'glassarp'], texture: ['nightdrive'], kit: 'synth2',
    forms: [
      [['sunset', 8, 'intro', 1], ['drive', 8, 'theme', 2], ['neon', 8, 'themeB', 2], ['tunnel', 8, 'bridge', 1], ['overdrive', 8, 'solo', 3], ['final drive', 8, 'final', 3], ['fade', 6, 'outro', 0]],
      [['sunset', 8, 'intro', 1], ['neon', 8, 'themeB', 2], ['drive', 8, 'theme', 2], ['night air', 4, 'break', 0], ['tunnel', 8, 'bridge', 1], ['final drive', 16, 'final', 3, { keyUp: 2 }], ['fade', 6, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'eighths', arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    id: 'sw2-coast', title: 'Coast Road (дорога вдоль берега)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: true,
    moods: ['night', 'epic'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'VII'],
    notes: [[0, 7, 1.5], [1.5, 10, 0.5], [2, 12, 2], [4, 12, 1], [5, 10, 0.5], [5.5, 8, 0.5], [6, 15, 2], [8, 14, 1.5], [9.5, 10, 0.5], [10, 7, 2], [12, 5, 1], [13, 10, 0.5], [13.5, 14, 0.5], [14, 17, 2],
      [16, 19, 1.5], [17.5, 15, 0.5], [18, 12, 2], [20, 15, 1], [21, 12, 0.5], [21.5, 8, 0.5], [22, 12, 2], [24, 12, 1.5], [25.5, 8, 0.5], [26, 5, 2], [28, 10, 2], [30, 14, 2]],
  }, {
    id: 'sw2-afterhours', title: 'After Hours (после закрытия)', key: 'Am', base: 'A3', feel: 'straight', per: 4, modal: true,
    moods: ['night', 'dark'], chords: ['i', 'III', 'VII', 'iv', 'i', 'III', 'VI', 'VII'],
    notes: [[0, 12, 0.75], [0.75, 10, 0.75], [1.5, 7, 0.5], [2, 12, 2], [4, 10, 0.75], [4.75, 7, 0.75], [5.5, 3, 0.5], [6, 7, 2], [8, 14, 0.75], [8.75, 10, 0.75], [9.5, 5, 0.5], [10, 10, 2], [12, 8, 0.75], [12.75, 12, 0.75], [13.5, 17, 0.5], [14, 12, 2],
      [16, 15, 0.75], [16.75, 12, 0.75], [17.5, 7, 0.5], [18, 15, 2], [20, 19, 0.75], [20.75, 15, 0.75], [21.5, 10, 0.5], [22, 15, 2], [24, 20, 0.75], [24.75, 17, 0.75], [25.5, 15, 0.5], [26, 12, 2], [28, 14, 2], [30, 10, 2]],
  }],
  chords: {
    junochords: sectionChords([['saw', 3, 0, 1, { attack: 0.05, release: 0.4, vib: 0.3, spread: 0.9 }], ['warm', 3, -12, 0.5, { attack: 0.08, release: 0.5 }]], { color: '#ff7eb6', from: 1, in: 'big', gain: 1.2 }),
  },
  basses: {
    rollbass: synthBass('saw', { color: '#7b2cbf', accent: 0.45, sub: 0.7, gain: 0.85, cut: 0.8 }),
  },
  kits: {
    synth2: studioKit({
      color: '#f72585', in: 'big', wet: 0.6, gain: 1,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'taikoDrum'],
      pieces: {
        kick: ["kick2({ f: 50, drop: 2.6, decay: 0.24, click: 0.4 })", 36, 0.9, 0, 0.1],
        snare: ["snareDrum({ tone: 190, cutoff: 1400, decay: 13 })", 38, 0.7, 0, 0.9],
        hat: ["cymbal2({ kind: 'hat', seed: 361 })", 42, 0.24, 0.3, 0.1],
        open: ["cymbal2({ kind: 'open', seed: 362 })", 46, 0.22, 0.3, 0.2],
        tomH: ["taikoDrum({ pitch: 140, decay: 0.35, bend: 5, crack: 0.2, boom: 0.15, seed: 91 })", 48, 0.5, -0.4, 0.6],
        tomL: ["taikoDrum({ pitch: 92, decay: 0.42, bend: 5, crack: 0.2, boom: 0.2, seed: 93 })", 45, 0.55, 0.4, 0.6],
        crash: ["cymbal2({ kind: 'crash', seed: 363 })", 49, 0.36, -0.15, 0.5],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.6], ['tomL', 2.8, 0.5]],
      body: `      if (r === 'build') {
        ${ROLL}
      } else if (e >= 3) {
        steps('kick', 1, 'x---x---x---x---')
        steps('snare', 1, '----x-------x---')
        steps('hat', 0.8, 'x-xxx-xxx-xxx-xx')
        if (b % 2) steps('open', 0.8, '--------------x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) { steps('tomH', 0.9, '--------x-x-----'); steps('tomL', 0.9, '------------x-xx') }
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.9, '----x-------x---')
        steps('hat', 0.7, '--x---x---x---x-')
        if (t === 0) add('crash', 0.8, 0)
        if (fill) steps('tomL', 0.8, '------------x-xx')
      } else if (e === 1) {
        steps('kick', 0.7, 'x-------x-------')
        steps('hat', 0.5, '--x---x---x---x-')
      }`,
    }),
  },
  textures: {
    nightdrive: ambience({ color: '#7209b7', drone: 0.05, wind: 0.06, windF: [300, 1600], swell: 0.35 }),
  },
})

defineStyle('phonk2', {
  family: 'underground', after: 'phonk',
  names: [['midnight', 'ghost', 'tokyo', 'cold', 'silent', 'foggy'], ['drift', 'district', 'chase', 'garage', 'tunnel', 'smoke']],
  borrow: ['phonk-drift', 'phonk-memphis'],
  style: {
    label: 'Дрифт-фонк 2', emoji: '🏎️', theme: 'phonk', of: 'phonk', ver: 2, bpm: [120, 134], swing: 0.5, stage: true, variant: 'cave',
    about: 'версия 2 — без кислой ноты: у ковбелла 808 два меандра стоят на 1 : 1.48 (квинта на 23 цента ниже чистой) — здесь чистая квинта; вместо формантного хора — низкое «у» далеко в соборе, аккорды на войлочном пианино, скользящий 808, хэты дробью в комнате',
    gains: { lead: 1, lead2: 0.6, counter: 0.7, chords: 1, pad: 1, bass: 0.85 },
    themes: { 'phonk2-fog': 5, 'phonk-drift': 5, 'phonk-memphis': 5 },
    keys: ['Am', 'Cm', 'Em', 'Fm', 'Gm', 'Dm', 'Bm', 'C#m'], modes: [null, 'phrygian', null], moods: ['dark'],
    voicing: 'close', chordRange: [52, 72], bassRange: [26, 38],
    lead: ['cowbell2'], lead2: ['steelpan', 'glassbell'], counter: 'glassbell', chords: ['feltcomp'], bass: ['b808'], pad: ['phonkchoir', 'warmpad'], arp: [null], texture: ['memphis'], kit: 'trap2',
    forms: [
      [['intro', 4, 'intro', 1], ['drift', 16, 'theme', 3], ['memphis', 8, 'themeB', 2], ['no brakes', 4, 'break', 0], ['drift II', 16, 'final', 3], ['steel', 8, 'bridge', 1], ['outro', 4, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['memphis', 8, 'themeB', 2], ['drift', 16, 'theme', 3], ['steel', 8, 'bridge', 1], ['build', 4, 'build', 2], ['drift II', 16, 'final', 3], ['outro', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 3.8]], 2: [[0, 0.55, 2], [2, 0.5, 2]], 3: [[0, 0.6, 1.5], [1.5, 0.5, 1], [2.5, 0.55, 1.5]] },
    bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    // three hits on the tonic, a step, the fifth; the Neapolitan every other phrase (i – i – ♭II – i – iv – i – ♭II – i)
    id: 'phonk2-fog', title: 'Fog Lights (противотуманки)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false,
    moods: ['dark'], chords: ['i', 'i', 'bII', 'i', 'iv', 'i', 'bII', 'i'],
    notes: [[0, 0, 0.5], [0.75, 0, 0.25], [1, 3, 0.5], [1.5, 0, 0.5], [2, 7, 1], [3, 5, 0.5], [3.5, 3, 0.5], [4, 0, 0.5], [4.75, 0, 0.25], [5, 3, 0.5], [5.5, 5, 0.5], [6, 7, 2],
      [8, 5, 0.5], [8.75, 5, 0.25], [9, 8, 0.5], [9.5, 5, 0.5], [10, 1, 1], [11, 5, 0.5], [11.5, 3, 0.5], [12, 0, 0.5], [12.75, 3, 0.25], [13, 7, 0.5], [13.5, 3, 0.5], [14, 0, 2],
      [16, 5, 0.5], [16.75, 5, 0.25], [17, 8, 0.5], [17.5, 12, 0.5], [18, 8, 1], [19, 5, 0.5], [19.5, 8, 0.5], [20, 7, 0.5], [20.75, 7, 0.25], [21, 3, 0.5], [21.5, 0, 0.5], [22, 3, 2],
      [24, 1, 0.5], [24.75, 1, 0.25], [25, 5, 0.5], [25.5, 8, 0.5], [26, 5, 1], [27, 1, 1], [28, 0, 4]],
  }],
  leads: {
    cowbell2: keysLead('cowbell2Tone', {
      color: '#ffffff', gain: 5.5, in: 'club', wet: 0.24, echo: 0.2, release: 0.1, life: 1.6, width: 0.2,
      formula: ['Cb = \\Rev\\,\\Dly\\Big[\\big(0.58e^{-t/14\\text{мс}} + 0.42e^{-t/0.4}\\big)\\sum_{k\\ \\text{нечёт}}\\tfrac{1}{k}\\Big(B(kf)\\sin 2\\pi kft + 0.8\\,B(1.5kf)\\sin 2\\pi\\,1.5kft\\Big)\\Big]', 'B(F) = \\Big(1 + 1.1^2\\big(\\tfrac{F}{4.9f} - \\tfrac{4.9f}{F}\\big)^2\\Big)^{-1/2}\\ \\text{— два меандра в чистую квинту (у машины 1 : 1.48) через её полосовой фильтр}'],
    }),
  },
  counter: { cowbell2: 'glassbell' },
  pads: {
    phonkchoir: sectionPad([['ooh', 5, -12, 1, { centre: -0.15 }], ['mm', 3, -12, 0.5, { centre: 0.25 }]], { color: '#6c757d', in: 'cathedral', wet: 0.42, gain: 1.2 }),
  },
  kits: {
    trap2: studioKit({
      color: '#e63946', in: 'club', wet: 0.45, gain: 0.7,
      imports: ['kick2', 'snareDrum', 'clapDrum', 'cymbal2', 'rimDrum'],
      pieces: {
        kick: ["kick2({ f: 48, drop: 2.8, decay: 0.3, click: 0.5 })", 36, 0.9, 0, 0.1],
        snare: ["snareDrum({ tone: 200, cutoff: 1800, decay: 16 })", 38, 0.55, 0.05, 0.5],
        clap: ["clapDrum({ center: 1300 })", 39, 0.8, -0.05, 0.75],
        hat: ["cymbal2({ kind: 'hat', seed: 371 })", 42, 0.28, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 372 })", 46, 0.24, -0.3, 0.2],
        rim: ["rimDrum()", 37, 0.35, -0.35, 0.5],
        crash: ["cymbal2({ kind: 'crash', seed: 373 })", 49, 0.36, 0.15, 0.45],
      },
      graph: [['kick', 3.6, 0.6], ['clap', 3.2, 0.6], ['hat', 2.6, 0.3]],
      body: `      if (r === 'build') {
        ${ROLL}
      } else if (e >= 2) {
        steps('kick', 1, e >= 3 ? 'x-----x---x--x--' : 'x---------x-----')
        steps('clap', 1, '--------x-------')
        if (e >= 3) steps('snare', 0.7, '--------x------o')
        for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.5 : 0.75, i / 2)
        // the roll: thirty-seconds through the last beat of every other bar, triplets where everything plays
        if (b % 2) for (let i = 0; i < 8; i++) add('hat', 0.4 + 0.05 * i, 3 + i / 8)
        else if (e >= 3) for (let i = 0; i < 6; i++) add('hat', 0.45, 1 + i / 6)
        if (b % 4 === 3) steps('open', 0.8, '--------------x-')
        steps('rim', 0.6, '---x------x-----')
        if (mod(t, 16) === 0) add('crash', 0.9, 0)
      } else if (e === 1) {
        steps('kick', 0.8, 'x---------------')
        for (let i = 0; i < 4; i++) add('hat', 0.5, i)
        steps('rim', 0.5, '--------x-------')
      }`,
      formula: ['D = 0.9K + 0.8\\,\\text{Clap}_{3} + 0.28H + 0.35\\,\\text{Rim} + \\Rev[\\ldots]\\ \\text{— хлопок на третью долю, хэты восьмыми, дробь тридцать вторыми каждый второй такт}'],
    }),
  },
})

// the classic break, four bars of sixteenths: K kick, S snare, s a ghost note; the ride rings on every eighth
const BREAK = ['K-K-S--s-sKKS--s', 'K-K-S--s-sK---S-', 'K-K-S--s-sKKS--s', '-sKKS--s-sK---S-'].join('')
// a bar put back together from its own eighths (0…7): as played, the second beat again, the first again, the snare first…
const CUTS = [[0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 2, 3, 6, 7], [0, 1, 0, 1, 2, 3, 6, 7], [4, 5, 2, 3, 4, 5, 6, 7], [0, 1, 2, 2, 2, 3, 6, 7], [0, 1, 2, 3, 6, 6, 6, 7], [2, 3, 2, 3, 4, 5, 6, 7]]
defineStyle('breakcore2', {
  family: 'underground', after: 'breakcore',
  names: [['static', 'glass', 'pink', 'lost', 'pale', 'hollow'], ['tears', 'signal', 'rain', 'halo', 'angel', 'memory']],
  borrow: ['bc-static', 'bc-glassrain'],
  style: {
    label: 'Брейккор 2', emoji: '💿', theme: 'dnb', of: 'breakcore', ver: 2, bpm: [164, 184], swing: 0.5, stage: true,
    about: 'версия 2 — брейк, который мог сыграть барабанщик: четыре такта классического брейка (бочка, малый, призрачные ноты, райд восьмыми) режутся по восьмым и собираются в узоры, фраза кончается дробью; над ним — войлочное пианино, пэд и саб, которые почти не двигаются',
    gains: { lead: 1.5, lead2: 0.9, counter: 0.8, chords: 1, pad: 1, arp: 0.8, bass: 1 },
    themes: { 'bc2-halo': 5, 'bc-static': 5, 'bc-glassrain': 5 },
    keys: ['Am', 'Dm', 'Em', 'C#m', 'F#m', 'Bm', 'Gm'], moods: ['dark', 'sad'],
    voicing: 'open', chordRange: [52, 74], bassRange: [28, 40],
    lead: ['felt', 'glassbell'], lead2: ['softlead', 'voice2'], counter: 'softlead', chords: ['feltcomp'], bass: ['reese2'], pad: ['hazepad'], arp: ['softarp', null], texture: ['haze'], kit: 'amen2',
    forms: [
      [['static', 4, 'intro', 0], ['tears', 16, 'theme', 2], ['amen', 16, 'themeB', 3], ['haze', 8, 'bridge', 1], ['chaos', 8, 'solo', 3], ['amen II', 16, 'final', 3], ['signal lost', 4, 'outro', 0]],
      [['static', 4, 'intro', 0], ['amen', 16, 'themeB', 2], ['tears', 16, 'theme', 3], ['haze', 8, 'bridge', 1], ['breath', 4, 'break', 0], ['amen II', 16, 'final', 3, { keyUp: 2 }], ['signal lost', 4, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3.8]], 1: [[0, 0.55, 3.8]], 2: [[0, 0.6, 1.9], [2, 0.5, 1.9]], 3: [[0, 0.6, 1.9], [2, 0.5, 1.9]] },
    bassline: [[0, 'R', 3.6]], arpStep: 0.5, arpPoly: false,
  },
  themes: [{
    // long notes over the rushing break: a fifth, an octave, the sixth leaning on the fifth
    id: 'bc2-halo', title: 'Pale Halo (бледный нимб)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false,
    moods: ['sad', 'dark'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 7, 2], [2, 12, 2], [4, 8, 3], [7, 7, 1], [8, 10, 2], [10, 7, 2], [12, 5, 3], [15, 7, 1],
      [16, 15, 2], [18, 12, 2], [20, 20, 3], [23, 19, 1], [24, 17, 2], [26, 12, 2], [28, 13, 2], [30, 16, 2]],
  }],
  pads: {
    hazepad: sectionPad([['warm', 5, 0, 1], ['ooh', 4, 0, 0.5, { centre: 0.2 }]], { color: '#ffafcc', always: true, ens: 0.4, in: 'space', wet: 0.42, gain: 1.1 }),
  },
  basses: {
    reese2: synthBass('saw', { color: '#5e60ce', accent: 0.2, sub: 0.9, gain: 0.6, cut: 0.95 }),
  },
  kits: {
    amen2: studioKit({
      color: '#ff006e', in: 'room', wet: 0.35, gain: 1,
      imports: ['kick2', 'snareDrum', 'cymbal2'],
      pieces: {
        kick: ["kick2({ f: 62, drop: 2.2, decay: 0.13, click: 0.65 })", 36, 0.9, 0, 0.25],
        snare: ["snareDrum({ tone: 240, cutoff: 1200, decay: 11 })", 38, 0.8, 0.05, 0.4],
        ride: ["cymbal2({ kind: 'ride', tune: 1.08, seed: 381 })", 51, 0.2, 0.3, 0.3],
        crash: ["cymbal2({ kind: 'crash', seed: 383 })", 49, 0.36, -0.15, 0.45],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.6], ['ride', 2.6, 0.25]],
      body: `      const SRC = ${JSON.stringify(BREAK)}, CUTS = ${JSON.stringify(CUTS)}
      if (e >= 2) {
        // the bar of the break this bar plays, and the order of its eighths (the first bar of a phrase as it was played)
        const base = 8 * (b % 4), cut = e >= 3 && b % 4 ? CUTS[floor(hash(b, 71) * CUTS.length)] : CUTS[0]
        for (let q = 0; q < 8; q++) {
          if (fill && q >= 4) break
          for (let h = 0; h < 2; h++) {
            const ch = SRC[2 * (base + cut[q]) + h], p = (2 * q + h) / 4
            if (ch === 'K') add('kick', 1, p)
            else if (ch === 'S') add('snare', 1, p)
            else if (ch === 's') add('snare', 0.4, p)
          }
          add('ride', q % 2 ? 0.55 : 0.8, q / 2)
        }
        // the end of a phrase: sixteenths, then thirty-seconds, rising
        if (fill) { for (let i = 0; i < 4; i++) add('snare', 0.5 + 0.06 * i, 2 + i / 4); for (let i = 0; i < 8; i++) add('snare', 0.6 + 0.05 * i, 3 + i / 8) }
        if (mod(t, 16) === 0) add('crash', 1, 0)
      } else if (e === 1) {
        add('kick', 0.8, 0)
        add('snare', 0.7, 2)
        for (let q = 0; q < 4; q++) add('ride', 0.6, q)
      }`,
      formula: ['\\text{брейк: } K\\text{-}K\\text{-}S\\text{--}s\\text{-}sKKS\\text{--}s\\ \\ldots\\ \\text{(4 такта), такт} = \\text{его же восьмые в порядке } c \\in C,\\quad \\text{в конце фразы дробь } \\tfrac1{16} \\to \\tfrac1{32}'],
    }),
  },
  textures: {
    haze: ambience({ color: '#cdb4db', drone: 0.05, wind: 0.07, windF: [400, 2400], swell: 0.3 }),
  },
})
