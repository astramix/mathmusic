// Instruments resynthesised from a recording (styles made from audio files) and fields added to emitted tracks — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { FX, KITS, bassData, compHit, drumData, drumGraph, graphLead, pumpIf } from './recipes.js'

// ---- a style made from a recording (src/audiostyle.js): its resynthesised instruments and its measured drums ------------
// UT: the timbres of the style being written (generate sets it, like MT); 'timbre:lead' | 'timbre:bass' | 'timbre:keys'
let UT = null
const timbreFormula = M => ['R(f,t) = g\\sum_k a_k(f)\\,\\min\\!\\big(1, \\tfrac{t}{\\tau_k}\\big)\\big(s_k + (1 - s_k)e^{-d_k(f)\\,t}\\big)\\sin 2\\pi r_k f\\,(1 + \\nu(t))\\,t + \\sum_b n_b\\,\\BP_{f_b}\\eta',
  `r_k = ${M.p.slice(0, 6).map(p => p[0]).join(',\\ ')}\\ldots\\quad \\text{— измерено по ${M.notes} нот${M.notes === 1 ? 'е' : 'ам'} записи; } a_k(f)\\ \\text{по номеру и по частоте (форманты), } d_k \\text{ по кривой затухания}`,
  ...(M.vib ? [`\\nu(t) = 2^{${M.vib.depth}\\min(1, (t - ${M.vib.delay})^+/0.35)\\sin(2\\pi\\cdot ${M.vib.rate}t)/1200} - 1\\quad\\text{— вибрато}`] : [])]
const timbreOf = id => {
  const M = UT?.[id.slice('timbre:'.length)]
  if (!M) throw new Error(`no timbre ${id} in this style`)
  return M
}
const TIMBRE = {
  lead: id => o => {
    const M = timbreOf(id), fx = M.kind === 'struck' ? FX.echoHall : FX.hall
    o.need('instruments', 'resynthTone')
    return `{
  color: '#9ff0e0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(timbreFormula(M))},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(resynthTone(${JSON.stringify(M)}), { release: ${M.release ?? 0.2}, life: ${M.kind === 'struck' ? 6 : 40} }), fire = trigger()${fx.init}
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.72 + 0.16 * hash(floor(4 * x), 3), m.d * sec)
      const y = ${round((M.gain ?? 1) * o.gain)} * p()${pumpIf(o)}
      return ${fx.out('y', o.pan)}
    }
  },
}`
  },
  bass: id => o => {
    const M = timbreOf(id)
    o.need('instruments', 'resynthTone')
    return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(timbreFormula(M))},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(resynthTone(${JSON.stringify(M)}), { release: ${Math.min(0.12, M.release ?? 0.08)}, life: 4 }), fire = trigger()
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), mod(m.at, 1) === 0 ? 0.85 : 0.7, m.d * sec * 0.95)
      return ${round(1.6 * (M.gain ?? 1) * (o.gain ?? 1))} * p()${pumpIf(o)}
    }
  },
}})()`
  },
  keys: id => o => {
    const M = timbreOf(id)
    o.need('instruments', 'resynthTone', 'chorus')
    return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffd59f',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(timbreFormula(M))},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(resynthTone(${JSON.stringify(M)}), { release: ${M.release ?? 0.3}, life: 8 }), fire = trigger(), ch = chorus({ mix: 0.3 }), verb = reverb({ room: 0.8, wet: 0.28 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) c[3].forEach((n, i) => keys.hit(hz(n - 60, C4), h.vel * (0.9 + 0.1 * hash(floor(x), i)), h.d * sec * 0.95, i * 0.01))
      const y = ${round(0.55 * (M.gain ?? 1) * (o.gain ?? 1))} * keys()${pumpIf(o)}
      return verb(...ch(y, y))
    }
  },
}})()`
  },
}
// a recipe by id, the style's resynthesised instruments included
const recipe = (table, id, kind) => (String(id).startsWith('timbre:') ? TIMBRE[kind](id) : table[id])
// a field into a track's code: `{ … }` gets it after its brace, `(() => { … return { … } })()` after its last `return {`
function withField(code, field) {
  const s = code.trimStart()
  if (s.startsWith('{')) return code.replace('{', '{\n  ' + field)
  const i = code.lastIndexOf('return {')
  return i < 0 ? code : code.slice(0, i + 8) + '\n  ' + field + code.slice(i + 8)
}
// the kit of a style from a recording: its patterns (drumData) on drums tuned to what was measured — the kick's pitch and
// length, the snare's brightness, the hats' length and brightness
KITS.audio = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'rimDrum')
  const K = o.sound?.kick ?? { f: 50, decay: 0.3 }, Sn = o.sound?.snare ?? { bright: 2400 }, H = o.sound?.hat ?? { len: 0.05, bright: 8000 }
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v))
  const kf = clampv(K.f, 38, 90), sc = clampv(Math.round(Sn.bright * 0.55), 700, 4200), hd = clampv(Math.round(2.3 / Math.max(0.01, H.len)), 12, 160), hc = clampv(Math.round(H.bright * 0.9), 4500, 11500)
  return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#ff4f8b',
  ${drumGraph}
  formula: ${JSON.stringify([`D = \\Rev\\big[0.56K + 0.3S + 0.08H\\big],\\quad K = e^{-k\\tau}\\tanh\\!\\Big(1.6\\sin 2\\pi\\!\\int\\!\\big(${kf} + ${Math.round(kf * 1.6)}e^{-35\\tau}\\big)\\Big)\\ \\text{— бочка на измеренной высоте}`, `S:\\ \\HP_{${sc}}\\eta + \\text{мембрана},\\quad H = e^{-${hd}t}\\,\\HP_{${hc}}\\eta\\quad\\text{— как в записи}`])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: ${kf}, f1: ${Math.round(kf * 2.6)}, sweep: 35, decay: Math.max(3, Math.min(14, (2.3 * sec) / ${clampv(K.decay, 0.06, 0.8)})), drive: 1.6 })
    const snare = snareDrum({ tone: 190, cutoff: ${sc}, decay: 15 }), hat = hatDrum({ decay: ${hd}, cutoff: ${hc} }), open = hatDrum({ decay: 9, cutoff: ${hc} }), rim = rimDrum()
    const verb = reverb({ room: 0.6, damp: 0.45, wet: 0.16 })
    const play = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const y = 0.56 * play(x, 'kick', kick, 1) + 0.3 * play(x, 'snare', snare, sec) + 0.08 * play(x, 'hat', hat, sec) + 0.06 * play(x, 'open', open, sec) + 0.18 * play(x, 'rim', rim, sec)
      return verb(...pan(y, 0))
    }
  },
}})()`
}

// (an imported binding is read-only: the other parts set these through here)
export const setUT = v => (UT = v)

export { UT, recipe, timbreFormula, withField }
