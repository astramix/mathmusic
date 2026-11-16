// The studio's recipes — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
// What the second generation of styles (src/gen/v2-*.js) is built from: the instruments of the «studio» block of
// src/instruments.js (hall, ensemble, section, soloist, piano, polyWide) as recipe makers — a style says which timbre,
// how many players, which room, and gets a track. Nothing here is used by the first generation: their songs stay as they were.
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, GATE, LEADS, PADS, bassData, compHit, pumpIf } from './recipes.js'
import { stageGraph, stageHits, stageMidi } from './stage.js'

// rooms: every track of a style sits in the same one, so the band sounds like it is in one place
export const ROOMS = {
  dry: 'hall({ size: 0.5, decay: 0.5, damp: 7000, wet: 0.1 })',
  room: 'hall({ size: 0.6, decay: 0.9, damp: 6000, wet: 0.2 })',
  club: 'hall({ size: 0.72, decay: 1.3, damp: 4500, wet: 0.22 })',
  hall: 'hall({ decay: 2.4, wet: 0.28 })',
  big: 'hall({ size: 1.25, decay: 3.6, damp: 4600, wet: 0.34 })',
  cathedral: 'hall({ size: 1.45, decay: 6, damp: 3600, pre: 0.035, wet: 0.42 })',
  space: 'hall({ size: 1.5, decay: 9, damp: 3000, pre: 0.04, mod: 1.6, wet: 0.5 })',
}
const room = (o, name, wet) => {
  o.need('instruments', 'hall')
  return wet == null ? ROOMS[name] : ROOMS[name].replace(/wet: [\d.]+/, `wet: ${wet}`)
}
const J = v => JSON.stringify(v)
// how loud a part plays by the section's energy 0…3 (also how bright: the players' loud table)
const DYN = [0.3, 0.45, 0.62, 0.85]

// ---- a solo voice on the melody: soloLead('violins', { … }) ------------------------------------------------------
// dn: semitones (−12 = an octave down), octave: a second player an octave below at that level, unison: a second player
// a few cents away at that level, echo: a dotted-eighth echo's wet, scoop / accent / vib / glide: the soloist's own
export const soloLead = (timbre, { color = '#ffd6a5', gain = 1, dn = 0, in: place = 'hall', wet, echo = 0, scoop = 0, accent = 0, vib = 1, glide = 0.04, octave = 0, unison = 0, formula } = {}) => o => {
  o.need('instruments', 'soloist')
  const opt = `{ vib: ${vib}, glide: ${glide}, scoop: ${scoop}, accent: ${accent}`
  return `{
  color: '${color}',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [${60 + dn} + m.n] : [] },
  formula: ${J(formula ?? ['y = \\Rev\\Big[a(\\tau)\\sum_{k} A_k\\sin\\big(2\\pi k\\!\\int\\! f\\,dt + \\varphi_k\\big)\\Big],\\quad A_k = \\frac{B(kf)}{k^{p}}\\ \\text{— гармоники по спектру инструмента: наклон источника и резонансы корпуса}', 'f = f_0\\,2^{(v(\\tau)\\sin 2\\pi f_v t - s\\,e^{-\\tau/45\\text{мс}})/1200}\\ \\text{— вибрато приходит позже, подъезд к ноте, легато — глиссандо}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, a = soloist('${timbre}', ${opt}, seed: 5 })${octave || unison ? `, b = soloist('${timbre}', ${opt}, seed: 9 })` : ''}, verb = ${room(o, place, wet)}${echo ? `, echo = delay({ time: sec * 0.75, feedback: 0.3, wet: ${echo} })` : ''}
    let n = 0, vel = 0.8
    return x => {
      const m = ${o.at}(x)
      if (m) { n = m.n; vel = 0.6 + 0.07 * Math.max(0, energy(x)) + 0.16 * hash(floor(2 * m.at), 5) + (mod(m.at, 4) === 0 ? 0.06 : 0) }
      const on = !!m && m.u < 0.94, f = hz(n + ${dn}, C4)
      const y = ${round(gain * o.gain)} * (a(f, on, vel)${octave ? ` + ${octave} * b(f / 2, on, vel)` : ''}${unison ? ` + ${unison} * b(f * 1.0023, on, vel)` : ''})${pumpIf(o)}
      return verb(...${echo ? `echo(...pan(y, ${o.pan}))` : `pan(y, ${o.pan})`})
    }
  },
}`
}

// ---- struck and plucked notes on the melody, each at its place across the keyboard: keysLead('grandTone', { … }) ----
// up: semitones the notes sound above the written ones (12 = a music box an octave up), also: a second strike that far
// above at that level, e.g. [12, 0.35]
export const keysLead = (tone, { color = '#fdfcdc', gain = 1, in: place = 'hall', wet, echo = 0, release = 0.35, life = 7, up = 0, also = null, width = 0.5, soft = 0, formula } = {}) => o => {
  o.need('instruments', 'polyWide', ...(/^[a-zA-Z]+$/.test(tone) ? [tone] : []))
  return `{
  color: '${color}',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [${60 + up} + m.n] : [] },
  formula: ${J(formula ?? ['P = \\Rev\\sum_{k}\\big(0.72\\,e^{-t/\\tau_k} + 0.28\\,e^{-t/5\\tau_k}\\big)A_k(v)\\sin 2\\pi f_k t,\\quad f_k = kf\\sqrt{1 + Bk^2}\\ \\text{— струна с жёсткостью, быстрый звук и послезвучие}', 'A_k(v) = \\frac{|\\sin(0.123\\pi k)|^{0.6}}{k^{\\,0.75 + 1.1(1 - v)}}\\cdot\\frac{1}{1 + (f_k/f_c(v))^2}\\ \\text{— удар на ⅛ струны, войлок твёрже при сильном ударе}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = polyWide(${tone}, { release: ${release}, life: ${life}, width: ${width} }), fire = trigger(), verb = ${room(o, place, wet)}${echo ? `, echo = delay({ time: sec * 0.75, feedback: 0.32, wet: ${echo} })` : ''}
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) {
        const v = ${round(0.62 - soft)} + 0.08 * Math.max(0, energy(x)) + 0.14 * hash(floor(4 * m.at), 3) + (mod(m.at, 4) === 0 ? 0.06 : 0)
        p.hit(hz(m.n + ${up}, C4), v, m.d * sec + ${release})${also ? `
        p.hit(hz(m.n + ${up + also[0]}, C4), ${also[1]} * v, m.d * sec + ${release}, 0.012)` : ''}
      }
      const [l, r] = p(), k = ${round(gain * o.gain)}${pumpIf(o)}
      return verb(...${echo ? 'echo(k * l, k * r)' : '[k * l, k * r]'}.map((s, i) => s * (i ? ${round(1 + o.pan)} : ${round(1 - o.pan)})))
    }
  },
}`
}

// ---- groups of players on the chords -------------------------------------------------------------------------------
// layers: [[timbre, players, semitones, level, { bass: true (the bass note instead of the voicing), top: n (only the
// top n notes), centre, spread, vib }]]. The parts fade in and out; louder sections are brighter.
const layerCode = (layers, seed = 20) => layers.map(([t, n, , , q = {}], i) => `section('${t}', { players: ${n}, centre: ${q.centre ?? 0}, spread: ${q.spread ?? 0.8}, vib: ${q.vib ?? 1}, seed: ${seed + i} })`).join(', ')
const layerNotes = layers => layers.map(([, , st, , q = {}]) => (q.bass ? `[hz(c[2] + ${st} - 60, C4)]` : `c[3]${q.top ? `.slice(-${q.top})` : ''}.map(n => hz(n + ${st} - 60, C4))`)).join(', ')
const layerSum = layers => layers.map(([, , , g], i) => `{ const [a, b] = S[${i}](on ? F[${i}] : NONE, lv); l += ${g} * a; r += ${g} * b }`).join('\n      ')
const PAD_FORMULA = ['Pd = \\Rev\\sum_{j}\\sum_{i=1}^{N} a_i\\,W_{d}\\big(f_j\\,2^{(\\delta_i + v_i(t))/1200}\\big),\\quad W_d = \\sum_k \\frac{B(kf)}{k^{p(d)}}\\sin(2\\pi kft + \\varphi_k)\\ \\text{— N исполнителей на каждой ноте, каждый на несколько центов в стороне, со своим вибрато и местом в зале}']

// a pad under the sections that have one (padOn): sectionPad([['warm', 5, 0, 1]], { … })
export const sectionPad = (layers, { color = '#bdb2ff', gain = 1, in: place = 'big', wet, ens = 0, always = false, formula } = {}) => o => {
  o.need('instruments', 'section', ...(ens ? ['ensemble'] : []))
  const on = always ? '(!!chordAt(x) && x < END - 1)' : 'padOn(x)'
  return `{
  color: '${color}',
  graph: x => (${on} ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (${on} && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${J(formula ?? PAD_FORMULA)},
  audio() {
    const S = [${layerCode(layers)}], NONE = [], verb = ${room(o, place, wet)}${ens ? `, ens = ensemble({ mix: ${ens} })` : ''}
    let F = S.map(() => NONE), last = null
    return x => {
      const on = ${on}, c = on ? chordAt(x) : null
      if (c && c !== last) { last = c; F = [${layerNotes(layers)}] }
      const lv = ${J(DYN)}[Math.max(0, energy(x))] ?? 0.4
      let l = 0, r = 0
      ${layerSum(layers)}
      const k = ${round(0.5 * gain * (o.gain ?? 1))} * (0.7 + 0.5 * lv)${o.hard ? ' * pumpAt(x)' : ''}
      return verb(...${ens ? 'ens(k * l, k * r)' : '[k * l, k * r]'})
    }
  },
}`
}

// the chords held by a section (from energy `from` up), or played in a rhythm: rhythm = { 1: '16 steps', 2: …, 3: … } per
// energy — x a stroke, o a soft one, - silence (the notes are let go between strokes: `gate` of the step's length)
export const sectionChords = (layers, { color = '#ffc6ff', gain = 1, in: place = 'hall', wet, from = 1, rhythm = null, gate = 0.8, formula } = {}) => o => {
  o.need('instruments', 'section')
  return `(() => {
  const RHYTHM = ${J(rhythm)}
  // is the section playing at x, and how hard (0 = no)
  const strokeAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < ${from} || x >= END - 0.5) return 0
    if (!RHYTHM) return 1
    const pat = RHYTHM[e] ?? RHYTHM[2], i = floor(4 * mod(x, 4) + 1e-6), ch = pat ? pat[i] : '-'
    return (ch === 'x' ? 1 : ch === 'o' ? 0.6 : 0) * (mod(4 * x, 1) < ${gate} ? 1 : 0)
  }
  return {
  color: '${color}',
  graph: x => (strokeAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (strokeAt(x) ? chordAt(x)[3] : []),
  formula: ${J(formula ?? PAD_FORMULA)},
  audio() {
    const S = [${layerCode(layers, 40)}], NONE = [], verb = ${room(o, place, wet)}
    let F = S.map(() => NONE), last = null
    return x => {
      const st = strokeAt(x), on = st > 0, c = on ? chordAt(x) : null
      if (c && c !== last) { last = c; F = [${layerNotes(layers)}] }
      const lv = (${J(DYN)}[Math.max(0, energy(x))] ?? 0.4) * (0.6 + 0.4 * st)
      let l = 0, r = 0
      ${layerSum(layers)}
      const k = ${round(0.5 * gain * (o.gain ?? 1))} * (0.7 + 0.5 * lv)${pumpIf(o)}
      return verb(k * l, k * r)
    }
  },
}})()`
}

// the chords struck on the style's comping pattern (S.comp): keysComp('grandTone', { roll: seconds between the notes }).
// low: the bass note an octave under the voicing joins on the bar's first stroke at that level
export const keysComp = (tone, { color = '#f1e3d3', gain = 1, in: place = 'hall', wet, release = 0.3, life = 6, roll = 0.012, low = 0, soft = 0, echo = 0, formula } = {}) => o => {
  o.need('instruments', 'polyWide', ...(/^[a-zA-Z]+$/.test(tone) ? [tone] : []))
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '${color}',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.35 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(0.9, h.d * 0.9) ? c[3] : [] },
  formula: ${J(formula ?? ['K = \\Rev\\sum_{j} P\\big(f_j,\\ t - j\\,\\Delta,\\ v_j\\big)\\ \\text{— аккорд берётся с лёгким арпеджиато, каждая нота на своём месте клавиатуры}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = polyWide(${tone}, { release: ${release}, life: ${life}, width: 0.6 }), fire = trigger(), verb = ${room(o, place, wet)}${echo ? `, echo = delay({ time: sec * 0.75, feedback: 0.3, wet: ${echo} })` : ''}
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) {
        const v = ${round(0.78 - soft)} * h.vel
        c[3].forEach((n, j) => p.hit(hz(n - 60, C4), v * (0.86 + 0.14 * hash(h.at * 7 + j, 11)) * (j === c[3].length - 1 ? 1.08 : 1), h.d * sec + ${release}, j * ${roll}))${low ? `
        if (mod(h.at, 4) === 0) p.hit(hz(c[2] + 12 - 60, C4), ${low} * v, h.d * sec + ${release})` : ''}
      }
      const [l, r] = p(), k = ${round(gain * (o.gain ?? 1))}${pumpIf(o)}
      return verb(...${echo ? 'echo(k * l, k * r)' : '[k * l, k * r]'})
    }
  },
}})()`
}

// ---- basses ----------------------------------------------------------------------------------------------------------
// a sub bass: a sine with a little second harmonic, gently driven; glides 25 ms between notes
export const subBass = ({ color = '#4d7cff', gain = 1, drive = 1.6, cut = 0.9, formula } = {}) => o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '${color}',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * ${cut} ? [bassAt(x).n] : []),
  formula: ${J(formula ?? ['Sb = \\tanh\\!\\big(' + drive + '\\,a\\,(\\sin\\varphi + 0.12\\sin 2\\varphi)\\big),\\quad \\varphi = 2\\pi\\!\\int\\! f,\\ f \\text{ — скользит к новой ноте 25 мс}'])},
  audio({ bpm }) {
    const o1 = osc('sine'), o2 = osc('sine'), glide = smooth(25), env = smooth(9)
    let n = 36
    return x => {
      const m = bassAt(x), on = m && x - m.at < m.d * ${cut}
      if (m) n = m.n
      const f = hz(glide(n) - 60, C4), a = env(on ? 1 : 0)
      return ${round(0.62 * (o.gain ?? 1) * gain)} * tanh(${drive} * a * (o1(f) + 0.12 * o2(2 * f))) / ${round(Math.tanh(drive))}${pumpIf(o)}
    }
  },
}})()`
}
// bowed low strings on the bass line: the basses and the celli an octave above them, in the room
export const bowedBass = ({ color = '#7f5539', gain = 1, in: place = 'hall', wet, cut = 0.96, celli = 0.8, formula } = {}) => o => {
  o.need('instruments', 'section')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '${color}',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * ${cut} ? [bassAt(x).n] : []),
  formula: ${J(formula ?? ['Lo = \\Rev\\big[W^{\\text{кб}}(f) + ' + celli + '\\,W^{\\text{влч}}(2f)\\big]\\ \\text{— контрабасы и виолончели октавой выше, по четыре исполнителя}'])},
  audio() {
    const lo = section('basses', { players: 4, centre: 0.25, spread: 0.4, attack: 0.07, release: 0.25, seed: 61 }), hi = section('celli', { players: 4, centre: 0.2, spread: 0.5, attack: 0.07, release: 0.25, seed: 62 }), verb = ${room(o, place, wet)}, NONE = []
    let A = NONE, B = NONE, last = -1
    return x => {
      const m = bassAt(x), on = m && x - m.at < m.d * ${cut}
      if (m && m.n !== last) { last = m.n; A = [hz(m.n - 60, C4)]; B = [hz(m.n + 12 - 60, C4)] }
      const lv = ${J(DYN)}[Math.max(0, energy(x))] ?? 0.4
      const [a, b] = lo(on ? A : NONE, lv), [c, d] = hi(on ? B : NONE, lv), k = ${round(1.1 * gain * (o.gain ?? 1))}${pumpIf(o)}
      return verb(k * (a + ${celli} * c), k * (b + ${celli} * d))
    }
  },
}})()`
}
// a struck or plucked bass: a tone for poly on the bass line (the piano's low strings, a plucked double bass…)
export const tonedBass = (tone, { color = '#8d6e63', gain = 1, in: place = 'room', wet, cut = 0.92, release = 0.12, life = 4, formula } = {}) => o => {
  o.need('instruments', ...(/^[a-zA-Z]+$/.test(tone) ? [tone] : []))
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '${color}',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * ${cut} ? [bassAt(x).n] : []),
  formula: ${J(formula ?? ['Bs = \\Rev\\,P(f, t, v)\\ \\text{— щипок: основной тон гаснет медленно, обертоны быстро}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(${tone}, { release: ${release}, life: ${life}, max: 6 }), fire = trigger(), verb = ${room(o, place, wet)}
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), (mod(m.at, 2) === 0 ? 0.85 : 0.7) * (0.9 + 0.1 * hash(m.at * 3, 19)), m.d * ${cut} * sec)
      const y = ${round(gain * (o.gain ?? 1))} * p()${pumpIf(o)}
      return verb(y, y)
    }
  },
}})()`
}

// ---- an arpeggio of the chord on a struck tone: tonedArp('harpTone', { pattern, rate (notes a beat), … }) ----------------
// pattern: indices into the voicing, bottom up (4 = the bottom note an octave higher…); roles / from: where it plays
export const tonedArp = (tone, { color = '#caffbf', gain = 1, in: place = 'hall', wet, echo = 0, pattern = [0, 1, 2, 3, 2, 1], rate = 2, up = 12, roles = ['intro', 'bridge', 'break', 'final', 'solo', 'themeB'], from = 0, life = 3, release = 0.3, hold = 0.9, accent = 4, spread = 0.5, formula } = {}) => o => {
  o.need('instruments', ...(/^[a-zA-Z]+$/.test(tone) ? [tone] : []))
  return `(() => {
  const PATTERN = ${J(pattern)}
  const arpAt = x => {
    const e = energy(x)
    if (e < ${from} || x >= END - 1 || !${J(roles)}.includes(role(x))) return null
    const j = floor(x * ${rate} + 1e-9), c = chordAt(j / ${rate})
    if (!c) return null
    const v = c[3], i = PATTERN[mod(j, PATTERN.length)]
    return { n: v[i % v.length] + 12 * floor(i / v.length) + ${up}, at: j / ${rate}, vel: mod(j, ${accent}) === 0 ? 0.8 : 0.55, j }
  }
  return {
  color: '${color}',
  graph: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? ${o.lane[0]} + (arpAt(x).n - 55) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < ${round(Math.min(0.24, 0.9 / rate))} ? [arpAt(x).n] : []),
  formula: ${J(formula ?? ['\\text{арпеджио: } n_j = v_{p_{j \\bmod ' + pattern.length + '}},\\quad p = (' + pattern.join(',') + ')\\ \\text{— ноты аккорда снизу вверх, каждая на своей стороне}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, L = poly(${tone}, { release: ${release}, life: ${life}, max: 14 }), R = poly(${tone}, { release: ${release}, life: ${life}, max: 14 }), fire = trigger(), verb = ${room(o, place, wet)}${echo ? `, echo = delay({ time: sec * 0.75, feedback: 0.36, wet: ${echo} })` : ''}
    return x => {
      const m = arpAt(x)
      if (m && fire(m.at)) (m.j % 2 ? R : L).hit(hz(m.n - 60, C4), m.vel * (0.85 + 0.15 * hash(m.j, 29)), ${hold} / ${rate} * sec)
      const a = L(), b = R(), k = ${round(gain * (o.gain ?? 1))}${pumpIf(o)}
      return verb(...${echo ? `echo(k * (a + ${round(1 - spread)} * b), k * (b + ${round(1 - spread)} * a))` : `[k * (a + ${round(1 - spread)} * b), k * (b + ${round(1 - spread)} * a)]`})
    }
  },
}})()`
}

// ---- a bass synthesizer: a soloist's timbre low down, every note with an edge that closes, a sine an octave below -------
export const synthBass = (timbre = 'saw', { color = '#3a86ff', gain = 1, cut = 0.85, accent = 0.5, sub = 0.6, dn = 0, formula } = {}) => o => {
  o.need('instruments', 'soloist')
  o.need('engine', 'osc')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '${color}',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * ${cut} ? [bassAt(x).n] : []),
  formula: ${J(formula ?? ['Bs = W_{d(\\tau)}(f) + ' + sub + '\\sin 2\\pi\\tfrac f2 t,\\quad d(\\tau) = d_0 + ' + accent + 'e^{-\\tau/70\\text{мс}}\\ \\text{— яркость открывается на атаке ноты и закрывается}'])},
  audio() {
    const a = soloist('${timbre}', { vib: 0, glide: 0.012, accent: ${accent}, drift: 0 }), s = osc('sine'), env = smooth(8)
    let n = 36
    return x => {
      const m = bassAt(x), on = !!m && x - m.at < m.d * ${cut}
      if (m) n = m.n
      const f = hz(n + ${dn} - 60, C4)
      return ${round(1.5 * gain * (o.gain ?? 1))} * (a(f, on, 0.55 + 0.1 * Math.max(0, energy(x))) + ${sub} * 0.25 * env(on ? 1 : 0) * s(f / 2 < 30 ? f : f / 2))${pumpIf(o)}
    }
  },
}})()`
}

// ---- a drum kit: studioKit({ pieces, body, graph, in }) -----------------------------------------------------------------
// pieces: { name: [maker code, GM note, level, pan, how much goes to the room, 'beat' when the maker counts in beats] };
// body: the bar's hits (see stageHits: add(drum, vel, ...beats), steps(drum, vel, '16 steps'), s r e t L fill b x)
export const studioKit = ({ color = '#ff9f1c', pieces, body, graph, in: place = 'room', wet = 0.5, gain = 1, formula, imports = [] }) => o => {
  o.need('instruments', 'hall', ...imports)
  const names = Object.keys(pieces)
  return `(() => {
  ${stageHits(body)}
  return {
  color: '${color}',
  ${stageGraph(graph)}
  ${stageMidi(names.map(n => [n, pieces[n][1]]))}
  formula: ${J(formula ?? ['D = \\sum_d g_d\\,D_d(\\tau_d) + \\Rev\\sum_d s_d\\,g_d\\,D_d(\\tau_d)\\ \\text{— каждый барабан на своём месте, в комнату уходит своя доля}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, verb = ${ROOMS[place].replace('{ ', '{ dry: 0, ').replace(/wet: [\d.]+/, 'wet: ' + wet)}
    const D = { ${names.map(n => `${J(n)}: ${pieces[n][0]}`).join(', ')} }
    const hit = (d, x, k) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * D[d](h.τ * k, true) : D[d](9, false) }
    return x => {
      let l = 0, r = 0, sl = 0, sr = 0, y = 0
      ${names.map(n => { const [, , lv, pn = 0, send = 0.3, unit] = pieces[n]; const gl = round(lv * Math.sqrt((1 - pn) / 2) * Math.SQRT2), gr = round(lv * Math.sqrt((1 + pn) / 2) * Math.SQRT2); return `y = hit(${J(n)}, x, ${unit === 'beat' ? 1 : 'sec'}); l += ${gl} * y; r += ${gr} * y; sl += ${round(send * gl)} * y; sr += ${round(send * gr)} * y` }).join('\n      ')}
      const [a, b] = verb(sl, sr), k = ${round(gain * (o.gain ?? 1))}
      return [k * (l + a), k * (r + b)]
    }
  },
}})()`
}

// ---- the instruments every «2» style may use, under their names --------------------------------------------------------
Object.assign(LEADS, {
  violin2: soloLead('violins', { color: '#ffd166', scoop: 10, gain: 1.15 }),
  cello2: soloLead('celli', { color: '#c9843b', dn: -12, scoop: 8, gain: 1.25 }),
  flute2: soloLead('flute', { color: '#e8f4ff', gain: 1.2 }),
  oboe2: soloLead('oboe', { color: '#e9c46a', gain: 0.95 }),
  clarinet2: soloLead('clarinet', { color: '#cdb4db', gain: 1.1 }),
  horn2: soloLead('horns', { color: '#f4a261', accent: 0.25, gain: 1.25, in: 'big' }),
  trumpet2: soloLead('trumpets', { color: '#ffb703', accent: 0.35, scoop: 18, gain: 0.95 }),
  sax2: soloLead('sax', { color: '#e09f3e', accent: 0.2, scoop: 28, glide: 0.05, gain: 1.05, in: 'club', wet: 0.26 }),
  voice2: soloLead('aah', { color: '#ffc8dd', scoop: 14, unison: 0.6, gain: 1.05, in: 'big' }),
  softlead: soloLead('sine', { color: '#a0e7e5', glide: 0.06, echo: 0.26, gain: 3.6, in: 'big' }),
  sawlead2: soloLead('saw', { color: '#ff7eb6', unison: 0.8, echo: 0.2, gain: 0.8, in: 'big' }),
  squarelead2: soloLead('square', { color: '#9bf6ff', echo: 0.2, gain: 0.8, in: 'hall' }),
  grand: keysLead('grandTone', { color: '#fdfcdc', gain: 1.5 }),
  felt: keysLead('feltTone', { color: '#e6ccb2', gain: 1.7, soft: 0.08, in: 'room', wet: 0.24 }),
  glassbell: keysLead('glassBellTone', { color: '#b8f0ff', gain: 1.25, in: 'big', echo: 0.24, release: 0.8, life: 6 }),
  softpluck: keysLead('softPluckTone', { color: '#7ff5d0', gain: 0.85, in: 'big', echo: 0.3, release: 0.25, life: 3 }),
})
Object.assign(COUNTER_VOICE, { violin2: 'flute2', cello2: 'violin2', flute2: 'clarinet2', oboe2: 'flute2', clarinet2: 'flute2', horn2: 'violin2', trumpet2: 'sax2', sax2: 'trumpet2', voice2: 'flute2', softlead: 'glassbell', sawlead2: 'softlead', squarelead2: 'softlead', grand: 'violin2', felt: 'softlead', glassbell: 'softlead', softpluck: 'softlead' })
Object.assign(CHORDS, {
  grandcomp: keysComp('grandTone', { gain: 1.2, low: 0.85 }),
  feltcomp: keysComp('feltTone', { color: '#e6ccb2', gain: 1.45, soft: 0.1, in: 'room', wet: 0.24, roll: 0.02 }),
  stringchords: sectionChords([['violins', 4, 0, 0.9, { top: 2, centre: -0.45, spread: 0.5 }], ['violas', 3, 0, 0.8, { centre: 0.1, spread: 0.4 }], ['celli', 3, 12, 0.7, { bass: true, centre: 0.45, spread: 0.4 }]], { color: '#f7b267' }),
})
Object.assign(PADS, {
  warmpad: sectionPad([['warm', 5, 0, 1]], { color: '#a0c4ff', ens: 0.5, gain: 1.7 }),
  glasspad: sectionPad([['glass', 4, 0, 0.9], ['warm', 3, -12, 0.5]], { color: '#caf0f8', ens: 0.35, in: 'space', wet: 0.4, gain: 1.5 }),
  airchoir: sectionPad([['ooh', 5, 0, 1, { centre: -0.15 }], ['mm', 3, -12, 0.45, { centre: 0.25 }]], { color: '#d0bfff', in: 'cathedral', wet: 0.36 }),
  choir2: sectionPad([['aah', 5, 0, 1, { centre: -0.2 }], ['ooh', 4, -12, 0.6, { centre: 0.2 }]], { color: '#c9b6ff', in: 'cathedral', wet: 0.38 }),
  stringpad: sectionPad([['violins', 5, 0, 0.9, { centre: -0.4, spread: 0.6 }], ['violas', 4, -12, 0.6, { centre: 0.15, spread: 0.5 }]], { color: '#f7b267', in: 'big' }),
})
Object.assign(BASSES, {
  sub2: subBass({ gain: 0.7 }),
  bowed2: bowedBass(),
  pizz2: tonedBass('pizzTone', { gain: 1.25 }),
  synthbass2: synthBass('saw'),
})
Object.assign(ARPS, {
  harp2: tonedArp('harpTone', { gain: 0.55 }),
  softarp: tonedArp('softPluckTone', { color: '#7ff5d0', gain: 0.3, rate: 4, pattern: [0, 1, 2, 3, 2, 3, 1, 2], echo: 0.3, in: 'big', roles: ['intro', 'bridge', 'build', 'theme', 'final', 'solo'], from: 1 }),
  glassarp: tonedArp('glassBellTone', { color: '#b8f0ff', gain: 0.4, rate: 1.5, pattern: [0, 2, 1, 3], up: 12, echo: 0.3, in: 'space', life: 5, release: 0.8, hold: 2 }),
})
