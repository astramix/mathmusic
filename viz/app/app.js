// Shared app state, filled in by main.js; feature modules (editor, generator, export, video…) import it.

// Unsaved sources by song id — a song has a draft exactly when its code differs from the saved one
// (put() keeps that true). Each draft is its own localStorage entry, written a moment after a change
// and when the page goes away, so closing the tab or F5 loses nothing and two tabs don't overwrite
// each other's drafts (another tab's changes come in through the storage event); `ok` is false when
// it couldn't write.
const PREFIX = 'mm.draft:'
class Drafts extends Map {
  constructor() {
    super()
    this.ok = true
    this.timer = null
    this.pending = new Set()
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(PREFIX)) super.set(k.slice(PREFIX.length), localStorage.getItem(k))
      }
      // older versions kept all drafts in one entry
      const old = localStorage.getItem('mm.drafts')
      if (old) {
        for (const [k, v] of Object.entries(JSON.parse(old))) if (!super.has(k)) this.set(k, v)
        this.flush()
        if (this.ok) localStorage.removeItem('mm.drafts')
      }
    } catch {}
    addEventListener('storage', e => {
      if (!e.key?.startsWith(PREFIX)) return
      const id = e.key.slice(PREFIX.length)
      if (e.newValue == null) super.delete(id)
      else super.set(id, e.newValue)
    })
  }
  set(k, v) {
    if (k == null || super.get(k) === v) return this
    super.set(k, v)
    this.later(k)
    return this
  }
  delete(k) {
    const had = super.delete(k)
    if (had) this.later(k)
    return had
  }
  // the draft of a song whose saved code is `saved`: kept only while it differs
  put(k, v, saved) {
    if (v === saved) this.delete(k)
    else this.set(k, v)
  }
  later(k) {
    this.pending.add(k)
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 400)
  }
  flush() {
    clearTimeout(this.timer)
    try {
      for (const k of this.pending) {
        if (this.has(k)) localStorage.setItem(PREFIX + k, this.get(k))
        else localStorage.removeItem(PREFIX + k)
        this.pending.delete(k)
      }
      this.ok = true
    } catch {
      this.ok = false
    }
  }
}

export const app = {
  SRC: null, // embedded sources
  rt: null, // runtime for the page (graphs, MIDI, checks)
  player: null,
  lib: null,
  current: null, // { id, entry, source (what plays), song, key, tracks, broken? }
  drafts: new Drafts(), // song id → unsaved source (survives switching songs and reloading the page)
  view: null, // view options
  scene: null,
  // set by main.js:
  open: null, // (id | entry, fromBeat?) → Promise
  apply: null, // (source, { id }) → Promise<{ ok, error, line, stale }>: live-update the current song
  setDraft: null, // (cur, source): the editor's / piano roll's text of the song, kept as a draft
  sourceOf: null, // (cur) → its code as you see it: the editor's text, the draft, or what plays
  dirty: cur => !!cur && app.drafts.has(cur.id), // unsaved changes
  songs: null, // { duplicate, rename, remove } (id): the library actions, also for the gallery
  refreshSongList: null,
}
