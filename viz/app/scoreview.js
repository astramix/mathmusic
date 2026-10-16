// «Ноты» (S): the song as a score — the parts you pick on staves, spelt by the key and mode (microtones by
// Stein–Zimmermann–Gould, Turkish commas, koron/sori; cents over a measured gamelan), chord symbols, sections as
// rehearsal marks; a cursor follows the music, a click on a bar plays from there; ⬇ MusicXML takes it to MuseScore,
// Dorico, Sibelius. The model is src/score.js (also MusicXML's), drawn here as SVG in the SMuFL font Bravura
// (Steinberg, SIL Open Font License — viz/vendor/bravura/OFL.txt) with its engraving defaults.
import { app } from './app.js'
import { h, toast, download } from './ui.js'
import { buildScore, staffStep, guessParts } from './score.js'
import { musicXml } from './musicxml.js'
import { MODES } from './modes.js'
import { fileName, nameIn } from './library.js'

// SMuFL glyphs: [codepoint, width, bottom, top] in staff spaces (Bravura's metadata)
const G = {
  gClef: [0xE050, 2.684, -2.632, 4.392], fClef: [0xE062, 2.756, -2.54, 1.048],
  noteheadWhole: [0xE0A2, 1.688, -0.5, 0.5], noteheadHalf: [0xE0A3, 1.18, -0.5, 0.5], noteheadBlack: [0xE0A4, 1.18, -0.5, 0.5],
  restWhole: [0xE4E3, 1.128, -0.54, 0.036], restHalf: [0xE4E4, 1.128, -0.008, 0.568], restQuarter: [0xE4E5, 1.076, -1.5, 1.492],
  rest8th: [0xE4E6, 0.988, -1.004, 0.696], rest16th: [0xE4E7, 1.28, -2, 0.716], rest32nd: [0xE4E8, 1.452, -2, 1.704], rest64th: [0xE4E9, 1.692, -3.012, 1.72],
  flag8thUp: [0xE240, 1.056, -3.24, 0.036], flag8thDown: [0xE241, 1.224, -0.056, 3.232], flag16thUp: [0xE242, 1.116, -3.252, 0.008], flag16thDown: [0xE243, 1.164, -0.036, 3.248],
  flag32ndUp: [0xE244, 1.044, -3.248, 0.596], flag32ndDown: [0xE245, 1.092, -0.688, 3.248], flag64thUp: [0xE246, 1.044, -3.248, 1.388], flag64thDown: [0xE247, 1.092, -1.504, 3.248],
  augmentationDot: [0xE1E7, 0.4, -0.2, 0.2],
  accidentalKoron: [0xE460, 1.2, -1.888, 0.628], accidentalSori: [0xE461, 1.684, -1.272, 1.312],
  accidentalBuyukMucennebFlat: [0xE440, 1.144, -0.696, 1.752], accidentalKucukMucennebFlat: [0xE441, 0.904, -0.7, 1.756], accidentalBakiyeFlat: [0xE442, 1.148, -0.7, 1.756],
  accidentalKomaFlat: [0xE443, 0.904, -0.7, 1.756], accidentalKomaSharp: [0xE444, 0.916, -1.348, 1.288], accidentalBakiyeSharp: [0xE445, 0.996, -1.392, 1.4],
  accidentalKucukMucennebSharp: [0xE446, 1.36, -1.352, 1.284], accidentalBuyukMucennebSharp: [0xE447, 1.364, -1.4, 1.392],
  accidentalDoubleFlat: [0xE264, 1.644, -0.7, 1.748], accidentalThreeQuarterTonesFlatArrowUp: [0xE278, 1.644, -0.7, 2.492],
  accidentalThreeQuarterTonesFlatZimmermann: [0xE281, 1.86, -0.7, 1.756], accidentalThreeQuarterTonesFlatArrowDown: [0xE271, 1.16, -1.672, 1.768],
  accidentalFlat: [0xE260, 0.904, -0.7, 1.756], accidentalQuarterToneFlatArrowUp: [0xE270, 1.16, -0.708, 2.316], accidentalQuarterToneFlatStein: [0xE280, 0.904, -0.7, 1.756],
  accidentalQuarterToneFlatNaturalArrowDown: [0xE273, 0.988, -2.172, 1.344], accidentalNatural: [0xE261, 0.672, -1.34, 1.364],
  accidentalQuarterToneSharpNaturalArrowUp: [0xE272, 0.952, -1.36, 2.188], accidentalQuarterToneSharpStein: [0xE282, 0.716, -1.412, 1.228],
  accidentalQuarterToneSharpArrowDown: [0xE275, 1.108, -2.136, 1.396], accidentalSharp: [0xE262, 0.996, -1.392, 1.4],
  accidentalThreeQuarterTonesSharpArrowUp: [0xE274, 1.1, -1.388, 2.12], accidentalThreeQuarterTonesSharpStein: [0xE283, 1.256, -1.388, 1.476],
  accidentalThreeQuarterTonesSharpArrowDown: [0xE277, 1.184, -1.46, 0.488], accidentalDoubleSharp: [0xE263, 0.988, -0.5, 0.508],
}
for (let i = 0; i < 10; i++) G['timeSig' + i] = [0xE080 + i, 1.6, -1, 1]
const ENGRAVE = { staffLine: 0.13, stem: 0.12, beam: 0.5, beamGap: 0.25, ledger: 0.16, ledgerExt: 0.4, thinBar: 0.16 }
const PITCHED = k => !/drum|kick|snare|hat|perc|clap|paw|hiss|claw|beat|fx|sfx|noise|ambience|rain|vinyl|riser|taiko|tsuzumi|kane|crash|thunder|wind|purr/i.test(k)
// key-signature places (staff steps in the treble clef; the bass clef is two steps lower)
const SHARP_STEP = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 }, FLAT_STEP = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 }
const svgNS = 'http://www.w3.org/2000/svg'
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

// ---- the panel -------------------------------------------------------------------------------------------------------
export function createScoreView(root) {
  root.innerHTML = ''
  const state = { parts: null, zoom: 1, follow: true }
  try { Object.assign(state, JSON.parse(localStorage.getItem('mm.score') || '{}')) } catch {}
  const save = () => { try { localStorage.setItem('mm.score', JSON.stringify({ zoom: state.zoom, follow: state.follow })) } catch {} }
  const partsBox = h('span', { class: 'sv-parts' })
  const follow = h('label', { class: 'sv-chk', title: 'страница идёт за музыкой' }, h('input', { type: 'checkbox', checked: state.follow, onchange: e => { state.follow = e.target.checked; save() } }), 'следить')
  const zoomOut = h('button', { title: 'мельче', onclick: () => setZoom(state.zoom / 1.15) }, '−'), zoomIn = h('button', { title: 'крупнее', onclick: () => setZoom(state.zoom * 1.15) }, '+')
  const xml = h('button', { title: 'MusicXML 4.0 — открыть в MuseScore, Dorico, Sibelius, Finale', onclick: () => exportXml() }, '⬇ MusicXML')
  const info = h('span', { class: 'dim sv-info' })
  root.append(h('div', { class: 'sv-head' }, h('b', {}, '📜 Ноты'), partsBox, info, h('span', { class: 'sp' }), zoomOut, zoomIn, follow, xml,
    h('button', { title: 'закрыть (S)', onclick: () => app.toggleScore(false) }, '✕')))
  const body = h('div', { class: 'sv-body' })
  root.append(body)
  let cur = null, score = null, layout = null, svg = null, cursor = null, barHi = null, lastBar = -1

  function setZoom(z) {
    state.zoom = Math.max(0.6, Math.min(2.2, z))
    save()
    draw()
  }
  function load(c) {
    cur = c
    if (!c?.song) { body.innerHTML = '<div class="dim" style="padding:20px">нет песни</div>'; return }
    const song = c.song, keys = Object.keys(song.tracks).filter(k => song.tracks[k]?.midi && PITCHED(k))
    // by default the melody, the chords and the bass (score.guessParts listens to the parts)
    if (!state.parts || state.parts.song !== song.name || state.parts.list.some(k => !keys.includes(k))) state.parts = { song: song.name, list: guessParts(song) }
    partsBox.replaceChildren(...keys.map(k => h('label', { class: 'sv-chk' }, h('input', {
      type: 'checkbox', checked: state.parts.list.includes(k),
      onchange: e => { state.parts.list = e.target.checked ? keys.filter(x => x === k || state.parts.list.includes(x)) : state.parts.list.filter(x => x !== k); rebuild() },
    }), k)))
    rebuild()
  }
  function rebuild() {
    if (!cur?.song) return
    const t0 = performance.now()
    try {
      score = buildScore(cur.song, { parts: state.parts.list, key: cur.key, mode: cur.song.mode ? MODES[cur.song.mode] : null, source: app.sourceOf?.(cur) ?? cur.source })
    } catch (e) {
      console.error(e)
      body.innerHTML = `<div style="padding:20px;color:var(--danger)">не получилось записать ноты: ${esc(e.message)}</div>`
      return
    }
    const sig = score.signature
    info.textContent = `${app.tonalityOf?.(cur.song, cur.key) ?? ''} · ${score.bars.length} тактов${score.swing ? ' · swing' : ''}${sig.fifths == null ? ' · ключевые знаки лада' : ''} · ${Math.round(performance.now() - t0)} мс`
    draw()
  }
  function exportXml() {
    if (!score) return
    const name = fileName(nameIn(cur.source ?? '', cur.entry?.name ?? 'song'))
    download(`${name}.musicxml`, new Blob([musicXml(score)], { type: 'application/vnd.recordare.musicxml+xml' }))
    toast(`📜 ${name}.musicxml — ${score.parts.length} ${score.parts.length === 1 ? 'партия' : 'партии'}, ${score.bars.length} тактов; микротоны с точным <alter> и знаками SMuFL`, { kind: 'ok', ms: 7000 })
  }

  // ---- layout ------------------------------------------------------------------------------------------------------
  function draw() {
    if (!score || !root.offsetWidth) return
    const sp = 7.5 * state.zoom, W = body.clientWidth - 24
    layout = engrave(score, { sp, width: Math.max(320, W) })
    body.innerHTML = ''
    svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', W + 12)
    svg.setAttribute('height', layout.height)
    svg.setAttribute('class', 'sv-svg')
    svg.innerHTML = layout.svg
    barHi = document.createElementNS(svgNS, 'rect')
    barHi.setAttribute('class', 'sv-bar')
    cursor = document.createElementNS(svgNS, 'rect')
    cursor.setAttribute('class', 'sv-cursor')
    cursor.setAttribute('width', Math.max(1.5, sp * 0.22))
    svg.prepend(barHi)
    svg.append(cursor)
    body.append(svg)
    lastBar = -1
    update(app.player?.x ?? 0, true)
  }
  // the cursor at beat x; the page follows
  function update(x, force = false) {
    if (!layout || !score) return
    const bi = score.bars.findLastIndex(b => b.at <= x + 1e-6)
    const m = layout.measures[bi]
    if (!m) return
    const b = score.bars[bi], tick = Math.max(0, Math.min(b.meter.barTicks, (x - b.at) * b.meter.xTicks))
    const xs = m.ticks, ts = [...xs.keys()].sort((a, c) => a - c)
    let px = m.x1
    for (let i = 0; i < ts.length; i++) {
      const t0 = ts[i], t1 = ts[i + 1] ?? b.meter.barTicks, x0 = xs.get(t0), x1 = ts[i + 1] != null ? xs.get(t1) : m.x1 - layout.sp
      if (tick >= t0 && tick <= t1) { px = x0 + ((x1 - x0) * (tick - t0)) / Math.max(1, t1 - t0); break }
    }
    cursor.setAttribute('x', px)
    cursor.setAttribute('y', m.y0)
    cursor.setAttribute('height', m.y1 - m.y0)
    if (bi !== lastBar || force) {
      lastBar = bi
      barHi.setAttribute('x', m.x0)
      barHi.setAttribute('y', m.y0)
      barHi.setAttribute('width', m.x1 - m.x0)
      barHi.setAttribute('height', m.y1 - m.y0)
      if (state.follow && app.player?.playing) {
        const top = m.y0 - 40, bottom = m.y1 + 40
        if (top < body.scrollTop || bottom > body.scrollTop + body.clientHeight) body.scrollTo({ top: Math.max(0, top - body.clientHeight * 0.15), behavior: 'smooth' })
      }
    }
  }
  // a click: the bar (and the note's moment in it) — play from there
  body.addEventListener('click', e => {
    if (!layout || !svg) return
    const r = svg.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top
    const i = layout.measures.findIndex(m => px >= m.x0 && px <= m.x1 && py >= m.y0 - 20 && py <= m.y1 + 10)
    if (i < 0) return
    const m = layout.measures[i], b = score.bars[i]
    let tick = 0
    for (const [t, x] of m.ticks) if (x <= px + 2) tick = Math.max(tick, t)
    app.player?.seek?.(b.at + tick / b.meter.xTicks)
  })
  new ResizeObserver(() => { if (root.offsetWidth && layout && Math.abs(layout.width - (body.clientWidth - 24)) > 4) draw() }).observe(body)
  return { visible: false, load, update, refresh: draw, exportXml }
}

// ---- engraving ---------------------------------------------------------------------------------------------------------
// → { svg (markup), height, measures: [{ x0, x1, y0, y1, ticks: Map(tick → x) }], sp, width }
export function engrave(score, { sp = 8, width = 1000 }) {
  const fs = 4 * sp, out = [], P = score.parts, S = (n, a = 1) => n * sp * a
  const glyph = (name, x, y, { scale = 1, cls = '' } = {}) => {
    const g = G[name]
    if (!g) return ''
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="sv-g ${cls}" font-size="${(fs * scale).toFixed(1)}">&#x${g[0].toString(16)};</text>`
  }
  const line = (x1, y1, x2, y2, w, cls = 'sv-ink') => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${w.toFixed(2)}" class="${cls}"/>`
  const text = (x, y, s, cls, anchor = 'start') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${cls}" text-anchor="${anchor}" font-size="${(sp * (cls.includes('sv-chord') ? 1.75 : cls.includes('sv-reh') ? 1.5 : cls.includes('sv-num') ? 1.15 : 1.3)).toFixed(1)}">${esc(s)}</text>`
  const yOf = (top, step) => top + ((8 - step) * sp) / 2
  // spacing: a note's room grows with the logarithm of its length
  const room = d => S(1.25 + 1.15 * Math.log2(1 + d / 12))
  // per bar: every onset of every part, the room after it and the room before it (accidentals, grace notes)
  const accW = n => (n.show && n.sp.glyph && G[n.sp.glyph] ? G[n.sp.glyph][1] + 0.3 : 0)
  const bars = score.bars.map((b, bi) => {
    const ticks = new Map()
    for (const p of P) for (const e of p.bars[bi]) {
      const t = e.measureRest ? 0 : e.at
      const lead = (e.grace?.length ? e.grace.length * 1.0 + 0.4 + Math.max(0, ...e.grace.map(g => accW(g) * 0.6)) : 0) + Math.max(0, ...e.notes.map(accW)) + (e.dots ? 0 : 0)
      const cur = ticks.get(t) ?? { lead: 0, dur: Infinity }
      cur.lead = Math.max(cur.lead, lead)
      cur.dur = Math.min(cur.dur, e.measureRest ? b.meter.barTicks : e.dur)
      ticks.set(t, cur)
    }
    const ts = [...ticks.keys()].sort((a, c) => a - c)
    const w = ts.reduce((s, t, i) => s + S(ticks.get(t).lead) + room((ts[i + 1] ?? b.meter.barTicks) - t), 0) + S(1.2)
    return { ticks, ts, w: Math.max(w, S(6)) }
  })
  // systems: as many bars as fit, then justified
  const header = (first, bi) => S(3.6) + S(Math.max(1, score.signature.items.length) * 1.15 + 0.6) + (first || score.bars[bi].time !== score.bars[bi - 1]?.time ? S(2.6) : 0)
  const systems = []
  let row = null
  score.bars.forEach((b, bi) => {
    const need = bars[bi].w
    if (!row || row.w + need > width - row.head - 10) {
      row = { bars: [], w: 0, head: header(!systems.length, bi) }
      systems.push(row)
    }
    row.bars.push(bi)
    row.w += need
  })
  const staffGap = S(10), sysGap = S(5), above = S(6)
  let y = S(3)
  // the title and the tempo
  out.push(text(width / 2, y + S(1.2), score.title, 'sv-title', 'middle'))
  y += S(3.4)
  const first = score.bars[0]
  out.push(text(4, y, `${first?.meter.compound ? '♩.' : '♩'} = ${score.bpm}${score.swing ? '   Swing ♫ = ♩♪' : ''}`, 'sv-tempo'))
  y += S(1)
  const measures = []
  for (const [si, sys] of systems.entries()) {
    const top0 = y + above, tops = P.map((_, i) => top0 + i * (S(4) + staffGap))
    const sysBottom = tops[tops.length - 1] + S(4)
    const left = 2, right = width
    // staves
    for (const top of tops) for (let l = 0; l < 5; l++) out.push(line(left, top + l * sp, right, top + l * sp, S(ENGRAVE.staffLine), 'sv-staff'))
    // the system's start: barline, clef, key signature, time signature (on change), the bar number
    out.push(line(left, tops[0], left, sysBottom, S(ENGRAVE.thinBar)))
    let hx = left + S(0.6)
    P.forEach((p, i) => out.push(glyph(p.clef === 'bass' ? 'fClef' : 'gClef', hx, yOf(tops[i], p.clef === 'bass' ? 6 : 2))))
    hx += S(3.2)
    const sig = score.signature
    sig.items.forEach((it, k) => {
      const name = it.sp?.glyph ?? (it.acc > 0 ? 'accidentalSharp' : 'accidentalFlat')
      P.forEach((p, i) => {
        const st = (it.acc > 0 ? SHARP_STEP : FLAT_STEP)[it.letter] - (p.clef === 'bass' ? 2 : 0)
        out.push(glyph(name, hx + S(k * 1.15), yOf(tops[i], st)))
      })
    })
    hx += S(sig.items.length * 1.15 + (sig.items.length ? 0.6 : 0.2))
    const b0 = sys.bars[0]
    if (si === 0 || score.bars[b0].time !== score.bars[b0 - 1]?.time) {
      const [num, den] = score.bars[b0].time.split('/')
      P.forEach((_, i) => {
        out.push(digits(num, hx, yOf(tops[i], 6)))
        out.push(digits(den, hx, yOf(tops[i], 2)))
      })
      hx += S(2.6)
    }
    out.push(text(left + S(0.3), tops[0] - S(1.6), String(score.bars[b0].n), 'sv-num'))
    // the bars, justified
    const free = right - hx - S(0.4), natural = sys.w, last = si === systems.length - 1
    const k = last && natural < free * 0.7 ? 1 : free / natural
    let bx = hx
    for (const bi of sys.bars) {
      const B = bars[bi], b = score.bars[bi], x0 = bx, w = B.w * k, xs = new Map()
      // a time change inside the system
      if (bi !== b0 && b.time !== score.bars[bi - 1].time) {
        const [num, den] = b.time.split('/')
        P.forEach((_, i) => { out.push(digits(num, bx + S(0.5), yOf(tops[i], 6))); out.push(digits(den, bx + S(0.5), yOf(tops[i], 2))) })
      }
      let tx = x0 + S(1.0) * k + (bi !== b0 && b.time !== score.bars[bi - 1].time ? S(2.4) : 0)
      const usable = w - (tx - x0)
      const sum = B.ts.reduce((s, t, i) => s + S(B.ticks.get(t).lead) + room((B.ts[i + 1] ?? b.meter.barTicks) - t), 0) || 1
      const f = usable / (sum + S(0.2))
      for (const [i, t] of B.ts.entries()) {
        tx += S(B.ticks.get(t).lead) * Math.min(1, f)
        xs.set(t, tx)
        tx += room((B.ts[i + 1] ?? b.meter.barTicks) - t) * f + S(B.ticks.get(t).lead) * Math.max(0, f - 1)
      }
      // the barline, the section, the chords
      out.push(line(x0 + w, tops[0], x0 + w, sysBottom, S(ENGRAVE.thinBar)))
      if (b.section) out.push(`<g class="sv-rehg">${text(x0 + S(0.4), tops[0] - S(4.4), b.section, 'sv-reh')}</g>`)
      for (const c of b.chords) out.push(text((xs.get(c.at) ?? interp(xs, c.at, b)) - S(0.2), tops[0] - S(2.2), c.symbol, 'sv-chord'))
      // the parts
      P.forEach((p, pi) => out.push(drawBar(p.bars[bi], { top: tops[pi], clef: p.clef, xs, x0, x1: x0 + w, b, sp, glyph, line, text, yOf, S })))
      measures[bi] = { x0, x1: x0 + w, y0: tops[0] - S(2.5), y1: sysBottom + S(1.5), ticks: xs }
      bx += w
    }
    y = sysBottom + sysGap
  }
  function digits(s, x, yy) { return [...String(s)].map((d, i) => glyph('timeSig' + d, x + S(i * 1.55), yy)).join('') }
  function interp(xs, t) { let best = null; for (const [k, v] of xs) if (k <= t) best = v; return best ?? [...xs.values()][0] ?? 0 }
  return { svg: out.join(''), height: y + S(4), measures, sp, width }
}

// one bar of one part
function drawBar(evs, { top, clef, xs, x0, x1, b, sp, glyph, line, text, yOf, S }) {
  const out = []
  const NOTEHEAD = { whole: 'noteheadWhole', half: 'noteheadHalf' }
  const FLAG = { eighth: '8th', '16th': '16th', '32nd': '32nd', '64th': '64th' }
  const REST = { whole: 'restWhole', half: 'restHalf', quarter: 'restQuarter', eighth: 'rest8th', '16th': 'rest16th', '32nd': 'rest32nd', '64th': 'rest64th' }
  const steps = e => e.notes.map(n => staffStep(n.sp, clef))
  // stems of a beamed run point one way: by the notes' average against the middle line
  const runs = []
  let run = null
  for (const e of evs) {
    if (e.beams?.[0] === 'begin') run = { evs: [] }
    if (run && e.beams) run.evs.push(e)
    if (run && e.beams?.[0] === 'end') { runs.push(run); run = null }
  }
  for (const r of runs) {
    const all = r.evs.flatMap(steps), up = all.reduce((s, v) => s + v, 0) / all.length < 4
    r.evs.forEach(e => (e.up = up))
  }
  const ledger = (x, st, w) => {
    for (let s = -2; s >= st; s -= 2) out.push(line(x - S(0.4), yOf(top, s), x + w + S(0.4), yOf(top, s), S(0.16)))
    for (let s = 10; s <= st; s += 2) out.push(line(x - S(0.4), yOf(top, s), x + w + S(0.4), yOf(top, s), S(0.16)))
  }
  const tips = new Map() // event → { x, y } of its stem tip (for beams)
  for (const e of evs) {
    const x = e.measureRest ? (x0 + x1) / 2 - S(0.56) : xs.get(e.at)
    if (x == null) continue
    if (e.rest) {
      const name = e.measureRest ? 'restWhole' : REST[e.type]
      const st = name === 'restWhole' ? 6 : 4
      out.push(glyph(name, x, yOf(top, st)))
      for (let d = 0; d < (e.dots ?? 0); d++) out.push(glyph('augmentationDot', x + S(1.4 + d * 0.55), yOf(top, 5)))
      continue
    }
    const st = steps(e), lo = Math.min(...st), hi = Math.max(...st)
    const up = e.up ?? (st.reduce((s, v) => s + v, 0) / st.length < 4)
    const head = NOTEHEAD[e.type] ?? 'noteheadBlack', hw = S(G[head][1])
    // grace notes: small, slashed, before the note
    if (e.grace?.length) {
      e.grace.forEach((g, i) => {
        const gx = x - S(1.1 * (e.grace.length - i)) - S(Math.max(0, ...e.notes.map(n => (n.show && n.sp.glyph ? G[n.sp.glyph]?.[1] ?? 0 : 0))) + 0.2)
        const gs = staffStep(g.sp, clef), gy = yOf(top, gs)
        ledger(gx, gs, S(0.7))
        if (g.show && g.sp.glyph && G[g.sp.glyph]) out.push(glyph(g.sp.glyph, gx - S(G[g.sp.glyph][1] * 0.6 + 0.15), gy, { scale: 0.6, cls: 'sv-grace' }))
        out.push(glyph('noteheadBlack', gx, gy, { scale: 0.6, cls: 'sv-grace' }))
        out.push(line(gx + S(0.69), gy, gx + S(0.69), gy - S(2.4), S(0.1), 'sv-grace-l'))
        if (i === e.grace.length - 1) out.push(line(gx + S(0.2), gy - S(1.1), gx + S(1.3), gy - S(2.0), S(0.1), 'sv-grace-l'))
      })
    }
    // noteheads (a second apart: the upper/lower one moves to the other side of the stem), accidentals, ledger lines, dots
    const order = e.notes.map((n, i) => ({ n, s: st[i] })).sort((a, c) => a.s - c.s)
    let accCol = 0, lastAccStep = null
    for (const [i, o] of order.entries()) {
      const prev = order[i - 1], shifted = prev && o.s - prev.s === 1 && !prev.shift
      o.shift = shifted
      const hx = x + (shifted ? (up ? hw : -hw) : 0), y = yOf(top, o.s)
      ledger(hx, o.s, hw)
      out.push(glyph(head, hx, y, { cls: o.n.midi % 1 ? 'sv-micro' : '' }))
      if (o.n.show && o.n.sp.glyph && G[o.n.sp.glyph]) {
        const aw = G[o.n.sp.glyph][1]
        accCol = lastAccStep != null && o.s - lastAccStep < 6 ? accCol + 1 : 0
        lastAccStep = o.s
        out.push(glyph(o.n.sp.glyph, x - S(aw + 0.25 + accCol * (aw + 0.15)), y, { cls: o.n.midi % 1 ? 'sv-micro' : '' }))
      }
      if (Math.abs(o.n.sp.cents) >= 1 && !o.n.tieStop) out.push(text(hx + hw / 2, yOf(top, Math.max(o.s, 8)) - S(up ? 4.6 : 1.4), `${o.n.sp.cents > 0 ? '+' : '−'}${Math.round(Math.abs(o.n.sp.cents))}`, 'sv-cents', 'middle'))
      for (let d = 0; d < (e.dots ?? 0); d++) out.push(glyph('augmentationDot', x + hw + S(0.45 + d * 0.55) + (shifted && up ? hw : 0), yOf(top, o.s % 2 === 0 ? o.s + 1 : o.s)))
      // ties: an arc from this note to where the next one starts (or the end of the bar)
      if (o.n.tieStart) {
        const nxt = evs.find(q => q.at > e.at && !q.rest)
        const x2 = nxt ? xs.get(nxt.at) : x1 - S(0.3), dir = up ? 1 : -1, yy = y + dir * S(0.6)
        const xa = hx + hw + S(0.15), xb = x2 - S(0.15), mid = (xa + xb) / 2, bow = dir * S(Math.min(1.4, 0.5 + (xb - xa) / S(12)))
        if (xb > xa) out.push(`<path d="M${xa.toFixed(1)} ${yy.toFixed(1)} Q${mid.toFixed(1)} ${(yy + bow).toFixed(1)} ${xb.toFixed(1)} ${yy.toFixed(1)} Q${mid.toFixed(1)} ${(yy + bow * 0.78).toFixed(1)} ${xa.toFixed(1)} ${yy.toFixed(1)}Z" class="sv-tie"/>`)
      }
      if (o.n.tieStop && e === evs.find(q => !q.rest) && e.at === 0 && !o.n.tieStart) { // the end of a tie from the bar before
        const dir = up ? 1 : -1, yy = y + dir * S(0.6), xb = hx - S(0.15), xa = x0 + S(0.3), mid = (xa + xb) / 2, bow = dir * S(0.8)
        if (xb > xa) out.push(`<path d="M${xa.toFixed(1)} ${yy.toFixed(1)} Q${mid.toFixed(1)} ${(yy + bow).toFixed(1)} ${xb.toFixed(1)} ${yy.toFixed(1)} Q${mid.toFixed(1)} ${(yy + bow * 0.78).toFixed(1)} ${xa.toFixed(1)} ${yy.toFixed(1)}Z" class="sv-tie"/>`)
      }
    }
    // the stem (from the outer note to 3½ spaces past the other), and a flag when not beamed
    if (e.type !== 'whole') {
      const sx = up ? x + hw - S(0.06) : x + S(0.06)
      const yFrom = yOf(top, up ? lo : hi) + (up ? -S(0.17) : S(0.17))
      let yTo = up ? yOf(top, hi) - S(3.5) : yOf(top, lo) + S(3.5)
      if (up && yTo > yOf(top, 4)) yTo = yOf(top, 4) // stems reach the middle line at least
      if (!up && yTo < yOf(top, 4)) yTo = yOf(top, 4)
      tips.set(e, { x: sx, y: yTo, up, from: yFrom })
      if (!e.beams) {
        out.push(line(sx, yFrom, sx, yTo, S(0.12)))
        if (FLAG[e.type]) out.push(glyph(`flag${FLAG[e.type]}${up ? 'Up' : 'Down'}`, sx - S(0.06), yTo))
      }
    }
    // a triplet's number, over the group (a bracket when the notes aren't beamed)
    if (e.tuplet?.first) {
      const lastE = evs.find(q => q.at >= e.at && q.tuplet?.last) ?? e
      const xa = x, xb = (xs.get(lastE.at) ?? x) + S(1.2), yy = yOf(top, Math.max(hi, 8)) - S(up ? 4.8 : 1.6)
      out.push(text((xa + xb) / 2, yy, '3', 'sv-tuplet', 'middle'))
      if (!e.beams) out.push(`<path d="M${xa.toFixed(1)} ${(yy + S(0.6)).toFixed(1)} v${(-S(0.5)).toFixed(1)} h${((xb - xa) / 2 - S(0.7)).toFixed(1)} M${((xa + xb) / 2 + S(0.7)).toFixed(1)} ${(yy + S(0.1)).toFixed(1)} H${xb.toFixed(1)} v${S(0.5).toFixed(1)}" class="sv-bracket"/>`)
    }
  }
  // beams: straight lines between the first and last stem tips (a gentle slope), every stem extended to them
  for (const r of runs) {
    const ps = r.evs.map(e => tips.get(e)).filter(Boolean)
    if (ps.length < 2) continue
    const up = ps[0].up, xa = ps[0].x, xb = ps[ps.length - 1].x
    let slope = (ps[ps.length - 1].y - ps[0].y) / Math.max(1, xb - xa)
    slope = Math.max(-0.12, Math.min(0.12, slope))
    // shift the line so every stem is at least 2.5 spaces long
    let off = 0
    for (const p of ps) {
      const yl = ps[0].y + slope * (p.x - xa), need = up ? p.from - S(2.5) : p.from + S(2.5)
      off = up ? Math.min(off, need - yl) : Math.max(off, need - yl)
      if (up && yl + off > p.y) off = Math.min(off, p.y - yl)
      if (!up && yl + off < p.y) off = Math.max(off, p.y - yl)
    }
    const yAt = x => ps[0].y + off + slope * (x - xa)
    r.evs.forEach((e, i) => {
      const p = tips.get(e)
      if (!p) return
      out.push(line(p.x, p.from, p.x, yAt(p.x), S(0.12)))
      ;(e.beams ?? []).forEach((kind, lv) => {
        const dy = (up ? 1 : -1) * lv * S(0.75), th = S(0.5)
        let a = null, z = null
        if (kind === 'begin' || kind === 'continue') { a = p.x; const n = tips.get(r.evs[i + 1]); z = n?.x }
        else if (kind === 'forward hook') { a = p.x; z = p.x + S(1.1) }
        else if (kind === 'backward hook') { a = p.x - S(1.1); z = p.x }
        if (a == null || z == null) return
        const ya = yAt(a) + dy, yz = yAt(z) + dy, t = up ? th : -th
        out.push(`<path d="M${a.toFixed(1)} ${ya.toFixed(1)} L${z.toFixed(1)} ${yz.toFixed(1)} L${z.toFixed(1)} ${(yz + t).toFixed(1)} L${a.toFixed(1)} ${(ya + t).toFixed(1)}Z" class="sv-beam"/>`)
      })
    })
  }
  return out.join('')
}
