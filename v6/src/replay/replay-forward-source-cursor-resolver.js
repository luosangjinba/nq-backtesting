import { BAR_DATA_COMMANDS, REPLAY_COMMANDS } from '../contracts/app-contracts.js';
import {
  dispatchCommand as dispatchRuntimeCommand,
  hasCommand as hasRuntimeCommand,
} from '../runtime/commands.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixMilliseconds,
  normalizeUnixSeconds,
  TIME_DOMAIN_CONSTANTS,
} from '../time-domain/time-domain.js';

export const REPLAY_FORWARD_SOURCE_CURSOR_DEFAULTS = Object.freeze({
  gapScanLimit: 24,
  gapScanWindowBars: 240,
});

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function normalizeSourceTimeframe(timeframe) {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      fieldName: 'Replay forward source cursor timeframe',
    });
  } catch (error) {
    const message = error?.message || '';
    if (/positive minute value/.test(message)) {
      throw new Error('Replay forward source cursor timeframe must be a positive minute value.');
    }
    throw new Error('Replay forward source cursor timeframe must be minute-based.');
  }
}

function parseReplayMilliseconds(value, fieldName) {
  try {
    return normalizeUnixMilliseconds(value, {
      fieldName: `Replay forward source cursor ${fieldName}`,
    });
  } catch {
    throw new Error(`Replay forward source cursor ${fieldName} must be a valid date/time.`);
  }
}

function parseReplayTimestamp(value, fieldName) {
  try {
    return normalizeUnixSeconds(value, {
      fieldName: `Replay forward source cursor ${fieldName}`,
    });
  } catch {
    throw new Error(`Replay forward source cursor ${fieldName} must be a valid date/time.`);
  }
}

function resolveInstrument(replayState = {}, pane = {}) {
  const instrument = pane.instrument || replayState.symbol;
  if (!instrument) {
    throw new Error('Replay forward source cursor requires replay symbol.');
  }
  return String(instrument).toUpperCase();
}

function firstBarAfterCursor(record, replayState) {
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  return cloneBars(record?.bars)
    .filter((bar) => Number(bar.timestamp ?? bar.time) > cursorTimestamp)
    .sort((left, right) => Number(left.timestamp ?? left.time) - Number(right.timestamp ?? right.time))
    .at(0) || null;
}

function createForwardWindowPayload({
  anchorMs,
  gapScanWindowBars,
  pane,
  replayState,
  sourceTimeframe,
}) {
  return {
    anchor: new Date(anchorMs).toISOString(),
    count: gapScanWindowBars,
    direction: 'forward',
    instrument: resolveInstrument(replayState, pane),
    timeframe: sourceTimeframe,
  };
}

export async function resolveNextReplaySourceBar({
  dispatchCommand = dispatchRuntimeCommand,
  gapScanLimit = REPLAY_FORWARD_SOURCE_CURSOR_DEFAULTS.gapScanLimit,
  gapScanWindowBars = REPLAY_FORWARD_SOURCE_CURSOR_DEFAULTS.gapScanWindowBars,
  pane = {},
  replayState,
} = {}) {
  const cursorMs = parseReplayMilliseconds(replayState?.cursorTime, 'cursorTime');
  const endMs = parseReplayMilliseconds(replayState?.endTime, 'endTime');
  if (cursorMs >= endMs) return null;

  const sourceTimeframe = normalizeSourceTimeframe(replayState?.timeframe);
  const stepMs = sourceTimeframe * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  let anchorMs = cursorMs + stepMs;
  for (let scanIndex = 0; scanIndex < gapScanLimit && anchorMs <= endMs; scanIndex += 1) {
    const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, createForwardWindowPayload({
      anchorMs,
      gapScanWindowBars,
      pane,
      replayState,
      sourceTimeframe,
    }));
    const bar = firstBarAfterCursor(loadedWindow, replayState);
    if (bar) {
      return {
        bar,
        loadedWindow,
        scanCount: scanIndex + 1,
      };
    }
    anchorMs += gapScanWindowBars * stepMs;
  }
  return null;
}

export async function advanceReplayToNextSourceBar({
  dispatchCommand = dispatchRuntimeCommand,
  gapScanLimit,
  gapScanWindowBars,
  hasCommand = hasRuntimeCommand,
  pane = {},
  replayState,
} = {}) {
  if (!hasCommand(REPLAY_COMMANDS.SET_CURSOR_TIME)) {
    return dispatchCommand(REPLAY_COMMANDS.NEXT);
  }
  const cursorMs = parseReplayMilliseconds(replayState?.cursorTime, 'cursorTime');
  const endMs = parseReplayMilliseconds(replayState?.endTime, 'endTime');
  if (cursorMs >= endMs) return replayState;

  const resolved = await resolveNextReplaySourceBar({
    dispatchCommand,
    gapScanLimit,
    gapScanWindowBars,
    pane,
    replayState,
  });
  const cursorTime = resolved
    ? new Date(Number(resolved.bar.timestamp ?? resolved.bar.time) * 1000).toISOString()
    : replayState.endTime;
  return dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, { cursorTime });
}
