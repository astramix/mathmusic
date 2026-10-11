// Builds MathMusic.amxd, the Max for Live instrument, from the patch described below.
//
// The device runs max/mathmusic.js in Node for Max, so this project's absolute path is
// baked into it: run `npm run device` again after moving the folder.
//
// Playback: the engine renders the song at Live's tempo into buffer~ ---mm. The song position
// in beats is x = round(B − φ) + φ, where B is plugsync~'s beat count (message rate, may lag a
// signal vector) and φ is plugphasor~'s sample-accurate beat phase. play~ reads the buffer at
// (x − start offset) · ms-per-beat, gated by the transport state and the buffer's length.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, 'mathmusic.js').replace(/\\/g, '/')
const target = path.join(path.dirname(here), 'MathMusic.amxd')
if (/\s/.test(script)) throw new Error(`node.script can't take a path with spaces: ${script}`)

const boxes = [], lines = [], parameters = {}
let count = 0

function add(props) {
  const id = `obj-${++count}`
  boxes.push({ box: { id, ...props } })
  const valueof = props.saved_attribute_attributes?.valueof
  if (valueof) parameters[id] = [valueof.parameter_longname, valueof.parameter_shortname, 0]
  return id
}
// A text object with its inlet/outlet counts; sig marks signal outlets.
const obj = (text, x, y, ins, outs, { sig = false, w } = {}) =>
  add({
    maxclass: 'newobj', text, numinlets: ins, numoutlets: outs,
    outlettype: Array(outs).fill(sig ? 'signal' : ''),
    patching_rect: [x, y, w ?? Math.max(40, 7 * text.length + 12), 22],
  })
const msg = (text, x, y) =>
  add({ maxclass: 'message', text, numinlets: 2, numoutlets: 1, outlettype: [''], patching_rect: [x, y, 7 * text.length + 20, 22] })
// A UI object, also shown in the device itself at presentation rect `at` = [x, y, w, h].
const ui = (props, x, y, at) => add({ ...props, patching_rect: [x, y, at[2], at[3]], presentation: 1, presentation_rect: at })
const wire = (src, outlet, dst, inlet = 0) => lines.push({ patchline: { source: [src, outlet], destination: [dst, inlet] } })

const valueof = v => ({ saved_attribute_attributes: { valueof: { parameter_linknames: 1, ...v } }, varname: v.parameter_longname })
const label = text => ({ maxclass: 'live.comment', text, numinlets: 1, numoutlets: 0 })
const button = (text, name) => ({
  maxclass: 'live.text', text, texton: text, mode: 0,
  numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 1,
  ...valueof({ parameter_longname: name, parameter_shortname: name, parameter_type: 2, parameter_mmax: 1, parameter_enum: ['off', 'on'], parameter_invisible: 2 }),
})
const drop = (legend, name) => ({
  maxclass: 'live.drop', legend, numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 1,
  ...valueof({ parameter_longname: name, parameter_shortname: name, parameter_type: 4, parameter_invisible: 1 }),
})

// ---- engine (Node for Max) --------------------------------------------------------------
const node = obj(`node.script ${script} @autostart 1`, 20, 400, 1, 2, { w: 460 })
const fromNode = obj('route buffer timing graph status', 20, 440, 2, 5)
wire(node, 0, fromNode)
const replace = obj('prepend replace', 20, 480, 2, 1)
const buffer = obj('buffer~ ---mm 1000 2', 20, 520, 2, 2)
wire(fromNode, 0, replace)
wire(replace, 0, buffer)
const timing = obj('unpack f f f', 140, 480, 1, 3) // ms per beat, buffer ms, song ms
wire(fromNode, 1, timing)
const readGraph = obj('prepend read', 240, 480, 2, 1)
wire(fromNode, 2, readGraph)
const setStatus = obj('prepend set', 340, 480, 2, 1)
wire(fromNode, 3, setStatus)

// ---- device UI (presentation) -----------------------------------------------------------
ui({ ...label('MATH MUSIC'), fontsize: 12 }, 20, 20, [8, 4, 180, 18])

const openBtn = ui(button('Open song', 'Open'), 20, 60, [8, 26, 86, 18])
const pickFile = obj('opendialog', 20, 90, 2, 2)
const toOpen = obj('prepend open', 20, 120, 2, 1)
wire(openBtn, 0, pickFile)
wire(pickFile, 0, toOpen)
wire(toOpen, 0, node)

const editBtn = ui(button('Edit', 'Edit'), 120, 60, [100, 26, 86, 18])
const editMsg = msg('edit', 120, 90)
wire(editBtn, 0, editMsg)
wire(editMsg, 0, node)

const exportBtn = ui(button('Export WAV + MIDI', 'Export'), 220, 60, [8, 48, 178, 18])
const exportMsg = msg('export', 220, 90)
wire(exportBtn, 0, exportMsg)
wire(exportMsg, 0, node)

ui(label('Start bar'), 20, 160, [8, 72, 80, 16])
const startBar = ui(
  {
    maxclass: 'live.numbox', numinlets: 1, numoutlets: 2, outlettype: ['', 'float'], parameter_enable: 1,
    ...valueof({
      parameter_longname: 'Start Bar', parameter_shortname: 'Start', parameter_type: 1, parameter_mmin: 1, parameter_mmax: 999,
      parameter_initial_enable: 1, parameter_initial: [1], parameter_unitstyle: 0,
    }),
  },
  100, 160, [136, 72, 50, 16],
)

const dropA = ui(drop('Sample A', 'Sample A'), 20, 200, [8, 94, 86, 44])
const dropB = ui(drop('Sample B', 'Sample B'), 120, 200, [100, 94, 86, 44])
const toSampleA = obj('prepend sample A', 20, 260, 2, 1)
const toSampleB = obj('prepend sample B', 140, 260, 2, 1)
wire(dropA, 0, toSampleA)
wire(dropB, 0, toSampleB)
wire(toSampleA, 0, node)
wire(toSampleB, 0, node)

const clearBtn = ui(button('Clear samples', 'Clear'), 260, 200, [8, 144, 178, 18])
const clearDrops = msg('clear', 260, 230)
const clearSlots = msg('clear A, clear B', 320, 230)
wire(clearBtn, 0, clearDrops)
wire(clearBtn, 0, clearSlots)
wire(clearDrops, 0, dropA)
wire(clearDrops, 0, dropB)
wire(clearSlots, 0, node)

const graph = ui({ maxclass: 'fpic', autofit: 1, numinlets: 1, numoutlets: 1, outlettype: [''] }, 500, 400, [194, 6, 460, 130])
wire(readGraph, 0, graph)
const progress = ui(
  {
    maxclass: 'slider', size: 1001.0, ignoreclick: 1, orientation: 1, numinlets: 1, numoutlets: 1, outlettype: [''],
    bgcolor: [0.078, 0.035, 0.122, 1.0], knobcolor: [1.0, 0.31, 0.545, 1.0],
  },
  500, 540, [194, 138, 460, 8],
)
const statusText = ui(label('Starting engine...'), 500, 560, [194, 148, 460, 16])
wire(setStatus, 0, statusText)

// ---- Live's tempo → engine ---------------------------------------------------------------
const tempoClock = obj('metro 250 @active 1', 520, 20, 2, 1)
const transport = obj('transport', 520, 60, 2, 9)
const toTempo = obj('prepend tempo', 520, 100, 2, 1)
wire(tempoClock, 0, transport)
wire(transport, 4, toTempo)
wire(toTempo, 0, node)

// ---- song position x (beats) → buffer position (ms) ---------------------------------------
const sig = { sig: true }
const syncClock = obj('metro 20 @active 1', 700, 20, 2, 1)
const sync = obj('plugsync~', 700, 60, 1, 9, { w: 160 })
wire(syncClock, 0, sync)
const beats = obj('sig~', 760, 100, 2, 1, sig)
wire(sync, 6, beats)
const phase = obj('plugphasor~', 880, 100, 2, 2, sig)
const minusPhase = obj('-~', 760, 140, 2, 1, sig)
wire(beats, 0, minusPhase, 0)
wire(phase, 0, minusPhase, 1)
const wholeBeats = obj('round~ 1.', 760, 180, 2, 1, sig)
wire(minusPhase, 0, wholeBeats)
const x = obj('+~', 760, 220, 2, 1, sig)
wire(wholeBeats, 0, x, 0)
wire(phase, 0, x, 1)

const minusOne = obj('- 1', 100, 300, 2, 1)
const barsToBeats = obj('* 4.', 100, 330, 2, 1)
wire(startBar, 0, minusOne)
wire(minusOne, 0, barsToBeats)
const songX = obj('-~ 0.', 760, 260, 2, 1, sig)
wire(x, 0, songX, 0)
wire(barsToBeats, 0, songX, 1)
const ms = obj('*~ 400.', 760, 300, 2, 1, sig)
wire(songX, 0, ms, 0)
wire(timing, 0, ms, 1)

// ---- playback, gated by transport and buffer range ----------------------------------------
const play = add({
  maxclass: 'newobj', text: 'play~ ---mm 2', numinlets: 2, numoutlets: 3, outlettype: ['signal', 'signal', 'bang'],
  patching_rect: [760, 340, 100, 22],
})
wire(ms, 0, play)
const afterStart = obj('>=~ 0.', 880, 340, 2, 1, sig)
const beforeEnd = obj('<~ 0.', 960, 340, 2, 1, sig)
wire(ms, 0, afterStart)
wire(ms, 0, beforeEnd)
wire(timing, 1, beforeEnd, 1)
const inRange = obj('*~', 880, 380, 2, 1, sig)
wire(afterStart, 0, inRange, 0)
wire(beforeEnd, 0, inRange, 1)
const playing = obj('change', 1060, 100, 2, 3)
const fade = msg('$1 10', 1060, 140)
const fader = obj('line~', 1060, 180, 2, 2, sig)
wire(sync, 0, playing)
wire(playing, 0, fade)
wire(fade, 0, fader)
const gate = obj('*~', 880, 420, 2, 1, sig)
wire(inRange, 0, gate, 0)
wire(fader, 0, gate, 1)
const left = obj('*~', 760, 460, 2, 1, sig)
const right = obj('*~', 830, 460, 2, 1, sig)
wire(play, 0, left, 0)
wire(play, 1, right, 0)
wire(gate, 0, left, 1)
wire(gate, 0, right, 1)

const gain = ui(
  {
    maxclass: 'live.gain~', numinlets: 2, numoutlets: 5, outlettype: ['signal', 'signal', '', 'float', 'list'], parameter_enable: 1,
    ...valueof({
      parameter_longname: 'Gain', parameter_shortname: 'Gain', parameter_type: 0, parameter_mmin: -70, parameter_mmax: 6,
      parameter_initial_enable: 1, parameter_initial: [0], parameter_unitstyle: 4,
    }),
  },
  760, 500, [662, 6, 44, 158],
)
wire(left, 0, gain, 0)
wire(right, 0, gain, 1)
const out = obj('plugout~', 760, 680, 2, 2, sig)
wire(gain, 0, out, 0)
wire(gain, 1, out, 1)

// ---- progress bar under the graph ----------------------------------------------------------
const snap = obj('snapshot~ 50', 1060, 300, 2, 1)
const ratio = obj('/ 1.', 1060, 340, 2, 1)
const permille = obj('* 1000.', 1060, 380, 2, 1)
const clamp = obj('clip 0. 1000.', 1060, 420, 3, 1)
wire(ms, 0, snap)
wire(snap, 0, ratio)
wire(timing, 2, ratio, 1)
wire(ratio, 0, permille)
wire(permille, 0, clamp)
wire(clamp, 0, progress)

// ---- write the .amxd ------------------------------------------------------------------------
const patcher = {
  patcher: {
    fileversion: 1,
    appversion: { major: 8, minor: 6, revision: 0, architecture: 'x64', modernui: 1 },
    classnamespace: 'box',
    rect: [80, 100, 1300, 820],
    openrect: [0, 0, 0, 169],
    bglocked: 0,
    openinpresentation: 1,
    default_fontsize: 10,
    default_fontface: 0,
    default_fontname: 'Arial Bold',
    gridonopen: 1,
    gridsize: [8, 8],
    gridsnaponopen: 1,
    objectsnaponopen: 1,
    statusbarvisible: 2,
    toolbarvisible: 1,
    lefttoolbarpinned: 0,
    toptoolbarpinned: 0,
    righttoolbarpinned: 0,
    bottomtoolbarpinned: 0,
    toolbars_unpinned_last_save: 0,
    tallnewobj: 0,
    boxanimatetime: 500,
    enablehscroll: 1,
    enablevscroll: 1,
    devicewidth: 714,
    description: 'Write music with math: plays a song file of equations y(x), x in beats, in sync with Live.',
    digest: '',
    tags: '',
    style: '',
    subpatcher_template: '',
    title: 'MathMusic',
    latency: 0,
    project: {
      version: 1,
      creationdate: 3590052493,
      modificationdate: 3590052493,
      viewrect: [0, 0, 300, 500],
      autoorganize: 1,
      hideprojectwindow: 1,
      showdependencies: 1,
      autolocalize: 0,
      contents: { patchers: {} },
      layout: {},
      searchpath: {},
      detailsvisible: 0,
      amxdtype: 0x69696969, // 'iiii' = Max Instrument
      readonly: 0,
      devpathtype: 0,
      devpath: '.',
      sortmode: 0,
    },
    autosave: 0,
    boxes,
    lines,
    parameters: { ...parameters, inherited_shortname: 1 },
    dependency_cache: [],
  },
}

const json = Buffer.from(`${JSON.stringify(patcher, null, '\t')}\n\0`, 'utf8')
const header = Buffer.alloc(32)
header.write('ampf', 0, 'ascii')
header.writeUInt32LE(4, 4)
header.write('iiii', 8, 'ascii') // device type: instrument
header.write('meta', 12, 'ascii')
header.writeUInt32LE(4, 16)
header.writeUInt32LE(0, 20)
header.write('ptch', 24, 'ascii')
header.writeUInt32LE(json.length, 28)
fs.writeFileSync(target, Buffer.concat([header, json]))
console.log(`${target}\n${boxes.length} objects, ${lines.length} connections → node.script ${script}`)
