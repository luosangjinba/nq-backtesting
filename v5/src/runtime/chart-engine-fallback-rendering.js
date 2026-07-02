import { formatCandleTitle } from '../domain/chart-formatting.js';
import { formatDisplayTimestamp } from '../domain/timezone-format.js';
import { timestampSeconds } from './chart-engine-context.js';

export function createRuntimeCanvas(documentRef) {
  const canvas = documentRef.createElement('div');
  canvas.className = 'chart-runtime-canvas';
  canvas.dataset.chartCanvas = 'true';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chart runtime canvas');
  return canvas;
}

export function formatChartBarTime(bar, context) {
  if (typeof bar.time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bar.time)) {
    return bar.time;
  }
  return formatDisplayTimestamp(bar.time, {
    displayTimezone: context.displayTimezone,
    exchangeTimezone: context.exchangeTimezone,
    timeFormat: context.timeFormat,
    dateFormat: context.dateFormat,
    showDayOfWeekLabels: context.showDayOfWeekLabels,
  });
}

export function renderFallbackBars(documentRef, canvas, bars, context, fullBarCount = bars.length) {
  const plot = documentRef.createElement('div');
  plot.className = 'chart-bar-plot';
  plot.dataset.chartBarCount = String(bars.length);
  plot.dataset.fullChartBarCount = String(fullBarCount);

  const values = bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  bars.forEach((bar) => {
    const candle = documentRef.createElement('div');
    const top = ((max - bar.high) / range) * 100;
    const height = Math.max(((bar.high - bar.low) / range) * 100, 4);
    const isUp = bar.close >= bar.open;
    candle.className = `chart-candle ${isUp ? 'is-up' : 'is-down'}`;
    candle.style.top = `${top}%`;
    candle.style.height = `${height}%`;
    candle.style.backgroundColor = isUp ? context.candleStyle.body.up : context.candleStyle.body.down;
    candle.style.borderColor = isUp ? context.candleStyle.border.up : context.candleStyle.border.down;
    candle.title = formatCandleTitle(bar, {
      timeText: formatChartBarTime(bar, context),
    });
    plot.append(candle);
  });

  canvas.append(plot);
}

export function visibleBarsForRange(bars, range) {
  if (!range) return [...bars];
  return bars.filter((bar) => {
    const timestamp = timestampSeconds(bar.time, 'chart visible readout bar time');
    return timestamp >= range.from && timestamp <= range.to;
  });
}

export function renderHiddenDebugBars(documentRef, debugPlot, bars, context, fullBarCount = bars.length) {
  debugPlot.replaceChildren();
  if (!bars.length) return;
  renderFallbackBars(documentRef, debugPlot, bars, context, fullBarCount);
  const plot = debugPlot.children[0];
  plot.dataset.chartDebugPlot = 'true';
  plot.style.display = 'none';
}

export function inferVisibleRangeFromBars(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart fallback bar time'))
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
  };
}

export function rangeSpanSeconds(range) {
  if (!range) return 0;
  return Math.max(1, range.to - range.from);
}
