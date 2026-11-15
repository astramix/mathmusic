// Recipes of heaven and hell — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, KITS, LEADS, PADS, TEXTURES, graphLead, pumpIf, struck } from './recipes.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// ---- Heaven and hell: the angel's dream of Blue Hour (its choir, the angel's voice, glints, the hum, the pad) and its dark
// twin (the crimson dream: the choir far below, a heart, fire, wind, the bell of the pit) -------------------------------
FX.heaven = { init: ', echo = delay({ time: sec * 1.5, feedback: 0.34, wet: 0.2 }), verb = reverb({ room: 0.95, damp: 0.22, wet: 0.5 })', out: (y, p) => `verb(...echo(...pan(${y}, ${p})))` }
FX.pit = { init: ', verb = reverb({ room: 0.96, damp: 0.4, wet: 0.5 })', out: (y, p) => `verb(...pan(${y}, ${p}))` }
// the angel's voice: wordless syllables, one a note (a o e a u i o), the vowel gliding from the last one in 70 ms; two
// singers ±4 ¢, a scoop into the note, a late vibrato, a second voice an octave down on «о»; a long hall, a slow echo
LEADS.seraph = o => {
  o.need('instruments', 'seraph', 'DREAM_VOWELS', 'blend')
  return `{
  color: '#fff3d0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['A = \\Rev\\,\\Dly\\Big[\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{F_i(\\tau)}\\big(\\saw(g^-) + \\saw(g^+)\\big) + \\tfrac12\\sum_i \\tfrac{G_i}{Q_i}\\BP_{F^{o}_i}\\saw(g/2)\\Big],\\quad Q = (7, 11, 11),\\ G = (1, 0.42, 0.18)', 'g = f\\cdot 2^{-0.33e^{-t/35\\text{мс}}/12}\\big(1 + 0.007\\min(1, t/0.3)\\sin 2\\pi\\,5.1T\\big),\\quad F(\\tau) \\text{ — слог на каждую ноту: а, о, э, а, у, и, о}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, v = seraph(), echo = delay({ time: sec * 1.5, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.95, damp: 0.22, wet: 0.5 })
    const SYL = ['a', 'o', 'e', 'a', 'u', 'i', 'o']
    let n = 0, at = -1, F0 = DREAM_VOWELS.u, F1 = DREAM_VOWELS.a
    return x => {
      const m = ${o.at}(x)
      if (m) { n = m.n; if (m.at !== at) { at = m.at; F0 = F1; F1 = DREAM_VOWELS[SYL[floor(7 * hash(floor(4 * m.at), 53))]] } }
      const F = blend(F0, F1, 1 - exp((-(m ? m.τ : 9) * sec) / 0.07))
      const y = ${round(1.5 * o.gain)} * v(hz(n, C4), !!m && m.u < 0.93, F)${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
// a drop of dew (the score's pluck), the halo bell and a glint of light an octave up
LEADS.dew = o => struck('dewTone', ['dewTone'], { release: 0.9, life: 5, gain: 0.85, fx: FX.heaven, vel: '0.72 + 0.16 * hash(floor(4 * x), 3)', formula: ['Dw = v\\big(e^{-t/0.62}\\sin 2\\pi ft + 0.24e^{-t/0.27}\\sin 4\\pi ft\\big) + 0.36v\\,e^{-(t - 0.42)/0.42}\\sin 2\\pi f(t - 0.42)\\quad\\text{— капля росы и её эхо через 0.42 с}'] })({ ...o, color: '#d8f4ff' })
LEADS.halobell = o => struck('haloBellTone', ['haloBellTone'], { release: 1.6, life: 8, gain: 1.5, fx: FX.heaven, vel: '0.72 + 0.16 * hash(floor(4 * x), 3)', formula: ['Hb = 0.3v\\sum_{k=1}^{8} a_k e^{-t/T_k}\\big(\\sin 2\\pi\\,0.9996\\,r_k ft + 0.7\\sin 2\\pi\\,1.0004\\,r_k ft\\big)', 'r = (\\tfrac12, 1, 2^{4/12}, 2^{7/12}, 2, 2.52, 3.01, 4.1)\\quad\\text{— колокол с большой терцией}'] })({ ...o, color: '#ffe9a8' })
LEADS.glint = o => {
  o.need('instruments', 'glintTone')
  return struck('(f, t, v) => glintTone(2 * f, t, v)', [], { release: 1.2, life: 5, gain: 0.7, fx: FX.heaven, vel: '0.7 + 0.2 * hash(floor(4 * x), 3)', formula: ['Gl = v\\big(e^{-t/0.5}\\sin 2\\pi\\,2ft + 0.28e^{-t/0.2}\\sin 2\\pi\\,4.02ft\\big)\\quad\\text{— блик света, октавой выше темы}'] })({ ...o, color: '#fffbe0' }).replace('[60 + m.n]', '[72 + m.n]')
}
// the celesta among the stars: the orchestra's celesta, set against this style's other voices
LEADS.starcelesta = o => LEADS.celesta({ ...o, gain: 2 * o.gain })
Object.assign(COUNTER_VOICE, { seraph: 'flute', dew: 'flute', halobell: 'flute', glint: 'flute', starcelesta: 'flute' })
// the angel choir: the chord in five parts (the root below, then the voicing), every part two singers ±6 ¢ — «о» below,
// «а» in the middle, «у» above —, the breath swelling into each chord
PADS.angelchoir = o => {
  o.need('instruments', 'angelChoir', 'DREAM_VOWELS')
  return `{
  color: '#ffe9c4',
  graph: x => { const c = chordAt(x); return c && x < END - 2 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null },
  midi: x => { const c = chordAt(x); return c && x < END - 2 && x - c[0] < c[1] - 0.1 ? c[3] : [] },
  formula: ${JSON.stringify(['Ch = \\Rev_{0.96}\\sum_{j=1}^{5}\\sum_{\\pm}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{s_jF^{(j)}_i}\\saw\\!\\Big(f_j(1 \\pm 0.0035)\\big(1 + 0.008\\sin 2\\pi r_{j\\pm}T\\big)\\Big)', 'Q = (7, 11, 11),\\ G = (1, 0.42, 0.18),\\ r \\in [4.4, 5.6]\\text{ Гц},\\ s_j = 1.08 \\text{ у верхних};\\quad F^{(j)}: \\text{«о», «о», «а», «а», «у»}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, ch = angelChoir({ voices: 5 }), level = smooth(900), verb = reverb({ room: 0.96, damp: 0.22, wet: 0.6 })
    const V = [DREAM_VOWELS.o, DREAM_VOWELS.o, DREAM_VOWELS.a, DREAM_VOWELS.a, DREAM_VOWELS.u]
    let v = [50, 57, 62, 66, 69]
    return x => {
      const c = chordAt(x), e = energy(x), on = c && x < END - 2
      if (c) { const root = c[2] + 24 > 62 ? c[2] + 12 : c[2] + 24; v = [root, ...c[3]].slice(0, 5) }
      const a = level(on ? [0.6, 0.72, 0.86, 1][Math.max(0, e)] * (0.7 + 0.3 * Math.min(1, ((x - c[0]) * sec) / 1.6)) : 0)
      const [l, r] = ch(on ? v.map(n => hz(n - 60, C4)) : [], V)
      const k = ${round(1.6 * (o.gain ?? 1))} * a
      return verb(k * l, k * r)
    }
  },
}`
}
// the halo pad: the chord wide open (the bass an octave up, the voicing, its lowest note again above), every note a pair
// −5 / +6 cents apart, left and right
CHORDS.halopad = o => {
  o.need('instruments', 'haloPad')
  return `{
  color: '#c8e4ff',
  graph: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05 ? c[3] : [] },
  formula: ${JSON.stringify(['P = \\Rev\\sum_{j=0}^{5}\\LP_{520 + 160j}\\Big[w_j\\big(f_j\\,2^{-5/1200}\\big)_L + w_j\\big(f_j\\,2^{6/1200}\\big)_R\\Big],\\quad w_j = \\sin \\text{ для двух нижних, } \\tri \\text{ выше}'])},
  audio() {
    const p = haloPad({ voices: 6 }), level = smooth(600), verb = reverb({ room: 0.94, damp: 0.25, wet: 0.5 })
    let v = [50, 57, 62, 66, 69, 74]
    return x => {
      const c = chordAt(x), e = energy(x), on = c && e >= 0 && x < END - 1
      if (c) v = [c[2] + 12, ...c[3], c[3][0] + 12].slice(0, 6)
      const a = level(on ? [0.6, 0.75, 0.9, 1][e] : 0), [l, r] = p(on ? v.map(n => hz(n - 60, C4)) : [])
      const k = ${round(1.1 * (o.gain ?? 1))} * a${pumpIf(o)}
      return verb(k * l, k * r)
    }
  },
}`
}
// the hum under the dream: a sine on the chord's bass note, its octave beating slowly against it, a breath of the twelfth
BASSES.hum = o => {
  o.need('engine', 'osc')
  o.need('instruments', 'ar')
  return `(() => {
  const humAt = x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 ? { n: c[2], at: c[0], d: c[1] } : null }
  return {
  color: '#ffd9a0',
  graph: x => (humAt(x) ? ${o.lane[0]} + (humAt(x).n - 28) / 24 : null),
  midi: x => { const m = humAt(x); return m && x - m.at < m.d - 0.1 ? [m.n] : [] },
  formula: ${JSON.stringify(['H = a(t)\\big(\\sin 2\\pi ft + 0.35\\sin 2\\pi(2f + 0.4)t + 0.1\\sin 2\\pi\\,3ft\\big)\\quad\\text{— гул: бас аккорда, октава с биением 0.4 Гц, дуодецима}'])},
  audio() {
    const a = osc('sine'), b = osc('sine'), c = osc('sine'), env = ar(500, 1200), glide = smooth(70)
    let n = 38, first = true
    return x => {
      const m = humAt(x)
      if (m) { n = m.n; if (first) { for (let i = 0; i < 500; i++) glide(hz(n - 60, C4)); first = false } }
      const f = glide(hz(n - 60, C4)), e = env(m ? [0.6, 0.75, 0.9, 1][energy(x)] : 0)
      const y = ${round(0.5 * (o.gain ?? 1))} * e * (a(f) + 0.35 * b(2 * f + 0.4) + 0.1 * c(3 * f))
      return [y, y]
    }
  },
}})()`
}
// glints of light: now and then (more often as the music grows) a chord tone one or two octaves up, a pure sine dying
// away, somewhere between the ears
ARPS.glints = o => {
  o.need('instruments', 'glintTone')
  return `(() => {
  const glintAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END - 1) return null
    const j = floor(2 * x + 1e-9)
    if (hash(j, 61) >= [0.2, 0.3, 0.42, 0.55][e]) return null
    return { n: c[3][floor(c[3].length * hash(j, 62))] + (hash(j, 63) < 0.5 ? 24 : 12), at: j / 2, vel: 0.45 + 0.4 * hash(j, 64), p: hash(j, 65) }
  }
  return {
  color: '#fffbe0',
  graph: x => { const m = glintAt(x); return m && x - m.at < 0.25 ? ${o.lane[0]} + (m.n - 60) / 30 : null },
  midi: x => { const m = glintAt(x); return m && x - m.at < 0.45 ? [m.n] : [] },
  formula: ${JSON.stringify(['Gl = v\\big(e^{-t/0.5}\\sin 2\\pi ft + 0.28e^{-t/0.2}\\sin 2\\pi\\,2.01ft\\big),\\quad f \\text{ — случайный тон аккорда на 1–2 октавы выше, с вероятностью } p(E) \\text{ на восьмую}'])},
  audio() {
    const pl = poly(glintTone, { release: 1.5, life: 5 }), pr = poly(glintTone, { release: 1.5, life: 5 }), fire = trigger(), verb = reverb({ room: 0.96, damp: 0.18, wet: 0.6 })
    return x => {
      const m = glintAt(x)
      if (m && fire(m.at)) (m.p < 0.5 ? pl : pr).hit(hz(m.n - 60, C4), m.vel, 1.5)
      const g = ${round(0.2 * (o.gain ?? 1))}, l = g * pl(), r = g * pr()
      return verb(l + 0.2 * r, r + 0.2 * l)
    }
  },
}})()`
}
ARPS.haloharp = o => ARPS.harp({ ...o, gain: 2.5 * (o.gain ?? 1) })
// heaven has no drums: the halo bell on the chord's root opening a section, a chime of three glints (root, fifth, octave,
// 0.16 s apart), a triangle's ting, a great soft drum far away when everything sings, and a breath of air rising into
// every new section
KITS.heaven = o => {
  o.need('instruments', 'haloBellTone', 'glintTone', 'taikoDrum')
  o.need('engine', 'noise')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        for (let p = 0; p < 4; p += t < L / 2 ? 2 : 1) add('drum', 0.3 + (0.6 * (t + p)) / L, p)
        if (mod(t, 8) === 0) add('chime', 0.6, 0)
      } else {
        if (t === 0 && e >= 1) add('bell', 0.6 + 0.13 * e, 0)
        if (mod(t, 16) === 0) add('chime', 0.7, e >= 1 ? 0.5 : 0)
        if (e >= 3) {
          steps('drum', 0.8, 'x---------x-----')
          add('ting', 0.5, 2)
          if (mod(t, 8) === 4) add('chime', 0.55, 3)
        } else if (e === 2) {
          steps('drum', 0.55, 'x---------------')
          if (mod(t, 8) === 4) add('ting', 0.45, 2)
        }
      }
      if (x + 4 >= sectionEnd(x) && x + 4 < END) add('swell', r === 'build' ? 1 : 0.7, 0)`)}
  return {
  color: '#fff0b8',
  ${stageGraph([['bell', 4, 0.5], ['chime', 3.6, 0.4], ['drum', 3, 0.6], ['ting', 3.3, 0.3]])}
  ${stageMidi([['bell', 53], ['chime', 84], ['ting', 81], ['drum', 41], ['swell', 55]])}
  formula: ${JSON.stringify(['D = \\Rev_{0.96}\\big[0.3\\,Hb(f_R) + 0.22\\sum_{i}Gl(2f_R\\cdot 2^{(0,7,12)_i/12},\\ t - 0.16i) + 0.5\\LP_{700}\\,T_{56} + \\text{вдох}\\big]', '\\text{вдох перед разделом: } e^{-u/0.9}\\,\\BP_{300\\cdot 6^{1 - u/4\\text{д}}}\\eta,\\ u \\text{ — секунды до раздела};\\quad f_R \\text{ — корень аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bells = poly(haloBellTone, { release: 2.5, life: 9, max: 6 }), glints = poly(glintTone, { release: 1.5, life: 5, max: 16 }), fb = trigger(), fc = trigger(), ft = trigger()
    const drum = taikoDrum({ pitch: 56, decay: 1.5, bend: 2, crack: 0.03, boom: 0.6, seed: 61 }), lp = filter('lp'), η = noise(71), sw = filter('bp'), verb = reverb({ room: 0.96, damp: 0.25, wet: 0.5 })
    return x => {
      const c = chordAt(x), R = (c ? c[2] : 36) + 36, root = hz((R > 71 ? R - 12 : R) - 60, C4), q = k => (x < END ? lastHit(x, k) : null)
      const b = q('bell'), ch = q('chime'), tg = q('ting'), d = q('drum'), s = q('swell')
      if (b && fb(x - b.τ)) bells.hit(root, b.vel, 3)
      if (ch && fc(x - ch.τ)) [0, 7, 12].forEach((iv, i) => glints.hit(2 * root * 2 ** (iv / 12), ch.vel * (1 - 0.15 * i), 2, 0.16 * i))
      if (tg && ft(x - tg.τ)) glints.hit(4 * root, tg.vel, 1.5)
      const u = s ? (4 - s.τ) * sec : 9, n = η()
      const air = s && u > 0 && u < 4 * sec ? s.vel * exp(-u / 0.9) * sw(n, 300 * 6 ** (1 - u / (4 * sec)), 1.2) : sw(0, 300, 1.2)
      const y = 0.3 * bells() + 0.22 * glints() + 0.5 * lp(d ? d.vel * drum(d.τ * sec, true) : drum(1, false), 700) + 0.12 * air
      return verb(...pan(y, 0.08 * sin((TAU * x) / 16)))
    }
  },
}})()`
}
// the garden's air: the hum on the tonic (tonic, fifth, octave, and the twelfth a hair sharp, so it beats), air in the
// leaves, a low breath, a shimmer far above coming and going
TEXTURES.eden = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#f4ecd0',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 12) : null),
  formula: ${JSON.stringify(['\\text{гул: } 0.05\\sin 2\\pi f_Tt + 0.018\\sin 2\\pi\\,2^{7/12}f_Tt + 0.018\\sin 4\\pi f_Tt + 0.008\\sin 2\\pi\\,1.0023\\cdot 2^{19/12}f_Tt', '\\text{воздух: } 0.03\\,\\BP_{2600}^{Q=0.4}\\eta + 0.12\\,\\LP_{220}\\eta;\\quad \\text{сияние: } \\BP_{6500}\\eta\\cdot\\tfrac{1 + \\sin(2\\pi x/16)}{2}'])},
  audio() {
    const η = noise(89), air = filter('bp'), low = filter('lp'), shim = filter('bp'), os = [0, 1, 2, 3].map(() => osc('sine')), level = smooth(900), verb = reverb({ room: 0.96, damp: 0.2, wet: 0.55 })
    return x => {
      const n = η(), a = level(x < END ? 1 : 0), t0 = SCALE[0] + trAt(x), f = hz((mod(t0, 12) > 6 ? mod(t0, 12) - 12 : mod(t0, 12)) - 24, C4)
      const drone = 0.05 * os[0](f) + 0.018 * os[1](f * 2 ** (7 / 12)) + 0.018 * os[2](2 * f) + 0.008 * os[3](f * 2 ** (19 / 12) * 1.0023)
      const y = 1.6 * a * (drone * (0.85 + 0.15 * sin((TAU * x) / 12)) + 0.03 * air(n, 2600, 0.4) + 0.12 * low(n, 220) + 0.02 * (0.5 + 0.5 * sin((TAU * x) / 16)) * shim(n, 6500, 2))
      return verb(...pan(y, 0.25 * sin((TAU * x) / 20)))
    }
  },
}`
}

// the choir of the damned: the angel choir far below — formants 14 % lower, the voices hoarse (tanh), the theme in
// octaves an octave and two under the staff, a dark syllable per note
LEADS.damned = o => {
  o.need('instruments', 'angelChoir', 'DREAM_VOWELS', 'blend')
  return `{
  color: '#c0392b',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.95 ? [48 + m.n] : [] },
  formula: ${JSON.stringify(['Dm = \\Rev_{0.96}\\sum_{j=1}^{4}\\sum_{\\pm}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{0.86F_i(\\tau)}\\tanh\\!\\big(1.7\\saw(f_j(1 \\pm 0.004))\\big),\\quad f_j \\in \\{\\tfrac f2, \\tfrac f2, \\tfrac f4, \\tfrac f4\\}', 'F(\\tau) = F_u + (F_v - F_u)(1 - e^{-\\tau/110\\text{мс}}),\\ v \\in \\{o, u, a, o, e, u\\}\\ \\text{— хор проклятых, слог на ноту}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, c = angelChoir({ voices: 4, detune: 0.004, vib: 0.006, attack: 90, release: 420, shift: 0.86, rough: 0.7, breath: 0.04, seed: 13 }), verb = reverb({ room: 0.96, damp: 0.4, wet: 0.5 })
    const SYL = ['o', 'u', 'a', 'o', 'e', 'u']
    let n = 0, at = -1, v = 'o'
    return x => {
      const m = ${o.at}(x)
      if (m) { n = m.n; if (m.at !== at) (at = m.at), (v = SYL[floor(6 * hash(floor(4 * m.at), 47))]) }
      const on = m && m.u < 0.95, f = hz(n - 12, C4), lo = n - 24 >= -27 ? f / 2 : f
      const F = blend(DREAM_VOWELS.u, DREAM_VOWELS[v], 1 - exp((-(m ? m.τ : 9) * sec) / 0.11))
      const [l, r] = c(on ? [f, f * 1.0012, lo, lo * 0.9988] : [], F)
      const k = ${round(1.05 * o.gain)}${pumpIf(o)}
      return verb(k * l, k * r)
    }
  },
}`
}
// the bell of the pit tolling the theme an octave down
LEADS.hellbell = o => {
  o.need('instruments', 'hellBellTone')
  return struck('(f, t, v) => hellBellTone(f / 2, t, v)', [], { release: 2, life: 9, gain: 0.32, fx: FX.pit, vel: '0.74 + 0.16 * hash(floor(4 * x), 3)', formula: ['Bl = 0.28v\\sum_{k=1}^{8} a_k e^{-t/T_k}\\big(\\sin 2\\pi\\,0.9991\\,r_k\\tfrac f2 t + 0.8\\sin 2\\pi\\,1.0009\\,r_k\\tfrac f2 t\\big)', 'r = (\\tfrac12, 1, 2^{3/12}, 2^{6/12}, 2, 2.52, 2^{18/12}, 4.1)\\quad\\text{— треснувший колокол: малая терция и тритон}'] })({ ...o, color: '#d08040' }).replace('[60 + m.n]', '[48 + m.n]')
}
// the horns of the pit: the horn section, set against this style's other voices
LEADS.hellhorns = o => LEADS.hornsection({ ...o, gain: 0.45 * o.gain })
Object.assign(COUNTER_VOICE, { damned: 'cellolead', hellbell: 'cellolead', hellhorns: 'cellolead' })
// the organ of the pit: the pipe organ with a 16-foot stop under its ranks, louder
CHORDS.hellorgan = o => {
  const code = CHORDS.pipeorgan(o), a = 'organ({ voices: 4, gain: 0.1 })'
  if (!code.includes(a)) throw new Error('hellorgan: the pipe organ recipe changed')
  return code.replace(a, 'organ({ voices: 4, gain: 0.14, stops: [[0.5, 0.8], [1, 1], [2, 0.5], [3, 0.18], [4, 0.2]] })').replace("color: '#c9a227'", "color: '#a0522d'")
}
// the strings shivering over the pit: the tremolo strings, set against this style's organ
CHORDS.helltremolo = o => CHORDS.tremolo({ ...o, gain: 0.25 * (o.gain ?? 1) })
// the abyss: the same choir under the chords — «у» and «о», hoarse, slow, breathing every two bars
PADS.abyss = o => {
  o.need('instruments', 'angelChoir', 'DREAM_VOWELS')
  return `{
  color: '#8e2f3a',
  graph: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 2 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null },
  midi: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 2 && x - c[0] < c[1] - 0.1 ? c[3] : [] },
  formula: ${JSON.stringify(['Ab = \\Rev_{0.96}\\sum_{j=1}^{5}\\sum_{\\pm}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{0.86F^{(j)}_i}\\tanh\\!\\big(1.6\\saw(f_j(1 \\pm 0.0035))\\big)\\cdot\\big(0.85 + 0.15\\sin\\tfrac{2\\pi x}{8}\\big),\\quad F^{(j)}: \\text{«у», «о», «о», «у», «а»}'])},
  audio() {
    const ch = angelChoir({ voices: 5, shift: 0.86, rough: 0.6, breath: 0.04, attack: 1400, release: 2000, vib: 0.006, seed: 9 }), level = smooth(700), verb = reverb({ room: 0.96, damp: 0.4, wet: 0.6 })
    const V = [DREAM_VOWELS.u, DREAM_VOWELS.o, DREAM_VOWELS.o, DREAM_VOWELS.u, DREAM_VOWELS.a]
    let v = [50, 57, 62, 65, 69]
    return x => {
      const c = chordAt(x), e = energy(x), on = c && e >= 0 && x < END - 2
      if (c) v = [c[2] + (c[2] + 12 < 43 ? 24 : 12), ...c[3]].slice(0, 5)
      const a = level(on ? [0.55, 0.7, 0.85, 1][e] : 0) * (0.85 + 0.15 * sin((TAU * x) / 8))
      const [l, r] = ch(on ? v.map(n => hz(n - 60, C4)) : [], V)
      const k = ${round(2.2 * (o.gain ?? 1))} * a
      return verb(k * l, k * r)
    }
  },
}`
}
// magma: a sub sine on the chord's bass note and two saws ±6 ¢ driven through tanh under a low-pass that opens with the
// energy and breathes over two bars; it throbs on the beats when the music is up
BASSES.magma = o => {
  o.need('engine', 'osc', 'tanh')
  o.need('instruments', 'ar')
  return `(() => {
  const magAt = x => { const c = chordAt(x); return c && energy(x) >= 1 && x < END - 1 ? { n: c[2], at: c[0], d: c[1] } : null }
  return {
  color: '#ff5a2a',
  graph: x => (magAt(x) ? ${o.lane[0]} + (magAt(x).n - 28) / 24 : null),
  midi: x => { const m = magAt(x); return m && x - m.at < m.d - 0.1 ? [m.n] : [] },
  formula: ${JSON.stringify(['Mg = a(t)\\,p(x)\\Big[0.8\\sin 2\\pi ft + 0.5\\,\\LP_{f_c}^{Q=1.6}\\tanh\\!\\big(2.2(\\saw(f^-) + \\saw(f^+))\\big)\\Big],\\quad f_c = 130 + 110E + 60\\sin\\tfrac{2\\pi x}{8}', 'p(x) = 0.7 + 0.3e^{-3(x \\bmod 1)} \\text{ при } E \\ge 2\\quad\\text{— магма: пульс на каждую долю}'])},
  audio() {
    const s1 = osc('saw'), s2 = osc('saw', 0.5), sub = osc('sine'), lp = filter('lp'), env = ar(120, 700), glide = smooth(40), verb = reverb({ room: 0.8, damp: 0.5, wet: 0.14 })
    let n = 38, first = true
    return x => {
      const m = magAt(x), e = Math.max(0, energy(x))
      if (m) { n = m.n; if (first) { for (let i = 0; i < 300; i++) glide(hz(n - 60, C4)); first = false } }
      const f = glide(hz(n - 60, C4)), on = env(m ? [0.6, 0.75, 0.9, 1][e] : 0), throb = e >= 2 ? 0.7 + 0.3 * exp(-3 * mod(x, 1)) : 1
      const growl = lp(tanh(2.2 * (s1(f * 0.9965) + s2(f * 1.0035))), 130 + 110 * e + 60 * sin((TAU * x) / 8), 1.6)
      const y = ${round(0.4 * (o.gain ?? 1))} * on * throb * (0.8 * sub(f) + 0.5 * growl)
      return verb(y, y)
    }
  },
}})()`
}
// embers: sparks flying up — a chord tone one or two octaves up as a short metallic FM ping (1 : 2.76), where the hash
// says, left or right, in an echo
ARPS.embers = o => {
  o.need('instruments', 'fm')
  return `(() => {
  const embAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END - 1) return null
    const j = floor(4 * x + 1e-9)
    if (hash(j, 71) >= [0.07, 0.12, 0.2, 0.3][e]) return null
    return { n: c[3][floor(c[3].length * hash(j, 72))] + (hash(j, 73) < 0.4 ? 24 : 12), at: j / 4, vel: 0.4 + 0.5 * hash(j, 74), p: hash(j, 75) }
  }
  return {
  color: '#ffb347',
  graph: x => { const m = embAt(x); return m && x - m.at < 0.15 ? ${o.lane[0]} + (m.n - 60) / 30 : null },
  midi: x => { const m = embAt(x); return m && x - m.at < 0.22 ? [m.n] : [] },
  formula: ${JSON.stringify(['Em = v\\,e^{-7t}\\sin\\!\\big(2\\pi ft + 1.4e^{-12t}\\sin 2\\pi\\,2.76ft\\big),\\quad f \\text{ — тон аккорда на 1–2 октавы выше, искра с вероятностью } p(E) \\text{ на шестнадцатую}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, tone = (f, t, v) => v * Math.min(1, t / 0.002) * fm(f, t, { ratio: 2.76, index: 1.4, decay: 7, idecay: 12 })
    const pl = poly(tone, { release: 0.2, life: 1.5 }), pr = poly(tone, { release: 0.2, life: 1.5 }), fire = trigger(), echo = delay({ time: sec * 0.75, feedback: 0.4, wet: 0.3 }), verb = reverb({ room: 0.93, damp: 0.3, wet: 0.4 })
    return x => {
      const m = embAt(x)
      if (m && fire(m.at)) (m.p < 0.5 ? pl : pr).hit(hz(m.n - 60, C4), m.vel, 0.2)
      const g = ${round(0.22 * (o.gain ?? 1))}, l = g * pl(), r = g * pr()
      return verb(...echo(l + 0.25 * r, r + 0.25 * l))
    }
  },
}})()`
}
// the drums of the pit: a heart (two thumps), a great drum in 3 + 3 + 2 at half speed, an anvil on the third beat (a
// steel bar on the chord's fifth), toms, a chain dragged, a field snare rolling through a build-up, and the cracked bell
// on the chord's root opening every section
KITS.hell = o => {
  o.need('instruments', 'taikoDrum', 'snareDrum', 'clankTone', 'hellBellTone', 'heartBeat')
  o.need('engine', 'noise')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('low', 0.8, t < L / 2 ? 'x-------x-------' : 'x---x---x---x---')
      } else if (e >= 3) {
        steps('low', 1, 'x-----x-----x---')
        steps('anvil', 0.8, '--------x-------')
        steps('tom', 0.6, fill ? '----------x-xxxx' : '--------------x-')
        if (mod(t, 8) === 4) add('chain', 0.8, 1)
        if (mod(t, 16) === 0) add('bell', 1, 0)
      } else if (e === 2) {
        steps('low', 0.85, 'x---------x-----')
        steps('anvil', 0.55, '--------x-------')
        add('heart', 0.7, 1, 3)
        if (fill) steps('tom', 0.5, '------------x-xx')
        if (t === 0) add('bell', 0.85, 0)
      } else if (e >= 0) {
        add('heart', e ? 0.8 : 0.6, 0, 2)
        if (t === 0 || (r === 'intro' && mod(t, 8) === 0)) add('bell', 0.7, 0)
        if (hash(b, 5) < 0.3) add('chain', 0.5, 1 + floor(3 * hash(b, 6)))
        if (e >= 1 && mod(t, 8) === 4) add('low', 0.6, 0)
      }`)}
  return {
  color: '#b03a2e',
  ${stageGraph([['bell', 4, 0.5], ['low', 3.4, 0.8], ['anvil', 3, 0.5], ['heart', 2.6, 0.5], ['tom', 2.9, 0.5], ['snare', 2.8, 0.5]])}
  ${stageMidi([['heart', 35], ['low', 36], ['snare', 38], ['tom', 45], ['anvil', 56], ['chain', 69], ['bell', 53]])}
  formula: ${JSON.stringify(['D = \\Rev_{0.96}\\big[0.6\\,T_{44} + 0.4\\,T_{78} + 0.3S + 0.9\\,\\heartsuit + 0.3\\,Bl(f_R) + 0.14\\,\\text{Clank}(f_5) + \\text{цепь}\\big]', '\\heartsuit(t) = h(t; 52 \\to 38\\text{ Гц}) + 0.62\\,h(t - 0.2; 48 \\to 34\\text{ Гц}),\\quad h = e^{-5t/d}\\sin\\!\\Big(2\\pi f_0 d\\,\\tfrac{(f_1/f_0)^{t/d} - 1}{\\ln(f_1/f_0)}\\Big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, low = taikoDrum({ pitch: 44, decay: 2.2, bend: 4, crack: 0.12, boom: 0.7, seed: 66 }), tom = taikoDrum({ pitch: 78, decay: 0.8, bend: 3, crack: 0.3, boom: 0.35, seed: 67 }), snare = snareDrum({ tone: 170, cutoff: 2200, decay: 14 })
    const bells = poly(hellBellTone, { release: 3, life: 12, max: 4 }), anvils = poly(clankTone, { release: 0.25, life: 2.5, max: 6 }), fb = trigger(), fa = trigger(), η = noise(67), chainBp = filter('bp')
    const verb = reverb({ room: 0.96, damp: 0.38, wet: 0.5 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const c = chordAt(x), R = c ? c[2] : 38, q = k => (x < END ? lastHit(x, k) : null), b = q('bell'), a = q('anvil'), h = q('heart'), ch = q('chain')
      if (b && fb(x - b.τ)) bells.hit(hz(R + 12 - 60, C4), b.vel, 4)
      if (a && fa(x - a.τ)) anvils.hit(hz(R + 43 - 60, C4), a.vel, 0.3)
      const ct = ch ? ch.τ * sec : 9, links = ct < 1.2 ? ch.vel * Math.max(0, sin(TAU * 7 * ct)) ** 8 * (1 - ct / 1.2) : 0
      const y = 0.6 * at('low', low, x) + 0.4 * at('tom', tom, x) + 0.3 * at('snare', snare, x) + 0.9 * (h ? heartBeat(h.τ * sec, h.vel) : 0) + 0.3 * bells() + 0.14 * anvils() + 0.1 * links * chainBp(η(), 3000, 1.5)
      return verb(...pan(y, 0.1 * sin((TAU * x) / 16)))
    }
  },
}})()`
}
// the inferno: fire (a roar under 300 Hz and crackles — 20 ms bursts of noise through a band the hash picks), the wind of
// the crimson dream, a drone two octaves under the tonic beating at 0.7 Hz, the damned wailing (two hoarse voices falling
// an octave in 4 s), and where a loud section begins the cut: a shriek of air and a fall from 46 to 28 Hz
TEXTURES.inferno = o => {
  o.need('engine', 'noise', 'osc')
  o.need('instruments', 'voice', 'VOWELS')
  return `{
  color: '#ff7a3c',
  graph: x => (x < END ? -2.95 + 0.06 * Math.abs(sin(TAU * x / 3)) * sin(TAU * x / 7) : null),
  formula: ${JSON.stringify(['\\text{огонь: } \\LP_{300}\\eta + \\text{треск } e^{-t/8\\text{мс}}\\,\\BP_{1.5\\ldots5\\text{к}}^{Q=3}\\eta;\\quad \\text{ветер: } \\BP_{900 + 300\\sin 2\\pi\\,0.13T}\\eta;\\quad \\text{гул: } \\sin 2\\pi f_Tt + 0.6\\sin 2\\pi(f_T + 0.7)t', '\\text{плач: } \\sum_{\\pm}\\text{голос}\\big(f\\cdot 2^{-t/4.2}\\big)\\ \\text{— падение на октаву};\\quad \\text{разрез: } \\BP_{5000\\to600}\\eta + \\sin 2\\pi\\!\\int\\!46\\cdot(28/46)^{t/4}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(83), roar = filter('lp'), crack = filter('bp'), wind = filter('bp'), cut = filter('bp'), sub = osc('sine'), sub2 = osc('sine'), fall = osc('sine')
    const w1 = voice({ size: 0.95, breath: 0.08, rough: 0.5 }), w2 = voice({ size: 1.05, breath: 0.08, rough: 0.5 }), level = smooth(800), verb = reverb({ room: 0.96, damp: 0.35, wet: 0.55 })
    let wf = 440
    return x => {
      const n = η(), T = x * sec, e = Math.max(0, energy(x)), a = level(x < END ? 1 : 0), c = chordAt(x)
      const fire = (0.1 + 0.05 * e) * (0.7 + 0.3 * sin((TAU * T) / 7) * sin((TAU * T) / 3.1)) * roar(n, 300, 0.7)
      const s = floor(T * 50), u = T * 50 - s, pk = hash(s, 9) < [0.05, 0.08, 0.12, 0.18][e]
      const ck = (0.3 + 0.7 * hash(s, 12)) * crack(pk ? n * exp(-u / (0.2 + 0.6 * hash(s, 11))) : 0, 1500 + 3500 * hash(s, 10), 3)
      const w = 0.05 * wind(n, 900 + 300 * sin(TAU * 0.13 * T), 0.5)
      const j = floor(x / 16), wt = (x - 16 * j - 6 * hash(j, 21)) * sec
      if (c && wt <= 0) wf = hz(c[3][c[3].length - 1] + 12 - 60, C4)
      const won = e >= 1 && wt > 0 && wt < 4.2, g = wf * 2 ** (-Math.max(0, Math.min(4.2, wt)) / 4.2), wenv = won ? Math.min(1, wt / 1.2) * Math.min(1, (4.2 - wt) / 1.2) : 0
      const wail = wenv * (w1(g * 0.996, VOWELS.a, 1) + w2(g * 1.004, VOWELS.o, 1))
      const fs = hz(mod(SCALE[0] + trAt(x), 12) - 36, C4), drone = 0.1 * (sub(fs) + 0.6 * sub2(fs + 0.7))
      const [s0, , e3] = x < END ? sectionOf(x) : [0, '', 0], ct = e3 >= 3 ? (x - s0) * sec : 9
      const shriek = ct < 1.5 ? 0.3 * Math.min(1, ct / 0.04) * exp(-ct / 0.25) * cut(n, 5000 * 0.12 ** Math.min(1, ct / 0.5), 2) : cut(0, 600, 2)
      const drop = ct < 5 ? 0.3 * Math.min(1, ct / 0.05) * exp(-ct / 1.1) * fall(46 * (28 / 46) ** (ct / 4)) : fall(0)
      const y = 0.06 * a * (fire + w + 0.05 * wail + 0.5 * drone + shriek + drop)
      const [l, r] = verb(...pan(y, 0.25 * sin((TAU * x) / 11)))
      const p = hash(s, 13)
      return [l + 0.03 * a * ck * p, r + 0.03 * a * ck * (1 - p)]
    }
  },
}`
}
