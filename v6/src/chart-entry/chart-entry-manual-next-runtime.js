import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { resolvePlaybackPeriodStepCount } from './chart-entry-playback-period-policy.js';

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
  const match = String(timeframe || '').trim().match(/^(\d+)(m)?$/i);
  if (!match) {
    throw new Error('Chart entry manual next timeframe must be minute-based.');
  }
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error('Chart entry manual next timeframe must be a positive minute value.');
  }
  return minutes;
}

function createNextWindowPayload(replayState, pane = {}) {
  if (!replayState?.cursorTime) {
    throw new Error('Chart entry manual next requires replay cursor time.');
  }
  const instrument = pane.instrument || replayState?.symbol;
  if (!instrument) {
    throw new Error('Chart entry manual next requires replay symbol.');
  }
  const timeframe = pane.displayTimeframe || replayState.timeframe;
  return {
    anchor: replayState.cursorTime,
    count: 2,
    direction: 'backward',
    instrument: String(instrument).toUpperCase(),
    timeframe: normalizeTimeframeMinutes(timeframe),
  };
}

function pickCursorBars(record, replayState) {
  const bars = cloneBars(record?.bars);
  if (!bars.length) {
    throw new Error('Chart entry manual next loaded window did not include bars.');
  }
  const cursorTimestamp = Math.floor(new Date(replayState.cursorTime).valueOf() / 1000);
  const exact = bars.filter((bar) => Number(bar.timestamp ?? bar.time) === cursorTimestamp);
  return exact.length ? exact : bars.slice(-1);
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
        for (const paneId of paneIds) {
          const pane = await getPaneRecord(paneId);
          const windowPayload = createNextWindowPayload(replayState, pane || {});
          const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, windowPayload);
          const bars = pickCursorBars(loadedWindow, replayState);
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
