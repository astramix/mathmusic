// Colour themes per song style. A song may set `theme: 'lofi'`; otherwise the theme comes from its
// name or generator style. hue = background hue (the classic view drifts ±70° with the sections),
// deco = an extra layer: 'grain' (film), 'scan' (CRT lines), 'sun' (outrun sun and grid), 'rain',
// 'gold' (vignette), 'stars' only.
export const THEMES = {
  void: { label: 'Космос', hue: 250, sat: 45, light: 6, star: '220,215,255', accent: '#b9a2ff', accent2: '#ffd479', deco: 'stars' },
  lofi: { label: 'Лоу-фай вечер', hue: 28, sat: 35, light: 7, star: '255,226,190', accent: '#ffb980', accent2: '#ffe3a3', deco: 'rain' },
  chip: { label: '8 бит', hue: 135, sat: 40, light: 5, star: '170,255,190', accent: '#7dff9b', accent2: '#ffe66b', deco: 'scan' },
  bossa: { label: 'Закат у моря', hue: 18, sat: 50, light: 8, star: '255,210,170', accent: '#ff9f6b', accent2: '#7fe0d0', deco: 'grain' },
  kawaii: { label: 'Кавай', hue: 320, sat: 55, light: 9, star: '255,200,240', accent: '#ff8fd0', accent2: '#9fe8ff', deco: 'stars' },
  classical: { label: 'Барокко', hue: 38, sat: 30, light: 6, star: '255,236,190', accent: '#e8c27a', accent2: '#fff1c4', deco: 'gold' },
  gothic: { label: 'Готика', hue: 290, sat: 35, light: 5, star: '230,190,255', accent: '#c48aff', accent2: '#ff8f9f', deco: 'gold' },
  synth: { label: 'Синтвейв', hue: 300, sat: 60, light: 8, star: '255,180,255', accent: '#ff6fd8', accent2: '#58e1ff', deco: 'sun' },
  dnb: { label: 'Неон', hue: 195, sat: 55, light: 6, star: '170,240,255', accent: '#5fd8ff', accent2: '#c6ff6b', deco: 'stars' },
  phonk: { label: 'Дрифт', hue: 355, sat: 55, light: 6, star: '255,170,170', accent: '#ff5f6f', accent2: '#ffd36b', deco: 'grain' },
  meow: { label: 'Котики', hue: 335, sat: 40, light: 9, star: '255,215,235', accent: '#ffa8d6', accent2: '#fff09f', deco: 'stars' },
  ink: { label: 'Тушь и киноварь', hue: 355, sat: 38, light: 5, star: '255,200,190', accent: '#ff4d5a', accent2: '#ffd9a0', deco: 'grain' },
  romantic: { label: 'Романтизм', hue: 345, sat: 32, light: 6, star: '255,225,215', accent: '#e8a0b4', accent2: '#f6d58e', deco: 'gold' },
  desert: { label: 'Ночь в пустыне', hue: 32, sat: 45, light: 6, star: '255,240,210', accent: '#f0b860', accent2: '#5fd0c0', deco: 'stars' },
  celtic: { label: 'Зелёные холмы', hue: 150, sat: 30, light: 6, star: '230,255,240', accent: '#8fe0a8', accent2: '#ffd08a', deco: 'grain' },
  java: { label: 'Ява', hue: 165, sat: 35, light: 6, star: '220,255,240', accent: '#e8c27a', accent2: '#7fe0c0', deco: 'stars' },
  india: { label: 'Ночь у храма', hue: 280, sat: 40, light: 6, star: '255,230,200', accent: '#ff9a3c', accent2: '#5fd8c8', deco: 'stars' },
  factory: { label: 'Завод', hue: 25, sat: 45, light: 6, star: '255,210,160', accent: '#ffa040', accent2: '#7fd0ff', deco: 'grain' },
  jungle: { label: 'Глубины джунглей', hue: 165, sat: 50, light: 5, star: '180,255,220', accent: '#5affc0', accent2: '#ff78dc', deco: 'stars' },
  cathedral: { label: 'Собор и орган', hue: 35, sat: 30, light: 5, star: '255,236,200', accent: '#e8c27a', accent2: '#ffe9b0', deco: 'gold' },
  arena: { label: 'Арена', hue: 230, sat: 45, light: 6, star: '220,230,255', accent: '#6fa8ff', accent2: '#ff5f6f', deco: 'stars' },
  snow: { label: 'Северное сияние', hue: 210, sat: 40, light: 6, star: '230,245,255', accent: '#7fffc8', accent2: '#a890ff', deco: 'stars' },
  xp: { label: 'Рабочий стол', hue: 215, sat: 60, light: 10, star: '255,255,255', accent: '#3d7bff', accent2: '#7ccf3c', deco: 'grain' },
  keygen: { label: 'Демосцена', hue: 270, sat: 40, light: 3, star: '200,230,255', accent: '#59ffa0', accent2: '#ff50dc', deco: 'scan' },
  mystery: { label: 'Тайная игра', hue: 275, sat: 60, light: 5, star: '230,200,255', accent: '#b07cff', accent2: '#ffbe3c', deco: 'scan' },
  favela: { label: 'Фавела ночью', hue: 300, sat: 60, light: 6, star: '255,200,240', accent: '#ff50c8', accent2: '#78ffc8', deco: 'grain' },
  storm: { label: 'Ночная буря', hue: 215, sat: 30, light: 5, star: '210,225,255', accent: '#8fb8ff', accent2: '#ffd27a', deco: 'rain' },
  heaven: { label: 'Райский сад', hue: 40, sat: 38, light: 8, star: '255,244,214', accent: '#ffd98a', accent2: '#a8d8ff', deco: 'gold' },
  hell: { label: 'Преисподняя', hue: 8, sat: 60, light: 5, star: '255,170,120', accent: '#ff5a2a', accent2: '#ffc04a', deco: 'grain' },
  magma: { label: 'Глубины магмы', hue: 16, sat: 65, light: 5, star: '255,190,140', accent: '#ff7a2a', accent2: '#ffc070', deco: 'grain' },
  dark: { label: 'Тёмная студия', hue: 230, sat: 12, light: 3, star: '200,205,225', accent: '#9aa8ff', accent2: '#c8d0e8', deco: 'stars' },
  jazz: { label: 'Джаз-клуб', hue: 220, sat: 40, light: 6, star: '200,220,255', accent: '#7fb0ff', accent2: '#ffc56b', deco: 'grain' },
}
const BY_NAME = {
  voidchip: 'void', lofi: 'lofi', chiptune: 'chip', bossa: 'bossa', kawaii: 'kawaii', classical: 'classical',
  gothic: 'gothic', synthwave: 'synth', dnb: 'dnb', phonk: 'phonk', meow: 'meow', hardstyle: 'phonk', example: 'void',
  jbattle: 'ink', romantic: 'romantic', maqam: 'desert', fugue: 'classical', raga: 'india', gamelan: 'java', celtic: 'celtic', jazz: 'jazz',
}
// every generator style's own theme (as STYLES[id].theme in src/generate.js says — test/library.test.js keeps them equal), so a
// song that names only its style still gets its scene
export const STYLE_THEME = {
  lofi: 'lofi', bossa: 'bossa', chiptune: 'chip', synthwave: 'synth', classical: 'classical', fugue: 'classical', organ: 'cathedral', maqam: 'desert',
  raga: 'india', gamelan: 'java', jazz: 'jazz', celtic: 'celtic', ambient: 'void', romantic: 'romantic', jbattle: 'ink', kawaii: 'kawaii', space: 'void',
  meow: 'meow', boss: 'chip', edm: 'dnb', disco: 'synth', epic: 'arena', factory: 'factory', factorycave: 'factory', factorydanger: 'factory',
  darkecho: 'gothic', ishope: 'phonk', prime: 'void', brinstar: 'jungle', montagem: 'mystery', velora: 'favela', xperror: 'xp', keygen: 'keygen',
  nightstorm: 'storm', heaven: 'heaven', hell: 'hell', magma: 'magma', nordic: 'snow', artifact: 'java', zunpet: 'ink', oldzun: 'chip', fight: 'arena', babushka: 'synth',
  podskazka: 'chip', hardstyle: 'phonk', phonk: 'phonk', breakcore: 'dnb',
  fight2: 'arena', prime2: 'void', brinstar2: 'jungle',
}
// a song that says nothing of its style (a project, a song of your own) gets the dark studio — not a style's landscape
export function themeFor(song) {
  const s = song?.style, g = song?.generator?.style
  const id = (THEMES[song?.theme] && song.theme) ?? BY_NAME[s] ?? STYLE_THEME[s] ?? STYLE_THEME[g] ?? BY_NAME[song?.name] ?? 'dark'
  return { id, ...(THEMES[id] ?? THEMES.void) }
}
// UI tokens follow the theme accent
export function applyUiTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--accent', t.accent)
  r.setProperty('--accent2', t.accent2)
  r.setProperty('--bg', `hsl(${t.hue} ${t.sat}% 4%)`)
  r.setProperty('--panel2', `hsl(${t.hue} ${Math.min(45, t.sat)}% 9%)`)
  r.setProperty('--btn', `hsl(${t.hue} ${Math.min(40, t.sat)}% 15%)`)
  r.setProperty('--code-bg', `hsl(${t.hue} ${Math.min(35, t.sat)}% 6.5%)`)
}
