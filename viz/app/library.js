// The song library: the built-in songs (songs/*.js, embedded at build time) plus your own — edited
// copies, generated songs, imported files — kept in the browser (IndexedDB), and saving to disk:
// straight into the project's songs/ folder (File System Access, the folder is asked for once),
// or as a download.
const DB = 'mathmusic', STORE = 'songs', META = 'meta'

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

// a song's display name from its source (export default { name: '…' }), or fallback
export const nameIn = (source, fallback = 'song') => source.match(/\bname\s*:\s*(['"`])([^'"`]+)\1/)?.[2] ?? fallback

export class Library {
  constructor(SRC) {
    this.SRC = SRC
    this.user = new Map()
    this.db = null
  }
  async init() {
    try {
      this.db = await idb()
      const all = await tx(this.db, STORE, 'readonly', s => s.getAll())
      for (const e of all ?? []) this.user.set(e.id, e)
    } catch (e) {
      console.warn('no IndexedDB, songs live only in this tab', e)
    }
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
  // entry: { id?, name, source, kind: 'user' | 'generated', meta? } → the saved entry
  async save(entry) {
    const e = { ...entry, id: entry.id && !entry.id.startsWith('builtin:') ? entry.id : 'user:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), updated: Date.now() }
    e.name = nameIn(e.source, e.name)
    this.user.set(e.id, e)
    if (this.db) await tx(this.db, STORE, 'readwrite', s => s.put(e))
    return e
  }
  async remove(id) {
    this.user.delete(id)
    if (this.db) await tx(this.db, STORE, 'readwrite', s => s.delete(id))
  }
  async getMeta(k) {
    return this.db ? tx(this.db, META, 'readonly', s => s.get(k)) : null
  }
  async setMeta(k, v) {
    if (this.db) await tx(this.db, META, 'readwrite', s => s.put(v, k))
  }

  // ---- disk ----------------------------------------------------------------------------------------
  // Writes <name>.js into the project's songs/ folder (asked once, remembered), else downloads it.
  async saveToDisk(name, source, { ask = false } = {}) {
    const file = name.replace(/[^\w\-]+/g, '_') + '.js'
    if (window.showDirectoryPicker) {
      try {
        let dir = ask ? null : await this.getMeta('songsDir')
        if (dir && (await dir.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') dir = null
        if (!dir) {
          dir = await showDirectoryPicker({ id: 'mathmusic-songs', mode: 'readwrite' })
          await this.setMeta('songsDir', dir)
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
