// The song library: the built-in songs (songs/*.js, embedded at build time) plus your own — edited
// copies, generated songs, imported files — kept in the browser (IndexedDB), and saving to disk:
// straight into the project's songs/ folder (File System Access, the folder is asked for once),
// or as a download. Tabs of the app see each other's changes (a ping through localStorage).
const DB = 'mathmusic', STORE = 'songs', META = 'meta', PING = 'mm.lib'

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

export class Library {
  constructor(SRC) {
    this.SRC = SRC
    this.user = new Map()
    this.db = null
    this.listeners = new Set()
  }
  async init() {
    try {
      this.db = await idb()
      const all = await tx(this.db, STORE, 'readonly', s => s.getAll())
      for (const e of all ?? []) this.user.set(e.id, { ...e, source: lf(e.source) })
    } catch (e) {
      console.warn('no IndexedDB, songs live only in this tab', e)
    }
    // another tab saved or removed a song: read it again
    addEventListener('storage', async ev => {
      if (ev.key !== PING || !ev.newValue || !this.db) return
      let id
      try { id = JSON.parse(ev.newValue).id } catch { return }
      const e = await tx(this.db, STORE, 'readonly', s => s.get(id)).catch(() => undefined)
      if (e) this.user.set(id, e)
      else this.user.delete(id)
      this.emit(id, e ?? null, true)
    })
  }
  // fn(id, entry | null, remote) after every save / removal, here or in another tab
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
  // entry: { id?, name, source, kind: 'user' | 'generated', meta?, pristine? } → the saved entry.
  // pristine: a generated song nobody has touched (the generator may tidy those away)
  async save(entry) {
    const now = Date.now()
    const e = { ...entry, id: entry.id && !entry.id.startsWith('builtin:') ? entry.id : 'user:' + now.toString(36) + Math.random().toString(36).slice(2, 6), created: entry.created ?? now, updated: now }
    e.source = lf(e.source) // as the editor has it: a file from Windows must not look edited at once
    e.name = nameIn(e.source, e.name)
    this.user.set(e.id, e)
    if (this.db) await tx(this.db, STORE, 'readwrite', s => s.put(e))
    this.ping(e.id)
    this.emit(e.id, e)
    return e
  }
  async remove(id) {
    this.user.delete(id)
    if (this.db) await tx(this.db, STORE, 'readwrite', s => s.delete(id))
    this.ping(id)
    this.emit(id, null)
  }
  async getMeta(k) {
    return this.db ? tx(this.db, META, 'readonly', s => s.get(k)) : null
  }
  async setMeta(k, v) {
    if (this.db) await tx(this.db, META, 'readwrite', s => s.put(v, k))
  }

  // ---- backup: every song of yours (and its unsaved draft) in one JSON file ---------------------------
  backup(drafts) {
    const songs = [...this.user.values()]
    return {
      format: 'mathmusic-library', version: 1, saved: new Date().toISOString(),
      songs, drafts: Object.fromEntries(songs.filter(e => drafts.has(e.id)).map(e => [e.id, drafts.get(e.id)])),
    }
  }
  // → { added, same, copies }: a song already here unchanged is skipped; one here with other code
  // comes in as a copy next to it, so nothing is overwritten (and restoring twice adds nothing new)
  async restore(data, drafts) {
    if (data?.format !== 'mathmusic-library' || !Array.isArray(data.songs)) throw new Error('это не резервная копия MathMusic')
    const r = { added: 0, same: 0, copies: 0 }
    for (const e of data.songs) {
      if (typeof e?.source !== 'string' || typeof e.id !== 'string' || e.id.startsWith('builtin:')) continue
      const have = this.user.get(e.id), draft = data.drafts?.[e.id]
      // here already: the same song, or a copy of it from an earlier restore (the same code, its own name)
      const known = [...this.user.values()].some(x => x.source === e.source || x.source === setName(e.source, x.name))
      if (known) { r.same++; continue }
      if (have) {
        const name = this.uniqueName(e.name)
        const c = await this.save({ ...e, id: null, name, source: setName(e.source, name), kind: e.kind === 'generated' ? 'generated' : 'user', pristine: false })
        if (typeof draft === 'string') drafts.set(c.id, setName(draft, name))
        r.copies++
      } else {
        await this.save(e)
        if (typeof draft === 'string' && !drafts.has(e.id)) drafts.set(e.id, draft)
        r.added++
      }
    }
    return r
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
