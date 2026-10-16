// The song library: names and styles in the code, file names, unique names, and my_songs/ as files
// (through a folder handle faked in memory, as File System Access gives it).
import test from 'node:test'
import assert from 'node:assert/strict'
import { Library, nameIn, styleIn, setName, cleanName, fileName, fromFile, fileFor } from '../viz/app/library.js'

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

test('styleIn reads the song’s style', () => {
  assert.equal(styleIn(`const X = { style: 'not this' }
export default { name: 'a', style: 'lofi', bpm: 80 }`), 'lofi')
  assert.equal(styleIn(SONG), null)
})

test('fromFile: id and kind from library.json, else from the file itself', () => {
  const gen = 'export default { name: "g", generator: { style: "lofi", seed: 1 } }'
  assert.deepEqual([fromFile('g.js', gen, 5).id, fromFile('g.js', gen, 5).kind, fromFile('g.js', gen, 5).pristine], ['mine:g', 'generated', false])
  const e = fromFile('rain.js', SONG, 5, { 'rain.js': { id: 'user:x', kind: 'user', pristine: true, updated: 9 } })
  assert.deepEqual([e.id, e.name, e.kind, e.pristine, e.updated, e.created, e.where], ['user:x', 'rain', 'user', true, 9, 5, 'disk'])
})

test('fileFor keeps a file that still fits the name, else the first free one', () => {
  const taken = new Set(['Dozhd.js', 'Dozhd-2.js'])
  assert.equal(fileFor('Дождь', null, taken), 'Dozhd-3.js')
  assert.equal(fileFor('Дождь', 'Dozhd-2.js', taken), 'Dozhd-2.js')
  assert.equal(fileFor('Снег', 'Dozhd-2.js', taken), 'Sneg.js')
})

// a folder in memory: what showDirectoryPicker() hands the page
function fakeDir(name = 'my_songs') {
  const files = new Map()
  const handle = f => ({
    kind: 'file',
    getFile: async () => ({ text: async () => files.get(f), lastModified: 1 }),
    createWritable: async () => { let buf = ''; return { write: async t => { buf += t }, close: async () => { files.set(f, buf) } } },
  })
  return {
    name, files, kind: 'directory',
    async *entries() { for (const f of [...files.keys()]) yield [f, handle(f)] },
    async getFileHandle(f, { create = false } = {}) {
      if (!files.has(f)) { if (!create) throw Object.assign(new Error(f), { name: 'NotFoundError' }); files.set(f, '') }
      return handle(f)
    },
    async removeEntry(f) { if (!files.delete(f)) throw Object.assign(new Error(f), { name: 'NotFoundError' }) },
    queryPermission: async () => 'granted', requestPermission: async () => 'granted',
  }
}

test('my_songs/: songs are files, renamed songs move, waiting songs go in, removal deletes', async () => {
  const dir = fakeDir()
  dir.files.set('by-hand.js', setName(SONG, 'by hand'))
  const l = new Library({ songs: {} })
  // saved before the folder was there: waits (as if in IndexedDB)
  const early = await l.save({ name: 'Дождь', source: setName(SONG, 'Дождь'), kind: 'user' })
  assert.equal(early.where, 'pending')
  await l.attach(dir, 'disk')
  assert.equal(l.get(early.id).where, 'disk')
  assert.equal(dir.files.get('Dozhd.js'), setName(SONG, 'Дождь'))
  assert.equal(l.get('mine:by-hand').name, 'by hand')
  const index = () => JSON.parse(dir.files.get('library.json')).songs
  assert.equal(index()['Dozhd.js'].id, early.id)

  // rename: the file moves, the id stays
  const r = await l.save({ ...l.get(early.id), source: setName(SONG, 'Снег') })
  assert.equal(r.id, early.id)
  assert.equal(r.file, 'Sneg.js')
  assert.ok(!dir.files.has('Dozhd.js') && dir.files.has('Sneg.js'))
  assert.deepEqual(Object.keys(index()), ['Sneg.js'])

  // two songs whose names make the same file name
  const a = await l.save({ name: 'a b', source: setName(SONG, 'a b'), kind: 'user' })
  const b = await l.save({ name: 'a_b', source: setName(SONG, 'a_b'), kind: 'user' })
  assert.deepEqual([a.file, b.file], ['a_b.js', 'a_b-2.js'])

  // what another tab (or a hand) changed in the folder is read again
  dir.files.set('a_b.js', setName(SONG.replace('bpm: 80', 'bpm: 99'), 'a b'))
  const seen = []
  l.on((id, e, remote) => seen.push([id, e?.source.includes('bpm: 99'), remote]))
  await l.reload('tab')
  assert.deepEqual(seen, [[a.id, true, 'tab']])

  await l.remove(b.id)
  assert.ok(!dir.files.has('a_b-2.js') && !l.get(b.id))
  assert.ok(!(b.file in index()))
  // the page built with my_songs/ embedded shows the same songs before the folder is connected
  const embedded = new Library({ songs: {}, mine: Object.fromEntries([...dir.files].filter(([f]) => f.endsWith('.js')).map(([f, source]) => [f, { source, mtime: 1 }])), mineIndex: JSON.parse(dir.files.get('library.json')) })
  assert.deepEqual(embedded.list().map(e => e.id).sort(), l.list().map(e => e.id).sort())
})

test('generated/: untouched 🎲 songs live there, Ctrl+S moves one to my_songs/, old ones move over, listed last', async () => {
  const mine = fakeDir('my_songs'), gen = fakeDir('generated')
  const GEN = n => setName(SONG.replace('bpm: 80', 'bpm: 80, generator: { style: "lofi", seed: 1 }'), n)
  // a generated song from before generated/ existed, untouched, sitting in my_songs/
  mine.files.set('old.js', GEN('old'))
  mine.files.set('library.json', JSON.stringify({ songs: { 'old.js': { id: 'user:old', kind: 'generated', pristine: true } } }))
  mine.files.set('mine.js', setName(SONG, 'mine'))
  const l = new Library({ songs: { lofi: 'export default { name: "lofi" }' } })
  await l.attach(mine, 'disk', gen)
  assert.ok(!mine.files.has('old.js') && gen.files.has('old.js'), 'moved to generated/')
  assert.equal(l.get('user:old').shelf, 'gen')

  const g = await l.save({ name: 'Новая', source: GEN('Новая'), kind: 'generated', pristine: true })
  assert.equal(g.shelf, 'gen')
  assert.ok(gen.files.has('Novaya.js') && !mine.files.has('Novaya.js'))
  assert.deepEqual(l.list().map(e => e.name), ['lofi', 'mine', 'Новая', 'old']) // built-in, mine, generated (newest first)

  // Ctrl+S: no longer pristine → my_songs/, and out of generated/ (file and library.json line)
  const s = await l.save({ ...l.get(g.id), pristine: false })
  assert.equal(s.shelf, 'mine')
  assert.ok(mine.files.has('Novaya.js') && !gen.files.has('Novaya.js'))
  assert.ok(!(('Novaya.js') in JSON.parse(gen.files.get('library.json')).songs))
  assert.equal(JSON.parse(mine.files.get('library.json')).songs['Novaya.js'].id, g.id)

  await l.remove('user:old')
  assert.ok(!gen.files.has('old.js'))

  // a copy in another mode («эта же музыка в …») is unsaved too: generated/ until Ctrl+S
  const c = await l.save({ name: 'rain · D дорийский', source: setName(SONG, 'rain · D дорийский'), kind: 'user', base: 'builtin:rain', pristine: true })
  assert.equal(c.shelf, 'gen')
  assert.equal((await l.save({ ...l.get(c.id), pristine: false })).shelf, 'mine')

  // without generated/ (only my_songs/ was chosen) a generated song waits in the browser
  const only = new Library({ songs: {} })
  await only.attach(fakeDir('my_songs'), 'disk', null)
  assert.equal((await only.save({ name: 'x', source: GEN('x'), kind: 'generated', pristine: true })).where, 'pending')
})
