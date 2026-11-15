// Recipes of the night storm — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { CHORDS, COUNTER_VOICE, KITS, LEADS, TEXTURES, graphLead, pumpIf } from './recipes.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'
import { timbreFormula } from './audio.js'

// ---- Nightstorm: the style of the user's own "nightstorm" (out of its recording: tools/from-audio.mjs and the eye) ------
// the night lead: the intro's soft voice resynthesised from the recording (src/timbre.js) — a sine with a little of its
// octave and fifth, a slow attack (0.37 s), a slight vibrato (4 Hz, ±6 ¢) — in a long hall
const NIGHT_LEAD = { kind: 'sustained', f0: 524, B: 0.0008, wF: 0.63, p: [[0.9991, 0.4253, 0.369, 0, 1], [2.01, 0.1357, 0.369, 0, 1], [3, 0.0086, 0.369, 0.172, 0.9344], [4.03, 0.0254, 0.369, 0, 1], [6.04, 0.0048, 0.369, 0, 1]], fa: [[349, -0.48], [524, -7.43], [587, -7.66], [707, -1.39], [1051, -17.35], [1182, -12.7], [1488, -21.52], [1930, -31.9], [3164, -46.43], [3564, -42]], fd: [[349, 0.5283], [587, 0.085], [707, 0.6121], [1047, 0.5464], [1182, 0.5243], [1571, 0.172], [1763, 0.2321]], attack: 0.369, release: 0.25, vib: { rate: 4.05, depth: 5.75, delay: 0.14 }, scoop: 0.97, noise: { atk: [0, 0, 0, 0, 0, 0, 0], sus: [0.0001, 0.0016, 0.0008, 0.0002, 0.0002, 0.0002, 0.0002], dec: 0.02 }, notes: 3 }
LEADS.nightlead = o => {
  o.need('instruments', 'resynthTone')
  return `{
  color: '#b8d8ff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(timbreFormula(NIGHT_LEAD))},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(resynthTone(${JSON.stringify(NIGHT_LEAD)}), { release: 0.4, life: 30 }), fire = trigger()
    const echo = delay({ time: sec * 1.5, feedback: 0.35, wet: 0.22 }), verb = reverb({ room: 0.94, damp: 0.3, wet: 0.42 })
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.78, m.d * sec)
      const y = ${round(0.75 * o.gain)} * p()${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { nightlead: 'strings' })
// the storm's strings: a string ensemble and a soft supersaw layer on the chord, its bow trembling in sixteenths when the
// storm is up (the recording's pulse of 10.8 Hz at 162 BPM), long bows when calm, spread wide
CHORDS.stormstrings = o => {
  o.need('instruments', 'strings')
  o.need('engine', 'supersaw')
  return `{
  color: '#9fb4ff',
  graph: x => { const c = chordAt(x), e = energy(x); return c && e >= 0 && x < END - 1 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20 + (e >= 2 ? 0.03 * sin(TAU * 4 * x) : 0)) : null },
  midi: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05 ? c[3] : [] },
  formula: ${JSON.stringify(['St = \\Rev\\Big[\\big(1 - d + d\\,|\\sin 2\\pi\\,2x|^{0.6}\\big)\\big(S + 0.35\\,\\LP_{f_c}\\sum_j SS_5(f_j)\\big)\\Big],\\quad d = 0.7 \\text{ в буре (тремоло шестнадцатыми), } 0 \\text{ в затишье}'])},
  audio({ bpm }) {
    const s = strings({ voices: 4, attack: 220, release: 700, cutoff: 3800, gain: 0.05 }), saws = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.18, width: 1, seed: 71 + j }))
    const lp = [filter('lp'), filter('lp')], level = smooth(300), depth = smooth(200), verb = reverb({ room: 0.93, damp: 0.35, wet: 0.45 })
    let v = [58, 62, 65, 70]
    return x => {
      const c = chordAt(x), e = energy(x)
      if (c) v = c[3]
      const on = c && e >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05, a = level(on ? [0.5, 0.65, 0.85, 1][Math.max(0, e)] : 0), d = depth(e >= 2 ? 0.7 : 0)
      const trem = 1 - d + d * Math.abs(sin(TAU * 2 * x)) ** 0.6
      const fs = on ? v.map(n => hz(n - 60, C4)) : [], [sl, sr] = s(fs)
      let l = 0, r = 0
      saws.forEach((w, j) => { const [p, q] = w(hz((c ? v[j % v.length] : 60) - 60, C4)); l += p; r += q })
      const fc = 900 + 1800 * Math.max(0, e) / 3, k = ${round(1.1 * (o.gain ?? 1))} * a * trem
      return verb(k * (sl + 0.035 * lp[0](l, fc)), k * (sr + 0.035 * lp[1](r, fc)))
    }
  },
}`
}
// the storm: rain on everything (the high band never rests in the recording), thunder rolling in at the sections that bring
// the storm, a gust in the calm
TEXTURES.storm = o => {
  o.need('instruments', 'rain')
  o.need('engine', 'noise')
  return `{
  color: '#7f9fbf',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 3) : null),
  formula: ${JSON.stringify(['\\text{дождь } + \\text{гром: } \\LP_{90 + 700e^{-t}}\\eta\\,e^{-t/2.5}\\,(1 + 2e^{-t/0.08})\\ \\text{на разделах бури;}\\quad \\text{ветер: } \\BP_{350\\cdot 2^{\\sin(2\\pi T/11)}}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, rn = rain({ wash: 0.06, drops: 0.12 }), η = noise(19), lp = filter('lp'), wind = filter('bp'), verb = reverb({ room: 0.95, damp: 0.3, wet: 0.5 })
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], a = x < END ? 1 : 0, n = η(), T = x * sec
      const th = e >= 2 ? (x - s) * sec : 9, rumble = th < 7 ? 0.5 * exp(-th / 2.5) * (1 + 2 * exp(-th / 0.08)) * lp(n, 90 + 700 * exp(-th)) : lp(0, 200)
      const w = (e <= 1 ? 0.06 : 0.025) * wind(n, 350 * 2 ** sin((TAU * T) / 11), 3)
      const [rl, rr] = rn()
      const [tl, tr] = verb(rumble + w, rumble + w)
      return [a * (1.6 * rl + tl), a * (1.6 * rr + tr)]
    }
  },
}`
}
// the storm's drums: no beat — a timpani's boom opening each section that brings the storm, and in the loudest ones on
// every second downbeat; a soft roll into a build-up
KITS.storm = o => {
  o.need('instruments', 'timpaniTone', 'taikoDrum')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL.replace("'snare'", "'roll'")}
      } else if (e >= 3) {
        if (mod(t, 8) === 0) add('boom', 1, 0)
        if (mod(t, 16) === 12) add('boom', 0.7, 2)
      } else if (e === 2) {
        if (t === 0) add('boom', 0.9, 0)
      }`)}
  return {
  color: '#8090c0',
  ${stageGraph([['boom', 3.5, 0.8], ['roll', 3, 0.3]])}
  ${stageMidi([['boom', 41], ['roll', 47]])}
  formula: ${JSON.stringify(['D = \\Rev_{0.95}\\big[0.7\\,\\text{Timp}(f_{\\text{корень}}/2) + 0.5\\,T_{55}\\big] + \\text{дробь литавр в разгоне}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, timp = poly(timpaniTone, { release: 0.8, life: 4, max: 6 }), roll = poly(timpaniTone, { release: 0.2, life: 1.5, max: 12 }), fire = trigger(), fire2 = trigger()
    const boom = taikoDrum({ pitch: 55, decay: 1.2, bend: 5, crack: 0.15, boom: 0.6, seed: 97 }), verb = reverb({ room: 0.95, damp: 0.35, wet: 0.45 })
    return x => {
      const b = x < END ? lastHit(x, 'boom') : null, rl = x < END ? lastHit(x, 'roll') : null, c = chordAt(x), f = hz((c ? c[2] : 34) + 12 - 60, C4) // the timpani on the bass note, an octave up (D2 … A3)
      if (b && fire(x - b.τ)) timp.hit(f, b.vel, 2)
      if (rl && fire2(x - rl.τ)) roll.hit(f, 0.3 + 0.4 * rl.vel, 0.2)
      const y = 0.35 * timp() + 0.2 * roll() + 0.22 * (b ? b.vel * boom(b.τ * sec, true) : boom(1, false))
      return verb(y, y)
    }
  },
}})()`
}
