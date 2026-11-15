// Recipes of the dark scores: metal guitars, male choir, kantele, tremolo strings, the ruins / metal / nord / prime kits, ash wind and horror — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { pick, rng, round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, KITS, LEADS, TEXTURES, graphLead } from './recipes.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// ---- the dark game and film scores: metal, the ruins, the Chozo halls, the northern mountains ------------------------
// The metal rhythm guitar: power chords (root, the chord's own fifth, octave) on two exactly tuned, double-tracked guitars
// through a high-gain amp — a 16-step riff per energy drawn by the instrument seed (X an open chord left to ring, P a
// palm-muted chug, - choked, . held), sixteenth chugs through a build-up. The root sits in E2 – D♯3.
CHORDS.metalgtr = o => {
  o.need('instruments', 'metalGuitar')
  const r = o.r ?? rng(7)
  const RIFF = {
    1: pick(r, ['X...............', 'X.......X.......', 'X.....X.....X...']),
    2: pick(r, ['X.......P-P-P-P-', 'P-P-X...P-P-X...', 'X..P-P-PX..P-P-P', 'P-PPP-PPX...X...']),
    3: pick(r, ['X..P-PP-X..P-PPP', 'PPP-PPP-X...PPPP', 'X.PPX.PPX.PPX.PP', 'P-PP-PP-P-PPX...']),
  }
  return `(() => {
  const RIFF = ${JSON.stringify(RIFF)} // a bar of sixteenths per energy: X open, P palm-muted, - choked, . held
  const gtrAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1 || r === 'outro') return null
    const pat = r === 'build' ? 'P-P-P-P-PPPPPPPP' : RIFF[Math.min(3, e)], j = floor(4 * x + 1e-9)
    let k = j
    while (pat[mod(k, 16)] === '.' && k > j - 16) k--
    const s = pat[mod(k, 16)]
    return s === '-' ? null : { at: k / 4, mute: s === 'P', c }
  }
  const powerChord = c => { const root = 40 + mod(c[2] - 40, 12); return [root, root + c[5][1], root + 12] }
  return {
  color: '#b0b0b8',
  graph: x => { const g = gtrAt(x); return g ? powerChord(g.c).map(n => ${o.lane[0]} + (n - 40) / 14) : null },
  midi: x => { const g = gtrAt(x); return g && x - g.at < (g.mute ? 0.2 : 0.9) ? powerChord(g.c) : [] },
  formula: ${JSON.stringify(['G = \\text{Cab}\\Big(\\tanh\\!\\big(2.5\\tanh(18(\\LP_{4.5\\text{к}}\\HP_{90}s + 1.2\\BP_{900}s) + 0.15)\\big) - 0.45\\BP_{500}\\Big),\\quad s = \\sum_{j}\\text{струна}(f_j)', 'f = (r,\\ r\\cdot 2^{5/12\\ldots 7/12},\\ 2r)\\ \\text{— квинтаккорд; P — глушение ладонью (сустейн 0.16 с); две дорожки L/R: } +9\\text{ мс},\\ \\pm 0.7\\text{ ¢}'])},
  audio({ bpm }) {
    const g = metalGuitar({ seed: 131 }), fire = trigger(), verb = reverb({ room: 0.55, damp: 0.6, wet: 0.1 })
    let on = false
    return x => {
      const h = gtrAt(x)
      if (h && fire(h.at)) { g.hit(powerChord(h.c).map(n => hz(n - 60, C4)), h.mute ? 0.75 : 0.95, { mute: h.mute }); on = true }
      if (!h && on) (g.choke(0.015), (on = false))
      const [l, r] = g(), k = ${round(0.42 * (o.gain ?? 1))} * pumpAt(x)
      return verb(k * l, k * r)
    }
  },
}})()`
}
// The lead guitar: the theme on one string through more gain — a slide into a note after a leap, a whole-step bend up
// into every long note (and let go before the next), choked between phrases; a dotted-eighth echo and a hall
LEADS.leadgtr = o => {
  o.need('instruments', 'leadGuitar')
  return `{
  color: '#e0e0e8',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['L = \\Rev\\,\\Dly_{3/4}\\,\\text{Cab}\\big(\\tanh(30\\ldots)\\big),\\quad \\text{струна с точным строем: } D(t) = \\tfrac{SR}{f(t)} - \\varphi', 'f(t) = f\\cdot 2^{-2(1 - s(t))/12}\\ \\text{— бенд на тон к длинной ноте};\\quad \\text{после скачка — въезд с полутона}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, g = leadGuitar({ seed: 137 }), fire = trigger(), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.22 }), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.3 })
    let last = 0, on = false
    return x => {
      const m = ${o.at}(x)
      if (m && fire(m.at)) {
        const long = m.d * sec > 0.5, leap = Math.abs(m.n - last) >= 5
        g.hit(hz(m.n - (long ? 2 : 0), C4), 0.8 + 0.15 * hash(floor(4 * x), 21), long ? { bend: 2, bendAt: 0.02, bendTime: 0.13 } : leap ? { from: -1, glide: 0.05 } : {})
        last = m.n
        on = true
      }
      if (on && (!m || m.u > 0.96)) (g.choke(0.04), (on = false))
      return verb(...echo(...pan(${round(0.48 * o.gain)} * g()${o.hard ? ' * pumpAt(x)' : ''}, ${o.pan})))
    }
  },
}`
}
COUNTER_VOICE.leadgtr = 'cellolead'
// The metal bass: a picked electric bass, its clean low end under a driven top (it doubles the guitar's roots): whole notes when calm,
// eighths in the march, a gallop (8th + two 16ths) when everything plays; muted before each next note
BASSES.metalbass = o => {
  o.need('instruments', 'electricBass')
  o.need('engine', 'tanh')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (e === 1 || r === 'bridge' || r === 'outro') return { n: c[2], at: c[0], d: c[1] }
    if (e === 2) return { n: c[2], at: floor(2 * x) / 2, d: 0.45 }
    const q = mod(x, 1), at = q < 0.5 ? floor(x) : q < 0.75 ? floor(x) + 0.5 : floor(x) + 0.75
    return { n: c[2], at, d: q < 0.5 ? 0.45 : 0.22 }
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d * 0.9 ? [b.n] : [] },
  formula: ${JSON.stringify(['B = 0.9\\LP_{220}s + 0.35\\LP_{1800}\\tanh(1.5s),\\quad s:\\ \\text{струна с точным строем, медиатор};\\quad \\text{галоп: } \\tfrac18 + \\tfrac1{16} + \\tfrac1{16}'])},
  audio({ bpm }) {
    const b = electricBass({ bright: 0.6, seed: 7 }), fire = trigger(), lp = filter('lp'), low = filter('lp')
    let end = -1
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) (b.hit(hz(m.n - 60, C4), 0.85 + 0.1 * hash(floor(4 * x), 31)), (end = m.at + m.d * 0.92))
      if (end > 0 && x >= end) (b.mute(0.02), (end = -1))
      const y = b() // a bass amp's two channels: the clean low end under a driven top
      return ${round(1.4 * (o.gain ?? 1))} * pumpAt(x) * (0.9 * low(y, 220) + 0.35 * lp(tanh(1.5 * y), 1800))
    }
  },
}})()`
}
// The male choir of the north: eight men chanting the theme in unison an octave down and (where it isn't too low)
// two octaves down; every note a new syllable — the vowel moves from "u" into its own (o, a, e…) over 90 ms
LEADS.malechoir = o => {
  o.need('instruments', 'choir', 'VOWELS', 'blend')
  return `{
  color: '#c9b6ff',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.95 ? [48 + m.n] : [] },
  formula: ${JSON.stringify(['Ch = \\Rev\\sum_{j=1}^{4}\\sum_{\\pm}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{0.9F_i(\\tau)}\\tanh\\!\\big(1.35\\saw(f_j)\\big),\\quad f_j \\in \\{\\tfrac f2, \\tfrac f4\\}', 'F(\\tau) = F_u + (F_{v} - F_u)(1 - e^{-\\tau/90\\text{мс}}),\\ v \\in \\{o, a, e, a, o, i\\}\\ \\text{— слог на каждую ноту}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, c = choir({ voices: 4, size: 0.9, rough: 0.35, breath: 0.04, gain: 0.3 }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    const SYL = ['o', 'a', 'e', 'a', 'o', 'i', 'a', 'o']
    let n = 0, at = -1, v = 'o'
    return x => {
      const m = ${o.at}(x)
      if (m) { n = m.n; if (m.at !== at) (at = m.at), (v = SYL[floor(8 * hash(floor(4 * m.at), 41))]) }
      const on = m && m.u < 0.95, f = hz(n - 12, C4), F = blend(VOWELS.u, VOWELS[v], 1 - exp(-(m ? m.τ : 9) * sec / 0.09))
      const [l, r] = c(on ? [f, f * 1.001, n - 24 >= -27 ? f / 2 : f, n - 24 >= -27 ? f / 2 * 1.002 : f * 0.999] : [], F)
      return verb(${round(o.gain)} * l, ${round(o.gain)} * r)
    }
  },
}`
}
COUNTER_VOICE.malechoir = 'horn'
// The kantele (the northern lyre): the chord's tones an octave up, plucked in a rolling figure (1 5 3 5 8 5 3 5), each
// string left to ring — Karplus–Strong, exactly tuned
ARPS.kantele = o => {
  o.need('instruments', 'plucker')
  return `(() => {
  const FIG = [0, 2, 1, 2, 3, 2, 1, 2]
  const kanAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 0 || x >= END - 1 || r === 'build') return null
    const j = floor(2 * x + 1e-9), v = [...c[3], c[3][0] + 12]
    return { n: v[FIG[mod(j, 8)] % v.length] + 12, at: j / 2, vel: mod(j, 4) === 0 ? 0.8 : 0.55 }
  }
  return {
  color: '#ffe8a0',
  graph: x => (kanAt(x) && x - kanAt(x).at < 0.2 ? ${o.lane[0]} + (kanAt(x).n - 60) / 30 : null),
  midi: x => (kanAt(x) && x - kanAt(x).at < 0.45 ? [kanAt(x).n] : []),
  formula: ${JSON.stringify(['y[n] = e[n] + 0.998\\big(0.6\\,y[n - N] + 0.4\\,y[n - N + 1]\\big),\\quad N = \\tfrac{SR}{f} - \\varphi\\ \\text{— кантеле, восьмые: } 1\\,5\\,3\\,5\\,8\\,5\\,3\\,5'])},
  audio({ bpm }) {
    const p = plucker({ life: 4, decay: 0.998 }), fire = trigger(), lp = filter('lp'), verb = reverb({ room: 0.9, damp: 0.3, wet: 0.4 })
    return x => {
      const m = kanAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), m.vel * (0.85 + 0.15 * energy(x) / 3), { bright: 0.75 })
      return verb(...pan(${round(0.32 * (o.gain ?? 1))} * lp(p(), 6500), -0.35))
    }
  },
}})()`
}
// Tremolo strings: the voicing bowed in thirty-seconds near the bridge (sul ponticello: glassy, the high partials
// up) — a shiver under the music; louder and darker as the energy grows
CHORDS.tremolo = o => {
  o.need('instruments', 'strings')
  return `{
  color: '#a8a0c8',
  graph: x => { const c = chordAt(x), e = energy(x); return c && e >= 0 && x < END - 1 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20 + 0.03 * sin(TAU * 8 * x)) : null },
  midi: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05 ? c[3] : [] },
  formula: ${JSON.stringify(['T = \\Rev\\Big[\\big(0.55 + 0.45\\sin^2 2\\pi\\,8x\\big)\\big(S + 0.8\\HP_{2500}S\\big)\\Big],\\quad S = \\sum_j\\sum_u \\saw\\big(f_j\\,2^{0.09u/12}\\big)\\ \\text{— тремоло тридцать вторыми у подставки}'])},
  audio({ bpm }) {
    const s = strings({ voices: 4, attack: 120, release: 500, cutoff: 4200, gain: 0.05 }), hpL = filter('hp'), hpR = filter('hp'), level = smooth(300), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.42 })
    let v = [57, 60, 64]
    return x => {
      const c = chordAt(x), e = energy(x)
      if (c) v = c[3]
      const on = c && e >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05, a = level(on ? [0.55, 0.7, 0.85, 1][Math.max(0, e)] : 0)
      const [l, r] = s(on ? v.map(n => hz(n - 60, C4)) : []), trem = 0.55 + 0.45 * sin(TAU * 8 * x) ** 2, k = ${round(1.2 * (o.gain ?? 1))} * a * trem
      return verb(k * (l + 0.8 * hpL(l, 2500)), k * (r + 0.8 * hpR(r, 2500)))
    }
  },
}`
}
// The metal kit: a big kick and the double bass drum, a snare in a room, crash and china, a ride; heavy and in half
// time — the snare on 3 — never four on the floor; sixteenth double kicks under the riff when everything plays
KITS.metal = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'crashCymbal', 'taikoDrum')
  const r = o.r ?? rng(7)
  const DK = pick(r, ['xxxxxxxxxxxxxxxx', 'x-xxx-xxx-xxx-xx', 'xxx-xxx-xxx-xxxx'])
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.8, t < L / 2 ? 'x---x---x---x---' : 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (e >= 3) {
        steps('kick', 0.9, '${DK}')
        steps('snare', 1, '--------x-------')
        steps('ride', 0.6, 'x---x---x---x---')
        if (mod(t, 8) === 0) add('crash', 1, 0)
        if (mod(t, 8) === 4) add('china', 0.8, 0)
        if (fill) steps('tom', 0.9, '--------xx-xx-xx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-----x-x-------')
        steps('snare', 0.95, '--------x-------')
        steps('hat', 0.55, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.9, 0)
        if (fill) steps('tom', 0.8, '------------x-xx')
      } else if (e === 1) {
        if (mod(t, 8) === 0) (add('kick', 0.8, 0), add('crash', 0.6, 0))
        if (mod(t, 8) === 4) add('tom', 0.5, 0)
      } else if (r === 'outro' && t === 0) (add('kick', 1, 0), add('crash', 0.9, 0))`)}
  return {
  color: '#9aa0a6',
  ${stageGraph([['kick', 3.6, 0.5], ['snare', 3.3, 0.8], ['tom', 2.9, 0.6]])}
  ${stageMidi([['kick', 36], ['snare', 38], ['hat', 42], ['ride', 51], ['tom', 45], ['crash', 49], ['china', 52]])}
  formula: ${JSON.stringify(['D = \\Rev_{\\text{комната}}\\big[0.5K + 0.45S + 0.08H + 0.07\\,\\text{Ride} + 0.4\\,\\text{Tom}\\big] + 0.3\\,\\text{Crash} + 0.25\\,\\text{China}', 'K = e^{-8\\tau}\\tanh\\!\\Big(2\\sin 2\\pi\\!\\int\\!(55 + 160e^{-40\\tau})\\Big) \\text{ — двойная бочка шестнадцатыми; малый на 3 (половинный размер)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 55, f1: 160, sweep: 40, decay: 8, drive: 2 }), snare = snareDrum({ tone: 195, cutoff: 1300, decay: 12 })
    const hat = hatDrum({ cutoff: 7500, decay: 60 }), ride = hatDrum({ decay: 2.5, cutoff: 5000, ring: 0.85 }), crash = crashCymbal({ decay: 2 }), china = crashCymbal({ decay: 1.1, seed: 7 })
    const tom = taikoDrum({ pitch: 110, decay: 0.5, crack: 0.5, boom: 0.2, seed: 6 }), chinaBp = filter('bp'), room = reverb({ room: 0.7, damp: 0.5, wet: 0.2 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.55 * at('kick', kick, x, 1) + 0.45 * at('snare', snare, x) + 0.08 * at('hat', hat, x) + 0.07 * at('ride', ride, x) + 0.4 * at('tom', tom, x)
      const [l, r] = room(...pan(1.6 * y, 0)), cr = 0.32 * at('crash', crash, x), ch = 0.3 * chinaBp(at('china', china, x), 3500, 0.8)
      return [l + cr + 0.6 * ch, r + 0.85 * cr + ch]
    }
  },
}})()`
}
// The war drums of the north: a great low drum, frame drums, a field snare that rolls into each section; the low drum
// in 3 + 3 + 2 when the battle comes, the boom of a drum far below on the downbeats
KITS.nord = o => {
  o.need('instruments', 'taikoDrum', 'snareDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        for (let p = 0; p < 4; p += t < L / 2 ? 2 : 1) add('low', 0.6 + (0.4 * (t + p)) / L, p)
      } else if (e >= 3) {
        steps('low', 1, 'x--x--x-x--x--x-')
        steps('frame', 0.6, 'x-xxx-xxx-xxx-xx')
        steps('snare', 0.45, '----x-------x-x-')
        if (mod(t, 16) === 0) add('crash', 0.8, 0)
        if (fill) steps('snare', 0.8, '--------xxxxxxxx')
      } else if (e === 2) {
        steps('low', 0.85, 'x-----x-x-------')
        steps('frame', 0.5, '--x---x---x---x-')
        if (t === 0) add('crash', 0.6, 0)
      } else if (e === 1) {
        if (mod(t, 4) === 0) add('low', 0.6, 0)
        if (mod(t, 8) === 6) add('frame', 0.4, 0, 0.5)
      } else if (r === 'outro' && t === 0) add('low', 1, 0)`)}
  return {
  color: '#b5651d',
  ${stageGraph([['low', 3.4, 1], ['frame', 3, 0.6], ['snare', 2.6, 0.5]])}
  ${stageMidi([['low', 35], ['frame', 45], ['snare', 38], ['crash', 49]])}
  formula: ${JSON.stringify(['\\text{большой барабан: } \\tanh\\!\\big(1.4\\LP\\sum_k A_k e^{-2.6K_kt/1.6}\\sin R_k\\varphi\\big),\\ f = 52\\text{ Гц};\\quad \\text{рамочный: } f = 165\\text{ Гц}', '\\text{большой барабан — } 3 + 3 + 2 \\text{ в битве; полевой малый катится в каждый раздел}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, low = taikoDrum({ pitch: 52, decay: 1.6, crack: 0.15, boom: 0.6, seed: 3 }), frame = taikoDrum({ pitch: 165, decay: 0.35, crack: 0.2, boom: 0.1, seed: 8 })
    const snare = snareDrum({ tone: 230, cutoff: 1700, decay: 18 }), crash = crashCymbal({ decay: 2.6 }), verb = reverb({ room: 0.93, damp: 0.4, wet: 0.38 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const y = 0.6 * at('low', low, x) + 0.35 * at('frame', frame, x) + 0.18 * at('snare', snare, x)
      const [l, r] = verb(...pan(0.9 * y, 0)), c = 0.18 * at('crash', crash, x)
      return [l + c, r + 0.9 * c]
    }
  },
}})()`
}
// The ruins: nothing keeps a beat for long — a drum far away, steel struck somewhere in the dark (its place and pitch
// drawn by the hash), a chain dragged, a slow heartbeat when it gets close; low drums only when everything plays
KITS.ruins = o => {
  o.need('instruments', 'taikoDrum', 'clankTone', 'kickDrum')
  o.need('engine', 'noise')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        for (let p = 0; p < 4; p += t < L / 2 ? 1 : 0.5) add('far', 0.4 + (0.6 * (t + p)) / L, p)
      } else if (e >= 3) {
        steps('far', 1, 'x-------x--x----')
        steps('heart', 0.8, 'x-x-------------')
        if (mod(t, 2) === 1) add('clank', 0.7, floor(16 * hash(b, 3)) / 4)
        if (mod(t, 8) === 4) add('chain', 0.8, 2)
      } else if (e === 2) {
        steps('heart', 0.7, 'x-x-------------')
        if (mod(t, 8) === 0) add('far', 0.8, 0)
        if (hash(b, 5) < 0.6) add('clank', 0.55, floor(16 * hash(b, 3)) / 4)
      } else if (e >= 0) {
        if (mod(t, 8) === 0) add('far', 0.55, 0)
        if (hash(b, 5) < 0.35) add('clank', 0.4, floor(16 * hash(b, 3)) / 4)
        if (mod(t, 16) === 12) add('chain', 0.5, 1)
      }`)}
  return {
  color: '#6d6875',
  ${stageGraph([['far', 3.2, 0.9], ['heart', 2.8, 0.5], ['clank', 2.5, 0.6]])}
  ${stageMidi([['far', 35], ['heart', 36], ['clank', 56], ['chain', 69]])}
  formula: ${JSON.stringify(['\\text{далёкий барабан: } \\LP_{900}\\,\\text{Taiko}(48\\text{ Гц}) \\text{ в огромном зале};\\quad \\text{сердце: } K(\\tau) + K(\\tau - \\tfrac12)', '\\text{сталь: } \\sum_k A_k e^{-K_kt/0.35}\\sin 2\\pi R_k ft,\\ R = (1, 2.76, 5.40, 8.93),\\ f \\text{ из хеша};\\quad \\text{цепь: } \\sum_i e^{-t_i/8\\text{мс}}\\BP_{3\\text{к}}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, far = taikoDrum({ pitch: 48, decay: 2, crack: 0.05, boom: 0.7, seed: 4 }), heart = kickDrum({ f0: 45, f1: 70, sweep: 20, decay: 9, drive: 1 })
    const clanks = poly(clankTone, { release: 0.2, life: 3, max: 6 }), fire = trigger(), η = noise(59), chainBp = filter('bp'), farLp = filter('lp')
    const verb = reverb({ room: 0.97, damp: 0.3, wet: 0.6 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const c = x < END ? lastHit(x, 'clank') : null
      if (c && fire(x - c.τ)) clanks.hit(220 * 2 ** floor(4 * hash(floor(4 * (x - c.τ)), 77)) * (1 + 0.37 * hash(floor(4 * (x - c.τ)), 78)), c.vel, 0.3)
      const ch = x < END ? lastHit(x, 'chain') : null, ct = ch ? ch.τ * sec : 9
      const links = ct < 1.2 ? ch.vel * Math.max(0, sin(TAU * 7 * ct)) ** 8 * (1 - ct / 1.2) : 0
      const y = 0.7 * farLp(at('far', far, x), 900) + 0.4 * at('heart', heart, x, 1) + 0.16 * clanks() + 0.12 * links * chainBp(η(), 3000, 1.5)
      return verb(...pan(y, 0.1 * sin(TAU * x / 16)))
    }
  },
}})()`
}
// The Chozo machines: an industrial kit — deep processed toms, a tight snare with a short metal room, glassy ticks,
// a heartbeat in the dark parts, a reversed swell into every section that brings everything
KITS.prime = o => {
  o.need('instruments', 'taikoDrum', 'snareDrum', 'hatDrum', 'kickDrum', 'clankTone', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('tom', 0.7, t < L / 2 ? 'x-----x-----x---' : 'x--x--x--x--x-x-')
        if (x + 4 >= sectionEnd(x)) add('swell', 1, 0)
      } else if (e >= 3) {
        steps('kick', 1, 'x-----x---x-----')
        steps('snare', 0.9, '----x-------x---')
        steps('tick', 0.5, 'xxxxxxxxxxxxxxxx')
        steps('tom', 0.6, '-------x-----xx-')
        if (mod(t, 2) === 1) add('clank', 0.6, 2.75)
      } else if (e === 2) {
        steps('tom', 0.8, 'x--x--x-----x---')
        steps('tick', 0.4, '--x---x---x---x-')
        steps('snare', 0.6, '------------x---')
      } else if (e >= 0) {
        steps('heart', 0.7, 'x-x-------------')
        steps('tick', 0.25, '------x-------x-')
      }`)}
  return {
  color: '#7fdbca',
  ${stageGraph([['kick', 3.5, 0.6], ['tom', 3.1, 0.7], ['snare', 2.8, 0.6]])}
  ${stageMidi([['kick', 36], ['heart', 35], ['snare', 38], ['tick', 42], ['tom', 45], ['clank', 56]])}
  formula: ${JSON.stringify(['D = \\Rev_{\\text{металл}}\\big[0.45K + 0.35S + 0.05\\,\\text{Tick} + 0.4\\,\\text{Tom} + 0.15\\,\\text{Clank}\\big] + \\text{свелл}', '\\text{свелл: } e^{-(4 - \\tau)/0.6}\\,\\text{Crash} \\text{ задом наперёд; в тишине — сердце } K(\\tau) + K(\\tau - \\tfrac12)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 48, f1: 120, sweep: 30, decay: 7, drive: 2 }), heart = kickDrum({ f0: 42, f1: 60, sweep: 18, decay: 10, drive: 1 })
    const snare = snareDrum({ tone: 220, cutoff: 1800, decay: 18 }), tick = hatDrum({ cutoff: 10000, decay: 120 }), tom = taikoDrum({ pitch: 90, decay: 0.7, crack: 0.35, boom: 0.3, seed: 12 })
    const clanks = poly(clankTone, { release: 0.1, life: 1.5, max: 4 }), fire = trigger(), swell = crashCymbal({ decay: 2, seed: 5 })
    const room = reverb({ room: 0.85, damp: 0.25, wet: 0.32 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const c = x < END ? lastHit(x, 'clank') : null
      if (c && fire(x - c.τ)) clanks.hit(1320 * (1 + 0.5 * floor(3 * hash(floor(x), 17))), c.vel, 0.2)
      const sw = x < END ? lastHit(x, 'swell') : null, u = sw ? 4 - sw.τ : 9
      const rev = u > 0 && u < 4 ? exp((-u * sec) / 0.6) * swell(0.03, true) : (swell(1, false), 0)
      const y = 0.45 * at('kick', kick, x, 1) + 0.4 * at('heart', heart, x, 1) + 0.35 * at('snare', snare, x) + 0.05 * at('tick', tick, x) + 0.4 * at('tom', tom, x) + 0.15 * clanks()
      const [l, r] = room(...pan(1.2 * y, 0))
      return [l + 0.3 * rev, r + 0.3 * rev]
    }
  },
}})()`
}
// After the war: wind over the ashes, a Geiger counter ticking (denser as the music darkens), a radio somewhere
// between stations (a tone in the static), metal groaning as it cools — slow inharmonic partials sliding down
TEXTURES.ashwind = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#8d8d8d',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 11) : null),
  formula: ${JSON.stringify(['\\text{ветер: } \\BP_{220\\cdot 2^{\\sin(2\\pi T/17)}}\\eta;\\quad \\text{счётчик Гейгера: щелчок } e^{-t/0.6\\text{мс}} \\text{ с вероятностью } p(E) \\text{ на шаг}', '\\text{металл остывает: } e^{-t/3}\\sum_{k} \\sin 2\\pi\\!\\int\\! r_k f_0\\,2^{-t/8},\\ r = (1, 1.53, 2.41, 3.17);\\quad \\text{радио: } \\BP_{1.8\\text{к}}\\eta \\cdot \\text{шёпот тона}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(37), wind = filter('bp'), wind2 = filter('bp'), radio = filter('bp'), click = filter('hp'), os = [1, 1.53, 2.41, 3.17].map(() => osc('sine')), tone = osc('sine')
    const verb = reverb({ room: 0.95, damp: 0.35, wet: 0.5 })
    return x => {
      const n = η(), T = x * sec, e = energy(x), a = x < END ? 1 : 0
      const w = 0.07 * wind(n, 220 * 2 ** sin((TAU * T) / 17), 3) + 0.05 * wind2(n, 480 * 2 ** sin((TAU * T) / 23 + 2), 4)
      const s = floor(T * 40), p = [0.03, 0.06, 0.12, 0.2][Math.max(0, e)] ?? 0
      const tick = hash(s, 9) < p && T * 40 - s < 0.03 ? 0.5 : 0
      const j = floor(x / 32), gt = (x - 32 * j - 20 * hash(j, 6)) * sec
      let groan = 0
      os.forEach((q, k) => { const r = [1, 1.53, 2.41, 3.17][k]; groan += (gt > 0 && gt < 9 ? exp(-gt / 3) * Math.min(1, gt / 0.8) : 0) * q(r * 70 * 2 ** (-Math.max(0, gt) / 8)) / (k + 1) })
      const rt = mod(x, 64) * sec, on = rt < 6 ? Math.min(1, rt / 0.5) * Math.min(1, (6 - rt) / 0.5) : 0
      const rad = on * (0.02 * radio(n, 1800, 2) + 0.006 * tone(hz(SCALE[0] + 12, C4)) * (0.5 + 0.5 * sin(TAU * 3 * T)))
      const y = 1.3 * a * (w + 0.06 * groan + rad)
      const [l, r] = verb(...pan(y, 0.2 * sin(TAU * x / 13)))
      const c = a * click(tick, 3000)
      return [l + 0.12 * c, r + 0.08 * c]
    }
  },
}`
}
// The horror of the deep halls: a waterphone (steel rods bowed: inharmonic partials, a slow glide, a beating
// tremolo), a sub drone on the tonic far below, a screech of metal now and then, breath in the dark parts
TEXTURES.horror = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#5e548e',
  graph: x => (x < END ? -2.95 + 0.06 * sin(TAU * x / 5) * sin(TAU * x / 7) : null),
  formula: ${JSON.stringify(['\\text{водофон: } \\sum_{k}\\tfrac{1}{k}\\sin 2\\pi\\!\\int\\! r_k f\\,2^{g(t)/12}\\,\\big(0.6 + 0.4\\sin 2\\pi\\,5.3t\\big),\\ r = (1, 2.31, 3.88, 5.62),\\ g \\text{ — глиссандо}', '\\text{гул: } \\sin 2\\pi f_T/4 \\text{ (тоника на две октавы вниз)};\\quad \\text{визг: } \\BP_{f(t)}^{Q=18}\\eta,\\ f: 3\\text{к} \\to 6\\text{к}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(43), os = [1, 2.31, 3.88, 5.62].map(() => osc('sine')), sub = osc('sine'), sub2 = osc('sine'), screech = filter('bp'), breath = filter('bp'), level = smooth(800)
    const verb = reverb({ room: 0.96, damp: 0.3, wet: 0.6 })
    return x => {
      const n = η(), T = x * sec, e = energy(x), a = level(x < END ? 1 : 0)
      const j = floor(x / 16), wt = (x - 16 * j - 8 * hash(j, 2)) * sec, f0 = 300 + 500 * hash(j, 3), g = 3 * sin(wt / 2) - 2 * wt / 6
      let wp = 0
      if (wt > 0 && wt < 6) os.forEach((q, k) => { wp += q(f0 * [1, 2.31, 3.88, 5.62][k] * 2 ** (g / 12)) / (k + 1) })
      else os.forEach(q => q(0))
      const wenv = wt > 0 && wt < 6 ? Math.min(1, wt / 0.6) * Math.min(1, (6 - wt) / 1.5) * (0.6 + 0.4 * sin(TAU * 5.3 * wt)) : 0
      const fs = hz(SCALE[0] - 36, C4), drone = 0.09 * (sub(fs) + 0.4 * sub2(fs * 2 ** (7 / 12))) * (0.8 + 0.2 * sin(TAU * x / 12))
      const k = floor(x / 24), st = (x - 24 * k - 20 * hash(k, 8)) * sec, sc = e >= 1 && st > 0 && st < 1.5 ? 0.25 * Math.min(1, st / 0.05) * exp(-st / 0.5) * screech(n, 3000 * 2 ** st, 18) : (screech(n, 3000, 18), 0)
      const br = e <= 1 ? 0.03 * (0.5 + 0.5 * sin(TAU * x / 4)) * breath(n, 900, 1.2) : (breath(n, 900, 1.2), 0)
      const y = 0.4 * a * (0.06 * wenv * wp + drone + sc + br)
      return verb(...pan(y, 0.3 * sin(TAU * x / 9)))
    }
  },
}`
}

// ---- Touhou: ZUN's trumpet era (zunpet) and the PC-98 years (oldzun) -------------------------------------------------
FX.deep = { init: ', echo = delay({ time: sec * 0.75, feedback: 0.45, wet: 0.32 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.42 })', out: (y, p) => `verb(...echo(...pan(${y}, ${p})))` }
