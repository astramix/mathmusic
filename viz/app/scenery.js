// Themed scenery behind the curves (classic, 2D) and around the ribbons (space, 3D), one per theme:
// a night in space, a rainy city, 8-bit hills, a sunset sea, sakura, a baroque hall, a cathedral,
// outrun, a neon tunnel, a drift road, cats on roofs, ink mountains, a moonlit lake, a jazz club.
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
const PROPS = { lamp, palm, column, spire, pylon, sakura, block, toro, rock, catpost, lantern, diya }

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
const SPANS = { torii, lancet, horseshoe, torana }

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
  india: { prop: 'diya', every: 2, rgb: '255,170,70', out: 1.6, span: 'torana', spanEvery: 16 },
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
