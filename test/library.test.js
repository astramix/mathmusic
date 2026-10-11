// The song library's pure parts: names in the code, file names, unique names, backup / restore.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Library, nameIn, setName, cleanName, fileName } from '../viz/app/library.js'

const SONG = `const LAYER = { name: 'pad layer' }
export default {
  name: 'rain', bpm: 80, length: 16,
  tracks: { pad: { name: 'not this' } },
}`

test('nameIn reads the song’s own name, not one before export default', () => {
  assert.equal(nameIn(SONG), 'rain')
  assert.equal(nameIn('export default { bpm: 1 }', 'fallback'), 'fallback')
  assert.equal(nameIn(`export default { name: "двойные" }`), 'двойные')
})

test('setName renames only the song and adds a name when there is none', () => {
  const s = setName(SONG, 'Ночной дождь')
  assert.equal(nameIn(s), 'Ночной дождь')
  assert.ok(s.includes(`{ name: 'pad layer' }`) && s.includes(`{ name: 'not this' }`))
  assert.equal(s.split('\n').length, SONG.split('\n').length)
  const added = setName('export default { bpm: 90, length: 8 }', `it's "mine"`)
  assert.equal(nameIn(added), 'its mine')
  assert.equal(cleanName('  a\\b`c\n d  '), 'abc d')
})

test('fileName: Cyrillic in Latin letters, distinct names stay distinct', () => {
  assert.equal(fileName('Ночной дождь'), 'Nochnoy_dozhd')
  assert.equal(fileName('щука и ёж'), 'shchuka_i_yozh')
  assert.equal(fileName('Café № 5'), 'Cafe_No_5')
  assert.equal(fileName('lofi'), 'lofi')
  assert.equal(fileName('***'), 'song')
  assert.notEqual(fileName('Дождь'), fileName('Снег'))
})

const lib = () => {
  const l = new Library({ songs: { lofi: 'export default { name: "lofi" }' } })
  for (const e of [
    { id: 'user:a', name: 'rain', source: setName(SONG, 'rain'), kind: 'user' },
    { id: 'user:b', name: 'rain 2', source: setName(SONG.replace('bpm: 80', 'bpm: 96'), 'rain 2'), kind: 'user' },
  ]) l.user.set(e.id, e)
  return l
}

test('uniqueName adds a number only when the name is taken (any case, built-ins too)', () => {
  const l = lib()
  assert.equal(l.uniqueName('snow'), 'snow')
  assert.equal(l.uniqueName('Rain'), 'Rain 3')
  assert.equal(l.uniqueName('LOFI'), 'LOFI 2')
  assert.equal(l.uniqueName('rain', 'user:a'), 'rain') // its own name is free for itself
})

test('restore: new songs come in, unchanged are skipped, changed ones come as copies', async () => {
  const l = lib(), drafts = new Map([['user:a', 'my draft']])
  const data = l.backup(drafts)
  assert.equal(data.songs.length, 2)
  assert.deepEqual(Object.keys(data.drafts), ['user:a'])
  const other = lib()
  other.user.get('user:b').source = setName(SONG.replace('bpm: 80', 'bpm: 120'), 'changed here') // other code
  other.user.get('user:b').name = 'changed here'
  other.user.delete('user:a')
  const d2 = new Map()
  const r = await other.restore(JSON.parse(JSON.stringify(data)), d2)
  assert.deepEqual(r, { added: 1, same: 0, copies: 1 })
  assert.equal(other.user.get('user:a').source, l.user.get('user:a').source)
  assert.equal(d2.get('user:a'), 'my draft')
  assert.equal(other.user.get('user:b').name, 'changed here') // not overwritten
  const copy = [...other.user.values()].find(e => !['user:a', 'user:b'].includes(e.id))
  assert.equal(copy.name, 'rain 2') // 'rain 2' is free here: this one was renamed
  assert.equal(nameIn(copy.source), 'rain 2')
  assert.deepEqual(await other.restore(data, d2), { added: 0, same: 2, copies: 0 })
  await assert.rejects(() => other.restore({ songs: [] }, d2))
})
