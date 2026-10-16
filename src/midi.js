// A song → a Standard MIDI File (type 1: a tempo track, then one track per part, General MIDI
// programs by the part's name, drums on channel 10). Each track's midi(x) — the notes sounding at
// beat x — is read at every tick (1/480 beat), so fast repeats survive: a roll of 1/8 notes gated
// at 0.12 beat leaves a gap of only 0.005 beat between hits. Shared by the app's export and the tests.
export const PPQ = 480

// [name pattern, GM program (0-based) | -1 = drums on channel 10]; the first match wins, so
// instruments come before the generic words (a "marimba arp" is a marimba, an "arp" a saw lead)
export const GM = [
  [/timp/i, 47],
  // whole words where a drum hides inside an instrument's name (ma-rim-ba, tom-cat)
  [/drum|kick|snare|hi-?hat|\bhats?\b|perc|\bbeat\b|clap|crash|\bride\b|cymbal|\btoms?\b|\brim(shot)?\b|shaker|clave|\bpaw\b|\bhiss\b|claws/i, -1],
  [/cowbell/i, 113],
  [/flute/i, 73], [/vibe/i, 11], [/marimba/i, 12], [/music ?box/i, 10], [/bell|glock|sparkle|star/i, 9],
  [/rhodes|epiano/i, 4], [/piano/i, 0], [/harpsi/i, 6], [/guitar|nylon/i, 24], [/organ/i, 19],
  [/violin/i, 40], [/cello/i, 42], [/string/i, 48], [/pad/i, 89], [/choir/i, 52],
  [/scat|voice|vocal|chop|meow|cat|mrrp|purr/i, 54], [/808|sub/i, 38], [/upright|bass/i, 32],
  [/pulse|chip|square|harmony/i, 80], [/saw|lead|synth|arp|hook/i, 81],
]
export const gmProgram = name => GM.find(([re]) => re.test(name))?.[1] ?? 0

// midi(x) → [[tick, on (bool), note]], note-offs before note-ons at the same tick. exact: keep microtones (63.5 —
// to the cent) instead of rounding to the semitone
export function scanNotes(midi, length, ppq = PPQ, { exact = false } = {}) {
  const events = [], last = Math.round(length * ppq)
  const norm = exact ? n => Math.round(n * 100) / 100 : Math.round
  let on = new Set()
  for (let i = 0; i <= last; i++) {
    let now = new Set()
    if (i < last) {
      try {
        now = new Set([].concat(midi(i / ppq) ?? []).filter(Number.isFinite).map(norm).filter(n => n >= 0 && n < 128))
      } catch {}
    }
    for (const p of on) if (!now.has(p)) events.push([i, false, p])
    for (const p of now) if (!on.has(p)) events.push([i, true, p])
    on = now
  }
  return events
}
// a song whose notes leave 12-TET: a microtone in any part, or a temperament (song.tuning.offsets)
export function isMicrotonal(song) {
  if (song.tuning?.offsets?.some(o => Math.abs(o) > 0.5)) return true
  for (const t of Object.values(song.tracks ?? {})) {
    if (!t || typeof t.midi !== 'function') continue
    for (let x = 0; x < song.length; x += 0.5) {
      let m = []
      try { m = [].concat(t.midi(x) ?? []) } catch {}
      if (m.some(n => Number.isFinite(n) && Math.abs(n - Math.round(n)) > 0.005)) return true
    }
  }
  return false
}

// MPE (MIDI Polyphonic Expression): every sounding note of a part gets a channel of its own and a pitch bend there,
// so each can be tuned to the cent — microtones and a temperament's offsets alike. A lower zone: manager channel 1,
// member channels 2–9 (8 voices; channel 10 stays the drums'), pitch-bend range ±48 semitones (the MPE default,
// 0.59 ¢ a step), announced by the MPE Configuration Message and RPN 0 on every member channel.
const MPE_MEMBERS = [1, 2, 3, 4, 5, 6, 7, 8], MPE_RANGE = 48
const mpeSetup = prog => {
  const cc = (ch, c, v) => [0, 0xb0 | ch, c, v]
  const out = [...cc(0, 101, 0), ...cc(0, 100, 6), ...cc(0, 6, MPE_MEMBERS.length), ...cc(0, 101, 127), ...cc(0, 100, 127)]
  for (const ch of MPE_MEMBERS) out.push(...cc(ch, 101, 0), ...cc(ch, 100, 0), ...cc(ch, 6, MPE_RANGE), ...cc(ch, 38, 0), ...cc(ch, 101, 127), ...cc(ch, 100, 127), 0, 0xc0 | ch, prog)
  return out
}
// the pitch-bend value (14 bits) for `semitones` away from the note number
export const bendValue = s => Math.max(0, Math.min(16383, Math.round(8192 + (s * 8192) / MPE_RANGE)))

const vlq = v => {
  const b = [v & 0x7f]
  while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80)
  return b
}
const txt = s => [...new TextEncoder().encode(s)]
const chunk = body => [0x4d, 0x54, 0x72, 0x6b, (body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255, ...body]
const meta = (type, bytes) => [0, 0xff, type, ...vlq(bytes.length), ...bytes]

// → Uint8Array; muted: names of tracks to leave out. mpe: microtones and temperaments as MPE pitch bends (each part a
// zone of its own when the file is imported into a DAW track by track); without it notes are rounded to semitones
export function midiFile(song, { ppq = PPQ, muted = new Set(), mpe = false } = {}) {
  const us = Math.round(60e6 / song.bpm)
  const tempo = [...meta(0x03, txt(song.name ?? 'song')), 0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xff, 0x58, 4, 4, 2, 24, 8, 0, 0xff, 0x2f, 0]
  const tracks = [chunk(tempo)]
  const temper = song.tuning?.offsets ?? null // cents of C … B from 12-TET
  let ch = 0
  for (const [key, t] of Object.entries(song.tracks)) {
    if (!t || typeof t.midi !== 'function' || muted.has(key)) continue
    const prog = gmProgram(key), drums = prog === -1
    if (mpe && !drums) {
      const body = [...meta(0x03, txt(key)), ...mpeSetup(prog)]
      const free = [...MPE_MEMBERS], held = new Map() // note → channel
      let prev = 0
      for (const [tick, on, n] of scanNotes(t.midi, song.length, ppq, { exact: true })) {
        const k = Math.round(n), bend = n - k + (temper ? temper[((k % 12) + 12) % 12] / 100 : 0)
        if (!on) {
          const c = held.get(n)
          if (c == null) continue
          held.delete(n)
          free.push(c)
          body.push(...vlq(tick - prev), 0x80 | c, k, 0)
        } else {
          let c = free.shift(), dt = tick - prev
          if (c == null) { // past 8 notes: the oldest one gives its channel up
            const [m, cc] = held.entries().next().value
            held.delete(m)
            c = cc
            body.push(...vlq(dt), 0x80 | c, Math.round(m), 0)
            dt = 0
          }
          held.set(n, c)
          const v = bendValue(bend)
          body.push(...vlq(dt), 0xe0 | c, v & 127, v >> 7, 0, 0x90 | c, k, 90)
        }
        prev = tick
      }
      body.push(0, 0xff, 0x2f, 0)
      tracks.push(chunk(body))
      continue
    }
    let c = 9 // GM drums
    if (!drums) {
      if (ch % 16 === 9) ch++
      c = ch++ % 16
    }
    const body = meta(0x03, txt(key))
    if (!drums) body.push(0, 0xc0 | c, prog)
    let prev = 0
    for (const [tick, on, p] of scanNotes(t.midi, song.length, ppq)) {
      body.push(...vlq(tick - prev), (on ? 0x90 : 0x80) | c, p, on ? (drums ? 100 : 90) : 0)
      prev = tick
    }
    body.push(0, 0xff, 0x2f, 0)
    tracks.push(chunk(body))
  }
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, (tracks.length >> 8) & 255, tracks.length & 255, ppq >> 8, ppq & 255]
  return new Uint8Array([...head, ...tracks.flat()])
}
