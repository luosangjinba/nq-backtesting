import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, hasCommand, registerCommand } from '../runtime/commands.js';
import { resolvePlaybackPeriodStepCount } from './chart-entry-playback-period-policy.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixSeconds,
  normalizeUnixMilliseconds,
  summarizeProjectionSource,
  TIME_DOMAIN_CONSTANTS,
} from '../time-domain/time-domain.js';

const GAP_SCAN_WINDOW_BARS = 240;
const GAP_SCAN_LIMIT = 24;

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneRecord(record) {
  return record ? {
    ...record,
    bars: Array.isArray(record.bars) ? cloneBars(record.bars) : record.bars,
  } : null;
}

function cloneAdvanced(advanced) {
  return advanced ? {
    chartRecord: cloneRecord(advanced.chartRecord),
    chartRecords: Array.isArray(advanced.chartRecords)
      ? advanced.chartRecords.map(cloneRecord)
      : [],
    appendedBarCount: advanced.appendedBarCount,
    loadedWindow: advanced.loadedWindow ? { ...advanced.loadedWindow } : null,
    loadedWindows: Array.isArray(advanced.loadedWindows)
      ? advanced.loadedWindows.map((windowRecord) => ({ ...windowRecord }))
      : [],
    playbackPeriod: advanced.playbackPeriod,
    replayState: advanced.replayState ? { ...advanced.replayState } : null,
    sessionId: advanced.sessionId,
    stepCount: advanced.stepCount,
  } : null;
}

function createEndedAdvanced({
  playbackPeriod,
  replayState,
  stepCount,
}) {
  return {
    appendedBarCount: 0,
    chartRecord: null,
    chartRecords: [],
    loadedWindow: null,
    loadedWindows: [],
    playbackPeriod,
    replayState,
    sessionId: replayState?.sessionId || null,
    stepCount,
  };
}

function normalizeTimeframeMinutes(timeframe) {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      fieldName: 'Chart entry manual next timeframe',
    });
  } catch (error) {
    const message = error?.message || '';
    if (/positive minute value/.test(message)) {
      throw new Error('Chart entry manual next timeframe must be a positive minute value.');
    }
    if (/minute-based/.test(message)) {
      throw new Error('Chart entry manual next timeframe must be minute-based.');
    }
    throw new Error('Chart entry manual next timeframe must be minute-based.');
  }
}

function parseReplayTimestamp(value, fieldName) {
  try {
    return normalizeUnixSeconds(value, {
      fieldName: `Chart entry manual next ${fieldName}`,
    });
  } catch {
    throw new Error(`Chart entry manual next ${fieldName} must be a valid date/time.`);
  }
}

function parseReplayMilliseconds(value, fieldName) {
  try {
    return normalizeUnixMilliseconds(value, {
      fieldName: `Chart entry manual next ${fieldName}`,
    });
  } catch {
    throw new Error(`Chart entry manual next ${fieldName} must be a valid date/time.`);
  }
}

function resolveSourceTimeframe(replayState = {}) {
  return normalizeTimeframeMinutes(replayState.timeframe);
}

function resolveTargetTimeframe(replayState = {}, pane = {}) {
  return normalizeTimeframeMinutes(pane.displayTimeframe || replayState.timeframe);
}

function createNextWindowPayload(replayState, pane = {}) {
  if (!replayState?.cursorTime) {
    throw new Error('Chart entry manual next requires replay cursor time.');
  }
  const instrument = pane.instrument || replayState?.symbol;
  if (!instrument) {
    throw new Error('Chart entry manual next requires replay symbol.');
  }
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const targetTimeframe = resolveTargetTimeframe(replayState, pane);
  return {
    anchor: replayState.cursorTime,
    count: Math.max(2, Math.ceil(targetTimeframe / sourceTimeframe)),
    direction: 'backward',
    instrument: String(instrument).toUpperCase(),
    timeframe: sourceTimeframe,
  };
}

function pickCursorBars(record, replayState) {
  const bars = cloneBars(record?.bars);
  if (!bars.length) {
    throw new Error('Chart entry manual next loaded window did not include bars.');
  }
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  const exact = bars.filter((bar) => Number(bar.timestamp ?? bar.time) === cursorTimestamp);
  return exact.length ? exact : bars.slice(-1);
}

function hasExactCursorBar(record, replayState) {
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  return cloneBars(record?.bars).some((bar) => Number(bar.timestamp ?? bar.time) === cursorTimestamp);
}

function firstBarAfterCursor(record, replayState) {
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  return cloneBars(record?.bars)
    .filter((bar) => Number(bar.timestamp ?? bar.time) > cursorTimestamp)
    .sort((left, right) => Number(left.timestamp ?? left.time) - Number(right.timestamp ?? right.time))
    .at(0) || null;
}

function createForwardGapWindowPayload(replayState, pane = {}, anchorMs) {
  const instrument = pane.instrument || replayState?.symbol;
  if (!instrument) {
    throw new Error('Chart entry manual next requires replay symbol.');
  }
  return {
    anchor: new Date(anchorMs).toISOString(),
    count: GAP_SCAN_WINDOW_BARS,
    direction: 'forward',
    instrument: String(instrument).toUpperCase(),
    timeframe: resolveSourceTimeframe(replayState),
  };
}

function pickCursorProjectionBars(record, replayState) {
  const bars = cloneBars(record?.bars);
  if (!bars.length) {
    throw new Error('Chart entry manual next projection did not include bars.');
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

async function createAppendBars({
  loadedWindow,
  pane,
  paneId,
  replayState,
} = {}) {
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const targetTimeframe = resolveTargetTimeframe(replayState, pane);
  if (
    targetTimeframe > sourceTimeframe
    && hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)
  ) {
    const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
      bars: loadedWindow.bars,
      cursorTimestamp: parseReplayTimestamp(replayState.cursorTime, 'cursorTime'),
      paneId,
      sessionStartTimestamp: parseReplayTimestamp(replayState.startTime, 'startTime'),
      sourceTimeframe,
      targetTimeframe,
    });
    return {
      bars: pickCursorProjectionBars(projectionRecord, replayState),
      projectionRecord,
    };
  }

  return {
    bars: pickCursorBars(loadedWindow, replayState),
    projectionRecord: null,
  };
}

async function alignReplayStateToNextAvailableBar(replayState, pane = {}) {
  if (!hasCommand(REPLAY_COMMANDS.SET_CURSOR_TIME)) {
    return replayState;
  }
  const cursorMs = parseReplayMilliseconds(replayState.cursorTime, 'cursorTime');
  const endMs = parseReplayMilliseconds(replayState.endTime, 'endTime');
  if (cursorMs >= endMs) {
    return replayState;
  }
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  let anchorMs = cursorMs + (sourceTimeframe * TIME_DOMAIN_CONSTANTS.MINUTE_MS);
  for (let gapScanIndex = 0; gapScanIndex < GAP_SCAN_LIMIT && anchorMs <= endMs; gapScanIndex += 1) {
    const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, createForwardGapWindowPayload(
      replayState,
      pane,
      anchorMs,
    ));
    const nextBar = firstBarAfterCursor(loadedWindow, replayState);
    if (nextBar) {
      return dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: new Date(Number(nextBar.timestamp ?? nextBar.time) * 1000).toISOString(),
      });
    }
    anchorMs += GAP_SCAN_WINDOW_BARS * sourceTimeframe * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  }
  return dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, {
    cursorTime: replayState.endTime,
  });
}

function normalizePaneId(value = 'main') {
  const paneId = String(value || 'main').trim();
  if (!paneId) {
    throw new Error('Chart entry manual next paneId must be a non-empty string.');
  }
  return paneId;
}

function normalizePaneIds(payload = {}) {
  if (Array.isArray(payload.paneIds)) {
    const ids = payload.paneIds.map(normalizePaneId);
    return [...new Set(ids)];
  }
  return [normalizePaneId(payload.paneId)];
}

async function getPaneRecord(paneId) {
  try {
    return await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
  } catch {
    return null;
  }
}

export function createChartEntryManualNextRuntime() {
  const unregisterCallbacks = [];
  let state = {
    advanced: null,
    error: null,
    status: 'idle',
  };

  function getState() {
    return {
      advanced: cloneAdvanced(state.advanced),
      error: state.error,
      status: state.status,
    };
  }

  async function next(payload = {}, emitEvent) {
    try {
      const paneIds = normalizePaneIds(payload);
      const currentReplayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      const playbackPeriodState = await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE);
      const stepCount = resolvePlaybackPeriodStepCount({
        playbackPeriod: playbackPeriodState?.period,
        sourceTimeframe: currentReplayState?.timeframe,
      });
      if (currentReplayState?.status === 'ended') {
        state = {
          advanced: createEndedAdvanced({
            playbackPeriod: playbackPeriodState?.period || '1m',
            replayState: currentReplayState,
            stepCount,
          }),
          error: null,
          status: 'ended',
        };
        return getState();
      }
      let replayState = null;
      const chartRecords = [];
      const loadedWindows = [];
      let appendedBarCount = 0;
      for (let index = 0; index < stepCount; index += 1) {
        replayState = await dispatchCommand(REPLAY_COMMANDS.NEXT);
        const firstPane = await getPaneRecord(paneIds[0]);
        const firstWindowPayload = createNextWindowPayload(replayState, firstPane || {});
        let firstLoadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, firstWindowPayload);
        if (!hasExactCursorBar(firstLoadedWindow, replayState)) {
          replayState = await alignReplayStateToNextAvailableBar(replayState, firstPane || {});
          firstLoadedWindow = null;
        }
        for (const paneId of paneIds) {
          const pane = await getPaneRecord(paneId);
          const windowPayload = createNextWindowPayload(replayState, pane || {});
          const loadedWindow = firstLoadedWindow && paneId === paneIds[0]
            ? firstLoadedWindow
            : await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, windowPayload);
          const appendBars = await createAppendBars({
            loadedWindow,
            pane: pane || {},
            paneId,
            replayState,
          });
          const bars = appendBars.bars;
          const cursorTimestamp = Number(bars.at(-1)?.timestamp ?? bars.at(-1)?.time);
          const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.APPEND_BARS, {
            bars,
            cursorTimestamp,
            paneId,
          });
          chartRecords.push(chartRecord);
          appendedBarCount += bars.length;
          loadedWindows.push({
            barCount: Array.isArray(loadedWindow?.bars) ? loadedWindow.bars.length : 0,
            cacheHit: Boolean(loadedWindow?.cacheHit),
            key: loadedWindow?.key || null,
            paneId,
            projectionSource: summarizeProjectionSource(appendBars.projectionRecord),
          });
        }
        if (replayState.status === 'ended') break;
      }
      state = {
        advanced: {
          appendedBarCount,
          chartRecord: chartRecords.at(0) || null,
          chartRecords,
          loadedWindow: loadedWindows.at(-1) || null,
          loadedWindows,
          playbackPeriod: playbackPeriodState?.period || '1m',
          replayState,
          sessionId: replayState.sessionId,
          stepCount,
        },
        error: null,
        status: 'advanced',
      };
      emitEvent?.(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED, getState().advanced);
      return getState();
    } catch (error) {
      state = {
        advanced: null,
        error: error?.message || String(error),
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, (payload) => next(payload, emitEvent)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      advanced: null,
      error: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryManualNext',
    start,
    stop,
  };
}
