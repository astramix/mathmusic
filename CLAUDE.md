# Math Music — notes for Claude

Songs are JS files of math functions of x (time in beats), rendered to WAV/MIDI and played in
Ableton by the MathMusic Max for Live device (`MathMusic.amxd`, "Open song" → a file in `songs/`).
The user writes in Russian, playful ("мяу", "^^"); answer in Russian, keep it warm and short.

**Read this file instead of `src/engine.js` / `src/instruments.js`** — the APIs are summarised below.
Open a source file only to change it or when something here is unclear.

## Commands
- `node render.js songs/<name>.js` → `out/<name>/` (mix.wav, stems, .mid per track, graph.svg, graph.png)
  and a level table; `quiet?` = RMS > 22 dB below the loudest track, `hot?` = peak > −1.5 dB.
  Long songs take 10–60 s: use `timeout: 600000`.
  `--master [-14]` also writes mix-mastered.wav (src/master.js to that LUFS, −1 dBTP) and prints its loudness.
- Check the picture: Read `out/<name>/graph.png`.
- `npm test` (~2 min, `timeout: 600000`): every song renders with no NaN and no `hot?` (quiet? = warning),
  the generator (11 styles × 3 seeds: loads, renders, lead on its chords), retune (every song in two modes), theory, MIDI export, the song
  library's names/backup, the app build + syntax (acorn and `node --check`), microtones and tunings (test/micro.test.js).
- `node generate.js --style lofi [--seed 42 --key Dm --bpm 80 --length short|normal|long] [--theme id] [--render]
  [--mode rast] [--micro quarter|eighth] [--temperament werckmeister3] [--modulations] [--meter 7/8]`
  → `songs/<title>.js` (`--list` = styles and melodies; `--theme` picks theme A by its id). Same generator as
  the app's 🎲 menu.
- Program: `npm run exe [-- --shortcut]` → `MathMusic.exe` (viz/build-exe.js: page without my_songs, icon drawn in
  code, viz/launcher.cs compiled by Windows' own csc, C# 5). The exe serves the page + my_songs/ + generated/ itself (same API
  and checks as serve.js — test/serve.test.js runs both), opens Chrome/Edge `--app` with its own profile
  (%LOCALAPPDATA%MathMusicrowser) and exits when that window closes. Users need no Node.js.
  Вид → Окно / Полноэкранное окно (work area, resizeTo) / Полный экран (Alt+Enter, F11) — main.js `setWindowMode`,
  remembered in localStorage `mm.window`; resizing works only in such an app window, not in a browser tab.
- App: double-click `Visualizer.bat` (= `npm run app`: viz/serve.js on http://localhost:5178, builds the page on
  every load and writes my_songs/, generated/ and songs/ itself — no folder dialog; 127.0.0.1 only, writes need the
  `x-mathmusic: 1` header, plain file names only). `npm run viz` builds the standalone `MathMusic Live.html`
  (render.js rebuilds it too; opened as a file it saves via File System Access); `npm run dev` rebuilds on
  every change. See "The app" below.
- `npm run device` rebuilds `MathMusic.amxd` (only after moving the folder).

## Song file contract
```js
export default {
  name: 'lofi', bpm: 78, length: 224,                // length in beats
  key: 'F',                                          // 'Dm', 'E♭', 'F#m'… — note names are spelt by it
  style: 'lofi',                                     // the gallery's filter: a generator style id, or dnb hardstyle phonk gothic minimal
  sections: [[0, 'rain'], [16, 'beat'], …],          // labels on the graph
  tracks: { name: { color, graph(x), midi(x), audio(ctx), formula }, … },
  // optional: boss: { modes: { section: 'turn' | 'build' | 'live' }, attacks: { track: { tile: 'lava' | 'slime' | 'acid' |
  //   'frost' | 'corrupt' | 'tree' | 'water', move: 'snake' | 'wave' | 'spray' | 'rain' | 'pulse' | 'stab' } }
  //   (what its graph becomes and how it flies; the kick track also sets the rhythm), chord: x ⇒ 'F♯m', loop, outro (beats) } — a Glitch Forest boss; the game's
  //   tools/score-export.mjs turns it into js/score-data/<name>.js (MP3 + a score per beat)
  // optional: theme: 'lofi' (visualiser colours, viz/app/themes.js); generated songs also carry
  // style and generator: { style, seed, seeds: { melody, arrangement, instruments }, length, key?, mode?, micro?, temperament? }
  // optional: keys: [[0, 'D'], [80, 'F'], …] — a song that modulates: the score's signatures, note names by section
  // optional: meter: '12/8' (x is then a dotted quarter), '2+2+3/8' (additive: its groups), '2+2+3/8 | 2+2+2+3/8' (bars in turn)
  //   | meters: [[0, '4/4'], [120, '7/8'], …] per section — for the score (plain '9/8' is compound 3+3+3)
  // optional: mode: 'rast' (a modes.js id — a microtonal one makes the app spell E𝄳, B♭¹, D♯−37¢);
  //   tuning: { id: 'werckmeister3', name, offsets: [12 cents of C … B from 12-TET] } — what the song sounds in (export, inspector)
}
```
- `graph(x)` → number | number[] | null; y range −3…5. Lanes: drums 2…4.5, lead 1…3,
  chords −1…0.5, bass −3…−2, ambience ≈ −2.9.
- `midi(x)` → MIDI notes sounding at x (for Export). C4 = 60, A4 = 69. Microtones are fractional: 63.5 = E𝄳4,
  60.25 = C𝄮4 (rounded to the cent); a temperament doesn't show here — midi() is the written note.
- `formula` → LaTeX string or [main, …definitions]: the full math of the sound, shown in the visualiser.
  Macros: `saw sq tri Pi_d LP_{fc} HP BP SS_N Rev Dly Cho Tape ol lfsr`; t = s since the note,
  τ = beats since the hit, T = s since start. Older songs keep theirs in `viz/formulas.js`.
- `audio({ bpm, sample })` is called once; returns `x => sample | [l, r]`, fed every x in order.
  Seconds per beat `sec = 60 / bpm`. Use the bpm passed in (Live may change the tempo).
- Optional `sampleLayer('A' | 'B', gate)` tracks play samples dropped onto the device.
- Mixdown normalises the whole mix to −1 dB; balance tracks against each other only.
- Imports only from '../src/engine.js' and '../src/instruments.js' (the app compiles songs into plain
  functions — pages opened from disk can't run module workers); no other imports, no `export … from`.

## engine.js (import from '../src/engine.js')
`SR, floor, exp, sin, cos, tanh, PI, TAU, mod, between(x,a,b), clamp, lerp, hz(n, base=110)`,
`since(x, hits, period)` beats since the last hit · `lastStep(seq, x, rate=4)` → {v, τ} ·
`noise(seed)` → η() ∈ [−1,1) · `osc('sine'|'saw'|'square', phase)` → o(freq), o.reset() ·
`supersaw({voices, detune, width, seed})` → f ⇒ [l, r] · `filter('lp'|'bp'|'hp')` → f(x, fc, q) ·
`smooth(ms)` one-pole · `reverb({room, damp, wet})` → (l, r) ⇒ [l, r] ·
`delay({time (s), feedback, wet})` → (l, r) ⇒ [l, r] · `sampleLayer(slot, gate, {gain})`.

## instruments.js (import from '../src/instruments.js')
Pure: `notesAt(list, t)` (list of [start, n, d], sorted) → {n, d, τ, u, at} | null ·
`tail(x, rate, count, (j, τ) ⇒ y)` · `hash(j, seed)` ∈ [0,1) deterministic · `smoothstep` ·
`pan(y, p)` → [l, r] · `env(u, attack, release)` · `arrangement(sections)` → x ⇒ {name, i, t} ·
`fm(f, t, {ratio, index, decay, idecay})` bell · `pianoTone, epianoTone, vibesTone, marimbaTone,
uprightTone` = (f, t s, vel) ⇒ y · `meowBend(u)` · `vol4(v)` 4-bit volume · `VOWELS{a,e,i,o,u}`, `blend` ·
`improvise({start, length, rate, seed, scale: x⇒pcs, chord: x⇒pcs, lo, hi, phrase, rest, hold,
breathe, swing})` → events for a solo.

Builders (inside audio()): `poly(tone, {life, release})` → p(), p.hit(f, vel, durSec, delaySec) ·
`trigger()` → fire(key) true once per new key (use x − τ / note start) · `ar(attackMs, releaseMs)` ·
`plucker({life, decay})` KS strings, p.hit(f, vel, {bright, at samples}) · `guitarBody()` ·
`strings({voices, attack, release, cutoff, gain})` → s(freqs[]) ⇒ [l, r] ·
`flute()` → fl(f, on) · `voice({size, breath, rough})` → v(f, F[3], on) ·
`meower({size, rough})` → c(n from F5, u|null, tSec) · `bowed({base, body, sec})` → b(note, tSec) ·
`pulse(duty)`, `triangle4()`, `lfsr({metal})` → n(rateHz) chip channels ·
drums: `kickDrum()` (τ in BEATS, on), `snareDrum, clapDrum, hatDrum({decay, cutoff}), rimDrum,
shakerDrum` (t in SECONDS, on), `brushDrum()` → w(level) · `metal(scale)` 808 cymbal source ·
hardstyle: `hardKick({tail, drop, drive, bias, tone, sub, crush})` → k(t s, f tail Hz, on) (tune f to the key),
`reverseBass({drive, open, q})` → r(u ∈ [0,1) | null, f), `duck(t s, depth, release)` sidechain gain ·
textures: `vinyl()`, `rain()` → [l, r] · effects: `chorus({rate, depth, mix})`, `tape({wow, flutter,
drive, tone})` → (l, r) ⇒ [l, r].
Japan (plucked strings are a Karplus–Strong loop with a moving, exactly tuned delay: pitch error < 2 cents):
`shamisen({sawari})`, `koto()`, `biwa()` → s() sample, s.hit(f, vel, {from, glide, bend, bendAt, bendTime,
back, at (samples), keep}) — from = slide in (suri), bend/back = oshide pressed and let go, sawari = buzz;
shamisen and biwa are monophonic (keep = double stop) · `shakuhachi({breath, scoop})` → sh(f, on, {accent, vib})
(meri attack, yuri vibrato, muraiki) · `shinobue()` → fl(f, on) · `taikoDrum({pitch, decay, bend, crack, boom})`
→ d(t s, on) (odaiko ≈ 60, nagado ≈ 120, shime ≈ 420 Hz) · `kotsuzumi({pitch, bend})` · `woodClack()` (hyoshigi,
"ka") · `kaneDrum({f})` → k(t, on, damp) · `templeBellTone(f, t, vel)` · `kakegoe()` → k('yo'|'ha'|'sa', t s, on).
Orchestra: `timpaniTone, harpTone, celestaTone` = (f, t, vel) for poly() · `organ({voices, stops})` → o(freqs) ⇒ [l, r]
· `horn({bright})` → h(f, on, vel) · `brass({voices, bright, gain})` → b(freqs, vel) ⇒ [l, r] ·
`reed({kind: 'oboe'|'clarinet'|'bassoon'})` → r(f, on, vib) · `choir({voices, size, rough})` → c(freqs, F) ⇒ [l, r].
Composition: `voiceChords([[root, 3rd, 5th(, 7th)] pcs…], {lo, hi, voices})` → voice-led MIDI voicings (least motion,
no parallel fifths/octaves, the third never doubled).

## theory.js (shared by the generator, the app, the tests — not imported by songs)
`freq(n)` A4 = 440 · `pc(n)` · `parseKey('F#m' | 'E𝄳')` → {tonic (3.5 for E𝄳), mode, name?} · `keyName`, `keyLabel` ('F♯ минор') ·
`spell(n, key)` → 'B♭4' / 'C♯5' (by scale degree: E♯ in F♯ major; integers exactly as always). Microtones
(`spellParts(n, key)` → {letter, acc, alter, oct, cents, text, glyph (SMuFL), xml (MusicXML)}): Stein–Zimmermann–Gould on
the 48-EDO grid — 𝄳/𝄲 quarter tones, ♭𝄳/♯𝄲 three quarters, an eighth tone = an arrow on the semitone sign beside it
(𝄮 ♮↑ +25 ¢, 𝄱 ♯↓ +75 ¢, 𝄬 ♭↑, 𝄯 ♮↓, 𝄰 ♯↑, 𝄭 ♭↓); a key with `steps` (its mode's degrees) spells degree by
degree (C rast: E𝄳, B𝄳); `system: 'aeu'` Turkish commas above the Pythagorean natural (♭¹ koma, ♭⁴ bakiye, ♭⁵
küçük, ♭⁸ büyük mücenneb), 'persian' koron/sori, 'cents' a measured scale: the nearest note + cents (F4−37¢) · `songKey(song)` (song.key or
Krumhansl–Kessler, bass-weighted) · `SCALES` · `QUALITIES` · `roman('V7/V', key)` → {root, quality, tones, ivs} ·
`chordName(ch, key)` · `voiceLead(pcs, prev, {lo, hi, voices})` smooth compact voicings · `snap(n, pcs)`.

## modes.js (shared by the app, the generator, the tests — not imported by songs)
`MODE_GROUPS` — 99 modes in 16 groups, the well-known first: basic, church modes, pentatonics/blues, modes of melodic
minor, harmonic minor, harmonic major, Middle East/Balkans, Japan & East Asia, islands (Ryukyu, Gaelic), India (thaats),
then the microtonal ones (`micro: true`), each in its real tuning: Arabic maqamat in quarter tones (rast bayati sikah
huzam saba hijazRast suznak iraq; 24-EDO as in the Cairo 1932 theory), Persian dastgah-ha (shur homayun chahargah,
`system: 'persian'`), Turkish makamlar in 53 commas of Arel–Ezgi–Uzdilek (trRast ussak huseyni trHicaz trSaba kurdi
nihavent, `system: 'aeu'`), measured gamelan (slendro / pelog / pelogBem / pelogBarang: saron barung of Kyai Madu Laras,
Oxford, tuned 1987 — J. Montagu's tables; slendroKunst: Kunst's Kanyut Mesem; `system: 'cents'`), microchromatic grids
(quarter24, eighth48 — `grid: 24|48`: the generator writes ¼/⅛ tones into the melodies) and Thai 7-EDO; then symmetric.
Each { id, name, alt, iv (fractional semitones), system?, home (its usual tonic), short, text }. `MODES[id]` (old ids
pelogSelisir/pelogTembung → pelogBem), `isMicro(m)`, `keyWithMode(key, id)` (the key with the mode's steps/system for
spelling), `parentMode(iv)` (major/minor by the third; a neutral third leans by size), `spellScale(tonic, iv, system)`
(seven letters for seven notes: E♭ dorian → E♭ F G♭ A♭ B♭ C D♭; C rast → … E𝄳 … B𝄳), `modeTriads(iv, system)` ('n' = neutral),
`stepFormula(iv, system)` (Т–П… / ¾т / commas / cents), `degreeFormula`, `KEYS` (30 keys round the circle of fifths with signatures).

## score.js, musicxml.js (the staff view, MusicXML export, tests — not imported by songs)
`buildScore(song, { parts, key, mode, source })` → bars (meter per section, sections, chord symbols) × parts (events with
ticks: quarter = 48; types, dots, ties, triplets 3:2 where a beat divides in three, beams by beat group — 7/8 = 2+2+3,
12/8 by dotted quarters, grace notes for microtonal slides/turns, accidentals by signature and bar, a wide keyboard part
split at middle C onto two staves). Reading midi(): sampled 48×/beat, onsets quantized per beat (16ths vs triplets vs 32nds
— the best fit), a swung eighth (song's SW) written straight + «Swing», the written end recovered from the gate (78–97 %).
`guessParts`: melody / chords / bass by listening. `songChords`: a generated song's HARMONY, else template matching with
the bass weighted and hysteresis (lofi → Gm9 C13 Fmaj9 Dm9). `keySignature`: keys, diatonic modes (D dorian: none), a
microtonal mode written out (Rast: B𝄳 E𝄳; Turkish Rast: B♭¹ F♯⁴ — flats first). `musicXml(score)` → MusicXML 4.0 (valid
against the XSD): <alter> exact, <accidental> SZG names / koron / sori / smufl="accidentalKomaFlat", <key-step>/<key-alter>,
<harmony>, rehearsal marks, metronome, <swing>, tuplets, grace, cents of a measured scale as lyrics.

## master.js (the master bus — the worklet, export, render.js --master, tests)
`masterChain(params, sr)` → process(l, r) (delayed by `latency`): side signal high-passed below `monoBelow` (LR4), × `width`;
glue compressor (sidechain HP 90 Hz, RMS 10 ms, soft knee, `threshold ratio attack release`); `drive` (the gain to the
loudness target, after the compressor); true-peak limiter (5 ms look-ahead, 4× oversampled peak, sliding minimum + box
filter, release 80 ms, `ceiling` dBTP). `loudnessMeter` (M / S / I LUFS, true peak), `truePeak(L, R)`, `masterOffline(L,
R, params, { lufs, target })` (secant iterations to the target within 0.05 LU). `MASTER_PRESETS` (transparent glue warm
wide), `TARGETS` (peak −1 dBFS, stream −14, apple −16, ebu −23, club −9). In the app: player.js puts master.js in front
of worklet.js (exports stripped); masterui.js («🎛 Мастеринг», K; `app.master` in localStorage `mm.master`): live bus +
meter, the drive estimated from the rendered audio and corrected once by the meter after 25 s; export.js `masterIfOn`
(MP3/WAV/OGG, video; stems stay raw) masters the whole song in a worker.

## loudness.js
`lufs(L, R, sr)` integrated loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks, −70 / −10 LU gates), `loudnessRange`,
`kWeighting(sr)` — the editor's full check, A/B, mastering.

## tuning.js (temperaments and tuning files — the generator, retune, the app, the tests; not imported by songs)
`TEMPERAMENTS`: equal; just (5-limit on the tonic, Ptolemy's ratios); adaptive (each chord pure on its root: 5/4, 6/5,
3/2, the dominant's 7/4, 9/5, 15/8 — generator only); by spelling, on the chain of fifths so G♯ ≠ A♭: pythagorean,
meantone (¼ comma), edo19, edo31, edo53; fixed well temperaments werckmeister3, kirnberger3, vallotti (A4 = 440 kept).
`temperOffsets(id, key)` → 12 cents by absolute pitch class (the tonic keeps its 12-TET pitch for tonic/spelled kinds) ·
`adaptiveOffset(k, [3rd, 5th, 7th])` · `tuningFiles(song, { mode, base })` → Scala .scl + .kbm and Ableton Live 12 .ascl
(`@ABL REFERENCE_PITCH 3 0 <C4 Hz>` — Live calls MIDI 60 "C3", `@ABL NOTE_NAMES` spelt by the key) · `gridOf`, `quantize`.

## retune.js (the app's «эта же музыка в …», tests — not imported by songs)
`retuneSource(source, song, { tonic, mode }, { parse: acorn.parse, theme })` → { source, name, plan }: any song (built-in
too) as a copy in another tonic and mode. Code-level: hz is imported as __hz and wrapped, the song's `BASE * 2 ** (expr / 12)`
(or Math.pow) products are wrapped in __R, numbers/constants that are 12-TET note frequencies (73.42) are wrapped where they
scale or are passed to a call (not hz bases, not inside mf-like converters, not in drum/fx/graph objects, not sweeps), meower
and bowed get mapped note numbers. __R: Hz → MIDI → __N → Hz; __N maps each note to the same degree of the new mode
(`degreeTable`: altered notes keep their alteration unless it lands on a scale note), then to the new tonic (≤ a tritone),
continuous between notes (bends, vibrato). `modulations`: a section is in another key when its KK correlation with home is
≤ 0.2 and with the same mode t away ≥ 0.5 (0.5 more) and its notes fit that scale better — kept in the copy. midi() is
mapped the same way; the copy keeps `export default __retuneSong({ … })` with name/key/mode/theme in the literal (library.js
reads that form) and its parameters in `const __RT = {…}`, so retuning a copy starts from the original. Generated songs are
made again from their seeds instead (genui `regenerate`). test/retune.test.js retunes every song into two modes.
A song that writes a pitch some other way (a hand-made phase increment from a variable not built from these) is not moved.
Microtonal targets ({ tonic: 'E𝄳', mode: 'sikah' }) work the same way (`degreeTable` returns fractional shifts, midi()
reports 63.5); `target.temperament` adds `__RT.tm` (cents per section offset — the tuning follows each modulation) and
__T in __R; the copy gets a `tuning` field. The prelude ends with `// ---- end of the retune prelude`, so retuning a copy
replaces the whole prelude.

## The generator (src/generate.js, src/melodies.js)
`generate({ style, seed, key?, mode?, bpm?, length?, melody?, arrangement?, instruments?, sources?, theme?, micro?, temperament? })` → { source, meta }.
`mode` (a modes.js id): made in the major/minor with the same third, then every pitch (themes, voicings, bass) moves
into the mode by scale degree (`modeMapper`; other sizes: nearest note), chords renamed; the song gets `mode: 'dorian'`.
A microtonal mode the same way (C rast: E𝄳, B𝄳 in melody and chords — `describeChord` names them, 'n' = neutral third);
a quarter-tone key ('E𝄳' sikah) is made a semitone up and moved down (`shiftPitches`). `micro: 'quarter' | 'eighth'` (or the
modes quarter24 / eighth48) — `microMelody`: neutral steps (D–E𝄳–F), quarter-tone passing notes, slides and turns, or the
eighth tones of expressive intonation (leading tone +25 ¢, ♭6→5 −25 ¢, glides); the solo gets `MICRO`. `temperament` (a
tuning.js id) — `temperData`: TEMPER + tuneHz (offset interpolated between notes) wraps hz (imported as hz12), withNow
sets the beat for key changes and the adaptive tuning; the song gets a `tuning` field. Without these options (and the
others' dice untouched — each draws its own rng) a seed gives byte for byte the song it always gave.
Styles (`STYLES`): lofi bossa chiptune synthwave classical romantic jbattle kawaii space meow boss — each: tempo/keys, forms
(sections with roles intro/theme/themeB/bridge/solo/break/final/outro + energy), its theme list,
instruments per role (lead, lead2, chords, bass, pad, arp, texture), drum grooves as 16-step strings,
comping and bass patterns. Themes come from `MELODIES` (melodies of the songs here, each with its own
Roman-numeral harmony) and move to the new key/mode (accidentals follow the chord, leading tone over V),
varied: as written / ornamented / recomposed (`compose`: chord tones on strong beats, steps, leaps
filled, cadence). Bridge = new progression + composed melody. Computed parts: improvised solo, counter
from the chords or a canon, 4:3 arpeggio, half-speed outro, key change up. The emitted song is plain
code: data (HARMONY with voice-led voicings and the chord's 3rd/5th/7th, THEME_A/B, BRIDGE, plans) +
instrument recipes. New theme → MELODIES (+ the styles' `themes` weights); new sound → a recipe in
generate.js; then `npm test`. `modulations: true` (`planModulations`, its own rng): theme II to the dominant (major) or the
relative major (minor; the theme re-adapted, else the minor dominant) by a pivot chord where the style is classical/romantic;
the bridge by the style's list — parallel, enharmonic (the old key's leading-tone °7 = the new key's: C♯°7 = E°7), chromatic
mediant, relative, subdominant — composed in its key; the section after comes home. Each change: the bar before it gets
[pivot, V7 of the new key] (`transitionChords`) and a composed LINK phrase in the singing voice; chords spelt by `lk`
(the local key); the song gets `keys`. The 🎲 menu makes new songs with modulations; regenerating keeps a song's own.
`meter` (`METERS`: 3/4 5/4 7/8 9/8 7/4 7/8+9/8 12/8 6/8; not boss/jbattle): the song is made in 4/4 and `toMeter` maps its
time by a piecewise-linear w over `pin` → `pout` beats that keeps notes on the grid (7/8 halves the last beat, 9/8 doubles
the last eighth, 5/4 = 3+2 doubles beat 2, 3/4 doubles the first beat of each half bar, 7/4 = 4+3, 12/8 turns eighths into
triplet eighths); phrases get a copy per offset in the period and per speed; emit adds the bar geometry (barIndex,
barStartOf, inBar, barLen), chords by eighths, and `grooveFor` / `compFor` / `bassFor` build drums (K . S . K . S in 7/8,
waltz, 3+2, shuffle 12/8), comping and bass by the meter's groups (`MT` while emitting; 4/4 output is unchanged). The
form is fitted to the length the song will have in the meter; the song says `meter: '2+2+3/8'`.
A melody with `only: 'style'` (or a list of styles) is drawn by those alone — this keeps every
other style's seeds producing exactly the songs they did (check old vs new output when touching the library).
**boss** (⚔️ Босс-битва, 148–164 BPM, minor): the sound of overclock/finalbattle — hardKick tuned to the tonic
(`KICK_GAIN` evens out high tails), reverseBass between the kicks (rolling in the final), everything ducking
(`pumpAt`), supersaw hook, chip lead, brass stabs, the 60 Hz chip arp, growl or 4-bit bass, hardstyle kit,
riser/alarm fx. Extra role `build` (VI – VII – V – V, a run up to the dominant + trill, snare roll, kick
doubling); energy 3 = a drop; the solo is an equation (two sines snapped to chord/scale, sung by the hook).
Themes: boss-ascent, boss-requiem, boss-overdrive (written for it) + overclock-hook, finalbattle-theme,
chip-boss. Every boss song carries a `boss` field, so tools/score-export.mjs in Glitch Forest can take it.
**classical** (🎻 Барокко и классицизм) and **romantic** (🎼 Романтический оркестр): themes of Beethoven (Ode to Joy, the
Fifth), Mozart (Nachtmusik, Symphony 40), Bach (Little Fugue in G minor, Toccata in D minor), Grieg (Mountain King),
Dvořák (Largo) — public domain, harmonised with chord tones on the strong beats — plus two of our own "в духе"
Tchaikovsky and Chopin (`only: ['classical', 'romantic']`). Recipes: violin/oboe/flute/clarinet, horn and a singing
cello an octave down, celesta; continuo harpsichord, Alberti bass, Bach's prelude figure, pipe organ, nocturne
left hand, harp rolls, brass choir; harp/celesta arps; real timpani (`timpaniTone`) in the orchestral kit.
**jbattle** (⛩️ Японская битва, 140–164 BPM, minor): Japanese instruments on the boss machinery (`hard: true` in the
style → bossData, hardstyle kick on the tonic, reverse bass, `pumpAt`, build roles): shinobue (an octave up) or
shakuhachi lead, koto (oshide) or shamisen (tremolo) lead2, horn stabs, timpani as the bass, a koto arp, the taiko
kit (odaiko/nagado/shime/ka/kane, a roll doubling through builds), thunder/bell/riser fx. Its themes come from the
five Japanese songs (`only: 'jbattle'`); the solo is an improvised koto/shamisen solo.

## The app (viz/: build.js inlines everything into MathMusic Live.html)
viz/app/*.js are ES modules bundled as blob: modules (`import … from './x.js'`); src/theory, generate,
melodies, midi are importable the same way (embedded sources get `\n` line ends: CodeMirror's). main.js (menus Песня/Редактор/🎲/Экспорт/Вид, transport, legend,
inspector, live formulas) · player.js (worker pool renders tracks in parallel → page mixes stems → cache
→ AudioWorklet output; instant seek-back and mute, live code updates cross-fade in; the loop: the worklet plays a
continuous virtual stream, `vmap`/`songAt` map it onto the song, round [a, b) with the start blended over what follows
the end (LOOP_XF 1024); `switchTo` = A/B at the same beat from the other version's kept audio (KEEP 2), `trim` = loudness
match) · abui.js (A/B panel, B: the original of a copy / the saved code under a draft / any song, equal LUFS) ·
loop UI in main.js (🔁, L, [ ], Shift+drag on the timeline, Shift+click bars in the score; `app.setLoop([a, b])` beats) · worker.js
(classic worker) · worklet.js · runtime.js (ES module → function body, keeps line numbers) · view.js
(scene: classic / paper — axes, formulas pop up when a part enters / space 3D; the same code draws the
video frames) · editor.js (CodeMirror, lint, API hints from api.js, number sliders, full check with
LUFS) · pianoroll.js (edits `const NAME = [[beat, n, d], …]` in the code; rows in semitones, ¼ or ⅛ tones — chosen from
the notes / the song's mode) · genui.js (dialog: Строй, Микротоны ¼/⅛) · export.js (MP3
320 / WAV 24 / OGG Opus / MIDI type 1 via src/midi.js: every tick read, GM program by track name, drums
ch. 10 / MIDI MPE: microtones and tunings as per-note pitch bends — lower zone, members ch. 2–9, ±48 st, MCM + RPN 0 /
the tuning as .scl .kbm .ascl in a ZIP / stems ZIP) · scoreview.js («Ноты», S: the score as SVG in Bravura — viz/vendor/bravura, SIL OFL, embedded by build.js as a font-face;
parts chosen by checkboxes, justified systems, cursor + bar highlight following the player, a click seeks, ⬇ MusicXML) ·
video.js (MP4 H.264 + AAC|Opus via WebCodecs; saved into the project's **videos/** — `lib.videoFolder({ pick })` asked before encoding, `lib.writeVideo` in 16 MB pieces through the server, or a folder handle: videos/ in the chosen project folder or a folder picked once; downloaded only without one) · gallery.js (right click: duplicate,
rename, delete; built-in songs first, then my_songs/, then generated/, each on its own row; style chips filter by `style`) ·
library.js (my songs are files in **my_songs/**, the 🎲 songs nobody saved yet in **generated/** — each folder a `Shelf` with
its library.json (id, kind, pristine, dates); `shelfOf(e)`: pristine (a 🎲 song or a retuned copy nobody saved) → generated/, else my_songs/; Ctrl+S,
rename or duplicate (pristine: false) moves a song from generated/ to my_songs/; untouched generated songs found in
my_songs/ (older versions) move over on attach; the song list and the gallery show built-in, my_songs/, generated/; build.js
embeds both folders (not in the exe's page); the server API is /api/mine, /api/gen, /api/songs, /api/video (serve.js and launcher.cs; PUT ?append=1 adds a piece);
opened as a file the page reaches generated/ only when the project folder was chosen (else 🎲 songs wait in IndexedDB); from viz/serve.js the page writes it through the server (`serverFolder` — the same calls
as a directory handle), opened as a file through File System Access (dialog starts in Documents after an
explaining modal; the handle is kept in IndexedDB, the browser may ask to allow it again per session); a song saved before the folder is connected waits in
IndexedDB (`where: 'pending'`) and moves in on connect; unique names, file names transliterated, a renamed
song moves to its new file; "write to songs/" asks before replacing; tabs synced via a localStorage ping) ·
themes.js · scenery.js (Вид → «Тематический фон», `app.view.scenery`, on by default, also in videos: a landscape per theme —
space, rainy city, 8-bit hills, sunset sea, sakura, baroque hall, rose window + pointed arcade, outrun sun + grid, neon tunnel,
drift road, cats on roofs, ink mountains + torii, moonlit lake, jazz club; classic: `scenery2d` behind the curves (silhouettes
on world-fixed grids, the nearest layer on bar lines via X(b)); space: `sceneryBack` at the horizon + `sceneryRoad` props
every N beats beside the lanes, crossing the playhead plane on their beat, torii/lancet arches over all lanes. Driven by
`musicOf(scene)`: beat phase, downbeat, kick (drum tracks' onsets), energy, progress, section flash — never Math.random) ·
modesui.js («Лады» and «Тональность» side by side on the right, #keynav: a card per mode with notes spelt on the
tonic, steps, triads, cents, ▶ scale/chords and ▶ «и в 12-TET» for microtonal modes, quarter-tone tonics (E𝄳…); 30 keys;
«🎚 Строй»: a card per temperament — cents of every note in the key, ▶ a cadence in 12-TET and in the tuning, `app.temperament`
(localStorage `mm.temper`) for the next 🎲 songs. Picking one never stops the music and offers «↻ Эта же музыка → …» (genui
`sameIn`: a generated song again from its seeds, any other — built-in too — a retuned copy via retune.js,
in generated/ until Ctrl+S, going on from the same beat, paused stays paused) or «🎲 Следующая музыка → …» (`app.tonality` {tonic, mode} | null, kept in
localStorage `mm.tonality`; 🎲 makes new songs in it)). `node render.js my_songs/<file>.js` renders a saved song like any other.
Editing state: app.drafts (one localStorage key per song) holds a draft exactly while the code differs from
the saved one — `app.setDraft(cur, src)` keeps that true, `app.dirty(cur)` is the ●; `app.apply(src, { of: cur })`
drops edits of a song no longer open. generated/ keeps the last 20 (genui `KEEP`): each new 🎲 song pushes the oldest out,
except one with a draft; an edit alone (no Ctrl+S) leaves a song in generated/.
Test it in a real browser: Chrome headless over the DevTools protocol (Node's WebSocket, no puppeteer needed)
or puppeteer-core + the installed Chrome (`--autoplay-policy=no-user-gesture-required`).

## Patterns to copy (from existing songs)
- Struck/plucked notes: `poly` + `trigger` keyed on note start (lofi `rhodes`, bossa `vibes`).
- Sustained melody: `notesAt` per section, continuous instrument with an `on` flag (lofi `flute`).
- Drum kit: `barHits(b)` returns [pos, drum, vel] per bar (memoised), `lastHit(x, drum)` (lofi, bossa,
  chiptune). Fills on `b % 8 === 7`. Humanise velocity with `hash`.
- Sections: `const part = arrangement(SECTIONS)`, `is(x, ...names)`; melodies chosen per section.
- Mathematical ideas welcome: canons V(x − d), polyrhythms (note every 1.5 beats), improvised
  random walks, transposed reprises (key change), half-speed reprises, harmony computed from chords.

## Gotchas
- Call filters/oscillators every sample, even when silent (pass 0), or they click/freeze.
- Never `Math.random` — renders must be identical; use `hash` / `noise`.
- `kickDrum` takes τ in beats; the other drums take seconds (`τ * sec`).
- Swing: off-beat eighth at `SW ≈ 0.6` of the beat; keep the same SW in drums, bass, solos.
- Bass tends to come out loudest — aim its RMS 2–4 dB below the lead.

## Quality bar (the user asked for it)
Long and varied: **2–3 minutes**, 7–10 sections with real contrast (breakdown, solo, key change,
reprise, outro), 7+ tracks, real-sounding instruments from the library with reverb/chorus/tape,
at least one computed part (improvise, canon, polyrhythm, harmony from chords). After rendering:
no `quiet?` except ambience, look at graph.png, rebalance, render again.
The user is a professional musician with absolute pitch: exact equal temperament (A4 = 440), notes
spelt for the key, real voice leading, chord tones on strong beats, the chord's real fifth/third in
the bass (a ø7 has a diminished fifth), no clicks; declare `key` in every song.

## Songs so far (avoid repeating a style)
| file | style | bpm | key | ideas |
|---|---|---|---|---|
| example | minimal | 120 | Am | starter |
| synthwave, dnb, hardstyle, phonk, gothic | (original set) | — | — | — |
| meow | cat pop | 100 | F | meow formant synth, tomcat, purr, hiss snare |
| classical | baroque canon | 76 | D | V(x − 16j), harpsichord KS, timpani |
| kawaii | anime J-pop | 168 | A | royal road, chip lead, "na-ni" chops, key up |
| lofi | lo-fi hip hop | 78 | F | 3 min, Rhodes+tape, rain, improvised vibes, cat duet |
| chiptune | 8-bit game | 150 | C | 2 min, NES channels, 60 Hz arps, sfx, boss level |
| bossa | bossa nova | 120 | C | 2.5 min, nylon KS, clave, 2 solos, scat voice |
| voidchip | gothic chiptune in space | 120 | Dm→Em | 2.5 min, pulse organ, FM bells, choir, canon, 4:3 starlight, wormhole riser |
| overclock | boss: euphoric hardstyle × chiptune | 150 | F#m→G#m | 2 min, hardKick + reverse bass (rolling), sidechain, lead from chords, time warp "stuck" |
| rawcore | boss: rawstyle × dark chiptune | 155 | Cm→C#m | 2 min, crushed raw kick, screech, Echo canon L(x − 4), 3-3-2 gallop, 4:3 arps, half-time W(x) |
| finalbattle | boss: battle theme + hardstyle | 160 | Em→Gm→G | 2 min, growl bass, brass stabs, 7/8 chaos, piano mercy, melody = graph of sines |
| iron-protocol | generated boss (seed 4, theme boss-ascent) | 151 | Dm→Em | demo of «восхождение»: 3-3-2 sequence up i–VI–VII–V |
| final-core | generated boss (seed 5, theme boss-requiem) | 164 | Em→Gm | demo of «реквием»: dotted line over i–♭II–iv–V |
| crimson-kernel | generated boss (seed 6, theme boss-overdrive) | 153 | Cm→Dm | demo of «перегрузка»: 16th riff, Andalusian i–VII–VI–V |
| score-* (10) | classical scores | 52–200 | as written | `node tools/scores.js` writes them from the classical melodies of melodies.js: the theme 2–4 times with more voices, V–I; 30–90 s each |
| raiden | jbattle: Inazuma-like battle | 152 | Em→F#m | 2 min, miyako-bushi, shinobue/shakuhachi/shamisen/koto, spiccato ostinato, taiko, hardstyle storms, duel = inverted call, koto solo + glissandi, canon |
| kagekiri | jbattle: rawstyle × samurai | 150 | Dm | 2 min, shamisen screech (sawari + crush + wah), kick melody (tsuba), biwa tale, euphoric koto/supersaw theme, rolling rbass |
| oni-matsuri | jbattle: festival fight | 136 | D (yo)→Bm→E | 2 min, yo scale + sus chords, Euclidean taiko E(5,16)/E(7,16)/E(11,16) and E(5,12) (3:4), kane, hyoshigi, kotsuzumi + shouts, timpani bass |
| shogun-requiem | jbattle: epic, half time ↔ full | 168 | Cm→Dm→D | 2 min, in-scale + ♭II, male chant choir, biwa, 7/4 koto stretto K₂ = K₁(x − 3/2) − 12, chorale, boom kick, Picardy end |
| kitsune-bi | jbattle: fox chase in 12/8 | 112 (dotted ♩) | Am→Bm | 2.5 min, hirajoshi, triplet grid, hemiola 3:2, celesta fox fires (hash), shakuhachi improvises, two themes at once |
