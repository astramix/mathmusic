// Recipes of the internet legends: montagem, velora, Error XP, KeyGen Church — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { round } from './util.js'
import { ARPS, BASSES, COUNTER_VOICE, KITS, LEADS, TEXTURES, arpData, arpGraph, graphLead, pumpIf, struck } from './recipes.js'
import { ROLL, stageGraph, stageHits, stageMidi } from './stage.js'

// ---- Brazilian montagem and phonk (Montagem Mysterious Game, VELORA): the tamborzão under a hypnotic loop ---------------
// the mystery box: a music box and a glass bell in one (a tine's modes 1, 6.27 and a 3.5 : 1 FM shimmer), struck twice
// a few cents apart left and right, an octave above in a ping-pong echo of three sixteenths — the game's riddle, wide
LEADS.mysterybox = o => {
  o.need('instruments', 'fm')
  return `{
  color: '#c9a7ff',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Mb = \\Rev\\,\\Dly_{\\text{пинг-понг } 3/16}\\Big[T(f \\cdot 2^{-7/1200})_{L} + T(f \\cdot 2^{7/1200})_{R}\\Big],\\quad T = v\\big(e^{-t(0.9 + f/2000)}\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,6.27ft\\big) + 0.35\\,FM_{3.5}(2f)', '\\text{октавой выше, широко: две копии на } \\pm 7\\ \\text{центов слева и справа}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, tone = (f, t, v) => v * Math.min(1, t / 0.0008) * (exp(-t * (0.9 + f / 2000)) * (sin(TAU * f * t) + 0.25 * exp(-9 * t) * sin(TAU * 6.27 * f * t)) + 0.35 * fm(2 * f, t, { ratio: 3.5, index: 1.2, decay: 2.6, idecay: 8 }))
    const L = poly(tone, { release: 0.6, life: 4 }), R = poly(tone, { release: 0.6, life: 4 }), fire = trigger()
    const pingL = delay({ time: sec * 0.75, feedback: 0.42, wet: 0.32 }), verb = reverb({ room: 0.9, damp: 0.3, wet: 0.36 })
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) { const f = hz(m.n + 12, C4), v = 0.8 + 0.15 * hash(floor(4 * x), 3); L.hit(f * 2 ** (-7 / 1200), v, m.d * sec + 0.5); R.hit(f * 2 ** (7 / 1200), v, m.d * sec + 0.5, 0.004) }
      const k = ${round(0.17 * o.gain)}${pumpIf(o)}, l = k * L(), r = k * R()
      const [el, er] = pingL(l, r)
      return verb(el + 0.15 * er, er + 0.15 * el)
    }
  },
}`.replace('[60 + m.n]', '[72 + m.n]')
}
// the wide cowbell of Brazilian phonk: the 808 cowbell driven hard, doubled ±9 cents and 11 ms apart (Haas: it fills the
// stereo field), a ping-pong echo
LEADS.cowbellwide = o => {
  o.need('instruments', 'cowbellTone')
  o.need('engine', 'tanh')
  return `{
  color: '#fff1a8',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['Cw = \\Rev\\,\\Dly\\big[\\HP_{300}\\tanh(3.2\\,C(f \\cdot 2^{-9/1200}))_{L},\\ \\HP_{300}\\tanh(3.2\\,C(f \\cdot 2^{9/1200}))_{R}(t - 11\\,\\text{мс})\\big]', 'C \\text{ — ковбелл TR-808: два меандра } f \\text{ и } 1.48f \\text{ через полосовой фильтр}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, L = poly(cowbellTone, { release: 0.05, life: 1.2, max: 8 }), R = poly(cowbellTone, { release: 0.05, life: 1.2, max: 8 }), fire = trigger()
    const hpL = filter('hp'), hpR = filter('hp'), echo = delay({ time: sec * 0.75, feedback: 0.33, wet: 0.24 }), verb = reverb({ room: 0.8, damp: 0.4, wet: 0.22 })
    return x => {
      const m = ${o.at}(x)
      if (fire(m ? m.at : null)) { const f = hz(m.n, C4), v = 0.85 + 0.15 * hash(floor(4 * x), 9); L.hit(f * 2 ** (-9 / 1200), v, 1.1); R.hit(f * 2 ** (9 / 1200), v, 1.1, 0.011) }
      const k = ${round(0.26 * o.gain)}${pumpIf(o)}
      return verb(...echo(k * hpL(tanh(3.2 * L()), 300), k * hpR(tanh(3.2 * R()), 300)))
    }
  },
}`
}
// the montagem 808: a sine with its own sub driven into tanh and clipped harder when everything plays, sliding 60 ms
// between notes, on the tamborzão's 3 + 3 + 2
BASSES.mont808 = o => {
  o.need('engine', 'osc', 'tanh')
  return `(() => {
  const PAT = { 1: 'x---------------', 2: 'x-----x---x-----', 3: 'x--x--x-x--x--x-' }
  const bassAt = x => {
    const c = chordAt(x), e = energy(x)
    if (!c || e < 1 || x >= END - 1) return null
    if (role(x) === 'build' && x - sectionOf(x)[0] >= (sectionEnd(x) - sectionOf(x)[0]) / 2) return null
    const P = PAT[Math.min(3, e)], bar = floor(x / 4) * 4
    let k = floor(4 * (x - bar) + 1e-9)
    while (k > 0 && P[k] !== 'x') k--
    const at = bar + k / 4
    return { n: c[2] + (k === 14 && hash(bar, 67) < 0.5 ? 12 : k === 6 && hash(bar, 71) < 0.3 ? 7 : 0), at }
  }
  return {
  color: '#b48cff',
  graph: x => (bassAt(x) ? ${o.lane[0]} + (bassAt(x).n - 26) / 28 : null),
  midi: x => { const b = bassAt(x); return b && x - b.at < 0.7 ? [b.n] : [] },
  formula: ${JSON.stringify(['808 = a\\,\\LP_{2500}\\tanh\\!\\big(d\\,(\\sin 2\\pi\\!\\int\\! g + 0.4\\sin \\pi\\!\\int\\! g)\\big),\\quad a = e^{-t/0.9},\\quad d = 2.5 \\ldots 5,\\quad g \\text{ скользит к } f \\text{ за 60 мс}', '\\text{ритм тамборзао: } x\\,\\cdot\\cdot\\,x\\,\\cdot\\cdot\\,x\\,\\cdot\\ x\\,\\cdot\\cdot\\,x\\,\\cdot\\cdot\\,x\\,\\cdot\\ (3 + 3 + 2)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, o1 = osc('sine'), o2 = osc('sine'), lp = filter('lp'), glide = smooth(60), gate = smooth(4)
    let n = 36
    return x => {
      const m = bassAt(x), e = energy(x)
      if (m) n = m.n
      const t = m ? (x - m.at) * sec : 9, f = hz(glide(n) - 60, C4), s = o1(f) + 0.4 * o2(f / 2), a = gate(m ? exp(-t / 0.9) : 0), d = e >= 3 ? 5 : 2.5
      return ${round(0.34 * (o.gain ?? 1))} * a * lp(tanh(d * s) / Math.sqrt(d), 2500)${pumpIf(o)}
    }
  },
}})()`
}
// the tamborzão: a punchy kick, the "tum" (a low drum bending down), a clap on 2 and 4 in a wide room, hats and a shaker
// swapping sides, a rimshot "tchá" — 3 + 3 + 2 everywhere; VELORA's variant rolls the hats and doubles the claps
KITS.tamborzao = o => {
  o.need('instruments', 'kickDrum', 'clapDrum', 'hatDrum', 'shakerDrum', 'rimDrum', 'taikoDrum', 'crashCymbal')
  o.need('engine', 'tanh')
  const fast = o.variant === 'velora'
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL.replace("'snare'", "'clap'")}
        steps('kick', 0.9, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x--x--x-x--x--x-')
        steps('tum', 0.75, '--x--x----x--x--')
        steps('clap', 0.95, '${fast ? '----x--x----x-x-' : '----x-------x---'}')
        steps('hat', 0.5, '${fast ? 'xxxxxxxxxxxxxxxx' : '-x-x-x-x-x-x-x-x'}')
        steps('shaker', 0.35, 'xxxxxxxxxxxxxxxx')
        steps('rim', 0.55, '-------x------x-')
        if (t === 0) add('crash', 0.9, 0)
        if (fill) steps('tum', 0.9, '--------x-x-xxxx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x--x--x---x-----')
        steps('clap', 0.85, '----x-------x---')
        steps('hat', 0.4, '-x-x-x-x-x-x-x-x')
        steps('tum', 0.6, '------x-------x-')
      } else if (e === 1) {
        steps('tum', 0.6, 'x--x--x---------')
        steps('shaker', 0.25, '--x---x---x---x-')
      } else if (r === 'outro' && t === 0) add('crash', 0.8, 0)`)}
  return {
  color: '#ff5fa2',
  ${stageGraph([['kick', 3.5, 0.6], ['clap', 3.2, 0.6], ['tum', 3, 0.5], ['crash', 4, 0.4]])}
  ${stageMidi([['kick', 36], ['clap', 39], ['rim', 37], ['tum', 45], ['hat', 42], ['shaker', 70], ['crash', 49]])}
  formula: ${JSON.stringify(['D = \\tanh\\!\\big(1.3\\,[0.6K + 0.45\\,\\text{Tum} + 0.32\\,\\text{Clap}]\\big) + \\text{хэт и шейкер слева и справа} + \\Rev_{\\text{хлопок}}', '\\text{тамборзао: } 3 + 3 + 2\\quad K = e^{-6\\tau}\\tanh\\!\\big(2.2\\sin 2\\pi\\!\\int\\!(46 + 160e^{-35\\tau})\\big)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 46, f1: 160, sweep: 35, decay: 6, drive: 2.2 }), clap = clapDrum({ center: 1300 }), hat = hatDrum({ cutoff: 8000, decay: 85 })
    const sh = shakerDrum(), rim = rimDrum(), tum = taikoDrum({ pitch: 78, decay: 0.45, bend: 7, crack: 0.2, boom: 0.4, seed: 91 }), crash = crashCymbal({ decay: 1.5, seed: 31 })
    const room = reverb({ room: 0.75, damp: 0.4, wet: 0.3 })
    const at = (d, f, x, s = sec) => { const h = x < END ? lastHit(x, d) : null; return h ? h.vel * f(h.τ * s, true) : f(1, false) }
    return x => {
      const side = floor(4 * x) % 2 ? 0.55 : -0.55
      const body = tanh(1.3 * (0.6 * at('kick', kick, x, 1) + 0.45 * at('tum', tum, x) + 0.12 * at('rim', rim, x)))
      const c = 0.32 * at('clap', clap, x), hi = 0.09 * at('hat', hat, x), s = 0.06 * at('shaker', sh, x), cr = 0.25 * at('crash', crash, x)
      const [rl, rr] = room(c, c)
      return [body + rl + hi * (1 - side) + s * (1 + side) + cr, body + rr + hi * (1 + side) + s * (1 - side) + cr]
    }
  },
}})()`
}
// the voices of a montagem: formant chops — "ah", "oh", "ê" — on the off-beats, pitched to the chord's root an octave or
// two up, cut short, thrown left and right, the last one of a phrase stretched and falling (a tape stop)
TEXTURES.funkvox = o => {
  o.need('instruments', 'voice', 'VOWELS', 'blend')
  o.need('engine', 'tanh')
  return `{
  color: '#ffb0e0',
  graph: x => { const c = chordAt(x); return c && energy(x) >= 2 && mod(x, 1) < 0.25 ? -2.9 + 0.1 * hash(floor(x), 3) : null },
  formula: ${JSON.stringify(['V = \\tanh\\!\\big(1.6\\,\\text{голос}(f, F_{a|o|e})\\big)\\cdot e(t),\\quad f = f_{\\text{корень}}\\cdot 2^{1|2},\\ \\text{на слабых долях, слева и справа; в конце фразы — падение высоты (лента)}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, v = voice({ size: 1.05, breath: 0.08, rough: 0.3 }), gate = smooth(6), verb = reverb({ room: 0.7, damp: 0.4, wet: 0.25 }), echo = delay({ time: sec * 0.5, feedback: 0.25, wet: 0.2 })
    const VS = [VOWELS.a, VOWELS.o, VOWELS.e]
    let f = 220, F = VOWELS.a, side = 0
    return x => {
      const c = chordAt(x), e = energy(x), b = floor(2 * x), u = 2 * x - b, on = c && e >= 2 && x < END - 1 && b % 2 === 1 && hash(b, 41) < (e >= 3 ? 0.75 : 0.4)
      const last = b % 16 === 15, len = last ? 0.95 : 0.42
      if (c && u < 0.02) { f = hz(c[2] + 24 + (hash(b, 43) < 0.3 ? 12 : 0) - 60, C4); F = VS[floor(3 * hash(b, 47))]; side = hash(b, 53) < 0.5 ? -0.6 : 0.6 }
      const drop = last ? 2 ** (-Math.max(0, u - 0.3) * 1.6) : 1, g = gate(on && u < len ? 1 : 0)
      const y = 0.9 * tanh(1.6 * v(f * drop, F, g > 0.001)) * g
      return verb(...echo(...pan(y, side)))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { mysterybox: 'bells', cowbellwide: 'mysterybox' })

// ---- Error XP: a desktop that sings its own error sounds over a club beat --------------------------------------------
// the ding: a glassy chime (partials 1, 2, 3.01, 4.2, the high ones dying fast) and its octave 28 ms later, a little to
// the side — the system's "something happened", made into a melody
LEADS.xpding = o => struck('(f, t, v) => v * Math.min(1, t / 0.001) * (exp(-t * 2.2) * sin(TAU * f * t) + 0.45 * exp(-t * 4) * sin(TAU * 2 * f * t) + 0.22 * exp(-t * 7) * sin(TAU * 3.01 * f * t) + 0.12 * exp(-t * 12) * sin(TAU * 4.2 * f * t) + (t > 0.028 ? 0.4 * exp(-(t - 0.028) * 3) * sin(TAU * 2 * f * (t - 0.028)) : 0))', [], {
  release: 0.5, life: 3, gain: 0.33, fx: { init: ', echo = delay({ time: sec * 0.375, feedback: 0.3, wet: 0.2 }), verb = reverb({ room: 0.86, damp: 0.3, wet: 0.32 })', out: (y, p) => `verb(...echo(...pan(${y}, ${p})))` }, extra: pumpIf(o),
  formula: ['Ding = v\\big(e^{-2.2t}\\sin 2\\pi ft + 0.45e^{-4t}\\sin 4\\pi ft + 0.22e^{-7t}\\sin 2\\pi\\,3.01ft + 0.12e^{-12t}\\sin 2\\pi\\,4.2ft\\big) + 0.4\\,e^{-3(t - 28\\text{мс})}\\sin 4\\pi f(t - 28\\,\\text{мс})\\ \\text{— стеклянный «дзынь» и его октава}'],
})({ ...o, color: '#9fd8ff' })
// error beeps: the arpeggio as short square blips falling a fourth in 60 ms ("critical stop"), ping-pong, 8 bits
ARPS.errbeep = o => {
  return `(() => {
  ${arpData(o.step, o.poly)}
  return {
  color: '#ff6b6b',
  ${arpGraph(o.lane)}
  formula: ${JSON.stringify(['E = \\tfrac{1}{128}\\big\\lfloor 128\\,\\Pi_{1/2}\\big(f\\cdot 2^{-5\\min(1, t/60\\text{мс})/12}\\big)\\,e^{-t/70\\text{мс}}\\big\\rceil\\quad\\text{— бип ошибки: падает на кварту, 8 бит, пинг-понг}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, lp = filter('lp'), echo = delay({ time: sec * 0.75, feedback: 0.35, wet: 0.3 })
    let ph = 0, side = 1
    return x => {
      const m = arpAt(x), t = m ? (x - m.at) * sec : 9
      if (m && t < 1 / 44100 * 2) side = -side
      const f = m ? hz(m.n, C4) * 2 ** (-5 * Math.min(1, t / 0.06) / 12) : 0
      ph = (ph + f / 44100) % 1
      const sq = m && t < 0.3 ? (ph < 0.5 ? 1 : -1) * exp(-t / 0.07) : 0, y = lp(Math.round(128 * sq) / 128, 7000)
      return echo(...pan(${round(0.06 * (o.gain ?? 1))} * y${pumpIf(o)}, 0.5 * side))
    }
  },
}})()`
}
// the desktop: mouse clicks on the off-beats, a hard disk seeking (bursts of ticks), a notification chime (the chord's
// root, third and fifth up) opening every section that brings the music in, an "error" two-tone (fifth → root) falling at the end of every 8 bars
TEXTURES.desktop = o => {
  o.need('engine', 'noise')
  return `{
  color: '#8fd0ff',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 4) : null),
  formula: ${JSON.stringify(['\\text{щелчок: } e^{-t/2\\text{мс}}\\BP_{3000}\\eta;\\quad \\text{диск: } \\sum_i e^{-t_i/1\\text{мс}}\\BP_{5000}\\eta;\\quad \\text{уведомление: } \\sum_{k=0}^{2} e^{-3(t - 0.06k)}\\sin 2\\pi f_k t\\ (f_k:\\ \\text{корень, терция, квинта аккорда})'])},
  audio({ bpm }) {
    const sec = 60 / bpm, η = noise(77), bc = filter('bp'), bd = filter('bp'), verb = reverb({ room: 0.8, damp: 0.35, wet: 0.35 })
    return x => {
      const n = η(), a = x < END ? 1 : 0, e = energy(x)
      // a click on the "and" of each beat now and then
      const cb = floor(x * 2), ct = (x - cb / 2) * sec, click = cb % 2 && hash(cb, 5) < 0.5 && ct < 0.02 ? exp(-ct / 0.002) : 0
      // the disk: a burst of ticks every 8 beats, somewhere
      const db = floor(x / 8), dt = (x - 8 * db - 8 * hash(db, 9)) * sec, disk = dt > 0 && dt < 0.25 && hash(floor(dt / 0.012) + db * 31, 11) < 0.5 ? exp(-((dt % 0.012) / 0.001)) : 0
      // the chime at a section start, the error at the end of 8 bars
      const s = sectionOf(x), ts = (x - s[0]) * sec, k = Math.min(2, floor(ts / 0.06)), tk = ts - 0.06 * k
      const c0 = chordAt(s[0]), root = c0?.[2] ?? 48, iv = c0 ? [0, c0[5][0], c0[5][1]] : [0, 4, 7] // the chord's own third and fifth
      const chime = ts < 1.2 && s[2] >= 1 ? exp(-3 * tk) * sin(TAU * hz(root + 24 + iv[k] - 60, C4) * tk) : 0
      const eb = floor(x / 32), et = (x - 32 * eb - 31) * sec, er = chordAt(32 * eb + 31)?.[2] ?? 48, err = et > 0 && et < 0.5 && e >= 2 ? exp(-6 * et) * sin(TAU * hz(er + (et > 0.12 ? 12 : 19) - 60, C4) * et) : 0
      const y = 3 * a * (0.05 * bc(n, 3000, 3) * click * 6 + 0.03 * bd(n, 5000, 4) * disk * 6 + 0.07 * chime + 0.06 * err)
      return verb(...pan(y, 0.2 * sin(TAU * x / 16)))
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { xpding: 'pluck' })

// ---- KeyGen Church: a tracker's chip lead in a cathedral, an organ and a choir under it ---------------------------------
// the keygen lead: a pulse whose width sweeps (PWM, 0.12 – 0.5 at 0.7 Hz), a vibrato after 150 ms, an 8-bit floor, its
// echo three sixteenths later on the other side (the trackers' ping-pong), a second voice an octave up, quiet
LEADS.keygen = o => {
  return `{
  color: '#7dffb0',
  ${graphLead(o.at, o.lane)}
  formula: ${JSON.stringify(['K = \\tfrac{1}{256}\\big\\lfloor 256\\,\\LP_{9000}\\,\\Pi_{w(T)}(g)\\big\\rceil,\\quad w = 0.31 + 0.19\\sin 2\\pi\\,0.7T,\\quad g = f\\cdot 2^{0.15\\min(1, (t - 0.15)^+/0.2)\\sin(2\\pi\\cdot 6T)/12}', '\\text{пинг-понг через 3/16, вторая октава } 0.25\\,\\Pi_{w}(2g)'])},
  audio({ bpm }) {
    const sec = 60 / bpm, lp = filter('lp'), gate = smooth(3), glide = smooth(10), echo = delay({ time: sec * 0.75, feedback: 0.38, wet: 0.3 }), verb = reverb({ room: 0.92, damp: 0.3, wet: 0.3 })
    let ph = 0, ph2 = 0, n = 0
    return x => {
      const m = ${o.at}(x), T = x * sec, held = m ? m.τ * sec : 0
      if (m) n = m.n
      const g = hz(glide(n), C4) * 2 ** ((0.15 * Math.min(1, Math.max(0, held - 0.15) / 0.2) * sin(TAU * 6 * T)) / 12), w = 0.31 + 0.19 * sin(TAU * 0.7 * T)
      ph = (ph + g / 44100) % 1; ph2 = (ph2 + (2 * g) / 44100) % 1
      const s = (ph < w ? 1 : -1) + 0.25 * (ph2 < w ? 1 : -1), y = Math.round(256 * lp(s, 9000) / 1.25) / 256
      const out = ${round(0.16 * o.gain)} * gate(m && m.u < 0.9 ? 1 : 0) * y${pumpIf(o)}
      const [l, r] = echo(out, 0)
      return verb(l + 0.2 * r, r + 0.6 * out)
    }
  },
}`
}
// the tracker kit in a stone nave: an 8-bit kick (a sine diving, 6 bits), a noise snare from a 15-bit LFSR with a tone,
// metallic LFSR hats, a church bell (FM 1 : 2.76) on every section's downbeat — all in a long reverb
KITS.tracker = o => {
  o.need('instruments', 'kickDrum', 'lfsr', 'fm')
  return `(() => {
  ${stageHits(`      if (r === 'build') {
        ${ROLL}
        steps('kick', 0.8, 'x---x---x---x---')
      } else if (e >= 3) {
        steps('kick', 1, 'x---x---x---x-x-')
        steps('snare', 0.9, '----x-------x---')
        steps('hat', 0.45, 'xxxxxxxxxxxxxxxx')
        if (t === 0) add('bell', 1, 0)
        if (fill) steps('snare', 0.7, '----------x-xxxx')
      } else if (e === 2) {
        steps('kick', 0.9, 'x-------x-x-----')
        steps('snare', 0.8, '----x-------x---')
        steps('hat', 0.35, 'x-x-x-x-x-x-x-x-')
        if (t === 0) add('bell', 0.8, 0)
      } else if (e >= 0) {
        if (t === 0 || (r === 'intro' && mod(t, 8) === 0)) add('bell', 0.7, 0)
        steps('hat', 0.2, '--x---x---x---x-')
      }`)}
  return {
  color: '#59ffa0',
  ${stageGraph([['kick', 3.5, 0.6], ['snare', 3.2, 0.6], ['bell', 4, 0.5]])}
  ${stageMidi([['kick', 36], ['snare', 38], ['hat', 42], ['bell', 53]])}
  formula: ${JSON.stringify(['D = \\Rev_{\\text{неф}}\\big[\\tfrac{1}{32}\\lfloor 32K\\rceil + 0.3\\,(N_{15}e^{-t/0.09} + 0.4\\sin 2\\pi\\,180t\\,e^{-t/0.05}) + 0.07\\,N^{\\text{metal}}e^{-t/0.03}\\big] + 0.3\\,FM_{2.76}(f_{\\text{тоника}})', 'N_{15} \\text{ — 15-битный регистр сдвига (шум NES), колокол на каждой первой доле раздела}'])},
  audio({ bpm }) {
    const sec = 60 / bpm, kick = kickDrum({ f0: 50, f1: 180, sweep: 45, decay: 7, drive: 1.6 }), ns = lfsr(), nm = lfsr({ metal: true }), verb = reverb({ room: 0.93, damp: 0.3, wet: 0.38 })
    const at = (d, x) => { const h = x < END ? lastHit(x, d) : null; return h ? [h.vel, h.τ] : [0, 9] }
    let bellF = 130.81
    return x => {
      const cb = chordAt(x)
      if (cb && x - floor(x) < 0.01) bellF = hz(cb[2] + 12 - 60, C4) // the bell on the chord's root
      const [kv, kt] = at('kick', x), [sv, st] = at('snare', x), [hv, ht] = at('hat', x), [bv, bt] = at('bell', x)
      const k = kv * Math.round(32 * kick(kt, true)) / 32, s0 = ns(9000), m0 = nm(14000)
      const sn = sv * (s0 * exp(-(st * sec) / 0.09) + 0.4 * sin(TAU * 180 * st * sec) * exp(-(st * sec) / 0.05)), hh = hv * m0 * exp(-(ht * sec) / 0.03)
      const bell = bv * fm(bellF, bt * sec, { ratio: 2.76, index: 1.6, decay: 0.7, idecay: 2.5 })
      const y = 0.55 * k + 0.3 * sn + 0.07 * hh
      const [l, r] = verb(y + 0.3 * bell, y + 0.3 * bell)
      return [l + 0.1 * hh, r - 0.1 * hh]
    }
  },
}})()`
}
// the cathedral: a choir's "ah" holding the chord's root and fifth far back, its swell following the energy, wind in the
// vaults
TEXTURES.cathedral = o => {
  o.need('instruments', 'choir', 'VOWELS')
  o.need('engine', 'noise')
  return `{
  color: '#c8ffd8',
  graph: x => (x < END ? -2.95 + 0.05 * sin(TAU * x / 8) : null),
  formula: ${JSON.stringify(['C = \\Rev_{0.97}\\,\\text{хор}(f_R, f_R\\cdot\\tfrac32;\\ F_a)\\cdot s(e) + \\BP_{400}\\eta\\ \\text{(ветер в сводах)}'])},
  audio({ bpm }) {
    const ch = choir({ voices: 4, size: 0.95 }), η = noise(13), wind = filter('bp'), level = smooth(800), verb = reverb({ room: 0.97, damp: 0.3, wet: 0.6 })
    let v = [48, 55]
    return x => {
      const c = chordAt(x), e = energy(x)
      if (c) v = [c[2] + 12, c[2] + 19]
      const a = level(x < END - 1 && c ? [0.5, 0.35, 0.6, 0.85][Math.max(0, e)] : 0)
      const [l, r] = ch(v.map(n => hz(n - 60, C4)), VOWELS.a)
      const w = 0.03 * wind(η(), 400 + 150 * sin(TAU * x / 13), 3)
      return verb(0.5 * a * l + w, 0.5 * a * r + w)
    }
  },
}`
}
Object.assign(COUNTER_VOICE, { keygen: 'pulse12' })
