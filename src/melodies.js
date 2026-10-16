// The melody library of the generator: themes taken from the songs of this project, each with the
// harmony it was written over (Roman numerals, one chord per `per` beats), so a theme can move to any
// key — and, if `modal`, between major and minor — and still sit on its own chords.
//   notes: [beat, n, length], n = semitones from `base`; key = the original key.
//   feel: 'straight' | 'swing';  moods: what it suits;  modal: purely diatonic (may change mode);
//   only: the style (or list of styles) allowed to use it (absent = every style).
export const MELODIES = [
  {
    id: 'lofi-flute', from: 'lofi', title: 'флейта из lofi', key: 'F', base: 'F4', feel: 'swing', per: 4, modal: true,
    moods: ['calm', 'jazzy', 'warm'], chords: ['ii9', 'V13', 'Imaj9', 'vi9'],
    notes: [[0.5, 14, 1], [1.5, 12, 0.5], [2, 9, 1.5], [3.5, 7, 0.5], [4, 9, 0.75], [4.75, 7, 0.75], [5.5, 4, 2],
      [8.5, 12, 0.5], [9, 16, 1], [10, 14, 0.5], [10.5, 12, 1.5], [12.5, 9, 0.5], [13, 7, 1], [14, 4, 2]],
  },
  {
    id: 'lofi-flute-2', from: 'lofi', title: 'флейта II из lofi', key: 'F', base: 'F4', feel: 'swing', per: 4, modal: true,
    moods: ['calm', 'jazzy', 'warm'], chords: ['ii9', 'V13', 'Imaj9', 'vi9'],
    notes: [[0, 16, 0.5], [0.6, 14, 0.4], [1, 12, 0.5], [1.6, 14, 0.9], [2.5, 9, 1], [3.6, 7, 0.4], [4, 9, 1.5], [5.6, 11, 0.4],
      [6, 12, 0.6], [6.6, 14, 1.4], [8, 16, 1], [9, 19, 0.6], [9.6, 16, 0.4], [10, 14, 0.6], [10.6, 12, 1.4],
      [12, 9, 0.6], [12.6, 12, 0.4], [13, 14, 1], [14, 16, 0.6], [14.6, 12, 1.4]],
  },
  {
    id: 'bossa-theme', from: 'bossa', title: 'тема из bossa', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: false,
    moods: ['jazzy', 'warm', 'sunny'], chords: ['Imaj7', 'VI7', 'ii9', 'V13', 'iii7', 'VI7', 'ii7', 'V7'],
    notes: [[0, 7, 1.5], [1.5, 4, 0.5], [2, 4, 1.5], [3.5, 7, 1.5], [5, 4, 0.5], [5.5, 1, 2.5],
      [8, 2, 1.5], [9.5, 4, 0.5], [10, 5, 1], [11, 9, 1], [12, 9, 1.5], [13.5, 7, 0.5], [14, 4, 1.5],
      [15.5, 7, 2], [17.5, 11, 0.5], [18, 14, 2], [20, 13, 1], [21, 9, 1], [22, 7, 2],
      [24, 5, 1.5], [25.5, 4, 0.5], [26, 2, 1], [27, 0, 1], [28, -1, 1.5], [29.5, 2, 0.5], [30, 5, 2]],
  },
  {
    id: 'bossa-bridge', from: 'bossa', title: 'бридж из bossa', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: false,
    moods: ['jazzy', 'warm'], chords: ['IVmaj7', 'iv6', 'iii7', 'VI7', 'ii7', 'V7', 'Imaj7', 'V7'],
    notes: [[0, 9, 1.5], [1.5, 7, 0.5], [2, 4, 1], [3, 0, 1], [4, 8, 2], [6, 7, 1], [7, 5, 1],
      [8, 7, 1.5], [9.5, 4, 0.5], [10, 2, 2], [12, 1, 1], [13, 4, 1], [14, 7, 1], [15, 9, 1],
      [16, 9, 1.5], [17.5, 5, 0.5], [18, 2, 2], [20, 5, 1], [21, 2, 1], [22, -1, 1], [23, 2, 1],
      [24, 4, 3], [27, 2, 0.5], [27.5, 4, 0.5], [28, 5, 1.5], [29.5, 7, 0.5], [30, 11, 2]],
  },
  {
    id: 'void-orbit', from: 'voidchip', title: 'орбита из voidchip', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: true,
    moods: ['dark', 'epic', 'space'], chords: ['i', 'VI', 'iv', 'V'],
    notes: [[0, 0, 1], [1, 3, 0.5], [1.5, 7, 0.5], [2, 12, 1.5], [3.5, 10, 0.5], [4, 8, 1.5], [5.5, 7, 0.5], [6, 5, 1], [7, 3, 1],
      [8, 5, 1], [9, 7, 0.5], [9.5, 8, 0.5], [10, 10, 1], [11, 8, 1], [12, 7, 1], [13, 11, 0.5], [13.5, 12, 0.5], [14, 11, 1], [15, 7, 1]],
  },
  {
    id: 'void-nebula', from: 'voidchip', title: 'туманность из voidchip', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: true,
    moods: ['dark', 'epic', 'space'], chords: ['i', 'VII', 'VI', 'V'],
    notes: [[0, 12, 1], [1, 10, 0.5], [1.5, 8, 0.5], [2, 7, 2], [4, 14, 1], [5, 12, 0.5], [5.5, 10, 0.5], [6, 5, 2],
      [8, 15, 1], [9, 12, 0.5], [9.5, 10, 0.5], [10, 8, 2], [12, 7, 0.5], [12.5, 8, 0.5], [13, 11, 1], [14, 14, 1], [15, 11, 1]],
  },
  {
    id: 'chip-level', from: 'chiptune', title: 'уровень 1 из chiptune', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'game', 'sunny'], chords: ['I', 'vi', 'IV', 'V'],
    notes: [[0, 7, 0.5], [0.5, 12, 0.5], [1, 16, 0.5], [1.5, 12, 0.5], [2, 14, 0.5], [2.5, 16, 1], [3.5, 19, 0.5],
      [4, 16, 1], [5, 12, 0.5], [5.5, 9, 0.5], [6, 12, 1], [7, 11, 0.5], [7.5, 9, 0.5],
      [8, 9, 0.5], [8.5, 12, 0.5], [9, 17, 1], [10, 16, 0.5], [10.5, 14, 0.5], [11, 12, 1],
      [12, 11, 0.5], [12.5, 14, 0.5], [13, 19, 1.5], [14.5, 17, 0.5], [15, 14, 1]],
  },
  {
    id: 'chip-level-b', from: 'chiptune', title: 'уровень 1 B из chiptune', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'game'], chords: ['IV', 'V', 'iii', 'vi'],
    notes: [[0, 17, 0.75], [0.75, 16, 0.25], [1, 14, 0.5], [1.5, 12, 0.5], [2, 9, 1], [3, 12, 0.5], [3.5, 14, 0.5],
      [4, 14, 0.75], [4.75, 12, 0.25], [5, 11, 0.5], [5.5, 14, 0.5], [6, 19, 1.5], [7.5, 17, 0.5],
      [8, 16, 1], [9, 11, 0.5], [9.5, 12, 0.5], [10, 16, 1], [11, 19, 1],
      [12, 21, 1.5], [13.5, 19, 0.5], [14, 16, 0.5], [14.5, 12, 0.5], [15, 9, 1]],
  },
  {
    id: 'chip-cave', from: 'chiptune', title: 'пещера из chiptune', key: 'Am', base: 'C5', feel: 'straight', per: 4, modal: true,
    moods: ['dark', 'game', 'mystery'], chords: ['i', 'VI', 'iv', 'V'],
    notes: [[0, 9, 1.5], [2, 12, 0.5], [2.5, 11, 1.5], [4, 9, 2], [6, 5, 1], [7, 4, 1],
      [8, 2, 1.5], [10, 5, 0.5], [10.5, 9, 1.5], [12, 8, 2], [14, 11, 1], [15, 4, 1]],
  },
  {
    id: 'chip-boss', from: 'chiptune', title: 'босс из chiptune', key: 'Am', base: 'C5', feel: 'straight', per: 4, modal: true,
    moods: ['dark', 'epic', 'game'], chords: ['i', 'i', 'VI', 'V'],
    notes: [[0, 9, 0.5], [0.5, 9, 0.25], [0.75, 12, 0.25], [1, 16, 0.5], [1.5, 15, 0.5], [2, 16, 0.5], [2.5, 21, 1], [3.5, 20, 0.5],
      [4, 21, 0.5], [4.5, 19, 0.5], [5, 16, 0.5], [5.5, 12, 0.5], [6, 14, 0.5], [6.5, 16, 1], [7.5, 12, 0.5],
      [8, 17, 0.5], [8.5, 17, 0.25], [8.75, 16, 0.25], [9, 17, 0.5], [9.5, 21, 0.5], [10, 24, 1], [11, 21, 0.5], [11.5, 17, 0.5],
      [12, 20, 1], [13, 16, 0.5], [13.5, 20, 0.5], [14, 23, 1], [15, 20, 0.25], [15.25, 16, 0.25], [15.5, 8, 0.5]],
  },
  {
    id: 'kawaii-hook', from: 'kawaii', title: 'хук из kawaii', key: 'A', base: 'A4', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'pop', 'sunny'], chords: ['IVmaj7', 'Vadd9', 'iii7', 'vi7'],
    notes: [[0, 9, 0.5], [0.5, 7, 0.5], [1, 9, 0.5], [1.5, 12, 1], [2.5, 9, 0.5], [3, 7, 1],
      [4, 4, 0.5], [4.5, 7, 0.5], [5, 11, 1], [6, 9, 0.5], [6.5, 7, 0.5], [7, 11, 1],
      [8, 11, 0.5], [8.5, 12, 0.5], [9, 16, 1.5], [10.5, 14, 0.5], [11, 12, 0.5], [11.5, 11, 0.5],
      [12, 9, 1.5], [13.5, 12, 0.5], [14, 16, 0.5], [14.5, 14, 0.5], [15, 12, 1]],
  },
  {
    id: 'meow-verse', from: 'meow', title: 'куплет из meow', key: 'F', base: 'F5', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'pop', 'cute'], chords: ['I', 'vi', 'IV', 'V'],
    notes: [[0, 0, 0.75], [1, 4, 0.75], [2, 7, 1.5], [4, 9, 0.5], [4.5, 7, 0.5], [5, 4, 1.5], [7, 2, 0.5],
      [8, 5, 0.75], [9, 4, 0.75], [10, 2, 0.75], [11, 0, 0.75], [12, 2, 0.5], [12.5, 4, 0.5], [13, 7, 2]],
  },
  {
    id: 'meow-chorus', from: 'meow', title: 'припев из meow', key: 'F', base: 'F5', feel: 'straight', per: 4, modal: true,
    moods: ['bright', 'pop', 'cute'], chords: ['I', 'vi', 'IV', 'V'],
    notes: [[0, 9, 1.5], [2, 7, 0.5], [2.5, 4, 0.5], [3, 7, 0.75], [4, 9, 1], [5, 7, 0.5], [5.5, 4, 0.5], [6, 0, 1.5],
      [8, 5, 0.5], [8.5, 7, 0.5], [9, 9, 0.5], [9.5, 12, 1.25], [11, 9, 0.75], [12, 7, 0.5], [12.5, 9, 0.5], [13, 11, 0.5], [13.5, 12, 1.5]],
  },
  {
    id: 'canon', from: 'classical', title: 'канон из classical', key: 'D', base: 'D4', feel: 'straight', per: 2, modal: true,
    moods: ['classical', 'warm', 'epic'], chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    notes: [[0, 12, 1], [1, 16, 1], [2, 19, 1], [3, 17, 1], [4, 16, 1], [5, 12, 1], [6, 16, 1], [7, 14, 1],
      [8, 12, 1], [9, 9, 1], [10, 12, 1], [11, 19, 1], [12, 17, 1], [13, 21, 1], [14, 19, 1], [15, 17, 1]],
  },
  {
    id: 'canon-halves', from: 'classical', title: 'канон, половинные', key: 'D', base: 'D4', feel: 'straight', per: 2, modal: true,
    moods: ['classical', 'calm', 'space'], chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    notes: [[0, 16, 2], [2, 14, 2], [4, 12, 2], [6, 11, 2], [8, 9, 2], [10, 7, 2], [12, 9, 2], [14, 11, 2]],
  },
  {
    id: 'synthwave-lead', from: 'synthwave', title: 'лид из synthwave', key: 'Em', base: 'E4', feel: 'straight', per: 8, modal: true,
    moods: ['epic', 'night', 'dark'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 7, 1.5], [1.5, 5, 0.5], [2, 3, 1], [3, 2, 1], [4, 0, 2], [6, 3, 1], [7, 7, 1],
      [8, 8, 1.5], [9.5, 7, 0.5], [10, 3, 2], [12, 0, 2], [14, 3, 1], [15, 8, 1],
      [16, 10, 1.5], [17.5, 8, 0.5], [18, 7, 2], [20, 3, 2], [22, 7, 1], [23, 10, 1],
      [24, 14, 2], [26, 12, 1], [27, 10, 1], [28, 5, 2], [30, 10, 1], [31, 2, 1]],
  },
  {
    id: 'template-flute', from: 'шаблон', title: 'мелодия шаблона', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true,
    moods: ['calm', 'warm', 'night'], chords: ['i7', 'VImaj7', 'IIImaj7', 'VII6'],
    notes: [[0, 7, 1], [1, 3, 0.5], [1.5, 2, 0.5], [2, 0, 2], [4, 0, 0.5], [4.5, 3, 0.5], [5, 7, 1], [6, 8, 2],
      [8, 7, 1.5], [9.5, 5, 0.5], [10, 3, 1], [11, 2, 1], [12, 3, 1], [13, 2, 1], [14, -2, 2]],
  },
  // ---- boss music (`only: 'boss'` — other styles never draw these, so their seeds keep their songs) ----
  {
    id: 'overclock-hook', from: 'overclock', title: 'хук из overclock', key: 'F#m', base: 'F#5', feel: 'straight', per: 4, modal: true, only: 'boss',
    moods: ['epic', 'game', 'dark'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 7, 0.75], [0.75, 3, 0.75], [1.5, 0, 0.5], [2, 3, 0.5], [2.5, 7, 0.5], [3, 12, 0.75], [3.75, 10, 0.25],
      [4, 8, 0.75], [4.75, 7, 0.75], [5.5, 3, 0.5], [6, 8, 0.5], [6.5, 12, 0.5], [7, 15, 0.75], [7.75, 12, 0.25],
      [8, 10, 0.75], [8.75, 7, 0.75], [9.5, 3, 0.5], [10, 7, 0.5], [10.5, 10, 0.5], [11, 15, 1],
      [12, 14, 0.75], [12.75, 10, 0.75], [13.5, 5, 0.5], [14, 2, 1], [15, -2, 0.5], [15.5, 2, 0.5]],
  },
  {
    id: 'finalbattle-theme', from: 'finalbattle', title: 'тема из finalbattle', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false, only: 'boss',
    moods: ['epic', 'game', 'dark'], chords: ['i', 'VI', 'iv', 'V'],
    notes: [[0, 0, 0.25], [0.25, 0, 0.25], [0.5, 12, 0.5], [1, 7, 0.5], [1.5, 5, 0.25], [1.75, 3, 0.25], [2, 7, 0.5], [2.5, 10, 0.5], [3, 12, 0.75], [3.75, 10, 0.25],
      [4, 8, 0.25], [4.25, 8, 0.25], [4.5, 15, 0.5], [5, 12, 0.5], [5.5, 10, 0.25], [5.75, 8, 0.25], [6, 7, 0.5], [6.5, 8, 0.5], [7, 3, 0.75], [7.75, 5, 0.25],
      [8, 5, 0.25], [8.25, 5, 0.25], [8.5, 17, 0.5], [9, 12, 0.5], [9.5, 10, 0.25], [9.75, 8, 0.25], [10, 12, 0.5], [10.5, 15, 0.5], [11, 17, 1],
      [12, 14, 0.5], [12.5, 11, 0.5], [13, 7, 0.5], [13.5, 11, 0.5], [14, 14, 0.25], [14.25, 15, 0.25], [14.5, 14, 0.25], [14.75, 11, 0.25], [15, 7, 0.5], [15.5, -1, 0.5]],
  },
  // Восхождение: the 3-3-2 arpeggio climbs a step higher every bar (A–C, then C, D, E on top), the peak
  // held over the dominant, an E7 run down to the leading tone G♯ that falls into the next A
  {
    id: 'boss-ascent', from: 'boss', title: 'босс: восхождение', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'boss',
    moods: ['epic', 'game', 'bright'], chords: ['i', 'VI', 'VII', 'V'],
    notes: [[0, 0, 0.75], [0.75, 7, 0.75], [1.5, 12, 0.5], [2, 15, 0.5], [2.5, 14, 0.5], [3, 12, 0.5], [3.5, 7, 0.5],
      [4, 0, 0.75], [4.75, 8, 0.75], [5.5, 12, 0.5], [6, 15, 0.5], [6.5, 12, 0.5], [7, 8, 0.5], [7.5, 3, 0.5],
      [8, 2, 0.75], [8.75, 10, 0.75], [9.5, 14, 0.5], [10, 17, 0.75], [10.75, 19, 0.25], [11, 17, 0.5], [11.5, 14, 0.5],
      [12, 19, 1.5], [13.5, 17, 0.5], [14, 14, 0.5], [14.5, 11, 0.5], [15, 7, 0.5], [15.5, -1, 0.5]],
  },
  // Реквием: a singing dotted line over the Neapolitan (i – ♭II – iv – V): it rises to E, sinks through B♭
  // and D, anticipates the iv on the last eighth of ♭II, and turns Phrygian (E–F–E) before G♯ – B – G♯ → A
  {
    id: 'boss-requiem', from: 'boss', title: 'босс: реквием', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'boss',
    moods: ['dark', 'epic'], chords: ['i', 'bII', 'iv', 'V'],
    notes: [[0, 12, 1.5], [1.5, 15, 0.5], [2, 19, 1], [3, 17, 0.5], [3.5, 15, 0.5],
      [4, 17, 1.5], [5.5, 13, 0.5], [6, 8, 1], [7, 13, 0.5], [7.5, 12, 0.5],
      [8, 8, 1.5], [9.5, 5, 0.5], [10, 12, 1], [11, 10, 0.5], [11.5, 8, 0.5],
      [12, 7, 0.5], [12.5, 8, 0.25], [12.75, 7, 0.25], [13, 11, 1], [14, 14, 1.5], [15.5, 11, 0.5]],
  },
  // Перегрузка: a sixteenth riff over the Andalusian cadence (i – VII – VI – V), the same figure a step lower
  // each bar — a hammered root, a leap to the fifth, a run down the chord — and a turn up to G♯ at the end
  {
    id: 'boss-overdrive', from: 'boss', title: 'босс: перегрузка', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'boss',
    moods: ['dark', 'game', 'epic'], chords: ['i', 'VII', 'VI', 'V'],
    notes: [[0, 12, 0.25], [0.25, 12, 0.25], [0.5, 19, 0.5], [1, 17, 0.25], [1.25, 15, 0.25], [1.5, 12, 0.5], [2, 15, 0.75], [2.75, 14, 0.25], [3, 12, 0.5], [3.5, 7, 0.5],
      [4, 10, 0.25], [4.25, 10, 0.25], [4.5, 17, 0.5], [5, 15, 0.25], [5.25, 14, 0.25], [5.5, 10, 0.5], [6, 14, 0.75], [6.75, 12, 0.25], [7, 10, 0.5], [7.5, 5, 0.5],
      [8, 8, 0.25], [8.25, 8, 0.25], [8.5, 15, 0.5], [9, 14, 0.25], [9.25, 12, 0.25], [9.5, 8, 0.5], [10, 12, 0.75], [10.75, 10, 0.25], [11, 8, 0.5], [11.5, 3, 0.5],
      [12, 7, 0.25], [12.25, 7, 0.25], [12.5, 14, 0.5], [13, 12, 0.25], [13.25, 11, 0.25], [13.5, 7, 0.5], [14, 11, 0.5], [14.5, 12, 0.25], [14.75, 14, 0.25], [15, 15, 0.25], [15.25, 14, 0.25], [15.5, 11, 0.5]],
  },
  // ---- the classics (public domain), for the orchestral styles: the themes as the composers wrote them, harmonised
  // with chord tones on the strong beats; and two themes of our own in the manner of Tchaikovsky and Chopin ----
  // Beethoven, Symphony No. 9, "Ode to Joy": the half cadence on E over A, the full one on D
  {
    id: 'beethoven-joy', from: 'Бетховен', title: 'Бетховен: Ода к радости', key: 'D', base: 'D4', feel: 'straight', per: 2, modal: true, only: ['classical', 'romantic'],
    moods: ['classical', 'bright', 'epic'], chords: ['I', 'IV', 'V7', 'I', 'I', 'V', 'I', 'V', 'I', 'IV', 'V7', 'I', 'I', 'V', 'V', 'I'],
    notes: [[0, 4, 1], [1, 4, 1], [2, 5, 1], [3, 7, 1], [4, 7, 1], [5, 5, 1], [6, 4, 1], [7, 2, 1], [8, 0, 1], [9, 0, 1], [10, 2, 1], [11, 4, 1], [12, 4, 1.5], [13.5, 2, 0.5], [14, 2, 2],
      [16, 4, 1], [17, 4, 1], [18, 5, 1], [19, 7, 1], [20, 7, 1], [21, 5, 1], [22, 4, 1], [23, 2, 1], [24, 0, 1], [25, 0, 1], [26, 2, 1], [27, 4, 1], [28, 2, 1.5], [29.5, 0, 0.5], [30, 0, 2]],
  },
  // Mozart, Eine kleine Nachtmusik: the rocket up the G major triad, answered on D7
  {
    id: 'mozart-nachtmusik', from: 'Моцарт', title: 'Моцарт: Маленькая ночная серенада', key: 'G', base: 'G4', feel: 'straight', per: 4, modal: true, only: ['classical', 'romantic'],
    moods: ['classical', 'bright', 'sunny'], chords: ['I', 'I', 'V7', 'V7'],
    notes: [[0, 0, 1], [1.5, -5, 0.5], [2, 0, 1], [3.5, -5, 0.5], [4, 0, 0.5], [4.5, -5, 0.5], [5, 0, 0.5], [5.5, 4, 0.5], [6, 7, 1],
      [8, 5, 1], [9.5, 2, 0.5], [10, 5, 1], [11.5, 2, 0.5], [12, 5, 0.5], [12.5, 2, 0.5], [13, -1, 0.5], [13.5, 2, 0.5], [14, -5, 1]],
  },
  // Mozart, Symphony No. 40 in G minor: E♭–D–D three times, then the same a step lower over ii° and V
  {
    id: 'mozart-40', from: 'Моцарт', title: 'Моцарт: Симфония № 40', key: 'Gm', base: 'G4', feel: 'straight', per: 4, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'warm'], chords: ['i', 'i', 'iv', 'iiø7', 'iiø7', 'V7', 'V7', 'i'],
    notes: [[0, 7, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 7, 1], [3, 8, 0.5], [3.5, 7, 0.5], [4, 7, 1], [5, 15, 1], [7, 15, 0.5], [7.5, 14, 0.5],
      [8, 12, 1], [9, 12, 0.5], [9.5, 10, 0.5], [10, 8, 1], [11, 8, 0.5], [11.5, 7, 0.5], [12, 5, 1], [13, 5, 1], [15, 7, 0.5], [15.5, 5, 0.5],
      [16, 5, 1], [17, 7, 0.5], [17.5, 5, 0.5], [18, 5, 1], [19, 7, 0.5], [19.5, 5, 0.5], [20, 5, 1], [21, 14, 1], [23, 14, 0.5], [23.5, 12, 0.5],
      [24, 11, 1], [25, 11, 0.5], [25.5, 8, 0.5], [26, 7, 1], [27, 7, 0.5], [27.5, 5, 0.5], [28, 3, 1], [29, 3, 1], [31, 8, 0.5], [31.5, 7, 0.5]],
  },
  // Beethoven, Symphony No. 5: "fate knocks" — three eighths and a long note, the motif sinking G–F–E♭–D–C–B to C
  {
    id: 'beethoven-fate', from: 'Бетховен', title: 'Бетховен: Пятая симфония', key: 'Cm', base: 'C5', feel: 'straight', per: 4, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'epic'], chords: ['i', 'V7', 'i', 'i', 'V7', 'V7', 'V', 'i'],
    notes: [[0.5, -5, 0.5], [1, -5, 0.5], [1.5, -5, 0.5], [2, -9, 2], [4.5, -7, 0.5], [5, -7, 0.5], [5.5, -7, 0.5], [6, -10, 2],
      [8.5, -4, 0.5], [9, -4, 0.5], [9.5, -4, 0.5], [10, -5, 2], [12.5, 3, 0.5], [13, 3, 0.5], [13.5, 3, 0.5], [14, 0, 2],
      [16.5, -5, 0.5], [17, -5, 0.5], [17.5, -5, 0.5], [18, -7, 2], [20.5, -9, 0.5], [21, -9, 0.5], [21.5, -9, 0.5], [22, -10, 2],
      [24.5, 0, 0.5], [25, 0, 0.5], [25.5, 0, 0.5], [26, -1, 2], [28, 0, 4]],
  },
  // Bach, the "Little" Fugue in G minor (BWV 578): the subject, and its answer in the dominant ending on A major (V/V)
  {
    id: 'bach-fugue', from: 'Бах', title: 'Бах: Малая фуга соль минор', key: 'Gm', base: 'G4', feel: 'straight', per: 2, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'calm'], chords: ['i', 'i', 'i', 'V', 'v', 'v', 'v', 'V/V'],
    notes: [[0, 0, 1], [1, 7, 1], [2, 3, 1.5], [3.5, 2, 0.5], [4, 0, 0.5], [4.5, 3, 0.5], [5, 2, 0.5], [5.5, 0, 0.5], [6, -1, 0.5], [6.5, 2, 0.5], [7, -5, 1],
      [8, 7, 1], [9, 14, 1], [10, 10, 1.5], [11.5, 9, 0.5], [12, 7, 0.5], [12.5, 10, 0.5], [13, 9, 0.5], [13.5, 7, 0.5], [14, 6, 0.5], [14.5, 9, 0.5], [15, 2, 1]],
  },
  // Bach, Toccata in D minor (BWV 565): the mordent A–G–A and the run down to the leading tone, then an octave lower
  {
    id: 'bach-toccata', from: 'Бах', title: 'Бах: Токката ре минор', key: 'Dm', base: 'D5', feel: 'straight', per: 2, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'epic'], chords: ['i', 'i', 'V7', 'i', 'i', 'i', 'V7', 'i'],
    notes: [[0, 7, 0.25], [0.25, 5, 0.25], [0.5, 7, 3.5], [4, 5, 0.125], [4.125, 3, 0.125], [4.25, 2, 0.125], [4.375, 0, 0.125], [4.5, -1, 0.5], [5, 0, 3],
      [8, -5, 0.25], [8.25, -7, 0.25], [8.5, -5, 3.5], [12, -7, 0.125], [12.125, -9, 0.125], [12.25, -10, 0.125], [12.375, -12, 0.125], [12.5, -13, 0.5], [13, -12, 3]],
  },
  // Grieg, In the Hall of the Mountain King: the line creeping F♯ – E♯ – E♮ over V and the Neapolitan C major
  {
    id: 'grieg-mountain', from: 'Григ', title: 'Григ: В пещере горного короля', key: 'Bm', base: 'B4', feel: 'straight', per: 2, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'game'], chords: ['i', 'i', 'V', 'bII', 'i', 'i', 'III', 'III'],
    notes: [[0, 0, 0.5], [0.5, 2, 0.5], [1, 3, 0.5], [1.5, 5, 0.5], [2, 7, 0.5], [2.5, 3, 0.5], [3, 7, 1], [4, 6, 0.5], [4.5, 2, 0.5], [5, 6, 1], [6, 5, 0.5], [6.5, 1, 0.5], [7, 5, 1],
      [8, 0, 0.5], [8.5, 2, 0.5], [9, 3, 0.5], [9.5, 5, 0.5], [10, 7, 0.5], [10.5, 3, 0.5], [11, 7, 0.5], [11.5, 12, 0.5], [12, 10, 0.5], [12.5, 7, 0.5], [13, 3, 0.5], [13.5, 7, 0.5], [14, 10, 2]],
  },
  // Dvořák, Symphony "From the New World", Largo: the cor anglais' pentatonic song
  {
    id: 'dvorak-largo', from: 'Дворжак', title: 'Дворжак: Ларго «Из Нового света»', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true, only: ['classical', 'romantic'],
    moods: ['classical', 'calm', 'warm'], chords: ['I', 'I', 'V', 'V', 'I', 'I', 'V', 'I'],
    notes: [[0, 4, 1.5], [1.5, 7, 0.5], [2, 7, 2], [4, 4, 1.5], [5.5, 2, 0.5], [6, 0, 2], [8, 2, 1], [9, 4, 1], [10, 7, 1], [11, 4, 1], [12, 2, 4],
      [16, 4, 1.5], [17.5, 7, 0.5], [18, 7, 2], [20, 4, 1.5], [21.5, 2, 0.5], [22, 0, 2], [24, 2, 1], [25, 4, 1], [26, 2, 1.5], [27.5, 0, 0.5], [28, 0, 4]],
  },
  // in the manner of Tchaikovsky: a falling sigh from the fifth, a climb to the high D over VI, ø7 – V7 – i
  {
    id: 'romance-tchaikovsky', from: 'в духе Чайковского', title: 'романс в духе Чайковского', key: 'Bm', base: 'B4', feel: 'straight', per: 4, modal: false, only: ['classical', 'romantic'],
    moods: ['classical', 'dark', 'warm'], chords: ['i', 'iv', 'VII', 'III', 'VI', 'iiø7', 'V7', 'i'],
    notes: [[0, 7, 1.5], [1.5, 5, 0.5], [2, 3, 1], [3, 0, 1], [4, 12, 2], [6, 8, 1], [7, 5, 1], [8, 10, 1.5], [9.5, 8, 0.5], [10, 5, 1], [11, 2, 1], [12, 7, 3], [15, 10, 1],
      [16, 15, 1.5], [17.5, 14, 0.5], [18, 12, 1], [19, 8, 1], [20, 8, 2], [22, 5, 1], [23, 8, 0.5], [23.5, 7, 0.5], [24, 5, 1.5], [25.5, 2, 0.5], [26, -1, 1], [27, 2, 1], [28, 0, 4]],
  },
  // in the manner of Chopin: a nocturne's cantilena with turns around the long notes
  {
    id: 'nocturne-chopin', from: 'в духе Шопена', title: 'ноктюрн в духе Шопена', key: 'Eb', base: 'Eb5', feel: 'straight', per: 4, modal: true, only: ['classical', 'romantic'],
    moods: ['classical', 'calm', 'warm'], chords: ['I', 'vi', 'ii7', 'V7', 'I', 'IV', 'V7', 'I'],
    notes: [[0, 4, 1.5], [1.5, 2, 0.25], [1.75, 4, 0.25], [2, 7, 2], [4, 9, 1.5], [5.5, 7, 0.5], [6, 4, 1], [7, 0, 1], [8, 5, 1.5], [9.5, 4, 0.5], [10, 2, 1.5], [11.5, 4, 0.5],
      [12, 5, 1], [13, 4, 0.5], [13.5, 2, 0.5], [14, -1, 1], [15, 2, 1], [16, 12, 1.5], [17.5, 11, 0.25], [17.75, 12, 0.25], [18, 7, 2], [20, 9, 1.5], [21.5, 7, 0.5], [22, 5, 1], [23, 12, 1],
      [24, 11, 1], [25, 14, 0.5], [25.5, 12, 0.5], [26, 5, 1], [27, 2, 1], [28, 0, 4]],
  },
  // ---- Japanese battle themes (`only: 'jbattle'`), from songs/raiden, kagekiri, oni-matsuri, shogun-requiem ----
  // Raiden: the miyako-bushi colour (the Phrygian F, F major as ♭II) and the dominant B7 with its D♯
  {
    id: 'raiden-theme', from: 'raiden', title: 'тема из raiden', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'game', 'dark'], chords: ['i', 'VI', 'VII', 'i', 'iv', 'bII', 'V7', 'i'],
    notes: [[0, -5, 0.75], [0.75, 0, 0.75], [1.5, 1, 0.5], [2, 7, 1.5], [3.5, 5, 0.5], [4, 8, 0.75], [4.75, 7, 0.75], [5.5, 5, 0.5], [6, 3, 1], [7, 0, 0.5],
      [7.5, 1, 0.5], [8, 5, 0.75], [8.75, 3, 0.75], [9.5, -2, 0.5], [10, 5, 1], [11, 7, 0.5], [11.5, 8, 0.5], [12, 7, 1.5], [13.5, 5, 0.25], [13.75, 3, 0.25],
      [14, 0, 2], [16, 5, 0.75], [16.75, 8, 0.75], [17.5, 10, 0.5], [18, 12, 0.75], [18.75, 10, 0.25], [19, 8, 0.5], [19.5, 7, 0.5], [20, 8, 0.75], [20.75, 5, 0.75],
      [21.5, 1, 0.5], [22, 5, 1], [23, 8, 0.5], [23.5, 7, 0.5], [24, 7, 0.5], [24.5, 8, 0.25], [24.75, 7, 0.25], [25, 5, 0.5], [25.5, 2, 0.5], [26, -1, 1],
      [27, 2, 0.5], [27.5, 5, 0.5], [28, 7, 0.5], [28.5, 3, 0.5], [29, 2, 0.5], [29.5, -1, 0.5], [30, 0, 2]],
  },
  {
    id: 'raiden-eternity', from: 'raiden', title: 'вечность из raiden', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'calm', 'dark'], chords: ['iv', 'i', 'bII', 'i', 'iv', 'VII', 'V7', 'i'],
    notes: [[0, 5, 2], [2, 8, 1], [3, 7, 1], [4, 7, 3], [7, 3, 1], [8, 5, 2], [10, 8, 1.5], [11.5, 7, 0.5], [12, 7, 2], [14, 0, 2],
      [16, 8, 2], [18, 12, 1], [19, 10, 1], [20, 10, 2], [22, 5, 1], [23, 2, 1], [24, 7, 2], [26, 5, 1], [27, 2, 1], [28, 3, 2], [30, 0, 2]],
  },
  // Kagekiri: the euphoric hardstyle theme over i – VI – III – VII
  {
    id: 'kagekiri-theme', from: 'kagekiri', title: 'тема из kagekiri', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'bright', 'game'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 7, 0.75], [0.75, 3, 0.75], [1.5, 0, 0.5], [2, 7, 0.5], [2.5, 5, 0.5], [3, 3, 0.5], [3.5, 2, 0.5], [4, 12, 0.75], [4.75, 8, 0.75], [5.5, 3, 0.5],
      [6, 12, 0.5], [6.5, 10, 0.5], [7, 8, 0.5], [7.5, 7, 0.5], [8, 10, 0.75], [8.75, 7, 0.75], [9.5, 3, 0.5], [10, 10, 0.5], [10.5, 8, 0.5], [11, 7, 0.5],
      [11.5, 5, 0.5], [12, 5, 1.5], [13.5, 7, 0.5], [14, 5, 1], [15, 2, 1], [16, 12, 0.75], [16.75, 7, 0.75], [17.5, 3, 0.5], [18, 12, 0.5], [18.5, 10, 0.5],
      [19, 7, 0.5], [19.5, 3, 0.5], [20, 15, 0.75], [20.75, 12, 0.75], [21.5, 8, 0.5], [22, 15, 0.5], [22.5, 12, 0.5], [23, 10, 0.5], [23.5, 8, 0.5], [24, 5, 0.75],
      [24.75, 8, 0.75], [25.5, 12, 0.5], [26, 8, 0.5], [26.5, 7, 0.5], [27, 5, 0.5], [27.5, 3, 0.5], [28, 7, 0.75], [28.75, 2, 0.75], [29.5, 7, 0.5], [30, 11, 1.5],
      [31.5, 14, 0.5]],
  },
  // Oni Matsuri: the oni's theme in B minor, over i – VI – VII – V7
  {
    id: 'oni-theme', from: 'oni-matsuri', title: 'тема они из oni-matsuri', key: 'Bm', base: 'B4', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'game', 'dark'], chords: ['i', 'VI', 'VII', 'V7'],
    notes: [[0, 0, 0.5], [0.5, 0, 0.25], [0.75, 2, 0.25], [1, 3, 0.5], [1.5, 7, 0.5], [2, 12, 1], [3, 10, 0.5], [3.5, 7, 0.5], [4, 8, 1], [5, 7, 0.5],
      [5.5, 5, 0.5], [6, 3, 1], [7, 0, 0.5], [7.5, 3, 0.5], [8, 5, 0.5], [8.5, 5, 0.25], [8.75, 7, 0.25], [9, 10, 0.5], [9.5, 14, 0.5], [10, 17, 1],
      [11, 15, 0.5], [11.5, 14, 0.5], [12, 14, 1], [13, 11, 0.5], [13.5, 7, 0.5], [14, 5, 1], [15, 11, 0.5], [15.5, 14, 0.5]],
  },
  // Shogun Requiem: the in-scale (C D♭ F G A♭) — the war camp's theme and the clash
  {
    id: 'shogun-theme', from: 'shogun-requiem', title: 'тема из shogun-requiem', key: 'Cm', base: 'C5', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'dark', 'calm'], chords: ['i', 'bII', 'i', 'V', 'iv', 'VI', 'bII', 'V'],
    notes: [[0, 0, 1.5], [1.5, 1, 0.5], [2, 3, 1], [3, 7, 1], [4, 8, 2], [6, 5, 1], [7, 3, 0.5], [7.5, 1, 0.5], [8, 0, 1], [9, 3, 1],
      [10, 7, 1.5], [11.5, 8, 0.5], [12, 7, 2], [14, 2, 1], [15, -1, 1], [16, 8, 1], [17, 7, 0.5], [17.5, 5, 0.5], [18, 12, 2], [20, 15, 1.5],
      [21.5, 12, 0.5], [22, 8, 2], [24, 5, 1], [25, 8, 1], [26, 13, 1.5], [27.5, 12, 0.5], [28, 14, 1], [29, 12, 0.5], [29.5, 11, 0.5], [30, 7, 2]],
  },
  {
    id: 'shogun-clash', from: 'shogun-requiem', title: 'битва из shogun-requiem', key: 'Cm', base: 'C5', feel: 'straight', per: 4, modal: false, only: 'jbattle',
    moods: ['epic', 'dark', 'game'], chords: ['i', 'bII', 'i', 'bII', 'iv', 'V', 'i', 'V'],
    notes: [[0, 0, 0.5], [0.5, 0, 0.5], [1, 7, 0.5], [1.5, 3, 0.5], [2, 12, 0.5], [2.5, 10, 0.5], [3, 7, 0.5], [3.5, 3, 0.5], [4, 13, 1], [5, 12, 0.5],
      [5.5, 8, 0.5], [6, 5, 1], [7, 8, 0.5], [7.5, 12, 0.5], [8, 12, 0.5], [8.5, 7, 0.5], [9, 3, 0.5], [9.5, 7, 0.5], [10, 12, 0.5], [10.5, 15, 0.5],
      [11, 13, 0.5], [11.5, 12, 0.5], [12, 8, 1.5], [13.5, 7, 0.5], [14, 5, 1], [15, 1, 1], [16, 5, 0.5], [16.5, 8, 0.5], [17, 12, 0.5], [17.5, 17, 0.5],
      [18, 12, 0.5], [18.5, 15, 0.5], [19, 8, 0.5], [19.5, 5, 0.5], [20, 7, 0.5], [20.5, 11, 0.5], [21, 14, 0.5], [21.5, 17, 0.5], [22, 14, 1], [23, 11, 0.5],
      [23.5, 7, 0.5], [24, 15, 1], [25, 14, 0.5], [25.5, 12, 0.5], [26, 7, 1], [27, 8, 0.5], [27.5, 5, 0.5], [28, 14, 0.5], [28.5, 11, 0.5], [29, 7, 0.5],
      [29.5, 2, 0.5], [30, 7, 1], [31, -1, 1]],
  },
]

// Progressions for sections without a borrowed theme (intro, bridge, breakdown, solo), per mood.
// Written for major; minor songs use the minor list.
export const PROGRESSIONS = {
  major: [
    ['I', 'V', 'vi', 'IV'], ['vi', 'IV', 'I', 'V'], ['I', 'vi', 'ii', 'V'], ['IV', 'V', 'iii', 'vi'],
    ['Imaj7', 'vi7', 'ii7', 'V7'], ['ii7', 'V7', 'Imaj7', 'vi7'], ['IVmaj7', 'iii7', 'ii7', 'Imaj7'], ['I', 'iii', 'IV', 'V'],
  ],
  minor: [
    ['i', 'VI', 'III', 'VII'], ['i', 'iv', 'VII', 'III'], ['i', 'VI', 'iv', 'V'], ['i', 'VII', 'VI', 'V'],
    ['iv', 'V', 'i', 'i'], ['VI', 'VII', 'i', 'i'], ['i7', 'iv7', 'VII7', 'IIImaj7'], ['iiø7', 'V7', 'i', 'VI'],
  ],
}
