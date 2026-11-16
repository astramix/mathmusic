// Songs from elsewhere (sandbox.js): which code may run in the page.
// A foreign song's code must never run in the page. runtime.js load() is the page's only way to run a song, and it asks
// here: a source the sandbox has seen (taint) is refused, and so is everything while the open song is foreign (ambient) —
// unless the caller says the source is one of the user's own (`own`: it comes from a library entry that is not foreign).
// The library asks ambientNow() when a song is saved: one made from a foreign song is foreign too.
// (No imports: library.js uses it and is also loaded by the tests in Node.)
const foreignSources = new Map() // source text → the entry's id
let ambientForeign = () => false
export const guard = {
  taint: (source, id = '') => { foreignSources.set(source, id) },
  untaint: id => { for (const [s, i] of foreignSources) if (i === id) foreignSources.delete(s) },
  ambient: f => { ambientForeign = f },
  ambientNow: () => ambientForeign() === true,
  needs: (source, own = false) => !own && (foreignSources.has(source) || ambientForeign() === true),
}
