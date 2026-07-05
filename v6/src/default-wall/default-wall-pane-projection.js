import { projectBarsToDisplayTimeframe } from '../display-timeframe/display-timeframe-projection.js';
import {
  createDefaultWallChartAppendPayload,
  createDefaultWallChartReplacePayload,
} from './default-wall-replay.js';

function normalizeTimeframe(value = 1) {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error('Default wall pane displayTimeframe must be a positive integer.');
  }
  return timeframe;
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
  return Object.freeze({
    bars: projectBarsToDisplayTimeframe({
      bars: state.chartBars,
      cursorTimestamp: state.latestBar?.timestamp ?? null,
      sourceTimeframe: source,
      targetTimeframe,
    }),
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
