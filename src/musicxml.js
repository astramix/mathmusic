// A score (src/score.js) → MusicXML 4.0 partwise, for MuseScore, Dorico, Sibelius, Finale. Microtones keep their exact
// pitch in <alter> (−0.5, 0.25, a Turkish −0.2264…) and their sign in <accidental> — Stein–Zimmermann–Gould names
// (quarter-flat, natural-up, sharp-down…), koron/sori, and SMuFL glyphs (smufl="accidentalKomaFlat") for the Turkish
// commas; a microtonal mode's key signature is written out note by note (<key-step>/<key-alter>), as Arabic and
// Turkish scores do. Chord symbols are <harmony>, sections rehearsal marks, the tempo a metronome mark, swing a <swing>.
import { DIV } from './score.js'
import { gmProgram } from './midi.js'

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const num = v => String(Math.round(v * 10000) / 10000)
// the chord symbol → <harmony>: root (spelt, any alteration), kind, its text as written
const KINDS = [['maj9', 'major-ninth'], ['maj7', 'major-seventh'], ['m9', 'minor-ninth'], ['m7', 'minor-seventh'], ['ø7', 'half-diminished'], ['°7', 'diminished-seventh'],
  ['m6', 'minor-sixth'], ['m', 'minor'], ['°', 'diminished'], ['+', 'augmented'], ['13', 'dominant-13th'], ['9', 'dominant-ninth'], ['7sus4', 'suspended-fourth'], ['sus4', 'suspended-fourth'],
  ['sus2', 'suspended-second'], ['7', 'dominant'], ['6', 'major-sixth'], ['', 'major']]
const ALTER = { '𝄫': -2, '♭𝄳': -1.5, '𝄭': -1.25, '♭': -1, '𝄬': -0.75, '𝄳': -0.5, '𝄯': -0.25, '𝄮': 0.25, '𝄲': 0.5, '𝄱': 0.75, '♯': 1, '𝄰': 1.25, '♯𝄲': 1.5, '𝄪': 2 }
function harmony(symbol, offset) {
  const m = symbol.match(/^([A-G])(♭𝄳|♯𝄲|[𝄫♭𝄬𝄳𝄯𝄮𝄲𝄱♯𝄰𝄪]|[♭♯][¹⁴⁵⁸])?(.*)$/u)
  if (!m) return ''
  const [, step, acc = '', rest] = m
  const q = rest.replace(/[+−]\d+¢$/, '')
  const kind = KINDS.find(([k]) => q === k)?.[1] ?? (q.startsWith('n') ? 'other' : 'other')
  const alter = ALTER[acc] ?? (acc.startsWith('♭') ? -1 : acc.startsWith('♯') ? 1 : 0)
  return `<harmony print-frame="no"><root><root-step>${step}</root-step>${alter ? `<root-alter>${num(alter)}</root-alter>` : ''}</root><kind text="${esc(q)}"${kind === 'other' ? '' : ' use-symbols="no"'}>${kind}</kind>${offset ? `<offset>${offset}</offset>` : ''}</harmony>`
}
const accidental = sp => (sp.xml === 'other' ? `<accidental smufl="${sp.glyph}">other</accidental>` : `<accidental>${sp.xml}</accidental>`)
const keyXml = sig => {
  if (sig.fifths != null) return `<key><fifths>${sig.fifths}</fifths></key>`
  return `<key>${sig.items.map(it => `<key-step>${it.letter}</key-step><key-alter>${num(it.sp?.alter ?? it.acc)}</key-alter>${it.sp?.xml === 'other' ? `<key-accidental smufl="${it.sp.glyph}">other</key-accidental>` : `<key-accidental>${it.sp?.xml ?? (it.acc > 0 ? 'sharp' : 'flat')}</key-accidental>`}`).join('')}</key>`
}
const clefXml = c => (c === 'bass' ? '<clef><sign>F</sign><line>4</line></clef>' : '<clef><sign>G</sign><line>2</line></clef>')
const timeXml = t => { const [a, b] = t.split('/'); return `<time><beats>${a}</beats><beat-type>${b}</beat-type></time>` }

function noteXml(e, n, { chord, grace }) {
  const sp = n.sp
  const pitch = `<pitch><step>${sp.letter}</step>${Math.abs(sp.alter) > 1e-6 ? `<alter>${num(sp.alter)}</alter>` : ''}<octave>${sp.oct}</octave></pitch>`
  let x = '<note>'
  if (grace) x += '<grace slash="yes"/>'
  if (chord) x += '<chord/>'
  x += pitch
  if (!grace) x += `<duration>${e.dur}</duration>`
  if (!grace && n.tieStop) x += '<tie type="stop"/>'
  if (!grace && n.tieStart) x += '<tie type="start"/>'
  x += `<voice>1</voice><type>${grace ? 'eighth' : e.type}</type>`
  if (!grace) for (let d = 0; d < e.dots; d++) x += '<dot/>'
  if (n.show) x += accidental(sp)
  if (!grace && e.tuplet) x += '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>'
  if (!grace && !chord && e.beams) e.beams.forEach((b, i) => (x += `<beam number="${i + 1}">${b}</beam>`))
  const nots = []
  if (!grace && n.tieStop) nots.push('<tied type="stop"/>')
  if (!grace && n.tieStart) nots.push('<tied type="start"/>')
  if (!grace && !chord && e.tuplet?.first) nots.push('<tuplet type="start" bracket="yes"/>')
  if (!grace && !chord && e.tuplet?.last) nots.push('<tuplet type="stop"/>')
  if (nots.length) x += `<notations>${nots.join('')}</notations>`
  // a pitch off every grid (a measured gamelan): its cents under the note
  if (Math.abs(sp.cents) >= 1 && !n.tieStop) x += `<lyric><text>${sp.cents > 0 ? '+' : '−'}${Math.round(Math.abs(sp.cents))}¢</text></lyric>`
  return x + '</note>'
}

export function musicXml(score, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const head = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<work><work-title>${esc(score.title)}</work-title></work>
<identification><creator type="composer">MathMusic</creator><encoding><software>MathMusic</software><encoding-date>${date}</encoding-date><supports element="accidental" type="yes"/><supports element="beam" type="yes"/></encoding></identification>
<part-list>
${score.parts.map((p, i) => {
  const prog = gmProgram(p.key)
  return `<score-part id="P${i + 1}"><part-name>${esc(p.name)}</part-name><score-instrument id="P${i + 1}-I1"><instrument-name>${esc(p.name)}</instrument-name></score-instrument><midi-instrument id="P${i + 1}-I1"><midi-channel>${i >= 9 ? i + 2 : i + 1}</midi-channel>${prog >= 0 ? `<midi-program>${prog + 1}</midi-program>` : ''}</midi-instrument></score-part>`
}).join('\n')}
</part-list>
`
  const parts = score.parts.map((p, pi) => {
    const ms = score.bars.map((b, bi) => {
      let x = `<measure number="${b.n}">`
      const prev = score.bars[bi - 1]
      const newKey = bi > 0 && b.sig && prev.sig && JSON.stringify(b.sig.items.map(i => i.letter + i.acc)) !== JSON.stringify(prev.sig.items.map(i => i.letter + i.acc))
      if (bi === 0 || prev.time !== b.time || newKey) {
        x += '<attributes>'
        if (bi === 0) x += `<divisions>${DIV}</divisions>${keyXml(b.sig ?? score.signature)}`
        else if (newKey) x += keyXml(b.sig)
        if (bi === 0 || prev.time !== b.time) x += timeXml(b.time)
        if (bi === 0) x += clefXml(p.clef)
        x += '</attributes>'
      }
      if (pi === 0 && bi === 0) {
        const unit = b.meter.compound ? '<beat-unit>quarter</beat-unit><beat-unit-dot/>' : '<beat-unit>quarter</beat-unit>'
        x += `<direction placement="above"><direction-type><metronome parentheses="no">${unit}<per-minute>${score.bpm}</per-minute></metronome></direction-type><sound tempo="${b.meter.compound ? Math.round(score.bpm * 1.5) : score.bpm}"/></direction>`
        if (score.swing) {
          const r = score.swing / (1 - score.swing), [f, s] = Math.abs(r - 2) < 0.15 ? [2, 1] : Math.abs(r - 1.5) < 0.1 ? [3, 2] : [Math.round(r * 10), 10]
          x += `<direction placement="above"><direction-type><words>Swing</words></direction-type><sound><swing><first>${f}</first><second>${s}</second><swing-type>eighth</swing-type></swing></sound></direction>`
        }
      }
      if (pi === 0 && b.section) x += `<direction placement="above"><direction-type><rehearsal>${esc(b.section)}</rehearsal></direction-type></direction>`
      // chord symbols over the first part, at their places in the bar
      const chordsAt = new Map((pi === 0 ? b.chords : []).map(c => [c.at, c.symbol]))
      let t = 0
      const flushChords = upTo => {
        for (const [at, sym] of [...chordsAt].sort((a, c) => a[0] - c[0])) if (at <= upTo) { x += harmony(sym, at - t); chordsAt.delete(at) }
      }
      for (const e of p.bars[bi]) {
        flushChords(e.at)
        if (e.rest) x += e.measureRest ? `<note><rest measure="yes"/><duration>${e.dur}</duration><voice>1</voice></note>` : `<note><rest/><duration>${e.dur}</duration><voice>1</voice><type>${e.type}</type>${'<dot/>'.repeat(e.dots)}${e.tuplet ? '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' : ''}</note>`
        else {
          for (const g of e.grace ?? []) x += noteXml(e, g, { grace: true })
          e.notes.forEach((n, i) => (x += noteXml(e, n, { chord: i > 0 })))
        }
        t = e.at + e.dur
      }
      flushChords(Infinity)
      return x + '</measure>'
    })
    return `<part id="P${pi + 1}">\n${ms.join('\n')}\n</part>`
  })
  return head + parts.join('\n') + '\n</score-partwise>\n'
}
