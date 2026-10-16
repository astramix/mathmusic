// The output stage, in the browser's audio thread (AudioWorklet): plays the mixed song from a queue
// of segments that the page sends ahead, sample-accurately, and reports where it is. Nothing here
// waits on the page: if data is late it holds its position (fading to silence) instead of skipping.
//
// page → here  {type:'seek', pos} · {type:'data', start, L, R} · {type:'cut', at} (data from `at` on
//              will be replaced: the old samples cross-fade into the new ones) · {type:'gain', value} ·
//              {type:'master', params | null} (the master bus of src/master.js, put in front of this file)
// here → page  {type:'pos', pos, t, stalled, meter?: {M, S, I, tp, gr, comp}}
const XF = 1024 // cross-fade length, samples (23 ms)
const FADE = 256

class MathMusicOut extends AudioWorkletProcessor {
  constructor() {
    super()
    this.q = []
    this.pos = 0
    this.gain = 1
    this.g = 1
    this.xf = null
    this.fadeIn = FADE
    this.tl = 0
    this.tr = 0
    this.stalled = true
    this.tick = 0
    this.master = null
    this.meter = typeof loudnessMeter === 'function' ? loudnessMeter(sampleRate) : null
    this.meterTick = 0
    this.port.onmessage = e => this.message(e.data)
  }
  message(d) {
    if (d.type === 'seek') {
      this.q = []
      this.pos = d.pos
      this.xf = null
      this.meter?.reset()
    } else if (d.type === 'data') {
      if (d.start + d.L.length <= this.pos) return
      const q = this.q
      let i = q.length
      while (i > 0 && q[i - 1].start > d.start) i--
      q.splice(i, 0, { start: d.start, L: d.L, R: d.R })
    } else if (d.type === 'cut') {
      const at = Math.max(d.at, this.pos), oldL = new Float32Array(XF), oldR = new Float32Array(XF)
      let have = 0
      const kept = []
      for (const s of this.q) {
        const end = s.start + s.L.length
        for (let p = Math.max(at, s.start); p < Math.min(end, at + XF); p++) {
          oldL[p - at] = s.L[p - s.start]
          oldR[p - at] = s.R[p - s.start]
          have = Math.max(have, p - at + 1)
        }
        if (s.start >= at) continue
        kept.push(end > at ? { start: s.start, L: s.L.subarray(0, at - s.start), R: s.R.subarray(0, at - s.start) } : s)
      }
      this.q = kept
      this.xf = have >= XF ? { at, L: oldL, R: oldR } : null
    } else if (d.type === 'gain') this.gain = d.value
    else if (d.type === 'master') {
      if (!d.params) this.master = null
      else if (this.master) this.master.set(d.params)
      else this.master = masterChain(d.params, sampleRate)
      if (d.reset) this.meter?.reset()
    }
  }
  process(inputs, outputs) {
    const out = outputs[0], L = out[0], R = out[1] ?? out[0], q = this.q
    let stalled = false
    for (let i = 0; i < L.length; i++) {
      while (q.length && q[0].start + q[0].L.length <= this.pos) q.shift()
      const s = q[0]
      if (!s || s.start > this.pos) {
        // no data yet: hold the position, let the last sample die away
        this.tl *= 0.97
        this.tr *= 0.97
        L[i] = this.tl
        R[i] = this.tr
        stalled = true
        this.fadeIn = 0
        continue
      }
      const j = this.pos - s.start
      let l = s.L[j], r = s.R[j]
      const x = this.xf
      if (x && this.pos >= x.at) {
        const k = this.pos - x.at
        if (k < XF) {
          const w = (k + 0.5) / XF
          l = x.L[k] * (1 - w) + l * w
          r = x.R[k] * (1 - w) + r * w
        } else this.xf = null
      }
      this.g += (this.gain - this.g) * 0.0005
      l *= this.g
      r *= this.g
      if (this.fadeIn < FADE) {
        // after a stall or a seek: fade in from the dying tail of what played before
        const a = ++this.fadeIn / FADE
        this.tl *= 0.97
        this.tr *= 0.97
        l = l * a + this.tl * (1 - a)
        r = r * a + this.tr * (1 - a)
      }
      if (this.master) [l, r] = this.master.process(l, r)
      l = l > 1 ? 1 : l < -1 ? -1 : l
      r = r > 1 ? 1 : r < -1 ? -1 : r
      L[i] = l
      R[i] = r
      if (this.meter && !stalled) this.meter.push(l, r)
      if (this.fadeIn >= FADE) (this.tl = l), (this.tr = r)
      this.pos++
    }
    if (++this.tick >= 6 || stalled !== this.stalled) {
      this.tick = 0
      this.stalled = stalled
      // the playhead is what is heard: the master's look-ahead delays the sound by a few ms
      const pos = this.pos - (this.master ? this.master.latency : 0)
      const msg = { type: 'pos', pos, t: currentTime, stalled }
      if (this.meter && ++this.meterTick >= 5) { this.meterTick = 0; msg.meter = { ...this.meter.read(), gr: this.master?.gr ?? 0, comp: this.master?.comp ?? 0 } }
      this.port.postMessage(msg)
    }
    return true
  }
}
registerProcessor('mathmusic-out', MathMusicOut)
