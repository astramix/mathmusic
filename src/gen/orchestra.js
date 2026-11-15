// Recipes of the orchestra, jazz and celtic styles: winds, cello, celesta, sax, trumpet, pipes, the continuo, harp, organ, the jazz and orchestral kits — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, FX, GATE, KITS, LEADS, compHit, drumData, drumGraph, graphLead, polyArp, struck } from './recipes.js'

// ---- the orchestra of the classical and romantic styles ---------------------------------------------------------
// a sustained solo instrument built once and fed (f, on): horn, oboe, clarinet; n shifted by `dn` semitones
const sustainedLead = ({ make, imports, color, gain, dn = 0, formula, fx = 'hall' }) => o => {
  o.need('instruments', ...imports)
  return `{
  color: '${color}',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [${60 + dn} + m.n] : [] },
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, inst = ${make}, ${FX[fx].init.slice(2)}
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const y = ${round(gain * o.gain)} * inst(hz(n + ${dn}, C4), !!m && m.u < 0.93)${o.hard ? ' * pumpAt(x)' : ''}
      return ${FX[fx].out('y', o.pan)}
    }
  },
}`
}
LEADS.horn = sustainedLead({
  make: 'horn({ bright: 0.6 })', imports: ['horn'], color: '#f4a261', gain: 0.5, dn: -12,
  formula: ['Hn = 0.7y + 0.5\\,\\BP_{450}y,\\quad y = \\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g + \\saw 1.0023g\\big)\\,e(t),\\quad f_c = 250 + 2500\\,e(t)^{1.6}', 'g = f\\cdot 2^{(-0.5e^{-t/25\\text{мс}} + 0.12\\,s(t)\\sin 2\\pi\\,5.2T)/12}\\ \\text{— валторна, октавой ниже темы}'],
})
LEADS.oboe = sustainedLead({
  make: "reed({ kind: 'oboe' })", imports: ['reed'], color: '#ffe8a3', gain: 0.4,
  formula: ['Ob = a\\big(0.3\\,s + \\BP_{1100}^{Q=4}s + 0.6\\BP_{2800}^{Q=4}s\\big),\\quad s = \\LP\\,\\HP_{350}\\,\\Pi_{0.18}(g)\\quad\\text{— узкий импульс, носовые форманты гобоя}'],
})
LEADS.clarinet = sustainedLead({
  make: "reed({ kind: 'clarinet' })", imports: ['reed'], color: '#d8f3dc', gain: 0.75,
  formula: ['Cl = a\\big(0.3\\,s + 0.3\\BP_{1500}s + 0.15\\BP_{3000}s\\big),\\quad s = \\LP_{3200}\\,\\Pi_{1/2}(f)\\quad\\text{— меандр: только нечётные гармоники (шалюмо)}'],
})
LEADS.cellolead = o => {
  o.need('instruments', 'bowed')
  return `{
  color: '#c08a5a',
  graph: x => { const m = ${o.at}(x); return m ? ${o.lane[0]} + (m.n + 5) * ${round((o.lane[1] - o.lane[0]) / 34)} : null },
  midi: x => { const m = ${o.at}(x); return m && m.u < 0.92 ? [48 + m.n] : [] },
  formula: ${JSON.stringify(['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{(n - 12 + v)/12}\\big)\\quad\\text{— виолончель поёт тему октавой ниже}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, bow = bowed({ base: C4, body: 0.6, sec }), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.4 })
    return x => { const m = ${o.at}(x); return verb(...pan(${round(0.3 * o.gain)} * bow(m && { ...m, n: m.n - 12 }, x * sec), ${o.pan})) }
  },
}`
}
LEADS.celesta = o => struck('celestaTone', ['celestaTone'], { release: 0.5, life: 4, gain: 0.35, fx: FX.echoHall, formula: ['Ce = v\\,e^{-t(1.2 + f/900)}\\big(\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,4ft + 0.08v\\,e^{-60t}\\sin 2\\pi\\,9.2ft\\big)'] })({ ...o, color: '#fff3b0' })
Object.assign(COUNTER_VOICE, { horn: 'clarinet', oboe: 'clarinet', clarinet: 'oboe', cellolead: 'violin', celesta: 'flute' })

// ---- jazz -----------------------------------------------------------------------------------------------------------------
LEADS.sax = sustainedLead({
  make: 'sax()', imports: ['sax'], color: '#ffc46b', gain: 0.28, fx: 'room',
  formula: ['Sx = a\\big(0.35\\,\\LP_{f_c}s + 0.8\\BP_{600}s + 0.55\\BP_{1700}s + 0.3\\BP_{2900}s\\big) + 0.07\\BP_{2g}\\eta,\\quad s = \\saw(g) + 0.3\\sin 2\\pi g t', 'f_c = 600 + 3800a^{1.5}\\ \\text{(громче — ярче)},\\quad g = f\\cdot 2^{(-0.35e^{-t/40\\text{мс}} + 0.16\\,s(t)\\sin 2\\pi\\cdot5.4T)/12}\\ \\text{— тенор-саксофон}'],
})
LEADS.trumpet = sustainedLead({
  make: 'horn({ bright: 2.2 })', imports: ['horn'], color: '#ffe08a', gain: 0.32, fx: 'room',
  formula: ['Tp = 0.7y + 0.5\\,\\BP_{450}y,\\quad y = \\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g + \\saw 1.0023g\\big)e(t),\\quad f_c = 250 + 9200\\,e(t)^{1.6}\\ \\text{— труба}'],
})
Object.assign(COUNTER_VOICE, { sax: 'trumpet', trumpet: 'sax' })

// ---- celtic ---------------------------------------------------------------------------------------------------------------
// the tin whistle: the festival flute's bright tone an octave above the tune (as the D whistle sounds)
LEADS.whistle = o => LEADS.shinobue(o).replace("color: '#ff5a5f'", "color: '#a8f0c8'").replace('— синобуэ, октавой выше темы', '— вистл, октавой выше темы')
// the uilleann pipes: a double-reed chanter (narrow pulse through bright formants) over three drones on the tonic, two
// octaves deep, that sound as long as the pipes play
LEADS.pipes = o => {
  o.need('instruments', 'reed', 'organ')
  return `{
  color: '#8fd08f',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['P = \\text{чантер: } r_{\\text{гобой}}(f) + \\text{бурдоны } \\sum_{k=1}^{3} \\sin 2\\pi\\,2^{-k} f_{\\text{тоника}} t\\ (\\text{тенор, баритон, бас})'])},
  audio({ bpm }) {
    const sec = 60 / bpm, ch = reed({ kind: 'oboe', breath: 0.05 }), dr = organ({ voices: 3, stops: [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2], [5, 0.12]], chiff: 0.05, gain: 0.05 }), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.3 })
    const T = (TONIC => [TONIC - 24, TONIC - 36, TONIC - 12])(${o.tonic} + 48)
    let n = 0
    return x => {
      const m = ${o.at}(x)
      if (m) n = m.n
      const playing = x < END - 1 && energy(x) >= 1
      const [l, r] = dr(playing ? T.map(t => hz(t - 60, C4)) : [])
      const y = ${round(0.42 * o.gain)} * ch(hz(n, C4), !!m && m.u < 0.95, 0.4)
      return verb(...pan(y, ${o.pan}).map((v, i) => v + (i ? r : l)))
    }
  },
}`
}
// the drone in the bass: the tonic and its fifth held on reeds, breathing in at each section
BASSES.drone = o => {
  o.need('instruments', 'organ')
  return `{
  color: '#6fa86f',
  graph: x => (x < END - 1 && energy(x) >= 1 ? ${o.lane[0]} + 0.3 : null),
  midi: x => (x < END - 1 && energy(x) >= 1 && mod(x - sectionOf(x)[0], 8) < 7.8 ? [${o.tonic} + 36, ${o.tonic} + 43] : []),
  formula: ${JSON.stringify(['D = \\sum_{s=1}^{5} a_s\\big(\\sin 2\\pi s f_1 t + \\sin 2\\pi s f_5 t\\big)\\quad\\text{— бурдон: тоника и квинта}'])},
  audio() {
    const o = organ({ voices: 2, stops: [[1, 1], [2, 0.6], [3, 0.35], [4, 0.2], [5, 0.15]], chiff: 0.02, gain: 0.11 }), level = smooth(400)
    return x => {
      const on = x < END - 1 && energy(x) >= 1 && mod(x - sectionOf(x)[0], 8) < 7.8, a = level(on ? 1 : 0)
      const [l, r] = o(on ? [hz(${o.tonic} + 36 - 60, C4), hz(${o.tonic} + 43 - 60, C4)] : [])
      return [a * l, a * r]
    }
  },
}`
}
// the bodhrán: a goatskin frame drum and its tipper — "don" (the open low skin), the rim, the light tips between
KITS.bodhran = o => {
  o.need('instruments', 'taikoDrum')
  return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#c8a070',
  ${drumGraph.replace("lastHit(x, 'kick') ?? lastHit(x, 'timp')", "lastHit(x, 'don') ?? lastHit(x, 'tip')")}
  formula: ${JSON.stringify(['B(t) = \\sum_k a_k e^{-t k/d}\\sin r_k\\varphi(t),\\ \\varphi = 2\\pi\\cdot 72\\,(t + \\ldots)\\ \\text{(дон, открытая кожа)};\\quad \\text{тип — 190 Гц, рука гасит кожу}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, don = taikoDrum({ pitch: 72, decay: 0.55, bend: 2, crack: 0.12, boom: 0.45, drive: 1.1, seed: 113 }), tip = taikoDrum({ pitch: 190, decay: 0.12, bend: 1, crack: 0.3, boom: 0.05, drive: 1, seed: 127 })
    const rim = taikoDrum({ pitch: 260, decay: 0.1, bend: 0, crack: 0.5, boom: 0, drive: 1, seed: 131 }), verb = reverb({ room: 0.6, damp: 0.5, wet: 0.16 })
    const play = (x, d, f) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * sec, true) : f(9, false) }
    return x => verb(...pan(0.3 * play(x, 'don', don) + 0.16 * play(x, 'tip', tip) + 0.14 * play(x, 'rim', rim), -0.1))
  },
}})()`
}
// the swing kit: the ride ("ding ding-a ding"), the hi-hat closed by the foot on 2 and 4, the bass drum feathered, the snare
// comping; brushes in the quiet sections; when the horn rests in trading fours, the drummer solos (snare, toms, kick, the
// crash on the last bar's downbeat) on a swung triplet grid
KITS.jazz = o => {
  o.need('instruments', 'kickDrum', 'snareDrum', 'hatDrum', 'brushDrum', 'metal', 'taikoDrum')
  return `(() => {
  ${drumData(o.drums)}
  // trading fours: the bars where the drums answer the soloist
  const drumSolo = x => role(x) === 'trade' && mod(floor((x - sectionOf(x)[0]) / 16), 2) === 1
  const soloCache = new Map()
  function soloHits(b) {
    if (soloCache.has(b)) return soloCache.get(b)
    const hits = [], first = mod(b, 4) === 0
    for (let i = 0; i < 12; i++) { // triplet eighths: 3 a beat
      const r = hash(12 * b + i, 31), pos = floor(i / 3) + [0, 1 / 3, 2 / 3][i % 3]
      if (first && i === 0) { hits.push([0, 'crash', 1]); continue }
      if (r < 0.32) hits.push([pos, 'snare', 0.55 + 0.4 * hash(i, b)])
      else if (r < 0.48) hits.push([pos, 'tom', 0.7])
      else if (r < 0.58) hits.push([pos, 'kick', 0.8])
    }
    soloCache.set(b, hits)
    return hits
  }
  const soloHit = (x, drum) => { let best = null; for (const [p, d, v] of soloHits(floor(x / 4))) if (d === drum && 4 * floor(x / 4) + p <= x) best = { τ: x - 4 * floor(x / 4) - p, vel: v }; return best }
  return {
  color: '#7fb0ff',
  ${drumGraph.replace("lastHit(x, 'kick') ?? lastHit(x, 'timp')", "lastHit(x, 'ride') ?? lastHit(x, 'kick')")}
  formula: ${JSON.stringify(['Ride = e^{-t/0.9}\\BP_{6.5\\text{к}}\\,m(t) + 0.4e^{-t/0.015}\\HP_{9\\text{к}}\\eta + 0.3e^{-t/0.6}\\sin 2\\pi\\,3.2\\text{к}t,\\quad m \\text{ — шесть квадратных волн 808 (металл)}', '\\text{райд «динг — динг-а — динг» со свингом 0.66, хай-хэт ногой на 2 и 4; в обмене квадратами — соло барабанов триолями}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 52, f1: 90, decay: 9, drive: 1.2 }), snare = snareDrum({ tone: 210, cutoff: 1500, decay: 16 })
    const hat = hatDrum({ decay: 55, cutoff: 7000 }), brush = brushDrum(), cym = metal(1), cym2 = metal(0.83), bp = filter('bp'), hp = filter('hp'), bp2 = filter('bp')
    const tom = taikoDrum({ pitch: 130, decay: 0.35, bend: 1, crack: 0.25, boom: 0.15, seed: 71 }), verb = reverb({ room: 0.7, damp: 0.5, wet: 0.18 })
    const play = (x, d, f, scale) => { const h = lastHit(x, d); return h ? h.vel * f(h.τ * scale, true) : f(1, false) }
    return x => {
      const m1 = cym(), m2 = cym2(), solo = drumSolo(x)
      // the ride (or, in a drum solo, the crash)
      const r = solo ? soloHit(x, 'crash') : lastHit(x, 'ride'), t = r ? r.τ * sec : 9
      const ride = r ? r.vel * (exp(-t / (solo ? 1.6 : 0.9)) * bp(m1 + m2, solo ? 5200 : 6500, 1.2) + 0.4 * exp(-t / 0.015) * hp(m1, 9000) + (solo ? 0 : 0.3 * exp(-t / 0.6) * Math.sin(6.283 * 3200 * t))) : (bp(m1 + m2, 6500, 1.2), hp(m1, 9000), 0)
      let y = 0.16 * ride
      if (solo) {
        const sn = soloHit(x, 'snare'), tm = soloHit(x, 'tom'), kk = soloHit(x, 'kick')
        y += 0.3 * (sn ? sn.vel * snare(sn.τ * sec, true) : snare(1, false)) + 0.4 * (tm ? tm.vel * tom(tm.τ * sec, true) : tom(9, false)) + 0.5 * (kk ? kk.vel * kick(kk.τ, true) : kick(1, false))
        y += 0.05 * play(x, 'hat', hat, sec)
      } else {
        y += 0.45 * play(x, 'kick', kick, 1) + 0.22 * play(x, 'snare', snare, sec) + 0.07 * play(x, 'hat', hat, sec) + (tom(9, false), 0)
        const b = lastHit(x, 'brush')
        y += 0.5 * brush(b ? b.vel * exp(-b.τ * 2.2) : 0)
      }
      return verb(...pan(y, 0.05))
    }
  },
}})()`
}

// Alberti bass: low – high – middle – high in eighths from the voicing (Mozart, Haydn, Clementi); a held chord when calm
CHORDS.alberti = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const albertiAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3]
    if (e === 0) return { notes: v, at: floor(x / 2) * 2, d: 2, vel: 0.4 }
    const j = floor(2 * x)
    return { notes: [[v[0], v[v.length - 1], v[1], v[v.length - 1]][j % 4]], at: j / 2, d: 0.5, vel: (j % 4 ? 0.32 : 0.45) + 0.08 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const a = albertiAt(x); return a ? a.notes.map(n => ${o.lane[0]} + (n - 48) / 20) : null },
  midi: x => { const a = albertiAt(x); return a && x - a.at < a.d * 0.9 ? a.notes : [] },
  formula: ${JSON.stringify(['\\text{Альберти: } (v_1, v_4, v_2, v_4)_{\\lfloor 2x\\rfloor \\bmod 4}\\ \\text{восьмыми},\\quad P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\sin 2\\pi f_k t'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.3, life: 5 }), fire = trigger(), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.3 })
    return x => {
      const a = albertiAt(x)
      if (a && fire(a.at)) a.notes.forEach((n, i) => keys.hit(hz(n - 60, C4), a.vel, a.d * sec * 1.6, i * 0.01))
      return verb(...pan(0.32 * keys(), 0.15))
    }
  },
}})()`
}
// the figure of Bach's C major Prelude: two low notes, then three repeated twice — (v₁ v₂ v₃ v₄ v₂′ v₃ v₄ v₂′) per half bar
CHORDS.prelude = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const figureAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3], j = floor(4 * x), fig = [c[2] + 12, v[0], v[1], v[2], v[3] ?? v[0] + 12, v[1], v[2], v[3] ?? v[0] + 12]
    return { n: fig[j % 8], at: j / 4, d: j % 8 < 2 ? 2 - (j % 8) / 4 : 0.25, vel: (j % 8 === 0 ? 0.5 : 0.36) + 0.05 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const f = figureAt(x); return f ? ${o.lane[0]} + (f.n - 48) / 20 : null },
  midi: x => { const f = figureAt(x); return f && x - f.at < 0.2 ? [f.n] : [] },
  formula: ${JSON.stringify(['\\text{фигура прелюдии Баха: } (b,\\ v_1, v_2, v_3, v_4, v_2, v_3, v_4)_{\\lfloor 4x\\rfloor \\bmod 8}\\ \\text{шестнадцатыми, ноты тянутся (педаль)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.4, life: 5 }), fire = trigger(), verb = reverb({ room: 0.85, damp: 0.4, wet: 0.32 })
    return x => {
      const f = figureAt(x)
      if (f && fire(f.at)) keys.hit(hz(f.n - 60, C4), f.vel, (2 - mod(f.at, 2)) * sec)
      return verb(...pan(0.3 * keys(), 0.1))
    }
  },
}})()`
}
// pipe organ: the voicing held on flue pipes 8′ 4′ 2⅔′ 2′, louder stops in the louder sections
CHORDS.pipeorgan = o => {
  o.need('instruments', 'organ')
  return `{
  color: '#c9a227',
  graph: x => (chordAt(x) && energy(x) >= 0 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => (chordAt(x) && energy(x) >= 0 && ${GATE(3.9)} ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['O = \\Rev\\sum_{j}\\sum_{s \\in \\{1, 2, 3, 4\\}} a_s\\sin\\big(2\\pi\\,s f_j\\,(1 \\pm 0.0008)\\,t\\big) + \\text{«чифф»}\\ 0.25e^{-t/0.05}\\BP_{3f}\\eta\\quad\\text{— регистры } 8^\\prime, 4^\\prime, 2\\tfrac23^\\prime, 2^\\prime'])},
  audio() {
    const o = organ({ voices: 4, gain: 0.1 }), level = smooth(200), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => {
      const c = chordAt(x), e = energy(x), a = level(c && e >= 0 ? [0.6, 0.75, 0.9, 1][e] : 0)
      const [l, r] = o(c && e >= 0 && ${GATE(3.95)} ? c[3].map(n => hz(n - 60, C4)) : [])
      return verb(a * l, a * r)
    }
  },
}`
}
// nocturne piano: the bass, then a wide broken chord over two octaves in eighths (Chopin's left hand)
CHORDS.nocturne = o => {
  o.need('instruments', 'pianoTone')
  return `(() => {
  const nocAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 0) return null
    const v = c[3], j = floor(2 * x), b = c[2] + (c[2] < 40 ? 12 : 0)
    const fig = [b, b + 7, v[1], v[2], v[3] ?? v[0] + 12, v[2], v[1], b + 7]
    return { n: fig[j % 8], at: j / 2, vel: (j % 8 === 0 ? 0.55 : 0.34) + 0.05 * e }
  }
  return {
  color: '#ffffff',
  graph: x => { const f = nocAt(x); return f ? ${o.lane[0]} + (f.n - 40) / 24 : null },
  midi: x => { const f = nocAt(x); return f && x - f.at < 0.4 ? [f.n] : [] },
  formula: ${JSON.stringify(['\\text{левая рука ноктюрна: } (b,\\ b + 7,\\ v_2, v_3, v_4, v_3, v_2,\\ b + 7)_{\\lfloor 2x\\rfloor \\bmod 8}\\ \\text{— широкое арпеджио на две октавы, педаль}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, keys = poly(pianoTone, { release: 0.5, life: 6 }), fire = trigger(), verb = reverb({ room: 0.88, damp: 0.35, wet: 0.35 })
    return x => {
      const f = nocAt(x)
      if (f && fire(f.at)) keys.hit(hz(f.n - 60, C4), f.vel, (4 - mod(f.at, 4)) * sec)
      return verb(...pan(0.3 * keys(), 0.1))
    }
  },
}})()`
}
// harp: the chord rolled upwards (35 ms a string) with the bass under it, on the comping hits
CHORDS.harpchords = o => {
  o.need('instruments', 'harpTone')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#ffd6e0',
  graph: x => (compAt(x) && chordAt(x) && x - compAt(x).at < 1 ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < Math.min(1, h.d * 0.9) ? [c[2] + 12, ...c[3]] : [] },
  formula: ${JSON.stringify(['Hp(f,t,v) = 0.55\\sum_{k=1}^{10}\\frac{|\\sin(\\pi k/7)|}{k^{1.4}}\\,v^{0.3+0.12k}e^{-0.4\\sqrt{f/220}\\,(1 + 0.35k^{1.3})t}\\sin 2\\pi kft,\\quad \\text{арпеджато вверх по 35 мс}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(harpTone, { release: 0.6, life: 6, max: 24 }), fire = trigger(), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => {
      const h = compAt(x), c = chordAt(x)
      if (h && c && fire(h.at)) [c[2] + 12, ...c[3], c[3][1] + 12].forEach((n, i) => p.hit(hz(n - 60, C4), h.vel * 0.9, h.d * sec + 1, i * 0.035))
      return verb(...pan(0.34 * p(), -0.2))
    }
  },
}})()`
}
// a brass choir: the voicing held on four horn-like voices, swelling with the section's energy
CHORDS.brasschoir = o => {
  o.need('instruments', 'brass')
  return `(() => {
  ${compHit(o.comp)}
  return {
  color: '#f4a261',
  graph: x => (compAt(x) && chordAt(x) ? chordAt(x)[3].map(n => ${o.lane[0]} + (n - 48) / 20) : null),
  midi: x => { const h = compAt(x), c = chordAt(x); return h && c && x - h.at < h.d * 0.9 ? c[3] : [] },
  formula: ${JSON.stringify(['Br = \\sum_{j}\\LP_{1.6f_c}\\LP_{f_c}\\tfrac12\\big(\\saw g_j + \\saw 1.0023g_j\\big)e(t),\\quad f_c = 250 + 2100\\,e(t)^{1.6}\\ \\text{(чем громче, тем ярче)}'])},
  audio() {
    const b = brass({ voices: 4, bright: 0.5, gain: 0.26 }), verb = reverb({ room: 0.9, wet: 0.4 })
    return x => {
      const h = compAt(x), c = chordAt(x), on = h && c && x - h.at < h.d * 0.92
      return verb(...b(on ? c[3].map(n => hz(n - 60, C4)) : [], h ? 0.5 + 0.5 * h.vel : 0.6))
    }
  },
}})()`
}
ARPS.harp = o => polyArp(o, 'harpTone', '#ffd6e0', 0.26, ['Hp(f,t,v) = 0.55\\sum_{k=1}^{10}\\frac{|\\sin(\\pi k/7)|}{k^{1.4}}\\,v^{0.3+0.12k}e^{-d_k t}\\sin 2\\pi kft\\quad\\text{— арфа, щипок на } 1/7 \\text{ струны}'])
ARPS.celesta = o => polyArp(o, 'celestaTone', '#fff3b0', 0.2, ['Ce = v\\,e^{-t(1.2 + f/900)}\\big(\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,4ft + \\ldots\\big)\\quad\\text{— челеста}'])
// the orchestral kit: real timpani (the kettle's modes) on the chord's bass
KITS.orchestral = o => {
  o.need('instruments', 'timpaniTone')
  return `(() => {
  ${drumData(o.drums)}
  return {
  color: '#d98b5f',
  ${drumGraph}
  formula: ${JSON.stringify(['Ti = \\sum_{k}A_k v^{0.6 + 0.3k}e^{-K_k d\\,t}\\sin\\big(2\\pi R_k f(t + 0.0005(1 - e^{-t/0.05}))\\big),\\quad R = (1, 1.5, 1.98, 2.44, 2.94, 1.65),\\ f \\text{ — бас аккорда}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, p = poly(timpaniTone, { release: 0.8, life: 4, max: 12 }), fire = trigger(), verb = reverb({ room: 0.9, damp: 0.4, wet: 0.4 })
    return x => {
      const h = lastHit(x, 'timp'), c = chordAt(x)
      if (h && h.τ < 0.05 && fire(x - h.τ)) p.hit(hz((c ? c[2] : 38) + ((c ? c[2] : 38) < 41 ? 12 : 0) - 60, C4), h.vel)
      return verb(...pan(0.26 * p(), -0.2))
    }
  },
}})()`
}

export { sustainedLead }
