// Android: no text selection on a long press (below), and an <a download> of a blob (every export: MP3, WAV, MIDI, MusicXML, stems…) — a WebView downloads nothing
// itself, so the file goes to the app (MainActivity.Bridge) in base64 pieces and lands in Download/MathMusic.
// android/build-apk.js puts this in front of the page's own scripts.
;(() => {
  const A = window.MathMusicAndroid
  if (!A) return
  // a long press is the right click (the gallery's menu…), not a text selection — except where text is typed
  const css = document.createElement('style')
  css.textContent = 'body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none } ' +
    'input, textarea, select, [contenteditable], .cm-editor, .cm-content { -webkit-user-select: text; user-select: text }'
  document.head.append(css)
  const click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    if (!this.download || !/^(blob|data):/.test(this.href)) return click.call(this)
    save(this.download, this.href).catch(e => console.error('download', e))
  }
  const PIECE = 3 << 20 // 3 MB a piece (4 MB of base64)
  const b64 = b => new Promise((ok, no) => {
    const f = new FileReader()
    f.onload = () => ok(f.result.slice(f.result.indexOf(',') + 1))
    f.onerror = () => no(f.error)
    f.readAsDataURL(b)
  })
  async function save(name, href) {
    const blob = await (await fetch(href)).blob()
    const id = A.begin(name, blob.type || '')
    for (let at = 0; at < blob.size; at += PIECE) A.chunk(id, await b64(blob.slice(at, at + PIECE)))
    A.end(id)
  }
})()
