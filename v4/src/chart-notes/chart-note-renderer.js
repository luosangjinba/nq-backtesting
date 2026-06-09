import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { getBarChartTime } from '../chart/time-projection.js';
import { getReplayVisibleBars } from '../ui/replay-controls.js';
import { getChartNotes } from './chart-note-store.js';
import { ChartNotePrimitive, getChartNoteOptions } from './chart-note-primitive.js';
import { formatChartNoteDisplayText } from './chart-note-format.js';
import { getVisibleChartNoteDateKey, isChartNoteInDate } from './chart-note-visible-day.js';
import { createRafThrottle } from '../utils/raf-throttle.js';

const DEFAULT_INSTRUMENT = 'NQ';
const CHART_NOTE_FLASH_DURATION_MS = 900;

let renderedPrimitive = null;
let flashFrame = null;

function clearRenderedNotes() {
  clearChartNoteFlash();
  if (!renderedPrimitive) return;
  chart.detachPrimitive(renderedPrimitive);
  renderedPrimitive = null;
}

export function clearChartNoteFlash() {
  if (flashFrame !== null) {
    cancelAnimationFrame(flashFrame);
    flashFrame = null;
  }
  renderedPrimitive?.clearFlash?.();
}

function getRenderableBars() {
  const replayBars = getReplayVisibleBars();
  return Array.isArray(replayBars) ? replayBars : store.getDisplayBars();
}

function buildNotePoints() {
  const timeframe = store.getCurrentTimeframe();
  const bars = getRenderableBars();
  const visibleDateKey = getVisibleChartNoteDateKey(bars);
  const barByTimestamp = new Map(
    bars
      .filter((bar) => Number.isFinite(Number(bar?.timestamp)))
      .map((bar) => [Number(bar.timestamp), bar])
  );

  return getChartNotes()
    .filter((note) => !note.display?.hidden)
    .filter((note) => note.instrument === DEFAULT_INSTRUMENT)
    .filter((note) => Number(note.timeframe) === Number(timeframe))
    .filter((note) => isChartNoteInDate(note, visibleDateKey))
    .map((note) => {
      if (note.kind === 'range') {
        const startTimestamp = Number(note.startTimestamp || note.timestamp);
        const endTimestamp = Number(note.endTimestamp || note.timestamp);
        const rangeBars = bars.filter((bar) => {
          const timestamp = Number(bar?.timestamp);
          return Number.isFinite(timestamp) && timestamp >= startTimestamp && timestamp <= endTimestamp;
        });
        if (!rangeBars.length) return null;
        const highs = rangeBars.map((bar) => Number(bar.high)).filter(Number.isFinite);
        if (!highs.length) return null;
        const middleBar = rangeBars[Math.floor(rangeBars.length / 2)];
        return {
          id: note.id,
          time: getBarChartTime(middleBar, timeframe),
          rangeStartTime: getBarChartTime(rangeBars[0], timeframe),
          rangeEndTime: getBarChartTime(rangeBars[rangeBars.length - 1], timeframe),
          price: Math.max(...highs),
          text: formatChartNoteDisplayText(note),
          color: note.color,
          position: 'above',
          kind: 'range',
        };
      }
      const bar = barByTimestamp.get(Number(note.timestamp));
      if (!bar) return null;
      const position = note.position === 'below' ? 'below' : 'above';
      const price = position === 'below' ? Number(bar.low) : Number(bar.high);
      if (!Number.isFinite(price)) return null;
      return {
        id: note.id,
        time: getBarChartTime(bar, timeframe),
        price,
        text: formatChartNoteDisplayText(note),
        color: note.color,
        position,
      };
    })
    .filter(Boolean);
}

export function renderChartNotes() {
  clearRenderedNotes();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const notes = buildNotePoints();
  if (!notes.length) return;

  renderedPrimitive = new ChartNotePrimitive(chartInstance, series, notes, getChartNoteOptions());
  chart.attachPrimitive(renderedPrimitive);
  renderedPrimitive.requestUpdate();
}

export function flashChartNote(noteId) {
  if (!renderedPrimitive?.hasNote?.(noteId)) return false;

  clearChartNoteFlash();
  const startedAt = performance.now();
  const tick = (now) => {
    if (!renderedPrimitive) return;
    const progress = Math.min(1, (now - startedAt) / CHART_NOTE_FLASH_DURATION_MS);
    renderedPrimitive.setFlash(noteId, progress);
    if (progress < 1) {
      flashFrame = requestAnimationFrame(tick);
      return;
    }
    clearChartNoteFlash();
  };
  flashFrame = requestAnimationFrame(tick);
  return true;
}

export function setExpandedChartNote(noteId) {
  renderedPrimitive?.setExpandedNote?.(noteId || '');
}

const renderChartNotesOnReplay = createRafThrottle(renderChartNotes);

export function initChartNoteRenderer() {
  bus.on('chart-notes:changed', renderChartNotes);
  bus.on('bars:loaded', renderChartNotes);
  bus.on('replay:changed', renderChartNotesOnReplay);
  bus.on('display-preferences:changed', renderChartNotes);
  bus.on('bars:cleared', clearRenderedNotes);
}
