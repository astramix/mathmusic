// Recipes of the boss battle: the hard kick and reverse bass, supersaw hook, brass stabs, growl and chip bass, the hardstyle kit — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { spell } from '../theory.js'
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, TEXTURES, compHit, graphLead } from './recipes.js'

// ---- boss music: the hardstyle × chiptune sound of overclock and finalbattle ----------------------------------
// The shared part of a boss song: the kick's grid, the sidechain, key changes, the tonic in octave 1
function bossData({ need, key, bpm, sectionInfo, dj = false }) {
  need('instruments', 'duck')
  const tonic1 = 24 + key.tonic < 27 ? 36 + key.tonic : 24 + key.tonic // D♯1…D2: 39–73 Hz
  const f1 = 440 * 2 ** ((tonic1 - 69) / 12)
  return `
// ---- the fight: the kick, the sidechain, the key changes --------------------------------------------------------
const SEC = 60 / ${bpm} // seconds per beat
const sectionEnd = x => ROLE.find(r => r[0] > x)?.[0] ?? END
const KEY_UP = ${JSON.stringify(sectionInfo.filter(s => s.keyUp).map(s => [s.at, s.keyUp]))} // [start, semitones up]
const trAt = x => { let t = 0; for (const [s, k] of KEY_UP) if (s <= x) t = k; return t }
const TONIC1 = ${tonic1} // MIDI: the tonic in octave 1 — the kick's tail and the reverse bass sit on it
const KICK_GAIN = ${round(1.7 * Math.min(1, (46 / f1) ** 1.2))} // a higher tail carries more energy: (46 Hz / f)^1.2
// the kick: ${dj ? 'every beat of the intro and the outro' : 'three hits to open ("!")'}, every beat in a drop; in a build-up it comes in halfway and doubles
// (1, ½, ¼ beat); one last hit to close  → { τ beats since the hit, vel, g the grid }
const kickAt = x => {
  if (x < 0 || x >= END) return null
  const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
${dj ? `  if (r === 'intro') return { τ: mod(t, 1), vel: 0.85 + (0.1 * t) / L, g: 1 } // the DJ intro: four on the floor from the first beat
  if (r === 'outro') return t < L - 4 ? { τ: mod(t, 1), vel: 0.95, g: 1 } : { τ: t - L + 4, vel: 1, g: 4 } // the DJ outro, one last hit` : `  if (r === 'intro') return t < 5 ? { τ: t - [0, 2, 3.5].filter(q => q <= t).pop(), vel: 0.8, g: 2 } : null
  if (r === 'outro') return t < 4 ? { τ: t, vel: 0.9, g: 4 } : null`}
  const g = e >= 3 ? 1 : r === 'build' ? (t < L / 2 ? 0 : t < 0.75 * L ? 1 : t < 0.875 * L ? 0.5 : 0.25) : 0
  return g ? { τ: mod(t, g), vel: r === 'build' ? 0.55 + (0.4 * t) / L : 1, g } : null
}
// the sidechain: in a drop every part dips under the kick and comes back in 0.18 s
const pumpAt = x => { const k = kickAt(x); return k && energy(x) >= 3 ? duck(k.τ * SEC) : 1 }
`
}
// The boss's solo: a melody that is a graph — two sines, snapped to the chord on the beat and to the scale
// between (finalbattle's "equation"); the coefficients come from the seed
function equationSolo({ need, key, solo, r }) {
  need('engine', 'PI')
  const a = round(4 + 2 * r()), b = round(3 + 2 * r()), ph = round(2 * Math.PI * r()), center = 13 // C♯5, the middle of the hook's range
  return `// the solo is an equation: one note per eighth j, n(j) = ⌊${a} sin(πj/8) + ${b} sin(3πj/16 + ${ph})⌉ around ${spell(center + 60, key)},
// snapped to the chord on the beat and to the scale between — the attack you dodge is the formula you hear
const snapTo = (n, pcs) => { for (let d = 0; d < 7; d++) for (const k of [n - d, n + d]) if (pcs.includes(mod(k, 12))) return k; return n }
const SOLO = Array.from({ length: ${2 * (solo.beats - 2)} }, (_, j) => {
  const c = chordAt(${solo.at} + j / 2), raw = ${center} + Math.round(${a} * sin((PI * j) / 8) + ${b} * sin((3 * PI * j) / 16 + ${ph}))
  return [j / 2, snapTo(raw, j % 2 === 0 && c ? c[3].map(n => mod(n, 12)) : SCALE), 0.5]
})`
}

// H(x) — the supersaw hook: 7 saws and 5 an octave up, portamento, ducked under the kick
LEADS.supersaw = o => {
  o.need('engine', 'supersaw')
  return `{
  color: '#ffffff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.5\\,d(t_k)\\,\\LP_{7000}\\big(\\SS_7(f) + 0.5\\,\\SS_5(2f)\\big)\\Big],\\qquad f = 261.63\\cdot 2^{n/12}\\ \\text{(портаменто 18 мс)}', 'd(t_k) = 1 - 0.7\\big(1 - t_k/0.18\\big)^2\\ \\text{(сайдчейн от бочки в дропах)}'])},
  audio() {
    const main = supersaw({ voices: 7, detune: 0.27, seed: 3 }), oct = supersaw({ voices: 5, detune: 0.21, seed: 5 })
    const lpL = filter('lp'), lpR = filter('lp'), gate = smooth(6), glide = smooth(18), fx = reverb({ room: 0.88, wet: 0.4 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const a = ${round(0.5 * o.gain)} * gate(m && m.u < 0.92 ? 1 : 0) * pumpAt(x), f = glide(hz(n, C4))
      const [l1, r1] = main(f), [l2, r2] = oct(2 * f)
      return fx(a * lpL(l1 + 0.5 * l2, 7000, 0.8), a * lpR(r1 + 0.5 * r2, 7000, 0.8))
    }
  },
}`
}
COUNTER_VOICE.supersaw = 'pulse12'

// O(x) — brass stabs: the voicing on four 5-voice supersaws, a low-pass snapping shut after each hit
CHORDS.brass = o => {
  o.need('engine', 'supersaw')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffb347',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.4 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(0.35, h.d * 0.9) ? c[3] : [] },
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.4\\,d\\,v\\,(1 - e^{-t/5\\text{мс}})\\,e^{-t/0.3}\\,\\LP_{400 + 6000e^{-t/60\\text{мс}}}\\sum_{j=1}^{4}\\SS_5(f_j)\\Big],\\quad f_j \\text{ — голоса аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, voices = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.12, seed: 40 + j }))
    const lpL = filter('lp'), lpR = filter('lp'), fx = reverb({ room: 0.9, wet: 0.42 })
    let v = [57, 60, 64, 69]
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (c) v = c[3]
      const t = h ? (x - h.at) * sec : 9, a = h && c ? h.vel * (1 - exp(-t / 0.005)) * exp(-t / 0.3) : 0
      let l = 0, r = 0
      voices.forEach((s, j) => { const [p, q] = s(hz(v[j % v.length] - 60, C4)); l += p; r += q })
      const k = 0.25 * a * pumpAt(x), fc = 400 + 6000 * exp(-t / 0.06)
      return fx(k * lpL(l, fc, 0.9), k * lpR(r, fc, 0.9))
    }
  },
}})()`
}

// G(x) — the growl: saw + square driven into tanh, a resonant low-pass snapping shut after each sixteenth
// (0, 0, 12, 0, 0, 7, 0, 10 over the root); a note a beat when calm; the drops belong to the reverse bass
BASSES.growl = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const GROWL = [0, 0, 12, 0, 0, 7, 0, 10]
  const growlAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || e >= 3 || x >= END - 1) return null
    const [s, r] = sectionOf(x), t = x - s, j = floor(4 * x), τ = mod(x, 0.25)
    if (r === 'bridge' || r === 'intro' || (r === 'build' && t >= (sectionEnd(x) - s) / 2)) return r !== 'build' && mod(x, 1) < 0.85 ? { n: c[2], τ: mod(x, 1) } : null
    return τ < 0.18 ? { n: c[2] + GROWL[mod(j, 8)], τ } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (growlAt(x) ? ${o.lane[0]} + (growlAt(x).n - 28) / 24 : null),
  midi: x => (growlAt(x) ? [growlAt(x).n] : []),
  formula: ${JSON.stringify(['y = 0.3\\tanh\\!\\Big(1.5\\Big[\\LP_{180 + 2600e^{-t/70\\text{мс}}}^{\\,Q=2}\\tanh\\!\\big(5(\\saw(f) + 0.6\\sq(1.003f))\\big) + 0.6\\sin 2\\pi\\!\\int\\! f\\,dT\\Big]\\Big)', 'f = 261.63\\cdot 2^{(r + g_j - 60)/12},\\qquad g = (0, 0, 12, 0, 0, 7, 0, 10)_{\\lfloor 4x\\rfloor \\bmod 8}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, sw = osc('saw'), sq = osc('square'), sub = osc('sine'), lp = filter('lp'), gate = smooth(3), glide = smooth(4)
    let n = 40
    return x => {
      const g = growlAt(x)
      if (g) n = g.n
      const f = glide(hz(n - 60, C4)), a = gate(g ? 1 : 0), t = g ? g.τ * sec : 1
      const y = lp(tanh(5 * (sw(f) + 0.6 * sq(1.003 * f))), 180 + 2600 * exp(-t / 0.07), 2) + 0.6 * sub(f)
      return 0.3 * a * tanh(1.5 * y)
    }
  },
}})()`
}
// T(x) — the 4-bit triangle bass of the chip sections: octave eighths; a whole bar when calm
BASSES.chiptri = o => {
  o.need('instruments', 'triangle4')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || e >= 3 || x >= END - 1) return null
    const [s, r] = sectionOf(x)
    if (r === 'build' && x - s >= (sectionEnd(x) - s) / 2) return null
    if (r === 'bridge' || r === 'intro' || r === 'build') return mod(x, 1) < 0.8 ? { n: c[2], at: floor(x) } : null
    return mod(x, 0.5) < 0.4 ? { n: c[2] + 12 * mod(floor(2 * x), 2), at: floor(2 * x) / 2 } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['T(f) = \\lfloor 8\\,\\tri(\\varphi)\\rfloor/8\\quad\\text{— 4-битный треугольник NES, октавы восьмыми}'])},
  audio() {
    const tri = triangle4(), lp = filter('lp'), gate = smooth(1)
    let n = 40
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      return 0.3 * gate(m ? 1 : 0) * lp(tri(hz(n - 60, C4)), 8000)
    }
  },
}})()`
}

// R(x) — the reverse bass: a swell u² between the kicks of a drop, on the chord's root in octave 1;
// rolling (two swells a beat) in the final
function reverseBassTrack(o) {
  o.need('instruments', 'reverseBass')
  return `(() => {
  const rbassAt = x => {
    const c = chordAt(x)
    if (!c || energy(x) < 3 || x >= END) return null
    const p = mod(x, 1)
    if (p < 0.5) return null
    return { u: role(x) === 'final' ? mod(p - 0.5, 0.25) / 0.25 : (p - 0.5) / 0.5, n: 27 + mod(c[2] - 27, 12) }
  }
  return {
  color: '#b0123e',
  graph: x => { const b = rbassAt(x); return b ? ${o.lane[0]} + 0.1 + 0.8 * b.u * b.u + (b.n - 27) / 40 : null },
  midi: x => (rbassAt(x) && rbassAt(x).u > 0.3 ? [rbassAt(x).n] : []),
  formula: ${JSON.stringify(['y = \\HP_{25}\\,\\LP_{150\\cdot 2^{4.2u}}\\tanh\\!\\Big(5u^2\\big(0.4\\saw(f) + 0.4\\saw(1.006f) + 0.8\\sin 2\\pi\\!\\int\\! f\\,dT\\big)\\Big)', 'u = \\frac{(x \\bmod 1) - \\tfrac12}{\\tfrac12}\\ \\text{(дроп)},\\qquad u = \\frac{(x - \\tfrac12) \\bmod \\tfrac14}{\\tfrac14}\\ \\text{(катящийся бас в финале)}'])},
  audio() {
    const rb = reverseBass({ drive: 5, open: 4.2, q: 1.4 }), lp = filter('lp')
    return x => {
      const b = rbassAt(x)
      return ${round(0.7 * (o.gain ?? 1))} * lp(rb(b ? b.u : null, hz(b ? b.n - 60 : -24, C4)), 2500)
    }
  },
}})()`
}

// P(x) — the 60 Hz chip arpeggio: the chord a note per frame (⌊60T⌋ mod 3); in a drop a sixteenth broken
// chord over two octaves (0 1 2 3 4 3 2 1), eighths in the chip sections, a slow beat when calm
ARPS.chip60 = o => {
  o.need('instruments', 'pulse', 'vol4')
  return `(() => {
  const arpAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || x >= END) return null
    const v = c[3].slice(0, 3)
    if (e >= 3) {
      const i = [0, 1, 2, 3, 4, 3, 2, 1][mod(floor(4 * x), 8)]
      return { notes: [v[i % 3] + 12 * floor(i / 3)], a: 0.55 * exp(-10 * mod(x, 0.25)) }
    }
    if (e === 2) return { notes: v, a: 0.5 * exp(-4 * mod(x, 0.5)) }
    return { notes: v, a: 0.35 * exp(-2 * mod(x, 1)) }
  }
  return {
  color: '#ffe08a',
  graph: x => (arpAt(x) && arpAt(x).a > 0.12 ? arpAt(x).notes.map(n => ${o.lane[0]} + (n - 55) / 40) : null),
  midi: x => (arpAt(x) && arpAt(x).a > 0.15 ? arpAt(x).notes : []),
  formula: ${JSON.stringify(['y = \\Rev\\Big[d\\,\\vol(0.1 + a)\\,\\LP_{11\\text{k}}\\,\\Pi_{1/8}\\big(f_{c_i}\\big)\\Big],\\qquad i = \\lfloor 60T\\rfloor \\bmod 3', 'a = 0.55e^{-10(x \\bmod \\frac14)},\\ c = (0,1,2,3,4,3,2,1)_{\\lfloor 4x\\rfloor \\bmod 8}\\ \\text{(дроп)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = pulse(0.125), lp = filter('lp'), verb = reverb({ room: 0.78, wet: 0.35 })
    return x => {
      const s = arpAt(x), n = s ? s.notes[mod(floor(60 * x * sec), s.notes.length)] : 69
      const y = 1.5 * pumpAt(x) * (s ? vol4(0.1 + s.a) : 0) * lp(p(hz(n - 60, C4)), 11000)
      return verb(...pan(y, 0.35))
    }
  },
}})()`
}

// K(x) — the hardstyle kick: a pitch dive f(1 + 30e^{−t/4ms} + 2e^{−t/30ms}) through two tanh stages, its tail
// on the tonic (following the key changes); MIDI 36 on every hit — Glitch Forest takes its rhythm from it
function hardKickTrack(o) {
  o.need('instruments', 'hardKick')
  return `{
  color: '#ff3b6b',
  graph: x => { const k = kickAt(x); return k && k.τ < 0.5 ? 2.6 + 1.9 * k.vel * exp(-6 * k.τ) : null },
  midi: x => { const k = kickAt(x); return k && k.τ < Math.min(0.25, k.g / 2) ? [36] : [] },
  formula: ${JSON.stringify(['y = 0.8\\tanh\\!\\Big(2.2\\,\\LP_{5200}\\big[\\tanh(8(s + 0.3)) - \\tanh 2.4\\big]\\Big) + 0.5e^{-t/1.5\\text{мс}}\\HP_{3000}\\eta + 0.55\\,a\\sin 2\\pi\\!\\int\\! f\\,dT', 's = a\\sin 2\\pi\\!\\int f\\big(1 + 30e^{-t/4\\text{мс}} + 2e^{-t/30\\text{мс}}\\big)\\,2^{-7\\min(1,\\,(t-0.3)^+/0.12)/12}\\,dT,\\qquad f \\text{ — тоника в 1-й октаве}'])},
  audio() {
    const k = hardKick({ tail: 0.3, drop: 7, drive: 8, bias: 0.3, tone: 5200, sub: 0.55 })
    return x => {
      const h = kickAt(x)
      return ${o.gain && o.gain !== 1 ? `${o.gain} * ` : ''}KICK_GAIN * (h ? h.vel : 0) * k(h ? h.τ * SEC : 1, hz(TONIC1 + trAt(x) - 60, C4), !!h)
    }
  },
}`
}
// D(x) — the kit around the kick: clap on 2 and 4, off-beat hats and a crash in a drop; a chip groove (triangle
// kick, noise snare) in the chip sections; a snare roll doubling (1, ½, ¼, ⅛) through a build-up
KITS.hardstyle = o => {
  o.need('instruments', 'clapDrum', 'hatDrum', 'lfsr', 'triangle4', 'vol4')
  o.need('engine', 'noise')
  return `(() => {
  const barCache = new Map()
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, drum.length))]))
    if (x < END) {
      const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
      if (r === 'build') {
        const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
        for (let p = 0; p < 4; p += step) add('snare', 0.35 + (0.5 * (t + p)) / L, p)
      } else if (e >= 3) {
        add('clap', 1, 1, 3)
        for (let i = 0; i < 4; i++) add('hat', 0.8, i + 0.5)
        if (r === 'final' || r === 'solo') for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.25, i + 0.75)
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (b % 8 === 7) add('clap', 0.7, 3.5, 3.75)
      } else if (e === 2) {
        add('chip', 1, 0, 2.5)
        add('snare', 0.8, 1, 3)
        for (let i = 0; i < 8; i++) add('hat', i % 2 ? 0.45 : 0.7, i / 2)
        if (b % 4 === 3) add('snare', 0.6, 3.25, 3.5, 3.75)
      } else if (r === 'intro') {
        if (t === 0) add('crash', 1, 0)
        if (t + 4 >= L) for (let i = 0; i < 8; i++) add('snare', 0.4 + 0.07 * i, 2 + i / 4) // a roll into the theme
      } else if (r === 'outro') {
        if (t === 0) add('crash', 1, 0)
      } else if (t >= L / 2) for (let i = 0; i < 4; i++) add('hat', 0.35, i + 0.5)
    }
    barCache.set(b, hits.sort((a, c) => a[0] - c[0]))
    return hits
  }
  function lastHit(x, drum) {
    for (let b = floor(x / 4); b >= floor(x / 4) - 2 && b >= 0; b--) {
      let best = null
      for (const [p, d, v] of barHits(b)) if (d === drum && 4 * b + p <= x) best = { τ: x - 4 * b - p, vel: v }
      if (best) return best
    }
    return null
  }
  return {
  color: '#ff6f91',
  graph: x => {
    const c = lastHit(x, 'clap'), s = lastHit(x, 'snare')
    if (x >= END) return null
    if (c && c.τ < 0.3) return 3.6 + 0.7 * c.vel * exp(-8 * c.τ)
    return s && s.τ < 0.2 ? 3.2 + 0.6 * s.vel * exp(-10 * s.τ) : null
  },
  midi: x => (x >= END ? [] : [['chip', 35], ['snare', 38], ['clap', 39], ['hat', 42], ['crash', 49]].filter(([d]) => lastHit(x, d)?.τ < 0.1).map(([, n]) => n)),
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.9\\,\\text{Clap}(t) + 0.36\\,\\vol(e^{-12t})\\lfsr_{12\\text{k}} + 0.3\\,\\text{Hat}(t) + 0.3e^{-2t}\\HP_{4000}\\eta + 0.6\\,\\tri_4(60 + 300e^{-30t})\\Big]', '\\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18\\ \\text{доли}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, clap = clapDrum({ center: 1450 }), hat = hatDrum({ cutoff: 8000, decay: 70 }), tri = triangle4()
    const sn = lfsr(), η = noise(31), hp = filter('hp'), verb = reverb({ room: 0.75, wet: 0.25 })
    return x => {
      const at = d => { const h = x < END ? lastHit(x, d) : null; return h ? { t: h.τ * sec, v: h.vel } : { t: 9, v: 0 } }
      const c = at('clap'), s = at('snare'), h = at('hat'), k = at('chip'), cr = at('crash')
      const y = 0.9 * c.v * clap(c.t, c.t < 0.4) + 0.36 * s.v * vol4(exp(-12 * s.t)) * sn(12000) + 0.3 * h.v * hat(h.t, h.t < 0.1)
        + 0.3 * cr.v * exp(-2 * cr.t) * hp(η(), 4000) + 0.6 * k.v * (k.t < 0.15 ? tri(60 + 300 * exp(-30 * k.t)) : (tri(60), 0))
      return verb(1.2 * y, 1.2 * y)
    }
  },
}})()`
}
// F(x) — fx: the "!" alarm at the start (dominant and tonic in square waves), the build-ups' riser (a noise
// band climbing 300 → 12 000 Hz and a pulse siren), a falling sweep into every drop
TEXTURES.riser = o => {
  o.need('engine', 'noise')
  o.need('instruments', 'pulse')
  return `{
  color: '#c9b8ff',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.5
    return r === 'intro' && t < 2 ? 4.5 : null
  },
  formula: ${JSON.stringify(['y = \\Rev\\Big[0.08\\,\\Pi_{1/2}\\big(f_5 \\,|\\, f_1\\big) + 0.6a^2\\,\\BP_{300\\cdot 2^{5.3a}}\\eta + 0.12a\\,\\Pi_{1/2}(220\\cdot 2^{4a}) + 0.5e^{-1.5t}\\BP_{8000\\cdot 2^{-4t}}\\eta\\Big],\\quad a = t/L'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(23), bp = filter('bp'), bp2 = filter('bp'), siren = pulse(0.5), alarm = pulse(0.5), verb = reverb({ room: 0.85, wet: 0.45 })
    const f5 = hz(TONIC1 + 55 - 60, C4), f1 = hz(TONIC1 + 60 - 60, C4)
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, a = r === 'build' ? t / (sectionEnd(x) - s) : 0
      let y = 0.6 * a * a * bp(η(), 300 * 2 ** (5.3 * a), 1.5) + 0.12 * a * siren(220 * 2 ** (4 * a))
      const down = e >= 3 && t < 3 ? t * sec : 9
      y += 0.5 * exp(-1.5 * down) * bp2(η(), 8000 * 2 ** (-4 * down), 1)
      const al = alarm(mod(floor(2 * t), 2) ? f1 : f5)
      if (r === 'intro' && t < 2 && mod(t, 0.5) < 0.4) y += 0.08 * al
      return verb(y, y)
    }
  },
}`
}

export { bossData, equationSolo, hardKickTrack, reverseBassTrack }
