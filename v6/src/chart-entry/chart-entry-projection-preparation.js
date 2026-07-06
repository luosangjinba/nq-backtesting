import { createDefaultWallPaneReplacePayload } from '../default-wall/default-wall-pane-projection.js';
import { createDefaultWallReplayState } from '../default-wall/default-wall-replay.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Chart entry projection ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`Chart entry projection ${fieldName} must be a non-negative integer.`);
  }
  return normalized;
}

function normalizeText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Chart entry projection ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function parseCursorTimestamp(cursorTime) {
  const timestamp = Math.floor(new Date(normalizeText(cursorTime, 'cursorTime')).valueOf() / 1000);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Chart entry projection cursorTime must be a valid date/time.');
  }
  return timestamp;
}

function findCursorBarIndex(bars, cursorTime) {
  const cursorTimestamp = parseCursorTimestamp(cursorTime);
  const exactIndex = bars.findIndex((bar) => Number(bar.timestamp ?? bar.time) === cursorTimestamp);
  if (exactIndex >= 0) return exactIndex;
  let nearestPastIndex = -1;
  bars.forEach((bar, index) => {
    if (Number(bar.timestamp ?? bar.time) <= cursorTimestamp) {
      nearestPastIndex = index;
    }
  });
  if (nearestPastIndex >= 0) return nearestPastIndex;
  throw new Error('Chart entry projection cached bars do not cover replay cursor.');
}

function normalizeSourceTimeframe(plan, cacheRecord) {
  return normalizePositiveInteger(
    plan?.context?.loadedWindow?.timeframe
      ?? plan?.context?.plannedWindow?.timeframe
      ?? cacheRecord?.timeframe
      ?? 1,
    'sourceTimeframe',
  );
}

function summarizeCacheRecord(cacheRecord) {
  return {
    barCount: Array.isArray(cacheRecord?.bars) ? cacheRecord.bars.length : 0,
    cacheHit: Boolean(cacheRecord?.cacheHit),
    key: cacheRecord?.key || null,
    window: cacheRecord ? {
      bounded: Boolean(cacheRecord.bounded),
      end: cacheRecord.end,
      estimatedBars: cacheRecord.estimatedBars,
      instrument: cacheRecord.instrument,
      start: cacheRecord.start,
      timeframe: cacheRecord.timeframe,
    } : null,
  };
}

function summarizeWallState(wallState) {
  return {
    chartBarCount: wallState.chartBars.length,
    cursorIndex: wallState.cursorIndex,
    forwardBarCount: wallState.forwardBars.length,
    latestBar: wallState.latestBar ? { ...wallState.latestBar } : null,
    paneId: wallState.paneId,
    projection: { ...wallState.projection },
    settings: { ...wallState.settings },
  };
}

export function createChartEntryProjectionPreparation(plan, cacheRecord, {
  displayTimeframe = null,
} = {}) {
  if (!plan) {
    throw new Error('Chart entry projection plan is required.');
  }
  const bars = cloneBars(cacheRecord?.bars);
  if (!bars.length) {
    throw new Error('Chart entry projection requires cached bars.');
  }
  const sourceTimeframe = normalizeSourceTimeframe(plan, cacheRecord);
  const targetTimeframe = displayTimeframe === null
    ? sourceTimeframe
    : normalizePositiveInteger(displayTimeframe, 'displayTimeframe');
  const wallState = createDefaultWallReplayState({
    bars,
    latestOffsetBars: normalizeNonNegativeInteger(plan.latestOffsetBars, 'latestOffsetBars'),
    paneId: normalizeText(plan.paneId, 'paneId'),
    prefixBars: normalizeNonNegativeInteger(plan.prefixBars, 'prefixBars'),
    spanBars: normalizePositiveInteger(plan.spanBars, 'spanBars'),
    startIndex: findCursorBarIndex(bars, plan.cursorTime),
  });
  const chartReplacePayload = createDefaultWallPaneReplacePayload(wallState, {
    displayTimeframe: targetTimeframe,
    sourceTimeframe,
  });

  return Object.freeze({
    chartReplacePayload: Object.freeze({
      ...chartReplacePayload,
      bars: Object.freeze(cloneBars(chartReplacePayload.bars)),
    }),
    owner: 'runtime.chartEntryProjectionPreparation',
    replayCursorTime: plan.cursorTime,
    sessionId: normalizeText(plan.sessionId, 'sessionId'),
    source: Object.freeze(summarizeCacheRecord(cacheRecord)),
    status: 'prepared',
    viewportIntentPayload: Object.freeze({
      cursorTimestamp: wallState.latestBar?.timestamp ?? null,
      latestOffsetBars: wallState.settings.latestOffsetBars,
      paneId: wallState.paneId,
    }),
    wallPlan: Object.freeze({
      anchor: plan.anchor,
      paneId: plan.paneId,
      prefixBars: plan.prefixBars,
      spanBars: plan.spanBars,
    }),
    wallState: Object.freeze(summarizeWallState(wallState)),
  });
}
