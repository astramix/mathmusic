// The jazz style: the walking bass (the root on each chord's first beat, a half-step approach to the next root), rootless
// piano voicings (no root, the third and seventh always), swing 0.66, trading fours (the horn and the drums take turns).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { generate } from '../src/generate.js'

const DIR = path.resolve('out/_test_jazz')
fs.mkdirSync(DIR, { recursive: true })
const load = async (name, source) => {
  const file = path.join(DIR, name + '.mjs')
  fs.writeFileSync(file, source.replace(/(['"])\.\.\/src\//g, `$1${pathToFileURL(path.resolve('src')).href}/`))
  return (await import(pathToFileURL(file).href)).default
}
const pc = n => ((n % 12) + 12) % 12

test('jazz: walking bass, rootless voicings, swing, trading fours', async () => {
  for (const seed of [1, 2, 3, 4]) {
    const { source, meta } = generate({ style: 'jazz', seed })
    const song = await load(`j${seed}`, source)
    assert.match(source, /const SW = 0\.66/)
    const H = [...source.matchAll(/^ {2}\[([\d.]+), ([\d.]+), ([\d.]+), \[([\d., ]+)\], '([^']+)', \[([\d., ]+)\]\],$/gm)].map(m => ({ at: +m[1], len: +m[2], bass: +m[3], v: m[4].split(',').map(Number), sym: m[5], ivs: m[6].split(',').map(Number) }))
    assert.ok(H.length > 20)
    const bass = song.tracks.bass
    let roots = 0, firsts = 0, approaches = 0, lasts = 0
    for (let i = 0; i + 1 < H.length; i++) {
      const h = H[i], nx = H[i + 1]
      if (h.at >= song.length - 8) break
      const first = bass.midi(h.at + 0.1)
      if (first.length) { firsts++; if (pc(first[0]) === pc(h.bass)) roots++ }
      if (h.len >= 2 && nx.at === h.at + h.len) {
        const last = bass.midi(h.at + h.len - 1 + 0.1)
        if (last.length) { lasts++; const d = pc(last[0] - nx.bass); if (d === 1 || d === 11) approaches++ }
      }
    }
    assert.ok(roots / firsts > 0.95, `#${seed}: roots on the first beat ${roots}/${firsts}`)
    assert.ok(approaches / lasts > 0.95, `#${seed}: chromatic approaches ${approaches}/${lasts}`)
    // rootless: a seventh chord's voicing has its third and seventh and not its root
    for (const h of H.filter(h => h.v.length === 4)) {
      const root = pc(h.bass), pcs = h.v.map(pc)
      assert.ok(!pcs.includes(root) || /°7/.test(h.sym), `${h.sym}: root in ${h.v}`)
      assert.ok(pcs.includes(pc(root + h.ivs[0])), `${h.sym}: no third`)
    }
    // trading fours: in the trade section the soloist plays only in bars 1–4, 9–12…
    const trade = song.sections.find(s => s[1] === 'trading fours')
    if (trade) {
      const solo = Object.entries(song.tracks).find(([k]) => k === meta.instruments.lead2 || k === meta.instruments.lead2 + ' II')?.[1]
      let inOdd = 0, inEven = 0
      for (let x = trade[0]; x < trade[0] + 64; x += 0.25) if (solo.midi(x).length) (Math.floor((x - trade[0]) / 16) % 2 ? inOdd++ : inEven++)
      assert.ok(inEven > 10 && inOdd === 0, `#${seed}: soloist in the drums' bars: ${inOdd}`)
    }
  }
})
