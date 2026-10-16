// npm run exe — builds MathMusic.exe next to "MathMusic Live.html": the page (viz/build.js), the icon (drawn
// here: a violet tile with two sines, the app's own picture) and the launcher viz/launcher.cs, compiled
// by the C# compiler that ships with Windows (.NET Framework 4) — nothing to install. The exe serves the
// page and my_songs\ itself, so whoever gets the folder needs no Node.js.
//   node viz/build-exe.js [--shortcut]   (--shortcut: a link on the desktop too)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from './build.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const EXE = path.join(ROOT, 'MathMusic.exe')

// ---- the icon --------------------------------------------------------------------------------------------
// coverage of one pixel of an n×n icon, 4×4 samples: rounded tile, gradient, a gold sine and a lilac one
function drawIcon(n) {
  const px = new Uint8Array(n * n * 4), S = 4
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
  const top = [124, 77, 255], bottom = [26, 16, 72], gold = [255, 212, 121], lilac = [214, 200, 255]
  const curves = [
    { f: u => 0.5 - 0.2 * Math.sin(2 * Math.PI * (u - 0.125)), d: u => -0.4 * Math.PI * Math.cos(2 * Math.PI * (u - 0.125)), w: 0.055, c: gold },
    { f: u => 0.56 + 0.1 * Math.sin(6 * Math.PI * u), d: u => 0.6 * Math.PI * Math.cos(6 * Math.PI * u), w: 0.032, c: lilac },
  ]
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let r = 0, g = 0, b = 0, a = 0
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const u = (x + (sx + 0.5) / S) / n, v = (y + (sy + 0.5) / S) / n
      // rounded square, margin 3 %, radius 22 %
      const m = 0.03, rad = 0.22, qx = Math.max(Math.abs(u - 0.5) - (0.5 - m - rad), 0), qy = Math.max(Math.abs(v - 0.5) - (0.5 - m - rad), 0)
      if (Math.hypot(qx, qy) > rad) continue
      let col = mix(top, bottom, v)
      for (const c of curves) {
        if (u < 0.14 || u > 0.86) continue
        const dist = Math.abs(v - c.f(u)) / Math.hypot(1, c.d(u)) // distance to the curve, to first order
        if (dist < c.w / 2) col = c.c
        else if (dist < c.w * 1.6) col = mix(col, c.c, 0.25 * (1 - (dist - c.w / 2) / (c.w * 1.1))) // glow
      }
      r += col[0]; g += col[1]; b += col[2]; a++
    }
    const i = (y * n + x) * 4, k = S * S
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = (255 * a) / k }
  }
  return px
}
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = buf => { let c = ~0; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return ~c >>> 0 }
function png(n, px) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data])
    len.writeUInt32BE(data.length)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  const raw = Buffer.alloc(n * (n * 4 + 1))
  for (let y = 0; y < n; y++) Buffer.from(px.buffer, y * n * 4, n * 4).copy(raw, y * (n * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
// .ico with PNG images inside (Windows Vista and later)
export function icon(sizes = [16, 24, 32, 48, 64, 128, 256]) {
  const imgs = sizes.map(s => png(s, drawIcon(s)))
  const head = Buffer.alloc(6 + 16 * sizes.length)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(sizes.length, 4)
  let at = head.length
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i
    head[e] = s & 255; head[e + 1] = s & 255 // 256 is written as 0
    head.writeUInt16LE(1, e + 4)
    head.writeUInt16LE(32, e + 6)
    head.writeUInt32LE(imgs[i].length, e + 8)
    head.writeUInt32LE(at, e + 12)
    at += imgs[i].length
  })
  return Buffer.concat([head, ...imgs])
}

// ---- the exe ------------------------------------------------------------------------------------------------
export function compile(out = EXE) {
  const win = process.env.WINDIR ?? 'C:\\Windows'
  const csc = ['Framework64', 'Framework'].map(f => path.join(win, 'Microsoft.NET', f, 'v4.0.30319', 'csc.exe')).find(f => fs.existsSync(f))
  if (!csc) throw new Error('C# compiler (.NET Framework 4) not found — MathMusic.exe is built on Windows')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathmusic-exe-'))
  try {
    const ico = path.join(tmp, 'MathMusic.ico')
    fs.writeFileSync(ico, icon())
    const r = spawnSync(csc, ['/nologo', '/target:winexe', '/optimize', '/codepage:65001', `/win32icon:${ico}`, `/out:${out}`,
      '/reference:System.Windows.Forms.dll', path.join(ROOT, 'viz', 'launcher.cs')], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('csc failed:\n' + r.stdout + r.stderr)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return out
}

function desktopShortcut() {
  const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\MathMusic.lnk');` +
    `$s.TargetPath='${EXE}';$s.WorkingDirectory='${ROOT}';$s.IconLocation='${EXE},0';$s.Save()`
  spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build({ mine: false })
  console.log('MathMusic.exe →', compile())
  if (process.argv.includes('--shortcut')) desktopShortcut()
}
