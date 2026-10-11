// The player: a pool of audio workers renders the song (each worker a share of the tracks, balanced
// by how expensive each track turned out to be), the page mixes their stems chunk by chunk, keeps
// every mixed chunk in a cache, and feeds the AudioWorklet output stage a little ahead of the
// playhead. So
//   · rendering runs in parallel on several cores, the sound plays in the audio thread (no gaps
//     when the page is busy);
//   · seeking into anything already heard (or rendered ahead) is instant — it comes from the cache;
//   · mute/solo is instant: the stems of the next seconds are kept and simply re-mixed;
//   · a new version of the song (live coding) cross-fades in without stopping the music.
import { makeRuntime, compile, trackList, SR, TAIL } from './runtime.js'

export const CH = 8192 // samples per chunk
let wurl = null
const workerURL = () => (wurl ??= MM.blob(MM.APP['worker.js']))
export const BLOCK = 512 // level-meter resolution
const FEED_AHEAD = 0.75 // seconds of audio queued in the worklet
const RENDER_AHEAD = 90 // seconds rendered ahead of the playhead
const STEM_WINDOW = 8 // seconds of per-track stems kept ahead of the playhead (instant re-mix)
const PREROLL_BEATS = 4

export class Player extends EventTarget {
  constructor(SRC) {
    super()
    this.SRC = SRC
    this.rt = makeRuntime(SRC)
    this.actx = null
    this.node = null
    this.workers = []
    this.loads = 0
    this.gen = 0
    this.cost = {}
    this.song = null
    this.muted = new Set()
    this.volume = 0.9
    this.playing = false
    this.rep = { pos: 0, t: 0, stalled: true }
    this.feedTimer = null
    this.cache = new Map()
    this.stems = new Map()
    this.chunks = 0
  }

  // ---- audio graph ------------------------------------------------------------------------------
  async ensureAudio() {
    if (this.actx) return
    this.actx = new AudioContext({ sampleRate: SR, latencyHint: 'playback' })
    // a data: URL — worklets refuse blob: URLs on pages opened from disk (origin null)
    await this.actx.audioWorklet.addModule('data:text/javascript;charset=utf-8,' + encodeURIComponent(MM.APP['worklet.js']))
    this.node = new AudioWorkletNode(this.actx, 'mathmusic-out', { numberOfInputs: 0, outputChannelCount: [2] })
    this.master = this.actx.createGain()
    this.master.gain.value = this.volume
    this.node.connect(this.master).connect(this.actx.destination)
    this.node.port.onmessage = e => {
      const d = e.data
      if (d.type === 'pos') this.rep = { pos: d.pos, t: d.t, stalled: d.stalled }
    }
    this.feedTimer = setInterval(() => this.tick(), 30)
  }
  setVolume(v) {
    this.volume = v
    if (this.master) this.master.gain.setTargetAtTime(v, this.actx.currentTime, 0.02)
  }

  // ---- workers -------------------------------------------------------------------------------------
  poolSize(nTracks) {
    return Math.max(1, Math.min(nTracks, 4, (navigator.hardwareConcurrency || 4) - 1))
  }
  spawn(k) {
    if (this.workers.length === k && this.loads < 40) return
    for (const w of this.workers) w.w.terminate()
    this.workers = []
    this.loads = 0
    for (let i = 0; i < k; i++) {
      const w = new Worker(workerURL())
      w.postMessage({ type: 'init', lib: this.rt.lib, SR, TAIL })
      const slot = { w, keys: [] }
      w.onmessage = e => this.fromWorker(slot, e.data)
      w.onerror = e => {
        e.preventDefault?.()
        this.emit('error', { message: 'аудио-воркер: ' + (e.message || 'не запустился') })
      }
      this.workers.push(slot)
    }
  }
  // Longest-processing-time assignment of tracks to workers from the measured costs
  assign(keys) {
    const k = this.poolSize(keys.length)
    this.spawn(k)
    const est = key => this.cost[this.song.name + '/' + key] ?? 1
    const load = this.workers.map(() => 0)
    this.workers.forEach(s => (s.keys = []))
    for (const key of [...keys].sort((a, b) => est(b) - est(a))) {
      const i = load.indexOf(Math.min(...load))
      this.workers[i].keys.push(key)
      load[i] += est(key)
    }
  }

  // ---- loading -------------------------------------------------------------------------------------
  // song: the loaded module default; keeps mutes when the song name stays the same
  async open({ source, song }, fromBeat = 0) {
    await this.ensureAudio()
    if (this.song?.name !== song.name) this.muted = new Set()
    this.install(source, song)
    this.cache = new Map()
    this.stems = new Map()
    this.peak = 0.05
    this.node.port.postMessage({ type: 'gain', value: 0.89 / this.peak })
    this.ended = false
    this.next = null
    this.seek(fromBeat)
  }
  // Live update: a new version of the same song cross-fades in ~0.3 s ahead of the playhead
  async update({ source, song }) {
    if (!this.song) return this.open({ source, song })
    const keepPeak = this.peak
    this.install(source, song)
    this.cache = new Map()
    this.stems = new Map()
    this.peak = keepPeak
    const at = Math.min(this.fed ?? 0, this.end - 1, Math.max(0, Math.round(this.pos + 0.3 * SR)))
    this.node.port.postMessage({ type: 'cut', at })
    this.fed = at
    this.restart(Math.floor(at / CH))
  }
  install(source, song) {
    this.source = source
    this.body = compile(source)
    this.song = song
    this.sec = 60 / song.bpm
    this.keys = trackList(song).map(([k]) => k)
    this.end = Math.ceil((song.length * this.sec + TAIL) * SR)
    this.chunks = Math.ceil(this.end / CH)
    this.mask = this.maskOf()
    this.ended = false
  }
  maskOf() {
    return this.keys.filter(k => this.muted.has(k)).join('|')
  }
  restart(idx) {
    const gen = ++this.gen, from = idx * CH
    this.next = idx
    this.ready = 0
    this.parts = new Map()
    this.inflight = 0
    this.assign(this.keys)
    this.loads++
    for (const s of this.workers) {
      s.w.postMessage({ type: 'drop', gen: gen - 1 })
      s.w.postMessage({
        type: 'load', gen, body: this.body, keys: s.keys, bpm: this.song.bpm,
        from, preroll: Math.round(PREROLL_BEATS * this.sec * SR),
      })
    }
  }

  // ---- worker messages ---------------------------------------------------------------------------
  fromWorker(slot, d) {
    if (d.type === 'problem') return this.emit('problem', d)
    if (d.gen !== this.gen) return
    if (d.type === 'error') return this.emit('error', d)
    if (d.type === 'ready') {
      if (++this.ready === this.workers.length) this.pump()
      return
    }
    if (d.type !== 'chunk') return
    const idx = Math.round(d.start / CH)
    let p = this.parts.get(idx)
    if (!p) this.parts.set(idx, (p = { got: 0, stems: {}, n: d.n }))
    Object.assign(p.stems, d.stems)
    for (const [k, ms] of Object.entries(d.ms)) {
      const key = this.song.name + '/' + k
      this.cost[key] = this.cost[key] == null ? ms : 0.8 * this.cost[key] + 0.2 * ms
    }
    if (++p.got < this.workers.length) return
    this.parts.delete(idx)
    this.inflight--
    this.finish(idx, p.stems, p.n)
    this.pump()
    this.feed()
  }
  // mix the stems of one chunk → cache; per-track levels for the meters
  finish(idx, stems, n) {
    const nt = this.keys.length, nb = Math.ceil(n / BLOCK), levels = new Float32Array(nb * nt)
    this.keys.forEach((k, j) => {
      const s = stems[k]
      if (!s) return
      const [L, R] = s
      for (let b = 0; b < nb; b++) {
        let e = 0
        const i1 = Math.min(n, (b + 1) * BLOCK)
        for (let i = b * BLOCK; i < i1; i++) e += L[i] * L[i] + R[i] * R[i]
        levels[b * nt + j] = Math.sqrt(e / (2 * BLOCK))
      }
    })
    const c = this.mix(stems, n)
    c.levels = levels
    this.cache.set(idx, c)
    if (idx * CH < this.pos + STEM_WINDOW * SR) this.stems.set(idx, { stems, n })
    let peak = this.peak
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(c.L[i]), Math.abs(c.R[i]))
    if (peak > this.peak * 1.01) {
      this.peak = peak
      this.node.port.postMessage({ type: 'gain', value: 0.89 / peak })
    }
  }
  mix(stems, n) {
    const L = new Float32Array(n), R = new Float32Array(n)
    for (const k of this.keys) {
      const s = stems[k]
      if (!s || this.muted.has(k)) continue
      for (let i = 0; i < n; i++) {
        L[i] += s[0][i]
        R[i] += s[1][i]
      }
    }
    return { mask: this.mask, L, R }
  }

  // ---- the render loop -----------------------------------------------------------------------------
  pump() {
    if (!this.song || this.ready < this.workers.length) return
    const limit = Math.min(this.chunks, Math.floor((this.pos + RENDER_AHEAD * SR) / CH) + 1)
    while (this.inflight < 2 && this.next < limit) {
      // skip ahead over chunks that are already cached with the current mutes? only by restarting —
      // the renderers are stateful; a short run of cached chunks is cheaper to re-render
      for (const s of this.workers) s.w.postMessage({ type: 'render', gen: this.gen, n: CH })
      this.next++
      this.inflight++
    }
  }
  // the first chunk at or after the playhead that is missing (for the current mutes)
  firstGap() {
    for (let i = Math.floor(this.pos / CH); i < this.chunks; i++) {
      const c = this.cache.get(i)
      if (!c || c.mask !== this.mask) return i
    }
    return this.chunks
  }
  ensureRendering() {
    const gap = this.firstGap()
    if (gap >= this.chunks) return
    if (this.next == null) return this.restart(gap)
    const behind = this.next - this.inflight // the renderers' position, in chunks
    if (this.ready < this.workers.length && this.next === gap) return // already restarting there
    if (behind > gap || gap - behind > 6) this.restart(gap)
  }
  // queue mixed audio in the worklet up to FEED_AHEAD past the playhead
  feed() {
    if (!this.node || this.fed == null) return
    const until = Math.min(this.end, this.pos + FEED_AHEAD * SR)
    while (this.fed < until) {
      const idx = Math.floor(this.fed / CH), c = this.cache.get(idx)
      if (!c || c.mask !== this.mask) break
      const off = this.fed - idx * CH
      this.node.port.postMessage({ type: 'data', start: this.fed, L: c.L.slice(off), R: c.R.slice(off) })
      this.fed = idx * CH + c.L.length
    }
  }
  tick() {
    if (!this.song) return
    this.feed()
    this.pump()
    // forget stems that fell behind the playhead
    const cur = Math.floor(this.pos / CH)
    for (const i of this.stems.keys()) if (i < cur - 1) this.stems.delete(i)
    if (this.playing && !this.ended && this.pos >= this.end - 0.05 * SR) {
      this.ended = true
      this.emit('end', {})
    }
  }

  // ---- transport -----------------------------------------------------------------------------------
  get pos() {
    if (!this.actx) return this.rep.pos
    const r = this.rep, lat = (this.actx.outputLatency || 0) + (this.actx.baseLatency || 0)
    const live = r.stalled || this.actx.state !== 'running' ? r.pos : r.pos + (this.actx.currentTime - r.t) * SR
    return Math.max(0, Math.min(this.fed ?? live, live) - lat * SR * (this.actx.state === 'running' ? 1 : 0))
  }
  get x() {
    return this.song ? this.pos / SR / this.sec : 0
  }
  get stalled() {
    return this.rep.stalled && this.playing
  }
  seek(beat) {
    if (!this.song) return
    const pos = Math.max(0, Math.min(this.end - 1, Math.round(beat * this.sec * SR)))
    this.node.port.postMessage({ type: 'seek', pos })
    this.rep = { pos, t: this.actx.currentTime, stalled: true }
    this.fed = pos
    this.ended = false
    this.feed()
    this.ensureRendering()
    this.pump()
  }
  async play() {
    await this.ensureAudio()
    this.playing = true
    await this.actx.resume()
    this.emit('state', {})
  }
  async pause() {
    this.playing = false
    await this.actx?.suspend()
    this.emit('state', {})
  }
  // mute/solo: re-mix what is kept, cross-fade it in right away, render the rest anew
  setMuted(set) {
    this.muted = new Set(set)
    if (!this.song) return
    this.mask = this.maskOf()
    for (const [idx, { stems, n }] of this.stems) {
      const c = this.mix(stems, n), old = this.cache.get(idx)
      c.levels = old?.levels
      this.cache.set(idx, c)
    }
    const at = Math.min(this.fed ?? 0, this.end - 1, Math.round(this.pos + 0.05 * SR))
    this.node.port.postMessage({ type: 'cut', at })
    this.fed = at
    this.feed()
    this.ensureRendering()
    this.pump()
  }

  // ---- for the view ----------------------------------------------------------------------------------
  // per-track RMS at the playhead (array in song track order) or null
  levels(pos = this.pos) {
    const c = this.cache.get(Math.floor(pos / CH))
    if (!c?.levels) return null
    const nt = this.keys.length, b = Math.floor((pos % CH) / BLOCK)
    return c.levels.subarray(b * nt, b * nt + nt)
  }
  // `n` stereo samples of the output from the playhead (for the Lissajous scope)
  scope(n = 735, pos = this.pos) {
    const p = Math.floor(pos), c = this.cache.get(Math.floor(p / CH))
    if (!c) return null
    const i0 = p % CH
    return { L: c.L.subarray(i0, i0 + n), R: c.R.subarray(i0, i0 + n), gain: 0.89 / this.peak }
  }
  // fraction of the song already rendered (for the progress line under the timeline)
  cachedRanges() {
    const out = []
    let run = null
    for (let i = 0; i < this.chunks; i++) {
      const ok = this.cache.get(i)?.mask === this.mask
      if (ok && !run) out.push((run = [i, i + 1]))
      else if (ok) run[1] = i + 1
      else run = null
    }
    return out.map(([a, b]) => [(a * CH) / this.end, Math.min(1, (b * CH) / this.end)])
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }))
  }
}

// The last off-line render, reused while the source and the mutes stay the same (export, video)
let lastRender = null
export async function renderSongCached(SRC, source, opts = {}) {
  const key = source + ' ' + [...(opts.muted ?? [])].sort().join('|')
  if (!opts.only && !opts.gain && lastRender?.key === key) return lastRender.r
  const r = await renderSong(SRC, source, opts)
  if (!opts.only && !opts.gain) lastRender = { key, r }
  return r
}

// Renders a whole song off-line (for export): fresh workers, all tracks in parallel →
// { L, R } normalised to −1 dBFS like render.js, levels[block][track] for videos, keys.
export async function renderSong(SRC, source, { muted = new Set(), only = null, gain = null, onProgress = () => {}, onProblem = () => {}, signal } = {}) {
  const rt = makeRuntime(SRC)
  const { song, body } = rt.load(source)
  const sec = 60 / song.bpm, keys = trackList(song).map(([k]) => k).filter(k => !only || only.includes(k))
  const end = Math.ceil((song.length * sec + TAIL) * SR), chunks = Math.ceil(end / CH)
  const k = Math.max(1, Math.min(keys.length, 6, (navigator.hardwareConcurrency || 4) - 1))
  const groups = Array.from({ length: k }, () => [])
  keys.forEach((key, i) => groups[i % k].push(key))
  const L = new Float32Array(chunks * CH), R = new Float32Array(chunks * CH)
  const nt = keys.length, levels = new Float32Array(Math.ceil((chunks * CH) / BLOCK) * nt)
  const stats = Object.fromEntries(keys.map(k => [k, { peak: 0, sum: 0, nan: false }]))
  const workers = groups.map(() => new Worker(workerURL()))
  let total = 0
  try {
    await Promise.all(workers.map((w, i) => new Promise((resolve, reject) => {
      let done = 0
      w.onmessage = e => {
        const d = e.data
        if (d.type === 'error') return reject(new Error(d.message + (d.line ? ` (строка ${d.line})` : '')))
        if (d.type === 'problem') {
          if (stats[d.key]) stats[d.key].nan = true
          return onProblem(d)
        }
        if (d.type === 'ready' || d.type === 'chunk') {
          if (d.type === 'chunk') {
            for (const [key, s] of Object.entries(d.stems)) {
              if (!s) continue
              const j = keys.indexOf(key), on = !muted.has(key), st = stats[key]
              for (let t = 0; t < d.n; t++) {
                const a = s[0][t], b = s[1][t]
                st.peak = Math.max(st.peak, Math.abs(a), Math.abs(b))
                st.sum += a * a
                if (on) {
                  L[d.start + t] += a
                  R[d.start + t] += b
                }
                levels[((d.start + t) / BLOCK | 0) * nt + j] += (a * a + b * b) / (2 * BLOCK)
              }
            }
            done++
            onProgress(++total / (chunks * workers.length))
            if (done === chunks) return resolve()
          }
          if (signal?.aborted) return reject(new Error('отменено'))
          w.postMessage({ type: 'render', gen: 1, n: CH })
        }
      }
      w.onerror = e => reject(new Error(e.message || 'worker'))
      w.postMessage({ type: 'init', lib: rt.lib, SR, TAIL })
      w.postMessage({ type: 'load', gen: 1, body, keys: groups[i], from: 0, preroll: 0, bpm: song.bpm })
    })))
  } finally {
    workers.forEach(w => w.terminate())
  }
  for (let i = 0; i < levels.length; i++) levels[i] = Math.sqrt(levels[i])
  let peak = 0
  for (let i = 0; i < end; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  const g = gain ?? (peak > 0 ? 10 ** (-1 / 20) / peak : 1)
  const outL = new Float32Array(end), outR = new Float32Array(end)
  for (let i = 0; i < end; i++) {
    outL[i] = L[i] * g
    outR[i] = R[i] * g
  }
  for (const k of keys) {
    stats[k].peak *= g
    stats[k].rms = Math.sqrt(stats[k].sum / end) * g
  }
  return { song, L: outL, R: outR, levels, keys, gain: g, sec, end, stats }
}
