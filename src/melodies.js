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
  // ---- jazz: three heads of our own in the manner of the standards (only the jazz style draws them). Guide tones — the
  // chords' thirds and sevenths — on the strong beats, eighths swung by the style.
  // "Blue Corner": the descending fifths of a ballad's A section (ii – V – I – IV – viiø – III7 – vi), in F
  {
    id: 'jazz-corner', from: 'jazz', title: 'Blue Corner (в духе стандартов)', key: 'F', base: 'F4', feel: 'swing', per: 4, modal: false, only: 'jazz',
    moods: ['jazzy', 'night', 'calm'], chords: ['ii7', 'V7', 'Imaj7', 'IVmaj7', 'viiø7', 'III7', 'vi7', 'vi7'],
    notes: [[0, 5, 1.5], [1.5, 4, 0.5], [2, 2, 1], [3, 5, 1], [4, 5, 1], [5, 4, 0.5], [5.5, 2, 0.5], [6, -1, 2],
      [8, 4, 2], [10, 7, 0.5], [10.5, 4, 0.5], [11, 0, 1], [12, 9, 3], [15, 7, 1], [16, 5, 1.5], [17.5, 4, 0.5], [18, 2, 1], [19, 9, 1],
      [20, 8, 1], [21, 9, 0.5], [21.5, 8, 0.5], [22, 2, 2], [24, 0, 1.5], [25.5, 2, 0.5], [26, 4, 1], [27, 7, 1], [28, 9, 3], [31, -3, 1]],
  },
  // "Rhythm Hill": a bebop line on I – vi – ii – V turnarounds, a chord every two beats, in B♭
  {
    id: 'jazz-rhythm', from: 'jazz', title: 'Rhythm Hill (бибоп)', key: 'Bb', base: 'C4', feel: 'swing', per: 2, modal: false, only: 'jazz',
    moods: ['jazzy', 'bright'], chords: ['Imaj7', 'vi7', 'ii7', 'V7', 'iii7', 'VI7', 'ii7', 'V7', 'Imaj7', 'I7', 'IVmaj7', 'iv7', 'iii7', 'VI7', 'ii7', 'V7'],
    notes: [[0, 14, 0.5], [0.5, 17, 0.5], [1, 21, 0.5], [1.5, 19, 0.5], [2, 17, 0.5], [2.5, 14, 0.5], [3, 10, 1],
      [4, 12, 0.5], [4.5, 15, 0.5], [5, 19, 0.5], [5.5, 17, 0.5], [6, 15, 0.5], [6.5, 14, 0.5], [7, 12, 0.5], [7.5, 9, 0.5],
      [8, 12, 1], [9, 9, 0.5], [9.5, 5, 0.5], [10, 11, 0.5], [10.5, 14, 0.5], [11, 17, 1],
      [12, 15, 1.5], [13.5, 14, 0.5], [14, 12, 0.5], [14.5, 9, 0.5], [15, 10, 1],
      [16, 14, 1], [17, 12, 0.5], [17.5, 10, 0.5], [18, 8, 1], [19, 7, 0.5], [19.5, 5, 0.5],
      [20, 7, 1], [21, 10, 1], [22, 6, 1], [23, 10, 0.5], [23.5, 13, 0.5],
      [24, 12, 1], [25, 9, 0.5], [25.5, 12, 0.5], [26, 11, 1], [27, 14, 1], [28, 10, 1.5], [29.5, 12, 0.5], [30, 9, 2]],
  },
  // "Night Train": the minor ii – V – i of the relative minor and back to the major, in E♭ (C minor inside)
  {
    id: 'jazz-night', from: 'jazz', title: 'Night Train (минорный ii–V)', key: 'Eb', base: 'C4', feel: 'swing', per: 4, modal: false, only: 'jazz',
    moods: ['jazzy', 'night', 'dark'], chords: ['viiø7', 'III7', 'vi7', 'vi7', 'ii7', 'V7', 'Imaj7', 'III7'],
    notes: [[0, 8, 1.5], [1.5, 7, 0.5], [2, 5, 1], [3, 2, 1], [4, -1, 1.5], [5.5, 2, 0.5], [6, 5, 1], [7, 8, 1],
      [8, 7, 2], [10, 3, 1], [11, 2, 0.5], [11.5, 3, 0.5], [12, 0, 3], [15, 7, 1],
      [16, 8, 1.5], [17.5, 7, 0.5], [18, 3, 1], [19, 5, 1], [20, 2, 1.5], [21.5, 0, 0.5], [22, -2, 1], [23, 2, 1],
      [24, 7, 2], [26, 10, 1], [27, 8, 0.5], [27.5, 7, 0.5], [28, 5, 1.5], [29.5, 3, 0.5], [30, 2, 1], [31, -1, 1]],
  },
  // ---- celtic: two tunes of our own in the manner of the Irish and Scottish tradition (only the celtic style draws them)
  // "The Hazel Road": a reel — running eighths, the chord tones on the beats (a jig when the style is in 6/8)
  {
    id: 'celtic-reel', from: 'celtic', title: 'The Hazel Road (рил)', key: 'D', base: 'D4', feel: 'straight', per: 4, modal: true, only: 'celtic',
    moods: ['folk', 'bright'], chords: ['I', 'IV', 'I', 'V', 'I', 'IV', 'V', 'I'],
    notes: [[0, 0, 0.5], [0.5, 4, 0.5], [1, 7, 0.5], [1.5, 4, 0.5], [2, 7, 0.5], [2.5, 9, 0.5], [3, 7, 0.5], [3.5, 4, 0.5],
      [4, 9, 0.5], [4.5, 12, 0.5], [5, 9, 0.5], [5.5, 7, 0.5], [6, 5, 0.5], [6.5, 7, 0.5], [7, 9, 0.5], [7.5, 11, 0.5],
      [8, 12, 1], [9, 7, 0.5], [9.5, 4, 0.5], [10, 7, 0.5], [10.5, 4, 0.5], [11, 2, 0.5], [11.5, 4, 0.5],
      [12, 2, 0.5], [12.5, 4, 0.5], [13, 7, 0.5], [13.5, 11, 0.5], [14, 14, 1], [15, 11, 0.5], [15.5, 9, 0.5],
      [16, 7, 0.5], [16.5, 4, 0.5], [17, 0, 0.5], [17.5, 4, 0.5], [18, 7, 0.5], [18.5, 9, 0.5], [19, 12, 0.5], [19.5, 9, 0.5],
      [20, 5, 0.5], [20.5, 9, 0.5], [21, 12, 0.5], [21.5, 14, 0.5], [22, 12, 0.5], [22.5, 9, 0.5], [23, 7, 0.5], [23.5, 5, 0.5],
      [24, 2, 0.5], [24.5, 4, 0.5], [25, 7, 0.5], [25.5, 11, 0.5], [26, 14, 0.5], [26.5, 12, 0.5], [27, 11, 0.5], [27.5, 9, 0.5],
      [28, 12, 0.5], [28.5, 7, 0.5], [29, 4, 0.5], [29.5, 2, 0.5], [30, 0, 2]],
  },
  // "Loch na Gealaich": a slow air — long notes leaning on the chord, a turn of the phrase at each cadence
  {
    id: 'celtic-air', from: 'celtic', title: 'Loch na Gealaich (медленный эйр)', key: 'G', base: 'G4', feel: 'straight', per: 4, modal: true, only: 'celtic',
    moods: ['folk', 'calm'], chords: ['I', 'IV', 'I', 'V', 'vi', 'IV', 'V', 'I'],
    notes: [[0, 0, 1.5], [1.5, 2, 0.5], [2, 4, 1], [3, 7, 1], [4, 9, 2], [6, 5, 1], [7, 4, 1], [8, 4, 2], [10, 0, 1], [11, -3, 1],
      [12, -1, 2], [14, 2, 2], [16, 4, 1.5], [17.5, 7, 0.5], [18, 9, 1], [19, 7, 1], [20, 9, 1], [21, 7, 1], [22, 5, 1], [23, 4, 1],
      [24, 2, 2], [26, -1, 1], [27, 2, 1], [28, 0, 4]],
  },
  // ---- our own themes for the new styles (each `only` its style, so the other styles' seeds keep their songs) ----
  // "Skyline": the festival hook — 3 + 3 + 2 eighths climbing through vi – IV – I – V, the top note on the "and"
  {
    id: 'edm-skyline', from: 'edm', title: 'Skyline (фестивальный хук)', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true, only: 'edm',
    moods: ['epic', 'bright', 'pop'], chords: ['vi', 'IV', 'I', 'V'],
    notes: [[0, -3, 0.75], [0.75, 0, 0.75], [1.5, 4, 1], [2.5, 2, 0.5], [3, 0, 0.5], [3.5, -3, 0.5],
      [4, -3, 0.75], [4.75, 0, 0.75], [5.5, 5, 1], [6.5, 4, 0.5], [7, 0, 1],
      [8, -5, 0.75], [8.75, 0, 0.75], [9.5, 4, 1], [10.5, 2, 0.5], [11, 0, 0.5], [11.5, 4, 0.5],
      [12, 2, 0.75], [12.75, -1, 0.75], [13.5, -5, 1.5], [15, -1, 0.5], [15.5, 2, 0.5]],
  },
  // "Afterglow": a long-breathed minor line over i – VII – VI – VII, sung by the supersaw
  {
    id: 'edm-afterglow', from: 'edm', title: 'Afterglow (минорный гимн)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true, only: 'edm',
    moods: ['epic', 'night', 'dark'], chords: ['i', 'VII', 'VI', 'VII'],
    notes: [[0, 12, 1.5], [1.5, 10, 0.5], [2, 7, 1], [3, 5, 0.5], [3.5, 7, 0.5],
      [4, 10, 1.5], [5.5, 7, 0.5], [6, 5, 1], [7, 2, 1],
      [8, 8, 2], [10, 3, 1], [11, 5, 0.5], [11.5, 7, 0.5],
      [12, 10, 1.5], [13.5, 12, 0.5], [14, 14, 2]],
  },
  // "Mirrorball": a disco line in syncopated sixteenths and octave leaps over i7 – iv7 – VII7 – IIImaj7
  {
    id: 'disco-mirrorball', from: 'disco', title: 'Mirrorball (диско-хук)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'disco',
    moods: ['pop', 'bright', 'night'], chords: ['i7', 'iv7', 'VII7', 'IIImaj7'],
    notes: [[0, 12, 0.5], [0.5, 12, 0.25], [0.75, 10, 0.5], [1.25, 7, 0.75], [2, 7, 0.5], [2.5, 10, 0.5], [3, 12, 0.75], [3.75, 15, 0.25],
      [4, 17, 0.75], [4.75, 15, 0.5], [5.25, 12, 0.75], [6, 8, 1], [7, 5, 0.5], [7.5, 7, 0.5],
      [8, 10, 0.5], [8.5, 10, 0.25], [8.75, 14, 0.5], [9.25, 17, 0.75], [10, 14, 1], [11, 12, 0.5], [11.5, 10, 0.5],
      [12, 7, 1.5], [13.5, 3, 0.5], [14, 7, 0.5], [14.5, 10, 0.5], [15, 14, 1]],
  },
  // "Roller Rink": I – vi – ii – V twice round, two chords a bar, each phrase starting on the chord's third or fifth
  {
    id: 'disco-rollerrink', from: 'disco', title: 'Roller Rink (мажорный грув)', key: 'F', base: 'F4', feel: 'straight', per: 2, modal: false, only: 'disco',
    moods: ['pop', 'sunny', 'bright'], chords: ['Imaj7', 'vi7', 'ii7', 'V7', 'iii7', 'vi7', 'ii7', 'V7'],
    notes: [[0, 4, 0.5], [0.5, 7, 0.5], [1, 11, 0.75], [1.75, 9, 0.25], [2, 7, 1], [3, 4, 0.5], [3.5, 0, 0.5],
      [4, 2, 0.5], [4.5, 5, 0.5], [5, 9, 0.75], [5.75, 7, 0.25], [6, 5, 1], [7, 4, 0.5], [7.5, 2, 0.5],
      [8, 4, 0.5], [8.5, 7, 0.5], [9, 11, 0.75], [9.75, 14, 0.25], [10, 12, 1], [11, 11, 0.5], [11.5, 9, 0.5],
      [12, 9, 1], [13, 7, 0.5], [13.5, 5, 0.5], [14, 4, 1.5], [15.5, 2, 0.5]],
  },
  // "Banners": the horns' heroic line over i – VI – III – VII, half notes on the chord tones, the run up between
  {
    id: 'epic-banners', from: 'epic', title: 'Banners (тема валторн)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: true, only: 'epic',
    moods: ['epic', 'dark'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 7, 1.5], [1.5, 5, 0.5], [2, 3, 1], [3, 7, 1],
      [4, 12, 2], [6, 8, 1.5], [7.5, 7, 0.5],
      [8, 10, 1.5], [9.5, 8, 0.5], [10, 7, 2],
      [12, 5, 1], [13, 7, 1], [14, 10, 1], [15, 14, 1]],
  },
  // "Last Stand": i – iv – VI – V in harmonic minor, climbing a sixth and falling onto the leading tone
  {
    id: 'epic-laststand', from: 'epic', title: 'Last Stand (последний бой)', key: 'Cm', base: 'C4', feel: 'straight', per: 4, modal: false, only: 'epic',
    moods: ['epic', 'dark'], chords: ['i', 'iv', 'VI', 'V'],
    notes: [[0, 12, 1], [1, 15, 1], [2, 19, 1.5], [3.5, 17, 0.5],
      [4, 17, 2], [6, 20, 1], [7, 19, 0.5], [7.5, 17, 0.5],
      [8, 15, 1.5], [9.5, 12, 0.5], [10, 20, 2],
      [12, 19, 1], [13, 17, 0.5], [13.5, 15, 0.5], [14, 14, 1], [15, 11, 1]],
  },
  // "Conveyor Dawn": the town's riff — a broken chord turning like a belt (5–3–5–7–8), I – V – vi – IV
  {
    id: 'factory-dawn', from: 'factory', title: 'Conveyor Dawn (город)', key: 'D', base: 'D5', feel: 'straight', per: 4, modal: true, only: ['factory', 'factorycave', 'factorydanger'],
    moods: ['game', 'bright', 'epic'], chords: ['I', 'V', 'vi', 'IV'],
    notes: [[0, 7, 0.5], [0.5, 4, 0.25], [0.75, 7, 0.5], [1.25, 11, 0.25], [1.5, 12, 1], [2.5, 11, 0.5], [3, 9, 0.5], [3.5, 7, 0.5],
      [4, 11, 0.5], [4.5, 7, 0.25], [4.75, 11, 0.5], [5.25, 14, 0.25], [5.5, 16, 1], [6.5, 14, 0.5], [7, 11, 1],
      [8, 12, 0.5], [8.5, 9, 0.25], [8.75, 12, 0.5], [9.25, 16, 0.25], [9.5, 19, 1], [10.5, 16, 0.5], [11, 14, 0.5], [11.5, 12, 0.5],
      [12, 12, 0.75], [12.75, 9, 0.75], [13.5, 7, 1], [14.5, 5, 0.5], [15, 4, 0.5], [15.5, 2, 0.5]],
  },
  // "Deep Ore": the caves' line — long tones and a turn, i – VI – III – VII, a lot of air between
  {
    id: 'factory-deepore', from: 'factory', title: 'Deep Ore (пещеры)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: true, only: ['factory', 'factorycave', 'factorydanger'],
    moods: ['dark', 'space', 'game'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 7, 1.5], [1.5, 10, 0.5], [2, 12, 2],
      [4, 15, 1], [5, 14, 0.5], [5.5, 12, 0.5], [6, 8, 2],
      [8, 7, 1.5], [9.5, 5, 0.5], [10, 3, 2],
      [12, 5, 1], [13, 2, 1], [14, 10, 2]],
  },
  // "Core Breach": the alarm's riff — driving eighths round the tonic, i – VI – VII – i – iv – V in harmonic minor
  {
    id: 'factory-breach', from: 'factory', title: 'Core Breach (опасность)', key: 'Cm', base: 'C5', feel: 'straight', per: 2, modal: false, only: ['factory', 'factorycave', 'factorydanger'],
    moods: ['epic', 'dark', 'game'], chords: ['i', 'i', 'VI', 'VII', 'i', 'i', 'iv', 'V'],
    notes: [[0, 0, 0.5], [0.5, 3, 0.5], [1, 7, 0.5], [1.5, 3, 0.5], [2, 0, 0.5], [2.5, 3, 0.5], [3, 8, 0.5], [3.5, 7, 0.5],
      [4, 8, 0.5], [4.5, 7, 0.5], [5, 3, 0.5], [5.5, 0, 0.5], [6, 10, 0.5], [6.5, 7, 0.5], [7, 5, 0.5], [7.5, 2, 0.5],
      [8, 0, 0.5], [8.5, 3, 0.5], [9, 7, 0.5], [9.5, 12, 0.5], [10, 15, 1], [11, 12, 0.5], [11.5, 10, 0.5],
      [12, 8, 1], [13, 5, 0.5], [13.5, 8, 0.5], [14, 11, 1], [15, 7, 0.5], [15.5, 2, 0.5]],
  },

  // ---- Dark Echo: after the catastrophe, no bright themes — lines that sink, leading tones left hanging ----
  // "Ashen Road": falls from the fifth, i – VI – iv – V; the last bar stops on the leading tone, unresolved
  {
    id: 'echo-ashenroad', from: 'darkecho', title: 'Ashen Road (пепельная дорога)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false, only: 'darkecho',
    moods: ['dark'], chords: ['i', 'VI', 'iv', 'V'],
    notes: [[0, 7, 2], [2, 3, 1.5], [3.5, 2, 0.5], [4, 3, 1], [5, 0, 1], [6, -4, 2],
      [8, 5, 1], [9, 7, 0.5], [9.5, 8, 0.5], [10, 12, 1], [11, 8, 1], [12, 7, 1.5], [13.5, 2, 0.5], [14, -1, 2]],
  },
  // "Hollow Choir": the Phrygian ♭2 above the tonic chord, i – ♭II – iv – i; a sigh F → E at the end
  {
    id: 'echo-hollow', from: 'darkecho', title: 'Hollow Choir (пустой хор)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: false, only: 'darkecho',
    moods: ['dark'], chords: ['i', 'bII', 'iv', 'i'],
    notes: [[0, 0, 1.5], [1.5, 3, 0.5], [2, 7, 2], [4, 8, 1.5], [5.5, 7, 0.5], [6, 5, 2],
      [8, 8, 1], [9, 7, 0.5], [9.5, 5, 0.5], [10, 0, 2], [12, 3, 1], [13, 1, 1], [14, 0, 2]],
  },
  // "Cold Furnace": a lament over a falling bass, a chord every half bar — i v VI III iv i iiø7 V, a triplet turn
  {
    id: 'echo-furnace', from: 'darkecho', title: 'Cold Furnace (остывшая печь)', key: 'Cm', base: 'C4', feel: 'straight', per: 2, modal: false, only: 'darkecho',
    moods: ['dark'], chords: ['i', 'v', 'VI', 'III', 'iv', 'i', 'iiø7', 'V'],
    notes: [[0, 12, 1.5], [1.5, 10, 0.5], [2, 7, 2], [4, 8, 1.5], [5.5, 7, 0.5], [6, 3, 0.667], [6.667, 5, 0.333], [7, 7, 1],
      [8, 8, 1], [9, 5, 1], [10, 3, 1.5], [11.5, 2, 0.5], [12, 5, 1], [13, 2, 1], [14, -1, 2]],
  },

  // ---- Is there any hope?: heavy, slow, for the lead guitar and the choir over the riff ----
  // "Iron Rain": the ♭II pressing on the tonic, i – ♭II – VI – V; a half-step grind, F♯ – D♯ – B on the dominant
  {
    id: 'hope-ironrain', from: 'ishope', title: 'Iron Rain (железный дождь)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: false, only: 'ishope',
    moods: ['dark', 'epic'], chords: ['i', 'bII', 'VI', 'V'],
    notes: [[0, 7, 1.5], [1.5, 5, 0.5], [2, 3, 1], [3, 2, 0.5], [3.5, 0, 0.5], [4, 1, 2], [6, 5, 1], [7, 3, 0.5], [7.5, 1, 0.5],
      [8, 0, 1.5], [9.5, 3, 0.5], [10, 8, 2], [12, 14, 1], [13, 11, 1], [14, 7, 2]],
  },
  // "Last Watch": the Andalusian descent i – VII – VI – V, the line climbing against it
  {
    id: 'hope-lastwatch', from: 'ishope', title: 'Last Watch (последний дозор)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false, only: 'ishope',
    moods: ['dark', 'epic'], chords: ['i', 'VII', 'VI', 'V'],
    notes: [[0, 0, 1], [1, 3, 1], [2, 7, 1.5], [3.5, 8, 0.5], [4, 10, 2], [6, 5, 1], [7, 2, 1],
      [8, 3, 1.5], [9.5, 2, 0.5], [10, 0, 2], [12, -1, 1], [13, 2, 1], [14, 7, 2]],
  },
  // "No Dawn": i – iv – ♭II – V7, a neighbour note on the fifth, the Neapolitan's D♭ sung out
  {
    id: 'hope-nodawn', from: 'ishope', title: 'No Dawn (без рассвета)', key: 'Cm', base: 'C4', feel: 'straight', per: 4, modal: false, only: 'ishope',
    moods: ['dark', 'epic'], chords: ['i', 'iv', 'bII', 'V7'],
    notes: [[0, 7, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 3, 1.5], [3.5, 2, 0.5], [4, 0, 1.5], [5.5, 3, 0.5], [6, 5, 2],
      [8, 8, 1], [9, 5, 1], [10, 1, 2], [12, -1, 1], [13, 2, 1], [14, 5, 2]],
  },

  // ---- Chozo ruins (Metroid Prime × horror): wide leaps, a Dorian IV and the ♭VI turning against it ----
  // "Chozo Ruins": i – IV – VI – V, arpeggios leaping an octave; F♯ of the IV against the F of the VI
  {
    id: 'prime-chozo', from: 'prime', title: 'Chozo Ruins (руины чозо)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: ['prime', 'artifact'],
    moods: ['dark', 'space', 'game'], chords: ['i', 'IV', 'VI', 'V'],
    notes: [[0, 0, 0.5], [0.5, 7, 0.5], [1, 12, 1], [2, 7, 1], [3, 3, 1], [4, 9, 1.5], [5.5, 7, 0.5], [6, 5, 2],
      [8, 8, 1], [9, 12, 1], [10, 15, 1.5], [11.5, 14, 0.5], [12, 11, 1], [13, 7, 1], [14, 2, 2]],
  },
  // "Phazon": the tonic and the ♭II taking turns every half bar, then iv – V – i – V: the semitone that won't leave
  {
    id: 'prime-phazon', from: 'prime', title: 'Phazon (фазон)', key: 'Em', base: 'E4', feel: 'straight', per: 2, modal: false, only: ['prime', 'artifact'],
    moods: ['dark', 'game'], chords: ['i', 'bII', 'i', 'bII', 'iv', 'V', 'i', 'V'],
    notes: [[0, 0, 1], [1, 3, 1], [2, 5, 1], [3, 1, 1], [4, 0, 1], [5, 3, 1], [6, 8, 1], [7, 5, 1],
      [8, 8, 1.5], [9.5, 5, 0.5], [10, 11, 1], [11, 7, 1], [12, 7, 1], [13, 3, 1], [14, -1, 1], [15, 2, 1]],
  },
  // Montagem: our own riddles over the tamborzão — short hooks that circle, a chord tone on every strong beat
  {
    id: 'mont-riddle', from: 'montagem', title: 'The Riddle (загадка)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'montagem',
    moods: ['dark', 'game'], chords: ['i', 'i', 'VI', 'V'],
    notes: [[0, 7, 0.5], [0.5, 3, 0.5], [1, 0, 0.5], [1.5, 3, 0.5], [2, 7, 0.75], [2.75, 8, 0.25], [3, 7, 0.5], [3.5, 3, 0.5],
      [4, 12, 0.5], [4.5, 10, 0.5], [5, 7, 0.5], [5.5, 3, 0.5], [6, 0, 1], [7, 2, 1],
      [8, 8, 0.5], [8.5, 7, 0.5], [9, 3, 0.5], [9.5, 0, 0.5], [10, 3, 0.75], [10.75, 5, 0.25], [11, 3, 0.5], [11.5, 0, 0.5],
      [12, 11, 0.5], [12.5, 7, 0.5], [13, 2, 0.5], [13.5, -1, 0.5], [14, -5, 1], [15, -1, 1]],
  },
  {
    id: 'mont-shadow', from: 'montagem', title: 'Shadow Game (игра теней)', key: 'Dm', base: 'D4', feel: 'straight', per: 2, modal: false, only: 'montagem',
    moods: ['dark', 'game'], chords: ['i', 'bII', 'i', 'bII', 'VI', 'VII', 'i', 'V'],
    notes: [[0, 12, 0.75], [0.75, 10, 0.25], [1, 7, 0.5], [1.5, 8, 0.5], [2, 13, 0.75], [2.75, 12, 0.25], [3, 8, 0.5], [3.5, 5, 0.5],
      [4, 7, 1], [5, 3, 1], [6, 5, 0.75], [6.75, 3, 0.25], [7, 1, 1],
      [8, 10, 0.75], [8.75, 12, 0.25], [9, 15, 0.5], [9.5, 12, 0.5], [10, 14, 0.75], [10.75, 12, 0.25], [11, 10, 1],
      [12, 12, 0.5], [12.5, 7, 0.5], [13, 3, 0.5], [13.5, 7, 0.5], [14, 11, 1], [15, 7, 1]],
  },
  // VELORA: cowbell riffs of our own in sixteenths, syncopated, a chord tone on every strong beat
  {
    id: 'velora-rush', from: 'velora', title: 'Night Rush (ночной рывок)', key: 'F#m', base: 'F#4', feel: 'straight', per: 4, modal: false, only: 'velora',
    moods: ['dark'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 12, 0.5], [0.75, 10, 0.25], [1, 7, 0.5], [1.5, 7, 0.25], [1.75, 10, 0.25], [2, 12, 0.5], [2.5, 15, 0.5], [3, 14, 0.5], [3.5, 12, 0.5],
      [4, 15, 0.5], [4.75, 14, 0.25], [5, 12, 0.5], [5.5, 12, 0.25], [5.75, 14, 0.25], [6, 15, 0.5], [6.5, 8, 0.5], [7, 10, 0.5], [7.5, 12, 0.5],
      [8, 15, 0.5], [8.75, 14, 0.25], [9, 10, 0.5], [9.5, 10, 0.25], [9.75, 12, 0.25], [10, 15, 0.5], [10.5, 7, 0.5], [11, 10, 0.5], [11.5, 12, 0.5],
      [12, 14, 0.5], [12.75, 12, 0.25], [13, 10, 0.5], [13.5, 10, 0.25], [13.75, 12, 0.25], [14, 14, 0.75], [14.75, 12, 0.25], [15, 10, 1]],
  },
  {
    id: 'velora-drift', from: 'velora', title: 'Velvet Drift (бархатный дрифт)', key: 'Gm', base: 'G4', feel: 'straight', per: 2, modal: false, only: 'velora',
    moods: ['dark'], chords: ['i', 'iv', 'VI', 'V', 'i', 'iv', 'III', 'V'],
    notes: [[0, 7, 0.5], [0.5, 3, 0.25], [0.75, 5, 0.25], [1, 7, 0.5], [1.5, 10, 0.5], [2, 12, 0.5], [2.5, 8, 0.5], [3, 5, 0.5], [3.5, 8, 0.5],
      [4, 15, 0.5], [4.5, 12, 0.25], [4.75, 10, 0.25], [5, 8, 1], [6, 11, 0.5], [6.5, 7, 0.5], [7, 14, 1],
      [8, 15, 0.5], [8.5, 14, 0.5], [9, 10, 0.5], [9.5, 7, 0.5], [10, 8, 0.5], [10.5, 12, 0.5], [11, 15, 0.5], [11.5, 12, 0.5],
      [12, 10, 0.5], [12.5, 7, 0.5], [13, 3, 1], [14, 7, 1], [15, 11, 1]],
  },
  // Error XP: bright 2000s hooks of our own, made for a chime
  {
    id: 'xp-bliss', from: 'xperror', title: 'Green Hill Desktop (рабочий стол)', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true, only: 'xperror',
    moods: ['bright', 'pop'], chords: ['I', 'V', 'vi', 'IV'],
    notes: [[0, 12, 0.5], [0.5, 7, 0.5], [1, 4, 0.5], [1.5, 7, 0.5], [2, 12, 1], [3, 14, 1],
      [4, 11, 0.5], [4.5, 7, 0.5], [5, 2, 0.5], [5.5, 7, 0.5], [6, 14, 1], [7, 12, 1],
      [8, 9, 0.5], [8.5, 12, 0.5], [9, 16, 0.5], [9.5, 12, 0.5], [10, 9, 1], [11, 7, 1],
      [12, 5, 0.5], [12.5, 9, 0.5], [13, 12, 0.5], [13.5, 9, 0.5], [14, 5, 1.5], [15.5, 7, 0.5]],
  },
  {
    id: 'xp-startup', from: 'xperror', title: 'Startup Sky (небо загрузки)', key: 'F', base: 'F4', feel: 'straight', per: 4, modal: true, only: 'xperror',
    moods: ['bright', 'pop'], chords: ['IV', 'V', 'iii', 'vi'],
    notes: [[0, 12, 1], [1, 9, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 7, 1],
      [4, 11, 1.5], [5.5, 12, 0.5], [6, 14, 1], [7, 16, 1],
      [8, 16, 1], [9, 14, 0.5], [9.5, 12, 0.5], [10, 11, 1], [11, 7, 1],
      [12, 9, 1.5], [13.5, 7, 0.5], [14, 4, 1], [15, 0, 1]],
  },
  // KeyGen Church: arpeggiated tracker hooks and a requiem of our own
  {
    id: 'kg-cathedral', from: 'keygen', title: 'Pixel Cathedral (пиксельный собор)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'keygen',
    moods: ['dark', 'epic', 'game'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 0, 0.25], [0.25, 3, 0.25], [0.5, 7, 0.25], [0.75, 12, 0.25], [1, 7, 0.5], [1.5, 3, 0.5], [2, 7, 0.5], [2.5, 5, 0.25], [2.75, 3, 0.25], [3, 2, 0.5], [3.5, 3, 0.5],
      [4, -4, 0.25], [4.25, 0, 0.25], [4.5, 3, 0.25], [4.75, 8, 0.25], [5, 3, 0.5], [5.5, 0, 0.5], [6, 3, 0.5], [6.5, 5, 0.25], [6.75, 7, 0.25], [7, 8, 1],
      [8, 3, 0.25], [8.25, 7, 0.25], [8.5, 10, 0.25], [8.75, 15, 0.25], [9, 10, 0.5], [9.5, 7, 0.5], [10, 10, 0.5], [10.5, 8, 0.25], [10.75, 7, 0.25], [11, 5, 0.5], [11.5, 7, 0.5],
      [12, -2, 0.25], [12.25, 2, 0.25], [12.5, 5, 0.25], [12.75, 10, 0.25], [13, 9, 0.5], [13.5, 7, 0.5], [14, 5, 0.5], [14.5, 2, 0.5], [15, 2, 1]],
  },
  {
    id: 'kg-requiem', from: 'keygen', title: 'Silicon Requiem (кремниевый реквием)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'keygen',
    moods: ['dark', 'epic'], chords: ['i', 'iv', 'V', 'i'],
    notes: [[0, 12, 1], [1, 10, 0.5], [1.5, 7, 0.5], [2, 3, 1.5], [3.5, 2, 0.5],
      [4, 5, 0.5], [4.5, 8, 0.5], [5, 12, 0.5], [5.5, 15, 0.5], [6, 12, 1], [7, 10, 1],
      [8, 11, 1.5], [9.5, 12, 0.5], [10, 14, 1], [11, 11, 0.5], [11.5, 7, 0.5],
      [12, 12, 2], [14, 7, 1], [15, 3, 1]],
  },
  // Nightstorm: the intro's own melody (the user's: C5 – G4 – D5 – F4, long, over ii – vi – iii – I) and a storm line of
  // our own in its idiom (I – ♭VII – IV – I)
  {
    id: 'ns-calm', from: 'nightstorm', title: 'Before the Storm (перед бурей)', key: 'Bb', base: 'Bb4', feel: 'straight', per: 4, modal: false, only: 'nightstorm',
    moods: ['calm', 'epic'], chords: ['ii', 'vi', 'vi', 'vi', 'iii', 'I', 'I', 'I'],
    notes: [[0, 2, 6], [6, -3, 10], [16, 4, 6], [22, -5, 10]],
  },
  {
    id: 'ns-storm', from: 'nightstorm', title: 'Night Storm (ночная буря)', key: 'Bb', base: 'Bb4', feel: 'straight', per: 4, modal: false, only: 'nightstorm',
    moods: ['epic', 'dark'], chords: ['I', 'bVII', 'IV', 'I'],
    notes: [[0, 7, 1.5], [1.5, 5, 0.5], [2, 4, 1], [3, 2, 1], [4, 5, 1.5], [5.5, 2, 0.5], [6, -2, 2],
      [8, 9, 1], [9, 7, 0.5], [9.5, 5, 0.5], [10, 0, 1.5], [11.5, 2, 0.5], [12, 4, 1], [13, 2, 1], [14, 0, 2]],
  },
  // Brinstar Depths: our own slow minor themes in the idiom of a deep-jungle score — long notes with leaps, the chords
  // sinking under a held tone, a chord tone on every strong beat
  // "Deep Moss": i – VI – iv – V7, B and G falling to E over the sixth degree
  {
    id: 'brin-moss', from: 'brinstar', title: 'Deep Moss (глубокий мох)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: false, only: 'brinstar',
    moods: ['dark', 'space', 'game'], chords: ['i', 'VI', 'iv', 'V7'],
    notes: [[0, 7, 1.5], [1.5, 3, 0.5], [2, 0, 1], [3, -2, 1], [4, 3, 1], [5, 0, 1], [6, -4, 2],
      [8, 5, 2], [10, 8, 1], [11, 7, 1], [12, 11, 1.5], [13.5, 7, 0.5], [14, 2, 2]],
  },
  // "Spore Drift": the tonic and the Phrygian ♭II then the subtonic: Dm – E♭ – C – Dm
  {
    id: 'brin-spore', from: 'brinstar', title: 'Spore Drift (дрейф спор)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: false, only: 'brinstar',
    moods: ['dark', 'game'], chords: ['i', 'bII', 'VII', 'i'],
    notes: [[0, 7, 2], [2, 3, 1], [3, 5, 1], [4, 8, 1.5], [5.5, 5, 0.5], [6, 1, 2],
      [8, 5, 1], [9, 2, 1], [10, -2, 1.5], [11.5, 2, 0.5], [12, 3, 1], [13, 7, 1], [14, 0, 2]],
  },
  // "Lair Below": the Andalusian fall Am – G – F – E7, a call of E and C over A, answered lower
  {
    id: 'brin-lair', from: 'brinstar', title: 'Lair Below (логово внизу)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'brinstar',
    moods: ['dark', 'game'], chords: ['i', 'VII', 'VI', 'V7'],
    notes: [[0, 7, 1], [1, 3, 1], [2, 0, 1.5], [3.5, 3, 0.5], [4, 5, 2], [6, 2, 1], [7, 0, 1],
      [8, 3, 1.5], [9.5, 0, 0.5], [10, -4, 2], [12, 2, 1], [13, -1, 1], [14, -5, 2]],
  },
  // "Frozen Halls": quiet snow over a minor seventh chord, the Dorian IV, VImaj7 and V — falling arpeggios
  {
    id: 'prime-frozen', from: 'prime', title: 'Frozen Halls (ледяные залы)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: true, only: ['prime', 'artifact'],
    moods: ['dark', 'space'], chords: ['i7', 'IV', 'VImaj7', 'V'],
    notes: [[0, 10, 0.5], [0.5, 7, 0.5], [1, 3, 0.5], [1.5, 0, 0.5], [2, 7, 2], [4, 9, 1], [5, 7, 0.5], [5.5, 5, 0.5], [6, 12, 2],
      [8, 7, 1.5], [9.5, 8, 0.5], [10, 3, 2], [12, 2, 1], [13, -1, 1], [14, -5, 2]],
  },

  // ---- The North (in the spirit of the Skyrim score): chant in long notes, modal, a horn's leap ----
  // "Dovah": i – VI – III – VII, sung by men in octaves — the repeated tonic, the falling third
  {
    id: 'nord-dovah', from: 'nordic', title: 'Dovah (зов дракона)', key: 'Dm', base: 'D4', feel: 'straight', per: 4, modal: true, only: 'nordic',
    moods: ['epic', 'dark'], chords: ['i', 'VI', 'III', 'VII'],
    notes: [[0, 0, 1.5], [1.5, 0, 0.5], [2, 3, 1.5], [3.5, 2, 0.5], [4, 0, 1], [5, -4, 1], [6, 0, 2],
      [8, 3, 1.5], [9.5, 5, 0.5], [10, 7, 2], [12, 5, 1], [13, 3, 0.5], [13.5, 2, 0.5], [14, -2, 2]],
  },
  // "Seven Thousand Steps": Dorian — i – IV – i – VII, a folk turn, the raised sixth (C♯ in E) on the IV
  {
    id: 'nord-steps', from: 'nordic', title: 'Seven Thousand Steps (семь тысяч ступеней)', key: 'Em', base: 'E4', feel: 'straight', per: 4, modal: true, only: 'nordic',
    moods: ['epic', 'warm'], chords: ['i', 'IV', 'i', 'VII'],
    notes: [[0, 7, 0.75], [0.75, 5, 0.25], [1, 3, 1], [2, 0, 1.5], [3.5, 2, 0.5], [4, 0, 1], [5, 2, 0.5], [5.5, 5, 0.5], [6, 9, 2],
      [8, 7, 1.5], [9.5, 10, 0.5], [10, 12, 2], [12, 10, 1], [13, 7, 0.5], [13.5, 5, 0.5], [14, 2, 2]],
  },
  // "Frostfall": natural minor, the minor v — i – VI – iv – v, no leading tone anywhere
  {
    id: 'nord-frostfall', from: 'nordic', title: 'Frostfall (ледопад)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true, only: 'nordic',
    moods: ['epic', 'dark'], chords: ['i', 'VI', 'iv', 'v'],
    notes: [[0, 3, 1], [1, 0, 1], [2, 7, 1.5], [3.5, 5, 0.5], [4, 3, 1], [5, 8, 1], [6, 12, 2],
      [8, 8, 1], [9, 5, 1], [10, 0, 1.5], [11.5, 2, 0.5], [12, 7, 1], [13, 10, 1], [14, 2, 2]],
  },

  // ---- Artifact Temple: a minor pentatonic line, so slendro takes it note for note ----
  // "Relic Chamber": i – VII – VI – v twice, the tune only on A C D E G (slendro's five steps)
  {
    id: 'artifact-relic', from: 'artifact', title: 'Relic Chamber (зал реликвии)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true, only: 'artifact',
    moods: ['dark', 'space', 'game'], chords: ['i', 'VII', 'VI', 'v', 'i', 'VII', 'VI', 'v'],
    notes: [[0, 0, 1], [1, 3, 0.5], [1.5, 5, 0.5], [2, 7, 1.5], [3.5, 12, 0.5], [4, 10, 1], [5, 12, 0.5], [5.5, 10, 0.5], [6, 5, 2],
      [8, 3, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 12, 2], [12, 10, 2], [14, 7, 2],
      [16, 12, 0.5], [16.5, 15, 0.5], [17, 12, 0.5], [17.5, 10, 0.5], [18, 7, 1], [19, 5, 0.5], [19.5, 3, 0.5], [20, 5, 1], [21, 7, 0.5], [21.5, 12, 0.5], [22, 10, 1.5], [23.5, 12, 0.5],
      [24, 15, 1], [25, 12, 0.5], [25.5, 10, 0.5], [26, 12, 1], [27, 5, 1], [28, 10, 2], [30, 7, 2]],
  },

  // ---- ZUNpet (Touhou, the Windows era): long minor lines, the royal road VI – VII – v – i, syncopations ----
  // "Shrine of Endless Spring": VI – VII – v – i | iv – VII – III – V — eighths running over a ninth, the leading tone at the end
  {
    id: 'zun-shrine', from: 'zunpet', title: 'Shrine of Endless Spring (храм вечной весны)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'zunpet',
    moods: ['game', 'epic'], chords: ['VI', 'VII', 'v', 'i', 'iv', 'VII', 'III', 'V'],
    notes: [[0, 12, 0.75], [0.75, 10, 0.25], [1, 8, 0.5], [1.5, 7, 0.5], [2, 3, 0.5], [2.5, 5, 0.5], [3, 7, 0.5], [3.5, 8, 0.5],
      [4, 10, 1], [5, 12, 0.5], [5.5, 14, 0.5], [6, 17, 1.5], [7.5, 15, 0.5],
      [8, 14, 1], [9, 12, 0.5], [9.5, 10, 0.5], [10, 7, 1], [11, 10, 0.5], [11.5, 14, 0.5],
      [12, 12, 2], [14, 15, 0.5], [14.5, 14, 0.5], [15, 12, 0.5], [15.5, 15, 0.5],
      [16, 17, 0.75], [16.75, 15, 0.25], [17, 12, 0.5], [17.5, 10, 0.5], [18, 8, 1], [19, 5, 0.5], [19.5, 8, 0.5],
      [20, 10, 0.5], [20.5, 14, 0.5], [21, 17, 1], [22, 14, 1], [23, 12, 0.5], [23.5, 10, 0.5],
      [24, 7, 1.5], [25.5, 10, 0.5], [26, 15, 1], [27, 14, 0.5], [27.5, 12, 0.5], [28, 11, 1], [29, 12, 0.5], [29.5, 14, 0.5], [30, 14, 1], [31, 11, 1]],
  },
  // "Moonlit Mansion": i – VII – VI – V | iv – i – iiø7 – V7 in dotted eighths (3 + 3 + 2), the line climbing to the ninth of V
  {
    id: 'zun-moonlit', from: 'zunpet', title: 'Moonlit Mansion (лунный особняк)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'zunpet',
    moods: ['game', 'dark', 'epic'], chords: ['i', 'VII', 'VI', 'V', 'iv', 'i', 'iiø7', 'V7'],
    notes: [[0, 0, 0.75], [0.75, 3, 0.75], [1.5, 7, 0.5], [2, 12, 1], [3, 10, 0.5], [3.5, 12, 0.5],
      [4, 14, 0.75], [4.75, 12, 0.75], [5.5, 10, 0.5], [6, 5, 1], [7, 7, 1],
      [8, 8, 0.75], [8.75, 7, 0.75], [9.5, 5, 0.5], [10, 3, 1], [11, 5, 0.5], [11.5, 7, 0.5],
      [12, 11, 1.5], [13.5, 12, 0.5], [14, 14, 1], [15, 11, 0.5], [15.5, 12, 0.5],
      [16, 8, 0.75], [16.75, 7, 0.75], [17.5, 5, 0.5], [18, 12, 1], [19, 10, 0.5], [19.5, 8, 0.5],
      [20, 7, 1.5], [21.5, 5, 0.5], [22, 3, 1], [23, 0, 0.5], [23.5, 3, 0.5],
      [24, 5, 0.75], [24.75, 8, 0.75], [25.5, 12, 0.5], [26, 14, 1], [27, 12, 0.5], [27.5, 10, 0.5], [28, 11, 1], [29, 7, 1], [30, 2, 1], [31, -1, 1]],
  },

  // ---- OldZUN (Touhou on the PC-98): repetitive, sequenced eighths straight on the grid ----
  // "Lotus Bay": i – VI – VII – i | i – VI – iv – V, a figure up and down a fifth, then the same an octave up
  {
    id: 'pc98-lotus', from: 'oldzun', title: 'Lotus Bay (лотосовый залив)', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false, only: 'oldzun',
    moods: ['game', 'dark'], chords: ['i', 'VI', 'VII', 'i', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 0, 0.5], [0.5, 3, 0.5], [1, 7, 0.5], [1.5, 5, 0.5], [2, 3, 0.5], [2.5, 5, 0.5], [3, 7, 1],
      [4, 8, 0.5], [4.5, 7, 0.5], [5, 3, 0.5], [5.5, 0, 0.5], [6, 3, 0.5], [6.5, 5, 0.5], [7, 3, 0.5], [7.5, 0, 0.5],
      [8, 2, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 10, 1], [11, 7, 0.5], [11.5, 5, 0.5], [12, 7, 1.5], [13.5, 3, 0.5], [14, 0, 2],
      [16, 12, 0.5], [16.5, 10, 0.5], [17, 7, 0.5], [17.5, 10, 0.5], [18, 12, 0.5], [18.5, 14, 0.5], [19, 15, 0.5], [19.5, 17, 0.5],
      [20, 15, 0.5], [20.5, 14, 0.5], [21, 12, 0.5], [21.5, 10, 0.5], [22, 8, 1], [23, 7, 0.5], [23.5, 5, 0.5],
      [24, 8, 1], [25, 7, 0.5], [25.5, 5, 0.5], [26, 12, 0.5], [26.5, 10, 0.5], [27, 8, 0.5], [27.5, 10, 0.5], [28, 11, 1.5], [29.5, 9, 0.5], [30, 7, 2]],
  },
  // "Maple Mirage": i – v – VI – III | iv – i – VI – V, every note but the first tied across the beat (the FM brass's syncopation)
  {
    id: 'pc98-maple', from: 'oldzun', title: 'Maple Mirage (кленовый мираж)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'oldzun',
    moods: ['game', 'epic'], chords: ['i', 'v', 'VI', 'III', 'iv', 'i', 'VI', 'V'],
    notes: [[0, 7, 0.5], [0.5, 12, 1], [1.5, 10, 0.5], [2, 12, 0.5], [2.5, 15, 1], [3.5, 12, 0.5],
      [4, 14, 0.5], [4.5, 10, 1], [5.5, 7, 0.5], [6, 10, 1], [7, 7, 0.5], [7.5, 5, 0.5],
      [8, 3, 0.5], [8.5, 8, 1], [9.5, 7, 0.5], [10, 8, 0.5], [10.5, 12, 1], [11.5, 10, 0.5], [12, 10, 0.5], [12.5, 7, 1], [13.5, 3, 0.5], [14, 7, 2],
      [16, 5, 0.5], [16.5, 8, 1], [17.5, 12, 0.5], [18, 17, 1], [19, 15, 0.5], [19.5, 14, 0.5],
      [20, 12, 1], [21, 10, 0.5], [21.5, 7, 0.5], [22, 3, 1], [23, 7, 1],
      [24, 8, 0.5], [24.5, 12, 1], [25.5, 10, 0.5], [26, 12, 0.5], [26.5, 15, 1], [27.5, 14, 0.5], [28, 14, 1.5], [29.5, 12, 0.5], [30, 11, 2]],
  },

  // ---- Test your fight: motifs, not tunes — two-bar cells hammered in syncopation ----
  // "Arena Pulse": i – i – VI – VII | i – i – iv – V, a dotted figure on the tonic answered a step higher each time
  {
    id: 'fight-arena', from: 'fight', title: 'Arena Pulse (пульс арены)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'fight',
    moods: ['dark', 'game'], chords: ['i', 'i', 'VI', 'VII', 'i', 'i', 'iv', 'V'],
    notes: [[0, 0, 0.5], [0.75, 0, 0.25], [1.5, 3, 0.5], [2, 7, 0.5], [2.75, 5, 0.25], [3, 3, 0.5],
      [4, 0, 0.5], [4.75, 0, 0.25], [5.5, 3, 0.5], [6, 12, 1], [7, 10, 0.5],
      [8, 8, 0.5], [8.75, 8, 0.25], [9.5, 7, 0.5], [10, 3, 0.75], [10.75, 5, 0.25], [11, 7, 0.5],
      [12, 10, 0.5], [12.75, 10, 0.25], [13.5, 12, 0.5], [14, 14, 1], [15, 12, 0.5],
      [16, 0, 0.5], [16.75, 0, 0.25], [17.5, 3, 0.5], [18, 7, 0.5], [18.75, 8, 0.25], [19, 7, 0.5],
      [20, 3, 0.5], [20.75, 3, 0.25], [21.5, 5, 0.5], [22, 7, 1], [23, 5, 0.5],
      [24, 5, 0.5], [24.75, 5, 0.25], [25.5, 8, 0.5], [26, 12, 0.75], [26.75, 10, 0.25], [27, 8, 0.5],
      [28, 7, 0.5], [28.75, 7, 0.25], [29.5, 9, 0.5], [30, 11, 1], [31, 14, 1]],
  },
  // "Kombat Circuit": i – ♭II taking turns every half bar, then i – VII – VI – V — sixteenths on the tonic with the octave flicking
  {
    id: 'fight-kombat', from: 'fight', title: 'Kombat Circuit (боевая схема)', key: 'Em', base: 'E5', feel: 'straight', per: 2, modal: false, only: 'fight',
    moods: ['dark', 'game'], chords: ['i', 'bII', 'i', 'bII', 'i', 'VII', 'VI', 'V'],
    notes: [[0, 0, 0.25], [0.25, 0, 0.25], [0.5, 12, 0.25], [0.75, 0, 0.25], [1, 7, 0.5], [1.5, 3, 0.5],
      [2, 1, 0.25], [2.25, 1, 0.25], [2.5, 13, 0.25], [2.75, 1, 0.25], [3, 8, 0.5], [3.5, 5, 0.5],
      [4, 0, 0.25], [4.25, 0, 0.25], [4.5, 12, 0.25], [4.75, 0, 0.25], [5, 7, 0.5], [5.5, 10, 0.5], [6, 13, 0.5], [6.5, 12, 0.5], [7, 8, 0.5], [7.5, 5, 0.5],
      [8, 7, 0.5], [8.5, 3, 0.5], [9, 0, 0.5], [9.5, 3, 0.5], [10, 2, 0.5], [10.5, 5, 0.5], [11, 10, 1],
      [12, 8, 0.5], [12.5, 7, 0.5], [13, 3, 0.5], [13.5, 0, 0.5], [14, -1, 1], [15, 2, 0.5], [15.5, 7, 0.5]],
  },

  // ---- Кибербабушка: Russian folk tunes ----
  // "Korobeiniki" (a folk song, the 19th century; public domain): V7 – i – V7 – i | iv – III – V7 – i, as the old song goes
  {
    id: 'babushka-korobeiniki', from: 'folk', title: 'Коробейники (народная)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'babushka',
    moods: ['folk', 'game'], chords: ['V7', 'i', 'V7', 'i', 'iv', 'III', 'V7', 'i'],
    notes: [[0, 7, 1], [1, 2, 0.5], [1.5, 3, 0.5], [2, 5, 1], [3, 3, 0.5], [3.5, 2, 0.5],
      [4, 0, 1], [5, 0, 0.5], [5.5, 3, 0.5], [6, 7, 1], [7, 5, 0.5], [7.5, 3, 0.5],
      [8, 2, 1.5], [9.5, 3, 0.5], [10, 5, 1], [11, 7, 1], [12, 3, 1], [13, 0, 1], [14, 0, 2],
      [16.5, 5, 1], [17.5, 8, 0.5], [18, 12, 1], [19, 10, 0.5], [19.5, 8, 0.5],
      [20, 7, 1.5], [21.5, 3, 0.5], [22, 7, 1], [23, 5, 0.5], [23.5, 3, 0.5],
      [24, 2, 1], [25, 2, 0.5], [25.5, 3, 0.5], [26, 5, 1], [27, 7, 1], [28, 3, 1], [29, 0, 1], [30, 0, 2]],
  },
  // "Ekh, plyashi!" (of our own): a chastushka — natural minor, i – VII every half bar, repeated notes, no leading tone
  {
    id: 'babushka-plyashi', from: 'babushka', title: 'Эх, пляши! (частушка)', key: 'Am', base: 'A4', feel: 'straight', per: 2, modal: true, only: 'babushka',
    moods: ['folk'], chords: ['i', 'VII', 'i', 'VII', 'III', 'VII', 'i', 'i'],
    notes: [[0, 0, 0.5], [0.5, 0, 0.5], [1, 3, 0.5], [1.5, 5, 0.5], [2, 2, 0.5], [2.5, -2, 0.5], [3, 2, 0.5], [3.5, 3, 0.5],
      [4, 7, 0.5], [4.5, 7, 0.5], [5, 5, 0.5], [5.5, 3, 0.5], [6, 5, 1], [7, 2, 1],
      [8, 3, 0.5], [8.5, 3, 0.5], [9, 7, 0.5], [9.5, 10, 0.5], [10, 10, 0.5], [10.5, 7, 0.5], [11, 5, 0.5], [11.5, 3, 0.5],
      [12, 0, 0.5], [12.5, 2, 0.5], [13, 3, 0.5], [13.5, 2, 0.5], [14, 0, 2]],
  },
  // "Steppe and Cyber" (of our own): a broad tune in the natural minor, i – iv – VII – III | VI – iv – v – i
  {
    id: 'babushka-steppe', from: 'babushka', title: 'Степь да кибер', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: true, only: 'babushka',
    moods: ['folk', 'epic'], chords: ['i', 'iv', 'VII', 'III', 'VI', 'iv', 'v', 'i'],
    notes: [[0, 7, 1], [1, 5, 0.5], [1.5, 3, 0.5], [2, 0, 1], [3, 3, 0.5], [3.5, 2, 0.5],
      [4, 5, 1.5], [5.5, 3, 0.5], [6, 8, 1], [7, 7, 0.5], [7.5, 5, 0.5],
      [8, 10, 1], [9, 8, 0.5], [9.5, 7, 0.5], [10, 5, 1], [11, 2, 1], [12, 3, 2], [14, 7, 1], [15, 10, 1],
      [16, 12, 1.5], [17.5, 10, 0.5], [18, 8, 1], [19, 7, 0.5], [19.5, 10, 0.5],
      [20, 12, 1], [21, 10, 0.5], [21.5, 8, 0.5], [22, 5, 1], [23, 3, 0.5], [23.5, 5, 0.5],
      [24, 7, 1.5], [25.5, 5, 0.5], [26, 2, 1], [27, 3, 0.5], [27.5, 5, 0.5], [28, 3, 1], [29, 2, 0.5], [29.5, -2, 0.5], [30, 0, 2]],
  },

  // ---- «Подсказка» (the Undertale sound): a battle riff and a field theme ----
  // "Stubborn Riff": i – VII – VI – VII | i – VII – iv – V — the tonic twice, the octave, a fall by step in syncopation
  {
    id: 'hint-determined', from: 'podskazka', title: 'Stubborn Riff (упрямство)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'podskazka',
    moods: ['game', 'dark'], chords: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'iv', 'V'],
    notes: [[0, 0, 0.25], [0.25, 0, 0.25], [0.5, 12, 0.5], [1, 10, 0.5], [1.5, 7, 0.5], [2, 7, 0.25], [2.25, 5, 0.25], [2.5, 3, 0.5], [3, 5, 0.5], [3.5, 7, 0.5],
      [4, -2, 0.25], [4.25, -2, 0.25], [4.5, 10, 0.5], [5, 7, 0.5], [5.5, 5, 0.5], [6, 5, 0.25], [6.25, 3, 0.25], [6.5, 2, 0.5], [7, 3, 0.5], [7.5, 5, 0.5],
      [8, -4, 0.25], [8.25, -4, 0.25], [8.5, 8, 0.5], [9, 7, 0.5], [9.5, 5, 0.5], [10, 3, 0.25], [10.25, 2, 0.25], [10.5, 0, 0.5], [11, 2, 0.5], [11.5, 3, 0.5],
      [12, 5, 0.5], [12.5, 7, 0.5], [13, 10, 0.5], [13.5, 12, 0.5], [14, 14, 1.5], [15.5, 12, 0.5],
      [16, 0, 0.25], [16.25, 0, 0.25], [16.5, 12, 0.5], [17, 10, 0.5], [17.5, 7, 0.5], [18, 7, 0.25], [18.25, 5, 0.25], [18.5, 3, 0.5], [19, 5, 0.5], [19.5, 7, 0.5],
      [20, -2, 0.25], [20.25, -2, 0.25], [20.5, 10, 0.5], [21, 7, 0.5], [21.5, 5, 0.5], [22, 5, 0.25], [22.25, 3, 0.25], [22.5, 2, 0.5], [23, 3, 0.5], [23.5, 5, 0.5],
      [24, 5, 0.5], [24.5, 8, 0.5], [25, 12, 0.5], [25.5, 10, 0.5], [26, 8, 0.5], [26.5, 7, 0.5], [27, 5, 0.5], [27.5, 3, 0.5], [28, 2, 1], [29, -1, 0.5], [29.5, 2, 0.5], [30, 7, 2]],
  },
  // "Fields of Small Hopes": IV – V – iii – vi | IV – V – I — a line that keeps climbing, diatonic (it may change mode)
  {
    id: 'hint-fields', from: 'podskazka', title: 'Fields of Small Hopes (поля маленьких надежд)', key: 'D', base: 'D5', feel: 'straight', per: 4, modal: true, only: 'podskazka',
    moods: ['game', 'bright'], chords: ['IV', 'V', 'iii', 'vi', 'IV', 'V', 'I', 'I'],
    notes: [[0, 9, 1], [1, 7, 0.5], [1.5, 9, 0.5], [2, 12, 1], [3, 11, 1],
      [4, 14, 1.5], [5.5, 12, 0.5], [6, 11, 1], [7, 9, 0.5], [7.5, 7, 0.5],
      [8, 4, 1], [9, 7, 0.5], [9.5, 11, 0.5], [10, 16, 1.5], [11.5, 14, 0.5],
      [12, 12, 1], [13, 9, 0.5], [13.5, 7, 0.5], [14, 4, 1], [15, 7, 1],
      [16, 9, 1], [17, 12, 0.5], [17.5, 14, 0.5], [18, 12, 1], [19, 16, 1],
      [20, 14, 1], [21, 11, 0.5], [21.5, 14, 0.5], [22, 11, 1], [23, 9, 0.5], [23.5, 11, 0.5],
      [24, 12, 2], [26, 16, 1], [27, 14, 1], [28, 12, 3], [31, 9, 0.5], [31.5, 11, 0.5]],
  },
  // "Lantern Home": I – V – vi – iii | IV – I – ii – V (the canon's walk down), a music-box tune of quarters and eighths
  {
    id: 'hint-home', from: 'podskazka', title: 'Lantern Home (дом с фонарём)', key: 'C', base: 'C5', feel: 'straight', per: 4, modal: true, only: 'podskazka',
    moods: ['game', 'bright', 'calm'], chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'ii', 'V'],
    notes: [[0, 7, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 7, 1], [3, 12, 1], [4, 11, 1.5], [5.5, 9, 0.5], [6, 7, 1], [7, 2, 1],
      [8, 4, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 9, 1], [11, 12, 1], [12, 11, 2], [14, 7, 1], [15, 4, 1],
      [16, 5, 1], [17, 9, 0.5], [17.5, 12, 0.5], [18, 9, 1], [19, 5, 1], [20, 4, 1.5], [21.5, 5, 0.5], [22, 7, 1], [23, 12, 1],
      [24, 9, 1], [25, 5, 1], [26, 2, 1], [27, 5, 1], [28, 7, 2], [30, 11, 1], [31, 2, 1]],
  },

  // ---- Hardstyle: the euphoric lead — long notes, leaps of a sixth, the climb to the top of the climax ----
  // "Euphoria Gate": i – VI – III – VII | i – VI – iv – V
  {
    id: 'hs-euphoria', from: 'hardstyle', title: 'Euphoria Gate (врата эйфории)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'hardstyle',
    moods: ['epic'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 12, 1.5], [1.5, 14, 0.5], [2, 15, 1], [3, 14, 0.5], [3.5, 10, 0.5],
      [4, 12, 1], [5, 8, 1], [6, 15, 1.5], [7.5, 17, 0.5],
      [8, 19, 1.5], [9.5, 17, 0.5], [10, 15, 1], [11, 14, 0.5], [11.5, 12, 0.5], [12, 14, 2], [14, 10, 1], [15, 14, 1],
      [16, 12, 1], [17, 15, 0.5], [17.5, 17, 0.5], [18, 19, 1], [19, 17, 1],
      [20, 15, 1], [21, 17, 0.5], [21.5, 15, 0.5], [22, 12, 1], [23, 10, 0.5], [23.5, 7, 0.5],
      [24, 8, 1], [25, 12, 1], [26, 17, 1], [27, 15, 1], [28, 14, 2], [30, 11, 2]],
  },
  // "Skyfire": VI – VII – i – i | VI – VII – III – V, the dotted lift (3 + 3 + 2) into every bar, the melodic minor up to the leading tone
  {
    id: 'hs-skyfire', from: 'hardstyle', title: 'Skyfire (небесный огонь)', key: 'Em', base: 'E5', feel: 'straight', per: 4, modal: false, only: 'hardstyle',
    moods: ['epic', 'dark'], chords: ['VI', 'VII', 'i', 'i', 'VI', 'VII', 'III', 'V'],
    notes: [[0, 0, 0.75], [0.75, 3, 0.75], [1.5, 7, 0.5], [2, 8, 1], [3, 7, 0.5], [3.5, 3, 0.5],
      [4, 2, 0.75], [4.75, 5, 0.75], [5.5, 7, 0.5], [6, 10, 1.5], [7.5, 8, 0.5],
      [8, 7, 2], [10, 3, 1], [11, 5, 0.5], [11.5, 3, 0.5], [12, 0, 3], [15, 2, 1],
      [16, 3, 0.75], [16.75, 7, 0.75], [17.5, 8, 0.5], [18, 12, 1], [19, 10, 0.5], [19.5, 8, 0.5],
      [20, 10, 0.75], [20.75, 8, 0.75], [21.5, 5, 0.5], [22, 14, 1.5], [23.5, 12, 0.5],
      [24, 10, 1], [25, 7, 1], [26, 3, 1], [27, 5, 1], [28, 7, 1.5], [29.5, 9, 0.5], [30, 11, 2]],
  },

  // ---- Drift phonk: cowbell riffs in sixteenths ----
  // "Midnight Drift": i – i – VI – VII, the riff circling the octave and falling to the tonic
  {
    id: 'phonk-drift', from: 'phonk', title: 'Midnight Drift (полуночный дрифт)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: true, only: 'phonk',
    moods: ['dark'], chords: ['i', 'i', 'VI', 'VII'],
    notes: [[0, 12, 0.25], [0.5, 12, 0.25], [0.75, 10, 0.25], [1.25, 12, 0.25], [1.75, 15, 0.25], [2, 12, 0.25], [2.5, 10, 0.25], [2.75, 7, 0.25], [3.25, 8, 0.25], [3.75, 7, 0.25],
      [4, 7, 0.25], [4.5, 7, 0.25], [4.75, 8, 0.25], [5.25, 7, 0.25], [5.75, 3, 0.25], [6, 3, 0.25], [6.5, 5, 0.25], [6.75, 3, 0.25], [7.25, 2, 0.25], [7.75, 0, 0.25],
      [8, 12, 0.25], [8.5, 12, 0.25], [8.75, 10, 0.25], [9.25, 12, 0.25], [9.75, 15, 0.25], [10, 15, 0.25], [10.5, 12, 0.25], [10.75, 10, 0.25], [11.25, 8, 0.25], [11.75, 7, 0.25],
      [12, 10, 0.25], [12.5, 10, 0.25], [12.75, 12, 0.25], [13.25, 10, 0.25], [13.75, 7, 0.25], [14, 5, 0.25], [14.5, 7, 0.25], [14.75, 5, 0.25], [15.25, 3, 0.25], [15.75, 2, 0.25]],
  },
  // "Memphis Ghost": i – i – ♭II – i | i – i – VI – V every half bar — the phrygian semitone and the leading tone of the end
  {
    id: 'phonk-memphis', from: 'phonk', title: 'Memphis Ghost (мемфисский призрак)', key: 'Em', base: 'E5', feel: 'straight', per: 2, modal: false, only: 'phonk',
    moods: ['dark'], chords: ['i', 'i', 'bII', 'i', 'i', 'i', 'VI', 'V'],
    notes: [[0, 0, 0.25], [0.25, 0, 0.25], [0.75, 3, 0.25], [1.25, 7, 0.25], [1.5, 5, 0.25], [2, 3, 0.25], [2.5, 0, 0.25], [2.75, 2, 0.25], [3.25, 3, 0.25], [3.75, 1, 0.25],
      [4, 5, 0.25], [4.25, 5, 0.25], [4.75, 8, 0.25], [5.25, 5, 0.25], [5.75, 1, 0.25], [6, 0, 0.25], [6.5, 0, 0.25], [6.75, 3, 0.25], [7.25, 0, 0.25], [7.75, -2, 0.25],
      [8, 12, 0.25], [8.25, 12, 0.25], [8.75, 10, 0.25], [9.25, 7, 0.25], [9.5, 8, 0.25], [10, 7, 0.25], [10.5, 3, 0.25], [10.75, 5, 0.25], [11.25, 3, 0.25], [11.75, 2, 0.25],
      [12, 0, 0.25], [12.5, 3, 0.25], [12.75, 8, 0.25], [13.25, 7, 0.25], [13.75, 3, 0.25], [14, -1, 0.25], [14.5, 2, 0.25], [14.75, 7, 0.25], [15.25, 11, 0.25], [15.75, 7, 0.25]],
  },

  // ---- Breakcore: slow, melancholy lines over minor ninths — the drums run at double speed under them ----
  // "Static Tears": i9 – VImaj7 – IIImaj7 – VII | iv9 – VImaj7 – iiø7 – V7, every strong note the ninth, the seventh or the third
  {
    id: 'bc-static', from: 'breakcore', title: 'Static Tears (слёзы помех)', key: 'Am', base: 'A4', feel: 'straight', per: 4, modal: false, only: 'breakcore',
    moods: ['dark', 'space'], chords: ['i9', 'VImaj7', 'IIImaj7', 'VII', 'iv9', 'VImaj7', 'iiø7', 'V7'],
    notes: [[0, 14, 1.5], [1.5, 12, 0.5], [2, 10, 2], [4, 12, 1], [5, 15, 1], [6, 19, 2], [8, 14, 2], [10, 10, 1], [11, 12, 1], [12, 14, 3], [15, 17, 1],
      [16, 15, 1.5], [17.5, 12, 0.5], [18, 8, 2], [20, 7, 1], [21, 8, 1], [22, 12, 2], [24, 14, 1.5], [25.5, 12, 0.5], [26, 8, 2], [28, 11, 2], [30, 7, 2]],
  },
  // "Glass Rain": i – VI – III – VII | i – VI – iv – V in eighths and quarters, rising to the third of III and falling back
  {
    id: 'bc-glassrain', from: 'breakcore', title: 'Glass Rain (стеклянный дождь)', key: 'Dm', base: 'D5', feel: 'straight', per: 4, modal: false, only: 'breakcore',
    moods: ['dark', 'space'], chords: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'iv', 'V'],
    notes: [[0, 7, 0.5], [0.5, 10, 0.5], [1, 12, 1], [2, 15, 1], [3, 14, 0.5], [3.5, 10, 0.5],
      [4, 12, 1.5], [5.5, 10, 0.5], [6, 8, 1.5], [7.5, 5, 0.5],
      [8, 7, 1], [9, 10, 0.5], [9.5, 12, 0.5], [10, 15, 1], [11, 17, 1], [12, 14, 2], [14, 10, 1], [15, 12, 1],
      [16, 15, 1], [17, 14, 0.5], [17.5, 12, 0.5], [18, 7, 1.5], [19.5, 10, 0.5],
      [20, 8, 1], [21, 10, 0.5], [21.5, 12, 0.5], [22, 15, 1], [23, 14, 1],
      [24, 12, 1], [25, 10, 1], [26, 8, 1], [27, 5, 1], [28, 2, 2], [30, 11, 2]],
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
