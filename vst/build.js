// Builds the VST hosts from vst/vsthost.cs with Windows' own C# compiler (.NET Framework 4, C# 5 — no SDK needed):
// vst/bin/vsthost32.exe (x86: 32-bit plugins load directly) and vst/bin/vsthost64.exe (x64).   npm run vst
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url)), BIN = path.join(DIR, 'bin')
export function cscPath() {
  const win = process.env.WINDIR || 'C:\\Windows'
  return ['Framework64', 'Framework'].map(f => path.join(win, 'Microsoft.NET', f, 'v4.0.30319', 'csc.exe')).find(f => fs.existsSync(f)) ?? null
}
// → { 32: path, 64: path } (built when missing or older than the source)
export function buildHosts({ force = false, quiet = false } = {}) {
  const src = path.join(DIR, 'vsthost.cs'), out = { 32: path.join(BIN, 'vsthost32.exe'), 64: path.join(BIN, 'vsthost64.exe') }
  const csc = cscPath()
  if (!csc) throw new Error('C# compiler (.NET Framework 4) not found — the VST host is built on Windows')
  fs.mkdirSync(BIN, { recursive: true })
  for (const [bits, file] of Object.entries(out)) {
    if (!force && fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(src).mtimeMs) continue
    const r = spawnSync(csc, ['/nologo', `/platform:${bits === '32' ? 'x86' : 'x64'}`, '/optimize', '/codepage:65001', `/out:${file}`, src], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('csc failed:\n' + r.stdout + r.stderr)
    if (!quiet) console.log(`vsthost${bits}.exe → ${file}`)
  }
  return out
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildHosts({ force: process.argv.includes('--force') })
