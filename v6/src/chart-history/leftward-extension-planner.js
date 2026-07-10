import { planCanvasLeftOlderWindow } from '../bar-data/bar-window.js';
import {
  assertDisplayTimeframeMultiple,
  normalizeMinuteTimeframe,
  normalizeUnixSeconds,
  TIME_DOMAIN_CONSTANTS,
} from '../time-domain/time-domain.js';
import {
  estimateSessionAwareSourceBarCount,
  normalizeSessionAwareDisplayTimeframe,
} from '../time-domain/htf-display-timeframe-domain.js';

const LEFTWARD_SOURCE_BAR_LIMIT = 2500;
const HIGH_TF_PREFETCH_BUCKETS = 10;

function normalizeInstrument(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('Leftward history extension requires an instrument.');
  }
  return normalized;
}

function normalizeVisibleFrom(visibleRange = {}) {
  const normalized = Number(visibleRange?.from);
  if (!Number.isFinite(normalized)) {
    throw new Error('Leftward history extension visible range must include finite from.');
  }
  return normalized;
}

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function oldestTimestamp(bars = []) {
  const timestamps = cloneBars(bars)
    .map((bar) => {
      try {
        return normalizeUnixSeconds(bar.timestamp ?? bar.time, {
          fieldName: 'Leftward history bar timestamp',
        });
      } catch {
        return null;
      }
    })
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  if (!timestamps.length) {
    throw new Error('Leftward history extension requires bars with finite timestamps.');
  }
  return timestamps[0];
}

export function planLeftwardSourceWindow({
  bars = [],
  displayTimeframe,
  instrument,
  sourceTimeframe,
  visibleRange,
} = {}) {
  const visibleFrom = normalizeVisibleFrom(visibleRange);
  const source = normalizeMinuteTimeframe(sourceTimeframe, {
    fieldName: 'Leftward history sourceTimeframe',
  });
  const sessionAwareDisplay = normalizeSessionAwareDisplayTimeframe(displayTimeframe);
  const display = sessionAwareDisplay || normalizeMinuteTimeframe(displayTimeframe ?? source, {
    fieldName: 'Leftward history displayTimeframe',
  });
  if (!sessionAwareDisplay) {
    assertDisplayTimeframeMultiple({
      message: 'Leftward history displayTimeframe must be a multiple of sourceTimeframe.',
      sourceTimeframe: source,
      targetTimeframe: display,
    });
  }
  const leftBoundaryIndex = visibleFrom < 0
    ? Math.min(-1, !sessionAwareDisplay && display > source ? Math.floor(visibleFrom) : Math.ceil(visibleFrom))
    : Math.floor(visibleFrom);
  if (leftBoundaryIndex >= 0) {
    return {
      leftBoundaryIndex,
      reason: 'canvas-left-inside-loaded-window',
      status: 'ignored',
    };
  }

  const oldestDisplayTimestamp = oldestTimestamp(bars);
  const displaySourceBars = sessionAwareDisplay
    ? estimateSessionAwareSourceBarCount({
      count: 1,
      sourceBarLimit: LEFTWARD_SOURCE_BAR_LIMIT,
      targetTimeframe: sessionAwareDisplay,
    })
    : display / source;
  const displaySeconds = displaySourceBars * source * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS;
  const canvasLeftTimestamp = oldestDisplayTimestamp + (
    leftBoundaryIndex * displaySeconds
  );
  const prefetchSourceBars = !sessionAwareDisplay && display < 60
    ? 0
    : Math.min(
      LEFTWARD_SOURCE_BAR_LIMIT,
      Math.max(1, Math.ceil(displaySourceBars)) * HIGH_TF_PREFETCH_BUCKETS,
    );
  const prefetchLeftTimestamp = prefetchSourceBars > 0
    ? oldestDisplayTimestamp - (prefetchSourceBars * source * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS)
    : canvasLeftTimestamp;
  const requestLeftTimestamp = Math.min(
    canvasLeftTimestamp,
    prefetchLeftTimestamp,
  );
  const plannedWindow = planCanvasLeftOlderWindow({
    canvasLeftTimestamp: requestLeftTimestamp,
    instrument: normalizeInstrument(instrument),
    oldestLoadedTimestamp: oldestDisplayTimestamp,
    timeframe: source,
  }, { maxBarsPerWindow: LEFTWARD_SOURCE_BAR_LIMIT });
  if (plannedWindow.exhausted) {
    return {
      leftBoundaryIndex,
      plannedWindow,
      reason: plannedWindow.reason || 'history-exhausted',
      status: 'ignored',
    };
  }
  return {
    displayTimeframe: display,
    leftBoundaryIndex,
    oldestDisplayTimestamp,
    plannedWindow,
    sourceTimeframe: source,
    status: 'planned',
  };
}
