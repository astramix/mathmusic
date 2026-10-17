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
  india: { label: 'Ночь у храма', hue: 280, sat: 40, light: 6, star: '255,230,200', accent: '#ff9a3c', accent2: '#5fd8c8', deco: 'stars' },
  jazz: { label: 'Джаз-клуб', hue: 220, sat: 40, light: 6, star: '200,220,255', accent: '#7fb0ff', accent2: '#ffc56b', deco: 'grain' },
}
const BY_NAME = {
  voidchip: 'void', lofi: 'lofi', chiptune: 'chip', bossa: 'bossa', kawaii: 'kawaii', classical: 'classical',
  gothic: 'gothic', synthwave: 'synth', dnb: 'dnb', phonk: 'phonk', meow: 'meow', hardstyle: 'phonk', example: 'void',
  jbattle: 'ink', romantic: 'romantic', maqam: 'desert', fugue: 'classical', raga: 'india',
}
export function themeFor(song) {
  const id = song?.theme ?? BY_NAME[song?.style] ?? BY_NAME[song?.name] ?? 'void'
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
