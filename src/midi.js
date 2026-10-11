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

// midi(x) → [[tick, on (bool), note]], note-offs before note-ons at the same tick
export function scanNotes(midi, length, ppq = PPQ) {
  const events = [], last = Math.round(length * ppq)
  let on = new Set()
  for (let i = 0; i <= last; i++) {
    let now = new Set()
    if (i < last) {
      try {
        now = new Set([].concat(midi(i / ppq) ?? []).filter(Number.isFinite).map(Math.round).filter(n => n >= 0 && n < 128))
      } catch {}
    }
    for (const p of on) if (!now.has(p)) events.push([i, false, p])
    for (const p of now) if (!on.has(p)) events.push([i, true, p])
    on = now
  }
  return events
}

const vlq = v => {
  const b = [v & 0x7f]
  while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80)
  return b
}
const txt = s => [...new TextEncoder().encode(s)]
const chunk = body => [0x4d, 0x54, 0x72, 0x6b, (body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255, ...body]
const meta = (type, bytes) => [0, 0xff, type, ...vlq(bytes.length), ...bytes]

// → Uint8Array; muted: names of tracks to leave out
export function midiFile(song, { ppq = PPQ, muted = new Set() } = {}) {
  const us = Math.round(60e6 / song.bpm)
  const tempo = [...meta(0x03, txt(song.name ?? 'song')), 0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xff, 0x58, 4, 4, 2, 24, 8, 0, 0xff, 0x2f, 0]
  const tracks = [chunk(tempo)]
  let ch = 0
  for (const [key, t] of Object.entries(song.tracks)) {
    if (!t || typeof t.midi !== 'function' || muted.has(key)) continue
    const prog = gmProgram(key), drums = prog === -1
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
