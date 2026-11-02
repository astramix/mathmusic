// An instrument measured from a recording: the notes it plays alone → a model resynthTone (src/instruments.js) plays at
// any pitch. Per note: the partials (their ratios — inharmonic ones too —, levels, attacks, decays, sustain), the noise
// beside them (breath, bow, hammer: its level, centre, how fast it dies), vibrato, the scoop into the note, the release.
// Several notes at different pitches give the spectral envelope (formants stay in Hz) and the decay against frequency.
//
//   extractTimbre(samples, sr, notes: [{ t, d, n }]) → model | null      (n: the MIDI note, roughly; t, d in seconds)

import { spectrum } from './analyze.js'

export const NOISE_BANDS = [212, 424, 849, 1697, 3394, 6788, 13576]
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const r3 = v => (Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 1 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000)
const hz = n => 440 * 2 ** ((n - 69) / 12)

// the peak near frequency F in a magnitude spectrum: its interpolated frequency and level
function peakAt(m, F, bin, width) {
  const lo = Math.max(1, Math.floor((F * (1 - width)) / bin)), hi = Math.min(m.length - 2, Math.ceil((F * (1 + width)) / bin))
  let k = lo
  for (let i = lo; i <= hi; i++) if (m[i] > m[k]) k = i
  const a = m[k - 1], b = m[k], c = m[k + 1], den = a - 2 * b + c, d = den ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0
  return { f: (k + d) * bin, a: b - 0.25 * (a - c) * d, k }
}

// one note → its measurements, or null when it is not clean enough
export function measureNote(x, sr, { t, d, n }) {
  const f0g = hz(n), N = f0g < 110 ? 16384 : f0g < 220 ? 8192 : 4096, bin = sr / N, hop = Math.round(sr * 0.01)
  const win = N / 2 // the window's centre is its time
  // the onset: the steepest rise of a short RMS within ±60 ms of the given start
  const s0 = Math.round(t * sr), short = Math.round(sr * 0.003)
  const rmsAt = i => { let e = 0; for (let j = i; j < i + short; j++) e += (x[j] ?? 0) ** 2; return Math.sqrt(e / short) }
  let onset = s0, rise = -Infinity
  for (let i = s0 - Math.round(0.06 * sr); i < s0 + Math.round(0.06 * sr); i += short) { const r = rmsAt(i + short) - rmsAt(i - short); if (r > rise) (rise = r), (onset = i) }
  // the global amplitude envelope at 3 ms: the attack time (10 % → 90 % of the peak)
  const envT = [], len = Math.round((d + 0.6) * sr)
  for (let i = onset; i < onset + len; i += short) envT.push(rmsAt(i))
  const peakI = envT.slice(0, Math.max(2, Math.round(Math.min(d, 0.5) / 0.003))).reduce((b, v, i, a) => (v > a[b] ? i : b), 0), peak = envT[peakI] || 1e-9
  const i10 = envT.findIndex(v => v >= 0.1 * peak), i90 = envT.findIndex(v => v >= 0.9 * peak)
  const attack = Math.max(0.001, (i90 - Math.max(0, i10)) * 0.003)
  // f0, exactly: the harmonics in a window over the steady part, each k·f0 → f0 by their weighted mean
  const steady = onset + Math.round(Math.min(0.12, d * 0.3) * sr)
  const M0 = spectrum(x, steady - win / 2, N)
  let f0 = f0g
  { let sw = 0, sf = 0; for (let k = 1; k <= 6; k++) { const p = peakAt(M0, k * f0g, bin, 0.03); sw += p.a; sf += (p.f / k) * p.a } if (sw) f0 = sf / sw }
  if (Math.abs(12 * Math.log2(f0 / f0g)) > 0.8) return null // another note sounds louder: not this one
  // inharmonicity of a string: f_k = k·f0·√(1 + B k²), fitted over the clear harmonics (shown in the model, informative)
  let num = 0, den = 0
  for (let k = 2; k <= 24 && k * f0 < 0.45 * sr; k++) {
    const p = peakAt(M0, k * f0, bin, 0.025), e = (p.f / (k * f0)) ** 2 - 1
    if (p.a > 0.02 * M0[Math.round(f0 / bin)]) { num += e * k * k * p.a; den += k ** 4 * p.a }
  }
  const B = den ? Math.max(0, Math.min(0.002, num / den)) : 0
  // the partials: peaks of the note's early spectrum (harmonic or not — a bell's, an FM tone's sidebands), each at least
  // 6 dB above what sounded just before the onset (a previous note still ringing is not this note), the 32 loudest
  const early = spectrum(x, onset + Math.round(0.025 * sr) - win / 2 + Math.round(N / 4), N), before = spectrum(x, onset - Math.round(0.01 * sr) - N, N)
  let top = 0
  for (let i = 1; i < early.length - 1; i++) top = Math.max(top, early[i])
  const peaks = []
  for (let i = 2; i < early.length - 2; i++) {
    const F = i * bin
    if (F < 0.45 * f0 || F > Math.min(16000, 0.45 * sr)) continue
    if (!(early[i] > early[i - 1] && early[i] >= early[i + 1] && early[i] > early[i - 2] && early[i] >= early[i + 2])) continue
    if (early[i] < top * 10 ** (-60 / 20)) continue
    const pre = Math.max(before[i - 1], before[i], before[i + 1])
    if (early[i] < 2 * pre) continue
    const pk = peakAt(early, F, bin, 1.5 * bin / F)
    peaks.push({ f: pk.f, a: pk.a })
  }
  peaks.sort((p, q) => q.a - p.a)
  const chosen = []
  // a weak peak counts only on a harmonic (between them it is breath, a vibrato's smear or another sound)
  const harmonic = F => { const h = Math.round(F / f0); return h >= 1 && Math.abs(F / (h * f0 * Math.sqrt(1 + B * h * h)) - 1) < 0.015 }
  for (const pk of peaks) if (chosen.length < 32 && !chosen.some(c => Math.abs(c.f - pk.f) < 3 * bin) && (pk.a > 0.03 * top || harmonic(pk.f))) chosen.push(pk)
  // the fundamental's own peak always (a quiet first partial still defines the note)
  if (!chosen.some(c => Math.abs(c.f - f0) < 3 * bin)) chosen.push({ f: f0, a: peakAt(early, f0, bin, 0.02).a })
  chosen.sort((p, q) => p.f - q.f)
  const K = chosen.length, frames = Math.max(4, Math.round((d + 0.35) / 0.01))
  const amps = Array.from({ length: K }, () => new Float64Array(frames)), freqs = chosen.map(c => c.f)
  const noiseB = Array.from({ length: frames }, () => new Float64Array(NOISE_BANDS.length)), harmE = new Float64Array(frames), f0track = new Float64Array(frames)
  const iF0 = chosen.reduce((b, c, i) => (Math.abs(c.f - f0) < Math.abs(chosen[b].f - f0) ? i : b), 0)
  for (let fr = 0; fr < frames; fr++) {
    const c = onset + fr * hop, m = spectrum(x, c - win / 2, N), taken = new Uint8Array(m.length)
    let he = 0, wf = 0, sf = 0
    for (let k = 0; k < K; k++) {
      const p = peakAt(m, freqs[k], bin, Math.max(1.5 * bin, 0.012 * freqs[k]) / freqs[k])
      amps[k][fr] = p.a
      he += p.a * p.a
      for (let j = Math.max(0, p.k - 4); j <= Math.min(m.length - 1, p.k + 4); j++) taken[j] = 1
      // the pitch track from the partials that are harmonics 1–4
      const h = Math.round(freqs[k] / f0)
      if (h >= 1 && h <= 4 && Math.abs(freqs[k] / f0 - h) < 0.03 && p.a > 0) { wf += p.a; sf += (p.f / h) * p.a }
    }
    f0track[fr] = wf ? sf / wf : f0
    // the noise in octave bands: the power between the partials (each band's median bin × its width: robust to leakage)
    NOISE_BANDS.forEach((fc, b) => {
      const lo = Math.max(1, Math.round(fc / Math.SQRT2 / bin)), hi = Math.min(m.length - 1, Math.round((fc * Math.SQRT2) / bin)), free = []
      for (let i = lo; i <= hi; i++) if (!taken[i]) free.push(m[i] * m[i])
      noiseB[fr][b] = free.length >= 2 ? median(free) * (hi - lo + 1) : 0
    })
    harmE[fr] = he
  }
  const noteF = Math.max(2, Math.round(d / 0.01))
  // a partial: its peak, the time to it, its decay rate (log-linear fit after the peak), what stays (sustain)
  const parts = []
  const ref = Math.max(...amps[iF0]) || Math.max(...amps.map(a => Math.max(...a))) || 1e-9
  for (let k = 0; k < K; k++) {
    const a = amps[k], pk = a.slice(0, Math.max(2, Math.min(noteF, 30))).reduce((b, v, i, arr) => (v > arr[b] ? i : b), 0), A = a[pk]
    if (A < 1e-7) continue
    const xs = [], ys = []
    for (let i = pk; i < noteF && i < pk + 120; i++) { if (a[i] < A * 0.003) break; xs.push(i * 0.01); ys.push(Math.log(a[i] + 1e-12)) }
    let dec = 0
    if (xs.length >= 3) {
      const mx = mean(xs), my = mean(ys)
      let sxy = 0, sxx = 0
      for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2 }
      dec = Math.max(0, -sxy / (sxx || 1))
    }
    const sus = noteF > 12 ? median(Array.from(a.slice(Math.round(noteF * 0.45), Math.round(noteF * 0.9)))) / A : 0
    parts.push({ k: k + 1, r: freqs[k] / f0, a: A / ref, at: Math.max(attack, pk * 0.01 * 0.5), dec, sus: Math.min(1, sus) })
  }
  if (parts.length < 2) return null
  // the whole note: struck (dies away) or sustained (holds)
  const tot = Array.from(harmE, Math.sqrt), totPk = Math.max(...tot.slice(0, noteF)) || 1e-9
  const holdRatio = noteF > 12 ? median(tot.slice(Math.round(noteF * 0.45), Math.round(noteF * 0.9))) / totPk : 0.5
  const kind = holdRatio < 0.35 ? 'struck' : 'sustained'
  // the release: how fast it dies after the note's end
  const endE = tot[noteF - 1] || 1e-9, after = tot.slice(noteF, noteF + 30)
  const k10 = after.findIndex(v => v < endE * 0.1)
  const release = k10 > 0 ? Math.max(0.03, k10 * 0.01 / 2.3) : 0.25
  // vibrato and scoop: cents of the f0 track against the note's own pitch
  const cents = Array.from(f0track.slice(0, noteF), v => 1200 * Math.log2(v / f0))
  const settle = Math.min(noteF - 1, 8)
  const scoop = Math.max(-150, Math.min(60, median(cents.slice(0, 3)) - median(cents.slice(settle))))
  let vib = null
  if (noteF > 40 && kind === 'sustained') {
    const body = cents.slice(20)
    const mu = mean(body), dev = body.map(v => v - mu)
    let zc = 0
    for (let i = 1; i < dev.length; i++) if ((dev[i - 1] < 0) !== (dev[i] < 0)) zc++
    const rate = zc / 2 / (dev.length * 0.01), depth = Math.sqrt(mean(dev.map(v => v * v))) * Math.SQRT2
    if (rate > 3 && rate < 9 && depth > 4 && depth < 120) {
      // the delay: when the swing first reaches half its depth
      const iDelay = cents.findIndex((v, i) => i > settle && Math.abs(v - mu) > depth / 2)
      vib = { rate, depth, delay: Math.max(0, iDelay * 0.01) }
    }
  }
  // noise against the partials' peak power, per band: what stays while held (sustained sounds only), what comes on top in
  // the first 30 ms, and how fast that burst dies (a Hann window's noise bins add up to 1.5× what a sine's peak shows for
  // the same power, hence the 1.5)
  const hPk = Math.max(...Array.from(harmE.slice(0, Math.max(3, Math.min(noteF, 30))))) || 1e-12
  const bandAt = (fr, b) => noiseB[Math.min(frames - 1, fr)][b]
  const held = Array.from({ length: Math.max(1, noteF - Math.round(noteF * 0.3)) }, (_, i) => Math.round(noteF * 0.3) + i)
  const sus = NOISE_BANDS.map((_, b) => median(held.map(fr => bandAt(fr, b))))
  const atk = NOISE_BANDS.map((_, b) => Math.max(0, mean([0, 1, 2].map(fr => bandAt(fr, b))) - sus[b]))
  const totA = atk.reduce((s, v) => s + v, 0) || 1e-12, curve = Array.from({ length: Math.min(frames, 30) }, (_, fr) => NOISE_BANDS.reduce((s, _, b) => s + Math.max(0, bandAt(fr, b) - sus[b]), 0))
  const iN = curve.findIndex(v => v < 0.1 * (curve[0] || totA))
  const noise = {
    atk: atk.map(v => Math.min(1, Math.sqrt(v / (1.5 * hPk)))),
    sus: sus.map(v => (kind === 'sustained' ? Math.min(0.5, Math.sqrt(v / (1.5 * hPk))) : 0)),
    dec: iN > 0 ? Math.max(0.005, (iN * 0.01) / 2.3) : 0.02,
  }
  return { f0, n: 69 + 12 * Math.log2(f0 / 440), B, kind, attack, release, holdRatio, parts, vib, scoop, noise, d }
}

// interpolation in log frequency over [[F, v]] (sorted by F), held flat outside
export function lerpLogF(pts, F) {
  if (!pts.length) return 0
  if (F <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) if (F <= pts[i][0]) { const u = Math.log(F / pts[i - 1][0]) / Math.log(pts[i][0] / pts[i - 1][0]); return pts[i - 1][1] * (1 - u) + pts[i][1] * u }
  return pts[pts.length - 1][1]
}

// several notes → one model: the reference note's partials, the spectral envelope and the decays over frequency from all
export function extractTimbre(x, sr, notes, { name = 'timbre' } = {}) {
  const ms = notes.map(nt => { try { return measureNote(x, sr, nt) } catch { return null } }).filter(Boolean)
  if (!ms.length) return null
  const kinds = ms.map(m => m.kind), kind = kinds.filter(k => k === 'struck').length > kinds.length / 2 ? 'struck' : 'sustained'
  const same = ms.filter(m => m.kind === kind)
  // the reference: the note nearest the middle of the range, the longest among them
  const midN = median(same.map(m => m.n)), refM = same.reduce((a, m) => (Math.abs(m.n - midN) - m.d < Math.abs(a.n - midN) - a.d ? m : a))
  // levels of each partial in dB against the fundamental, from every note, by its frequency → the spectral envelope
  const envA = [], envD = []
  for (const m of same) for (const p of m.parts.filter(q => q.a > 0.01 * Math.max(...m.parts.map(r => r.a)))) {
    envA.push([p.r * m.f0, 20 * Math.log10(p.a + 1e-9)])
    if (p.dec > 0) envD.push([p.r * m.f0, Math.log(p.dec)])
  }
  const smoothPts = (pts, bands = 24) => {
    // averaged in third-octave-ish bands so that one loud wrong peak does not decide
    pts.sort((a, b) => a[0] - b[0])
    if (pts.length < 3) return pts
    const lo = Math.log2(pts[0][0]), hi = Math.log2(pts[pts.length - 1][0]), step = Math.max(1 / 3, (hi - lo) / bands), out = []
    for (let b = lo; b <= hi + 1e-9; b += step) {
      const inB = pts.filter(([F]) => Math.log2(F) >= b && Math.log2(F) < b + step)
      if (inB.length) out.push([2 ** mean(inB.map(p => Math.log2(p[0]))), median(inB.map(p => p[1]))])
    }
    return out
  }
  const fa = smoothPts(envA), fd = smoothPts(envD)
  // how to carry the spectrum to another pitch: by partial number (a synth, a clean wind: the same recipe at every
  // pitch) or by frequency (a body's or a voice's resonances stay in Hz) — whichever predicts the measured notes better
  const dB = v => 20 * Math.log10(v + 1e-9)
  let eR = 0, eF = 0, cnt = 0
  for (const m of same) {
    if (m === refM) continue
    for (const p of m.parts) {
      const q = refM.parts.find(r => Math.abs(r.r / p.r - 1) < 0.02)
      if (!q || p.a < 0.003) continue
      eR += Math.abs(dB(p.a) - dB(q.a)); eF += Math.abs(dB(p.a) - lerpLogF(fa, p.r * m.f0)); cnt++
    }
  }
  const wF = cnt ? Math.max(0, Math.min(1, eR / (eR + eF + 1e-9))) : 0.3
  const vibs = same.map(m => m.vib).filter(Boolean)
  const model = {
    name, kind, f0: r3(refM.f0), B: r3(refM.B), wF: r3(wF),
    // partials of the reference note: [ratio, level, attack s, decay /s, sustain]
    p: refM.parts.filter(p => p.a > 0.0005).slice(0, 32).map(p => [r3(p.r), r3(p.a), r3(p.at), r3(p.dec), r3(p.sus)]),
    fa: fa.map(([F, v]) => [Math.round(F), r3(v)]), fd: fd.map(([F, v]) => [Math.round(F), r3(Math.exp(v))]),
    attack: r3(median(same.map(m => m.attack))), release: r3(median(same.map(m => m.release))),
    vib: vibs.length ? { rate: r3(median(vibs.map(v => v.rate))), depth: r3(median(vibs.map(v => v.depth))), delay: r3(median(vibs.map(v => v.delay))) } : null,
    scoop: r3(median(same.map(m => m.scoop))),
    noise: { atk: NOISE_BANDS.map((_, b) => r3(median(same.map(m => m.noise.atk[b])))), sus: NOISE_BANDS.map((_, b) => r3(median(same.map(m => m.noise.sus[b])))), dec: r3(median(same.map(m => m.noise.dec))) },
    range: [Math.round(Math.min(...same.map(m => m.n))), Math.round(Math.max(...same.map(m => m.n)))],
    notes: same.length,
  }
  if (kind === 'sustained') for (const p of model.p) if (p[4] < 0.05) p[4] = 0.05
  return model
}

// the RMS of a resynthesised note held 0.9 s (velocity 0.8), as resynthTone plays it — computed, not rendered (the
// app cannot load the engine): each partial's mean square under its envelope, the noise bands' power on top
export function loudnessOf(M, vel = 0.8) {
  const T = 1.2, dt = 0.002, held = 0.9, rel = Math.max(0.01, M.release ?? 0.2)
  let norm = 0, ms = 0, pk = 0
  for (const [, a] of M.p) norm += a
  for (let k = 0; k < M.p.length; k++) {
    const [, a, at, dec, sus] = M.p[k], amp = a // (velocity 0.8: the brightness factor is 1)
    pk += (amp * amp) / 2
    let e2 = 0
    for (let t = 0; t < T; t += dt) {
      const env = Math.min(1, t / Math.max(0.0005, at)) * (sus + (1 - sus) * Math.exp(-dec * t)) * (t > held ? Math.exp(-(t - held) / rel) : 1)
      e2 += env * env * dt
    }
    ms += ((amp * amp) / 2) * (e2 / T)
  }
  const sus = (M.noise?.sus ?? []).reduce((s, v) => s + v * v, 0)
  ms += pk * sus * (held / T)
  return (vel / Math.max(1, Math.sqrt(norm))) * Math.sqrt(ms) || 1e-4
}
