import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import {
  formatApiTime,
  makeBarWindowKey,
  planCanvasLeftOlderWindow,
  windowBoundsMs,
} from '../bar-data/bar-window.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneWindow(window) {
  return window ? { ...window } : null;
}

function cloneRecord(record) {
  return record ? {
    ...record,
    bars: Array.isArray(record.bars) ? cloneBars(record.bars) : record.bars,
  } : null;
}

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Leftward history extension paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeVisibleFrom(payload = {}) {
  const value = payload.visibleRange?.from ?? payload.from;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error('Leftward history extension visible range must include finite from.');
  }
  return normalized;
}

function normalizeTimeframeMinutes(value) {
  const match = String(value || '').trim().match(/^(\d+)(m)?$/i);
  if (!match) {
    throw new Error('Leftward history extension timeframe must be minute-based.');
  }
  const normalized = Number(match[1]);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error('Leftward history extension timeframe must be a positive minute value.');
  }
  return normalized;
}

function replayCursorTimestamp(replayState = {}) {
  if (!replayState?.cursorTime) return null;
  const timestamp = Math.floor(new Date(replayState.cursorTime).valueOf() / 1000);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function optionalCommand(command, payload) {
  try {
    return await dispatchCommand(command, payload);
  } catch {
    return null;
  }
}

function inferStepSeconds(bars = [], fallbackTimeframeMinutes = 1) {
  const sorted = cloneBars(bars).sort((left, right) => left.timestamp - right.timestamp);
  for (let index = 1; index < sorted.length; index += 1) {
    const diff = Number(sorted[index].timestamp) - Number(sorted[index - 1].timestamp);
    if (Number.isFinite(diff) && diff > 0) return diff;
  }
  return normalizeTimeframeMinutes(fallbackTimeframeMinutes) * 60;
}

function summarizeLoadedWindow(record = {}) {
  return {
    barCount: Array.isArray(record.bars) ? record.bars.length : 0,
    cacheHit: Boolean(record.cacheHit),
    history: record.history ? { ...record.history } : null,
    key: record.key || null,
  };
}

function cloneExtension(extension) {
  return extension ? {
    chartRecord: cloneRecord(extension.chartRecord),
    loadedWindow: extension.loadedWindow ? { ...extension.loadedWindow } : null,
    paneId: extension.paneId,
    plannedWindow: cloneWindow(extension.plannedWindow),
    prependedBarCount: extension.prependedBarCount,
    reason: extension.reason || null,
    status: extension.status,
  } : null;
}

function createRequestKey(paneId, plannedWindow) {
  return `${paneId}|${makeBarWindowKey(plannedWindow)}`;
}

function createExhaustedScopeKey(paneId, plannedWindow) {
  return [
    paneId,
    plannedWindow.instrument,
    plannedWindow.timeframe,
  ].join('|');
}

function oldestLoadedTimestampMs(bars = []) {
  const timestamps = cloneBars(bars)
    .map((bar) => Number(bar.timestamp ?? bar.time))
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  const oldest = timestamps[0];
  return oldest > 10_000_000_000 ? oldest : oldest * 1000;
}

function exhaustedThroughTimestampMs(plannedWindow, loadedBars, stepSeconds) {
  const oldestLoadedMs = oldestLoadedTimestampMs(loadedBars);
  if (oldestLoadedMs !== null) {
    return oldestLoadedMs - (stepSeconds * 1000);
  }
  return windowBoundsMs(plannedWindow).endMs;
}

function planPreviousGapScanWindow(plannedWindow, stepSeconds) {
  const bounds = windowBoundsMs(plannedWindow);
  const count = Math.max(1, Number(plannedWindow.estimatedBars) || 1);
  const stepMs = stepSeconds * 1000;
  const endMs = bounds.startMs - stepMs;
  const startMs = endMs - ((count - 1) * stepMs);
  return {
    ...plannedWindow,
    chunked: true,
    end: formatApiTime(endMs),
    start: formatApiTime(startMs),
  };
}

export function createLeftwardHistoryExtensionRuntime({
  emptyGapScanLimit = 24,
} = {}) {
  const unregisterCallbacks = [];
  const exhaustedScopes = new Map();
  const exhaustedRequestKeys = new Set();
  const inFlightRequestKeys = new Set();
  let state = {
    error: null,
    extension: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      extension: cloneExtension(state.extension),
      status: state.status,
    };
  }

  function ignore(reason, paneId, emitEvent) {
    state = {
      error: null,
      extension: {
        chartRecord: null,
        loadedWindow: null,
        paneId,
        plannedWindow: null,
        prependedBarCount: 0,
        reason,
        status: 'ignored',
      },
      status: 'ignored',
    };
    emitEvent?.(CHART_HISTORY_EVENTS.LEFT_EXTENSION_IGNORED, getState().extension);
    return getState();
  }

  async function requestLeftExtension(payload = {}, emitEvent) {
    const paneId = normalizePaneId(payload.paneId);
    try {
      const visibleFrom = normalizeVisibleFrom(payload);
      const leftBoundaryIndex = Math.ceil(visibleFrom);
      if (leftBoundaryIndex >= 0) {
        return ignore('canvas-left-inside-loaded-window', paneId, emitEvent);
      }

      const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId });
      const bars = cloneBars(chartRecord?.bars);
      if (!bars.length) {
        return ignore('pane-has-no-bars', paneId, emitEvent);
      }

      const replayState = await optionalCommand(REPLAY_COMMANDS.GET_STATE);
      const paneRecord = await optionalCommand(PANE_COMMANDS.GET_BY_ID, paneId);
      const instrument = String(
        payload.instrument ||
        replayState?.symbol ||
        paneRecord?.instrument ||
        ''
      ).trim().toUpperCase();
      if (!instrument) {
        throw new Error('Leftward history extension requires an instrument.');
      }
      const timeframe = normalizeTimeframeMinutes(
        payload.timeframe ||
        replayState?.timeframe ||
        paneRecord?.displayTimeframe ||
        1
      );
      const sortedBars = bars.sort((left, right) => left.timestamp - right.timestamp);
      const oldestLoadedTimestamp = Number(sortedBars[0].timestamp);
      const stepSeconds = inferStepSeconds(sortedBars, timeframe);
      const canvasLeftTimestamp = oldestLoadedTimestamp + (leftBoundaryIndex * stepSeconds);
      let plannedWindow = planCanvasLeftOlderWindow({
        canvasLeftTimestamp,
        instrument,
        oldestLoadedTimestamp,
        timeframe,
      });
      if (plannedWindow.exhausted) {
        return ignore(plannedWindow.reason || 'history-exhausted', paneId, emitEvent);
      }

      const exhaustedScopeKey = createExhaustedScopeKey(paneId, plannedWindow);
      let loadedWindow = null;
      let loadedBars = [];
      let emptyGapScans = 0;

      while (true) {
        const requestKey = createRequestKey(paneId, plannedWindow);
        if (inFlightRequestKeys.has(requestKey)) {
          return ignore('older-window-request-in-flight', paneId, emitEvent);
        }
        if (exhaustedRequestKeys.has(requestKey)) {
          return ignore('older-window-exhausted', paneId, emitEvent);
        }
        const exhaustedThroughMs = exhaustedScopes.get(exhaustedScopeKey);
        const plannedBounds = windowBoundsMs(plannedWindow);
        if (Number.isFinite(exhaustedThroughMs) && plannedBounds.endMs <= exhaustedThroughMs) {
          return ignore('older-history-exhausted', paneId, emitEvent);
        }

        inFlightRequestKeys.add(requestKey);
        try {
          loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, plannedWindow);
        } finally {
          inFlightRequestKeys.delete(requestKey);
        }
        loadedBars = cloneBars(loadedWindow?.bars);
        if (loadedWindow?.history?.exhaustedBefore === true) {
          exhaustedRequestKeys.add(requestKey);
          exhaustedScopes.set(
            exhaustedScopeKey,
            exhaustedThroughTimestampMs(plannedWindow, loadedBars, stepSeconds),
          );
        }
        if (loadedBars.length) {
          break;
        }
        if (loadedWindow?.history?.exhaustedBefore === true || emptyGapScans >= emptyGapScanLimit) {
          state = {
            error: null,
            extension: {
              chartRecord: null,
              loadedWindow: summarizeLoadedWindow(loadedWindow),
              paneId,
              plannedWindow,
              prependedBarCount: 0,
              reason: 'no-older-bars-returned',
              status: 'ignored',
            },
            status: 'ignored',
          };
          emitEvent?.(CHART_HISTORY_EVENTS.LEFT_EXTENSION_IGNORED, getState().extension);
          return getState();
        }
        emptyGapScans += 1;
        plannedWindow = planPreviousGapScanWindow(plannedWindow, stepSeconds);
      }

      const latestReplayState = await optionalCommand(REPLAY_COMMANDS.GET_STATE);
      const chartAfterPrepend = await dispatchCommand(CHART_DATA_COMMANDS.PREPEND_BARS, {
        bars: loadedBars,
        cursorTimestamp: replayCursorTimestamp(latestReplayState || replayState),
        paneId,
      });
      state = {
        error: null,
        extension: {
          chartRecord: chartAfterPrepend,
          loadedWindow: summarizeLoadedWindow(loadedWindow),
          paneId,
          plannedWindow,
          prependedBarCount: loadedBars.length,
          reason: null,
          status: 'loaded',
        },
        status: 'loaded',
      };
      emitEvent?.(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, getState().extension);
      return getState();
    } catch (error) {
      inFlightRequestKeys.clear();
      state = {
        error: error?.message || String(error),
        extension: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_HISTORY_COMMANDS.GET_STATE, () => getState()),
      registerCommand(
        CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
        (payload = {}) => requestLeftExtension(payload, emitEvent),
      ),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    exhaustedRequestKeys.clear();
    exhaustedScopes.clear();
    inFlightRequestKeys.clear();
    state = {
      error: null,
      extension: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.leftward-history-extension',
    start,
    stop,
  };
}
