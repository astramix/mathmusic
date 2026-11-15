// Recipes of the retro game styles: ZUNpet, the OPNA FM voices of the PC-98, the 16-bit console — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, KITS, LEADS, bassData, chipLead, compHit, graphLead, pumpIf, struck } from './recipes.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// The ZUNpet: the trumpet of ZUN's Windows-era scores — a bright sampled trumpet of the SC-88 era, doubled a few cents
// apart (two brass voices ±4 ¢, the tone wide open), a quick scoop into every note, a vibrato that comes in after 0.18 s,
// a short room and a dotted-eighth echo
LEADS.zunpet = o => {
  o.need('instruments', 'horn')
  return `{
  color: '#ffd166',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Zp = \\Rev\\,\\Dly\\Big[H_{2.8}\\big(1.0023g\\big) + 0.8\\,H_{3.4}\\big(0.9977g\\big)\\Big],\\quad H_b = 0.7y + 0.5\\BP_{450}y,\\ y = \\LP_{f_c}\\tfrac12\\big(\\saw g + \\saw 1.0023g\\big)e(t)', 'g = f\\cdot 2^{\\big(-0.4e^{-t/30\\text{мс}} + 0.28\\min(1,\\,(t - 0.18)^+/0.3)\\sin 2\\pi\\cdot 5.8T\\big)/12}\\ \\text{— подъезд снизу и позднее вибрато}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, a = horn({ bright: 2.8, seed: 61 }), b = horn({ bright: 3.4, seed: 67 }), echo = delay({ time: sec * 0.75, feedback: 0.24, wet: 0.17 }), verb = reverb({ room: 0.78, damp: 0.42, wet: 0.24 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m) n = m.n
      const held = m ? m.τ * sec : 0, bend = m ? -0.4 * exp(-held / 0.03) + 0.28 * Math.min(1, Math.max(0, held - 0.18) / 0.3) * sin(TAU * 5.8 * t) : 0
      const f = hz(n + bend, C4), on = !!m && m.u < 0.94, vel = 0.8 + (0.15 * energy(x)) / 3
      const y = ${round(0.5 * o.gain)} * (a(f * 1.0023, on, vel) + 0.8 * b(f * 0.9977, on, vel))${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
// The ZUN piano: the bass in octaves and the chord on the off-beats in 3 + 3 + 2; rolling sixteenths over two octaves in
// the spell cards; half notes when calm
CHORDS.zunpiano = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const zpAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END - 1) return null
    const j = floor(4 * x + 1e-9), k = mod(j, 16), b = c[2] + 12 + (c[2] < 36 ? 12 : 0), v = c[3]
    if (e <= 1) return k % 8 === 0 ? { notes: [b, ...v], at: j / 4, vel: 0.42, d: 2 } : null
    if (e === 2 || role(x) === 'build') {
      if (k % 2) return null
      const low = k === 0 || k === 6 || k === 12
      return { notes: low ? [b, b + 12] : v, at: j / 4, vel: low ? 0.58 : 0.4, d: low ? 0.7 : 0.4 }
    }
    const up = [b, ...v, ...v.map(n => n + 12)], FIG = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]
    return { notes: [up[FIG[k] % up.length]], at: j / 4, vel: k % 4 === 0 ? 0.55 : 0.38, d: 0.6 }
  }
  return {
  color: '#ffffff',
  graph: x => { const z = zpAt(x); return z ? z.notes.map(n => ${o.lane[0]} + (n - 48) / 24) : null },
  midi: x => { const z = zpAt(x); return z && x - z.at < Math.min(z.d, 0.25) * 0.9 ? z.notes : [] },
  formula: ${JSON.stringify(['\\text{фортепиано ZUN: бас октавами и аккорд на слабые восьмые в } 3 + 3 + 2;\\ \\text{в спелл-картах — шестнадцатые на две октавы}', 'P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\sin 2\\pi f_k t'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.25, life: 4, max: 24 }), fire = trigger(), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.24 })
    return x => {
      const z = zpAt(x)
      if (z && fire(z.at)) z.notes.forEach((n, i) => keys.hit(hz(n - 60, C4), z.vel * (0.9 + 0.1 * hash(floor(4 * x), i)), z.d * sec, i * 0.004))
      return verb(...pan(${round(0.3 * (o.gain ?? 1))} * keys()${pumpIf(o)}, 0.18))
    }
  },
}})()`
}
// ZUN's bass: an electric bass picked in octaves — eighths, a sixteenth pushed before the beat in the spell cards, the last
// sixteenth of the bar a half step into the next chord's root; long roots when calm
BASSES.zunbass = o => {
  o.need('instruments', 'electricBass')
  return `(() => {
  const LINE = { 1: 'R-------R-------', 2: 'R-8-R-8-R-8-R-8A', 3: 'R-8RR-8-R-8RR-8A' } // 16 steps: R root, 8 octave, A a half step into the next root
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    const P = LINE[Math.min(3, e)], j = floor(4 * x + 1e-9)
    let k = j
    while (P[mod(k, 16)] === '-' && k > j - 16) k--
    const s = P[mod(k, 16)], nx = chordAt(floor(x / 4) * 4 + 4) ?? c, a = nx[2] - 1 < c[2] - 2 ? nx[2] + 11 : nx[2] - 1
    return { n: s === '8' ? c[2] + 12 : s === 'A' ? a : c[2], at: k / 4, d: e === 1 ? 1.9 : 0.4 }
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d * 0.9 ? [b.n] : [] },
  formula: ${JSON.stringify(['y[n] = e[n] + g\\big(a\\,y[n - D] + (1 - a)\\,y[n - D - 1]\\big),\\quad D = \\tfrac{44100}{f} - \\varphi(a)\\ \\text{— бас-гитара с точным строем}', '\\text{16 шагов: } R\\cdot 8\\,RR\\cdot 8\\cdot R\\cdot 8\\,RR\\cdot 8A,\\quad A \\text{ — полутон под корень следующего аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = electricBass({ bright: 0.55, seed: 9 }), fire = trigger()
    let end = -1
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) (b.hit(hz(m.n - 60, C4), 0.85 + 0.15 * hash(floor(4 * x), 5)), (end = m.at + m.d * 0.9))
      if (end > 0 && x >= end) (b.mute(0.03), (end = -1))
      return ${round(0.9 * (o.gain ?? 1))} * b()${pumpIf(o)}
    }
  },
}})()`
}
// ZUN's kit (a Sound Canvas standard kit): the kick on 1 and the "and" of 2, the snare on 2 and 4, eighth hats, a crash on
// every fourth bar (and on most downbeats of a spell card), tom and snare fills into each phrase, a ride when calm
KITS.zun = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'crashCymbal', 'taikoDrum')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.8, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x-----x-x-------')
        steps('snare', 0.9, '----x-------x---')
        steps('hat', 0.45, r === 'final' ? 'xxxxxxxxxxxxxxxx' : 'x-x-x-x-x-x-x-x-')
        steps('open', 0.5, '--------------x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        else if (mod(t, 8) === 0) add('crash', 0.7, 0)
        if (fill) steps('tom', 0.8, '--------x-xx-xxx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-----x---x-----')
        steps('snare', 0.8, '----x-------x---')
        steps('hat', 0.4, 'x-x-x-x-x-x-x-x-')
        if (mod(t, 16) === 0) add('crash', 0.8, 0)
        if (fill) steps('snare', 0.6, '------------xxxx')
      } else if (e === 1) {
        steps('ride', 0.45, 'x---x-x-x---x-x-')
        if (t === 0) add('crash', 0.6, 0)
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`)}
  return {
  color: '#ff6f91',
  ${stageGraph([['kick', 3.5, 0.6], ['snare', 3.2, 0.6], ['crash', 4, 0.4]])}
  ${stageMidi([['kick', 36], ['snare', 38], ['hat', 42], ['open', 46], ['ride', 51], ['crash', 49], ['tom', 45]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.5K + 0.32S + 0.08H + 0.07\\,\\text{Ride} + 0.3\\,\\text{Tom} + 0.35\\,\\text{Crash}\\big],\\quad K = e^{-6\\tau}\\tanh\\!\\big(1.5\\sin 2\\pi\\!\\int\\!(50 + 160e^{-35\\tau})\\big)', '\\text{тарелка в начале каждой фразы, сбивки томами в конце}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 160, sweep: 35, decay: 6, drive: 1.5 }), snare = snareDrum({ tone: 205, cutoff: 1300, decay: 14 })
    const hat = hatDrum({ cutoff: 8000, decay: 70 }), open = hatDrum({ cutoff: 7000, decay: 10 }), ride = hatDrum({ decay: 2.6, cutoff: 4500, ring: 0.85 })
    const tom = taikoDrum({ pitch: 130, decay: 0.35, bend: 2, crack: 0.3, boom: 0.15, seed: 77 }), crash = crashCymbal({ decay: 1.6, seed: 91 }), verb = reverb({ room: 0.72, damp: 0.45, wet: 0.2 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.5 * at('kick', kick, x, 1) + 0.32 * at('snare', snare, x) + 0.08 * at('hat', hat, x) + 0.07 * at('open', open, x) + 0.07 * at('ride', ride, x) + 0.3 * at('tom', tom, x)
      const [l, r] = verb(...pan(1.3 * y, 0)), c = 0.35 * at('crash', crash, x)
      return [l + c, r + 0.85 * c]
    }
  },
}})()`
}
// The PC-98 years: FM brass on the YM2608 (algorithm 4, two pairs — the modulators swell in after the carriers: the
// blat), detuned against itself, a late vibrato; and on the SSG, the chip's square channel, the same line a dotted eighth
// later and softer, in sixteen volume steps (the echo the PC-98 composers wrote as a second voice)
LEADS.fmbrass = o => {
  o.need('instruments', 'opn', 'pulse', 'vol4')
  return `{
  color: '#ff9f6b',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['\\text{FM (YM2608), алгоритм 4: } y = L_2\\,e_2\\sin\\!\\big(\\varphi_2 + L_1e_1\\sin(\\varphi_1 + \\beta y_1)\\big) + L_4\\,e_4\\sin\\!\\big(\\varphi_4 + L_3e_3\\sin\\varphi_3\\big)', '\\text{эхо на SSG: } 0.12\\,\\vol(a)\\,\\Pi_{1/2}\\big(f(x - \\tfrac34)\\big)\\ \\text{— та же линия на пунктирную восьмую позже}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fm = opn({ algo: 4, ratio: [1, 1, 1, 1], level: [2.2, 0.55, 1.6, 0.5], fb: 0.7, detune: [0, 4, -3, -6], env: [[0.03, 0.4, 0.6, 0.12], [0.004, 0.6, 0.85, 0.12], [0.05, 0.5, 0.5, 0.12], [0.006, 0.6, 0.8, 0.12]], gain: 0.5 })
    const ssg = pulse(0.5), lp = filter('lp'), gate = smooth(1.5), verb = reverb({ room: 0.72, damp: 0.45, wet: 0.2 })
    let n = 0, ne = 0
    return x => {
      const m = ${o.at}(x), q = ${o.at}(x - 0.75), t = x * sec, held = m ? m.τ * sec : 0
      if (m) n = m.n
      if (q) ne = q.n
      const vib = 0.22 * Math.min(1, Math.max(0, held - 0.25) / 0.3) * sin(TAU * 5.5 * t)
      const y = fm(hz(n + vib, C4), !!m && m.u < 0.92, 0.85), e = 0.12 * gate(q && q.u < 0.85 ? vol4(0.9 - 0.5 * Math.min(1, (q.τ * sec) / 0.5)) : 0) * lp(ssg(hz(ne, C4)), 9000)
      const [l, r] = pan(${round(o.gain)} * y${pumpIf(o)}, ${o.pan}), [el, er] = pan(${round(o.gain)} * e, ${round(-0.3 - o.pan)})
      return verb(l + el, r + er)
    }
  },
}`
}
// FM lead (algorithm 5: operator 1, buzzing on its own feedback, drives three carriers at f, 2f and f + 4 ¢ — an organ
// with a reed in it, the lead of the PC-98 battle themes)
LEADS.fmlead = o => {
  o.need('instruments', 'opn')
  return `{
  color: '#ffb3c6',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['\\text{FM, алгоритм 5: } m = L_1e_1\\sin(\\varphi_1 + \\beta y_1),\\ y = \\textstyle\\sum_{k=2}^{4} L_k e_k \\sin(\\varphi_k + m),\\quad r = (2,\\ 1,\\ 2,\\ 1.0023)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fm = opn({ algo: 5, ratio: [2, 1, 2, 1], level: [1.3, 0.55, 0.25, 0.45], fb: 0.9, detune: [0, 0, 3, 4], env: [[0.004, 0.5, 0.7, 0.1], [0.003, 0.8, 0.9, 0.1], [0.003, 0.4, 0.6, 0.08], [0.003, 0.8, 0.9, 0.1]], gain: 0.45 })
    const echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.7, damp: 0.45, wet: 0.18 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec, held = m ? m.τ * sec : 0
      if (m) n = m.n
      const vib = 0.2 * Math.min(1, Math.max(0, held - 0.3) / 0.3) * sin(TAU * 5.8 * t)
      return verb(...echo(...pan(${round(o.gain)} * fm(hz(n + vib, C4), !!m && m.u < 0.92, 0.85)${pumpIf(o)}, ${o.pan})))
    }
  },
}`
}
// FM bell (algorithm 4: 3.5 : 1 and 7 : 2 — the struck electric-piano-bell of the PC-98, nothing held)
LEADS.fmbell = o => {
  o.need('instruments', 'opn')
  return `{
  color: '#fff3b0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['\\text{FM-колокол: } y = e^{-t/0.9}\\sin\\!\\big(\\varphi + 2.2e^{-t/0.25}\\sin 3.5\\varphi\\big) + 0.4e^{-t/0.4}\\sin\\!\\big(2\\varphi + e^{-t/0.15}\\sin 7\\varphi\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fm = opn({ algo: 4, ratio: [3.5, 1, 7, 2], level: [2.2, 0.6, 1, 0.25], fb: 0, env: [[0.001, 0.25, 0, 0.2], [0.001, 0.9, 0, 0.3], [0.001, 0.15, 0, 0.1], [0.001, 0.4, 0, 0.2]], gain: 0.55 })
    const echo = delay({ time: sec * 0.75, feedback: 0.32, wet: 0.24 }), verb = reverb({ room: 0.78, damp: 0.4, wet: 0.24 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      return verb(...echo(...pan(${round(o.gain)} * fm(hz(n, C4), !!m && m.u < 0.9, 0.8)${pumpIf(o)}, ${o.pan})))
    }
  },
}`
}
// the SSG's square (YM2608's three AY-like channels): a plain square in sixteen volume steps
LEADS.ssg = o => chipLead(o, 0.5, '#9fffd0')
// FM electric piano chords (algorithm 4: a 1 : 1 body and a 14 : 1 tine), four channels on the voicing, on the comping hits
CHORDS.fmepiano = o => {
  o.need('instruments', 'opn')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffcf9f',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(['\\text{FM-пиано, алгоритм 4: } y = \\textstyle\\sum_j \\Big[0.6e_2\\sin\\!\\big(\\varphi_j + 1.1e_1\\sin\\varphi_j\\big) + 0.3e_4\\sin\\!\\big(\\varphi_j + 0.9e_3\\sin 14\\varphi_j\\big)\\Big]\\ \\text{— тело и «зубец»}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, ch = [0, 1, 2, 3].map(j => opn({ algo: 4, ratio: [1, 1, 14, 1], level: [1.1, 0.6, 0.9, 0.3], fb: 0.2, detune: [0, 2 * j - 3, 0, 3 - 2 * j], env: [[0.001, 0.9, 0.15, 0.2], [0.001, 1.6, 0.2, 0.25], [0.001, 0.08, 0, 0.1], [0.001, 0.3, 0, 0.15]], gain: 0.5 }))
    const lp = filter('lp'), verb = reverb({ room: 0.75, damp: 0.45, wet: 0.22 })
    let v = [57, 60, 64, 69]
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (c) v = c[3]
      const on = !!h && !!c && x - h.at < h.d * 0.92
      let y = 0
      for (let j = 0; j < 4; j++) y += ch[j](hz(v[j % v.length] - 60, C4), on, h ? h.vel : 0.6)
      return verb(...pan(${round(0.5 * (o.gain ?? 1))} * lp(y, 9000)${pumpIf(o)}, 0.2))
    }
  },
}})()`
}
// FM bass (algorithm 4: operator 1 with feedback strikes the 1 : 1 pair and dies in 90 ms — the slap of the PC-98 bass —,
// a 3 : 1 pair adds the knock), on the style's line
BASSES.fmbass = o => {
  o.need('instruments', 'opn')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{FM-бас: } y = 0.75e_2\\sin\\!\\big(\\varphi + 2.6e^{-t/90\\text{мс}}\\sin(\\varphi + 1.1y_1)\\big) + 0.35e_4\\sin\\!\\big(\\varphi + 1.1e^{-t/50\\text{мс}}\\sin 3\\varphi\\big)'])},
  audio() {
    const fm = opn({ algo: 4, ratio: [1, 1, 3, 1], level: [2.6, 0.75, 1.1, 0.35], fb: 1.1, env: [[0.001, 0.09, 0.2, 0.06], [0.001, 0.5, 0.7, 0.06], [0.001, 0.05, 0.05, 0.05], [0.001, 0.25, 0.3, 0.06]], gain: 0.5 })
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      return ${round(0.9 * (o.gain ?? 1))} * fm(hz(n - 60, C4), !!m && x - m.at < m.d * 0.92, 0.9)${pumpIf(o)}
    }
  },
}})()`
}
// the SSG arpeggio: the voicing over two octaves in sixteenths on a square, each note falling through the volume steps
ARPS.ssgarp = o => {
  o.need('instruments', 'pulse', 'vol4')
  return `(() => {
  const FIG = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 2, 3]
  const arpAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1 || r === 'outro') return null
    const j = floor(4 * x + 1e-9), v = c[3], up = [...v, ...v.map(n => n + 12)]
    if (e === 1 && j % 2) return null
    return { n: up[FIG[mod(j, 16)] % up.length] + 12, at: j / 4 }
  }
  return {
  color: '#9fe8ff',
  graph: x => (arpAt(x) && x - arpAt(x).at < 0.15 ? ${o.lane[0]} + (arpAt(x).n - 55) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? [arpAt(x).n] : []),
  formula: ${JSON.stringify(['y = \\vol\\big(e^{-7\\tau}\\big)\\,\\Pi_{1/2}(f_j),\\quad f_j \\text{ — голоса аккорда на две октавы шестнадцатыми: } 0\\,1\\,2\\,3\\,4\\,5\\,6\\,7\\,6\\,5\\ldots'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.5), lp = filter('lp'), gate = smooth(1.5), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.22 })
    let n = 0
    return x => {
      const m = arpAt(x)
      if (m) n = m.n
      return echo(...pan(${round(0.13 * (o.gain ?? 1))} * gate(m ? vol4(exp(-7 * (x - m.at))) : 0) * lp(p(hz(n - 60, C4)), 8000)${pumpIf(o)}, -0.3))
    }
  },
}})()`
}
// the YM2608's rhythm sound source: six drums in its ROM (bass drum, snare, top cymbal, hi-hat, tom, rim shot), small
// samples at a low rate — played here held every other sample (22 kHz) and rounded to 9 bits: their grain
KITS.opna = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'rimDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL.replace(/'snare'/g, "'sd'")}
        steps('bd', 0.8, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('bd', 1, 'x-----x-x-x-----')
        steps('sd', 0.9, '----x-------x---')
        steps('hh', 0.5, 'x-x-x-x-x-x-x-x-')
        if (mod(t, 16) === 0) add('top', 1, 0)
        if (fill) steps('tom', 0.8, '--------x-x-xxxx')
      } else if (e === 2) {
        steps('bd', 0.9, 'x-------x-x-----')
        steps('sd', 0.8, '----x-------x---')
        steps('hh', 0.45, 'x-x-x-x-x-x-x-x-')
        steps('rim', 0.5, '------x-------x-')
        if (t === 0) add('top', 0.7, 0)
      } else if (e === 1) {
        steps('hh', 0.35, '--x---x---x---x-')
        steps('rim', 0.4, '----x-------x---')
      } else if (r === 'outro' && t === 0) add('top', 0.8, 0)`)}
  return {
  color: '#ff6f91',
  ${stageGraph([['bd', 3.5, 0.6], ['sd', 3.2, 0.6], ['top', 4, 0.4]])}
  ${stageMidi([['bd', 36], ['rim', 37], ['sd', 38], ['hh', 42], ['tom', 45], ['top', 49]])}
  formula: ${JSON.stringify(['\\text{ритм-секция YM2608: BD, SD, TOP, HH, TOM, RIM из ПЗУ;}\\ y_k = \\tfrac{1}{512}\\big\\lfloor 512\\,D(t_{2\\lfloor k/2\\rfloor})\\big\\rceil\\ \\text{— 22 кГц, 9 бит}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bd = kickDrum({ f0: 55, f1: 120, sweep: 45, decay: 9, drive: 1.3 }), sd = snareDrum({ tone: 230, cutoff: 2000, decay: 16 }), hh = hatDrum({ decay: 80, cutoff: 6000 })
    const top = crashCymbal({ decay: 1.2, seed: 97 }), tom = kickDrum({ f0: 120, f1: 80, sweep: 15, decay: 8, drive: 1.1 }), rim = rimDrum(), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.14 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    let k = 0, held = 0
    return x => {
      const y = 0.55 * at('bd', bd, x, 1) + 0.32 * at('sd', sd, x) + 0.09 * at('hh', hh, x) + 0.3 * at('top', top, x) + 0.3 * at('tom', tom, x, 1) + 0.2 * at('rim', rim, x)
      if (++k >= 2) (k = 0), (held = Math.round(512 * y) / 512)
      return verb(...pan(1.5 * held, 0.05))
    }
  },
}})()`
}
Object.assign(COUNTER_VOICE, { zunpet: 'violin', fmbrass: 'ssg', fmlead: 'ssg', fmbell: 'ssg', ssg: 'fmlead' })

// ---- «Подсказка»: the sound of Undertale and Deltarune — a sampled 16-bit orchestra and chip voices, the SNES's echo --
// The synth brass of the battle themes: two saws and a square through a low-pass that opens with each note and settles,
// a vibrato after a quarter second, rounded to 11 bits and low-passed like a sample in a 16-bit console, its echo
LEADS.snesbrass = o => {
  o.need('engine', 'osc', 'tanh')
  return `{
  color: '#ff7aa2',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Br = \\Dly\\Big[\\tfrac{1}{2048}\\big\\lfloor 2048\\tanh\\!\\big(1.3\\,\\LP_{1.5f_c}\\LP_{f_c}(\\tfrac12\\saw g + \\tfrac12\\saw 1.006g + 0.2\\sq g)\\big)\\big\\rceil\\Big]', 'f_c = 900 + 3800e^{-t/0.12},\\quad g = f\\cdot 2^{\\,0.2\\min(1, (t - 0.25)^+/0.25)\\sin(2\\pi\\cdot 5.6T)/12}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, a = osc('saw'), b = osc('saw', 0.4), q = osc('square'), lp = filter('lp'), lp2 = filter('lp'), out = filter('lp'), gate = smooth(5), glide = smooth(12)
    const echo = delay({ time: sec * 0.5, feedback: 0.36, wet: 0.22 }), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.12 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec, held = m ? m.τ * sec : 1
      if (m) n = m.n
      const g = hz(glide(n) + 0.2 * Math.min(1, Math.max(0, held - 0.25) / 0.25) * sin(TAU * 5.6 * t), C4), fc = 900 + 3800 * exp(-held / 0.12)
      const s = tanh(1.3 * lp2(lp(0.5 * a(g) + 0.5 * b(g * 1.006) + 0.2 * q(g), fc, 0.9), fc * 1.5)), y = out(Math.round(2048 * s) / 2048, 11000)
      return verb(...echo(...pan(${round(0.3 * o.gain)} * gate(m && m.u < 0.93 ? 1 : 0) * y${pumpIf(o)}, ${o.pan})))
    }
  },
}`
}
// a music box an octave up: a steel comb's tines (a cantilever's modes 1 and 6.27, the high one dying fast), a long ring
LEADS.musicbox = o => struck('(f, t, v) => v * Math.min(1, t / 0.0008) * exp(-t * (0.8 + f / 1800)) * (sin(TAU * f * t) + 0.3 * exp(-9 * t) * sin(TAU * 6.27 * f * t) + 0.12 * exp(-30 * t) * sin(TAU * 17.55 * f * t))', [], {
  release: 0.8, life: 4, gain: 0.13, fx: FX.echoHall, extra: pumpIf(o), vel: '0.8 + 0.15 * hash(floor(4 * x), 3)',
  formula: ['Mb = v\\,e^{-t(0.8 + f/1800)}\\big(\\sin 2\\pi ft + 0.3e^{-9t}\\sin 2\\pi\\,6.27ft + 0.12e^{-30t}\\sin 2\\pi\\,17.55ft\\big)\\ \\text{— язычок гребёнки, октавой выше}'],
})({ ...o, color: '#ffe6f2' }).replace('p.hit(hz(m.n, C4)', 'p.hit(hz(m.n + 12, C4)').replace('[60 + m.n]', '[72 + m.n]')
// the 16-bit slap bass: an exactly tuned bass string slapped on the downbeats, popped on the octaves, through the
// console's sample low-pass and 11-bit rounding — the style's syncopated line
BASSES.snesbass = o => {
  o.need('instruments', 'electricBass')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['y = \\tfrac{1}{2048}\\big\\lfloor 2048\\,\\LP_{7000}\\,B(f)\\big\\rceil,\\quad B \\text{ — струна (Карплус — Стронг), слэп на сильных долях, поп на октавах}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = electricBass({ bright: 0.6, seed: 13 }), fire = trigger(), lp = filter('lp')
    let low = 36, end = -1
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) {
        const pop = m.n > low + 6
        if (!pop) low = m.n
        b.hit(hz(m.n - 60, C4), pop ? 0.75 : 0.9, { slap: energy(x) >= 3 && mod(m.at, 1) === 0 })
        end = m.at + m.d * 0.88
      }
      if (end > 0 && x >= end) (b.mute(0.03), (end = -1))
      return ${round(0.95 * (o.gain ?? 1))} * Math.round(2048 * lp(b(), 7000)) / 2048${pumpIf(o)}
    }
  },
}})()`
}
// the 16-bit kit: dry, punchy samples — a syncopated kick, the snare on 2 and 4, a crash at every four bars of a fight,
// tom fills; low-passed like the console's samples, a small echo
KITS.snes = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'crashCymbal', 'taikoDrum')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.8, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x-----x-x-x-----')
        steps('snare', 0.95, '----x-------x---')
        steps('hat', 0.45, 'x-x-x-x-x-x-x-x-')
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('tom', 0.85, '--------x-x-x-xx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.8, '----x-------x---')
        steps('hat', 0.4, '--x---x---x---x-')
        if (t === 0) add('crash', 0.7, 0)
      } else if (e === 1) {
        steps('kick', 0.6, 'x-------x-------')
        steps('hat', 0.3, 'x---x---x---x---')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`)}
  return {
  color: '#ff4f8b',
  ${stageGraph([['kick', 3.5, 0.6], ['snare', 3.2, 0.6], ['crash', 4, 0.4]])}
  ${stageMidi([['kick', 36], ['snare', 38], ['hat', 42], ['tom', 45], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\LP_{11\\text{к}}\\big[0.55K + 0.36S + 0.08H + 0.3\\,\\text{Tom} + 0.3\\,\\text{Crash}\\big] + \\text{эхо } 0.25\\,D(t - \\tfrac12)', 'K = e^{-7\\tau}\\tanh\\!\\big(1.8\\sin 2\\pi\\!\\int\\!(52 + 170e^{-40\\tau})\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 52, f1: 170, sweep: 40, decay: 7, drive: 1.8 }), snare = snareDrum({ tone: 215, cutoff: 1500, decay: 15 }), hat = hatDrum({ cutoff: 7500, decay: 75 })
    const tom = taikoDrum({ pitch: 140, decay: 0.3, bend: 2, crack: 0.35, boom: 0.1, seed: 83 }), crash = crashCymbal({ decay: 1.3, seed: 79 }), lp = filter('lp'), echo = delay({ time: sec * 0.5, feedback: 0.25, wet: 0.14 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.55 * at('kick', kick, x, 1) + 0.36 * at('snare', snare, x) + 0.08 * at('hat', hat, x) + 0.3 * at('tom', tom, x) + 0.3 * at('crash', crash, x)
      return echo(...pan(0.9 * lp(y, 11000), 0))
    }
  },
}})()`
}
Object.assign(COUNTER_VOICE, { snesbrass: 'pulse12', musicbox: 'piano' })
