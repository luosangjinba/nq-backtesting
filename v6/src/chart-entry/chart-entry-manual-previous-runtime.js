import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS,
  CHART_ENTRY_MANUAL_PREVIOUS_EVENTS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, hasCommand, registerCommand } from '../runtime/commands.js';
import { resolvePlaybackPeriodStepCount } from './chart-entry-playback-period-policy.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';

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

function normalizeTimeframeMinutes(timeframe) {
  try {
    return normalizeMinuteTimeframe(timeframe, {
      fieldName: 'Chart entry manual previous timeframe',
    });
  } catch (error) {
    const message = error?.message || '';
    if (/positive minute value/.test(message)) {
      throw new Error('Chart entry manual previous timeframe must be a positive minute value.');
    }
    if (/minute-based/.test(message)) {
      throw new Error('Chart entry manual previous timeframe must be minute-based.');
    }
    throw new Error('Chart entry manual previous timeframe must be minute-based.');
  }
}

function parseReplayTimestamp(value, fieldName) {
  try {
    return normalizeUnixSeconds(value, {
      fieldName: `Chart entry manual previous ${fieldName}`,
    });
  } catch {
    throw new Error(`Chart entry manual previous ${fieldName} must be a valid date/time.`);
  }
}

function resolveSourceTimeframe(replayState = {}) {
  return normalizeTimeframeMinutes(replayState.timeframe);
}

function resolveTargetTimeframe(replayState = {}, pane = {}) {
  return normalizeTimeframeMinutes(pane.displayTimeframe || replayState.timeframe);
}

async function getPaneRecord(paneId) {
  try {
    return await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
  } catch {
    return null;
  }
}

function filterCurrentChartBars(record, cursorTimestamp) {
  return cloneBars(record?.bars)
    .filter((bar) => Number(bar.timestamp ?? bar.time) <= cursorTimestamp);
}

function createPreviousWindowPayload({
  currentRecord,
  pane = {},
  replayState,
} = {}) {
  if (!replayState?.cursorTime) {
    throw new Error('Chart entry manual previous requires replay cursor time.');
  }
  const instrument = pane.instrument || replayState?.symbol;
  if (!instrument) {
    throw new Error('Chart entry manual previous requires replay symbol.');
  }
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const targetTimeframe = resolveTargetTimeframe(replayState, pane);
  return {
    anchor: replayState.cursorTime,
    count: Math.max(
      2,
      Math.ceil(targetTimeframe / sourceTimeframe),
      Array.isArray(currentRecord?.bars) ? currentRecord.bars.length : 0,
    ),
    direction: 'backward',
    instrument: String(instrument).toUpperCase(),
    timeframe: sourceTimeframe,
  };
}

async function projectBarsIfNeeded({
  bars,
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
      bars,
      cursorTimestamp: parseReplayTimestamp(replayState.cursorTime, 'cursorTime'),
      paneId,
      sessionStartTimestamp: parseReplayTimestamp(replayState.startTime, 'startTime'),
      sourceTimeframe,
      targetTimeframe,
    });
    return {
      bars: projectionRecord.bars,
      projectionRecord,
    };
  }
  return {
    bars,
    projectionRecord: null,
  };
}

async function createReplacementBars({
  currentRecord,
  pane,
  paneId,
  replayState,
} = {}) {
  const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
  const currentBars = filterCurrentChartBars(currentRecord, cursorTimestamp);
  if (currentBars.length) {
    return {
      bars: currentBars,
      loadedWindow: null,
      projectionRecord: null,
      source: 'chart-data-filter',
    };
  }
  if (!hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW)) {
    throw new Error('Chart entry manual previous requires chart-data bars or a bar-data loader.');
  }
  const windowPayload = createPreviousWindowPayload({
    currentRecord,
    pane,
    replayState,
  });
  const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, windowPayload);
  const projected = await projectBarsIfNeeded({
    bars: loadedWindow.bars || [],
    pane,
    paneId,
    replayState,
  });
  return {
    bars: projected.bars,
    loadedWindow,
    projectionRecord: projected.projectionRecord,
    source: 'bar-data-window',
  };
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
        playbackPeriod: playbackPeriodState?.period,
        sourceTimeframe: currentReplayState?.timeframe,
      });
      let replayState = null;
      const chartRecords = [];
      const loadedWindows = [];
      let replacedBarCount = 0;
      for (let index = 0; index < stepCount; index += 1) {
        replayState = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
        for (const paneId of paneIds) {
          const pane = await getPaneRecord(paneId);
          const currentRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId });
          const replacement = await createReplacementBars({
            currentRecord,
            pane: pane || {},
            paneId,
            replayState,
          });
          const cursorTimestamp = parseReplayTimestamp(replayState.cursorTime, 'cursorTime');
          const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
            bars: replacement.bars,
            cursorTimestamp,
            paneId,
          });
          chartRecords.push(chartRecord);
          replacedBarCount += chartRecord.bars.length;
          loadedWindows.push({
            barCount: Array.isArray(replacement.loadedWindow?.bars)
              ? replacement.loadedWindow.bars.length
              : 0,
            cacheHit: Boolean(replacement.loadedWindow?.cacheHit),
            key: replacement.loadedWindow?.key || null,
            paneId,
            projectionSource: summarizeProjectionSource(replacement.projectionRecord),
            source: replacement.source,
          });
        }
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
