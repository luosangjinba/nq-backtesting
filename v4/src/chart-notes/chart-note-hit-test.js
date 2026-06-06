import * as chart from '../chart/chart-manager.js';
import { getBarChartTime } from '../chart/time-projection.js';
import * as store from '../data/bar-store.js';
import { getReplayVisibleBars } from '../ui/replay-controls.js';
import { getChartNotes } from './chart-note-store.js';
import { CHART_NOTE_DEFAULT_OPTIONS } from './chart-note-primitive.js';
import { formatChartNoteDisplayText } from './chart-note-format.js';

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

function ellipsizeText(ctx, text, maxWidth) {
  const value = String(text || '').trim();
  if (!value || ctx.measureText(value).width <= maxWidth) return value;
  const ellipsis = '...';
  let output = value;
  while (output.length > 1 && ctx.measureText(output + ellipsis).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}${ellipsis}`;
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const value = String(text || '').trim();
  if (!value) return [];
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  const pushLongWord = (word) => {
    let chunk = '';
    Array.from(word).forEach((char) => {
      if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
        lines.push(chunk);
        chunk = char;
        return;
      }
      chunk += char;
    });
    return chunk;
  };

  words.forEach((word) => {
    if (lines.length >= maxLines) return;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = ctx.measureText(word).width > maxWidth ? pushLongWord(word) : word;
  });
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && ctx.measureText(lines[lines.length - 1]).width > maxWidth) {
    lines[lines.length - 1] = ellipsizeText(ctx, lines[lines.length - 1], maxWidth);
  }
  return lines;
}

function buildHitPoints(options, expandedNoteId = '') {
  const timeframe = store.getCurrentTimeframe();
  const bars = getRenderableBars();
  const barByTimestamp = new Map(
    bars
      .filter((bar) => Number.isFinite(Number(bar?.timestamp)))
      .map((bar) => [Number(bar.timestamp), bar])
  );

  return getChartNotes()
    .filter((note) => !note.display?.hidden)
    .filter((note) => note.instrument === DEFAULT_INSTRUMENT)
    .filter((note) => Number(note.timeframe) === Number(timeframe))
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
        note,
        text: formatChartNoteDisplayText(note),
        anchorX,
        anchorY,
      };
    })
    .filter(Boolean)
    .reduce((layouts, point) => {
      const ctx = getMeasureContext(options);
      const isExpanded = expandedNoteId && point.note.id === expandedNoteId;
      const lines = isExpanded
        ? wrapText(ctx, point.text, options.expandedMaxWidth, options.expandedMaxLines)
        : [ellipsizeText(ctx, point.text, options.maxWidth)];
      if (!lines.length || !lines[0]) return layouts;
      const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
      const lineHeight = options.lineHeight;
      const textHeight = Math.max(lineHeight, lines.length * lineHeight);
      const boxWidth = textWidth + options.paddingX * 2;
      const boxHeight = textHeight + options.paddingY * 2;
      const chartEl = document.getElementById('chart');
      const canvasWidth = chartEl?.clientWidth || 0;
      const boxX = Math.round(Math.min(Math.max(4, point.anchorX - boxWidth / 2), canvasWidth - boxWidth - 4));
      const previous = layouts[layouts.length - 1];
      const boxY = previous
        ? Math.round(previous.boxY + previous.boxHeight + options.rowGap)
        : Math.round(options.topOffset);
      layouts.push({
        ...point,
        boxX,
        boxY,
        boxWidth,
        boxHeight,
      });
      return layouts;
    }, []);
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
