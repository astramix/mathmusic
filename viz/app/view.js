// The picture: every track's curve y = graph(x) around the playhead, in three styles —
//   classic  the glowing curves on a night sky (as before), with particles on every note;
//   paper    a coordinate plane on light graph paper: the functions are plotted by a moving pen as
//            the song plays, and each part's formula pops up highlighted when the part enters, then
//            fades;
//   space    3D: the tracks are ribbons flying towards you, the future far away, the playhead a
//            plane you pass through.
// The scene is a pure function of (time, levels, its own seeded particle state), so the same code
// draws the live view and, frame by frame, the video export.
import { spell } from './theory.js'
import { isDrum, scenery2d, sceneryBack, sceneryRoad } from './scenery.js'

export const GRID = 32 // graph samples per beat
const Y_MIN = -3, Y_MAX = 5

// seeded RNG for particles and stars (videos must come out the same every time)
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const norm = v => (v == null ? null : Array.isArray(v) ? v.filter(Number.isFinite) : Number.isFinite(v) ? [v] : null)
const safe = (f, x) => {
  try { return f ? f(x) : null } catch { return null }
}

// colours: hex or hsl() → [h, s, l]; a darker, saturated version for light paper
function hsl(c) {
  if (c.startsWith('hsl')) {
    const [h, s, l] = c.match(/[\d.]+/g).map(Number)
    return [h, s, l]
  }
  const n = parseInt(c.slice(1, 7), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
  }
  return [h, s * 100, l * 100]
}
export const ink = c => {
  const [h, s, l] = hsl(c)
  return `hsl(${h.toFixed(0)} ${Math.max(55, s).toFixed(0)}% ${Math.min(42, l * 0.55).toFixed(0)}%)`
}

export class Scene {
  // tracks: [{ key, i, color, graph, midi, muted, formula }], key: musical key for note names
  constructor(song, tracks, { key, theme, seed = 7 } = {}) {
    this.song = song
    this.key = key
    this.theme = theme
    this.rand = rng(seed)
    this.tracks = tracks.map(t => ({ ...t, cache: new Map(), max: 1e-4, prev: 0, lvl: 0, notes: new Set(), onset: -1e9, lastOn: -1e9, enteredAt: null, enteredT: -1e9 }))
    this.parts = []
    this.rings = []
    this.onsets = new Set()
    this.stars = Array.from({ length: 260 }, () => ({ x: this.rand(), y: this.rand(), z: 0.2 + 0.8 * this.rand(), p: this.rand() * 6.28 }))
    this.stars3 = Array.from({ length: 420 }, () => ({ x: (this.rand() - 0.5) * 60, y: (this.rand() - 0.3) * 30, z: this.rand() * 80 }))
    this.time = 0
    this.energy = 0
    this.section = -1
    this.sectionAt = -1e9
    this.bgHue = theme.hue
    this.formulaImgs = new Map()
    this.x = 0
  }
  val(t, k) {
    let v = t.cache.get(k)
    if (v === undefined) t.cache.set(k, (v = norm(safe(t.graph, k / GRID))))
    return v
  }
  midiAt(t, x) {
    const m = safe(t.midi, x)
    return Array.isArray(m) ? m.filter(Number.isFinite) : []
  }
  sectionAtX(x) {
    let i = 0
    ;(this.song.sections ?? []).forEach(([b], j) => b <= x && (i = j))
    return i
  }
  hueOf(i) {
    return this.theme.hue + 60 * Math.sin(i * 1.7)
  }

  // advance meters, note onsets, entrances and particles to beat x (dt seconds since the last frame)
  update(x, dt, levels, playing) {
    this.time += dt
    this.x = x
    const onsets = new Set()
    let energy = 0
    for (const t of this.tracks) {
      const a = playing && levels ? levels[t.i] ?? 0 : 0
      t.max = Math.max(t.max * 0.9995, a)
      const n = t.muted ? 0 : a / t.max
      if (playing && t.midi) {
        const cur = new Set(this.midiAt(t, x))
        for (const m of cur) if (!t.notes.has(m)) { onsets.add(t); t.onset = x }
        t.notes = cur
      } else if (playing && n - t.prev > 0.3 && n > 0.5) {
        onsets.add(t)
        t.onset = x
      }
      t.prev = t.prev * 0.6 + n * 0.4
      t.lvl = t.lvl * 0.7 + n * 0.3
      energy += t.lvl / this.tracks.length
      // a part "enters" when its curve appears after 4+ beats of silence
      const on = !t.muted && this.val(t, Math.round(x * GRID)) != null
      if (on) {
        if (x - t.lastOn > 4) {
          t.enteredAt = x
          t.enteredT = this.time
        }
        t.lastOn = x
      }
    }
    this.energy = energy
    this.onsets = onsets
    const sec = this.sectionAtX(x)
    if (sec !== this.section) {
      this.section = sec
      this.sectionAt = this.time
    }
    this.bgHue += (this.hueOf(sec) - this.bgHue) * Math.min(1, dt * 1.2)
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const o = this.rings[i]
      o.r += dt * 150 * o.s
      o.a -= dt * 1.5
      if (o.a <= 0) this.rings.splice(i, 1)
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 60 * dt
      p.a -= dt * 1.1
      if (p.a <= 0) this.parts.splice(i, 1)
    }
    if (this.parts.length > 2000) this.parts.splice(0, this.parts.length - 2000)
  }
  burst(x, y, c, n = 12, big = 1, k = 1) {
    this.rings.push({ x, y, r: 4 * k, c, a: 0.9, s: big * k })
    for (let i = 0; i < n; i++) {
      const an = this.rand() * 6.28, sp = (40 + this.rand() * 170) * big * k
      this.parts.push({ x, y, vx: Math.cos(an) * sp - 90 * k, vy: Math.sin(an) * sp, c, a: 1 })
    }
  }
  noteLabel(t) {
    const m = [...t.notes]
    return m.length && !isDrum(t.key) ? m.slice(0, 3).map(n => spell(n, this.key)).join(' ') : t.key
  }

  // ---- drawing ----------------------------------------------------------------------------------
  // opts: { style, W, H, zoom, fx, labels, scenery, focus, inspect, scope, cached, timeline, title, scale }
  draw(g, opts) {
    if (opts.style === 'paper') return this.drawPaper(g, opts)
    if (opts.style === 'space') return this.drawSpace(g, opts)
    return this.drawClassic(g, opts)
  }

  // scenery: the theme's own landscape (scenery.js), moving with the music; without it, the plain sky
  background(g, W, H, k, scenery) {
    const th = this.theme, e = this.energy
    const grd = g.createLinearGradient(0, 0, 0, H)
    grd.addColorStop(0, `hsl(${this.bgHue} ${th.sat}% ${th.light + 5 * e}%)`)
    grd.addColorStop(1, `hsl(${this.bgHue + 40} ${th.sat + 5}% 3%)`)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = grd
    g.fillRect(0, 0, W, H)
    g.globalCompositeOperation = 'lighter'
    if (scenery) {
      this.drawStars(g, W, H, k)
      scenery2d(this, g, W, H, k, scenery)
      return
    }
    if (th.deco === 'sun') {
      // outrun: a striped sun on the horizon and a perspective grid
      const cx = W / 2, cy = H * 0.62, r = Math.min(W, H) * 0.2
      const sg = g.createLinearGradient(0, cy - r, 0, cy + r)
      sg.addColorStop(0, '#ffd36b55')
      sg.addColorStop(1, '#ff4fa833')
      g.fillStyle = sg
      g.beginPath()
      g.arc(cx, cy, r, Math.PI, 0)
      g.fill()
      g.globalCompositeOperation = 'source-over'
      g.fillStyle = `hsl(${this.bgHue} 50% 5%)`
      for (let i = 0; i < 6; i++) g.fillRect(cx - r, cy - r * (0.5 - i * 0.09), 2 * r, 2 + i * 1.5)
      g.globalCompositeOperation = 'lighter'
      g.strokeStyle = '#ff6fd833'
      g.lineWidth = 1
      for (let i = -12; i <= 12; i++) {
        g.beginPath()
        g.moveTo(cx + i * 8 * k, cy)
        g.lineTo(cx + i * W * 0.12, H)
        g.stroke()
      }
      const ph = (this.time * 0.6) % 1
      for (let j = 0; j < 10; j++) {
        const d = (j + ph) / 10, y = cy + (H - cy) * d * d
        g.globalAlpha = d
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(W, y)
        g.stroke()
      }
      g.globalAlpha = 1
    }
    this.drawStars(g, W, H, k)
    if (th.deco === 'rain') {
      g.strokeStyle = `rgba(${th.star},0.08)`
      g.lineWidth = 1
      for (let i = 0; i < 70; i++) {
        const x0 = ((i * 97.3) % 1) * W, sp = 0.6 + ((i * 0.618) % 1)
        const y0 = ((this.time * sp * 0.9 + i * 0.137) % 1) * H
        g.beginPath()
        g.moveTo(x0, y0)
        g.lineTo(x0 - 3 * k, y0 + 22 * k)
        g.stroke()
      }
    }
  }
  drawStars(g, W, H, k) {
    for (const s of this.stars) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(s.p + this.time * 1.1 * s.z))
      g.fillStyle = `rgba(${this.theme.star},${0.15 + 0.5 * tw * s.z})`
      const sz = 1.6 * s.z * k
      g.fillRect(s.x * W, s.y * H, sz, sz)
    }
  }
  overlay(g, W, H, k) {
    const deco = this.theme.deco
    g.globalCompositeOperation = 'source-over'
    if (deco === 'scan') {
      g.globalAlpha = 0.18
      g.fillStyle = '#000'
      for (let y = 0; y < H; y += 3 * k) g.fillRect(0, y, W, 1.2 * k)
    } else if (deco === 'grain') {
      g.globalAlpha = 0.05
      for (let i = 0; i < 500; i++) {
        g.fillStyle = this.rand() < 0.5 ? '#fff' : '#000'
        g.fillRect(this.rand() * W, this.rand() * H, k, k)
      }
    } else if (deco === 'gold') {
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75)
      v.addColorStop(0, '#0000')
      v.addColorStop(1, '#000a')
      g.globalAlpha = 1
      g.fillStyle = v
      g.fillRect(0, 0, W, H)
    }
    g.globalAlpha = 1
  }

  // polyline(s) of graph(x) for x in [a, b], mapped by X(beat), Yf(value)
  curve(t, a, b, X, Yf, jump = 1.2) {
    const paths = []
    let prev = null
    for (let k = Math.floor(a * GRID); k <= Math.ceil(b * GRID); k++) {
      if (k < 0) continue
      const v = this.val(t, k), sx = X(k / GRID)
      if (v) {
        v.forEach((y, j) => {
          const p = (paths[j] ??= [])
          if (!prev || prev[j] === undefined || Math.abs(prev[j] - y) > jump) p.push(null)
          p.push(sx, Yf(y))
        })
        paths.forEach((p, j) => j >= v.length && p.push(null))
      } else paths.forEach(p => p.push(null))
      prev = v
    }
    return paths
  }
  drawPath(g, paths) {
    g.beginPath()
    for (const p of paths) {
      let pen = 0, x0 = 0, y0 = 0
      const lone = () => pen === 1 && g.lineTo(x0 + 4, y0)
      for (let i = 0; i < p.length; i++) {
        if (p[i] === null) { lone(); pen = 0; continue }
        if (pen) g.lineTo(p[i], p[i + 1])
        else { g.moveTo(p[i], p[i + 1]); x0 = p[i]; y0 = p[i + 1] }
        pen++
        i++
      }
      lone()
    }
  }

  drawClassic(g, o) {
    const { W, H } = o, k = o.scale ?? 1, x = this.x, tl = o.timeline !== false ? 44 * k : 0
    const span = o.zoom * (1 - 0.06 * this.energy), ph = W * (o.playhead ?? 0.62), px = W / span
    const X = b => ph + (b - x) * px, Bx = sx => x + (sx - ph) / px
    const top = o.top ?? 0.12, Yf = y => top * H + (1 - top - 0.12) * H * (Y_MAX - y) / (Y_MAX - Y_MIN)
    const xa = Bx(0), xb = Bx(W)
    this.background(g, W, H, k, o.scenery && { X, px, from: xa, to: xb, ground: H - tl })
    // grid: beats, bars (numbered), sections
    g.font = `${11 * k}px system-ui`
    g.textBaseline = 'top'
    for (let b = Math.ceil(xa); b <= xb; b++) {
      const bar = b % 4 === 0, near = Math.max(0, 1 - Math.abs(b - x) * 3)
      g.globalAlpha = 1
      g.fillStyle = `rgba(200,190,255,${(bar ? 0.09 : 0.035) + 0.3 * near})`
      g.fillRect(X(b), 0, (bar ? 1.5 : 1) * k, H - tl)
      if (bar && px * 4 > 34 * k) {
        g.fillStyle = 'rgba(200,190,255,0.35)'
        g.fillText(b / 4 + 1, X(b) + 3 * k, H - tl - 16 * k)
      }
    }
    g.font = `600 ${12 * k}px system-ui`
    for (const [b, nm] of this.song.sections ?? []) {
      const sx = X(b)
      if (sx < -200 * k || sx > W) continue
      g.fillStyle = 'rgba(230,220,255,0.35)'
      g.fillRect(sx, 0, 2 * k, H - tl)
      g.fillStyle = 'rgba(230,220,255,0.65)'
      g.fillText(nm.toUpperCase(), sx + 6 * k, (o.sectionY ?? 70) * k)
    }
    const focus = o.focus
    for (const t of this.tracks) {
      if (!t.graph) continue
      const dim = (focus && focus !== t ? 0.22 : 1) * (t.muted ? 0.3 : 1)
      for (const future of [false, true]) {
        const paths = future ? this.curve(t, x, xb, X, Yf) : this.curve(t, xa, x, X, Yf)
        g.strokeStyle = t.color
        g.lineJoin = 'round'
        g.lineCap = 'round'
        for (const [w, a] of [[10, 0.06], [4.5, 0.16], [1.8, 0.95]]) {
          g.lineWidth = (w + (future ? 0 : 3 * t.lvl * (w > 2)) + (focus === t ? 1 : 0)) * k
          g.globalAlpha = a * dim * (future ? 0.28 : 1)
          this.drawPath(g, paths)
          g.stroke()
        }
      }
      const v = this.val(t, Math.round(x * GRID))
      if (v) v.forEach((y, j) => {
        const py = Yf(y), r = (3 + 9 * t.lvl) * k
        g.globalAlpha = 0.25 * dim
        g.fillStyle = t.color
        g.beginPath()
        g.arc(ph, py, r * 2.4, 0, 6.29)
        g.fill()
        g.globalAlpha = dim
        g.beginPath()
        g.arc(ph, py, r, 0, 6.29)
        g.fill()
        if (this.onsets.has(t) && o.fx !== false) this.burst(ph, py, t.color, isDrum(t.key) ? 18 : 10, /drum|kick/i.test(t.key) ? 1.4 : 1, k)
        if (o.labels !== false && j === 0) {
          g.globalAlpha = 0.8 * dim
          g.font = `${11 * k}px system-ui`
          g.textBaseline = 'middle'
          g.fillText(this.noteLabel(t), ph + r * 2.4 + 6 * k, py)
        }
      })
    }
    // the inspected note: the whole span where midi(x) keeps the same notes
    const ins = o.inspect
    if (ins) {
      const t = ins.t, key = this.midiAt(t, ins.x).join(',')
      let a = ins.x, b = ins.x
      const step = 1 / GRID
      if (key) {
        while (a - step > ins.x - 32 && this.midiAt(t, a - step).join(',') === key) a -= step
        while (b + step < ins.x + 32 && this.midiAt(t, b + step).join(',') === key) b += step
      } else {
        a = ins.x - 0.5
        b = ins.x + 0.5
      }
      const paths = this.curve(t, a, b + step, X, Yf)
      g.strokeStyle = '#fff'
      g.lineCap = 'round'
      for (const [w, al] of [[16, 0.08], [7, 0.25], [2.5, 1]]) {
        g.lineWidth = w
        g.globalAlpha = al
        this.drawPath(g, paths)
        g.stroke()
      }
      const sx = X(ins.x)
      g.globalAlpha = 0.5
      g.fillStyle = t.color
      g.fillRect(sx - 0.5, 0, 1, H - tl)
      g.globalAlpha = 0.12
      g.fillRect(X(a), 0, X(b + step) - X(a), H - tl)
      for (const y of norm(safe(t.graph, ins.x)) ?? []) {
        g.globalAlpha = 1
        g.fillStyle = '#fff'
        g.beginPath()
        g.arc(sx, Yf(y), 4.5, 0, 6.29)
        g.fill()
      }
    }
    this.drawParticles(g, k)
    g.globalAlpha = 0.6
    g.fillStyle = '#fff'
    g.fillRect(ph - 0.5 * k, 0, k, H - tl)
    if (o.scope) this.drawScope(g, o.scope, W - Math.min(80 * k, W * 0.11) - 24 * k, H - Math.min(80 * k, W * 0.11) - (tl + 20 * k), Math.min(80 * k, W * 0.11), k)
    g.globalCompositeOperation = 'source-over'
    this.drawSectionTitle(g, W, H, k, o.titleY ?? 0.42)
    if (tl) this.drawTimeline(g, o, W, H, k)
    this.overlay(g, W, H, k)
    return { X, Bx, Yf, tl }
  }
  drawParticles(g, k) {
    for (const r of this.rings) {
      g.strokeStyle = r.c
      g.globalAlpha = r.a
      g.lineWidth = 2 * k
      g.beginPath()
      g.arc(r.x, r.y, r.r, 0, 6.29)
      g.stroke()
    }
    for (const p of this.parts) {
      g.globalAlpha = p.a
      g.fillStyle = p.c
      g.fillRect(p.x, p.y, 2.5 * k, 2.5 * k)
    }
  }
  drawScope(g, s, cx, cy, R0, k) {
    g.globalAlpha = 0.15
    g.fillStyle = '#000'
    g.beginPath()
    g.arc(cx, cy, R0 + 8 * k, 0, 6.29)
    g.fill()
    if (!s.L) return
    g.globalAlpha = 0.8
    g.strokeStyle = `hsl(${this.bgHue + 60} 90% 75%)`
    g.lineWidth = 1.2 * k
    g.beginPath()
    for (let i = 0; i < s.L.length; i++) {
      const l = s.L[i] * s.gain, r = s.R[i] * s.gain, sx = cx + (l - r) * R0 * 0.8, sy = cy - (l + r) * R0 * 0.6
      i ? g.lineTo(sx, sy) : g.moveTo(sx, sy)
    }
    g.stroke()
  }
  drawSectionTitle(g, W, H, k, yf, color = '#fff') {
    const age = this.time - this.sectionAt, title = (this.song.sections ?? [])[this.section]?.[1] ?? ''
    const ta = Math.max(0, Math.min(1, age * 2) * (1 - Math.max(0, age - 2.5) / 1.5))
    if (ta <= 0) return
    g.globalAlpha = ta
    g.fillStyle = color
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `300 ${Math.min(64 * k, W / 12)}px system-ui`
    g.fillText(title, W / 2, H * yf - 20 * k * (1 - Math.min(1, age)))
    g.textAlign = 'start'
    g.globalAlpha = 1
  }
  drawTimeline(g, o, W, H, k) {
    const L = this.song.length, ty = H - 26 * k, secs = this.song.sections ?? [[0, '']], x = this.x
    const sec = this.section
    g.font = `${10 * k}px system-ui`
    g.textBaseline = 'bottom'
    secs.forEach(([b, nm], i) => {
      const e = secs[i + 1]?.[0] ?? L, x0 = 16 * k + (W - 32 * k) * b / L, x1 = 16 * k + (W - 32 * k) * e / L
      g.globalAlpha = i === sec ? 0.95 : 0.4
      g.fillStyle = `hsl(${this.hueOf(i) + 40} 70% 65%)`
      g.fillRect(x0 + 1, ty, x1 - x0 - 2, 6 * k)
      if (x1 - x0 > 40 * k) {
        g.globalAlpha = i === sec ? 0.9 : 0.45
        g.fillText(nm, x0 + 3 * k, ty - 2 * k)
      }
    })
    if (o.cached) {
      g.globalAlpha = 0.5
      g.fillStyle = '#fff'
      for (const [a, b] of o.cached) g.fillRect(16 * k + (W - 32 * k) * a, ty + 9 * k, (W - 32 * k) * (b - a), 1.5 * k)
    }
    if (o.mouseX != null) {
      g.globalAlpha = 0.5
      g.fillStyle = '#fff'
      g.fillRect(o.mouseX - 0.5, ty - 14, 1, 22)
    }
    // the loop: a band over the stretch that goes round
    if (o.loop) {
      const xa = 16 * k + (W - 32 * k) * Math.max(0, o.loop[0]) / L, xb = 16 * k + (W - 32 * k) * Math.min(L, o.loop[1]) / L
      g.globalAlpha = 0.28
      g.fillStyle = '#ffd479'
      g.fillRect(xa, ty - 12 * k, xb - xa, 22 * k)
      g.globalAlpha = 0.9
      g.fillRect(xa, ty - 12 * k, 1.5 * k, 22 * k)
      g.fillRect(xb - 1.5 * k, ty - 12 * k, 1.5 * k, 22 * k)
    }
    g.globalAlpha = 1
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(16 * k + (W - 32 * k) * Math.min(1, x / L), ty + 3 * k, 6 * k, 0, 6.29)
    g.fill()
  }

  // ---- paper: a coordinate plane, plotted by a pen --------------------------------------------------
  drawPaper(g, o) {
    const { W, H } = o, k = o.scale ?? 1, x = this.x
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = '#fbfaf6'
    g.fillRect(0, 0, W, H)
    const portrait = H > W * 1.2, band = o.formulas !== false && this.formulaImgs.size ? 1 : 0
    const m = { l: (o.left ?? 0) + 64 * k, r: 28 * k, t: (portrait ? 330 : 96 + 150 * band) * k, b: (portrait ? 420 : 70) * k }
    const pw = W - m.l - m.r, phh = H - m.t - m.b
    const span = o.zoom * (portrait ? 0.55 : 1), px = pw / span
    const penAt = 0.72, x0 = Math.max(0, x - penAt * span)
    const X = b => m.l + (b - x0) * px, Bx = sx => x0 + (sx - m.l) / px
    const yLo = Y_MIN - 0.4, yHi = Y_MAX + 0.3
    const Yf = y => m.t + phh * (yHi - y) / (yHi - yLo)
    const xb = Bx(m.l + pw)
    // graph paper: beats, bars; minor y every 0.5
    g.lineWidth = 1
    for (let b = Math.ceil(x0); b <= xb; b++) {
      g.strokeStyle = b % 4 === 0 ? '#c9d4e3' : '#e6ebf2'
      g.beginPath()
      g.moveTo(X(b), m.t)
      g.lineTo(X(b), m.t + phh)
      g.stroke()
    }
    for (let y = Math.ceil(yLo * 2) / 2; y <= yHi; y += 0.5) {
      g.strokeStyle = Number.isInteger(y) ? '#c9d4e3' : '#e6ebf2'
      g.beginPath()
      g.moveTo(m.l, Yf(y))
      g.lineTo(m.l + pw, Yf(y))
      g.stroke()
    }
    // axes with arrows
    const axis = '#2b2a3a'
    g.strokeStyle = axis
    g.fillStyle = axis
    g.lineWidth = 1.6 * k
    const arrow = (x1, y1, dx, dy) => {
      g.beginPath()
      g.moveTo(x1, y1)
      g.lineTo(x1 - 9 * k * dx + 4 * k * dy, y1 - 9 * k * dy - 4 * k * dx)
      g.lineTo(x1 - 9 * k * dx - 4 * k * dy, y1 - 9 * k * dy + 4 * k * dx)
      g.closePath()
      g.fill()
    }
    g.beginPath()
    g.moveTo(m.l, Yf(0))
    g.lineTo(m.l + pw + 14 * k, Yf(0))
    g.stroke()
    arrow(m.l + pw + 18 * k, Yf(0), 1, 0)
    g.beginPath()
    g.moveTo(m.l, m.t + phh)
    g.lineTo(m.l, m.t - 14 * k)
    g.stroke()
    arrow(m.l, m.t - 18 * k, 0, -1)
    g.font = `italic ${15 * k}px 'Cambria Math', 'Times New Roman', serif`
    g.textBaseline = 'middle'
    g.fillText('x', m.l + pw + 6 * k, Yf(0) - 14 * k)
    g.fillText('y', m.l + 10 * k, m.t - 16 * k)
    g.font = `${11 * k}px 'Cambria Math', 'Times New Roman', serif`
    g.textAlign = 'right'
    for (let y = Math.ceil(yLo); y <= Y_MAX; y++) {
      g.fillText(String(y).replace('-', '−'), m.l - 7 * k, Yf(y))
      g.fillRect(m.l - 3 * k, Yf(y) - 0.5, 6 * k, 1)
    }
    g.textAlign = 'center'
    g.textBaseline = 'top'
    const every = px * 4 < 34 * k ? 4 : 1
    for (let b = Math.ceil(x0 / 4) * 4; b <= xb; b += 4) {
      if ((b / 4) % every) continue
      g.fillText(String(b / 4 + 1), X(b), Yf(0) + 6 * k)
      g.fillRect(X(b) - 0.5, Yf(0) - 3 * k, 1, 6 * k)
    }
    g.textAlign = 'start'
    // sections as handwritten notes along the top
    g.font = `italic ${13 * k}px Georgia, serif`
    g.textBaseline = 'bottom'
    for (const [b, nm] of this.song.sections ?? []) {
      if (b < x0 - 8 || b > xb) continue
      g.fillStyle = '#8a8fa8'
      g.fillRect(X(b), m.t - 4 * k, 1, phh + 4 * k)
      g.fillStyle = '#5b6079'
      g.fillText(nm, X(b) + 5 * k, m.t - 6 * k)
    }
    // the functions, plotted up to the pen
    g.save()
    g.beginPath()
    g.rect(m.l, m.t - 10 * k, pw + 4 * k, phh + 20 * k)
    g.clip()
    const pens = []
    for (const t of this.tracks) {
      if (!t.graph || t.muted) continue
      const c = (t.ink ??= ink(t.color)), paths = this.curve(t, x0, x, X, Yf)
      g.strokeStyle = c
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.globalAlpha = 0.18
      g.lineWidth = (5 + 4 * t.lvl) * k
      this.drawPath(g, paths)
      g.stroke()
      g.globalAlpha = 1
      g.lineWidth = 2 * k
      this.drawPath(g, paths)
      g.stroke()
      const v = this.val(t, Math.round(x * GRID))
      if (v) for (const y of v) pens.push({ t, c, y: Yf(y) })
    }
    g.restore()
    for (const p of pens) {
      g.fillStyle = p.c
      g.globalAlpha = 0.25
      g.beginPath()
      g.arc(X(x), p.y, (5 + 7 * p.t.lvl) * k, 0, 6.29)
      g.fill()
      g.globalAlpha = 1
      g.beginPath()
      g.arc(X(x), p.y, 3.2 * k, 0, 6.29)
      g.fill()
    }
    // formulas pop up highlighted when their part enters, then fade
    if (o.formulas !== false) this.drawEntrances(g, o, X, Yf, k, m, portrait)
    // title block
    g.globalAlpha = 1
    g.fillStyle = '#1d1a2e'
    g.textBaseline = 'top'
    g.font = `${(portrait ? 40 : 22) * k}px Georgia, 'Times New Roman', serif`
    const titleY = (portrait ? 110 : 22) * k
    g.fillText(o.title ?? this.song.name, m.l - 40 * k, titleY)
    g.font = `italic ${(portrait ? 20 : 13) * k}px Georgia, serif`
    g.fillStyle = '#6b6f86'
    g.fillText(o.subtitle ?? `${this.song.bpm} BPM`, m.l - 40 * k, titleY + (portrait ? 54 : 28) * k)
    const sec = (this.song.sections ?? [])[this.section]?.[1]
    if (sec) {
      g.textAlign = 'right'
      g.fillText(`§ ${sec}`, W - m.r, titleY + (portrait ? 54 : 28) * k)
      g.textAlign = 'start'
    }
    // progress
    g.fillStyle = '#d8dce6'
    g.fillRect(m.l, H - 28 * k, pw, 3 * k)
    g.fillStyle = '#2b2a3a'
    g.fillRect(m.l, H - 28 * k, pw * Math.min(1, x / this.song.length), 3 * k)
    return { X, Bx, Yf, tl: 0 }
  }
  // Entering parts queue up; each formula gets its moment: fades in highlighted, holds, fades out.
  // Landscape: the band above the plot; portrait: the band under it. Two at most at a time.
  drawEntrances(g, o, X, Yf, k, m, portrait) {
    const HOLD = 4.2, FADE_IN = 0.45, FADE_OUT = 1.2
    this.queue ??= []
    for (const t of this.tracks) {
      if (t.formula && t.enteredAt != null && t.enteredT !== t.queuedT && this.formulaImgs.has(t.key) && !t.muted) {
        t.queuedT = t.enteredT
        if (!this.queue.some(q => q.t === t && !q.done)) this.queue.push({ t, start: null })
      }
    }
    // start the next ones when a slot is free (2 slots), staggered by half a second
    const showing = this.queue.filter(q => q.start != null && this.time - q.start < HOLD + FADE_OUT)
    for (const q of this.queue) {
      if (q.start != null || showing.length >= 2) continue
      const lastStart = Math.max(-1e9, ...this.queue.filter(x => x.start != null).map(x => x.start))
      if (this.time - lastStart < 0.6) break
      q.start = this.time
      q.slot = [0, 1].find(sl => !showing.some(x => x.slot === sl)) ?? 0
      showing.push(q)
    }
    this.queue = this.queue.filter(q => q.start == null || this.time - q.start < HOLD + FADE_OUT)
    const bandTop = portrait ? o.H - m.b + 40 * k : 70 * k, bandH = portrait ? m.b - 90 * k : m.t - bandTop - 34 * k
    const slotW = portrait ? o.W - 2 * m.r - 40 * k : (o.W - m.l - m.r) / 2 - 20 * k
    for (const q of showing) {
      const t = q.t, img = this.formulaImgs.get(t.key), age = this.time - q.start
      const a = Math.min(1, age / FADE_IN) * (age < HOLD ? 1 : Math.max(0, 1 - (age - HOLD) / FADE_OUT))
      if (a <= 0 || !img) continue
      const sh = portrait ? bandH / 2 - 26 * k : bandH - 20 * k
      const s = Math.min((slotW - 24 * k) / img.w, sh / img.h, 1.6 * k)
      const w = img.w * s, hgt = img.h * s
      const bx = portrait ? (o.W - w) / 2 : m.l + q.slot * (slotW + 40 * k) + 10 * k
      const by = portrait ? bandTop + q.slot * (bandH / 2) + 18 * k : bandTop + 16 * k
      const c = t.ink ?? (t.ink = ink(t.color)), glow = Math.max(0, 1 - age / 1.5)
      g.globalAlpha = a
      g.fillStyle = '#ffffff'
      g.strokeStyle = c
      g.lineWidth = (1.2 + 1.5 * glow) * k
      g.beginPath()
      g.roundRect(bx - 12 * k, by - 8 * k, w + 24 * k, hgt + 16 * k, 10 * k)
      g.fill()
      g.stroke()
      g.globalAlpha = a * (0.08 + 0.22 * glow)
      g.fillStyle = c
      g.fill()
      // a dotted leader from the box to the part's pen
      const v = this.val(t, Math.round(this.x * GRID))
      if (v) {
        g.globalAlpha = a * 0.4
        g.setLineDash([4 * k, 5 * k])
        g.beginPath()
        g.moveTo(bx + w / 2, portrait ? by - 8 * k : by + hgt + 8 * k)
        g.lineTo(X(this.x), Yf(v[0]))
        g.stroke()
        g.setLineDash([])
      }
      g.globalAlpha = a
      g.drawImage(img.img, bx, by, w, hgt)
      g.fillStyle = c
      g.font = `600 ${12 * k}px system-ui`
      g.textBaseline = 'bottom'
      g.fillText(t.key, bx - 8 * k, by - 11 * k)
    }
    g.globalAlpha = 1
  }

  // ---- space: ribbons flying at you -------------------------------------------------------------
  drawSpace(g, o) {
    const { W, H } = o, k = o.scale ?? 1, x = this.x, th = this.theme
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    const grd = g.createLinearGradient(0, 0, 0, H)
    grd.addColorStop(0, `hsl(${this.bgHue} ${th.sat}% 3%)`)
    grd.addColorStop(0.55, `hsl(${this.bgHue + 20} ${th.sat}% ${7 + 6 * this.energy}%)`)
    grd.addColorStop(1, `hsl(${this.bgHue + 40} ${th.sat}% 2%)`)
    g.fillStyle = grd
    g.fillRect(0, 0, W, H)
    const n = this.tracks.length, f = Math.min(W, H) * 0.9, horizon = H * 0.38
    if (o.scenery) sceneryBack(this, g, W, H, k, horizon)
    const depth = 1.4 // world units per beat
    const camY = 3.4, camZ = -9
    const proj = (wx, wy, wz) => {
      const z = wz - camZ
      if (z < 0.4) return null
      return [W / 2 + (wx * f) / z, horizon + ((camY - wy) * f) / z, z]
    }
    // stars streaming past
    g.globalCompositeOperation = 'lighter'
    const speed = (this.song.bpm / 60) * depth
    for (const s of this.stars3) {
      const z = ((s.z - this.time * speed * 0.5) % 80 + 80) % 80
      const p = proj(s.x, s.y + 4, z)
      if (!p) continue
      const a = Math.min(1, (80 - z) / 20) * 0.8
      g.fillStyle = `rgba(${th.star},${a})`
      const sz = Math.max(0.6, 30 / p[2]) * k
      g.fillRect(p[0], p[1], sz, sz)
    }
    // the floor grid: lanes and bars
    const lane = i => (i - (n - 1) / 2) * Math.min(1.5, 9 / Math.max(1, n))
    g.lineWidth = 1 * k
    for (let b = Math.ceil(x - 2); b <= x + 40; b++) {
      if (b % 4) continue
      const z = (b - x) * depth, p1 = proj(lane(0) - 1.4, -3.4, z), p2 = proj(lane(n - 1) + 1.4, -3.4, z)
      if (!p1 || !p2) continue
      g.strokeStyle = `rgba(${th.star},${0.25 * Math.max(0, 1 - z / 56)})`
      g.beginPath()
      g.moveTo(p1[0], p1[1])
      g.lineTo(p2[0], p2[1])
      g.stroke()
    }
    if (o.scenery) sceneryRoad(this, g, k, { proj, left: lane(0), right: lane(n - 1), depth, floor: -3.4 })
    // sections as gates
    for (const [b, nm] of this.song.sections ?? []) {
      const z = (b - x) * depth
      if (z < -1 || z > 56) continue
      const p1 = proj(lane(0) - 1.6, -3.4, z), p2 = proj(lane(n - 1) + 1.6, 5.5, z)
      if (!p1 || !p2) continue
      g.strokeStyle = th.accent
      g.globalAlpha = 0.5 * Math.max(0, 1 - z / 56)
      g.lineWidth = 2 * k
      g.strokeRect(p1[0], p2[1], p2[0] - p1[0], p1[1] - p2[1])
      g.fillStyle = th.accent
      g.font = `600 ${Math.max(9, 260 / p1[2]) * k}px system-ui`
      g.textBaseline = 'bottom'
      g.fillText(nm.toUpperCase(), p1[0] + 4 * k, p2[1] - 4 * k)
      g.globalAlpha = 1
    }
    // ribbons, far to near
    for (const t of this.tracks) {
      if (!t.graph) continue
      const lx = lane(t.i), paths = []
      let prev = null, cur = null
      for (let kk = Math.floor((x - 1.5) * GRID); kk <= Math.ceil((x + 40) * GRID); kk += 2) {
        if (kk < 0) continue
        const v = this.val(t, kk), z = (kk / GRID - x) * depth
        if (v) {
          const p = proj(lx, v[0], z)
          if (p && (!prev || Math.abs(prev - v[0]) < 1.2)) (cur ??= (paths.push([]), paths[paths.length - 1])).push(p)
          else cur = null
          prev = v[0]
        } else {
          cur = null
          prev = null
        }
      }
      const dim = t.muted ? 0.25 : 1
      g.strokeStyle = t.color
      g.lineJoin = 'round'
      for (const path of paths) {
        for (let i = 1; i < path.length; i++) {
          const [x1, y1, z1] = path[i - 1], [x2, y2] = path[i]
          const fade = Math.max(0, 1 - z1 / 58), w = Math.max(0.8, 26 / z1) * k
          g.globalAlpha = 0.15 * fade * dim
          g.lineWidth = w * 4
          g.beginPath()
          g.moveTo(x1, y1)
          g.lineTo(x2, y2)
          g.stroke()
          g.globalAlpha = 0.9 * fade * dim
          g.lineWidth = w
          g.stroke()
        }
      }
      const v = this.val(t, Math.round(x * GRID))
      if (v) {
        const p = proj(lx, v[0], 0)
        if (p) {
          const r = (4 + 10 * t.lvl) * k
          g.globalAlpha = 0.3 * dim
          g.fillStyle = t.color
          g.beginPath()
          g.arc(p[0], p[1], r * 2.4, 0, 6.29)
          g.fill()
          g.globalAlpha = dim
          g.beginPath()
          g.arc(p[0], p[1], r, 0, 6.29)
          g.fill()
          if (this.onsets.has(t) && o.fx !== false) this.burst(p[0], p[1], t.color, isDrum(t.key) ? 16 : 9, 1.2, k)
          if (o.labels !== false) {
            g.font = `${11 * k}px system-ui`
            g.textBaseline = 'middle'
            g.fillText(this.noteLabel(t), p[0] + r * 2.4 + 4 * k, p[1])
          }
        }
      }
    }
    // the playhead plane
    const a = proj(lane(0) - 1.6, -3.4, 0), b = proj(lane(n - 1) + 1.6, 5.5, 0)
    if (a && b) {
      g.globalAlpha = 0.18 + 0.2 * this.energy
      g.strokeStyle = '#fff'
      g.lineWidth = 1.5 * k
      g.strokeRect(a[0], b[1], b[0] - a[0], a[1] - b[1])
    }
    this.drawParticles(g, k)
    g.globalCompositeOperation = 'source-over'
    this.drawSectionTitle(g, W, H, k, 0.2)
    if (o.timeline !== false) this.drawTimeline(g, o, W, H, k)
    return null
  }
}
