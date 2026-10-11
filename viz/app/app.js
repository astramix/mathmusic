// Shared app state, filled in by main.js; feature modules (editor, generator, export, video…) import it.

// Unsaved sources by song id. Kept in localStorage (written a moment after each change and when the
// page goes away), so closing the tab or F5 doesn't lose them; `ok` is false when it couldn't write.
class Drafts extends Map {
  constructor() {
    super()
    this.ok = true
    this.timer = null
    try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem('mm.drafts') || '{}'))) super.set(k, v) } catch {}
  }
  set(k, v) {
    super.set(k, v)
    this.later()
    return this
  }
  delete(k) {
    const had = super.delete(k)
    if (had) this.later()
    return had
  }
  later() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 400)
  }
  flush() {
    clearTimeout(this.timer)
    try {
      localStorage.setItem('mm.drafts', JSON.stringify(Object.fromEntries(this)))
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
  current: null, // { id, entry, source, song, key, tracks, dirty }
  drafts: new Drafts(), // song id → unsaved source (survives switching songs and reloading the page)
  view: null, // view options
  scene: null,
  // set by main.js:
  open: null, // (id | entry, fromBeat?) → Promise
  apply: null, // (source, { reason }) → Promise<{ ok, error, line }>: live-update the current song
  refreshSongList: null,
  setDirty: null,
}
