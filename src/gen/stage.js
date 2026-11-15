// The stage (club and cinematic styles): section data, the club kick, EDM, disco, epic and factory recipes — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { spell } from '../theory.js'
import { pick, round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, TEXTURES, bassData, graphLead } from './recipes.js'

// ---- the stage: the dance floor (edm, disco, the factory) and the big screen (epic) ---------------------------------
// The shared part of these songs: seconds per beat, where a section ends, the key changes; for the club styles the kick's
// grid (a 16-step pattern per energy, four on the floor in a drop, out in the breakdown, out for the last bar of a
// build-up — the silence before the drop) and the sidechain every part ducks under.
function stageData({ need, S, key, bpm, sectionInfo }) {
  const club = S.club
  const tonicK = 27 + mod12(key.tonic - 3) // the kick's body on the tonic: D♯1 … D2 (39–73 Hz)
  const head = `
// ---- the stage: sections, key changes${club ? ', the kick and the sidechain' : ''} -----------------------------------------------------------
const SEC = 60 / ${bpm} // seconds per beat
const sectionEnd = x => ROLE.find(r => r[0] > x)?.[0] ?? END
const KEY_UP = ${JSON.stringify(sectionInfo.filter(s => s.keyUp).map(s => [s.at, s.keyUp]))} // [start, semitones up]
const trAt = x => { let t = 0; for (const [s, k] of KEY_UP) if (s <= x) t = k; return t }`
  if (!club) return head + `
const pumpAt = () => 1
`
  need('instruments', 'duck')
  return head + `
const KICK_N = ${tonicK} // MIDI: the kick's body sits on the tonic (${spell(tonicK, key)}, ${round(440 * 2 ** ((tonicK - 69) / 12))} Hz)
// the kick by energy: 16 steps a bar (x = hit); none in the breakdown${club.bridgeKick ? '' : ' (bridge)'}, none in the last bar of a build-up
const KICK = ${JSON.stringify(club.kick)}
const kickAt = x => {
  if (x < 0 || x >= END) return null
  const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
  if (r === 'build') return t < L - 4 ? { τ: mod(t, 1), vel: 0.7 + (0.3 * t) / L } : null
  if (r === 'outro' && t >= L - 4) return { τ: t - L + 4, vel: 0.9 }${club.bridgeKick ? '' : `
  if (r === 'bridge') return null`}
  for (let b = floor(x / 4) * 4; b >= floor(x / 4) * 4 - 4 && b >= s; b -= 4) {
    const pat = KICK[energy(b)]
    if (pat) for (let i = 15; i >= 0; i--) if (pat[i] === 'x' && b + i / 4 <= x) return { τ: x - b - i / 4, vel: 1 }
  }
  return null
}
// the sidechain: every part dips under the kick and comes back in 0.2 s — deepest in a drop
const pumpAt = x => { const k = kickAt(x); return k ? duck(k.τ * SEC, ${club.pump} * (energy(x) >= 3 ? 1 : 0.6), 0.2) : 1 }
`
}
const mod12 = v => ((v % 12) + 12) % 12

// K(x) — the club kick: a two-stage pitch dive onto the tonic, held, soft-clipped, the beater's click
function clubKickTrack(o) {
  o.need('instruments', 'clubKick')
  const k = o.kick ?? {}
  return `{
  color: '#ff3b6b',
  graph: x => { const k = kickAt(x); return k && k.τ < 0.5 ? 2.6 + 1.8 * k.vel * exp(-6 * k.τ) : null },
  midi: x => { const k = kickAt(x); return k && k.τ < 0.25 ? [36] : [] },
  formula: ${JSON.stringify(['K = \\frac{\\tanh\\big(d\\,a(t)\\sin\\varphi\\big)}{\\tanh d} + c\\,e^{-t/2.5\\text{мс}}\\big(0.6\\,\\HP_{4\\text{к}}\\eta + 0.4\\sin 2\\pi\\,3200t\\big)', '\\varphi = 2\\pi f\\big(t + 6\\cdot 6\\text{мс}(1 - e^{-t/6\\text{мс}}) + 1.2\\cdot 45\\text{мс}(1 - e^{-t/45\\text{мс}})\\big),\\quad f \\text{ — тоника, } a = e^{-(t - 20\\text{мс})^+/' + (k.decay ?? 0.32) + '}'])},
  audio() {
    const k = clubKick({ punch: ${k.punch ?? 6}, decay: ${k.decay ?? 0.32}, click: ${k.click ?? 0.35}, drive: ${k.drive ?? 2.2} })
    return x => {
      const h = kickAt(x)
      return ${round(o.gain ?? 0.42)} * (h ? h.vel : 0) * k(h ? h.τ * SEC : 9, hz(KICK_N + trAt(x) - 60, C4), !!h)
    }
  },
}`
}

// a pluck: two saws whose harmonics die one after another (pluckTone), a dotted-eighth ping-pong, a hall
LEADS.pluck = o => {
  o.need('instruments', 'pluckTone')
  return `{
  color: '#7ff5d0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Pl = \\Rev\\,\\Dly_{3/4}\\Big[\\sum_{k}\\tfrac{v}{k}\\,e^{-t(2.2 + 1.1k(1.3 - 0.6v))}\\big(\\sin 2\\pi kft + \\sin(2\\pi\\,1.004kft + k)\\big)\\Big]\\quad\\text{— пила, чей фильтр захлопывается: гармоника } k \\text{ гаснет со скоростью } \\propto k'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(pluckTone, { release: 0.12, life: 2.5, max: 16 }), fire = trigger()
    const echo = delay({ time: sec * 0.75, feedback: 0.38, wet: 0.3 }), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.75 + 0.2 * hash(floor(4 * x), 9), m.d * sec)
      return verb(...echo(...pan(${round(0.8 * o.gain)} * p()${o.hard ? ' * pumpAt(x)' : ''}, ${o.pan})))
    }
  },
}`
}
// the synth lead of the late pixel games: an analog mono voice (two saws + a sub square through a 24 dB resonant
// low-pass with its own envelope), glide, a late vibrato, chorus, a dotted-eighth echo and a hall
LEADS.synthlead = o => {
  o.need('instruments', 'monoSynth', 'chorus')
  return `{
  color: '#9be7ff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Ld = \\Rev\\,\\Dly\\,\\Cho\\Big[\\tfrac{1}{d}\\tanh\\!\\Big(d\\,\\LP^{Q=1.4}_{f_c}\\LP_{f_c}\\big(\\tfrac12\\saw g + \\tfrac12\\saw 1.0052g + 0.3\\sq\\tfrac g2\\big)\\Big)\\Big]', 'f_c = 1100 + 2600v\\,e^{-t/0.3},\\quad g = f\\cdot 2^{\\,0.15\\min(1, t/0.5)\\sin(2\\pi\\cdot 5.3T)/12}\\ \\text{(портаменто 30 мс)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, s = monoSynth({ cutoff: 1100, env: 2600, res: 1.4, decay: 0.3, glide: 30, sub: 0.3 }), ch = chorus({ mix: 0.35, rate: 0.6 })
    const echo = delay({ time: sec * 0.75, feedback: 0.35, wet: 0.24 }), verb = reverb({ room: 0.86, damp: 0.35, wet: 0.3 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m) n = m.n
      const vib = m ? 0.15 * Math.min(1, (m.τ * sec) / 0.5) * sin(TAU * 5.3 * t) : 0
      const y = ${round(0.72 * o.gain)} * s(hz(n + vib, C4), !!m && m.u < 0.92, 0.85)${o.hard ? ' * pumpAt(x)' : ''}
      return verb(...echo(...ch(...pan(y, ${o.pan}))))
    }
  },
}`
}
// the funk/disco lead: the same analog voice, brighter and more resonant, a fast glide (the Minimoog solo)
LEADS.moog = o => {
  o.need('instruments', 'monoSynth')
  return `{
  color: '#ffd166',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Mg = \\Rev\\,\\Dly\\Big[\\tfrac1d\\tanh\\!\\Big(d\\,\\LP^{Q=2.2}_{f_c}\\LP_{f_c}\\big(\\tfrac12\\saw g + \\tfrac12\\saw 1.0052g + 0.4\\sq\\tfrac g2\\big)\\Big)\\Big],\\quad f_c = 700 + 4200v\\,e^{-t/0.18}\\quad\\text{— «Муг»}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, s = monoSynth({ cutoff: 700, env: 4200, res: 2.2, decay: 0.18, glide: 18, sub: 0.4, drive: 2 })
    const echo = delay({ time: sec * 0.5, feedback: 0.25, wet: 0.16 }), verb = reverb({ room: 0.75, damp: 0.45, wet: 0.2 })
    let n = 0
    return x => {
      const m = ${o.at}(x), t = x * sec
      if (m) n = m.n
      const vib = m && m.τ * sec > 0.35 ? 0.2 * sin(TAU * 5.6 * t) : 0
      return verb(...echo(...pan(${round(0.72 * o.gain)} * s(hz(n + vib, C4), !!m && m.u < 0.9, 0.9)${o.hard ? ' * pumpAt(x)' : ''}, ${o.pan})))
    }
  },
}`
}
// the trailer's horn section: two horns in unison (a little apart) and one an octave below, blatting in, a hall
LEADS.hornsection = o => {
  o.need('instruments', 'brass')
  return `{
  color: '#f4a261',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [48 + m.n] : [] },
  formula: ${JSON.stringify(['Hn = \\Rev\\sum_{j=1}^{3}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)\\,e(t),\\quad g = (f, 1.0017f, f/2)\\cdot 2^{-0.5e^{-t/25\\text{мс}}/12}', 'f = 261.63\\cdot 2^{(n - 12)/12}\\ \\text{— валторны в унисон и октавой ниже},\\quad f_c = 250 + 4200v\\,e(t)^{1.6}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = brass({ voices: 3, bright: 0.85, gain: 0.5 }), verb = reverb({ room: 0.92, damp: 0.4, wet: 0.42 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n - 12
      const f = hz(n, C4), on = !!m && m.u < 0.95, vel = 0.65 + 0.12 * energy(x)
      const [l, r] = b(on ? [f, f * 1.0017, f / 2] : [], vel)
      return verb(${round(o.gain)} * l, ${round(o.gain)} * r)
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { pluck: 'pluck', synthlead: 'pluck', moog: 'epiano', hornsection: 'violin' })

// the pumping chords: the voicing on four 5-voice supersaws an octave apart from the lead, a low-pass opening with
// the energy (dark in a verse, wide open in a drop), a new swell on every chord, ducked under the kick
CHORDS.pumpsaw = o => {
  o.need('engine', 'supersaw')
  o.need('instruments', 'chorus')
  return `{
  color: '#ff6fd8',
  graph: x => (chordAt(x) && energy(x) >= 0 && role(x) !== 'build' ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && role(x) !== 'build' && x - chordAt(x)[0] < chordAt(x)[1] - 0.1 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['P = \\Rev\\,\\Cho\\Big[a\\,d(t_k)\\,\\LP^{Q=0.9}_{f_c(E)}\\sum_{j}\\SS_5(f_j)\\Big],\\quad f_c = (900, 1400, 2400, 5200)_E,\\quad a = 1 - e^{-t/40\\text{мс}}', 'd(t_k) = 1 - ' + round(o.pump ?? 0.7) + '\\big(1 - t_k/0.2\\big)^2\\ \\text{— сайдчейн от бочки}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, saws = [0, 1, 2, 3].map(j => supersaw({ voices: 5, detune: 0.2, width: 0.95, seed: 21 + j })), lp = [filter('lp'), filter('lp')], cut = smooth(250), gate = smooth(40)
    const ch = chorus({ mix: 0.3, rate: 0.4 }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.36 })
    let v = [57, 60, 64, 69]
    return x => {
      const c = chordAt(x), e = energy(x), r = role(x)
      if (c) v = c[3]
      const on = c && e >= 0 && r !== 'build' && x - c[0] < c[1] - 0.06
      const a = gate(on ? ${o.dark ? '[0.75, 0.8, 0.85, 0.9]' : '[0.6, 0.75, 0.85, 1]'}[Math.max(0, e)] : 0), fc = cut(${o.dark ? '[600, 900, 1400, 2600]' : '[900, 1400, 2400, 5200]'}[Math.max(0, e)])
      let l = 0, rr = 0
      saws.forEach((s, j) => { const [p, q] = s(hz(v[j % v.length] - 60, C4)); l += p; rr += q })
      const k = ${round(0.07 * (o.gain ?? 1))} * a * pumpAt(x)
      return verb(...ch(k * lp[0](l, fc, 0.9), k * lp[1](rr, fc, 0.9)))
    }
  },
}`
}
// funk guitar: a sixteenth pattern per energy — X a chord chopped short, x the muted "chk", - nothing; downstrokes on the
// beat and the eighths, upstrokes on the sixteenths between (the hand never stops), every chord muted after 0.1 beat
CHORDS.funkguitar = o => {
  o.need('instruments', 'funkGuitar', 'chorus')
  return `(() => {
  const SCRATCH = { 0: 'X---------------', 1: 'X-----x-X-----x-', 2: 'X-xX-xX-x-X-xX-x', 3: 'X-xXx-X-xX-xX-xX' }
  const guitarAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0 || role(x) === 'build' || x >= END - 1) return null
    const j = floor(4 * x + 1e-9), s = SCRATCH[e][mod(j, 16)]
    return s === '-' ? null : { at: j / 4, dead: s === 'x', up: j % 2 === 1, c }
  }
  return {
  color: '#ffcf9f',
  graph: x => { const g = guitarAt(x); return g && !g.dead ? g.c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const g = guitarAt(x); return g && !g.dead && x - g.at < 0.2 ? g.c[3] : [] },
  formula: ${JSON.stringify(['G = \\Rev\\,\\Cho\\Big[0.8\\LP_{5.5\\text{к}}s + 0.45\\BP_{2.3\\text{к}}s\\Big],\\ s = \\HP_{160}\\sum_{j}\\text{струна}_j\\big(f_j,\\ t - 7j\\,\\text{мс}\\big)\\quad\\text{(Карплус — Стронг, точный строй)}', '\\text{шестнадцатые: X — аккорд, приглушённый через } \\tfrac{1}{10}\\text{ доли; x — «чик» глушёных струн}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, g = funkGuitar({ seed: 7 }), fire = trigger(), ch = chorus({ mix: 0.3, rate: 0.7 }), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.16 })
    let last = null
    return x => {
      const h = guitarAt(x)
      if (h && fire(h.at)) {
        g.strum([h.c[2] + 12, ...h.c[3]].map(n => hz(n - 60, C4)), (h.dead ? 0.45 : 0.75) * (0.9 + 0.1 * hash(floor(4 * x), 2)), { up: h.up, dead: h.dead })
        last = h.dead ? null : h.at
      }
      if (last != null && x - last > 0.1) (g.mute(0.02), (last = null))
      return verb(...ch(...pan(${round(0.85 * (o.gain ?? 1))} * g(), -0.35)))
    }
  },
}})()`
}
// the trailer's ostinato: spiccato strings on the chord tones — eighths when calm, sixteenths in the action, the
// accents in 3 + 3 + 2 (the rhythm every trailer runs on)
CHORDS.ostinato = o => {
  o.need('instruments', 'spiccatoTone')
  return `(() => {
  const ACC = [1, 0, 0, 1, 0, 0, 1, 0] // 3 + 3 + 2
  const ostAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1 || role(x) === 'outro') return null
    const step = e >= 3 || role(x) === 'build' ? 0.25 : 0.5, j = floor(x / step + 1e-9), v = c[3]
    const i = [0, 2, 1, 2, 0, 2, 1, 3][mod(j, 8)] % v.length
    return { n: v[i], at: j * step, vel: (ACC[mod(j, 8)] ? 0.85 : 0.5) * (0.85 + 0.15 * e / 3) }
  }
  return {
  color: '#e9c46a',
  graph: x => { const m = ostAt(x); return m && x - m.at < 0.2 ? ${o.lane[0]} + (m.n - 48) / 20 : null },
  midi: x => { const m = ostAt(x); return m && x - m.at < 0.2 ? [m.n] : [] },
  formula: ${JSON.stringify(['Sp(f,t,v) = \\sum_{j=1}^{3}\\sum_{k}\\frac{W(kf_j)\\,v^{0.3+0.07k}}{k^{0.9}}\\,e^{-(6.25 + 0.9k)(t - \\ell_j)}\\sin 2\\pi kf_j(t - \\ell_j),\\quad f_j = f\\cdot 2^{(-6, 1, 7)/1200}', 'W(x) \\text{ — резонансы корпуса } 280,\\ 1100,\\ 2700 \\text{ Гц};\\quad \\text{акценты } 3 + 3 + 2'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(spiccatoTone, { release: 0.08, life: 1.2, max: 24 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.36 })
    return x => {
      const m = ostAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), m.vel, 0.3)
      return verb(...pan(${round(1.5 * (o.gain ?? 1))} * p(), 0.25))
    }
  },
}})()`
}

// the club bass: a sub sine and a saw through a low-pass that snaps shut, on the off-beat eighths (kick – bass – kick
// – bass); sixteenths "rolling" in the final drop; long notes in the calm; ducked under the kick
BASSES.clubbass = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const bassAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (r === 'build') return x - sectionOf(x)[0] < (sectionEnd(x) - sectionOf(x)[0]) / 2 && mod(x, 0.5) < 0.4 ? { n: c[2], at: floor(2 * x) / 2, d: 0.4 } : null
    if (e === 1 || r === 'bridge') return { n: c[2], at: c[0], d: c[1] }
    if (r === 'final' && e >= 3) return mod(x, 1) >= 0.25 ? { n: c[2] + (mod(floor(4 * x), 4) === 3 ? 12 : 0), at: floor(4 * x) / 4, d: 0.2 } : null
    return mod(x, 1) >= 0.5 ? { n: c[2], at: floor(x) + 0.5, d: 0.42 } : null
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < b.d * 0.92 ? [b.n] : [] },
  formula: ${JSON.stringify(['B = d(t_k)\\,a\\Big(0.55\\sin 2\\pi\\!\\int\\! f + 0.3\\tanh\\!\\big(1.5\\,\\LP_{120 + 1800e^{-t/60\\text{мс}}}\\saw f\\big)\\Big),\\quad \\text{на слабые восьмые: бочка — бас — бочка — бас}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, saw = osc('saw'), sine = osc('sine'), lp = filter('lp'), gate = smooth(3), glide = smooth(3)
    let n = 36
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      const t = m ? (x - m.at) * sec : 1, on = m && x - m.at < m.d * 0.92, f = glide(hz(n - 60, C4)), a = gate(on ? 1 : 0)
      return ${round(0.55 * (o.gain ?? 1))} * pumpAt(x) * a * (0.55 * sine(f) + 0.3 * tanh(1.5 * lp(saw(f), 120 + 1800 * exp(-t / 0.06))))
    }
  },
}})()`
}
// slap bass: the style's octave line on an exactly tuned electric bass — the thumb slaps the low notes, the
// finger pops the octaves; every note lifted off before the next (staccato)
BASSES.slapbass = o => {
  o.need('instruments', 'electricBass')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < bassAt(x).d * 0.9 ? [bassAt(x).n] : []),
  formula: ${JSON.stringify(['y[n] = e[n] + g\\big(a\\,y[n - D] + (1 - a)\\,y[n - D - 1]\\big),\\quad D = \\tfrac{44100}{f} - \\varphi(a)\\ \\text{— струна с точным строем}', '\\text{слэп: } a = 0.9 \\text{ (большой палец у грифа), поп — октава; глушение пальцем перед следующей нотой}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = electricBass({ seed: 5 }), fire = trigger()
    let low = 36, end = -1
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) {
        const pop = m.n > low + 6
        if (!pop) low = m.n
        b.hit(hz(m.n - 60, C4), (pop ? 0.75 : 0.9) * (0.9 + 0.1 * hash(floor(2 * x), 5)), { slap: energy(x) >= 2 })
        end = m.at + m.d * 0.85
      }
      if (end > 0 && x >= end) (b.mute(0.03), (end = -1))
      return ${round(0.85 * (o.gain ?? 1))} * b()${o.hard ? ' * pumpAt(x)' : ''}
    }
  },
}})()`
}
// the factory's sequenced bass: the analog voice on a pattern of the chord's root and octave — eighths in the town,
// long tones and a syncopation in the caves, rolling sixteenths with accents when the base is under attack
BASSES.seqbass = o => {
  o.need('instruments', 'monoSynth')
  const PAT = { city: 'R-R8R-58R-R8R-5R'.replace(/-/g, '.'), cave: 'R.......R..5....', danger: 'RRR8RRR5RRR8RR5b' }[o.variant ?? 'city']
  return `(() => {
  const SEQ = '${PAT}' // 16 steps: R root, 8 octave, 5 fifth, b the minor seventh, . held
  const bassAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (r === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    const j = floor(4 * x + 1e-9)
    let k = j
    while (SEQ[mod(k, 16)] === '.' && k > j - 16) k--
    const s = SEQ[mod(k, 16)]
    return { n: c[2] + (s === '8' ? 12 : s === '5' ? c[5][1] : s === 'b' ? 10 : 0), at: k / 4, acc: mod(k, 4) === 0 }
  }
  return {
  color: '#5aa7ff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < 0.2 ? [b.n] : [] },
  formula: ${JSON.stringify(['B = d(t_k)\\,\\tfrac1d\\tanh\\!\\Big(d\\,\\LP^{Q=1.2}_{f_c}\\LP_{f_c}\\big(\\tfrac12\\saw f + \\tfrac12\\saw 1.0052f + 0.5\\sq\\tfrac f2\\big)\\Big),\\quad f_c = 220 + 1500v\\,e^{-t/0.12}', '\\text{секвенция по 16 шагам: } ' + PAT.replace(/\./g, '\\cdot ')])},
  audio({ bpm }) {
    const sec = 60 / bpm, s = monoSynth({ cutoff: 220, env: 1500, res: 1.2, decay: 0.12, glide: 4, sub: 0.5, drive: 1.8 }), fire = trigger()
    let n = 36, retrig = 0
    return x => {
      const m = bassAt(x)
      if (m) n = m.n
      if (m && fire(m.at)) retrig = 2 // a new note: the gate opens again (two silent samples)
      const on = !!m && retrig-- <= 0
      return ${round(0.26 * (o.gain ?? 1))} * pumpAt(x) * s(hz(n - 60, C4), on, m && m.acc ? 1 : 0.75)
    }
  },
}})()`
}
// the trailer's low strings: celli and basses in octaves — spiccato eighths on the root in the action (sixteenths in a
// build-up), long bowed tones when calm
BASSES.lowstrings = o => {
  o.need('instruments', 'spiccatoTone', 'strings')
  return `(() => {
  const lowAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (e === 1 || r === 'bridge') return { n: c[2], at: c[0], long: true }
    const step = r === 'build' ? 0.25 : 0.5, j = floor(x / step + 1e-9)
    return { n: c[2] + (mod(j, 8) === 7 ? c[5][1] : 0), at: j * step, vel: mod(j, 2) ? 0.6 : 0.9 }
  }
  return {
  color: '#c08a5a',
  graph: x => (lowAt(x) ? ${o.lane[0]} + (lowAt(x).n - 28) / 24 : null),
  midi: x => { const m = lowAt(x); return m && (m.long || x - m.at < 0.2) ? [m.n] : [] },
  formula: ${JSON.stringify(['\\text{виолончели и контрабасы в октаву: спиккато } Sp(f) + Sp(f/2) \\text{ восьмыми; в тишине — смычком}'])},
  audio({ bpm }) {
    const p = poly(spiccatoTone, { release: 0.08, life: 1.2, max: 16 }), fire = trigger(), bow = strings({ voices: 2, attack: 300, release: 900, cutoff: 1800, gain: 0.09 }), verb = reverb({ room: 0.88, damp: 0.45, wet: 0.28 })
    return x => {
      const m = lowAt(x)
      if (m && !m.long && fire(m.at)) (p.hit(hz(m.n - 60, C4), m.vel, 0.25), p.hit(hz(m.n - 72, C4), m.vel, 0.25))
      const [l, r] = bow(m && m.long ? [hz(m.n - 60, C4), hz(m.n - 72, C4)] : [])
      const y = ${round(1.7 * (o.gain ?? 1))} * p()
      return verb(y + l, y + r)
    }
  },
}})()`
}

// the EDM arpeggio: the voicing an octave up in sixteenths (up, up, down), in the breakdown, the build-ups and the drops
ARPS.pluckarp = o => {
  o.need('instruments', 'pluckTone')
  return `(() => {
  const arpAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1 || !['bridge', 'build', 'theme', 'final', 'intro'].includes(r)) return null
    const j = floor(4 * x + 1e-9), v = c[3], cyc = [0, 1, 2, 3, 2, 3, 1, 2]
    return { n: v[cyc[mod(j, 8)] % v.length] + 12, at: j / 4, vel: mod(j, 4) === 0 ? 0.8 : 0.55 }
  }
  return {
  color: '#7ff5d0',
  graph: x => (arpAt(x) && x - arpAt(x).at < 0.15 ? ${o.lane[0]} + (arpAt(x).n - 55) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? [arpAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{арпеджио шестнадцатыми: } n_j = v_{(0,1,2,3,2,3,1,2)_{j \\bmod 8}} + 12,\\quad Pl(f, t, v) \\text{ — щипок с закрывающимся фильтром}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(pluckTone, { release: 0.06, life: 1.2, max: 12 }), fire = trigger(), echo = delay({ time: sec * 0.75, feedback: 0.4, wet: 0.3 }), verb = reverb({ room: 0.85, wet: 0.3 })
    return x => {
      const m = arpAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), m.vel, 0.18)
      return verb(...echo(...pan(${round(0.32 * (o.gain ?? 1))} * p() * pumpAt(x), -0.3)))
    }
  },
}})()`
}
// the disco horn section: trumpets, a trombone and a tenor sax on the chord — stabs on the "and" of 2 and on 4, a fall
// at the end of every fourth bar
ARPS.horns = o => {
  o.need('instruments', 'brass')
  return `(() => {
  const HITS = [[1.5, 0.25], [3, 0.4]] // [beat, length]
  const hornAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 2 || !['theme', 'final', 'solo'].includes(r) || x >= END - 1) return null
    const p = mod(x, 4)
    for (const [b, d] of HITS) if (p >= b && p < b + d) return { at: floor(x / 4) * 4 + b, d, c, fall: mod(floor(x / 4), 4) === 3 && b === 3 }
    return null
  }
  return {
  color: '#ffb347',
  graph: x => (hornAt(x) ? hornAt(x).c[3].map(n => ${o.lane[0]} + (n - 48) / 30) : null),
  midi: x => (hornAt(x) ? hornAt(x).c[3].map(n => n + 12 * (n < 64)) : []),
  formula: ${JSON.stringify(['Br = \\Rev\\sum_{j}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)e(t),\\quad f_c = 250 + 6700\\,e(t)^{1.6}\\ \\text{— медь: на «и» второй доли и на четвёртую}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = brass({ voices: 4, bright: 1.6, gain: 0.5 }), verb = reverb({ room: 0.78, damp: 0.45, wet: 0.24 })
    return x => {
      const h = hornAt(x), fall = h && h.fall ? 2 ** (-3 * Math.max(0, (x - h.at) / h.d - 0.4) / 12) : 1
      const [l, r] = b(h ? h.c[3].map(n => fall * hz(n + 12 * (n < 64) - 60, C4)) : [], 0.9)
      return verb(${round(0.75 * (o.gain ?? 1))} * l, ${round(0.75 * (o.gain ?? 1))} * r)
    }
  },
}})()`
}
// the conveyor: the machine at the heart of a factory song — a pluck sequencer on the chord tones, sixteen steps whose
// pattern the seed draws (rests included), turned by an accent cycle of three against the bar's four (3 : 4), its own
// echo on the dotted eighth. It runs in every section with energy; in the calm only every other step.
ARPS.conveyor = o => {
  o.need('instruments', 'pluckTone')
  const r = o.r, steps = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? pick(r, [0, 0, 2]) : r() < (o.variant === 'cave' ? 0.45 : 0.22) ? -1 : pick(r, [0, 1, 2, 3, 1, 2])))
  return `(() => {
  const BELT = ${JSON.stringify(steps)} // the belt: chord tone per sixteenth (−1 = an empty slot), drawn by the seed
  const beltAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1 || role(x) === 'outro') return null
    const j = floor(4 * x + 1e-9), s = BELT[mod(j, 16)]
    if (s < 0 || (e === 1 && j % 2)) return null
    const v = c[3], oct = ${o.variant === 'cave' ? '0' : '12'} + (s >= v.length ? 12 : 0)
    return { n: v[s % v.length] + oct, at: j / 4, vel: mod(j, 3) === 0 ? 0.85 : 0.55 } // accents every 3 sixteenths: 3 against 4
  }
  return {
  color: '#ffd23f',
  graph: x => (beltAt(x) && x - beltAt(x).at < 0.15 ? ${o.lane[0]} + (beltAt(x).n - 55) / 40 : null),
  midi: x => (beltAt(x) && x - beltAt(x).at < 0.2 ? [beltAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{конвейер: } n_j = v_{B_{j \\bmod 16}},\\ B = (' + steps.map(s => (s < 0 ? '\\cdot' : s)).join(',') + '),\\quad \\text{акцент при } j \\equiv 0 \\pmod 3 \\ (3 : 4)', 'Pl(f,t,v) = \\sum_k \\tfrac{v}{k} e^{-t(2.2 + 1.1k(1.3 - 0.6v))}\\sin 2\\pi kft'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(pluckTone, { release: 0.05, life: 1, max: 10 }), fire = trigger(), echo = delay({ time: sec * 0.75, feedback: ${o.variant === 'cave' ? 0.5 : 0.32}, wet: ${o.variant === 'cave' ? 0.4 : 0.26} }), verb = reverb({ room: ${o.variant === 'cave' ? 0.93 : 0.82}, wet: ${o.variant === 'cave' ? 0.42 : 0.26} })
    return x => {
      const m = beltAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n - 60, C4), m.vel, 0.12)
      return verb(...echo(...pan(${round(0.5 * (o.gain ?? 1))} * p() * pumpAt(x), 0.3)))
    }
  },
}})()`
}

// ---- kits of the stage: a pattern per bar from the section's role and energy (as the hardstyle kit does) — or, when
// the kit is written as an instrument of a project (partInstrument), its hits from the notes: HITS = { drum: [[beat, vel]] }
let NOTE_HITS = false, KIT_MAP = null
const stageHits = body => NOTE_HITS ? `function lastHit(x, drum) {
    const L = HITS[drum]
    if (!L) return null
    let lo = 0, hi = L.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (L[m][0] <= x) lo = m + 1; else hi = m }
    return lo ? { τ: x - L[lo - 1][0], vel: L[lo - 1][1] } : null
  }` : `const barCache = new Map()
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, drum.length))]))
    const steps = (drum, vel, s) => { for (let i = 0; i < 16; i++) if (s[i] === 'x' || s[i] === 'o') add(drum, s[i] === 'x' ? vel : 0.45 * vel, i / 4) }
    if (x < END) {
      const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s, fill = b % 8 === 7 || x + 4 >= sectionEnd(x)
${body}
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
  }`
const ROLL = `const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
        for (let p = 0; p < 4; p += step) add('snare', 0.3 + (0.6 * (t + p)) / L, p)`
const stageGraph = drums => `graph: x => {
    if (x >= END) return null
    ${drums.map(([d, y, h]) => `{ const q = lastHit(x, '${d}'); if (q && q.τ < 0.3) return ${y} + ${h} * q.vel * exp(-8 * q.τ) }`).join('\n    ')}
    return null
  },`
const stageMidi = map => (KIT_MAP = map, `midi: x => (x >= END ? [] : ${JSON.stringify(map)}.filter(([d]) => lastHit(x, d)?.τ < 0.1).map(([, n]) => n)),`)

// the festival kit around the club kick: a clap layered on a snare on 2 and 4, off-beat open hats, sixteenth hats in a
// drop, a crash every 16 beats of a drop; a snare roll doubling (1, ½, ¼, ⅛) through every build-up
KITS.edm = o => {
  o.need('instruments', 'clapDrum', 'snareDrum', 'hatDrum', 'crashCymbal')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        if (t === 0) add('crash', 0.7, 0)
      } else if (e >= 3) {
        add('clap', 1, 1, 3)
        for (let i = 0; i < 4; i++) add('open', 0.8, i + 0.5)
        steps('hat', 0.5, 'x-o-x-o-x-o-x-o-'.replace(/-/g, 'o'))
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) add('clap', 0.7, 3.5, 3.75)
      } else if (e === 2) {
        add('clap', 0.9, 1, 3)
        for (let i = 0; i < 4; i++) add('open', 0.6, i + 0.5)
        steps('hat', 0.45, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('crash', 0.8, 0)
      } else if (r === 'intro' || r === 'outro') {
        if (t === 0) add('crash', 0.8, 0)
        if (t >= 8 || r === 'outro') for (let i = 0; i < 4; i++) add('open', 0.5, i + 0.5)
      } else if (r === 'bridge' && t === 0) add('crash', 0.9, 0)`)}
  return {
  color: '#ff6f91',
  ${stageGraph([['clap', 3.6, 0.7], ['snare', 3.2, 0.6], ['open', 2.4, 0.3]])}
  ${stageMidi([['snare', 38], ['clap', 39], ['hat', 42], ['open', 46], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.8\\,\\text{Clap} + 0.35\\,S + 0.12\\,H_{\\text{закр}} + 0.16\\,H_{\\text{откр}} + 0.3\\,\\text{Crash}\\big],\\quad S = 0.78e^{-kt}\\LP\\HP\\eta + e^{-2kt}(0.4\\sin\\varphi + 0.18\\sin 1.59\\varphi) + \\ldots', '\\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18 \\text{ доли; хлопок на 2 и 4, открытый хэт на слабые восьмые}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, clap = clapDrum({ center: 1300 }), body = snareDrum({ tone: 200, cutoff: 1500, decay: 16 }), snare = snareDrum({ tone: 210, cutoff: 1000, decay: 13 })
    const hat = hatDrum({ cutoff: 8000, decay: 75 }), open = hatDrum({ cutoff: 7500, decay: 11 }), crash = crashCymbal({ decay: 1.6 }), verb = reverb({ room: 0.78, damp: 0.4, wet: 0.24 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const c = at('clap', clap, x), b = at('clap', body, x)
      const y = 0.75 * c + 0.3 * b + 0.32 * at('snare', snare, x) + 0.09 * at('hat', hat, x) + 0.12 * at('open', open, x)
      const [l, r] = verb(...pan(2.5 * y, 0.05)), cr = 0.45 * at('crash', crash, x)
      return [l + cr, r + 0.9 * cr]
    }
  },
}})()`
}
// the disco kit: snare and clap on 2 and 4, sixteenth hats with the "and"s accented, the open hat's "tss" on every
// off-beat, a tambourine, tom fills; the kick is its own track (four on the floor)
KITS.disco = o => {
  o.need('instruments', 'clapDrum', 'snareDrum', 'hatDrum', 'crashCymbal', 'riqDrum', 'kickDrum')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
      } else if (e >= 1) {
        add('snare', 1, 1, 3)
        if (e >= 2) add('clap', 0.8, 1, 3)
        steps('hat', 0.55, e >= 2 ? 'xoxoxoxoxoxoxoxo' : 'x-x-x-x-x-x-x-x-')
        if (e >= 2) for (let i = 0; i < 4; i++) add('open', 0.75, i + 0.5)
        if (e >= 3) steps('tamb', 0.6, 'oxoxoxoxoxoxoxox')
        if (t === 0 && e >= 2) add('crash', 0.9, 0)
        if (fill && e >= 2) add('tom', 0.9, 3, 3.25), add('tomlo', 1, 3.5, 3.75)
      }
      if (r === 'outro' && t === 0) add('crash', 0.9, 0)`)}
  return {
  color: '#ff6f91',
  ${stageGraph([['snare', 3.5, 0.7], ['tom', 3.1, 0.6], ['open', 2.4, 0.3]])}
  ${stageMidi([['snare', 38], ['clap', 39], ['hat', 42], ['open', 46], ['tamb', 54], ['tom', 47], ['tomlo', 43], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.4S + 0.35\\,\\text{Clap} + 0.1H + 0.14H_{\\text{откр}} + 0.12\\,\\text{Tamb} + 0.35\\,\\text{Toms}\\big]', '\\text{хэт: } xoxo\\ldots \\text{ шестнадцатыми, «тсс» открытого хэта на слабые восьмые, бубен в припеве}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, snare = snareDrum({ tone: 190, cutoff: 900, decay: 15 }), clap = clapDrum({ center: 1600 })
    const hat = hatDrum({ cutoff: 8500, decay: 80 }), open = hatDrum({ cutoff: 7000, decay: 9 }), crash = crashCymbal({ decay: 1.4 }), tamb = riqDrum({ seed: 9 })
    const tom = kickDrum({ f0: 150, f1: 70, sweep: 14, decay: 7, drive: 1.2 }), tomlo = kickDrum({ f0: 105, f1: 60, sweep: 12, decay: 6, drive: 1.2 })
    const verb = reverb({ room: 0.7, damp: 0.5, wet: 0.2 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const y = 0.42 * at('snare', snare, x) + 0.3 * at('clap', clap, x) + 0.09 * at('hat', hat, x) + 0.13 * at('open', open, x)
        + 0.1 * at('tamb', (t, on) => tamb(t, 'jingle', on), x) + 0.32 * at('tom', tom, x, 1) + 0.34 * at('tomlo', tomlo, x, 1)
      const [l, r] = verb(...pan(2.2 * y, -0.05)), cr = 0.4 * at('crash', crash, x)
      return [l + cr, r + 0.85 * cr]
    }
  },
}})()`
}
// the factory kit: machines that keep time — a snare in a small metal room, ticking hats, clanks of struck steel on
// the off-steps (they shift with the pattern, like a press out of phase), a rim; by the variant: the town's steady
// groove, the caves' half time with dripping rims, the alarm's driving toms and sixteenth snares
KITS.factory = o => {
  o.need('instruments', 'snareDrum', 'clapDrum', 'hatDrum', 'crashCymbal', 'rimDrum', 'clankTone', 'kickDrum', 'shakerDrum')
  const v = o.variant ?? 'city'
  const groove = {
    city: `steps('snare', 1, '----x-------x---')
        steps('hat', 0.5, e >= 3 ? 'xoxxxoxxxoxxxoxx' : 'x-x-x-x-x-x-x-x-')
        steps('clank', 0.8, '---x-----x----x-')
        if (e >= 3) steps('clap', 0.7, '----x-------x---')
        steps('rim', 0.5, '--x-------x--x--')`,
    cave: `steps('snare', 1, '--------x-------')
        steps('shaker', 0.5, 'xoxoxoxoxoxoxoxo')
        steps('rim', 0.6, '------x-----x--x')
        steps('clank', 0.6, '-----x---------x')
        if (e >= 3) steps('hat', 0.45, 'x-x-x-x-x-x-x-x-')`,
    danger: `steps('snare', 1, '----x-------x---')
        steps('hat', 0.55, 'xxxxxxxxxxxxxxxx')
        steps('clank', 0.75, '--x---x---x---x-')
        if (e >= 3) (steps('tom', 0.8, 'x--x--x---x--x--'), steps('clap', 0.7, '----x-------x---'))
        if (e >= 3 && mod(t, 8) === 0) add('crash', 0.8, 0)`,
  }[v]
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        if (t === 0) add('crash', 0.7, 0)
      } else if (r === 'bridge') {
        if (t === 0) add('crash', 0.6, 0)
        steps('clank', 0.5, '---x-----x------')
      } else if (e >= 2) {
        ${groove}
        if (t === 0) add('crash', 0.85, 0)
        if (fill) add('snare', 0.7, 3.25, 3.5, 3.75)
      } else if (e === 1) {
        steps('hat', 0.4, '--x---x---x---x-')
        steps('clank', 0.5, '---x-------x----')
        if (t === 0 && r !== 'intro') add('crash', 0.6, 0)
      }`)}
  return {
  color: '#ff8c42',
  ${stageGraph([['snare', 3.5, 0.7], ['tom', 3.1, 0.6], ['clank', 2.5, 0.5]])}
  ${stageMidi([['snare', 38], ['clap', 39], ['hat', 42], ['rim', 37], ['shaker', 70], ['tom', 45], ['crash', 49], ['clank', 56]])}
  formula: ${JSON.stringify(['D = \\Rev_{\\text{цех}}\\big[0.4S + 0.3\\,\\text{Clap} + 0.1H + 0.25\\,\\text{Clank} + 0.2\\,\\text{Rim} + \\ldots\\big],\\quad \\text{Clank}(f,t) = \\sum_{k} A_k e^{-K_k t/0.35}\\big(\\sin 2\\pi R_k ft + \\sin 2\\pi\\,1.003R_k ft\\big)', 'R = (1, 2.76, 5.40, 8.93)\\ \\text{— моды стального бруска}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, snare = snareDrum({ tone: ${v === 'cave' ? 170 : 200}, cutoff: 1100, decay: ${v === 'cave' ? 10 : 14} }), clap = clapDrum({ center: 1400 }), rim = rimDrum(), shaker = shakerDrum()
    const hat = hatDrum({ cutoff: 8000, decay: 70 }), crash = crashCymbal({ decay: 1.5 }), tom = kickDrum({ f0: 95, f1: 80, sweep: 14, decay: 6, drive: 1.3 })
    const clanks = poly(clankTone, { release: 0.1, life: 1.5, max: 6 }), fire = trigger()
    const room = reverb({ room: ${v === 'cave' ? 0.93 : 0.72}, damp: ${v === 'cave' ? 0.3 : 0.5}, wet: ${v === 'cave' ? 0.4 : 0.22} })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const c = x < END ? lastHit(x, 'clank') : null
      if (c && fire(x - c.τ)) clanks.hit(${v === 'cave' ? 620 : 880} * (1 + 0.5 * floor(3 * hash(floor(4 * (x - c.τ)), 77))), c.vel, 0.2)
      const y = 0.42 * at('snare', snare, x) + 0.3 * at('clap', clap, x) + 0.09 * at('hat', hat, x) + 0.2 * at('rim', rim, x) + 0.1 * at('shaker', shaker, x)
        + 0.36 * at('tom', tom, x, 1) + 0.13 * clanks()
      const [l, r] = room(...pan(2.2 * y, 0.05)), cr = 0.36 * at('crash', crash, x)
      return [l + cr, r + 0.85 * cr]
    }
  },
}})()`
}
// the trailer's percussion: a taiko ensemble with big toms, a tight military snare, the "boom" (a sub sine diving
// 70 → 32 Hz with noise) on the downbeats of the action, a reversed cymbal swelling into every drop
KITS.epic = o => {
  o.need('instruments', 'taikoDrum', 'snareDrum', 'crashCymbal')
  o.need('engine', 'noise')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        for (let p = 0; p < 4; p += t < L / 2 ? 2 : 1) add('taiko', 0.6 + (0.4 * (t + p)) / L, p)
        if (x + 4 >= sectionEnd(x)) add('swell', 1, 0)
      } else if (e >= 3) {
        steps('taiko', 1, 'x--x--x---x--x--')
        steps('toms', 0.7, '--x---x-x---x-xx')
        steps('snare', 0.5, '----x-------x---')
        if (mod(t, 8) === 0) add('boom', 1, 0)
        if (mod(t, 16) === 0) add('crash', 1, 0)
        if (fill) steps('snare', 0.8, '--------x-xxxxxx')
      } else if (e === 2) {
        steps('taiko', 0.85, 'x-------x--x----')
        steps('toms', 0.5, '----x-------x-x-')
        if (t === 0) add('boom', 0.8, 0)
      } else if (r === 'intro' || r === 'bridge') {
        if (t === 0) add('boom', 0.7, 0)
        if (mod(t, 8) === 4) add('taiko', 0.5, 0)
      } else if (r === 'outro' && t === 0) (add('boom', 1, 0), add('crash', 0.8, 0))`)}
  return {
  color: '#e63946',
  ${stageGraph([['boom', 3.4, 1], ['taiko', 3, 0.8], ['snare', 2.6, 0.5]])}
  ${stageMidi([['taiko', 35], ['toms', 45], ['snare', 38], ['boom', 36], ['crash', 49]])}
  formula: ${JSON.stringify(['\\text{бум: } \\sin 2\\pi\\!\\int\\!(32 + 38e^{-t/0.15})\\,e^{-t/1.2} + \\LP_{200}\\eta\\,e^{-t/0.3};\\quad \\text{тайко: } \\tanh\\!\\big(1.4\\LP\\sum_k A_k e^{-2.6K_kt/d}\\sin R_k\\varphi + \\ldots\\big)', '\\text{тарелка задом наперёд: } e^{-(4 - \\tau)/0.6}\\,\\text{Crash} \\text{ перед каждым дропом}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, taiko = taikoDrum({ pitch: 70, decay: 1.1, crack: 0.3, boom: 0.45, seed: 1 }), toms = taikoDrum({ pitch: 135, decay: 0.45, crack: 0.45, seed: 2 })
    const snare = snareDrum({ tone: 240, cutoff: 1800, decay: 20 }), crash = crashCymbal({ decay: 2.4 }), swell = crashCymbal({ decay: 2, seed: 5 }), η = noise(91), lp = filter('lp')
    const verb = reverb({ room: 0.92, damp: 0.4, wet: 0.36 })
    const at = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => {
      const b = x < END ? lastHit(x, 'boom') : null, bt = b ? b.τ * sec : 9, n = lp(η(), 200)
      const boom = bt < 4 ? b.vel * (sin(TAU * (32 * bt + 38 * 0.15 * (1 - exp(-bt / 0.15)))) * exp(-bt / 1.2) + 0.8 * n * exp(-bt / 0.3)) : 0
      const sw = x < END ? lastHit(x, 'swell') : null, u = sw ? 4 - sw.τ : 9
      const rev = u > 0 && u < 4 ? exp((-u * sec) / 0.6) * swell(0.03, true) : (swell(1, false), 0)
      const y = 0.5 * at('taiko', taiko, x) + 0.3 * at('toms', toms, x) + 0.2 * at('snare', snare, x)
      const [l, r] = verb(...pan(0.8 * y, 0)), c = 0.2 * at('crash', crash, x) + 0.3 * rev
      return [l + 0.55 * boom + c, r + 0.55 * boom + 0.9 * c]
    }
  },
}})()`
}

// fx of the festival: a riser through every build-up (a noise band climbing 400 → 14 000 Hz and a saw siren a fifth up),
// the "downlifter" and an impact (a sub diving 90 → 30 Hz) on the first beat of every drop
TEXTURES.sweeps = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#c9b8ff',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    return r === 'build' ? -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.5 : null
  },
  formula: ${JSON.stringify(['F = \\Rev\\Big[0.5a^2\\,\\BP_{400\\cdot 2^{5.1a}}\\eta + 0.06a\\,\\LP\\saw\\big(f_1 2^{12a/12}\\big) + 0.45e^{-1.2t}\\BP_{9000\\cdot 2^{-4t}}\\eta + 0.6e^{-t/0.5}\\sin 2\\pi\\!\\int\\!(30 + 60e^{-t/0.08})\\Big],\\quad a = t/L'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(23), bp = filter('bp'), bp2 = filter('bp'), saw = osc('saw'), lp = filter('lp'), verb = reverb({ room: 0.88, wet: 0.45 })
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, a = r === 'build' ? t / (sectionEnd(x) - s) : 0, n = η()
      let y = 0.5 * a * a * bp(n, 400 * 2 ** (5.1 * a), 1.4) + 0.06 * a * lp(saw(hz(KICK_N + 31 + 12 * a - 60, C4)), 2500)
      const d = e >= 3 && t < 4 ? t * sec : 9
      y += 0.45 * exp(-1.2 * d) * bp2(n, 9000 * 2 ** (-4 * d), 1)
      const imp = d < 3 ? 0.6 * exp(-d / 0.5) * sin(TAU * (30 * d + 60 * 0.08 * (1 - exp(-d / 0.08)))) : 0
      const [l, rr] = verb(y, y)
      return [l + imp, rr + imp]
    }
  },
}`
}
// the factory's air: the hum of the machines on the tonic (and its octave and twelfth), a piston's hiss every two beats,
// steam now and then
TEXTURES.machines = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#8d99ae',
  graph: x => (x < END ? -2.95 + 0.04 * sin(TAU * x / 2) : null),
  formula: ${JSON.stringify(['\\text{цех: } 0.05\\big(\\sin 2\\pi f_0 T + 0.4\\sin 4\\pi f_0 T + 0.2\\sin 6\\pi f_0T\\big) + 0.12e^{-\\tau/0.08}\\BP_{2500}\\eta\\ \\text{(поршень каждые 2 доли)} + \\text{пар}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(61), o1 = osc('sine'), o2 = osc('sine'), o3 = osc('sine'), bp = filter('bp'), hp = filter('hp'), level = smooth(600), verb = reverb({ room: 0.8, damp: 0.5, wet: 0.3 })
    return x => {
      const n = η(), a = level(x < END ? 1 : 0), f0 = hz(KICK_N + 12 + trAt(x) - 60, C4), τ = mod(x, 2) * sec
      const hum = 0.05 * (o1(f0) + 0.4 * o2(2 * f0) + 0.2 * o3(3 * f0)) * (0.8 + 0.2 * sin(TAU * x / 16))
      const j = floor(x / 8), st = (x - 8 * j - 5 * hash(j, 3)) * sec, steam = st > 0 && st < 2.5 ? 0.06 * Math.min(1, st / 0.2) * exp(-st / 0.8) * hp(n, 3000) : (hp(n, 3000), 0)
      const y = 1.4 * a * (hum + 0.12 * exp(-τ / 0.08) * bp(n, 2500, 2) + steam)
      return verb(...pan(y, -0.1))
    }
  },
}`
}
// the cave's air: water dripping into pools (sine drops sliding up, each in its own place, long echoes), wind in the
// tunnels, a deep rumble
TEXTURES.drips = o => {
  o.need('engine', 'noise')
  return `{
  color: '#6c8ebf',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 8) : null),
  formula: ${JSON.stringify(['\\text{капли: } e^{-t/0.05}\\sin 2\\pi f_i(1 + 3t)t,\\ f_i \\in [900, 2600],\\ \\text{моменты — из хеша};\\quad \\text{ветер: } \\BP_{300\\cdot 2^{\\sin(2\\pi T/13)}}\\eta;\\quad \\text{гул: } \\LP_{60}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(71), wind = filter('bp'), wind2 = filter('bp'), rumble = filter('lp'), echo = delay({ time: sec * 1.5, feedback: 0.45, wet: 0.45 }), verb = reverb({ room: 0.95, damp: 0.25, wet: 0.6 })
    return x => {
      const n = η(), T = x * sec, a = x < END ? 1 : 0
      let drop = 0, dp = 0
      for (const k of [0, 1]) {
        const j = floor(x / 1.5) - k, at = 1.5 * j + 1.5 * hash(j, 5), t = (x - at) * sec
        if (hash(j, 7) < 0.55 && t >= 0 && t < 0.4) { const f = 900 + 1700 * hash(j, 9); drop += exp(-t / 0.05) * sin(TAU * f * (1 + 3 * t) * t) * Math.min(1, t / 0.001); dp = 2 * hash(j, 11) - 1 }
      }
      const w = 0.05 * wind(n, 300 * 2 ** sin((TAU * T) / 13), 4) + 0.04 * wind2(n, 520 * 2 ** sin((TAU * T) / 17 + 1), 5)
      const [l, r] = echo(...pan(0.07 * a * drop, dp))
      const y = 1.4 * a * (w + 0.25 * rumble(n, 60))
      return verb(l + y, r + y)
    }
  },
}`
}
// danger: an air-raid siren far away in every drop (two tones a minor third apart, sliding), a riser in the
// build-ups, distant explosions now and then
TEXTURES.alarm = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#e63946',
  graph: x => {
    if (x >= END) return null
    const [s, r, e] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.2
    return e >= 3 ? -2.9 + 0.15 * sin(TAU * x / 4) : null
  },
  formula: ${JSON.stringify(['\\text{сирена: } \\LP_{1800}\\saw\\big(f_1\\,2^{(3 + 3\\sin(2\\pi x/8))/12}\\big);\\quad \\text{подъём: } a^2\\BP_{300\\cdot 2^{5a}}\\eta;\\quad \\text{взрывы: } e^{-t/0.6}\\LP_{150 + 600e^{-t/0.1}}\\eta'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(83), saw = osc('saw'), lp = filter('lp'), bp = filter('bp'), boom = filter('lp'), level = smooth(400), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.55 })
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), a = r === 'build' ? t / (sectionEnd(x) - s) : 0
      const siren = level(e >= 3 ? 1 : 0) * 0.035 * lp(saw(hz(KICK_N + 36 + trAt(x) + 1.5 + 1.5 * sin((TAU * x) / 8) - 60, C4)), 1800)
      const j = floor(x / 16), bt = (x - 16 * j - 12 * hash(j, 13)) * sec
      const ex = e >= 2 && bt > 0 && bt < 3 ? 0.35 * exp(-bt / 0.6) * boom(n, 150 + 600 * exp(-bt / 0.1)) : (boom(n, 150), 0)
      const y = 1.4 * (siren + 0.4 * a * a * bp(n, 300 * 2 ** (5 * a), 1.5) + ex)
      return verb(y, y)
    }
  },
}`
}
// the trailer's braams: the whole low brass and synths on the root, fifth and octave, a low-pass tearing open and
// closing — on the first beat of every drop and every eighth bar in it; between, a dark wind
TEXTURES.braam = o => {
  o.need('instruments', 'brass')
  o.need('engine', 'osc', 'noise', 'tanh')
  return `{
  color: '#9d0208',
  graph: x => {
    if (x >= END) return null
    const [s, r, e] = sectionOf(x), t = x - s
    return e >= 3 && mod(t, 32) < 3 ? -2.6 + 0.8 * exp(-mod(t, 32)) : null
  },
  formula: ${JSON.stringify(['\\text{брааам: } \\tanh\\!\\Big(2\\,\\LP_{80 + 2500e^{-t/0.6}(1 - e^{-t/0.04})}\\big(\\text{Br}(f, \\tfrac32f, 2f) + \\saw f + \\saw 1.007f\\big)\\Big)e^{-t/2.2},\\quad f \\text{ — корень аккорда во 2-й октаве}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, b = brass({ voices: 3, bright: 1.8, gain: 0.6 }), s1 = osc('saw'), s2 = osc('saw', 0.4), lp = filter('lp'), lp2 = filter('lp'), η = noise(97), wind = filter('bp'), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    let f = 55
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, c = chordAt(x)
      const on = e >= 3 && mod(t, 32) < 4, τ = mod(t, 32) * sec
      if (c && on && mod(t, 32) < 0.05) f = hz(36 + mod(c[2] - 36, 12) - 60, C4)
      const [bl, br] = b(on ? [f, 1.5 * f, 2 * f] : [], 1)
      const fc = 80 + 2500 * exp(-τ / 0.6) * (1 - exp(-τ / 0.04)), env = on ? exp(-τ / 2.2) : 0
      const sy = env * lp(s1(f) + s2(f * 1.007), fc), w = (r === 'intro' || r === 'bridge' ? 0.04 : 0.01) * wind(η(), 250 * 2 ** sin(TAU * x / 32), 3)
      const y = 0.4 * tanh(2 * lp2(sy, fc * 1.5))
      return verb(y + env * bl + w, y + env * br + w)
    }
  },
}`
}

// (an imported binding is read-only: the other parts set these through here)
export const setNOTE_HITS = v => (NOTE_HITS = v)
export const setKIT_MAP = v => (KIT_MAP = v)

export { KIT_MAP, NOTE_HITS, ROLL, clubKickTrack, stageData, stageGraph, stageHits, stageMidi }
