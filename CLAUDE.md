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
- Check the picture: Read `out/<name>/graph.png`.
- `npm test` (~1.5 min, `timeout: 600000`): every song renders with no NaN and no `hot?` (quiet? = warning),
  the generator (8 styles × 3 seeds: loads, renders, lead on its chords), theory, MIDI export, the song
  library's names/backup, the app build + syntax (acorn and `node --check`).
- `node generate.js --style lofi [--seed 42 --key Dm --bpm 80 --length short|normal|long] [--render]`
  → `songs/<title>.js` (`--list` = styles and melodies). Same generator as the app's 🎲 menu.
- App: double-click `Visualizer.bat` (or `npm run viz`; `npm run dev` rebuilds on every change) →
  standalone `MathMusic Live.html` (render.js rebuilds it too). See "The app" below.
- `npm run device` rebuilds `MathMusic.amxd` (only after moving the folder).

## Song file contract
```js
export default {
  name: 'lofi', bpm: 78, length: 224,                // length in beats
  key: 'F',                                          // 'Dm', 'E♭', 'F#m'… — note names are spelt by it
  sections: [[0, 'rain'], [16, 'beat'], …],          // labels on the graph
  tracks: { name: { color, graph(x), midi(x), audio(ctx), formula }, … },
  // optional: boss: { modes: { section: 'turn' | 'build' | 'live' }, attacks: { track: 'pulse' | 'floor' | 'rumble' |
  //   'melody' | 'rows' }, chord: x ⇒ 'F♯m', loop, outro (beats) } — a Glitch Forest boss; the game's
  //   tools/score-export.mjs turns it into js/score-data/<name>.js (MP3 + a score per beat)
  // optional: theme: 'lofi' (visualiser colours, viz/app/themes.js); generated songs also carry
  // style and generator: { style, seed, seeds: { melody, arrangement, instruments }, length }
}
```
- `graph(x)` → number | number[] | null; y range −3…5. Lanes: drums 2…4.5, lead 1…3,
  chords −1…0.5, bass −3…−2, ambience ≈ −2.9.
- `midi(x)` → MIDI notes sounding at x (for Export). C4 = 60, A4 = 69.
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

## theory.js (shared by the generator, the app, the tests — not imported by songs)
`freq(n)` A4 = 440 · `pc(n)` · `parseKey('F#m')` → {tonic, mode} · `keyName`, `keyLabel` ('F♯ минор') ·
`spell(n, key)` → 'B♭4' / 'C♯5' (by scale degree: E♯ in F♯ major) · `songKey(song)` (song.key or
Krumhansl–Kessler, bass-weighted) · `SCALES` · `QUALITIES` · `roman('V7/V', key)` → {root, quality, tones, ivs} ·
`chordName(ch, key)` · `voiceLead(pcs, prev, {lo, hi, voices})` smooth compact voicings · `snap(n, pcs)`.

## The generator (src/generate.js, src/melodies.js)
`generate({ style, seed, key?, bpm?, length?, melody?, arrangement?, instruments?, sources? })` → { source, meta }.
Styles (`STYLES`): lofi bossa chiptune synthwave classical kawaii space meow — each: tempo/keys, forms
(sections with roles intro/theme/themeB/bridge/solo/break/final/outro + energy), its theme list,
instruments per role (lead, lead2, chords, bass, pad, arp, texture), drum grooves as 16-step strings,
comping and bass patterns. Themes come from `MELODIES` (melodies of the songs here, each with its own
Roman-numeral harmony) and move to the new key/mode (accidentals follow the chord, leading tone over V),
varied: as written / ornamented / recomposed (`compose`: chord tones on strong beats, steps, leaps
filled, cadence). Bridge = new progression + composed melody. Computed parts: improvised solo, counter
from the chords or a canon, 4:3 arpeggio, half-speed outro, key change up. The emitted song is plain
code: data (HARMONY with voice-led voicings and the chord's 3rd/5th/7th, THEME_A/B, BRIDGE, plans) +
instrument recipes. New theme → MELODIES (+ the styles' `themes` weights); new sound → a recipe in
generate.js; then `npm test`.

## The app (viz/: build.js inlines everything into MathMusic Live.html)
viz/app/*.js are ES modules bundled as blob: modules (`import … from './x.js'`); src/theory, generate,
melodies, midi are importable the same way (embedded sources get `\n` line ends: CodeMirror's). main.js (menus Песня/Редактор/🎲/Экспорт/Вид, transport, legend,
inspector, live formulas) · player.js (worker pool renders tracks in parallel → page mixes stems → cache
→ AudioWorklet output; instant seek-back and mute, live code updates cross-fade in) · worker.js
(classic worker) · worklet.js · runtime.js (ES module → function body, keeps line numbers) · view.js
(scene: classic / paper — axes, formulas pop up when a part enters / space 3D; the same code draws the
video frames) · editor.js (CodeMirror, lint, API hints from api.js, number sliders, full check with
LUFS) · pianoroll.js (edits `const NAME = [[beat, n, d], …]` in the code) · genui.js · export.js (MP3
320 / WAV 24 / OGG Opus / MIDI type 1 via src/midi.js: every tick read, GM program by track name, drums
ch. 10 / stems ZIP) · video.js (MP4 H.264 + AAC|Opus via WebCodecs) · gallery.js (right click: duplicate,
rename, delete) · library.js (my songs in IndexedDB, unique names, file names transliterated, saving into
songs/ asks before replacing, JSON backup/restore, tabs synced via a localStorage ping) · themes.js.
Editing state: app.drafts (one localStorage key per song) holds a draft exactly while the code differs from
the saved one — `app.setDraft(cur, src)` keeps that true, `app.dirty(cur)` is the ●; `app.apply(src, { of: cur })`
drops edits of a song no longer open. Generated songs carry `pristine` (the 🎲 menu tidies only untouched ones).
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
