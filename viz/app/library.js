// The song library: the built-in songs (songs/*.js) and your own — edited copies, generated songs,
// imported files — kept as files in the project's my_songs/ folder. Both folders are embedded at build
// time, so the page shows every song at once; to write, the page needs the folder itself (File System
// Access: chosen once, the handle is remembered — the browser may ask to allow it again in a new
// session). my_songs/library.json keeps what the code can't say: id, kind, untouched flag, dates.
// A song saved while the folder isn't connected (or in a browser without File System Access) waits in
// IndexedDB and moves into the folder as soon as it is. Tabs of the app see each other's changes
// (a ping through localStorage). Writing a copy into songs/ (render.js / Ableton) stays as it was.
const DB = 'mathmusic', STORE = 'songs', META = 'meta', PING = 'mm.lib', DIR = 'my_songs', INDEX = 'library.json'
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
// The song's own object: from `export default {` on (a `name:` before it belongs to something else)
const songPart = source => Math.max(0, source.search(/export\s+default\s*\{/))
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
const RU = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g' }
export function fileName(name) {
  const lat = [...String(name)].map(c => {
    const l = c.toLowerCase(), r = RU[l]
    if (r == null) return c
    return c === l || !r ? r : r[0].toUpperCase() + r.slice(1)
  }).join('')
  return lat.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'song'
}

// an entry of my_songs/ from its file and what library.json says about it (a file put there by hand
// gets an id from its name; a generator's song is known by its `generator:` field)
export function fromFile(file, source, mtime, index = {}) {
  const m = index[file] ?? {}, stem = file.replace(/\.js$/, '')
  source = lf(source)
  return {
    id: m.id ?? 'mine:' + stem, file, name: nameIn(source, stem), source,
    kind: m.kind ?? (/\bgenerator\s*:/.test(source.slice(songPart(source))) ? 'generated' : 'user'),
    pristine: m.pristine ?? false, base: m.base, meta: m.meta,
    created: m.created ?? mtime, updated: m.updated ?? mtime, where: 'disk',
  }
}
// the file for a song: its old one while the name still fits it, else <name>.js or the first free <name>-N.js
export function fileFor(name, old, taken) {
  const stem = fileName(name)
  if (old && (old === stem + '.js' || new RegExp(`^${stem}-\\d+\\.js$`).test(old))) return old
  let file = stem + '.js', i = 2
  while (taken.has(file)) file = `${stem}-${i++}.js`
  return file
}

export class Library {
  constructor(SRC) {
    this.SRC = SRC
    this.user = new Map()
    this.db = null
    this.dir = null // my_songs/, connected and writable
    this.stored = null // its remembered handle, before the browser allows it again
    this.denied = false // the browser said no this session: don't keep asking on every keystroke
    this.listeners = new Set()
    // my_songs/ as it was at build time — shown before (or without) the folder itself
    const index = SRC.mineIndex?.songs ?? {}
    for (const [file, { source, mtime }] of Object.entries(SRC.mine ?? {})) {
      const e = fromFile(file, source, mtime, index)
      this.user.set(e.id, e)
    }
  }
  get canConnect() {
    return typeof window !== 'undefined' && !!window.showDirectoryPicker
  }
  get pending() {
    return [...this.user.values()].filter(e => e.where === 'pending')
  }
  async init() {
    try {
      this.db = await idb()
      // songs waiting for the folder (and the songs of older versions, which all lived here)
      for (const e of (await tx(this.db, STORE, 'readonly', s => s.getAll())) ?? []) this.user.set(e.id, { ...e, source: lf(e.source), where: 'pending' })
      const dir = await this.getMeta('mineDir')
      if (dir && (await dir.queryPermission(RW)) === 'granted') await this.attach(dir, 'disk')
      else this.stored = dir ?? null
    } catch (e) {
      console.warn('no IndexedDB / folder: songs saved now live only in this tab', e)
    }
    // another tab saved or removed a song: read it again
    addEventListener('storage', async ev => {
      if (ev.key !== PING || !ev.newValue) return
      let id
      try { id = JSON.parse(ev.newValue).id } catch { return }
      if (!this.dir && this.stored && (await this.stored.queryPermission(RW).catch(() => '')) === 'granted') return this.attach(this.stored, 'tab')
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
  // 'disk' (my_songs/ had something newer than the page) or false (here)
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

  list() {
    const built = Object.keys(this.SRC.songs).sort().map(n => ({ id: 'builtin:' + n, name: n, kind: 'builtin', source: this.SRC.songs[n] }))
    const mine = [...this.user.values()].sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))
    return [...built, ...mine]
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

  // ---- the folder ------------------------------------------------------------------------------------
  // → true when my_songs/ is writable. With a remembered folder the browser just asks to allow it again;
  // pick: true (an explicit action) opens the folder dialog when there is none — the project folder or
  // my_songs/ itself (inside the project folder, my_songs/ is made when it isn't there yet).
  // Both need a click or a key: without one the browser refuses and the song waits in IndexedDB.
  // fresh: choose another folder (the one connected now stays if the dialog is cancelled).
  async connect({ pick = false, fresh = false } = {}) {
    if (this.dir && !fresh) return true
    if (!this.canConnect || (this.denied && !pick)) return false
    try {
      let dir = fresh ? null : this.stored ?? (await this.getMeta('mineDir'))
      if (dir && (await dir.queryPermission(RW)) !== 'granted' && (await dir.requestPermission(RW)) !== 'granted') {
        this.denied = true
        dir = null
      }
      if (!dir) {
        if (!pick) return false
        dir = await showDirectoryPicker({ id: 'mathmusic-my-songs', mode: 'readwrite' })
        if (dir.name !== DIR) dir = await dir.getDirectoryHandle(DIR, { create: true })
        await this.setMeta('mineDir', dir)
      }
      this.denied = false
      await this.attach(dir, 'disk')
      return true
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('my_songs/ not connected', e)
      if (!pick) this.denied = true
      return !!this.dir
    }
  }
  async attach(dir, remote) {
    this.dir = this.stored = dir
    await this.reload(remote)
    await this.flush()
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
    await w.write(JSON.stringify({ format: 'mathmusic-my-songs', version: 1, songs }, null, 1) + '\n')
    await w.close()
  }
  // my_songs/ as it is now on disk (songs waiting to be written stay as they are)
  async reload(remote = 'tab') {
    if (!this.dir) return
    const before = this.user, next = new Map(), index = await this.readIndex()
    for (const [file, h] of await this.files()) {
      if (h.kind !== 'file' || !file.endsWith('.js')) continue
      const f = await h.getFile(), e = fromFile(file, await f.text(), f.lastModified, index)
      next.set(e.id, e)
    }
    for (const [id, e] of before) if (e.where === 'pending') next.set(id, e)
    this.user = next
    for (const [id, e] of next) {
      const o = before.get(id)
      if (!o || o.source !== e.source || o.name !== e.name) this.emit(id, e, remote)
    }
    for (const id of before.keys()) if (!next.has(id)) this.emit(id, null, remote)
  }
  // the songs that waited go into the folder (one already there with the same code is just dropped)
  async flush() {
    for (const e of this.pending) {
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
  // writes the song's file (a renamed song moves to its new file) and its line in library.json
  async write(e) {
    const index = await this.readIndex(), files = await this.files()
    const old = Object.keys(index).find(f => index[f].id === e.id && files.has(f)) ?? (e.file && files.has(e.file) ? e.file : null)
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
    return { ...rest, file, where: 'disk' }
  }

  // entry: { id?, name, source, kind: 'user' | 'generated', meta?, pristine? } → the saved entry, with
  // where: 'disk' (in my_songs/) or 'pending' (waits in IndexedDB for the folder).
  // pristine: a generated song nobody has touched (the generator may tidy those away).
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
        await this.forget(e.id)
      } catch (err) {
        console.warn('could not write to my_songs/', err)
      }
    }
    if (!saved) {
      saved = { ...e, where: 'pending' }
      if (this.db) await tx(this.db, STORE, 'readwrite', s => s.put(saved))
    }
    this.user.set(saved.id, saved)
    this.ping(saved.id)
    this.emit(saved.id, saved)
    return saved
  }
  // a song with a file in my_songs/ needs the folder to be removed (else this throws)
  async remove(id, { pick = true } = {}) {
    const e = this.user.get(id)
    if (!e) return
    if (e.file) {
      if (!(await this.connect({ pick }))) throw new Error('нет доступа к папке my_songs')
      const index = await this.readIndex(), files = await this.files()
      for (const f of Object.keys(index)) if (index[f].id === id) { await this.dir.removeEntry(f).catch(() => {}); files.delete(f) }
      await this.dir.removeEntry(e.file).catch(() => {})
      files.delete(e.file)
      await this.writeIndex(index, files)
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
    if (window.showDirectoryPicker) {
      try {
        let dir = ask ? null : await this.getMeta('songsDir')
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
