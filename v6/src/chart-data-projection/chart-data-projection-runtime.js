import {
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_PROJECTION_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { projectSourceBarsToChartData } from './chart-data-projection-domain.js';

function normalizePaneId(value) {
  const paneId = String(value || '').trim();
  if (!paneId) {
    throw new Error('Chart data projection paneId must be a non-empty string.');
  }
  return paneId;
}

function cloneBar(bar) {
  return { ...bar };
}

function cloneBucket(bucket) {
  return { ...bucket };
}

function cloneProjectionRecord(record) {
  if (!record) return null;
  return {
    bars: record.bars.map(cloneBar),
    buckets: record.buckets.map(cloneBucket),
    cursorTimestamp: record.cursorTimestamp,
    paneId: record.paneId,
    projectionRevision: record.projectionRevision,
    sessionStartTimestamp: record.sessionStartTimestamp,
    sourceBarCount: record.sourceBarCount,
    sourceTimeframe: record.sourceTimeframe,
    targetTimeframe: record.targetTimeframe,
  };
}

function createInitialState() {
  return {
    lastProjection: null,
    projectionRevision: 0,
  };
}

export function createChartDataProjectionRuntime() {
  const unregisterCallbacks = [];
  let state = createInitialState();

  function getState() {
    return {
      lastProjection: cloneProjectionRecord(state.lastProjection),
      projectionRevision: state.projectionRevision,
    };
  }

  function project(payload = {}, emitEvent) {
    const paneId = normalizePaneId(payload.paneId);
    const sourceBars = Array.isArray(payload.bars) ? payload.bars : [];
    const projection = projectSourceBarsToChartData({
      bars: sourceBars,
      cursorTimestamp: payload.cursorTimestamp ?? null,
      sessionStartTimestamp: payload.sessionStartTimestamp ?? null,
      sourceTimeframe: payload.sourceTimeframe ?? 1,
      targetTimeframe: payload.targetTimeframe ?? 1,
    });
    const record = {
      bars: projection.bars.map(cloneBar),
      buckets: projection.buckets.map(cloneBucket),
      cursorTimestamp: payload.cursorTimestamp ?? null,
      paneId,
      projectionRevision: state.projectionRevision + 1,
      sessionStartTimestamp: payload.sessionStartTimestamp ?? null,
      sourceBarCount: sourceBars.length,
      sourceTimeframe: projection.sourceTimeframe,
      targetTimeframe: projection.targetTimeframe,
    };
    state = {
      lastProjection: record,
      projectionRevision: record.projectionRevision,
    };
    const snapshot = cloneProjectionRecord(record);
    emitEvent?.(CHART_DATA_PROJECTION_EVENTS.PROJECTED, snapshot);
    return snapshot;
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, (payload = {}) => project(payload, emitEvent)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = createInitialState();
  }

  return {
    id: 'runtime.chart-data-projection',
    start,
    stop,
  };
}
