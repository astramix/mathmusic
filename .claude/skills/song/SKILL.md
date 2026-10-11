---
name: song
description: Make a new math-music song from a style prompt, e.g. "/song джаз-фанк с котиками" or "/song эпичный оркестр для босса". Writes songs/<name>.js with the instrument library, renders it, checks levels and the graph, and adds it to the catalog in CLAUDE.md.
---

# /song — a new song from a prompt

The prompt after `/song` is the style (any language, maybe vague or silly — interpret it
generously and make it delightful). No prompt → pick a style not yet in the CLAUDE.md catalog.
Several styles in one prompt → one song per style.

1. **Plan in your head, not on screen**: name (short latin slug), bpm, key, chord progressions
   (main + a contrasting bridge), 7–10 sections over 2–3 minutes, 7+ tracks, and at least one
   mathematical trick (canon, polyrhythm, improvise(), harmony computed from chords, key change).
   Use CLAUDE.md for every API — do not open engine.js / instruments.js unless something is missing.
2. **Copy patterns** from the closest existing song (lofi = groove with swing, bossa = acoustic band
   with solos, chiptune = synth/chip, classical = orchestral, kawaii = pop/EDM, meow = voices).
   Read only the parts you need.
3. **Write** `songs/<name>.js`: header comment (style, sections, the math), a `formula` (LaTeX, see CLAUDE.md)
   on every track — the complete math of its sound, not code — and formulas in comments
   next to each track like the other songs. If a new instrument would help other songs too,
   add it to `src/instruments.js` and to the API list in CLAUDE.md.
4. **Render**: `node render.js songs/<name>.js` (timeout 600000). Fix errors; fix `quiet?`/`hot?`
   tracks and a bass louder than the lead; render again.
5. **Look** at `out/<name>/graph.png`: every section should look different and nothing should be
   missing or stuck.
6. **Catalog**: add a row to the table in CLAUDE.md.
7. **Reply in Russian**, short and warm: what the song is, its sections and the math idea, length,
   and how to open it in Ableton (MathMusic → Open song → `songs/<name>.js`). Say plainly that you
   balanced it by meters and can't listen yourself.
