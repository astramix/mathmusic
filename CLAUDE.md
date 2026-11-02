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
  the generator (39 styles × 3 seeds: loads, renders, lead on its chords (a microtonal slide into a note counts as that note); every style in one family; 20 seeds of every style parse), formulas (test/formulas.test.js: every formula — instruments, songs/, the generator — parses in KaTeX), instruments (test/instruments.test.js: the plucked strings, the electric bass and the funk guitar in tune to 2 ¢), counterpoint (test/fugue.test.js: fugues in 8 keys and 4 church modes break no rule),
  maqam (test/maqam.test.js: every note in its maqam, the oud and qanun tuned to the cent on a quarter tone),
  raga (test/raga.test.js: the raga's notes, aroha up / avaroha down, tihais on the sam, the shrutis),
  gamelan (test/gamelan.test.js: pitches of the measured laras to the cent, colotomy, irama II, the ombak),
  projects (test/project.test.js: every instrument plays, the block round-trips, a song becomes a project, notes back from
  midi(), arrangements under a melody), jazz (test/jazz.test.js: the walking bass's roots and chromatic approaches, rootless voicings, trading fours),
  celtic (test/celtic.test.js: its own modes and meters, cuts and rolls, the drone), ambient (test/ambient.test.js: the loops' LCM, the
  harmonic series' cents), audio styles (test/audiostyle.test.js: a synthetic band's tempo, key, chords and backbeat; a bar's
  partials, decays and a flute's vibrato measured back; resynthesis as loud as computed; a style's songs render, their
  formulas parse, a song made again from its generator field is byte for byte the same), harmonize (test/harmonize.test.js: key, chord tones, cadence; a song on your melody keeps it as written), retune (every song in two modes), theory, MIDI export, the song
  library's names/backup, the app build + syntax (acorn and `node --check`), microtones and tunings (test/micro.test.js).
- `node generate.js --style lofi [--seed 42 --key Dm --bpm 80 --length short|normal|long] [--theme id] [--render]
  [--mode rast] [--micro quarter|eighth] [--temperament werckmeister3] [--modulations] [--meter 7/8]`
  → `songs/<title>.js` (`--list` = styles and melodies; `--theme` picks theme A by its id). Same generator as
  the app's 🎲 menu.
- A new generator style: the `/style` skill (.claude/skills/style/SKILL.md — the checklist). `node tools/style-check.mjs <style>
  [--seeds 1-12] [--levels 1,2]` → per seed: key, mode, tempo, length, instruments, themes, the generator test's strong-beat check;
  the levels table of the chosen seeds (rendered in parallel, like render.js, without rebuilding the app).
- Program: `npm run exe [-- --shortcut]` → `MathMusic.exe` (viz/build-exe.js: page without my_songs, icon drawn in
  code, viz/launcher.cs compiled by Windows' own csc, C# 5). The exe serves the page + my_songs/ + generated/ itself (same API
  and checks as serve.js — test/serve.test.js runs all three servers), opens Chrome/Edge `--app` with its own profile
  (%LOCALAPPDATA%MathMusicrowser) and exits when that window closes. Users need no Node.js.
  Вид → Окно / Полноэкранное окно (work area, resizeTo) / Полный экран (Alt+Enter, F11) — main.js `setWindowMode`,
  remembered in localStorage `mm.window`; resizing works only in such an app window, not in a browser tab.
- Android: `npm run apk` → `MathMusic.apk` (android/build-apk.js, no Gradle: aapt2, javac --release 11, d8, zipalign,
  apksigner from the SDK — ANDROID_HOME or %LOCALAPPDATA%\Android\Sdk; JDK 17+ from JAVA_HOME or Android Studio's jbr;
  minSdk 30, target 36). The exe's page (+ android/bridge.js, viewport width=1600: narrower, the menu bar overlaps) in a
  full-screen landscape WebView (MainActivity) served by android/src/…/Server.java — plain Java, the same API and checks
  (test/serve.test.js runs it on the desktop JVM). Songs in Android/data/com.astramix.mathmusic/files/{my_songs,generated},
  exports through the server into Download/MathMusic/<kind>, videos into Movies/MathMusic; any other `<a download>` of a
  blob goes through bridge.js → the `MathMusicAndroid` bridge in base64 pieces → Download/MathMusic (MediaStore). Back = Esc, twice = exit. Long press = right click (no text selection).
  bridge.js sets devicePixelRatio to screen px / CSS px (MathMusicAndroid.width() / innerWidth = 1.5, not 2.625): the canvas
  at the screen's own resolution. `npm run apk -- --debug`: debuggable, WebView open to chrome://inspect.
  Signed with ~/.mathmusic/release.jks (made on the first build; pass MATHMUSIC_KEY_PASS, default 'mathmusic') — keep it,
  updates need the same key. Try it: the AVD in the SDK, `adb install -r`, screencap; an emulator's adb taps are slow
  (they may read as a long press) — WebView debugging (`setWebContentsDebuggingEnabled`, adb forward
  webview_devtools_remote_<pid>) + CDP for real gestures.
- App: double-click `Visualizer.bat` (= `npm run app`: viz/serve.js on http://localhost:5178, builds the page on
  every load and writes my_songs/, generated/ and songs/ itself — no folder dialog; 127.0.0.1 only, writes need the
  `x-mathmusic: 1` header, plain file names only). `npm run viz` builds the standalone `MathMusic Live.html`
  (render.js rebuilds it too; opened as a file it saves via File System Access); `npm run dev` rebuilds on
  every change. See "The app" below.
- `npm run device` rebuilds `MathMusic.amxd` (only after moving the folder).
- `node tools/from-audio.mjs file.wav [--name N] [--lead 49-80] [--bass a-b] [--keys a-b] [--seed 1] [--songs 1] [--render]`
  → a style from a recording (out/<audio-id>/style.json; `--style-json` that file generates again) and songs/<title>.js.
  WAV only here (tools/wav.mjs); the app decodes anything the browser does. --lead/--bass/--keys: seconds where that
  instrument plays alone — its timbre is resynthesised from there (from a full mix the lead's timbre is taken only when its
  notes are clean, purity ≥ 0.35; else a library instrument).

## Song file contract
```js
export default {
  name: 'lofi', bpm: 78, length: 224,                // length in beats
  key: 'F',                                          // 'Dm', 'E♭', 'F#m'… — note names are spelt by it
  style: 'lofi',                                     // the gallery's filter: a generator style id, or dnb gothic minimal
  sections: [[0, 'rain'], [16, 'beat'], …],          // labels on the graph
  tracks: { name: { color, graph(x), midi(x), audio(ctx), formula }, … },
  // optional: boss: { modes: { section: 'turn' | 'build' | 'live' }, attacks: { track: { tile: 'lava' | 'slime' | 'acid' |
  //   'frost' | 'corrupt' | 'tree' | 'water', move: 'snake' | 'wave' | 'spray' | 'rain' | 'pulse' | 'stab' } }
  //   (what its graph becomes and how it flies; the kick track also sets the rhythm), chord: x ⇒ 'F♯m', loop, outro (beats) } — a Glitch Forest boss; the game's
  //   tools/score-export.mjs turns it into js/score-data/<name>.js (MP3 + a score per beat)
  // optional: theme: 'lofi' (visualiser colours, viz/app/themes.js); generated songs also carry
  // style and generator: { style, seed, seeds: { melody, arrangement, instruments }, length, key?, mode?, micro?, temperament? }
  // optional: keys: [[0, 'D'], [80, 'F'], …] — a song that modulates: the score's signatures, note names by section;
  //   [beat, 'D', 'saba'] names a mode too (theory.keyAt asks modes.js — setModeKey — for its spelling: G♭ in Saba)
  // optional: meter: '12/8' (x is then a dotted quarter), '2+2+3/8' (additive: its groups), '2+2+3/8 | 2+2+2+3/8' (bars in turn)
  //   | meters: [[0, '4/4'], [120, '7/8'], …] per section — for the score (plain '9/8' is compound 3+3+3)
  // optional: parts: ['violin', 'viola', 'cello'] — the score's staves (else guessParts); signature: 'home' — with `keys`: the
  //   signature stays the home key's, the local keys only spell the notes (a fugue's entries, as Bach wrote them)
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
`fm(f, t, {ratio, index, decay, idecay})` bell · `resynthTone(M)` an instrument measured from a recording (src/timbre.js) for
poly(): partials as rotating phasors, levels by number/frequency (M.wF), decays by frequency, vibrato and scoop at a control
rate of 32 samples, noise in seven octave bands (a burst + a breath) · `pianoTone, epianoTone, vibesTone, marimbaTone,
uprightTone` = (f, t s, vel) ⇒ y · `meowBend(u)` · `vol4(v)` 4-bit volume · `VOWELS{a,e,i,o,u}`, `blend` ·
`improvise({start, length, rate, seed, scale: x⇒pcs, chord: x⇒pcs, lo, hi, phrase, rest, hold,
breathe, swing})` → events for a solo (lo/hi taken in whole notes: a microtonal theme's 8.5 used to give NaN).

Builders (inside audio()): `poly(tone, {life, release})` → p(), p.hit(f, vel, durSec, delaySec) ·
`trigger()` → fire(key) true once per new key (use x − τ / note start) · `ar(attackMs, releaseMs)` ·
`plucker({life, decay})` KS strings, p.hit(f, vel, {bright, at samples}) — exactly tuned (fractional delay minus the loop filter's
and the interpolation's phase delay; it used to round to whole samples: +8…+26 ¢) · `guitarBody()` ·
`strings({voices, attack, release, cutoff, gain})` → s(freqs[]) ⇒ [l, r] (with the body's resonances 280 Hz, 1.1 / 2.7 kHz) ·
`flute()` → fl(f, on) · `panpipe({breath})` → pp(f, on, vib) (a stopped pipe: odd harmonics 1, 3, 5, breath through the tube, a chiff and a scoop of ⅓ semitone into each note, a late 4.8 Hz vibrato) · `voice({size, breath, rough})` → v(f, F[3], on) ·
`meower({size, rough})` → c(n from F5, u|null, tSec) · `bowed({base, body, sec})` → b(note, tSec) ·
`pulse(duty)`, `triangle4()`, `lfsr({metal})` → n(rateHz) chip channels ·
drums: `kickDrum()` (τ in BEATS, on), `snareDrum` (two membrane modes 1 : 1.59 struck sharp, wires, the stick's crack), `clapDrum, hatDrum({decay, cutoff}), rimDrum,
shakerDrum` (t in SECONDS, on), `brushDrum()` → w(level) · `metal(scale)` 808 cymbal source ·
hardstyle: `hardKick({tail, drop, drive, bias, tone, sub, crush})` → k(t s, f tail Hz, on) (tune f to the key),
`reverseBass({drive, open, q})` → r(u ∈ [0,1) | null, f), `duck(t s, depth, release)` sidechain gain ·
stage: `clubKick({punch, decay, click, drive})` → k(t s, f, on) (two-stage dive onto f — tune it to the tonic) ·
`crashCymbal({decay})` → c(t s, on) · `clankTone` (struck steel, free-bar modes 1, 2.76, 5.40, 8.93) and `pluckTone` (a saw whose
harmonics die one by one = a closing filter, additive) and `spiccatoTone` (three players, body resonances) = (f, t, vel) for poly(),
the last two with .voice · `electricBass({bright, sustain})` → b(), b.hit(f, vel, {slap}), b.mute(τ) · `funkGuitar()` → g(),
g.strum(freqs, vel, {up, gap, dead}), g.mute(τ) (both exactly tuned KS) · `monoSynth({cutoff, env, res, decay, glide, sub, drive})`
→ s(f, on, vel) (2 saws + sub square, 24 dB resonant low-pass with an envelope) ·
textures: `vinyl()`, `rain()` → [l, r] · effects: `chorus({rate, depth, mix})`, `tape({wow, flutter,
drive, tone})` → (l, r) ⇒ [l, r].
Middle East (the exactly tuned strings: a quarter tone is a quarter tone): `oud()` / `qanun()` → o() sample, o.hit(f, vel,
{ from, glide }) (the qanun: a course of three strings ±3 ¢) · `ney()` → n(f, on, { vib }) (breath louder than tone, legato
slides) · `darbukaDrum()` → d(t s, 'dum'|'tek'|'ka', on) · `riqDrum()` → r(t s, 'jingle'|'dum'|'tek', on).
India: `sitar({ tarab: [Hz…], sawari })` → s() sample, s.hit(f, vel, { from (meend), bend, bendAt, bendTime, back })
(jawari buzz, the tarab strings as resonators at the raga's notes) · `tanpura()` → tp([f×4], period s, on) (plucks round and
round, heavy jawari) · `tablaDrum({ f: Sa })` → d(t s, bol, on): na/ta, tin, te, ge (the bayan's pitch rising), ke, dha, dhin.
`sax({ bright, breath })` → s(f, on, vel): a tenor saxophone (saw through a low-pass that opens with the breath, formants 600 /
1700 / 2900 Hz, a scoop into each note, a late vibrato, a growl when loud).
Metal: `metalGuitar({ gain, tight, scoop })` → g() ⇒ [l, r], g.hit(freqs, vel, { mute }), g.choke(τ) — exactly tuned strings into
`ampCab` (high-pass 90 Hz, pickup roll-off 4.5 kHz, a 900 Hz push into two tanh stages, the first biased, a 500 Hz scoop, a 4×12 cab:
low-passes 5.2 / 6.5 kHz, the box near 120 Hz, presence 2.5 kHz), double-tracked (+9 ms, ±0.7 ¢ either side), palm mute = sustain
0.16 s · `leadGuitar({ gain })` → l(), l.hit(f, vel, { from, bend, bendAt, bendTime, back }), l.choke(τ) (more gain, one string).
Gamelan tones for poly() (each a pair a few Hz apart: the ombak beats): `saronTone, bonangTone, kenongTone, kempulTone,
kethukTone, gongTone` = (f, t s, vel).
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
The new styles' voices: `opn({ algo, ratio, level, env: [[attack s, decay s, sustain, release s]×4], fb, detune, gain })` → v(f, on, vel) —
one FM channel of the YM2608 (OPNA, the PC-98): four operators, algorithms 0 (1→2→3→4), 2, 4 ((1→2) + (3→4)), 5 (1→(2,3,4)), 7 (all
carriers), operator 1's feedback, key-on restarts the envelopes (and the phases only from silence: no clicks) ·
`accordion({ voices, musette, gain })` → a(freqs, vel) ⇒ [l, r] — the bayan: three reeds a note (in tune, ±musette ¢), narrow pulses
through the box's 1.1 / 2.9 kHz, the bellows 25 / 70 ms, an octave reed below C3 · `cowbellTone(f, t, vel)` — the TR-808 cowbell
pitched like phonk's sample: two squares at f and 1.48f (540 / 800 Hz) summed partial by partial (band-limited) through the machine's
band-pass (centre 4.9f — 2.64 kHz over 540 Hz —, Q 1.3), the two-stage VCA (a 12 ms click onto a 0.32 s tail) · `steelpanTone(f, t,
vel)` — a tenor pan's note: modes f, 2.004f, 3f, 4.01f, the upper ones swelling in over 8–12 ms (the steel's nonlinearity: the
"bwong"), a rubber stick, low notes ring longer.

## theory.js (shared by the generator, the app, the tests — not imported by songs)
`freq(n)` A4 = 440 · `pc(n)` · `parseKey('F#m' | 'E𝄳')` → {tonic (3.5 for E𝄳), mode, name?} · `keyName`, `keyLabel` ('F♯ минор') ·
`spell(n, key)` → 'B♭4' / 'C♯5' (by scale degree: E♯ in F♯ major; integers exactly as always). Microtones
(`spellParts(n, key)` → {letter, acc, alter, oct, cents, text, glyph (SMuFL), xml (MusicXML)}): Stein–Zimmermann–Gould on
the 48-EDO grid — 𝄳/𝄲 quarter tones, ♭𝄳/♯𝄲 three quarters, an eighth tone = an arrow on the semitone sign beside it
(𝄮 ♮↑ +25 ¢, 𝄱 ♯↓ +75 ¢, 𝄬 ♭↑, 𝄯 ♮↓, 𝄰 ♯↑, 𝄭 ♭↓); a key with `steps` (its mode's degrees) spells degree by
degree (C rast: E𝄳, B𝄳); `system: 'aeu'` Turkish commas above the Pythagorean natural (♭¹ koma, ♭⁴ bakiye, ♭⁵
küçük, ♭⁸ büyük mücenneb), 'persian' koron/sori, 'cents' a measured scale: the nearest note + cents (F4−37¢) · `songKey(song)` (song.key or
Krumhansl–Kessler, bass-weighted) · `SCALES` · `QUALITIES` · `roman('V7/V', key)` → {root, quality, tones, ivs} (degrees in the major scale, ♭VI; in minor no accidental = the minor's degree, ♯ raises it: ♯vii°7 in Dm = C♯°7) ·
`chordName(ch, key)` · `voiceLead(pcs, prev, {lo, hi, voices})` smooth compact voicings · `snap(n, pcs)`.

## modes.js (shared by the app, the generator, the tests — not imported by songs)
`MODE_GROUPS` — 100 modes in 16 groups, the well-known first: basic, church modes, pentatonics/blues, modes of melodic
minor, harmonic minor, harmonic major, Middle East/Balkans, Japan & East Asia, islands (Ryukyu, Gaelic), India (thaats),
then the microtonal ones (`micro: true`), each in its real tuning: Arabic maqamat in quarter tones (rast bayati sikah
huzam saba hijazRast suznak iraq; 24-EDO as in the Cairo 1932 theory), Persian dastgah-ha (shur homayun chahargah,
`system: 'persian'`), Turkish makamlar in 53 commas of Arel–Ezgi–Uzdilek (trRast ussak huseyni trHicaz trSaba kurdi
nihavent, `system: 'aeu'`), measured gamelan (slendro / pelog / pelogBem / pelogBarang: saron barung of Kyai Madu Laras,
Oxford, tuned 1987 — J. Montagu's tables; slendroKunst: Kunst's Kanyut Mesem; `system: 'cents'`), microchromatic grids
(quarter24, eighth48 — `grid: 24|48`: the generator writes ¼/⅛ tones into the melodies), Thai 7-EDO and the harmonic series
(`harmonic`: overtones 8–15 — 11/8, 13/8, 7/4 —, `system: 'cents'`); then symmetric.
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

## counterpoint.js, fugue.js (the fugue style, tests — not imported by songs)
`counterVoice({ contexts: [{ voices: [{ notes, above }], shift | map }], rhythm, key, lo, hi, r, pins: [[beat, pcs]], chordAt,
bass, prev, next, invertible, maxHold })` → notes: a voice by dynamic programming over the key's notes with the species rules
as costs — consonance where a note begins on a beat, dissonance only as a passing/neighbour note (`passable`: short, off the
half bar, stepped into and out of), the 4th dissonant over the lowest sounding voice, B♭–C♯ / C♯–F in D minor dissonant
(`spelledDissonance`), no parallel or contrary 5ths/8ves (also across a breath and into `next`), hidden ones in outer voices,
no crossing, leaps answered by steps, no tritone/7th/aug 2nd, the raised 6̂/7̂ of minor going up. A slot is cut where another
voice begins a non-passing note and may be held on (tie) up to maxHold beats. Several contexts = one line judged in several
textures (the countersubject below the answer and above the subject: invertible at the octave). `check(voices, { key })` →
faults (dissonance, parallel, crossing, leap, augmented second). `speciesCanon({ key, bars, delay, interval })` → { dux, comes }:
beam search, florid rhythms bar by bar, the follower's cadence (ficta: its ♭7̂ raised). `freeRhythm`, `impliedChords`.
`composeFugue({ key, r, canon, canonBars })` (key may be { tonic, mode: 'modal', iv } — a church mode with a perfect 5th: entries
on degrees of the same scale, the answer on the 5th or, plagal, the 4th) → { voices: { s, a, b }, sections, keys, harmony,
entries, subject, answer, cs, faults, attempt }: subject by rule (32 candidates: head leap on 1̂/5̂, running tail, 2̂–1̂, chord
tones of a half-bar skeleton on the beats, singable in every key it will visit, stretto potential) → exposition (alto S,
soprano A + CS, codetta, bass S + CS + free) → episodes (descending-fifths chains to the next key's V; the soprano's motif —
a 4-beat window of the subject or CS — moved a step down per bar, bass on the roots) → middle entries (relative, subdominant)
→ stretto (the subject against itself δ beats later, checked) or a last entry → coda iv–V–I (♭II–I in Phrygian, Picardy).
Entries after a leap move the note before by an octave or take a breath. Up to 8 attempts; the first with no fault wins.

## maqam.js (the maqam style, tests — not imported by songs)
`MAQAMAT` (rast bayati saba sikah huzam hijazRast suznak iraq: ghammaz degree, pillars, modulations [mode, tonic shift],
descending alterations — Rast's B𝄳 → B♭), `IQA` (maqsum baladi saidi malfuf on 16 sixteenths), `degreePitch(mode, tonic, d,
down)`, `maqamPcs`. `composeMaqam({ mode, tonic, r, length })` → { sections, melody, taqsims, drone, iqa, keys }: taqsim (free,
the sayr low → ghammaz → high → down → qafla, phrases walking by step to resting notes, breaths) → dulab → lower jins →
ghammaz → tahwil (a related maqam) → taqsim II → lower jins → qafla; sections AA′BA in two-bar phrases (beam search over
degrees: steps, pillars on the strong beats, the cadence from above).

## raga.js (the raga style, tests — not imported by songs)
`RAGAS` (yaman bhairav bhupali bhimpalasi darbari malkauns: swaras, aroha, avaroha as a sequence — Darbari's zigzag —,
vadi, samvadi, nyas, pakad, andolan, drone, shruti ratios), `shrutiCents(raga)` (5-limit just, the raga's own: 45/32, 256/243,
32/27…), `THEKA` (teentaal), `tihai(phrase, C, gap)` (s₁ = C − e − 2(p + g)). `composeRaga({ raga, r, length })` → { sections, sitar,
bansuri, tabla, swar, manjira, gatStart }: alap (stages low → middle → high → home, `line`: exactly n notes along the ways with a
detour, meend and andolan marks), jor (a note a beat + chikari), gat and antara (4-beat phrases to nyas notes, the last to the
sam), taans (runs and alankars, sitar/bansuri sawal-jawab, a tihai), jhala (note + 3 chikari, a tihai to the end).

## gamelan.js (the gamelan style, tests — not imported by songs)
`LARAS` (slendro, pelog: measured cents, tone 1 = D4), `PATHET` (slendro manyura/sanga/nem, pelog nem/lima/barang: tones, gong
tone, strong tones), `FORMS` (ketawang 16, ladrang 32: kethuk, kenong, kempul positions; gong at the end), `ladder(pathet)`.
`composeGamelan({ pathet, r, form, length })` → { sections, balungan, peking, bonang, panerus, colot, kendhang, suling, A, B }: two
gongan of gatras ending on the pathet's strong tones (GATRA contours, rests = pin), buka → merong ×2 → ngelik → irama II (A, B) →
ngampat → suwuk (the last gatras stretching); garap per pair of balungan notes: peking a a b b, bonang a b a b, panerus ×2,
densities × irama; the suling's long tones toward the next kenong goal in irama II.

## ambient.js (the ambient style, tests — not imported by songs)
`LOOP_PERIODS` (17, 20.5, 23.5, 25.75, 29, 31.25, 34.5, 37, 39.75, 41.5 beats), `lcmOf(periods)` (exact, in quarter beats),
`composeAmbient({ iv, tonic, r, length })` → { sections, loops [{ period, from, to, inst, vel, pan, notes [offset, n, d] }], pad, lcm }:
sections by how many loops sound (2 → 4 → 6 → 5 → 3 → 1), loops entering and leaving in order, notes from the scale's chord
tones in a register per instrument, the pad's chord per section ('tide' leans to the 4th degree).

## harmonize.js (the generator's userTheme, the piano roll — not imported by songs)
`keyCandidates(notes)` (24 keys by Krumhansl–Kessler on weighted durations), `harmonize(notes, { key?, per? })` → { key, keyName,
per, chords (romans), notes (from beat 0), fit, score }: Viterbi over the key's chords (triads, sevenths, secondary dominants and
borrowed chords dearer) — the note at each step's start a chord tone, passing notes cheap, roots by fifths, V → IV avoided, a
secondary dominant resolving, I first, V – I at the end; without a key, the likeliest six keys are tried and the best fit kept.
Two chords a bar (one when the melody only holds). `userMelody(notes)` → a MELODIES entry (id 'user').

## project.js (projects: songs of note tracks — the app's multitrack editor, tests; not imported by songs)
A block in the song file between `// ==== MathMusic project` and `// ==== end of the project`: `PROJECT = { song?: { bpm, key,
mode, length, sections }, removed?: [code track keys], tracks: [{ id, name, inst, vol, pan, fx?, notes: [[beat, MIDI, length,
vel]], gen?: { style, seed, kind, part?, ref? } }] }` (plain JSON, a bar of notes per line), the instruments used, and
`__project(song)` — `export default __project({ … })` adds a track per PROJECT track (key = its name, made unique), drops the
`removed` ones, applies `song`. MIDI may be fractional; every pitch 440·2^((n−69)/12). `INSTRUMENTS` (76, in `GROUPS`: keys,
mallets, plucked (KS koto/oud/qanun/sitar…), bowed, winds, voices, synths, bass, gamelan, drums): { id, label, group, kind poly |
mono | chord | drums, role lead | keys | pad | bass | drums, range, fx, color, program (GM, −1 drums), level (evened out by
measured rms), formula }. The generator's own sounds are there too (pluck, synthlead, moog, sawchords, hornsection, spiccato,
funkguitar, slapbass, clubbass, seqbass, growl, clubkit — its kick at a fixed 50 Hz); `instrumentFor(name, style, fallback)` maps
a generated track's recipe name to them ("pluck counter" → pluck, a plain "bass" by STYLE_BASS). projectui `usedInstruments()`: the
pickers (＋ dialog, a track's select, ⋯ → Инструмент) show an instrument in use as «● name — tracks» in that track's colour.
**Как в песне**: the generator's recipes themselves as instruments — `gen:lead:<recipe>` (33 voices) and `gen:kit:<kit>[:<variant>]`
(the 10 stage kits), `GEN_INSTRUMENTS`, make `{ lead } | { kit }`: generate.js `partInstrument(kind, id, variant)` emits the recipe with
its voice from NOTE_AT (the track's notes; `base` = the MIDI its midi() says for n = 0 — 48 for an octave-down voice) or, NOTE_HITS,
a kit's lastHit from HITS (the notes by the kit's own GM map, `drumNames` for the piano roll's rows); the block adds RECIPE_STAGE (C4,
pumpAt, energy, chordAt… standing still) and passes N as make's third argument. `generatedPart(song.generator, key)` says which
recipe a generated song's track is (lead / lead2 / counter / drums, from the instrument seed) and its level and side — ❄ «в ноты»
uses it, so a part sounds as it did (test/project.test.js: notes back, level within 2 dB); pickers: «Звуки этой песни» first,
«Звуки генератора» last. Parts made from the chords (chords, bass, arp, pad): `frozenPart(gen, key)` → the library instrument for
the song's recipe (`generatedRecipes(gen)`: the instrument seed's picks — the bass is just "bass"; RECIPE_INST for sawpad / brass
stabs → sawchords, tremolo → the `tremolo` instrument), at RECIPE_LEVEL (measured: the song's part over the same notes, two seeds of
every style, the median) — within 4 dB in the test, the voices on their recipe within 2. Drum kits take General MIDI numbers (36 kick, 38 snare, 42 hat…; tabla by pitch class). A track object
carries `program` — midi.js / musicxml.js use it before guessing by name. `newProjectSource`, `readProject`, `writeProject(src, p,
{ parse })` (a song that isn't one yet: the block before `export default`, its value wrapped), `trackKeys`, `readTrackNotes(midi,
length)` (notes back from midi(): gated lengths restored), `instrumentFor(name, style)`, `roleOf`, `alignedParts(parts, melody,
len)` (where theme A sounds as written in a song made on that melody → the other parts cut to it). `retuneProject(src, song,
target, { parse, retunePlan, retuneSource, modeOf })` — Лады → «эта же музыка в …» for a project (genui `sameIn` checks it before
regenerating): every pitched note to the same degree of the new mode on the new tonic (`moveNote`: an altered note keeps its
alteration from the nearest degree; ♭3 of C major → ♭3 of D dorian = F; another scale size: the nearest note; drums stay),
PROJECT.song key/mode, `PROJECT.tuning` = the temperament's offsets (F() adds them to whole notes); code tracks, if any, through
retuneSource, whose __retuneSong skips tracks with `project: true` and whose prelude stays in front of the project block. A user theme longer than its
section makes the theme/final sections grow (generate.js), so it plays whole.

## analyze.js, timbre.js, audiostyle.js (a style from a recording — the app's 🎧, tools/from-audio.mjs, tests; not imported by songs)
`analyzeAudio(mono, sr, { progress })` (at 22.05 kHz) → { bpm, beats, downbeat, swing, key { tonic, mode, modal, ranked },
bars [{ t, beats, end, chords [{ root, q, roman }] (two per bar), drums { kick, snare, hat: 16 steps }, tonal (pitched onsets),
bass (8 eighths: pc, hit), db, drumLevel }], sections [{ from, bars, energy, role }], melody, clean (notes alone: purity),
drumSound { kick { f, decay }, snare { bright }, hat { len, bright } }, brightness }. Tempo: Ellis's DP beat tracker; the
candidates (autocorrelation peaks × ½ ⅔ ¾ 1 4⁄3 3⁄2 2, 60–200) judged by how the onsets fall on their sixteenth grid in 8-beat
windows (G) and on the beats (B); the double tempo only by a margin of 0.1 in G (30 of 31 of our renders right). Key:
Krumhansl–Kessler on the chroma + the bass, whose pitch is found by harmonic summation (a low note's fifth and octave
fool a plain chroma), then the harmony decides among the likeliest 8 (the tonic chord's time, phrase starts, cadences
V → I / ♭VII → i, the last chord) — 24 of 32; a mode only on clear evidence of its degree. Chords: 7 qualities × 12 by
templates per half bar, Viterbi with a wish to stay; `romanOf(ch, key)`. Downbeat: where the chords change (+ kicks).
`measureNote(x, sr, { t, d, n })`, `extractTimbre(x, sr, notes)` → model { kind struck | sustained, f0, B, wF, p: [[ratio,
level, attack, decay /s, sustain]] (peaks of the note's early spectrum — inharmonic too —, 6 dB above what rang before the
onset, weak ones only on harmonics), fa / fd (spectral envelope / decay over Hz from every note), attack, release, vib
{ rate, depth ¢, delay }, scoop ¢, noise { atk[7], sus[7] (octave bands NOISE_BANDS 212 … 13576 Hz, against the partials'
peak power), dec } }; wF: how the spectrum follows pitch — by partial number or by frequency (formants), whichever predicts
the measured notes better; `loudnessOf(M)` the RMS of a played note, computed (the app cannot load engine.js).
`styleFromAudio(mono, sr, { name, regions: { lead | bass | keys: [s, s] }, progress })` = analyzeAudio + `buildStyle(A, mono,
sr, { name, regions, key, palette })` → { style, analysis, timbres, report }: a STYLES entry with id `audio-<slug>`, the
harmony's two commonest 4-bar loops as `ownThemes` (the recording's melodic rhythm, new notes by `compose` on its chords),
the form (roles from loudness and drums), drums = the nearest groove of our plain styles (GROOVE_LIB; the kick's click
taken out of the snare's band first — a dense mix's raw transcription is not a drummer's), comp from the pitched onsets,
the bassline from the bass track, `kit: 'audio'` with `kitSound`, the accompaniment of the nearest plain style
(PALETTES by brightness, swing, drums, tempo; `palette` overrides), `timbres` { lead, bass, keys } → instruments
'timbre:lead' / 'timbre:bass' / 'timbre:keys' (generate.js TIMBRE recipes: poly(resynthTone(M)) at M.gain), `names`.
`generate({ styleDef })` plays it (S = styleDef: LIB gets its ownThemes, UT its timbres while emitting, NAMES its names);
the song's `generator.styleDef` carries the whole style, so mutations, «эта же музыка в …», the radio work on it.

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
Drums never move: a track named like `UNPITCHED` (drum kick snare hat perc clap … fx riser taiko) keeps its midi() (GM 36 stays
the kick) and runs with `__D` set (`__R` = identity), hz() inside a drum-named const/property stays the engine's `__hz`; the
project's drum tracks are skipped by retuneProject, and its «Транспонировать» is off for them.
Microtonal targets ({ tonic: 'E𝄳', mode: 'sikah' }) work the same way (`degreeTable` returns fractional shifts, midi()
reports 63.5); `target.temperament` adds `__RT.tm` (cents per section offset — the tuning follows each modulation) and
__T in __R; the copy gets a `tuning` field. The prelude ends with `// ---- end of the retune prelude`, so retuning a copy
replaces the whole prelude.

## The generator (src/generate.js, src/melodies.js)
`generate({ style, seed, key?, mode?, bpm?, length?, melody?, arrangement?, instruments?, sources?, theme?, micro?, temperament?, userTheme? })` → { source, meta }.
`userTheme: { notes: [[beat, MIDI, length]], title? }` — a melody of your own: harmonized (harmonize.js), theme A as written (no
ornament, no recomposing, the celtic graces skipped), the song in its key unless asked; the song's `generator` keeps it.
`mode` (a modes.js id): made in the major/minor with the same third, then every pitch (themes, voicings, bass) moves
into the mode by scale degree (`modeMapper`; other sizes: nearest note), chords renamed; the song gets `mode: 'dorian'`.
A microtonal mode the same way (C rast: E𝄳, B𝄳 in melody and chords — `describeChord` names them, 'n' = neutral third);
a quarter-tone key ('E𝄳' sikah) is made a semitone up and moved down (`shiftPitches`). `micro: 'quarter' | 'eighth'` (or the
modes quarter24 / eighth48) — `microMelody`: neutral steps (D–E𝄳–F), quarter-tone passing notes, slides and turns, or the
eighth tones of expressive intonation (leading tone +25 ¢, ♭6→5 −25 ¢, glides); the solo gets `MICRO`. `temperament` (a
tuning.js id) — `temperData`: TEMPER + tuneHz (offset interpolated between notes) wraps hz (imported as hz12), withNow
sets the beat for key changes and the adaptive tuning; the song gets a `tuning` field. Without these options (and the
others' dice untouched — each draws its own rng) a seed gives byte for byte the song it always gave.
**Families** (`STYLE_FAMILIES`, the menus' order, most finished first; `STYLE_LIST` follows it, `styleGroups(keep)` for menus/optgroups,
`familyOf(id)`): ⚔️ Арена (boss jbattle fight) · 🎮 Игровой (factory factorycave factorydanger darkecho prime artifact brinstar) · 🕹️ Ретро-игры
(zunpet oldzun podskazka chiptune) · ⚡ Неоновый танцпол (edm hardstyle synthwave) · 🌃 Андеграунд (phonk breakcore babushka) · 📻 Радиоволна
(disco kawaii) · 🎬 Большой экран (epic ishope nordic) · 🏛️ Концертный зал (romantic classical fugue organ) · 🌙 После полуночи (jazz bossa lofi) ·
🌌 Невесомость (ambient space) · 🌍 Голоса Земли (celtic maqam raga gamelan) · 🎈 Разное (meow).
A new style goes into a family (test/generate.test.js checks every style is in exactly one).
Styles (`STYLES`): lofi bossa chiptune synthwave classical romantic jbattle kawaii space meow boss fugue organ maqam raga gamelan jazz celtic ambient
edm disco epic factory factorycave factorydanger darkecho ishope prime nordic artifact zunpet oldzun fight babushka podskazka hardstyle phonk
breakcore brinstar — each: tempo/keys, forms
(sections with roles intro/theme/themeB/bridge/solo/break/final/outro (+ build, trade) + energy), its theme list,
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
**fugue** (🎹 Фуга и канон, 60–80 BPM): `generateFugue` (returns before the other dice are drawn) — composeFugue on the melody
seed, an ensemble on the instrument seed (`ENSEMBLES`: chamber — flute/oboe/bassoon in the canon, violin/viola/cello in the
fugue, harpsichord continuo, violone + organ chords in the tutti; strings; organ — gedackt/flute 4′/pedal, principals + pedal 16′,
mixture + posaune 16′; harpsichord — lute stop, 8′ + 8′, 4′ and 16′), `fugueTrack` per [name, voice, phases, instrument, dn].
The song: SOPRANO/ALTO/BASS, HARMONY (the continuo's chords), PHASES canon/fugue/tutti, `keys` + `signature: 'home'`, `parts`.
`length: short` drops the canon (6 tracks). A church mode → a modal fugue; other modes, `micro` and `meter` are ignored;
`temperament` works (Werckmeister III, meantone… suit it). Its seeds are new, so the other styles' songs are untouched.
**organ** (⛪ Органная прелюдия и фуга, 60–76 BPM, theme 'gothic'): generateFugue with `S.ensemble: 'organPrelude'` and `S.prelude` —
`composePrelude(key, r)` (its own dice): a progression of 16 bars from PRELUDE_PROGS (two per mode; secondary dominants, ♯vii°7 in
minor, the last bar V7 held: a half cadence into the fugue), voice-led in four parts, each half bar broken into the figure v0 v1 v2 v3
v1 v2 v3 v2 in sixteenths on the plenum (principals 8′ 4′, quint, 2′, mixture: PRELUDE / `preludeAt`, the 'plenum' track), the pedal
16′ on the bass — the tonic under the first two bars, the dominant under the two before the cadence (PEDAL); then the fugue's
whole plan moves on by the prelude's length (PHASES.prelude). The 🎲 menu's «⛪ Радио — бесконечный орган» keeps making them
(radio.style = a style id). test/fugue.test.js: no fault, the prelude first, every bar one chord broken up.
**maqam** (🪘 Макам, 88–112 BPM, theme 'desert'): `generateMaqam` — composeMaqam on the melody seed; a takht in heterophony:
the oud (TAQSIM_1, risha strokes on long notes), the qanun (tremolo every ⅛ beat, the lower octave), the ney (legato, the
quickest notes left out), the violin, the cello (the melody an octave down on the beats; DRONE under the taqsims), darbuka +
riq (`strokeAt`: the cycle, ka between, a tek fill every 4th bar). The second taqsim by the instrument seed (ney / qanun /
violin). midi() is fractional (63.5); the song has `mode`, `keys` with the tahwil's maqam, `signature: 'home'`.
**raga** (🪷 Рага, 72–92 BPM, theme 'india'): `generateRaga` (opts.raga, or a thaat as opts.mode: kalyan → yaman, bhairav,
kafi → bhimpalasi, bhairavi → malkauns, aeolian → darbari) — Sa C3 or D3; SITAR with ORN (meend, andolan = a bend down and back),
CHIKARI, BANSURI, TABLA bols, MANJIRA (sam, tali, khali), SWAR strums; everything through `tuneHz` with the raga's TEMPER (the
song's `tuning: { id: 'shruti' }`).
**gamelan** (🔔 Гамелан, 60–76 BPM = balungan beats, theme 'java'): `generateGamelan` (opts.pathet, or opts.mode slendro / pelog /
pelogBem / pelogBarang picks among its pathet; form by the arrangement seed) — saron (+ demung), peking, bonang, panerus,
kenong, kempul, kethuk, gong, kendhang (dhah / tak / ket), suling; song `mode: 'slendro' | 'pelog'`, midi() fractional (cents).
**jazz** (🎷 Джаз, 116–168 BPM, swing 0.66, theme 'jazz'): the ordinary generator with its own pieces — three heads of our own
(`only: 'jazz'`: Blue Corner on ii–V–I–IV–viiø–III7–vi, Rhythm Hill on I–vi–ii–V turnarounds, Night Train on the relative
minor's ii–V–i), voicing 'jazz' (rootless A/B: 3 5 7 9, 3 13 7 9, ♭3 ♭5 ♭7 11), bassline 'walking' (root on a chord's first
beat, chord tones between, a half step above or below the next root before it), KITS.jazz (ride ding ding-a, hat on 2 & 4,
feathered kick, snare comping, brushes when quiet; a triplet drum solo in the drums' bars of trading fours), Charleston
comping, LEADS sax / trumpet, the role 'trade' (TRADE: improvised in bars 1–4, 9–12…, the drums answer), TEXTURES.club.
**celtic** (☘️ Кельтская музыка, 100–126 BPM, theme 'celtic'): the ordinary generator; the style lists `modes` (major, mixolydian,
dorian) and `meters` ('6/8' jig or 4/4 reel) that it draws with its own dice when the options don't say (`S.modes`, `S.meters`),
`ornate` (`celticOrnament`: cuts — a grace a step above, 1/16 beat before — and rolls on long notes, own dice); tunes of our own
(The Hazel Road reel, Loch na Gealaich air, `only: 'celtic'`); LEADS whistle (the shinobue an octave up) and pipes (an oboe-reed
chanter over three tonic drones), BASSES.drone (tonic + fifth on reeds), KITS.bodhran (don / rim / tip), guitar, harp arps.
**ambient** (🌫️ Генеративный эмбиент, 56–72 BPM): `generateAmbient` (mode by its dice: harmonic, lydian, dorian, major,
mixolydian — or opts.mode) — LOOPS data + `strikes(inst, x)` (each note again every period while from ≤ x < to), tracks piano,
bells, glass (celesta), choir, pad (strings / choir / organ, its low-pass breathing on 64 beats), drone (the harmonic series'
fundamental, or the tonic), wind; the head says the LCM in beats and years.
**jbattle** (⛩️ Японская битва, 140–164 BPM, minor): Japanese instruments on the boss machinery (`hard: true` in the
style → bossData, hardstyle kick on the tonic, reverse bass, `pumpAt`, build roles): shinobue (an octave up) or
shakuhachi lead, koto (oshide) or shamisen (tremolo) lead2, horn stabs, timpani as the bass, a koto arp, the taiko
kit (odaiko/nagado/shime/ka/kane, a roll doubling through builds), thunder/bell/riser fx. Its themes come from the
five Japanese songs (`only: 'jbattle'`); the solo is an improvised koto/shamisen solo.
**The stage** (`S.club` / `S.stage` → `stageData`): SEC, sectionEnd, KEY_UP/trAt in the code; a club style also gets KICK_N (the kick's body on
the tonic, D♯1–D2), `KICK` (16 steps per energy), `kickAt` (none in the bridge unless `club.bridgeKick`, none in a build-up's last bar —
the silence before the drop), `pumpAt` (duck × `club.pump`, ×0.6 below a drop) and a 'kick' track (`clubKickTrack`, `club.sound`).
Recipes then get `hard: true` (pumpAt) and `variant`, `pump`, `dark`, `r`; `S.counter` picks the counter-voice, `S.gains` { lead, lead2,
counter, chords, pad, bass, arp, kick } evens out the mix. No meters (four on the floor). Kits on `stageHits` (a pattern per bar from the
role and energy, the build-up's roll 1 → ½ → ¼ → ⅛).
**edm** (⚡ Фестивальный EDM, 124–128): supersaw hook in the drops, LEADS.pluck (pluckTone, dotted-eighth echo), CHORDS.pumpsaw
(supersaws, low-pass by energy), BASSES.clubbass (off-beat eighths, rolling sixteenths in the final drop), ARPS.pluckarp,
KITS.edm (clap + snare, off-beat open hats, crash), TEXTURES.sweeps (riser, downlifter, impact). Themes Skyline, Afterglow (`only`).
**disco** (🪩 Нью-диско и фанк, 112–122): LEADS.moog (monoSynth) / trumpet / sax, CHORDS.funkguitar (16th chicken scratch: X chop muted
after 0.1 beat, x dead "chk", down/up strokes), BASSES.slapbass (electricBass, slap on the roots, pops on the octaves, staccato),
ARPS.horns (brass on the "and" of 2 and on 4, a fall every 4th bar), KITS.disco (tambourine = riqDrum jingle, toms). Mirrorball, Roller Rink.
**epic** (🎬 Эпический трейлер, 84–100, `stage: true`, no club kick): LEADS.hornsection (brass: f, f·1.0017, f/2), CHORDS.ostinato (spiccato
in 3 + 3 + 2, sixteenths in the action), BASSES.lowstrings (celli + basses in octaves; bowed when calm), KITS.epic (taiko, toms, military
snare, the boom 70 → 32 Hz, a reversed crash into each drop), TEXTURES.braam. Themes Banners, Last Stand.
**factory / factorycave / factorydanger** (🎮 конвейер — the music of factory games like Mindustry, Factorio: late-pixel synths ≈ 120 BPM
with an epic edge; `variant` city / cave / danger): ARPS.conveyor (the belt: 16 chord-tone steps drawn by the instrument seed, rests,
accents every 3 sixteenths = 3 : 4), LEADS.synthlead (monoSynth + chorus/echo), BASSES.seqbass (sequence R/8/5/♭7 per variant),
KITS.factory (snare, hats, clank on the off-steps, rim; the caves in half time with a shaker, danger with toms and a crash every 2 bars),
TEXTURES.machines (hum on the tonic, a piston every 2 beats, steam) / drips (water drops, tunnel wind) / alarm (a siren far away in the
drops, explosions). Themes Conveyor Dawn, Deep Ore, Core Breach (`only` the three); modes by their own dice (mixolydian / dorian, phrygian).
**The dark scores** (`S.variety`: as written 2 / ornamented 2 / recomposed 3 (×1.5 for B) — the themes come back changed more often; a
recomposed theme that ends on its dominant ends open (5̂ / 2̂); both only where a style has `variety`, so the older styles' seeds are
byte for byte as before — checked against HEAD on 216 songs). Each has three themes of its own (`only`), all in minor, chord tones on
the strong beats: **darkecho** (🕯️ Тёмное эхо, 62–74, post-apocalypse, no bright theme: Ashen Road, Hollow Choir (i ♭II iv i), Cold
Furnace (a lament, a chord every half bar)): cellolead / piano / choir, CHORDS.tremolo (strings in 32nds sul ponticello), lowstrings,
the conveyor belt at half speed, KITS.ruins (a drum far away, steel struck where the hash says, a chain, a heartbeat), TEXTURES.ashwind
(wind, a Geiger counter denser with the energy, a radio between stations, metal groaning as it cools). **ishope** (🔥 Is there any
hope?, 74–88, heavy, half time, never four on the floor: Iron Rain (i ♭II VI V), Last Watch (Andalusian), No Dawn (i iv ♭II V7)):
LEADS.leadgtr (a bend up into every long note, a slide after a leap) / choir / hornsection, CHORDS.metalgtr (power chords — the chord's
own fifth — a riff per energy drawn by the instrument seed: X open, P palm-muted, - choked), BASSES.metalbass (picked, clean lows +
driven top, a gallop when everything plays), KITS.metal (double kick in 16ths under the snare on 3, crash, china, toms), braam or
ashwind. **prime** (👁️ Залы чозо, 86–102, Metroid Prime × horror: Chozo Ruins (i IV VI V, octave leaps), Phazon (i/♭II every half
bar), Frozen Halls (i7 IV VImaj7 V)): synthlead / bells / choir, tremolo or dark pumpsaw, seqbass, pluckarp, KITS.prime (industrial:
deep toms, a tight snare, ticks, a heartbeat, a reversed swell into the build), TEXTURES.horror (a waterphone: inharmonic partials
1, 2.31, 3.88, 5.62 gliding; a sub drone two octaves under the tonic; a metal screech; breath). **nordic** (🏔️ Северные горы, 76–92,
in the spirit of a Skyrim score; Aeolian / Dorian / minor: Dovah, Seven Thousand Steps (Dorian IV), Frostfall (minor v)):
LEADS.malechoir (eight men in octaves, a syllable per note — the vowel moving from «у» into o/a/e/i over 90 ms) / horn, flute /
violin / whistle, the spiccato ostinato, lowstrings, ARPS.kantele (KS lyre, 1 5 3 5 8 5 3 5), KITS.nord (a great drum in 3 + 3 + 2,
frame drums, a field snare), wind. Project instruments for them: metalgtr, leadgtr, metalbass, malechoir, kantele.
`S.micros` (like `modes` / `meters`): a style may draw `micro` with its own dice (seed ^ 0x51c40) when the options don't say.
**artifact** (🗿 Artifact Temple, 96–112): the Chozo halls in slendro (the user's find: prime + slendro + ⅛/¼ tones) — `modes` slendro ×3 /
slendroKunst, `micros` null / eighth / quarter (pelog left out: its eighth-tone slides fell off the chords); prime's kit, tremolo or dark
pumpsaw, seqbass, choir/synthlead/bells over LEADS.saron (saronTone) / celesta / pluck, ARPS.bonang (two rows interlocking — imbal —, eighths,
sixteenths when loud, left/right), TEXTURES.temple (the gong ageng on the tonic every gongan of 32 beats and at each loud section, kempul on
the root every 8, a sub drone, wind); prime's themes (`only: ['prime', 'artifact']`) + Relic Chamber (a minor-pentatonic line: slendro takes
it note for note).
**brinstar** (🌿 Brinstar Depths, 76–84 BPM, theme 'void', `stage: true`): the deep jungle of a 16-bit adventure (our own themes in its idiom, none of
the game's): LEADS.panpipe (the `panpipe` instrument, an echo hall) / vibes / bells, lead2 epiano / flute / bells, counter vibes, CHORDS.rhodes (sparse
comping) or tremolo, strings or choir pad, BASSES.fretless (`electricBass` bright 0.22, sustain 1.6, no slap, a long–short line on the root and fifth),
ARPS.marimba (bubbles at ½ beat), KITS.tribal (a soft kick, tomL / tomM / tomH and a bongo by `taikoDrum`, a rim, a shaker; half time; the build-up's roll
on the mid tom), TEXTURES.jungle (rising bubbles, insects = a noise band chopped at 31 Hz, a vent every 16 beats, a creature groaning every 32, a rumble, a
long wet echo); modes minor / dorian / phrygian; themes Deep Moss (Em: i VI iv V7), Spore Drift (Dm: i ♭II VII i), Lair Below (Am: i VII VI V7) (`only`).
Project instruments: panpipe, fretless.
**zunpet** (🎺 ZUNpet, 148–176, Touhou's Windows era): LEADS.zunpet (two bright brass voices ±4 ¢ — the SC-88 trumpet —,
a scoop into each note, a late vibrato), lead2 piano / violin / flute (the stage theme), counter violin, CHORDS.zunpiano (octave bass and
off-beat chords in 3 + 3 + 2, rolling sixteenths over two octaves in the spell cards), BASSES.zunbass (picked electric bass in octaves,
pushed sixteenths, a half step into each next root), KITS.zun (crash on every phrase, tom fills, ride when calm); themes Shrine of Endless
Spring (VI – VII – v – i royal road), Moonlit Mansion (3 + 3 + 2, iiø7 – V7). **oldzun** (💾 OldZUN, 128–156, the PC-98 games): `opn` voices —
LEADS.fmbrass (algorithm 4, modulators swelling in after the carriers; its own SSG square echo a dotted eighth later), fmlead (algorithm
5), fmbell, ssg (a square in 16 volume steps), CHORDS.fmepiano (1 : 1 body + 14 : 1 tine), BASSES.fmbass (a feedback operator striking the
pair, 90 ms), ARPS.ssgarp, KITS.opna (the chip's six rhythm samples held every other sample, 9 bits); themes Lotus Bay, Maple Mirage.
**fight** (🥊 Test your fight, 128–146, `club` pump 0.3, broken kick in round 1): rhythm first — LEADS.glass (a soft FM ping deep in a
dotted-eighth echo, `gains.lead` 0.8: a motif, not a tune), CHORDS.stabs (minor-seventh stabs in syncopation, 3-voice supersaws, filter
snapping shut), BASSES.acid (a 303-style line the seed draws: accents, slides) or reese (two saws 14 ¢ apart, the low-pass breathing over
8 beats), PADS.ambipad, KITS.fight (breakbeat snare with ghosts over the club kick, perc, shaker), TEXTURES.arena (drone, wind, an impact
on every round, risers); themes Arena Pulse, Kombat Circuit (i / ♭II). **babushka** (👵 Кибербабушка, 138–150, `club` pump 0.5): LEADS.folkchoir
(three women in the open «white» voice and an alto an octave down, a syllable per note, a scoop up), balalaika (two KS strings, a small
triangular body, tremolo in 32nds on long notes), zhaleika (reed + horn bell), counter synthlead (the cyber layer), CHORDS.bayan (`accordion`:
bass button root/fifth on the beats, chord on the off-beats), BASSES.hardbass (off-beat driven saw/square dropping from a fifth above in
12 ms), ARPS.gusli (a glissando up the chord), KITS.babushka (spoons in 16ths, tambourine, clap, hands in the intro), TEXTURES.shouts
(«эй!», «ух!», «оп-па!», «ай!» — two voices, one with a digital grain); themes Коробейники (folk, PD), Эх, пляши! (chastushka), Степь да
кибер; Russian section names. **podskazka** (❤️ Подсказка, 112–150, the Undertale / Deltarune sound): LEADS.snesbrass (saws through an
opening low-pass, rounded to 11 bits, the console's echo), musicbox (a comb's tines, an octave up), pulse; piano / NES chiparp comping,
BASSES.snesbass (slapped on the beats, popped on the octaves, 3 + 3 + 2 line), KITS.snes; themes Stubborn Riff (Dm battle riff), Fields of
Small Hopes, Lantern Home (both diatonic major, modal). **hardstyle** (🔊 Хардстайл, 148–154, `hard` + `djKick` + `antiClimax`): bossData's
kick on every beat of the DJ intro and outro too (`dj`), the climaxes on the kick and the reverse bass, the story break (piano or pluck on
theme B, strings, BASSES.hssub), CHORDS.gatesaw (held in the breaks, a 16th trance gate x-xx-xx-x-xx-xx- in the climaxes), the solo role is
the anti-climax: lead and lead2 rest, TEXTURES.screech plays (two driven saws + a square through a resonant band sweeping like a mouth, the
pitch zapping down an octave onto each note, on the roots) — plus risers, downlifters, a sub impact; KITS.hardkit (reversed cymbal into each
drop); `gains.kick` / `gains.rbass` set the hard kick's level (jbattle keeps 0.6 / 0.7); themes Euphoria Gate, Skyfire. **phonk** (🏎️
Дрифт-фонк, 124–138): LEADS.cowbell (`cowbellTone` driven by tanh 2.4, high-passed, echoed), steelpan (`steelpanTone`), BASSES.b808 (a driven
sine, held, sliding 45 ms, an octave hit now and then), KITS.trap (clap on 3, hats rolling 16ths → 32nds every other bar, triplets in the
drops), TEXTURES.memphis (vinyl, pitched-down tape voices «ха», «эй», «йе»), dark rhodes or pumpsaw; themes Midnight Drift, Memphis Ghost.
**breakcore** (💿 Брейккор, 180–220): KITS.amen — the Amen break as 64 sixteenth slices; each sixteenth plays its slice, one from anywhere, or the
one before (stutter), by chaos (0.15 – 0.45 – 1 in the solo «chaos»); snare rolls ×4/×8 a sixteenth rising in pitch; slices sped up or slowed
(k 1.5 / 0.75, as a sampler); every edit cuts what rang before (5 ms); the breakdown plays the break at half speed an octave down; gabber kicks
in the chaos; through a 9.5 kHz low-pass and 8 bits — under slow minor-ninth melodies (piano / bells / synthlead), BASSES.reese, ambipad,
TEXTURES.glitch (static, crushed noise bursts); themes Static Tears (i9 – VImaj7 – IIImaj7 – VII…), Glass Rain.

## The app (viz/: build.js inlines everything into MathMusic Live.html)
viz/app/*.js are ES modules bundled as blob: modules (`import … from './x.js'`); src/theory, generate,
melodies, midi are importable the same way (embedded sources get `\n` line ends: CodeMirror's). main.js (menus Песня/Редактор/🎲/Экспорт/Вид, transport, legend,
inspector, live formulas) · player.js (pause holds the worklet ({type:'run'}), the AudioContext keeps running — the piano roll's sounds never wake a
paused song; worker pool renders tracks in parallel → page mixes stems → cache
→ AudioWorklet output; instant seek-back and mute, live code updates cross-fade in; the loop: the worklet plays a
continuous virtual stream, `vmap`/`songAt` map it onto the song, round [a, b) with the start blended over what follows
the end (LOOP_XF 1024); `switchTo` = A/B at the same beat from the other version's kept audio (KEEP 2), `trim` = loudness
match) · abui.js (A/B panel, B: the original of a copy / the saved code under a draft / any song, equal LUFS) ·
loop UI in main.js (🔁, L, [ ], Shift+drag on the timeline, Shift+click bars in the score; `app.setLoop([a, b])` beats) · worker.js
(classic worker) · worklet.js · runtime.js (ES module → function body, keeps line numbers) · view.js
(scene: classic / paper — axes, formulas pop up when a part enters / space 3D; the same code draws the
video frames. Cheap for a phone's GPU, which pays per stroke and per vertex: drawPath thins each polyline (a sleeve: every
point left out within 0.3 px), 3D strokes a track's segments by 6 % steps of depth at once; `lite` 1|2 drops glow passes,
bevel joins) · Вид → «Качество графики» (main.js QUALITY: high / mid ×0.8 lite 1 / low ×0.65 lite 2; 'auto' steps down,
remembered as `V.autoQuality`, after 3 s under 28 fps while playing; videos always full) · editor.js (CodeMirror, lint, API hints from api.js, number sliders, full check with
LUFS) · pianoroll.js (edits `const NAME = [[beat, n, d], …]` in the code; rows in semitones, ¼ or ⅛ tones — chosen from
the notes / the song's mode; «🎹 играть»: Web MIDI input — pitch bend ±2 st gives ¼/⅛ tones on those grids — and the computer's
keys A W S E D F T G Y H U J K O L P (Z/X octave, Shift +one pitch-grid step), a monitor tone; «⏺ запись»: notes on the song's
beats while it plays (snapped to the grid), step input from a green cursor when paused (chords: keys together);
«✨ песня» + a style: genui `fromMelody(notes, style)` → a whole song on the melody; drag on empty space = area selection
(Ctrl adds), Ctrl+A, the selected notes drag together; a project track has a velocity lane (a selected stem moves all selected,
else paint), Alt+↑↓ ±5 %, MIDI velocity recorded; drum tracks: whole-note rows only (a row is a drum); reloads wait for the mouse
(`pendingLoad`), the selection kept by note, not index; on the left the track list of
projectui.js: every song's tracks — the project's (edited here: absolute MIDI, the others faint behind, drum rows named), the
code's (read only, ❄ = into notes, 🗑 = `removed`, ↶) — M/S, instrument, volume, pan, room, ⋯ menu; ＋ a track (empty, a melody in a
style, a part under another track's melody), 🎼 arrangement (the generator on the melody as userTheme, `alignedParts`, the bass on
the style's bass instrument; 'all' adds/overwrites tracks, or one track gets the part of its role), 🔁 rewrite (its gen with a new
seed); «Песня → Новый проект…» (name, tempo, tonic, any of the 100 modes, bars, first instrument, a melody in a style)) · genui.js (dialog: Строй, Микротоны ¼/⅛; 🎲 → «Стили из аудио»: each kept style → сочинить / удалить) · audiostyleui.js
(«🎧 Стиль из аудиофайла»: a file dropped or picked, decoded by the browser, analyzeAudio on the main thread (a few seconds),
what was heard shown; key, palette and solo regions (lead / bass / keys, seconds) correct it — buildStyle again at once;
💾 keeps it in localStorage `mm.audioStyles` (30 at most), 🎲 makes a song) · export.js (MP3
320 / WAV 24 / OGG Opus / MIDI type 1 via src/midi.js: every tick read, GM program by track name, drums
ch. 10 / MIDI MPE: microtones and tunings as per-note pitch bends — lower zone, members ch. 2–9, ±48 st, MCM + RPN 0 /
the tuning as .scl .kbm .ascl in a ZIP / stems ZIP) · scoreview.js («Ноты», S: the score as SVG in Bravura — viz/vendor/bravura, SIL OFL, embedded by build.js as a font-face;
parts chosen by checkboxes, justified systems, cursor + bar highlight following the player, a click seeks, ⬇ MusicXML) ·
video.js (MP4 H.264 + AAC|Opus via WebCodecs; saved like every export, in exports/video/) · **exports/**: every export (MP3, WAV, OGG, MIDI, stems, tuning, MusicXML, the
source, video) lands in the project's exports/<kind>/ — export.js `saveExport(kind, name, blob, folder)`: `lib.exportFolder(kind, { pick })`
(asked before a long render: the click allows the folder dialog), `lib.writeExport` (a free name, 16 MB pieces through the server, or a
folder handle: exports/ in the chosen project folder or a folder picked once); downloaded only without one; the toast says where.
Toasts fade and slide out while their height folds (ui.js close) · gallery.js (right click: duplicate,
rename, delete; built-in songs first, then my_songs/, then generated/, each on its own row; style chips filter by `style`) ·
library.js (my songs are files in **my_songs/**, the 🎲 songs nobody saved yet in **generated/** — each folder a `Shelf` with
its library.json (id, kind, pristine, dates); `shelfOf(e)`: pristine (a 🎲 song or a retuned copy nobody saved) → generated/, else my_songs/; Ctrl+S,
rename or duplicate (pristine: false) moves a song from generated/ to my_songs/; untouched generated songs found in
my_songs/ (older versions) move over on attach; the song list and the gallery show built-in, my_songs/, generated/; build.js
embeds both folders (not in the exe's page); the server API is /api/mine, /api/gen, /api/songs, /api/export/<kind> (mp3 wav ogg midi stems tuning musicxml code video; serve.js, launcher.cs, Server.java; PUT ?append=1 adds a piece);
opened as a file the page reaches generated/ only when the project folder was chosen (else 🎲 songs wait in IndexedDB); from viz/serve.js the page writes it through the server (`serverFolder` — the same calls
as a directory handle), opened as a file through File System Access (dialog starts in Documents after an
explaining modal; the handle is kept in IndexedDB, the browser may ask to allow it again per session); a song saved before the folder is connected waits in
IndexedDB (`where: 'pending'`) and moves in on connect; unique names, file names transliterated, a renamed
song moves to its new file; "write to songs/" asks before replacing; tabs synced via a localStorage ping) ·
themes.js · scenery.js (Вид → «Тематический фон», `app.view.scenery`, on by default, also in videos: a landscape per theme —
space, rainy city, 8-bit hills, sunset sea, sakura, baroque hall, rose window + pointed arcade, outrun sun + grid, neon tunnel,
drift road, cats on roofs, ink mountains + torii, moonlit lake, jazz club, desert night (crescent, medina, dunes, fanous lanterns,
horseshoe arches in 3D), temple night (shikharas, the river with lotuses, diyas on the beats, toranas in 3D), Java (a smoking volcano,
stupas, rice terraces), green hills (a ruined tower, mist, standing stones with glowing spirals, trilithons in 3D); classic: `scenery2d` behind the curves (silhouettes
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
| synthwave, dnb, hardstyle, gothic | (original set) | — | — | — |
| phonk | drift phonk (rewritten) | 130 | Gm | 2.5 min, the real 808 cowbell (two squares through its band-pass), steel pan answering, sliding 808, trap hat rolls, Memphis tape voices, dark choir |
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
| eternal-fugue | generated organ (seed 1) | 65 | Cm | prelude i – iv – V7 – i – VI – iiø7 – V7 … – V7 on the plenum over the pedal, canon on gedackt and flute 4′, fugue on the principals, mixture and posaune in the stretto |
| fughetta-serena | generated fugue (seed 1) | 66 | Cm | canon at the octave (flute/oboe/bassoon), 3-voice fugue: tonal answer, invertible CS, sequences, stretto, Picardy coda |
| bahr-al-layl | generated maqam (seed 2, bayati) | 101 | D bayati | quarter tones (E𝄳), taqsims of oud and ney, tahwil to Hijaz, takht heterophony, maqsum |
| nadi-swar | generated raga (seed 1) | 88 | D (Sa) bhairav | alap → jor → gat → antara → taans → jhala, shrutis 256/243 & 128/81, andolan, tihais |
| gendhing-sri-rejeki | generated gamelan (seed 1) | 73 | slendro | measured laras, colotomy, irama I → II → ngampat → suwuk, ombak |
| moody-walk | generated jazz (seed 1) | 133 | B♭ | Night Train + Rhythm Hill heads, walking bass, rootless comping, vibes solo, trading fours, club room |
| misty-harbour | generated celtic (seed 6) | 107 | A mixolydian | jig in 6/8 on the uilleann pipes with drones, rolls and cuts, flute air, harp, bodhrán |
| tidal-fields | generated ambient (seed 2, harmonic) | 66 | C harmonic series | loops of 17 … 41½ beats, LCM in centuries; overtones 8–15 over their fundamental |
| kitsune-bi | jbattle: fox chase in 12/8 | 112 (dotted ♩) | Am→Bm | 2.5 min, hirajoshi, triplet grid, hemiola 3:2, celesta fox fires (hash), shakuhachi improvises, two themes at once |
| thorium-district | generated factory (seed 1): conveyor, town | 121 | C mixolydian | the belt (a seeded 16-step pluck sequence, accents 3 : 4), sequenced analog bass, clanks, plant hum, Conveyor Dawn |
| echoing-grotto | generated factorycave (seed 1): conveyor, caves | 111 | D phrygian | half-time kick, dark pumping saws, choir pad, water drops and tunnel wind, long echoes, Deep Ore |
| breach-swarm | generated factorydanger (seed 1): conveyor, danger | 131 | D phrygian | build-ups → drops, supersaw, supersaw stabs, toms, a siren far away, Core Breach |
| skyline-pulse | generated edm (seed 1) | 125 | Fm | club kick on the tonic, sidechain 0.75, pluck, off-beat bass, riser + impact, breakdown without the kick |
| funky-fever | generated disco (seed 1) | 115 | Dm | chicken-scratch guitar and slap bass (exactly tuned KS), horn section, Moog lead, Mirrorball |
| shattered-oath | generated epic (seed 1) | 89 | Cm | spiccato ostinato 3 + 3 + 2, horn section, taiko + boom, braams, reversed cymbals, Last Stand |
| forsaken-signal | generated darkecho (seed 1) | 66 | E phrygian | 2.5 min, cello over tremolo strings, the belt at half speed, ruins' drums, Geiger counter, Cold Furnace |
| burnt-march | generated ishope (seed 1) | 78 | D phrygian | double-tracked metal guitars (amp + cab), lead guitar with bends, double kick under a half-time snare, No Dawn |
| ancient-depths | generated prime (seed 1) | 91 | E phrygian | Metroid × horror: glassy synth lead, tremolo strings, industrial kit, waterphone, sub drone, Frozen Halls |
| ancient-throat | generated nordic (seed 1) | 81 | E aeolian | male choir in octaves, spiccato ostinato, kantele, war drums in 3 + 3 + 2, Frostfall |
| gilded-sanctum | generated artifact (seed 4) | 98 | E♭ slendro, ⅛ tones | synth lead and celesta over bonang imbal, gong ageng every gongan, Relic Chamber |
| bronze-altar | generated artifact (seed 8) | 103 | E slendro, ¼ tones | choir and saron, bonang, dark saws, Phazon in slendro |
| lunar-dream | generated zunpet (seed 4) | 152 | Em | ZUNpet on Moonlit Mansion, violin stage theme, ZUN piano, picked bass, key up |
| spring-festival | generated zunpet (seed 8) | 161 | Am | Shrine of Endless Spring on the ZUNpet, piano, choir pad, crash on every phrase |
| twilight-disk | generated oldzun (seed 3) | 128 | Bm | PC-98: FM lead and FM bells, FM e-piano, FM slap bass, SSG arpeggio, OPNA rhythm, Lotus Bay |
| twilight-square | generated oldzun (seed 11) | 148 | Dm | FM brass with its SSG echo, Maple Mirage, key up |
| shadow-tower | generated fight (seed 3) | 128 | C♯m | acid bass, synth stabs, breakbeat over the club kick, Arena Pulse as a quiet motif |
| iron-fist | generated fight (seed 4) | 130 | Em | Reese bass, glass motif in the echoes, impacts on every round, Kombat Circuit |
| chrome-matryoshka | generated babushka (seed 3) | 138 | F♯m | balalaika tremolo on Коробейники, zhaleika, bayan oom-pah, hard bass, spoons, shouts |
| babushka-balalaika | generated babushka (seed 4) | 140 | Dm | the babushka choir on Степь да кибер, balalaika, gusli, «кибер-пляска» with a key up |
| tiny-ruins | generated podskazka (seed 6) | 123 | Gm | music box on the Stubborn Riff, 16-bit synth brass, slapped bass, snes kit |
| snowy-path | generated podskazka (seed 11) | 138 | F | Lantern Home on the synth brass, Fields of Small Hopes on the piano |
| burning-anthem | generated hardstyle (seed 2) | 152 | Em | DJ intro, story break, Skyfire on the supersaw, anti-climax screech, gated chords |
| sacred-reverie | generated hardstyle (seed 3) | 148 | Dm | piano story, Euphoria Gate, reverse bass rolling in the final climax |
| ghost-district | generated phonk (seed 3) | 124 | C♯m | 808 cowbell on Midnight Drift, steel pan, sliding 808, trap rolls, Memphis voices |
| tokyo-chase | generated phonk (seed 4) | 126 | Cm | Memphis Ghost on the cowbell (i / ♭II), steel pan, dark saws |
| glass-rain | generated breakcore (seed 4) | 185 | Dm | chopped Amen at 185, piano and celesta on Glass Rain, half-speed breakdown, gabber chaos |
| lost-angel | generated breakcore (seed 8) | 198 | C♯m | Static Tears on a synth lead over minor ninths, Reese, glitches, Amen rolls |
| hollow-canopy | generated brinstar (seed 9) | 78 | B dorian | pan pipes on Lair Below and Spore Drift, rhodes, synth strings, fretless bass, tribal toms, marimba bubbles, the jungle's night |
| drowned-lair | generated brinstar (seed 3) | 76 | F♯m | bells on Deep Moss and Lair Below, e-piano, tremolo strings, fretless bass, tribal kit, steam and a creature far below |
