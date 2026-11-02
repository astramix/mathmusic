// Themed scenery behind the curves (classic, 2D) and around the ribbons (space, 3D), one per theme:
// a night in space, a rainy city, 8-bit hills, a sunset sea, sakura, a baroque hall, a cathedral,
// outrun, a neon tunnel, a drift road, cats on roofs, ink mountains, a moonlit lake, a jazz club, a factory at dusk,
// Brinstar's glowing jungle, a cathedral's organ, a stadium, northern lights, an old desktop, a demoscene cathedral, a
// haunted arcade, a favela at night.
// It moves with the music, not the clock: x is the beat, so the sun's stripes, the floor grid, the
// tunnel frames, road dashes and waves step exactly once per beat, the rose window's light goes round
// once per bar, windows switch on every two bars, fireflies flash on beats; the nearest layer scrolls
// with the curves (a lamp per bar stands on its bar line; in 3D the props pass the playhead plane on
// the downbeat); the kick flashes, sections bring lightning and change the light. A pure function of
// (x, time, levels) — the video export draws the same frames.

const TAU = Math.PI * 2
const fr = v => v - Math.floor(v)
const hsh = n => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453)
const clamp01 = v => Math.max(0, Math.min(1, v))
const vnoise = (u, s) => {
  const i = Math.floor(u), f = u - i, w = f * f * (3 - 2 * f)
  return hsh(i + s * 57.3) * (1 - w) + hsh(i + 1 + s * 57.3) * w
}
const fbm = (u, s, oct = 4) => {
  let a = 0.5, sum = 0, n = 0
  for (let o = 0; o < oct; o++, u *= 2.03, a *= 0.5) (sum += a * vnoise(u, s + o * 13)), (n += a)
  return sum / n
}
const rgbOf = hex => {
  const n = parseInt(hex.slice(1, 7), 16)
  return `${n >> 16},${(n >> 8) & 255},${n & 255}`
}
const rgba = (rgb, a) => `rgba(${rgb},${Math.max(0, a)})`
const hsla = (h, s, l, a = 1) => `hsl(${h.toFixed(1)} ${s}% ${l}% / ${a})`
export const isDrum = key => /drum|kick|snare|hat|clap|paw|hiss|claw|perc|tom|crash|beat|taiko/i.test(key)

// the music at this frame: beat phase, downbeat, kick, energy, the song's progress, a section flash
export function musicOf(sc) {
  const x = sc.x, th = sc.theme
  let kick = Infinity, drums = false
  for (const t of sc.tracks) if (!t.muted && isDrum(t.key)) (drums = true), (kick = Math.min(kick, x - t.onset))
  const pulse = Math.exp(-5 * fr(x))
  return {
    x, time: sc.time, beat: fr(x), pulse, down: Math.exp(-3 * (((x % 4) + 4) % 4)),
    kick: drums ? (kick >= 0 && kick < 8 ? Math.exp(-6 * kick) : 0) : pulse * 0.6 * sc.energy,
    energy: sc.energy, prog: clamp01(x / (sc.song.length || 1)), sec: sc.section,
    flash: sc.section > 0 ? Math.exp(-2.5 * (sc.time - sc.sectionAt)) : 0,
    hue: sc.bgHue, A: rgbOf(th.accent), B: rgbOf(th.accent2), S: th.star,
  }
}

// ---- primitives ---------------------------------------------------------------------------------
function halo(g, x, y, r, rgb, a) {
  if (r <= 0 || a <= 0.002) return
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, rgba(rgb, a))
  gr.addColorStop(0.4, rgba(rgb, a * 0.35))
  gr.addColorStop(1, rgba(rgb, 0))
  g.fillStyle = gr
  g.fillRect(x - r, y - r, 2 * r, 2 * r)
}
// a silhouette y = base − amp·fbm(u), sampled on a grid fixed to the world so it doesn't shimmer as it scrolls
function ridge(g, c, o) {
  const st = (o.quant || o.step || 5) * c.k, off = c.scroll(o.par), sx0 = -(((off % st) + st) % st)
  g.beginPath()
  g.moveTo(sx0 - st, o.to ?? c.H)
  for (let sx = sx0 - st; sx <= c.W + 2 * st; sx += st) {
    let v = fbm((sx + off) / (o.scale * Math.max(c.k, c.W / 1100)), o.seed, o.oct ?? 4) // wide screens: wider hills, not more of them
    if (o.peaks) v = Math.pow(1 - Math.abs(2 * v - 1), 1.6)
    let y = o.y - o.amp * v
    if (o.quant) {
      y = Math.round(y / st) * st
      g.lineTo(sx, y)
      g.lineTo(sx + st, y)
    } else g.lineTo(sx, y)
  }
  g.lineTo(c.W + 2 * st, o.to ?? c.H)
  g.closePath()
  g.fillStyle = o.fill
  g.fill()
  if (o.line) {
    g.strokeStyle = o.line
    g.lineWidth = (o.lw ?? 1.2) * c.k
    g.stroke()
  }
}
// slot i of a repeating layer: its screen x, for every slot on screen
function slots(c, par, width, fn) {
  const st = width * c.k, off = c.scroll(par), i0 = Math.floor(off / st) - 2
  for (let i = i0; i <= i0 + c.W / st + 4; i++) fn(i * st - off, i, st)
}
// the nearest layer: objects on beats b = every·j, at the curves' own x
function onBeats(c, every, fn) {
  if (!c.at) return
  for (let b = Math.ceil((c.from - every) / every) * every; b <= c.to + every; b += every) if (b >= 0) fn(c.at(b), b)
}
function moon(g, x, y, r, rgb, glow = 1) {
  halo(g, x, y, r * 5, rgb, 0.16 * glow)
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
  gr.addColorStop(0, rgba(rgb, 0.95))
  gr.addColorStop(1, rgba(rgb, 0.6))
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(0,0,0,0.07)'
  for (const [dx, dy, rr] of [[-0.3, 0.1, 0.22], [0.25, -0.3, 0.14], [0.2, 0.35, 0.18]]) {
    g.beginPath()
    g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU)
    g.fill()
  }
}
function petals(g, c, m, n, cols, seed, size) {
  for (let i = 0; i < n; i++) {
    const sp = 0.6 + 0.8 * hsh(i * 1.7 + seed)
    const y = (fr(m.x * 0.035 * sp + hsh(i + seed)) * 1.1 - 0.05) * c.H
    const x = fr(hsh(i * 2.3 + seed) - m.x * 0.006 * sp) * (c.W + 40 * c.k) - 20 * c.k + Math.sin(m.x * Math.PI * 0.5 + i) * 14 * c.k
    const r = size * c.k * (0.6 + 0.6 * hsh(i * 3.9 + seed))
    g.save()
    g.translate(x, y)
    g.rotate(m.x * 0.7 * sp + i)
    g.fillStyle = rgba(cols[i % cols.length], 0.55)
    g.beginPath()
    g.ellipse(0, 0, r, r * 0.55 * (0.5 + 0.5 * Math.abs(Math.sin(m.x * 0.9 * sp + i))), 0, 0, TAU)
    g.fill()
    g.restore()
  }
}
// buildings in slots, with windows: lit at random, and a few switch every two bars
function skyline(g, c, m, o) {
  slots(c, o.par, o.slot, (sx, i, st) => {
    const w = st * (0.55 + 0.45 * hsh(i * 3.1 + o.seed)), h = o.lo + (o.hi - o.lo) * hsh(i * 7.7 + o.seed)
    const x0 = sx + (st - w) / 2, y0 = o.base - h
    g.fillStyle = o.fill
    g.fillRect(x0, y0, w, c.H - y0)
    if (hsh(i * 5.3 + o.seed) < 0.25) g.fillRect(x0 + w * 0.5, y0 - 10 * c.k, 1.2 * c.k, 10 * c.k)
    if (!o.win) return
    const cell = 6 * c.k, cols = Math.floor((w - 4 * c.k) / cell), rows = Math.min(16, Math.floor((h - 6 * c.k) / (cell * 1.5)))
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const id = i * 1000 + r * 37 + q
      if ((hsh(id * 0.73 + o.seed) < 0.26) === (hsh(id + Math.floor(m.x / 8) * 13.1) < 0.07)) continue
      g.fillStyle = rgba(o.win, o.winA * (0.5 + 0.5 * hsh(id * 1.31)))
      g.fillRect(x0 + 3 * c.k + q * cell, y0 + 5 * c.k + r * cell * 1.5, cell * 0.55, cell * 0.7)
    }
  })
}

// ---- props: things that stand on the ground; (x, y) = foot, s = pixels per world unit ----------------
function lamp(g, x, y, s, m, side, rgb) {
  const top = y - 4.6 * s, hx = x + side * 0.9 * s
  const cone = g.createLinearGradient(0, top, 0, y)
  cone.addColorStop(0, rgba(rgb, 0.16 + 0.06 * m.down))
  cone.addColorStop(1, rgba(rgb, 0))
  g.fillStyle = cone
  g.beginPath()
  g.moveTo(hx - 0.25 * s, top + 0.2 * s)
  g.lineTo(hx + 0.25 * s, top + 0.2 * s)
  g.lineTo(hx + 1.6 * s, y)
  g.lineTo(hx - 1.6 * s, y)
  g.fill()
  g.fillStyle = 'rgba(8,6,12,0.9)'
  g.fillRect(x - 0.07 * s, top, 0.14 * s, 4.6 * s)
  g.fillRect(Math.min(x, hx), top - 0.05 * s, Math.abs(hx - x), 0.1 * s)
  g.fillRect(hx - 0.22 * s, top, 0.44 * s, 0.22 * s)
  halo(g, hx, top + 0.25 * s, 1.9 * s, rgb, 0.45 + 0.15 * m.down)
  g.fillStyle = rgba(rgb, 0.95)
  g.fillRect(hx - 0.14 * s, top + 0.2 * s, 0.28 * s, 0.1 * s)
  halo(g, hx, y, 1.5 * s, rgb, 0.12)
}
function palm(g, x, y, s, m, side, col, b = 0) {
  const sway = Math.sin(m.x * Math.PI / 4 + b) * 0.35 * s, tx = x + side * 0.9 * s + sway, ty = y - 5.2 * s
  g.strokeStyle = col
  g.lineCap = 'round'
  g.lineWidth = 0.28 * s
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x + side * 0.1 * s, y - 3 * s, tx, ty)
  g.stroke()
  g.lineWidth = 0.14 * s
  for (let j = 0; j < 8; j++) {
    const a = -Math.PI / 2 + (j - 3.5) * 0.42 + sway * 0.05 / s, L = (2.1 + 0.4 * hsh(j + b)) * s
    const ex = tx + Math.cos(a) * L * 1.15, ey = ty + Math.sin(a) * L * 0.35 + 1.1 * s
    g.beginPath()
    g.moveTo(tx, ty)
    g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.9, ex, ey)
    g.stroke()
  }
}
function column(g, x, y, s, m, side, rgb) {
  const w = 0.7 * s, h = 6 * s
  const gr = g.createLinearGradient(x - w, 0, x + w, 0)
  gr.addColorStop(0, 'rgba(10,8,6,0.85)')
  gr.addColorStop(0.35, rgba(rgb, 0.22 + 0.12 * m.down))
  gr.addColorStop(1, 'rgba(10,8,6,0.85)')
  g.fillStyle = gr
  g.fillRect(x - w / 2, y - h, w, h)
  g.fillStyle = 'rgba(14,11,8,0.9)'
  g.fillRect(x - 0.6 * s, y - 0.35 * s, 1.2 * s, 0.35 * s)
  g.fillRect(x - 0.62 * s, y - h - 0.3 * s, 1.24 * s, 0.3 * s)
  g.strokeStyle = rgba(rgb, 0.3)
  g.lineWidth = Math.max(1, 0.05 * s)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.arc(x + d * 0.42 * s, y - h + 0.12 * s, 0.17 * s, 0, TAU)
    g.stroke()
  }
  for (let f = -2; f <= 2; f++) g.fillRect(x + f * 0.12 * s, y - h + 0.4 * s, Math.max(0.5, 0.02 * s), h - 0.8 * s)
}
function spire(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(9,6,14,0.92)'
  g.fillRect(x - 0.35 * s, y - 6 * s, 0.7 * s, 6 * s)
  g.beginPath()
  g.moveTo(x - 0.45 * s, y - 6 * s)
  g.lineTo(x, y - 8 * s)
  g.lineTo(x + 0.45 * s, y - 6 * s)
  g.fill()
  candle(g, x + side * 0.7 * s, y, s, m, rgb, x)
}
function candle(g, x, y, s, m, rgb, seed) {
  const fl = 0.75 + 0.25 * hsh(seed + Math.floor(m.time * 14))
  g.fillStyle = 'rgba(230,220,200,0.6)'
  g.fillRect(x - 0.06 * s, y - 0.8 * s, 0.12 * s, 0.8 * s)
  halo(g, x, y - 0.95 * s, 0.9 * s * fl, rgb, 0.4)
  g.fillStyle = rgba('255,230,170', 0.9)
  g.beginPath()
  g.ellipse(x, y - 0.95 * s, 0.05 * s, 0.13 * s * fl, 0, 0, TAU)
  g.fill()
}
function pylon(g, x, y, s, m, side, rgb) {
  const a = 0.5 + 0.5 * m.kick
  g.strokeStyle = rgba(rgb, 0.25 * a)
  g.lineWidth = 0.4 * s
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - 4 * s)
  g.stroke()
  g.strokeStyle = rgba(rgb, 0.9 * a)
  g.lineWidth = Math.max(1, 0.08 * s)
  g.stroke()
  halo(g, x, y - 4 * s, 1.2 * s, rgb, 0.5 * a)
}
function sakura(g, x, y, s, m, side, rgb, b = 0, a = 0.16) {
  g.strokeStyle = 'rgba(30,14,20,0.9)'
  g.lineCap = 'round'
  g.lineWidth = 0.3 * s
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x - side * 0.4 * s, y - 2 * s, x + side * 0.2 * s, y - 3.4 * s)
  g.stroke()
  const sway = Math.sin(m.x * Math.PI / 2 + b) * 0.12 * s
  for (let j = 0; j < 7; j++) {
    const a = hsh(j + b * 0.1) * TAU, r = (1.1 + 0.5 * hsh(j * 3 + b)) * s
    g.fillStyle = rgba(j % 2 ? '255,183,213' : '255,214,232', a + 0.08 * m.down)
    g.beginPath()
    g.arc(x + side * 0.2 * s + Math.cos(a) * 1.1 * s + sway, y - 3.9 * s + Math.sin(a) * 0.7 * s, r, 0, TAU)
    g.fill()
  }
}
function block(g, x, y, s, m, side, rgb, b = 0) {
  const bump = m.x >= b && m.x < b + 0.5 ? Math.sin(Math.PI * (m.x - b) / 0.5) * 0.5 * s : 0
  const w = 1.1 * s, top = y - 2.6 * s - bump
  g.fillStyle = rgba(rgb, 0.85)
  g.fillRect(x - w / 2, top, w, w)
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.fillRect(x - w / 2, top + w - 0.12 * s, w, 0.12 * s)
  g.fillRect(x + w / 2 - 0.12 * s, top, 0.12 * s, w)
  g.fillStyle = 'rgba(40,20,0,0.9)'
  const p = w / 8
  for (const [cx, cy] of [[3, 1], [4, 1], [5, 2], [5, 3], [4, 4], [3, 4], [3, 5], [3, 7]]) g.fillRect(x - w / 2 + cx * p - p / 2, top + cy * p - p / 2, p, p)
}
function toro(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(14,10,10,0.92)'
  g.fillRect(x - 0.5 * s, y - 0.3 * s, 1 * s, 0.3 * s)
  g.fillRect(x - 0.13 * s, y - 1.6 * s, 0.26 * s, 1.3 * s)
  g.fillRect(x - 0.45 * s, y - 1.75 * s, 0.9 * s, 0.18 * s)
  halo(g, x, y - 2.1 * s, 1.3 * s, rgb, 0.3 + 0.15 * m.down)
  g.fillStyle = rgba(rgb, 0.75)
  g.fillRect(x - 0.3 * s, y - 2.4 * s, 0.6 * s, 0.6 * s)
  g.fillStyle = 'rgba(14,10,10,0.95)'
  g.fillRect(x - 0.03 * s, y - 2.4 * s, 0.06 * s, 0.6 * s)
  g.beginPath()
  g.moveTo(x - 0.75 * s, y - 2.35 * s)
  g.quadraticCurveTo(x, y - 2.65 * s, x, y - 3.05 * s)
  g.quadraticCurveTo(x, y - 2.65 * s, x + 0.75 * s, y - 2.35 * s)
  g.fill()
}
function rock(g, x, y, s, m, side, rgb, b = 0) {
  const cy = y - (2.5 + 2 * hsh(b * 1.3 + side)) * s, r = (0.5 + 0.6 * hsh(b + side * 7)) * s, rot = m.x * 0.15 * side + b
  g.fillStyle = 'rgba(30,26,40,0.95)'
  g.beginPath()
  for (let j = 0; j < 8; j++) {
    const a = rot + (j / 8) * TAU, rr = r * (0.7 + 0.3 * hsh(j + b * 3 + side))
    g[j ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
  g.strokeStyle = rgba(rgb, 0.35)
  g.lineWidth = Math.max(1, 0.06 * s)
  g.stroke()
}
function cat(g, x, y, s, col, tail) {
  g.fillStyle = col
  g.beginPath()
  g.ellipse(x, y - 0.5 * s, 0.42 * s, 0.55 * s, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.arc(x, y - 1.2 * s, 0.3 * s, 0, TAU)
  g.fill()
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(x + d * 0.28 * s, y - 1.3 * s)
    g.lineTo(x + d * 0.24 * s, y - 1.68 * s)
    g.lineTo(x + d * 0.06 * s, y - 1.45 * s)
    g.fill()
  }
  g.strokeStyle = col
  g.lineWidth = 0.1 * s
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x + 0.3 * s, y - 0.1 * s)
  g.quadraticCurveTo(x + 0.9 * s, y - 0.2 * s, x + (0.8 + 0.3 * tail) * s, y - (0.8 + 0.25 * tail) * s)
  g.stroke()
}
function catpost(g, x, y, s, m, side, rgb, b = 0) {
  g.fillStyle = 'rgba(14,10,16,0.92)'
  g.fillRect(x - 0.2 * s, y - 2 * s, 0.4 * s, 2 * s)
  if (hsh(b * 0.37) < 0.5) cat(g, x, y - 2 * s, s * 0.9, 'rgba(14,10,16,0.95)', Math.sin(m.x * Math.PI + b))
}
// a fanous: the pierced brass lantern of Ramadan nights on a post, its light breathing with the beat
function lantern(g, x, y, s, m, side, rgb) {
  const top = y - 4.2 * s, lx = x + side * 0.7 * s
  g.fillStyle = 'rgba(12,8,6,0.92)'
  g.fillRect(x - 0.1 * s, top, 0.2 * s, 4.2 * s)
  g.fillRect(x, top, side * 0.75 * s, 0.12 * s)
  halo(g, lx, top + 0.9 * s, 2.2 * s, rgb, 0.22 + 0.18 * m.down + 0.1 * m.kick)
  g.fillStyle = rgba(rgb, 0.75)
  g.beginPath()
  g.moveTo(lx, top + 0.15 * s)
  g.lineTo(lx + 0.35 * s, top + 0.55 * s)
  g.lineTo(lx + 0.3 * s, top + 1.25 * s)
  g.lineTo(lx, top + 1.55 * s)
  g.lineTo(lx - 0.3 * s, top + 1.25 * s)
  g.lineTo(lx - 0.35 * s, top + 0.55 * s)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(30,18,8,0.7)'
  for (let j = 0; j < 3; j++) g.fillRect(lx - 0.24 * s + j * 0.18 * s, top + 0.6 * s, 0.08 * s, 0.5 * s)
}
// a diya: a little clay oil lamp, its flame flickering on the beat
function diya(g, x, y, s, m, side, rgb, b = 0) {
  const fl = 0.75 + 0.25 * Math.sin(m.x * 11 + b * 3) + 0.2 * m.kick
  halo(g, x, y - 0.6 * s, 1.6 * s * fl, rgb, 0.3)
  g.fillStyle = 'rgba(40,20,12,0.95)'
  g.beginPath()
  g.ellipse(x, y - 0.18 * s, 0.6 * s, 0.22 * s, 0, 0, Math.PI)
  g.fill()
  g.fillStyle = rgba(rgb, 0.9)
  g.beginPath()
  g.moveTo(x + 0.25 * s, y - 0.25 * s)
  g.quadraticCurveTo(x + 0.4 * s, y - (0.6 + 0.3 * fl) * s, x + 0.3 * s, y - (0.85 + 0.35 * fl) * s)
  g.quadraticCurveTo(x + 0.12 * s, y - 0.55 * s, x + 0.25 * s, y - 0.25 * s)
  g.fill()
}
// a standing stone with a spiral carved in it that glows on the downbeat
function menhir(g, x, y, s, m, side, rgb, b = 0) {
  const h = (3.2 + 1.2 * hsh(b * 0.71)) * s, w = 0.9 * s
  g.fillStyle = 'rgba(16,20,18,0.95)'
  g.beginPath()
  g.moveTo(x - w / 2, y)
  g.lineTo(x - w * 0.42, y - h * 0.85)
  g.quadraticCurveTo(x, y - h * 1.05, x + w * 0.4, y - h * 0.9)
  g.lineTo(x + w / 2, y)
  g.fill()
  g.strokeStyle = rgba(rgb, 0.25 + 0.45 * m.down)
  g.lineWidth = 0.08 * s
  g.beginPath()
  for (let a = 0; a < 3 * TAU; a += 0.2) { const r = 0.05 * s * a, px = x + Math.cos(a) * r, py = y - h * 0.55 + Math.sin(a) * r; a ? g.lineTo(px, py) : g.moveTo(px, py) }
  g.stroke()
}
// a crate on a pallet, its stencilled arrow lit on the beat (the factory's road)
function crate(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(40,30,22,0.95)'; g.fillRect(x - 1.1 * s, y - 0.25 * s, 2.2 * s, 0.25 * s)
  g.fillStyle = 'rgba(120,80,40,0.95)'; g.fillRect(x - s, y - 2.2 * s, 2 * s, 1.95 * s)
  g.strokeStyle = 'rgba(60,40,20,0.9)'; g.lineWidth = 0.12 * s
  g.strokeRect(x - s, y - 2.2 * s, 2 * s, 1.95 * s)
  g.beginPath(); g.moveTo(x - s, y - 2.2 * s); g.lineTo(x + s, y - 0.25 * s); g.stroke()
  halo(g, x, y - 2.6 * s, 0.9 * s, rgb, 0.25 + 0.3 * m.pulse)
}
// a glowing mushroom, its cap pulsing on the beats (the jungle)
function mushroom(g, x, y, s, m, side, rgb, b = 0) {
  const h = (1.6 + 1.2 * hsh(b * 1.7)) * s, r = (0.9 + 0.5 * hsh(b * 2.3)) * s
  g.fillStyle = 'rgba(200,255,230,0.25)'; g.fillRect(x - 0.15 * s, y - h, 0.3 * s, h)
  g.fillStyle = rgba(rgb, 0.55 + 0.35 * m.pulse)
  g.beginPath(); g.ellipse(x, y - h, r, r * 0.55, 0, Math.PI, TAU); g.fill()
  halo(g, x, y - h, r * 2.4, rgb, 0.25 + 0.35 * m.pulse)
}
// an organ pipe standing by the road, its mouth glowing (the cathedral)
function organpipe(g, x, y, s, m, side, rgb, b = 0) {
  const h = (5 + 2 * hsh(b * 1.3)) * s, w = 0.5 * s
  const gr = g.createLinearGradient(x - w, 0, x + w, 0)
  gr.addColorStop(0, 'rgba(110,90,60,0.95)'); gr.addColorStop(0.45, 'rgba(240,215,160,0.95)'); gr.addColorStop(1, 'rgba(90,70,45,0.95)')
  g.fillStyle = gr; g.fillRect(x - w, y - h, 2 * w, h)
  g.fillStyle = 'rgba(20,12,8,0.9)'; g.beginPath(); g.ellipse(x, y - h * 0.15, w * 0.6, w * 0.3, 0, 0, TAU); g.fill()
  halo(g, x, y - h, 1.4 * s, rgb, 0.2 + 0.3 * m.pulse)
}
// a floodlight mast, its head flashing on the kick (the arena)
function floodlight(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(25,25,32,0.95)'; g.fillRect(x - 0.12 * s, y - 6 * s, 0.24 * s, 6 * s)
  g.fillRect(x - 0.9 * s, y - 6.6 * s, 1.8 * s, 0.7 * s)
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,235,0.95)'; g.fillRect(x - 0.8 * s + i * 0.42 * s, y - 6.5 * s, 0.3 * s, 0.5 * s) }
  halo(g, x, y - 6.3 * s, 2.5 * s, '255,255,240', 0.35 + 0.4 * m.kick)
}
// a snowy pine (the north): tiers of dark green, snow on each
function pineAt(g, x, y, h, col) {
  for (let t = 0; t < 4; t++) {
    const w = h * (0.55 - 0.1 * t), yt = y - h * (0.25 + 0.22 * t)
    g.fillStyle = col; g.beginPath(); g.moveTo(x, yt - h * 0.3); g.lineTo(x - w, yt + h * 0.05); g.lineTo(x + w, yt + h * 0.05); g.closePath(); g.fill()
    g.fillStyle = 'rgba(235,245,255,0.6)'; g.beginPath(); g.moveTo(x, yt - h * 0.3); g.lineTo(x - w * 0.5, yt - h * 0.12); g.lineTo(x + w * 0.5, yt - h * 0.12); g.closePath(); g.fill()
  }
  g.fillStyle = 'rgba(40,28,20,0.9)'; g.fillRect(x - h * 0.04, y - h * 0.25, h * 0.08, h * 0.25)
}
function pine(g, x, y, s, m, side, rgb) { pineAt(g, x, y, 4.5 * s, 'rgba(14,40,32,0.97)'); halo(g, x, y - 6.3 * s, 0.6 * s, rgb, 0.15 * m.down) }
// an old CRT monitor showing a blue screen that turns red on the kick (Error XP)
function monitor(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(210,205,190,0.97)'; g.fillRect(x - 1.4 * s, y - 2.8 * s, 2.8 * s, 2.3 * s)
  g.fillRect(x - 0.5 * s, y - 0.5 * s, s, 0.5 * s)
  g.fillStyle = m.kick > 0.4 ? 'rgba(200,40,40,0.95)' : 'rgba(30,80,200,0.95)'; g.fillRect(x - 1.15 * s, y - 2.55 * s, 2.3 * s, 1.7 * s)
  g.fillStyle = 'rgba(255,255,255,0.8)'; for (let r = 0; r < 3; r++) g.fillRect(x - 0.9 * s, y - 2.3 * s + r * 0.4 * s, (1.2 + 0.5 * hsh(r)) * s, 0.12 * s)
  halo(g, x, y - 1.7 * s, 2 * s, rgb, 0.12 + 0.15 * m.pulse)
}
// a candle of pixels on a stand, flickering in steps (KeyGen Church)
function pixelCandle(g, x, y, s, m, side, rgb, b = 0) {
  const P = Math.max(1, 0.35 * s)
  g.fillStyle = 'rgba(60,50,80,0.95)'; g.fillRect(x - 2 * P, y - P, 4 * P, P)
  g.fillStyle = 'rgba(230,225,210,0.95)'; g.fillRect(x - P, y - 7 * P, 2 * P, 6 * P)
  const fl = Math.floor(m.x * 4 + b) % 3
  g.fillStyle = 'rgba(255,200,60,0.95)'; g.fillRect(x - P + (fl - 1) * P * 0.5, y - 9 * P, 2 * P, 2 * P)
  g.fillStyle = 'rgba(255,255,200,0.95)'; g.fillRect(x - P * 0.5, y - 8.5 * P, P, P)
  halo(g, x, y - 8.5 * P, 3 * s, rgb, 0.3 + 0.2 * m.pulse)
}
// a question block on a post (the mystery game)
function qblock(g, x, y, s, m, side, rgb, b = 0) {
  g.fillStyle = 'rgba(30,20,50,0.95)'; g.fillRect(x - 0.1 * s, y - 3 * s, 0.2 * s, 3 * s)
  const bob = Math.sin(m.x * Math.PI + b) * 0.2 * s
  g.fillStyle = 'rgba(232,160,32,0.97)'; g.fillRect(x - 0.8 * s, y - 4.6 * s + bob, 1.6 * s, 1.6 * s)
  g.fillStyle = 'rgba(255,246,192,0.95)'; g.font = `bold ${1.3 * s}px monospace`; g.fillText('?', x - 0.38 * s, y - 3.4 * s + bob)
  halo(g, x, y - 3.8 * s + bob, 1.8 * s, '255,190,60', 0.2 + 0.3 * m.pulse)
}
// a speaker stack, its cones pumping with the kick (the favela's party)
function speaker(g, x, y, s, m, side, rgb) {
  g.fillStyle = 'rgba(18,14,24,0.97)'; g.fillRect(x - 0.9 * s, y - 3.6 * s, 1.8 * s, 3.6 * s)
  for (const [cy, r] of [[-2.7, 0.55], [-1.1, 0.7]]) {
    const pump = 1 + 0.12 * m.kick
    g.fillStyle = 'rgba(60,50,70,0.95)'; g.beginPath(); g.arc(x, y + cy * s, r * s * pump, 0, TAU); g.fill()
    g.fillStyle = rgba(rgb, 0.4 + 0.4 * m.kick); g.beginPath(); g.arc(x, y + cy * s, 0.2 * s * pump, 0, TAU); g.fill()
  }
  halo(g, x, y - 1.8 * s, 2.2 * s, rgb, 0.15 + 0.35 * m.kick)
}
// a buoy rocking on the swell, its light blinking on the downbeats (the storm)
function lighthouseBuoy(g, x, y, s, m, side, rgb, b = 0) {
  const tilt = 0.15 * Math.sin(m.x * Math.PI / 2 + b)
  g.save(); g.translate(x, y); g.rotate(tilt)
  g.fillStyle = 'rgba(200,50,50,0.95)'; g.fillRect(-0.6 * s, -2.2 * s, 1.2 * s, 2 * s)
  g.fillStyle = 'rgba(240,240,240,0.95)'; g.fillRect(-0.6 * s, -1.5 * s, 1.2 * s, 0.4 * s)
  g.fillStyle = 'rgba(30,30,40,0.95)'; g.fillRect(-0.15 * s, -3 * s, 0.3 * s, 0.8 * s)
  g.restore()
  halo(g, x, y - 3 * s, 1.8 * s, rgb, 0.15 + 0.6 * m.down)
}
const PROPS = { lighthouseBuoy, lamp, palm, column, spire, pylon, sakura, block, toro, rock, catpost, lantern, diya, menhir, crate, mushroom, organpipe, floodlight, pine, monitor, pixelCandle, qblock, speaker }

function torii(g, cx, y, s, half, rgb, a) {
  g.fillStyle = rgba(rgb, a)
  const post = 0.35 * s, top = y - 6.2 * s
  for (const d of [-1, 1]) g.fillRect(cx + d * half - post / 2, top + 0.4 * s, post, 6.2 * s - 0.4 * s)
  g.fillRect(cx - half - 0.5 * s, top + 1.3 * s, 2 * half + s, 0.3 * s)
  g.fillRect(cx - 0.12 * s, top + 0.4 * s, 0.24 * s, 0.9 * s)
  g.beginPath()
  g.moveTo(cx - half - 1.1 * s, top - 0.15 * s)
  g.quadraticCurveTo(cx, top + 0.45 * s, cx + half + 1.1 * s, top - 0.15 * s)
  g.lineTo(cx + half + 1 * s, top + 0.25 * s)
  g.quadraticCurveTo(cx, top + 0.8 * s, cx - half - 1 * s, top + 0.25 * s)
  g.fill()
}
function lancet(g, cx, y, s, half, rgb, a) {
  g.strokeStyle = rgba(rgb, a)
  g.lineWidth = Math.max(1.5, 0.3 * s)
  // two arcs of radius r = 1.25·half from the springing line, meeting in a point over the middle
  const top = y - 7 * s, r = 1.25 * half, th = Math.acos((r - half) / r)
  g.beginPath()
  g.moveTo(cx - half, y)
  g.lineTo(cx - half, top)
  g.arc(cx - half + r, top, r, Math.PI, Math.PI + th, false)
  g.arc(cx + half - r, top, r, -th, 0, false)
  g.lineTo(cx + half, y)
  g.stroke()
}
// a horseshoe arch (Córdoba, Fez): the circle goes on below its centre line, on two slim columns
function horseshoe(g, cx, y, s, half, rgb, a) {
  g.strokeStyle = rgba(rgb, a)
  g.lineWidth = Math.max(1.5, 0.3 * s)
  const r = half * 1.12, cyy = y - 6 * s, th = Math.asin(half / r)
  g.beginPath()
  g.moveTo(cx - half, y)
  g.lineTo(cx - half, cyy + Math.cos(th) * r)
  g.arc(cx, cyy, r, Math.PI / 2 + th, Math.PI / 2 - th + TAU, false)
  g.lineTo(cx + half, y)
  g.stroke()
  g.lineWidth = Math.max(1, 0.12 * s)
  g.beginPath()
  g.arc(cx, cyy, r * 1.12, Math.PI + 0.25, TAU - 0.25)
  g.stroke()
}
// a torana: the temple gateway — two pillars and three curved lintels
function torana(g, cx, y, s, half, rgb, a) {
  g.strokeStyle = rgba(rgb, a)
  g.lineWidth = Math.max(1.5, 0.3 * s)
  const top = y - 6.5 * s
  g.beginPath()
  g.moveTo(cx - half, y)
  g.lineTo(cx - half, top)
  g.moveTo(cx + half, y)
  g.lineTo(cx + half, top)
  for (let j = 0; j < 3; j++) {
    const yy = top + j * 0.9 * s, ov = (1.6 - 0.3 * j) * s
    g.moveTo(cx - half - ov, yy + 0.4 * s)
    g.quadraticCurveTo(cx, yy - 0.8 * s, cx + half + ov, yy + 0.4 * s)
  }
  g.stroke()
}
// a trilithon: two great stones and a lintel (Stonehenge)
function trilithon(g, cx, y, s, half, rgb, a) {
  g.fillStyle = rgba('20,24,22', a)
  const w = 1.2 * s, h = 6.5 * s
  g.fillRect(cx - half - w / 2, y - h, w, h)
  g.fillRect(cx + half - w / 2, y - h, w, h)
  g.fillRect(cx - half - w * 0.7, y - h - 0.9 * s, 2 * half + 1.4 * w, 0.9 * s)
}
const SPANS = { torii, lancet, horseshoe, torana, trilithon }

// ---- skies, one per theme; c = { W, H, k, hy (horizon), ground, scroll(par) px, at(b) | null, from, to } ----
const SKIES = {
  void(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const span = W * 1.6, x = ((hsh(i * 9.1) * span - c.scroll(0.03 + 0.01 * i)) % span + span) % span - W * 0.3
      halo(g, x, H * (0.15 + 0.55 * hsh(i * 4.3)), R * (0.35 + 0.3 * hsh(i * 2.9)), i % 2 ? m.A : m.B, 0.07 + 0.06 * m.energy)
    }
    // a spiral galaxy, turning once in 16 bars
    const gx = W * 0.2, gy = hy * 0.38, GR = R * 0.13
    for (let j = 0; j < 220; j++) {
      const t = j / 220, arm = j % 2, a = t * 3.4 * Math.PI + arm * Math.PI + (m.x * TAU) / 64
      const rr = GR * Math.sqrt(t) + 2 * k * hsh(j), px = gx + Math.cos(a) * rr, py = gy + Math.sin(a) * rr * 0.42
      g.fillStyle = rgba(j % 3 ? m.S : m.B, (1 - t) * 0.55)
      g.fillRect(px, py, 1.4 * k, 1.4 * k)
    }
    halo(g, gx, gy, GR * 0.5, m.B, 0.35)
    // a shooting star on most 2-bar marks
    const n = Math.floor(m.x / 8), u = (m.x - n * 8) / 1.2
    if (u < 1 && hsh(n * 3.3) < 0.75) {
      const x0 = W * (0.3 + 0.6 * hsh(n)), y0 = hy * (0.1 + 0.4 * hsh(n * 1.9)), L = R * 0.5, dx = -0.85, dy = 0.5
      const hx = x0 + dx * L * u, hyy = y0 + dy * L * u, gr = g.createLinearGradient(hx, hyy, hx - dx * L * 0.4, hyy - dy * L * 0.4)
      gr.addColorStop(0, rgba(m.S, 0.9 * (1 - u)))
      gr.addColorStop(1, rgba(m.S, 0))
      g.strokeStyle = gr
      g.lineWidth = 1.6 * k
      g.beginPath()
      g.moveTo(hx, hyy)
      g.lineTo(hx - dx * L * 0.4, hyy - dy * L * 0.4)
      g.stroke()
    }
    g.globalCompositeOperation = 'source-over'
    // a ringed planet drifting by
    const span = W * 1.7, px = W * 1.2 - ((c.scroll(0.05) + W * 0.4) % span), py = hy * 0.45, r = R * 0.07
    g.strokeStyle = rgba(m.B, 0.4)
    g.lineWidth = r * 0.16
    g.beginPath()
    g.ellipse(px, py, r * 2.1, r * 0.5, -0.3, Math.PI, TAU)
    g.stroke()
    const pg = g.createRadialGradient(px - r * 0.4, py - r * 0.4, r * 0.1, px, py, r * 1.05)
    pg.addColorStop(0, rgba(m.A, 0.95))
    pg.addColorStop(1, 'rgba(10,6,24,1)')
    g.fillStyle = pg
    g.beginPath()
    g.arc(px, py, r, 0, TAU)
    g.fill()
    g.beginPath()
    g.ellipse(px, py, r * 2.1, r * 0.5, -0.3, 0, Math.PI)
    g.stroke()
  },

  // a desert night: stars, a crescent, a medina on the horizon, dunes in two layers, lanterns on the beats
  desert(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    for (let i = 0; i < 90; i++) {
      const x = fr(hsh(i * 3.3) - c.scroll(0.004) / W) * W, y = hy * 0.92 * hsh(i * 7.7) ** 1.4
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(m.x * (0.6 + hsh(i)) + i))
      g.fillStyle = rgba(m.S, 0.25 + 0.5 * tw * hsh(i * 1.9))
      g.fillRect(x, y, 1.3 * k, 1.3 * k)
    }
    const mx = W * 0.78, my = hy * 0.3, mr = R * 0.05
    moon(g, mx, my, mr, '255,236,190', 0.9)
    g.fillStyle = hsla(m.hue, 40, 6)
    g.beginPath()
    g.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.92, 0, TAU)
    g.fill()
    halo(g, W * 0.5, hy, W * 0.55, m.A, 0.06 + 0.05 * m.energy)
    medina(g, c, m, { par: 0.06, slot: 40, seed: 3, base: hy + 4 * k, lo: hy * 0.05, hi: hy * 0.16, fill: hsla(m.hue, 30, 7), win: '255,200,120', winA: 0.45 })
    ridge(g, c, { par: 0.14, y: hy + (c.ground - hy) * 0.45, amp: (c.ground - hy) * 0.5, scale: 220, seed: 9, oct: 2, fill: hsla(m.hue + 6, 45, 11) })
    ridge(g, c, { par: 0.3, y: c.ground + 2 * k, amp: (c.ground - hy) * 0.4, scale: 300, seed: 13, oct: 2, fill: hsla(m.hue + 10, 50, 15) })
    onBeats(c, 4, (x, b) => lantern(g, x, c.ground, H * 0.04, m, 1, '255,190,100'))
  },

  // a temple night by the river: stars, a low full moon, shikharas on the far bank, the river with the moon's path and
  // floating lotuses, diyas along the near steps on the beats
  india(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    for (let i = 0; i < 70; i++) {
      const x = fr(hsh(i * 5.1) - c.scroll(0.004) / W) * W, y = hy * 0.85 * hsh(i * 9.3) ** 1.3
      g.fillStyle = rgba(m.S, 0.2 + 0.5 * hsh(i * 2.2) * (0.5 + 0.5 * Math.sin(m.x * 0.8 + i)))
      g.fillRect(x, y, 1.2 * k, 1.2 * k)
    }
    const mx = W * 0.3, my = hy * 0.45, mr = R * 0.06
    moon(g, mx, my, mr, '255,214,160', 1.2)
    halo(g, W * 0.5, hy, W * 0.6, m.A, 0.07 + 0.05 * m.energy)
    shikharas(g, c, m, { par: 0.06, slot: 60, seed: 4, base: hy + 3 * k, lo: hy * 0.12, hi: hy * 0.3, fill: hsla(m.hue, 30, 8) })
    const river = g.createLinearGradient(0, hy, 0, H)
    river.addColorStop(0, hsla(225, 35, 12))
    river.addColorStop(1, hsla(235, 40, 4))
    g.fillStyle = river
    g.fillRect(0, hy + 3 * k, W, H - hy)
    for (let j = 0; j < 22; j++) {
      const t = j / 22, y = hy + 4 * k + (c.ground - hy) * Math.pow(t, 1.4), w = mr * (0.6 + 1.6 * hsh(j * 5 + Math.floor(m.x * 2) * 2.3)) * (0.5 + t)
      g.fillStyle = rgba('255,214,160', 0.45 * (1 - t))
      g.fillRect(mx - w / 2, y, w, (1 + 2 * t) * k)
    }
    // lotuses drifting by
    slots(c, 0.2, 90, (x, i) => {
      if (hsh(i * 7.7) < 0.5) return
      const y = hy + (c.ground - hy) * (0.3 + 0.5 * hsh(i * 3.1)), s = 5 * k * (0.7 + 0.6 * hsh(i))
      g.fillStyle = rgba('255,170,200', 0.75)
      for (let p = -2; p <= 2; p++) { g.beginPath(); g.ellipse(x + p * 0.5 * s, y - Math.abs(p) * -0.2 * s, 0.35 * s, 0.9 * s, p * 0.45, 0, TAU); g.fill() }
      g.fillStyle = 'rgba(30,70,40,0.8)'
      g.beginPath(); g.ellipse(x, y + 0.6 * s, 1.8 * s, 0.4 * s, 0, 0, TAU); g.fill()
    })
    g.fillStyle = 'rgba(30,18,14,0.95)'
    g.fillRect(0, c.ground - 2 * k, W, H - c.ground + 2 * k)
    onBeats(c, 2, (x, b) => diya(g, x, c.ground, H * 0.03, m, 1, '255,170,70', b))
  },

  // Java at night: a volcano breathing smoke, a row of bell stupas (Borobudur), rice terraces stepping down, lamps
  java(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    for (let i = 0; i < 60; i++) {
      const x = fr(hsh(i * 4.1) - c.scroll(0.004) / W) * W, y = hy * 0.8 * hsh(i * 6.7) ** 1.3
      g.fillStyle = rgba(m.S, 0.2 + 0.45 * hsh(i * 2.9))
      g.fillRect(x, y, 1.2 * k, 1.2 * k)
    }
    moon(g, W * 0.72, hy * 0.28, R * 0.04, '230,240,255', 0.8)
    // the volcano: a cone with a glow in its crater on the gong cycles, smoke rising
    const vx = W * 0.32 - (c.scroll(0.02) % (W * 2)), vy = hy, vh = hy * 0.55, vw = W * 0.28
    for (const off of [0, W * 2]) {
      const x0 = vx + off
      g.fillStyle = hsla(m.hue, 25, 7)
      g.beginPath()
      g.moveTo(x0 - vw, vy)
      g.quadraticCurveTo(x0 - vw * 0.25, vy - vh * 0.6, x0 - vw * 0.08, vy - vh)
      g.lineTo(x0 + vw * 0.08, vy - vh)
      g.quadraticCurveTo(x0 + vw * 0.25, vy - vh * 0.6, x0 + vw, vy)
      g.fill()
      halo(g, x0, vy - vh, vw * 0.25, '255,120,60', 0.12 + 0.12 * m.down)
      for (let j = 0; j < 6; j++) {
        const u = fr(m.x / 16 + j / 6), sx = x0 + Math.sin(u * 3 + j) * vw * 0.12 * u, sy = vy - vh - u * hy * 0.35
        halo(g, sx, sy, vw * (0.05 + 0.12 * u), '200,200,210', 0.08 * (1 - u))
      }
    }
    // stupas on the horizon
    slots(c, 0.07, 30, (x, i, st) => {
      const s2 = st * 0.32, base = hy + 2 * k
      g.fillStyle = hsla(m.hue, 25, 9)
      g.beginPath()
      g.ellipse(x + st / 2, base - s2 * 0.2, s2 * 0.5, s2 * 0.75, 0, Math.PI, TAU)
      g.fill()
      g.fillRect(x + st / 2 - 0.7 * k, base - s2 * 1.25, 1.4 * k, s2 * 0.4)
      g.fillRect(x + st / 2 - s2 * 0.6, base - s2 * 0.22, s2 * 1.2, s2 * 0.22)
    })
    // rice terraces: stepped ridges, the water catching the light
    for (let j = 0; j < 4; j++) {
      ridge(g, c, { par: 0.12 + 0.07 * j, y: hy + (c.ground - hy) * (0.25 + 0.22 * j), amp: (c.ground - hy) * 0.12, scale: 260 + 40 * j, seed: 21 + j, oct: 2, quant: 6, fill: hsla(m.hue + 10, 40, 8 + 2 * j), line: rgba(m.B, 0.2 + 0.1 * m.down), lw: 0.8 })
    }
    onBeats(c, 4, (x, b) => diya(g, x, c.ground, H * 0.03, m, 1, '255,190,90', b))
  },

  // the west of Ireland: a dusk sky with drifting mist, a ruined tower on a far hill, green hills folding into each other,
  // standing stones on the beats
  celtic(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    halo(g, W * 0.65, hy * 0.85, W * 0.7, '255,190,140', 0.1 + 0.04 * m.energy)
    for (let i = 0; i < 40; i++) {
      const x = fr(hsh(i * 3.9) - c.scroll(0.005) / W) * W, y = hy * 0.6 * hsh(i * 8.1)
      g.fillStyle = rgba(m.S, 0.15 + 0.35 * hsh(i * 2.7))
      g.fillRect(x, y, 1.1 * k, 1.1 * k)
    }
    ridge(g, c, { par: 0.04, y: hy + 2 * k, amp: hy * 0.18, scale: 300, seed: 31, oct: 3, fill: hsla(150, 25, 9) })
    // the tower on the far hill
    const tx = W * 0.25 - (c.scroll(0.04) % (W * 1.6)), th = hy * 0.22
    for (const off of [0, W * 1.6]) {
      const x0 = tx + off, base = hy - hy * 0.1
      g.fillStyle = hsla(150, 20, 7)
      g.fillRect(x0, base - th, R * 0.03, th)
      for (let j = 0; j < 3; j++) g.fillRect(x0 + j * R * 0.012, base - th - R * 0.01, R * 0.007, R * 0.01)
    }
    ridge(g, c, { par: 0.12, y: hy + (c.ground - hy) * 0.45, amp: (c.ground - hy) * 0.45, scale: 240, seed: 37, oct: 3, fill: hsla(140, 35, 12) })
    ridge(g, c, { par: 0.25, y: c.ground + 2 * k, amp: (c.ground - hy) * 0.35, scale: 320, seed: 41, oct: 2, fill: hsla(135, 40, 16) })
    // mist drifting over the hills
    for (let j = 0; j < 4; j++) {
      const span = W * 1.8, x = ((hsh(j * 5.3) * span - c.scroll(0.08 + 0.03 * j)) % span + span) % span - W * 0.4
      halo(g, x, hy + (c.ground - hy) * (0.2 + 0.2 * j), W * 0.25, '220,235,230', 0.06)
    }
    onBeats(c, 4, (x, b) => menhir(g, x, c.ground, H * 0.03, m, 1, '140,230,170', b))
  },

  lofi(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    moon(g, W * 0.8, hy * 0.36, R * 0.045, '255,232,200')
    halo(g, W * 0.5, hy, W * 0.6, '255,150,90', 0.08 + 0.05 * m.energy)
    skyline(g, c, m, { par: 0.08, slot: 34, seed: 1, lo: hy * 0.08, hi: hy * 0.35, base: hy + 6 * k, fill: hsla(m.hue, 25, 9), win: '255,200,130', winA: 0.25 })
    skyline(g, c, m, { par: 0.22, slot: 52, seed: 2, lo: hy * 0.05, hi: hy * 0.28, base: hy + (c.ground - hy) * 0.35, fill: hsla(m.hue, 30, 5), win: '255,190,110', winA: 0.5 })
    rain(g, c, m, 0.1)
    onBeats(c, 4, (x, b) => lamp(g, x, c.ground, H * 0.045, m, 1, '255,190,110'))
  },

  chip(g, c, m) {
    const { W, H, k, hy } = c, P = Math.max(2, Math.round(4 * k))
    // pixel stars, blinking exactly on beats
    for (let i = 0; i < 46; i++) {
      if ((Math.floor(m.x) + i) % 3 === 0) continue
      g.fillStyle = rgba(i % 4 ? m.S : m.B, 0.7)
      g.fillRect(Math.round((hsh(i * 3.7) * W) / P) * P, Math.round((hsh(i * 8.1) * hy * 0.8) / P) * P, P, P)
    }
    // a pixel moon
    const mx = Math.round((W * 0.76) / P) * P, my = Math.round((hy * 0.32) / P) * P
    g.fillStyle = 'rgba(255,240,170,0.9)'
    for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (a * a + b * b <= 36 && (a + 2) * (a + 2) + (b - 2) * (b - 2) > 30) g.fillRect(mx + a * P, my + b * P, P, P)
    // pixel clouds: one pixel step every half beat
    const off = Math.floor(m.x * 2) * P
    for (let i = 0; i < 5; i++) {
      const span = W + 40 * P, x0 = Math.round(((((hsh(i * 5.1) * span - off) % span) + span) % span - 20 * P) / P) * P, y0 = Math.round((hy * (0.15 + 0.45 * hsh(i * 2.2))) / P) * P
      g.fillStyle = rgba(m.S, 0.13)
      for (const [a, b, w] of [[2, 0, 6], [0, 1, 12], [1, 2, 14], [4, -1, 4]]) g.fillRect(x0 + a * P, y0 + b * P, w * P, P)
    }
    ridge(g, c, { par: 0.06, y: hy, amp: hy * 0.45, scale: 160, seed: 3, oct: 3, quant: P * 2, fill: hsla(m.hue, 45, 13) })
    ridge(g, c, { par: 0.18, y: hy + (c.ground - hy) * 0.3, amp: hy * 0.3, scale: 110, seed: 4, oct: 3, quant: P * 2, fill: hsla(m.hue, 50, 7) })
    onBeats(c, 4, (x, b) => block(g, x, c.ground, H * 0.045, m, 1, '255,200,70', b))
  },

  bossa(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    // the sun goes down through the song, turning red
    const p = m.prog, sy = hy - hy * 0.42 * (1 - p) + R * 0.03 * p, r = R * 0.075
    const sun = `255,${Math.round(214 - 110 * p)},${Math.round(120 - 50 * p)}`
    halo(g, W * 0.6, sy, R * 0.7, sun, 0.2 + 0.08 * m.energy)
    g.save()
    g.beginPath()
    g.rect(0, 0, W, hy)
    g.clip()
    g.fillStyle = rgba(sun, 0.95)
    g.beginPath()
    g.arc(W * 0.6, sy, r, 0, TAU)
    g.fill()
    g.restore()
    ridge(g, c, { par: 0.04, y: hy + 1, amp: hy * 0.07, scale: 140, seed: 5, oct: 3, fill: hsla(m.hue, 40, 8), to: hy + 2 })
    const sea = g.createLinearGradient(0, hy, 0, H)
    sea.addColorStop(0, hsla(m.hue + 10, 45, 16))
    sea.addColorStop(1, hsla(195, 40, 5))
    g.fillStyle = sea
    g.fillRect(0, hy, W, H - hy)
    // the sun's path on the water: new glints every half beat
    for (let j = 0; j < 26; j++) {
      const t = j / 26, y = hy + (H - hy) * Math.pow(t, 1.5) + 2 * k, w = r * (0.4 + 1.6 * hsh(j * 7 + Math.floor(m.x * 2) * 3.1)) * (0.6 + 1.2 * t)
      g.fillStyle = rgba(sun, 0.55 * (1 - t) * (sy < hy + r ? 1 : 0.3))
      g.fillRect(W * 0.6 - w / 2, y, w, (1 + 2 * t) * k)
    }
    // swells: a crest every two beats
    g.strokeStyle = rgba(m.B, 0.13)
    g.lineWidth = k
    for (let j = 1; j < 10; j++) {
      const y0 = hy + (H - hy) * Math.pow(j / 10, 1.6), a = (2 + 8 * j / 10) * k
      g.beginPath()
      for (let x = 0; x <= W; x += 8 * k) g[x ? 'lineTo' : 'moveTo'](x, y0 + Math.sin(x / ((30 + 12 * j) * k) - m.x * Math.PI + j) * a)
      g.stroke()
    }
    onBeats(c, 8, (x, b) => palm(g, x, c.ground, H * 0.05, m, (b / 8) % 2 ? 1 : -1, hsla(m.hue, 40, 3, 0.95), b))
  },

  kawaii(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    halo(g, W * 0.2, hy * 0.4, R * 0.35, '255,170,220', 0.16)
    moon(g, W * 0.2, hy * 0.4, R * 0.05, '255,220,240', 0.8)
    slots(c, 0.05, 260, (sx, i) => {
      const y = hy * (0.15 + 0.5 * hsh(i * 2.1)), s = (14 + 10 * hsh(i)) * k
      g.fillStyle = 'rgba(255,225,245,0.07)'
      for (const [a, b, r] of [[0, 0, 1.4], [1.3, 0.2, 1.1], [-1.3, 0.25, 1], [0.6, -0.6, 1.1], [-0.5, -0.5, 0.9]]) {
        g.beginPath()
        g.arc(sx + a * s, y + b * s, r * s, 0, TAU)
        g.fill()
      }
    })
    ridge(g, c, { par: 0.07, y: hy, amp: hy * 0.2, scale: 220, seed: 6, oct: 2, fill: hsla(m.hue, 35, 15) })
    ridge(g, c, { par: 0.2, y: hy + (c.ground - hy) * 0.35, amp: hy * 0.15, scale: 180, seed: 7, oct: 2, fill: hsla(m.hue + 20, 40, 9) })
    // sparkles: four new ones on every beat
    g.globalCompositeOperation = 'lighter'
    const b0 = Math.floor(m.x)
    for (let i = 0; i < 4; i++) {
      const id = b0 * 4 + i, x = hsh(id * 1.3) * W, y = hsh(id * 2.9) * hy, s = (5 + 7 * hsh(id)) * k * m.pulse
      g.fillStyle = rgba(i % 2 ? m.A : m.B, 0.8)
      g.beginPath()
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU, rr = j % 2 ? s * 0.25 : s
        g[j ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      g.fill()
    }
    g.globalCompositeOperation = 'source-over'
    onBeats(c, 8, (x, b) => sakura(g, x, c.ground, H * 0.035, m, 1, '', b, 0.12))
    petals(g, c, m, 40, ['255,183,213', '255,232,242'], 1, 4)
  },

  classical(g, c, m) {
    const { W, H, k, hy } = c
    halo(g, W * 0.5, hy * 0.3, W * 0.55, m.A, 0.1 + 0.06 * m.down + 0.05 * m.energy)
    // tall arched windows of a hall
    slots(c, 0.1, 90, (sx, i, st) => {
      const w = 30 * k, x0 = sx + st / 2 - w / 2, top = hy * 0.25, bot = hy * 0.95
      const gr = g.createLinearGradient(0, top, 0, bot)
      gr.addColorStop(0, rgba(m.B, 0.1 + 0.05 * m.energy))
      gr.addColorStop(1, rgba(m.A, 0.03))
      g.fillStyle = gr
      g.beginPath()
      g.moveTo(x0, bot)
      g.lineTo(x0, top + w / 2)
      g.arc(x0 + w / 2, top + w / 2, w / 2, Math.PI, 0)
      g.lineTo(x0 + w, bot)
      g.fill()
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(x0 + w / 2 - k, top, 2 * k, bot - top)
      g.fillRect(x0, top + (bot - top) * 0.55, w, 2 * k)
    })
    // chandeliers with flickering candles
    slots(c, 0.1, 360, (sx, i, st) => {
      const cx = sx + st / 2, cy = hy * 0.12
      g.strokeStyle = rgba(m.A, 0.35)
      g.lineWidth = 1.2 * k
      g.beginPath()
      g.moveTo(cx, 0)
      g.lineTo(cx, cy)
      g.stroke()
      g.beginPath()
      g.ellipse(cx, cy + 6 * k, 34 * k, 8 * k, 0, 0, Math.PI)
      g.stroke()
      for (let j = -3; j <= 3; j++) candle(g, cx + j * 11 * k, cy + 6 * k + Math.sqrt(1 - (j / 3.1) ** 2) * 8 * k, 9 * k, m, m.B, i * 7 + j)
    })
    // the floor: marble lines coming one row nearer every beat
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue, 25, 7))
    fl.addColorStop(1, hsla(m.hue, 30, 3))
    g.fillStyle = fl
    g.fillRect(0, hy, W, H - hy)
    floorGrid(g, c, m, m.A, 0.08)
    onBeats(c, 4, x => column(g, x, c.ground, H * 0.045, m, 1, m.A))
  },

  gothic(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H) * 0.2, cx = W * 0.5, cy = hy * 0.5
    // the rose window: its light goes round once per bar, three panes a beat
    const lit = Math.floor(fr(m.x / 4) * 12), glass = [m.A, m.B, '110,150,255', '255,200,110']
    halo(g, cx, cy, R * 2.2, m.A, 0.08 + 0.08 * m.energy)
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU - Math.PI / 2, d = (j - lit + 12) % 12
      const glow = 0.1 + 0.18 * m.energy + 0.35 * Math.exp(-d * 1.2) * (0.4 + 0.6 * m.pulse)
      g.fillStyle = rgba(glass[j % 4], glow)
      g.beginPath()
      g.arc(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66, R * 0.25, 0, TAU)
      g.fill()
    }
    g.fillStyle = rgba(m.B, 0.15 + 0.2 * m.down)
    g.beginPath()
    g.arc(cx, cy, R * 0.3, 0, TAU)
    g.fill()
    g.strokeStyle = 'rgba(20,14,26,0.95)'
    g.lineWidth = 3 * k
    for (const rr of [1, 0.92, 0.3]) {
      g.beginPath()
      g.arc(cx, cy, R * rr, 0, TAU)
      g.stroke()
    }
    g.lineWidth = 2 * k
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * TAU - Math.PI / 2
      g.beginPath()
      g.arc(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66, R * 0.25, 0, TAU)
      g.stroke()
      g.beginPath()
      g.moveTo(cx + Math.cos(a + Math.PI / 12) * R * 0.3, cy + Math.sin(a + Math.PI / 12) * R * 0.3)
      g.lineTo(cx + Math.cos(a + Math.PI / 12) * R * 0.92, cy + Math.sin(a + Math.PI / 12) * R * 0.92)
      g.stroke()
    }
    // bats, two wingbeats a beat
    for (let i = 0; i < 5; i++) {
      const u = fr(m.x / 24 + hsh(i)), x = W * (1.1 - 1.25 * u), y = hy * (0.12 + 0.5 * hsh(i * 3)) + Math.sin(u * 22 + i) * 10 * k
      const f = Math.sin(m.x * TAU * 2 + i), s = 7 * k
      g.fillStyle = 'rgba(10,6,14,0.9)'
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x - s, y - s * f, x - 2 * s, y - s * 0.3 * f)
      g.quadraticCurveTo(x - s, y + s * 0.2, x, y + s * 0.3)
      g.quadraticCurveTo(x + s, y + s * 0.2, x + 2 * s, y - s * 0.3 * f)
      g.quadraticCurveTo(x + s, y - s * f, x, y)
      g.fill()
    }
    // an arcade of pointed arches moving with the music, a pillar on every bar line
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue, 30, 6))
    fl.addColorStop(1, hsla(m.hue, 30, 2))
    g.fillStyle = fl
    g.fillRect(0, hy + (c.ground - hy) * 0.6, W, H)
    onBeats(c, 4, (x, b) => {
      const x2 = c.at(b + 4), half = (x2 - x) / 2
      lancet(g, x + half, c.ground, H * 0.045, half, '70,56,92', 0.55)
      spire(g, x, c.ground, H * 0.045, m, 1, m.B)
    })
  },

  synth(g, c, m) {
    const { W, H, k, hy } = c, cx = W / 2, r = Math.min(W, H) * 0.22 * (1 + 0.025 * m.kick), cy = hy - r * 0.35
    halo(g, cx, hy, r * 2.6, '255,80,170', 0.22 + 0.15 * m.energy)
    // the sun: its stripes slide down one place every beat
    g.save()
    g.beginPath()
    g.rect(0, 0, W, hy)
    g.clip()
    g.beginPath()
    g.arc(cx, cy, r, 0, TAU)
    g.clip()
    const sg = g.createLinearGradient(0, cy - r, 0, cy + r)
    sg.addColorStop(0, '#ffe27a')
    sg.addColorStop(0.55, '#ff7a6b')
    sg.addColorStop(1, '#ff3fa4')
    g.fillStyle = sg
    g.beginPath()
    g.rect(cx - r, cy - r, 2 * r, 2 * r)
    for (let i = 0; i < 8; i++) {
      const u = (i + m.beat) / 8, y = cy - r * 0.05 + u * r * 1.05, h = (0.6 + u * 5.5) * k * (r / (110 * k))
      g.rect(cx - r, y, 2 * r, h)
    }
    g.fill('evenodd')
    g.restore()
    ridge(g, c, { par: 0.05, y: hy + 1, amp: hy * 0.17, scale: 120, seed: 8, oct: 3, peaks: true, fill: hsla(m.hue, 70, 5), line: rgba(m.A, 0.7), lw: 1.4, to: hy + 1 })
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue, 70, 8))
    fl.addColorStop(1, hsla(m.hue + 30, 60, 3))
    g.fillStyle = fl
    g.fillRect(0, hy, W, H - hy)
    g.globalCompositeOperation = 'lighter'
    floorGrid(g, c, m, m.A, 0.35 + 0.35 * m.kick, true)
    halo(g, cx, hy, W * 0.35, m.A, 0.1)
    g.globalCompositeOperation = 'source-over'
  },

  dnb(g, c, m) {
    const { W, H, k } = c, cx = W / 2, cy = H * 0.45
    g.globalCompositeOperation = 'lighter'
    // a neon tunnel: a new frame comes out of the centre on every beat
    const N = 12, b0 = Math.floor(m.x)
    for (let j = N - 1; j >= 0; j--) {
      const s = (j + m.beat) / N, w = W * 1.3 * s * s, h = w * 0.58, id = b0 - (N - 1 - j)
      const a = 4 * s * (1 - s) * (0.18 + 0.4 * m.kick + 0.15 * m.energy)
      g.save()
      g.translate(cx, cy)
      g.rotate(Math.sin(id * 0.7) * 0.08)
      g.strokeStyle = rgba(id % 2 ? m.A : m.B, a)
      g.lineWidth = (1 + 4 * s) * k
      g.strokeRect(-w / 2, -h / 2, w, h)
      g.restore()
    }
    // lasers, swinging over each bar
    const ph = fr(m.x / 4)
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.35 + Math.sin(ph * TAU + i) * 0.25, L = H * 1.4
      const gr = g.createLinearGradient(cx, H, cx + Math.cos(a) * L, H + Math.sin(a) * L)
      gr.addColorStop(0, rgba(i % 2 ? m.B : m.A, 0.18 + 0.25 * m.down))
      gr.addColorStop(1, rgba(i % 2 ? m.B : m.A, 0))
      g.strokeStyle = gr
      g.lineWidth = 2 * k
      g.beginPath()
      g.moveTo(cx, H)
      g.lineTo(cx + Math.cos(a) * L, H + Math.sin(a) * L)
      g.stroke()
    }
    halo(g, cx, cy, Math.min(W, H) * 0.25, m.A, 0.08 + 0.12 * m.kick)
    g.globalCompositeOperation = 'source-over'
  },

  phonk(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    halo(g, W * 0.28, hy * 0.42, R * 0.4, m.A, 0.15 + 0.1 * m.kick)
    moon(g, W * 0.28, hy * 0.42, R * 0.07, '255,90,90', 1)
    skyline(g, c, m, { par: 0.06, slot: 40, seed: 9, lo: hy * 0.1, hi: hy * 0.4, base: hy + 2 * k, fill: hsla(m.hue, 40, 5), win: m.A, winA: 0.3 })
    // the road: one dash comes at you every beat
    const rd = g.createLinearGradient(0, hy, 0, H)
    rd.addColorStop(0, hsla(m.hue, 30, 5))
    rd.addColorStop(1, hsla(m.hue, 20, 2))
    g.fillStyle = rd
    g.fillRect(0, hy, W, H - hy)
    const cx = W * 0.5
    g.strokeStyle = rgba(m.A, 0.35)
    g.lineWidth = 1.5 * k
    for (const d of [-1, 1]) {
      g.beginPath()
      g.moveTo(cx + d * 6 * k, hy)
      g.lineTo(cx + d * W * 0.6, H)
      g.stroke()
    }
    const N = 8
    for (let j = 0; j < N; j++) {
      const d = (j + m.beat) / N, d2 = Math.min(1, d + 0.45 / N), y1 = hy + (H - hy) * d * d, y2 = hy + (H - hy) * d2 * d2
      g.fillStyle = rgba('255,220,150', 0.55 * d)
      g.beginPath()
      g.moveTo(cx - (1 + 7 * d) * k, y1)
      g.lineTo(cx + (1 + 7 * d) * k, y1)
      g.lineTo(cx + (1 + 7 * d2) * k, y2)
      g.lineTo(cx - (1 + 7 * d2) * k, y2)
      g.fill()
    }
    // tyre smoke on the kick
    for (let i = 0; i < 6; i++) halo(g, W * (0.1 + 0.16 * i) + Math.sin(m.x + i) * 20 * k, H * 0.95, R * (0.15 + 0.1 * hsh(i)), '180,170,180', 0.04 + 0.1 * m.kick)
    onBeats(c, 4, (x, b) => lamp(g, x, c.ground, H * 0.045, m, -1, '255,120,60'))
  },

  meow(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    moon(g, W * 0.72, hy * 0.4, R * 0.075, '255,240,215')
    // rooftops, some with a cat; tails swing once per two beats
    slots(c, 0.15, 70, (sx, i, st) => {
      const w = st * (0.75 + 0.2 * hsh(i * 1.9)), h = hy * (0.12 + 0.2 * hsh(i * 4.1)), x0 = sx + (st - w) / 2, y0 = hy + (c.ground - hy) * 0.2 - h
      const col = hsla(m.hue, 25, 2.5)
      g.fillStyle = col
      g.fillRect(x0, y0, w, H - y0)
      g.beginPath()
      g.moveTo(x0 - 4 * k, y0)
      g.lineTo(x0 + w / 2, y0 - w * 0.35)
      g.lineTo(x0 + w + 4 * k, y0)
      g.fill()
      g.strokeStyle = 'rgba(255,240,215,0.14)'
      g.lineWidth = k
      g.stroke()
      if (hsh(i * 2.7) < 0.4) g.fillRect(x0 + w * 0.7, y0 - w * 0.3, 6 * k, w * 0.25)
      if (hsh(i * 6.1 + Math.floor(m.x / 8)) < 0.5) {
        g.fillStyle = 'rgba(255,200,120,0.45)'
        g.fillRect(x0 + w * 0.4, y0 + h * 0.3, 8 * k, 10 * k)
      }
      if (hsh(i * 3.3) < 0.35) cat(g, x0 + w / 2, y0 - w * 0.35 + 2 * k, 11 * k, col, Math.sin(m.x * Math.PI + i))
    })
    // a fence: a post on every beat, a cat on some bars
    if (c.at) {
      const y = c.ground - H * 0.06
      g.fillStyle = 'rgba(12,8,14,0.85)'
      g.fillRect(0, y, W, 3 * k)
      g.fillRect(0, y + H * 0.03, W, 3 * k)
    }
    onBeats(c, 1, (x, b) => {
      g.fillStyle = 'rgba(12,8,14,0.9)'
      g.fillRect(x - 3 * k, c.ground - H * 0.08, 6 * k, H * 0.08)
      if (b % 16 === 0 && hsh(b * 0.37) < 0.7) cat(g, x, c.ground - H * 0.08, H * 0.03, 'rgba(12,8,14,0.95)', Math.sin(m.x * Math.PI + b))
    })
  },

  ink(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H)
    // the vermilion sun, breathing on the downbeat
    halo(g, W * 0.7, hy * 0.4, R * (0.3 + 0.05 * m.down), m.A, 0.18 + 0.1 * m.down)
    g.fillStyle = rgba(m.A, 0.85)
    g.beginPath()
    g.arc(W * 0.7, hy * 0.4, R * 0.075, 0, TAU)
    g.fill()
    // ink mountains in three washes, mist between them
    const mist = y => {
      const gr = g.createLinearGradient(0, y - hy * 0.12, 0, y + hy * 0.06)
      gr.addColorStop(0, rgba(m.S, 0))
      gr.addColorStop(1, rgba(m.S, 0.045))
      g.fillStyle = gr
      g.fillRect(0, y - hy * 0.12, W, hy * 0.18)
    }
    ridge(g, c, { par: 0.02, y: hy, amp: hy * 0.55, scale: 150, seed: 10, peaks: true, fill: hsla(m.hue, 16, 8.5) })
    mist(hy)
    ridge(g, c, { par: 0.06, y: hy + (c.ground - hy) * 0.15, amp: hy * 0.38, scale: 110, seed: 11, peaks: true, fill: hsla(m.hue, 18, 5.5) })
    mist(hy + (c.ground - hy) * 0.15)
    ridge(g, c, { par: 0.15, y: hy + (c.ground - hy) * 0.45, amp: hy * 0.2, scale: 80, seed: 12, fill: hsla(m.hue, 20, 2.5) })
    // lightning when a section begins
    if (m.flash > 0.03) {
      const s = m.sec * 7.1
      let x = W * (0.2 + 0.6 * hsh(s)), y = 0
      g.strokeStyle = rgba('255,240,235', 0.9 * m.flash)
      g.lineWidth = 2 * k
      g.beginPath()
      g.moveTo(x, y)
      for (let j = 0; y < hy * 0.9; j++) (x += (hsh(s + j) - 0.5) * 40 * k), (y += (10 + 20 * hsh(s * 2 + j)) * k), g.lineTo(x, y)
      g.stroke()
      g.fillStyle = rgba('255,240,235', 0.12 * m.flash)
      g.fillRect(0, 0, W, H)
    }
    onBeats(c, 16, x => torii(g, x, c.ground, H * 0.045, H * 0.07, m.A, 0.6))
    petals(g, c, m, 28, [m.A, '255,235,225'], 2, 3.5)
  },

  romantic(g, c, m) {
    const { W, H, k, hy } = c, R = Math.min(W, H), mx = W * 0.25, my = hy * 0.38
    moon(g, mx, my, R * 0.055, '255,240,225')
    ridge(g, c, { par: 0.04, y: hy, amp: hy * 0.22, scale: 200, seed: 13, oct: 3, fill: hsla(m.hue, 25, 3), line: 'rgba(255,240,225,0.12)', to: hy + 2 })
    // a castle on the hills
    const span = W * 1.6, cx = W * 1.25 - ((c.scroll(0.04) + W * 0.5) % span), cb = hy - hy * 0.12
    g.fillStyle = hsla(m.hue, 25, 3)
    for (const [dx, w, h] of [[-30, 10, 52], [-14, 30, 34], [16, 9, 60], [28, 12, 40]]) {
      g.fillRect(cx + dx * k, cb - h * k, w * k, h * k)
      g.beginPath()
      g.moveTo(cx + (dx - 2) * k, cb - h * k)
      g.lineTo(cx + (dx + w / 2) * k, cb - (h + w * 1.3) * k)
      g.lineTo(cx + (dx + w + 2) * k, cb - h * k)
      g.fill()
    }
    g.fillStyle = 'rgba(255,210,150,0.5)'
    g.fillRect(cx + 19 * k, cb - 44 * k, 3 * k, 5 * k)
    // the lake and the moon's path on it
    const lake = g.createLinearGradient(0, hy, 0, H)
    lake.addColorStop(0, hsla(m.hue, 30, 9))
    lake.addColorStop(1, hsla(m.hue, 30, 3))
    g.fillStyle = lake
    g.fillRect(0, hy, W, H - hy)
    for (let j = 0; j < 22; j++) {
      const t = j / 22, y = hy + (H - hy) * Math.pow(t, 1.4) + 2 * k, w = R * 0.05 * (0.3 + 1.4 * hsh(j * 5 + Math.floor(m.x * 2) * 2.3)) * (0.6 + t)
      g.fillStyle = rgba('255,240,225', 0.4 * (1 - t))
      g.fillRect(mx - w / 2, y, w, (1 + t) * k)
    }
    // fireflies: half flash on the beat, half on the off-beat
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 18; i++) {
      const off = i % 2 ? 0.5 : 0, f = Math.exp(-5 * fr(m.x - off))
      const x = fbm(m.x * 0.05 + i * 3.3, 20) * W * 1.6 - W * 0.3, y = hy * 0.7 + fbm(m.x * 0.05 + i * 7.1, 21) * (c.ground - hy * 0.7)
      halo(g, x, y, (4 + 8 * f) * k, '220,255,150', 0.15 + 0.6 * f)
    }
    g.globalCompositeOperation = 'source-over'
    onBeats(c, 8, (x, b) => lamp(g, x, c.ground, H * 0.04, m, 1, '255,220,170'))
    petals(g, c, m, 22, ['232,100,130', '246,190,200'], 3, 3.5)
  },

  jazz(g, c, m) {
    const { W, H, k, hy } = c
    // bokeh city lights; some swell on the swung off-beat
    g.globalCompositeOperation = 'lighter'
    slots(c, 0.03, 80, (sx, i) => {
      const y = hy * (0.1 + 0.9 * hsh(i * 2.3)), r = (10 + 30 * hsh(i * 1.7)) * k, off = hsh(i * 9.1) < 0.5 ? 0 : 2 / 3
      const f = Math.exp(-4 * fr(m.x - off))
      halo(g, sx, y, r, [m.A, m.B, '255,200,140'][((i % 3) + 3) % 3], 0.06 + 0.1 * f * m.energy)
    })
    // spotlights sweeping over two bars
    for (const [x0, d] of [[W * 0.15, 1], [W * 0.85, -1]]) {
      const a = Math.PI / 2 + d * (0.35 + Math.sin((m.x * TAU) / 8) * 0.3), L = H * 1.3, sp = 0.12
      const gr = g.createLinearGradient(x0, 0, x0 + Math.cos(a) * L, Math.sin(a) * L)
      gr.addColorStop(0, rgba('220,230,255', 0.12 + 0.08 * m.energy))
      gr.addColorStop(1, rgba('220,230,255', 0))
      g.fillStyle = gr
      g.beginPath()
      g.moveTo(x0, 0)
      g.lineTo(x0 + Math.cos(a - sp) * L, Math.sin(a - sp) * L)
      g.lineTo(x0 + Math.cos(a + sp) * L, Math.sin(a + sp) * L)
      g.fill()
    }
    g.globalCompositeOperation = 'source-over'
    // smoke drifting
    for (let j = 0; j < 4; j++) {
      g.fillStyle = 'rgba(200,210,240,0.025)'
      g.beginPath()
      g.moveTo(0, H)
      for (let x = 0; x <= W; x += 12 * k) g.lineTo(x, hy * (0.5 + 0.3 * j) - fbm(x / (200 * k) + m.x * 0.03 + j * 5, 30 + j) * hy * 0.4)
      g.lineTo(W, H)
      g.fill()
    }
    skyline(g, c, m, { par: 0.12, slot: 46, seed: 14, lo: hy * 0.08, hi: hy * 0.32, base: hy + (c.ground - hy) * 0.3, fill: hsla(m.hue, 35, 5), win: '255,205,130', winA: 0.4 })
    onBeats(c, 4, x => lamp(g, x, c.ground, H * 0.045, m, 1, '255,200,120'))
  },

  // ---- the factory: smokestacks against a sodium dusk, gears turning a tooth a beat, a conveyor whose crates step one
  // place a beat, sparks from a welder on the kick, warning lights blinking on the bars
  factory(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(m.hue + 10, 35, 7)); sky.addColorStop(0.7, hsla(m.hue + 25, 55, 16)); sky.addColorStop(1, hsla(m.hue + 35, 70, 26))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    halo(g, W * 0.72, hy, W * 0.45, '255,150,60', 0.12 + 0.06 * m.energy)
    // smoke drifting from the stacks
    slots(c, 0.04, 140, (sx, i, st) => {
      const x = sx + st * 0.5, top = hy - (60 + 70 * hsh(i * 3.3)) * k
      g.fillStyle = hsla(m.hue + 15, 20, 9); g.fillRect(x - 6 * k, top, 12 * k, hy - top)
      g.fillStyle = 'rgba(255,90,60,' + (0.5 + 0.5 * (Math.floor(m.x / 2 + i) % 2)) + ')'; g.fillRect(x - 2 * k, top + 4 * k, 4 * k, 3 * k)
      for (let j = 0; j < 7; j++) {
        const u = fr(m.time * 0.05 + j / 7 + hsh(i)), r = (6 + 26 * u) * k
        g.fillStyle = `rgba(140,130,125,${0.16 * (1 - u)})`
        g.beginPath(); g.arc(x + 40 * u * k + Math.sin(u * 6 + i) * 6 * k, top - 90 * u * k, r, 0, TAU); g.fill()
      }
    })
    // the hall: a sawtooth roof line
    ridge(g, c, { par: 0.08, y: hy, amp: 0, scale: 100, seed: 3, quant: 26, fill: hsla(m.hue + 20, 20, 6), to: H })
    slots(c, 0.08, 52, (sx, i, st) => {
      g.fillStyle = hsla(m.hue + 20, 20, 6)
      g.beginPath(); g.moveTo(sx, hy); g.lineTo(sx + st * 0.75, hy - 26 * k); g.lineTo(sx + st * 0.75, hy); g.closePath(); g.fill()
      g.fillStyle = `rgba(255,200,120,${0.18 + 0.25 * m.energy * hsh(i * 2.1 + Math.floor(m.x / 8))})`
      g.fillRect(sx + st * 0.55, hy - 18 * k, st * 0.16, 16 * k)
    })
    // gears turning a tooth each beat
    for (const [gx, gy, r, n, dir] of [[W * 0.18, hy * 0.62, 46, 12, 1], [W * 0.18 + 75 * k, hy * 0.62 + 30 * k, 30, 8, -1]]) {
      const a = dir * ((Math.floor(m.x) + (1 - Math.exp(-8 * m.beat))) / n) * TAU
      g.save(); g.translate(gx, gy); g.rotate(a)
      g.fillStyle = hsla(m.hue + 20, 15, 12); g.strokeStyle = rgba(m.A, 0.35); g.lineWidth = 1.2 * k
      g.beginPath()
      for (let t = 0; t < n; t++) for (const [u, rr] of [[0, 1], [0.15, 1], [0.25, 0.8], [0.75, 0.8], [0.85, 1]]) { const ang = ((t + u) / n) * TAU; g.lineTo(Math.cos(ang) * rr * r * k, Math.sin(ang) * rr * r * k) }
      g.closePath(); g.fill(); g.stroke()
      g.fillStyle = hsla(m.hue, 30, 4); g.beginPath(); g.arc(0, 0, r * 0.25 * k, 0, TAU); g.fill()
      g.restore()
    }
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue + 20, 25, 8)); fl.addColorStop(1, hsla(m.hue + 20, 25, 3))
    g.fillStyle = fl; g.fillRect(0, hy, W, H - hy)
    // the conveyor: rollers and crates stepping one place a beat
    const by = hy + (c.ground - hy) * 0.45
    g.fillStyle = hsla(m.hue + 20, 15, 14); g.fillRect(0, by, W, 6 * k)
    const step = 40 * k, shift = (Math.floor(m.x) + (1 - Math.exp(-10 * m.beat))) * step - c.scroll(0.5)
    for (let i = -2; i < W / step + 2; i++) {
      const x = i * step + (((shift % step) + step) % step)
      g.fillStyle = hsla(m.hue + 20, 10, 22); g.beginPath(); g.arc(x, by + 8 * k, 3 * k, 0, TAU); g.fill()
      if (hsh(Math.floor(i - shift / step) * 3.7) < 0.55) {
        g.fillStyle = hsla(m.hue + 30, 45, 18); g.fillRect(x - 13 * k, by - 22 * k, 26 * k, 22 * k)
        g.strokeStyle = rgba(m.A, 0.3); g.strokeRect(x - 13 * k, by - 22 * k, 26 * k, 22 * k)
      }
    }
    // sparks on the kick
    g.globalCompositeOperation = 'lighter'
    const sxp = W * 0.62, syp = by - 26 * k
    for (let i = 0; i < 24; i++) {
      const a = -Math.PI * (0.1 + 0.8 * hsh(i * 1.3)), v = (40 + 80 * hsh(i * 2.7)) * k * (1 - m.kick)
      g.fillStyle = `rgba(255,${180 + 60 * hsh(i)},90,${0.8 * m.kick})`
      g.fillRect(sxp + Math.cos(a) * v, syp + Math.sin(a) * v + 30 * k * (1 - m.kick) ** 2, 2 * k, 2 * k)
    }
    halo(g, sxp, syp, 40 * k, '255,200,120', 0.4 * m.kick)
    g.globalCompositeOperation = 'source-over'
    onBeats(c, 4, x => {
      g.fillStyle = hsla(m.hue + 20, 15, 10); g.fillRect(x - 3 * k, c.ground - 70 * k, 6 * k, 70 * k)
      const on = Math.floor(m.x) % 2 === 0
      halo(g, x, c.ground - 72 * k, 18 * k, '255,120,40', on ? 0.5 : 0.1)
    })
  },

  // ---- Brinstar's jungle: a cave of glowing roots, bioluminescent bulbs pulsing on the beats, spores rising, bubbles,
  // hanging vines swaying with the bar
  jungle(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(170, 50, 4)); sky.addColorStop(1, hsla(150, 55, 12))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    // the cave's ceiling, roots hanging
    ridge(g, c, { par: 0.03, y: hy * 0.18, amp: -hy * 0.14, scale: 90, seed: 41, fill: hsla(160, 40, 5), to: 0 })
    slots(c, 0.06, 38, (sx, i) => {
      const len = (40 + 120 * hsh(i * 2.3)) * k, sway = Math.sin(TAU * (m.x / 4) + i) * 6 * k
      g.strokeStyle = hsla(150, 35, 10); g.lineWidth = (2 + 2 * hsh(i)) * k
      g.beginPath(); g.moveTo(sx, 0); g.quadraticCurveTo(sx + sway, len * 0.5, sx + sway * 1.6, len); g.stroke()
      if (hsh(i * 5.1) < 0.4) halo(g, sx + sway * 1.6, len, 9 * k, '120,255,200', 0.3 + 0.4 * m.pulse * hsh(i))
    })
    // far mountains of moss, then the glowing plants
    ridge(g, c, { par: 0.07, y: hy, amp: hy * 0.25, scale: 70, seed: 42, fill: hsla(165, 45, 7), to: H })
    g.globalCompositeOperation = 'lighter'
    slots(c, 0.12, 70, (sx, i) => {
      const x = sx + 20 * hsh(i) * k, h = (30 + 60 * hsh(i * 1.7)) * k, base = hy + 8 * k
      g.strokeStyle = 'rgba(80,220,170,0.35)'; g.lineWidth = 2 * k
      g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x - 8 * k, base - h * 0.6, x + 4 * k * Math.sin(m.x + i), base - h); g.stroke()
      const glow = 0.25 + 0.5 * (Math.floor(m.x) % 4 === i % 4 ? m.pulse : 0.15) + 0.2 * m.energy
      const col = i % 3 ? '90,255,190' : '255,120,220'
      halo(g, x + 4 * k * Math.sin(m.x + i), base - h, (10 + 8 * m.kick) * k, col, glow)
      g.fillStyle = rgba(col, 0.9); g.beginPath(); g.arc(x + 4 * k * Math.sin(m.x + i), base - h, 3 * k, 0, TAU); g.fill()
    })
    // spores rising, bubbles wobbling up
    for (let i = 0; i < 60; i++) {
      const u = fr(m.time * (0.03 + 0.04 * hsh(i)) + hsh(i * 3.1)), x = fr(hsh(i * 7.3) + Math.sin(u * 5 + i) * 0.02) * W, y = H - u * H * 1.1
      g.fillStyle = `rgba(160,255,210,${0.35 * Math.sin(Math.PI * u)})`
      g.fillRect(x, y, 1.6 * k, 1.6 * k)
    }
    for (let i = 0; i < 9; i++) {
      const u = fr(m.x / 8 + hsh(i * 2.9)), x = W * hsh(i * 4.4) + Math.sin(u * 14 + i) * 8 * k, y = H - u * (H - hy * 0.6)
      g.strokeStyle = `rgba(150,255,230,${0.5 * (1 - u)})`; g.lineWidth = 1.2 * k
      g.beginPath(); g.arc(x, y, (3 + 5 * hsh(i)) * k, 0, TAU); g.stroke()
    }
    g.globalCompositeOperation = 'source-over'
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(165, 50, 7)); fl.addColorStop(1, hsla(170, 50, 2))
    g.fillStyle = fl; g.fillRect(0, hy + (c.ground - hy) * 0.55, W, H)
    onBeats(c, 4, (x, b) => mushroom(g, x, c.ground, H * 0.03, m, 1, hsh(b) < 0.5 ? '90,255,190' : '255,120,220', b))
  },

  // ---- the cathedral: a nave seen down its length — piers and rib vaults receding, the organ's pipes at the end lit
  // pipe by pipe as the music moves, light falling through the clerestory, candles on the kick
  cathedral(g, c, m) {
    const { W, H, k, hy } = c, cx = W / 2
    g.fillStyle = hsla(m.hue, 25, 4); g.fillRect(0, 0, W, H)
    // the organ case and its pipes: a flat of 21, the tallest in the middle; three lit a beat, round the bar
    const pw = Math.min(W * 0.022, 16 * k), n = 21, top = hy * 0.18, base = hy * 0.95
    g.fillStyle = 'rgba(34,20,12,0.96)'; g.fillRect(cx - (n / 2 + 1.5) * pw * 1.15, top - 20 * k, (n + 3) * pw * 1.15, base - top + 30 * k)
    const lit = Math.floor(fr(m.x / 4) * n)
    for (let j = 0; j < n; j++) {
      const d = Math.abs(j - (n - 1) / 2), h = (base - top) * (1 - 0.55 * (d / (n / 2)) ** 1.4), x = cx + (j - (n - 1) / 2) * pw * 1.15
      const glow = Math.exp(-Math.abs(j - lit) * 0.9) * (0.4 + 0.6 * m.pulse) + 0.15 * m.energy
      const gr = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0)
      gr.addColorStop(0, 'rgba(120,100,70,0.9)'); gr.addColorStop(0.45, `rgba(${230 + 25 * glow},${200 + 40 * glow},${140 + 60 * glow},0.95)`); gr.addColorStop(1, 'rgba(90,70,50,0.9)')
      g.fillStyle = gr; g.fillRect(x - pw / 2, base - h, pw, h)
      g.fillStyle = 'rgba(20,12,8,0.9)'; g.beginPath(); g.ellipse(x, base - h * 0.12, pw * 0.32, pw * 0.18, 0, 0, TAU); g.fill() // the mouth
      if (glow > 0.3) halo(g, x, base - h, pw * 3, m.B, 0.15 * glow)
    }
    // the clerestory's light: shafts falling slant, brighter with the energy
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x0 = W * (0.1 + 0.16 * i), a = 0.04 + 0.05 * m.energy + 0.03 * Math.sin(m.x * 0.25 + i)
      const gr = g.createLinearGradient(x0, 0, x0 + W * 0.12, H)
      gr.addColorStop(0, `rgba(255,230,180,${a})`); gr.addColorStop(1, 'rgba(255,230,180,0)')
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 14 * k, 0); g.lineTo(x0 + W * 0.14, H); g.lineTo(x0 + W * 0.1, H); g.closePath(); g.fill()
    }
    // dust in the light
    for (let i = 0; i < 40; i++) {
      const u = fr(m.time * 0.02 * (0.5 + hsh(i)) + hsh(i * 2.2)), x = W * hsh(i * 9.1) + Math.sin(u * 7 + i) * 10 * k, y = H * u
      g.fillStyle = `rgba(255,236,200,${0.25 * Math.sin(Math.PI * u)})`; g.fillRect(x, y, 1.5 * k, 1.5 * k)
    }
    g.globalCompositeOperation = 'source-over'
    // the nave's piers and ribs, receding toward the organ
    for (let j = 6; j >= 1; j--) {
      const s = 1 / (0.35 + j * 0.28), half = W * 0.5 * s, y0 = hy + (H - hy) * 0.3 * s, ht = H * 0.9 * s
      g.strokeStyle = `rgba(40,30,44,${0.6 + 0.06 * (6 - j)})`; g.lineWidth = (3 + 5 * s) * k
      g.beginPath(); g.moveTo(cx - half, y0); g.lineTo(cx - half, y0 - ht * 0.55); g.quadraticCurveTo(cx - half * 0.3, y0 - ht * 1.05, cx, y0 - ht); g.quadraticCurveTo(cx + half * 0.3, y0 - ht * 1.05, cx + half, y0 - ht * 0.55); g.lineTo(cx + half, y0); g.stroke()
    }
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue + 10, 20, 7)); fl.addColorStop(1, hsla(m.hue, 20, 2))
    g.fillStyle = fl; g.fillRect(0, hy + (c.ground - hy) * 0.6, W, H)
    onBeats(c, 4, (x, b) => candle(g, x, c.ground, H * 0.03, m, m.B, b))
  },

  // ---- the arena: a stadium at night — tiers of a crowd whose lit phones sway with the bar, floodlight towers, beams
  // sweeping across the haze, a flash on every kick
  arena(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(m.hue, 40, 4)); sky.addColorStop(1, hsla(m.hue, 45, 11))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    // beams from the towers, crossing in time
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x0 = W * (i < 3 ? 0.06 + 0.05 * i : 0.94 - 0.05 * (i - 3)), y0 = hy * 0.12, a = Math.PI / 2 + (i < 3 ? -1 : 1) * (0.55 + 0.35 * Math.sin(TAU * (m.x / 8) + i))
      const L = H * 1.6, w = 0.045 + 0.02 * m.kick
      const gr = g.createRadialGradient(x0, y0, 0, x0, y0, L)
      gr.addColorStop(0, rgba(i % 2 ? m.A : m.B, 0.3 + 0.2 * m.energy + 0.3 * m.kick)); gr.addColorStop(1, rgba(i % 2 ? m.A : m.B, 0))
      g.fillStyle = gr
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a - w) * L, y0 + Math.sin(a - w) * L); g.lineTo(x0 + Math.cos(a + w) * L, y0 + Math.sin(a + w) * L); g.closePath(); g.fill()
      halo(g, x0, y0, 30 * k, '255,255,240', 0.5)
    }
    g.globalCompositeOperation = 'source-over'
    for (const x0 of [W * 0.06, W * 0.11, W * 0.16, W * 0.84, W * 0.89, W * 0.94]) { g.fillStyle = 'rgba(20,20,28,0.95)'; g.fillRect(x0 - 2 * k, hy * 0.12, 4 * k, hy) }
    // the tiers: rows of heads, phones lit and swaying
    for (let row = 0; row < 5; row++) {
      const y = hy * (0.5 + 0.1 * row), sz = (2.5 + 0.8 * row) * k
      g.fillStyle = hsla(m.hue, 30, 13 + 3 * row + 6 * m.kick); g.fillRect(0, y - sz * 2, W, hy * 0.1 + 2)
      slots(c, 0.05 + 0.03 * row, 9 + 3 * row, (sx, i) => {
        const bob = Math.abs(Math.sin(TAU * (m.x / 2) + i * 0.7)) * 3 * k * m.energy
        g.fillStyle = hsla(m.hue, 30, 3); g.beginPath(); g.arc(sx, y - bob, sz, 0, TAU); g.fill(); g.fillRect(sx - sz, y - bob, 2 * sz, sz * 2)
        if (hsh(i * 1.9 + row) < 0.3) { const ph = sx + Math.sin(TAU * m.x / 4 + i) * 4 * k; g.fillStyle = 'rgba(230,240,255,0.9)'; g.fillRect(ph, y - bob - sz * 3, 1.5 * k, 2.5 * k); halo(g, ph, y - bob - sz * 3, 6 * k, '200,220,255', 0.3) }
      })
    }
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(m.hue, 30, 9)); fl.addColorStop(1, hsla(m.hue, 30, 3))
    g.fillStyle = fl; g.fillRect(0, hy, W, H - hy)
    halo(g, W / 2, hy + (H - hy) * 0.5, W * 0.5, '255,255,255', 0.05 + 0.25 * m.kick)
    onBeats(c, 4, x => floodlight(g, x, c.ground, H * 0.03, m, 1, m.B))
  },

  // ---- the north: snow peaks under an aurora rippling with the bars, pines on the slopes, snow falling and swirling
  snow(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(225, 45, 5)); sky.addColorStop(1, hsla(205, 40, 14))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(230,240,255,${0.3 + 0.4 * hsh(i * 3.3)})`; g.fillRect(hsh(i * 7.1) * W, hsh(i * 1.9) * hy * 0.7, 1.2 * k, 1.2 * k) }
    // the aurora: curtains of light, their folds travelling a bar at a time
    g.globalCompositeOperation = 'lighter'
    for (let band = 0; band < 3; band++) {
      const col = band === 1 ? '140,120,255' : '90,255,170'
      for (let x = 0; x < W; x += 3 * k) {
        const u = x / W, y = hy * (0.18 + 0.08 * band + 0.08 * Math.sin(u * 5 + m.x * 0.4 + band) + 0.04 * Math.sin(u * 13 - m.x * 0.9))
        const h = hy * (0.18 + 0.12 * fbm(u * 3 + m.x * 0.05, band * 7)), a = (0.05 + 0.07 * m.energy + 0.06 * m.down) * (0.5 + 0.5 * Math.sin(u * 9 + m.x * 0.3 + band))
        const gr = g.createLinearGradient(0, y, 0, y + h)
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.2, rgba(col, a)); gr.addColorStop(1, rgba(col, 0))
        g.fillStyle = gr; g.fillRect(x, y, 3 * k, h)
      }
    }
    g.globalCompositeOperation = 'source-over'
    ridge(g, c, { par: 0.03, y: hy, amp: hy * 0.45, scale: 160, seed: 61, peaks: true, oct: 3, fill: hsla(215, 25, 22), line: 'rgba(240,248,255,0.7)', lw: 1.6, to: H })
    ridge(g, c, { par: 0.06, y: hy + 4 * k, amp: hy * 0.25, scale: 110, seed: 62, peaks: true, oct: 3, fill: hsla(215, 25, 12), to: H })
    slots(c, 0.1, 22, (sx, i) => { if (hsh(i * 2.2) < 0.6) pineAt(g, sx, hy + 10 * k + 10 * k * hsh(i), (8 + 10 * hsh(i * 3.1)) * k, hsla(200, 30, 7)) })
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(210, 25, 16)); fl.addColorStop(1, hsla(215, 30, 6))
    g.fillStyle = fl; g.fillRect(0, hy + 20 * k, W, H)
    for (let i = 0; i < 110; i++) {
      const sp = 0.4 + hsh(i * 0.37), y = fr(m.time * 0.05 * sp + hsh(i * 5.5)) * H, x = fr(hsh(i * 2.9) + Math.sin(m.time * 0.3 * sp + i) * 0.01 - m.x * 0.002) * W
      g.fillStyle = `rgba(245,250,255,${0.35 + 0.4 * sp / 1.4})`; g.beginPath(); g.arc(x, y, (0.8 + 1.4 * sp) * k, 0, TAU); g.fill()
    }
    onBeats(c, 4, (x, b) => pine(g, x, c.ground, H * 0.035, m, 1, '220,240,255', b))
  },

  // ---- Error XP: a green hill under a blue sky with drifting clouds — and error dialogs cascading down it, one more a
  // beat, the newest flashing on the kick; a cursor wandering
  xp(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, '#2f6fd8'); sky.addColorStop(0.6, '#6aa7f0'); sky.addColorStop(1, '#bcd9fb')
    g.fillStyle = sky; g.fillRect(0, 0, W, hy * 1.05)
    for (let i = 0; i < 8; i++) {
      const span = W * 1.6, x = ((hsh(i * 3.1) * span - c.scroll(0.02 + 0.01 * hsh(i))) % span + span) % span - W * 0.3, y = hy * (0.1 + 0.35 * hsh(i * 5.3)), s = (40 + 50 * hsh(i * 2.2)) * k
      g.fillStyle = 'rgba(255,255,255,0.75)'
      for (const [dx, dy, r] of [[0, 0, 0.5], [0.45, 0.1, 0.38], [-0.45, 0.12, 0.35], [0.2, -0.22, 0.32]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill() }
    }
    // the hill: one long green curve, a lighter crest
    const hill = (yb, amp, col, par) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H)
      for (let x = 0; x <= W + 8; x += 8 * k) g.lineTo(x, yb - amp * Math.sin(Math.PI * (x / W) * 0.9 + 0.25 + 0.1 * Math.sin(c.scroll(par) / (W * 2))))
      g.lineTo(W, H); g.closePath(); g.fill()
    }
    hill(hy + 40 * k, hy * 0.28, '#4f9a2c', 0.01)
    const gl = g.createLinearGradient(0, hy * 0.7, 0, H)
    gl.addColorStop(0, '#79c447'); gl.addColorStop(1, '#2c6b17')
    hill(hy + 80 * k, hy * 0.22, gl, 0.02)
    // the dialogs: a new one each beat in a cascade, up to 12, cleared every 4 bars
    const nWin = Math.min(12, Math.floor(m.x % 16)) + 1, base = Math.floor(m.x / 16)
    for (let j = 0; j < nWin; j++) {
      const x = W * (0.12 + 0.55 * hsh(base * 9.1)) + j * 18 * k, y = hy * (0.12 + 0.2 * hsh(base * 4.3)) + j * 16 * k, w = 170 * k, h = 70 * k, newest = j === nWin - 1
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 4 * k, y + 4 * k, w, h)
      g.fillStyle = '#ece9d8'; g.fillRect(x, y, w, h)
      const tb = g.createLinearGradient(0, y, 0, y + 16 * k)
      tb.addColorStop(0, newest && m.kick > 0.3 ? '#5a8cff' : '#2a5fd6'); tb.addColorStop(1, '#0c3fb8')
      g.fillStyle = tb; g.fillRect(x, y, w, 16 * k)
      g.fillStyle = '#d6443a'; g.fillRect(x + w - 15 * k, y + 2 * k, 12 * k, 12 * k)
      g.strokeStyle = '#fff'; g.lineWidth = 1.5 * k
      g.beginPath(); g.moveTo(x + w - 12 * k, y + 5 * k); g.lineTo(x + w - 6 * k, y + 11 * k); g.moveTo(x + w - 6 * k, y + 5 * k); g.lineTo(x + w - 12 * k, y + 11 * k); g.stroke()
      g.fillStyle = '#d6443a'; g.beginPath(); g.arc(x + 20 * k, y + 38 * k, 10 * k, 0, TAU); g.fill()
      g.fillStyle = '#fff'; g.fillRect(x + 15 * k, y + 37 * k, 10 * k, 2.5 * k)
      g.fillStyle = '#333'; g.font = `${10 * k}px Tahoma, Verdana, sans-serif`; g.fillText('Ошибка', x + 5 * k, y + 12 * k)
      g.fillText('Что-то пошло музыкально.', x + 38 * k, y + 36 * k)
      g.fillStyle = '#f4f3ee'; g.fillRect(x + w / 2 - 22 * k, y + h - 20 * k, 44 * k, 14 * k)
      g.strokeStyle = '#003c74'; g.lineWidth = k; g.strokeRect(x + w / 2 - 22 * k, y + h - 20 * k, 44 * k, 14 * k)
      g.fillStyle = '#000'; g.fillText('OK', x + w / 2 - 6 * k, y + h - 9 * k)
    }
    // the cursor
    const cxp = W * (0.5 + 0.35 * Math.sin(m.x * 0.37)), cyp = hy * (0.45 + 0.3 * Math.sin(m.x * 0.53 + 1))
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = k
    g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(cxp, cyp + 18 * k); g.lineTo(cxp + 5 * k, cyp + 14 * k); g.lineTo(cxp + 9 * k, cyp + 21 * k); g.lineTo(cxp + 12 * k, cyp + 19 * k); g.lineTo(cxp + 8 * k, cyp + 12 * k); g.lineTo(cxp + 14 * k, cyp + 12 * k); g.closePath(); g.fill(); g.stroke()
    onBeats(c, 4, (x, b) => monitor(g, x, c.ground, H * 0.03, m, 1, m.A, b))
  },

  // ---- KeyGen Church: a demoscene intro — copper bars rolling, a starfield flying out, a pixel cathedral with a stained
  // rose in sixteen colours, a sine scroller greeting everyone
  keygen(g, c, m) {
    const { W, H, k, hy } = c
    g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H)
    // the starfield: out of the centre, faster with the energy
    for (let i = 0; i < 120; i++) {
      const z = fr(hsh(i * 3.7) - m.time * (0.05 + 0.12 * m.energy)), sx = (hsh(i * 1.3) - 0.5) / (z + 0.02), sy = (hsh(i * 2.9) - 0.5) / (z + 0.02)
      const x = W / 2 + sx * W * 0.15, y = hy * 0.5 + sy * hy * 0.15, s = (1 - z) * 2.5 * k
      if (x < 0 || x > W || y < 0 || y > H) continue
      g.fillStyle = `rgba(200,230,255,${1 - z})`; g.fillRect(Math.round(x), Math.round(y), s, s)
    }
    // copper bars: eight bands rolling in sine, the colours of an Amiga's copper list
    const pal = ['255,60,60', '255,160,40', '255,240,80', '80,255,120', '60,200,255', '120,90,255', '255,80,220', '255,255,255']
    for (let i = 0; i < 8; i++) {
      const y = hy * (0.5 + 0.38 * Math.sin(m.x * 0.5 + i * 0.45)), h = 6 * k
      const gr = g.createLinearGradient(0, y - h, 0, y + h)
      gr.addColorStop(0, rgba(pal[i], 0)); gr.addColorStop(0.5, rgba(pal[i], 0.22 + 0.25 * m.kick)); gr.addColorStop(1, rgba(pal[i], 0))
      g.fillStyle = gr; g.fillRect(0, y - h, W, 2 * h)
    }
    // the pixel cathedral against the bars: blocks on a grid of 6 px, a rose window of 16 colours turning a pane a beat
    const P = 6 * k, cx = W / 2, baseY = hy
    const blocks = (x0, x1, y0, y1, col) => { g.fillStyle = col; for (let x = x0; x < x1; x += P) for (let y = y0; y < y1; y += P) g.fillRect(Math.round(x), Math.round(y), P - 1, P - 1) }
    blocks(cx - 22 * P, cx + 22 * P, baseY - 18 * P, baseY, '#141026')
    blocks(cx - 6 * P, cx + 6 * P, baseY - 34 * P, baseY - 18 * P, '#141026')
    for (let r = 0; r < 8; r++) blocks(cx - (8 - r) * P / 1.3, cx + (8 - r) * P / 1.3, baseY - (42 - r) * P, baseY - (41 - r) * P, '#141026')
    for (const tx of [-18, 18]) { blocks(cx + tx * P - 3 * P, cx + tx * P + 3 * P, baseY - 28 * P, baseY - 18 * P, '#141026'); for (let r = 0; r < 5; r++) blocks(cx + tx * P - (5 - r) * P / 1.7, cx + tx * P + (5 - r) * P / 1.7, baseY - (33 - r) * P, baseY - (32 - r) * P, '#141026') }
    const rose = ['#ff3c3c', '#ffa028', '#fff050', '#50ff78', '#3cc8ff', '#785aff', '#ff50dc', '#ffffff']
    for (let a = 0; a < 16; a++) for (let rr = 1; rr <= 3; rr++) {
      const ang = (a / 16) * TAU, x = cx + Math.cos(ang) * rr * P * 1.1, y = baseY - 26 * P + Math.sin(ang) * rr * P * 1.1
      const on = (a + Math.floor(m.x)) % 16 < 4
      g.fillStyle = rose[(a + rr) % 8]; g.globalAlpha = on ? 1 : 0.45; g.fillRect(Math.round(x), Math.round(y), P - 1, P - 1)
    }
    g.globalAlpha = 1
    for (let w = -16; w <= 16; w += 4) if (Math.abs(w) > 4) { const lit = hsh(w + Math.floor(m.x / 4)) < 0.6; g.fillStyle = lit ? 'rgba(255,220,120,0.85)' : '#2a2140'; g.fillRect(cx + w * P, baseY - 12 * P, P * 1.6, P * 4) }
    // the scroller: letters on a sine, one step a sixteenth
    const msg = '  ✦ KEYGEN CHURCH ✦ MATHMUSIC GREETS ALL MUSICIANS · ALL ORGANISTS · ALL TRACKERS · 16 CHANNELS · 1 CATHEDRAL ✦  '
    g.font = `bold ${16 * k}px monospace`
    const cw = 13 * k, off = (m.x * 4 * cw * 0.5) % (msg.length * cw)
    for (let i = 0; i < W / cw + 2; i++) {
      const ci = Math.floor((i * cw + off) / cw) % msg.length, x = i * cw - ((off % cw) + cw) % cw, y = H - (H - hy) * 0.35 + Math.sin(i * 0.35 + m.x * 2) * 12 * k
      g.fillStyle = rgba(pal[(ci + Math.floor(m.x * 2)) % 8], 0.95); g.fillText(msg[ci], x, y)
    }
    onBeats(c, 4, (x, b) => pixelCandle(g, x, c.ground, H * 0.03, m, 1, m.A, b))
  },

  // ---- the mystery game: a haunted arcade screen — a purple fog, a maze of neon walls scrolling, question blocks
  // floating and flipping on the beats, a CRT's scanlines and a glitch on the kick
  mystery(g, c, m) {
    const { W, H, k, hy } = c
    const bg = g.createRadialGradient(W / 2, hy * 0.6, 0, W / 2, hy * 0.6, W * 0.8)
    bg.addColorStop(0, hsla(275, 60, 14)); bg.addColorStop(1, hsla(260, 60, 3))
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    // the maze: neon walls on a 40-px grid scrolling, drawn where the hash says
    const cell = 40 * k, off = c.scroll(0.08), j0 = Math.floor(off / cell)
    g.strokeStyle = rgba(m.A, 0.35 + 0.25 * m.energy); g.lineWidth = 2 * k
    for (let j = j0 - 1; j < j0 + W / cell + 2; j++) for (let r = 0; r < Math.floor(hy / cell); r++) {
      const x = j * cell - off, y = r * cell + 10 * k, h = hsh(j * 13.1 + r * 7.7)
      g.beginPath()
      if (h < 0.4) { g.moveTo(x, y); g.lineTo(x + cell, y) } else if (h < 0.8) { g.moveTo(x, y); g.lineTo(x, y + cell) }
      g.stroke()
    }
    // question blocks: floating, a flip on the beat they own, a coin popping on the downbeat
    for (let i = 0; i < 6; i++) {
      const x = W * (0.12 + 0.15 * i), y = hy * (0.35 + 0.15 * Math.sin(m.x * 0.5 + i)), s = 26 * k, flip = Math.floor(m.x) % 6 === i ? Math.cos(Math.PI * Math.min(1, m.beat * 2)) : 1
      g.save(); g.translate(x, y); g.scale(flip, 1)
      g.fillStyle = '#e8a020'; g.fillRect(-s / 2, -s / 2, s, s)
      g.strokeStyle = '#6a3a00'; g.lineWidth = 2 * k; g.strokeRect(-s / 2, -s / 2, s, s)
      g.fillStyle = '#fff6c0'; g.font = `bold ${18 * k}px monospace`; g.fillText('?', -5 * k, 7 * k)
      g.restore()
      halo(g, x, y, s * 1.6, '255,190,60', 0.12 + 0.2 * (Math.floor(m.x) % 6 === i ? m.pulse : 0))
      if (i === Math.floor(m.x / 4) % 6) { const u = m.down; g.fillStyle = `rgba(255,220,60,${u})`; g.beginPath(); g.ellipse(x, y - s - 30 * k * (1 - u), 5 * k, 8 * k, 0, 0, TAU); g.fill() }
    }
    // fog rolling
    for (let i = 0; i < 5; i++) { const x = fr(hsh(i) + m.time * 0.01 * (1 + i * 0.3)) * W * 1.4 - W * 0.2; halo(g, x, hy * (0.8 + 0.1 * i), W * 0.3, '170,90,255', 0.08) }
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(270, 60, 8)); fl.addColorStop(1, hsla(260, 60, 2))
    g.fillStyle = fl; g.fillRect(0, hy, W, H - hy)
    g.globalCompositeOperation = 'lighter'
    floorGrid(g, c, m, m.A, 0.25 + 0.3 * m.kick, true)
    g.globalCompositeOperation = 'source-over'
    // the glitch: a slice shifted sideways on the kick, then the scanlines
    if (m.kick > 0.45) { const y = hy * hsh(Math.floor(m.x * 4)), h = 14 * k; try { const img = g.getImageData(0, y, W, h); g.putImageData(img, 12 * k * m.kick, y) } catch {} }
    g.fillStyle = 'rgba(0,0,0,0.18)'
    for (let y = 0; y < H; y += 3 * k) g.fillRect(0, y, W, k)
    onBeats(c, 4, (x, b) => qblock(g, x, c.ground, H * 0.03, m, 1, m.B, b))
  },

  // ---- the favela at night: a hillside of houses with lit windows climbing the slope, neon signs, laser beams
  // sweeping from a rooftop party on the kick, the city's glow, a moon in the haze
  favela(g, c, m) {
    const { W, H, k, hy } = c
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(275, 55, 6)); sky.addColorStop(0.8, hsla(300, 60, 15)); sky.addColorStop(1, hsla(320, 70, 22))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    moon(g, W * 0.82, hy * 0.22, 26 * k, '255,220,240', 0.8)
    // the hillside: houses stacked up a slope, windows lit, a few switching with the bars
    for (let row = 0; row < 7; row++) {
      const slopeY = x => hy - hy * (0.55 - 0.07 * row) * Math.max(0, Math.sin(Math.PI * (x / W) * 0.9 + 0.2))
      slots(c, 0.02 + 0.012 * row, 22 + 4 * row, (sx, i, st) => {
        const y0 = slopeY(sx) + row * 14 * k, w = st * (0.7 + 0.3 * hsh(i * 2.3 + row)), h = (12 + 10 * hsh(i * 4.1 + row)) * k
        if (y0 > hy) return
        g.fillStyle = hsla(300 - row * 6, 30, 8 + row); g.fillRect(sx, y0 - h, w, h + 14 * k)
        const lit = hsh(i * 7.7 + row * 3 + Math.floor(m.x / 8)) < 0.45
        if (lit) { const col = hsh(i + row) < 0.3 ? '255,120,220' : '255,210,140'; g.fillStyle = rgba(col, 0.85); g.fillRect(sx + w * 0.3, y0 - h * 0.6, w * 0.25, h * 0.3); halo(g, sx + w * 0.42, y0 - h * 0.45, 8 * k, col, 0.12) }
      })
    }
    // lasers from the party on the hill, fanning on the kick
    g.globalCompositeOperation = 'lighter'
    const lx = W * 0.35, ly = hy * 0.45
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * (0.12 + 0.18 * m.kick) + 0.3 * Math.sin(m.x * 0.5)
      g.strokeStyle = rgba(i % 2 ? '120,255,200' : '255,60,200', 0.25 + 0.5 * m.kick); g.lineWidth = 1.5 * k
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a) * H, ly + Math.sin(a) * H); g.stroke()
    }
    halo(g, lx, ly, 30 * k, '255,120,240', 0.3 + 0.4 * m.kick)
    halo(g, W / 2, hy, W * 0.5, '255,80,200', 0.08 + 0.06 * m.energy)
    g.globalCompositeOperation = 'source-over'
    const fl = g.createLinearGradient(0, hy, 0, H)
    fl.addColorStop(0, hsla(300, 50, 10)); fl.addColorStop(1, hsla(280, 50, 3))
    g.fillStyle = fl; g.fillRect(0, hy, W, H - hy)
    // the wet street: reflections of the lasers' glow
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 10; i++) { const x = W * hsh(i * 3.3); g.fillStyle = `rgba(255,${100 + 120 * hsh(i)},220,${0.06 + 0.1 * m.kick})`; g.fillRect(x, hy + 4 * k, 3 * k, (H - hy) * 0.6) }
    g.globalCompositeOperation = 'source-over'
    onBeats(c, 4, (x, b) => speaker(g, x, c.ground, H * 0.03, m, 1, m.A, b))
  },

  // ---- the storm: clouds rolling in layers, lightning forking on the section's flash and on the timpani, slant rain,
  // the sea heaving a swell a bar, a lighthouse on the cliff whose beam goes round once a bar
  storm(g, c, m) {
    const { W, H, k, hy } = c
    const bolt = Math.max(m.flash, m.kick > 0.7 ? m.kick - 0.5 : 0)
    const sky = g.createLinearGradient(0, 0, 0, hy)
    sky.addColorStop(0, hsla(220, 30, 4 + 30 * bolt)); sky.addColorStop(1, hsla(215, 25, 10 + 25 * bolt))
    g.fillStyle = sky; g.fillRect(0, 0, W, hy)
    // the bolt: a forked line from the clouds to the sea, where the section's hash puts it
    if (bolt > 0.05) {
      const seed = Math.floor(m.x / 4), x0 = W * (0.2 + 0.6 * hsh(seed * 3.3))
      g.strokeStyle = `rgba(230,240,255,${bolt})`; g.lineWidth = 2.2 * k
      g.beginPath(); let x = x0, y = 0; g.moveTo(x, y)
      for (let i = 0; i < 12; i++) { x += (hsh(seed * 7 + i) - 0.5) * 50 * k; y += hy / 12; g.lineTo(x, y); if (i === 5) { const bx = x, by = y; g.moveTo(bx, by); g.lineTo(bx + 40 * k, by + 50 * k); g.moveTo(bx, by) } }
      g.stroke()
      halo(g, x0, hy * 0.1, W * 0.5, '200,220,255', 0.35 * bolt)
    }
    // three layers of clouds rolling at their own pace
    for (let layer = 0; layer < 3; layer++) {
      ridge(g, c, { par: 0.02 + 0.03 * layer, y: hy * (0.18 + 0.12 * layer), amp: -hy * 0.12, scale: 70 + 30 * layer, seed: 80 + layer, oct: 5, fill: hsla(220, 15, 8 + 4 * layer + 20 * bolt * (1 - layer / 3)), to: 0 })
    }
    // the cliff and the lighthouse, its beam a turn a bar
    const lx = W * 0.82, ly = hy - 40 * k
    g.fillStyle = hsla(220, 20, 4); g.beginPath(); g.moveTo(W * 0.68, hy); g.lineTo(W * 0.76, ly + 8 * k); g.lineTo(W, ly); g.lineTo(W, hy); g.closePath(); g.fill()
    g.fillStyle = 'rgba(220,220,230,0.9)'; g.fillRect(lx - 5 * k, ly - 46 * k, 10 * k, 46 * k)
    g.fillStyle = 'rgba(200,60,60,0.9)'; for (let i = 0; i < 3; i++) g.fillRect(lx - 5 * k, ly - 40 * k + i * 14 * k, 10 * k, 5 * k)
    const ang = TAU * fr(m.x / 4), dir = Math.cos(ang)
    g.globalCompositeOperation = 'lighter'
    const L = W * 0.9 * Math.abs(dir), y0 = ly - 50 * k
    const gr = g.createLinearGradient(lx, y0, lx - Math.sign(dir) * L, y0)
    gr.addColorStop(0, 'rgba(255,240,190,0.45)'); gr.addColorStop(1, 'rgba(255,240,190,0)')
    g.fillStyle = gr; g.beginPath(); g.moveTo(lx, y0); g.lineTo(lx - Math.sign(dir) * L, y0 - 30 * k); g.lineTo(lx - Math.sign(dir) * L, y0 + 30 * k); g.closePath(); g.fill()
    halo(g, lx, y0, 20 * k, '255,240,190', 0.5 + 0.3 * Math.abs(Math.sin(ang)))
    g.globalCompositeOperation = 'source-over'
    // the sea: swells rolling, a bar each, crests catching the lightning
    for (let row = 0; row < 6; row++) {
      const y = hy + (c.ground - hy) * (row / 6) ** 1.3, amp = (3 + 4 * row) * k
      g.fillStyle = hsla(215, 30, 6 + row + 25 * bolt * (1 - row / 6))
      g.beginPath(); g.moveTo(0, H)
      for (let x = 0; x <= W + 10; x += 10 * k) g.lineTo(x, y + amp * Math.sin(x / (60 * k) + m.x * TAU / 4 + row))
      g.lineTo(W, H); g.closePath(); g.fill()
    }
    // the rain, slanted, denser with the energy
    g.strokeStyle = `rgba(200,215,235,${0.25 + 0.15 * m.energy})`; g.lineWidth = k
    for (let i = 0; i < 70 + 50 * m.energy; i++) {
      const x0 = hsh(i * 9.7) * W * 1.2, sp = 0.8 + hsh(i * 0.618), y0 = fr(m.time * sp * 1.4 + hsh(i * 0.137)) * H
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 8 * k, y0 + 26 * k); g.stroke()
    }
    onBeats(c, 4, (x, b) => lighthouseBuoy(g, x, c.ground, H * 0.03, m, 1, '255,90,80', b))
  },
}

// rain, falling one drop length per ~half beat
function rain(g, c, m, a) {
  g.strokeStyle = rgba(m.S, a)
  g.lineWidth = c.k
  for (let i = 0; i < 80; i++) {
    const x0 = hsh(i * 9.7) * c.W, sp = 0.6 + hsh(i * 0.618)
    const y0 = fr(m.time * sp * 0.9 + hsh(i * 0.137)) * c.H
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x0 - 3 * c.k, y0 + 22 * c.k)
    g.stroke()
  }
}
// a perspective floor: a new line comes out of the horizon every beat
function floorGrid(g, c, m, rgb, a, fan) {
  const { W, H, k, hy } = c, cx = W / 2
  g.strokeStyle = rgba(rgb, a)
  g.lineWidth = k
  if (fan) for (let i = -16; i <= 16; i++) {
    g.beginPath()
    g.moveTo(cx + i * 6 * k, hy)
    g.lineTo(cx + i * W * 0.1, H)
    g.stroke()
  }
  for (let j = 0; j < 14; j++) {
    const d = (j + m.beat) / 14, y = hy + (H - hy) * Math.pow(d, 2.2)
    g.globalAlpha = d
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
  }
  g.globalAlpha = 1
}

// a medina against the sky: cubes with domes, minarets with a balcony and a little dome, arched windows lit at random
function medina(g, c, m, { par, slot, seed, base, lo, hi, fill, win, winA }) {
  slots(c, par, slot, (x, i, st) => {
    const h = lo + (hi - lo) * hsh(i * 3.7 + seed), w = st * (0.55 + 0.35 * hsh(i * 1.3 + seed))
    g.fillStyle = fill
    g.fillRect(x, base - h, w, h)
    if (hsh(i * 5.1 + seed) < 0.5) {
      g.beginPath()
      g.ellipse(x + w / 2, base - h, w * 0.38, w * 0.42, 0, Math.PI, TAU)
      g.fill()
      g.fillRect(x + w / 2 - 0.6 * c.k, base - h - w * 0.62, 1.2 * c.k, w * 0.22)
    }
    if (hsh(i * 7.9 + seed) < 0.28) {
      const mx = x + w + st * 0.12, mw = st * 0.12, mh = h * (1.6 + 0.5 * hsh(i + seed))
      g.fillRect(mx, base - mh, mw, mh)
      g.fillRect(mx - mw * 0.35, base - mh * 0.78, mw * 1.7, mw * 0.35)
      g.beginPath()
      g.ellipse(mx + mw / 2, base - mh, mw * 0.65, mw * 0.9, 0, Math.PI, TAU)
      g.fill()
      g.fillRect(mx + mw / 2 - 0.4 * c.k, base - mh - mw * 1.6, 0.8 * c.k, mw * 0.8)
    }
    for (let j = 0; j < 3; j++) {
      if (hsh(i * 11 + j * 3.1 + seed + Math.floor(m.x / 8) * (j === 1 ? 0.37 : 0)) > 0.45) continue
      const wx = x + w * (0.2 + 0.3 * j), wy = base - h * 0.55, ww = w * 0.1, wh = h * 0.22
      g.fillStyle = rgba(win, winA)
      g.beginPath()
      g.moveTo(wx, wy + wh)
      g.lineTo(wx, wy)
      g.arc(wx + ww / 2, wy, ww / 2, Math.PI, TAU)
      g.lineTo(wx + ww, wy + wh)
      g.fill()
      g.fillStyle = fill
    }
  })
}

// temples on the far bank: shikharas — a tall curved tower ribbed upward, a ribbed disc (amalaka) and a finial (kalasha)
function shikharas(g, c, m, { par, slot, seed, base, lo, hi, fill }) {
  slots(c, par, slot, (x, i, st) => {
    if (hsh(i * 2.1 + seed) < 0.35) return
    const h = lo + (hi - lo) * hsh(i * 3.3 + seed), w = st * (0.35 + 0.2 * hsh(i * 1.7 + seed)), cx = x + st / 2
    g.fillStyle = fill
    g.fillRect(cx - w * 0.75, base - h * 0.28, w * 1.5, h * 0.28)
    g.beginPath()
    g.moveTo(cx - w / 2, base - h * 0.28)
    g.bezierCurveTo(cx - w * 0.52, base - h * 0.7, cx - w * 0.3, base - h * 0.95, cx, base - h)
    g.bezierCurveTo(cx + w * 0.3, base - h * 0.95, cx + w * 0.52, base - h * 0.7, cx + w / 2, base - h * 0.28)
    g.fill()
    g.beginPath()
    g.ellipse(cx, base - h, w * 0.22, w * 0.08, 0, 0, TAU)
    g.fill()
    g.fillRect(cx - 0.6 * c.k, base - h - w * 0.35, 1.2 * c.k, w * 0.3)
  })
}

// what stands along the 3D road, per theme: prop, how often (beats), its light; span = an arch over all lanes
const ROAD = {
  void: { prop: 'rock', every: 4 },
  lofi: { prop: 'lamp', every: 4, rgb: '255,190,110' },
  chip: { prop: 'block', every: 4, rgb: '255,200,70' },
  bossa: { prop: 'palm', every: 8, out: 3 },
  kawaii: { prop: 'sakura', every: 8, out: 4 },
  classical: { prop: 'column', every: 4 },
  gothic: { prop: 'spire', every: 4, span: 'lancet', spanEvery: 16 },
  synth: { prop: 'pylon', every: 2 },
  dnb: { prop: 'pylon', every: 1 },
  phonk: { prop: 'lamp', every: 4, rgb: '255,120,60' },
  meow: { prop: 'catpost', every: 2 },
  ink: { prop: 'toro', every: 4, rgb: '255,190,120', span: 'torii', spanEvery: 16 },
  romantic: { prop: 'lamp', every: 8, rgb: '255,220,170' },
  jazz: { prop: 'lamp', every: 4, rgb: '255,200,120' },
  desert: { prop: 'lantern', every: 4, rgb: '255,190,100', span: 'horseshoe', spanEvery: 16 },
  celtic: { prop: 'menhir', every: 4, rgb: '140,230,170', span: 'trilithon', spanEvery: 16 },
  java: { prop: 'diya', every: 4, rgb: '255,190,90', out: 1.8, span: 'torana', spanEvery: 16 },
  india: { prop: 'diya', every: 2, rgb: '255,170,70', out: 1.6, span: 'torana', spanEvery: 16 },
  factory: { prop: 'crate', every: 4, rgb: '255,170,70' },
  jungle: { prop: 'mushroom', every: 2, out: 1.8 },
  cathedral: { prop: 'organpipe', every: 4, rgb: '255,220,150', span: 'lancet', spanEvery: 16 },
  arena: { prop: 'floodlight', every: 8 },
  snow: { prop: 'pine', every: 2, out: 2.6, rgb: '200,255,230' },
  xp: { prop: 'monitor', every: 4 },
  keygen: { prop: 'pixelCandle', every: 2 },
  mystery: { prop: 'qblock', every: 4 },
  favela: { prop: 'speaker', every: 4 },
  storm: { prop: 'lighthouseBuoy', every: 4, rgb: '255,90,80' },
}

// 2D: behind the curves. geo = { X (beat → screen x), from, to (beats on screen), px (pixels per beat), ground }
export function scenery2d(sc, g, W, H, k, geo) {
  const sky = SKIES[sc.theme.id] ?? SKIES.void, m = musicOf(sc)
  const c = { W, H, k, hy: H * 0.62, ground: geo.ground, scroll: par => sc.x * geo.px * par, at: geo.X, from: geo.from, to: geo.to }
  g.save()
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  sky(g, c, m)
  g.restore()
}

// 3D: the backdrop at the horizon (call before the floor)…
export function sceneryBack(sc, g, W, H, k, horizon) {
  const sky = SKIES[sc.theme.id] ?? SKIES.void, m = musicOf(sc)
  const c = { W, H, k, hy: horizon, ground: H, scroll: par => sc.x * 3 * k * par, at: null }
  g.save()
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  sky(g, c, m)
  g.restore()
}
// …and the props along the road, far to near: they cross the playhead plane on their beat.
// proj(wx, wy, wz) → [sx, sy, z] | null; left/right = the outer lanes; floor = the ground's world y
export function sceneryRoad(sc, g, k, { proj, left, right, depth, floor }) {
  const road = ROAD[sc.theme.id] ?? ROAD.void, m = musicOf(sc), x = sc.x, draw = PROPS[road.prop]
  const rgb = road.rgb ?? m.A, items = []
  for (let b = Math.ceil((x - 1) / road.every) * road.every; b <= x + 40; b += road.every) items.push(['p', b])
  if (road.span) for (let b = Math.ceil((x - 1) / road.spanEvery) * road.spanEvery; b <= x + 40; b += road.spanEvery) items.push(['s', b])
  items.sort((a, b) => b[1] - a[1] || (a[0] === 's' ? -1 : 1))
  g.save()
  g.globalCompositeOperation = 'source-over'
  for (const [kind, b] of items) {
    const z = (b - x) * depth, fade = clamp01(1 - z / 56) * clamp01((z + 0.6) / 1.2)
    if (fade <= 0) continue
    g.globalAlpha = fade
    if (kind === 's') {
      g.globalAlpha = fade * (0.35 + 0.65 * clamp01(z / 6)) // you fly through it: thinner as it comes over you
      const p = proj(0, floor, z), q = proj(1, floor, z)
      if (p && q) SPANS[road.span](g, p[0], p[1], q[0] - p[0], ((right - left) / 2 + 1.2) * (q[0] - p[0]), road.span === 'torii' ? m.A : '24,16,32', road.span === 'torii' ? 0.75 : 0.85)
      continue
    }
    for (const side of [-1, 1]) {
      const wx = side < 0 ? left - (road.out ?? 2.4) : right + (road.out ?? 2.4), p = proj(wx, floor, z), q = proj(wx + 1, floor, z)
      if (!p || !q) continue
      draw(g, p[0], p[1], q[0] - p[0], m, -side, rgb, b)
    }
  }
  g.restore()
}
