// The song library: the built-in songs (songs/*.js) and your own — edited copies, generated songs,
// imported files — kept as files in the project's my_songs/ folder. Both folders are embedded at build
// time, so the page shows every song at once. Started by Visualizer.bat the page comes from viz/serve.js,
// which reads and writes the folder itself (serverFolder: no dialogs). Opened as a file (or from a
// website) the page needs the folder from the browser (File System Access: chosen once, the handle is
// remembered — the browser may ask to allow it again in a new session). my_songs/library.json keeps what the code can't say: id, kind, untouched flag, dates.
// A song saved while the folder isn't connected (or in a browser without File System Access) waits in
// IndexedDB and moves into the folder as soon as it is. Tabs of the app see each other's changes
// (a ping through localStorage). Writing a copy into songs/ (render.js / Ableton) stays as it was.
const DB = 'mathmusic', STORE = 'songs', META = 'meta', PING = 'mm.lib', DIR = 'my_songs', GEN = 'generated', INDEX = 'library.json'
const RW = { mode: 'readwrite' }

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore(STORE, { keyPath: 'id' })
      r.result.createObjectStore(META)
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
const tx = (db, store, mode, f) => new Promise((resolve, reject) => {
  const t = db.transaction(store, mode), s = t.objectStore(store), r = f(s)
  t.oncomplete = () => resolve(r?.result)
  t.onerror = () => reject(t.error)
})

// ---- names ---------------------------------------------------------------------------------------------
// The song's own object: from `export default {` on (a `name:` before it belongs to something else); a copy in
// another mode is `export default __retuneSong({ … })` (src/retune.js)
const songPart = source => Math.max(0, source.search(/export\s+default\s*(?:__retuneSong\(\s*)?\{/))
const NAME = /\bname\s*:\s*(['"`])([^'"`\n]*)\1/

// a song's display name from its source (export default { name: '…' }), or fallback
export const nameIn = (source, fallback = 'song') => source.slice(songPart(source)).match(NAME)?.[2] || fallback

// the song's style (export default { style: 'lofi' }), or null
export const styleIn = source => source.slice(songPart(source)).match(/\bstyle\s*:\s*(['"])([\w-]+)\1/)?.[2] ?? null

// \n line ends, as CodeMirror gives them
export const lf = s => String(s).replace(/\r\n?/g, '\n')

// a name as it can stand in the code: no quotes, backslashes or line breaks
export const cleanName = name => String(name).replace(/['"`\\\n\r]/g, '').replace(/\s+/g, ' ').trim()

// the source with the song's name set (added after `export default {` when it has none)
export function setName(source, name) {
  const at = songPart(source), head = source.slice(0, at), body = source.slice(at), n = cleanName(name)
  if (NAME.test(body)) return head + body.replace(NAME, (_, q) => `name: ${q}${n}${q}`)
  return head + body.replace(/export\s+default\s*\{/, m => `${m} name: '${n}',`)
}

// a file name for a song name: Cyrillic → Latin, anything else odd → _ ('Ночной дождь' → 'Nochnoy_dozhd')
const RU = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }
export function fileName(name) {
  const lat = [...String(name)].map(c => {
    const l = c.toLowerCase(), r = RU[l]
    if (r == null) return c
    return c === l || !r ? r : r[0].toUpperCase() + r.slice(1)
  }).join('')
  return lat.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'song'
}

// an entry of my_songs/ (or generated/) from its file and what that folder's library.json says about it (a file
// put there by hand gets an id from its name; a generator's song is known by its `generator:` field; a file in
// generated/ is an untouched generated song)
export function fromFile(file, source, mtime, index = {}, shelf = 'mine') {
  const m = index[file] ?? {}, stem = file.replace(/\.js$/, ''), gen = shelf === 'gen'
  source = lf(source)
  return {
    id: m.id ?? (gen ? 'gen:' : 'mine:') + stem, file, name: nameIn(source, stem), source,
    kind: m.kind ?? (gen || /\bgenerator\s*:/.test(source.slice(songPart(source))) ? 'generated' : 'user'),
    pristine: m.pristine ?? gen, base: m.base, meta: m.meta,
    created: m.created ?? mtime, updated: m.updated ?? mtime, where: 'disk', shelf,
  }
}
// where a song lives: one the app made and nobody saved yet (pristine: a 🎲 song, a copy in another mode) in
// generated/, the rest in my_songs/ — Ctrl+S, rename or duplicate (pristine: false) moves it over
export const shelfOf = e => (e.pristine === true && e.kind !== 'builtin' ? 'gen' : 'mine')
// the file for a song: its old one while the name still fits it, else <name>.js or the first free <name>-N.js
export function fileFor(name, old, taken) {
  const stem = fileName(name)
  if (old && (old === stem + '.js' || new RegExp(`^${stem}-\\d+\\.js$`).test(old))) return old
  let file = stem + '.js', i = 2
  while (taken.has(file)) file = `${stem}-${i++}.js`
  return file
}

// a folder of viz/serve.js that looks like a File System Access directory handle (the same calls)
export function serverFolder(api, name) {
  const H = { 'x-mathmusic': '1' }, url = f => `${api}/${encodeURIComponent(f)}`
  const missing = f => Object.assign(new Error(f), { name: 'NotFoundError' })
  const ok = async (r, f) => {
    if (r.status === 404) throw missing(f)
    if (!r.ok) throw new Error(`${name}/${f}: ${r.status} ${await r.text()}`)
    return r
  }
  const file = (f, mtime) => ({
    kind: 'file',
    async getFile() {
      const r = await ok(await fetch(url(f), { headers: H }), f), text = await r.text()
      return { text: async () => text, lastModified: +r.headers.get('x-mtime') || mtime || Date.now() }
    },
    async createWritable() {
      let body = ''
      return { write: async t => { body += t }, close: async () => { await ok(await fetch(url(f), { method: 'PUT', headers: H, body }), f) } }
    },
  })
  return {
    kind: 'directory', name, server: true,
    async *entries() {
      const list = await (await ok(await fetch(api, { headers: H }), '')).json()
      for (const { name: f, mtime } of list) yield [f, file(f, mtime)]
    },
    async getFileHandle(f, { create = false } = {}) {
      if (!create) await ok(await fetch(url(f), { headers: H }), f) // there, or NotFoundError
      return file(f)
    },
    async removeEntry(f) { await ok(await fetch(url(f), { method: 'DELETE', headers: H }), f) },
    queryPermission: async () => 'granted', requestPermission: async () => 'granted',
  }
}
// the page came from viz/serve.js (Visualizer.bat): it saves through it
async function onServer() {
  if (typeof location === 'undefined' || !location.protocol.startsWith('http')) return false
  try { return (await (await fetch('/api/hello')).json()).app === 'mathmusic' } catch { return false }
}

// one folder of songs with its library.json (id, kind, untouched flag, dates — what the code can't say)
class Shelf {
  constructor(key, name) {
    this.key = key // 'mine' | 'gen'
    this.name = name // 'my_songs' | 'generated'
    this.dir = null
  }
  async files() {
    const out = new Map()
    for await (const [name, h] of this.dir.entries()) out.set(name, h)
    return out
  }
  async readIndex() {
    try {
      const j = JSON.parse(await (await (await this.dir.getFileHandle(INDEX)).getFile()).text())
      return j?.songs && typeof j.songs === 'object' ? j.songs : {}
    } catch { return {} }
  }
  async writeIndex(index, files) {
    const songs = {}
    for (const f of Object.keys(index).sort()) if (files.has(f)) songs[f] = index[f]
    const w = await (await this.dir.getFileHandle(INDEX, { create: true })).createWritable()
    await w.write(JSON.stringify({ format: this.key === 'gen' ? 'mathmusic-generated' : 'mathmusic-my-songs', version: 1, songs }, null, 1) + '\n')
    await w.close()
  }
  // every song in the folder now
  async read() {
    const index = await this.readIndex(), out = []
    for (const [file, h] of await this.files()) {
      if (h.kind !== 'file' || !file.endsWith('.js')) continue
      const f = await h.getFile()
      out.push(fromFile(file, await f.text(), f.lastModified, index, this.key))
    }
    return out
  }
  // writes the song's file (a renamed song moves to its new file) and its line in library.json
  async write(e) {
    const index = await this.readIndex(), files = await this.files()
    const old = Object.keys(index).find(f => index[f].id === e.id && files.has(f)) ?? ((e.shelf ?? 'mine') === this.key && e.file && files.has(e.file) ? e.file : null)
    const taken = new Set([...files.keys()].filter(f => f !== old))
    const file = fileFor(e.name, old, taken)
    const w = await (await this.dir.getFileHandle(file, { create: true })).createWritable()
    await w.write(e.source)
    await w.close()
    files.set(file, true)
    if (old && old !== file) {
      await this.dir.removeEntry(old).catch(() => {})
      files.delete(old)
      delete index[old]
    }
    index[file] = { id: e.id, kind: e.kind, pristine: e.pristine, base: e.base, meta: e.meta, created: e.created, updated: e.updated }
    await this.writeIndex(index, files)
    const { where, ...rest } = e
    return { ...rest, file, where: 'disk', shelf: this.key }
  }
  // the song's file and its line go
  async remove(id, file) {
    const index = await this.readIndex(), files = await this.files()
    for (const f of Object.keys(index)) if (index[f].id === id) { await this.dir.removeEntry(f).catch(() => {}); files.delete(f) }
    if (file && files.has(file)) { await this.dir.removeEntry(file).catch(() => {}); files.delete(file) }
    await this.writeIndex(index, files)
  }
}

export class Library {
  constructor(SRC) {
    this.SRC = SRC
    this.user = new Map()
    this.db = null
    this.shelves = { mine: new Shelf('mine', DIR), gen: new Shelf('gen', GEN) }
    this.stored = null // the remembered my_songs/ handle, before the browser allows it again
    this.storedGen = null // …and generated/ (only when the project folder was chosen: a page can't reach a sibling)
    this.denied = false // the browser said no this session: don't keep asking on every keystroke
    this.server = false // the page came from viz/serve.js or the exe: my_songs/, generated/ and songs/ go through it
    this.beforePick = async () => true // the app explains the folder dialog before it opens the first time
    this.listeners = new Set()
    // the folders as they were at build time — shown before (or without) the folders themselves
    for (const [files, index, shelf] of [[SRC.mine, SRC.mineIndex, 'mine'], [SRC.gen, SRC.genIndex, 'gen']]) {
      for (const [file, { source, mtime }] of Object.entries(files ?? {})) {
        const e = fromFile(file, source, mtime, index?.songs ?? {}, shelf)
        this.user.set(e.id, e)
      }
    }
  }
  get dir() { // my_songs/, connected and writable
    return this.shelves.mine.dir
  }
  get genDir() { // generated/, connected and writable (null: generated songs wait in the browser)
    return this.shelves.gen.dir
  }
  get canConnect() {
    return this.server || (typeof window !== 'undefined' && !!window.showDirectoryPicker)
  }
  get pending() {
    return [...this.user.values()].filter(e => e.where === 'pending')
  }
  async init() {
    try {
      this.db = await idb()
    } catch (e) {
      console.warn('no IndexedDB', e)
    }
    try {
      // songs waiting for the folder (and the songs of older versions, which all lived here)
      if (this.db) for (const e of (await tx(this.db, STORE, 'readonly', s => s.getAll())) ?? []) this.user.set(e.id, { ...e, source: lf(e.source), where: 'pending' })
      if ((this.server = await onServer())) {
        await this.attach(serverFolder('/api/mine', DIR), 'disk', serverFolder('/api/gen', GEN))
      } else {
        const dir = await this.getMeta('mineDir'), gen = await this.getMeta('genDir')
        if (dir && (await dir.queryPermission(RW)) === 'granted') await this.attach(dir, 'disk', gen && (await gen.queryPermission(RW)) === 'granted' ? gen : null)
        else (this.stored = dir ?? null), (this.storedGen = gen ?? null)
      }
    } catch (e) {
      console.warn('my_songs/ not read: songs saved now wait in this browser', e)
    }
    // another tab saved or removed a song: read it again
    addEventListener('storage', async ev => {
      if (ev.key !== PING || !ev.newValue) return
      let id
      try { id = JSON.parse(ev.newValue).id } catch { return }
      if (!this.dir && this.stored && (await this.stored.queryPermission(RW).catch(() => '')) === 'granted') return this.attach(this.stored, 'tab', this.storedGen)
      if (this.dir) return this.reload('tab')
      if (!this.db) return
      const e = await tx(this.db, STORE, 'readonly', s => s.get(id)).catch(() => undefined)
      if (e) this.user.set(id, { ...e, where: 'pending' })
      else if (this.user.get(id)?.where === 'pending') this.user.delete(id)
      else return
      this.emit(id, this.user.get(id) ?? null, 'tab')
    })
  }
  // fn(id, entry | null, remote) after every save / removal; remote: 'tab' (another tab of the app),
  // 'disk' (a folder had something newer than the page) or false (here)
  on(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  emit(id, entry, remote = false) {
    for (const fn of this.listeners) {
      try { fn(id, entry, remote) } catch (e) { console.error(e) }
    }
  }
  ping(id) {
    try { localStorage.setItem(PING, JSON.stringify({ id, t: Date.now(), r: Math.random() })) } catch {}
  }

  // the built-in songs, then my_songs/, then generated/ (each newest first)
  list() {
    const built = Object.keys(this.SRC.songs).sort().map(n => ({ id: 'builtin:' + n, name: n, kind: 'builtin', source: this.SRC.songs[n] }))
    const newest = (a, b) => (b.updated ?? 0) - (a.updated ?? 0), all = [...this.user.values()]
    return [...built, ...all.filter(e => shelfOf(e) === 'mine').sort(newest), ...all.filter(e => shelfOf(e) === 'gen').sort(newest)]
  }
  get(id) {
    if (id?.startsWith('builtin:')) {
      const n = id.slice(8)
      return this.SRC.songs[n] != null ? { id, name: n, kind: 'builtin', source: this.SRC.songs[n] } : null
    }
    return this.user.get(id) ?? null
  }
  // the name, or the name with " 2", " 3"… when another song already has it
  uniqueName(name, exceptId = null) {
    const taken = new Set(this.list().filter(e => e.id !== exceptId).map(e => e.name.toLowerCase()))
    let n = cleanName(name) || 'song', i = 1
    const base = n.replace(/ \d+$/, '')
    while (taken.has(n.toLowerCase())) n = `${base} ${++i}`
    return n
  }

  // ---- the folders -----------------------------------------------------------------------------------
  // → true when my_songs/ is writable. With a remembered folder the browser just asks to allow it again;
  // pick: true (an explicit action) opens the folder dialog when there is none — the project folder (then
  // my_songs/ and generated/ are made in it when they aren't there yet) or my_songs/ itself (then generated
  // songs wait in the browser: a page can't reach the folder next to it).
  // Both need a click or a key: without one the browser refuses and the song waits in IndexedDB.
  // fresh: choose another folder (the one connected now stays if the dialog is cancelled).
  // The first time the dialog starts in Documents (a page can't point it at a path).
  async connect({ pick = false, fresh = false } = {}) {
    if (this.dir && (!fresh || this.server)) return true
    if (!this.canConnect || (this.denied && !pick)) return false
    try {
      let dir = fresh ? null : this.stored ?? (await this.getMeta('mineDir'))
      let gen = fresh ? null : this.storedGen ?? (await this.getMeta('genDir'))
      if (dir && (await dir.queryPermission(RW)) !== 'granted' && (await dir.requestPermission(RW)) !== 'granted') {
        this.denied = true
        dir = null
      }
      if (dir && gen && (await gen.queryPermission(RW)) !== 'granted' && (await gen.requestPermission(RW).catch(() => '')) !== 'granted') gen = null
      if (!dir) {
        if (!pick) return false
        if (!this.stored && !(await this.beforePick())) return false
        const chosen = await showDirectoryPicker({ id: 'mathmusic-my-songs', mode: 'readwrite', startIn: this.stored ?? 'documents' })
        dir = chosen.name === DIR ? chosen : await chosen.getDirectoryHandle(DIR, { create: true })
        gen = chosen.name === DIR ? null : await chosen.getDirectoryHandle(GEN, { create: true })
        await this.setMeta('mineDir', dir)
        await this.setMeta('genDir', gen)
      }
      this.denied = false
      await this.attach(dir, 'disk', gen)
      return true
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('my_songs/ not connected', e)
      if (!pick) this.denied = true
      return !!this.dir
    }
  }
  // my_songs/ (and generated/ when given) connected: read them, move the untouched generated songs that still sit
  // in my_songs/ (from before generated/ existed) over, write the songs that waited
  async attach(dir, remote, gen = undefined) {
    this.shelves.mine.dir = this.stored = dir
    if (gen !== undefined) this.shelves.gen.dir = this.storedGen = gen
    await this.reload(remote)
    await this.migrate()
    await this.flush()
  }
  async migrate() {
    if (!this.genDir || !this.dir) return
    for (const e of [...this.user.values()]) {
      if (e.where !== 'disk' || e.shelf !== 'mine' || shelfOf(e) !== 'gen') continue
      const moved = await this.shelves.gen.write(e)
      await this.shelves.mine.remove(e.id, e.file)
      this.user.set(e.id, moved)
      this.emit(e.id, moved)
    }
  }
  // the folders as they are now on disk (songs waiting to be written stay as they are; a folder not
  // connected keeps what the page had of it)
  async reload(remote = 'tab') {
    if (!this.dir) return
    const before = this.user, next = new Map()
    for (const shelf of Object.values(this.shelves)) {
      if (shelf.dir) for (const e of await shelf.read()) next.set(e.id, e)
      else for (const [id, e] of before) if (e.where === 'disk' && (e.shelf ?? 'mine') === shelf.key) next.set(id, e)
    }
    for (const [id, e] of before) if (e.where === 'pending') next.set(id, e)
    this.user = next
    for (const [id, e] of next) {
      const o = before.get(id)
      if (!o || o.source !== e.source || o.name !== e.name) this.emit(id, e, remote)
    }
    for (const id of before.keys()) if (!next.has(id)) this.emit(id, null, remote)
  }
  // the songs that waited go into their folder (one already there with the same code is just dropped)
  async flush() {
    for (const e of this.pending) {
      if (!this.shelves[shelfOf(e)].dir) continue
      const twin = [...this.user.values()].find(x => x.where === 'disk' && x.id !== e.id && x.source === e.source)
      if (twin) {
        this.user.delete(e.id)
        await this.forget(e.id)
        this.emit(e.id, null)
        continue
      }
      const saved = await this.write(e)
      this.user.set(saved.id, saved)
      await this.forget(e.id)
      this.emit(saved.id, saved)
    }
  }
  async forget(id) {
    if (this.db) await tx(this.db, STORE, 'readwrite', s => s.delete(id)).catch(() => {})
  }
  // into its folder (generated/ or my_songs/), and out of the other one when it moved (Ctrl+S on a generated
  // song); null when that folder isn't connected
  async write(e) {
    const to = this.shelves[shelfOf(e)]
    if (!to.dir) return null
    const saved = await to.write(e)
    const from = e.where === 'disk' && e.file && (e.shelf ?? 'mine') !== to.key ? this.shelves[e.shelf ?? 'mine'] : null
    if (from?.dir) await from.remove(e.id, e.file)
    return saved
  }

  // entry: { id?, name, source, kind: 'user' | 'generated', meta?, pristine? } → the saved entry, with
  // where: 'disk' (in its folder) or 'pending' (waits in IndexedDB for the folder), shelf: 'mine' | 'gen'.
  // pristine: a generated song nobody has saved, renamed or copied — it lives in generated/ and the
  // generator may tidy it away; saving it (pristine: false) moves it to my_songs/.
  // pick: true — an explicit save, which may open the folder dialog
  async save(entry, { pick = false } = {}) {
    const now = Date.now()
    const e = { ...entry, id: entry.id && !entry.id.startsWith('builtin:') ? entry.id : 'user:' + now.toString(36) + Math.random().toString(36).slice(2, 6), created: entry.created ?? now, updated: now }
    e.source = lf(e.source) // as the editor has it: a file from Windows must not look edited at once
    e.name = nameIn(e.source, e.name)
    let saved = null
    if (await this.connect({ pick })) {
      try {
        saved = await this.write(e)
        if (saved) await this.forget(e.id)
      } catch (err) {
        console.warn(`could not write to ${this.shelves[shelfOf(e)].name}/`, err)
      }
    }
    if (!saved) {
      saved = { ...e, where: 'pending', shelf: shelfOf(e) }
      if (this.db) await tx(this.db, STORE, 'readwrite', s => s.put(saved))
    }
    this.user.set(saved.id, saved)
    this.ping(saved.id)
    this.emit(saved.id, saved)
    return saved
  }
  // a song with a file needs its folder to be removed (else this throws)
  async remove(id, { pick = true } = {}) {
    const e = this.user.get(id)
    if (!e) return
    if (e.file && e.where === 'disk') {
      const shelf = this.shelves[e.shelf ?? 'mine']
      if (!(await this.connect({ pick })) || !shelf.dir) throw new Error(`нет доступа к папке ${shelf.name}`)
      await shelf.remove(id, e.file)
    }
    await this.forget(id)
    this.user.delete(id)
    this.ping(id)
    this.emit(id, null)
  }
  async getMeta(k) {
    return this.db ? tx(this.db, META, 'readonly', s => s.get(k)) : null
  }
  async setMeta(k, v) {
    if (this.db) await tx(this.db, META, 'readwrite', s => s.put(v, k))
  }

  // ---- disk ----------------------------------------------------------------------------------------
  // Writes <name>.js into the project's songs/ folder (asked once, remembered), else downloads it.
  // When the file is already there with other code, confirm({ file, copy, builtin }) decides:
  // 'replace' | 'copy' (write <name>-2.js) | null (cancel).
  async saveToDisk(name, source, { ask = false, confirm = async () => 'replace' } = {}) {
    const stem = fileName(name)
    let file = stem + '.js'
    if (window.showDirectoryPicker || (this.server && !ask)) {
      try {
        let dir = this.server && !ask ? serverFolder('/api/songs', 'songs') : ask ? null : await this.getMeta('songsDir')
        if (dir && (await dir.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') dir = null
        if (!dir) {
          dir = await showDirectoryPicker({ id: 'mathmusic-songs', mode: 'readwrite' })
          await this.setMeta('songsDir', dir)
        }
        const read = async f => {
          try { return await (await (await dir.getFileHandle(f)).getFile()).text() } catch (e) { if (e.name === 'NotFoundError') return null; throw e }
        }
        const same = (a, b) => a != null && lf(a) === lf(b)
        const old = await read(file)
        if (same(old, source)) return { where: `${dir.name}/${file}`, same: true }
        if (old != null) {
          // the first free <name>-N.js — or this very version, written there before
          let i = 2, copy, text
          while ((text = await read((copy = `${stem}-${i}.js`))) != null) {
            if (same(text, source)) return { where: `${dir.name}/${copy}`, same: true }
            i++
          }
          const how = await confirm({ file, copy, builtin: this.SRC.songs[stem] != null })
          if (!how) return null
          if (how === 'copy') file = copy
        }
        const fh = await dir.getFileHandle(file, { create: true }), w = await fh.createWritable()
        await w.write(source)
        await w.close()
        return { where: `${dir.name}/${file}` }
      } catch (e) {
        if (e.name === 'AbortError') return null
        console.warn('File System Access failed, downloading', e)
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
    a.download = file
    a.click()
    return { where: 'Загрузки/' + file }
  }
}
