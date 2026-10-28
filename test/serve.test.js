// The app's local servers — viz/serve.js (Node, Visualizer.bat), the one inside MathMusic.exe (C#, viz/launcher.cs)
// and the one inside MathMusic.apk (Java, android/src/…/Server.java) — read and write my_songs/ and generated/ (no
// folder dialog), and nothing else can: no other host, no request without the app's header, no path outside the
// folder. All three get the same checks.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { serve } from '../viz/serve.js'
import { compile } from '../viz/build-exe.js'
import { jdk, javac } from '../android/build-apk.js'
import { Library, serverFolder, setName } from '../viz/app/library.js'

async function check(root, port) {
  const base = `http://127.0.0.1:${port}`, H = { 'x-mathmusic': '1' }
  {
    assert.equal(await (await fetch(base + '/')).text(), '<p>app</p>')
    assert.equal((await (await fetch(base + '/api/hello')).json()).app, 'mathmusic')
    // no header (any other site's request), a path out of the folder, an odd file, another host
    assert.equal((await fetch(base + '/api/mine')).status, 403)
    assert.equal((await fetch(base + '/api/mine/..%2Fpackage.json', { headers: H })).status, 400)
    assert.equal((await fetch(base + '/api/mine/x.exe', { method: 'PUT', headers: H, body: 'x' })).status, 400)
    // (fetch won't send another Host: a plain request, as a page of evil.example → 127.0.0.1 would)
    const status = await new Promise(r => http.get({ port: port, host: '127.0.0.1', path: '/api/mine', headers: { ...H, host: 'evil.example' } }, res => { res.resume(); r(res.statusCode) }))
    assert.equal(status, 403)

    // the library on the server's folder: save, rename, remove — files in my_songs/
    const SONG = "export default { name: 'rain', bpm: 80, length: 16, tracks: {} }"
    const l = new Library({ songs: {} })
    await l.attach(serverFolder(base + '/api/mine', 'my_songs'), 'disk')
    const e = await l.save({ name: 'Дождь', source: setName(SONG, 'Дождь'), kind: 'user' })
    assert.equal(e.where, 'disk')
    assert.equal(fs.readFileSync(path.join(root, 'my_songs', 'Dozhd.js'), 'utf8'), setName(SONG, 'Дождь'))
    await l.save({ ...l.get(e.id), source: setName(SONG, 'Снег') })
    assert.deepEqual(fs.readdirSync(path.join(root, 'my_songs')).sort(), ['Sneg.js', 'library.json'])
    const again = new Library({ songs: {} })
    await again.attach(serverFolder(base + '/api/mine', 'my_songs'), 'disk')
    assert.equal(again.get(e.id).name, 'Снег')
    await again.remove(e.id)
    assert.deepEqual(fs.readdirSync(path.join(root, 'my_songs')), ['library.json'])

    // generated/: an untouched 🎲 song goes there, Ctrl+S moves it to my_songs/
    const gl = new Library({ songs: {} })
    await gl.attach(serverFolder(base + '/api/mine', 'my_songs'), 'disk', serverFolder(base + '/api/gen', 'generated'))
    const g = await gl.save({ name: 'Гроза', source: setName(SONG, 'Гроза'), kind: 'generated', pristine: true })
    assert.deepEqual(fs.readdirSync(path.join(root, 'generated')).sort(), ['Groza.js', 'library.json'])
    await gl.save({ ...gl.get(g.id), pristine: false })
    assert.deepEqual(fs.readdirSync(path.join(root, 'generated')), ['library.json'])
    assert.ok(fs.existsSync(path.join(root, 'my_songs', 'Groza.js')))
    assert.equal((await fetch(base + '/api/gen/..%2Fsongs%2Fx.js', { method: 'PUT', headers: H, body: 'x' })).status, 400)

    // videos/: a video in 16 MB pieces (the exe takes 64 MB a request at most), a free name the second time; no scripts there
    const bytes = new Uint8Array(20 << 20).map((_, i) => (i * 7) & 255), target = { server: true, api: base + '/api/video', name: 'videos' }
    assert.equal(await gl.writeVideo(target, 'rain-paper-9x16.mp4', new Blob([bytes])), 'videos/rain-paper-9x16.mp4')
    assert.ok(Buffer.from(bytes).equals(fs.readFileSync(path.join(root, 'videos', 'rain-paper-9x16.mp4'))))
    assert.equal(await gl.writeVideo(target, 'rain-paper-9x16.mp4', new Blob([bytes.slice(0, 10)])), 'videos/rain-paper-9x16-2.mp4')
    assert.equal((await fetch(base + '/api/video/x.js', { method: 'PUT', headers: H, body: 'x' })).status, 400)
  }
}

test('viz/serve.js: my_songs/ through the server, and only for the app', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-serve-'))
  const page = path.join(root, 'page.html')
  fs.writeFileSync(page, '<p>app</p>')
  const server = await serve({ port: 0, root, html: async () => page })
  try {
    await check(root, server.address().port)
  } finally {
    server.close()
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('MathMusic.exe builds and serves the same', { skip: process.platform !== 'win32' && 'Windows only' }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-exe-'))
  fs.writeFileSync(path.join(root, 'MathMusic Live.html'), '<p>app</p>')
  const exe = compile(path.join(root, 'MathMusic.exe'))
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)) }) })
  const child = spawn(exe, ['--serve', String(port)])
  try {
    for (let i = 0; i < 50 && !(await fetch(`http://127.0.0.1:${port}/api/hello`).then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100))
    await check(root, port)
  } finally {
    // the exe lets go of its folder only when it has exited (under load that takes a while): wait, then retry
    await new Promise(r => { if (child.exitCode != null) return r(); child.once('exit', r); child.kill(); setTimeout(r, 5000) })
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
  }
})

test('the server inside MathMusic.apk serves the same', { skip: !jdk() && 'no JDK' }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-apk-'))
  fs.writeFileSync(path.join(root, 'MathMusic Live.html'), '<p>app</p>')
  const classes = path.join(root, 'classes')
  const java = javac(classes)
  const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)) }) })
  const child = spawn(java, ['-cp', classes, 'com.astramix.mathmusic.Server', root, String(port)])
  try {
    for (let i = 0; i < 100 && !(await fetch(`http://127.0.0.1:${port}/api/hello`).then(r => r.ok, () => false)); i++) await new Promise(r => setTimeout(r, 100))
    await check(root, port)
  } finally {
    await new Promise(r => { if (child.exitCode != null) return r(); child.once('exit', r); child.kill(); setTimeout(r, 5000) })
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
  }
})
