// Listening to a recording: tempo and beats, swing, key and mode, chords, the drums' patterns, the form, the melody's
// notes and the clean notes an instrument plays alone (for src/timbre.js). Pure JS on a mono Float32Array — shared by
// tools/from-audio.mjs and the app's worker; nothing here knows the generator (src/audiostyle.js turns this into a style).
//
//   analyzeAudio(samples, sr, { progress }) → { bpm, beats, downbeat, swing, key, mode, bars, chords, drums, sections, melody, clean, ... }

// ---- FFT ------------------------------------------------------------------------------------------------------------
const FFTS = new Map()
function fftPlan(n) {
  if (FFTS.has(n)) return FFTS.get(n)
  const rev = new Uint32Array(n), bits = Math.log2(n)
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2)
  for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n) }
  const win = new Float64Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)
  const plan = { n, rev, cos, sin, win }
  FFTS.set(n, plan)
  return plan
}
// in place, re/im of length n (a power of two)
export function fft(re, im) {
  const n = re.length, { rev, cos, sin } = fftPlan(n)
  for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t } }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2, step = n / size
    for (let s = 0; s < n; s += size) for (let k = 0; k < half; k++) {
      const a = s + k, b = a + half, wr = cos[k * step], wi = sin[k * step]
      const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr
      re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi
    }
  }
}
// the magnitude spectrum of x[at … at + n) under a Hann window → Float64Array(n / 2)
export function spectrum(x, at, n) {
  const { win } = fftPlan(n), re = new Float64Array(n), im = new Float64Array(n)
  for (let i = 0; i < n; i++) { const j = at + i; re[i] = j >= 0 && j < x.length ? x[j] * win[i] : 0 }
  fft(re, im)
  const m = new Float64Array(n / 2)
  for (let i = 0; i < n / 2; i++) m[i] = Math.hypot(re[i], im[i])
  return m
}

// ---- helpers ----------------------------------------------------------------------------------------------------------
export function resample(x, from, to) {
  if (from === to) return x
  const ratio = from / to, out = new Float32Array(Math.floor(x.length / ratio))
  // a windowed-sinc low-pass at the new Nyquist, 16 taps a side
  const fc = Math.min(1, to / from) * 0.92, W = 16
  for (let i = 0; i < out.length; i++) {
    const c = i * ratio, c0 = Math.floor(c)
    let s = 0, ws = 0
    for (let k = c0 - W + 1; k <= c0 + W; k++) {
      if (k < 0 || k >= x.length) continue
      const d = k - c, w = 0.5 + 0.5 * Math.cos((Math.PI * d) / W), v = d === 0 ? 1 : Math.sin(Math.PI * fc * d) / (Math.PI * fc * d)
      s += x[k] * v * w; ws += v * w
    }
    out[i] = ws ? s / ws : 0
  }
  return out
}
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const quantile = (a, q) => { const s = [...a].sort((p, r) => p - r); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0 }
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const midiOf = f => 69 + 12 * Math.log2(f / 440)
const pcOf = n => ((Math.round(n) % 12) + 12) % 12
// the value of a frame-rate curve at time t (s), linearly interpolated
const at = (curve, rate, t) => { const p = t * rate, i = Math.floor(p), u = p - i; return i < 0 || i + 1 >= curve.length ? 0 : curve[i] * (1 - u) + curve[i + 1] * u }
// the curve's peak within [t − w, t + w]
const peakNear = (curve, rate, t, w) => { let m = 0; for (let i = Math.max(0, Math.floor((t - w) * rate)); i <= Math.min(curve.length - 1, Math.ceil((t + w) * rate)); i++) m = Math.max(m, curve[i]); return m }

// ---- the onset pass: spectral flux per band, loudness, brightness --------------------------------------------------------
function onsetPass(x, sr) {
  const n = 1024, hop = 256, frames = Math.max(1, Math.floor((x.length - n) / hop) + 1), bin = sr / n
  const B = { low: [30, 150], mid: [150, 2500], high: [5000, 11000], snr: [1500, 6000] }
  const range = ([a, b]) => [Math.max(1, Math.round(a / bin)), Math.min(n / 2 - 1, Math.round(b / bin))]
  const R = Object.fromEntries(Object.entries(B).map(([k, v]) => [k, range(v)]))
  const flux = new Float32Array(frames), low = new Float32Array(frames), mid = new Float32Array(frames), high = new Float32Array(frames)
  const rms = new Float32Array(frames), flat = new Float32Array(frames), cent = new Float32Array(frames), snr = new Float32Array(frames), flatS = new Float32Array(frames)
  let prev = new Float64Array(n / 2)
  for (let f = 0; f < frames; f++) {
    const m = spectrum(x, f * hop, n), L = new Float64Array(n / 2)
    let e = 0, num = 0, den = 0, lg = 0, ar = 0
    for (let i = 1; i < n / 2; i++) { L[i] = Math.log1p(100 * m[i]); e += m[i] * m[i]; num += i * m[i]; den += m[i] }
    for (let i = R.mid[0]; i <= R.mid[1]; i++) { lg += Math.log(m[i] + 1e-9); ar += m[i] }
    const k = R.mid[1] - R.mid[0] + 1
    flat[f] = ar > 1e-6 ? Math.exp(lg / k) / (ar / k) : 0
    // the snare's band: its wires are noise (flat), a chord's notes are peaks
    let lgS = 0, arS = 0
    for (let i = R.snr[0]; i <= R.snr[1]; i++) { lgS += Math.log(m[i] + 1e-9); arS += m[i] }
    const kS = R.snr[1] - R.snr[0] + 1
    flatS[f] = arS > 1e-6 ? Math.exp(lgS / kS) / (arS / kS) : 0
    cent[f] = den > 0 ? (num / den) * bin : 0
    rms[f] = Math.sqrt(e / (n / 2)) / n
    const band = ([a, b]) => { let s = 0; for (let i = a; i <= b; i++) s += Math.max(0, L[i] - prev[i]); return s / (b - a + 1) }
    low[f] = band(R.low); mid[f] = band(R.mid); high[f] = band(R.high); snr[f] = band(R.snr)
    let s = 0
    for (let i = 1; i < n / 2; i++) s += Math.max(0, L[i] - prev[i])
    flux[f] = s
    prev = L
  }
  return { rate: sr / hop, hop, flux, low, mid, high, snr, flatS, rms, flat, cent }
}

// ---- tempo and beats (D. Ellis, "Beat tracking by dynamic programming", 2007) ------------------------------------------------
function beatTrack(O) {
  const { flux, rate } = O, N = flux.length
  // the onset envelope: high-passed (minus its local mean), half-wave rectified, normalised
  const env = new Float32Array(N), w = Math.round(rate * 0.4), pre = new Float64Array(N + 1)
  for (let i = 0; i < N; i++) pre[i + 1] = pre[i] + flux[i]
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - w), b = Math.min(N, i + w + 1)
    env[i] = Math.max(0, flux[i] - (pre[b] - pre[a]) / (b - a))
  }
  const sd = Math.sqrt(mean(Array.from(env, v => v * v))) || 1
  for (let i = 0; i < N; i++) env[i] /= sd
  // tempo: autocorrelation weighted by a log-Gaussian around 115 BPM, each lag helped by its double and half (a comb)
  const ac = lag => { let s = 0; for (let i = lag; i < N; i++) s += env[i] * env[i - lag]; return s / (N - lag) }
  const lo = Math.floor((rate * 60) / 210), hi = Math.ceil((rate * 60) / 55), A = new Float64Array(hi * 4 + 4)
  for (let l = lo >> 1; l <= Math.min(hi * 4 + 3, N - 1); l++) A[l] = ac(l)
  let best = lo, bestS = -Infinity
  const scores = []
  for (let l = lo; l <= hi; l++) {
    const bpm = (60 * rate) / l, prior = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.9) ** 2)
    const s = prior * (A[l] + 0.5 * A[2 * l] + 0.5 * A[4 * l] + 0.25 * A[Math.round(l / 2)]) // the beat, two beats, the bar
    scores.push([bpm, s])
    if (s > bestS) (bestS = s), (best = l)
  }
  // the candidates: the autocorrelation's best peaks and their metrical relatives (×½ ⅔ ¾ 1 4⁄3 3⁄2 2), judged by how the
  // onsets fall on the beats and — what tells the real tempo from its relatives — on that tempo's grid of sixteenths
  const peaks = scores.filter(([, s], i) => i > 0 && i < scores.length - 1 && s >= scores[i - 1][1] && s >= scores[i + 1][1]).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const cands = []
  for (const [b0] of peaks.length ? peaks : [[(60 * rate) / best]]) for (const k of [0.5, 2 / 3, 0.75, 1, 4 / 3, 1.5, 2]) {
    const b = b0 * k
    if (b >= 60 && b <= 200 && !cands.some(c => Math.abs(c - b) / b < 0.015)) cands.push(b)
  }
  const refine = b0 => { let best = b0, bb = -1; for (let b = b0 * 0.985; b <= b0 * 1.015; b += b0 * 0.001) { const f = pulseFit(env, rate, b, false).B; if (f > bb) (bb = f), (best = b) } return best }
  const judged = cands.map(refine).map(b => ({ b, ...pulseFit(env, rate, b) }))
  const maxB = Math.max(...judged.map(j => j.B)) || 1
  let pick = judged.reduce((a, j) => { j.s = 3 * j.G + j.B / maxB; return !a || j.s > a.s ? j : a }, null)
  // the double tempo fits a grid of thirty-seconds as well as the real one fits sixteenths: it wins only by a margin
  const half = judged.find(j => Math.abs(j.b - pick.b / 2) / j.b < 0.02)
  if (half && pick.G - half.G < 0.1) pick = half
  // refined: the tempo near it whose beats fit best
  let fine = pick.b, fineB = -1
  for (let b = pick.b * 0.985; b <= pick.b * 1.015; b += pick.b * 0.0005) { const f = pulseFit(env, rate, b, false).B; if (f > fineB) (fineB = f), (fine = b) }
  const period = (60 * rate) / fine
  // dynamic programming over the envelope: a beat at t prefers one a period before
  const score = new Float64Array(N), back = new Int32Array(N).fill(-1), alpha = 140
  for (let t = 0; t < N; t++) {
    let m = 0, arg = -1
    for (let p = Math.round(t - 2 * period); p <= t - Math.round(period / 2); p++) {
      if (p < 0) continue
      const c = score[p] - alpha * Math.log((t - p) / period) ** 2
      if (c > m || arg < 0) (m = c), (arg = p)
    }
    score[t] = env[t] + (arg >= 0 ? m : 0)
    back[t] = arg
  }
  // backtrace from the best end
  let t = N - 1
  for (let i = Math.max(0, N - Math.round(period)); i < N; i++) if (score[i] > score[t]) t = i
  const beats = []
  while (t >= 0) { beats.push(t / rate); t = back[t] }
  beats.reverse()
  // a steady tempo (most generated music): the period by least squares over the beats
  let bpm = (60 * rate) / period
  if (beats.length > 8) {
    const n = beats.length, xs = beats.map((_, i) => i), mx = mean(xs), my = mean(beats)
    let sxy = 0, sxx = 0
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (beats[i] - my); sxx += (xs[i] - mx) ** 2 }
    const p = sxy / sxx
    if (Math.abs(60 / p - bpm) / bpm < 0.04) bpm = 60 / p
  }
  if (Math.abs(bpm - Math.round(bpm)) < 0.35) bpm = Math.round(bpm)
  return { env, bpm, beats, tempoScores: scores }
}
// how a tempo fits the onsets, judged in windows of eight beats (each window its own phase: a tempo a little off, or a
// player drifting, still fits): B = the onset strength on its beats against the average; G = the share of onset energy on
// its sixteenth grid beyond chance
function pulseFit(env, rate, bpm, grid = true) {
  const p = 60 / bpm, dur = env.length / rate, m = mean(Array.from(env)) || 1, W = 8 * p, g = p / 4, tol = 0.012
  let Bs = 0, Bn = 0, on = 0, tot = 0
  for (let w0 = 0; w0 + W <= dur; w0 += W) {
    let best = 0
    for (let k = 0; k < 32; k++) {
      const ph = w0 + (k / 32) * p
      let s = 0
      for (let j = 0; j < 8; j++) s += at(env, rate, ph + j * p)
      best = Math.max(best, s / 8)
    }
    Bs += best; Bn++
    if (!grid) continue
    const i0 = Math.floor(w0 * rate), i1 = Math.min(env.length, Math.floor((w0 + W) * rate))
    let bestOn = 0, wt = 0
    for (let i = i0; i < i1; i++) wt += env[i]
    for (let k = 0; k < 16; k++) {
      const ph = (k / 16) * g
      let s = 0
      for (let i = i0; i < i1; i++) { const u = (((i / rate - ph) % g) + g) % g; if (Math.min(u, g - u) < tol) s += env[i] }
      bestOn = Math.max(bestOn, s)
    }
    on += bestOn; tot += wt
  }
  const B = Bn ? Bs / Bn / m : 0
  if (!grid) return { B }
  const chance = Math.min(1, (2 * tol) / g + 1 / 16) // the best of sixteen phases is a little luckier than one
  return { B, G: tot ? (on / tot - chance) / (1 - chance) : 0 }
}
// beats on a steady grid: the phase that best fits the tracked beats and the onsets (a song made by a machine keeps time)
function steadyGrid(beats, bpm, env, rate, duration) {
  const p = 60 / bpm
  let best = 0, bestS = -Infinity
  for (let k = 0; k < 64; k++) {
    const ph = (k / 64) * p
    let s = 0
    for (let t = ph; t < duration; t += p) s += at(env, rate, t) + 0.5 * at(env, rate, t + p / 2)
    if (s > bestS) (bestS = s), (best = ph)
  }
  const grid = []
  for (let t = best; t < duration; t += p) grid.push(t)
  // how well the tracked beats sit on it (a live recording drifts: then keep the tracked beats)
  const dev = median(beats.map(b => { const u = ((b - best) / p) % 1; return Math.min(u, 1 - u) }))
  return dev < 0.12 ? grid : beats
}

const BASS_CANDS = [], BASS_W = [1, 0.8, 0.6, 0.45, 0.35, 0.3]
for (let q = 4 * 26; q <= 4 * 60; q++) BASS_CANDS.push(440 * 2 ** ((q / 4 - 69) / 12)) // D1 … C4, quarter semitones
// ---- the tonal pass: chroma (with the bass apart), every ~93 ms ------------------------------------------------------------
function tonalPass(x, sr) {
  const n = 8192, hop = 2048, frames = Math.max(1, Math.floor((x.length - n) / hop) + 1), bin = sr / n
  const chroma = [], bass = [], times = []
  for (let f = 0; f < frames; f++) {
    const m = spectrum(x, f * hop, n), c = new Float64Array(12), b = new Float64Array(12)
    for (let i = 2; i < n / 2 - 1; i++) {
      const fr = i * bin
      if (fr < 38 || fr > 2200) continue
      if (!(m[i] > m[i - 1] && m[i] >= m[i + 1])) continue // spectral peaks only
      const d = (0.5 * (m[i - 1] - m[i + 1])) / (m[i - 1] - 2 * m[i] + m[i + 1] || 1), fq = (i + d) * bin, note = midiOf(fq)
      const dev = Math.abs(note - Math.round(note)) // off the 12-TET grid: less weight
      const w = Math.sqrt(m[i]) * Math.max(0, 1 - 2.5 * dev)
      if (fq > 100) c[pcOf(note)] += w
    }
    // the bass: its fundamental by harmonic summation (a low note's own fifth and octave are as loud as the note: a plain
    // chroma of the low band hears them as notes), one pitch per frame, weighted by how clearly it stands out
    let best = 0, bf = 0, sum = 0, cnt = 0
    for (const f0 of BASS_CANDS) {
      let s = 0
      for (let h = 1; h <= 6; h++) {
        const p = (f0 * h) / bin, i = Math.floor(p), u = p - i
        if (i + 1 >= n / 2) break
        s += BASS_W[h - 1] * Math.max(m[i] * (1 - u) + m[i + 1] * u, 0.8 * Math.max(m[i], m[i + 1]))
      }
      // the fundamental itself must be there (else this is the octave below a note)
      const i0 = Math.round(f0 / bin)
      s *= Math.min(1, (m[i0] + 0.5 * (m[i0 - 1] + m[i0 + 1])) / (0.25 * s / 3 + 1e-12))
      sum += s; cnt++
      if (s > best) (best = s), (bf = f0)
    }
    if (bf && best > 2.5 * (sum / cnt)) b[pcOf(midiOf(bf))] += Math.sqrt(best)
    chroma.push(c); bass.push(b); times.push((f * hop + n / 2) / sr)
  }
  return { chroma, bass, times, rate: sr / hop, offset: n / 2 / sr }
}
const avgChroma = (T, key, a, b) => {
  const out = new Float64Array(12)
  T.times.forEach((t, i) => { if (t >= a && t < b) for (let k = 0; k < 12; k++) out[k] += T[key][i][k] })
  return out
}
const norm = v => { const s = Math.hypot(...v) || 1; return Array.from(v, x => x / s) }

// ---- key and mode (Krumhansl–Kessler), the mode by its characteristic degrees ------------------------------------------------
const KK = { major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], minor: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] }
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2 } return s / Math.sqrt(sa * sb || 1) }
export function detectKey(profile, force = null) {
  const out = []
  for (const mode of ['major', 'minor']) for (let t = 0; t < 12; t++) out.push({ tonic: t, mode, r: corr(Array.from({ length: 12 }, (_, i) => profile[(i + t) % 12]), KK[mode]) })
  out.sort((a, b) => b.r - a.r)
  const best = force ?? out[0], rel = Array.from({ length: 12 }, (_, i) => profile[(i + best.tonic) % 12])
  const tot = rel.reduce((s, v) => s + v, 0) || 1, P = rel.map(v => v / tot)
  let mode = null
  // (only clear evidence: a mode's own degree well above the one it replaces — a noisy guitar's stray ♭2 is no Phrygian)
  if (best.mode === 'minor') {
    if (P[9] > 1.4 * P[8] && P[9] > 0.065) mode = 'dorian'
    else if (P[1] > 1.15 * P[2] && P[1] > 0.065) mode = 'phrygian'
    else if (P[11] > 1.4 * P[10] && P[11] > 0.065) mode = 'harmonic'
  } else {
    if (P[10] > 1.4 * P[11] && P[10] > 0.065) mode = 'mixolydian'
    else if (P[6] > 1.3 * P[5] && P[6] > 0.065) mode = 'lydian'
  }
  return { tonic: best.tonic, mode: best.mode, modal: mode, confidence: best.r, ranked: out, raw: Array.from(profile), profile: P }
}

// ---- chords: templates per beat, Viterbi with a wish to stay --------------------------------------------------------------
const QUALS = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7] }
const QUAL_PRIOR = { '': 1, m: 1, 7: 0.93, m7: 0.93, maj7: 0.9, dim: 0.8, sus4: 0.8 }
const CHORDS = []
for (let r = 0; r < 12; r++) for (const [q, iv] of Object.entries(QUALS)) {
  const t = new Array(12).fill(0)
  for (const i of iv) t[(r + i) % 12] = i === 0 ? 1.2 : 1
  CHORDS.push({ root: r, q, pcs: iv.map(i => (r + i) % 12), t: norm(t), prior: QUAL_PRIOR[q] })
}
export function chordTrack(segs, key) {
  // segs: [{ c: chroma, b: bass }] — emission = cosine + the bass on the root, a little for diatonic chords
  const scale = key.mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11]
  const emis = segs.map(({ c, b }) => {
    const cn = norm(c), bn = norm(b), bmax = Math.max(...bn) || 1
    return CHORDS.map(ch => {
      let s = 0
      for (let i = 0; i < 12; i++) s += cn[i] * ch.t[i]
      const dia = ch.pcs.every(p => scale.includes((p - key.tonic + 12) % 12)) ? 0.06 : 0
      const third = ch.pcs[1] // the bass on the third or fifth is an inversion: allowed, less than the root
      return ch.prior * s + 0.35 * (bn[ch.root] / bmax) + 0.08 * (bn[third] / bmax) + dia
    })
  })
  const K = CHORDS.length, N = emis.length, stay = 0.32
  let prev = emis[0].slice()
  const back = []
  for (let i = 1; i < N; i++) {
    const cur = new Array(K), bk = new Int32Array(K)
    let pm = -Infinity, pa = 0
    for (let k = 0; k < K; k++) if (prev[k] > pm) (pm = prev[k]), (pa = k)
    for (let k = 0; k < K; k++) {
      const s = prev[k] + stay
      if (s >= pm) { cur[k] = s + emis[i][k]; bk[k] = k } else { cur[k] = pm + emis[i][k]; bk[k] = pa }
    }
    back.push(bk); prev = cur
  }
  let k = prev.indexOf(Math.max(...prev))
  const path = [k]
  for (let i = N - 2; i >= 0; i--) { k = back[i][k]; path.push(k) }
  path.reverse()
  return path.map(k => CHORDS[k])
}

// the chord's Roman numeral in the key (as theory.roman reads it: minor's own degrees bare, ♭ / ♯ for the others)
export function romanOf(ch, key) {
  const d = (ch.root - key.tonic + 12) % 12
  const MAJ = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' }
  const MIN = { 0: 'I', 1: 'bII', 2: 'II', 3: 'III', 4: '#III', 5: 'IV', 6: '#IV', 7: 'V', 8: 'VI', 9: '#VI', 10: 'VII', 11: '#VII' }
  const base = (key.mode === 'minor' ? MIN : MAJ)[d]
  const minorish = ch.q === 'm' || ch.q === 'm7' || ch.q === 'dim'
  const r = minorish ? base.replace(/[IV]+/, s => s.toLowerCase()) : base
  return r + { '': '', m: '', 7: '7', m7: '7', maj7: 'maj7', dim: '°', sus4: 'sus4' }[ch.q]
}

// ---- the melody: the most salient pitch in the lead's register (harmonic summation), then notes ----------------------------------
function melodyPass(x, sr) {
  const n = 2048, hop = 256, frames = Math.max(1, Math.floor((x.length - n) / hop) + 1), bin = sr / n
  const f0s = new Float32Array(frames), sal = new Float32Array(frames), purity = new Float32Array(frames)
  // candidates every 10 cents from G3 to C6
  const cands = []
  for (let c = midiOf(196) * 10; c <= midiOf(1046) * 10; c++) cands.push(440 * 2 ** ((c / 10 - 69) / 12))
  const H = 8, wts = Array.from({ length: H }, (_, h) => 0.85 ** h)
  for (let f = 0; f < frames; f++) {
    const m = spectrum(x, f * hop, n)
    let tot = 0
    for (let i = Math.round(150 / bin); i < Math.round(5000 / bin); i++) tot += m[i]
    let best = 0, arg = 0
    for (let ci = 0; ci < cands.length; ci++) {
      let s = 0
      for (let h = 0; h < H; h++) {
        const p = (cands[ci] * (h + 1)) / bin, i = Math.floor(p), u = p - i
        if (i + 1 >= n / 2) break
        s += wts[h] * Math.max(m[i] * (1 - u) + m[i + 1] * u, 0.7 * Math.max(m[i], m[i + 1]))
      }
      if (s > best) (best = s), (arg = ci)
    }
    // the octave below wins when its own fundamental is there (the summation likes the upper octave)
    let fq = cands[arg]
    const half = fq / 2
    if (half >= 196) {
      const i = Math.round(half / bin)
      if (m[i] > 0.6 * m[Math.round(fq / bin)]) fq = half
    }
    f0s[f] = fq; sal[f] = best; purity[f] = tot > 0 ? best / tot : 0
  }
  return { f0s, sal, purity, rate: sr / hop }
}
// frames → notes: steady pitch for ≥ 90 ms, loud enough, the purer frames counted
function segmentNotes(M, minSal) {
  const notes = [], { f0s, sal, purity, rate } = M
  let s = -1, pitches = []
  const flush = e => {
    if (s >= 0 && e - s >= 0.09 * rate) {
      const n = median(pitches)
      notes.push({ t: s / rate, d: (e - s) / rate, n, purity: mean(Array.from(purity.slice(s, e))), sal: mean(Array.from(sal.slice(s, e))) })
    }
    s = -1; pitches = []
  }
  for (let i = 0; i < f0s.length; i++) {
    const n = midiOf(f0s[i]), ok = sal[i] > minSal
    if (!ok) { flush(i); continue }
    if (s >= 0 && Math.abs(n - median(pitches)) > 0.6) flush(i)
    if (s < 0) s = i
    pitches.push(n)
  }
  flush(f0s.length)
  return notes
}

// ---- everything -------------------------------------------------------------------------------------------------------------------
export function analyzeAudio(input, srIn, { progress = () => {} } = {}) {
  const sr = 22050, x = resample(input, srIn, sr), duration = x.length / sr
  progress('атаки и громкость', 0.05)
  const O = onsetPass(x, sr)
  progress('темп и доли', 0.25)
  const BT = beatTrack(O)
  let beats = steadyGrid(BT.beats, BT.bpm, BT.env, O.rate, duration)
  progress('гармония', 0.35)
  const T = tonalPass(x, sr)
  // the downbeat: the phase of four where the kicks and the chord changes fall
  const beatChroma = beats.map((b, i) => norm(avgChroma(T, 'chroma', b, beats[i + 1] ?? b + 60 / BT.bpm)))
  let downbeat = 0, dbS = -Infinity
  for (let ph = 0; ph < 4; ph++) {
    let s = 0
    for (let i = ph; i < beats.length; i += 4) {
      s += 0.3 * peakNear(O.low, O.rate, beats[i], 0.05) / (quantile(Array.from(O.low), 0.98) || 1)
      if (i > 0) s += 3 * (1 - beatChroma[i].reduce((a, v, k) => a + v * beatChroma[i - 1][k], 0)) // chords change on the bar
    }
    if (s > dbS) (dbS = s), (downbeat = ph)
  }
  // a bar grid; beats before the first downbeat are a pickup
  const bars = []
  for (let i = downbeat; i + 4 <= beats.length; i += 4) bars.push({ t: beats[i], beats: beats.slice(i, i + 4), end: beats[i + 4] ?? beats[i + 3] + 60 / BT.bpm })
  // swing: where the off-beat onsets sit
  let on5 = 0, onSw = 0
  const swingHist = new Array(11).fill(0)
  for (let i = 0; i + 1 < beats.length; i++) {
    const b = beats[i], p = beats[i + 1] - b
    on5 += at(BT.env, O.rate, b + 0.5 * p)
    for (let k = 0; k <= 10; k++) swingHist[k] += at(BT.env, O.rate, b + (0.5 + k * 0.02) * p)
  }
  let swing = 0.5
  { const k = swingHist.indexOf(Math.max(...swingHist)); onSw = swingHist[k]; if (k >= 4 && onSw > 1.25 * on5) swing = Math.round((0.5 + k * 0.02) * 100) / 100 }
  // key
  const prof = new Float64Array(12), bassProf = new Float64Array(12)
  T.chroma.forEach((c, i) => { for (let k = 0; k < 12; k++) { prof[k] += c[k]; bassProf[k] += T.bass[i][k] } })
  const bmax = Math.max(...bassProf) || 1, pmax = Math.max(...prof) || 1
  const key = detectKey(Array.from(prof, (v, k) => v / pmax + (0.6 * bassProf[k]) / bmax))
  progress('аккорды', 0.45)
  // chords per half bar, then per bar where both halves agree
  const halves = []
  for (const bar of bars) {
    const mid = bar.beats[2]
    halves.push({ t: bar.t, c: avgChroma(T, 'chroma', bar.t, mid), b: avgChroma(T, 'bass', bar.t, mid) })
    halves.push({ t: mid, c: avgChroma(T, 'chroma', mid, bar.end), b: avgChroma(T, 'bass', mid, bar.end) })
  }
  let path = halves.length ? chordTrack(halves, key) : []
  // the key again, now with the harmony: the tonic chord is the one the music keeps coming home to
  if (path.length) {
    // per candidate: Krumhansl's fit, how much of the time the tonic chord sounds, phrases (every 4 bars) beginning on it,
    // phrases ending on it or on its dominant, resolutions into it from a fifth above (V → I, v → i) or a step below
    // (♭VII → i), the very last chord
    const isTonic = (ch, k) => ch.root === k.tonic && (k.mode === 'minor' ? ['m', 'm7'] : ['', 'maj7', '7']).includes(ch.q)
    const fit = k => {
      const n = path.length, bars2 = []
      for (let i = 0; i < n; i += 2) bars2.push(path[i])
      const home = path.filter(ch => isTonic(ch, k)).length / n
      const starts = bars2.filter((_, i) => i % 4 === 0), ends = bars2.filter((_, i) => i % 4 === 3)
      const st = starts.filter(ch => isTonic(ch, k)).length / (starts.length || 1)
      const en = ends.filter(ch => isTonic(ch, k) || ch.root === (k.tonic + 7) % 12).length / (ends.length || 1)
      let res = 0, moves = 0
      for (let i = 1; i < n; i++) {
        if (path[i].root === path[i - 1].root) continue
        moves++
        const from = (path[i - 1].root - k.tonic + 12) % 12
        if (isTonic(path[i], k) && (from === 7 || from === 10 || from === 11)) res++
      }
      return k.r + 0.5 * home + 0.3 * st + 0.2 * en + 0.6 * (res / (moves || 1)) + 0.15 * isTonic(path[n - 1], k)
    }
    const cands = key.ranked.slice(0, 8), best = cands.reduce((a, b) => (fit(b) > fit(a) ? b : a))
    if (best.tonic !== key.tonic || best.mode !== key.mode) {
      Object.assign(key, detectKey(key.raw, best))
      path = chordTrack(halves, key)
    }
  }
  bars.forEach((bar, i) => { bar.chords = [path[2 * i], path[2 * i + 1]].filter(Boolean).map(ch => ({ root: ch.root, q: ch.q, roman: romanOf(ch, key) })) })
  progress('ударные', 0.55)
  // drums: each bar on sixteen steps, every drum against its own loud hits (95th percentile)
  // the snare: an onset in 1.5–6 kHz that is noise (flat there) and reaches below, into the drum's body (mid band)
  const kickC = O.low, snareC = O.snr.map((v, i) => v * Math.min(1, (O.flatS[i] / 0.45) ** 2) * Math.min(1, O.mid[i] / (0.5 * O.snr[i] + 1e-9))), hatC = O.high
  const tonalC = O.mid.map((v, i) => v * Math.max(0, 1 - 2.2 * O.flat[i])) // pitched onsets: the chords' and the melody's
  const norms = [kickC, snareC, hatC, tonalC].map(c => quantile(Array.from(c), 0.985) || 1)
  for (const bar of bars) {
    const steps = { kick: [], snare: [], hat: [] }, tonal = []
    for (let s = 0; s < 16; s++) {
      const bi = Math.floor(s / 4), b = bar.beats[bi], p = (bar.beats[bi + 1] ?? bar.end) - b, frac = s % 4 === 2 ? swing : (s % 4) / 4, t = b + frac * p
      steps.kick.push(Math.min(1.5, peakNear(kickC, O.rate, t, 0.03) / norms[0]))
      steps.snare.push(Math.min(1.5, peakNear(snareC, O.rate, t, 0.03) / norms[1]))
      steps.hat.push(Math.min(1.5, peakNear(hatC, O.rate, t, 0.025) / norms[2]))
      tonal.push(Math.min(1.5, peakNear(tonalC, O.rate, t, 0.03) / norms[3]))
    }
    bar.drums = steps
    bar.tonal = tonal
    // the bass by eighths: its pitch class (the fundamental track) and how hard it is struck there
    bar.bass = []
    for (let e = 0; e < 8; e++) {
      const bi = Math.floor(e / 2), b = bar.beats[bi], p = (bar.beats[bi + 1] ?? bar.end) - b, t = b + (e % 2 ? swing : 0) * p
      const ch = avgChroma(T, 'bass', t, t + p / 2), mx = Math.max(...ch)
      bar.bass.push({ pc: mx > 0 ? ch.indexOf(mx) : null, hit: Math.min(1.5, peakNear(kickC, O.rate, t, 0.03) / norms[0]), level: mx })
    }
    // loudness and the density of onsets
    let e = 0, k = 0
    for (let i = Math.floor(bar.t * O.rate); i < Math.min(O.rms.length, Math.floor(bar.end * O.rate)); i++) { e += O.rms[i] ** 2; k++ }
    bar.rms = Math.sqrt(e / Math.max(1, k))
    bar.db = 20 * Math.log10(bar.rms + 1e-9)
    bar.drumLevel = mean(steps.kick) + mean(steps.snare) + 0.5 * mean(steps.hat)
    bar.bright = mean(Array.from(O.cent.slice(Math.floor(bar.t * O.rate), Math.floor(bar.end * O.rate))))
  }
  progress('звуки ударных', 0.6)
  const drumSound = measureDrums(x, sr, bars, O)
  progress('форма', 0.62)
  const sections = segmentForm(bars, beatChroma, downbeat)
  progress('мелодия', 0.68)
  const M = melodyPass(x, sr)
  const minSal = quantile(Array.from(M.sal), 0.35)
  const melody = segmentNotes(M, minSal)
  // clean notes: an instrument alone (the purest, longest, loudest) — the timbre's raw material, by register
  const clean = melody.filter(m => m.d >= 0.18).map(m => ({ ...m, score: m.purity * Math.min(1, m.d / 0.6) * Math.sqrt(m.sal / (minSal || 1)) }))
    .sort((a, b) => b.score - a.score).slice(0, 12)
  // the bass line's notes from the bass chroma per eighth (root, fifth, octave against the bar's chord)
  progress('готово', 1)
  return {
    duration, bpm: BT.bpm, beats, downbeat, swing, key, bars, sections, melody, clean, drumSound,
    brightness: median(Array.from(O.cent)), tempoScores: BT.tempoScores,
  }
}

// ---- the drums' own sounds: the kick's pitch and decay, the snare's body and brightness, the hats' length --------------------------
function measureDrums(x, sr, bars, O) {
  const hits = drum => {
    const out = []
    for (const bar of bars) bar.drums[drum].forEach((v, s) => { if (v > 0.7) { const bi = Math.floor(s / 4), b = bar.beats[bi], p = (bar.beats[bi + 1] ?? bar.end) - b; out.push(b + ((s % 4) / 4) * p) } })
    return out.slice(0, 60)
  }
  const kick = hits('kick'), snare = hits('snare'), hat = hits('hat')
  const res = {}
  if (kick.length >= 4) {
    // the body: the low peak 25–90 ms after the hit; the decay: how long the low band takes to fall 20 dB
    const f0s = [], decs = []
    for (const t of kick) {
      const m = spectrum(x, Math.round((t + 0.02) * sr), 2048), bin = sr / 2048
      let k = Math.round(35 / bin)
      for (let i = k; i <= Math.round(140 / bin); i++) if (m[i] > m[k]) k = i
      const a = m[k - 1], b = m[k], c = m[k + 1], d = (0.5 * (a - c)) / (a - 2 * b + c || 1)
      f0s.push((k + d) * bin)
      const i0 = Math.round(t * O.rate), e0 = O.rms[i0 + 1] || 1e-9
      let j = 1
      while (j < 60 && (O.rms[i0 + j] ?? 0) > e0 * 0.1) j++
      decs.push(j / O.rate)
    }
    res.kick = { f: Math.round(median(f0s)), decay: Math.round(1000 * median(decs)) / 1000 }
  }
  const centroidAfter = (ts, from, to) => median(ts.map(t => {
    const m = spectrum(x, Math.round((t + from) * sr), 1024), bin = sr / 1024
    let num = 0, den = 0
    for (let i = Math.round(150 / bin); i < m.length; i++) { num += i * bin * m[i]; den += m[i] }
    return den ? num / den : 0
  }))
  if (snare.length >= 4) res.snare = { bright: Math.round(centroidAfter(snare, 0.005, 0.05)) }
  if (hat.length >= 4) {
    const lens = hat.map(t => { const i0 = Math.round(t * O.rate); let j = 1; while (j < 40 && (O.high[i0 + j] ?? 0) > 0.15 * (O.high[i0] || 1e-9)) j++; return j / O.rate })
    res.hat = { len: Math.round(1000 * median(lens)) / 1000, bright: Math.round(centroidAfter(hat, 0.002, 0.03)) }
  }
  return res
}

// ---- the form: bars grouped by what plays (loudness, drums, harmony), cut on 4-bar lines -------------------------------------------
function segmentForm(bars) {
  const N = bars.length
  if (!N) return []
  const dbs = bars.map(b => b.db), top = quantile(dbs, 0.95)
  // per bar: loudness below the loud parts, how much drum, brightness
  const feat = bars.map(b => [Math.max(-30, b.db - top) / 10, Math.min(1.5, b.drumLevel), b.bright / 3000])
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
  // novelty between the 4 bars before and after each 4-bar line
  const cand = []
  for (let i = 4; i <= N - 4; i += 4) {
    const avg = (a, b) => feat.slice(a, b).reduce((s, f) => s.map((v, k) => v + f[k] / (b - a)), [0, 0, 0])
    cand.push({ i, nov: dist(avg(i - 4, i), avg(i, Math.min(N, i + 4))) })
  }
  const cuts = cand.filter(c => c.nov > 0.35).map(c => c.i)
  const edges = [0, ...cuts, N]
  // merge sections shorter than 4 bars, and split those longer than 16 at their likeliest line
  const secs = []
  for (let k = 0; k + 1 < edges.length; k++) {
    let a = edges[k], b = edges[k + 1]
    while (b - a > 16) { secs.push([a, a + 8]); a += 8 }
    secs.push([a, b])
  }
  // energy 0–3 by loudness and drums
  const out = secs.map(([a, b]) => {
    const f = feat.slice(a, b), db = mean(f.map(v => v[0])), dr = mean(f.map(v => v[1]))
    let e = db > -0.35 ? 3 : db > -0.8 ? 2 : db > -1.6 ? 1 : 0
    if (dr < 0.15) e = Math.min(e, 1)
    if (dr > 0.6 && e < 2) e = 2
    return { from: a, bars: b - a, energy: e, db, drums: dr }
  })
  // roles: intro, outro, the themes where it is loudest, bridges where it quiets in the middle
  let seenTheme = 0
  out.forEach((s, i) => {
    const last = i === out.length - 1
    if (i === 0 && s.energy <= 1) s.role = 'intro'
    else if (last && s.energy <= 1) s.role = 'outro'
    else if (s.energy <= 1) s.role = i > out.length / 2 ? 'break' : 'bridge'
    else if (s.energy === 3 && i > out.length / 2) s.role = 'final'
    else s.role = seenTheme++ % 2 ? 'themeB' : 'theme'
  })
  return out
}
// (the passes one by one, for probes and tuning)
export const _internal = { onsetPass, beatTrack, steadyGrid, tonalPass, melodyPass, segmentNotes }
