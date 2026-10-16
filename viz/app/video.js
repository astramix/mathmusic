// Video export: the visualiser with its formulas as an MP4 for TikTok / Shorts (9:16) or YouTube
// (16:9). Frames are drawn off-screen one by one at a fixed rate — never dropped, the same every
// time — by the same scene as the live view, in one of its styles:
//   classic  the glowing curves on a night sky;
//   paper    a coordinate plane on light paper: the functions are plotted as the music plays, each
//            part's formula pops up highlighted when the part enters and then fades;
//   space    the 3D flight.
// H.264 video + AAC audio (Opus when the browser has no AAC encoder), muxed with mp4-muxer.
import { app } from './app.js'
import { h, toast, modal, seg, download } from './ui.js'
import { renderSongCached, BLOCK } from './player.js'
import { Scene } from './view.js'
import { themeFor } from './themes.js'
import { formulaImage } from './formula.js'
import { keyLabel, songKey } from './theory.js'
import { trackList, SR } from './runtime.js'
import { fileName } from './library.js'

let opts = { style: 'paper', aspect: '9:16', fps: 30, formulas: true, range: 'all', from: 1, to: 17, quality: 'high' }
try { Object.assign(opts, JSON.parse(localStorage.getItem('mm.video') || '{}')) } catch {}
const SIZES = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080] }

export function videoDialog() {
  const cur = app.current
  if (!cur?.song) return toast('нет песни')
  const song = cur.song, bars = Math.ceil(song.length / 4)
  const box = h('div')
  const st = seg([['classic', '✨ Классика'], ['paper', '📐 Бумага — оси и формулы'], ['space', '🚀 3D']], opts.style, v => (opts.style = v))
  const as = seg([['9:16', '9:16 · TikTok, Shorts'], ['16:9', '16:9 · YouTube'], ['1:1', '1:1']], opts.aspect, v => (opts.aspect = v))
  const fp = seg([[30, '30 fps'], [60, '60 fps']], opts.fps, v => (opts.fps = v))
  const fo = h('input', { type: 'checkbox', checked: opts.formulas })
  fo.onchange = () => (opts.formulas = fo.checked)
  const from = h('input', { type: 'number', min: 1, max: bars, value: Math.min(opts.from, bars), style: 'width:70px' })
  const to = h('input', { type: 'number', min: 2, max: bars + 1, value: Math.min(opts.to, bars + 1), style: 'width:70px' })
  const rangeSeg = seg([['all', 'вся песня'], ['part', 'отрезок']], opts.range, v => { opts.range = v; rangeRow.style.display = v === 'part' ? '' : 'none'; est() })
  const rangeRow = h('div', { class: 'row', style: opts.range === 'part' ? '' : 'display:none' }, h('label', {}, 'Такты'), 'с', from, 'по', to, h('span', { class: 'dim' }, '(конец не включая)'))
  const info = h('div', { class: 'dim' })
  const est = () => {
    const [a, b] = opts.range === 'part' ? [(+from.value - 1) * 4, (+to.value - 1) * 4] : [0, song.length]
    const s = ((b - a) * 60) / song.bpm
    info.textContent = `длительность ${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} · ${Math.round(s * opts.fps)} кадров · кодируется быстрее реального времени на видеокарте`
  }
  from.oninput = to.oninput = est
  est()
  box.append(
    h('div', { class: 'row' }, h('label', {}, 'Вид'), st),
    h('div', { class: 'row' }, h('label', {}, 'Формат'), as),
    h('div', { class: 'row' }, h('label', {}, 'Кадров/с'), fp),
    h('div', { class: 'row' }, h('label', {}, 'Формулы'), h('label', {}, fo, ' подсвечивать формулу, когда вступает партия (вид «Бумага»)')),
    h('div', { class: 'row' }, h('label', {}, 'Что'), rangeSeg),
    rangeRow, info,
    h('p', { class: 'dim' }, 'Звук — тот же микс, что в экспорте (−1 dBFS), выключенные дорожки не попадут. Видео H.264, звук AAC (или Opus, если браузер не умеет AAC).'),
  )
  modal('🎬 Видео MP4', box, [{ label: 'Отмена' }, {
    label: 'Создать видео', primary: true, action: () => {
      opts.from = +from.value
      opts.to = +to.value
      try { localStorage.setItem('mm.video', JSON.stringify(opts)) } catch {}
      makeVideo({ ...opts })
    },
  }])
}

export async function makeVideo(o) {
  // the folder first, while the click still allows its dialog: the project's videos/ (else the file is downloaded)
  const folder = await app.lib.videoFolder({ pick: true })
  const cur = app.current, song = cur.song
  const [W, H] = SIZES[o.aspect], fps = o.fps
  const [b0, b1] = o.range === 'part' ? [(o.from - 1) * 4, Math.min(song.length, (o.to - 1) * 4)] : [0, song.length]
  let cancelled = false
  const t = toast('🎬 видео: рендер звука…', { progress: true })
  const cancel = h('button', { style: 'margin-top:6px', onclick: () => (cancelled = true) }, 'отменить')
  document.querySelector('#toasts .toast:last-child')?.append(cancel)
  try {
    const muted = new Set(app.scene.tracks.filter(t => t.muted).map(t => t.key))
    const audio = await renderSongCached(app.SRC, cur.source, { muted, onProgress: p => t.set(null, 0.25 * p) })
    const sec = 60 / song.bpm, s0 = Math.round(b0 * sec * SR), s1 = Math.min(audio.L.length, Math.round(b1 * sec * SR + (b1 >= song.length ? 2 * SR : 0)))
    const frames = Math.ceil(((s1 - s0) / SR) * fps)
    // the scene, fresh and seeded, with formula images for the paper style
    const tracks = trackList(song).map(([key, tr], i) => ({
      key, i, graph: tr.graph, midi: tr.midi, color: tr.color ?? `hsl(${(i * 47) % 360} 80% 65%)`,
      formula: app.scene.tracks.find(x => x.key === key)?.formula ?? null, muted: muted.has(key),
    }))
    const key = cur.key ?? songKey(song)
    const scene = new Scene(song, tracks, { key, theme: themeFor(song), seed: 11 })
    const k = Math.min(W, H) / 620
    if (o.style === 'paper' && o.formulas) {
      t.set('формулы…', 0.26)
      for (const tr of tracks) if (tr.formula) scene.formulaImgs.set(tr.key, await formulaImage(tr.formula, { size: 26, color: '#1d1a2e', maxWidth: W - 120 }))
    }
    if (o.style !== 'paper' || !o.formulas) scene.formulaImgs.clear()
    // encoders
    const canvas = new OffscreenCanvas(W, H), g = canvas.getContext('2d')
    let failure = null
    // the GPU reset the canvas (out of video memory, a driver hiccup): stop with a clear message
    canvas.addEventListener?.('contextlost', () => (failure ??= new Error('видеокарта сбросила холст — попробуй 30 fps или закрой тяжёлые вкладки')))
    const vcfg = { codec: 'avc1.640033', width: W, height: H, bitrate: o.quality === 'high' ? 16e6 : 8e6, framerate: fps, latencyMode: 'quality' }
    if (!(await VideoEncoder.isConfigSupported(vcfg)).supported) vcfg.codec = 'avc1.4d0028'
    // Windows' AAC encoder (Media Foundation) only takes 96–192 kbps: try down from 256k before Opus
    let acodec = 'aac', acfg = null
    for (const bitrate of [256000, 192000, 160000, 128000]) {
      const c = { codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate }
      if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; break }
    }
    if (!acfg) {
      acodec = 'opus'
      acfg = { codec: 'opus', sampleRate: SR, numberOfChannels: 2, bitrate: 256000 }
    }
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(), fastStart: 'in-memory', firstTimestampBehavior: 'offset',
      video: { codec: 'avc', width: W, height: H, frameRate: fps },
      audio: { codec: acodec, sampleRate: SR, numberOfChannels: 2 },
    })
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => (failure = e) })
    venc.configure(vcfg)
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => (failure = e) })
    aenc.configure(acfg)
    // audio first (fast)
    const A = 4096
    for (let i = s0; i < s1; i += A) {
      const m = Math.min(A, s1 - i), data = new Float32Array(2 * m)
      data.set(audio.L.subarray(i, i + m), 0)
      data.set(audio.R.subarray(i, i + m), m)
      aenc.encode(new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round(((i - s0) / SR) * 1e6), data }))
    }
    // frames
    const nt = audio.keys.length, lv = new Float32Array(tracks.length)
    const title = song.name, subtitle = `${keyLabel(key)} · ${song.bpm} BPM`
    for (let f = 0; f < frames; f++) {
      if (cancelled) throw new Error('отменено')
      if (failure) throw failure
      const tsec = f / fps, sample = s0 + Math.round(tsec * SR), x = sample / SR / sec
      const blk = Math.floor(sample / BLOCK)
      tracks.forEach((tr, i) => { const j = audio.keys.indexOf(tr.key); lv[i] = j >= 0 ? audio.levels[blk * nt + j] ?? 0 : 0 })
      scene.update(x, 1 / fps, lv, true)
      const scope = { L: audio.L.subarray(sample, sample + 735), R: audio.R.subarray(sample, sample + 735), gain: 0.95 }
      scene.draw(g, {
        style: o.style, W, H, scale: k, zoom: o.aspect === '9:16' ? 12 : 20, fx: true, labels: true, scope: o.style === 'classic' ? scope : null,
        timeline: o.style !== 'paper', playhead: o.aspect === '9:16' ? 0.5 : 0.62, top: o.aspect === '9:16' ? 0.2 : 0.12,
        sectionY: o.aspect === '9:16' ? 300 : 70, titleY: o.aspect === '9:16' ? 0.14 : 0.42, title, subtitle, formulas: o.formulas, scenery: app.view?.scenery !== false,
      })
      if (o.style !== 'paper') caption(g, W, H, k, title, subtitle, o.aspect)
      const frame = new VideoFrame(canvas, { timestamp: Math.round(tsec * 1e6), duration: Math.round(1e6 / fps) })
      venc.encode(frame, { keyFrame: f % (fps * 2) === 0 })
      frame.close()
      // back-pressure: a queued 1080p frame holds ~8 MB of video memory; drawing faster than the encoder
      // encodes (60 fps, a software encoder) would pile them up until the GPU process gives out
      while (venc.encodeQueueSize > 3 && !failure && !cancelled) await dequeued(venc)
      if (f % 15 === 0) {
        t.set(`🎬 кадр ${f} / ${frames}`, 0.27 + 0.72 * (f / frames))
        await new Promise(r => setTimeout(r, 0))
      }
    }
    await venc.flush()
    await aenc.flush()
    muxer.finalize()
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' })
    const name = fileName(song.name || 'song') + `-${o.style}-${o.aspect.replace(':', 'x')}.mp4`
    let where = null
    if (folder) try { where = await app.lib.writeVideo(folder, name, blob) } catch (e) { console.warn('videos/ not written, downloading', e) }
    if (!where) download(name, blob)
    cancel.remove()
    t.done(`🎬 ${where ?? name} · ${(blob.size / 1e6).toFixed(1)} МБ${acodec === 'opus' ? ' · звук Opus (AAC в этом браузере нет)' : ''}`)
  } catch (e) {
    console.error(e)
    cancel.remove()
    t.done('видео: ' + (e.message ?? e), 'err')
  }
}
// the next 'dequeue' of the encoder (or 20 ms, for browsers without the event)
const dequeued = enc => new Promise(r => {
  const t = setTimeout(r, 20)
  enc.addEventListener('dequeue', () => { clearTimeout(t); r() }, { once: true })
})
// title and "made of math" caption for the dark styles
function caption(g, W, H, k, title, subtitle, aspect) {
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.textAlign = 'center'
  g.textBaseline = 'top'
  const y = aspect === '9:16' ? 120 * k : 26 * k
  g.fillStyle = '#ffffff'
  g.font = `300 ${(aspect === '9:16' ? 64 : 38) * k}px system-ui`
  g.fillText(title, W / 2, y)
  g.fillStyle = '#ffffffa0'
  g.font = `${(aspect === '9:16' ? 26 : 18) * k}px system-ui`
  g.fillText(`${subtitle} · музыка из математических функций`, W / 2, y + (aspect === '9:16' ? 84 : 48) * k)
  g.textAlign = 'start'
}
