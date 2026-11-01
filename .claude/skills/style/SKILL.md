---
name: style
description: Add a new style to the song generator, e.g. "/style шугейз" or "/style чиптюн в духе Mega Man". Analyses the music, writes the style with its recipes, instruments and themes in src/generate.js, balances it with tools/style-check.mjs, makes two example songs, updates CLAUDE.md, runs the tests and commits.
---

# /style — a new generator style

Several styles in one prompt: do them together, one checklist each. The user is a professional musician with absolute pitch:
exact tuning, notes spelt for the key, chord tones on strong beats, real voice leading.

## 0. Read little

- CLAUDE.md: "The generator", "The stage" and the paragraph of the closest existing style. Do not read all of src/generate.js
  (6000+ lines). List the recipes: `grep -n "^\(LEADS\|CHORDS\|BASSES\|ARPS\|KITS\|TEXTURES\|PADS\)\.\w* =" src/generate.js`,
  then read the 2–3 closest recipes and the closest style entry in `STYLES`.
- Put helper scripts (Python edits, probes) in the scratchpad with the Write tool. Quoted heredocs inside one long bash command
  have broken on a stray quote before.

## 1. Analyse the music (in your head; one line per style in the reply)

Tempo range · keys and modes · harmony (typical progressions, cadences, is there a leading tone) · melody (rhythm, range,
ornaments, how it repeats) · every instrument and how to synthesise it · drum grooves per energy · the form (section names,
energy curve: intro 0–1, themes 2, drops 3, a break 1) · production (reverb, echo, drive, sidechain, lo-fi, bit depth).

## 2. Pick the machinery

- `stage: true` → `stageData`: SEC, sectionEnd, KEY_UP, `pumpAt = () => 1`. Kits written with `stageHits(body)` (the body sees
  `s r e t L fill b x`, uses `add(drum, vel, ...positions)`, `steps(drum, vel, '16 steps')`, `ROLL`) also become project kits.
- `club: { pump, kick: { 1, 2, 3: 16-step patterns }, sound: clubKick params }` → the club kick track and the sidechain;
  `gains.kick` sets the kick. Club and hard styles get no meters.
- `hard: true` → `bossData`: the hardstyle kick on the tonic, the reverse bass, `pumpAt`. Never together with `stage` or `club`
  (both define SEC, sectionEnd and the rest). `djKick: true` puts the kick on every beat of the intro and the outro,
  `antiClimax: true` makes the solo role silent for both voices so a texture can play; `gains.kick` / `gains.rbass`.
- Plain styles (16-step `drums` grooves through `drumData`) are the old way; a style of its own composer (fugue, maqam, raga,
  gamelan, ambient) only for music the theme/harmony pipeline cannot hold.
- Own dice for the options: `modes`, `meters`, `micros` (lists, `null` = none). `variety` (more recomposed themes), `ornate`
  (Celtic graces), `variant` (`cave` darkens pumpsaw and the belt), `counter` (the counter voice's recipe).

## 3. The style entry and its neighbours

- `STYLES.<id>`: label, emoji, `theme` (an existing id of viz/app/themes.js: void lofi chip bossa kawaii classical gothic synth
  dnb phonk meow ink romantic desert celtic java india jazz), bpm, swing, themes (weights; own themes first), keys (one mode
  family unless the themes are `modal`), moods, voicing, chordRange, bassRange, lead / lead2 (a name twice = a weight), counter,
  chords, bass, pad (`null` allowed), arp, texture, kit, forms (1–2; roles intro theme themeB bridge solo break build final
  outro trade; energy 0–3; `{ keyUp }`, `{ canon }`), drums, comp, bassline (`'octaves'`, `'eighths'`, `'walking'` or
  `[[pos, 'R' | '5' | '8' | '3' | 'A', len]]`), arpStep, arpPoly, gains.
- `comp` is required whenever the chords recipe uses `compHit` (piano, rhodes, guitar, harpsichord, brass, hornstabs, harpchords,
  brasschoir, fmepiano, stabs): `comp: {}` with one of them crashes.
- `NAMES.<id>`: two lists of latin words (the title and the file name).
- `STYLE_FAMILIES`: the style in exactly one family (a new family needs id, label, emoji, about).
- What test/generate.test.js demands for seeds 1–3: 1.7–4 minutes, at least 6 sections and 7 tracks, no NaN, fewer than 25 %
  of the lead's strong-beat notes outside the chord. `fitForm` aims at 160 s and grows themes by at most 48 bars: at 200 BPM
  write 16-bar sections.

## 4. Themes (src/melodies.js)

- Fields: id, from (the style), title `'English (русский)'`, key, base, per, modal (true only when every note and chord is
  diatonic), `only: '<id>'`, moods, chords, notes `[beat, semitones from base, length]`.
- Romans in minor: bare III, VI, VII are the minor's own degrees; `bII`, `iiø7`, `i9` (m9), `V7`, `V7sus4`, `IVmaj7` work.
- A chord tone on every note that starts on beat 0 or 2 of a bar. Chords with five notes (9ths) lose their fifth in the voicing
  (root, 3rd, 7th, 9th), so a fifth on a strong beat counts as a wrong note.
- Public domain tunes only (folk, composers dead long ago); never a famous game or film tune, write our own in its idiom.
- Themes borrowed from other styles can sit badly on the new accompaniment (void-orbit failed over the ZUN piano): keep the list
  to the style's own themes and check with style-check.

## 5. Recipes

- A recipe is `o => code string` (a track object). Call `o.need('engine' | 'instruments', ...)` for every name the code uses
  (tanh, smoothstep and vol4 are easy to forget). Leads read `${o.at}(x)` → `{ n, d, τ, u, at }`; add `${pumpIf(o)}`; levels as
  `round(k * o.gain)` (leads) or `o.gain ?? 1` (the rest); `graphLead`; midi() must say what sounds (an octave-up voice:
  `.replace('[60 + m.n]', '[72 + m.n]')`, the project reads its base from that).
- Reuse: `struck(tone, imports, { release, life, gain, fx, extra, vel, formula })` for poly tones, `sustainedLead({ make, ... })`,
  `polyComp`, `polyArp`, `chipLead`, FX.hall / echoHall / room / deep, `stageGraph`, `stageMidi`.
- Every `LEADS` entry also plays as a project instrument (`gen:lead:<id>`) inside `RECIPE_STAGE`: there `chordAt()` is null,
  `energy()` is 2, `role()` is 'theme', and sectionOf, sectionEnd, TONIC1 do not exist. Kits of `stageHits` become project kits:
  give their drum names a Russian name in `DRUM_RU` (src/project.js). Textures get no gain from the style: set it inside.
- Engine rules: call every filter and oscillator every sample (pass 0 when silent), never Math.random (hash, noise),
  kickDrum takes τ in beats, the other drums seconds. Formulas: KaTeX with the app's macros, every brace closed, Russian inside
  `\\text{…}`. Add new leads to `COUNTER_VOICE`.
- A sound other songs could use goes into src/instruments.js (pure `(f, t, vel)` tones for poly, or builders), into the API list
  of CLAUDE.md, into `INSTRUMENT_NAMES` of src/project.js, maybe a library instrument `I(...)` with a `LEVEL`; map the new track
  names in `BY_NAME` / `STYLE_BASS` (src/project.js) and in `GM` (src/midi.js).

## 6. Check, balance, repeat

```
node --check src/generate.js && node tools/style-check.mjs <id> --seeds 1-12 --levels 1,2
```

- Fix every FAIL: a theme's strong beats, a borrowed theme, a mode or micro combination (pelog with ⅛ tones fell off the chords:
  dropped from Artifact Temple).
- Levels: the lead loudest or close to it, the bass 2–4 dB under the lead, no `quiet?` except textures. Use `gains.{lead, lead2,
  counter, chords, pad, bass, arp, kick, rbass}`; for hard styles the pad is fixed (4). The mix is normalised to its peak: a peaky
  track (Karplus–Strong plucks, a music box, crashes) pushes everything else down, so lower that recipe's own gain instead of
  raising the rest. The lead options of one style differ in level: set each recipe's own gain so one `gains.lead` suits them all.

## 7. Example songs and the picture

- Choose two seeds with different instruments and themes from the style-check list; `node generate.js --style <id> --seed N`
  writes `songs/<title>.js`.
- `node render.js songs/a.js songs/b.js ...` (about 45 s a song; three processes in parallel for many songs); Read
  `out/<title>/graph.png`: every section different, nothing missing or stuck.

## 8. CLAUDE.md

The families line, the `Styles (STYLES)` list, a paragraph per style (machinery, recipes, themes), new instruments in the API
list, the INSTRUMENTS count, "N styles × 3 seeds" in Commands, a row per example song in the songs table.

## 9. Finish

- Syntax: `node --check` on every changed file; acorn over songs/*.js and the changed modules
  (`viz/vendor/acorn.min.mjs`, `ecmaVersion: 'latest', sourceType: 'module'`).
- `npm test` takes about 15 minutes: run it with `run_in_background`, then wait for its log with an until-loop (timeout 600000).
- Commit on main: author Astramix, a plain message with no trailers: no co-author lines and no mention of Claude or AI anywhere
  (commit messages, files). Never commit my_songs/, generated/ or test/_cold.js.
- Reply in Russian, short and warm: a line of analysis per style, the example songs, what was fixed, the test result. Say plainly
  that the levels are balanced by meters and you cannot listen yourself.
