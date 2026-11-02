// A style made from a recording: src/analyze.js listens, this turns what it heard into a STYLES entry the generator plays
// (generate({ styleDef })) — tempo, swing, key and mode, the harmony's loops as two themes of our own (the recording's
// melodic rhythm, new notes on its chords: in its spirit, not a copy), the form, the drums' patterns and their measured
// sounds, the comping and bass rhythms, a palette of instruments from the nearest of our plain styles, and instruments
// resynthesised from the notes it plays alone (src/timbre.js) for the lead, the bass and the keys.
//
//   styleFromAudio(samples, sr, { name, regions: { lead|bass|keys: [from s, to s] }, progress }) → { style, analysis, timbres, report }

import { analyzeAudio, spectrum, romanOf } from './analyze.js'
import { extractTimbre, loudnessOf } from './timbre.js'
import { compose, STYLES } from './generate.js'
import { roman, keyName, parseKey } from './theory.js'
import { MELODIES } from './melodies.js'

const PCN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const median = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
// a deterministic generator for the few choices here (no Math.random anywhere)
const rngOf = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

// our plain styles as palettes: how bright, how swung, how much drum, how fast — the nearest gives the accompaniment
const PALETTES = {
  // (brightness: the median spectral centroid below 11 kHz — our own songs measure 1300 … 2200 Hz)
  lofi: { bright: 1300, swing: 0.6, drums: 0.55, bpm: 80 },
  bossa: { bright: 1550, swing: 0.5, drums: 0.45, bpm: 125 },
  jazz: { bright: 1550, swing: 0.66, drums: 0.55, bpm: 140 },
  synthwave: { bright: 1950, swing: 0.5, drums: 0.9, bpm: 105 },
  chiptune: { bright: 2200, swing: 0.5, drums: 0.85, bpm: 150 },
  kawaii: { bright: 2100, swing: 0.5, drums: 1, bpm: 168 },
  space: { bright: 1600, swing: 0.5, drums: 0.3, bpm: 92 },
  classical: { bright: 1450, swing: 0.5, drums: 0.08, bpm: 90 },
  romantic: { bright: 1300, swing: 0.5, drums: 0.12, bpm: 76 },
  celtic: { bright: 1700, swing: 0.5, drums: 0.45, bpm: 112 },
}
function nearestPalette({ bright, swing, drums, bpm }) {
  let best = 'lofi', bd = Infinity
  for (const [id, p] of Object.entries(PALETTES)) {
    if (!STYLES[id]) continue
    const d = (Math.log2(bright / p.bright) / 0.25) ** 2 + ((swing - p.swing) / 0.06) ** 2 + ((drums - p.drums) / 0.3) ** 2 + (Math.log2(bpm / p.bpm) / 0.5) ** 2
    if (d < bd) (bd = d), (best = id)
  }
  return best
}

// the Roman numeral as theory.roman reads it, checked: its root must be the chord's (else a plain triad on the degree)
function checkedRoman(sym, root, key) {
  try { const r = roman(sym, key); if (r && ((r.root % 12) + 12) % 12 === root) return sym } catch {}
  const plain = sym.replace(/(maj7|7|°|sus4)$/, '')
  try { const r = roman(plain, key); if (r && ((r.root % 12) + 12) % 12 === root) return plain } catch {}
  return key.mode === 'minor' ? 'i' : 'I'
}

// beats ⇄ seconds on the analysed grid
const beatOf = (beats, t) => {
  if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0])
  for (let i = 1; i < beats.length; i++) if (t < beats[i]) return i - 1 + (t - beats[i - 1]) / (beats[i] - beats[i - 1])
  return beats.length - 1 + (t - beats[beats.length - 1]) / (beats[beats.length - 1] - beats[beats.length - 2])
}

// notes a solo instrument plays in [from, to): its pitch by harmonic summation every 10 ms, steady stretches → notes
export function trackNotes(x, sr, from, to, lo = 36, hi = 96) {
  const N = 4096, hop = Math.round(sr * 0.01), bin = sr / N, out = []
  const cands = []
  for (let q = lo * 4; q <= hi * 4; q++) cands.push(440 * 2 ** ((q / 4 - 69) / 12))
  let cur = null
  for (let s = Math.round(from * sr); s < Math.round(to * sr) - N; s += hop) {
    const m = spectrum(x, s, N)
    let best = 0, arg = 0, tot = 0
    for (let i = 1; i < m.length; i++) tot += m[i]
    for (let c = 0; c < cands.length; c++) {
      let v = 0
      for (let h = 1; h <= 6; h++) { const i = Math.round((cands[c] * h) / bin); if (i >= m.length) break; v += m[i] / h ** 0.5 }
      const i0 = Math.round(cands[c] / bin)
      if (m[i0] < 0.1 * v / 3) v *= 0.3 // its fundamental must sound
      if (v > best) (best = v), (arg = c)
    }
    const n = lo + arg / 4, t = (s + N / 2) / sr, ok = best > 0.02 * tot
    if (cur && ok && Math.abs(n - cur.ns[cur.ns.length - 1]) < 0.6) { cur.ns.push(n); cur.e = t; continue }
    if (cur && cur.e - cur.t > 0.12) out.push({ t: cur.t, d: cur.e - cur.t, n: Math.round(median(cur.ns)) })
    cur = ok ? { t, e: t, ns: [n] } : null
  }
  if (cur && cur.e - cur.t > 0.12) out.push({ t: cur.t, d: cur.e - cur.t, n: Math.round(median(cur.ns)) })
  return out
}
// up to six notes of different pitches, the longest first
const varied = (notes, k = 6) => {
  const pick = []
  for (const m of [...notes].sort((a, b) => b.d - a.d)) if (pick.length < k && !pick.some(p => Math.abs(p.n - m.n) < 2)) pick.push(m)
  return pick
}

// every groove of our plain styles, as vectors (x 1, o 0.5) for matching; a rim or a clap counts as the backbeat
const vec = s => Array.from({ length: 16 }, (_, i) => (s?.[i] === 'x' ? 1 : s?.[i] === 'o' ? 0.5 : 0))
const GROOVE_LIB = []
for (const S of Object.values(STYLES)) {
  if (S.stage || S.club || S.hard || !S.drums) continue
  if (S === STYLES.meow) continue // (its "drums" are paws and a hiss)
  for (const k of ['light', 'full', 'busy']) {
    const g = S.drums[k]
    if (!g || !/x/.test(g.kick ?? '')) continue
    const groove = Object.fromEntries(Object.entries(g).filter(([d]) => ['kick', 'snare', 'hat', 'open', 'rim'].includes(d)).concat(g.clap && !g.snare ? [['snare', g.clap]] : []))
    GROOVE_LIB.push({ groove, kick: vec(g.kick), snare: vec(g.snare ?? g.clap ?? g.rim), hat: vec(g.hat ?? g.ride ?? g.shaker) })
  }
}
const corr = (a, b) => {
  const ma = mean(a), mb = mean(b)
  let s = 0, sa = 0, sb = 0
  for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2 }
  return sa && sb ? s / Math.sqrt(sa * sb) : 0
}

// how alike two step patterns are: their shape (correlation) and their density (cosine)
const sim = (a, b) => {
  let ab = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i] }
  return 0.5 * corr(a, b) + 0.5 * (aa && bb ? ab / Math.sqrt(aa * bb) : 0)
}

export const PALETTE_IDS = Object.keys(PALETTES)

const ROLE_RU = { intro: 'вступление', theme: 'тема', themeB: 'тема II', bridge: 'мост', break: 'брейк', solo: 'соло', final: 'финал', outro: 'кода', build: 'разгон' }

export function styleFromAudio(samples, sr, { progress = () => {}, ...opts } = {}) {
  const A = analyzeAudio(samples, sr, { progress: (s, u) => progress(s, 0.8 * u) })
  return buildStyle(A, samples, sr, { progress, ...opts })
}
// the style from an analysis (quick: the dialog calls it again when the key, the palette or a solo region changes);
// key: 'F#m' to override the one heard, palette: one of our plain styles' ids
export function buildStyle(A0, samples, sr, { name = 'audio', regions = {}, key: forceKey = null, palette = null, progress = () => {} } = {}) {
  let A = A0
  if (forceKey) {
    // another tonic: the chords' numerals again in it
    const k = parseKey(forceKey)
    A = { ...A0, key: { ...A0.key, tonic: Math.round(k.tonic) % 12, mode: k.mode, modal: null }, bars: A0.bars.map(b => ({ ...b, chords: b.chords.map(c => ({ ...c, roman: romanOf(c, k) })) })) }
  }
  const key = { tonic: A.key.tonic, mode: A.key.mode }, kName = keyName(key)
  const slug = (name.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'audio').slice(0, 24)
  const id = 'audio-' + slug, r = rngOf(A.bars.length * 7919 + A.bpm * 13)
  const report = []

  // ---- the harmony's loops → two themes ------------------------------------------------------------------------------
  progress('темы', 0.82)
  const halvesDiffer = A.bars.filter(b => b.chords.length === 2 && b.chords[0].roman !== b.chords[1].roman).length > A.bars.length * 0.3
  const sym = c => checkedRoman(c.roman, c.root, key)
  const seqAt = i => {
    const bars = A.bars.slice(i, i + 4)
    if (bars.length < 4) return null
    return halvesDiffer ? bars.flatMap(b => b.chords.map(sym)) : bars.map(b => sym(b.chords[0]))
  }
  const counts = new Map(), firstAt = new Map()
  const starts = new Set([0, ...A.sections.map(s => s.from)])
  for (const s0 of starts) for (let i = s0; i + 4 <= A.bars.length; i += 4) {
    const s = seqAt(i)
    if (!s) continue
    const k = s.join(' ')
    counts.set(k, (counts.get(k) ?? 0) + (A.bars[i].db > -60 ? 1 : 0.5))
    if (!firstAt.has(k)) firstAt.set(k, i)
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const progA = ranked[0]?.split(' ') ?? (key.mode === 'minor' ? ['i', 'VI', 'III', 'VII'] : ['I', 'V', 'vi', 'IV'])
  const progB = ranked.find(k => k !== ranked[0] && new Set(k.split(' ')).size > 1)?.split(' ') ?? progA
  const per = halvesDiffer ? 2 : 4
  // the melodic rhythm of the recording: the melody's notes in a theme section's first four bars, on a sixteenth grid
  const rhythmAt = barIndex => {
    const t0 = A.bars[barIndex]?.t, t1 = A.bars[barIndex + 4]?.t ?? A.bars[barIndex + 3]?.end
    if (t0 == null || t1 == null) return null
    const b0 = beatOf(A.beats, t0), out = []
    for (const m of A.melody) {
      if (m.t < t0 || m.t >= t1) continue
      const b = Math.round(4 * (beatOf(A.beats, m.t) - b0)) / 4, d = Math.max(0.25, Math.round(4 * (beatOf(A.beats, m.t + m.d) - beatOf(A.beats, m.t))) / 4)
      if (b < 0 || b >= 16) continue
      if (out.length && out[out.length - 1][0] === b) continue
      out.push([b, Math.min(d, 16 - b)])
    }
    for (let i = 0; i + 1 < out.length; i++) out[i][1] = Math.min(out[i][1], out[i + 1][0] - out[i][0])
    return out.length >= 5 ? out : null
  }
  const themeSecs = A.sections.filter(s => s.role === 'theme' || s.role === 'final' || s.role === 'themeB')
  const melodyMid = median(A.melody.map(m => m.n)) || 72
  const baseMidi = 60 + key.tonic + (key.tonic > 6 ? -12 : 0) + (melodyMid > 76 ? 12 : 0)
  const libRhythm = () => { const m = MELODIES.find(x => x.per === 4 && x.notes.length >= 8) ?? MELODIES[0]; return m.notes.filter(([b]) => b < 16).map(([b, , d]) => [b, Math.min(d, 16 - b)]) }
  const makeTheme = (prog, secIdx, tag) => {
    const sec = themeSecs[secIdx] ?? themeSecs[0]
    const rhythm = (sec && rhythmAt(sec.from)) || libRhythm()
    const chords = prog.map(s => roman(s, key)), chordAt = b => chords[Math.floor(b / per) % chords.length]
    const lo = Math.round(melodyMid) - 7, hi = Math.round(melodyMid) + 7
    const notes = compose({ rhythm, chordAt, key, lo: Math.max(55, lo), hi: Math.min(88, hi), r })
    return {
      id: `${id}-${tag}`, from: id, title: `${name} (${tag === 'a' ? 'тема' : 'вторая тема'})`, key: kName, base: `${PCN[baseMidi % 12]}${Math.floor(baseMidi / 12) - 1}`,
      feel: 'straight', per, modal: false, only: id, moods: ['audio'], chords: prog,
      notes: notes.map(([b, n, d]) => [b, n - baseMidi, d]),
    }
  }
  const themeA = makeTheme(progA, 0, 'a'), themeB = makeTheme(progB, 1, 'b')
  report.push(`гармония: ${progA.join(' – ')}${progB !== progA ? ' · ' + progB.join(' – ') : ''}`)

  // ---- form ------------------------------------------------------------------------------------------------------------
  const seen = {}
  const form = A.sections.map(s => {
    const k = (seen[s.role] = (seen[s.role] ?? 0) + 1)
    return [k > 1 ? `${ROLE_RU[s.role]} ${k}` : ROLE_RU[s.role], Math.max(4, Math.round(s.bars / 4) * 4), s.role, s.energy]
  })
  if (!form.some(f => ['theme', 'final'].includes(f[2]))) form.splice(Math.min(1, form.length), 0, ['тема', 8, 'theme', 2])
  // a second form with a solo where the recording repeats a theme
  const form2 = form.map(f => [...f])
  const rep = form2.findIndex((f, i) => i > 1 && (f[2] === 'theme' || f[2] === 'themeB') && f[3] >= 2)
  if (rep > 0) form2[rep] = ['соло', form2[rep][1], 'solo', form2[rep][3]]

  // ---- drums: the patterns by energy, a fill from the bars before a change ---------------------------------------------------
  const secOfBar = b => A.sections.find(s => b >= s.from && b < s.from + s.bars)
  const byEnergy = e => A.bars.filter((_, i) => secOfBar(i)?.energy === e)
  const groove = bars => {
    if (!bars.length) return null
    const avg = d => Array.from({ length: 16 }, (_, s) => mean(bars.map(b => b.drums[d][s])))
    const K = avg('kick'), Sraw = avg('snare'), Hraw = avg('hat')
    // the kick's click leaks into the snare's and the hats' bands: the leak is the least ratio over the steps where the kick
    // is strong (some of them have no snare), taken away
    const leak = X => { const strong = K.map((v, s) => [v, s]).filter(([v]) => v >= 0.6 * Math.max(...K)); return strong.length ? Math.min(...strong.map(([v, s]) => X[s] / (v || 1))) : 0 }
    const S = Sraw.map((v, s) => Math.max(0, v - leak(Sraw) * K[s])), H = Hraw.map((v, s) => Math.max(0, v - 0.5 * leak(Hraw) * K[s]))
    // a plain transcription of a dense mix is unreliable: the nearest of our styles' grooves (correlation per drum, the
    // kick and the backbeat counting most) is played, so the pattern is always a drummer's
    if (Math.max(...K, ...S, ...H) < 0.25) return null
    let best = null, bs = -Infinity
    for (const t of GROOVE_LIB) {
      const s = sim(K, t.kick) + sim(S, t.snare) + 0.6 * sim(H, t.hat)
      if (s > bs) (bs = s), (best = t)
    }
    return best ? { ...best.groove } : null
  }
  const G = [0, 1, 2, 3].map(e => groove(byEnergy(e)))
  const pickG = e => G[e] ?? G[e + 1] ?? G[e - 1] ?? G[2] ?? G[3] ?? G[1]
  const drums = { light: pickG(1) ?? {}, full: pickG(2) ?? {}, busy: pickG(3) ?? pickG(2) ?? {} }
  const endBars = A.sections.slice(0, -1).map(s => A.bars[s.from + s.bars - 1]).filter(b => b && secOfBar(A.bars.indexOf(b))?.energy >= 2)
  const fillG = groove(endBars)
  if (fillG?.snare && fillG.snare !== drums.full.snare) drums.fill = { snare: fillG.snare }
  const drumAmount = Math.min(1, mean(A.bars.map(b => b.drumLevel)) / 1.2)
  report.push(`ударные: ${Object.entries(drums.full).map(([d, s]) => `${d} ${s}`).join(' · ') || 'нет'}`)

  // ---- comping and bass rhythms -------------------------------------------------------------------------------------------
  const comp = {}
  for (let e = 0; e <= 3; e++) {
    const bars = byEnergy(e).length ? byEnergy(e) : byEnergy(2).length ? byEnergy(2) : A.bars
    const avg = Array.from({ length: 16 }, (_, s) => mean(bars.map(b => b.tonal[s])))
    const top = Math.max(...avg) || 1, pos = []
    avg.forEach((v, s) => { if (v >= 0.55 * top && v > 0.2) pos.push(s) })
    if (!pos.length || pos[0] !== 0) pos.unshift(0)
    comp[e] = pos.map((s, i) => [s / 4, Math.round((0.45 + 0.3 * Math.min(1, avg[s] / top)) * 100) / 100, Math.max(0.25, ((pos[i + 1] ?? 16) - s) / 4 - 0.1)])
  }
  const busyBars = A.bars.filter((_, i) => (secOfBar(i)?.energy ?? 0) >= 2)
  const bassBars = busyBars.length ? busyBars : A.bars
  const slots = Array.from({ length: 8 }, (_, e) => {
    const hit = mean(bassBars.map(b => b.bass[e].hit)), rel = bassBars.map(b => (b.bass[e].pc == null ? null : (b.bass[e].pc - (b.chords[e < 4 ? 0 : b.chords.length - 1]?.root ?? key.tonic) + 12) % 12)).filter(v => v != null)
    const counts = {}
    for (const v of rel) counts[v] = (counts[v] ?? 0) + 1
    const top = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return { hit, sym: top === 7 ? '5' : top === 3 || top === 4 ? '3' : 'R' }
  })
  const hitPos = slots.map((s, e) => (e === 0 || s.hit > 0.35 ? e : -1)).filter(e => e >= 0)
  const bassline = hitPos.map((e, i) => [e / 2, slots[e].sym, Math.round((((hitPos[i + 1] ?? 8) - e) / 2) * 0.9 * 100) / 100])

  // ---- instruments: the palette, and timbres from the recording ---------------------------------------------------------------
  progress('тембры', 0.86)
  const paletteId = palette && STYLES[palette] ? palette : nearestPalette({ bright: A.brightness, swing: A.swing, drums: drumAmount, bpm: A.bpm })
  const P = STYLES[paletteId]
  const timbres = {}
  const tryTimbre = (role, notes, minPurity) => {
    if (!notes.length) return
    const M = extractTimbre(samples, sr, varied(notes), { name: role })
    if (!M || M.p.length < 2) return
    M.gain = Math.round((0.16 / loudnessOf(M)) * 1000) / 1000 // every timbre enters the mix at a lead's level
    M.purity = Math.round(mean(notes.map(n => n.purity ?? 1)) * 100) / 100
    if (M.purity >= minPurity) timbres[role] = M
    else report.push(`тембр «${role}»: записан с аккомпанементом (чистота ${M.purity}) — взят инструмент из библиотеки; укажите участок соло`)
  }
  if (regions.lead) tryTimbre('lead', trackNotes(samples, sr, ...regions.lead, 48, 100).map(n => ({ ...n, purity: 1 })), 0)
  else tryTimbre('lead', A.clean.map(c => ({ t: c.t, d: c.d, n: Math.round(c.n), purity: c.purity })), 0.35)
  if (regions.bass) tryTimbre('bass', trackNotes(samples, sr, ...regions.bass, 26, 64).map(n => ({ ...n, purity: 1 })), 0)
  if (regions.keys) tryTimbre('keys', trackNotes(samples, sr, ...regions.keys, 40, 96).map(n => ({ ...n, purity: 1 })), 0)

  const style = {
    id, label: `🎧 ${name}`, emoji: '🎧', theme: P.theme, bpm: [Math.round(A.bpm * 0.98), Math.round(A.bpm * 1.02)], swing: A.swing,
    themes: { [themeA.id]: 5, [themeB.id]: 5 }, ownThemes: [themeA, themeB],
    keys: [kName, kName, kName, keyName({ tonic: (key.tonic + 2) % 12, mode: key.mode }), keyName({ tonic: (key.tonic + 10) % 12, mode: key.mode })],
    ...(A.key.modal ? { modes: [A.key.modal] } : {}),
    moods: P.moods, voicing: P.voicing, chordRange: P.chordRange, bassRange: P.bassRange,
    lead: timbres.lead ? ['timbre:lead'] : P.lead, lead2: P.lead2, counter: P.counter, chords: timbres.keys ? ['timbre:keys'] : P.chords,
    bass: timbres.bass ? ['timbre:bass'] : P.bass, pad: P.pad, arp: P.arp, texture: P.texture,
    kit: 'audio', kitSound: A.drumSound,
    forms: [form, form2], drums, comp, bassline, arpStep: P.arpStep, arpPoly: P.arpPoly,
    names: [[slug.split('-')[0] || 'echo', 'echo', 'mirror', 'twin', 'second', 'distant'], ['take', 'reflection', 'version', 'copy', 'shade', 'echo']],
    timbres, palette: paletteId,
    source: { name, duration: Math.round(A.duration), bpm: A.bpm, key: kName, mode: A.key.modal ?? null, swing: A.swing },
  }
  report.unshift(`${A.bpm} BPM${A.swing > 0.5 ? `, свинг ${A.swing}` : ''} · ${kName}${A.key.modal ? ' ' + A.key.modal : ''} · ${A.bars.length} тактов · форма ${form.map(f => f[0]).join(' → ')} · палитра «${STYLES[paletteId].label}»`)
  progress('готово', 1)
  return { style, analysis: A, timbres, report }
}
