// Recipes of fight, babushka, hardstyle, phonk and breakcore — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { pick, round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, GATE, KITS, LEADS, PADS, TEXTURES, compHit, graphLead, pumpIf, struck } from './recipes.js'
import { sustainedLead } from './orchestra.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// ---- Test your fight: the stage music of fighting games — rhythm first, the melody a quiet motif in the echoes ---------
// glass: a soft FM ping (2 : 1 and 3 : 1, the index dying fast), far back in a dotted-eighth echo and a big hall
LEADS.glass = o => {
  o.need('instruments', 'fm')
  return struck('(f, t, v) => v * (0.6 * fm(f, t, { ratio: 2.005, index: 1.3, decay: 2.2, idecay: 7 }) + 0.3 * fm(2 * f, t, { ratio: 3.01, index: 0.7, decay: 4, idecay: 10 }))', [], {
    release: 0.6, life: 4, gain: 0.5, fx: FX.deep, extra: pumpIf(o),
    formula: ['G = \\Rev\\,\\Dly\\Big[v\\big(0.6e^{-2.2t}\\sin(2\\pi ft + 1.3e^{-7t}\\sin 2\\pi\\,2.005ft) + 0.3e^{-4t}\\sin(4\\pi ft + 0.7e^{-10t}\\sin 2\\pi\\,6.02ft)\\big)\\Big]\\ \\text{— стеклянный отзвук мотива}'],
  })({ ...o, color: '#9fe8ff' })
}
// synth stabs: the chord on four 3-voice supersaws, a low-pass that snaps shut in 50 ms, thrown into the echo — the
// minor-seventh hits of the arena
CHORDS.stabs = o => {
  o.need('engine', 'supersaw')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ff5f6f',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.3 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(0.25, h.d * 0.9) ? c[3] : [] },
  formula: ${JSON.stringify(['St = \\Rev\\,\\Dly\\Big[v\\,e^{-t/0.18}\\,\\LP^{Q=1.1}_{300 + 5000e^{-t/50\\text{мс}}}\\sum_{j}\\SS_3(f_j)\\Big]\\ \\text{— удары аккордом в синкопах, эхо на пунктирную восьмую}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, voices = [0, 1, 2, 3].map(j => supersaw({ voices: 3, detune: 0.1, seed: 70 + j })), lpL = filter('lp'), lpR = filter('lp')
    const echo = delay({ time: sec * 0.75, feedback: 0.38, wet: 0.3 }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.32 })
    let v = [57, 60, 64, 69]
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (c) v = c[3]
      const t = h ? (x - h.at) * sec : 9, a = h && c ? h.vel * (1 - exp(-t / 0.003)) * exp(-t / 0.18) : 0
      let l = 0, r = 0
      for (let j = 0; j < 4; j++) { const [p, q] = voices[j](hz(v[j % v.length] - 60, C4)); l += p; r += q }
      const k = ${round(0.28 * (o.gain ?? 1))} * a${pumpIf(o)}, fc = 300 + 5000 * exp(-t / 0.05)
      return verb(...echo(k * lpL(l, fc, 1.1), k * lpR(r, fc, 1.1)))
    }
  },
}})()`
}
// the acid bass: one saw through a screaming resonant low-pass, a sixteen-step pattern the seed draws (roots, octaves,
// fifths, the minor seventh, rests), accents opening the filter wider, slides that keep the gate open
BASSES.acid = o => {
  o.need('instruments', 'monoSynth')
  const r = o.r, PAT = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 'R' : r() < 0.28 ? '-' : pick(r, ['R', 'R', '8', '5', 'b']))).join('')
  const ACC = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 || r() < 0.2 ? 1 : 0)), SLIDE = Array.from({ length: 16 }, () => (r() < 0.2 ? 1 : 0))
  return `(() => {
  const SEQ = '${PAT}', ACC = ${JSON.stringify(ACC)}, SLIDE = ${JSON.stringify(SLIDE)} // R root, 8 octave, 5 fifth, b the minor seventh, - rest
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    if (e === 1) return { n: c[2], at: c[0], d: c[1], acc: 0, slide: 0 }
    const j = floor(4 * x + 1e-9), s = SEQ[mod(j, 16)]
    if (s === '-') return null
    return { n: c[2] + (s === '8' ? 12 : s === '5' ? c[5][1] : s === 'b' ? 10 : 0), at: j / 4, d: SLIDE[mod(j, 16)] ? 0.26 : 0.2, acc: ACC[mod(j, 16)], slide: SLIDE[mod(j, 16)] }
  }
  return {
  color: '#c6ff6b',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < Math.min(b.d, 0.25) * 0.9 ? [b.n] : [] },
  formula: ${JSON.stringify(['A = d(t_k)\\,\\tfrac1d\\tanh\\!\\Big(d\\,\\LP^{Q=3.4}_{f_c}\\LP_{f_c}\\big(\\tfrac12\\saw f + \\tfrac12\\saw 1.0052f\\big)\\Big),\\quad f_c = 260 + 2400v\\,e^{-t/0.14}', '\\text{16 шагов: } ' + PAT.replace(/-/g, '\\cdot ') + ',\\quad v = 1 \\text{ на акцентах, } 0.6 \\text{ иначе}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, s = monoSynth({ cutoff: 260, env: 2400, res: 3.4, decay: 0.14, glide: 40, sub: 0, drive: 2.4 }), fire = trigger()
    let n = 36, gap = 0
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      if (m && fire(m.at) && !m.slide) gap = 2
      const on = !!m && x - m.at < m.d * (m.slide ? 1.2 : 0.95) && gap-- <= 0
      return ${round(0.75 * (o.gain ?? 1))} * s(hz(n - 60, C4), on, m && m.acc ? 1 : 0.6)${pumpIf(o)}
    }
  },
}})()`
}
// the Reese bass: two saws 14 ¢ apart and one an octave up, phasing against each other, driven, through a low-pass that
// breathes over eight beats, a clean sine under it — held through every chord
BASSES.reese = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    return { n: c[2], at: c[0], d: c[1] }
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d - 0.1 ? [b.n] : [] },
  formula: ${JSON.stringify(['R = \\LP_{420 + 260\\sin(2\\pi x/8)}\\tanh\\!\\big(1.6(0.5\\saw 1.004f + 0.5\\saw 0.996f + 0.3\\saw 2.003f)\\big) + 0.55\\sin 2\\pi\\!\\int\\! f\\ \\text{— рис-бас}'])},
  audio() {
    const a = osc('saw'), b = osc('saw', 0.5), c = osc('saw', 0.25), sub = osc('sine'), lp = filter('lp'), gate = smooth(15), glide = smooth(30)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const f = hz(glide(n) - 60, C4), g = gate(m && x - m.at < m.d - 0.06 ? 1 : 0)
      const y = lp(tanh(1.6 * (0.5 * a(f * 1.004) + 0.5 * b(f * 0.996) + 0.3 * c(f * 2.003))), 420 + 260 * sin((TAU * x) / 8), 1.1) + 0.55 * sub(f)
      return ${round(0.3 * (o.gain ?? 1))} * g * y${pumpIf(o)}
    }
  },
}})()`
}
// an ambient pad: four 5-voice supersaws on the voicing, wide, a low-pass breathing over sixteen beats, a huge hall
PADS.ambipad = o => {
  o.need('engine', 'supersaw')
  return `{
  color: '#a0c4ff',
  graph: x => (padOn(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (padOn(x) && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['Pd = \\Rev_{0.96}\\Big[a\\,\\LP_{900 + 600\\sin(2\\pi x/16)}\\sum_{j}\\SS_5(f_j)\\Big],\\quad a \\text{ — вступает за 0.9 с}'])},
  audio() {
    const saws = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.25, width: 1, seed: 31 + j })), lpL = filter('lp'), lpR = filter('lp'), level = smooth(900), verb = reverb({ room: 0.96, damp: 0.3, wet: 0.6 })
    let v = [57, 60, 64, 69]
    return x => {
      const on = padOn(x), c = chordAt(x)
      if (on) v = c[3]
      const a = level(on ? 1 : 0), fc = 900 + 600 * sin((TAU * x) / 16)
      let l = 0, r = 0
      for (let j = 0; j < 4; j++) { const [p, q] = saws[j](hz(v[j % v.length] - 60, C4)); l += p; r += q }
      const k = ${round(0.05 * (o.gain ?? 1))} * a${o.hard ? ' * pumpAt(x)' : ''}
      return verb(k * lpL(l, fc), k * lpR(r, fc))
    }
  },
}`
}
// the arena kit around the club kick: a breakbeat snare with ghost notes, swung hats, a metal perc, a shaker, toms into
// each phrase, a crash on every round's first beat
KITS.fight = o => {
  o.need('instruments', 'snareDrum', 'clapDrum', 'hatDrum', 'shakerDrum', 'woodClack', 'taikoDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('perc', 0.5, 'x--x--x--x--x-x-')
      } else if (e >= 3) {
        steps('snare', 1, '----x--o-o--x--o')
        steps('hat', 0.5, 'x-xxx-xxx-xxx-xx')
        steps('open', 0.5, '--x-------x-----')
        steps('perc', 0.6, '---x-----x----x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('tom', 0.8, '----------x-x-xx')
      } else if (e === 2) {
        steps('snare', 0.9, '----x-------x--o')
        steps('hat', 0.45, 'x-x-x-x-x-x-x-x-')
        steps('shaker', 0.4, 'xoxoxoxoxoxoxoxo')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('shaker', 0.3, 'x-x-x-x-x-x-x-x-')
        steps('perc', 0.4, '------x-------x-')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`)}
  return {
  color: '#ff5f6f',
  ${stageGraph([['snare', 3.4, 0.7], ['tom', 3, 0.6], ['perc', 2.6, 0.4]])}
  ${stageMidi([['snare', 38], ['hat', 42], ['open', 46], ['shaker', 70], ['perc', 76], ['tom', 45], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.35S + 0.2\\,\\text{Clap} + 0.08H + 0.07H_o + 0.1\\,\\text{Sh} + 0.12\\,\\text{Perc} + 0.3\\,\\text{Tom} + 0.3\\,\\text{Crash}\\big]', '\\text{брейк: малый с призрачными нотами } {-}{-}{-}{-}x{-}{-}o{-}o{-}{-}x{-}{-}o'])},
  audio({ bpm }) {
    const sec = 60 / bpm, snare = snareDrum({ tone: 200, cutoff: 1800, decay: 15 }), clap = clapDrum({ center: 1400 }), hat = hatDrum({ cutoff: 8500, decay: 80 }), open = hatDrum({ cutoff: 7000, decay: 12 })
    const shaker = shakerDrum(), perc = woodClack({ f: 1400, seed: 41 }), tom = taikoDrum({ pitch: 110, decay: 0.45, bend: 2, crack: 0.35, boom: 0.2, seed: 87 }), crash = crashCymbal({ decay: 1.8, seed: 95 })
    const verb = reverb({ room: 0.8, damp: 0.3, wet: 0.24 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const s = x < END ? lastHit(x, 'snare') : null, cl = s && s.vel > 0.7 ? clap(s.τ * sec, true) : clap(1, false)
      const y = 0.35 * at('snare', snare, x) + 0.2 * cl + 0.08 * at('hat', hat, x) + 0.07 * at('open', open, x) + 0.1 * at('shaker', shaker, x) + 0.12 * at('perc', perc, x) + 0.3 * at('tom', tom, x)
      const [l, r] = verb(...pan(3 * y, 0)), c = 0.4 * at('crash', crash, x)
      return [l + c, r + 0.85 * c]
    }
  },
}})()`
}
// the arena's air: a low drone on the tonic and its fifth, wind, an impact on the first beat of every round (a sub diving
// 90 → 30 Hz and a burst of noise — "FIGHT!"), a riser through every build-up
TEXTURES.arena = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#b5838d',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    return r === 'build' ? -2 + (t / (sectionEnd(x) - s)) ** 2 * 3 : -2.95 + 0.05 * sin(TAU * x / 8)
  },
  formula: ${JSON.stringify(['\\text{гул: } 0.06\\big(\\sin 2\\pi f_T t + 0.5\\sin 2\\pi\\,1.5f_T t\\big),\\quad \\text{удар: } e^{-t/0.4}\\sin 2\\pi\\!\\int\\!(30 + 60e^{-t/0.08}) + e^{-t/0.05}\\LP_{2\\text{к}}\\eta', '\\text{подъём: } 0.5u^2\\,\\BP_{400\\cdot 2^{5u}}\\eta,\\quad u = t/L'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(61), wind = filter('bp'), rise = filter('bp'), boomN = filter('lp'), d1 = osc('sine'), d2 = osc('sine'), boom = osc('sine'), level = smooth(900), verb = reverb({ room: 0.93, damp: 0.35, wet: 0.45 })
    let last = -1
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), T = x * sec, a = level(x < END ? 1 : 0)
      const fd = hz(SCALE[0] - 36, C4), drone = 0.06 * (d1(fd) + 0.5 * d2(fd * 1.5)) * (0.8 + 0.2 * sin((TAU * x) / 16))
      const w = 0.05 * wind(n, 300 * 2 ** sin((TAU * T) / 13), 3)
      const u = r === 'build' ? t / (sectionEnd(x) - s) : 0, rs = 0.5 * u * u * rise(n, 400 * 2 ** (5 * u), 1.5)
      if (e >= 2 && r !== 'build' && t < 0.01 && s !== last) (last = s), boom.reset()
      const bt = e >= 2 && r !== 'build' ? t * sec : 9
      const im = bt < 2 ? exp(-bt / 0.4) * boom(30 + 60 * exp(-bt / 0.08)) + 0.5 * exp(-bt / 0.05) * boomN(n, 2000) : (boom(30), boomN(0, 2000), 0)
      const y = a * (drone + w + rs)
      const [l, rr] = verb(y, y)
      return [l + 0.5 * im, rr + 0.5 * im]
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { glass: 'glass' })

// ---- Кибербабушка: Russian folk on a hardbass floor — a babushka choir, balalaika, bayan, gusli, zhaleika, spoons -------
// The folk choir: three women in the open "white" voice (bright formants, little vibrato) and an alto an octave down,
// every note a new syllable (a consonant's dip, the vowel opening from "e" into its own), a scoop up into each note
LEADS.folkchoir = o => {
  o.need('instruments', 'voice', 'VOWELS', 'blend')
  return `{
  color: '#ff8fab',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Fc = \\Rev\\Big[\\textstyle\\sum_{i=1}^{3} V_{1.2}\\big(f_i, F(\\tau)\\big) + 0.7\\,V_{1.05}\\big(\\tfrac f2, F(\\tau)\\big)\\Big]\\big(1 - 0.7e^{-\\tau/25\\text{мс}}\\big),\\quad V_s \\text{ — голос (форманты } \\times s)', 'F(\\tau) = F_e + (F_v - F_e)(1 - e^{-\\tau/60\\text{мс}}),\\ v \\in \\{a, o, e, a, i, o\\};\\quad f = f_0\\cdot 2^{-0.6e^{-\\tau/40\\text{мс}}/12}\\ \\text{— белый голос, подъезд}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, vs = [1.2, 1.17, 1.23].map((s, i) => voice({ size: s, breath: 0.03, rough: 0.15 + 0.03 * i })), alto = voice({ size: 1.05, breath: 0.04, rough: 0.1 })
    const gate = smooth(12), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.3 }), SYL = ['a', 'o', 'e', 'a', 'i', 'o', 'a', 'e']
    let n = 0, at = -1, v = 'a'
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m) { n = m.n; if (m.at !== at) (at = m.at), (v = SYL[floor(8 * hash(floor(4 * m.at), 43))]) }
      const τs = m ? m.τ * sec : 9, on = m && m.u < 0.93 ? 1 : 0, a = gate(on) * (1 - 0.7 * exp(-τs / 0.025))
      const F = blend(VOWELS.e, VOWELS[v], 1 - exp(-τs / 0.06)), f = hz(n - 0.6 * exp(-τs / 0.04) + 0.08 * sin(TAU * 5.5 * t), C4)
      const y = vs[0](f * 0.998, F, a) + vs[1](f * 1.003, F, a) + vs[2](f, F, a) + 0.7 * alto(f / 2, F, a)
      return verb(...pan(${round(0.5 * o.gain)} * y${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
// the balalaika: two strings in unison plucked a hair apart (Karplus–Strong, exactly tuned) through a small triangular
// body (the air ≈ 280 Hz, the top ≈ 950 Hz, 2.6 kHz); a long note is a tremolo — the strum every thirty-second
LEADS.balalaika = o => {
  o.need('instruments', 'plucker')
  return `{
  color: '#f4d35e',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y[n] = e[n] + 0.996\\big(a\\,y[n - D] + (1 - a)y[n - D - 1]\\big),\\quad D = \\tfrac{44100}{f} - \\varphi\\ \\text{— две струны в унисон}', 'Ba = 0.55\\,\\LP_{7\\text{к}}y + 0.5\\BP_{280}y + 0.35\\BP_{950}y + 0.25\\BP_{2.6\\text{к}}y,\\quad \\text{тремоло: удар каждую } \\tfrac18 \\text{ доли на долгих нотах}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = plucker({ life: 2.5, decay: 0.996 }), fire = trigger(), lp = filter('lp'), b1 = filter('bp'), b2 = filter('bp'), b3 = filter('bp'), verb = reverb({ room: 0.75, damp: 0.45, wet: 0.22 })
    return x => {
      const m = ${o.at}(x)
      if (m && m.u < 0.95) {
        const k = m.d >= 0.75 ? floor(m.τ / 0.125) : 0
        if (fire(m.at + k * 0.125)) {
          const v = (k ? 0.55 + 0.15 * (k % 2) : 0.85) * (0.9 + 0.1 * hash(floor(8 * x), 7))
          p.hit(hz(m.n, C4), v, { bright: 0.82 })
          p.hit(hz(m.n, C4) * 1.002, 0.7 * v, { bright: 0.78, at: 40 })
        }
      }
      const s = p(), y = 0.55 * lp(s, 7000) + 0.5 * b1(s, 280, 2) + 0.35 * b2(s, 950, 2.5) + 0.25 * b3(s, 2600, 3)
      return verb(...pan(${round(0.7 * o.gain)} * y${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
// the zhaleika: a hornpipe — a reed in a wooden pipe with a cow-horn bell: nasal and bright, a little vibrato
LEADS.zhaleika = sustainedLead({
  make: "reed({ kind: 'oboe', breath: 0.06, seed: 151 })", imports: ['reed'], color: '#d4a373', gain: 0.45,
  formula: ['Zh = a\\big(0.3\\,s + \\BP_{1100}^{Q=4}s + 0.6\\BP_{2800}^{Q=4}s\\big) + 0.06\\BP_{2f}\\eta,\\quad s = \\LP\\,\\HP_{350}\\,\\Pi_{0.18}(g)\\ \\text{— жалейка: трость и роговой раструб}'],
})
// the bayan in the dance: the bass button on the beats (root, then fifth) and the chord on the off-beats — "oom-pah" at
// a gallop; held chords when calm
CHORDS.bayan = o => {
  o.need('instruments', 'accordion')
  return `(() => {
  const bayAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END - 1) return null
    const p = mod(x, 1), beat = mod(floor(x), 4), fifth = c[2] + c[5][1] - (c[5][1] > 5 ? 12 : 0)
    if (e === 0) return x - c[0] < c[1] - 0.15 ? { chord: true, at: c[0] } : null
    if (e === 1) return beat % 2 === 0 ? (p < 0.8 ? { bass: beat === 0 ? c[2] : fifth, at: floor(x) } : null) : p < 0.6 ? { chord: true, at: floor(x) } : null
    if (p < 0.4) return { bass: beat % 2 === 0 ? c[2] : fifth, at: floor(x) }
    return p >= 0.5 && p < 0.85 ? { chord: true, at: floor(x) + 0.5 } : null
  }
  return {
  color: '#e76f51',
  graph: x => { const b = bayAt(x), c = chordAt(x); return b && c ? (b.chord ? c[3] : [b.bass + 12]).map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const b = bayAt(x), c = chordAt(x); return b && c ? (b.chord ? c[3] : [b.bass + 12]) : [] },
  formula: ${JSON.stringify(['Bn = \\Rev\\,\\text{Корпус}\\Big[\\textstyle\\sum_j\\big(\\Pi_{0.2}(f_j) + 0.8\\,\\Pi_{0.2}(f_j\\,2^{12/1200}) + 0.4\\,\\Pi_{0.2}(f_j\\,2^{-12/1200})\\big)\\Big]\\ \\text{— три язычка на ноту, «мокрый» строй}', '\\text{бас на сильные доли (тоника, квинта), аккорд на слабые восьмые; корпус: } \\BP_{1.1\\text{к}} + \\BP_{2.9\\text{к}}'])},
  audio() {
    const lo = accordion({ voices: 1, musette: 6, gain: 0.16 }), hi = accordion({ voices: 4, musette: 14, gain: 0.09 }), verb = reverb({ room: 0.7, damp: 0.45, wet: 0.2 })
    return x => {
      const b = bayAt(x), c = chordAt(x)
      const [l1, r1] = lo(b && b.bass != null ? [hz(b.bass + 12 - 60, C4)] : []), [l2, r2] = hi(b && b.chord && c ? c[3].map(n => hz(n - 60, C4)) : [], 0.85)
      const g = ${round(o.gain ?? 1)}${pumpIf(o)}
      return verb(g * (l1 + l2), g * (r1 + r2))
    }
  },
}})()`
}
// the hard bass: on every off-beat between the kicks a driven saw-and-square note that drops onto its pitch from a fifth
// above in 12 ms (the bounce), a low-pass snapping shut; the octave on the last off-beat of a bar; long roots when calm
BASSES.hardbass = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (r === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    if (e === 1 || r === 'bridge') return { n: c[2], at: c[0], d: c[1] }
    const p = mod(x, 1)
    return p >= 0.5 ? { n: c[2] + (e >= 3 && mod(floor(x), 4) === 3 ? 12 : 0), at: floor(x) + 0.5, d: 0.42 } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d * 0.92 ? [b.n] : [] },
  formula: ${JSON.stringify(['Hb = d(t_k)\\,\\LP_{300 + 2500e^{-t/80\\text{мс}}}\\tanh\\!\\Big(3.5\\big(\\tfrac12\\saw g + \\tfrac12\\saw 1.01g + 0.4\\sq\\tfrac g2\\big)\\Big),\\quad g = f\\cdot 2^{7e^{-t/12\\text{мс}}/12}', '\\text{на слабые восьмые — между ударами бочки}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, a = osc('saw'), b = osc('saw', 0.3), q = osc('square'), lp = filter('lp'), gate = smooth(3)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const t = m ? (x - m.at) * sec : 1, on = m && x - m.at < m.d * 0.92, g = hz(n - 60 + 7 * exp(-t / 0.012), C4)
      const y = lp(tanh(3.5 * (0.5 * a(g) + 0.5 * b(g * 1.01) + 0.4 * q(g / 2))), 300 + 2500 * exp(-t / 0.08))
      return ${round(0.3 * (o.gain ?? 1))} * gate(on ? 1 : 0) * y${pumpIf(o)}
    }
  },
}})()`
}
// the gusli: the chord swept upwards over an octave and a half, 35 ms a string (Karplus–Strong, exactly tuned), at
// every chord and halfway through a long one
ARPS.gusli = o => {
  o.need('instruments', 'plucker')
  return `(() => {
  const guAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END - 1 || role(x) === 'build') return null
    const half = c[1] >= 4 && x - c[0] >= c[1] / 2
    return { at: c[0] + (half ? c[1] / 2 : 0), notes: [...c[3], ...c[3].map(n => n + 12)].sort((a, b) => a - b), vel: 0.45 + 0.1 * e }
  }
  return {
  color: '#90be6d',
  graph: x => { const g = guAt(x); return g && x - g.at < 0.5 ? g.notes.map(n => ${o.lane[0]} + (n - 55) / 40) : null },
  midi: x => { const g = guAt(x); return g && x - g.at < 0.4 ? g.notes : [] },
  formula: ${JSON.stringify(['\\text{гусли: } \\textstyle\\sum_{i} y_i\\big(t - 35i\\,\\text{мс}\\big),\\ y_i[n] = e[n] + 0.998\\big(0.7y_i[n - D_i] + 0.3y_i[n - D_i - 1]\\big)\\ \\text{— глиссандо по аккорду вверх}'])},
  audio() {
    const p = plucker({ life: 3, decay: 0.998 }), fire = trigger(), lp = filter('lp'), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.36 })
    return x => {
      const g = guAt(x)
      if (g && fire(g.at)) g.notes.forEach((n, i) => p.hit(hz(n - 60, C4), g.vel * (0.85 + 0.15 * hash(i, floor(g.at))), { bright: 0.7, at: floor(i * 0.035 * 44100) }))
      return verb(...pan(${round(0.3 * (o.gain ?? 1))} * lp(p(), 7000)${pumpIf(o)}, -0.35))
    }
  },
}})()`
}
// the babushkas' kit around the club kick: a clap on 2 and 4, off-beat open hats, wooden spoons in sixteenths, the
// tambourine (a frame drum's jingles), a snare roll through the build-ups; in the intro, hands clapping on 2 and 4
KITS.babushka = o => {
  o.need('instruments', 'clapDrum', 'snareDrum', 'hatDrum', 'woodClack', 'riqDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('spoons', 0.6, 'x-x-x-x-x-x-x-x-')
      } else if (e >= 3) {
        add('clap', 1, 1, 3)
        for (let i = 0; i < 4; i++) add('open', 0.7, i + 0.5)
        steps('spoons', 0.55, 'xoxxoxxoxoxxoxxo')
        steps('tamb', 0.5, '--x---x---x---x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('snare', 0.7, '------------xxxx')
      } else if (e === 2) {
        add('clap', 0.8, 1, 3)
        steps('spoons', 0.5, 'x-xox-xox-xox-xo')
        steps('tamb', 0.45, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.7, 0)
      } else if (e === 1) {
        steps('spoons', 0.4, 'x---x-x-x---x-x-')
        steps('tamb', 0.35, '----x-------x---')
      } else if (r === 'intro' || r === 'outro') steps('hands', 0.5, '----x-------x---')`)}
  return {
  color: '#ffb703',
  ${stageGraph([['clap', 3.6, 0.7], ['snare', 3.2, 0.6], ['spoons', 2.6, 0.3]])}
  ${stageMidi([['clap', 39], ['snare', 38], ['open', 46], ['spoons', 76], ['tamb', 54], ['hands', 40], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.6\\,\\text{Clap} + 0.3S + 0.12H_o + 0.14\\,\\text{Ложки} + 0.12\\,\\text{Бубен} + 0.4\\,\\text{Ладоши} + 0.3\\,\\text{Crash}\\big]', '\\text{ложки: } e^{-t/12\\text{мс}}\\big(0.6\\sin 2\\pi\\,2100t + 0.4\\sin 2\\pi\\,3276t\\big) \\text{ дважды за 8 мс; бубен — звон пар тарелочек}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, clap = clapDrum({ center: 1300 }), hands = clapDrum({ center: 1000 }), snare = snareDrum({ tone: 200, cutoff: 1400, decay: 15 }), open = hatDrum({ cutoff: 7500, decay: 11 })
    const sp1 = woodClack({ f: 2100, seed: 43 }), sp2 = woodClack({ f: 2350, seed: 47 }), tamb = riqDrum({ seed: 61 }), crash = crashCymbal({ decay: 1.6, seed: 93 }), verb = reverb({ room: 0.75, damp: 0.4, wet: 0.22 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const s = x < END ? lastHit(x, 'spoons') : null, ts = s ? s.τ * sec : 9, tb = x < END ? lastHit(x, 'tamb') : null
      const spoons = s ? s.vel * (sp1(ts, true) + 0.7 * sp2(ts - 0.008, ts > 0.008)) : (sp1(9, false), sp2(9, false), 0)
      const tm = tb ? tb.vel * tamb(tb.τ * sec, 'jingle', true) : tamb(9, 'jingle', false)
      const y = 0.6 * at('clap', clap, x) + 0.4 * at('hands', hands, x) + 0.3 * at('snare', snare, x) + 0.12 * at('open', open, x) + 0.14 * spoons + 0.12 * tm
      const [l, r] = verb(...pan(4 * y, 0)), c = 0.8 * at('crash', crash, x)
      return [l + c, r + 0.85 * c]
    }
  },
}})()`
}
// the shouts: the babushkas cry out at the start of every dance and before each phrase of it — «эй!», «ух!», «оп-па!»,
// «ай!» (two voices, the vowel moving, the pitch falling, an "h" of breath first), with a robot's grain on one of them
TEXTURES.shouts = o => {
  o.need('instruments', 'voice', 'VOWELS', 'blend', 'smoothstep')
  o.need('engine', 'noise')
  return `{
  color: '#ff70a6',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x / 4) : null),
  formula: ${JSON.stringify(['\\text{крик: } V\\big(f_0\\,2^{-s\\min(1, t/0.3)/12},\\ F_1 \\to F_2\\big)\\,(1 - e^{-t/20\\text{мс}})e^{-t/0.25} + 0.4e^{-t/30\\text{мс}}\\BP_{1.8\\text{к}}\\eta\\ \\text{(«х»)}', '\\text{«эй» } e\\to i,\\ \\text{«ух» } u,\\ \\text{«оп-па» } o\\to a,\\ \\text{«ай» } a\\to i;\\quad \\text{второй голос — с «цифровым» зерном (выборка через 4)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(71), h = filter('bp'), v1 = voice({ size: 1.15, breath: 0.15, rough: 0.35 }), v2 = voice({ size: 1.08, breath: 0.12, rough: 0.3 }), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.3 })
    const SH = [['e', 'i', 330, 5, 0], ['u', 'u', 290, 3, 1], ['o', 'a', 345, 7, 1], ['a', 'i', 320, 4, 0]]
    let k = 0, held = 0
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s
      let at = -1
      if (e >= 2 && r !== 'build' && t < 1.5) at = s
      else if (e >= 3 && mod(t, 16) >= 15) at = s + floor(t / 16) * 16 + 15
      const ts = at >= 0 ? (x - at) * sec : 9, j = floor(4 * hash(floor(at), 13)), [fa, fb, f0, fall, hh] = SH[j]
      const a = ts < 0.7 ? (1 - exp(-ts / 0.02)) * exp(-ts / 0.25) : 0, F = blend(VOWELS[fa], VOWELS[fb], smoothstep(0.05, 0.25, ts)), f = f0 * 2 ** (-fall * Math.min(1, ts / 0.3) / 12)
      const breath = hh && ts < 0.15 ? 0.4 * exp(-ts / 0.03) * h(η(), 1800, 1) : (h(η(), 1800, 1), 0)
      const y1 = v1(f, F, a), y2 = v2(f * 1.012, F, a)
      if (++k >= 4) (k = 0), (held = y2)
      const y = ${round(1.75 * (o.gain ?? 1))} * (y1 + 0.8 * held + breath)
      return verb(...pan(y, 0.15))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { folkchoir: 'zhaleika', balalaika: 'zhaleika', zhaleika: 'balalaika' })

// ---- Hardstyle: the euphoric sound — a story told in the breaks, the climax on the kick and the reverse bass ----------
// gated supersaw chords: four 7-voice supersaws on the voicing; held through the breaks, chopped by a sixteenth gate in the
// climaxes (the trance gate), ducked under the kick
CHORDS.gatesaw = o => {
  o.need('engine', 'supersaw')
  return `(() => {
  const GATE16 = 'x-xx-xx-x-xx-xx-' // the gate in the climaxes, sixteenths
  return {
  color: '#ff6fd8',
  graph: x => (chordAt(x) && energy(x) >= 0 && role(x) !== 'build' ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const c = chordAt(x), e = energy(x); if (!c || e < 0 || role(x) === 'build' || x - c[0] >= c[1] - 0.1) return []; return e >= 3 ? (GATE16[mod(floor(4 * x), 16)] === 'x' && mod(x, 0.25) < 0.2 ? c[3] : []) : c[3] },
  formula: ${JSON.stringify(['G = \\Rev\\Big[d(t_k)\\,g(x)\\,\\LP_{f_c(E)}\\sum_{j}\\SS_7(f_j)\\Big],\\quad g = 1 \\text{ на } x{-}xx{-}xx{-}x{-}xx{-}xx{-}\\ \\text{(в кульминациях), иначе держится}', 'f_c = (1200, 1800, 3000, 6500)_E'])},
  audio({ bpm }) {
    const sec = 60 / bpm, saws = [0, 1, 2, 3].map(j => supersaw({ voices: 7, detune: 0.24, width: 0.95, seed: 51 + j })), lpL = filter('lp'), lpR = filter('lp'), gate = smooth(4), cut = smooth(200), verb = reverb({ room: 0.9, damp: 0.35, wet: 0.36 })
    let v = [57, 60, 64, 69]
    return x => {
      const c = chordAt(x), e = energy(x)
      if (c) v = c[3]
      const on = c && e >= 0 && role(x) !== 'build' && x - c[0] < c[1] - 0.06 && (e < 3 || (GATE16[mod(floor(4 * x), 16)] === 'x' && mod(x, 0.25) < 0.2))
      const a = gate(on ? 1 : 0), fc = cut([1200, 1800, 3000, 6500][Math.max(0, e)])
      let l = 0, r = 0
      for (let j = 0; j < 4; j++) { const [p, q] = saws[j](hz(v[j % v.length] - 60, C4)); l += p; r += q }
      const k = ${round(0.06 * (o.gain ?? 1))} * a * pumpAt(x)
      return verb(k * lpL(l, fc), k * lpR(r, fc))
    }
  },
}})()`
}
// the sub in the breaks: a sine and a soft saw on the roots, held; out where the reverse bass takes over
BASSES.hssub = o => {
  o.need('engine', 'osc')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || e >= 3 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    return { n: c[2], at: c[0], d: c[1] }
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d - 0.1 ? [b.n] : [] },
  formula: ${JSON.stringify(['S = a\\big(0.6\\sin 2\\pi\\!\\int\\! f + 0.15\\,\\LP_{400}\\saw f\\big)\\ \\text{— суб в брейках; в кульминации бас — обратный}'])},
  audio() {
    const s = osc('sine'), w = osc('saw'), lp = filter('lp'), gate = smooth(20), glide = smooth(30)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const f = hz(glide(n) - 60, C4), a = gate(m && x - m.at < m.d - 0.06 ? 1 : 0)
      return ${round(0.42 * (o.gain ?? 1))} * a * (0.6 * s(f) + 0.15 * lp(w(f), 400))
    }
  },
}})()`
}
// the hardstyle kit: a clap on 2 and 4, open hats on the off-beats, sixteenth hats in the last climax and the anti-climax,
// a crash every sixteen beats, a snare roll doubling through the build-ups and a reversed cymbal into each drop
KITS.hardkit = o => {
  o.need('instruments', 'clapDrum', 'snareDrum', 'hatDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        if (x + 4 >= sectionEnd(x)) add('swell', 1, 0)
      } else if (e >= 3) {
        if (r !== 'intro' || t >= 16) {
          add('clap', 1, 1, 3)
          for (let i = 0; i < 4; i++) add('open', 0.75, i + 0.5)
        }
        if (r === 'final' || r === 'solo') steps('hat', 0.4, 'x-x-x-x-x-x-x-x-'.replace(/-/g, 'o'))
        if (mod(t, 16) === 0 && r !== 'intro') add('crash', 1, 0)
        if (fill && r !== 'intro') add('clap', 0.6, 3.5, 3.75)
      } else if (e >= 1) {
        if (t === 0) add('crash', 0.8, 0)
        if (e === 2) steps('hat', 0.35, '--x---x---x---x-')
      }`)}
  return {
  color: '#ff6f91',
  ${stageGraph([['clap', 3.6, 0.7], ['snare', 3.2, 0.6], ['open', 2.4, 0.3]])}
  ${stageMidi([['snare', 38], ['clap', 39], ['hat', 42], ['open', 46], ['crash', 49], ['swell', 57]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.8\\,\\text{Clap} + 0.3S + 0.1H + 0.14H_o + 0.3\\,\\text{Crash}\\big] + \\text{тарелка задом наперёд перед дропом}', '\\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18 \\text{ доли}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, clap = clapDrum({ center: 1350 }), body = snareDrum({ tone: 190, cutoff: 1500, decay: 15 }), snare = snareDrum({ tone: 210, cutoff: 1100, decay: 13 })
    const hat = hatDrum({ cutoff: 8500, decay: 80 }), open = hatDrum({ cutoff: 7500, decay: 10 }), crash = crashCymbal({ decay: 1.7, seed: 99 }), swell = crashCymbal({ decay: 2, seed: 101 }), verb = reverb({ room: 0.8, damp: 0.35, wet: 0.26 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const sw = x < END ? lastHit(x, 'swell') : null, u = sw ? 4 - sw.τ : 9
      const rev = u > 0 && u < 4 ? exp((-u * sec) / 0.6) * swell(0.03, true) : (swell(1, false), 0)
      const y = 0.8 * at('clap', clap, x) + 0.3 * at('clap', body, x) + 0.3 * at('snare', snare, x) + 0.1 * at('hat', hat, x) + 0.14 * at('open', open, x)
      const [l, r] = verb(...pan(5.5 * y, 0.05)), c = 0.8 * at('crash', crash, x)
      return [l + c + 0.6 * rev, r + 0.9 * c + 0.6 * rev]
    }
  },
}})()`
}
// the screech and the build-ups: a riser climbing through every build (a noise band and a saw siren), a downlifter and a
// sub impact on each drop, and in the anti-climax the screech — two driven saws and a square, a resonant band sweeping
// like a mouth ("ee-ow"), the pitch zapping down an octave onto each note of its rhythm on the roots
TEXTURES.screech = o => {
  o.need('engine', 'noise', 'osc', 'tanh')
  return `{
  color: '#ff3b6b',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.5
    return r === 'solo' ? 0.6 + 0.4 * sin(TAU * x) : null
  },
  formula: ${JSON.stringify(['\\text{скрич: } \\tanh\\!\\Big(2\\,\\BP^{Q=6}_{f_c(t)}\\tanh\\big(4(\\saw g + \\saw 1.01g + 0.5\\sq g)\\big)\\Big),\\quad g = f\\cdot 2^{12e^{-t/40\\text{мс}}/12},\\ f_c = 1200\\cdot 2^{2.2\\,(0.5 + 0.5\\sin 2\\pi\\cdot 4\\tau)}', '\\text{подъём: } 0.6u^2\\BP_{300\\cdot 2^{5.3u}}\\eta + 0.1u\\,\\saw(220\\cdot 2^{3u});\\quad \\text{в дроп: } e^{-1.5t}\\BP_{8000\\cdot 2^{-4t}}\\eta + \\text{суб } 90 \\to 30\\ \\text{Гц}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(29), bp = filter('bp'), bp2 = filter('bp'), sbp = filter('bp'), a = osc('saw'), b = osc('saw', 0.3), q = osc('square'), siren = osc('saw'), boom = osc('sine'), verb = reverb({ room: 0.88, wet: 0.4 })
    const RH = 'x--x--x---x-x---'
    let last = -1
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), c = chordAt(x)
      const u = r === 'build' ? t / (sectionEnd(x) - s) : 0
      let y = 0.6 * u * u * bp(n, 300 * 2 ** (5.3 * u), 1.5) + 0.1 * u * siren(220 * 2 ** (3 * u))
      const down = e >= 3 && r !== 'intro' && r !== 'outro' && t < 3 ? t * sec : 9
      if (down < 0.01 && s !== last) (last = s), boom.reset()
      y += 0.45 * exp(-1.5 * down) * bp2(n, 8000 * 2 ** (-4 * down), 1) + (down < 2 ? 0.6 * exp(-down / 0.35) * boom(30 + 60 * exp(-down / 0.1)) : (boom(30), 0))
      let k = floor(4 * x + 1e-9)
      while (RH[mod(k, 16)] !== 'x' && k > floor(4 * x) - 16) k--
      const ts = (x - k / 4) * sec, on = r === 'solo' && c && ts < 0.32
      const g = hz((c ? c[2] + 24 : 48) - 60 + 12 * exp(-ts / 0.04), C4), fc = 1200 * 2 ** (2.2 * (0.5 + 0.5 * sin(TAU * 4 * (x - k / 4))))
      const sc = tanh(2 * sbp(tanh(4 * (a(g) + b(g * 1.01) + 0.5 * q(g))), fc, 6))
      y += on ? ${round(0.42 * (o.gain ?? 1))} * Math.min(1, ts / 0.004) * (1 - Math.min(1, Math.max(0, ts - 0.26) / 0.06)) * sc * pumpAt(x) : 0
      return verb(y, y)
    }
  },
}`
}

// ---- Drift phonk: the 808 cowbell riff, a distorted 808 that slides, Memphis voices, trap hats with rolls ------------------
// the cowbell: the 808's two squares pitched to the riff, driven hard (phonk's saturation), a high-pass, an echo
LEADS.cowbell = o => {
  o.need('instruments', 'cowbellTone')
  o.need('engine', 'tanh')
  return `{
  color: '#ffffff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Cb = \\Rev\\,\\Dly\\Big[\\HP_{250}\\tanh\\!\\big(2.4\\,C(f, t)\\big)\\Big],\\quad C = \\big(0.62e^{-t/12\\text{мс}} + 0.38e^{-t/0.32}\\big)\\sum_{k\\ \\text{нечёт}}\\Big(\\tfrac{H(kf)}{k}\\sin 2\\pi kft + \\tfrac{0.85H(1.48kf)}{k}\\sin 2\\pi\\,1.48kft\\Big)', 'H(\\nu) = \\Big(1 + 1.3^2\\big(\\tfrac{\\nu}{4.9f} - \\tfrac{4.9f}{\\nu}\\big)^2\\Big)^{-1/2}\\ \\text{— полоса 808 (2.64 кГц над 540 Гц)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(cowbellTone, { release: 0.05, life: 1.4, max: 8 }), fire = trigger(), hp = filter('hp'), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.22 }), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.28 })
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.85 + 0.15 * hash(floor(4 * x), 9), 1.2)
      return verb(...echo(...pan(${round(0.32 * o.gain)} * hp(tanh(2.4 * p()), 250)${pumpIf(o)}, ${o.pan})))
    }
  },
}`
}
// the steel pan: struck notes whose octave and twelfth swell in after the stick (steelpanTone), a hall
LEADS.steelpan = o => struck('steelpanTone', ['steelpanTone'], {
  release: 0.4, life: 3, gain: 0.55, fx: FX.echoHall, extra: pumpIf(o), vel: '0.75 + 0.2 * hash(floor(4 * x), 3)',
  formula: ['Sp(f,t,v) = v\\big(e^{-t/1.3d}\\sin 2\\pi ft + (0.5 + 0.45v)(1 - e^{-t/8\\text{мс}})e^{-t/0.7d}\\sin 2\\pi\\,2.004ft + (0.15 + 0.3v)(1 - e^{-t/12\\text{мс}})e^{-t/0.3d}\\sin 2\\pi\\,3ft\\big)', 'd = (440/f)^{0.35}\\ \\text{— стил-пэн: октава и дуодецима нарастают после удара}'],
})({ ...o, color: '#7fdbca' })
// the 808: a sine driven into tanh, held long, sliding between notes (portamento 45 ms) — sometimes an octave up on an
// off-beat hit; the pattern by energy
BASSES.b808 = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const PAT = { 1: 'x---------------', 2: 'x-----x---x-----', 3: 'x--x--x---x--x--' }
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    const P = PAT[Math.min(3, e)], bar = floor(x / 4) * 4
    let k = floor(4 * (x - bar) + 1e-9)
    while (k > 0 && P[k] !== 'x') k--
    const at = bar + k / 4
    return { n: c[2] + (k > 0 && hash(at, 61) < 0.3 ? 12 : 0), at }
  }
  return {
  color: '#c9b8ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 26) / 28 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < 0.9 ? [b.n] : [] },
  formula: ${JSON.stringify(['808 = a\\,\\LP_{3000}\\tanh\\!\\big(2.8\\sin 2\\pi\\!\\int\\! g\\big) + 0.3a\\sin 2\\pi\\!\\int\\! g,\\quad a = e^{-t/1.2},\\quad g \\text{ скользит к } f \\text{ за 45 мс}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, o1 = osc('sine'), lp = filter('lp'), glide = smooth(45), gate = smooth(4)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const t = m ? (x - m.at) * sec : 9, s = o1(hz(glide(n) - 60, C4)), a = gate(m ? exp(-t / 1.2) : 0)
      return ${round(0.4 * (o.gain ?? 1))} * a * (lp(tanh(2.8 * s), 3000) + 0.3 * s)${pumpIf(o)}
    }
  },
}})()`
}
// the trap kit: a kick under the 808, the clap on 3 (half time), eighth hats that roll at the end of every other bar (sixteenths,
// then thirty-seconds) and in triplets in the drops; a crash at the drops
KITS.trap = o => {
  o.need('instruments', 'kickDrum', 'clapDrum', 'snareDrum', 'hatDrum', 'crashCymbal', 'tape')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
      } else if (e >= 2) {
        steps('kick', 1, e >= 3 ? 'x-----x---x-----' : 'x---------x-----')
        add('clap', 1, 2)
        const roll = b % 2 === 1
        for (let i = 0; i < 8; i++) if (!(roll && i >= 6)) add('hat', i % 2 ? 0.45 : 0.6, i / 2)
        if (roll) { add('hat', 0.5, 3, 3.25); for (let k = 0; k < 4; k++) add('hat', 0.4 + 0.1 * k, 3.5 + k / 8) }
        if (e >= 3 && b % 4 === 1) for (let k = 0; k < 3; k++) add('hat', 0.55, 1 + k / 3)
        if (e >= 3) steps('open', 0.45, '--------------x-')
        if (mod(t, 16) === 0) add('crash', 0.8, 0)
      } else if (e === 1) {
        steps('hat', 0.35, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.6, 0)
      }`)}
  return {
  color: '#ff5f6f',
  ${stageGraph([['kick', 3.5, 0.6], ['clap', 3.2, 0.6], ['hat', 2.2, 0.2]])}
  ${stageMidi([['kick', 36], ['clap', 39], ['hat', 42], ['open', 46], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\Tape\\big[0.6K + 0.5\\,\\text{Clap} + 0.2S + 0.08H + 0.06H_o + 0.25\\,\\text{Crash}\\big],\\quad \\text{хлопок на 3 (половинный темп)}', '\\text{хэты: восьмые, в конце каждого второго такта — шестнадцатые и тридцать вторые, в дропах — триоли}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 48, f1: 160, sweep: 38, decay: 5, drive: 2.2 }), clap = clapDrum({ center: 1250 }), snare = snareDrum({ tone: 190, cutoff: 1200, decay: 14 })
    const hat = hatDrum({ cutoff: 9000, decay: 95 }), open = hatDrum({ cutoff: 7000, decay: 11 }), crash = crashCymbal({ decay: 1.5, seed: 103 }), tp = tape({ drive: 1.5, wow: 0.0006 }), verb = reverb({ room: 0.7, damp: 0.45, wet: 0.18 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.6 * at('kick', kick, x, 1) + 0.5 * at('clap', clap, x) + 0.2 * at('clap', snare, x) + 0.08 * at('hat', hat, x) + 0.06 * at('open', open, x) + 0.25 * at('crash', crash, x)
      return verb(...tp(...pan(1.2 * y, 0)))
    }
  },
}})()`
}
// Memphis: vinyl, and pitched-down voices from an old tape — «ха», «эй», «йе» chopped on the beat in the drops (a low
// formant voice through a telephone band, the tape wobbling)
TEXTURES.memphis = o => {
  o.need('instruments', 'vinyl', 'voice', 'VOWELS', 'blend', 'smoothstep')
  return `{
  color: '#9d8189',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x / 2) : null),
  formula: ${JSON.stringify(['\\text{мемфис: } \\BP^{Q=0.8}_{1.2\\text{к}}\\,V\\big(f_0\\,2^{-3t},\\ F_a \\to F_e\\big)\\,(1 - e^{-t/15\\text{мс}})e^{-t/0.18} + \\text{винил},\\quad f_0 \\approx 95\\ \\text{Гц (голос на кассете, замедленный)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, v = vinyl({ hiss: 0.01, crackle: 0.4 }), vo = voice({ size: 0.82, breath: 0.12, rough: 0.45 }), tel = filter('bp'), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.25 })
    const CH = [['a', 'a', 0], ['e', 'i', 1], ['i', 'e', 2]]
    return x => {
      const e = energy(x), b = floor(x / 4), p = x - 4 * b, c = v()
      const slot = e >= 3 && b % 2 === 1 ? (p >= 2.5 && p < 3 ? 2.5 : p >= 3 && p < 3.5 ? 3 : -1) : -1
      const ts = slot >= 0 ? (p - slot) * sec : 9, j = floor(3 * hash(2 * b + (slot === 3 ? 1 : 0), 17)), [fa, fb] = CH[j]
      const a = ts < 0.5 && hash(2 * b + (slot === 3 ? 1 : 0), 19) < 0.7 ? (1 - exp(-ts / 0.015)) * exp(-ts / 0.18) : 0
      const y = 1.6 * tel(vo(95 * 2 ** (-3 * Math.min(ts, 0.5)) * (1 + 0.004 * sin(TAU * 0.7 * x * sec)), blend(VOWELS[fa], VOWELS[fb], smoothstep(0.03, 0.2, ts)), a), 1200, 0.8)
      const [l, r] = verb(...pan(${round(1.25 * (o.gain ?? 1))} * y, -0.1))
      return x < END + 1 ? [l + c, r + c] : [l, r]
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { cowbell: 'steelpan', steelpan: 'bells' })

// ---- Breakcore: the Amen break chopped at 200 BPM, gabber kicks, a Reese, pads and a melancholy melody --------------------
// The Amen break as four bars of sixteenth slices; every sixteenth of the song plays a slice — the one in its place, one
// from anywhere in the break, or the one before again (a stutter); rolls of the snare retriggered 4 or 8 times a sixteenth,
// higher each time; a slice may be pitched (played faster or slower, as a sampler does). An edit cuts what the slice before
// left ringing (5 ms). In the breakdown the break plays at half speed, an octave down; gabber kicks in the chaos.
KITS.amen = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'crashCymbal')
  o.need('engine', 'tanh')
  return `(() => {
  const AMEN = [ // the break: 4 bars × 16 sixteenths
    { kick: 'x-x-------xx----', snare: '----x--x-x--x--x', ride: 'x-x-x-x-x-x-x-x-' },
    { kick: 'x-x-------xx----', snare: '----x--x-x--x--x', ride: 'x-x-x-x-x-x-x-x-' },
    { kick: 'x-x-------x-----', snare: '----x--x-x----x-', ride: 'x-x-x-x-x-x-x-x-' },
    { kick: '--xx------x-----', snare: '-x--x--x-x----x-', ride: 'x-x-x-x-x---x-x-', crash: '----------x-----' },
  ]
  const SLICES = [] // a slice: the hits of one sixteenth of the break, [drum, vel]
  for (let s = 0; s < 64; s++) { const bar = AMEN[s >> 4], hs = []; for (const d in bar) if (bar[d][s & 15] === 'x') hs.push([d, d === 'ride' ? 0.6 : 1]); SLICES.push(hs) }
  const barCache = new Map()
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const put = (s, pos, k = 1, vel = 1) => { for (const [d, v] of SLICES[mod(s, 64)]) hits.push([pos, d, v * vel, k]) }
    if (x < END) {
      const [s0, r, e] = sectionOf(x), t = x - s0, L = sectionEnd(x) - s0, cyc = mod(b, 4) * 16
      if (r === 'build') {
        const step = t < L / 2 ? 0.5 : t < 0.75 * L ? 0.25 : t < 0.875 * L ? 0.125 : 0.0625
        for (let p = 0; p < 4; p += step) hits.push([p, 'snare', 0.4 + (0.6 * (t + p)) / L, 1 + (0.5 * (t + p)) / L])
        if (t < L / 2) for (let j = 0; j < 16; j += 4) put(cyc + j, j / 4)
      } else if (e === 1) {
        for (let j = 0; j < 16; j += 2) put(mod(b, 8) * 8 + j / 2, j / 4, 0.5)
      } else if (e >= 2) {
        const chaos = r === 'solo' ? 1 : e >= 3 ? 0.45 : 0.15
        let prev = cyc
        for (let j = 0; j < 16; j++) {
          const h = hash(16 * b + j, 71), h2 = hash(16 * b + j, 73)
          let s = cyc + j
          if (h < 0.3 * chaos) s = floor(64 * h2)
          else if (h < 0.45 * chaos) s = prev
          if (s !== cyc + j) hits.push([j / 4, 'cut', 1, 1])
          if (j >= 12 && (mod(b, 4) === 3 || r === 'solo') && h2 < 0.25 + 0.4 * chaos) {
            const n = h < 0.5 ? 4 : 8
            hits.push([j / 4, 'cut', 1, 1])
            for (let q = 0; q < n; q++) hits.push([j / 4 + q / (4 * n), 'snare', 0.5 + (0.5 * q) / n, 1 + (0.48 * q) / n])
          } else put(s, j / 4, h2 < 0.12 * chaos ? 1.5 : h2 > 1 - 0.1 * chaos ? 0.75 : 1)
          prev = s
        }
        if (r === 'solo' || (r === 'final' && hash(b, 79) < 0.5)) for (let p = 0; p < 4; p += r === 'solo' ? 1 : 2) hits.push([p, 'gabber', 1, 1])
        if (t === 0) hits.push([0, 'crash', 1, 1])
      } else if (r === 'outro' && t === 0) hits.push([0, 'crash', 0.8, 0.8])
    }
    hits.sort((a, c) => a[0] - c[0])
    barCache.set(b, hits)
    return hits
  }
  function lastHit(x, drum) {
    for (let b = floor(x / 4); b >= floor(x / 4) - 2 && b >= 0; b--) {
      let best = null
      for (const [p, d, v, k] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v, k }
      if (best) return best
    }
    return null
  }
  return {
  color: '#ff4f8b',
  graph: x => {
    if (x >= END) return null
    const k = lastHit(x, 'kick'), s = lastHit(x, 'snare'), g = lastHit(x, 'gabber')
    if (g && g.τ < 0.3) return 3.8 + 0.7 * exp(-8 * g.τ)
    if (s && s.τ < 0.15) return 3.2 + 0.6 * s.vel * exp(-12 * s.τ)
    return k && k.τ < 0.2 ? 2.8 + 0.5 * exp(-10 * k.τ) : null
  },
  midi: x => (x >= END ? [] : [['kick', 36], ['gabber', 35], ['snare', 38], ['ride', 51], ['crash', 49]].filter(([d]) => lastHit(x, d)?.τ < 0.06).map(([, n]) => n)),
  formula: ${JSON.stringify(['\\text{амен-брейк: 4 такта} \\times 16 \\text{ долек; шестнадцатая } j \\text{ играет дольку } \\sigma(j) = \\begin{cases} j & \\text{на месте}\\\\ \\lfloor 64h\\rfloor & \\text{переставлена}\\\\ \\sigma(j - 1) & \\text{заикание}\\end{cases}', '\\text{дробь: малый барабан } n = 4, 8 \\text{ раз за шестнадцатую, выше на } 0.48q/n;\\ \\text{долька быстрее/медленнее в } k = 1.5,\\ 0.75 \\text{ раза (как сэмплер)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 55, f1: 140, sweep: 30, decay: 9, drive: 1.6 }), gab = kickDrum({ f0: 52, f1: 260, sweep: 25, decay: 4, drive: 9 }), snare = snareDrum({ tone: 240, cutoff: 1400, decay: 14 })
    const ride = hatDrum({ decay: 6, cutoff: 5000, ring: 0.85 }), crash = crashCymbal({ decay: 1.4, seed: 107 }), lp = filter('lp'), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.12 })
    const play = (x, d, f, s, cut) => {
      const h = x < END ? lastHit(x, d) : null
      if (!h) return f(9, false)
      return (cut && cut.τ < h.τ ? exp((-cut.τ * sec) / 0.005) : 1) * h.vel * f(h.τ * h.k * s, true)
    }
    return x => {
      const cut = x < END ? lastHit(x, 'cut') : null
      const brk = 0.55 * play(x, 'kick', kick, 1, cut) + 0.42 * play(x, 'snare', snare, sec, cut) + 0.12 * play(x, 'ride', ride, sec, cut) + 0.25 * play(x, 'crash', crash, sec, null)
      const y = Math.round(256 * tanh(1.3 * lp(brk, 9500))) / 256 + 0.32 * play(x, 'gabber', gab, 1, null)
      return verb(...pan(1.3 * y, 0))
    }
  },
}})()`
}
// glitches: radio static in the intro and the outro, and in the loud parts a sixteenth here and there of crushed noise —
// noise held at a hashed rate (sample and hold), each burst dying in 30 ms
TEXTURES.glitch = o => {
  o.need('engine', 'noise')
  return `{
  color: '#c77dff',
  graph: x => { if (x >= END) return null; const j = floor(4 * x); return energy(x) >= 3 && hash(j, 91) < (role(x) === 'solo' ? 0.18 : 0.06) ? -2.6 + 0.4 * hash(j, 92) : -2.95 },
  formula: ${JSON.stringify(['\\text{глитч: } \\eta\\big(\\lfloor t\\,f_h\\rfloor / f_h\\big)\\,e^{-t/30\\text{мс}},\\ f_h = 500\\cdot 2^{5h};\\quad \\text{помехи: } \\BP_{3\\text{к}}\\eta\\,(0.6 + 0.4\\sin 2\\pi x/3)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(97), bp = filter('bp'), hp = filter('hp')
    let held = 0, acc = 0
    return x => {
      const n = η(), e = energy(x), r = role(x), j = floor(4 * x), ts = (x - j / 4) * sec
      const st = r === 'intro' || r === 'outro' ? 0.05 * (0.6 + 0.4 * sin((TAU * x) / 3)) * bp(n, 3000, 0.5) : (bp(n, 3000, 0.5), 0)
      const on = x < END && e >= 3 && hash(j, 91) < (r === 'solo' ? 0.18 : 0.06)
      acc += (500 * 2 ** (5 * hash(j, 93))) / 44100
      if (acc >= 1) (acc -= floor(acc)), (held = n)
      const gl = on ? 0.18 * exp(-ts / 0.03) * hp(held, 200) : (hp(0, 200), 0)
      const y = ${round(2 * (o.gain ?? 1))} * (st + gl)
      return pan(y, 0.4 * sin(TAU * x / 5))
    }
  },
}`
}
