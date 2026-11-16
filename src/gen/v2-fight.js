// Test your fight 2 — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// The arena again, clean: the first version's buzzing lead and formant choir are gone (it sounded better without them).
// A soft sine lead or glass bells deep in the hall's echo carry the motif, a warm pad or a glass pad fills the room,
// the stabs are three soft saws a note whose brightness follows the round, the bass is a saw with a closing edge over
// its own sub, the drums stand in a short room: a tight snare with ghosts, bronze hats left and right, a rim, toms,
// a crash on every round; under it all the arena's air — a sub drone, wind, the impact that opens a round, a riser.
import { defineStyle } from './define.js'
import { sectionChords, studioKit, synthBass, ROOMS } from './studio.js'
import { ROLL } from './stage.js'

defineStyle('fight2', {
  family: 'arena', after: 'fight',
  names: [['round', 'neon', 'iron', 'shadow', 'final', 'silent'], ['arena', 'circuit', 'fist', 'dojo', 'tower', 'gauntlet']],
  borrow: ['fight-arena', 'fight-kombat'],
  style: {
    label: 'Test your fight 2', emoji: '🥊', theme: 'arena', of: 'fight', ver: 2, bpm: [126, 140], swing: 0.5, variant: 'danger',
    about: 'версия 2 — чистый звук в большом зале: мягкий синус-лид или стеклянные колокола в эхе, тёплый пэд, саб-бас с закрывающимся краем, мягкие аккордовые удары, барабаны в комнате',
    gains: { lead: 1, lead2: 0.9, counter: 0.9, pad: 1, bass: 1, arp: 1, chords: 1 },
    themes: { 'fight-arena': 5, 'fight-kombat': 5, 'fight2-neon': 5 },
    keys: ['Dm', 'Em', 'Cm', 'Am', 'F#m', 'Gm', 'Bm', 'C#m'], modes: [null, 'phrygian', null, 'dorian'], moods: ['dark', 'game', 'epic'],
    voicing: 'close', chordRange: [52, 72], bassRange: [28, 40],
    lead: ['softlead', 'glassbell'], lead2: ['softpluck', 'felt'], counter: 'glassbell', chords: ['softstabs'], bass: ['fightbass', 'sub2'], pad: ['warmpad', 'glasspad'], arp: ['softarp'], texture: ['arena2'], kit: 'fight2',
    club: { pump: 0.3, kick: { 1: 'x-------x-------', 2: 'x-----x---x-----', 3: 'x---x---x---x---' }, sound: { punch: 5, decay: 0.28, click: 0.4, drive: 2.4 } },
    forms: [
      [['select your fighter', 4, 'intro', 1], ['round 1', 8, 'themeB', 2], ['fight!', 16, 'theme', 3], ['the stage', 8, 'bridge', 1], ['round 2', 8, 'solo', 2], ['build', 4, 'build', 2], ['final round', 16, 'final', 3], ['k.o.', 4, 'outro', 1]],
      [['select your fighter', 4, 'intro', 1], ['fight!', 8, 'theme', 3], ['round 2', 8, 'themeB', 2], ['the stage', 8, 'bridge', 1], ['build', 4, 'build', 2], ['final round', 16, 'final', 3, { keyUp: 1 }], ['k.o.', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  themes: [{
    // a restrained motif over i – VI – III – VII, i – VI – iv – V: a chord tone on every first and third beat
    id: 'fight2-neon', title: 'Neon Corridor (неоновый коридор)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false,
    moods: ['dark', 'game'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 7, 1], [1, 5, 0.5], [1.5, 3, 0.5], [2, 0, 1.5], [3.5, 3, 0.5],
      [4, 3, 1], [5, 8, 0.5], [5.5, 7, 0.5], [6, 8, 1.5], [7.5, 7, 0.5],
      [8, 10, 1], [9, 7, 0.5], [9.5, 5, 0.5], [10, 7, 2],
      [12, 5, 1], [13, 2, 0.5], [13.5, 5, 0.5], [14, 10, 1.5], [15.5, 10, 0.5],
      [16, 12, 1], [17, 10, 0.5], [17.5, 7, 0.5], [18, 3, 1.5], [19.5, 5, 0.5],
      [20, 8, 1], [21, 7, 0.5], [21.5, 5, 0.5], [22, 3, 2],
      [24, 5, 1], [25, 8, 0.5], [25.5, 10, 0.5], [26, 12, 1.5], [27.5, 10, 0.5],
      [28, 13, 1], [29, 16, 0.5], [29.5, 13, 0.5], [30, 7, 2]],
  }],
  chords: {
    // stabs: three soft saws on every note, the room of a club; the rhythm thickens with the round
    softstabs: sectionChords([['saw', 3, 0, 1, { spread: 0.9, vib: 0.3 }]], {
      color: '#ff8fa3', gain: 2.6, in: 'club', gate: 0.55,
      rhythm: { 1: 'x-------x-------', 2: 'x--x--x---x--x--', 3: 'x--x--x-x--x--x-' },
      formula: ['St = \\Rev\\sum_j\\sum_{i=1}^{3} W^{\\text{пила}}_{d}(f_j\\,2^{\\delta_i/1200})\\ \\text{— удары аккордом в синкопах: три мягкие пилы на ноте, яркость растёт с раундом}'],
    }),
  },
  basses: {
    fightbass: synthBass('saw', { color: '#4d7cff', accent: 0.6, sub: 0.7, gain: 0.9 }),
  },
  kits: {
    fight2: studioKit({
      color: '#ff5f6f', in: 'club', wet: 0.5, gain: 1.6,
      imports: ['snareDrum', 'clapDrum', 'cymbal2', 'shakerDrum', 'rimDrum', 'taikoDrum'],
      pieces: {
        snare: ["snareDrum({ tone: 205, cutoff: 1700, decay: 16 })", 38, 0.75, 0.05, 0.5],
        clap: ["clapDrum({ center: 1300 })", 39, 0.7, -0.1, 0.7],
        hat: ["cymbal2({ kind: 'hat', seed: 301 })", 42, 0.3, 0.35, 0.12],
        open: ["cymbal2({ kind: 'open', seed: 302 })", 46, 0.26, 0.35, 0.2],
        shaker: ["shakerDrum()", 70, 0.22, -0.4, 0.15],
        rim: ["rimDrum()", 37, 0.4, -0.3, 0.5],
        tom: ["taikoDrum({ pitch: 105, decay: 0.4, bend: 2, crack: 0.3, boom: 0.2, seed: 87 })", 45, 0.6, 0.2, 0.5],
        crash: ["cymbal2({ kind: 'crash', seed: 303 })", 49, 0.4, -0.2, 0.45],
      },
      graph: [['snare', 3.4, 0.7], ['tom', 3, 0.6], ['rim', 2.6, 0.4]],
      body: `      if (r === 'build') {
        ${ROLL}
        steps('rim', 0.6, 'x--x--x--x--x-x-')
      } else if (e >= 3) {
        steps('snare', 1, '----x--o-o--x--o')
        steps('clap', 0.9, '----x-------x---')
        steps('hat', 0.7, 'x-xxx-xxx-xxx-xx')
        steps('open', 0.7, '--x-------x-----')
        steps('rim', 0.6, '---x-----x----x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('tom', 0.9, '----------x-x-xx')
      } else if (e === 2) {
        steps('snare', 0.9, '----x-------x--o')
        steps('clap', 0.7, '------------x---')
        steps('hat', 0.6, 'x-x-x-x-x-x-x-x-')
        steps('shaker', 0.6, 'xoxoxoxoxoxoxoxo')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('shaker', 0.5, 'x-x-x-x-x-x-x-x-')
        steps('rim', 0.5, '------x-------x-')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`,
      formula: ['D = 0.75S + 0.7\\,\\text{Clap} + 0.3H + 0.26H_o + 0.22\\,\\text{Sh} + 0.4\\,\\text{Rim} + 0.6\\,\\text{Tom} + 0.4\\,\\text{Crash} + \\Rev[\\ldots]', '\\text{брейк: малый с призрачными нотами поверх клубной бочки; тарелки — шум через восемь узких резонансов бронзы 3.1 … 12.7 кГц}'],
    }),
  },
  textures: {
    // the arena's air in the long hall: a drone on the tonic and its fifth, wind, the impact that opens a round (a sub
    // diving 90 → 30 Hz under a burst of noise), a riser through every build-up
    arena2: o => {
      o.need('engine', 'noise', 'osc')
      o.need('instruments', 'hall')
      return `{
  color: '#b5838d',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    return r === 'build' ? -2 + (t / (sectionEnd(x) - s)) ** 2 * 3 : -2.95 + 0.05 * sin(TAU * x / 8)
  },
  formula: ${JSON.stringify(['\\text{гул: } 0.05\\big(\\sin 2\\pi f_T t + 0.5\\sin 2\\pi\\,1.5f_T t\\big),\\quad \\text{удар: } e^{-t/0.4}\\sin 2\\pi\\!\\int\\!(30 + 60e^{-t/0.08}) + e^{-t/0.05}\\LP_{2\\text{к}}\\eta', '\\text{подъём: } u^2\\,\\BP_{400\\cdot 2^{5u}}\\eta\\ \\text{— всё в зале с затуханием 9 с}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(61), wind = filter('bp'), rise = filter('bp'), boomN = filter('lp'), d1 = osc('sine'), d2 = osc('sine'), boom = osc('sine'), level = smooth(900), verb = ${ROOMS.space.replace(/wet: [\d.]+/, 'wet: 0.4')}
    let last = -1
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), T = x * sec, a = level(x < END ? 1 : 0)
      const fd = hz(SCALE[0] - 36, C4), drone = 0.05 * (d1(fd) + 0.5 * d2(fd * 1.5)) * (0.8 + 0.2 * sin((TAU * x) / 16))
      const w = 0.04 * wind(n, 300 * 2 ** sin((TAU * T) / 13), 3)
      const u = r === 'build' ? t / (sectionEnd(x) - s) : 0, rs = 0.4 * u * u * rise(n, 400 * 2 ** (5 * u), 1.5)
      if (e >= 2 && r !== 'build' && t < 0.01 && s !== last) (last = s), boom.reset()
      const bt = e >= 2 && r !== 'build' ? t * sec : 9
      const im = bt < 2 ? exp(-bt / 0.4) * boom(30 + 60 * exp(-bt / 0.08)) + 0.5 * exp(-bt / 0.05) * boomN(n, 2000) : (boom(30), boomN(0, 2000), 0)
      const y = a * (drone + w + rs)
      const [l, rr] = verb(y, y)
      return [l + 0.45 * im, rr + 0.45 * im]
    }
  },
}`
    },
  },
})
