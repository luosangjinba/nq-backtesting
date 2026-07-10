import {
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';

function latestTimestamp(record = {}) {
  const bar = record.bars?.at?.(-1);
  const value = bar?.timestamp ?? bar?.time;
  try {
    return normalizeUnixSeconds(value, {
      fieldName: 'Display timeframe latest source bar timestamp',
    });
  } catch (_error) {
    return null;
  }
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
    const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, {
      paneId: targetPane.id,
    });
    const cursorTimestamp = latestTimestamp(sourceRecord);
    const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
      bars: sourceRecord.bars,
      cursorTimestamp,
      instrument: targetPane.instrument,
      paneId: targetPane.id,
      sessionStartTimestamp: 0,
      sourceTimeframe,
      targetTimeframe: displayTimeframe,
    });
    const pane = await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
      displayTimeframe,
      paneId: targetPane.id,
    });
    const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
      bars: projectionRecord.bars,
      cursorTimestamp,
      paneId: targetPane.id,
      preserveSource: true,
    });
    const viewportRecord = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
      paneId: targetPane.id,
    });
    const result = {
      chartRecord,
      pane,
      projectionSource: summarizeProjectionSource(projectionRecord),
      sourceBarCount: sourceRecord.bars.length,
      targetBarCount: projectionRecord.bars.length,
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
