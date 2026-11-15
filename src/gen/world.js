// Recipes of Artifact Temple and Brinstar Depths: saron, bonang, pan pipes, fretless bass, the tribal kit, the jungle — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, COUNTER_VOICE, FX, KITS, LEADS, TEXTURES, bassData, pumpIf, struck } from './recipes.js'
import { sustainedLead } from './orchestra.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// ---- Artifact Temple: the Chozo halls in slendro — bronze over the machines ------------------------------------------------
// the saron: a bronze key (a beating pair, the ombak) struck with a wooden mallet
LEADS.saron = o => struck('saronTone', ['saronTone'], {
  release: 0.6, life: 4, gain: 0.4, fx: FX.echoHall, extra: pumpIf(o),
  formula: ['Sa(f,t,v) = v\\big(e^{-t/1.6}\\sin 2\\pi gt + 0.35e^{-t/0.5}\\sin 2\\pi\\,2.71gt + 0.12e^{-t/0.18}\\sin 2\\pi\\,5.34gt\\big),\\quad g = f \\pm 2.25\\ \\text{Гц (омбак)}'],
})({ ...o, color: '#e9c46a' })
// the bonang's interlocking over the chords: two rows of kettles, one on the beats and the off-beats, the other the notes
// between (imbal) — eighths, sixteenths in the loud parts — each kettle a beating pair, an octave up, left and right
ARPS.bonang = o => {
  o.need('instruments', 'bonangTone')
  return `(() => {
  const FIG = [0, 2, 1, 2, 3, 2, 1, 0]
  const bonAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1 || role(x) === 'outro') return null
    const step = e >= 3 ? 0.25 : 0.5, j = floor(x / step + 1e-9), v = c[3]
    return { n: v[FIG[mod(j, 8)] % v.length] + 12, at: j * step, vel: (mod(j, 2) ? 0.5 : 0.75) * (0.8 + (0.2 * e) / 3), side: mod(j, 2) }
  }
  return {
  color: '#e9c46a',
  graph: x => (bonAt(x) && x - bonAt(x).at < 0.15 ? ${o.lane[0]} + (bonAt(x).n - 55) / 40 : null),
  midi: x => (bonAt(x) && x - bonAt(x).at < 0.2 ? [bonAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{бонанг, имбал: } n_j = v_{(0,2,1,2,3,2,1,0)_{j \\bmod 8}} + 12,\\ \\text{чётные — слева, нечётные — справа}', 'Bo(f,t,v) = v\\big(e^{-t/1.1}\\sin 2\\pi gt + 0.3e^{-t/0.4}\\sin 2\\pi\\,2.41gt + 0.12e^{-t/0.2}\\sin 2\\pi\\,3.89gt\\big),\\ g = f \\pm 1.6\\ \\text{Гц}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, L = poly(bonangTone, { release: 0.3, life: 2.5, max: 8 }), R = poly(bonangTone, { release: 0.3, life: 2.5, max: 8 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.38 })
    return x => {
      const m = bonAt(x)
      if (m && fire(m.at)) (m.side ? R : L).hit(hz(m.n - 60, C4), m.vel, 0.5)
      const k = ${round(0.3 * (o.gain ?? 1))}${pumpIf(o)}, l = L(), r = R()
      return verb(k * (0.8 * l + 0.25 * r), k * (0.25 * l + 0.8 * r))
    }
  },
}})()`
}
// the temple: the great gong on the tonic closing every gongan (32 beats) and opening each section that brings the
// music in, the kempul on the chord's root every eight beats when it plays, a sub drone far below, the wind in the halls
TEXTURES.temple = o => {
  o.need('instruments', 'gongTone', 'kempulTone')
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#c9a227',
  graph: x => (x < END ? -2.95 + 0.06 * sin(TAU * x / 8) : null),
  formula: ${JSON.stringify(['\\text{гонг-агенг на тонике каждые 32 доли (гонган), кемпул на корне аккорда каждые 8;}\\ \\text{гул: } 0.08\\sin 2\\pi\\tfrac{f_T}{4}t;\\ \\text{ветер: } \\BP_{250\\cdot 2^{\\sin(2\\pi T/19)}}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, gong = poly(gongTone, { release: 2, life: 9, max: 3 }), kempul = poly(kempulTone, { release: 1, life: 5, max: 4 }), fireG = trigger(), fireS = trigger(), fireK = trigger()
    const η = noise(53), wind = filter('bp'), sub = osc('sine'), level = smooth(800), verb = reverb({ room: 0.95, damp: 0.3, wet: 0.5 })
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, c = chordAt(x), T = x * sec, a = level(x < END ? 1 : 0)
      if (x < END && mod(x, 32) < 0.1 && fireG(floor(x / 32))) gong.hit(hz(SCALE[0] - 24, C4), 0.9, 6)
      if (x < END && e >= 2 && t < 0.1 && fireS(s)) gong.hit(hz(SCALE[0] - 24, C4), 0.7, 6)
      if (x < END && e >= 2 && c && mod(x, 8) >= 4 && mod(x, 8) < 4.1 && fireK(floor(x / 8))) kempul.hit(hz(c[2] + 12 - 60, C4), 0.7, 3)
      const drone = 0.08 * sub(hz(SCALE[0] - 36, C4)) * (0.8 + 0.2 * sin((TAU * x) / 12)), w = 0.05 * wind(η(), 250 * 2 ** sin((TAU * T) / 19), 3)
      const y = ${round(o.gain ?? 1)} * (0.14 * gong() + 0.12 * kempul() + a * (drone + w))
      return verb(...pan(y, 0.2 * sin((TAU * x) / 11)))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { saron: 'pluck' })

// ---- Brinstar Depths: the deep jungle of a 16-bit adventure — pan pipes and marimba over a slow tribal pulse -----------
// panpipe: a stopped pipe (odd harmonics), breath through the tube, a chiff and a scoop into every note, a late vibrato
LEADS.panpipe = sustainedLead({
  make: 'panpipe({ breath: 0.14 })', imports: ['panpipe'], color: '#c8f0b0', gain: 0.5, fx: 'echoHall',
  formula: ['Pp = a\\big(0.7\\sin 2\\pi\\!\\int\\! g + 0.16\\sin 6\\pi\\!\\int\\! g + 0.05\\sin 10\\pi\\!\\int\\! g + 0.14\\,\\BP_{g}\\,\\eta + 0.3e^{-30t}\\,\\HP_{2500}\\,\\eta\\big)', 'g = f\\cdot 2^{\\,(-0.35e^{-t/0.04} + 0.14\\,s(t)\\sin(2\\pi\\cdot 4.8T))/12}\\quad\\text{— закрытая трубка: нечётные гармоники}'],
})
Object.assign(COUNTER_VOICE, { panpipe: 'vibes' })
// the fretless bass of a 16-bit score: a round string, played long and soft, the notes of the line a little apart
BASSES.fretless = o => {
  o.need('instruments', 'electricBass')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['y = \\LP_{2400}\\,B(f),\\quad B \\text{ — мягкая струна (Карплус — Стронг), бэндж без слэпа, глушится в конце ноты}'])},
  audio({ bpm }) {
    const b = electricBass({ bright: 0.22, sustain: 1.6, seed: 31 }), fire = trigger(), lp = filter('lp')
    let end = -1
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) {
        b.hit(hz(m.n - 60, C4), mod(m.at, 4) === 0 ? 0.9 : 0.7)
        end = m.at + m.d * 0.9
      }
      if (end > 0 && x >= end) (b.mute(0.06), (end = -1))
      return ${round(0.95 * (o.gain ?? 1))} * lp(b(), 2400)${pumpIf(o)}
    }
  },
}})()`
}
// the tribal kit: a soft kick on the tonic's octave, three toms and a bongo, a rim, a shaker; slow, in half time —
// the pulse of the depths; a roll of toms doubling through a build-up
KITS.tribal = o => {
  o.need('instruments', 'kickDrum', 'taikoDrum', 'rimDrum', 'shakerDrum')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL.replace("'snare'", "'tomM'")}
        steps('kick', 0.8, 'x-----x---x-----')
      } else if (e >= 3) {
        steps('kick', 1, 'x--x----x-x-----')
        steps('tomL', 0.75, '------x-------x-')
        steps('tomM', 0.6, '----x-------x-x-')
        steps('tomH', 0.5, '--x---------x---')
        steps('rim', 0.55, '----x-------x---')
        steps('bongo', 0.4, 'x-xx-x-xx-x-xx-x')
        steps('shaker', 0.3, 'xxxxxxxxxxxxxxxx')
        if (fill) steps('tomH', 0.7, '------xxx-xxxxxx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-----x---x-----')
        steps('tomL', 0.65, '------x-------x-')
        steps('bongo', 0.35, '--x--x--x--x--x-')
        steps('shaker', 0.25, 'x-x-x-x-x-x-x-x-')
        steps('rim', 0.4, '------------x---')
      } else if (e === 1) {
        steps('kick', 0.6, 'x-----------x---')
        steps('shaker', 0.2, '--x---x---x---x-')
      } else if (e >= 0) {
        steps('tomL', 0.45, 'x-------------x-')
      }`)}
  return {
  color: '#d9a05b',
  ${stageGraph([['kick', 3.5, 0.6], ['tomL', 3.1, 0.6], ['tomH', 2.8, 0.5], ['rim', 3.3, 0.4]])}
  ${stageMidi([['kick', 36], ['rim', 37], ['tomL', 41], ['tomM', 45], ['tomH', 48], ['bongo', 60], ['shaker', 70]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.5K + 0.45\\,T_{82} + 0.4\\,T_{118} + 0.35\\,T_{170} + 0.25\\,\\text{Bongo} + 0.25R + 0.12\\,\\text{Shk}\\big],\\quad T_p = e^{-t/d}\\sin 2\\pi\\!\\int\\! p\\,(1 + 0.26e^{-t/0.03})', 'K = e^{-6.5\\tau}\\tanh\\!\\big(1.8\\sin 2\\pi\\!\\int\\!(50 + 80e^{-32\\tau})\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 130, sweep: 32, decay: 6.5, drive: 1.8 })
    const tomL = taikoDrum({ pitch: 82, decay: 0.55, bend: 4, crack: 0.25, boom: 0.35, seed: 41 }), tomM = taikoDrum({ pitch: 118, decay: 0.4, bend: 4, crack: 0.3, boom: 0.2, seed: 42 })
    const tomH = taikoDrum({ pitch: 170, decay: 0.3, bend: 3, crack: 0.35, boom: 0.1, seed: 43 }), bongo = taikoDrum({ pitch: 330, decay: 0.16, bend: 2, crack: 0.5, boom: 0, seed: 44 })
    const rim = rimDrum(), shaker = shakerDrum(), room = reverb({ room: 0.8, damp: 0.35, wet: 0.3 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.5 * at('kick', kick, x, 1) + 0.45 * at('tomL', tomL, x) + 0.4 * at('tomM', tomM, x) + 0.35 * at('tomH', tomH, x) + 0.25 * at('bongo', bongo, x) + 0.25 * at('rim', rim, x) + 0.12 * at('shaker', shaker, x)
      return room(...pan(1.1 * y, 0))
    }
  },
}})()`
}
// the jungle's night: bubbles rising in a swamp, insects trilling (a band of noise chopped at 31 Hz), a vent hissing every
// sixteen beats now and then, a creature groaning far below, a low rumble — all in a long wet echo
TEXTURES.jungle = o => {
  o.need('engine', 'noise', 'PI')
  return `{
  color: '#4fb286',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 6) : null),
  formula: ${JSON.stringify(['\\text{пузыри: } e^{-t/0.05}\\sin 2\\pi f(1 + 5t)t,\\ f \\in [280, 980];\\quad \\text{насекомые: } \\BP_{5200}^{Q=18}\\eta\\cdot\\tfrac{1 + \\sin 2\\pi\\,31T}{2};\\quad \\text{пар: } \\BP_{2200}\\eta\\,e^{-t/0.8}', '\\text{зверь: } \\sin^2\\!\\tfrac{\\pi t}{2.5}\\,\\LP_{400}\\sin 2\\pi\\big(110t - 8t^2\\big);\\quad \\text{гул: } \\LP_{70}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(53), bug = filter('bp'), bug2 = filter('bp'), steam = filter('bp'), rumble = filter('lp'), cry = filter('lp')
    const echo = delay({ time: sec * 0.75, feedback: 0.5, wet: 0.5 }), verb = reverb({ room: 0.95, damp: 0.3, wet: 0.55 })
    return x => {
      const n = η(), T = x * sec, a = x < END ? 1 : 0
      let bub = 0, bp = 0
      for (const k of [0, 1, 2]) {
        const j = floor(x) - k, at = j + 0.9 * hash(j, 31), t = (x - at) * sec
        if (hash(j, 33) < 0.4 && t >= 0 && t < 0.25) { const f = 280 + 700 * hash(j, 35); bub += exp(-t / 0.05) * sin(TAU * f * (1 + 5 * t) * t) * Math.min(1, t / 0.002); bp = 2 * hash(j, 37) - 1 }
      }
      const chirp = (0.5 + 0.5 * sin(TAU * 31 * T)) * (0.5 + 0.5 * sin(TAU * 0.11 * T + 1)), bugs = chirp * (bug(n, 5200 + 400 * sin(TAU * 0.3 * T), 18) + 0.7 * bug2(n, 4300, 14))
      const sj = floor(x / 16), st = (x - 16 * sj) * sec, hiss = steam(n, 2200, 1.5) * (hash(sj, 41) < 0.5 ? exp(-st / 0.8) * Math.min(1, st / 0.05) : 0)
      const cj = floor(x / 32), ct = (x - 32 * cj) * sec, call = hash(cj, 43) < 0.5 && ct < 2.5 ? sin((PI * ct) / 2.5) ** 2 * sin(TAU * (110 * ct - 8 * ct * ct)) : 0
      const [l, r] = echo(...pan(0.09 * a * bub, bp))
      const y = a * (0.02 * bugs + 0.05 * hiss + 0.09 * cry(call, 400) + 0.04 * rumble(n, 70))
      return verb(l + y, r + y)
    }
  },
}`
}
