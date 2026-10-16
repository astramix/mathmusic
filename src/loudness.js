// Loudness after ITU-R BS.1770-4 / EBU R128 — shared by the app (the full check, A/B loudness match, the mastering
// meter and export) and the tests. K-weighting (the high shelf of the head and the RLB high-pass), mean square per
// channel summed, 400 ms blocks with 75 % overlap, the absolute gate at −70 LUFS and the relative one 10 LU under.

// a biquad from its coefficients (a0 = 1)
const biquad = (b0, b1, b2, a1, a2) => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  return x => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}
// the BS.1770 pre-filter and RLB high-pass, their 48 kHz design recomputed for the sample rate
export function kWeighting(sr = 44100) {
  const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan((Math.PI * f0) / sr)
  const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K
  const shelf = biquad((Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0)
  const f1 = 38.13547087602444, Q1 = 0.5003270373238773, K1 = Math.tan((Math.PI * f1) / sr), a1 = 1 + K1 / Q1 + K1 * K1
  const hp = biquad(1, -2, 1, (2 * (K1 * K1 - 1)) / a1, (1 - K1 / Q1 + K1 * K1) / a1)
  return x => hp(shelf(x))
}
// mean squares of the K-weighted channels in 400 ms blocks, every 100 ms
function blocks(L, R, sr) {
  const chans = [L, R].map(x => {
    const k = kWeighting(sr), y = new Float32Array(x.length)
    for (let i = 0; i < x.length; i++) y[i] = k(x[i])
    return y
  })
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), z = []
  for (let i = 0; i + block <= L.length; i += hop) {
    let e = 0
    for (const y of chans) for (let j = i; j < i + block; j++) e += y[j] * y[j]
    z.push(e / block)
  }
  return z
}
const ld = e => -0.691 + 10 * Math.log10(e)
// integrated loudness, LUFS (−Infinity for silence)
export function lufs(L, R, sr = 44100) {
  let gated = blocks(L, R, sr).filter(e => ld(e) > -70)
  if (!gated.length) return -Infinity
  const rel = ld(gated.reduce((a, b) => a + b, 0) / gated.length) - 10
  gated = gated.filter(e => ld(e) > rel)
  return ld(gated.reduce((a, b) => a + b, 0) / gated.length)
}
// loudness range (EBU Tech 3342): the spread of short-term (3 s) loudness between its 10th and 95th percentiles
export function loudnessRange(L, R, sr = 44100) {
  const z = blocks(L, R, sr), st = []
  for (let i = 0; i + 30 <= z.length; i += 10) st.push(ld(z.slice(i, i + 30).reduce((a, b) => a + b, 0) / 30))
  let g = st.filter(v => v > -70)
  if (g.length < 2) return 0
  const rel = 10 * Math.log10(g.reduce((a, v) => a + 10 ** (v / 10), 0) / g.length) - 20
  g = g.filter(v => v > rel).sort((a, b) => a - b)
  const q = p => g[Math.min(g.length - 1, Math.max(0, Math.round(p * (g.length - 1))))]
  return q(0.95) - q(0.1)
}
