import {
  CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS,
  CHART_ENTRY_MANUAL_PREVIOUS_EVENTS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { resolvePlaybackPeriodStepCount } from './chart-entry-playback-period-policy.js';
import { replaceReplayCursorAcrossPanes } from '../replay/replay-cursor-pane-replacer.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneRecord(record) {
  return record ? {
    ...record,
    bars: Array.isArray(record.bars) ? cloneBars(record.bars) : record.bars,
  } : null;
}

function cloneRewound(rewound) {
  return rewound ? {
    chartRecord: cloneRecord(rewound.chartRecord),
    chartRecords: Array.isArray(rewound.chartRecords)
      ? rewound.chartRecords.map(cloneRecord)
      : [],
    loadedWindow: rewound.loadedWindow ? { ...rewound.loadedWindow } : null,
    loadedWindows: Array.isArray(rewound.loadedWindows)
      ? rewound.loadedWindows.map((windowRecord) => ({ ...windowRecord }))
      : [],
    playbackPeriod: rewound.playbackPeriod,
    replayState: rewound.replayState ? { ...rewound.replayState } : null,
    replacedBarCount: rewound.replacedBarCount,
    sessionId: rewound.sessionId,
    stepCount: rewound.stepCount,
  } : null;
}

function normalizePaneId(value = 'main') {
  const paneId = String(value || 'main').trim();
  if (!paneId) {
    throw new Error('Chart entry manual previous paneId must be a non-empty string.');
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

export function createChartEntryManualPreviousRuntime() {
  const unregisterCallbacks = [];
  let state = {
    error: null,
    rewound: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      rewound: cloneRewound(state.rewound),
      status: state.status,
    };
  }

  async function previous(payload = {}, emitEvent) {
    try {
      const paneIds = normalizePaneIds(payload);
      const currentReplayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      const playbackPeriodState = await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE);
      const stepCount = resolvePlaybackPeriodStepCount({
        cursorTimestamp: Date.parse(currentReplayState?.cursorTime) / 1000,
        direction: 'previous',
        playbackPeriod: playbackPeriodState?.period,
        sourceTimeframe: currentReplayState?.timeframe,
      });
      let replayState = null;
      const chartRecords = [];
      const loadedWindows = [];
      let replacedBarCount = 0;
      for (let index = 0; index < stepCount; index += 1) {
        replayState = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
        const replacement = await replaceReplayCursorAcrossPanes({ paneIds, replayState });
        chartRecords.push(...replacement.chartRecords);
        loadedWindows.push(...replacement.loadedWindows);
        replacedBarCount += replacement.replacedBarCount;
        if (replayState.cursorIndex <= 0) break;
      }
      state = {
        error: null,
        rewound: {
          chartRecord: chartRecords.at(0) || null,
          chartRecords,
          loadedWindow: loadedWindows.at(-1) || null,
          loadedWindows,
          playbackPeriod: playbackPeriodState?.period || '1m',
          replayState,
          replacedBarCount,
          sessionId: replayState?.sessionId || null,
          stepCount,
        },
        status: 'rewound',
      };
      emitEvent?.(CHART_ENTRY_MANUAL_PREVIOUS_EVENTS.REWOUND, getState().rewound);
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        rewound: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS, (payload) => previous(payload, emitEvent)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      error: null,
      rewound: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryManualPrevious',
    start,
    stop,
  };
}
