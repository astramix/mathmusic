// ZUNpet 2 and OldZUN-98 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// · ZUNpet 2: the Windows years again, the band as a sound module plays it — the trumpet patch everybody knows (a bright
//   attack with a scoop from below, a wide vibrato that arrives late, a second trumpet a few cents away), a real piano's
//   comping in 3 + 3 + 2 and its sixteenth runs in the spell cards, strings, a round fingered bass in octaves (the first
//   version's picked bass did not fit), a drum kit that rolls its snare into every phrase and crashes on the next bar;
// · OldZUN-98 2: the first version sounded right but always alike. Here the YM2608 has more patches (a detuned FM «saw»
//   lead, an FM organ, FM strings with a slow attack, an FM pipe, a koto-like pluck) and the style has three kinds drawn
//   by the arrangement seed — a stage theme, a boss theme, a title screen — each with its tempo and form, five themes.
// The themes are our own, written in the idiom (sequences on the grid, the royal road VI – VII – i, runs of sixteenths).
import { round } from './util.js'
import { pumpIf } from './recipes.js'
import { defineStyle } from './define.js'
import { keysComp, soloLead, studioKit, tonedArp, tonedBass } from './studio.js'
import { ROLL } from './stage.js'

defineStyle('zunpet2', {
  family: 'retro', after: 'zunpet',
  names: [['scarlet', 'eastern', 'lunar', 'phantom', 'border', 'faithful', 'spring', 'lantern'], ['mansion', 'shrine', 'night', 'dream', 'festival', 'requiem', 'maiden', 'road']],
  borrow: ['zun-shrine', 'zun-moonlit'],
  style: {
    label: 'ZUNpet 2', emoji: '🎺', theme: 'ink', of: 'zunpet', ver: 2, bpm: [150, 172], swing: 0.5, stage: true,
    about: 'версия 2 — труба как в том самом патче: яркая атака с подъездом снизу, широкое позднее вибрато, вторая труба в нескольких центах; настоящий рояль (3 + 3 + 2 и пассажи шестнадцатыми), струнные, круглый пальцевый бас октавами, малый барабан дробью в каждую фразу',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, chords: 1, pad: 1, arp: 1, bass: 1 },
    themes: { 'zun2-lantern': 5, 'zun2-border': 5, 'zun-shrine': 4, 'zun-moonlit': 4 },
    keys: ['F#m', 'Em', 'Bm', 'Dm', 'Am', 'C#m', 'Gm', 'Cm'], moods: ['game', 'epic', 'dark'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 43],
    lead: ['zunpet2'], lead2: ['grand', 'violin2', 'flute2'], counter: 'violin2', chords: ['zunkeys'], bass: ['zunbass2'], pad: ['stringpad', 'airchoir'], arp: ['zunruns', 'harp2'], texture: [null], kit: 'zun2',
    forms: [
      [['prelude', 4, 'intro', 1], ['stage', 8, 'themeB', 2], ['spell card', 16, 'theme', 3], ['interlude', 8, 'bridge', 2], ['last word', 8, 'solo', 3], ['spell card II', 16, 'final', 3, { keyUp: 2 }], ['loop', 4, 'outro', 1]],
      [['prelude', 4, 'intro', 1], ['spell card', 8, 'theme', 2], ['stage', 8, 'themeB', 2], ['boss appears', 8, 'bridge', 2], ['danmaku', 4, 'build', 2], ['final spell', 16, 'final', 3, { keyUp: 1 }], ['loop', 4, 'outro', 1]],
    ],
    drums: {},
    comp: {
      0: [[0, 0.5, 3.5]], 1: [[0, 0.6, 1.4], [1.5, 0.5, 0.5], [2, 0.55, 1.4], [3.5, 0.5, 0.5]],
      2: [[0, 0.7, 0.7], [0.75, 0.55, 0.7], [1.5, 0.65, 0.5], [2, 0.65, 0.7], [2.75, 0.55, 0.7], [3.5, 0.6, 0.5]],
      3: [[0, 0.75, 0.45], [0.5, 0.5, 0.45], [1, 0.6, 0.45], [1.5, 0.7, 0.45], [2, 0.65, 0.45], [2.5, 0.5, 0.45], [3, 0.7, 0.45], [3.5, 0.55, 0.45]],
    },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    // runs of sixteenths round the chord tones, the royal road in minor: VI – VII – i – i, VI – VII – v – i
    id: 'zun2-lantern', title: 'Lantern Road (дорога фонарей)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true,
    moods: ['game', 'epic'], chords: ['VI', 'VII', 'i', 'i', 'VI', 'VII', 'v', 'i'],
    notes: [[0, 12, 0.5], [0.5, 15, 0.5], [1, 12, 0.25], [1.25, 10, 0.25], [1.5, 8, 0.5], [2, 12, 1], [3, 15, 0.5], [3.5, 17, 0.5],
      [4, 17, 0.5], [4.5, 14, 0.5], [5, 17, 0.25], [5.25, 19, 0.25], [5.5, 17, 0.5], [6, 14, 1], [7, 10, 0.5], [7.5, 14, 0.5],
      [8, 15, 0.75], [8.75, 12, 0.25], [9, 7, 0.5], [9.5, 12, 0.5], [10, 15, 0.5], [10.5, 17, 0.5], [11, 19, 1],
      [12, 19, 1.5], [13.5, 17, 0.5], [14, 15, 0.5], [14.5, 12, 0.5], [15, 10, 0.5], [15.5, 7, 0.5],
      [16, 8, 0.5], [16.5, 12, 0.5], [17, 15, 0.25], [17.25, 17, 0.25], [17.5, 15, 0.5], [18, 12, 1], [19, 15, 0.5], [19.5, 20, 0.5],
      [20, 22, 0.5], [20.5, 19, 0.5], [21, 17, 0.25], [21.25, 19, 0.25], [21.5, 17, 0.5], [22, 14, 1], [23, 17, 0.5], [23.5, 14, 0.5],
      [24, 19, 0.75], [24.75, 17, 0.25], [25, 14, 0.5], [25.5, 10, 0.5], [26, 14, 0.5], [26.5, 17, 0.5], [27, 19, 0.5], [27.5, 22, 0.5],
      [28, 24, 2], [30, 19, 1], [31, 12, 1]],
  }, {
    // 3 + 3 + 2 on repeated notes, a circle of fifths (i – iv – VII – III – VI – iv – V – i), the dominant's arpeggio home
    id: 'zun2-border', title: 'Border of Night (граница ночи)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false,
    moods: ['game', 'dark'], chords: ['i', 'iv', 'VII', 'III', 'VI', 'iv', 'V', 'i'],
    notes: [[0, 7, 0.75], [0.75, 7, 0.75], [1.5, 10, 0.5], [2, 12, 0.75], [2.75, 10, 0.75], [3.5, 7, 0.5],
      [4, 8, 0.75], [4.75, 8, 0.75], [5.5, 12, 0.5], [6, 12, 0.75], [6.75, 8, 0.75], [7.5, 5, 0.5],
      [8, 10, 0.75], [8.75, 10, 0.75], [9.5, 14, 0.5], [10, 17, 0.75], [10.75, 14, 0.75], [11.5, 10, 0.5],
      [12, 15, 0.75], [12.75, 12, 0.75], [13.5, 10, 0.5], [14, 7, 1.5], [15.5, 10, 0.5],
      [16, 12, 0.75], [16.75, 12, 0.75], [17.5, 15, 0.5], [18, 20, 0.75], [18.75, 17, 0.75], [19.5, 15, 0.5],
      [20, 17, 0.75], [20.75, 15, 0.75], [21.5, 12, 0.5], [22, 8, 1.5], [23.5, 12, 0.5],
      [24, 13, 0.75], [24.75, 16, 0.75], [25.5, 19, 0.5], [26, 16, 0.5], [26.5, 13, 0.5], [27, 16, 0.5], [27.5, 19, 0.5],
      [28, 24, 1.5], [29.5, 19, 0.5], [30, 12, 2]],
  }],
  leads: {
    zunpet2: soloLead('trumpets', {
      color: '#ffb703', accent: 0.45, scoop: 22, vib: 1.4, unison: 0.5, echo: 0.14, gain: 2.9, in: 'hall', wet: 0.3,
      formula: ['Z = \\Rev\\,\\Dly\\big[W^{\\text{тр}}_{d(\\tau)}(f) + 0.5\\,W^{\\text{тр}}_{d(\\tau)}(1.0023 f)\\big],\\quad d(\\tau) = d_0 + 0.45e^{-\\tau/70\\text{мс}}\\ \\text{— яркая атака; спектр трубы: форманты раструба 1.3 и 2.5 кГц}', 'f = f_0\\,2^{(12.6\\,v(\\tau)\\sin 2\\pi\\,5.6t - 22e^{-\\tau/45\\text{мс}})/1200}\\ \\text{— подъезд снизу на 22 цента, вибрато после 0.3 с}'],
    }),
  },
  counter: { zunpet2: 'violin2' },
  chords: {
    zunkeys: keysComp('grandTone', { color: '#f1e3d3', gain: 0.72, low: 0.9, roll: 0.008, in: 'hall', wet: 0.24, release: 0.2 }),
  },
  basses: {
    zunbass2: tonedBass('fingerBassTone', { color: '#5aa7ff', gain: 0.75, cut: 0.85, in: 'room', wet: 0.1, release: 0.08 }),
  },
  arps: {
    // the piano's right hand in the spell cards: sixteenths up and down two octaves of the chord
    zunruns: tonedArp('grandTone', { color: '#fdfcdc', rate: 4, pattern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 2, 3], up: 12, in: 'hall', wet: 0.26, gain: 0.9, roles: ['theme', 'final', 'solo'], from: 3, life: 2, release: 0.15, hold: 0.9, accent: 4, spread: 0.3 }),
  },
  kits: {
    zun2: studioKit({
      color: '#ff6f91', in: 'room', wet: 0.5, gain: 0.8,
      imports: ['kick2', 'snareDrum', 'cymbal2', 'taikoDrum'],
      pieces: {
        kick: ["kick2({ f: 55, drop: 2.2, decay: 0.2, click: 0.55 })", 36, 0.85, 0, 0.2],
        snare: ["snareDrum({ tone: 210, cutoff: 1500, decay: 14 })", 38, 0.7, 0.05, 0.45],
        hat: ["cymbal2({ kind: 'hat', seed: 331 })", 42, 0.3, 0.3, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 332 })", 46, 0.25, 0.3, 0.2],
        ride: ["cymbal2({ kind: 'ride', seed: 333 })", 51, 0.22, -0.35, 0.25],
        tomH: ["taikoDrum({ pitch: 150, decay: 0.3, bend: 2, crack: 0.3, boom: 0.15, seed: 81 })", 48, 0.5, -0.3, 0.5],
        tomL: ["taikoDrum({ pitch: 98, decay: 0.38, bend: 2, crack: 0.3, boom: 0.2, seed: 83 })", 45, 0.55, 0.3, 0.5],
        crash: ["cymbal2({ kind: 'crash', seed: 334 })", 49, 0.42, -0.15, 0.4],
      },
      graph: [['kick', 3.6, 0.6], ['snare', 3.2, 0.6], ['crash', 4, 0.4]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x-----x-x-x---x-')
        steps('snare', 1, fill ? '----x---x-xxxxxx' : b % 4 === 3 ? '----x-------xxxx' : '----x-------x---')
        steps('hat', 0.8, 'x-x-x-x-x-x-x-x-')
        if (!fill && b % 2) steps('open', 0.8, '--------------x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) { steps('tomH', 0.9, '--------x--x----'); steps('tomL', 0.9, '-------------x-x') }
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.9, fill ? '----x-------xxxx' : '----x-------x---')
        steps('hat', 0.7, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('ride', 0.7, 'x---x---x---x---')
        steps('kick', 0.7, 'x-------x-------')
        steps('hat', 0.5, '----x-------x---')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`,
      formula: ['D = 0.85K + 0.7S + 0.3H + 0.22\\,\\text{Ride} + 0.5T + 0.42\\,\\text{Crash} + \\Rev[\\ldots]\\ \\text{— дробь малого в конец каждой фразы и тарелка на следующую долю}'],
    }),
  },
})

// ---- OldZUN-98 2: more of the chip -------------------------------------------------------------------------------------
// an FM channel on the melody: opn params as text, a delayed vibrato, the chip's dotted echo
const opnLead = (params, { color, vib = 0.2, echo = 0.2, gain = 1, dn = 0, formula }) => o => {
  o.need('instruments', 'opn')
  return `{
  color: '${color}',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [${60 + dn} + m.n] : [] },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, fm = opn(${params})
    const echo = delay({ time: sec * 0.75, feedback: 0.3, wet: ${echo} }), verb = reverb({ room: 0.7, damp: 0.45, wet: 0.18 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec, held = m ? m.τ * sec : 0
      if (m) n = m.n
      const vib = ${vib} * Math.min(1, Math.max(0, held - 0.3) / 0.3) * sin(TAU * 5.8 * t)
      return verb(...echo(...pan(${round(gain * o.gain)} * fm(hz(n + ${dn} + vib, C4), !!m && m.u < 0.92, 0.85)${pumpIf(o)}, ${o.pan})))
    }
  },
}`
}
// four FM channels holding the chord (the chip's «strings» and «organ»)
const opnChords = (params, { color, gain = 1, formula }) => o => {
  o.need('instruments', 'opn')
  return `{
  color: '${color}',
  graph: x => (chordAt(x) && energy(x) >= 1 && x < END - 0.5 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 1 && x < END - 0.5 && mod(x, chordAt(x)[1]) < chordAt(x)[1] - 0.1 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(formula)},
  audio() {
    const ch = [0, 1, 2, 3].map(j => opn(${params})), lp = filter('lp'), verb = reverb({ room: 0.78, damp: 0.45, wet: 0.24 })
    let v = [57, 60, 64, 69]
    return x => {
      const c = chordAt(x), on = !!c && energy(x) >= 1 && x < END - 0.5
      if (c) v = c[3]
      let y = 0
      for (let j = 0; j < 4; j++) y += ch[j](hz(v[j % v.length] - 60, C4), on, 0.7)
      return verb(...pan(${round(0.3 * gain * (o.gain ?? 1))} * lp(y, 8000)${pumpIf(o)}, 0.15))
    }
  },
}`
}
const CHIP_FORMS = {
  stage: [
    [['title', 4, 'intro', 1], ['stage', 16, 'theme', 2], ['midboss', 8, 'themeB', 2], ['interlude', 8, 'bridge', 1], ['stage II', 16, 'final', 3], ['clear', 4, 'outro', 1]],
    [['title', 4, 'intro', 1], ['stage', 8, 'themeB', 2], ['flight', 16, 'theme', 2], ['clouds', 8, 'bridge', 1], ['extra', 8, 'solo', 2], ['flight II', 16, 'final', 3, { keyUp: 2 }], ['clear', 4, 'outro', 1]],
  ],
  boss: [
    [['warning', 4, 'intro', 1], ['boss', 16, 'theme', 3], ['pattern', 8, 'themeB', 2], ['interlude', 8, 'bridge', 1], ['danmaku', 4, 'build', 2], ['boss II', 16, 'final', 3, { keyUp: 2 }], ['ending', 4, 'outro', 1]],
    [['warning', 4, 'intro', 1], ['pattern', 8, 'themeB', 2], ['boss', 16, 'theme', 3], ['phantasm', 8, 'solo', 3], ['interlude', 8, 'bridge', 1], ['boss II', 16, 'final', 3], ['ending', 4, 'outro', 1]],
  ],
  title: [
    [['disk boot', 4, 'intro', 0], ['title', 16, 'theme', 1], ['story', 8, 'themeB', 1], ['name entry', 8, 'bridge', 1], ['title II', 16, 'final', 2], ['staff roll', 8, 'themeB', 2], ['the end', 4, 'outro', 0]],
  ],
}
defineStyle('oldzun2', {
  family: 'retro', after: 'oldzun',
  names: [['lotus', 'maple', 'mystic', 'twilight', 'crystal', 'retro', 'sealed', 'phantom'], ['bay', 'mirage', 'garden', 'square', 'disk', 'reverie', 'tower', 'clockwork']],
  borrow: ['pc98-lotus', 'pc98-maple'],
  style: {
    label: 'OldZUN-98 2', emoji: '💾', theme: 'chip', of: 'oldzun', ver: 2, bpm: [128, 156], swing: 0.5, stage: true,
    about: 'версия 2 — больше чипа и больше разного: к FM-брассу, органу-язычку и колоколам добавлены FM-«пила» в расстройке, FM-орган, FM-струнные, FM-дудка и щипок-кото; три рода песен — тема уровня, босс и титульный экран, — у каждого свой темп и форма; пять тем',
    gains: { lead: 1, lead2: 1.1, counter: 1.3, arp: 1.9, bass: 0.35, chords: 1 },
    themes: { 'pc98b-sakura': 5, 'pc98b-clock': 5, 'pc98b-tower': 5, 'pc98-lotus': 4, 'pc98-maple': 4 },
    keys: ['Ebm', 'Em', 'Dm', 'Am', 'Cm', 'Gm', 'F#m', 'Bm'], moods: ['game', 'dark', 'epic'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 43],
    lead: ['fmsaw', 'fmbrass', 'fmlead', 'fmorgan'], lead2: ['fmbell', 'fmpipe', 'fmkoto', 'ssg'], counter: 'ssg', chords: ['fmepiano', 'fmstrings'], bass: ['fmbass'], pad: [null], arp: ['ssgarp', 'ssgarp', null], texture: [null], kit: 'opna',
    forms: CHIP_FORMS.boss,
    kinds: [
      { kind: 'stage', bpm: [126, 144], forms: CHIP_FORMS.stage },
      { kind: 'boss', bpm: [148, 168], forms: CHIP_FORMS.boss },
      { kind: 'title', bpm: [100, 118], forms: CHIP_FORMS.title, arp: [null, 'ssgarp'], lead: ['fmpipe', 'fmorgan', 'fmlead'], lead2: ['fmbell', 'fmkoto'] },
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3.8]], 1: [[0, 0.55, 1.5], [2, 0.45, 1.5]], 2: [[0, 0.6, 0.7], [0.75, 0.5, 0.6], [1.5, 0.55, 1], [3, 0.5, 0.4], [3.5, 0.5, 0.4]], 3: [[0, 0.65, 0.4], [0.5, 0.5, 0.4], [1, 0.55, 0.4], [1.5, 0.5, 0.4], [2, 0.6, 0.4], [2.5, 0.5, 0.4], [3, 0.55, 0.4], [3.5, 0.5, 0.4]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    // a sequence on the grid: the same figure a step higher each bar, then down the circle to the dominant
    id: 'pc98b-sakura', title: 'Sakura Stage (уровень сакуры)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: false,
    moods: ['game', 'epic'], chords: ['i', 'VI', 'VII', 'i', 'iv', 'VII', 'III', 'V'],
    notes: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 10, 0.5], [1.5, 12, 0.5], [2, 7, 1], [3, 3, 0.5], [3.5, 7, 0.5],
      [4, 8, 0.5], [4.5, 8, 0.5], [5, 12, 0.5], [5.5, 15, 0.5], [6, 12, 1], [7, 8, 0.5], [7.5, 12, 0.5],
      [8, 10, 0.5], [8.5, 10, 0.5], [9, 14, 0.5], [9.5, 17, 0.5], [10, 14, 1], [11, 10, 0.5], [11.5, 14, 0.5],
      [12, 15, 1], [13, 14, 0.5], [13.5, 12, 0.5], [14, 7, 2],
      [16, 12, 0.5], [16.5, 12, 0.5], [17, 8, 0.5], [17.5, 5, 0.5], [18, 8, 1], [19, 12, 0.5], [19.5, 17, 0.5],
      [20, 14, 0.5], [20.5, 14, 0.5], [21, 10, 0.5], [21.5, 5, 0.5], [22, 10, 1], [23, 14, 0.5], [23.5, 17, 0.5],
      [24, 19, 0.5], [24.5, 15, 0.5], [25, 10, 0.5], [25.5, 15, 0.5], [26, 19, 1], [27, 22, 0.5], [27.5, 19, 0.5],
      [28, 18, 1], [29, 19, 0.5], [29.5, 18, 0.5], [30, 11, 2]],
  }, {
    // clockwork: a fifth ticking in sixteenths, an arpeggio up the chord, the same a step lower
    id: 'pc98b-clock', title: 'Clockwork Mirage (заводной мираж)', key: 'Am', base: 'A3', feel: 'straight', per: 4, modal: false,
    moods: ['game', 'dark'], chords: ['i', 'i', 'VII', 'VI', 'i', 'i', 'VII', 'V'],
    notes: [[0, 12, 0.25], [0.25, 7, 0.25], [0.5, 12, 0.25], [0.75, 7, 0.25], [1, 15, 0.5], [1.5, 12, 0.5], [2, 7, 0.5], [2.5, 3, 0.5], [3, 7, 1],
      [4, 12, 0.25], [4.25, 7, 0.25], [4.5, 12, 0.25], [4.75, 7, 0.25], [5, 15, 0.5], [5.5, 19, 0.5], [6, 15, 1], [7, 12, 1],
      [8, 10, 0.25], [8.25, 5, 0.25], [8.5, 10, 0.25], [8.75, 5, 0.25], [9, 14, 0.5], [9.5, 10, 0.5], [10, 5, 0.5], [10.5, 2, 0.5], [11, 5, 1],
      [12, 8, 0.25], [12.25, 3, 0.25], [12.5, 8, 0.25], [12.75, 3, 0.25], [13, 12, 0.5], [13.5, 15, 0.5], [14, 12, 1], [15, 8, 1],
      [16, 12, 0.5], [16.5, 15, 0.5], [17, 19, 0.5], [17.5, 15, 0.5], [18, 12, 0.5], [18.5, 7, 0.5], [19, 12, 1],
      [20, 15, 0.5], [20.5, 19, 0.5], [21, 24, 0.5], [21.5, 19, 0.5], [22, 15, 1], [23, 12, 1],
      [24, 14, 0.5], [24.5, 17, 0.5], [25, 22, 0.5], [25.5, 17, 0.5], [26, 14, 0.5], [26.5, 10, 0.5], [27, 14, 1],
      [28, 11, 1], [29, 14, 0.5], [29.5, 16, 0.5], [30, 19, 2]],
  }, {
    // a title screen: slow dotted steps up the tonic chord and down again (i – VII – VI – VII, … – V)
    id: 'pc98b-tower', title: 'Sealed Tower (запечатанная башня)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false,
    moods: ['dark', 'game'], chords: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'],
    notes: [[0, 0, 1.5], [1.5, 3, 0.5], [2, 7, 1.5], [3.5, 5, 0.5], [4, 5, 1.5], [5.5, 2, 0.5], [6, 10, 2], [8, 8, 1.5], [9.5, 7, 0.5], [10, 3, 1], [11, 0, 1], [12, 2, 1.5], [13.5, 5, 0.5], [14, 10, 2],
      [16, 12, 1.5], [17.5, 10, 0.5], [18, 7, 1.5], [19.5, 3, 0.5], [20, 5, 1], [21, 7, 0.5], [21.5, 10, 0.5], [22, 14, 2], [24, 15, 1.5], [25.5, 12, 0.5], [26, 8, 1], [27, 12, 1], [28, 13, 1.5], [29.5, 16, 0.5], [30, 7, 2]],
  }],
  leads: {
    // two pairs of operators 1 : 1 a few cents apart, the modulators fed back: the chip's «saw»
    fmsaw: opnLead("{ algo: 4, ratio: [1, 1, 1, 1], level: [1.9, 0.5, 1.7, 0.5], fb: 1.3, detune: [0, -5, 0, 6], env: [[0.002, 0.6, 0.75, 0.1], [0.002, 0.8, 0.9, 0.1], [0.002, 0.6, 0.75, 0.1], [0.002, 0.8, 0.9, 0.1]], gain: 0.45 }", {
      color: '#ff8fa3', vib: 0.22, formula: ['\\text{FM-«пила», алгоритм 4: } y = \\textstyle\\sum_{p=1}^{2} 0.5\\,e\\sin\\!\\big(\\varphi_p + 1.8\\,e\\sin(\\varphi_p + 1.3\\,y_1)\\big),\\quad \\varphi_{1,2} = 2\\pi f\\,2^{\\mp 5/1200}t\\ \\text{— две пары в расстройке}'],
    }),
    // all four operators sound: the drawbars 1, 2, 3, 4 — the chip's organ
    fmorgan: opnLead("{ algo: 7, ratio: [1, 2, 3, 4], level: [0.55, 0.35, 0.2, 0.16], fb: 0.7, detune: [0, 2, -2, 3], env: [[0.004, 0.3, 0.9, 0.08], [0.004, 0.3, 0.85, 0.08], [0.004, 0.25, 0.7, 0.08], [0.004, 0.2, 0.6, 0.08]], gain: 0.5 }", {
      color: '#ffd6a5', vib: 0.15, formula: ['\\text{FM-орган, алгоритм 7: } y = \\textstyle\\sum_{k=1}^{4} L_k e_k\\sin k\\varphi,\\quad L = (0.55,\\ 0.35,\\ 0.2,\\ 0.16)\\ \\text{— четыре несущие как регистры}'],
    }),
    // a pipe: almost a sine, the modulator only breathes on the attack
    fmpipe: opnLead("{ algo: 4, ratio: [1, 1, 2, 1], level: [0.5, 0.75, 0.25, 0.2], fb: 0.3, env: [[0.01, 0.12, 0.25, 0.1], [0.02, 0.6, 0.9, 0.12], [0.005, 0.08, 0.1, 0.08], [0.02, 0.4, 0.7, 0.12]], gain: 0.5 }", {
      color: '#c8f7c5', vib: 0.25, echo: 0.26, gain: 0.8, formula: ['\\text{FM-дудка, алгоритм 4: } y = 0.75e_2\\sin\\!\\big(\\varphi + 0.5e_1\\sin\\varphi\\big) + 0.2e_4\\sin\\!\\big(\\varphi + 0.25e_3\\sin 2\\varphi\\big)\\ \\text{— модулятор дышит только на атаке}'],
    }),
    // a pluck: a 7 : 1 modulator that is gone in 60 ms over a decaying pair — a koto on a chip
    fmkoto: opnLead("{ algo: 4, ratio: [1, 1, 7, 1], level: [1.4, 0.6, 1.1, 0.35], fb: 0.5, env: [[0.001, 0.25, 0.1, 0.1], [0.001, 0.9, 0.15, 0.2], [0.001, 0.06, 0, 0.05], [0.001, 0.5, 0.05, 0.2]], gain: 0.5 }", {
      color: '#f4d35e', vib: 0, echo: 0.24, formula: ['\\text{FM-кото, алгоритм 4: } y = 0.6e_2\\sin\\!\\big(\\varphi + 1.4e_1\\sin\\varphi\\big) + 0.35e_4\\sin\\!\\big(\\varphi + 1.1e^{-t/60\\text{мс}}\\sin 7\\varphi\\big)'],
    }),
  },
  counter: { fmsaw: 'ssg', fmorgan: 'ssg', fmpipe: 'ssg', fmkoto: 'fmpipe' },
  chords: {
    // the chip's strings: four channels holding the chord, a slow attack, a 1 : 2 modulator, a few cents apart
    fmstrings: opnChords("{ algo: 4, ratio: [1, 1, 2, 1], level: [1.1, 0.5, 0.8, 0.3], fb: 0.9, detune: [0, 2 * j - 3, 0, 3 - 2 * j], env: [[0.09, 0.8, 0.8, 0.25], [0.12, 1, 0.9, 0.3], [0.09, 0.6, 0.6, 0.25], [0.12, 1, 0.9, 0.3]], gain: 0.5 }", {
      color: '#ffcf9f', gain: 0.8, formula: ['\\text{FM-струнные: четыре канала держат аккорд, } y_j = 0.5e\\sin\\!\\big(\\varphi_j + 1.1e\\sin(\\varphi_j + 0.9y_1)\\big) + 0.3e\\sin\\!\\big(\\varphi_j + 0.8e\\sin 2\\varphi_j\\big),\\ \\text{атака 0.12 с}'],
    }),
  },
})
