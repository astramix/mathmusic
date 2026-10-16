// The master bus — the last stage of a mix, set up the way mastering engineers do it — and the meter that watches it.
// Shared by the player (it runs inside the AudioWorklet: player.js puts this file in front of worklet.js), export
// (the whole song off-line, normalised to a loudness target), render.js and the tests.
//   1. the low end in mono: the side signal high-passed (Linkwitz–Riley, 24 dB/oct) below `monoBelow` Hz;
//   2. stereo width: the side signal × `width` (0 mono, 1 as mixed, 1.5 wider);
//   3. a glue compressor: feed-forward, the sidechain high-passed at 90 Hz (the kick doesn't pump the mix), RMS over
//      ~10 ms, soft knee, attack/release in the gain (dB) domain;
//   4. the gain that reaches the loudness target, then a true-peak limiter: 5 ms look-ahead, the peak of every sample and of three points between samples
//      (4× oversampling, windowed sinc), a sliding minimum of the gain needed, a box filter as long as the look-ahead
//      (a linear ramp that reaches the needed gain exactly at the peak), then an exponential release;
// and the loudness meter: K-weighted momentary (400 ms), short-term (3 s), integrated (gated as BS.1770-4) loudness,
// true peak, the limiter's gain reduction.

export const MASTER_PRESETS = {
  transparent: { label: 'Прозрачно — только лимитер', width: 1, monoBelow: 0, threshold: 0, ratio: 1, attack: 20, release: 200 },
  glue: { label: 'Склейка — мягкий компрессор 2:1', width: 1, monoBelow: 120, threshold: -20, ratio: 2, attack: 25, release: 250 },
  warm: { label: 'Плотно — 3:1, бас в моно, чуть шире', width: 1.15, monoBelow: 140, threshold: -22, ratio: 3, attack: 15, release: 180 },
  wide: { label: 'Широко — стерео 130 %', width: 1.3, monoBelow: 160, threshold: -20, ratio: 2, attack: 25, release: 250 },
}
// loudness targets: [id, label, LUFS, true-peak ceiling dBTP]
export const TARGETS = [
  ['peak', 'без нормализации — пик −1 dBFS (как было)', null, -1],
  ['stream', 'стриминг −14 LUFS (Spotify, YouTube, Tidal)', -14, -1],
  ['apple', 'Apple Music −16 LUFS', -16, -1],
  ['ebu', 'вещание EBU R128 −23 LUFS', -23, -1],
  ['club', 'клуб / громко −9 LUFS', -9, -1],
]
export const MASTER_DEFAULTS = { preset: 'glue', ...MASTER_PRESETS.glue, ceiling: -1, target: 'stream' }

const db = g => 20 * Math.log10(Math.max(g, 1e-12))
const undb = d => 10 ** (d / 20)
// a biquad (a0 = 1); butterworth high-pass of order 2
function biquadM(b0, b1, b2, a1, a2) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  return x => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}
function highpass(f, sr, q = Math.SQRT1_2) {
  const w = (2 * Math.PI * f) / sr, c = Math.cos(w), a = Math.sin(w) / (2 * q), a0 = 1 + a
  return biquadM((1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, (-2 * c) / a0, (1 - a) / a0)
}
// Linkwitz–Riley 4th order = two Butterworth (Q 0.707) in a row
const lr4 = (f, sr) => { const a = highpass(f, sr), b = highpass(f, sr); return x => b(a(x)) }

// 4× oversampling for the true peak: the three points between x[n-1] and x[n] by a windowed-sinc interpolator
// (12 taps a phase, Kaiser-like window) — BS.1770-4 Annex 2 asks for ≥ 4×
const TAPS = 12, PHASES = [0.25, 0.5, 0.75].map(fr => {
  const h = []
  for (let k = 0; k < TAPS; k++) {
    const t = k - TAPS / 2 + 1 - fr, x = Math.PI * t, w = 0.42 + 0.5 * Math.cos((Math.PI * t) / (TAPS / 2)) + 0.08 * Math.cos((2 * Math.PI * t) / (TAPS / 2))
    h.push((Math.abs(t) < 1e-9 ? 1 : Math.sin(x) / x) * Math.max(0, w))
  }
  const s = h.reduce((a, b) => a + b, 0)
  return h.map(v => v / s)
})
export function truePeakDetector() {
  const buf = new Float32Array(TAPS)
  let i = 0
  // the true peak of the signal up to the sample just pushed (a delay of TAPS/2 samples)
  return x => {
    buf[i] = x
    i = (i + 1) % TAPS
    let p = Math.abs(buf[(i + TAPS / 2 - 1) % TAPS])
    for (const h of PHASES) {
      let y = 0
      for (let k = 0; k < TAPS; k++) y += h[k] * buf[(i + k) % TAPS]
      p = Math.max(p, Math.abs(y))
    }
    return p
  }
}
// the true peak of whole channels (dBTP)
export function truePeak(L, R) {
  let p = 0
  for (const ch of [L, R]) {
    const d = truePeakDetector()
    for (let i = 0; i < ch.length; i++) p = Math.max(p, d(ch[i]))
    for (let i = 0; i < TAPS; i++) p = Math.max(p, d(0))
  }
  return db(p)
}

// ---- the chain ------------------------------------------------------------------------------------------------------
// masterChain(params, sr) → { process(l, r) → [l, r] (delayed by `latency` samples), gr (limiter dB), comp (dB), set(p) }
export function masterChain(params = MASTER_DEFAULTS, sr = 44100) {
  let p = { ...MASTER_DEFAULTS, ...params }
  const look = Math.round(0.005 * sr) // 5 ms
  let monoL = null, scHp = highpass(90, sr), rms = 0, comp = 0, gain = 1, drive = 1
  const rmsK = Math.exp(-1 / (0.01 * sr))
  const setup = () => {
    monoL = p.monoBelow > 0 ? lr4(p.monoBelow, sr) : null
    drive = undb(p.drive ?? 0)
  }
  setup()
  // the limiter: delay lines (the look-ahead plus the true-peak detector's own delay), a sliding minimum of the gain
  // each sample needs (a monotonic deque), a box filter
  const D = look + TAPS / 2
  const dl = new Float32Array(D + 1), dr = new Float32Array(D + 1), boxBuf = new Float32Array(look + 1)
  const tpL = truePeakDetector(), tpR = truePeakDetector()
  const dq = new Int32Array(look + 2), dqv = new Float32Array(look + 2)
  let head = 0, tail = 0, n = 0, boxSum = look + 1, boxI = 0, limG = 1, gr = 0
  boxBuf.fill(1)
  const relK = Math.exp(-1 / (0.08 * sr))
  return {
    latency: D,
    get gr() { return gr },
    get comp() { return comp },
    set(q) { p = { ...p, ...q }; setup() },
    process(l, r) {
      // 1–2: mid/side — the side signal high-passed and scaled
      let m = 0.5 * (l + r), s = 0.5 * (l - r)
      if (monoL) s = monoL(s)
      s *= p.width
      l = m + s
      r = m - s
      // 3: the glue compressor
      if (p.ratio > 1) {
        const sc = scHp(0.5 * (l + r))
        rms = rmsK * rms + (1 - rmsK) * sc * sc
        const lev = 10 * Math.log10(rms + 1e-12) + 3.01, over = lev - p.threshold, k = p.knee ?? 6
        const want = over <= -k / 2 ? 0 : over >= k / 2 ? over * (1 - 1 / p.ratio) : ((1 - 1 / p.ratio) * (over + k / 2) ** 2) / (2 * k)
        const coef = want > comp ? Math.exp(-1 / ((p.attack / 1000) * sr)) : Math.exp(-1 / ((p.release / 1000) * sr))
        comp = want + coef * (comp - want)
        gain = undb(-comp)
        l *= gain
        r *= gain
      }
      // the gain to the loudness target drives the limiter (after the compressor: it glues at the mix's own level)
      l *= drive
      r *= drive
      // 4: the limiter — the needed gain of this sample enters the window
      const ceil = undb(p.ceiling ?? -1)
      const pk = Math.max(tpL(l), tpR(r))
      const g = pk > ceil ? ceil / pk : 1
      const w = n % (D + 1)
      dl[w] = l
      dr[w] = r
      // sliding minimum over the last look+1 samples
      while (tail > head && dqv[(tail - 1) % (look + 2)] >= g) tail--
      dq[tail % (look + 2)] = n
      dqv[tail % (look + 2)] = g
      tail++
      while (dq[head % (look + 2)] <= n - (look + 1)) head++
      const mn = dqv[head % (look + 2)]
      // box filter: the gain ramps down over the look-ahead and is there when the peak comes out
      boxSum += mn - boxBuf[boxI]
      boxBuf[boxI] = mn
      boxI = (boxI + 1) % (look + 1)
      const target = boxSum / (look + 1)
      limG = target < limG ? target : target + relK * (limG - target)
      gr = -db(limG)
      n++
      // out comes the sample from D samples ago: every gain in the box covers it, so it can't go over the ceiling
      const o = n % (D + 1)
      let ol = dl[o] * limG, or = dr[o] * limG
      // a last guard for anything the estimate missed
      ol = ol > ceil ? ceil : ol < -ceil ? -ceil : ol
      or = or > ceil ? ceil : or < -ceil ? -ceil : or
      return [ol, or]
    },
  }
}

// ---- the meter ------------------------------------------------------------------------------------------------------
// loudnessMeter(sr) → { push(l, r), read() → { M, S, I (LUFS), tp (dBTP) }, reset() }
export function loudnessMeter(sr = 44100) {
  const shelf = () => {
    const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan((Math.PI * f0) / sr)
    const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K
    return biquadM((Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0)
  }
  const hpf = () => {
    const f1 = 38.13547087602444, Q1 = 0.5003270373238773, K1 = Math.tan((Math.PI * f1) / sr), a1 = 1 + K1 / Q1 + K1 * K1
    return biquadM(1, -2, 1, (2 * (K1 * K1 - 1)) / a1, (1 - K1 / Q1 + K1 * K1) / a1)
  }
  let kl, kr, tl, tr, hop, sub, subs, blocks, tp
  const reset = () => {
    const a = shelf(), b = hpf(), c = shelf(), d = hpf()
    kl = x => b(a(x))
    kr = x => d(c(x))
    tl = truePeakDetector()
    tr = truePeakDetector()
    hop = Math.round(0.1 * sr)
    sub = { e: 0, n: 0 }
    subs = [] // 100 ms energies, the last 30 (3 s)
    blocks = [] // gated 400 ms blocks for the integrated loudness
    tp = 0
  }
  reset()
  const ld = e => -0.691 + 10 * Math.log10(e)
  const mean = (a, n) => a.slice(-n).reduce((s, v) => s + v, 0) / Math.min(n, a.length)
  return {
    reset,
    push(l, r) {
      const a = kl(l), b = kr(r)
      sub.e += a * a + b * b
      tp = Math.max(tp, tl(l), tr(r))
      if (++sub.n >= hop) {
        subs.push(sub.e / sub.n)
        if (subs.length > 30) subs.shift()
        if (subs.length >= 4) { const m = mean(subs, 4); if (ld(m) > -70) blocks.push(m) }
        sub = { e: 0, n: 0 }
      }
    },
    read() {
      const M = subs.length >= 4 ? ld(mean(subs, 4)) : -Infinity, S = subs.length >= 30 ? ld(mean(subs, 30)) : -Infinity
      let I = -Infinity
      if (blocks.length) {
        const rel = ld(blocks.reduce((s, v) => s + v, 0) / blocks.length) - 10, g = blocks.filter(v => ld(v) > rel)
        if (g.length) I = ld(g.reduce((s, v) => s + v, 0) / g.length)
      }
      return { M, S, I, tp: db(tp) }
    },
  }
}

// ---- off-line: a whole mix mastered to a loudness target -----------------------------------------------------------
// (L, R, params, { lufs: the loudness function (loudness.js), target LUFS | null }) → { L, R, lufs, tp, gainDb }. The
// chain runs once to find how loud it comes out, the input gain is set to reach the target, then again (the limiter
// takes a little loudness off when it works: two or three rounds settle within 0.1 LU)
export function masterOffline(L0, R0, params, { lufs, target = -14, sr = 44100 } = {}) {
  const run = driveDb => {
    const ch = masterChain({ ...params, drive: driveDb }, sr), n = L0.length, lat = ch.latency
    const L = new Float32Array(n), R = new Float32Array(n)
    for (let i = 0; i < n + lat; i++) {
      const [l, r] = ch.process(i < n ? L0[i] : 0, i < n ? R0[i] : 0)
      if (i >= lat) (L[i - lat] = l), (R[i - lat] = r)
    }
    return { L, R }
  }
  let drive = 0, out = run(0), I = lufs(out.L, out.R, sr)
  if (target != null && Number.isFinite(I)) {
    // the secant method: the limiter makes loudness grow slower than the gain, so the step is scaled by the slope seen
    let prev = null
    for (let k = 0; k < 6 && Math.abs(I - target) > 0.05; k++) {
      const slope = prev && Math.abs(drive - prev.drive) > 1e-3 ? Math.max(0.15, Math.min(1.2, (I - prev.I) / (drive - prev.drive))) : 1
      prev = { drive, I }
      drive += (target - I) / slope
      out = run(drive)
      I = lufs(out.L, out.R, sr)
    }
  }
  return { ...out, lufs: I, tp: truePeak(out.L, out.R), gainDb: drive }
}
