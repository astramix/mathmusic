// Recipes of Magma Depths — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, TEXTURES, graphLead, pumpIf } from './recipes.js'
import { stageGraph, stageHits, stageMidi } from './stage.js'

// ---- Magma Depths: the style of the user's own set «Magma depths» (2021, 139 BPM, D minor), read from its Ableton file --------
// the organ and the piano together in open fifths, low (the user's A1 A2 E3 | B♭1 B♭2 F3): the chord's bass, its octave and
// its fifth above — a church organ held, a grand piano struck at each chord, both in a stone hall
CHORDS.fifthorgan = o => {
  o.need('instruments', 'organ', 'pianoTone')
  return `{
  color: '#c9783a',
  graph: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 ? [c[2], c[2] + 12, c[2] + 19].map(n => ${o.lane[0]} + (n - 28) / 22) : null },
  midi: x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05 ? [...new Set([c[2], c[2] + 12, c[2] + 19, ...c[3]])].sort((a, b) => a - b) : [] },
  formula: ${JSON.stringify(['Of = \\Rev\\Big[\\sum_{j}\\sum_{s} a_s\\sin 2\\pi\\,s f_j t + 0.5\\,P(f_j, t)\\Big],\\quad f \\in \\{f_B,\\ 2f_B,\\ 3f_B\\}\\ \\text{— орган и рояль пустыми квинтами: бас, октава, квинта над ней; тихо на втором мануале — сам аккорд}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, org = organ({ voices: 3, gain: 0.13, stops: [[1, 1], [2, 0.55], [3, 0.2], [4, 0.22]] }), upper = organ({ voices: 4, gain: 0.045, stops: [[1, 1], [2, 0.35]], seed: 47 }), piano = poly(pianoTone, { release: 0.6, life: 6, max: 12 }), fire = trigger()
    const level = smooth(250), verb = reverb({ room: 0.93, damp: 0.35, wet: 0.45 })
    return x => {
      const c = chordAt(x), e = energy(x), on = c && e >= 0 && x < END - 1 && x - c[0] < c[1] - 0.05
      const fs = on ? [c[2], c[2] + 12, c[2] + 19].map(n => hz(n - 60, C4)) : []
      if (on && fire(c[0])) fs.forEach((f, i) => piano.hit(f, 0.55 + 0.1 * e, c[1] * sec, i * 0.008))
      const a = level(on ? [0.55, 0.7, 0.85, 1][e] : 0), [l, r] = org(fs), [ul, ur] = upper(on ? c[3].map(n => hz(n - 60, C4)) : []), p = 0.32 * piano()
      const k = ${round(1.2 * (o.gain ?? 1))}
      return verb(k * (a * (l + ul) + p), k * (a * (r + ur) + p))
    }
  },
}`
}
// the string section on the theme: the line and its lower octave, bowed (the user's DSK Strings play the theme in octaves)
LEADS.stringsection = o => {
  o.need('instruments', 'strings')
  return `{
  color: '#e8b08a',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['S = \\Rev\\sum_{f\\in\\{f,\\,f/2\\}}\\sum_{u=-1}^{1}\\LP\\,\\saw\\!\\big(f\\,2^{(0.09u + 0.12\\sin 2\\pi r_u T)/12}\\big)\\quad\\text{— струнные в октаву, смычком}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, s = strings({ voices: 2, attack: 90, release: 380, cutoff: 3600, gain: 0.1 }), echo = delay({ time: sec * 1.5, feedback: 0.25, wet: 0.12 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.42 })
    return x => {
      const m = ${o.at}(x), on = m && m.u < 0.95, f = on ? hz(m.n, C4) : 0
      const [l, r] = s(on ? [f, f / 2] : [])
      const k = ${round(2.2 * o.gain)}${pumpIf(o)}
      return verb(...echo(k * l, k * r))
    }
  },
}`
}
// the choir on the theme: the angel choir of «Райский сад» singing in octaves (the user's ChoirZ: D3 D4 D5), «а» opening to «о»
LEADS.depthchoir = o => {
  o.need('instruments', 'angelChoir', 'DREAM_VOWELS', 'blend')
  return `{
  color: '#e6c3ff',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.95 ? [60 + m.n] : [] },
  formula: ${JSON.stringify(['Ch = \\Rev\\sum_{j=1}^{4}\\sum_{\\pm}\\sum_{i=1}^{3}\\tfrac{G_i}{Q_i}\\BP_{F_i}\\saw\\big(f_j(1 \\pm 0.0035)\\big),\\quad f_j \\in \\{f, f, \\tfrac f2, \\tfrac f2\\},\\ F: \\text{«а»} \\to \\text{«о»}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, c = angelChoir({ voices: 4, attack: 70, release: 380, breath: 0.03, seed: 21 }), verb = reverb({ room: 0.94, damp: 0.3, wet: 0.5 })
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const on = m && m.u < 0.95, f = hz(n, C4), F = blend(DREAM_VOWELS.a, DREAM_VOWELS.o, 0.5 + 0.5 * sin((TAU * x) / 8))
      const [l, r] = c(on ? [f, f * 1.001, f / 2, (f / 2) * 0.999] : [], F)
      const k = ${round(1.6 * o.gain)}${pumpIf(o)}
      return verb(k * l, k * r)
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { stringsection: 'depthchoir', depthchoir: 'stringsection' })
// the low strings: the chord's bass and its octave below, held with the bow from chord to chord (the user's strings: D2 D3, C♯2 C♯3…)
BASSES.bowedoctaves = o => {
  o.need('instruments', 'strings')
  return `(() => {
  const lowAt = x => { const c = chordAt(x); return c && energy(x) >= 0 && x < END - 1 ? { n: c[2], at: c[0], d: c[1] } : null }
  return {
  color: '#b0703a',
  graph: x => (lowAt(x) ? ${o.lane[0]} + (lowAt(x).n - 28) / 24 : null),
  midi: x => { const m = lowAt(x); return m && x - m.at < m.d - 0.1 ? [m.n, m.n - 12] : [] },
  formula: ${JSON.stringify(['B = \\Rev\\,S(f_B,\\ f_B/2)\\quad\\text{— виолончели и контрабасы в октаву, долгим смычком}'])},
  audio() {
    const s = strings({ voices: 2, attack: 160, release: 500, cutoff: 1500, gain: 0.16 }), level = smooth(300), verb = reverb({ room: 0.88, damp: 0.45, wet: 0.25 })
    return x => {
      const m = lowAt(x), on = m && x - m.at < m.d - 0.05, a = level(on ? [0.6, 0.75, 0.9, 1][energy(x)] : 0)
      const [l, r] = s(on ? [hz(m.n - 60, C4), hz(m.n - 72, C4)] : [])
      const k = ${round(1.3 * (o.gain ?? 1))} * a
      return verb(k * l, k * r)
    }
  },
}})()`
}
// the user's eighth-note figure (their World StringZ and choir in bar 81: D5 A4 D4 F4 D5 F5 E5 D5 | F5 A4 D4 C5 D5 F5 E5 A4) as scale degrees
// above the chord's root — 8 5 1 3 8 10 9 8 | 10 5 1 7 8 10 9 5 — plucked on exactly tuned strings, left and right
ARPS.magmaarp = o => {
  o.need('instruments', 'plucker')
  return `(() => {
  const FIG = [7, 4, 0, 2, 7, 9, 8, 7, 9, 4, 0, 6, 7, 9, 8, 4]
  // the scale's degrees in semitones above the tonic, rising; the chord's root as a degree (the nearest); a figure degree k above it
  const R = SCALE.map(s => mod(s - SCALE[0], 12)), L = R.length
  const degOf = n => { const p = mod(n - SCALE[0], 12); let best = 0; R.forEach((s, i) => { if (Math.abs(mod(p - s + 6, 12) - 6) < Math.abs(mod(p - R[best] + 6, 12) - 6)) best = i }); return best }
  const above = (d0, k) => R[mod(d0 + k, L)] + 12 * Math.floor((d0 + k) / L) - R[d0]
  const arpAt = x => {
    const c = chordAt(x), e = energy(x), r = role(x)
    if (!c || e < 1 || x >= END - 1 || r === 'build' || r === 'outro') return null
    const j = floor(2 * x + 1e-9)
    return { n: c[2] + 24 + above(degOf(c[2]), FIG[mod(j, 16)]), at: j / 2, vel: mod(j, 4) === 0 ? 0.8 : 0.55, side: mod(j, 2) ? 0.4 : -0.4 }
  }
  return {
  color: '#ffb36b',
  graph: x => { const m = arpAt(x); return m && x - m.at < 0.2 ? ${o.lane[0]} + (m.n - 60) / 30 : null },
  midi: x => { const m = arpAt(x); return m && x - m.at < 0.45 ? [m.n] : [] },
  formula: ${JSON.stringify(['y[n] = e[n] + 0.997\\big(0.55\\,y[n - N] + 0.45\\,y[n - N + 1]\\big),\\quad \\text{ступени над корнем аккорда: } 8\\,5\\,1\\,3\\,8\\,10\\,9\\,8\\ |\\ 10\\,5\\,1\\,7\\,8\\,10\\,9\\,5 \\text{ восьмыми}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, pl = plucker({ life: 3, decay: 0.997 }), pr = plucker({ life: 3, decay: 0.997 }), fire = trigger(), lp = filter('lp'), lp2 = filter('lp')
    const echo = delay({ time: sec * 0.75, feedback: 0.28, wet: 0.18 }), verb = reverb({ room: 0.9, damp: 0.3, wet: 0.38 })
    return x => {
      const m = arpAt(x)
      if (m && fire(m.at)) (m.side < 0 ? pl : pr).hit(hz(m.n - 60, C4), m.vel * (0.8 + 0.2 * energy(x) / 3), { bright: 0.65 })
      const g = ${round(0.3 * (o.gain ?? 1))}
      return verb(...echo(g * lp(pl(), 6000), g * lp2(pr(), 6000)))
    }
  },
}})()`
}
// the user's own drum kit, as it plays in «Magma depths»: a soft felt kick and a second one, four 16-inch toms (two tuned down 3
// and 4½ semitones, one from a brighter room), a ride, and the kit's synth hit (pad 44, and 8 semitones lower on pad 48) —
// the grooves are theirs: intro (kick + tom on 1, the low tom on 3 and 4), theme (two-bar: 3 and 4 with two toms, then 3), the
// big part (a four-bar pattern with the ride on 2, the second kick on the "and" of 3, the hit on 4)
KITS.magma = o => {
  o.need('instruments', 'kickDrum', 'taikoDrum', 'hatDrum', 'magmaHitTone')
  o.need('engine', 'noise')
  return `(() => {
  ${stageHits(`      const bar = mod(b, 4), odd = mod(b, 2) === 1
      if (r === 'build') {
        for (let p = 0; p < 4; p += t < L / 2 ? 1 : t < 0.75 * L ? 0.5 : 0.25) add('tom4', 0.4 + (0.55 * (t + p)) / L, p)
        add('kick', 0.9, 0)
        if (x + 4 >= sectionEnd(x)) add('hit', 1, 3)
      } else if (e >= 3) {
        if (bar === 0) { add('kick', 1, 0); add('tom1', 1, 0); add('tom3', 0.95, 1); add('ride', 0.9, 1); add('tom2', 0.95, 2); add('tom4', 0.9, 2); add('kick2', 0.9, 2.5); add('tom3', 0.95, 3); add('tom4', 0.9, 3); add('hitlo', 0.9, 3) }
        if (bar === 1) { add('kick', 1, 0); add('tom1', 1, 0); add('tom3', 0.95, 1); add('ride', 0.9, 1); add('tom2', 0.95, 2); add('hitlo', 0.85, 2.5); add('kick2', 0.9, 2.75); add('tom3', 0.95, 3); add('hit', 0.9, 3) }
        if (bar === 2) { add('kick', 1, 0); add('tom1', 1, 0); add('ride', 0.9, 1); add('tom3', 0.95, 2); add('tom4', 0.9, 2); add('kick2', 0.9, 2.5); add('tom4', 0.9, 3); add('hitlo', 0.9, 3) }
        if (bar === 3) { add('tom3', 0.95, 0); add('kick2', 0.9, 0); add('hitlo', 0.85, 1); add('kick2', 0.85, 1.5); add('tom2', 0.95, 2); add('hithi', 0.85, 2); add('hitlo', 0.85, 3); add('kick2', 0.85, 3.5) }
      } else if (e === 2) {
        add('kick', 0.9, 0); add('tom1', 0.9, 0)
        if (!odd) { add('tom2', 0.8, 2, 3); add('tom4', 0.8, 2, 3); if (fill) add('kick2', 0.8, 2, 3) }
        else { add('tom3', 0.75, 2); add('tom4', 0.75, 2) }
      } else if (e >= 0) {
        add('kick', 0.8, 0); add('tom1', 0.8, 0)
        if (!odd) add('tom4', 0.8, 2, 3)
      }`)}
  return {
  color: '#d0603a',
  ${stageGraph([['kick', 3.5, 0.8], ['tom1', 3.2, 0.7], ['tom2', 3, 0.6], ['tom4', 2.8, 0.6], ['hit', 4.2, 0.4], ['hitlo', 4, 0.4]])}
  ${stageMidi([['kick', 36], ['tom1', 37], ['tom2', 38], ['tom3', 39], ['tom4', 41], ['kick2', 42], ['hit', 44], ['ride', 46], ['hitlo', 48], ['hithi', 50]])}
  formula: ${JSON.stringify(['D = \\Rev\\big[0.6K_{50} + 0.42T_{73} + 0.3T_{56} + 0.2T_{80} + 0.33T_{61} + 0.07\\,\\text{Ride} + 0.22\\,H(f)\\big]', 'H(f, t) = \\sum_{i=1}^{28} a_i\\,d_i(t)\\sin 2\\pi\\,\\tfrac{f}{164}F_i t\\quad\\text{— синт-удар кита, пересинтез по сэмплу: пара }164 / 173.6\\text{ Гц и облако }1.25\\text{–}6.7\\text{ кГц}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 120, sweep: 26, decay: 8, drive: 1.15 }), kick2 = kickDrum({ f0: 52, f1: 110, sweep: 24, decay: 9, drive: 1.05 })
    // 16-inch toms hit hard with a stick: a strong crack and the shell ringing above the body, not a soft thud (on small speakers
    // the body alone, 56–80 Hz, vanishes under the strings and the choir)
    const tom1 = taikoDrum({ pitch: 73, decay: 0.9, bend: 2.5, crack: 0.8, boom: 0.25, drive: 1.8, seed: 41 }), tom2 = taikoDrum({ pitch: 56, decay: 1.1, bend: 2.5, crack: 0.75, boom: 0.3, drive: 1.8, seed: 42 })
    const tom3 = taikoDrum({ pitch: 80, decay: 0.7, bend: 2, crack: 0.9, boom: 0.2, drive: 1.8, seed: 43 }), tom4 = taikoDrum({ pitch: 61, decay: 1, bend: 2.5, crack: 0.78, boom: 0.28, drive: 1.8, seed: 44 })
    const ride = hatDrum({ decay: 2.5, cutoff: 5000, ring: 0.85 }), hits = poly(magmaHitTone, { release: 0.12, life: 1.2, max: 6 }), fh = trigger(), fl = trigger(), fx = trigger()
    const η = noise(73), stick = filter('bp'), shell = filter('bp'), verb = reverb({ room: 0.9, damp: 0.38, wet: 0.36 })
    // the stick on the head: the newest tom hit → a 12 ms burst at 2.6 kHz, and the shell's ring an octave and a fifth over the tom
    const lastTom = x => { let best = null; for (const [d, f] of [['tom1', 73], ['tom2', 56], ['tom3', 80], ['tom4', 61]]) { const h = x < END ? lastHit(x, d) : null; if (h && (!best || h.τ < best.τ)) best = { ...h, f } } return best }
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const q = d => (x < END ? lastHit(x, d) : null), h1 = q('hit'), h2 = q('hitlo'), h3 = q('hithi')
      if (h1 && fh(x - h1.τ)) hits.hit(164, h1.vel, 0.7)
      if (h2 && fl(x - h2.τ)) hits.hit(164 * 2 ** (-8 / 12), h2.vel, 0.7)
      if (h3 && fx(x - h3.τ)) hits.hit(164 * 2 ** (2 / 12), h3.vel, 0.7)
      const lt = lastTom(x), ts = lt ? lt.τ * sec : 9, n = η()
      const crack = lt && ts < 0.08 ? lt.vel * exp(-ts / 0.012) * stick(n, 2600, 1.2) : stick(0, 2600, 1.2)
      const ring = lt && ts < 0.6 ? lt.vel * exp(-ts / 0.16) * shell(n, lt.f * 3, 9) : shell(0, 200, 9)
      const y = 1.3 * (0.6 * at('kick', kick, x, 1) + 0.5 * at('kick2', kick2, x, 1) + 0.42 * at('tom1', tom1, x) + 0.3 * at('tom2', tom2, x) + 0.2 * at('tom3', tom3, x) + 0.33 * at('tom4', tom4, x)) + 0.5 * crack + 0.9 * ring
      const hh = 0.07 * at('ride', ride, x) + 0.22 * hits()
      const [l, r] = verb(y + 0.8 * hh, y + 0.8 * hh)
      return [l + 0.15 * hh, r - 0.05 * hh]
    }
  },
}})()`
}
// the depths: a rumble far below on the tonic (a sine two octaves down and its fifth, swelling), lava bubbling up (low resonant
// pops rising in pitch), a hiss of steam now and then, heat shimmering in the highs
TEXTURES.lavaflow = o => {
  o.need('engine', 'noise', 'osc')
  return `{
  color: '#ff6a2a',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 6) : null),
  formula: ${JSON.stringify(['\\text{гул: } \\sin 2\\pi\\tfrac{f_T}{4}t + 0.5\\sin 2\\pi\\tfrac{3f_T}{8}t;\\quad \\text{пузыри: } e^{-t/0.07}\\,\\BP_{90\\cdot 2^{2t}}^{Q=12}\\eta;\\quad \\text{пар: } \\HP_{3\\text{к}}\\eta \\text{ раз в 16 долей}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(97), bub = filter('bp'), steam = filter('hp'), shim = filter('bp'), s1 = osc('sine'), s2 = osc('sine'), level = smooth(900), verb = reverb({ room: 0.94, damp: 0.4, wet: 0.5 })
    return x => {
      const n = η(), T = x * sec, a = level(x < END ? 1 : 0), e = Math.max(0, energy(x))
      const f = hz(mod(SCALE[0] + trAt(x), 12) - 36, C4), rumble = (0.09 * s1(f) + 0.045 * s2(f * 1.5)) * (0.75 + 0.25 * sin((TAU * x) / 16))
      const j = floor(T * 3), u = T * 3 - j, pop = hash(j, 31) < 0.45 ? exp(-u / 0.07) : 0
      const b = 0.5 * bub(n * pop, 90 * 2 ** (2 * u) * (1 + hash(j, 32)), 12)
      const k = floor(x / 16), st = (x - 16 * k - 8 * hash(k, 33)) * sec, hiss = st > 0 && st < 1.6 ? 0.03 * Math.min(1, st / 0.2) * exp(-st / 0.5) * steam(n, 3000) : (steam(0, 3000), 0)
      const y = 0.6 * a * (rumble + b + hiss + 0.008 * (1 + e) * shim(n, 7000, 1.5))
      return verb(...pan(y, 0.2 * sin((TAU * x) / 13)))
    }
  },
}`
}
