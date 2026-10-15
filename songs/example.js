// A minimal song to start from. x is time in beats; the tempo comes from Live.
//
// A track has up to three parts:
//   graph(x)    the curve drawn in the device (number, array of numbers, or null = nothing)
//   audio(ctx)  called once per render, returns x => sample (number, or [left, right])
//   midi(x)     the MIDI notes sounding at x, for Export
import { mod, floor, exp, sin, TAU, between, hz, osc } from '../src/engine.js'

// k(x) = e^{−8r},  r = x mod 1  — a kick on every beat
const k = x => exp(-8 * mod(x, 1))

// n(x) — arpeggio over Am7, one octave up every other bar:  n = (0, 3, 7, 10)_{⌊2x⌋ mod 4} + 12·(⌊x/4⌋ mod 2)
const n = x => [0, 3, 7, 10][mod(floor(2 * x), 4)] + 12 * mod(floor(x / 4), 2)

const kick = {
  color: '#ff4f8b',
  graph: k,
  midi: x => (mod(x, 1) < 0.5 ? [36] : []),
  audio() {
    const o = osc('sine')
    return x => 0.8 * k(x) * o(45 * 2 ** (3 * k(x) ** 4)) // the curve is both volume and pitch sweep
  },
}

const arp = {
  color: '#ffffff',
  graph: x => 1 + n(x) / 12,
  midi: x => (mod(2 * x, 1) < 0.8 ? [57 + n(x)] : []), // A3 = MIDI 57
  audio() {
    const o = osc('saw')
    return x => 0.4 * exp(-6 * mod(2 * x, 1)) * o(hz(n(x), 220))
  },
}

// A raw waveform of time: y(t) = sin(2π·55·t) · (x mod 4)/4 — a sub that swells every bar
const sub = {
  color: '#9fd3ff',
  graph: x => -1 - mod(x, 4) / 4,
  audio({ bpm }) {
    return x => (between(x, 8, 16) ? 0.3 * sin(TAU * 55 * x * (60 / bpm)) * (mod(x, 4) / 4) : 0)
  },
}

export default {
  name: 'example',
  style: 'minimal',
  bpm: 120,
  key: 'Am',
  length: 16,
  sections: [[0, 'intro'], [8, 'sub']],
  tracks: { kick, arp, sub },
}
