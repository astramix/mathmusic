// Space and 8D on the output (the player's worklet — this file goes in front of viz/app/worklet.js like src/master.js —,
// the exports, tests). Self-contained: no imports, a worklet has none.
//   'space' — the mix in a room around you: the side widened, early reflections crossing between the ears (Haas: the
//             same sound 7–29 ms later from the other side reads as space, not echo), a decorrelated feedback-delay-network
//             tail.
//   '8d'    — the mix as one source going round your head once every `period` seconds (headphones): the far ear hears it
//             up to 0.66 ms later (ITD) and darker and softer (the head's shadow: a low-pass falling with the angle, ILD),
//             behind you a little duller (the pinna), its distance breathing slowly, the room the same 'space' tail.
// spatialChain(mode, sr, { period }) → { mode, process(l, r) → [l, r] }

export const SPATIAL_MODES = [['off', 'выкл'], ['space', 'Пространство (3D)'], ['8d', '8D — звук вокруг головы']]

// a feedback delay network: four lines (prime lengths), a Householder mix, a damping low-pass in the loop
function fdn(sr, { size = 1, feedback = 0.8, damp = 0.35 } = {}) {
  const lens = [1031, 1327, 1523, 1783].map(n => Math.round((n * size * sr) / 44100))
  const lines = lens.map(n => new Float32Array(n)), pos = [0, 0, 0, 0], lp = [0, 0, 0, 0]
  return (inL, inR) => {
    const o = lines.map((b, i) => b[pos[i]])
    const s = 0.5 * (o[0] + o[1] + o[2] + o[3])
    for (let i = 0; i < 4; i++) {
      lp[i] += (1 - damp) * (o[i] - s - lp[i]) // (the Householder reflection o − ½Σ, then damping)
      lines[i][pos[i]] = (i % 2 ? inR : inL) + feedback * lp[i]
      pos[i] = (pos[i] + 1) % lens[i]
    }
    return [o[0] + 0.6 * o[2], o[1] + 0.6 * o[3]]
  }
}
// a delay line read at a fractional delay (linear interpolation)
function delayLine(n) {
  const buf = new Float32Array(n)
  let w = 0
  return {
    push(v) { buf[w] = v; w = (w + 1) % n },
    read(d) { const p = w - 1 - d, i = Math.floor(p), u = p - i, a = buf[((i % n) + n) % n], b = buf[(((i + 1) % n) + n) % n]; return a + (b - a) * u },
  }
}

export function spatialChain(mode = 'off', sr = 44100, { period = 8 } = {}) {
  if (mode !== 'space' && mode !== '8d') return { mode: 'off', process: (l, r) => [l, r] }
  const room = fdn(sr, { size: mode === '8d' ? 1.2 : 1, feedback: mode === '8d' ? 0.82 : 0.78, damp: 0.4 })
  const pre = delayLine(Math.round(0.03 * sr)), dl = delayLine(Math.round(0.04 * sr)), dr = delayLine(Math.round(0.04 * sr))
  // early reflections [delay ms, gain, from the other side?]
  const ER = [[7.3, 0.32, 1], [11.9, 0.26, 0], [16.1, 0.22, 1], [19.7, 0.18, 0], [24.3, 0.14, 1], [29.1, 0.11, 0]].map(([ms, g, x]) => [(ms * sr) / 1000, g, x])
  const erLp = [0, 0]
  // 8D: the source line (for the far ear's delay), each ear's shadow filter
  const src = delayLine(Math.round(0.002 * sr)), maxItd = 0.00066 * sr
  let t = 0, shL = 0, shR = 0, back = [0, 0]
  const lpK = fc => Math.exp((-2 * Math.PI * Math.min(fc, 0.45 * sr)) / sr)
  return {
    mode,
    process(l, r) {
      let L, R
      if (mode === 'space') {
        // the side a third wider, the bass kept centred by taking the width from the side only
        const m = 0.5 * (l + r), s = 0.5 * (l - r) * 1.35
        L = m + s; R = m - s
      } else {
        // the source: the mix as one (a little of its own stereo kept), round the head
        const m = 0.5 * (l + r), s = 0.5 * (l - r)
        src.push(m)
        const th = (2 * Math.PI * t) / (period * sr), x = Math.sin(th), front = Math.cos(th)
        const near = src.read(0), far = src.read(maxItd * Math.abs(x))
        // the head's shadow on the far ear: from open (in front) to ~1.4 kHz (straight to the side), 6 dB softer
        const fcFar = 1400 + 18000 * (1 - Math.abs(x)) ** 2, kFar = lpK(fcFar), gFar = 1 - 0.5 * Math.abs(x)
        const toR = x >= 0 // the source on the right: the left ear is the far one
        const inL = toR ? far : near, inR = toR ? near : far
        shL = toR ? kFar * shL + (1 - kFar) * inL : inL
        shR = toR ? inR : kFar * shR + (1 - kFar) * inR
        let eL = toR ? gFar * shL : shL, eR = toR ? shR : gFar * shR
        // behind: duller (the pinna faces forward) and a little softer
        const kb = lpK(front < 0 ? 4500 + 15000 * (1 + front) : 20000)
        back[0] = kb * back[0] + (1 - kb) * eL; back[1] = kb * back[1] + (1 - kb) * eR
        eL = front < 0 ? back[0] : eL; eR = front < 0 ? back[1] : eR
        const dist = 1 + 0.08 * Math.sin(th / 2.3 + 1), gb = front < 0 ? 0.88 : 1
        L = (eL * gb * dist) + 0.25 * s
        R = (eR * gb * dist) - 0.25 * s
        t++
      }
      // early reflections, crossing between the ears, a little darker than the direct sound
      dl.push(L); dr.push(R)
      let el = 0, er = 0
      for (const [d, g, x] of ER) { el += g * (x ? dr : dl).read(d); er += g * (x ? dl : dr).read(d) }
      erLp[0] += 0.45 * (el - erLp[0]); erLp[1] += 0.45 * (er - erLp[1])
      // the tail after 12 ms of predelay
      pre.push(0.5 * (L + R))
      const p = pre.read(0.012 * sr), [tl, tr] = room(p + 0.3 * (L - R), p - 0.3 * (L - R))
      const wet = mode === '8d' ? 0.2 : 0.16
      return [0.88 * L + 0.5 * erLp[0] + wet * tl, 0.88 * R + 0.5 * erLp[1] + wet * tr]
    },
  }
}
// a whole rendering through it (exports)
export function spatialOffline(L, R, mode, sr = 44100) {
  const ch = spatialChain(mode, sr), oL = new Float32Array(L.length), oR = new Float32Array(R.length)
  let peak = 0
  for (let i = 0; i < L.length; i++) { const [a, b] = ch.process(L[i], R[i]); oL[i] = a; oR[i] = b; peak = Math.max(peak, Math.abs(a), Math.abs(b)) }
  const inPeak = Math.max(...[L, R].map(c => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0))) || 1
  // the same peak as before (the room adds energy)
  const g = peak > 0 ? inPeak / peak : 1
  for (let i = 0; i < oL.length; i++) { oL[i] *= g; oR[i] *= g }
  return [oL, oR]
}
