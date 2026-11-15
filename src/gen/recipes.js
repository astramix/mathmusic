// The recipe tables — LEADS, CHORDS, PADS, BASSES, ARPS, KITS, TEXTURES — with the first styles' instruments and the helpers every recipe uses — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { lane, round } from './util.js'
import { MT, bassFor, compFor, grooveFor } from './meter.js'

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
const compHit = comp => (MT ? compHitMeter() : `const COMP = ${JSON.stringify(comp)}
const compAt = x => {
  const e = energy(x)
  if (e < 0 || role(x) === 'end') return null
  let h = null
  for (const c of COMP[e] ?? COMP[1]) if (c[0] <= mod(x, 4)) h = c
  return h && { at: floor(x / 4) * 4 + h[0], vel: h[1], d: h[2] }
}`)
// the comping of a song in another meter: by its groups of beats (compFor), a list per kind of bar
const compHitMeter = () => {
  const lists = MT.bars.map(bm => compFor(bm)), COMP = Object.fromEntries([0, 1, 2, 3].map(e => [e, lists.length > 1 ? lists.map(l => l[e]) : lists[0][e]]))
  return `const COMP = ${JSON.stringify(COMP)} // by energy: [beat in the bar, velocity, length]${lists.length > 1 ? ', a list per kind of bar' : ''}
const compAt = x => {
  const e = energy(x)
  if (e < 0 || role(x) === 'end') return null
  const b = barIndex(x), P = COMP[e] ?? COMP[1], list = Array.isArray(P[0][0]) ? P[b % 2] : P
  let h = null
  for (const c of list) if (c[0] <= x - barStartOf(b) + 1e-9) h = c
  return h && { at: barStartOf(b) + h[0], vel: h[1], d: h[2] }
}`
}
// a chord held through the bar, let go just before its end
const GATE = v => (MT ? `inBar(x) < barLen(x) - ${round(4 - v)}` : `mod(x, 4) < ${v}`)
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
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
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
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
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
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
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
  midi: x => (padOn(x) && ${GATE(3.9)} ? chordAt(x)[3].map(n => n - 12 * (n > 64)) : []),
  formula: ${JSON.stringify(['S = \\Rev\\,\\Cho\\,\\LP\\,\\HP\\sum_{j}\\sum_{u=-1}^{1}\\saw\\!\\Big(f_j\\,2^{\\,(0.09u + 0.12\\sin 2\\pi r_{j,u}T)/12}\\Big)'])},
  audio() {
    const s = strings({ voices: 4, attack: 700, release: 1400, cutoff: 2600, gain: ${round(0.036 * (o.gain ?? 1))} }), ch = chorus({ mix: 0.4 }), verb = reverb({ room: 0.9, wet: 0.45 })
    return x => {
      const [l, r] = s(padOn(x) ? chordAt(x)[3].map(n => hz(n - 60 - 12 * (n > 64), C4)) : [])${o.hard ? ', d = pumpAt(x)' : ', d = 1'}
      return verb(...ch(d * l, d * r))
    }
  },
}`
  },
  choirpad: o => {
    o.need('instruments', 'voice', 'VOWELS')
    return `{
  color: '#c9b6ff',
  graph: x => (padOn(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (padOn(x) && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['Ch = \\Rev\\sum_{j} \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\BP_{F_i}\\,\\saw(f_j),\\quad F = \\text{«а»}'])},
  audio() {
    const vs = [0, 1, 2, 3].map(j => voice({ size: 1 - 0.04 * j, breath: 0.05 })), level = smooth(400), verb = reverb({ room: 0.92, wet: 0.55 })
    return x => {
      const c = chordAt(x), a = level(padOn(x) ? 1 : 0)
      let l = 0, r = 0
      vs.forEach((v, j) => { const y = v(hz((c ? c[3][j % c[3].length] : 60) - 60, C4) * (1 + 0.002 * j), VOWELS.a, 1); l += y * (j % 2 ? 0.4 : 0.6); r += y * (j % 2 ? 0.6 : 0.4) })
      return verb(${round(0.24 * (o.gain ?? 1))} * a * l, ${round(0.24 * (o.gain ?? 1))} * a * r)
    }
  },
}`
  },
}

// bass: the style's line from the chord's root ('R'), fifth, octave, third, or a chromatic approach
// to the next root ('A'); 'eighths' = octave-jumping eighths; 'octaves' = root/octave bounce
const bassData = line => (MT ? bassDataMeter(line) : `const BASS_LINE = ${JSON.stringify(line)}
const bassAt = x => {
  const c = chordAt(x), e = energy(x)
  if (!c || e < 1 || x >= END - 1) return null
  const p = mod(x, 4), bar = floor(x / 4) * 4
  ${line === 'eighths' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.4 ? { n: c[2] + 12 * (k % 2), at: bar + k / 2, d: 0.4 } : null`
    : line === 'walking' ? `// a walking bass: the root on a chord's first beat, chord tones up or down the beats between, and on the beat
  // before the next chord a half step above or below its root (the chromatic approach)
  const b = floor(x), j = b - c[0], L = c[1], nx = chordAt(c[0] + L) ?? c, up = hash(c[0], 17) < 0.6
  if (x - b > 0.9) return null
  let n = c[2]
  if (j === L - 1 && L > 1) n = nx[2] + (hash(b, 23) < 0.5 ? -1 : 1)
  else if (j > 0) { const steps = up ? [0, c[5][0], c[5][1], 12] : [12, c[5][1], c[5][0], 0]; n = c[2] + steps[j % 4] - (up ? 0 : 12) }
  while (n < 28) n += 12
  while (n > 45) n -= 12
  return { n, at: b, d: 0.9 }`
    : line === 'octaves' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.42 ? { n: c[2] + (k === 7 ? c[5][1] : k % 2 ? 12 : 0), at: bar + k / 2, d: 0.42 } : null`
    : `let hit = null
  for (const h of BASS_LINE) if (h[0] <= p && p < h[0] + h[2]) hit = h
  if (!hit) return null
  const next = chordAt(bar + 4) ?? c, [third, fifth] = c[5]
  const n = hit[1] === 'R' ? c[2] : hit[1] === '5' ? c[2] + fifth : hit[1] === '8' ? c[2] + 12 : hit[1] === '3' ? c[2] + third : next[2] - 1
  return { n, at: bar + hit[0], d: hit[2] }`}
}`)
// the bass in another meter: eighths and octaves fill the bar; a line goes root – octave – … – fifth by the groups
const bassDataMeter = line => {
  const lines = MT.bars.map(bassFor)
  return `const BASS_LINE = ${JSON.stringify(lines.length > 1 ? lines : lines[0])} // [beat in the bar, R / 8 / 5, length], by the meter's groups
const bassAt = x => {
  const c = chordAt(x), e = energy(x)
  if (!c || e < 1 || x >= END - 1) return null
  const p = inBar(x), bar = barStart(x), L = barLen(x)
  ${line === 'eighths' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.4 ? { n: c[2] + 12 * (k % 2), at: bar + k / 2, d: 0.4 } : null`
    : line === 'octaves' ? `const k = floor(2 * p)
  return mod(p, 0.5) < 0.42 ? { n: c[2] + (k === floor(2 * L) - 1 ? c[5][1] : k % 2 ? 12 : 0), at: bar + k / 2, d: 0.42 } : null`
    : `const list = Array.isArray(BASS_LINE[0][0]) ? BASS_LINE[barIndex(x) % 2] : BASS_LINE
  let hit = null
  for (const h of list) if (h[0] <= p && p < h[0] + h[2]) hit = h
  if (!hit) return null
  const fifth = c[5][1]
  return { n: hit[1] === 'R' ? c[2] : hit[1] === '5' ? c[2] + fifth : c[2] + 12, at: bar + hit[0], d: hit[2] }`}
}`
}
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
      return verb(...echo(...pan(${round(gain * (o.gain ?? 1))} * p(), -0.35)))
    }
  },
}})()`
}

// drums: patterns as strings, 16 steps per bar; swing moves the off-beat eighths to SW
const drumData = drums => (MT ? drumDataMeter(drums) : `// drum patterns: 16 steps per bar — x hit, o ghost, - rest; by section energy
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
}`)
// the drums of another meter: the style's grooves made again for its bars (grooveFor) — kicks and backbeats on its groups
const drumDataMeter = drums => {
  const G = Object.fromEntries(Object.entries(drums).map(([name, lines]) => [name, MT.bars.length > 1 ? MT.bars.map(bm => grooveFor(lines, bm, name)) : grooveFor(lines, MT.bars[0], name)]))
  const comp = MT.compound
  return `// drum patterns in ${MT.label}: ${comp ? 'triplet eighths (3 a beat)' : 'sixteenths'} — x hit, o ghost, - rest; by section energy${MT.bars.length > 1 ? '; a pattern per kind of bar' : ''}
const GROOVES = ${JSON.stringify(G, null, 2)}
const GROOVE_BY_ENERGY = [null, 'light', 'full', 'busy']
const barCache = new Map()
function barHits(b) {
  if (barCache.has(b)) return barCache.get(b)
  const x = barStartOf(b), L = barLenOf(b), e = energy(x), hits = []
  const name = e >= 0 ? GROOVE_BY_ENERGY[e] : null
  const last = b % 8 === 7 || (x + L < END && energy(x + L) !== e)
  const pick = g => (Array.isArray(g) ? g[b % 2] : g)
  if (name) {
    const g = { ...pick(GROOVES[name]), ...(last && e >= 2 && GROOVES.fill ? pick(GROOVES.fill) : {}) }
    for (const [drum, steps] of Object.entries(g)) {
      for (let i = 0; i < steps.length; i++) {
        const c = steps[i]
        if (c !== 'x' && c !== 'o') continue
        const pos = ${comp ? 'i / 3' : 'Math.floor(i / 4) + (i % 4 === 2 ? SW : (i % 4) / 4)'}
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
  for (let b = barIndex(x); b >= barIndex(x) - 1 && b >= 0; b--) {
    let best = null
    for (const [p, d, v] of barHits(b)) if (d === drum && barStartOf(b) + p <= x) best = { τ: x - barStartOf(b) - p, vel: v }
    if (best) return best
  }
  return null
}`
}
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
  // a jazz club: the room's murmur (noise through two moving vowel-like bands), a glass touching another now and then
  club: o => {
    o.need('engine', 'noise')
    return `{
  color: '#8f7f6a',
  graph: x => (x < END ? -2.95 + 0.03 * sin(TAU * x / 2) : null),
  formula: ${JSON.stringify(['\\text{клуб: } \\BP_{F_1(T)}\\eta + \\BP_{F_2(T)}\\eta\\ \\text{(гул голосов)} + \\sum e^{-t/0.3}\\sin 2\\pi\\,(2.6\\text{к}, 4.1\\text{к})\\,t\\ \\text{(бокалы)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(5), b1 = filter('bp'), b2 = filter('bp'), lp = filter('lp')
    return x => {
      const T = x * sec, n = η(), m = 0.5 + 0.5 * sin(TAU * 0.13 * T)
      const talk = 0.5 * b1(n, 450 + 200 * m, 3) + 0.35 * b2(n, 1300 + 400 * sin(TAU * 0.07 * T), 4)
      const j = floor(x / 3), t = (x - 3 * j - 1.3 * hash(j, 41)) * sec, clink = hash(j, 43) < 0.25 && t > 0 && t < 1.5 ? exp(-t / 0.3) * (sin(TAU * 2630 * t) + 0.6 * sin(TAU * 4120 * t)) : 0
      const a = x < END ? 1 : 0
      return [a * (0.05 * lp(talk, 2500) + 0.012 * clink), a * (0.05 * lp(talk, 2500) + 0.009 * clink)]
    }
  },
}`
  },
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

// ---- the Japanese battle (jbattle) -----------------------------------------------------------------------------
const pumpIf = o => (o.hard ? ' * pumpAt(x)' : '')

export { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, GATE, KITS, LEADS, PADS, TEXTURES, arpData, arpGraph, bassData, chipLead, compHit, drumData, drumGraph, graphLead, polyArp, pumpIf, struck }
