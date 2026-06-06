import * as chart from '../chart/chart-manager.js';
import { getBarChartTime } from '../chart/time-projection.js';
import * as store from '../data/bar-store.js';
import { getReplayVisibleBars } from '../ui/replay-controls.js';
import { getChartNotes } from './chart-note-store.js';
import { CHART_NOTE_DEFAULT_OPTIONS } from './chart-note-primitive.js';
import { formatChartNoteDisplayText } from './chart-note-format.js';
import { buildChartNoteLayouts } from './chart-note-layout.js';
import { getActiveChartNoteDateKey, isChartNoteInDate } from './chart-note-visible-day.js';

const DEFAULT_INSTRUMENT = 'NQ';
const HIT_PADDING_PX = 4;

let measureContext = null;

function getMeasureContext(options) {
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d');
  }
  measureContext.font = options.font;
  return measureContext;
}

function getRenderableBars() {
  const replayBars = getReplayVisibleBars();
  return Array.isArray(replayBars) ? replayBars : store.getDisplayBars();
}

function buildHitPoints(options, expandedNoteId = '') {
  const timeframe = store.getCurrentTimeframe();
  const bars = getRenderableBars();
  const activeDateKey = getActiveChartNoteDateKey(bars);
  const barByTimestamp = new Map(
    bars
      .filter((bar) => Number.isFinite(Number(bar?.timestamp)))
      .map((bar) => [Number(bar.timestamp), bar])
  );

  const points = getChartNotes()
    .filter((note) => !note.display?.hidden)
    .filter((note) => note.instrument === DEFAULT_INSTRUMENT)
    .filter((note) => Number(note.timeframe) === Number(timeframe))
    .filter((note) => isChartNoteInDate(note, activeDateKey))
    .map((note) => {
      const bar = barByTimestamp.get(Number(note.timestamp));
      if (!bar) return null;
      const position = note.position === 'below' ? 'below' : 'above';
      const price = position === 'below' ? Number(bar.low) : Number(bar.high);
      if (!Number.isFinite(price)) return null;
      const time = getBarChartTime(bar, timeframe);
      const anchorX = chart.timeToCoordinate(time);
      const anchorY = chart.priceToCoordinate(price);
      if (anchorX === null || anchorY === null) return null;
      return {
        id: note.id,
        note,
        text: formatChartNoteDisplayText(note),
        x: anchorX,
        y: anchorY,
      };
    })
    .filter(Boolean)
    .map((point) => ({ ...point, note: point.note }));

  const chartEl = document.getElementById('chart');
  const ctx = getMeasureContext(options);
  return buildChartNoteLayouts(points, options, {
    ctx,
    canvasWidth: chartEl?.clientWidth || 0,
    expandedNoteId,
  });
}

export function hitTestChartNotes({ x, y, options = CHART_NOTE_DEFAULT_OPTIONS, expandedNoteId = '' } = {}) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  const hits = buildHitPoints(options, expandedNoteId)
    .map((point) => {
      const left = point.boxX - HIT_PADDING_PX;
      const right = point.boxX + point.boxWidth + HIT_PADDING_PX;
      const top = point.boxY - HIT_PADDING_PX;
      const bottom = point.boxY + point.boxHeight + HIT_PADDING_PX;
      if (x < left || x > right || y < top || y > bottom) return null;
      const centerX = point.boxX + point.boxWidth / 2;
      const centerY = point.boxY + point.boxHeight / 2;
      return {
        id: point.note.id,
        note: point.note,
        type: 'chart-note',
        distance: Math.hypot(x - centerX, y - centerY),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  return hits[0] || null;
}
