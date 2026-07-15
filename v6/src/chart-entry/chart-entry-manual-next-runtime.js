import {
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { appendReplayCursorAcrossPanes } from '../replay/replay-cursor-pane-materializer.js';
import { advanceReplayToNextSourceBar } from '../replay/replay-forward-source-cursor-resolver.js';
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
    diagnostics: advanced.diagnostics ? { ...advanced.diagnostics } : null,
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

export function createChartEntryManualNextRuntime({
  now = () => performance.now(),
} = {}) {
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
    const startedAt = now();
    try {
      const paneIds = normalizePaneIds(payload);
      const currentReplayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      const playbackPeriodState = await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE);
      const setupCompletedAt = now();
      const stepCount = resolvePlaybackPeriodStepCount({
        cursorTimestamp: Date.parse(currentReplayState?.cursorTime) / 1000,
        direction: 'next',
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
      let replayState = currentReplayState;
      const chartRecords = [];
      const loadedWindows = [];
      let appendedBarCount = 0;
      let materializationMs = 0;
      let sourceAdvanceMs = 0;
      for (let index = 0; index < stepCount; index += 1) {
        const firstPane = await getPaneRecord(paneIds[0]);
        const sourceAdvanceStartedAt = now();
        replayState = await advanceReplayToNextSourceBar({
          pane: firstPane || {},
          replayState,
        });
        sourceAdvanceMs += now() - sourceAdvanceStartedAt;
        const materializationStartedAt = now();
        const materialized = await appendReplayCursorAcrossPanes({
          paneIds,
          replayState,
        });
        materializationMs += now() - materializationStartedAt;
        chartRecords.push(...materialized.chartRecords);
        appendedBarCount += materialized.appendedBarCount;
        loadedWindows.push(...materialized.loadedWindows);
        if (replayState.status === 'ended') break;
      }
      state = {
        advanced: {
          appendedBarCount,
          chartRecord: chartRecords.at(0) || null,
          chartRecords,
          diagnostics: {
            materializationMs,
            setupMs: setupCompletedAt - startedAt,
            sourceAdvanceMs,
            totalMs: now() - startedAt,
          },
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
