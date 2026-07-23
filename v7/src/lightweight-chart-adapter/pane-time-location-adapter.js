import { planPaneTimeLocation } from '../pane-time-location-domain/public.js';

function exactDisplayBar(bars, displayEpochMs) {
  let low = 0;
  let high = bars.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = bars[middle];
    if (candidate.displayEpochMs === displayEpochMs) return candidate;
    if (candidate.displayEpochMs < displayEpochMs) low = middle + 1;
    else high = middle - 1;
  }
  return null;
}

/** Adapt exact chart coordinates and semantic market-time plans without owning chart state. */
export function createPaneTimeLocationChartPort({
  applyVisibleRange,
  chart,
  readBars,
  readTimeframeDurationMs,
}) {
  return Object.freeze({
    locateMarketTime(marketEpochMs) {
      const bars = readBars();
      const range = chart.timeScale().getVisibleLogicalRange();
      const durationMs = readTimeframeDurationMs();
      if (!range || durationMs === null) {
        return Object.freeze({
          marketEpochMs,
          reason: 'target-not-ready',
          status: 'unavailable',
        });
      }
      const plan = planPaneTimeLocation({
        marketEpochMs,
        targetTimeline: bars.map(({ displayEpochMs, startEpochMs }) => ({
          displayEpochMs,
          startEpochMs,
        })),
        targetVisibleRange: range,
        timeframeDurationMs: durationMs,
      });
      if (plan.status === 'located') applyVisibleRange({ from: plan.from, to: plan.to }, plan);
      return plan;
    },
    resolveSelection(coordinateX) {
      if (!Number.isFinite(coordinateX)) return null;
      const time = chart.timeScale().coordinateToTime(coordinateX);
      if (typeof time !== 'number') return null;
      const displayEpochMs = Math.round(time * 1_000);
      const bar = exactDisplayBar(readBars(), displayEpochMs);
      if (!bar) return null;
      return Object.freeze({
        displayEpochMs: bar.displayEpochMs,
        marketEpochMs: bar.startEpochMs,
      });
    },
  });
}
