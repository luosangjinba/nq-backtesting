import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import {
  dispatchCommand as dispatchRuntimeCommand,
  hasCommand as hasRuntimeCommand,
} from '../runtime/commands.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';
import {
  isSessionAwareDisplayTimeframe,
  normalizeDisplayTimeframeValue,
} from '../time-domain/htf-display-timeframe-domain.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function normalizeTimeframeMinutes(timeframe) {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      fieldName: 'Replay cursor materialization timeframe',
    });
  } catch (error) {
    const message = error?.message || '';
    if (/positive minute value/.test(message)) {
      throw new Error('Replay cursor materialization timeframe must be a positive minute value.');
    }
    throw new Error('Replay cursor materialization timeframe must be minute-based.');
  }
}

function parseReplayTimestamp(value, fieldName) {
  try {
    return normalizeUnixSeconds(value, {
      fieldName: `Replay cursor materialization ${fieldName}`,
    });
  } catch {
    throw new Error(`Replay cursor materialization ${fieldName} must be a valid date/time.`);
  }
}

function resolveSourceTimeframe(replayState = {}) {
  return normalizeTimeframeMinutes(replayState.timeframe);
}

function resolveTargetTimeframe(replayState = {}, pane = {}) {
  const value = pane.displayTimeframe || replayState.timeframe;
  if (isSessionAwareDisplayTimeframe(value)) {
    return normalizeDisplayTimeframeValue(value);
  }
  return normalizeTimeframeMinutes(value);
}

function createCursorWindowPayload(replayState, pane = {}) {
  if (!replayState?.cursorTime) {
    throw new Error('Replay cursor materialization requires replay cursor time.');
  }
  const instrument = pane.instrument || replayState.symbol;
  if (!instrument) {
    throw new Error('Replay cursor materialization requires replay symbol.');
  }
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const targetTimeframe = resolveTargetTimeframe(replayState, pane);
  const count = isSessionAwareDisplayTimeframe(targetTimeframe)
    ? 2
    : Math.max(2, Math.ceil(targetTimeframe / sourceTimeframe));
  return {
    anchor: replayState.cursorTime,
    count,
    direction: 'backward',
    instrument: String(instrument).toUpperCase(),
    timeframe: sourceTimeframe,
  };
}

function pickCursorBars(record, replayState) {
  const bars = cloneBars(record?.bars);
  if (!bars.length) {
    throw new Error('Replay cursor materialization loaded window did not include bars.');
  }
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  const exact = bars.filter((bar) => Number(bar.timestamp ?? bar.time) === cursorTimestamp);
  return exact.length ? exact : bars.slice(-1);
}

function pickCursorProjectionBars(record, replayState) {
  const bars = cloneBars(record?.bars);
  if (!bars.length) {
    throw new Error('Replay cursor materialization projection did not include bars.');
  }
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  const bucket = record?.buckets?.find((item) => (
    cursorTimestamp >= Number(item.bucketStartTimestamp)
    && cursorTimestamp <= Number(item.bucketEndTimestamp)
  ));
  if (bucket) {
    const bucketTimestamp = Number(bucket.bucketStartTimestamp);
    const bucketBar = bars.find((bar) => Number(bar.timestamp ?? bar.time) === bucketTimestamp);
    if (bucketBar) return [bucketBar];
  }
  return bars.slice(-1);
}

async function createCursorBars({
  dispatchCommand,
  hasCommand,
  loadedWindow,
  pane,
  paneId,
  replayState,
}) {
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const targetTimeframe = resolveTargetTimeframe(replayState, pane);
  if (
    (isSessionAwareDisplayTimeframe(targetTimeframe) || targetTimeframe > sourceTimeframe)
    && hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)
  ) {
    const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
      bars: loadedWindow.bars,
      cursorTimestamp: parseReplayTimestamp(replayState.cursorTime, 'cursorTime'),
      instrument: pane.instrument || replayState.symbol || null,
      paneId,
      sessionStartTimestamp: parseReplayTimestamp(replayState.startTime, 'startTime'),
      sourceTimeframe,
      targetTimeframe,
    });
    return {
      bars: pickCursorProjectionBars(projectionRecord, replayState),
      projectionRecord,
      sourceBars: pickCursorBars(loadedWindow, replayState),
    };
  }

  const sourceBars = pickCursorBars(loadedWindow, replayState);
  return {
    bars: sourceBars,
    projectionRecord: null,
    sourceBars,
  };
}

async function getPaneRecord(dispatchCommand, paneId) {
  try {
    return await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
  } catch {
    return null;
  }
}

export async function appendReplayCursorAcrossPanes({
  dispatchCommand = dispatchRuntimeCommand,
  hasCommand = hasRuntimeCommand,
  paneIds = ['main'],
  replayState,
} = {}) {
  const chartRecords = [];
  const loadedWindows = [];
  let appendedBarCount = 0;

  for (const paneId of paneIds) {
    const pane = await getPaneRecord(dispatchCommand, paneId);
    const loadedWindow = await dispatchCommand(
      BAR_DATA_COMMANDS.LOAD_WINDOW,
      createCursorWindowPayload(replayState, pane || {}),
    );
    const cursorBars = await createCursorBars({
      dispatchCommand,
      hasCommand,
      loadedWindow,
      pane: pane || {},
      paneId,
      replayState,
    });
    const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.APPEND_BARS, {
      bars: cursorBars.bars,
      cursorTimestamp: parseReplayTimestamp(replayState.cursorTime, 'cursorTime'),
      paneId,
      sourceBars: cursorBars.sourceBars,
    });
    chartRecords.push(chartRecord);
    appendedBarCount += cursorBars.bars.length;
    loadedWindows.push({
      barCount: Array.isArray(loadedWindow?.bars) ? loadedWindow.bars.length : 0,
      cacheHit: Boolean(loadedWindow?.cacheHit),
      key: loadedWindow?.key || null,
      paneId,
      projectionSource: summarizeProjectionSource(cursorBars.projectionRecord),
    });
  }

  return {
    appendedBarCount,
    chartRecords,
    loadedWindows,
  };
}
