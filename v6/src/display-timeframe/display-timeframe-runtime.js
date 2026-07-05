import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { projectBarsToDisplayTimeframe } from './display-timeframe-projection.js';

function latestTimestamp(record = {}) {
  const timestamp = record.bars?.at?.(-1)?.timestamp;
  return Number.isFinite(Number(timestamp)) ? Number(timestamp) : null;
}

export function createDisplayTimeframeRuntime({
  sourceTimeframe = 1,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};

  async function applyDisplayTimeframe({
    displayTimeframe,
    paneId,
  } = {}) {
    const targetPane = paneId
      ? await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId)
      : await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
    if (!targetPane) {
      throw new Error('Display timeframe target pane does not exist.');
    }
    const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, {
      paneId: targetPane.id,
    });
    const cursorTimestamp = latestTimestamp(sourceRecord);
    const projectedBars = projectBarsToDisplayTimeframe({
      bars: sourceRecord.bars,
      cursorTimestamp,
      sourceTimeframe,
      targetTimeframe: displayTimeframe,
    });
    const pane = await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
      displayTimeframe,
      paneId: targetPane.id,
    });
    const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
      bars: projectedBars,
      cursorTimestamp,
      paneId: targetPane.id,
    });
    const viewportRecord = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
      paneId: targetPane.id,
    });
    const result = {
      chartRecord,
      pane,
      sourceBarCount: sourceRecord.bars.length,
      targetBarCount: projectedBars.length,
      viewportRecord,
    };
    emit(DISPLAY_TIMEFRAME_EVENTS.APPLIED, result);
    return result;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, applyDisplayTimeframe),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
  }

  return {
    id: 'runtime.display-timeframe',
    start,
    stop,
  };
}
