// Projects: songs whose parts are plain notes — the app's multitrack editor (the piano roll's track list, «Песня → Новый
// проект»). A project is a block of code in the song file between two marker lines:
//   PROJECT = { song?, removed?, tracks: [{ id, name, inst, vol, pan, fx, notes: [[beat, MIDI, length, velocity]], gen? }] }
//   — plain data (JSON), then the instruments the tracks use (recipes from the library: a real piano, the bowed strings,
//   the exactly tuned plucked strings, the winds, the drum kits…), then __project(song): it adds a track per PROJECT
//   track to the song, drops the song's own tracks listed in `removed`, and applies `song` (bpm, key, mode, length,
//   sections) for a project made from scratch.
// Any song becomes a project when a track is added to it: the block goes in front of `export default`, whose object is
// wrapped in __project(…) — the song's own tracks keep playing, written in code as before; one can be turned into notes
// (readTrackNotes) or removed.
// MIDI numbers may be fractional (63.5 = E𝄳4): every pitch is 440 · 2^((n − 69)/12), exactly.
// Shared by the app (viz/app/projectui.js), the generator's helpers there and test/project.test.js — not imported by songs.

export const MAX_TRACKS = 32
export const START = '// ==== MathMusic project'
export const END = '// ==== end of the project'
const DATA_END = '// ---- end of PROJECT'

// ---- the instruments ------------------------------------------------------------------------------------------------
// kind: 'poly' (struck or plucked: hit per note), 'mono' (one sustained voice: the newest note), 'chord' (all sounding
// notes at once), 'drums' (a note number = a drum, General MIDI where it has one). role: the lane in the picture and
// what a generated part it takes (lead, keys, pad, bass, drums). range: the instrument's notes. fx: its usual room.
// program: General MIDI (−1 = drums on channel 10) for the MIDI export.
// make: (sec, o) ⇒ { hit?(n, vel, length, at), out(x, sounding) ⇒ sample | [l, r] } — sounding = [[beat, n, length, vel]].
const I = (id, label, group, kind, role, range, fx, color, program, formula, make) => ({ id, label, group, kind, role, range, fx, color, program, formula, make })
const STRUCK = (tone, { release, life, gain, max = 32, extra = '' }) =>
  `sec => { const p = poly(${tone}, { release: ${release}, life: ${life}, max: ${max} }); return { hit: (n, v, d) => p.hit(F(n), v, d * sec + ${release}), out: x => ${gain} * p()${extra} } }`
// a plucked string model: hit(f, vel); notes struck together are strummed 6 ms apart
const PLUCKED = (make, gain, vel = 'v', post = y => y) =>
  `sec => { const s = ${make}; let at = -1, k = 0; return { hit: (n, v, d, b) => { k = b === at ? k + 1 : 0; at = b; s.hit(F(n), ${vel}${make.startsWith('plucker') ? `, { bright: BRIGHT, at: floor(k * 0.006 * SR) }` : ''}) }, out: () => ${post(`${gain} * s()`)} } }`
// one sustained voice: the newest sounding note, articulated (off for the last 7 % of a note), louder with velocity
const MONO = (setup, sound, gain) =>
  `sec => { ${setup}; let f = 440, lv = smooth(25); return { out: (x, act) => { const m = act[act.length - 1], on = !!m && x - m[0] < 0.93 * m[2]; if (m) f = F(m[1]); const a = lv(m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 0.5); return ${gain} * a * ${sound} } } }`
const CHORD = (setup, sound) => `sec => { ${setup}; const lv = smooth(40); return { out: (x, act) => { const on = act.filter(m => x - m[0] < 0.95 * m[2]), fs = on.map(m => F(m[1])), v = lv(on.length ? on.reduce((s, m) => s + (m[3] ?? 0.8), 0) / on.length : 0.8), a = 0.45 + 0.7 * v; const y = ${sound}; return [a * y[0], a * y[1]] } } }`

const KEYS = 'Клавишные', MALLETS = 'Мелодические ударные', PLUCK = 'Щипковые', BOWED = 'Смычковые', WINDS = 'Духовые', VOICES = 'Голоса', SYNTH = 'Синтезаторы', BASS = 'Бас', GAMELAN = 'Гамелан', DRUMS = 'Ударные'
export const INSTRUMENTS = [
  I('piano', 'Рояль', KEYS, 'poly', 'keys', [21, 108], 'hall', '#ffffff', 0,
    ['P(f,t,v) = 0.35\\sum_{k=1}^{6}\\frac{v^{0.4+0.25k}}{k^{1.15}}\\big(0.7e^{-d_k t}+0.3e^{-0.12d_k t}\\big)\\big(\\sin 2\\pi f_k t+\\sin(2\\pi\\cdot1.0006 f_k t+k)\\big)', 'f_k = kf\\sqrt{1+0.0004k^2},\\quad f = 440\\cdot 2^{(n-69)/12}'],
    STRUCK('pianoTone', { release: 0.4, life: 6, gain: 0.3 })),
  I('epiano', 'Электропиано (Rhodes)', KEYS, 'poly', 'keys', [28, 103], 'echo', '#ffcf9f', 4,
    ['E(f,t,v) = v\\Big(\\sin\\!\\big(2\\pi ft + (0.5+1.8v^2)e^{-4t}\\sin 2\\pi ft\\big)\\,e^{-t/(1+250/f)} + 0.2v\\,e^{-35t}\\sin 2\\pi\\,14ft\\Big)', 'y = \\Cho\\big[(1 - 0.2\\sin 2\\pi\\,3.5T)\\sum E\\big]'],
    `sec => { const p = poly(epianoTone, { release: 0.35, life: 6 }), ch = chorus({ mix: 0.35 }); return { hit: (n, v, d) => p.hit(F(n), v, d * sec + 0.35), out: x => { const y = 0.2 * p() * (1 - 0.2 * sin(TAU * 3.5 * x * sec)); return ch(y, y) } } }`),
  I('harpsichord', 'Клавесин', KEYS, 'poly', 'keys', [29, 89], 'hall', '#f2d38a', 6,
    ['y[n] = 0.996\\big(0.65\\,y[n-N] + 0.35\\,y[n-N+1]\\big),\\quad N = SR/f\\quad\\text{— Карплус–Стронг, перо щиплет струну}'],
    PLUCKED('plucker({ life: 2.5, decay: 0.995 })', 0.62, '0.25 * v + 0.12', y => `hp(${y}, 150)`).replace('sec => {', "sec => { const BRIGHT = 0.65, hp = filter('hp');")),
  I('organ', 'Орган', KEYS, 'chord', 'pad', [36, 96], 'hall', '#7f6bd6', 19,
    ['O = \\sum_{j}\\sum_{s} g_s\\,\\sin 2\\pi\\,r_s f_j t\\quad r = (1, 2, 3, 4)\\ \\text{— регистры 8′ 4′ 2⅔′ 2′, «чифф» воздуха на атаке'],
    CHORD('const o = organ({ voices: 6, gain: 0.07 })', 'o(fs)')),
  I('celesta', 'Челеста', KEYS, 'poly', 'keys', [60, 108], 'echo', '#fff3b0', 8,
    ['Ce = v\\,e^{-t(1.2 + f/900)}\\big(\\sin 2\\pi ft + 0.25e^{-9t}\\sin 2\\pi\\,4ft + 0.08v\\,e^{-60t}\\sin 2\\pi\\,9.2ft\\big)'],
    STRUCK('celestaTone', { release: 0.5, life: 4, gain: 0.35 })),

  I('vibes', 'Вибрафон', MALLETS, 'poly', 'keys', [53, 89], 'hall', '#b8f0ff', 11,
    ['V(f,t,v) = v\\,e^{-t/2.2}\\big(\\sin 2\\pi ft + 0.3e^{-5t}\\sin 2\\pi\\,3.98ft + 0.08e^{-20t}\\sin 2\\pi\\,9.8ft\\big)\\cdot\\big(1 - 0.35\\,\\tfrac{1+\\sin 2\\pi\\,5.5T}{2}\\big)'],
    STRUCK('vibesTone', { release: 0.5, life: 6, gain: 0.25, extra: ' * (1 - 0.35 * (0.5 + 0.5 * sin(TAU * 5.5 * x * sec)))' })),
  I('marimba', 'Маримба', MALLETS, 'poly', 'keys', [45, 96], 'room', '#ffc38a', 12,
    ['M(f,t,v) = v\\,e^{-t(2+f/500)}\\big(\\sin 2\\pi ft + 0.25e^{-12t}\\sin 2\\pi\\,3.93ft + 0.06e^{-40t}\\sin 2\\pi\\,9.9ft\\big)'],
    STRUCK('marimbaTone', { release: 0.2, life: 3, gain: 0.32 })),
  I('bells', 'Колокольчики (FM)', MALLETS, 'poly', 'keys', [60, 108], 'echo', '#fff3b0', 9,
    ['B = v\\,e^{-1.6t}\\sin\\!\\big(2\\pi ft + 2.2e^{-4t}\\sin 2\\pi\\,3.5ft\\big)'],
    STRUCK('(f, t, v) => v * fm(f, t, { ratio: 3.5, index: 2.2, decay: 1.6, idecay: 4 })', { release: 0.8, life: 5, gain: 0.4 })),
  I('timpani', 'Литавры', MALLETS, 'poly', 'bass', [38, 60], 'hall', '#9c6644', 47,
    ['Ti = v\\sum_k a_k e^{-t/T_k}\\sin 2\\pi\\,r_k f t,\\quad r = (1, 1.5, 1.98, 2.44, 2.94, 1.65)\\ \\text{— моды котла, удар войлоком'],
    STRUCK('timpaniTone', { release: 0.6, life: 4, gain: 0.6, max: 12 })),
  I('templebell', 'Храмовый колокол', MALLETS, 'poly', 'keys', [36, 84], 'hall', '#ffe8a0', 14,
    ['Bo = \\sum_k a_k e^{-t/T_k}\\big(\\sin 2\\pi r_k f t + \\sin 2\\pi\\,1.00075\\,r_k f t\\big),\\quad r = (\\tfrac12, 1, 1.2, 1.5, 2, \\ldots)'],
    STRUCK('templeBellTone', { release: 2, life: 12, gain: 0.3, max: 8 })),

  I('guitar', 'Нейлоновая гитара', PLUCK, 'poly', 'keys', [40, 88], 'room', '#ffcf9f', 24,
    ['G = \\Cho\\big[0.6\\LP_{5k}s + 0.5\\BP_{105}s + 0.35\\BP_{210}s + 0.2\\BP_{420}s\\big],\\quad s:\\ \\text{Карплус–Стронг, щипок у подставки'],
    PLUCKED('plucker({ life: 3, decay: 0.997 })', 0.34, '0.25 + 0.5 * v', y => `(z => ch(z, z))(body(${y}))`).replace('sec => {', 'sec => { const BRIGHT = 0.5, body = guitarBody(), ch = chorus({ mix: 0.25, rate: 0.3 });')),
  I('harp', 'Арфа', PLUCK, 'poly', 'keys', [24, 103], 'hall', '#ffd6e0', 46,
    ['Hp(f,t,v) = 0.55\\sum_{k=1}^{10}\\frac{|\\sin(\\pi k/7)|}{k^{1.4}}\\,v^{0.3+0.12k}e^{-d_k t}\\sin 2\\pi kft\\quad\\text{— щипок на } 1/7 \\text{ струны}'],
    STRUCK('harpTone', { release: 0.6, life: 6, gain: 0.26, max: 24 })),
  I('koto', 'Кото', PLUCK, 'poly', 'keys', [50, 91], 'hall', '#8ecae6', 107,
    ['K = 0.75\\LP s + 0.7\\BP_{210}s + 0.4\\BP_{650}s + 0.35\\,\\HP\\,\\text{tsume},\\quad s:\\ y[n] = e[n] + g\\big(a\\,y[n-D] + (1-a)\\,y[n-D-1]\\big),\\ D = \\tfrac{SR}{f} - \\varphi(f)'],
    PLUCKED('koto()', 4, '0.45 + 0.5 * v')),
  I('shamisen', 'Сямисэн', PLUCK, 'poly', 'lead', [48, 84], 'room', '#ffd166', 106,
    ['Sh = 0.45s + 1.1\\BP_{450}s + 0.75\\BP_{1800}s + 0.35\\BP_{3200}s + 0.5\\,\\text{бати},\\quad D(t) = D_0\\big(1 - 0.012\\max(0, y)\\big)\\ \\text{— сawari'],
    PLUCKED('shamisen()', 2.4, '0.45 + 0.55 * v')),
  I('biwa', 'Бива', PLUCK, 'poly', 'lead', [40, 76], 'room', '#c9a27a', 105,
    ['Bw = 0.6\\LP s + \\BP_{300}s + 0.45\\BP_{1100}s,\\quad \\text{много sawari, тяжёлый бати'],
    PLUCKED('biwa()', 2.4, '0.45 + 0.55 * v')),
  I('oud', 'Уд', PLUCK, 'poly', 'lead', [40, 76], 'room', '#e0a060', 25,
    ['O = 0.55\\LP s + 0.5\\BP_{110}s + 0.6\\BP_{250}s + 0.35\\BP_{600}s,\\quad D = \\tfrac{SR}{f} - \\varphi(f)\\ \\text{— четверть тона точно'],
    PLUCKED('oud()', 1.25, '0.35 + 0.5 * v')),
  I('qanun', 'Канун', PLUCK, 'poly', 'keys', [48, 91], 'hall', '#f2d38a', 15,
    ['Q = \\sum_{c \\in \\{-3, 0, 3\\}} s\\big(f\\cdot 2^{c/1200}\\big)\\quad\\text{— хор из трёх струн'],
    PLUCKED('qanun()', 1.3, '0.3 + 0.45 * v')),
  I('sitar', 'Ситар', PLUCK, 'poly', 'lead', [48, 84], 'hall', '#ffb060', 104,
    ['Si = 0.55x + 0.6\\BP_{180}x + 0.35\\BP_{2400}x,\\quad x:\\ D(t) = \\big(\\tfrac{SR}{f} - \\varphi\\big)\\big(1 - 0.03\\max(0, y)\\big)\\ \\text{— джавари'],
    PLUCKED('sitar({})', 0.5, '0.55 + 0.4 * v')),

  I('violin', 'Скрипка', BOWED, 'mono', 'lead', [55, 100], 'hall', '#ffd9a8', 40,
    ['Vn = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i=1}^{4}\\tfrac{G_i}{Q_i}\\BP_{R_i}\\,s\\Big),\\quad s = \\saw\\!\\big(f\\cdot 2^{\\,0.18\\min(1,t/0.4)\\sin(2\\pi\\cdot5.6T)/12}\\big) + 0.04\\eta', 'R = (300, 520, 1100, 2700)\\ \\text{Гц — резонансы корпуса}'],
    `sec => { const bow = bowed({ base: F(60), sec }), lv = smooth(25); return { out: (x, act) => { const m = act[act.length - 1]; return 0.36 * lv(m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 0.5) * bow(m && { n: m[1] - 60, d: m[2], τ: x - m[0] }, x * sec) } } }`),
  I('cello', 'Виолончель', BOWED, 'mono', 'bass', [36, 76], 'hall', '#c08a5a', 42,
    ['Vc = g(t)\\Big(0.3\\,\\LP\\,s + \\sum_{i}\\tfrac{G_i}{Q_i}\\BP_{0.6R_i}\\,s\\Big),\\quad s = \\saw(f\\cdot 2^{\\text{vib}/12})'],
    `sec => { const bow = bowed({ base: F(60), body: 0.6, sec }), lv = smooth(25); return { out: (x, act) => { const m = act[act.length - 1]; return 0.28 * lv(m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 0.5) * bow(m && { n: m[1] - 60, d: m[2], τ: x - m[0] }, x * sec) } } }`),
  I('strings', 'Струнный оркестр', BOWED, 'chord', 'pad', [28, 96], 'hall', '#d9b8ff', 48,
    ['S = \\HP_{120}\\LP_{3000}\\sum_{j}\\sum_{u=-1}^{1}\\saw\\big(f_j\\,2^{0.09u/12}\\,2^{0.12\\sin(2\\pi r_u T)/12}\\big)\\quad\\text{— смычки, атака 0.35 с'],
    CHORD('const s = strings({ voices: 6, attack: 350, release: 800, cutoff: 3000, gain: 0.045 }), ch = chorus({ mix: 0.4 })', 'ch(...s(fs))')),

  I('flute', 'Флейта', WINDS, 'mono', 'lead', [60, 96], 'echo', '#e8f4ff', 73,
    ['Fl = a\\big(0.6\\sin 2\\pi\\!\\int\\! g + 0.1\\sin 4\\pi\\!\\int\\! g + 0.06\\,\\BP_{2g}\\,\\eta + 0.5e^{-25t}\\,\\HP_{3000}\\,\\eta\\big)', 'g = f\\cdot 2^{\\,0.2\\min(1,\\,t/0.6)\\sin(2\\pi\\cdot 5.2T)/12}'],
    MONO('const fl = flute()', 'fl(f, on)', 0.34)),
  I('whistle', 'Вистл / синобуэ', WINDS, 'mono', 'lead', [62, 98], 'echo', '#a8f0c8', 78,
    ['Sb = a\\big(0.55\\sin 2\\pi\\!\\int\\! g + 0.15\\sin 4\\pi\\!\\int\\! g + 0.05\\BP_{2g}\\eta + \\text{чифф}\\big)\\quad\\text{— высокая яркая флейта'],
    MONO('const fl = shinobue()', 'fl(f, on)', 0.9)),
  I('shakuhachi', 'Сякухати', WINDS, 'mono', 'lead', [50, 86], 'hall', '#c8e6a0', 77,
    ['Sk = a\\big(0.45\\sin 2\\pi\\!\\int\\! g + 0.16(\\BP_g + \\BP_{2g})\\eta\\big),\\quad g = f\\cdot 2^{(-0.7(1-s(t)) + 0.3\\,\\text{yuri})/12}\\ \\text{— мери и юри'],
    MONO('const sh = shakuhachi()', 'sh(f, on, { accent: m && m[2] * sec > 0.8 ? 0.6 : 0.1 })', 1)),
  I('ney', 'Най', WINDS, 'mono', 'lead', [50, 86], 'hall', '#d8f0e0', 79,
    ['N = a\\big(\\tanh 1.3(0.55\\sin 2\\pi\\!\\int\\! g + 0.12\\sin 4\\pi\\!\\int\\! g) + 0.3(\\BP_g + 0.6\\BP_{2g})\\eta\\big)\\quad\\text{— дыхание громче тона'],
    MONO('const ny = ney()', 'ny(f, on)', 0.3)),
  I('oboe', 'Гобой', WINDS, 'mono', 'lead', [58, 91], 'hall', '#ffe8a3', 68,
    ['Ob = \\big(\\Pi_{0.12}(g) \\to \\BP_{1100} + \\BP_{2800}\\big) + 0.03\\eta,\\quad g = f\\cdot 2^{0.15\\sin(2\\pi\\cdot 5T)/12}'],
    MONO("const r = reed({ kind: 'oboe' })", 'r(f, on)', 0.4)),
  I('clarinet', 'Кларнет', WINDS, 'mono', 'lead', [50, 91], 'hall', '#d8f3dc', 71,
    ['Cl = \\LP\\,\\sq(f) + 0.03\\eta\\quad\\text{— только нечётные гармоники: шалюмо'],
    MONO("const r = reed({ kind: 'clarinet' })", 'r(f, on)', 0.75)),
  I('bassoon', 'Фагот', WINDS, 'mono', 'bass', [34, 72], 'hall', '#d4a373', 70,
    ['Fg = \\Pi(f) \\to \\BP_{450} + \\BP_{1150}\\quad\\text{— двойная трость, низкие форманты'],
    MONO("const r = reed({ kind: 'bassoon' })", 'r(f, on)', 0.6)),
  I('sax', 'Тенор-саксофон', WINDS, 'mono', 'lead', [44, 80], 'room', '#ffc46b', 66,
    ['Sx = \\LP_{c(b)}\\saw(g) \\to \\BP_{600} + \\BP_{1700} + \\BP_{2900},\\quad g = f\\cdot 2^{(-0.5e^{-t/0.05} + \\text{vib})/12}\\ \\text{— подъезд, позднее вибрато'],
    MONO('const s = sax()', 's(f, on, m ? m[3] ?? 0.8 : 0.8)', 0.28)),
  I('trumpet', 'Труба', WINDS, 'mono', 'lead', [54, 86], 'room', '#ffe08a', 56,
    ['Tr = \\LP_{c(v)}\\big(\\saw(g) + \\saw(1.0023g)\\big),\\quad c(v) \\uparrow v\\ \\text{— медь ярче, когда громче'],
    MONO('const h = horn({ bright: 2.2 })', 'h(f, on, m ? m[3] ?? 0.8 : 0.8)', 0.32)),
  I('horn', 'Валторна', WINDS, 'mono', 'lead', [41, 77], 'hall', '#f4a261', 60,
    ['Hn = \\LP_{c(v)}\\big(\\saw(g) + \\saw(1.0023g)\\big) \\to \\BP_{450}\\quad\\text{— мягкая медь'],
    MONO('const h = horn({ bright: 0.6 })', 'h(f, on, m ? m[3] ?? 0.8 : 0.8)', 0.5)),
  I('brass', 'Медная группа', WINDS, 'chord', 'pad', [40, 84], 'hall', '#f4a261', 61,
    ['Br = \\sum_j \\LP_{c(v)}\\big(\\saw(f_j) + \\saw(1.0023 f_j)\\big)\\quad\\text{— по музыканту на ноту, по сцене'],
    CHORD('const b = brass({ voices: 4, bright: 0.8, gain: 0.3 })', 'b(fs, 0.8)')),
  I('pipes', 'Волынка', WINDS, 'mono', 'lead', [62, 86], 'room', '#8fd08f', 109,
    ['Pp = \\Pi_{0.12}(f) \\to \\text{форманты трости}\\quad\\text{— чантер'],
    MONO("const r = reed({ kind: 'oboe', breath: 0.05 })", 'r(f, on, 0.4)', 0.42)),

  I('choir', 'Хор «а»', VOICES, 'chord', 'pad', [40, 84], 'hall', '#c9b6ff', 52,
    ['Ch = \\sum_j \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\,\\BP_{F_i}\\big(\\saw(f_j) + 0.06\\eta\\big),\\quad F:\\ \\text{«а»} \\leftrightarrow \\text{«о»}'],
    CHORD('const c = choir({ voices: 4, gain: 0.3 })', 'c(fs, blend(VOWELS.a, VOWELS.o, 0.5 + 0.5 * sin(TAU * x / 16)))')),
  I('voice', 'Голос «а–о»', VOICES, 'mono', 'lead', [48, 84], 'echo', '#e0c8ff', 53,
    ['Vo = \\sum_{i=1}^{3} \\tfrac{G_i}{Q_i}\\,\\BP_{F_i}\\big(\\saw(g) + 0.06\\eta\\big),\\quad g = f\\cdot 2^{0.15\\sin(2\\pi\\cdot5T)/12}'],
    MONO('const vo = voice({ size: 1, breath: 0.06 }), gl = smooth(50)', 'vo(gl(f) * 2 ** (0.15 * sin(TAU * 5 * x * sec) / 12), blend(VOWELS.a, VOWELS.o, 0.5 + 0.5 * sin(TAU * x / 8)), on ? 1 : 0)', 0.55)),
  I('meow', 'Кошка — мяу', VOICES, 'mono', 'lead', [60, 89], 'echo', '#ffb3d9', 54,
    ['f = 440\\cdot 2^{\\,(n - 69 + \\beta(u) + v)/12},\\quad \\beta(u) = 3\\sin(\\pi u^{0.7}) - 2u^2', 'F_i(u):\\ \\text{«и»}\\to\\text{«а»}\\to\\text{«у»} \\text{ — кошачье мяу}'],
    `sec => { const c = meower({ size: 0.95 }), lp = filter('lp'); return { out: (x, act) => { const m = act[act.length - 1], u = m ? (x - m[0]) / m[2] : 0; return 0.5 * (m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 1) * lp(c(m ? m[1] - 77 : 0, m && u < 1 ? Math.min(1, u * 1.05) : null, x * sec), 5000) } } }`),

  I('supersaw', 'Суперсо-лид', SYNTH, 'mono', 'lead', [48, 96], 'echo', '#ff9ff3', 81,
    ['L = \\Rev\\,\\Dly\\big[a\\,\\LP_{4500}\\big(\\SS_7(g) + 0.3\\sq(g/2)\\big)\\big]', 'g = f\\cdot 2^{\\,0.2\\min(1,\\tau/0.75)\\sin(2\\pi\\cdot5.5T)/12}'],
    `sec => { const saws = supersaw({ voices: 7, detune: 0.18, seed: 9 }), sq = osc('square'), lpL = filter('lp'), lpR = filter('lp'), glide = smooth(30), env = smooth(8), lv = smooth(25); let f = 440; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); const a = env(m && x - m[0] < 0.93 * m[2] ? 1 : 0) * lv(m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 0.5), g = glide(f), [l, r] = saws(g), s = 0.3 * sq(g / 2); return [0.22 * a * lpL(l + s, 4500), 0.22 * a * lpR(r + s, 4500)] } } }`),
  I('synthpad', 'Синт-пэд', SYNTH, 'chord', 'pad', [36, 88], 'hall', '#ff6fd8', 89,
    ['Pd = \\LP_{1800}\\sum_{j}\\SS_5(f_j)\\quad\\text{— суперсо на голос аккорда, медленная атака'],
    CHORD("const saws = [0, 1, 2, 3, 4, 5].map(j => supersaw({ voices: 5, detune: 0.22, width: 0.9, seed: 11 + j })), lp = [filter('lp'), filter('lp')], lvs = saws.map(() => smooth(180)), fz = saws.map(() => 220)", "(() => { let l = 0, r = 0; saws.forEach((s, j) => { if (j < fs.length) fz[j] = fs[j]; const g = lvs[j](j < fs.length ? 1 : 0); if (g < 1e-4) return; const [p, q] = s(fz[j]); l += g * p; r += g * q }); return [0.07 * lp[0](l, 1800), 0.07 * lp[1](r, 1800)] })()")),
  I('chip', 'Чип — пульс ¼', SYNTH, 'mono', 'lead', [48, 96], 'room', '#c9a2ff', 80,
    ['\\Pi_{0.25}(f) = \\tfrac12\\big(\\saw(\\varphi) - \\saw(\\varphi + 0.25)\\big),\\quad y = \\vol\\big(1 - 0.35\\min(1, t/0.4)\\big)\\cdot\\Pi_{0.25}'],
    `sec => { const p = pulse(0.25), lp = filter('lp'), gate = smooth(1.5); let f = 440; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); const held = m ? (x - m[0]) * sec : 0; return 0.5 * gate(m && x - m[0] < 0.9 * m[2] ? vol4((0.5 + 0.5 * (m[3] ?? 0.8)) * (1 - 0.35 * Math.min(1, held / 0.4))) : 0) * lp(p(f), 9000) } } }`),
  I('chip12', 'Чип — пульс ⅛', SYNTH, 'mono', 'lead', [48, 96], 'room', '#9fd0ff', 80,
    ['\\Pi_{0.125}(f) = \\tfrac12\\big(\\saw(\\varphi) - \\saw(\\varphi + 0.125)\\big)\\quad\\text{— тоньше и звонче'],
    `sec => { const p = pulse(0.125), lp = filter('lp'), gate = smooth(1.5); let f = 440; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); const held = m ? (x - m[0]) * sec : 0; return 0.5 * gate(m && x - m[0] < 0.9 * m[2] ? vol4((0.5 + 0.5 * (m[3] ?? 0.8)) * (1 - 0.35 * Math.min(1, held / 0.4))) : 0) * lp(p(f), 9000) } } }`),

  I('upright', 'Контрабас', BASS, 'poly', 'bass', [28, 60], 'room', '#9fd3ff', 32,
    ['U(f,t,v) = v\\,e^{-t/1.4}\\big(\\sin 2\\pi ft + 0.5e^{-3t}\\sin 4\\pi ft + 0.2e^{-8t}\\sin 6\\pi ft\\big) + \\text{щипок},\\quad y = \\LP_{1600}\\,U'],
    "sec => { const b = poly(uprightTone, { release: 0.08, life: 4 }), lp = filter('lp'); return { hit: (n, v, d) => b.hit(F(n), 0.7 + 0.3 * v, d * sec), out: () => 0.115 * lp(b(), 1600) } }"),
  I('synthbass', 'Синт-бас', BASS, 'mono', 'bass', [24, 60], 'dry', '#5aa7ff', 38,
    ['B = 0.32\\,\\LP_{250 + 1400a}\\big(a\\,\\saw f\\big) + 0.3a\\sin 2\\pi ft,\\quad a = e^{-2.5\\tau/\\max(1, d)}'],
    `sec => { const saw = osc('saw'), sine = osc('sine'), lp = filter('lp'), gate = filter('lp'); let f = 55; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); const v = m ? 0.45 + 0.7 * (m[3] ?? 0.8) : 1, a = gate(m && x - m[0] < 0.92 * m[2] ? v * exp(-2.5 * (x - m[0]) / Math.max(1, m[2])) : 0, 60); return 0.32 * lp(a * saw(f), 250 + 1400 * a) + 0.3 * a * sine(f) } } }`),
  I('sub808', 'Саб-бас 808', BASS, 'mono', 'bass', [24, 55], 'dry', '#7a5cff', 38,
    ['S = \\tanh\\big(1.8\\sin 2\\pi\\!\\int\\! g\\big)\\,e^{-0.6t},\\quad g \\to f \\text{ (глайд 40 мс)}'],
    `sec => { const o = osc('sine'), glide = smooth(40), env = smooth(4); let f = 55; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); const a = env(m && x - m[0] < 0.95 * m[2] ? (0.45 + 0.7 * (m[3] ?? 0.8)) * exp(-0.6 * (x - m[0]) * sec) : 0); return 0.33 * a * tanh(1.8 * o(glide(f))) } } }`),
  I('chiptri', 'Чип — треугольник', BASS, 'mono', 'bass', [28, 72], 'dry', '#5aa7ff', 38,
    ['\\Delta_4(f) = \\tfrac{1}{8}\\big\\lfloor 16\\,\\text{tri}(\\varphi)\\big\\rfloor - 1\\quad\\text{— 4-битный треугольник NES'],
    `sec => { const tri = triangle4(), lp = filter('lp'), gate = smooth(1); let f = 55; return { out: (x, act) => { const m = act[act.length - 1]; if (m) f = F(m[1]); return 0.105 * gate(m && x - m[0] < m[2] ? 1 : 0) * lp(tri(f), 7000) } } }`),

  I('saron', 'Сарон', GAMELAN, 'poly', 'keys', [50, 80], 'hall', '#f2d38a', 13,
    ['Sa = v\\big(e^{-t/1.6}\\sin 2\\pi gt + 0.35e^{-t/0.5}\\sin 2\\pi\\,2.71gt + 0.12e^{-t/0.18}\\sin 2\\pi\\,5.34gt\\big),\\ g \\in \\{f, f + 4.5\\}\\ \\text{— омбак'],
    STRUCK('saronTone', { release: 0.15, life: 3, gain: 0.3 })),
  I('bonang', 'Бонанг', GAMELAN, 'poly', 'keys', [55, 86], 'hall', '#ffd090', 13,
    ['Bn = v\\big(e^{-t/1.1}\\sin 2\\pi gt + 0.3e^{-t/0.4}\\sin 2\\pi\\,2.41gt + 0.12e^{-t/0.2}\\sin 2\\pi\\,3.89gt\\big),\\ g \\in \\{f, f + 3.2\\}'],
    STRUCK('bonangTone', { release: 0.3, life: 3, gain: 0.38 })),
  I('kenong', 'Кенонг', GAMELAN, 'poly', 'keys', [48, 72], 'hall', '#e9c46a', 13,
    ['Kn = v\\big(e^{-t/3.2}\\sin 2\\pi gt + 0.2e^{-t/1.1}\\sin 2\\pi\\,2.03gt\\big),\\ g \\in \\{f, f + 2.1\\}'],
    STRUCK('kenongTone', { release: 1, life: 6, gain: 0.32, max: 8 })),
  I('gong', 'Гонг агенг', GAMELAN, 'poly', 'bass', [26, 48], 'hall', '#b08968', 13,
    ['G = v\\sum_k a_k e^{-t/T_k}\\big(\\sin 2\\pi r_k f t + \\sin 2\\pi (r_k f + o_k)t\\big)\\quad\\text{— 10 с, омбак 3–5 Гц'],
    STRUCK('gongTone', { release: 3, life: 12, gain: 0.28, max: 4 })),

  I('drums', 'Ударная установка', DRUMS, 'drums', 'drums', [35, 81], 'room', '#ff4f8b', -1,
    ['K = e^{-6.5\\tau}\\tanh\\!\\Big(1.6\\sin 2\\pi\\!\\int\\!\\big(48 + 150e^{-35\\tau}\\big)\\Big),\\quad S = 0.6e^{-13t}\\HP_{800}\\eta + 0.4e^{-26t}\\sin 2\\pi\\,185t', 'H = e^{-65t}\\,\\HP_{7k}\\big(0.7\\BP_{10k}\\,\\text{metal} + 0.3\\eta\\big),\\quad \\text{ноты — General MIDI: 36 бочка, 38 малый, 42 хэт…}'],
    'kit'),
  I('drums808', 'Драм-машина 808', DRUMS, 'drums', 'drums', [35, 81], 'dry', '#ff6fd8', -1,
    ['K_{808} = e^{-1.8\\tau}\\tanh\\!\\Big(2.2\\sin 2\\pi\\!\\int\\!\\big(45 + 90e^{-12\\tau}\\big)\\Big),\\quad \\text{клэп: три всплеска через 12 мс}'],
    'kit808'),
  I('taiko', 'Тайко', DRUMS, 'drums', 'drums', [35, 81], 'hall', '#e63946', -1,
    ['T(t) = \\sum_k a_k e^{-t/T_k}\\sin 2\\pi\\,r_k f\\big(1 + \\tfrac{b}{12}e^{-t/0.03}\\big)t + \\text{удар бати},\\quad r = (1, 1.52, 1.98, 2.46, 2.92)', '\\text{36 — одайко, 38 — нагадо, 42 — симэ, 37 — «ка», 56 — канэ}'],
    'taikoKit'),
  I('tabla', 'Табла', DRUMS, 'drums', 'drums', [36, 84], 'room', '#d98b5f', -1,
    ['Dayan = \\sum_{h=1}^{5} a_h e^{-t/T_h}\\sin 2\\pi h f_{Sa} t,\\quad Bayan = e^{-t/0.5}\\sin 2\\pi\\big(85t + 25(t - \\ldots)\\big)', '\\text{до — na, ре — tin, ми — te, фа — ge, соль — ke, ля — dha, си — dhin}'],
    'tablaKit'),
  I('darbuka', 'Дарбука и рик', DRUMS, 'drums', 'drums', [35, 81], 'room', '#d98b5f', -1,
    ['D(t) = e^{-t/0.22}\\sin\\varphi + 0.35e^{-t/0.08}\\sin 1.59\\varphi\\ \\text{(дум, 36)};\\quad \\text{тек — 38, ка — 37, тарелочки рика — 42}'],
    'darbukaKit'),
]
// levels evening the instruments out (measured: the same phrase on each, rms against a flute's)
const LEVEL = { piano: 1.4, harpsichord: 2, organ: 2.5, guitar: 3, harp: 2.2, koto: 0.5, shamisen: 0.7, biwa: 0.8, oud: 1.5, qanun: 2, sitar: 5, strings: 2,
  whistle: 0.4, shakuhachi: 0.4, trumpet: 1.4, synthpad: 2, chip12: 1.3, upright: 1.8, synthbass: 2, chiptri: 2, gong: 0.5, drums: 1.6, darbuka: 1.5 }
for (const i of INSTRUMENTS) i.level = LEVEL[i.id] ?? 1
export const INSTRUMENT = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]))
export const GROUPS = [...new Set(INSTRUMENTS.map(i => i.group))]

// the drum kits' code (make functions) — `hits` per drum: the last hit's beat and velocity
const KIT_CODE = {
  kit: `sec => {
    const tom = f => (t, on) => (on ? exp(-7 * t) * sin(TAU * (f * t + (0.6 * f * (1 - exp(-25 * t))) / 25)) : 0)
    const D = {
      kick: [kickDrum({ f0: 48, f1: 150, sweep: 35, decay: 6.5, drive: 1.6 }), 0.56, 1], snare: [snareDrum({ tone: 185, cutoff: 800, decay: 13 }), 0.3, sec],
      rim: [rimDrum(), 0.18, sec], clap: [clapDrum(), 0.25, sec], hat: [hatDrum({ decay: 65 }), 0.075, sec], open: [hatDrum({ decay: 9 }), 0.06, sec],
      ride: [hatDrum({ decay: 2.5, cutoff: 4500, ring: 0.85 }), 0.06, sec], crash: [hatDrum({ decay: 1.4, cutoff: 3000, ring: 0.45 }), 0.09, sec],
      shaker: [shakerDrum(), 0.09, sec], clave: [woodClack({ f: 2300 }), 0.12, sec],
      tomL: [tom(82), 0.4, sec], tomM: [tom(117), 0.38, sec], tomH: [tom(165), 0.34, sec],
    }
    const MAP = { 35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 40: 'snare', 39: 'clap', 42: 'hat', 44: 'hat', 46: 'open', 49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash', 51: 'ride', 53: 'ride', 59: 'ride', 41: 'tomL', 43: 'tomL', 45: 'tomM', 47: 'tomM', 48: 'tomH', 50: 'tomH', 54: 'shaker', 69: 'shaker', 70: 'shaker', 75: 'clave', 76: 'clave', 77: 'clave' }
    return kitOf(D, MAP, 'rim')
  }`,
  kit808: `sec => {
    const tom = f => (t, on) => (on ? exp(-3.5 * t) * sin(TAU * (f * t + (0.8 * f * (1 - exp(-18 * t))) / 18)) : 0)
    const D = {
      kick: [kickDrum({ f0: 45, f1: 90, sweep: 12, decay: 1.8, drive: 2.2 }), 0.62, 1], snare: [snareDrum({ tone: 200, cutoff: 1200, decay: 16 }), 0.28, sec],
      rim: [rimDrum(), 0.16, sec], clap: [clapDrum({ center: 1200 }), 0.3, sec], hat: [hatDrum({ decay: 80, cutoff: 8000 }), 0.07, sec], open: [hatDrum({ decay: 7, cutoff: 7500 }), 0.06, sec],
      ride: [hatDrum({ decay: 3, cutoff: 5000, ring: 0.9 }), 0.05, sec], crash: [hatDrum({ decay: 1.5, cutoff: 3500, ring: 0.6 }), 0.08, sec],
      shaker: [shakerDrum(), 0.08, sec], clave: [woodClack({ f: 2500 }), 0.12, sec],
      tomL: [tom(70), 0.42, sec], tomM: [tom(100), 0.4, sec], tomH: [tom(140), 0.36, sec],
    }
    const MAP = { 35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 40: 'snare', 39: 'clap', 42: 'hat', 44: 'hat', 46: 'open', 49: 'crash', 52: 'crash', 55: 'crash', 57: 'crash', 51: 'ride', 53: 'ride', 59: 'ride', 41: 'tomL', 43: 'tomL', 45: 'tomM', 47: 'tomM', 48: 'tomH', 50: 'tomH', 54: 'shaker', 69: 'shaker', 70: 'shaker', 75: 'clave', 76: 'clave', 77: 'clave' }
    return kitOf(D, MAP, 'clap')
  }`,
  taikoKit: `sec => {
    const D = {
      don: [taikoDrum({ pitch: 62, decay: 1.3, crack: 0.25, boom: 0.4, seed: 1 }), 0.5, sec], naga: [taikoDrum({ pitch: 120, decay: 0.55, crack: 0.4, seed: 2 }), 0.3, sec],
      nagaH: [taikoDrum({ pitch: 150, decay: 0.45, crack: 0.45, seed: 4 }), 0.28, sec], shime: [taikoDrum({ pitch: 420, decay: 0.12, crack: 0.75, bend: 1, boom: 0.1, seed: 3 }), 0.16, sec],
      ka: [woodClack({ f: 1900 }), 0.1, sec], kane: [kaneDrum({ f: 1250, decay: 0.5 }), 0.12, sec],
    }
    const MAP = { 35: 'don', 36: 'don', 41: 'don', 38: 'naga', 40: 'naga', 43: 'naga', 45: 'nagaH', 47: 'nagaH', 48: 'nagaH', 50: 'nagaH', 42: 'shime', 44: 'shime', 46: 'shime', 37: 'ka', 39: 'ka', 75: 'ka', 56: 'kane', 49: 'kane', 51: 'kane', 80: 'kane', 81: 'kane' }
    return kitOf(D, MAP, 'ka')
  }`,
  tablaKit: `(sec, o) => {
    const tb = tablaDrum({ f: F(60 + (o.tonic ?? 2)) })
    const BOL = ['na', 'ta', 'tin', 'tin', 'te', 'ge', 'ge', 'ke', 'ke', 'dha', 'dha', 'dhin']
    let last = null
    return {
      hit: (n, v, d, b) => { last = { b, v, bol: n < 48 ? (n % 2 ? 'ke' : 'ge') : BOL[mod(Math.round(n), 12)] } },
      out: x => 0.42 * (last ? last.v * tb((x - last.b) * sec, last.bol) : tb(9, 'na', false)),
    }
  }`,
  darbukaKit: `sec => {
    const d = darbukaDrum(), ri = riqDrum()
    let s = null, j = null
    const STROKE = { 35: 'dum', 36: 'dum', 41: 'dum', 43: 'dum', 38: 'tek', 40: 'tek', 60: 'tek', 37: 'ka', 39: 'ka', 61: 'ka' }
    return {
      hit: (n, v, len, b) => { const k = STROKE[Math.round(n)]; if (k) s = { b, v, k }; else j = { b, v } },
      out: x => 0.55 * (s ? s.v * d((x - s.b) * sec, s.k) : d(9, 'dum', false)) + 0.32 * (j ? j.v * ri((x - j.b) * sec, 'jingle') : ri(9, 'jingle', false)),
    }
  }`,
}

// ---- the block of code ----------------------------------------------------------------------------------------------
const ENGINE_NAMES = ['SR', 'exp', 'sin', 'tanh', 'TAU', 'floor', 'mod', 'clamp', 'filter', 'osc', 'smooth', 'reverb', 'delay', 'supersaw']
const INSTRUMENT_NAMES = ['poly', 'pan', 'pianoTone', 'epianoTone', 'vibesTone', 'marimbaTone', 'uprightTone', 'fm', 'plucker', 'guitarBody', 'strings',
  'flute', 'voice', 'VOWELS', 'blend', 'meower', 'bowed', 'pulse', 'triangle4', 'vol4', 'kickDrum', 'snareDrum', 'clapDrum', 'hatDrum', 'rimDrum',
  'shakerDrum', 'shamisen', 'koto', 'biwa', 'shakuhachi', 'shinobue', 'taikoDrum', 'woodClack', 'kaneDrum', 'templeBellTone', 'oud', 'qanun', 'ney',
  'darbukaDrum', 'riqDrum', 'sitar', 'tablaDrum', 'saronTone', 'bonangTone', 'kenongTone', 'gongTone', 'timpaniTone', 'harpTone', 'celestaTone', 'organ',
  'horn', 'brass', 'reed', 'sax', 'choir', 'chorus', 'tape']
const LANES = { lead: [1, 3], keys: [-1, 0.9], pad: [-1.7, -0.5], bass: [-3, -2], drums: [2.2, 4.5] }

const r4 = v => +(+v).toFixed(4)
// PROJECT as text: plain JSON, a track's notes a bar to a line
function dataText(p) {
  const L = ['{']
  if (p.song) L.push(`  "song": ${JSON.stringify(p.song)},`)
  if (p.removed?.length) L.push(`  "removed": ${JSON.stringify(p.removed)},`)
  L.push('  "tracks": [')
  p.tracks.forEach((t, i) => {
    const { notes = [], ...rest } = t
    const bars = new Map()
    for (const e of [...notes].sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
      const k = Math.floor(e[0] / 4 + 1e-9)
      if (!bars.has(k)) bars.set(k, [])
      bars.get(k).push(JSON.stringify([r4(e[0]), r4(e[1]), r4(e[2]), r4(e[3] ?? 0.8)]))
    }
    const body = [...bars.values()].map(l => '      ' + l.join(', ')).join(',\n')
    L.push(`    ${JSON.stringify(rest).slice(0, -1)}, "notes": [${body ? '\n' + body + '\n    ' : ''}]}${i < p.tracks.length - 1 ? ',' : ''}`)
  })
  L.push('  ]', '}')
  return L.join('\n')
}

// the block for a project: the data, the instruments its tracks use, __project
export function projectBlock(p) {
  const used = [...new Set(p.tracks.map(t => (INSTRUMENT[t.inst] ? t.inst : 'piano')))]
  const inst = used.map(id => {
    const d = INSTRUMENT[id], make = KIT_CODE[d.make] ?? d.make
    return `    ${id}: { kind: '${d.kind}', role: '${d.role}', fx: '${d.fx}', color: '${d.color}', program: ${d.program}, level: ${d.level}, formula: ${JSON.stringify(d.formula)},\n      make: ${make} },`
  })
  return `${START}: the tracks below are notes (PROJECT, plain data — the app's piano roll writes it; edit freely), played by
// instruments of the library; __project(song) adds them to the song and leaves out the song's own tracks listed in "removed".
import * as __PE from '../src/engine.js'
import * as __PI from '../src/instruments.js'
const PROJECT = ${dataText(p)}
${DATA_END}
const __project = (() => {
  const { ${ENGINE_NAMES.join(', ')} } = __PE
  const { ${INSTRUMENT_NAMES.join(', ')} } = __PI
  const F = n => 440 * 2 ** ((n - 69) / 12) // A4 = 440 exactly; n may be fractional: 63.5 = E𝄳4
  // a drum kit: D = { drum: [d(t, on), gain, time scale (1: τ in beats, sec: t in seconds)] }, MAP: note → drum
  const kitOf = (D, MAP, other) => {
    const hits = {}, lp = filter('lp')
    return {
      hit: (n, v, d, b) => { const k = MAP[Math.round(n)] ?? other; hits[k] = { b, v }; if (k === 'hat') delete hits.open },
      out: x => {
        let y = 0
        for (const k in D) { const [f, g, s] = D[k], h = hits[k]; y += h ? g * h.v * f((x - h.b) * s, true) : g * f(1, false) }
        return lp(y, 9000)
      },
    }
  }
  const FX = {
    hall: () => reverb({ room: 0.86, damp: 0.35, wet: 0.35 }),
    room: () => reverb({ room: 0.7, damp: 0.5, wet: 0.22 }),
    echo: sec => { const e = delay({ time: sec * 0.75, feedback: 0.32, wet: 0.22 }), v = reverb({ room: 0.85, wet: 0.33 }); return (l, r) => v(...e(l, r)) },
    dry: () => (l, r) => [l, r],
  }
  const INST = {
${inst.join('\n')}
  }
  const LANES = ${JSON.stringify(LANES)}
  // the notes sounding at x (sorted by start), by binary search
  const finder = N => {
    const S = N.map(e => e[0]), maxD = N.reduce((m, e) => Math.max(m, e[2]), 0)
    return x => {
      let lo = 0, hi = S.length
      while (lo < hi) { const m = (lo + hi) >> 1; if (S[m] <= x) lo = m + 1; else hi = m }
      const out = []
      for (let i = lo - 1; i >= 0 && S[i] > x - maxD - 1e-9; i--) if (x < N[i][0] + N[i][2]) out.push(N[i])
      return out.reverse()
    }
  }
  function track(t, o) {
    const def = INST[t.inst] ?? INST.piano, N = (t.notes ?? []).filter(e => e[2] > 0).sort((a, b) => a[0] - b[0]), at = finder(N), drums = def.kind === 'drums'
    const ns = N.map(e => e[1]), lo = ns.length ? Math.min(...ns) : 60, hi = Math.max(lo + 12, ns.length ? Math.max(...ns) : 72), [y0, y1] = LANES[def.role] ?? LANES.lead
    return {
      color: t.color ?? def.color,
      program: def.program,
      graph: x => { const a = at(x).filter(e => !drums || x - e[0] < 0.25); return a.length ? a.map(e => (drums ? y0 + (y1 - y0) * clamp((e[1] - 35) / 46, 0, 1) * (1 - 0.3 * (x - e[0]) / 0.25) : y0 + ((e[1] - lo) / (hi - lo)) * (y1 - y0))) : null },
      midi: x => at(x).filter(e => x < e[0] + (drums ? Math.min(0.1, e[2]) : e[2] - Math.min(0.03, 0.06 * e[2]))).map(e => e[1]),
      formula: def.formula,
      audio({ bpm }) {
        const sec = 60 / bpm, I = def.make(sec, o), fx = (FX[t.fx] ?? FX[def.fx])(sec), vol = (t.vol ?? 1) * (def.level ?? 1), p = clamp(t.pan ?? 0, -1, 1), gl = Math.min(1, 1 - p), gr = Math.min(1, 1 + p)
        let i = -1, act = [], end = Infinity
        return x => {
          if (i < 0) for (i = 0; i < N.length && N[i][0] < x - 1e-9; i++) if (N[i][0] + N[i][2] > x) act.push(N[i]), (end = Math.min(end, N[i][0] + N[i][2])) // starting late (the player's pre-roll): what still sounds
          while (i < N.length && N[i][0] <= x + 1e-9) { const e = N[i++]; act.push(e); end = Math.min(end, e[0] + e[2]); if (I.hit) I.hit(e[1], e[3] ?? 0.8, e[2], e[0]) }
          if (x >= end) { act = act.filter(e => e[0] + e[2] > x); end = act.reduce((m, e) => Math.min(m, e[0] + e[2]), Infinity) }
          const y = I.out(x, act)
          return typeof y === 'number' ? fx(...pan(vol * y, p)) : fx(vol * gl * y[0], vol * gr * y[1])
        }
      },
    }
  }
  // the song with the project's tracks (keys: the track names, made unique)
  return song => {
    if (PROJECT.song) Object.assign(song, PROJECT.song)
    const removed = new Set(PROJECT.removed ?? []), tracks = {}
    for (const [k, t] of Object.entries(song.tracks ?? {})) if (!removed.has(k)) tracks[k] = t
    const o = { tonic: song.key ? ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[String(song.key)[0]] ?? 0) + (/^.[#♯]/.test(song.key) ? 1 : /^.(b|♭)/.test(song.key) ? -1 : 0) : 0 }
    let end = 0
    for (const t of PROJECT.tracks) {
      let k = t.name || t.inst, j = 2
      while (k in tracks || removed.has(k)) k = \`\${t.name || t.inst} \${j++}\`
      tracks[k] = track(t, o)
      for (const e of t.notes ?? []) end = Math.max(end, e[0] + e[2])
    }
    song.tracks = tracks
    song.length = Math.max(song.length ?? 0, Math.ceil(end / 4 - 1e-9) * 4)
    return song
  }
})()
${END}
`
}

// the keys the project's tracks get in song.tracks (as __project names them), by track id
export function trackKeys(p, codeKeys = []) {
  const removed = new Set(p.removed ?? []), taken = new Set(codeKeys.filter(k => !removed.has(k))), out = {}
  for (const t of p.tracks) {
    let k = t.name || t.inst, j = 2
    while (taken.has(k) || removed.has(k)) k = `${t.name || t.inst} ${j++}`
    taken.add(k)
    out[t.id] = k
  }
  return out
}

// ---- reading and writing a song's source ------------------------------------------------------------------------------
export const isProject = src => src.includes(START) && src.includes(END)
export function readProject(src) {
  const a = src.indexOf(START), b = src.indexOf(END)
  if (a < 0 || b < a) return null
  const block = src.slice(a, b), i = block.indexOf('const PROJECT = '), j = block.indexOf(DATA_END)
  if (i < 0 || j < i) return null
  const text = block.slice(i + 'const PROJECT = '.length, j).trim()
  let p
  try { p = JSON.parse(text) } catch { try { p = Function(`return (${text})`)() } catch { return null } }
  if (!p || !Array.isArray(p.tracks)) return null
  p.tracks.forEach((t, k) => { t.id ??= 't' + (k + 1); t.notes ??= [] })
  return p
}
// the source with the project written in: the block replaced, or (a song that isn't a project yet) put in front of
// `export default`, whose value gets wrapped in __project(…). parse: acorn's parse (the app and the tests pass it)
export function writeProject(src, p, { parse } = {}) {
  const block = projectBlock(p)
  const a = src.indexOf(START), b = src.indexOf(END)
  if (a >= 0 && b > a) {
    const e = src.indexOf('\n', b)
    return src.slice(0, a) + block + src.slice(e < 0 ? src.length : e + 1)
  }
  if (!parse) throw new Error('writeProject: a song becomes a project only with a parser')
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' })
  const ex = ast.body.find(n => n.type === 'ExportDefaultDeclaration')
  if (!ex || /Declaration$/.test(ex.declaration.type)) throw new Error('в песне нет export default { … }')
  const d = ex.declaration, lineStart = src.lastIndexOf('\n', ex.start) + 1
  return src.slice(0, lineStart) + block + src.slice(lineStart, d.start) + '__project(' + src.slice(d.start, d.end) + ')' + src.slice(d.end)
}

// a new project from scratch
export function newProjectSource({ name = 'Новый проект', bpm = 100, key = 'C', mode = null, bars = 16, tracks = [] } = {}) {
  const p = { song: { bpm, key, ...(mode ? { mode } : {}), length: bars * 4, sections: [[0, 'A']] }, tracks }
  const safe = String(name).replace(/['"`\\\n\r]/g, '')
  return `// ${safe} — a project of MathMusic Live: every part is a track of notes (PROJECT below), played by an instrument of the
// library. Open the piano roll (P): add and delete tracks, choose their instruments, write notes by hand or play them in,
// let a style compose a melody or a whole arrangement under yours.
${projectBlock(p)}
export default __project({
  name: '${safe}',
  style: 'project',
  tracks: {},
})
`
}

// ---- from a song's parts to notes ---------------------------------------------------------------------------------------
// midi(x) read `rate` times a beat → [[beat, n, length, velocity]]: a note from where it appears to where it goes; a note
// shortened by its gate (off for the last few % before the next one) gets its written length back; drums: hits.
export function readTrackNotes(midi, length, { rate = 96, drums = false } = {}) {
  const out = [], open = new Map(), last = Math.ceil(length * rate)
  for (let k = 0; k <= last; k++) {
    const x = k / rate
    let now = []
    if (k < last) try { now = [].concat(midi(x) ?? []).filter(Number.isFinite).map(v => Math.round(v * 100) / 100) } catch {}
    const set = new Set(now)
    for (const [n, s] of open) if (!set.has(n)) { out.push([s, n, x - s]); open.delete(n) }
    for (const n of set) if (!open.has(n)) open.set(n, x)
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const q = v => Math.round(v * 48) / 48 // onsets to 1/48 of a beat: sixteenths and triplets alike
  const starts = [...new Set(out.map(e => q(e[0])))].sort((a, b) => a - b)
  return out.map(([s, n, d]) => {
    const b = q(s)
    let len = drums ? 0.25 : Math.max(1 / 12, q(d))
    if (!drums) {
      const nx = starts.find(v => v > b + 1e-9)
      if (nx != null && nx - (b + len) > 0 && nx - (b + len) <= Math.max(0.13, 0.15 * len)) len = nx - b
      else {
        // no note right after: the value the gate shortened, the nearest one above on a grid fit for its size (triplets too)
        const grids = len >= 1.5 ? [0.5, 1 / 3] : len >= 0.75 ? [0.25, 1 / 6] : [0.125, 1 / 12]
        const up = grids.map(g => Math.ceil(len / g - 1e-6) * g).filter(c => c - len <= 0.12 * c).sort((a, b) => a - b)[0]
        if (up) len = up
      }
    }
    const onBeat = Math.abs(b - Math.round(b)) < 1e-6, bar = Math.abs(b / 4 - Math.round(b / 4)) < 1e-6
    return [r4(b), n, r4(len), drums ? ([36, 35, 38, 40, 49, 57].includes(n) ? 0.9 : [42, 44, 51, 70].includes(n) ? (onBeat ? 0.7 : 0.5) : 0.75) : bar ? 0.85 : onBeat ? 0.78 : 0.68]
  })
}

// which instrument plays a part of another song, by the part's name (the generator names a track by its instrument)
const BY_NAME = [
  [/kick|snare|drum|kit|perc|hat|clap|kendhang/i, 'drums'], [/taiko/i, 'taiko'], [/tabla/i, 'tabla'], [/darbuka|riq/i, 'darbuka'],
  [/rbass|growl|808|sub/i, 'sub808'], [/chiptri|triangle/i, 'chiptri'], [/octbass|warmbass|synth ?bass/i, 'synthbass'], [/upright|walking|contrabass|violone/i, 'upright'],
  [/cello|cellolead/i, 'cello'], [/bassoon/i, 'bassoon'], [/timp/i, 'timpani'], [/drone|pedal/i, 'organ'],
  [/rhodes|epiano/i, 'epiano'], [/harpsichord|continuo|alberti|prelude/i, 'harpsichord'], [/organ/i, 'organ'], [/nocturne|piano/i, 'piano'],
  [/celesta/i, 'celesta'], [/vibes/i, 'vibes'], [/marimba/i, 'marimba'], [/bell|glass|bonang|peking/i, 'bells'], [/saron|demung/i, 'saron'], [/kenong|kempul/i, 'kenong'], [/gong/i, 'gong'],
  [/guitar/i, 'guitar'], [/harp/i, 'harp'], [/koto/i, 'koto'], [/shamisen/i, 'shamisen'], [/biwa/i, 'biwa'], [/oud/i, 'oud'], [/qanun/i, 'qanun'], [/sitar|chikari/i, 'sitar'],
  [/violin|viola/i, 'violin'], [/string/i, 'strings'], [/shinobue|whistle/i, 'whistle'], [/shakuhachi/i, 'shakuhachi'], [/\bney\b/i, 'ney'], [/flute|bansuri|suling/i, 'flute'],
  [/oboe/i, 'oboe'], [/clarinet/i, 'clarinet'], [/pipes/i, 'pipes'], [/sax/i, 'sax'], [/trumpet/i, 'trumpet'], [/hornstab|brass/i, 'brass'], [/horn/i, 'horn'],
  [/choir|chant/i, 'choir'], [/scat|voice/i, 'voice'], [/meow|cat/i, 'meow'], [/supersaw|sawlead|saw/i, 'supersaw'], [/pad/i, 'synthpad'],
  [/pulse12|chip60/i, 'chip12'], [/pulse|chip/i, 'chip'], [/bass/i, 'synthbass'],
]
// (a part named just "bass": a double bass in the acoustic styles, a synth bass in the electronic ones, the NES triangle in chiptune)
const ELECTRONIC = /^(synthwave|boss|hardstyle|dnb|phonk|space|kawaii|jbattle|gothic|minimal|meow)$/
export function instrumentFor(name, style = null) {
  const id = BY_NAME.find(([re]) => re.test(name))?.[1] ?? 'piano'
  if (id !== 'synthbass' || !style || /synth|octbass|warmbass/i.test(name)) return id
  return style === 'chiptune' ? 'chiptri' : ELECTRONIC.test(style) ? 'synthbass' : 'upright'
}
// a part's role in an arrangement, by its name and instrument
export function roleOf(name) {
  if (/counter/i.test(name)) return 'counter'
  if (/\barp\b/i.test(name)) return 'arp'
  const i = INSTRUMENT[instrumentFor(name)]
  return /^(rain|vinyl|wind|purr|club|thunder|riser|fx|tanpura|swarmandal)/i.test(name) ? 'texture' : i.role === 'keys' ? 'chords' : i.role
}

// The parts of a song made on a melody (the generator's userTheme): where theme A sounds as written (the offset, by the
// part that plays it — any octave), and every other part's notes from there, for `len` beats, moved to begin at 0.
// tracks: [[name, notes]] (readTrackNotes of each part). → { at, by, parts: [{ name, role, inst, notes }] } or null
export function alignedParts(tracks, melody, len, { starts = null } = {}) {
  const m0 = Math.min(...melody.map(e => e[0])), mel = melody.map(([b, n]) => [b - Math.floor(m0 / 4) * 4, n])
  const key = (b, n) => `${Math.round(b * 48)}:${Math.round(n * 100)}`
  let best = null
  for (const [name, notes] of tracks) {
    if (roleOf(name) === 'drums') continue
    const set = new Set(notes.map(e => key(e[0], e[1])))
    const cands = starts ?? [...new Set(notes.map(e => Math.floor(e[0] / 4) * 4))]
    for (const at of cands) for (const tr of [0, 12, -12, 24, -24]) {
      let hit = 0
      for (const [b, n] of mel) if (set.has(key(at + b, n + tr))) hit++
      const score = hit / mel.length
      if (!best || score > best.score + 1e-9) best = { at, tr, by: name, score }
    }
  }
  if (!best || best.score < 0.6) return null
  // every occurrence of the theme in that part (the final repeats it with a counter-melody over it)
  const byNotes = new Set(tracks.find(t => t[0] === best.by)[1].map(e => key(e[0], e[1])))
  const occ = [...new Set(tracks.find(t => t[0] === best.by)[1].map(e => Math.floor(e[0] / 4) * 4))].filter(at => mel.filter(([b, n]) => byNotes.has(key(at + b, n + best.tr))).length / mel.length >= 0.6)
  const cut = (notes, at) => notes.filter(e => e[0] >= at - 1e-9 && e[0] < at + len - 1e-9).map(([b, n, d, v]) => [r4(b - at), n, r4(Math.min(d, at + len - b)), v])
  const parts = []
  for (const [name, notes] of tracks) {
    if (name === best.by) continue
    const role = roleOf(name)
    if (role === 'texture') continue
    // the occurrence where this part plays most
    let pick = occ[0], most = -1
    for (const at of occ) { const c = cut(notes, at).length; if (c > most) (most = c), (pick = at) }
    const ns = cut(notes, pick)
    if (ns.length) parts.push({ name, role, inst: instrumentFor(name), notes: ns })
  }
  return { at: best.at, by: best.by, tr: best.tr, occurrences: occ, parts }
}
