import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand, hasCommand as hasRuntimeCommand } from '../runtime/commands.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function normalizeTimeframe(timeframe) {
  return normalizeMinuteTimeframe(timeframe, { fieldName: 'Replay cursor replacement timeframe' });
}

function parseTimestamp(value, fieldName) {
  return normalizeUnixSeconds(value, { fieldName: `Replay cursor replacement ${fieldName}` });
}

async function getPane(dispatchCommand, paneId) {
  try {
    return await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
  } catch {
    return null;
  }
}

function createWindowPayload({ currentRecord, pane, replayState }) {
  const sourceTimeframe = normalizeTimeframe(replayState.timeframe);
  const targetTimeframe = normalizeTimeframe(pane.displayTimeframe || replayState.timeframe);
  const instrument = pane.instrument || replayState.symbol;
  if (!instrument) throw new Error('Replay cursor replacement requires replay symbol.');
  return {
    anchor: replayState.cursorTime,
    count: Math.max(2, Math.ceil(targetTimeframe / sourceTimeframe), currentRecord?.bars?.length || 0),
    direction: 'backward',
    instrument: String(instrument).toUpperCase(),
    timeframe: sourceTimeframe,
  };
}

async function projectBars({ bars, dispatchCommand, hasCommand, pane, paneId, replayState }) {
  const sourceTimeframe = normalizeTimeframe(replayState.timeframe);
  const targetTimeframe = normalizeTimeframe(pane.displayTimeframe || replayState.timeframe);
  if (targetTimeframe <= sourceTimeframe || !hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)) {
    return { bars, projectionRecord: null, sourceBars: bars };
  }
  const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
    bars,
    cursorTimestamp: parseTimestamp(replayState.cursorTime, 'cursorTime'),
    paneId,
    sessionStartTimestamp: parseTimestamp(replayState.startTime, 'startTime'),
    sourceTimeframe,
    targetTimeframe,
  });
  return { bars: projectionRecord.bars, projectionRecord, sourceBars: bars };
}

async function resolveReplacement({ dispatchCommand, hasCommand, pane, paneId, replayState }) {
  const cursorTimestamp = parseTimestamp(replayState.cursorTime, 'cursorTime');
  const currentRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId });
  const currentBars = cloneBars(currentRecord?.bars)
    .filter((bar) => Number(bar.timestamp ?? bar.time) <= cursorTimestamp);
  if (currentBars.length) {
    return { bars: currentBars, loadedWindow: null, projectionRecord: null, sourceBars: currentBars, source: 'chart-data-filter' };
  }
  if (!hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW)) {
    throw new Error('Replay cursor replacement requires chart-data bars or a bar-data loader.');
  }
  const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, createWindowPayload({
    currentRecord,
    pane,
    replayState,
  }));
  const projected = await projectBars({
    bars: loadedWindow.bars || [],
    dispatchCommand,
    hasCommand,
    pane,
    paneId,
    replayState,
  });
  return { ...projected, loadedWindow, source: 'bar-data-window' };
}

export async function replaceReplayCursorAcrossPanes({
  dispatchCommand = dispatchRuntimeCommand,
  hasCommand = hasRuntimeCommand,
  paneIds = ['main'],
  replayState,
} = {}) {
  if (!replayState?.cursorTime) throw new Error('Replay cursor replacement requires replay cursor time.');
  const chartRecords = [];
  const loadedWindows = [];
  let replacedBarCount = 0;
  for (const paneId of paneIds) {
    const pane = await getPane(dispatchCommand, paneId);
    const replacement = await resolveReplacement({
      dispatchCommand,
      hasCommand,
      pane: pane || {},
      paneId,
      replayState,
    });
    const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
      bars: replacement.bars,
      cursorTimestamp: parseTimestamp(replayState.cursorTime, 'cursorTime'),
      paneId,
      sourceBars: replacement.sourceBars,
    });
    chartRecords.push(chartRecord);
    replacedBarCount += chartRecord.bars.length;
    loadedWindows.push({
      barCount: replacement.loadedWindow?.bars?.length || 0,
      cacheHit: Boolean(replacement.loadedWindow?.cacheHit),
      key: replacement.loadedWindow?.key || null,
      paneId,
      projectionSource: summarizeProjectionSource(replacement.projectionRecord),
      source: replacement.source,
    });
  }
  return { chartRecords, loadedWindows, replacedBarCount };
}
