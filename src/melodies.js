// The melody library of the generator: themes taken from the songs of this project, each with the
// harmony it was written over (Roman numerals, one chord per `per` beats), so a theme can move to any
// key — and, if `modal`, between major and minor — and still sit on its own chords.
//   notes: [beat, n, length], n = semitones from `base`; key = the original key.
//   feel: 'straight' | 'swing';  moods: what it suits;  modal: purely diatonic (may change mode);
//   only: the one style allowed to use it (absent = every style).
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
