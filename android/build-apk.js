// npm run apk — builds MathMusic.apk: the page of MathMusic.exe (viz/build.js without my_songs, plus android/bridge.js
// and a desktop-wide viewport) as assets/index.html, the icon of viz/icon.js in five densities, and the two Java
// classes in android/src — with the Android SDK's own tools (aapt2, javac, d8, zipalign, apksigner), no Gradle.
// Needs the Android SDK (ANDROID_HOME, else %LOCALAPPDATA%\Android\Sdk: a platform and build-tools) and a JDK 17+
// (JAVA_HOME, else the one inside Android Studio). Signed with ~/.mathmusic/release.jks, made on the first build —
// keep it: an update installs over the app only when signed with the same key.
//   node android/build-apk.js [--out MathMusic.apk] [--debug]   (--debug: debuggable, the WebView open to chrome://inspect)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from '../viz/build.js'
import { drawIcon, png } from '../viz/icon.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HERE = path.join(ROOT, 'android')
export const APK = path.join(ROOT, 'MathMusic.apk')
const exe = f => (process.platform === 'win32' ? f + '.exe' : f)
const bat = f => (process.platform === 'win32' ? f + '.bat' : f)

// ---- the tools -----------------------------------------------------------------------------------------------
export function jdk() {
  const homes = [process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr', '/Applications/Android Studio.app/Contents/jbr/Contents/Home', '/opt/android-studio/jbr']
  return homes.find(h => h && fs.existsSync(path.join(h, 'bin', exe('javac')))) ?? null
}

function sdk() {
  const dir = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'), path.join(os.homedir(), 'Android', 'Sdk')].find(d => d && fs.existsSync(d))
  if (!dir) throw new Error('Android SDK not found: set ANDROID_HOME')
  const newest = (sub, ok) => fs.readdirSync(path.join(dir, sub)).filter(ok).sort((a, b) => parseFloat(b.replace(/^\D+/, '')) - parseFloat(a.replace(/^\D+/, '')))[0]
  const tools = newest('build-tools', v => fs.existsSync(path.join(dir, 'build-tools', v, exe('aapt2'))))
  const platform = newest('platforms', v => fs.existsSync(path.join(dir, 'platforms', v, 'android.jar')))
  if (!tools || !platform) throw new Error('Android SDK: no build-tools or platform installed')
  return { bt: path.join(dir, 'build-tools', tools), jar: path.join(dir, 'platforms', platform, 'android.jar') }
}

function run(cmd, args, opts = {}) {
  // a .bat goes through cmd.exe as one line: quote what has spaces
  const shell = /\.bat$/.test(cmd), q = a => (/\s/.test(a) ? `"${a}"` : a)
  const r = shell ? spawnSync([cmd, ...args].map(q).join(' '), { encoding: 'utf8', shell, ...opts }) : spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} failed:\n${r.stdout ?? ''}${r.stderr ?? r.error ?? ''}`)
  return r.stdout
}

const javaFiles = dir => fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.java')).map(f => path.join(dir, f))
const classFiles = dir => fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.class')).map(f => path.join(dir, f))

// the Java sources → .class files: all of them against android.jar, or (no android.jar) Server alone — plain Java,
// test/serve.test.js runs it on the desktop JVM. → the java to run it with
export function javac(out, { android } = {}) {
  const home = jdk()
  if (!home) throw new Error('JDK not found: set JAVA_HOME (17 or later)')
  const files = android ? javaFiles(path.join(HERE, 'src')) : [path.join(HERE, 'src', 'com', 'astramix', 'mathmusic', 'Server.java')]
  run(path.join(home, 'bin', exe('javac')), ['--release', '11', '-encoding', 'UTF-8', '-nowarn', '-d', out, ...(android ? ['-classpath', android] : []), ...files])
  return path.join(home, 'bin', exe('java'))
}

// ---- the page ----------------------------------------------------------------------------------------------
// the exe's page, laid out 1600 px wide as in a desktop window (narrower, the menu bar overlaps; the WebView shows it
// whole and zooms), the download bridge before its scripts
async function page() {
  const html = fs.readFileSync(await build({ quiet: true, mine: false }), 'utf8')
  await build({ quiet: true }) // MathMusic Live.html back as `npm run viz` makes it (with my_songs)
  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1">'
  if (!html.includes(viewport)) throw new Error('viz/template.html: the viewport line changed — update android/build-apk.js')
  return html.replace(viewport, `<meta name="viewport" content="width=1600">\n<script>${fs.readFileSync(path.join(HERE, 'bridge.js'), 'utf8')}</script>`)
}

// ---- the key -------------------------------------------------------------------------------------------------
function keystore(keytool) {
  const dir = path.join(os.homedir(), '.mathmusic'), ks = path.join(dir, 'release.jks')
  const pass = process.env.MATHMUSIC_KEY_PASS ?? 'mathmusic'
  if (!fs.existsSync(ks)) {
    fs.mkdirSync(dir, { recursive: true })
    run(keytool, ['-genkeypair', '-keystore', ks, '-alias', 'mathmusic', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
      '-storepass', pass, '-keypass', pass, '-dname', 'CN=Astramix, O=MathMusic'])
    console.log('signing key →', ks, '(keep it: updates must be signed with it)')
  }
  return { ks, pass }
}

// ---- the APK -------------------------------------------------------------------------------------------------
export async function buildApk(out = APK, { debug = false } = {}) {
  const { bt, jar } = sdk(), home = jdk()
  if (!home) throw new Error('JDK not found: set JAVA_HOME (17 or later)')
  // d8 and apksigner are Java programs: the same JDK for them
  const env = { ...process.env, JAVA_HOME: home, PATH: path.join(home, 'bin') + path.delimiter + process.env.PATH }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathmusic-apk-'))
  try {
    const d = (...p) => path.join(tmp, ...p)
    // resources: the launcher icon in mdpi … xxxhdpi
    for (const [dpi, n] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
      fs.mkdirSync(d('res', `mipmap-${dpi}`), { recursive: true })
      fs.writeFileSync(d('res', `mipmap-${dpi}`, 'ic_launcher.png'), png(n, drawIcon(n)))
    }
    fs.mkdirSync(d('flat'))
    run(path.join(bt, exe('aapt2')), ['compile', '--dir', d('res'), '-o', d('flat', 'res.zip')])
    fs.mkdirSync(d('assets'))
    fs.writeFileSync(d('assets', 'index.html'), await page())
    run(path.join(bt, exe('aapt2')), ['link', '-o', d('base.apk'), '-I', jar, '--manifest', path.join(HERE, 'AndroidManifest.xml'),
      '-A', d('assets'), ...(debug ? ['--debug-mode'] : []), d('flat', 'res.zip')])
    // code: javac → d8 → classes.dex, added to the APK as it is (aapt add keeps resources.arsc stored, as Android 11+ wants)
    fs.mkdirSync(d('classes'))
    javac(d('classes'), { android: jar })
    fs.mkdirSync(d('dex'))
    run(path.join(bt, bat('d8')), ['--release', '--min-api', '30', '--lib', jar, '--output', d('dex'), ...classFiles(d('classes'))], { env })
    run(path.join(bt, exe('aapt')), ['add', d('base.apk'), 'classes.dex'], { cwd: d('dex') })
    run(path.join(bt, exe('zipalign')), ['-f', '-p', '4', d('base.apk'), d('aligned.apk')])
    const { ks, pass } = keystore(path.join(home, 'bin', exe('keytool')))
    run(path.join(bt, bat('apksigner')), ['sign', '--v4-signing-enabled', 'false', '--ks', ks, '--ks-pass', `pass:${pass}`, '--key-pass', `pass:${pass}`, '--out', out, d('aligned.apk')], { env })
    run(path.join(bt, bat('apksigner')), ['verify', out], { env })
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return out
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out')
  const out = await buildApk(i > 0 ? path.resolve(process.argv[i + 1]) : APK, { debug: process.argv.includes('--debug') })
  console.log(`MathMusic.apk → ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`)
}
