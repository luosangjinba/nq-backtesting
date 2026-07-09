import { projectSourceBarsToChartData } from '../chart-data-projection/chart-data-projection-domain.js';
import { normalizeMinuteTimeframe } from '../time-domain/time-domain.js';
import {
  createDefaultWallChartAppendPayload,
  createDefaultWallChartReplacePayload,
} from './default-wall-replay.js';

function normalizeTimeframe(value = 1) {
  return normalizeMinuteTimeframe(value, {
    allowSuffix: false,
    fieldName: 'Default wall pane displayTimeframe',
  });
}

export function createDefaultWallPaneReplacePayload(state, {
  displayTimeframe = 1,
  sourceTimeframe = 1,
} = {}) {
  const targetTimeframe = normalizeTimeframe(displayTimeframe);
  const source = normalizeTimeframe(sourceTimeframe);
  if (targetTimeframe === source) {
    return createDefaultWallChartReplacePayload(state);
  }
  const projection = projectSourceBarsToChartData({
    bars: state.chartBars,
    cursorTimestamp: state.latestBar?.timestamp ?? null,
    sessionStartTimestamp: 0,
    sourceTimeframe: source,
    targetTimeframe,
  });
  return Object.freeze({
    bars: projection.bars,
    cursorTimestamp: state.latestBar?.timestamp ?? null,
    paneId: state.paneId,
  });
}

export function createDefaultWallPaneNextOperation(state, {
  displayTimeframe = 1,
  sourceTimeframe = 1,
} = {}) {
  const targetTimeframe = normalizeTimeframe(displayTimeframe);
  const source = normalizeTimeframe(sourceTimeframe);
  if (targetTimeframe === source) {
    return Object.freeze({
      operation: 'append',
      payload: createDefaultWallChartAppendPayload(state),
    });
  }
  return Object.freeze({
    operation: 'replace',
    payload: createDefaultWallPaneReplacePayload(state, {
      displayTimeframe: targetTimeframe,
      sourceTimeframe: source,
    }),
  });
}
