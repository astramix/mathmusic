// The styles (STYLES: tempo, keys, forms, themes, instruments per role, grooves) and their families (the menus' order) — a part of the generator (src/generate.js; the map of its parts is at the top of that file).

// ---- styles ----------------------------------------------------------------------------------------
// Sections: [name, bars, role, energy 0–3, opts]. role ∈ intro theme themeB bridge solo break final outro.
// Drum patterns: 16 steps per bar; x = hit, o = ghost (soft), - = rest.
export const STYLES = {
  lofi: {
    label: 'Лоу-фай хип-хоп', emoji: '☕', theme: 'lofi', bpm: [72, 86], swing: 0.6,
    themes: { 'lofi-flute': 4, 'lofi-flute-2': 4, 'template-flute': 3, 'bossa-theme': 2, 'meow-verse': 1, 'void-orbit': 1.5, 'chip-cave': 1, 'synthwave-lead': 1 },
    keys: ['F', 'Eb', 'Ab', 'D', 'Bb', 'G', 'Dm', 'Cm', 'Fm', 'Am'], moods: ['calm', 'jazzy', 'warm', 'night'],
    voicing: 'rootless', chordRange: [53, 77], bassRange: [33, 50],
    lead: ['flute', 'vibes', 'epiano'], lead2: ['vibes', 'piano', 'marimba'], chords: ['rhodes', 'piano'], bass: ['upright', 'warmbass'],
    pad: ['strings'], arp: ['piano', 'marimba'], texture: ['rain', 'vinyl'], kit: 'boombap',
    forms: [
      [['intro', 4, 'intro', 0], ['theme', 8, 'theme', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['break', 4, 'break', 0], ['final', 8, 'final', 3], ['outro', 4, 'outro', 0]],
      [['rain', 4, 'intro', 0], ['beat', 8, 'theme', 2], ['solo', 8, 'solo', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 1], ['final', 8, 'final', 3], ['sleep', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-----x-x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-', open: '--------------x-' },
      busy: { kick: 'x-----x-x-x-----', snare: '----x--o----x---', hat: 'x-x-x-x-x-x-x-x-', open: '------x-------x-' },
      light: { kick: 'x---------x-----', rim: '----x-------x---', hat: '--x---x---x---x-' },
      fill: { snare: '--------x-o-xoxx' },
    },
    comp: { 0: [[0, 0.55, 4]], 1: [[0, 0.6, 2.5], [2.5, 0.45, 1.5]], 2: [[0, 0.75, 1.6], [1.6, 0.45, 1.4], [3, 0.5, 1]], 3: [[0, 0.8, 1.6], [1.6, 0.5, 1.4], [3, 0.55, 1]] },
    bassline: [[0, 'R', 1.4], [1.6, 'R', 0.9], [3, '5', 0.9]],
    arpStep: 0.5, arpPoly: true,
  },
  bossa: {
    label: 'Босса-нова', emoji: '🌴', theme: 'bossa', bpm: [116, 136], swing: 0.5,
    themes: { 'bossa-theme': 5, 'bossa-bridge': 4, 'lofi-flute': 2, 'lofi-flute-2': 2, 'meow-chorus': 1, 'template-flute': 1.5, 'kawaii-hook': 1 },
    keys: ['C', 'F', 'G', 'D', 'Bb', 'Eb', 'Am', 'Dm'], moods: ['jazzy', 'warm', 'sunny', 'calm'],
    voicing: 'rootless', chordRange: [52, 74], bassRange: [33, 50],
    lead: ['vibes', 'flute', 'scat'], lead2: ['piano', 'vibes', 'flute'], chords: ['guitar'], bass: ['upright'],
    pad: ['strings'], arp: ['vibes', 'marimba'], texture: [null], kit: 'bossa',
    forms: [
      [['intro', 4, 'intro', 1], ['theme', 8, 'theme', 2], ['theme II', 8, 'themeB', 2], ['bridge', 8, 'bridge', 2], ['solo', 8, 'solo', 2], ['final', 8, 'final', 3], ['tag', 6, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['theme', 8, 'theme', 2], ['solo', 8, 'solo', 2], ['bridge', 8, 'bridge', 2], ['theme II', 8, 'themeB', 2], ['final', 8, 'final', 3], ['tag', 6, 'outro', 1]],
    ],
    drums: {
      full: { kick: 'x-----x-x-----x-', rim: 'x--x--x---x--x--', shaker: 'xoxoxoxoxoxoxoxo', brush: '----x-------x---' },
      busy: { kick: 'x-----x-x-----x-', rim: 'x--x--x---x--x--', shaker: 'xoxoxoxoxoxoxoxo', ride: 'x---x-x-x---x-x-' },
      light: { shaker: 'xoxoxoxoxoxoxoxo', kick: 'x-------x-------' },
      fill: { rim: '------------x-xx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.5, 0.7], [0.75, 0.4, 0.7], [1.5, 0.45, 1], [2.5, 0.4, 0.7], [3.25, 0.45, 0.7]], 2: [[0, 0.55, 0.7], [0.75, 0.45, 0.7], [1.5, 0.5, 1], [2.5, 0.45, 0.7], [3.25, 0.5, 0.7]], 3: [[0, 0.6, 0.7], [0.75, 0.5, 0.7], [1.5, 0.55, 1], [2.5, 0.5, 0.7], [3.25, 0.55, 0.7]] },
    bassline: [[0, 'R', 1.4], [1.5, '5', 1.9], [3.5, 'R', 0.45]],
    arpStep: 0.75, arpPoly: true,
  },
  chiptune: {
    label: '8-бит, игра', emoji: '👾', theme: 'chip', bpm: [138, 160], swing: 0.5,
    themes: { 'chip-level': 4, 'chip-level-b': 4, 'chip-cave': 2, 'chip-boss': 2, 'kawaii-hook': 2, 'meow-chorus': 1.5, 'void-orbit': 1.5 },
    keys: ['C', 'G', 'D', 'F', 'A', 'Am', 'Em', 'Dm', 'Cm'], moods: ['bright', 'game', 'sunny', 'epic'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 52],
    lead: ['pulse'], lead2: ['pulse12'], chords: ['chiparp'], bass: ['triangle'], pad: [null], arp: ['pulsearp'], texture: [null], kit: 'chip',
    forms: [
      [['title', 4, 'intro', 1], ['level 1', 8, 'theme', 2], ['level 1 B', 8, 'themeB', 2], ['cave', 8, 'bridge', 1], ['boss', 8, 'solo', 3], ['level 2', 8, 'final', 3, { keyUp: 2 }], ['credits', 6, 'outro', 1]],
      [['title', 4, 'intro', 1], ['world', 8, 'theme', 2], ['underground', 8, 'bridge', 1], ['world B', 8, 'themeB', 2], ['sky', 8, 'solo', 3], ['castle', 8, 'final', 3, { keyUp: 1 }], ['the end', 4, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      busy: { kick: 'x-----x-x-------', snare: '----x-------x-x-', hat: 'xxxxxxxxxxxxxxxx' },
      light: { kick: 'x-------x-------', hat: '--x---x---x---x-' },
      fill: { snare: '--------xxxxxxxx' },
    },
    comp: null, bassline: [[0, 'R', 0.4], [0.5, '8', 0.4], [1, 'R', 0.4], [1.5, '8', 0.4], [2, 'R', 0.4], [2.5, '8', 0.4], [3, '5', 0.4], [3.5, '8', 0.4]],
    arpStep: 0.25, arpPoly: false,
  },
  synthwave: {
    label: 'Синтвейв', emoji: '🌆', theme: 'synth', bpm: [96, 118], swing: 0.5,
    themes: { 'synthwave-lead': 5, 'void-orbit': 3, 'void-nebula': 3, 'chip-cave': 1.5, 'template-flute': 2, 'kawaii-hook': 1 },
    keys: ['Em', 'Am', 'Dm', 'F#m', 'Cm', 'Bm', 'C', 'F'], moods: ['epic', 'night', 'dark'],
    voicing: 'close', chordRange: [52, 76], bassRange: [28, 45],
    lead: ['sawlead'], lead2: ['sawlead', 'pulse'], chords: ['sawpad'], bass: ['octbass'], pad: ['strings'], arp: ['sawarp'], texture: [null], kit: 'electro',
    forms: [
      [['sunset', 8, 'intro', 1], ['drive', 8, 'theme', 2], ['neon', 8, 'themeB', 2], ['tunnel', 8, 'bridge', 1], ['overdrive', 8, 'solo', 3], ['final drive', 8, 'final', 3], ['fade', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-' },
      busy: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'x-xxx-xxx-xxx-xx' },
      light: { kick: 'x-------x-------', hat: '--x---x---x---x-' },
      fill: { tom: '--------x-x-xxxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.6, 4]], 2: [[0, 0.7, 4]], 3: [[0, 0.8, 4]] },
    bassline: 'eighths', arpStep: 0.25, arpPoly: false,
  },
  // Baroque and Classical: Bach, Mozart, Haydn, Beethoven — harpsichord or pipe organ continuo, a Bach prelude figure
  // or an Alberti bass on the piano, violin / oboe / flute / clarinet leads, harp, timpani
  classical: {
    label: 'Барокко и классицизм', emoji: '🎻', theme: 'classical', bpm: [68, 96], swing: 0.5,
    themes: { canon: 4, 'canon-halves': 3, 'bach-fugue': 4, 'bach-toccata': 3, 'mozart-nachtmusik': 4, 'mozart-40': 4, 'beethoven-joy': 3, 'beethoven-fate': 3, 'void-orbit': 0.5, 'template-flute': 0.5 },
    keys: ['D', 'G', 'C', 'A', 'F', 'Bb', 'Dm', 'Am', 'Gm', 'Cm'], moods: ['classical', 'warm', 'epic', 'calm'],
    voicing: 'close', chordRange: [50, 74], bassRange: [31, 50],
    lead: ['violin', 'oboe', 'flute'], lead2: ['violin', 'flute', 'oboe', 'clarinet'], chords: ['harpsichord', 'alberti', 'prelude', 'pipeorgan'], bass: ['cello'], pad: ['strings'], arp: ['harpsichordarp', 'harp'], texture: [null], kit: 'orchestral',
    forms: [
      [['prelude', 4, 'intro', 0], ['theme', 8, 'theme', 1], ['canon', 8, 'final', 2, { canon: true }], ['episode', 8, 'bridge', 1], ['theme II', 8, 'themeB', 2], ['cadenza', 8, 'solo', 2], ['finale', 8, 'final', 3, { canon: true }], ['coda', 4, 'outro', 0]],
    ],
    drums: {
      full: { timp: 'x-------x-------' }, busy: { timp: 'x-------x---x-x-' }, light: { timp: 'x---------------' }, fill: { timp: '--------x-x-xxxx' },
    },
    comp: { 0: [[0, 0.4, 2], [2, 0.35, 2]], 1: [[0, 0.45, 1], [1, 0.3, 1], [2, 0.4, 1], [3, 0.3, 1]], 2: [[0, 0.5, 1], [1, 0.35, 1], [2, 0.45, 1], [3, 0.35, 1]], 3: [[0, 0.55, 0.5], [0.5, 0.3, 0.5], [1, 0.4, 0.5], [1.5, 0.3, 0.5], [2, 0.5, 0.5], [2.5, 0.3, 0.5], [3, 0.4, 0.5], [3.5, 0.3, 0.5]] },
    bassline: [[0, 'R', 0.95], [1, 'R', 0.95], [2, '5', 0.95], [3, '8', 0.95]],
    arpStep: 0.25, arpPoly: false,
  },
  // A canon and a three-voice fugue composed by the rules of counterpoint (src/counterpoint.js, src/fugue.js): a subject
  // by rule, a tonal or real answer, an invertible countersubject, episodes by sequence down the circle of fifths,
  // middle entries in the relative key and the subdominant, a stretto, a coda with a Picardy third — on a chamber
  // ensemble, strings, the organ or the harpsichord (generateFugue). A church mode makes a modal fugue.
  fugue: {
    label: 'Фуга и канон', emoji: '🎹', theme: 'classical', bpm: [60, 80], swing: 0.5,
    keys: ['Dm', 'Gm', 'Cm', 'Am', 'Em', 'Fm', 'Bm', 'C', 'D', 'G', 'F', 'Bb', 'Eb', 'A'], moods: ['classical'],
    about: 'канон в октаву и трёхголосная фуга по правилам контрапункта: тема, тональный/реальный ответ, обратимое противосложение, интермедии-секвенции, средние проведения, стретта, кода с пикардийской терцией · камерный ансамбль / струнные / орган / клавесин',
    lead: ['violin', 'flute', 'organ', 'harpsichord'], chords: ['continuo'], bass: ['cello', 'pedal 16′'], kit: '—', forms: [], drums: {}, themes: {},
  },
  // The organ: a prelude (a progression broken into sixteenths on the plenum over the pedal, a tonic pedal at the start,
  // a dominant pedal before the half cadence) and then a canon and a three-part fugue on the stops of a church organ
  organ: {
    label: 'Органная прелюдия и фуга', emoji: '⛪', theme: 'cathedral', bpm: [60, 76], swing: 0.5, ensemble: 'organPrelude', prelude: true,
    keys: ['Dm', 'Gm', 'Cm', 'Am', 'Em', 'Fm', 'Bm', 'C', 'D', 'G', 'F', 'Bb', 'Eb', 'A'], moods: ['classical'],
    about: 'прелюдия на пленуме — ломаные аккорды шестнадцатыми над педалью, органный пункт на тонике и доминанте, полукаденция — и фуга по правилам контрапункта на регистрах церковного органа',
    lead: ['organ'], chords: ['plenum'], bass: ['pedal 16′'], kit: '—', forms: [], drums: {}, themes: {},
  },
  // Arabic music in quarter tones (src/maqam.js): a maqam's sayr in phrases AA′BA, a tahwil to a related maqam, taqsims
  // over a drone, heterophony of a takht (oud, qanun, ney, violin, cello), the iqa' on darbuka and riq (generateMaqam)
  maqam: {
    label: 'Макам', emoji: '🪘', theme: 'desert', bpm: [88, 112], swing: 0.5,
    keys: ['D', 'C', 'G'], moods: ['world'],
    about: 'арабский макам в четвертитонах: баяти, раст, саба, хиджаз, сика, хузам, сузнак, ирак — сайр (нижний джинс → гаммаз → верх → кафла), тахвиль в родственный макам, таксимы уда и ная, гетерофония такхта, икаа на дарбуке и рике',
    lead: ['oud', 'qanun', 'ney', 'violin'], chords: ['—'], bass: ['cello'], kit: 'darbuka, riq', forms: [], drums: {}, themes: {},
  },
  // A Hindustani raga (src/raga.js): alap, jor, gat and antara in teentaal, taans with sawal-jawab and tihais, jhala — sitar
  // with tarab strings and chikari, bansuri, tanpura, tabla, swarmandal, manjira, in the raga's shrutis (generateRaga)
  raga: {
    label: 'Рага', emoji: '🪷', theme: 'india', bpm: [72, 92], swing: 0.5,
    keys: ['D', 'C'], moods: ['world'],
    about: 'хиндустани: Яман, Бхайрав, Бхупали, Бхимпаласи, Дарбари, Малкаунс — алап, джор, гат в тинтале, таны с ответами бансури, тихаи на сам, джхала; ситар с тарабом, танпура, табла; строй — шрути раги (чистые интервалы, ати-комал у Дарбари)',
    lead: ['sitar', 'bansuri'], chords: ['tanpura'], bass: ['—'], kit: 'tabla, manjira', forms: [], drums: {}, themes: {},
  },
  // Central Javanese gamelan in the measured slendro and pelog (src/gamelan.js): colotomic cycles (ketawang, ladrang), the
  // balungan in gatras, the garap of peking and bonang, irama II, the suling, every bronze a beating pair (generateGamelan)
  gamelan: {
    label: 'Гамелан', emoji: '🔔', theme: 'java', bpm: [60, 76], swing: 0.5,
    keys: ['D'], moods: ['world'],
    about: 'яванский гамелан в измеренных строях слендро и пелог (Kyai Madu Laras): кетаванг и ладранг, колотомия гонга, кенонга, кемпула, кетука, балунган по гатрам, гарап пекинга и бонанга, ирама II, сулинг, омбак — биения парных инструментов',
    lead: ['saron', 'bonang', 'suling'], chords: ['—'], bass: ['gong', 'kempul'], kit: 'kendhang', forms: [], drums: {}, themes: {},
  },
  // Jazz: heads of our own on ii – V – I changes (A/B rootless voicings), a walking bass, a swing kit (ride "ding ding-a
  // ding", hi-hat on 2 and 4, feathered kick, snare comping; brushes when quiet), piano comping in the Charleston rhythm, a
  // solo over the changes, trading fours with the drums, the head out with the horns in harmony
  jazz: {
    label: 'Джаз', emoji: '🎷', theme: 'jazz', bpm: [116, 168], swing: 0.66,
    themes: { 'jazz-corner': 5, 'jazz-rhythm': 5, 'jazz-night': 5 },
    keys: ['F', 'Bb', 'Eb', 'C', 'G', 'Ab'], moods: ['jazzy', 'night'],
    voicing: 'jazz', chordRange: [52, 72], bassRange: [28, 43],
    lead: ['sax', 'trumpet', 'sax'], lead2: ['sax', 'trumpet', 'vibes'], chords: ['piano', 'rhodes'], bass: ['upright'],
    pad: [null], arp: [null], texture: ['club'], kit: 'jazz',
    forms: [
      [['intro', 4, 'intro', 1], ['head', 16, 'theme', 2], ['bridge', 8, 'themeB', 2], ['head', 8, 'theme', 2], ['solo', 16, 'solo', 2], ['trading fours', 16, 'trade', 3], ['head out', 16, 'final', 3], ['tag', 4, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['head', 16, 'theme', 2], ['bridge', 8, 'themeB', 1], ['solo', 16, 'solo', 2], ['trading fours', 16, 'trade', 3], ['head out', 16, 'final', 2], ['tag', 4, 'outro', 1]],
    ],
    drums: {
      full: { ride: 'x---x-x-x---x-x-', hat: '----x-------x---', kick: 'o---o---o---o---', snare: '------o-------o-' },
      busy: { ride: 'x---x-x-x---x-x-', hat: '----x-------x---', kick: 'o---o---o--xo---', snare: '--o---o-o---o-oo' },
      light: { brush: 'x---x---x---x---', hat: '----x-------x---' },
      fill: { snare: '--------x-xxx-x-', kick: '--------------x-' },
    },
    // piano comping by energy: a whole note; the Charleston (1, the "and" of 2 — swung); anticipations; busier
    comp: { 0: [[0, 0.5, 3.5]], 1: [[0, 0.5, 1.4], [1.66, 0.42, 1.2]], 2: [[0, 0.5, 1.3], [1.66, 0.45, 0.9], [3.66, 0.42, 0.3]], 3: [[0.66, 0.5, 0.8], [2, 0.45, 0.6], [2.66, 0.5, 1]] },
    bassline: 'walking', arpStep: 0.5, arpPoly: false,
  },
  // Celtic: tunes of our own in the modes of the tradition (mixolydian, dorian, aeolian or major, by its own dice), reels in 4/4
  // or jigs in 6/8, cuts and rolls on the tunes; tin whistle, fiddle or uilleann pipes, bouzouki/guitar, harp, the pipes'
  // drone in the bass, the bodhrán
  celtic: {
    label: 'Кельтская музыка', emoji: '☘️', theme: 'celtic', bpm: [100, 126], swing: 0.55,
    themes: { 'celtic-reel': 5, 'celtic-air': 3 },
    keys: ['D', 'G', 'A', 'E', 'Am', 'Em', 'Dm'], moods: ['folk'],
    modes: [null, 'mixolydian', 'dorian', 'mixolydian', 'dorian'], meters: ['6/8', null, '6/8'], ornate: true,
    voicing: 'close', chordRange: [50, 69], bassRange: [26, 38],
    lead: ['whistle', 'violin', 'pipes'], lead2: ['violin', 'whistle', 'flute'], chords: ['guitar'], bass: ['drone'],
    pad: [null], arp: ['harp'], texture: [null], kit: 'bodhran',
    forms: [
      [['air', 4, 'intro', 0], ['tune', 16, 'theme', 2], ['turn', 16, 'themeB', 2], ['harp', 8, 'bridge', 1], ['session', 8, 'solo', 3], ['tune again', 16, 'final', 3], ['last chord', 4, 'outro', 1]],
      [['drone', 4, 'intro', 0], ['tune', 16, 'theme', 2], ['turn', 8, 'themeB', 2], ['session', 16, 'solo', 3], ['harp', 8, 'bridge', 1], ['tune again', 16, 'final', 3], ['last chord', 4, 'outro', 1]],
    ],
    drums: {
      full: { don: 'x-----x-x-----x-', rim: '----x-------x---', tip: 'x-o-x-o-x-o-x-o-' },
      busy: { don: 'x-----x-x--x--x-', rim: '----x-------x-x-', tip: 'xoxoxoxoxoxoxoxo' },
      light: { don: 'x-------x-------', tip: '--o---o---o---o-' },
      fill: { rim: '--------x-xx-xxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.55, 2], [2, 0.45, 2]], 2: [[0, 0.6, 1], [1, 0.4, 0.5], [1.5, 0.45, 1], [2.5, 0.4, 0.5], [3, 0.5, 1]], 3: [[0, 0.65, 0.5], [0.5, 0.35, 0.5], [1, 0.45, 0.5], [1.5, 0.4, 0.5], [2, 0.6, 0.5], [2.5, 0.35, 0.5], [3, 0.45, 0.5], [3.5, 0.4, 0.5]] },
    bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
  },
  // Generative ambient (src/ambient.js): loops of incommensurate lengths, as in "Music for Airports" — piano, bells, glass, a
  // choir, a breathing pad, a low drone, wind; often in the harmonic series (overtones 8–15) (generateAmbient)
  ambient: {
    label: 'Генеративный эмбиент', emoji: '🌫️', theme: 'void', bpm: [56, 72], swing: 0.5,
    keys: ['F', 'D', 'E', 'C', 'A', 'G'], moods: ['calm'],
    about: 'петли несоизмеримых длин (17, 20½, 23½, 29… долей), как магнитофонные петли «Music for Airports»: ноты встречаются в новых сочетаниях, целое повторится лишь через НОК; часто в натуральном звукоряде — обертоны 8–15 (11-й почти четвертитон, 7-й на 31 ¢ ниже)',
    lead: ['piano', 'bells', 'glass', 'choir'], chords: ['pad'], bass: ['drone'], kit: '—', forms: [], drums: {}, themes: {},
  },
  // the Romantic orchestra: Tchaikovsky, Grieg, Dvořák, Chopin — horn, oboe or a singing cello over a nocturne piano,
  // harp rolls, a brass choir, celesta, strings and a choir; timpani
  romantic: {
    label: 'Романтический оркестр', emoji: '🎼', theme: 'romantic', bpm: [64, 92], swing: 0.5,
    themes: { 'romance-tchaikovsky': 5, 'nocturne-chopin': 5, 'dvorak-largo': 4, 'grieg-mountain': 3, 'beethoven-joy': 1.5, 'mozart-40': 1.5, 'beethoven-fate': 1.5, 'canon-halves': 1 },
    keys: ['Bm', 'Eb', 'Db', 'Gm', 'Em', 'F', 'Ab', 'Cm', 'D', 'Fm'], moods: ['classical', 'warm', 'dark', 'epic'],
    voicing: 'close', chordRange: [48, 72], bassRange: [28, 48],
    lead: ['horn', 'oboe', 'violin', 'cellolead'], lead2: ['clarinet', 'flute', 'violin', 'celesta'], chords: ['nocturne', 'harpchords', 'brasschoir'], bass: ['cello', 'upright'], pad: ['strings', 'choirpad'], arp: ['harp', 'celesta'], texture: [null], kit: 'orchestral',
    forms: [
      [['introduction', 4, 'intro', 0], ['theme', 8, 'theme', 1], ['theme II', 8, 'themeB', 2], ['development', 8, 'bridge', 2], ['cadenza', 8, 'solo', 1], ['finale', 8, 'final', 3, { canon: true }], ['coda', 6, 'outro', 0]],
      [['introduction', 4, 'intro', 0], ['theme II', 8, 'themeB', 1], ['theme', 8, 'theme', 2], ['storm', 8, 'bridge', 3], ['nocturne', 8, 'solo', 1], ['finale', 8, 'final', 3, { keyUp: 1 }], ['coda', 6, 'outro', 0]],
    ],
    drums: {
      full: { timp: 'x-------x-------' }, busy: { timp: 'x-------x---x-x-' }, light: { timp: 'x---------------' }, fill: { timp: '--------x-xxxxxx' },
    },
    comp: { 0: [[0, 0.4, 4]], 1: [[0, 0.45, 2], [2, 0.35, 2]], 2: [[0, 0.5, 2], [2, 0.4, 2]], 3: [[0, 0.6, 1.5], [1.5, 0.45, 1], [2.5, 0.5, 1.5]] },
    bassline: [[0, 'R', 1.9], [2, '5', 1.9]],
    arpStep: 0.5, arpPoly: true,
  },
  // A Japanese battle: shinobue or shakuhachi over koto and shamisen, horn stabs, timpani as the bass, a taiko
  // ensemble — and the boss machinery underneath: a hardstyle kick on the tonic, the reverse bass, the sidechain in
  // the drops, build-ups with a run to the dominant. Themes from songs/raiden, kagekiri, oni-matsuri, shogun-requiem.
  jbattle: {
    label: 'Японская битва', emoji: '⛩️', theme: 'ink', bpm: [140, 164], swing: 0.5, hard: true,
    themes: { 'raiden-theme': 5, 'raiden-eternity': 3, 'kagekiri-theme': 5, 'oni-theme': 4, 'shogun-theme': 4, 'shogun-clash': 4 },
    keys: ['Em', 'Dm', 'Am', 'Cm', 'F#m', 'Bm', 'Gm', 'C#m'], moods: ['epic', 'dark', 'game'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['shinobue', 'shakuhachi'], lead2: ['koto', 'shamisen'], chords: ['hornstabs'], bass: ['timpani'], pad: ['strings'], arp: ['kotoarp'], texture: ['thunder'], kit: 'taiko',
    forms: [
      [['kaminari', 4, 'intro', 1], ['bayashi', 8, 'themeB', 2], ['build', 4, 'build', 2], ['storm', 16, 'theme', 3], ['sakoku', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['duel', 8, 'solo', 3], ['final storm', 16, 'final', 3, { keyUp: 2 }], ['zanshin', 4, 'outro', 0]],
      [['iai', 2, 'intro', 1], ['kamae', 8, 'themeB', 2], ['build', 4, 'build', 2], ['kagekiri', 16, 'theme', 3], ['koto solo', 8, 'solo', 2], ['tsuki', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final kessen', 16, 'final', 3, { keyUp: 1 }], ['yoake', 4, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3]], 1: [[0, 0.55, 3.5]], 2: [[0, 0.7, 1.5], [2.5, 0.6, 1.5]], 3: [[0, 0.9, 1.5], [1.5, 0.75, 1.5], [3, 0.6, 1]] },
    bassline: [[0, 'R', 0.9], [1.5, 'R', 0.4], [2, '5', 0.9], [3, 'R', 0.9]], arpStep: 0.25, arpPoly: false,
  },
  kawaii: {
    label: 'Аниме J-pop', emoji: '🌸', theme: 'kawaii', bpm: [160, 176], swing: 0.5,
    themes: { 'kawaii-hook': 5, 'meow-chorus': 3, 'chip-level': 3, 'chip-level-b': 2, 'meow-verse': 2, canon: 1 },
    keys: ['A', 'E', 'D', 'G', 'C', 'F'], moods: ['bright', 'pop', 'sunny', 'cute'],
    voicing: 'close', chordRange: [55, 79], bassRange: [33, 52],
    lead: ['pulse', 'sawlead'], lead2: ['bells', 'pulse12'], chords: ['sawpad'], bass: ['octbass'], pad: [null], arp: ['bells'], texture: [null], kit: 'electro',
    forms: [
      [['kira-kira', 4, 'intro', 1], ['verse', 8, 'themeB', 1], ['chorus', 8, 'theme', 3], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['key up!', 8, 'final', 3, { keyUp: 1 }], ['♪', 4, 'outro', 1]],
    ],
    drums: {
      full: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-', open: '------x-------x-' },
      busy: { kick: 'x---x---x---x-x-', snare: '----x-------x---', hat: 'xxxxxxxxxxxxxxxx' },
      light: { kick: 'x-------x-------', hat: 'x-x-x-x-x-x-x-x-' },
      fill: { snare: '--------x-xxxxxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.6, 4]], 2: [[0, 0.7, 4]], 3: [[0, 0.8, 4]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  space: {
    label: 'Космос, эмбиент', emoji: '🌌', theme: 'void', bpm: [70, 96], swing: 0.5,
    themes: { 'void-orbit': 4, 'void-nebula': 4, 'canon-halves': 3, 'synthwave-lead': 2, 'template-flute': 2, 'chip-cave': 1 },
    keys: ['Dm', 'Em', 'Am', 'Cm', 'F#m', 'D', 'F'], moods: ['space', 'dark', 'calm', 'epic'],
    voicing: 'close', chordRange: [50, 74], bassRange: [26, 45],
    lead: ['bells', 'choir'], lead2: ['sawlead', 'flute'], chords: ['organ'], bass: ['warmbass'], pad: ['strings', 'choirpad'], arp: ['bells'], texture: ['wind'], kit: 'space',
    forms: [
      [['launch', 4, 'intro', 0], ['orbit', 8, 'theme', 1], ['nebula', 8, 'themeB', 2], ['dark side', 8, 'bridge', 1], ['pulsar', 8, 'solo', 2], ['eclipse', 8, 'final', 3, { canon: true }], ['silence', 6, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-------', snare: '--------x-------', hat: '--x---x---x---x-' },
      busy: { kick: 'x-----x-x-------', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      light: { kick: 'x---------------' },
      fill: { snare: '------------xxxx' },
    },
    comp: { 0: [[0, 0.5, 8]], 1: [[0, 0.55, 4]], 2: [[0, 0.6, 4]], 3: [[0, 0.7, 4]] },
    bassline: [[0, 'R', 3.8]], arpStep: 0.75, arpPoly: true,
  },
  meow: {
    label: 'Кошачий поп', emoji: '🐱', theme: 'meow', bpm: [96, 112], swing: 0.5,
    themes: { 'meow-verse': 5, 'meow-chorus': 5, 'kawaii-hook': 2, 'chip-level': 1.5, 'lofi-flute': 1 },
    keys: ['F', 'G', 'C', 'D', 'Bb', 'A'], moods: ['cute', 'bright', 'pop', 'sunny'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 50],
    lead: ['meow'], lead2: ['bells', 'vibes'], chords: ['piano', 'rhodes'], bass: ['warmbass'], pad: ['strings'], arp: ['bells', 'marimba'], texture: ['purr'], kit: 'boombap',
    forms: [
      [['purr', 4, 'intro', 0], ['meow', 8, 'themeB', 2], ['two cats', 8, 'theme', 3], ['nap', 8, 'bridge', 1], ['music box', 8, 'solo', 2], ['all cats', 8, 'final', 3, { keyUp: 2 }], ['zzz', 4, 'outro', 0]],
    ],
    drums: {
      full: { kick: 'x-------x-x-----', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
      busy: { kick: 'x-----x-x-x-----', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-xx', open: '------x---------' },
      light: { kick: 'x-------x-------', hat: '----x-------x---' },
      fill: { snare: '------------xoxx' },
    },
    comp: { 0: [[0, 0.5, 4]], 1: [[0, 0.55, 2], [2, 0.45, 2]], 2: [[0, 0.6, 1.5], [1.5, 0.45, 1], [2.5, 0.5, 1.5]], 3: [[0, 0.65, 1.5], [1.5, 0.5, 1], [2.5, 0.55, 1.5]] },
    bassline: [[0, 'R', 0.9], [1.5, '5', 0.4], [2, '8', 0.9], [3, '5', 0.9]], arpStep: 0.5, arpPoly: false,
  },
  // Boss music — the sound of overclock and finalbattle: a hardstyle kick tuned to the tonic, a reverse bass
  // between the kicks (rolling in the final), everything ducking under the kick, a supersaw hook, a chip lead,
  // brass stabs, the 60 Hz chip arpeggio, build-ups with a snare roll and a riser. Roles: 'build' is the
  // countdown before a drop (VI – VII – V – V, a run up to the dominant); energy 3 = a drop.
  boss: {
    label: 'Босс-битва', emoji: '⚔️', theme: 'chip', bpm: [148, 164], swing: 0.5,
    themes: { 'boss-ascent': 5, 'boss-requiem': 5, 'boss-overdrive': 5, 'overclock-hook': 3, 'finalbattle-theme': 3, 'chip-boss': 1 },
    keys: ['F#m', 'Em', 'Gm', 'Am', 'Dm', 'Cm', 'Bm', 'C#m'], moods: ['epic', 'dark', 'game'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['supersaw'], lead2: ['pulse', 'pulse12'], chords: ['brass'], bass: ['growl', 'chiptri'], pad: ['strings'], arp: ['chip60'], texture: ['riser'], kit: 'hardstyle',
    forms: [
      [['boot', 4, 'intro', 1], ['theme', 8, 'themeB', 2], ['build', 4, 'build', 2], ['drop', 16, 'theme', 3], ['break', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['equation', 8, 'solo', 3], ['final', 16, 'final', 3, { keyUp: 2 }], ['shutdown', 4, 'outro', 0]],
      [['encounter', 2, 'intro', 1], ['menu', 8, 'themeB', 2], ['attack', 4, 'build', 2], ['phase 1', 16, 'theme', 3], ['equation', 8, 'solo', 3], ['mercy', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final phase', 16, 'final', 3, { keyUp: 3 }], ['victory', 4, 'outro', 0]],
    ],
    drums: {},
    // brass stabs per bar, by energy: one long chord when calm, 1 and the "and" of 3 in the chip sections, 3-3-2 in the drops
    comp: { 0: [[0, 0.5, 3]], 1: [[0, 0.55, 3.5]], 2: [[0, 0.7, 1.5], [2.5, 0.6, 1.5]], 3: [[0, 0.9, 1.5], [1.5, 0.75, 1.5], [3, 0.6, 1]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Festival EDM (progressive house, big room): the club kick tuned to the tonic and everything pumping under it, a
  // supersaw hook in the drops, a pluck in the verse, the bass on the off-beats, a sixteenth pluck arpeggio, build-ups
  // with a snare roll doubling and a riser, a breakdown without the kick, an impact on every drop (stageData, KITS.edm)
  edm: {
    label: 'Фестивальный EDM', emoji: '⚡', theme: 'dnb', bpm: [124, 128], swing: 0.5,
    gains: { pad: 1.6, counter: 1.6, bass: 0.9 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'edm-skyline': 5, 'edm-afterglow': 5, 'synthwave-lead': 1.5, 'kawaii-hook': 1, 'void-orbit': 1 },
    keys: ['Am', 'Fm', 'Gm', 'Em', 'Cm', 'F', 'G', 'C', 'Bb', 'D'], moods: ['epic', 'bright', 'pop'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 45],
    lead: ['supersaw'], lead2: ['pluck'], counter: 'pluck', chords: ['pumpsaw'], bass: ['clubbass'], pad: ['strings'], arp: ['pluckarp'], texture: ['sweeps'], kit: 'edm',
    club: { pump: 0.75, kick: { 1: 'x---x---x---x---', 2: 'x---x---x---x---', 3: 'x---x---x---x---' }, sound: { punch: 6, decay: 0.3, click: 0.4 } },
    forms: [
      [['intro', 8, 'intro', 1], ['verse', 8, 'themeB', 2], ['build', 4, 'build', 2], ['drop', 16, 'theme', 3], ['breakdown', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final drop', 16, 'final', 3], ['outro', 8, 'outro', 1]],
      [['intro', 8, 'intro', 1], ['build', 4, 'build', 2], ['drop', 16, 'theme', 3], ['verse', 8, 'themeB', 2], ['breakdown', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final drop', 16, 'final', 3, { keyUp: 2 }], ['outro', 8, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Nu-disco and funk: four on the floor under a chicken-scratch guitar (exactly tuned strings, chopped and muted), a slap
  // bass in octaves, a horn section on the "and" of 2, disco strings, a Moog, trumpet or tenor sax lead with a solo
  disco: {
    label: 'Нью-диско и фанк', emoji: '🪩', theme: 'synth', bpm: [112, 122], swing: 0.5,
    gains: { lead2: 1.3, counter: 1.4, pad: 1.5, bass: 1.2 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'disco-mirrorball': 5, 'disco-rollerrink': 5, 'bossa-theme': 1, 'kawaii-hook': 1, 'meow-chorus': 0.5 },
    keys: ['Am', 'Dm', 'Em', 'Gm', 'F', 'Bb', 'Eb', 'C'], moods: ['pop', 'jazzy', 'bright', 'warm'],
    voicing: 'close', chordRange: [57, 74], bassRange: [28, 43],
    lead: ['moog', 'trumpet', 'sax'], lead2: ['epiano', 'vibes', 'moog'], chords: ['funkguitar'], bass: ['slapbass'], pad: ['strings'], arp: ['horns'], texture: [null], kit: 'disco',
    club: { pump: 0.18, bridgeKick: true, kick: { 1: 'x---x---x---x---', 2: 'x---x---x---x---', 3: 'x---x---x---x---' }, sound: { punch: 4, decay: 0.22, click: 0.25, drive: 1.6 } },
    forms: [
      [['intro', 4, 'intro', 1], ['verse', 8, 'themeB', 2], ['chorus', 8, 'theme', 3], ['bridge', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['last chorus', 8, 'final', 3, { keyUp: 2 }], ['outro', 4, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['verse', 8, 'themeB', 2], ['chorus', 8, 'theme', 3], ['solo', 8, 'solo', 2], ['breakdown', 4, 'break', 1], ['build', 4, 'build', 2], ['last chorus', 16, 'final', 3, { keyUp: 1 }], ['outro', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  // The epic trailer: spiccato strings in 3 + 3 + 2, celli and basses in octaves, a horn section (or a choir) on the
  // theme, violins answering, taiko and big toms, the boom on every downbeat of the action, braams, a reversed cymbal
  // swelling into each drop, a high piano in 4 against 3
  epic: {
    label: 'Эпический трейлер', emoji: '🎬', theme: 'arena', bpm: [84, 100], swing: 0.5, stage: true,
    gains: { lead2: 1.3, pad: 1.3, arp: 1.9 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'epic-banners': 5, 'epic-laststand': 5, 'void-orbit': 1.5, 'void-nebula': 1 },
    keys: ['Dm', 'Cm', 'Em', 'Gm', 'Am', 'Bm', 'Fm', 'C#m'], moods: ['epic', 'dark'],
    voicing: 'close', chordRange: [52, 72], bassRange: [31, 43],
    lead: ['hornsection', 'choir'], lead2: ['violin', 'cellolead'], counter: 'violin', chords: ['ostinato'], bass: ['lowstrings'], pad: ['strings', 'choirpad'], arp: ['piano'], texture: ['braam'], kit: 'epic',
    forms: [
      [['prologue', 4, 'intro', 0], ['rising', 8, 'themeB', 2], ['build', 4, 'build', 2], ['main title', 16, 'theme', 3], ['reflection', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['last stand', 16, 'final', 3, { keyUp: 1 }], ['epilogue', 4, 'outro', 0]],
      [['prologue', 4, 'intro', 0], ['main title', 8, 'theme', 2], ['the fall', 8, 'bridge', 1], ['rising', 8, 'themeB', 2], ['build', 4, 'build', 2], ['charge', 16, 'final', 3, { canon: true }], ['epilogue', 6, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: true,
  },
  // The conveyor — the music of factory games (Mindustry, Factorio, Shapez…): late-pixel-game synths around 120 BPM with
  // an epic edge. The machine is the conveyor: a pluck sequencer on the chord tones that the seed builds (accents 3
  // against 4), a sequenced analog bass, struck steel in the kit, the hum of the plant; three places to build in —
  // the town (major, steady, four on the floor), the caves (minor, half time, dripping water, long echoes) and danger
  // (a wave attacking the core: driving sixteenths, toms, a supersaw, a siren far away)
  factory: {
    label: 'Конвейер: город', emoji: '🏭', theme: 'factory', bpm: [118, 126], swing: 0.5, variant: 'city',
    gains: { pad: 1.5, counter: 1.5 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'factory-dawn': 5, 'chip-level': 1.5, 'chip-level-b': 1, 'synthwave-lead': 1, 'kawaii-hook': 0.5 },
    keys: ['D', 'C', 'G', 'F', 'A', 'E', 'Bb'], modes: [null, null, 'mixolydian'], moods: ['game', 'bright', 'epic'],
    voicing: 'close', chordRange: [55, 74], bassRange: [31, 43],
    lead: ['synthlead', 'pulse'], lead2: ['pluck', 'bells'], counter: 'pluck', chords: ['pumpsaw'], bass: ['seqbass'], pad: ['strings'], arp: ['conveyor'], texture: ['machines'], kit: 'factory',
    club: { pump: 0.35, kick: { 1: 'x-------x-------', 2: 'x---x---x---x---', 3: 'x---x---x---x-x-' }, sound: { punch: 5, decay: 0.26, click: 0.3, drive: 1.8 } },
    forms: [
      [['boot', 4, 'intro', 1], ['assembly', 8, 'themeB', 2], ['conveyors', 16, 'theme', 3], ['storage', 8, 'bridge', 1], ['research', 8, 'solo', 2], ['expansion', 16, 'final', 3], ['night shift', 4, 'outro', 1]],
      [['boot', 4, 'intro', 1], ['conveyors', 8, 'theme', 2], ['assembly', 8, 'themeB', 2], ['logistics', 8, 'solo', 3], ['storage', 8, 'bridge', 1], ['launch pad', 16, 'final', 3, { keyUp: 2 }], ['night shift', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  factorycave: {
    label: 'Конвейер: пещеры', emoji: '⛏️', theme: 'factory', bpm: [108, 116], swing: 0.5, variant: 'cave',
    gains: { pad: 1.5, counter: 1.5 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'factory-deepore': 5, 'chip-cave': 2.5, 'void-nebula': 2, 'void-orbit': 1 },
    keys: ['Em', 'Dm', 'F#m', 'Am', 'Bm', 'Cm', 'C#m'], modes: [null, 'dorian', null, 'phrygian'], moods: ['dark', 'space', 'game'],
    voicing: 'close', chordRange: [52, 72], bassRange: [28, 40],
    lead: ['synthlead', 'bells'], lead2: ['pluck', 'vibes'], counter: 'pluck', chords: ['pumpsaw'], bass: ['seqbass'], pad: ['choirpad', 'strings'], arp: ['conveyor'], texture: ['drips'], kit: 'factory',
    club: { pump: 0.2, kick: { 1: 'x---------------', 2: 'x-------x-x-----', 3: 'x-----x---x-----' }, sound: { punch: 4, decay: 0.4, click: 0.15, drive: 1.5 } },
    forms: [
      [['descent', 8, 'intro', 1], ['tunnels', 8, 'themeB', 2], ['ore veins', 16, 'theme', 2], ['the deep', 8, 'bridge', 1], ['drills', 8, 'solo', 2], ['crystal cavern', 16, 'final', 3], ['silence', 4, 'outro', 0]],
      [['descent', 4, 'intro', 1], ['ore veins', 16, 'theme', 2], ['the deep', 8, 'bridge', 1], ['tunnels', 8, 'themeB', 2], ['drills', 8, 'solo', 3], ['crystal cavern', 16, 'final', 3], ['silence', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  factorydanger: {
    label: 'Конвейер: опасность', emoji: '🚨', theme: 'factory', bpm: [128, 136], swing: 0.5, variant: 'danger',
    gains: { lead: 0.9, lead2: 1.3, counter: 1.6, pad: 1.5, bass: 1.3, arp: 1.4 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'factory-breach': 5, 'chip-boss': 2, 'void-orbit': 1.5, 'synthwave-lead': 1 },
    keys: ['Cm', 'Dm', 'Em', 'F#m', 'Am', 'Gm', 'Bm'], modes: [null, null, 'phrygian'], moods: ['epic', 'dark', 'game'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['supersaw', 'synthlead'], lead2: ['pulse', 'pluck'], counter: 'pluck', chords: ['brass'], bass: ['seqbass'], pad: ['strings'], arp: ['conveyor'], texture: ['alarm'], kit: 'factory',
    club: { pump: 0.55, kick: { 1: 'x-------x-------', 2: 'x---x---x---x---', 3: 'x---x---x---x---' }, sound: { punch: 7, decay: 0.28, click: 0.45, drive: 2.6 } },
    forms: [
      [['alert', 4, 'intro', 1], ['first wave', 8, 'themeB', 2], ['build', 4, 'build', 2], ['core under attack', 16, 'theme', 3], ['regroup', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['last wave', 16, 'final', 3, { keyUp: 1 }], ['all clear', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3]], 1: [[0, 0.55, 3.5]], 2: [[0, 0.7, 1.5], [2.5, 0.6, 1.5]], 3: [[0, 0.9, 1.5], [1.5, 0.75, 1.5], [3, 0.6, 1]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Dark Echo: the soundtrack after the catastrophe — slow, no bright theme anywhere; a solo cello, a piano or a
  // choir over shivering tremolo strings, a conveyor still turning somewhere (the belt at half the speed), the ruins'
  // percussion (a drum far away, steel struck in the dark, a chain, a heartbeat), wind, a Geiger counter, a radio
  darkecho: {
    label: 'Тёмное эхо', emoji: '🕯️', theme: 'gothic', bpm: [62, 74], swing: 0.5, stage: true, variant: 'cave',
    gains: { pad: 1.3, counter: 1.3, arp: 0.8 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 }, // the themes come back changed more often
    themes: { 'echo-ashenroad': 4, 'echo-hollow': 4, 'echo-furnace': 4, 'factory-deepore': 0.8, 'void-nebula': 0.5 },
    keys: ['Dm', 'Em', 'Cm', 'Am', 'Bm', 'F#m', 'Gm', 'C#m'], modes: [null, null, 'phrygian'], moods: ['dark'],
    voicing: 'close', chordRange: [50, 70], bassRange: [28, 40],
    lead: ['cellolead', 'piano', 'choir'], lead2: ['violin', 'horn', 'oboe'], counter: 'horn', chords: ['tremolo', 'pipeorgan'], bass: ['lowstrings'], pad: ['choirpad', 'strings'], arp: ['conveyor'], texture: ['ashwind'], kit: 'ruins',
    forms: [
      [['ashes', 4, 'intro', 0], ['the long road', 8, 'themeB', 1], ['rust', 8, 'theme', 2], ['memory', 4, 'bridge', 1], ['the furnace', 4, 'solo', 2], ['last light', 8, 'final', 3], ['embers', 4, 'outro', 0]],
      [['ashes', 4, 'intro', 0], ['rust', 8, 'theme', 1], ['the long road', 8, 'themeB', 2], ['memory', 4, 'bridge', 1], ['the crawl', 4, 'build', 2], ['last light', 8, 'final', 3], ['embers', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
  },
  // Is there any hope?: a heavy metal score for a war nobody won — slow, half time, never four on the floor: double-
  // tracked power chords chugging under a lead guitar (or a choir, or a horn section), a picked bass doubling the
  // roots, the double bass drum under the snare on 3, a belt of the factories still running, braams or a siren
  ishope: {
    label: 'Is there any hope?', emoji: '🔥', theme: 'phonk', bpm: [74, 88], swing: 0.5, stage: true, variant: 'danger',
    gains: { lead: 1, lead2: 1.2, counter: 1.3, pad: 1.4, arp: 0.9 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 },
    themes: { 'hope-ironrain': 4, 'hope-lastwatch': 4, 'hope-nodawn': 4, 'epic-laststand': 1, 'factory-breach': 0.8 },
    keys: ['Em', 'Dm', 'Cm', 'C#m', 'Bm', 'F#m', 'Am'], modes: [null, null, 'phrygian'], moods: ['dark', 'epic'],
    voicing: 'close', chordRange: [52, 72], bassRange: [28, 40],
    lead: ['leadgtr', 'choir', 'hornsection'], lead2: ['cellolead', 'violin', 'leadgtr'], counter: 'violin', chords: ['metalgtr'], bass: ['metalbass'], pad: ['choirpad', 'strings'], arp: ['conveyor'], texture: ['braam', 'ashwind'], kit: 'metal',
    forms: [
      [['the ruins', 4, 'intro', 1], ['march', 8, 'themeB', 2], ['build', 4, 'build', 2], ['no hope', 16, 'theme', 3], ['requiem', 8, 'bridge', 1], ['the wall', 8, 'solo', 2], ['build II', 4, 'build', 2], ['last stand', 16, 'final', 3], ['ashes', 4, 'outro', 1]],
      [['the ruins', 4, 'intro', 1], ['no hope', 8, 'theme', 2], ['march', 8, 'themeB', 3], ['requiem', 8, 'bridge', 1], ['build', 4, 'build', 2], ['last stand', 16, 'final', 3, { canon: true }], ['ashes', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Chozo Halls: Metroid Prime and a horror film — glassy bells or an analog lead over tremolo strings or dark pumping
  // saws, a pluck arpeggio, an industrial kit (deep toms, a tight snare, ticks, a heartbeat in the dark), a waterphone,
  // a sub drone far below, metal screeching somewhere
  prime: {
    label: 'Залы чозо', emoji: '👁️', theme: 'void', bpm: [86, 102], swing: 0.5, stage: true, variant: 'cave',
    gains: { pad: 1.4, counter: 1.4, arp: 0.8, bass: 0.7 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 },
    themes: { 'prime-chozo': 4, 'prime-phazon': 4, 'prime-frozen': 4, 'factory-deepore': 1, 'void-orbit': 0.8, 'void-nebula': 0.8 },
    keys: ['Am', 'Em', 'Dm', 'Bm', 'Cm', 'F#m', 'Gm'], modes: [null, 'dorian', 'phrygian'], moods: ['dark', 'space', 'game'],
    voicing: 'close', chordRange: [52, 74], bassRange: [28, 40],
    lead: ['synthlead', 'bells', 'choir'], lead2: ['pluck', 'celesta', 'flute'], counter: 'pluck', chords: ['tremolo', 'pumpsaw'], bass: ['seqbass'], pad: ['choirpad', 'strings'], arp: ['pluckarp'], texture: ['horror'], kit: 'prime',
    forms: [
      [['landing site', 8, 'intro', 0], ['ruins', 8, 'themeB', 2], ['artifact', 16, 'theme', 2], ['phazon mines', 8, 'bridge', 1], ['the hunt', 4, 'build', 2], ['impact crater', 16, 'final', 3], ['silence', 8, 'outro', 0]],
      [['landing site', 4, 'intro', 0], ['artifact', 8, 'theme', 2], ['frozen halls', 8, 'bridge', 1], ['ruins', 8, 'themeB', 2], ['scan', 8, 'solo', 2], ['the hunt', 4, 'build', 2], ['impact crater', 16, 'final', 3], ['silence', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Brinstar Depths: the deep jungle of a 16-bit adventure at 80 BPM — pan pipes, marimba or vibes over a slow tribal pulse
  // (a soft kick, three toms, a bongo, a shaker), a fretless bass, an electric piano and synth strings, marimba bubbles
  // rising in the arpeggio, the night of the swamp (bubbles, insects, steam, a creature far below) in a long wet echo
  brinstar: {
    label: 'Brinstar Depths', emoji: '🌿', theme: 'jungle', bpm: [76, 84], swing: 0.5, stage: true,
    gains: { chords: 1.6, pad: 1.5, counter: 1.8, arp: 1.7, bass: 1.25 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 },
    themes: { 'brin-moss': 4, 'brin-spore': 4, 'brin-lair': 4 },
    keys: ['Em', 'Dm', 'Am', 'Bm', 'Gm', 'Cm', 'F#m'], modes: [null, 'dorian', 'phrygian'], moods: ['dark', 'space', 'game'],
    voicing: 'close', chordRange: [52, 74], bassRange: [28, 42],
    lead: ['panpipe', 'panpipe', 'vibes', 'bells'], lead2: ['epiano', 'flute', 'bells'], counter: 'vibes', chords: ['rhodes', 'tremolo'], bass: ['fretless'], pad: ['strings', 'choirpad'], arp: ['marimba'], texture: ['jungle'], kit: 'tribal',
    forms: [
      [['spore haze', 8, 'intro', 0], ['the roots', 8, 'themeB', 1], ['brinstar depths', 16, 'theme', 2], ['the swamp', 8, 'bridge', 1], ['the hunt', 4, 'build', 2], ['the lair', 16, 'final', 3], ['dripping', 8, 'outro', 0]],
      [['spore haze', 4, 'intro', 0], ['brinstar depths', 8, 'theme', 2], ['the swamp', 8, 'bridge', 1], ['the roots', 8, 'themeB', 2], ['scan', 8, 'solo', 2], ['the hunt', 4, 'build', 2], ['the lair', 16, 'final', 3], ['dripping', 4, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 1.8], [2, 0.45, 1.8]], 2: [[0, 0.55, 1.4], [1.5, 0.4, 0.4], [2, 0.5, 1.8]], 3: [[0, 0.6, 1.4], [1.5, 0.45, 0.4], [2, 0.55, 0.9], [3, 0.45, 0.8]] },
    bassline: [[0, 'R', 1.4], [1.5, 'R', 0.4], [2, 'R', 1.4], [3.5, '5', 0.4]], arpStep: 0.5, arpPoly: false,
  },
  // Montagem Mysterious Game: Brazilian montagem — a hypnotic music-box riddle over the tamborzão (3 + 3 + 2), a distorted
  // 808 sliding under it, "ah / oh / ê" chops on the off-beats, dark saws far back; minor or Phrygian, wide and deep
  montagem: {
    label: 'Montagem Mysterious Game', emoji: '❓', theme: 'mystery', bpm: [126, 132], swing: 0.5, stage: true, variant: 'cave',
    gains: { lead: 1.8, lead2: 0.9, counter: 1.2, chords: 0.9, pad: 1.3, bass: 1.1 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'mont-riddle': 5, 'mont-shadow': 5 },
    keys: ['Am', 'Dm', 'Em', 'Gm', 'Cm', 'Fm', 'Bm'], modes: [null, null, 'phrygian'], moods: ['dark', 'game'],
    voicing: 'close', chordRange: [52, 72], bassRange: [26, 38],
    lead: ['mysterybox'], lead2: ['bells', 'musicbox'], counter: 'bells', chords: ['pumpsaw'], bass: ['mont808'], pad: ['choirpad', null], arp: [null], texture: ['funkvox'], kit: 'tamborzao',
    forms: [
      [['o jogo', 4, 'intro', 1], ['montagem', 16, 'theme', 3], ['o mistério', 8, 'themeB', 2], ['silêncio', 4, 'break', 0], ['subindo', 4, 'build', 2], ['montagem II', 16, 'final', 3], ['fim de jogo', 4, 'outro', 1]],
      [['o jogo', 4, 'intro', 1], ['o mistério', 8, 'themeB', 2], ['montagem', 16, 'theme', 3], ['a pista', 8, 'bridge', 1], ['subindo', 4, 'build', 2], ['montagem II', 16, 'final', 3], ['fim de jogo', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  // VELORA (in the spirit of Rushex & the montagem producers): Brazilian phonk — a wide, driven 808 cowbell riff, supersaw
  // stabs, the tamborzão with rolling hats and doubled claps, chants, the 808 clipping in the drops
  velora: {
    label: 'VELORA', emoji: '💜', theme: 'favela', bpm: [132, 140], swing: 0.5, stage: true, variant: 'velora',
    gains: { lead: 2.4, lead2: 0.6, counter: 1, chords: 1.1, pad: 1.3, bass: 1.1 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'velora-rush': 5, 'velora-drift': 5 },
    keys: ['F#m', 'Gm', 'Am', 'Em', 'Cm', 'Bm', 'C#m'], modes: [null, 'phrygian', null], moods: ['dark'],
    voicing: 'close', chordRange: [52, 72], bassRange: [26, 38],
    lead: ['cowbellwide'], lead2: ['mysterybox', 'steelpan'], counter: 'mysterybox', chords: ['stabs'], bass: ['mont808'], pad: [null, 'choirpad'], arp: [null], texture: ['funkvox'], kit: 'tamborzao',
    forms: [
      [['entrada', 4, 'intro', 1], ['velora', 16, 'theme', 3], ['a noite', 8, 'themeB', 2], ['freio', 4, 'break', 0], ['velora II', 16, 'final', 3], ['neblina', 8, 'bridge', 1], ['saída', 4, 'outro', 1]],
      [['entrada', 4, 'intro', 1], ['a noite', 8, 'themeB', 2], ['velora', 16, 'theme', 3], ['neblina', 8, 'bridge', 1], ['subindo', 4, 'build', 2], ['velora II', 16, 'final', 3], ['saída', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 0.4]], 1: [[0, 0.5, 0.4], [2.5, 0.45, 0.4]], 2: [[0, 0.55, 0.3], [0.75, 0.45, 0.3], [2.5, 0.5, 0.3]], 3: [[0, 0.6, 0.3], [0.75, 0.5, 0.25], [1.5, 0.55, 0.3], [2.5, 0.5, 0.25], [3.25, 0.5, 0.25]] },
    bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  // Error XP: the sounds of an old desktop made into a club track — a glassy "ding" lead and its octave, error beeps
  // falling a fourth in the arpeggio, mouse clicks, a hard disk, a notification chime opening the sections, lush pads,
  // four on the floor with a side-chain; bright major keys of the 2000s
  xperror: {
    label: 'Error XP', emoji: '🪟', theme: 'xp', bpm: [122, 128], swing: 0.5,
    gains: { lead: 2.3, lead2: 0.9, counter: 1.3, pad: 1.5, bass: 0.6, arp: 3 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'xp-bliss': 5, 'xp-startup': 5 },
    keys: ['C', 'F', 'G', 'D', 'Bb', 'Eb', 'A'], moods: ['bright', 'pop'],
    voicing: 'close', chordRange: [55, 76], bassRange: [33, 45],
    lead: ['xpding'], lead2: ['pluck', 'bells'], counter: 'pluck', chords: ['pumpsaw'], bass: ['clubbass'], pad: ['strings'], arp: ['errbeep'], texture: ['desktop'], kit: 'edm',
    club: { pump: 0.6, kick: { 1: 'x---x---x---x---', 2: 'x---x---x---x---', 3: 'x---x---x---x---' }, sound: { punch: 5, decay: 0.28, click: 0.35 } },
    forms: [
      [['startup', 8, 'intro', 1], ['desktop', 8, 'themeB', 2], ['loading', 4, 'build', 2], ['error', 16, 'theme', 3], ['safe mode', 8, 'bridge', 1], ['loading II', 4, 'build', 2], ['critical error', 16, 'final', 3], ['shutdown', 8, 'outro', 1]],
      [['startup', 8, 'intro', 1], ['loading', 4, 'build', 2], ['error', 16, 'theme', 3], ['desktop', 8, 'themeB', 2], ['safe mode', 8, 'bridge', 1], ['loading II', 4, 'build', 2], ['critical error', 16, 'final', 3, { keyUp: 2 }], ['shutdown', 8, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // KeyGen Church: keygen music in a cathedral — a tracker's PWM lead with its ping-pong echo, a chip arpeggio, a pipe
  // organ, a choir in the vaults, an 8-bit kit in a stone nave with a bell on every section; dark minor, epic
  keygen: {
    label: 'KeyGen Church', emoji: '🔑', theme: 'keygen', bpm: [138, 150], swing: 0.5, stage: true,
    gains: { lead: 1.5, lead2: 0.9, counter: 4, chords: 1.2, pad: 1.4, bass: 0.5, arp: 5 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'kg-cathedral': 5, 'kg-requiem': 5 },
    keys: ['Dm', 'Am', 'Em', 'Gm', 'Cm', 'Bm', 'F#m'], moods: ['dark', 'epic', 'game'],
    voicing: 'close', chordRange: [52, 74], bassRange: [28, 42],
    lead: ['keygen'], lead2: ['pulse', 'bells'], counter: 'pulse12', chords: ['pipeorgan'], bass: ['chiptri'], pad: ['choirpad'], arp: ['pulsearp'], texture: ['cathedral'], kit: 'tracker',
    forms: [
      [['nfo', 4, 'intro', 0], ['the scroller', 8, 'themeB', 2], ['keygen', 16, 'theme', 3], ['the nave', 8, 'bridge', 1], ['patching', 4, 'build', 2], ['cracktro', 16, 'final', 3], ['amen', 4, 'outro', 0]],
      [['nfo', 4, 'intro', 0], ['keygen', 8, 'theme', 2], ['the scroller', 8, 'themeB', 2], ['the nave', 8, 'bridge', 1], ['solo', 8, 'solo', 2], ['patching', 4, 'build', 2], ['cracktro', 16, 'final', 3, { keyUp: 2 }], ['amen', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Nightstorm (the user's own "nightstorm", listened to: 162 BPM, B♭ with the ♭VII, no beat): the intro's soft voice alone,
  // then strings trembling in sixteenths under it, low strings pulsing, harp runs rising, a choir, rain all the way, thunder
  // and a timpani's boom where the storm comes in, a calm in the middle, the storm again to the end
  nightstorm: {
    label: 'Ночная буря', emoji: '⛈️', theme: 'storm', bpm: [158, 166], swing: 0.5, stage: true,
    gains: { lead: 1.6, lead2: 0.7, counter: 1, chords: 2, pad: 1.3, bass: 1.4, arp: 1.1 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 4, ornamented: 3, recomposed: 2 },
    themes: { 'ns-calm': 5, 'ns-storm': 5 },
    keys: ['Bb', 'Bb', 'Bb', 'C', 'Eb', 'F'], modes: [null, null, 'mixolydian'], moods: ['epic', 'dark', 'calm'],
    voicing: 'close', chordRange: [55, 77], bassRange: [28, 43],
    lead: ['nightlead'], lead2: ['choir', 'cellolead'], counter: 'cellolead', chords: ['stormstrings'], bass: ['lowstrings'], pad: ['choirpad', 'strings'], arp: ['harp'], texture: ['storm'], kit: 'storm',
    forms: [
      [['тишина перед бурей', 8, 'intro', 0], ['первые капли', 8, 'themeB', 2], ['буря', 16, 'theme', 3], ['раскаты', 16, 'themeB', 3], ['затишье', 16, 'bridge', 1], ['ночная буря', 16, 'final', 3], ['рассвет', 8, 'outro', 1]],
      [['тишина перед бурей', 8, 'intro', 0], ['буря', 16, 'theme', 2], ['раскаты', 16, 'themeB', 3], ['затишье', 8, 'bridge', 1], ['ветер', 4, 'build', 2], ['ночная буря', 16, 'final', 3], ['рассвет', 8, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Heaven (the angel's dream of Blue Hour — the white garden): its formant choir under everything, the angel's voice singing
  // the theme in syllables (or drops of dew, or the halo bell), glints of light, the hum, the wide pad; no drums — a bell, a
  // chime, a breath of air into each section; slow, major, the ♭VII or the Lydian II for light
  heaven: {
    label: 'Райский сад', emoji: '👼', theme: 'heaven', bpm: [56, 70], swing: 0.5, stage: true,
    gains: { lead: 1, lead2: 0.8, counter: 2.4, chords: 1, pad: 0.9, bass: 0.42, arp: 1.5 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 4, ornamented: 2, recomposed: 2 },
    themes: { 'heaven-garden': 5, 'heaven-feather': 5, 'heaven-gloria': 5 },
    keys: ['D', 'G', 'F', 'A', 'C', 'Bb', 'Eb', 'E'], moods: ['calm', 'bright'],
    voicing: 'close', chordRange: [57, 81], bassRange: [31, 45],
    lead: ['seraph', 'seraph', 'halobell'], lead2: ['dew', 'starcelesta', 'glint'], counter: 'flute', chords: ['halopad'], bass: ['hum'], pad: ['angelchoir'], arp: ['glints', 'glints', 'haloharp'], texture: ['eden'], kit: 'heaven',
    forms: [
      [['рассвет', 4, 'intro', 0], ['белый сад', 8, 'theme', 1], ['перья', 8, 'themeB', 2], ['тишина', 4, 'bridge', 1], ['голос ангела', 8, 'solo', 2], ['лестница', 4, 'build', 2], ['вознесение', 8, 'final', 3, { keyUp: 2 }], ['свет', 4, 'outro', 0]],
      [['рассвет', 4, 'intro', 0], ['перья', 8, 'themeB', 1], ['белый сад', 8, 'theme', 2], ['облака', 8, 'bridge', 1], ['врата', 4, 'build', 2], ['вознесение', 8, 'final', 3], ['хорал', 8, 'theme', 2], ['свет', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
  },
  // Hell (the crimson dream turned all the way down): the choir of the damned chanting in octaves (or a horn section, or a
  // cello), the cracked bell, a pipe organ or strings shivering, the abyss choir, magma under it, embers, a heart, a great
  // drum in 3 + 3 + 2 at half speed, an anvil, chains, fire, wind and wailing; minor or Phrygian, the Dies irae itself
  hell: {
    label: 'Преисподняя', emoji: '😈', theme: 'hell', bpm: [60, 74], swing: 0.5, stage: true,
    gains: { lead: 3, lead2: 2, counter: 3, chords: 8, pad: 0.85, bass: 0.8, arp: 4 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 4, ornamented: 2, recomposed: 2 },
    themes: { 'hell-diesirae': 5, 'hell-ninth': 5, 'hell-lake': 5 },
    keys: ['Dm', 'Em', 'Cm', 'C#m', 'Bm', 'F#m', 'Gm', 'Am'], modes: [null, null, 'phrygian'], moods: ['dark', 'epic'],
    voicing: 'close', chordRange: [50, 70], bassRange: [28, 40],
    lead: ['damned', 'damned', 'hellhorns', 'cellolead'], lead2: ['hellbell', 'cellolead', 'leadgtr'], counter: 'cellolead', chords: ['hellorgan', 'helltremolo'], bass: ['magma'], pad: ['abyss'], arp: ['embers'], texture: ['inferno'], kit: 'hell',
    forms: [
      [['врата', 4, 'intro', 0], ['лимб', 8, 'themeB', 1], ['город Дит', 8, 'theme', 2], ['Стикс', 4, 'bridge', 1], ['спуск', 4, 'build', 2], ['девятый круг', 8, 'final', 3], ['пепел', 4, 'outro', 0]],
      [['врата', 4, 'intro', 0], ['город Дит', 8, 'theme', 1], ['лимб', 8, 'themeB', 2], ['Стикс', 8, 'bridge', 1], ['плач', 4, 'solo', 2], ['спуск', 4, 'build', 2], ['девятый круг', 8, 'final', 3, { canon: true }], ['пепел', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
  },
  // Magma Depths (the user's own «Magma depths», 2021 — its Ableton set read: 139 BPM, D minor): the church organ and the piano in
  // open fifths low, strings on the theme in octaves, a choir, held low strings, the eighth-note figure of their World StringZ, and
  // their own drum kit — a soft felt kick, four 16-inch toms, a ride, the kit's synth hit — in their grooves; sus chords, the
  // dominant with ♭6 and the leading tone's °
  magma: {
    label: 'Magma Depths', emoji: '🌋', theme: 'magma', bpm: [134, 144], swing: 0.5, stage: true,
    gains: { lead: 1, lead2: 1, counter: 1.6, chords: 0.5, pad: 1.6, bass: 1, arp: 1.6 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 4, ornamented: 2, recomposed: 2 },
    themes: { 'magma-lava': 5, 'magma-depths': 5, 'magma-gate': 4 },
    keys: ['Dm', 'Dm', 'Dm', 'Cm', 'Em', 'Am', 'Gm', 'Bm'], modes: [null, null, 'dorian'], moods: ['dark', 'epic'],
    voicing: 'close', chordRange: [53, 74], bassRange: [28, 40],
    lead: ['stringsection', 'stringsection', 'depthchoir'], lead2: ['depthchoir', 'stringsection', 'piano'], counter: 'stringsection', chords: ['fifthorgan'], bass: ['bowedoctaves'], pad: ['choirpad', 'strings'], arp: ['magmaarp'], texture: ['lavaflow'], kit: 'magma',
    forms: [
      [['врата', 8, 'intro', 1], ['лавовый поток', 16, 'theme', 2], ['глубины', 8, 'themeB', 2], ['пепельный хор', 8, 'bridge', 1], ['раскол', 4, 'build', 2], ['ядро', 16, 'final', 3], ['остывание', 8, 'outro', 1]],
      [['врата', 8, 'intro', 1], ['глубины', 8, 'theme', 2], ['лавовый поток', 16, 'themeB', 2], ['пепельный хор', 8, 'bridge', 1], ['струны', 8, 'solo', 2], ['раскол', 4, 'build', 2], ['ядро', 16, 'final', 3], ['остывание', 8, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
    // the user's own plugins with their settings from «Magma depths» (src/vst.js; presets imported by tools/als.mjs presets);
    // gain: their levels against each other (measured with render.js)
    vst: {
      stringsection: { plugin: 'DSK Strings', preset: 'Magma depths — 3-DSK Strings', octaves: [0, -12], gain: 4.5 },
      depthchoir: { plugin: 'DSK ChoirZ', preset: 'Magma depths — 4-DSK ChoirZ', octaves: [0, -12], gain: 3 },
      choirpad: { plugin: 'DSK ChoirZ', preset: 'Magma depths — 5-DSK ChoirZ', gain: 0.75 },
      piano: { plugin: 'DSK Virtuoso', preset: 'Magma depths — 2-DSK Virtuoso' },
      fifthorgan: { plugin: 'Church Organ', preset: 'Magma depths — 1-Church Organ', gain: 1.3 },
      bowedoctaves: { plugin: 'DSK Strings', preset: 'Magma depths — 6-DSK Strings', gain: 1.7 },
      strings: { plugin: 'DSK Strings', preset: 'Magma depths — 6-DSK Strings', gain: 1 },
      magmaarp: { plugin: 'DSK World StringZ', preset: 'Magma depths — 8-DSK World StringZ', gain: 1 },
    },
  },
  // The North (in the spirit of a Skyrim score): men chanting the theme in octaves, horns, spiccato strings in 3 + 3 + 2,
  // low strings, a kantele's rolling figure, war drums (a great drum in 3 + 3 + 2, frame drums, a field snare), the
  // mountain wind; Aeolian, Dorian or plain minor, no leading tone where the theme doesn't ask for one
  nordic: {
    label: 'Северные горы', emoji: '🏔️', theme: 'snow', bpm: [76, 92], swing: 0.5, stage: true,
    gains: { lead2: 0.6, pad: 1.4, arp: 2, counter: 1.8 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 },
    themes: { 'nord-dovah': 4, 'nord-steps': 4, 'nord-frostfall': 4, 'epic-banners': 1, 'celtic-air': 0.6 },
    keys: ['Dm', 'Em', 'Am', 'Bm', 'Gm', 'Cm', 'F#m'], modes: [null, 'dorian', 'aeolian'], moods: ['epic', 'dark'],
    voicing: 'close', chordRange: [50, 72], bassRange: [28, 40],
    lead: ['malechoir', 'horn'], lead2: ['flute', 'violin', 'whistle'], counter: 'horn', chords: ['ostinato'], bass: ['lowstrings'], pad: ['strings', 'choirpad'], arp: ['kantele'], texture: ['wind'], kit: 'nord',
    forms: [
      [['the throat of the world', 4, 'intro', 0], ['the road north', 8, 'themeB', 1], ['dragonborn', 16, 'theme', 2], ['frost', 8, 'bridge', 1], ['the march', 4, 'build', 2], ['sovngarde', 16, 'final', 3], ['the summit', 8, 'outro', 0]],
      [['the throat of the world', 4, 'intro', 0], ['dragonborn', 8, 'theme', 2], ['the road north', 8, 'themeB', 2], ['frost', 8, 'bridge', 1], ['the march', 4, 'build', 2], ['sovngarde', 16, 'final', 3, { canon: true }], ['the summit', 8, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: [[0, 'R', 3.9]], arpStep: 0.5, arpPoly: false,
  },
  // Artifact Temple: the Chozo halls in slendro — the same machines (an industrial kit, tremolo strings or dark saws, a
  // sequenced bass, a waterphone) with bronze over them: the bonang's interlocking, a saron, the great gong closing every
  // gongan; the song in slendro (Kunst's measured one now and then), its melodies often in ⅛ or ¼ tones
  artifact: {
    label: 'Artifact Temple', emoji: '🗿', theme: 'java', bpm: [96, 112], swing: 0.5, stage: true, variant: 'cave',
    gains: { pad: 1.4, counter: 2, arp: 1.25, bass: 0.7 }, // levels against the other tracks (the mix is balanced by render.js's table)
    variety: { 'as written': 2, ornamented: 2, recomposed: 3 },
    themes: { 'artifact-relic': 5, 'prime-chozo': 3, 'prime-phazon': 3, 'prime-frozen': 3 },
    keys: ['C#m', 'Ebm', 'Dm', 'Em', 'F#m', 'Bm', 'Am'], modes: ['slendro', 'slendro', 'slendroKunst', 'slendro'], micros: [null, 'eighth', 'quarter', 'eighth'], moods: ['dark', 'space', 'game'],
    voicing: 'close', chordRange: [52, 74], bassRange: [28, 40],
    lead: ['synthlead', 'bells', 'choir'], lead2: ['saron', 'celesta', 'pluck'], counter: 'pluck', chords: ['tremolo', 'pumpsaw'], bass: ['seqbass'], pad: ['choirpad', 'strings'], arp: ['bonang', 'pluckarp'], texture: ['temple'], kit: 'prime',
    forms: [
      [['the gate', 8, 'intro', 0], ['the relic', 8, 'themeB', 2], ['artifact', 16, 'theme', 2], ['the sanctum', 8, 'bridge', 1], ['the trial', 4, 'build', 2], ['ascension', 16, 'final', 3], ['the seal', 8, 'outro', 0]],
      [['the gate', 4, 'intro', 0], ['artifact', 8, 'theme', 2], ['the sanctum', 8, 'bridge', 1], ['the relic', 8, 'themeB', 2], ['the scan', 8, 'solo', 2], ['the trial', 4, 'build', 2], ['ascension', 16, 'final', 3], ['the seal', 4, 'outro', 0]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // ZUNpet — Touhou's Windows era: ZUN's trumpet on long, driving minor melodies (royal-road and ♭VI–♭VII–i turns, key
  // changes up), the piano in octaves and rolling sixteenths, strings, a picked bass in octaves with a half step into each
  // root, a Sound Canvas kit with a crash on every phrase; the stage theme on piano or violin, the spell card on the trumpet
  zunpet: {
    label: 'ZUNpet', emoji: '🎺', theme: 'ink', bpm: [148, 176], swing: 0.5, stage: true,
    gains: { lead2: 1.1, counter: 1.6, chords: 0.8, pad: 1.4, arp: 1, bass: 0.6 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'zun-shrine': 5, 'zun-moonlit': 5 },
    keys: ['F#m', 'Em', 'Bm', 'Dm', 'Am', 'C#m', 'Gm', 'Cm'], moods: ['game', 'epic', 'dark'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 43],
    lead: ['zunpet'], lead2: ['piano', 'violin', 'flute'], counter: 'violin', chords: ['zunpiano'], bass: ['zunbass'], pad: ['strings', 'choirpad'], arp: ['bells', 'piano'], texture: [null], kit: 'zun',
    forms: [
      [['prelude', 4, 'intro', 1], ['stage', 8, 'themeB', 2], ['spell card', 16, 'theme', 3], ['interlude', 8, 'bridge', 2], ['last word', 8, 'solo', 3], ['spell card II', 16, 'final', 3, { keyUp: 2 }], ['loop', 4, 'outro', 1]],
      [['prelude', 4, 'intro', 1], ['spell card', 8, 'theme', 2], ['stage', 8, 'themeB', 2], ['boss appears', 8, 'bridge', 2], ['danmaku', 4, 'build', 2], ['final spell', 16, 'final', 3, { keyUp: 1 }], ['loop', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // OldZUN — the PC-98 years of Touhou (the first five games): the YM2608 — FM brass, an FM organ-reed lead, FM bells and
  // electric piano, the FM slap bass in driving eighths, the SSG squares (an arpeggio, the melody's echo a dotted eighth
  // later) and the chip's own rhythm samples; repetitive, sequenced minor melodies straight on the grid
  oldzun: {
    label: 'OldZUN (PC-98)', emoji: '💾', theme: 'chip', bpm: [128, 156], swing: 0.5, stage: true,
    gains: { lead2: 1.1, counter: 1.3, arp: 1.9, bass: 0.35 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'pc98-lotus': 5, 'pc98-maple': 5, 'chip-boss': 0.4 },
    keys: ['Ebm', 'Em', 'Dm', 'Am', 'Cm', 'Gm', 'F#m', 'Bm'], moods: ['game', 'dark', 'epic'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 43],
    lead: ['fmbrass', 'fmlead'], lead2: ['fmbell', 'fmlead', 'ssg'], counter: 'ssg', chords: ['fmepiano'], bass: ['fmbass'], pad: [null], arp: ['ssgarp'], texture: [null], kit: 'opna',
    forms: [
      [['title', 4, 'intro', 1], ['stage', 8, 'themeB', 2], ['boss', 16, 'theme', 3], ['interlude', 8, 'bridge', 1], ['extra', 8, 'solo', 3], ['boss II', 16, 'final', 3, { keyUp: 2 }], ['ending', 4, 'outro', 1]],
      [['title', 4, 'intro', 1], ['boss', 8, 'theme', 2], ['stage', 8, 'themeB', 2], ['interlude', 8, 'bridge', 1], ['phantasm', 8, 'solo', 3], ['boss II', 16, 'final', 3], ['ending', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 3.8]], 1: [[0, 0.55, 1.5], [2, 0.45, 1.5]], 2: [[0, 0.6, 0.7], [0.75, 0.5, 0.6], [1.5, 0.55, 1], [3, 0.5, 0.4], [3.5, 0.5, 0.4]], 3: [[0, 0.65, 0.4], [0.5, 0.5, 0.4], [1, 0.55, 0.4], [1.5, 0.5, 0.4], [2, 0.6, 0.4], [2.5, 0.5, 0.4], [3, 0.55, 0.4], [3.5, 0.5, 0.4]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Test your fight — the stage music of fighting games (Mortal Kombat's techno, Tekken's breakbeats): rhythm first and a
  // quiet glassy motif lost in the echoes — no singing melody; an acid or Reese bass, minor-seventh stabs in syncopation,
  // an ambient pad, a pluck arpeggio, a breakbeat over the club kick, an impact on every round, a riser into the last one
  fight: {
    label: 'Test your fight', emoji: '🥊', theme: 'arena', bpm: [128, 146], swing: 0.5, variant: 'danger',
    gains: { lead: 0.8, lead2: 0.8, counter: 1.1, pad: 1.6, bass: 0.82, arp: 1.1, chords: 1.25 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'fight-arena': 5, 'fight-kombat': 5, 'factory-breach': 0.5 },
    keys: ['Dm', 'Em', 'Cm', 'Am', 'F#m', 'Gm', 'Bm', 'C#m'], modes: [null, 'phrygian', null, 'dorian'], moods: ['dark', 'game', 'epic'],
    voicing: 'close', chordRange: [52, 72], bassRange: [28, 40],
    lead: ['glass', 'pluck'], lead2: ['synthlead', 'bells'], counter: 'glass', chords: ['stabs'], bass: ['acid', 'reese'], pad: ['ambipad', 'choirpad'], arp: ['pluckarp'], texture: ['arena'], kit: 'fight',
    club: { pump: 0.3, kick: { 1: 'x-------x-------', 2: 'x-----x---x-----', 3: 'x---x---x---x---' }, sound: { punch: 5, decay: 0.28, click: 0.4, drive: 2.4 } },
    forms: [
      [['select your fighter', 4, 'intro', 1], ['round 1', 8, 'themeB', 2], ['fight!', 16, 'theme', 3], ['the stage', 8, 'bridge', 1], ['round 2', 8, 'solo', 2], ['build', 4, 'build', 2], ['final round', 16, 'final', 3], ['k.o.', 4, 'outro', 1]],
      [['select your fighter', 4, 'intro', 1], ['fight!', 8, 'theme', 3], ['round 2', 8, 'themeB', 2], ['the stage', 8, 'bridge', 1], ['build', 4, 'build', 2], ['final round', 16, 'final', 3, { keyUp: 1 }], ['k.o.', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.5, 0.5]], 1: [[0, 0.6, 0.3], [2.5, 0.5, 0.3]], 2: [[0, 0.7, 0.25], [0.75, 0.55, 0.25], [2.5, 0.6, 0.25]], 3: [[0, 0.8, 0.25], [0.75, 0.6, 0.25], [1.5, 0.7, 0.25], [2.5, 0.6, 0.25], [3.25, 0.55, 0.25]] },
    bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Кибербабушка: Russian folk on a hardbass floor — a babushka choir in the open "white" voice (or a balalaika in tremolo)
  // on Korobeiniki and tunes of our own in the natural minor (VII – i, no leading tone), the bayan's oom-pah, the gusli's
  // glissandi, a zhaleika; and the cyber side: the hard bass on the off-beats, a driven kick, everything pumping, a synth
  // doubling the tune in the last dance, shouts «эй!», «ух!», wooden spoons and a tambourine
  babushka: {
    label: 'Кибербабушка', emoji: '👵', theme: 'synth', bpm: [138, 150], swing: 0.5,
    gains: { lead: 1.8, lead2: 1.1, counter: 1.2, chords: 1.6, pad: 1.4, bass: 0.65, arp: 1.3, kick: 0.29 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'babushka-korobeiniki': 5, 'babushka-plyashi': 4, 'babushka-steppe': 4 },
    keys: ['Am', 'Dm', 'Em', 'Gm', 'Bm', 'Cm', 'F#m'], modes: [null, null, 'dorian'], moods: ['folk', 'epic'],
    voicing: 'close', chordRange: [55, 74], bassRange: [28, 40],
    lead: ['folkchoir', 'balalaika'], lead2: ['balalaika', 'zhaleika'], counter: 'synthlead', chords: ['bayan'], bass: ['hardbass'], pad: ['strings', 'choirpad'], arp: ['gusli'], texture: ['shouts'], kit: 'babushka',
    club: { pump: 0.5, kick: { 1: 'x---x---x---x---', 2: 'x---x---x---x---', 3: 'x---x---x---x---' }, sound: { punch: 7, decay: 0.24, click: 0.5, drive: 3.2 } },
    forms: [
      [['на лавочке', 4, 'intro', 0], ['запевка', 8, 'themeB', 2], ['разгон', 4, 'build', 2], ['пляска', 16, 'theme', 3], ['гусли', 8, 'bridge', 1], ['жалейка', 8, 'solo', 2], ['разгон II', 4, 'build', 2], ['кибер-пляска', 16, 'final', 3, { keyUp: 1 }], ['чай с вареньем', 4, 'outro', 1]],
      [['на лавочке', 4, 'intro', 0], ['пляска', 8, 'theme', 3], ['запевка', 8, 'themeB', 2], ['гусли', 8, 'bridge', 1], ['разгон', 4, 'build', 2], ['кибер-пляска', 16, 'final', 3, { keyUp: 2 }], ['чай с вареньем', 4, 'outro', 1]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  // «Подсказка» — the sound of Undertale and Deltarune: leitmotifs over a sampled 16-bit band — synth brass, a square
  // lead or a music box, piano chords or the NES's 60 Hz arpeggio, a slapped bass in 3 + 3 + 2, dry punchy drums with a
  // crash every four bars, strings; a battle riff in D minor or a field of small hopes in major
  podskazka: {
    label: 'Подсказка', emoji: '❤️', theme: 'chip', bpm: [112, 150], swing: 0.5, stage: true,
    gains: { lead: 1.8, lead2: 1.1, counter: 1.4, pad: 1.3, bass: 0.6, arp: 1.6 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'hint-determined': 5, 'hint-fields': 5, 'hint-home': 5, 'chip-cave': 0.4 },
    keys: ['Dm', 'D', 'F', 'Bb', 'Am', 'Gm', 'C', 'Em', 'G'], moods: ['game', 'bright', 'dark'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 45],
    lead: ['snesbrass', 'snesbrass', 'pulse', 'musicbox'], lead2: ['piano', 'musicbox', 'snesbrass'], counter: 'pulse12', chords: ['piano', 'chiparp'], bass: ['snesbass'], pad: ['strings'], arp: ['pulsearp', 'bells'], texture: [null], kit: 'snes',
    forms: [
      [['save point', 4, 'intro', 1], ['the ruins', 8, 'themeB', 2], ['battle', 16, 'theme', 3], ['a hint', 8, 'bridge', 1], ['mercy', 8, 'solo', 2], ['determination', 16, 'final', 3, { keyUp: 2 }], ['save file', 4, 'outro', 1]],
      [['save point', 4, 'intro', 1], ['battle', 8, 'theme', 3], ['the ruins', 8, 'themeB', 2], ['a hint', 8, 'bridge', 1], ['the barrier', 4, 'build', 2], ['determination', 16, 'final', 3], ['save file', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 1.8], [2, 0.45, 1.8]], 2: [[0, 0.55, 0.7], [0.75, 0.45, 0.7], [1.5, 0.5, 1], [3, 0.45, 0.9]], 3: [[0, 0.6, 0.7], [0.75, 0.5, 0.7], [1.5, 0.55, 0.9], [2.5, 0.5, 0.4], [3, 0.5, 0.4], [3.5, 0.5, 0.4]] },
    bassline: [[0, 'R', 0.6], [0.75, 'R', 0.4], [1.5, '8', 0.4], [2, 'R', 0.6], [2.75, 'R', 0.4], [3.5, '5', 0.4]], arpStep: 0.25, arpPoly: false,
  },
  // Hardstyle — the euphoric kind: a DJ intro on the kick and the reverse bass, the story told in a break (piano, strings),
  // a build-up with a snare roll and a riser, the climax (a supersaw lead over gated chords, everything pumping), an anti-
  // climax for the screech, an orchestral break, the final climax, a DJ outro
  hardstyle: {
    label: 'Хардстайл', emoji: '🔊', theme: 'phonk', bpm: [148, 154], swing: 0.5, hard: true, djKick: true, antiClimax: true,
    gains: { lead: 2.4, lead2: 3, counter: 4, chords: 4.5, bass: 2, arp: 2.5, kick: 0.5, rbass: 1 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'hs-euphoria': 5, 'hs-skyfire': 5, 'overclock-hook': 1 },
    keys: ['F#m', 'Am', 'Fm', 'Gm', 'Em', 'Bm', 'C#m', 'Dm'], moods: ['epic', 'dark'],
    voicing: 'close', chordRange: [55, 76], bassRange: [28, 40],
    lead: ['supersaw'], lead2: ['piano', 'pluck'], counter: 'pluck', chords: ['gatesaw'], bass: ['hssub'], pad: ['strings', 'choirpad'], arp: ['pluckarp'], texture: ['screech'], kit: 'hardkit',
    forms: [
      [['dj intro', 8, 'intro', 3], ['the story', 8, 'themeB', 1], ['build', 4, 'build', 2], ['climax', 16, 'theme', 3], ['anti-climax', 8, 'solo', 3], ['break', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['final climax', 16, 'final', 3], ['dj outro', 8, 'outro', 3]],
      [['dj intro', 8, 'intro', 3], ['the story', 8, 'themeB', 1], ['build', 4, 'build', 2], ['climax', 16, 'theme', 3], ['break', 8, 'bridge', 1], ['build II', 4, 'build', 2], ['anti-climax', 8, 'solo', 3], ['final climax', 16, 'final', 3], ['dj outro', 8, 'outro', 3]],
    ],
    drums: {}, comp: {}, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
  // Drift phonk: the 808 cowbell riff (two squares pitched to the notes, driven), a distorted 808 that slides, the clap on 3,
  // trap hats rolling, Memphis voices from an old tape, a steel pan or bells answering; dark keys, minor or phrygian
  phonk: {
    label: 'Дрифт-фонк', emoji: '🏎️', theme: 'phonk', bpm: [124, 138], swing: 0.5, stage: true, variant: 'cave',
    gains: { lead: 2.8, lead2: 1, counter: 0.7, chords: 1.4, pad: 1.5, bass: 0.32 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'phonk-drift': 5, 'phonk-memphis': 5 },
    keys: ['Am', 'Cm', 'Em', 'Fm', 'Gm', 'Dm', 'Bm', 'C#m'], modes: [null, 'phrygian', null], moods: ['dark'],
    voicing: 'close', chordRange: [52, 72], bassRange: [26, 38],
    lead: ['cowbell'], lead2: ['steelpan', 'bells'], counter: 'steelpan', chords: ['rhodes', 'pumpsaw'], bass: ['b808'], pad: ['choirpad', null], arp: [null], texture: ['memphis'], kit: 'trap',
    forms: [
      [['intro', 4, 'intro', 1], ['drift', 16, 'theme', 3], ['memphis', 8, 'themeB', 2], ['no brakes', 4, 'break', 0], ['drift II', 16, 'final', 3], ['steel', 8, 'bridge', 1], ['outro', 4, 'outro', 1]],
      [['intro', 4, 'intro', 1], ['memphis', 8, 'themeB', 2], ['drift', 16, 'theme', 3], ['steel', 8, 'bridge', 1], ['build', 4, 'build', 2], ['drift II', 16, 'final', 3], ['outro', 4, 'outro', 1]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 3.8]], 2: [[0, 0.55, 2], [2, 0.5, 2]], 3: [[0, 0.6, 1.5], [1.5, 0.5, 1], [2.5, 0.55, 1.5]] },
    bassline: 'octaves', arpStep: 0.5, arpPoly: false,
  },
  // Breakcore at 180–220 BPM: the Amen break chopped, re-sequenced, stuttered and rolled, gabber kicks in the chaos, a Reese
  // bass, a breakdown at half speed an octave down, glitches — and under all of it a slow, melancholy melody on a piano,
  // bells or a synth over minor-ninth chords and an ambient pad
  breakcore: {
    label: 'Брейккор', emoji: '💿', theme: 'dnb', bpm: [180, 220], swing: 0.5, stage: true,
    gains: { lead: 1.6, lead2: 1, counter: 0.75, pad: 1.5, arp: 0.9, bass: 0.53 }, // levels against the other tracks (the mix is balanced by render.js's table)
    themes: { 'bc-static': 5, 'bc-glassrain': 5, 'void-nebula': 0.8 },
    keys: ['Am', 'Dm', 'Em', 'F#m', 'C#m', 'Bm', 'Gm', 'Fm'], moods: ['dark', 'space'],
    voicing: 'close', chordRange: [52, 74], bassRange: [26, 38],
    lead: ['piano', 'bells', 'synthlead'], lead2: ['synthlead', 'celesta', 'pluck'], counter: 'bells', chords: ['pumpsaw', 'rhodes'], bass: ['reese'], pad: ['ambipad', 'strings'], arp: ['pluckarp'], texture: ['glitch'], kit: 'amen',
    forms: [
      [['static', 8, 'intro', 0], ['amen', 16, 'themeB', 3], ['tears', 16, 'theme', 3], ['drown', 16, 'bridge', 1], ['chaos', 16, 'solo', 3], ['build', 8, 'build', 2], ['glass rain', 32, 'final', 3], ['signal lost', 8, 'outro', 0]],
      [['static', 8, 'intro', 0], ['tears', 16, 'theme', 3], ['drown', 16, 'bridge', 1], ['amen', 16, 'themeB', 3], ['build', 8, 'build', 2], ['chaos', 16, 'solo', 3], ['glass rain', 32, 'final', 3], ['signal lost', 8, 'outro', 0]],
    ],
    drums: {},
    comp: { 0: [[0, 0.45, 3.8]], 1: [[0, 0.5, 3.8]], 2: [[0, 0.55, 2], [2, 0.5, 2]], 3: [[0, 0.6, 1.5], [1.5, 0.5, 1], [2.5, 0.55, 1.5]] }, bassline: 'octaves', arpStep: 0.25, arpPoly: false,
  },
}

// ---- families: the styles grouped, the most finished first; a new style joins one (test/generate.test.js checks it)
export const STYLE_FAMILIES = [
  { id: 'arena', label: 'Арена', emoji: '⚔️', about: 'боссы и битвы: хардстайл-бочка на тонике, сайдчейн, разгоны перед дропами; фоновая музыка файтингов', styles: ['boss', 'jbattle', 'fight'] },
  { id: 'game', label: 'Игровой', emoji: '🎮', about: 'музыка игр: конвейеры заводов в духе Mindustry и Factorio — город, пещеры, опасность; руины после катастрофы, залы чозо и их храм в слендро', styles: ['factory', 'factorycave', 'factorydanger', 'darkecho', 'prime', 'artifact', 'brinstar'] },
  { id: 'retro', label: 'Ретро-игры', emoji: '🕹️', about: 'Touhou: труба ZUN и FM-чип PC-98; звук Undertale и Deltarune; 8 бит', styles: ['zunpet', 'oldzun', 'podskazka', 'chiptune'] },
  { id: 'club', label: 'Неоновый танцпол', emoji: '⚡', about: 'EDM и хардстайл: бочка на каждую долю, сайдчейн, разгоны и дропы; синтвейв', styles: ['edm', 'hardstyle', 'synthwave'] },
  { id: 'underground', label: 'Андеграунд', emoji: '🌃', about: 'дрифт-фонк с коровьим колокольчиком 808, брейккор с аменом на 200 BPM, кибербабушки с хардбасом и баяном', styles: ['phonk', 'breakcore', 'babushka'] },
  { id: 'radio', label: 'Радиоволна', emoji: '📻', about: 'поп-хиты: нью-диско и фанк, аниме J-pop', styles: ['disco', 'kawaii'] },
  { id: 'cinema', label: 'Большой экран', emoji: '🎬', about: 'кино и трейлеры: остинато струнных, валторны, тайко, брааамы; тяжёлый метал-саундтрек, северные горы', styles: ['epic', 'ishope', 'nordic', 'magma'] },
  { id: 'hall', label: 'Концертный зал', emoji: '🏛️', about: 'классика: романтический оркестр, барокко, фуга по правилам контрапункта', styles: ['romantic', 'classical', 'fugue', 'organ'] },
  { id: 'night', label: 'После полуночи', emoji: '🌙', about: 'джаз и чилл: свинг, босса-нова, лоу-фай', styles: ['jazz', 'bossa', 'lofi'] },
  { id: 'cosmos', label: 'Невесомость', emoji: '🌌', about: 'эмбиент и космос: петли несоизмеримых длин, натуральный звукоряд', styles: ['ambient', 'space', 'nightstorm'] },
  { id: 'folk', label: 'Голоса Земли', emoji: '🌍', about: 'народная музыка в своих строях и ладах: Ирландия, макам, рага, гамелан', styles: ['celtic', 'maqam', 'raga', 'gamelan'] },
  { id: 'beyond', label: 'По ту сторону', emoji: '⚖️', about: 'рай и ад: хор ангелов, голос серафима и блики света из сна Blue Hour — и хор проклятых, треснувший колокол, сердце и огонь преисподней', styles: ['heaven', 'hell'] },
  { id: 'internet', label: 'Интернет-легенды', emoji: '🌐', about: 'музыка интернета: бразильские монтажемы и фонк с ковбеллом, ремикс системных звуков рабочего стола, кейген-музыка демосцены в соборе', styles: ['montagem', 'velora', 'xperror', 'keygen'] },
  { id: 'other', label: 'Разное', emoji: '🎈', about: 'всё остальное', styles: ['meow'] },
]
export const familyOf = id => STYLE_FAMILIES.find(f => f.styles.includes(id)) ?? STYLE_FAMILIES[STYLE_FAMILIES.length - 1]
// every style in the order of its family; each with its family's id
// (the same array all along: relist() fills it again when a style is added later — src/gen/define.js)
export const STYLE_LIST = []
export function relist() {
  STYLE_LIST.length = 0
  STYLE_LIST.push(...[...STYLE_FAMILIES.flatMap(f => f.styles), ...Object.keys(STYLES).filter(id => !STYLE_FAMILIES.some(f => f.styles.includes(id)))]
    .map(id => ({ id, label: STYLES[id].label, emoji: STYLES[id].emoji, family: familyOf(id).id, ...(STYLES[id].of ? { of: STYLES[id].of } : {}) })))
}
relist()
// the families with their styles (only those `keep` lets through; empty families left out) — for menus and <optgroup>s
export const styleGroups = (keep = () => true) => STYLE_FAMILIES.map(f => ({ ...f, list: STYLE_LIST.filter(s => s.family === f.id && keep(s)) })).filter(f => f.list.length)
