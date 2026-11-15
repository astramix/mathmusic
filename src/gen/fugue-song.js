// The fugue and the organ prelude as songs: ensembles, the tracks of each voice — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { parseKey, roman, voiceLead, spell, keyName, keyLabel, SCALES, chordName, QUALITIES } from '../theory.js'
import { composeFugue, fugueMode } from '../fugue.js'
import { at as pitchAt } from '../counterpoint.js'
import { modeOf, parentMode, keyWithMode } from '../modes.js'
import { temperOf } from '../tuning.js'
import { fmtNotes, pick, rng, round } from './util.js'
import { NAMES } from './names.js'
import { temperData } from './micro.js'

// describe a generated song for the UI
// ---- the fugue style: a canon and a three-voice fugue, composed by the rules (src/fugue.js) ----------------------------
// The voices are data (SOPRANO, ALTO, BASS); instruments take them over by phase: the canon (winds, flute stops, the
// lute stop), the fugue (strings, principals, the harpsichord), the tutti from the stretto on (+ violone or 16′, organ
// chords, mixture and trombone). The continuo plays the chords the voices make.
const PH = ['canon', 'fugue', 'tutti']
const ENSEMBLES = {
  chamber: { label: 'флейта, гобой, фагот → скрипка, альт, виолончель; клавесин-континуо; виолоне и орган в tutti', theme: 'classical', tracks: [
    ['flute', 's', ['canon'], 'flute'], ['oboe', 'a', ['canon'], 'oboe'], ['bassoon', 'b', ['canon'], 'bassoon'],
    ['violin', 's', ['fugue', 'tutti'], 'violin'], ['viola', 'a', ['fugue', 'tutti'], 'viola'], ['cello', 'b', ['fugue', 'tutti'], 'cello'],
    ['violone', 'b', ['tutti'], 'violone', -12], ['harpsichord', 'continuo', PH, 'continuo'], ['organ', 'chords', ['tutti'], 'organchords'],
  ] },
  strings: { label: 'струнные: две скрипки, альт, виолончель; клавесин-континуо; виолоне и орган в tutti', theme: 'classical', tracks: [
    ['violin I', 's', PH, 'violin'], ['violin II', 'a', ['canon'], 'violin2'], ['viola', 'a', ['fugue', 'tutti'], 'viola'], ['cello', 'b', PH, 'cello'],
    ['violone', 'b', ['tutti'], 'violone', -12], ['harpsichord', 'continuo', PH, 'continuo'], ['organ', 'chords', ['tutti'], 'organchords'],
  ] },
  organ: { label: 'орган: гедакт и флейта 4′ в каноне, принципалы двух мануалов и педаль 16′ в фуге, микстура и тромбон 16′ в tutti', theme: 'gothic', tracks: [
    ['gedackt', 's', ['canon'], 'gedackt'], ['flute 4', 'a', ['canon'], 'flute4'], ['pedal 8', 'b', ['canon'], 'pedalSoft'],
    ['principal', 's', ['fugue', 'tutti'], 'principal'], ['octave', 'a', ['fugue', 'tutti'], 'octave'], ['pedal 16', 'b', ['fugue', 'tutti'], 'pedal16'],
    ['mixture', 's', ['tutti'], 'mixture'], ['posaune', 'b', ['tutti'], 'posaune'],
  ] },
  organPrelude: { label: 'орган: прелюдия на пленуме (принципалы, микстура) и педали 16′; гедакт и флейта 4′ в каноне, принципалы двух мануалов и педаль 16′ в фуге, микстура и тромбон 16′ в tutti', theme: 'gothic', tracks: [
    ['plenum', 'p', ['prelude'], 'plenum'], ['pedal', 'q', ['prelude'], 'pedal16'],
    ['gedackt', 's', ['canon'], 'gedackt'], ['flute 4', 'a', ['canon'], 'flute4'], ['pedal 8', 'b', ['canon'], 'pedalSoft'],
    ['principal', 's', ['fugue', 'tutti'], 'principal'], ['octave', 'a', ['fugue', 'tutti'], 'octave'], ['pedal 16', 'b', ['fugue', 'tutti'], 'pedal16'],
    ['mixture', 's', ['tutti'], 'mixture'], ['posaune', 'b', ['tutti'], 'posaune'],
  ] },
  harpsichord: { label: 'клавесин: лютневый регистр в каноне, 8′ + 8′ в фуге, 4′ и 16′ в tutti', theme: 'classical', tracks: [
    ['lute stop', 's', ['canon'], 'lute'], ['lute stop II', 'a', ['canon'], 'lute'], ['harpsichord bass', 'b', PH, 'harpsichordV'],
    ['harpsichord', 's', ['fugue', 'tutti'], 'harpsichordV'], ['harpsichord II', 'a', ['fugue', 'tutti'], 'harpsichordV'],
    ['4 foot', 's', ['tutti'], 'harpsichord4', 12], ['16 foot', 'b', ['tutti'], 'harpsichord16', -12],
  ] },
}
const VOICE_ARR = { s: 'SOPRANO', a: 'ALTO', b: 'BASS', p: 'PRELUDE', q: 'PEDAL' }
const VOICE_LANE = { s: [1.3, 3.2, 62, 84], a: [-0.2, 1.4, 53, 74], b: [-3, -1.6, 34, 62], p: [-0.6, 3.2, 52, 82], q: [-3, -1.8, 30, 50] }
 // y0, y1, n0, n1 (MIDI)
function fugueTrack([name, voice, phases, inst, dn = 0], { need }) {
  const ph = JSON.stringify(phases), color = { flute: '#e8f4ff', oboe: '#ffe8a3', bassoon: '#c9a46a', violin: '#ffd9a8', violin2: '#ffc58a', viola: '#e0a878', cello: '#c08a5a', violone: '#8a5a3a',
    gedackt: '#9fd8c8', flute4: '#c8f0e0', pedalSoft: '#6a8a9a', principal: '#e8c27a', octave: '#f2d38a', pedal16: '#a07a3a', mixture: '#fff1c4', posaune: '#d07a4a',
    lute: '#d8c8a8', harpsichordV: '#f2d38a', harpsichord4: '#fff3c8', harpsichord16: '#a88a4a', continuo: '#f2d38a', organchords: '#c9a227' }[inst] ?? '#ffffff'
  if (inst === 'plenum') {
    // the prelude's manual: every note sounding (the cadence chord whole) on the plenum — principals 8′ 4′ 2′, a quint,
    // a mixture
    need('instruments', 'organ')
    const [y0, y1, n0, n1] = VOICE_LANE.p
    return `{
  color: '${color}',
  graph: x => { const s = preludeAt(x); return s.length ? s.map(e => ${y0} + (e[1] + 60 - ${n0}) * ${round((y1 - y0) / (n1 - n0))}) : null },
  midi: x => preludeAt(x).map(e => 60 + e[1]),
  formula: ${JSON.stringify(['Pl = \\Rev\\sum_j\\sum_{s} a_s \\sin 2\\pi s f_j t,\\ s \\in \\{1, 2, 3, 4, 6, 8\\}\\quad\\text{— пленум: принципалы 8′ 4′, квинта 2⅔′, 2′, микстура}', '\\text{фигура на полтакта: } v_0\\,v_1\\,v_2\\,v_3\\,v_1\\,v_2\\,v_3\\,v_2\\ \\text{(шестнадцатые, как в прелюдии до мажор Баха)}'])},
  audio() {
    const o = organ({ voices: 4, stops: [[1, 1], [2, 0.6], [3, 0.2], [4, 0.35], [6, 0.12], [8, 0.1]], gain: 0.22 }), verb = reverb({ room: 0.96, damp: 0.3, wet: 0.52 })
    return x => {
      const [l, r] = o(preludeAt(x).map(e => hz(e[1], C4)))
      return verb(l, r)
    }
  },
}`
  }
  if (inst === 'continuo' || inst === 'organchords') {
    const on = `x => ${ph}.some(p => x >= PHASES[p][0] && x < PHASES[p][1]) && chordAt(x)`
    if (inst === 'continuo') {
      need('instruments', 'plucker')
      return `(() => {
  const on = ${on}
  return {
  color: '${color}',
  graph: x => (on(x) && x - chordAt(x)[0] < 1 ? chordAt(x)[3].map(n => -1 + (n - 50) / 20) : null),
  midi: x => (on(x) && x - chordAt(x)[0] < chordAt(x)[1] * 0.9 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['y_{k+N} = 0.994\\big(0.62\\,y_k + 0.38\\,y_{k+1}\\big)\\quad\\text{— континуо: аккорды, которые образуют голоса, правой рукой (Карплус — Стронг)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, harp = plucker({ life: 2.2, decay: 0.994 }), fire = trigger(), hp = filter('hp'), verb = reverb({ room: 0.82, damp: 0.4, wet: 0.3 })
    return x => {
      const c = on(x) ? chordAt(x) : null
      if (fire(c ? c[0] : null)) c[3].forEach((n, i) => harp.hit(hz(n - 60, C4), 0.3 + 0.05 * hash(floor(x), i), { bright: 0.62, at: floor(i * 0.012 * 44100) }))
      return verb(...pan(0.75 * hp(harp(), 140), 0.25))
    }
  },
}})()`
    }
    need('instruments', 'organ')
    return `(() => {
  const on = ${on}
  return {
  color: '${color}',
  graph: x => (on(x) ? chordAt(x)[3].map(n => -1 + (n - 50) / 20) : null),
  midi: x => (on(x) && x - chordAt(x)[0] < chordAt(x)[1] - 0.1 ? chordAt(x)[3] : []),
  formula: ${JSON.stringify(['O = \\Rev\\sum_j \\big(\\sin 2\\pi f_j t + 0.35\\sin 4\\pi f_j t\\big)\\quad\\text{— позитив: аккорды континуо в tutti, 8′ + 4′}'])},
  audio() {
    const o = organ({ voices: 3, stops: [[1, 1], [2, 0.35]], gain: 0.08 }), verb = reverb({ room: 0.94, damp: 0.35, wet: 0.5 })
    return x => {
      const c = on(x) ? chordAt(x) : null, [l, r] = o(c && x - c[0] < c[1] - 0.08 ? c[3].map(n => hz(n - 60, C4)) : [])
      return verb(l, r)
    }
  },
}})()`
  }
  const arr = VOICE_ARR[voice], [y0, y1, n0, n1] = VOICE_LANE[voice], k = round((y1 - y0) / (n1 - n0))
  const at = `x => playing(${arr}, x, ${ph}${dn ? `, ${dn}` : ''})`
  const head = `color: '${color}',
  graph: x => { const m = at(x); return m ? ${y0} + (m.n + 60 - ${n0}) * ${k} : null },
  midi: x => { const m = at(x); return m && m.u < 0.92 ? [60 + m.n] : [] },`
  const wrap = (formula, init, body) => `(() => {
  const at = ${at}
  return {
  ${head}
  formula: ${JSON.stringify(formula)},
  audio({ bpm }) {
    const sec = 60 / bpm, ${init}
    return x => {
      const m = at(x)
${body}
    }
  },
}})()`
  const P = { s: 0.28, a: -0.22, b: 0.05, p: 0, q: 0 }[voice]
  const bowedI = (body, gain, verbWet = 0.38) => {
    need('instruments', 'bowed')
    return wrap(['V = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{' + body + 'R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{\\,0.18\\min(1,t/0.4)\\sin(2\\pi\\cdot5.6T)/12}\\big) + 0.04\\eta', 'R = (300, 520, 1100, 2700)\\ \\text{Гц — резонансы корпуса}'],
      `bow = bowed({ base: C4, body: ${body}, sec }), verb = reverb({ room: 0.86, damp: 0.38, wet: ${verbWet} })`,
      `      return verb(...pan(${gain} * bow(m, x * sec), ${P}))`)
  }
  const reedI = (kind, gain, formula) => {
    need('instruments', 'reed')
    return wrap(formula, `r = reed({ kind: '${kind}' }), verb = reverb({ room: 0.84, damp: 0.4, wet: 0.34 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(${gain} * r(hz(n, C4), !!m && m.u < 0.93), ${P}))`)
  }
  const organI = (stops, gain, formula) => {
    need('instruments', 'organ')
    return wrap(formula, `o = organ({ voices: 1, stops: ${JSON.stringify(stops)}, gain: ${gain} }), verb = reverb({ room: 0.95, damp: 0.32, wet: 0.5 })`,
      `      const [l, r] = o(m && m.u < 0.94 ? [hz(m.n, C4)] : [])
      return verb(...pan(l + r, ${P}))`)
  }
  const harpI = (bright, decay, gain, formula) => {
    need('instruments', 'plucker')
    return wrap(formula, `p = plucker({ life: 1.8, decay: ${decay} }), fire = trigger(), hp = filter('hp'), damp = smooth(25), verb = reverb({ room: 0.8, damp: 0.42, wet: 0.28 })`,
      `      if (fire(m ? m.at : null)) p.hit(hz(m.n, C4), 0.45 + 0.1 * hash(floor(4 * x), 5), { bright: ${bright} })
      return verb(...pan(${round(gain * { s: 1.7, a: 1.2, b: 0.7 }[voice])} * damp(m && m.u < 0.97 ? 1 : 0.25) * hp(p(), 90), ${P})) // the damper falls when the key is let go (a high string dies sooner: the treble louder)`)
  }
  switch (inst) {
    case 'violin': return bowedI(1, 0.4)
    case 'violin2': return bowedI(0.92, 0.3)
    case 'viola': return bowedI(0.8, 0.27)
    case 'cello': return bowedI(0.6, 0.3)
    case 'violone': return bowedI(0.45, 0.2, 0.3)
    case 'flute':
      need('instruments', 'flute')
      return wrap(['Fl = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.06\\,\\BP_{2g}\\,\\eta + 0.5e^{-25t}\\,\\HP_{3000}\\,\\eta\\big)\\quad\\text{— траверс-флейта}'], `fl = flute(), verb = reverb({ room: 0.84, damp: 0.4, wet: 0.34 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(0.36 * fl(hz(n, C4), !!m && m.u < 0.92), ${P}))`)
    case 'oboe': return reedI('oboe', 0.36, ['Ob = a\\big(0.3\\,s + \\BP_{1100}^{Q=4}s + 0.6\\BP_{2800}^{Q=4}s\\big),\\quad s = \\LP\\,\\HP_{350}\\,\\Pi_{0.18}(g)\\quad\\text{— гобой}'])
    case 'bassoon': return reedI('bassoon', 0.5, ['Fg = a\\big(0.5\\,s + \\BP_{450}^{Q=3}s + 0.5\\BP_{1150}^{Q=4}s\\big),\\quad s = \\LP_{3500}\\,\\Pi_{1/4}(g)\\quad\\text{— фагот}'])
    case 'gedackt': return organI([[1, 1], [3, 0.12], [5, 0.04]], 0.2, ['G = \\sin 2\\pi ft + 0.12\\sin 2\\pi\\,3ft + 0.04\\sin 2\\pi\\,5ft\\quad\\text{— гедакт 8′: закрытая труба, нечётные гармоники}'])
    case 'flute4': return organI([[2, 1], [4, 0.15]], 0.15, ['F_4 = \\sin 4\\pi ft + 0.15\\sin 8\\pi ft\\quad\\text{— флейта 4′: октавой выше написанного}'])
    case 'pedalSoft': return organI([[0.5, 0.7], [1, 1], [2, 0.2]], 0.2, ['P = 0.7\\sin \\pi ft + \\sin 2\\pi ft + 0.2\\sin 4\\pi ft\\quad\\text{— педаль: суббас 16′ + бурдон 8′}'])
    case 'principal': return organI([[1, 1], [2, 0.5], [3, 0.12], [4, 0.22]], 0.17, ['Pr = \\sum_{s} a_s \\sin 2\\pi s f t,\\ s \\in \\{1, 2, 3, 4\\}\\quad\\text{— принципал 8′ + октава 4′ (+ квинта, суперoктава)}'])
    case 'octave': return organI([[1, 1], [2, 0.6], [4, 0.15]], 0.15, ['Pr_{II} = \\sin 2\\pi ft + 0.6\\sin 4\\pi ft + 0.15\\sin 8\\pi ft\\quad\\text{— второй мануал: 8′ + 4′}'])
    case 'pedal16': return organI([[0.5, 1], [1, 0.8], [2, 0.35], [4, 0.1]], 0.2, ['P = \\sin \\pi ft + 0.8\\sin 2\\pi ft + 0.35\\sin 4\\pi ft + \\ldots\\quad\\text{— педаль 16′ + 8′ + 4′}'])
    case 'mixture': return organI([[2, 0.6], [3, 0.4], [4, 0.45], [6, 0.3], [8, 0.25]], 0.09, ['M = \\sum_{s \\in \\{2,3,4,6,8\\}} a_s \\sin 2\\pi s f t\\quad\\text{— микстура: 4′, 2⅔′, 2′, 1⅓′, 1′ поверх сопрано}'])
    case 'posaune': {
      need('instruments', 'horn')
      return wrap(['Pos = \\LP_{f_c}\\tfrac12\\big(\\saw\\,\\tfrac f2 + \\saw\\,1.0023\\tfrac f2\\big)\\,e(t)\\quad\\text{— язычковый тромбон 16′ в педали}'], `h = horn({ bright: 1.6 }), verb = reverb({ room: 0.95, damp: 0.32, wet: 0.45 })
    let n = 0`, `      if (m) n = m.n
      return verb(...pan(0.22 * h(hz(n - 12, C4), !!m && m.u < 0.94, 0.75), ${P}))`)
    }
    case 'lute': return harpI(0.3, 0.986, 0.55, ['y_{k+N} = 0.986\\big(0.3\\,y_k + 0.7\\,y_{k+1}\\big)\\quad\\text{— лютневый регистр: войлок приглушает струну}'])
    case 'harpsichordV': return harpI(0.66, 0.993, 0.5, ['y_{k+N} = 0.993\\big(0.66\\,y_k + 0.34\\,y_{k+1}\\big)\\quad\\text{— клавесин 8′, демпфер при отпускании клавиши}'])
    case 'harpsichord4': return harpI(0.72, 0.99, 0.6, ['y_{k+N} = 0.99\\big(0.72\\,y_k + 0.28\\,y_{k+1}\\big)\\quad\\text{— регистр 4′: октавой выше}'])
    case 'harpsichord16': return harpI(0.6, 0.995, 0.45, ['y_{k+N} = 0.995\\big(0.6\\,y_k + 0.4\\,y_{k+1}\\big)\\quad\\text{— регистр 16′: октавой ниже}'])
  }
  throw new Error('fugue: no instrument ' + inst)
}

// ---- the prelude before an organ fugue: a progression a bar a chord, voice-led in four parts, broken into sixteenths
// (each half bar: the four notes up, then the upper three again — the figure of Bach's C major prelude), the pedal on the
// bass, a tonic pedal under the opening and a dominant pedal before the end, a half cadence on V7 held a whole bar
const PRELUDE_PROGS = {
  major: [
    ['I', 'ii7', 'V7', 'I', 'vi', 'V7/V', 'V', 'I', 'IV', 'vii°7', 'iii', 'vi', 'ii7', 'V7', 'I', 'V7'],
    ['I', 'IV', 'vii°7', 'I', 'V7/vi', 'vi', 'ii7', 'V7', 'I', 'V7/IV', 'IV', 'ii7', 'I', 'IV', 'I', 'V7'],
  ],
  minor: [
    ['i', 'iv', 'V7', 'i', 'VI', 'iiø7', 'V7', 'i', 'iv', 'VII7', 'III', 'VI', 'iiø7', '#vii°7', 'i', 'V7'],
    ['i', 'iiø7', 'V7', 'i', 'V7/iv', 'iv', '#vii°7', 'i', 'VI', 'iv', 'iiø7', 'V7', 'i', 'iv', 'i', 'V7'],
  ],
}
const FIGURE = [0, 1, 2, 3, 1, 2, 3, 2]
 // the voicing's notes, low to high, a sixteenth each, per half bar
function composePrelude(key, r) {
  const prog = pick(r, PRELUDE_PROGS[key.mode === 'minor' ? 'minor' : 'major']), n = prog.length
  const chords = prog.map(s => roman(s, key)), notes = [], pedal = [], harmony = []
  let prev = null
  chords.forEach((c, bar) => {
    const v = voiceLead(c.tones, prev, { lo: 55, hi: 77, voices: 4 })
    prev = v
    // the pedal: the tonic under the first two bars, the dominant under the two before the cadence, else the root
    const pedalPc = bar < 2 ? key.tonic : bar === n - 3 || bar === n - 4 ? (key.tonic + 7) % 12 : c.root
    const ped = 36 + ((pedalPc - 36) % 12 + 12) % 12
    pedal.push([4 * bar, ped, 4])
    harmony.push([4 * bar, 4, c.root, c.quality])
    if (bar === n - 1) { for (const m of v) notes.push([4 * bar, m, 3.75]); return } // the half cadence: the chord held
    for (let h = 0; h < 2; h++) FIGURE.forEach((i, j) => notes.push([4 * bar + 2 * h + j / 4, v[i], 0.25]))
  })
  notes.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return { notes, pedal, harmony, length: 4 * n, prog }
}
function generateFugue(opts, S, seeds, styleId = 'fugue') {
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)
  const parsed = parseKey(opts.key) ?? parseKey(pick(RA, S.keys))
  const key = { tonic: Math.round(parsed.tonic) % 12, mode: parsed.mode }
  // a church mode makes a modal fugue (its entries on the degrees of the same scale); other modes are not for a fugue
  const modeIn = opts.mode && !['major', 'minor'].includes(opts.mode) ? modeOf(opts.mode) : null
  const asTonal = modeIn && (modeIn.iv.join() === SCALES.major.join() ? 'major' : modeIn.iv.join() === SCALES.minor.join() ? 'minor' : null)
  const modal = modeIn && !asTonal && fugueMode(modeIn.iv) ? modeIn : null
  if (opts.mode === 'major' || opts.mode === 'minor') key.mode = opts.mode
  if (asTonal) key.mode = asTonal
  if (modal) key.mode = parentMode(modal.iv)
  const temperament = opts.temperament && opts.temperament !== 'equal' ? temperOf(opts.temperament) : null
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  const length = opts.length ?? 'normal'
  const canonBars = { short: 0, normal: 10, long: 14 }[length] ?? 10
  // (the organ style: always the organ, with a prelude before the fugue — its own dice)
  const ensembleId = S.ensemble ?? pick(RI, Object.keys(ENSEMBLES).filter(k => k !== 'organPrelude')), ens = ENSEMBLES[ensembleId]
  const fkey = modal ? { tonic: key.tonic, mode: 'modal', iv: modal.iv } : key
  const F = composeFugue({ key: fkey, r: RM, canon: canonBars > 0, canonBars })
  const PRE = S.prelude ? composePrelude(key, rng((seeds.melody ^ 0x9e1de) >>> 0)) : null
  if (PRE) {
    // everything of the fugue moves on by the prelude's length
    const P = PRE.length, sh = l => l.map(([b, ...r]) => [b + P, ...r])
    F.voices = { s: sh(F.voices.s), a: sh(F.voices.a), b: sh(F.voices.b) }
    F.sections = [[0, 'prelude'], ...sh(F.sections)]
    F.keys = [[0, F.keys[0]?.[1] ?? fkey], ...sh(F.keys)]
    F.harmony = [...PRE.harmony, ...sh(F.harmony)]
    F.entries = F.entries.map(e => ({ ...e, at: e.at + P }))
    F.length += P
  }
  const names = NAMES[styleId] ?? NAMES.fugue
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const skey = keyWithMode(key, modal ? opts.mode : null)
  const kname = k => (k.mode === 'modal' ? spell(k.tonic + 60, skey, false) : keyName(k))
  const FUGUE = F.sections.find(s => s[1] === 'exposition')[0], TUTTI = F.sections.find(s => s[1] === 'stretto' || s[1] === 'final entry')[0], END = F.length
  // the continuo's chords, voiced (tenor register, voice-led), spelt in their local key
  const keyAtB = b => { let k = F.keys[0]?.[1] ?? fkey; for (const [a, kk] of F.keys) if (a <= b + 1e-6) k = kk; return k }
  let prev = null
  const H = F.harmony.map(([b, len, root, q]) => {
    const iv = QUALITIES[q] ?? QUALITIES['']
    const v = voiceLead(iv.map(i => (root + i) % 12), prev, { lo: 52, hi: 67, voices: 3 })
    prev = v
    const lk = keyAtB(b), sk = lk.mode === 'modal' ? skey : lk
    const bass = pitchAt(F.voices.b, b) ?? v[0] - 12
    return { at: b, len, bass, v, symbol: chordName({ root, quality: q }, sk) }
  })
  const sp = n => spell(n, skey)
  const subjText = F.subject.notes.map(([, n]) => sp(n)).join(' ')
  const entryText = F.entries.map(e => `${e.at}: ${{ s: 'сопрано', a: 'альт', b: 'бас' }[e.voice]} — ${e.kind} (${kname(e.key)})`).join('\n//   ')
  const meta = {
    style: styleId, seed: (opts.seed ?? 1) >>> 0, seeds, length, key: keyName(key), mode: modal ? opts.mode : null, modeName: modal?.name ?? null, bpm, title,
    form: F.sections.map(s => s[1]), fixedKey: opts.key ?? null, micro: null, temperament: temperament?.id ?? null, meter: null, modulations: null,
    themes: { A: { from: 'контрапункт', title: `тема фуги ${subjText}`, how: F.subject.tonal ? 'тональный ответ' : 'реальный ответ' }, B: { from: 'контрапункт', title: 'противосложение (обратимое в октаву)', how: 'composed' }, bridge: { rhythmFrom: null } },
    instruments: { ensemble: ensembleId }, fugue: { entries: F.entries.length, stretto: F.subject.stretto, faults: F.faults.length, attempt: F.attempt },
  }
  const used = { engine: new Set(['floor', 'mod', 'hz', 'filter', 'reverb', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const tracks = ens.tracks.filter(t => canonBars > 0 || t[2].some(p => p !== 'canon')).map(t => ({ name: t[0], code: fugueTrack(t, { need }), voice: t[1] }))
  const seen = {}
  for (const t of tracks) { let k = t.name.replace(/[^\w ]/g, '').trim(); if (seen[k]) k += ' ' + ++seen[k]; else seen[k] = 1; t.key = k }
  const localKeys = []
  if (!modal) for (const [a, k] of F.keys) { const n = keyName(k); if (localKeys[localKeys.length - 1]?.[1] !== n) localKeys.push([a, n]) }
  const notes = list => fmtNotes(list.map(([b, n, d]) => [round(b), n - 60, round(d)]))
  const keyText = modal ? `${spell(key.tonic + 60, skey, false)} ${modal.name.toLowerCase()}` : keyLabel(key)
  const st = F.subject.stretto
  const head = [
    `// ${title} — ${S.label.toLowerCase()} in ${keyText}, ${bpm} BPM. Generated by MathMusic (style fugue, seed ${meta.seed}):`,
    `// ${F.sections.map(s => s[1]).join(' → ')}. ${ens.label[0].toUpperCase() + ens.label.slice(1)}.`,
    `// Composed by the rules of counterpoint (src/counterpoint.js, src/fugue.js) — consonance wherever a note begins on a beat,`,
    `// dissonance only as a passing or neighbour note, the fourth dissonant over the lowest voice, no parallel fifths or`,
    `// octaves, no crossing, leaps answered by steps, the raised 6th and 7th of minor going up; check() finds ${F.faults.length} faults.`,
    canonBars ? `// The canon: the soprano is followed by the alto a bar later and an octave lower, chosen note by note against that echo;` : null,
    canonBars ? `// the bass is free; at the end the follower leaves the canon for the cadence.` : null,
    `// The subject (${F.subject.L} beats): ${subjText}; the answer is ${F.subject.tonal ? 'tonal (its head answers 5̂ by 1̂)' : 'real'}; the countersubject`,
    `// was written against the answer below it and the subject above it at once — invertible at the octave.`,
    `// Episodes: sequences down the circle of fifths, the soprano's motif (from the subject or the countersubject) a step lower`,
    `// each bar, the bass on the roots. ${st ? `Stretto: the subject against itself ${st.delay} beat${st.delay > 1 ? 's' : ''} later.` : 'No stretto fits this subject: a last entry instead.'} Coda: iv – V – I${key.mode === 'minor' || modal ? ' with a Picardy third' : ''}.`,
    `// Entries:\n//   ${entryText}`,
    `// x is time in beats; n counts semitones from C4 (MIDI 60). Draw the voices in the piano roll (P).`,
  ].filter(Boolean)
  const data = `
const SECTIONS = ${JSON.stringify(F.sections)}
const END = ${END}
const FUGUE = ${FUGUE} // the fugue begins (before it: the canon)
const TUTTI = ${TUTTI} // the stretto or the last entry, and the coda: everyone
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz, exact equal temperament
const PHASES = { ${PRE ? `prelude: [0, ${PRE.length}], canon: [${PRE.length}, FUGUE]` : 'canon: [0, FUGUE]'}, fugue: [FUGUE, TUTTI], tutti: [TUTTI, END] }
// the note of a voice at x in the given phases (moved by dn semitones: a 4′ or a 16′ doubling) → { n, d, τ, u, at } or null
const playing = (list, x, phases, dn = 0) => {
  if (!phases.some(p => x >= PHASES[p][0] && x < PHASES[p][1])) return null
  const m = notesAt(list, x)
  return m && (dn ? { ...m, n: m.n + dn } : m)
}
${temperament ? temperData({ temperament, key, sectionInfo: [] }) + '\n' : ''}
// ---- the voices: [beat, n from C4, length] ---------------------------------------------------------------------------
const SOPRANO = ${notes(F.voices.s)}
const ALTO = ${notes(F.voices.a)}
const BASS = ${notes(F.voices.b)}${PRE ? `

// ---- the prelude (${PRE.prog.join(' – ')}): the manual's sixteenths, the pedal — [beat, n from C4, length]
const PRELUDE = ${notes(PRE.notes)}
const PEDAL = ${notes(PRE.pedal)}
// the prelude's notes sounding at x, by quarter beats (the held cadence chord sounds whole)
const PRE_AT = []
for (const e of PRELUDE) for (let q = floor(e[0] * 4); q < Math.ceil((e[0] + e[2]) * 4); q++) (PRE_AT[q] ??= []).push(e)
const preludeAt = x => (PRE_AT[floor(4 * x)] ?? []).filter(e => e[0] <= x && x < e[0] + e[2] * 0.94)` : ''}

// ---- the continuo: the chords the voices make (planned in the episodes and the coda) — [start, length, bass MIDI,
// voicing MIDI (voice-led), chord]
const HARMONY = [
${H.map(h => `  [${h.at}, ${h.len}, ${h.bass}, [${h.v.join(', ')}], '${h.symbol}'],`).join('\n')}
]
const BY_HALF = []
for (const h of HARMONY) for (let b = Math.round(h[0] * 2); b < Math.round((h[0] + h[1]) * 2); b++) BY_HALF[b] = h
const chordAt = x => BY_HALF[floor(2 * x)] ?? null
`
  const imp = mod => [...used[mod]].sort().map(x => (temperament && mod === 'engine' && x === 'hz' ? 'hz as hz12' : x))
  const parts = tracks.filter(t => t.voice !== 'continuo' && t.voice !== 'chords' && !/foot|violone|mixture|posaune/.test(t.name)).map(t => t.key)
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.key} ${'-'.repeat(Math.max(4, 90 - t.key.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${title}',
  bpm: ${bpm},
  key: '${keyName(key)}',${modal ? `
  mode: '${opts.mode}', // ${modal.name}: ${modal.iv.join(' ')}` : ''}${temperament ? `
  tuning: { id: '${temperament.id}', name: ${JSON.stringify(temperament.name)}, offsets: TEMPER }, // cents of C … B from 12-TET` : ''}
  length: END,
  theme: '${S.theme ?? ens.theme}',
  style: '${styleId}',
  generator: ${JSON.stringify({ style: styleId, seed: meta.seed, seeds, length, ...(meta.fixedKey ? { key: meta.fixedKey } : {}), ...(meta.mode ? { mode: meta.mode } : {}), ...(meta.temperament ? { temperament: meta.temperament } : {}) })},${localKeys.length > 1 ? `
  keys: ${JSON.stringify(localKeys)}, // the key of each entry and episode — for the note names
  signature: 'home', // the score keeps the home key signature (accidentals for the entries elsewhere, as Bach wrote them)` : ''}
  parts: ${JSON.stringify(parts)}, // the staves of the score
  sections: SECTIONS,
  tracks: ${temperament ? 'withNow(' : ''}{ ${tracks.map((t, i) => `${JSON.stringify(t.key)}: track${i}`).join(', ')} }${temperament ? ')' : ''},
}
`,
  ]
  return { source: out.join('\n'), meta }
}

export { generateFugue }
