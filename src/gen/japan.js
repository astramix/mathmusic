// Recipes of the Japanese battle: shinobue, shakuhachi, koto, shamisen, taiko — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, TEXTURES, bassData, compHit, graphLead, pumpIf } from './recipes.js'

// shinobue an octave above the theme; shakuhachi as written (meri attacks, yuri on the long notes)
LEADS.shinobue = o => {
  o.need('instruments', 'shinobue')
  return `{
  color: '#ff5a5f',
  ${graphLead(o.at, o.lane).replace('[60 + m.n]', '[72 + m.n]')}
  formula: ${JSON.stringify(['Sb = a\\Big(0.55\\sin 2\\pi\\!\\!\\int\\! g + 0.28\\sin 4\\pi\\!\\!\\int\\! g + 0.15\\sin 6\\pi\\!\\!\\int\\! g + 0.05\\sin 8\\pi\\!\\!\\int\\! g + 0.05\\BP_{2g}\\eta + 0.4e^{-t/30\\text{мс}}\\HP_{4000}\\eta\\Big)', 'g = 2f\\cdot 2^{0.15\\,s(t)\\sin(2\\pi\\cdot 5.8T)/12}\\ \\text{— синобуэ, октавой выше темы}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, fl = shinobue(), echo = delay({ time: sec * 0.75, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(0.9 * o.gain)} * fl(hz(n + 12, C4), !!m && m.u < 0.93)${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
LEADS.shakuhachi = o => {
  o.need('instruments', 'shakuhachi')
  return `{
  color: '#c8e6a0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Sh = a\\Big(\\tanh\\big(1.2(0.62\\sin 2\\pi\\!\\!\\int\\! g + 0.15\\sin 4\\pi\\!\\!\\int\\! g + 0.06\\sin 6\\pi\\!\\!\\int\\! g)\\big) + 0.16\\big(\\BP_{g}\\eta + \\tfrac12\\BP_{2g}\\eta\\big) + \\text{мураики}\\Big)', 'g = f\\cdot 2^{\\big(-0.7(1 - s(t/0.14)) + 0.3\\,s(\\frac{t - 0.35}{0.55})\\sin(2\\pi\\cdot4.6T)\\big)/12}\\quad\\text{— мэри снизу, юри на долгих нотах}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, sh = shakuhachi(), echo = delay({ time: sec * 1.5, feedback: 0.25, wet: 0.18 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.42 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(1.0 * o.gain)} * sh(hz(n, C4), !!m && m.u < 0.95, { accent: m && m.d * sec > 0.8 ? 0.6 : 0.1 })${pumpIf(o)}
      return verb(...echo(...pan(y, ${o.pan})))
    }
  },
}`
}
// koto: a pluck per note, oshide (pressed up to the next note of the key and let go) on some long notes
LEADS.koto = o => {
  o.need('instruments', 'koto')
  return `{
  color: '#8ecae6',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y[k] = e[k] + g\\big(a\\,y[k - D] + (1 - a)\\,y[k - D - 1]\\big),\\ D = \\tfrac{44100}{f(t)} - \\delta,\\quad f(t) = f_0\\,2^{\\,b\\,(s(\\frac{t - 0.25}{0.1}) - s(\\frac{t - t_r}{0.1}))/12}\\ \\text{(осидэ)}', 'Ko = 0.75\\,\\LP_{6500}y + 0.7\\BP_{210}y + 0.4\\BP_{650}y + 0.35\\HP_{2500}(\\text{цумэ})'])},
  audio({ bpm }) {
    const sec = 60 / bpm, k = koto(), fire = trigger(), verb = reverb({ room: 0.86, damp: 0.35, wet: 0.34 })
    const upStep = n => { for (let s = 1; s < 3; s++) if (SCALE.includes(mod(n + s + 60, 12))) return s; return 0 }
    return x => {
      const m = ${o.at}(x)
      if (m && fire(m.at)) {
        const press = m.d * sec > 0.7 && SCALE.includes(mod(m.n + 60, 12)) && hash(floor(m.at * 2), 5) < 0.45 ? upStep(m.n) : 0
        k.hit(hz(m.n, C4), 0.8, { bend: press, bendAt: 0.25, bendTime: 0.1, back: press ? 0.25 + 0.6 * m.d * sec : 0 })
      }
      return verb(...pan(${round(4 * o.gain)} * k()${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
// shamisen: a pluck per note, sixteenth tremolo on notes of a beat or longer
LEADS.shamisen = o => {
  o.need('instruments', 'shamisen')
  return `{
  color: '#ffd166',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['y[k] = e[k] + g\\big(a\\,y[k - D] + \\ldots\\big),\\quad D = \\tfrac{44100}{f}\\big(1 - 0.012\\max(0, y[k-1])\\big)\\ \\text{— савари}', 'Sm = 0.45\\HP y + 1.1\\BP_{450}y + 0.75\\BP_{1800}y + 0.35\\BP_{3200}y + 0.5\\BP_{1700}(\\text{бати}),\\quad \\text{тремоло шестнадцатыми на долгих нотах}'])},
  audio() {
    const s = shamisen(), fire = trigger(), verb = reverb({ room: 0.8, damp: 0.45, wet: 0.24 })
    return x => {
      const m = ${o.at}(x)
      if (m && fire(m.d >= 1 ? m.at + floor(4 * m.τ) / 4 : m.at)) s.hit(hz(m.n, C4), m.τ < 0.25 ? 0.9 : 0.55)
      return verb(...pan(${round(2.4 * o.gain)} * s()${pumpIf(o)}, ${o.pan}))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { shinobue: 'shakuhachi', shakuhachi: 'koto', koto: 'shakuhachi', shamisen: 'koto' })
// horn stabs: the voicing on a brass section, cut short (0.4 beat), ducked in the drops
CHORDS.hornstabs = o => {
  o.need('instruments', 'brass')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#f4a261',
  graph: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.45 ? c[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < 0.4 ? c[3] : [] },
  formula: ${JSON.stringify(['Br = \\sum_{j}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)e(t),\\quad f_c = 250 + 4600\\,e(t)^{1.6},\\quad g_j = f_j\\,2^{-0.5e^{-t/25\\text{мс}}/12}'])},
  audio() {
    const b = brass({ voices: 4, bright: 1.1, gain: 0.6 }), verb = reverb({ room: 0.88, wet: 0.38 })
    return x => {
      const h = compAt(x), c = chordAt(x), on = h && c && x - h.at < Math.min(0.42, h.d)
      const [l, r] = b(on ? c[3].map(n => hz(n - 60, C4)) : [], h ? h.vel : 0.5), g = 1${pumpIf(o)}
      return verb(g * l, g * r)
    }
  },
}})()`
}
// timpani as the bass: the style's line on the root and fifth; softer in the drops, where the reverse bass rules
BASSES.timpani = o => {
  o.need('instruments', 'timpaniTone')
  return `(() => {
  ${bassData(o.line)}
  return {
  color: '#9c6644',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 28) / 24 : null),
  midi: x => (bassAt(x) && x - bassAt(x).at < 0.25 ? [bassAt(x).n + (bassAt(x).n < 38 ? 12 : 0)] : []),
  formula: ${JSON.stringify(['Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\\big),\\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65)\\ \\text{— литавры вместо баса}'])},
  audio() {
    const p = poly(timpaniTone, { release: 0.6, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.86, damp: 0.4, wet: 0.3 })
    return x => {
      const m = bassAt(x)
      if (m && fire(m.at)) p.hit(hz(m.n + (m.n < 38 ? 12 : 0) - 60, C4), (energy(x) >= 3 ? 0.55 : 0.85) + 0.1 * hash(floor(2 * x), 4))
      return verb(...pan(0.6 * p(), -0.1))
    }
  },
}})()`
}
// the koto's arpeggio: the voicing an octave up in sixteenths in the drops, eighths in the themes, quarters when calm
ARPS.kotoarp = o => {
  o.need('instruments', 'koto')
  return `(() => {
  const arpAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1 || role(x) === 'build') return null
    const step = e >= 3 ? 0.25 : e === 2 ? 0.5 : 1, j = floor(x / step), v = c[3], cyc = [0, 1, 2, 3, 2, 1]
    return { n: v[cyc[j % 6] % v.length] + 12, at: j * step, vel: e >= 3 ? 0.45 + 0.15 * (j % 4 === 0) : 0.5 }
  }
  return {
  color: '#8ecae6',
  graph: x => (arpAt(x) && x - arpAt(x).at < 0.25 ? ${o.lane[0]} + (arpAt(x).n - 55) / 40 : null),
  midi: x => (arpAt(x) && x - arpAt(x).at < 0.2 ? [arpAt(x).n] : []),
  formula: ${JSON.stringify(['\\text{кото: } n_j = v_{(0,1,2,3,2,1)_{j \\bmod 6}} + 12,\\quad j = \\lfloor x/s\\rfloor,\\ s = \\tfrac14 \\text{ (дроп)},\\ \\tfrac12,\\ 1'])},
  audio() {
    const k = koto({ sustain: 2.4, seed: 29 }), fire = trigger(), verb = reverb({ room: 0.86, wet: 0.34 })
    return x => {
      const m = arpAt(x)
      if (m && fire(m.at)) k.hit(hz(m.n - 60, C4), m.vel)
      return verb(...pan(2.8 * k()${pumpIf(o)}, -0.35))
    }
  },
}})()`
}
// the taiko ensemble: odaiko, nagado, shime-daiko, rims and the atarigane; patterns by role and energy, a roll
// doubling 1 → ½ → ¼ → ⅛ through every build-up
KITS.taiko = o => {
  o.need('instruments', 'taikoDrum', 'woodClack', 'kaneDrum')
  return `(() => {
  const barCache = new Map()
  const PAT = {
    3: { don: 'x---------------', naga: '----x-------x---', shime: 'xoxoxoxoxoxoxoxo', ka: '--x---x---x---x-' },
    2: { don: 'x-----x---x-----', naga: '----x-------x---', shime: 'x-oox-oox-oox-oo', ka: '--x---x---x---x-', kane: 'x---x---x---x---' },
    1: { don: 'x-------x-------', shime: 'x---x---x---x---' },
  }
  function barHits(b) {
    if (barCache.has(b)) return barCache.get(b)
    const x = 4 * b, hits = []
    const add = (drum, vel, ...ps) => ps.forEach(p => hits.push([p, drum, vel * (0.85 + 0.15 * hash(b * 13 + p * 5, drum.length))]))
    if (x < END) {
      const [s, r, e] = sectionOf(x), t = x - s, L = sectionEnd(x) - s
      if (r === 'build') {
        const step = t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : t < 0.875 * L ? 0.25 : 0.125
        for (let p = 0; p < 4; p += step) add('naga', 0.35 + (0.55 * (t + p)) / L, p)
        if (t === 0) add('don', 1, 0)
      } else if (r === 'intro') {
        if (t === 0) add('don', 1, 0), add('kane', 1, 0)
        if (t + 4 >= L) for (let i = 0; i < 8; i++) add('naga', 0.4 + 0.07 * i, 2 + i / 4)
      } else if (r === 'outro') {
        if (t === 0) add('don', 1, 0, 1.5, 3), add('naga', 1, 0, 1.5, 3), add('kane', 1, 0)
      } else if (e >= 1) {
        const pat = { ...PAT[Math.min(3, e)] }
        if (e >= 3 && mod(t, 16) === 0) pat.don = 'x-------x-------'
        if (b % 8 === 7 || x + 4 >= sectionEnd(x)) pat.naga = '----x---x-x-xxxx'
        for (const [drum, steps] of Object.entries(pat)) for (let i = 0; i < 16; i++) if (steps[i] === 'x' || steps[i] === 'o') add(drum, steps[i] === 'x' ? 1 : 0.45, i / 4)
      }
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
  color: '#e63946',
  graph: x => {
    if (x >= END) return null
    const d = lastHit(x, 'don'), n = lastHit(x, 'naga'), s = lastHit(x, 'shime')
    if (d && d.τ < 0.6) return 3.1 + 1.3 * d.vel * exp(-4 * d.τ)
    if (n && n.τ < 0.3) return 2.8 + 0.9 * n.vel * exp(-8 * n.τ)
    return s && s.τ < 0.12 ? 2.3 + 0.5 * s.vel : null
  },
  midi: x => (x >= END ? [] : [['don', 35], ['naga', 45], ['shime', 38], ['ka', 37], ['kane', 80]].filter(([d]) => lastHit(x, d)?.τ < 0.1).map(([, n]) => n)),
  formula: ${JSON.stringify(['T = \\tanh\\!\\Big(1.4\\,\\LP_{3000}\\Big[\\sum_{k=1}^{5}A_k e^{-2.6K_k t/d}\\sin\\big(R_k\\,2\\pi f\\,(t + \\gamma\\tau(1 - e^{-t/\\tau}))\\big) + c\\,e^{-t/4\\text{мс}}\\HP\\eta + b\\,e^{-t/0.35d}\\BP_f\\eta\\Big]\\Big)', 'R = (1, 1.52, 1.98, 2.46, 2.92),\\quad f:\\ \\text{одайко } 62,\\ \\text{нагадо } 120,\\ \\text{симэ } 420\\ \\text{Гц};\\quad \\text{дробь в разгоне: } 1, \\tfrac12, \\tfrac14, \\tfrac18'])},
  audio({ bpm }) {
    const sec = 60 / bpm, don = taikoDrum({ pitch: 62, decay: 1.3, crack: 0.25, boom: 0.4, seed: 1 }), naga = taikoDrum({ pitch: 120, decay: 0.55, crack: 0.4, seed: 2 })
    const shime = taikoDrum({ pitch: 420, decay: 0.12, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), ka = woodClack({ f: 1900 }), kane = kaneDrum({ f: 1250, decay: 0.5 })
    const verb = reverb({ room: 0.86, damp: 0.45, wet: 0.3 })
    const hit = (d, f, x) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * sec, true) : f(1, false) }
    return x => verb(...pan(0.5 * hit('don', don, x) + 0.28 * hit('naga', naga, x) + 0.15 * hit('shime', shime, x) + 0.08 * hit('ka', ka, x) + 0.12 * hit('kane', kane, x)))
  },
}})()`
}
// fx: the temple bell and thunder at the start, wind in the calm, the riser of every build, a sweep into each drop
TEXTURES.thunder = o => {
  o.need('engine', 'noise')
  o.need('instruments', 'templeBellTone')
  return `{
  color: '#6c757d',
  graph: x => {
    if (x >= END) return null
    const [s, r] = sectionOf(x), t = x - s
    if (r === 'build') return -2 + (t / (sectionEnd(x) - s)) ** 2 * 3.2
    return r === 'intro' && t < 4 ? -2.9 + 0.2 * sin(9 * x) : null
  },
  formula: ${JSON.stringify(['\\text{гром: } \\LP_{120 + 900e^{-t}}\\eta\\,e^{-t/2};\\ \\text{бонсё: } \\tfrac12, 1, 1.2, 1.5, 2\\ldots f;\\ \\text{подъём: } 0.5u^2\\BP_{300\\cdot 2^{5.3u}}\\eta;\\ \\text{спуск в дроп}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(23), lp = filter('lp'), bp = filter('bp'), bp2 = filter('bp'), wind = filter('bp'), verb = reverb({ room: 0.92, wet: 0.5 })
    const bellF = hz(TONIC1 + 12 - 60, C4)
    return x => {
      const [s, r, e] = x < END ? sectionOf(x) : [END, 'end', -1], t = x - s, n = η(), T = x * sec, a = r === 'build' ? t / (sectionEnd(x) - s) : 0
      const th = r === 'intro' ? t * sec : 9
      let y = th < 6 ? 0.45 * exp(-th / 2) * (1 + 3 * exp(-th / 0.05)) * lp(n, 120 + 900 * exp(-th)) : lp(0, 200)
      y += 0.5 * a * a * bp(n, 300 * 2 ** (5.3 * a), 1.5)
      const down = e >= 3 && t < 3 ? t * sec : 9
      y += 0.4 * exp(-1.5 * down) * bp2(n, 8000 * 2 ** (-4 * down), 1)
      y += (r === 'bridge' ? 0.07 : 0) * wind(n, 400 * 2 ** (1.5 * sin((TAU * T) / 9)), 3)
      if (r === 'intro' || r === 'outro') y += 0.4 * templeBellTone(bellF, t * sec, 0.9)
      return verb(2 * y, 2 * y)
    }
  },
}`
}
