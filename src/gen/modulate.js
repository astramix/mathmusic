// Modulations: the plan of key changes and the bars that prepare them — a part of the generator (src/generate.js; the map of its parts is at the top of that file).
import { roman, keyName, SCALES } from '../theory.js'
import { MAJ } from './melody.js'

// ---- modulations (opts.modulations) --------------------------------------------------------------------------------
// Which sections leave home and how. Theme II goes to a closely related key by a pivot chord (classical: the dominant
// of a major key, the relative major of a minor one); the bridge goes further — the parallel key, a key a minor third
// away by the enharmonic diminished seventh (B°7 in C is D°7 in E♭), a chromatic mediant (C → A♭: a common tone), the
// relative or the subdominant; the section after a modulated one comes home by the dominant seventh. Every change
// gets a transition bar: [pivot, V7 of the new key] in the harmony and a newly composed link in the melody.
const MOD_STYLE = {
  classical: { themeB: true, bridge: ['enharmonic', 'subdominant', 'relative'] },
  romantic: { themeB: true, bridge: ['enharmonic', 'mediant', 'parallel'] },
  lofi: { themeB: false, bridge: ['mediant', 'parallel', 'relative'] },
  bossa: { themeB: false, bridge: ['mediant', 'relative', 'subdominant'] },
  space: { themeB: false, bridge: ['enharmonic', 'mediant', 'parallel'] },
  default: { themeB: false, bridge: ['relative', 'parallel', 'mediant'] },
}
const MOD_NAMES = { dominant: 'доминанта', relative: 'параллельная', subdominant: 'субдоминанта', parallel: 'одноимённая', enharmonic: 'энгармоническая (через Ум7)', mediant: 'хроматическая медианта', home: 'домой' }
// → { [section index]: { key: the local key, type } } — keys as { tonic, mode }
function planModulations(form, key, styleId, r) {
  const st = MOD_STYLE[styleId] ?? MOD_STYLE.default, plan = {}
  const iA = form.findIndex(f => f.role === 'theme'), iB = form.findIndex(f => f.role === 'themeB')
  const iBr = form.findIndex(f => f.role === 'bridge')
  const rel = key.mode === 'major' ? { tonic: (key.tonic + 9) % 12, mode: 'minor' } : { tonic: (key.tonic + 3) % 12, mode: 'major' }
  const by = (t, mode = key.mode) => ({ tonic: (((key.tonic + t) % 12) + 12) % 12, mode })
  if (st.themeB && iB > iA && iA >= 0) plan[iB] = key.mode === 'major' ? { key: by(7), type: 'dominant' } : { key: rel, type: 'relative' }
  if (iBr >= 0) {
    const type = st.bridge[Math.floor(r() * st.bridge.length)]
    const k = type === 'parallel' ? by(0, key.mode === 'major' ? 'minor' : 'major')
      : type === 'enharmonic' ? by(r() < 0.5 ? 3 : -3)
      : type === 'mediant' ? by(key.mode === 'major' ? (r() < 0.6 ? -4 : 4) : -4)
      : type === 'relative' ? rel : by(5)
    plan[iBr] = { key: k, type }
  }
  return plan
}
// the song's keys field: [[beat, 'G'], …] — home, each modulated section and the way back
function keysField(key, sectionInfo) {
  const out = []
  for (const s of sectionInfo) {
    const k = keyName(s.lk ?? key)
    if (!out.length || out[out.length - 1][1] !== k) out.push([s.at, k])
  }
  return out
}
// the two chords of a transition bar from key a to key b (as roman() objects, absolute roots)
function transitionChords(a, b, type) {
  const V7 = roman('V7', b)
  const sc = k => (k.mode === 'minor' ? SCALES.harmonic : MAJ).map(i => (i + k.tonic) % 12)
  // the enharmonic one: the old key's leading-tone °7 (C♯°7 in D) is the new key's too (E°7 in F: C♯ = D♭) — written as heard
  if (type === 'enharmonic') {
    const old = roman('vii°7', { ...a, mode: 'major' }), nu = roman('vii°7', { ...b, mode: 'major' })
    return [old.tones.every(t => nu.tones.includes(t)) ? old : nu, V7]
  }
  if (type === 'mediant') return [roman(a.mode === 'minor' ? 'i' : 'I', a), V7] // the old tonic, straight to the new V7
  if (type === 'parallel') return [roman(b.mode === 'minor' ? 'iv' : 'IV', b), V7]
  // a pivot: a chord of the new key (ii / IV / vi, or iv / VI / iiø) whose notes are all in the old key
  const cands = (b.mode === 'minor' ? ['iv', 'VI', 'iiø7', 'i'] : ['ii', 'IV', 'vi', 'I']).map(s => roman(s, b))
  const inA = sc(a), pivot = cands.find(c => c.tones.every(t => inA.includes(t))) ?? cands[0]
  return [pivot, V7]
}

export { MOD_NAMES, keysField, planModulations, transitionChords }
