// 🎧 A style from an audio file: decoded by the browser (MP3, WAV, OGG, FLAC, M4A…), listened to (src/analyze.js), turned
// into a style (src/audiostyle.js) — what was heard is shown, the key, the palette and the places where an instrument plays
// alone can be corrected (the style is built again at once, without listening again); the style is kept in this browser
// (localStorage mm.audioStyles) and every song made in it carries it whole (generator.styleDef), so it plays anywhere.
import { h, esc, toast, modal } from './ui.js'
import { analyzeAudio } from './analyze.js'
import { buildStyle, PALETTE_IDS } from './audiostyle.js'
import { STYLES } from './generate.js'
import { keyLabel, parseKey, keyName } from './theory.js'

const KEY = 'mm.audioStyles'
export const audioStyles = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const store = list => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true } catch {
    toast('в браузере не хватило места для стиля — удалите старый стиль из аудио', { kind: 'err', ms: 6000 })
    return false
  }
}
export const keepStyle = style => store([style, ...audioStyles().filter(s => s.id !== style.id)].slice(0, 30))
export const forgetStyle = id => store(audioStyles().filter(s => s.id !== id))

const sec = v => (Number.isFinite(v) ? `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}` : '')

// create: genui's create(opts) — the song is made the way every 🎲 song is
export function audioStyleDialog(create) {
  let A = null, mono = null, sr = 44100, style = null, fileName = ''
  const status = h('div', { class: 'dim' }, 'Выберите или перетащите аудиофайл: MP3, WAV, OGG, FLAC, M4A. Лучше всего — запись, где инструменты звучат отчётливо; если где-то инструмент играет один, укажите это место ниже: его тембр будет воссоздан.')
  const input = h('input', { type: 'file', accept: 'audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus' })
  const drop = h('div', { style: 'border:1px dashed var(--line, #556);border-radius:8px;padding:14px;text-align:center;margin:6px 0;cursor:pointer' }, '📂 файл сюда — или нажмите', input)
  input.style.display = 'none'
  drop.onclick = () => input.click()
  drop.ondragover = e => e.preventDefault()
  drop.ondrop = e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) load(f) }
  input.onchange = () => input.files[0] && load(input.files[0])

  const name = h('input', { type: 'text', placeholder: 'имя стиля', style: 'width:260px' })
  const keySel = h('select')
  const palSel = h('select')
  palSel.append(new Option('авто — ближайший по звучанию', ''))
  for (const id of PALETTE_IDS) if (STYLES[id]) palSel.append(new Option(`${STYLES[id].emoji} ${STYLES[id].label}`, id))
  const region = () => { const a = h('input', { type: 'number', min: 0, step: 0.1, placeholder: 'с', style: 'width:70px' }), b = h('input', { type: 'number', min: 0, step: 0.1, placeholder: 'по', style: 'width:70px' }); return { a, b, el: h('span', {}, a, ' – ', b, ' с') } }
  const R = { lead: region(), bass: region(), keys: region() }
  const report = h('div', { style: 'white-space:pre-wrap;font-size:13px;line-height:1.5;margin-top:8px' })
  const hints = h('div', { class: 'dim', style: 'font-size:12px' })
  const controls = h('div', { style: 'display:none' },
    h('div', { class: 'row' }, h('label', {}, 'Имя'), name),
    h('div', { class: 'row' }, h('label', {}, 'Тональность'), keySel, h('span', { class: 'dim' }, 'услышанная; если тоника не та — поправьте')),
    h('div', { class: 'row' }, h('label', {}, 'Аккомпанемент'), palSel),
    h('div', { class: 'row' }, h('label', {}, 'Соло мелодии'), R.lead.el, h('span', { class: 'dim' }, 'где лид звучит один — его тембр')),
    h('div', { class: 'row' }, h('label', {}, 'Соло баса'), R.bass.el),
    h('div', { class: 'row' }, h('label', {}, 'Соло клавиш'), R.keys.el),
    hints,
    h('div', { class: 'row' }, h('button', { onclick: () => rebuild() }, '↻ Пересобрать стиль')),
    report,
  )
  const box = h('div', { style: 'max-width:640px' }, status, drop, controls)

  async function load(file) {
    fileName = file.name.replace(/\.\w+$/, '')
    status.textContent = `⏳ декодирую ${file.name}…`
    try {
      const buf = await file.arrayBuffer(), ctx = new (window.AudioContext || window.webkitAudioContext)()
      const audio = await ctx.decodeAudioData(buf)
      ctx.close?.()
      sr = audio.sampleRate
      mono = new Float32Array(audio.length)
      for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels }
      status.textContent = `👂 слушаю ${sec(audio.duration)} музыки: темп, тональность, аккорды, ударные, форма, мелодия… (несколько секунд — страница на это время замрёт)`
      await new Promise(r => setTimeout(r, 60))
      const t0 = performance.now()
      A = analyzeAudio(mono, sr)
      status.textContent = `✓ ${file.name}: ${sec(A.duration)}, прослушано за ${((performance.now() - t0) / 1000).toFixed(1)} с`
      name.value = fileName
      keySel.innerHTML = ''
      for (const m of ['minor', 'major']) for (let t = 0; t < 12; t++) { const k = { tonic: t, mode: m }; keySel.append(new Option(keyLabel(k) + (t === A.key.tonic && m === A.key.mode ? ' — услышано' : ''), keyName(k))) }
      keySel.value = keyName({ tonic: A.key.tonic, mode: A.key.mode })
      hints.textContent = A.clean.length ? `чистые ноты мелодии есть около ${[...A.clean].sort((a, b) => b.score - a.score).slice(0, 4).map(c => sec(c.t)).join(', ')} — если там лид один, впишите это место` : ''
      controls.style.display = ''
      drop.style.display = 'none'
      rebuild()
    } catch (e) {
      console.error(e)
      status.textContent = '✗ не получилось прочитать файл: ' + e.message
    }
  }
  function rebuild() {
    if (!A) return
    const regions = {}
    for (const [k, r] of Object.entries(R)) { const a = +r.a.value, b = +r.b.value; if (r.a.value !== '' && b > a + 0.3) regions[k] = [a, b] }
    try {
      const heard = keyName({ tonic: A.key.tonic, mode: A.key.mode })
      const res = buildStyle(A, mono, sr, { name: name.value.trim() || fileName || 'audio', regions, key: keySel.value !== heard ? keySel.value : null, palette: palSel.value || null })
      style = res.style
      const tim = Object.entries(res.timbres).map(([role, M]) => `🎻 тембр «${role}»: ${M.kind === 'struck' ? 'удар/щипок' : 'тянущийся'}, ${M.p.length} партиалов (${M.p.slice(0, 5).map(p => p[0]).join(', ')}…) по ${M.notes} нотам${M.vib ? `, вибрато ${M.vib.rate} Гц ±${Math.round(M.vib.depth)} ¢` : ''}`)
      report.innerHTML = esc([...res.report, ...tim].join('\n'))
    } catch (e) {
      console.error(e)
      report.textContent = '✗ ' + e.message
    }
  }
  modal('🎧 Стиль из аудиофайла', box, [
    { label: 'Отмена' },
    { label: '💾 Сохранить стиль', action: () => { if (!style) return false; if (keepStyle(style)) toast(`🎧 стиль «${style.label}» — в меню 🎲 → Стили из аудио`, { kind: 'ok' }) } },
    { label: '🎲 Сочинить песню', primary: true, action: () => { if (!style) return false; keepStyle(style); create({ styleDef: style }) } },
  ])
}
