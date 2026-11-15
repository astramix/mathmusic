// The app on http://localhost:5178 — Visualizer.bat / npm run app. The page is built fresh on every load,
// and my_songs/, generated/ (untouched 🎲 songs), songs/ ("write to the built-in songs") and exports/<kind>/ (every export: mp3/, wav/, video/…) are read and written by this server: no
// folder dialog, no permission prompts. Only this computer can reach it (127.0.0.1); a write needs the
// app's own header, which no other site can send (the browser would ask with a preflight we refuse),
// and only a plain file name inside the folder.
//   node viz/serve.js [--open] [--port 5178]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from './build.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const PORT = 5178
export const HEADER = 'x-mathmusic'
// what goes into exports/: each kind in its own folder
export const EXPORT_KINDS = ['mp3', 'wav', 'ogg', 'midi', 'stems', 'tuning', 'musicxml', 'code', 'video']
// a file the app may touch: a song or a folder's library.json (an exported file in exports/<kind>/), nothing with a path in it
const okName = (f, kind) => (kind.startsWith('export/') ? /^[\w-][\w.-]*\.(mp3|wav|ogg|mid|zip|musicxml|js|mp4|webm)$/.test(f) : /^[\w-][\w.-]*\.js$/.test(f) || f === 'library.json')

export function serve({ port = PORT, root = ROOT, html = () => build({ quiet: true }) } = {}) {
  const dirs = { mine: path.join(root, 'my_songs'), gen: path.join(root, 'generated'), songs: path.join(root, 'songs') }
  for (const k of EXPORT_KINDS) dirs['export/' + k] = path.join(root, 'exports', k)
  const server = http.createServer(async (req, res) => {
    const send = (code, body = '', type = 'text/plain; charset=utf-8', extra = {}) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...extra })
      res.end(body)
    }
    try {
      // only http://localhost:<port> / 127.0.0.1 (a page of another site pointed here by DNS won't match)
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host ?? '')) return send(403, 'host')
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname === '/' && req.method === 'GET') return send(200, fs.readFileSync(await html()), 'text/html; charset=utf-8')
      if (url.pathname === '/api/hello') return send(200, JSON.stringify({ app: 'mathmusic' }), 'application/json')
      // the user's VST plugins (src/vst.js): GET /api/vst → the plugins (with their programs) and the local presets;
      // POST /api/vst/render { plugin, preset, program, notes: [[s, s, MIDI, vel]], seconds, sr } → float32 L then R (x-samples)
      if (url.pathname === '/api/vst' || url.pathname === '/api/vst/render') {
        if (req.headers[HEADER] !== '1') return send(403, 'header')
        const vst = await import('../src/vst.js')
        if (url.pathname === '/api/vst' && req.method === 'GET') {
          const plugins = []
          for (const p of vst.scanPlugins()) {
            let info = null
            if (p.hosted) try { info = await vst.pluginInfo(p) } catch {}
            plugins.push({ name: p.name, kind: p.kind, bits: p.bits, hosted: p.hosted && !!info, programs: info?.programs ?? [], synth: info?.synth ?? null })
          }
          return send(200, JSON.stringify({ host: process.platform === 'win32', plugins, presets: vst.listPresets(), kits: vst.listKits() }), 'application/json')
        }
        if (url.pathname === '/api/vst/render' && req.method === 'POST') {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const q = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          const { L, R } = q.kit ? vst.renderKit({ kit: q.kit, notes: q.notes ?? [], seconds: +q.seconds, sr: +q.sr || 44100 })
            : await vst.renderPart({ plugin: q.plugin, preset: q.preset ?? null, program: q.program ?? null, notes: q.notes ?? [], seconds: +q.seconds, sr: +q.sr || 44100 })
          const n = Math.min(L.length, Math.ceil(+q.seconds * (+q.sr || 44100))), out = new Float32Array(2 * n)
          out.set(L.subarray(0, n), 0)
          out.set(R.subarray(0, n), n)
          return send(200, Buffer.from(out.buffer), 'application/octet-stream', { 'x-samples': String(n) })
        }
        return send(405)
      }
      const m = url.pathname.match(/^\/api\/(mine|gen|songs|export\/(?:mp3|wav|ogg|midi|stems|tuning|musicxml|code|video))(?:\/([^/]+))?$/)
      if (!m) return send(404, 'not found')
      const dir = dirs[m[1]], name = m[2] && decodeURIComponent(m[2])
      if (req.headers[HEADER] !== '1') return send(403, 'header')
      if (!name) {
        if (req.method !== 'GET') return send(405)
        fs.mkdirSync(dir, { recursive: true })
        const list = fs.readdirSync(dir).filter(f => okName(f, m[1])).map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        return send(200, JSON.stringify(list), 'application/json')
      }
      if (!okName(name, m[1])) return send(400, 'name')
      const file = path.join(dir, name)
      if (req.method === 'GET') {
        if (!fs.existsSync(file)) return send(404, 'no file')
        return send(200, fs.readFileSync(file), 'text/plain; charset=utf-8', { 'x-mtime': String(fs.statSync(file).mtimeMs) })
      }
      if (req.method === 'PUT') {
        const chunks = []
        for await (const c of req) chunks.push(c)
        fs.mkdirSync(dir, { recursive: true })
        // ?append=1: the next piece of a large file (a video comes in 16 MB pieces)
        if (url.searchParams.get('append') === '1') fs.appendFileSync(file, Buffer.concat(chunks))
        else fs.writeFileSync(file, Buffer.concat(chunks))
        return send(204)
      }
      if (req.method === 'DELETE') {
        if (!fs.existsSync(file)) return send(404, 'no file')
        fs.rmSync(file)
        return send(204)
      }
      send(405)
    } catch (e) {
      console.error(e)
      send(500, String(e?.message ?? e))
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

const openBrowser = url => exec(process.platform === 'win32' ? `start "" "${url}"` : `${process.platform === 'darwin' ? 'open' : 'xdg-open'} "${url}"`)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
  const port = +arg('--port', PORT), url = `http://localhost:${port}/`
  try {
    await serve({ port })
    console.log(`MathMusic работает: ${url}\nПесни сохраняются в ${path.join(ROOT, 'my_songs')}\nЗакрой это окно (или Ctrl+C), чтобы выключить.`)
  } catch (e) {
    if (e.code !== 'EADDRINUSE') throw e
    // already running (another double-click): just open the page
    const hello = await fetch(url + 'api/hello').then(r => r.json()).catch(() => null)
    if (hello?.app !== 'mathmusic') {
      console.error(`порт ${port} занят другой программой — запусти с --port 5179`)
      process.exit(1)
    }
    console.log(`MathMusic уже запущен: ${url}`)
    if (process.argv.includes('--open')) openBrowser(url)
    process.exit(0)
  }
  if (process.argv.includes('--open')) openBrowser(url)
}
