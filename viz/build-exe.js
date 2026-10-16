// npm run exe — builds MathMusic.exe next to "MathMusic Live.html": the page (viz/build.js), the icon (drawn
// here: a violet tile with two sines, the app's own picture) and the launcher viz/launcher.cs, compiled
// by the C# compiler that ships with Windows (.NET Framework 4) — nothing to install. The exe serves the
// page and my_songs\ itself, so whoever gets the folder needs no Node.js.
//   node viz/build-exe.js [--shortcut]   (--shortcut: a link on the desktop too)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from './build.js'
import { icon } from './icon.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const EXE = path.join(ROOT, 'MathMusic.exe')

export { icon } from './icon.js'

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
