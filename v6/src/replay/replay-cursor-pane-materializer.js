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

const REPLAY_RANGE_CHUNK_MAX_SOURCE_BARS = 40_000;

function mergeSourceBars(windows = []) {
  const byTimestamp = new Map();
  windows.flatMap((record) => cloneBars(record?.bars || []))
    .sort((left, right) => Number(left.timestamp ?? left.time) - Number(right.timestamp ?? right.time))
    .forEach((bar) => {
      byTimestamp.set(Number(bar.timestamp ?? bar.time), bar);
    });
  return [...byTimestamp.values()];
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
  if (pane.displayTimeframe === null || pane.displayTimeframe === undefined) {
    return resolveSourceTimeframe(replayState);
  }
  const value = pane.displayTimeframe;
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
  const count = targetTimeframe === sourceTimeframe
    ? 1
    : isSessionAwareDisplayTimeframe(targetTimeframe)
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

function createRangeWindowPayloads(replayState, pane = {}, fromCursorTime) {
  const fromTimestamp = parseReplayTimestamp(fromCursorTime, 'fromCursorTime');
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  if (fromTimestamp >= cursorTimestamp) {
    throw new Error('Replay cursor materialization range must advance forward.');
  }
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const sourceStepSeconds = sourceTimeframe * 60;
  const instrument = pane.instrument || replayState.symbol;
  if (!instrument) {
    throw new Error('Replay cursor materialization requires replay symbol.');
  }
  const payloads = [];
  for (
    let anchorTimestamp = fromTimestamp + sourceStepSeconds;
    anchorTimestamp <= cursorTimestamp;
  ) {
    const remainingBars = Math.floor((cursorTimestamp - anchorTimestamp) / sourceStepSeconds) + 1;
    const count = Math.min(remainingBars, REPLAY_RANGE_CHUNK_MAX_SOURCE_BARS);
    payloads.push({
      anchor: new Date(anchorTimestamp * 1000).toISOString(),
      count,
      direction: 'forward',
      instrument: String(instrument).toUpperCase(),
      timeframe: sourceTimeframe,
    });
    anchorTimestamp += count * sourceStepSeconds;
  }
  return payloads;
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
  range = false,
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
      bars: range ? cloneBars(projectionRecord.bars) : pickCursorProjectionBars(projectionRecord, replayState),
      projectionRecord,
      sourceBars: range ? cloneBars(loadedWindow.bars) : pickCursorBars(loadedWindow, replayState),
    };
  }

  const sourceBars = range ? cloneBars(loadedWindow.bars) : pickCursorBars(loadedWindow, replayState);
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

async function loadMaterializationWindow({
  dispatchCommand,
  fromCursorTime,
  pane,
  replayState,
}) {
  const payloads = fromCursorTime
    ? createRangeWindowPayloads(replayState, pane, fromCursorTime)
    : [createCursorWindowPayload(replayState, pane)];
  const windows = [];
  for (const payload of payloads) {
    windows.push(await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, payload));
  }
  return {
    bars: mergeSourceBars(windows),
    windows,
  };
}

export async function appendReplayCursorAcrossPanes({
  dispatchCommand = dispatchRuntimeCommand,
  fromCursorTime = null,
  hasCommand = hasRuntimeCommand,
  paneIds = ['main'],
  replayState,
} = {}) {
  const chartRecords = [];
  const loadedWindows = [];
  let appendedBarCount = 0;

  for (const paneId of paneIds) {
    const pane = await getPaneRecord(dispatchCommand, paneId);
    const loadedWindow = await loadMaterializationWindow({
      dispatchCommand,
      fromCursorTime,
      pane: pane || {},
      replayState,
    });
    const cursorBars = await createCursorBars({
      dispatchCommand,
      hasCommand,
      loadedWindow,
      pane: pane || {},
      paneId,
      range: Boolean(fromCursorTime),
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
      cacheHit: loadedWindow.windows.every((window) => Boolean(window?.cacheHit)),
      key: loadedWindow.windows.length === 1 ? loadedWindow.windows[0]?.key || null : null,
      paneId,
      projectionSource: summarizeProjectionSource(cursorBars.projectionRecord),
      windowCount: loadedWindow.windows.length,
    });
  }

  return {
    appendedBarCount,
    chartRecords,
    loadedWindows,
  };
}
