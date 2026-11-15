// The song generator — no AI, just music theory, the melody library and dice with a seed.
//
//   generate({ style, seed }) → { source, meta }: the source of an ordinary song file (it imports the
//   engine and the instruments like every hand-written song), deterministic for its seeds.
//
// How a song is made:
//   1. the style (STYLES) gives tempo, keys, forms, instruments for each role, grooves, voicings;
//   2. the arrangement seed picks key, tempo and a form: sections with roles (intro, theme, theme II,
//      bridge, solo, break, final, outro) and their energy;
//   3. the melody seed picks themes from the library (src/melodies.js — melodies of the other songs,
//      each with its own harmony) and varies them: as written, ornamented, or recomposed — the same
//      rhythm with new pitches written by voice-leading rules over the theme's chords. The themes
//      move to the new key (and mode, with the leading tone over V, the accidentals following the
//      chord). The bridge gets a new progression and a newly composed melody;
//   4. the instrument seed picks a sound for every role from the style's palette;
//   5. chords are voiced with smooth voice leading, the bass gets the style's pattern (roots, fifths,
//      octaves, chromatic approach notes), drums the style's grooves with fills; computed parts are
//      added: an improvised solo, a counter-melody from the chords, a canon, a 4:3 arpeggio, the
//      theme at half speed in the outro, a key change up in the final chorus of pop styles.
// "Another one like this" = the same seeds except the melody seed.
// opts.mode (an id of src/modes.js — dorian, phrygian, hirajoshi, blues…): the song is made in the major or minor
// with the same third, then every pitch moves into the mode by its scale degree (D minor → D dorian: B♭ → B♮,
// the chords follow: iv becomes IV); scales of other sizes take the nearest note of the scale. Microtonal modes
// work the same way — C major → C Rast puts E𝄳 and B𝄳 in the melody and the chords (C–E𝄳–G is a neutral triad, "Cn");
// a quarter-tone tonic (Sikah on E𝄳) is made on its neighbour and moved down a quarter tone at the end.
// opts.micro ('quarter' | 'eighth', or the modes quarter24 / eighth48): microtonal writing in the melodies — neutral
// steps, quarter-tone passing notes and slides, or the eighth tones of expressive intonation (microMelody below).
// opts.temperament (an id of src/tuning.js): the song sounds in that tuning — Werckmeister III, just intonation,
// ¼-comma meantone by the spelling, adaptive just intonation on every chord… (the notes stay as written).
// None of these options draws on the other dice: without them a seed gives exactly the song it always gave.
//
// The parts (src/gen/, each imports only parts above it; the page gets them as gen-<name>.js — viz/build.js):
//   util      the dice, picks, notes as text            styles    STYLES and their families (the menus)
//   melody    themes moved, composed, ornamented        names     the words of the titles
//   micro     modes, microtones, temperaments           meter     3/4 … 12/8 from the 4/4 song
//   modulate  key changes and their bars                recipes   LEADS CHORDS PADS BASSES ARPS KITS TEXTURES + helpers
//   recipes by the styles they were written for: boss, orchestra (+ jazz, celtic), japan, stage (edm disco epic factory),
//   dark (darkecho ishope prime nordic), retro (zunpet oldzun podskazka), underground (fight babushka hardstyle phonk
//   breakcore), world (artifact brinstar), audio (timbres from recordings), internet, storm, beyond (heaven hell), magma
//   whole songs of their own: fugue-song, maqam-song, raga-song, gamelan-song, ambient-song
// This file: generate() — the plan — and emit() — the song's text —, the notes-to-parts helpers at the end.
import { MELODIES, PROGRESSIONS } from './melodies.js'
import { parseKey, roman, voiceLead, spell, keyName, keyLabel, SCALES, pc, chordName } from './theory.js'
import { userMelody } from './harmonize.js'
import { modeOf, parentMode, keyWithMode } from './modes.js'
import { temperOf } from './tuning.js'
import { fmtNotes, lane, pick, rng, round, weighted } from './gen/util.js'
import { STYLES } from './gen/styles.js'
import { MAJ, MIN, adaptTheme, celticOrnament, chordTones, compose, ornament } from './gen/melody.js'
import { NAMES } from './gen/names.js'
import { microMelody, microSoloCode, shiftPitches, temperData, toMode } from './gen/micro.js'
import { METERS, MT, meterCode, setMT, toMeter } from './gen/meter.js'
import { MOD_NAMES, keysField, planModulations, transitionChords } from './gen/modulate.js'
import { ARPS, BASSES, CHORDS, COUNTER_VOICE, KITS, LEADS, PADS, TEXTURES } from './gen/recipes.js'
import { bossData, equationSolo, hardKickTrack, reverseBassTrack } from './gen/boss.js'
import './gen/orchestra.js'
import './gen/japan.js'
import { KIT_MAP, NOTE_HITS, clubKickTrack, setKIT_MAP, setNOTE_HITS, stageData } from './gen/stage.js'
import './gen/dark.js'
import './gen/retro.js'
import './gen/underground.js'
import './gen/world.js'
import { UT, recipe, setUT, withField } from './gen/audio.js'
import './gen/internet.js'
import './gen/storm.js'
import './gen/beyond.js'
import './gen/magma.js'
import { generateFugue } from './gen/fugue-song.js'
import { generateMaqam } from './gen/maqam-song.js'
import { generateRaga } from './gen/raga-song.js'
import { generateGamelan } from './gen/gamelan-song.js'
import { generateAmbient } from './gen/ambient-song.js'

export function generate(opts = {}) {
  // opts.styleDef: a style made from a recording (src/audiostyle.js) — a STYLES entry of its own, carried in the song
  const styleId = opts.styleDef?.id ?? (STYLES[opts.style] ? opts.style : 'lofi'), S = opts.styleDef ?? STYLES[styleId]
  const seed = (opts.seed ?? 1) >>> 0
  const seeds = {
    arrangement: (opts.arrangement ?? seed) >>> 0,
    melody: (opts.melody ?? (seed * 7919 + 17)) >>> 0,
    instruments: (opts.instruments ?? (seed * 104729 + 3)) >>> 0,
  }
  // the fugue: its own composer (src/fugue.js) and writer
  if (styleId === 'fugue' || styleId === 'organ') return generateFugue(opts, S, seeds, styleId)
  if (styleId === 'maqam') return generateMaqam(opts, S, seeds)
  if (styleId === 'gamelan') return generateGamelan(opts, S, seeds)
  if (styleId === 'ambient') return generateAmbient(opts, S, seeds)
  if (styleId === 'raga') return generateRaga({ ...opts, raga: opts.raga ?? { kalyan: 'yaman', bhairav: 'bhairav', kafi: 'bhimpalasi', bhairavi: 'malkauns', aeolian: 'darbari' }[opts.mode] }, S, seeds)
  // a style that lists its modes, meters or microtones draws them with its own dice (the others never do)
  if (S.modes && opts.mode === undefined && !opts.userTheme) opts = { ...opts, mode: pick(rng((seeds.arrangement ^ 0x3a0de) >>> 0), S.modes) ?? undefined }
  if (S.meters && opts.meter === undefined) opts = { ...opts, meter: pick(rng((seeds.arrangement ^ 0x3e7e) >>> 0), S.meters) ?? undefined }
  if (S.micros && opts.micro === undefined && !opts.userTheme) opts = { ...opts, micro: pick(rng((seeds.arrangement ^ 0x51c40) >>> 0), S.micros) ?? undefined }
  const RA = rng(seeds.arrangement), RM = rng(seeds.melody), RI = rng(seeds.instruments)

  // key, tempo, form
  // a melody of your own (opts.userTheme: { notes: [[beat, MIDI, length]], title? }): harmonized (src/harmonize.js), it is
  // theme A as written, and the song is in its key unless a key is asked for
  const userMel = opts.userTheme?.notes?.length ? userMelody(opts.userTheme.notes, { title: opts.userTheme.title ?? 'ваша мелодия' }) : null
  const key = { ...(parseKey(opts.key) ?? (userMel ? parseKey(userMel.key) : null) ?? parseKey(pick(RA, S.keys))) }
  // a quarter-tone tonic (E𝄳): the song is made on the semitone above, then moved down (shiftPitches)
  const tonicShift = key.tonic - Math.round(key.tonic), tonicLabel = key.name ?? null
  if (tonicShift) { key.tonic = Math.round(key.tonic) % 12; delete key.name }
  const modeIn = opts.mode && !['major', 'minor'].includes(opts.mode) ? modeOf(opts.mode) : null
  // the 24- and 48-step chromatic "modes" keep the key's own scale and write microtones into the melodies
  const mode = modeIn?.grid ? null : modeIn
  if (opts.mode && !modeIn?.grid) key.mode = opts.mode === 'major' || opts.mode === 'minor' ? opts.mode : parentMode(mode.iv)
  const micro = opts.micro ?? (modeIn?.grid === 24 ? 'quarter' : modeIn?.grid === 48 ? 'eighth' : null)
  // a meter other than 4/4 (not for the hardstyle machinery of boss and jbattle: its kick is four on the floor)
  const meter = opts.meter && METERS[opts.meter] && !S.hard && !S.club && styleId !== 'boss' ? METERS[opts.meter] : null
  const temperament = opts.temperament && opts.temperament !== 'equal' && !(modeIn && !modeIn.grid && modeIn.iv.some(v => v !== Math.round(v))) ? temperOf(opts.temperament) : null
  const bpm = opts.bpm ?? Math.round(S.bpm[0] + RA() * (S.bpm[1] - S.bpm[0]))
  let form = pick(RA, S.forms).map(([name, bars, role, energy, o]) => ({ name, bars, role, energy, ...(o ?? {}) }))
  const target = { short: 95, normal: 160, long: 220 }[opts.length ?? 'normal'] // seconds
  form = fitForm(form, meter ? (target * meter.pin) / meter.pout : target, bpm, RA)
  // modulations: their own dice; none in a mode of its own or on a quarter-tone tonic
  const RMod = rng((seeds.arrangement ^ 0xa11ce) >>> 0)
  const mods = opts.modulations && !mode && !tonicShift ? planModulations(form, key, styleId, RMod) : {}
  const iBridge = form.findIndex(f => f.role === 'bridge'), bridgeKey = mods[iBridge]?.key ?? key

  // themes from the library: the style's own list (weights), only those that can live in this mode;
  // A and B preferably from different songs. A melody marked `only` belongs to its style alone
  const LIB = [...(S.ownThemes ?? []), ...MELODIES.filter(m => !m.only || [].concat(m.only).includes(styleId))]
  const allowed = LIB.filter(m => !opts.sources || opts.sources.includes(m.from))
  const fits = m => parseKey(m.key).mode === key.mode || m.modal
  const weightOf = m => S.themes?.[m.id] ?? 0.15 * (1 + m.moods.filter(x => S.moods.includes(x)).length)
  const pickTheme = (avoid = null) => {
    let cands = allowed.filter(fits)
    if (!cands.length) cands = LIB.filter(fits)
    // the style's own list when it has one (the moods decide only for themes outside every list)
    const listed = cands.filter(m => S.themes?.[m.id] && m.id !== avoid?.id)
    if (listed.length) cands = listed
    cands = cands.filter(m => m.id !== avoid?.id)
    return weighted(RM, cands.map(m => [m, weightOf(m) * (avoid && m.from === avoid.from ? 0.35 : 1)]))
  }
  // opts.theme: the id of theme A, chosen by hand (if it can live in this key)
  const melA = userMel ?? ((opts.theme && LIB.find(m => m.id === opts.theme && fits(m))) || pickTheme())
  const melB = pickTheme(melA)
  const ranges = { lead: [62, 84], lead2: [60, 82] }
  const shape = (th, lo, hi) => { // octave so the theme sits in [lo, hi]
    const ns = th.notes.map(e => e[1]), mid = (Math.min(...ns) + Math.max(...ns)) / 2
    let s = Math.round(((lo + hi) / 2 - mid) / 12) * 12
    th.notes = th.notes.map(([b, m, d]) => [b, m + s, d])
    return th
  }
  const treat = (mel, role) => {
    const th = shape(adaptTheme(mel, key), ...ranges.lead)
    const chordAt = b => th.chords[Math.floor(b / th.per) % th.chords.length]
    const W = S.variety ?? { 'as written': 5, ornamented: 2, recomposed: role === 'B' ? 3 : 1.5 } // a style may ask for more change
    const how = mel === userMel ? 'as written' : weighted(RM, [['as written', W['as written']], ['ornamented', W.ornamented], ['recomposed', W.recomposed * (S.variety && role === 'B' ? 1.5 : 1)]])
    if (how === 'ornamented') th.notes = ornament(th.notes, key, chordAt, RM)
    if (how === 'recomposed') {
      const ns = th.notes.map(e => e[1])
      // (a theme that ends on its dominant — a half cadence — ends open, on 5̂ or 2̂, not on a tonic over V; the older
      // styles keep the close they always had, so their seeds give the same songs)
      const half = S.variety && pc(th.chords[th.chords.length - 1].root) !== pc(key.tonic)
      th.notes = compose({ rhythm: th.notes.map(([b, , d]) => [b, d]), chordAt, key, lo: Math.min(...ns) - 2, hi: Math.max(...ns) + 2, r: RM, ...(half ? { end: 'open' } : {}) })
    }
    th.how = how
    return th
  }
  const A = treat(melA, 'A'), B = treat(melB, 'B')
  // the tradition's ornaments: cuts (a grace note a step above) and rolls on the tunes, with their own dice
  if (S.ornate) { const RO = rng((seeds.melody ^ 0x0c17) >>> 0); for (const th of [A, B]) if (th.id !== 'user') th.notes = celticOrnament(th.notes, key, RO) } // (your own melody stays as you played it)
  // the bridge: a new progression, a new melody on the rhythm of a third theme
  const progs = PROGRESSIONS[bridgeKey.mode]
  const bridgeProg = pick(RA, progs).map(s => roman(s, bridgeKey))
  const melR = pick(RM, LIB.filter(m => m.id !== melA.id && m.id !== melB.id))
  const bridgeLen = 16, bridgeAt = b => bridgeProg[Math.floor(b / 4) % 4]
  const rhythm = melR.notes.filter(([b]) => b < bridgeLen).map(([b, , d]) => [b, Math.min(d, bridgeLen - b)])
  const BR = { notes: compose({ rhythm, chordAt: bridgeAt, key: bridgeKey, lo: 64, hi: 81, r: RM, end: 'open' }), chords: bridgeProg, per: 4, length: bridgeLen, from: melR.from }
  // theme II in another key: the relative key needs the theme written in that mode (a modal theme, or one born in it);
  // the dominant is the theme moved up a fifth or down a fourth, whichever keeps it in its register
  let BL = null
  const iB = form.findIndex(f => f.role === 'themeB'), mB = mods[iB]
  if (mB?.type === 'relative') {
    if (melB.modal || parseKey(melB.key).mode === mB.key.mode) {
      BL = shape(adaptTheme(melB, mB.key), ...ranges.lead)
      const chordAt = b => BL.chords[Math.floor(b / BL.per) % BL.chords.length]
      if (B.how === 'ornamented') BL.notes = ornament(BL.notes, mB.key, chordAt, RMod)
      if (B.how === 'recomposed') { const ns = BL.notes.map(e => e[1]); BL.notes = compose({ rhythm: BL.notes.map(([b, , d]) => [b, d]), chordAt, key: mB.key, lo: Math.min(...ns) - 2, hi: Math.max(...ns) + 2, r: RMod }) }
    } else mods[iB] = { key: { tonic: (key.tonic + 7) % 12, mode: key.mode }, type: 'dominant' }
  }
  const midOf = th => { const ns = th.notes.map(e => e[1]); return (Math.min(...ns) + Math.max(...ns)) / 2 }
  const trOf = (i, th) => { const t = (((mods[i].key.tonic - key.tonic) % 12) + 12) % 12; return t === 0 ? 0 : midOf(th) + t <= 78 ? t : t - 12 }
  // the build-up (the 'build' role, 16 beats): the theme's opening rhythm recomposed over VI – VII, eight
  // eighths up the (harmonic) scale from the dominant, then a trill on it — the countdown before a drop
  let RUN = null
  if (form.some(f => f.role === 'build')) {
    const chords = (key.mode === 'minor' ? ['VI', 'VII', 'V', 'V'] : ['IV', 'V', 'V', 'V']).map(s => roman(s, key))
    const at = b => chords[Math.floor(b / 4) % 4]
    const ns = A.notes.map(e => e[1]), lo = Math.min(...ns), hi = Math.max(...ns)
    const head = compose({ rhythm: A.notes.filter(([b]) => b < 8).map(([b, , d]) => [b, Math.min(d, 8 - b)]), chordAt: at, key, lo, hi, r: RM, end: 'open' })
    const scale = key.mode === 'minor' ? SCALES.harmonic : MAJ
    const dom = lo - 5 + pc(key.tonic + 7 - (lo - 5)) // the dominant at or above a fourth under the theme
    const run = []
    for (let n = dom; run.length < 8; n++) if (scale.includes(pc(n - key.tonic))) run.push([8 + run.length / 2, n, 0.5])
    const top = dom + 12, up = top + (key.mode === 'minor' ? 1 : 2) // minor: the ♭9 over V (E–F in A minor)
    const trill = Array.from({ length: 16 }, (_, i) => [12 + i / 4, i % 2 ? up : top, 0.25])
    RUN = { notes: [...head, ...run, ...trill], chords, per: 4, length: 16 }
  }

  // a melody of your own longer than its theme's section: the section grows to hold it whole (a theme plays only whole)
  if (userMel) for (const f of form) if ((f.role === 'theme' || f.role === 'final') && f.bars * 4 < A.length) f.bars = Math.ceil(A.length / 4)

  // instruments
  const inst = {
    lead: pick(RI, S.lead), lead2: pick(RI, S.lead2), chords: pick(RI, S.chords), bass: pick(RI, S.bass),
    pad: pick(RI, S.pad), arp: pick(RI, S.arp), texture: pick(RI, S.texture),
  }
  if (inst.lead2 === inst.lead) inst.lead2 = S.lead2.find(x => x !== inst.lead) ?? inst.lead2

  // timeline: sections, harmony, who plays what
  const sections = [], harmony = [], plans = { lead: [], lead2: [], counter: [] }, sectionInfo = []
  let at = 0
  for (const [si, sec] of form.entries()) {
    const md = mods[si], beats = sec.bars * 4
    // a section in another key of the same mode is its music moved there; the bridge and a relative theme II are
    // written in their key already
    const tr = md && sec.role === 'themeB' && !BL ? trOf(si, B) : md ? 0 : sec.keyUp ?? 0
    sections.push([at, sec.name])
    // the harmony of the section: a theme's chords, the bridge progression, or the A chords
    const src = sec.role === 'themeB' ? (md && BL ? BL : B) : sec.role === 'bridge' ? BR : sec.role === 'build' && RUN ? RUN : A
    for (let b = 0; b < beats; b += src.per) {
      const ch = src.chords[Math.floor(b / src.per) % src.chords.length]
      const len = Math.min(src.per, beats - b)
      harmony.push({ at: at + b, len, ch, tr, ...(md ? { lk: md.key } : {}) })
    }
    // melodic plans: [start, phrase, transpose, stretch]
    const repeat = (plan, ph, phLen) => { for (let b = 0; b + phLen <= beats + 1e-6; b += phLen) plan.push([at + b, ph, tr, 1]) }
    if (sec.role === 'theme') repeat(plans.lead, 'A', A.length)
    else if (sec.role === 'themeB') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, md && BL ? 'BL' : 'B', B.length) }
    else if (sec.role === 'bridge') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'BRIDGE', BR.length) }
    else if (sec.role === 'solo' && S.antiClimax) { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'REST', 0, 1]) } // the anti-climax: the screech (TEXTURES.screech)
    else if (sec.role === 'solo' && styleId === 'boss') { plans.lead.push([at, 'SOLO', 0, 1]); plans.lead2.push([at, 'REST', 0, 1]) } // the hook sings the equation
    else if (sec.role === 'solo') { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'SOLO', 0, 1]) }
    else if (sec.role === 'trade') { plans.lead.push([at, 'REST', 0, 1]); plans.lead2.push([at, 'TRADE', 0, 1]) } // trading fours with the drums
    else if (sec.role === 'final') {
      repeat(plans.lead, 'A', A.length)
      plans.counter.push([at, sec.canon ? 'CANON' : 'HARMONY', 0, 1])
    } else if (sec.role === 'outro') plans.lead.push([at, 'A', tr, 2]) // the theme at half speed
    else if (sec.role === 'break') plans.lead.push([at, 'A', 0, 1]) // a fragment of the theme over the break
    else if (sec.role === 'build') { plans.lead.push([at, 'REST', 0, 1]); repeat(plans.lead2, 'RUN', RUN.length) }
    else plans.lead.push([at, 'REST', 0, 1])
    if (!['bridge', 'solo', 'themeB', 'build', 'trade'].includes(sec.role)) plans.lead2.push([at, 'REST', 0, 1])
    if (sec.role !== 'final') plans.counter.push([at, 'REST', 0, 1])
    sectionInfo.push({ ...sec, at, beats, ...(md ? { lk: md.key, modType: md.type } : {}) })
    at += beats
  }
  let END = at
  // transition bars: the last bar before a section in another key (and before the one that comes home) gets
  // [pivot, V7 of the new key] and a link in the melody — composed over those chords, ending open on 5̂ or 2̂
  const LINKS = []
  const keyOfSec = i => sectionInfo[i]?.lk ?? key
  sectionInfo.forEach((s, i) => {
    if (!i) return
    const a = keyOfSec(i - 1), b = keyOfSec(i)
    if (!mods[i] && !mods[i - 1]) return
    if (a.tonic === b.tonic && a.mode === b.mode) return
    const T = s.at, type = mods[i]?.type ?? 'home'
    const [c1, c2] = transitionChords(a, b, type === 'home' ? 'pivot' : type)
    for (const h of harmony) if (h.at < T && h.at + h.len > T - 4) h.len = Math.max(0, T - 4 - h.at)
    for (let k = harmony.length - 1; k >= 0; k--) if (harmony[k].len <= 0) harmony.splice(k, 1)
    harmony.push({ at: T - 4, len: 2, ch: c1, tr: 0, lk: type === 'enharmonic' ? a : b, transition: type }, { at: T - 2, len: 2, ch: c2, tr: 0, lk: b, transition: type })
    harmony.sort((x, y) => x.at - y.at)
    // the voice singing at that bar gets the link
    for (const plan of [plans.lead, plans.lead2]) {
      const row = [...plan].reverse().find(r => r[0] <= T - 4)
      if (!row || row[1] === 'REST' || row[1] === 'SOLO') continue
      const ph = { A, B, BL, BRIDGE: BR, RUN }[row[1]]
      if (!ph) continue
      const rel = (T - 4 - row[0]) / row[3]
      const inBar = ph.notes.filter(([b]) => b >= rel - 1e-6 && b < rel + 4 / row[3] - 1e-6).map(([b, , d]) => [(b - rel) * row[3], Math.min(d * row[3], 4 - (b - rel) * row[3])])
      if (!inBar.length) continue
      const ns = ph.notes.map(e => e[1] + row[2])
      const notes = compose({ rhythm: inBar, chordAt: b => (b < 2 ? c1 : c2), key: b, lo: Math.min(...ns) - 1, hi: Math.max(...ns) + 1, r: RMod, end: 'open' })
      const name = 'LINK' + (LINKS.length + 1)
      LINKS.push({ name, notes, at: T - 4, from: keyName(a), to: keyName(b), type })
      plan.push([T - 4, name, 0, 1])
      plan.sort((x, y) => x[0] - y[0])
      // the phrase that was singing goes on after the link if its section does
      break
    }
  })
  // voicings with voice leading, the bass root in its range
  let prev = null
  for (const h of harmony) {
    const ch = h.ch, tones = chordTones(ch, S.voicing)
    const v = voiceLead(tones.map(p => (p + h.tr + 12) % 12), prev, { lo: S.chordRange[0], hi: S.chordRange[1], voices: Math.min(4, Math.max(3, tones.length)) })
    prev = v
    let bass = S.bassRange[0] + ((pc(ch.root + h.tr) - S.bassRange[0]) % 12 + 12) % 12
    if (bass < S.bassRange[0] + 4) bass += 12
    h.voicing = v
    h.bass = bass
    h.symbol = chordName({ ...ch, root: (ch.root + h.tr) % 12 }, h.lk ?? key)
    // the chord's own third, fifth and seventh above the root (the fifth of a ø7 chord is diminished!)
    h.ivs = [ch.ivs.find(i => i === 3 || i === 4) ?? 4, ch.ivs.find(i => i === 6 || i === 7 || i === 8) ?? 7, ch.ivs.find(i => i === 9 || i === 10 || i === 11) ?? 10]
  }
  if (mode) toMode({ key, iv: mode.iv, themes: [A, B, BR, RUN], harmony, id: opts.mode })
  // microtonal writing in the melodies, with its own dice (the other choices stay as they were)
  if (micro) {
    const RU = rng((seeds.melody ^ 0x51ce5) >>> 0)
    for (const th of [A, B, BR]) th.notes = microMelody(th.notes, { kind: micro, key, iv: mode?.iv, chordAt: b => th.chords[Math.floor(b / th.per) % th.chords.length], r: RU })
  }
  if (tonicShift) shiftPitches({ key, by: tonicShift, name: tonicLabel, themes: [A, B, BR, RUN], harmony, id: opts.mode })
  const solo = sectionInfo.find(s => s.role === 'solo')
  // the meter: everything made in 4/4 is mapped onto it
  let variants = null
  if (meter) {
    const P = { sections, sectionInfo, harmony, plans, END, phrases: { A: A.notes, B: B.notes, BRIDGE: BR.notes, ...(BL ? { BL: BL.notes } : {}), ...Object.fromEntries(LINKS.map(l => [l.name, l.notes])) } }
    variants = toMeter(meter, P)
    END = P.END
  }
  const names = S.names ?? NAMES[styleId] ?? NAMES.lofi
  // the name follows the arrangement; a mutated melody or sound gets a variant number
  const variant = opts.melody != null || opts.instruments != null ? `-${((seeds.melody * 31 + seeds.instruments) >>> 0) % 900 + 100}` : ''
  const title = `${pick(RA, names[0])}-${pick(RA, names[1])}${variant}`
  const meta = {
    style: styleId, seed, seeds, length: opts.length ?? 'normal', key: keyName(key), mode: modeIn ? opts.mode : null, modeName: modeIn?.name ?? null, bpm, title, form: form.map(f => f.name),
    fixedKey: opts.key ?? null, micro: opts.micro ?? null, temperament: temperament?.id ?? null,
    meter: meter ? opts.meter : null,
    modulations: opts.modulations ? sectionInfo.filter(s => s.lk).map(s => ({ at: s.at, section: s.name, key: keyName(s.lk), type: s.modType })) : null,
    themes: { A: { from: melA.from, title: melA.title, how: A.how }, B: { from: melB.from, title: melB.title, how: B.how }, bridge: { rhythmFrom: melR.from } },
    userTheme: userMel ? { notes: opts.userTheme.notes, title: userMel.title, chords: userMel.chords, key: userMel.key } : null,
    instruments: inst,
  }
  setMT(meter)
  setUT(S.timbres ?? null)
  let source
  try {
    source = emit({ S, styleId, key, mode, modeIn, micro, temperament, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r: RI, BL, LINKS, meter, variants })
  } finally {
    setMT(null)
    setUT(null)
  }
  return { source, meta }
}

// form → about `target` seconds: drop optional sections when long, repeat themes when short
function fitForm(form, target, bpm, r) {
  const secs = f => f.reduce((s, x) => s + x.bars, 0) * 4 * 60 / bpm
  let f = form.map(x => ({ ...x }))
  while (secs(f) > target * 1.15) {
    const i = f.findIndex(x => x.role === 'solo' || x.role === 'break' || x.role === 'bridge')
    if (i < 0) break
    f.splice(i, 1)
  }
  let guard = 0
  while (secs(f) < target * 0.85 && guard++ < 6) {
    const i = f.findIndex(x => x.role === (guard % 2 ? 'theme' : 'solo')) ?? -1
    const j = i >= 0 ? i : f.findIndex(x => x.role === 'themeB')
    if (j < 0) break
    f[j].bars += 8
  }
  return f
}
// the pad plays in the intro, theme B, the bridge, the break and the final
const PAD_ON = `const padOn = x => chordAt(x) && ['themeB', 'bridge', 'break', 'final', 'intro'].includes(role(x)) && x < END - 2`
 // the meter of the song being written (emit), null in 4/4
function emit(P) {
  const { S, styleId, key, mode, modeIn = mode, micro = null, temperament = null, bpm, sections, sectionInfo, END, harmony, plans, A, B, BR, RUN, inst, solo, meta, r, BL = null, LINKS = [], meter = null, variants = null } = P
  // a phrase as the song plays it (mapped onto the meter)
  const ph = (name, notes) => variants?.get(name) ?? notes
  const skey = keyWithMode(key, meta.mode) // the key the notes are spelt in (with a microtonal mode's degrees)
  const ivText = m => (m.grid ? `${m.grid}-EDO` : m.iv.map(round).join(' '))
  const used = { engine: new Set(['mod', 'floor', 'exp', 'sin', 'TAU', 'hz', 'filter', 'reverb', 'delay', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'arrangement', 'trigger', 'poly']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const tracks = []
  const sw = S.swing
  const roles = sectionInfo.map(s => [s.at, s.role, s.energy])
  const keyText = modeIn ? `${spell(key.tonic + 60, skey, false)} — ${modeIn.name.toLowerCase()}` : keyLabel(key)
  const boss = styleId === 'boss', hard = boss || !!S.hard // hard: the hardstyle kick, the reverse bass, the sidechain
  // the stage (edm, disco, the factory, epic): sections and key changes in the code; club: the club kick and its sidechain
  const club = !!S.club, stage = club || !!S.stage, pumped = hard || club
  const extra = { variant: S.variant, pump: S.club?.pump, dark: S.variant === 'cave', r }
  const trade = sectionInfo.find(s => s.role === 'trade')

  // ---- data
  const H = harmony.map(h => `  [${h.at}, ${h.len}, ${round(h.bass)}, [${h.voicing.map(round).join(', ')}], '${h.symbol}', [${h.ivs.map(round).join(', ')}]],`).join('\n')
  const head = []
  head.push(`// ${meta.title} — ${S.label.toLowerCase()} in ${spell(key.tonic + 60, skey, false)} ${modeIn ? modeIn.name.toLowerCase() + ` (${ivText(modeIn)})` : key.mode}, ${bpm} BPM. Generated by MathMusic`)
  head.push(`// (style ${styleId}, seed ${meta.seed}): ${sections.map(s => s[1]).join(' → ')}.`)
  head.push(`// Themes: A — ${meta.themes.A.title} (${meta.themes.A.how}), B — ${meta.themes.B.title} (${meta.themes.B.how}); the bridge melody is newly`)
  head.push(`// composed on the rhythm of a theme from ${BR.from}. Computed parts: ${[solo ? (boss ? 'a solo that is an equation (the graph of two sines)' : S.antiClimax ? 'a screech riff on the roots in the anti-climax' : 'an improvised solo') : null, 'a counter-melody from the chords', plans.counter.some(p => p[1] === 'CANON') ? 'a canon' : null, RUN ? 'a run up to the dominant in every build-up' : null, hard ? 'a reverse bass that rolls in the final' : null, 'the theme at half speed in the outro', sectionInfo.some(s => s.keyUp) ? 'a key change up' : null].filter(Boolean).join(', ')}.`)
  if (meta.userTheme) head.push(`// Theme A is a melody you played, harmonized in ${meta.userTheme.key}: ${meta.userTheme.chords.join(' ')} (src/harmonize.js — chord tones on the strong
// parts, roots moving by fifths, a V – I cadence).`)
  if (S.djKick) head.push(`// Euphoric hardstyle: the kick's tail and the reverse bass sit on the tonic and roll through the DJ intro, the climaxes,
// the anti-climax (a screech riff on the roots) and the outro; every part ducks under the kick, d(t) = 1 − 0.7(1 − t/0.18)²;
// the story is told in the breaks (piano, strings), the build-ups end on a reversed cymbal.`)
  else if (hard && !boss) head.push(`// Japanese instruments over the boss machinery: the hardstyle kick's tail and the reverse bass sit on the tonic,\n// every part ducks under the kick in the drops, d(t) = 1 − 0.7(1 − t/0.18)²; the taiko roll doubles through each build.`)
  if (boss) head.push(`// The hardstyle kick's tail and the reverse bass sit on the tonic; every part ducks under the kick in the drops,\n// d(t) = 1 − 0.7(1 − t/0.18)². \`boss\` below makes it a Glitch Forest boss song (tools/score-export.mjs).`)
  if (meter) head.push(`// In ${meter.label}: made in 4/4, then mapped bar by bar onto the meter (${meter.compound ? 'every eighth becomes the triplet one' : 'the notes stay on the grid'}); the drums, the\n// comping and the bass are made for its groups of beats.`)
  if (meta.modulations?.length) head.push(`// Modulations: ${meta.modulations.map(m => `${m.section} in ${keyLabel(parseKey(m.key))} (${MOD_NAMES[m.type]})`).join(', ')}; every change is prepared by a bar of\n// [pivot, V7 of the new key] with a composed link in the melody, and the music comes home by its dominant seventh.`)
  head.push(`// It is an ordinary song file: change anything; the melodies can be drawn in the piano roll (P).`)
  head.push(`// x is time in beats; n counts semitones from C4 (MIDI 60).`)

  const roleOf = `const ROLE = ${JSON.stringify(roles)} // [start, role, energy 0–3] per section\nconst sectionOf = x => { let s = ROLE[0]; for (const r of ROLE) if (r[0] <= x) s = r; return s }\nconst energy = x => (x < END ? sectionOf(x)[2] : -1)\nconst role = x => (x < END ? sectionOf(x)[1] : 'end')`
  const data = `
const SECTIONS = ${JSON.stringify(sections)}
const END = ${END}
const part = arrangement(SECTIONS)
const is = (x, ...names) => names.includes(part(x).name)
const C4 = 440 * 2 ** (-9 / 12) // 261.63 Hz, exact equal temperament
const SW = ${sw} // the off-beat eighth lands at ${sw} of the beat
${roleOf}
${meter ? meterCode(meta.meter, meter) + '\n' : ''}
// ---- harmony: [start beat, length, bass MIDI, voicing MIDI (voice-led), chord, [3rd, 5th, 7th]] --
const HARMONY = [
${H}
]
${meter ? `const BY_EIGHTH = [] // chords change on bar lines, and bars may end on a half beat
for (const h of HARMONY) for (let b = Math.round(h[0] * 2); b < Math.round((h[0] + h[1]) * 2); b++) BY_EIGHTH[b] = h
const chordAt = x => BY_EIGHTH[floor(2 * x)] ?? null` : `const BY_BEAT = []
for (const h of HARMONY) for (let b = h[0]; b < h[0] + h[1]; b++) BY_BEAT[b] = h
const chordAt = x => BY_BEAT[floor(x)] ?? null`}
${PAD_ON} // pads play here
const SCALE = [${(mode ? mode.iv : key.mode === 'minor' ? MIN : MAJ).map(i => round((i + key.tonic) % 12)).join(', ')}] // ${keyText}, pitch classes from C
${hard ? bossData({ need, key, bpm, sectionInfo, dj: !!S.djKick }) : ''}${stage ? stageData({ need, S, key, bpm, sectionInfo }) : ''}${temperament ? temperData({ temperament, key, sectionInfo }) + '\n' : ''}
// ---- melodies: [beat, n from C4, length] — draw them in the piano roll ------------------------------
// A — ${meta.themes.A.title}, ${meta.themes.A.how}; in ${keyText}
const THEME_A = ${fmtNotes(ph('A', A.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
// B — ${meta.themes.B.title}, ${meta.themes.B.how}
const THEME_B = ${fmtNotes(ph('B', B.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
// the bridge — composed over ${BR.chords.map(c => chordName(c, key)).join(' – ')}
const BRIDGE = ${fmtNotes(ph('BRIDGE', BR.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
const REST = []
${RUN ? `// the build-up: the theme's opening over ${RUN.chords.slice(0, 2).map(c => chordName(c, key)).join(' – ')}, a run up from the dominant, a trill on it
const RUN = ${fmtNotes(RUN.notes.map(([b, m, d]) => [round(b), m - 60, d]))}
` : ''}${micro && solo && !boss ? microSoloCode(micro, key) + '\n' : ''}${solo && boss ? equationSolo({ need, key, solo, r }) : solo ? `// the solo: a random walk over the scale, chord tones on the beats (improvise)
const SOLO = improvise({
  start: ${solo.at}, length: ${solo.beats - 2}, rate: 2, seed: ${1 + Math.floor(r() * 999)}, swing: SW, lo: ${A.notes.reduce((a, e) => Math.min(a, e[1]), 99) - 60 - 2}, hi: ${A.notes.reduce((a, e) => Math.max(a, e[1]), 0) - 60 + 3},
  phrase: 8, rest: 0.2, hold: 0.3, scale: () => SCALE, chord: x => (chordAt(x)?.[3] ?? [0]).map(n => mod(n, 12)),
}).map(${micro ? `([b, n, d], j, a) => [b - ${solo.at}, n + MICRO(n, b, a[j + 1]?.[1]), d]` : `([b, n, d]) => [b - ${solo.at}, n, d]`})` : 'const SOLO = []'}
${BL ? `// theme II in ${keyLabel(meta.modulations?.find(m => m.type === 'relative') ? sectionInfo.find(s => s.modType === 'relative').lk : key)} — the same theme written in that mode
const THEME_BL = ${fmtNotes(ph('BL', BL.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
` : ''}${LINKS.map(l => `// a link into ${l.to} (${MOD_NAMES[l.type] ?? l.type}): composed over the transition's pivot and V7
const ${l.name} = ${fmtNotes(ph(l.name, l.notes).map(([b, m, d]) => [round(b), m - 60, d]))}
`).join('')}${variants ? [...variants].filter(([id]) => /_\d/.test(id)).map(([id, notes]) => `// ${id.replace(/_(\d+(?:_\d+)?)_(\d)$/, (m, o, k) => ` from beat ${o.replace('_', '.')} of the period${k !== '1' ? `, at 1/${k} speed` : ''}`)} — the phrase as the meter places it there
const ${id} = ${fmtNotes(notes.map(([b, m, d]) => [round(b), m - 60, d]))}
`).join('') : ''}${trade ? `// trading fours: four bars improvised, four bars for the drums (they solo while the horn rests)
const TRADE = improvise({
  start: ${trade.at}, length: ${trade.beats}, rate: 2, seed: ${1 + Math.floor(r() * 999)}, swing: SW, lo: ${A.notes.reduce((a, e) => Math.min(a, e[1]), 99) - 60 - 2}, hi: ${A.notes.reduce((a, e) => Math.max(a, e[1]), 0) - 60 + 3},
  phrase: 8, rest: 0.15, hold: 0.25, scale: () => SCALE, chord: x => (chordAt(x)?.[3] ?? [0]).map(n => mod(n, 12)),
}).filter(([b]) => floor((b - ${trade.at}) / 16) % 2 === 0).map(([b, n, d]) => [b - ${trade.at}, n, Math.min(d, 16 - mod(b - ${trade.at}, 16))])
` : ''}const PHRASES = { A: THEME_A, B: THEME_B, BRIDGE, REST, SOLO${trade ? ', TRADE' : ''}${RUN ? ', RUN' : ''}${BL ? ', BL: THEME_BL' : ''}${LINKS.map(l => ', ' + l.name).join('')}${variants ? [...variants.keys()].filter(id => /_\d/.test(id)).map(id => ', ' + id).join('') : ''} }

// who plays which phrase: [start beat, phrase, transpose, stretch (2 = half speed)]
const LEAD = ${JSON.stringify(plans.lead.map(([s, p, t, k]) => [s, p, t, k]))}
const LEAD2 = ${JSON.stringify(plans.lead2.map(([s, p, t, k]) => [s, p, t, k]))}
const COUNTER = ${JSON.stringify(plans.counter.map(([s, p, t, k]) => [s, p, t, k]))}
// the note of a voice at x → { n, d, τ, u, at } or null
function voiceAt(plan, x) {
  if (x >= END) return null
  let row = null
  for (const r of plan) if (r[0] <= x) row = r
  if (!row) return null
  const [s, name, tr, k] = row, m = notesAt(PHRASES[name] ?? REST, (x - s) / k)
  return m && { n: m.n + tr, d: m.d * k, τ: m.τ * k, u: m.u, at: s + m.at * k }
}
const leadAt = x => voiceAt(LEAD, x)
const lead2At = x => voiceAt(LEAD2, x)
// the counter-voice: HARMONY = the highest chord tone at least a third below the lead (computed from
// the chords); CANON = the lead itself two beats later, an octave down
const counterAt = x => {
  let row = null
  for (const r of COUNTER) if (r[0] <= x) row = r
  if (!row || x >= END) return null
  if (row[1] === 'CANON') {
    const m = x - 2 >= row[0] ? leadAt(x - 2) : null
    return m && { ...m, n: m.n - 12, at: m.at + 2 }
  }
  if (row[1] !== 'HARMONY') return null
  const m = leadAt(x), c = chordAt(x)
  if (!m || !c) return null
${micro || (modeIn && modeIn.iv.some(v => v !== Math.round(v))) || key.shift ? `  // (microtonal: the chord tones themselves, in every octave)
  let best = null
  for (const v of c[3]) for (let o = -48; o <= 0; o += 12) { const n = v - 60 + o; if (n <= m.n - 3 + 1e-6 && n > m.n - 12 && (best == null || n > best)) best = n }
  return best == null ? null : { ...m, n: best }` : `  const pcs = c[3].map(n => mod(n, 12))
  for (let n = m.n - 3; n > m.n - 12; n--) if (pcs.includes(mod(n + 60, 12))) return { ...m, n }
  return null`}
}
`
  need('instruments', 'improvise')
  // ---- tracks
  const T = (name, code) => tracks.push({ name, code })
  const leadCode = (id, at, laneR, gainMul = 1, panv = 0.15) => recipe(LEADS, id, 'lead')({ at, lane: laneR, gain: gainMul * (S.gains?.[{ leadAt: 'lead', lead2At: 'lead2' }[at] ?? 'counter'] ?? 1), pan: panv, need, sw, hard: pumped, tonic: round(pc(key.tonic)), ...extra })
  T(String(inst.lead).replace('timbre:', ''), leadCode(inst.lead, 'leadAt', lane.lead, 1, 0.12))
  // bells carry a melody alone at full level, but next to another lead they cut through: softer
  const LEAD2_GAIN = { bells: 0.45 }
  // boss: the chip lead and its counter stand up to the supersaw and the kick
  const louder = boss ? 1.6 : 1
  T(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2, leadCode(inst.lead2, 'lead2At', lane.lead2, 0.9 * louder * (LEAD2_GAIN[inst.lead2] ?? 1), -0.3))
  // named by its instrument too ("vibes counter"), so a MIDI export knows what plays it
  const counterVoice = S.counter ?? COUNTER_VOICE[inst.lead] ?? inst.lead2
  T(counterVoice + ' counter', leadCode(counterVoice, 'counterAt', lane.counter, 0.5 * louder * (boss ? 2 : 1), -0.4))
  T(String(inst.chords).replace('timbre:', ''), recipe(CHORDS, inst.chords, 'keys')({ need, comp: S.comp, lane: lane.chords, hard: pumped, ...extra, ...(S.gains?.chords ? { gain: S.gains.chords } : {}) }))
  if (inst.pad) T(inst.pad === 'strings' ? 'strings' : inst.pad, PADS[inst.pad]({ need, lane: lane.pad, gain: boss ? 3 : hard ? 4 : S.gains?.pad ?? 1, hard: pumped && !boss }))
  T('bass', recipe(BASSES, inst.bass, 'bass')({ need, line: S.bassline, lane: lane.bass, hard: pumped, tonic: round(pc(key.tonic)), ...extra, ...(S.gains?.bass ? { gain: S.gains.bass } : {}) }))
  if (hard) T('rbass', reverseBassTrack({ need, lane: lane.bass, gain: S.gains?.rbass ?? (boss ? 1 : 0.7) }))
  if (inst.arp) T(inst.arp + ' arp', ARPS[inst.arp]({ need, step: S.arpStep, poly: S.arpPoly, lane: lane.arp, hard: pumped, ...extra, ...(S.gains?.arp ? { gain: S.gains.arp } : {}) }))
  if (hard) T('kick', hardKickTrack({ need, gain: S.gains?.kick ?? (boss ? 1 : 0.6) }))
  if (club) T('kick', clubKickTrack({ need, kick: S.club.sound, gain: S.gains?.kick }))
  T('drums', KITS[S.kit]({ need, drums: S.drums, sound: S.kitSound, ...extra }))
  if (inst.texture) T(inst.texture, TEXTURES[inst.texture]({ need, ...extra }))
  // the user's own plugins (src/vst.js): a style may name, per recipe, the VST plugin and the preset (from the user's sets, kept
  // on their computer) its track is played through where that plugin is installed — the track's own sound stays for elsewhere
  if (S.vst) {
    const recipeOf = { [String(inst.lead)]: inst.lead, [inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2]: inst.lead2, [counterVoice + ' counter']: counterVoice, [String(inst.chords)]: inst.chords, bass: inst.bass }
    if (inst.pad) recipeOf[inst.pad === 'strings' ? 'strings' : inst.pad] = inst.pad
    if (inst.arp) recipeOf[inst.arp + ' arp'] = inst.arp
    for (const t of tracks) {
      const v = S.vst[recipeOf[t.name]]
      if (v) t.code = withField(t.code, `vst: ${JSON.stringify(v)},`)
    }
  }

  // unique keys
  const seen = {}
  for (const t of tracks) {
    let k = t.name.replace(/[^\w ]/g, '').trim() || 'track'
    if (seen[k]) k += ' ' + ++seen[k]
    else seen[k] = 1
    t.key = k
  }
  // a boss song also tells Glitch Forest how to fight it
  let bossField = ''
  if (boss) {
    const attacks = {}
    const add = (name, tile, move) => { const t = tracks.find(q => q.name === name); if (t) attacks[t.key] = { tile, move } }
    add(inst.lead, 'slime', 'snake')
    add(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2, 'acid', 'snake')
    add('rbass', 'tree', 'wave'), add('bass', 'lava', 'wave'), add('kick', 'water', 'pulse')
    add(inst.chords, 'corrupt', 'stab'), add(inst.arp + ' arp', 'corrupt', 'spray'), add(inst.pad === 'strings' ? 'strings' : inst.pad, 'frost', 'rain')
    const modes = Object.fromEntries(sectionInfo.map(s => [s.name, s.role === 'build' ? 'build' : s.energy >= 3 ? 'live' : 'turn']))
    const live = sectionInfo.filter(s => s.energy >= 3), outro = sectionInfo.find(s => s.role === 'outro')
    bossField = `
  // for Glitch Forest (tools/score-export.mjs): how each section runs the fight (turn / build / live), which
  // tracks strike the arena and how, the chord on every beat, where an undefeated fight loops (the last drop)
  // and where the victory jumps (the outro)
  boss: {
    modes: ${JSON.stringify(modes)},
    attacks: ${JSON.stringify(attacks)},
    chord: x => chordAt(x)?.[4] ?? '',
    loop: ${live.length ? live[live.length - 1].at : 0},
    outro: ${outro ? outro.at : END},
  },`
  }
  const imp = mod => [...used[mod]].sort().map(x => (temperament && mod === 'engine' && x === 'hz' ? 'hz as hz12' : x))
  const out = [
    ...head,
    `import { ${imp('engine').join(', ')} } from '../src/engine.js'`,
    `import {\n  ${imp('instruments').join(', ')},\n} from '../src/instruments.js'`,
    data,
    ...tracks.map((t, i) => `// ---- ${t.key} ${'-'.repeat(Math.max(4, 90 - t.key.length))}\nconst track${i} = ${t.code}\n`),
    `export default {
  name: '${meta.title}',
  bpm: ${bpm},
  key: '${keyName(key)}',${modeIn ? `
  mode: '${meta.mode}', // ${modeIn.name}: ${ivText(modeIn)}` : ''}${temperament ? `
  tuning: { id: '${temperament.id}', name: ${JSON.stringify(temperament.name)}, offsets: TEMPER }, // cents of C … B from 12-TET` : ''}
  length: END,
  theme: '${S.theme}',
  style: '${styleId}',
  generator: ${JSON.stringify({ style: styleId, seed: meta.seed, seeds: meta.seeds, length: meta.length, ...(meta.fixedKey ? { key: meta.fixedKey } : {}), ...(meta.mode ? { mode: meta.mode } : {}), ...(meta.micro ? { micro: meta.micro } : {}), ...(meta.temperament ? { temperament: meta.temperament } : {}), ...(meta.modulations ? { modulations: true } : {}), ...(meta.meter ? { meter: meta.meter } : {}), ...(meta.userTheme ? { userTheme: { notes: meta.userTheme.notes, title: meta.userTheme.title } } : {}), ...(S.ownThemes ? { styleDef: S } : {}) })},${meta.meter ? `
  meter: '${METERS[meta.meter].text}', // ${METERS[meta.meter].label}${METERS[meta.meter].compound ? ' — a beat (x) is a dotted quarter' : ''}` : ''}${meta.modulations?.length ? `
  keys: ${JSON.stringify(keysField(key, sectionInfo))}, // the key of each stretch (the score's signatures, note names)` : ''}
  sections: SECTIONS,${bossField}
  tracks: ${temperament ? 'withNow(' : ''}{ ${tracks.map((t, i) => `${JSON.stringify(t.key)}: track${i}`).join(', ')} }${temperament ? ')' : ''},
}
`,
  ]
  return out.join('\n')
}

export const describe = meta => `${STYLES[meta.style]?.emoji ?? ''} ${meta.title} · ${meta.key}${meta.modeName ? ' ' + meta.modeName.toLowerCase() : ''} · ${meta.bpm} BPM · темы: ${meta.themes.A.title} + ${meta.themes.B.title}`

// ---- a generated part as an instrument of a project (src/project.js) --------------------------------------------------
// The piano roll plays the very recipe a song was made with: a lead recipe reads its voice from NOTE_AT (the project
// track's notes), a stage kit its hits from HITS (the notes by the kit's own General MIDI map), so a part turned into
// notes (❄) sounds as it did. → { code (a track object literal), names: { engine, instruments }, color, formula, map? }
// or null (a recipe that isn't played from a voice or a kit of the stage)
const PART_CACHE = new Map()
export function partInstrument(kind, id, variant = null) {
  const k = `${kind}:${id}:${variant}`
  if (PART_CACHE.has(k)) return PART_CACHE.get(k)
  const used = { engine: new Set(['mod', 'floor', 'exp', 'sin', 'TAU', 'hz', 'filter', 'reverb', 'delay', 'smooth']), instruments: new Set(['notesAt', 'hash', 'pan', 'trigger', 'poly']) }
  const need = (mod, ...n) => n.forEach(x => used[mod].add(x))
  const extra = { variant, pump: 0, dark: variant === 'cave', r: rng(7) }
  let out = null
  try {
    if (kind === 'lead' && LEADS[id]) out = { code: LEADS[id]({ at: 'NOTE_AT', lane: lane.lead, gain: 1, pan: 0, need, sw: 0.5, hard: false, tonic: 0, ...extra }) }
    else if (kind === 'kit' && KITS[id]) {
      setNOTE_HITS(true)
      setKIT_MAP(null)
      const code = KITS[id]({ need, drums: {}, ...extra })
      if (code.includes('const L = HITS[drum]') && KIT_MAP) out = { code, map: Object.fromEntries([...KIT_MAP].reverse().map(([d, n]) => [n, d])) }
    }
  } finally {
    setNOTE_HITS(false)
  }
  if (out) {
    out.names = { engine: [...used.engine], instruments: [...used.instruments] }
    // the MIDI note its midi() reports for n = 0 (a recipe an octave down says 48 + n): the notes are read back by it
    out.base = +(out.code.match(/midi: x => [^\n]*?\[(\d+) \+ m\.n/)?.[1] ?? 60)
    out.color = out.code.match(/color: '(#[0-9a-f]{3,8})'/i)?.[1] ?? '#cccccc'
    try { out.formula = JSON.parse(out.code.match(/formula: (\[.*?\]),\n/)?.[1] ?? 'null') } catch { out.formula = null }
  }
  PART_CACHE.set(k, out)
  return out
}
// the recipes that can be instruments: every lead recipe, the kits of the stage (the factory's in its three variants)
export const PART_IDS = () => ({
  lead: Object.keys(LEADS).filter(id => partInstrument('lead', id)),
  kit: [...new Set(Object.values(STYLES).filter(S => S.kit).map(S => `${S.kit}${S.variant && S.kit === 'factory' ? ':' + S.variant : ''}`))].filter(k => partInstrument('kit', ...k.split(':'))),
})
// which part of a generated song (its `generator` field) a track is, by its key in song.tracks: the recipe, and the
// level and side it had there — or null (a part made from the chords, not from a voice)
// the recipes a generated song (its `generator` field) was made with — drawn as generate() draws them, from the instrument seed
export function generatedRecipes(gen) {
  const S = gen?.styleDef ?? STYLES[gen?.style]
  // (the fugue, maqam, raga, gamelan and ambient styles write their own ensembles)
  if (!S?.lead || !S.chords || ['fugue', 'organ', 'maqam', 'raga', 'gamelan', 'ambient'].includes(gen.style)) return null
  const seed = (gen.seed ?? 1) >>> 0, RI = rng((gen.seeds?.instruments ?? seed * 104729 + 3) >>> 0)
  const inst = { lead: pick(RI, S.lead), lead2: pick(RI, S.lead2), chords: pick(RI, S.chords), bass: pick(RI, S.bass), pad: pick(RI, S.pad), arp: pick(RI, S.arp), texture: pick(RI, S.texture) }
  if (inst.lead2 === inst.lead) inst.lead2 = S.lead2.find(x => x !== inst.lead) ?? inst.lead2
  return inst
}
export function generatedPart(gen, key) {
  const S = gen?.styleDef ?? STYLES[gen?.style], inst = generatedRecipes(gen)
  if (!inst) return null
  const boss = gen.style === 'boss', louder = boss ? 1.6 : 1, counter = S.counter ?? COUNTER_VOICE[inst.lead] ?? inst.lead2
  const clean = t => t.replace(/[^\w ]/g, '').trim()
  if (key === clean(inst.lead)) return { kind: 'lead', id: inst.lead, vol: S.gains?.lead ?? 1, pan: 0.12 }
  if (key === clean(inst.lead2 === inst.lead ? inst.lead2 + ' II' : inst.lead2)) return { kind: 'lead', id: inst.lead2, vol: 0.9 * louder * ({ bells: 0.45 }[inst.lead2] ?? 1) * (S.gains?.lead2 ?? 1), pan: -0.3 }
  if (key === clean(counter + ' counter')) return { kind: 'lead', id: counter, vol: 0.5 * louder * (boss ? 2 : 1) * (S.gains?.counter ?? 1), pan: -0.4 }
  const variant = S.kit === 'factory' ? S.variant ?? null : null
  if (key === 'drums' && partInstrument('kit', S.kit, variant)) return { kind: 'kit', id: S.kit, variant, vol: 1, pan: 0 }
  return null
}
export { rng } from './gen/util.js'
export { STYLES, STYLE_FAMILIES, familyOf, STYLE_LIST, styleGroups } from './gen/styles.js'
export { adaptTheme, compose } from './gen/melody.js'
export { modeMapper } from './gen/micro.js'
export { METERS, METER_LIST } from './gen/meter.js'
