// MathMusic's own icons — small line drawings on a 24 × 24 grid, one weight, one corner radius — in place of emoji.
// The interface is written with emoji in its strings (menus, toasts, buttons, the styles' own signs); `watchIcons()` turns
// every one of them into its drawing wherever it appears in the page, now and later (a MutationObserver), so a new
// string needs nothing but an entry in EMOJI when it brings a new sign. Text in the code editor, in inputs and in
// <option>s is left alone (an <option> cannot hold a drawing: its emoji is simply taken out).
const P = d => `<path d="${d}"/>`
const F = d => `<path d="${d}" fill="currentColor" stroke="none"/>`
const C = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}"${fill ? ' fill="currentColor" stroke="none"' : ''}/>`
const R = (x, y, w, h, r = 0, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"${fill ? ' fill="currentColor" stroke="none"' : ''}/>`
const E = (x, y, rx, ry, rot, fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} 12 12)"` : ''}${fill ? ' fill="currentColor" stroke="none"' : ''}/>`

export const ICONS = {
  // ---- transport, files, tools ----
  play: F('M8 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z'),
  pause: R(6.5, 5, 4, 14, 1.2, 1) + R(13.5, 5, 4, 14, 1.2, 1),
  prev: F('M19 6.2v11.6a.6.6 0 0 1-.9.5L9 12.5a.6.6 0 0 1 0-1l9.1-5.8a.6.6 0 0 1 .9.5z') + R(5, 5.5, 2.4, 13, 1, 1),
  next: F('M5 6.2v11.6a.6.6 0 0 0 .9.5l9.1-5.8a.6.6 0 0 0 0-1L5.9 5.7a.6.6 0 0 0-.9.5z') + R(16.6, 5.5, 2.4, 13, 1, 1),
  rew: F('M12 7v10l-7.5-5z') + F('M20 7v10l-7.5-5z'),
  fwd: F('M4 7v10l7.5-5z') + F('M12 7v10l7.5-5z'),
  record: C(12, 12, 6.5, 1),
  loop: P('M16.5 3.5l3 3-3 3M19.5 6.5H8.5a4.5 4.5 0 0 0-4.5 4.5v1M7.5 20.5l-3-3 3-3M4.5 17.5h11a4.5 4.5 0 0 0 4.5-4.5v-1'),
  dice: R(3.8, 3.8, 16.4, 16.4, 4) + C(8.4, 8.4, 1.25, 1) + C(15.6, 8.4, 1.25, 1) + C(12, 12, 1.25, 1) + C(8.4, 15.6, 1.25, 1) + C(15.6, 15.6, 1.25, 1),
  score: E(7.3, 17, 2.6, 2, -18, 1) + E(16.3, 15, 2.6, 2, -18, 1) + P('M9.7 16.5V6.2l9-2.2v10.5M9.7 9.2l9-2.2'),
  sheet: P('M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM14.5 3.5v4h4M8 12h8M8 15h8M8 18h5'),
  mixer: P('M6 4v16M12 4v16M18 4v16') + R(4, 13, 4, 3.4, 1.2, 1) + R(10, 6.5, 4, 3.4, 1.2, 1) + R(16, 10.5, 4, 3.4, 1.2, 1),
  fork: P('M9 3v7.5a3 3 0 0 0 6 0V3M12 13.5V21'),
  snow: P('M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6.3l-2-2M12 6.3l2-2M12 17.7l-2 2M12 17.7l2 2'),
  folder: P('M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z'),
  folderOpen: P('M3.5 17.5V7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V11M3.6 18l2.4-6a1.6 1.6 0 0 1 1.5-1h12.3a1 1 0 0 1 .9 1.4L18.4 18a1.6 1.6 0 0 1-1.5 1H5a1.5 1.5 0 0 1-1.4-1z'),
  trash: P('M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6'),
  headphones: P('M4.5 14.5V12a7.5 7.5 0 0 1 15 0v2.5') + R(3.5, 13.5, 4.2, 7, 1.6) + R(16.3, 13.5, 4.2, 7, 1.6),
  note: E(8.3, 17, 3.1, 2.4, -18, 1) + P('M11.2 16.4V5.2l7.3-1.7v4L11.2 9'),
  piano: R(3.5, 5, 17, 14, 2) + P('M8 13.5V19M12 13.5V19M16 13.5V19') + R(6.8, 5, 2.4, 8.5, 0.6, 1) + R(10.8, 5, 2.4, 8.5, 0.6, 1) + R(14.8, 5, 2.4, 8.5, 0.6, 1),
  hourglass: P('M7 3.5h10M7 20.5h10M8.5 3.5v3c0 2.5 3.5 3.5 3.5 5.5s-3.5 3-3.5 5.5v3M15.5 3.5v3c0 2.5-3.5 3.5-3.5 5.5s3.5 3 3.5 5.5v3'),
  radio: R(3.5, 9, 17, 11.5, 2.2) + C(9, 14.8, 2.7) + P('M15 13h3M15 16.5h3M7 9l9.5-5'),
  clapper: P('M4 10.5h16V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19zM4 10.5L3.3 7.3l15.3-3.3.7 3.2zM8.3 6.3l2 3.4M13.2 5.2l2 3.4'),
  film: R(4, 4, 16, 16, 2) + P('M8 4v16M16 4v16M4 9.3h4M4 14.7h4M16 9.3h4M16 14.7h4'),
  strings: P('M6.5 3v18M10.2 3v18M13.8 3v18M17.5 3v18M3 16.5L21 8.5'),
  plug: P('M9 3v5M15 3v5M6.5 8h11v3a5.5 5.5 0 0 1-11 0zM12 16.5V21'),
  save: P('M5.5 3.5H16L20.5 8v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5.5a2 2 0 0 1 2-2zM8 3.5v5h7v-5M7.5 20.5v-6.5h9v6.5'),
  sparkle: P('M11 3l1.9 5.6 5.6 1.9-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'),
  bolt: P('M13.5 2.5L5 13.5h6l-1 8L18.5 10.5h-6z'),
  download: P('M12 4v11.5M7.5 11l4.5 4.5 4.5-4.5M5 19.5h14'),
  share: P('M12 15V3.5M8 7.5l4-4 4 4M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12'),
  drum: E(12, 8.5, 8, 3.2) + P('M4 8.5v7c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-7M8 11.4v6.9M12 11.7v7M16 11.4v6.9'),
  orbit: C(12, 12, 3.4) + E(12, 12, 9.6, 4, -22) + C(19.6, 7.4, 1.2, 1),
  history: P('M4 4.5V9h4.5M4.6 9A8.5 8.5 0 1 1 3.5 12M12 7.5V12l3.2 2'),
  speaker: P('M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4.3 4.3 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11'),
  book: P('M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V20'),
  warn: P('M12 4L2.8 19.5h18.4zM12 10v4.5') + C(12, 17, 1, 1),
  layers: P('M12 3.5l8.5 4.5-8.5 4.5L3.5 8zM3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5'),
  file: P('M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM14.5 3.5v4h4M10 12.5l-2 2 2 2M14 12.5l2 2-2 2'),
  palette: P('M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.7 0-1.3-1-1.6-1-2.8 0-1 .8-1.7 2-1.7h2c2 0 3.5-1.5 3.5-3.6C20.5 6.5 16.7 3.5 12 3.5z') + C(7.6, 11.5, 1.1, 1) + C(10.2, 7.6, 1.1, 1) + C(14.6, 7.4, 1.1, 1),
  grid: R(3.5, 3.5, 7, 7, 1.6) + R(13.5, 3.5, 7, 7, 1.6) + R(3.5, 13.5, 7, 7, 1.6) + R(13.5, 13.5, 7, 7, 1.6),
  columns: P('M3 9l9-5.5L21 9zM5.5 9v8M9.8 9v8M14.2 9v8M18.5 9v8M3.5 20.5h17M4.5 17.5h15'),
  updown: P('M12 3.5v17M8 7.5l4-4 4 4M8 16.5l4 4 4-4'),
  leftright: P('M3.5 12h17M7.5 8l-4 4 4 4M16.5 8l4 4-4 4'),
  ear: P('M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3-2.5 3.8-3.3 5.8-.7 1.8-1 4.7-3.7 4.7a3 3 0 0 1-3-3M9.5 10a2.5 2.5 0 0 1 5 0c0 1.2-1.5 1.7-1.5 3'),
  hammer: P('M4.5 20.5l9-9M10.5 6.5l7 7 3-3-2.5-2.5.5-2.5-2.5-2.5-2.5.5-1 1z'),
  car: P('M3.5 16.5v-3.5l2-4.5a2 2 0 0 1 1.8-1.2h9.4a2 2 0 0 1 1.8 1.2l2 4.5v3.5zM3.5 13h17M6 16.5v2M18 16.5v2M7 10.5h10'),
  bat: P('M12 16.5c-.8-1.5-2-2.5-3.3-3-.8-1.3-2-1.5-3 0-.5-1.8-1.7-2.5-3.7-2C3.5 8 6.5 6.5 10 7.5c.3-1 .2-2-.3-3 .9.8 1.6 1.2 2.3 1.2s1.4-.4 2.3-1.2c-.5 1-.6 2-.3 3 3.5-1 6.5.5 8 4-2-.5-3.2.2-3.7 2-1-1.5-2.2-1.3-3 0-1.3.5-2.5 1.5-3.3 3z'),
  pencil: P('M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5zM14.5 6l3 3'),
  gear: C(12, 12, 3) + P('M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1') + C(12, 12, 6.6),
  code: P('M8.5 7l-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15'),
  check: P('M4.5 12.5l5 5L19.5 7'),
  eraser: P('M4 16.5L13.5 7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 19.5H7zM9.5 11l5.5 5.5M4 19.5h16'),
  axes: P('M5 3.5V19.5h15.5M8 15c2-7 4-7 5.5-2.5s3.5 3.5 5.5-5'),
  cube: P('M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9'),
  zoom: C(10.5, 10.5, 6.5) + P('M15.5 15.5l5 5'),
  shield: P('M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6zM8.8 12l2.3 2.3 4.2-4.6'),
  copy: R(8, 8, 12, 12, 2.2) + P('M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8'),
  plus: P('M12 5v14M5 12h14'),
  swap: P('M4 8h14M14.5 4.5L18 8l-3.5 3.5M20 16H6M9.5 12.5L6 16l3.5 3.5'),
  undo: P('M4.5 9.5h10a5 5 0 0 1 0 10H9M8 6L4.5 9.5 8 13'),
  close: P('M6 6l12 12M18 6L6 18'),
  dots: C(5.5, 12, 1.5, 1) + C(12, 12, 1.5, 1) + C(18.5, 12, 1.5, 1),
  // ---- the styles and their families ----
  swords: P('M4 4l10 10M4 4v3.5M4 4h3.5M20 4L10 14M20 4v3.5M20 4h-3.5M7 13.5l3.5 3.5M17 13.5L13.5 17M8.5 15.5L5 19M4 18l2 2M15.5 15.5L19 19M20 18l-2 2'),
  cup: P('M5 8.5h11.5v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16.5 10H18a2.3 2.3 0 0 1 0 4.6h-1.6M9 2.8c-.8 1 .8 1.9 0 3M13 2.8c-.8 1 .8 1.9 0 3M4 21h14'),
  palm: P('M12 21c.4-4 .6-7.5 0-11M12 10C10.5 7 7.5 6 4.5 7M12 10c-3-.5-5.5 1-6.5 4M12 10c1.5-3 4.5-4 7.5-3M12 10c3-.5 5.5 1 6.5 4M12 10c0-2.5-.5-4.5-2-6M8.5 21h7'),
  invader: F('M7 4h2v2H7zM15 4h2v2h-2zM7 6h10v2H7zM5 8h14v2H5zM3 10h4v2H3zM9 10h6v2H9zM17 10h4v2h-4zM3 12h18v2H3zM5 14h14v2H5zM7 16h2v2H7zM15 16h2v2h-2zM5 18h2v2H5zM17 18h2v2h-2z'),
  sunset: P('M5 14.5a7 7 0 0 1 14 0M2.5 14.5h19M5 17.5h14M8 20.5h8M8.2 11.5h7.6M9.8 8.7h4.4'),
  goblet: E(12, 5, 5.5, 1.8) + P('M6.5 5c0 4 2.7 5.5 3.7 7.5.6 1.3.2 5-1.4 8h6.4c-1.6-3-2-6.7-1.4-8 1-2 3.7-3.5 3.7-7.5'),
  lotus: P('M12 19c-2.5-2-3.6-4.8-3.6-7.3 0-2.2 1.4-4.7 3.6-6.2 2.2 1.5 3.6 4 3.6 6.2 0 2.5-1.1 5.3-3.6 7.3zM8.6 10.2C6.5 9.8 4.8 10.5 3.5 12c.8 3.5 3.8 6.5 8.5 7M15.4 10.2c2.1-.4 3.8.3 5.1 1.8-.8 3.5-3.8 6.5-8.5 7M3.5 21h17'),
  gong: P('M4 4.5h16M7.5 4.5v2.6M16.5 4.5v2.6') + C(12, 13.5, 7) + C(12, 13.5, 2.2),
  sax: P('M12.5 2.5L15 4v10.5a4 4 0 0 1-8 0V11M4.3 10.5h5.4M4.8 10.5c0 1.4 1 2.2 2.2 2.2s2.2-.8 2.2-2.2') + C(15, 7.5, 0.95, 1) + C(15, 10.7, 0.95, 1),
  clover: C(12, 7.8, 3.2) + C(8.2, 13.4, 3.2) + C(15.8, 13.4, 3.2) + P('M12 13.5c0 3 .5 5 2 7.5'),
  waves: P('M3 8c3-2.5 6 2.5 9 0s6-2.5 9 0M3 12.5c3-2.5 6 2.5 9 0s6-2.5 9 0M3 17c3-2.5 6 2.5 9 0s6-2.5 9 0'),
  torii: P('M3 5.5c6 1.6 12 1.6 18 0M5 10h14M7.5 6.6V20.5M16.5 6.6V20.5M12 7.3V10'),
  sakura: [0, 72, 144, 216, 288].map(a => E(12, 6.5, 2.5, 3.6, a)).join('') + C(12, 12, 1.3, 1),
  cat: P('M5 20V9.5L4 3.5l5 3.2a8.5 8.5 0 0 1 6 0l5-3.2-1 6V20zM9.5 12.5v1.3M14.5 12.5v1.3M10.5 16.5c.5.7 1 .7 1.5 0 .5.7 1 .7 1.5 0'),
  mirrorball: C(12, 13.5, 7.2) + P('M12 2.5v3.8M5 11.5h14M5.8 16.5h12.4M9 7c-1.5 4.3-1.5 8.7 0 13M15 7c1.5 4.3 1.5 8.7 0 13'),
  factory: P('M3.5 20.5V11.5l5 3v-3l5 3V5h3.5v15.5zM17 9.5h3.5v11M3.5 20.5h17M7 17.5h2M12 17.5h2'),
  pickaxe: P('M4.5 20.5L14 11M8 5.5c4.5-2 9-.8 11.5 3.5-3-1.3-6-1.3-8.5 0M12.5 9.5l2 2'),
  siren: P('M7 17v-5a5 5 0 0 1 10 0v5M5 17h14v3.5H5zM12 3.5V2M5 6.5l-1.2-1.2M19 6.5l1.2-1.2M12 12v2'),
  candle: R(9, 10.5, 6, 10, 1.2) + P('M12 10.5V8.5M12 3c-1.5 1.5-2.1 2.5-2.1 3.5a2.1 2.1 0 0 0 4.2 0C14.1 5.5 13.5 4.5 12 3zM7 20.5h10'),
  flame: P('M12 21a6.5 6.5 0 0 1-6.5-6.5c0-3 2-4.5 3-7 .5 1.5 1.2 2.3 2.3 2.8C10.5 7.5 11.5 5 13.5 3c.5 3.5 5 6 5 11.5A6.5 6.5 0 0 1 12 21z'),
  eye: P('M2.5 12c2.5-4.5 5.8-6.5 9.5-6.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12z') + C(12, 12, 3.1) + C(12, 12, 1.1, 1),
  leaf: P('M5 19.5C5 11 9.5 5 19.5 4.5 19 14 14 19.5 5 19.5zM5 19.5L14 10'),
  question: R(4, 4, 16, 16, 3.2) + P('M9.5 9.7a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 2') + C(12, 16.9, 1, 1),
  heart: P('M12 20S4 15 4 9.5A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2C20 15 12 20 12 20z'),
  window: R(3.5, 4.5, 17, 15, 2.2) + P('M3.5 9h17M12 9v10.5M3.5 14.2h17'),
  key: C(8, 15.5, 4.2) + P('M11 12.5l9-9M16.5 7l3 3M14 9.5l2.2 2.2'),
  storm: P('M7 16.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.2 3.9 3.9 0 0 1 .5 7.8M12.8 12.5L10.3 16.5h3.4l-2 4.5'),
  angel: E(12, 4.3, 4, 1.5) + C(12, 10, 2.5) + P('M9.5 12.5C6 11 3.5 12 2.5 15c2 .5 3.5.3 5-.5-.5 2 0 3.5 1.5 5 1.5-2 2.5-4 3-6.5M14.5 12.5c3.5-1.5 6-.5 7 2.5-2 .5-3.5.3-5-.5.5 2 0 3.5-1.5 5-1.5-2-2.5-4-3-6.5'),
  devil: C(12, 13.5, 6.5) + P('M6.5 9.5C5 8 4.5 6 5 3.5 6.5 5.5 8 6.8 9.5 7.5M17.5 9.5C19 8 19.5 6 19 3.5 17.5 5.5 16 6.8 14.5 7.5M9 16c2 1.5 4 1.5 6 0M8.8 12l2 1M15.2 12l-2 1'),
  volcano: P('M3 20.5l5.5-10h7l5.5 10zM8.5 10.5l1.5 2 2-1.5 2 1.5 1.5-2M12 7.5V4M9.2 6.5L8 4.2M14.8 6.5L16 4.2'),
  mountain: P('M2.5 19.5L9 8.5l3.5 6 2.5-4 6.5 9zM7 12l2 1.5 2-1.5'),
  monolith: P('M8.5 20.5V9.5a3.5 3.5 0 0 1 7 0V20.5zM6 20.5h12M10.5 13h3M10.5 16h3') + C(12, 9.3, 1, 1),
  trumpet: P('M2.5 9.5v5M2.5 12h12.5c2.5 0 4.5-2 6-5.5v11c-1.5-3.5-3.5-5.5-6-5.5M6.5 12v3.5a2.8 2.8 0 0 0 5.6 0V12M7.5 9v3M10.8 9v3M14 9v3'),
  fist: P('M7 11.5V7.5a1.7 1.7 0 0 1 3.4 0V6.5a1.7 1.7 0 0 1 3.4 0v1a1.7 1.7 0 0 1 3.4 0V13c0 3-2 5.5-5.5 5.5H10c-2.5 0-4.5-2-4.5-4.5v-1.3a1.5 1.5 0 0 1 3 0M8.5 18.3V21h7v-3'),
  matryoshka: P('M12 3a4 4 0 0 1 4 4c0 1.5-.8 2.2-.5 3.2.5 1.5 2.5 3 2.5 6.3 0 3-2.5 4.5-6 4.5s-6-1.5-6-4.5c0-3.3 2-4.8 2.5-6.3C8.8 9.2 8 8.5 8 7a4 4 0 0 1 4-4zM9.5 15.5c1.5 1.5 3.5 1.5 5 0') + C(12, 7.2, 1.9),
  soul: F('M6 5h4v2h4V5h4v2h2v6h-2v2h-2v2h-2v2h-4v-2H8v-2H6v-2H4V7h2z'),
  wheel: C(12, 12, 8.5) + C(12, 12, 2.2) + P('M12 3.5V9.8M4 14.5l6-1.7M20 14.5l-6-1.7'),
  disc: C(12, 12, 8.5) + C(12, 12, 2.4) + P('M12 6.3a5.7 5.7 0 0 1 5.7 5.7'),
  planet: C(12, 12, 5) + E(12, 12, 10, 3.4, -20),
  gamepad: P('M7.5 7.5h9a5 5 0 0 1 5 5V14a3 3 0 0 1-5.5 1.7l-.7-1.2H8.7L8 15.7A3 3 0 0 1 2.5 14v-1.5a5 5 0 0 1 5-5zM7.2 10.5v3M5.7 12h3') + C(15.4, 11, 1, 1) + C(17.8, 13, 1, 1),
  joystick: C(12, 5.2, 2.4) + P('M12 7.6V13.5M9 15.5v-2h6v2M6.5 15.5h11l1.5 5H5z'),
  nightcity: P('M3 20.5h18M5 20.5V10.5h5v10M10 20.5V6.5h5v14M15 20.5V12.5h4v8M7 13.5h1M7 16.5h1M12 9.5h1M12 12.5h1M12 15.5h1') + P('M19 3a2.8 2.8 0 1 0 2.3 4.3A3.3 3.3 0 0 1 19 3z'),
  moon: P('M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z'),
  globe: C(12, 12, 8.5) + P('M3.5 12h17M12 3.5c-3.3 3-3.3 14 0 17M12 3.5c3.3 3 3.3 14 0 17'),
  scales: P('M12 4v16.5M7.5 20.5h9M5 7.5h14M5 7.5l-2.5 6a2.7 2.7 0 0 0 5 0zM19 7.5l-2.5 6a2.7 2.7 0 0 0 5 0z'),
  network: C(12, 12, 8.5) + E(12, 12, 4, 8.5) + P('M4.5 8.5h15M4.5 15.5h15'),
  balloon: P('M12 3a6 6 0 0 1 6 6c0 3.5-3 6.5-6 7.5-3-1-6-4-6-7.5a6 6 0 0 1 6-6zM12 16.5c-1.2 1.5 1.2 2.5 0 4.5'),
  organ: P('M4 20.5h16M6 20.5V9l1.5-2L9 9v11.5M10.5 20.5V5.5l1.5-2 1.5 2v15M15 20.5V9l1.5-2L18 9v11.5M6 15h3M10.5 13h3M15 15h3'),
  floppy: R(4, 4, 16, 16, 2) + R(8, 4, 8, 5.5, 0.8) + C(12, 15, 2.6) + P('M13.5 5.5v2.5'),
  bell: P('M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0M12 3v2'),
}
// every sign the interface uses → its drawing
export const EMOJI = {
  '▶': 'play', '⏸': 'pause', '⏮': 'prev', '⏭': 'next', '⏪': 'rew', '⏩': 'fwd', '⏺': 'record', '🔁': 'loop',
  '🎲': 'dice', '🎼': 'score', '📜': 'sheet', '🎛': 'mixer', '🎚': 'fork', '❄': 'snow', '📁': 'folder', '📂': 'folderOpen', '🗑': 'trash',
  '🎧': 'headphones', '🎵': 'note', '♪': 'note', '🎹': 'piano', '⏳': 'hourglass', '📻': 'radio', '🎬': 'clapper', '🎞': 'film', '🎻': 'strings',
  '🔌': 'plug', '💾': 'save', '✨': 'sparkle', '⚡': 'bolt', '⬇': 'download', '📤': 'share', '🥁': 'drum', '🌀': 'orbit', '🕘': 'history',
  '🔊': 'speaker', '📖': 'book', '⚠': 'warn', '🗂': 'layers', '📄': 'file', '🎨': 'palette', '🖼': 'grid', '🏛': 'columns', '↕': 'updown',
  '↔': 'leftright', '👂': 'ear', '🔨': 'hammer', '🚗': 'car', '🦇': 'bat', '✏': 'pencil', '✎': 'pencil', '⚙': 'gear', '⌨': 'code', '✔': 'check',
  '🧹': 'eraser', '📐': 'axes', '🚀': 'cube', '🔍': 'zoom', '🛡': 'shield', '⧉': 'copy', '✚': 'plus', '⇄': 'swap', '↶': 'undo', '↺': 'undo',
  '⚔': 'swords', '☕': 'cup', '🌴': 'palm', '👾': 'invader', '🌆': 'sunset', '🪘': 'goblet', '🪷': 'lotus', '🔔': 'gong', '🎷': 'sax', '☘': 'clover',
  '🌫': 'waves', '⛩': 'torii', '🌸': 'sakura', '🐱': 'cat', '🪩': 'mirrorball', '🏭': 'factory', '⛏': 'pickaxe', '🚨': 'siren', '🕯': 'candle',
  '🔥': 'flame', '👁': 'eye', '🌿': 'leaf', '❓': 'question', '💜': 'heart', '🪟': 'window', '🔑': 'key', '⛈': 'storm', '👼': 'angel', '😈': 'devil',
  '🌋': 'volcano', '🏔': 'mountain', '🗿': 'monolith', '🎺': 'trumpet', '🥊': 'fist', '👵': 'matryoshka', '❤': 'soul', '🏎': 'wheel', '💿': 'disc',
  '🌌': 'planet', '🎮': 'gamepad', '🕹': 'joystick', '🌃': 'nightcity', '🌙': 'moon', '🌍': 'globe', '⚖': 'scales', '🌐': 'network', '🎈': 'balloon',
  '⛪': 'organ', '✕': 'close', '⋯': 'dots', '＋': 'plus',
}
const SIGNS = Object.keys(EMOJI).sort((a, b) => b.length - a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const RE = new RegExp(`(${SIGNS.join('|')})\\uFE0F?`, 'gu'), HAS = new RegExp(`(?:${SIGNS.join('|')})`, 'u')
const SKIP = '.CodeMirror, .cm-editor, textarea, input, select, option, script, style, svg, .katex, [contenteditable], .noicon'

const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
// an icon as an element (for code that wants one outright)
export function icon(name, title) {
  const el = document.createElement('span')
  el.className = 'ico'
  if (title) el.title = title
  el.innerHTML = svg(name)
  return el
}
const strip = s => s.replace(RE, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ')

function swapText(node) {
  const text = node.nodeValue
  if (!HAS.test(text) || !node.parentElement || node.parentElement.closest(SKIP)) return
  const frag = document.createDocumentFragment()
  let last = 0
  for (const m of text.matchAll(RE)) {
    if (m.index > last) frag.append(text.slice(last, m.index))
    const el = icon(EMOJI[m[1]])
    el.dataset.sign = m[1]
    frag.append(el)
    last = m.index + m[0].length
  }
  if (last < text.length) frag.append(text.slice(last))
  node.replaceWith(frag)
}
// every sign inside root → its drawing; <option>s and <optgroup>s lose theirs
export function iconize(root = document.body) {
  if (root.nodeType === 3) return swapText(root)
  if (root.nodeType !== 1) return
  if (root.matches?.('option, optgroup') || root.querySelector?.('option, optgroup')) {
    for (const o of root.matches('option, optgroup') ? [root] : root.querySelectorAll('option, optgroup')) {
      if (o.tagName === 'OPTGROUP') { if (HAS.test(o.label)) o.label = strip(o.label) }
      else if (HAS.test(o.textContent)) o.textContent = strip(o.textContent)
    }
  }
  if (root.closest?.(SKIP)) return
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []
  while (w.nextNode()) if (HAS.test(w.currentNode.nodeValue)) nodes.push(w.currentNode)
  nodes.forEach(swapText)
}
// from now on, everywhere
export function watchIcons() {
  iconize(document.body)
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') iconize(m.target)
      else for (const n of m.addedNodes) iconize(n)
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true })
}
