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
  windowBoundsMs,
} from '../bar-data/bar-window.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  normalizeMinuteTimeframe,
  normalizeUnixMilliseconds,
  summarizeProjectionSource,
  TIME_DOMAIN_CONSTANTS,
} from '../time-domain/time-domain.js';
import { normalizeDisplayTimeframeValue } from '../time-domain/htf-display-timeframe-domain.js';
import { planLeftwardSourceWindow } from './leftward-extension-planner.js';
import {
  createLeftwardSourcePrepend,
  loadLeftwardTargetPrepend,
  replayCursorTimestamp,
} from './leftward-history-data-orchestrator.js';

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

async function optionalCommand(command, payload) {
  try {
    return await dispatchCommand(command, payload);
  } catch {
    return null;
  }
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
    diagnostics: extension.diagnostics ? { ...extension.diagnostics } : null,
    loadedWindow: extension.loadedWindow ? { ...extension.loadedWindow } : null,
    paneId: extension.paneId,
    plannedWindow: cloneWindow(extension.plannedWindow),
    prependedBarCount: extension.prependedBarCount,
    projectionSource: extension.projectionSource ? { ...extension.projectionSource } : null,
    reason: extension.reason || null,
    status: extension.status,
    targetHistory: extension.targetHistory ? {
      ...extension.targetHistory,
      window: cloneWindow(extension.targetHistory.window),
    } : null,
  } : null;
}

function cloneRecentRequest(request) {
  return request ? {
    barCount: request.barCount,
    gapScanIndex: request.gapScanIndex,
    loadedWindow: request.loadedWindow ? { ...request.loadedWindow } : null,
    paneId: request.paneId,
    plannedWindow: cloneWindow(request.plannedWindow),
    reason: request.reason || null,
    status: request.status,
  } : null;
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function elapsedMs(startedAtMs) {
  return Math.max(0, Math.round((nowMs() - startedAtMs) * 100) / 100);
}

function createDiagnostics(startedAtMs, overrides = {}) {
  return {
    durationMs: elapsedMs(startedAtMs),
    fallbackReason: null,
    path: 'source-window',
    prependedBarCount: 0,
    sourceLoadMs: null,
    sourceRequestCount: 0,
    targetBarCount: 0,
    targetLoadMs: null,
    targetRequestCount: 0,
    ...overrides,
  };
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

function createTargetRequestKey(paneId, window) {
  return [
    'target',
    paneId,
    window.instrument,
    window.timeframe,
    window.start,
    window.end,
  ].join('|');
}

function oldestLoadedTimestampMs(bars = []) {
  const timestamps = cloneBars(bars)
    .map((bar) => {
      try {
        return normalizeUnixMilliseconds(bar.timestamp ?? bar.time, {
          fieldName: 'Leftward history loaded bar timestamp',
        });
      } catch {
        return null;
      }
    })
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return timestamps[0];
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
  const recentRequests = [];
  let state = {
    error: null,
    extension: null,
    status: 'idle',
  };

  function recordRequestAttempt(record) {
    recentRequests.push({
      barCount: Number(record.barCount) || 0,
      gapScanIndex: Number(record.gapScanIndex) || 0,
      loadedWindow: record.loadedWindow || null,
      paneId: record.paneId,
      plannedWindow: cloneWindow(record.plannedWindow),
      reason: record.reason || null,
      status: record.status,
    });
    while (recentRequests.length > 32) {
      recentRequests.shift();
    }
  }

  function getState() {
    return {
      error: state.error,
      extension: cloneExtension(state.extension),
      recentRequests: recentRequests.map(cloneRecentRequest),
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
    const requestStartedAtMs = nowMs();
    try {
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
      const sourceTimeframe = normalizeMinuteTimeframe(
        payload.sourceTimeframe ||
        replayState?.timeframe ||
        paneRecord?.timeframe ||
        payload.timeframe ||
        1,
        { fieldName: 'Leftward history extension sourceTimeframe' },
      );
      const displayTimeframe = normalizeDisplayTimeframeValue(
        payload.displayTimeframe ||
        paneRecord?.displayTimeframe ||
        sourceTimeframe,
        { fieldName: 'Leftward history extension displayTimeframe' },
      );
      const plan = planLeftwardSourceWindow({
        bars,
        displayTimeframe,
        instrument,
        sourceTimeframe,
        visibleRange: payload.visibleRange ?? { from: payload.from },
      });
      if (plan.status === 'ignored') {
        return ignore(plan.reason || 'canvas-left-inside-loaded-window', paneId, emitEvent);
      }
      let plannedWindow = plan.plannedWindow;
      if (plannedWindow.exhausted) {
        return ignore(plannedWindow.reason || 'history-exhausted', paneId, emitEvent);
      }

      const exhaustedScopeKey = createExhaustedScopeKey(paneId, plannedWindow);
      let loadedWindow = null;
      let loadedBars = [];
      let emptyGapScans = 0;
      let targetHistoryFallback = null;
      let sourceRequestCount = 0;
      let sourceLoadMs = 0;
      let targetBarCount = 0;
      let targetLoadMs = null;
      let targetRequestCount = 0;

      if (payload.targetHistory?.enabled) {
        const targetRequestKey = createTargetRequestKey(paneId, {
          ...plannedWindow,
          timeframe: displayTimeframe,
        });
        if (inFlightRequestKeys.has(targetRequestKey)) {
          return ignore('older-window-request-in-flight', paneId, emitEvent);
        }
        inFlightRequestKeys.add(targetRequestKey);
        let targetPrepend = null;
        const targetStartedAtMs = nowMs();
        try {
          targetRequestCount = 1;
          targetPrepend = await loadLeftwardTargetPrepend({
            displayTimeframe,
            instrument,
            paneId,
            plannedWindow,
            sourceTimeframe,
            targetHistory: payload.targetHistory,
          });
        } catch (error) {
          targetPrepend = {
            errorMessage: error?.message || String(error),
            reason: 'target-history-load-failed',
            status: 'fallback',
          };
        } finally {
          inFlightRequestKeys.delete(targetRequestKey);
        }
        targetLoadMs = elapsedMs(targetStartedAtMs);
        targetBarCount = Number(targetPrepend?.bars?.length || targetPrepend?.loadedWindow?.barCount || 0);

        if (targetPrepend.status === 'applied') {
          const latestReplayState = await optionalCommand(REPLAY_COMMANDS.GET_STATE);
          const chartAfterPrepend = await dispatchCommand(CHART_DATA_COMMANDS.PREPEND_BARS, {
            bars: targetPrepend.bars,
            cursorTimestamp: replayCursorTimestamp(latestReplayState || replayState),
            paneId,
            preserveSource: true,
          });
          state = {
            error: null,
            extension: {
              chartRecord: chartAfterPrepend,
              loadedWindow: targetPrepend.loadedWindow,
              paneId,
              plannedWindow,
              prependedBarCount: targetPrepend.bars.length,
              projectionSource: targetPrepend.projectionSource,
              reason: null,
              status: 'loaded',
              diagnostics: createDiagnostics(requestStartedAtMs, {
                path: 'target-history',
                prependedBarCount: targetPrepend.bars.length,
                targetBarCount,
                targetLoadMs,
                targetRequestCount,
              }),
              targetHistory: {
                barCount: targetPrepend.bars.length,
                reason: targetPrepend.reason,
                status: 'applied',
                window: targetPrepend.window,
              },
            },
            status: 'loaded',
          };
          emitEvent?.(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, getState().extension);
          return getState();
        }
        targetHistoryFallback = {
          errorMessage: targetPrepend.errorMessage || null,
          reason: targetPrepend.reason || 'target-history-fallback',
          status: targetPrepend.status || 'fallback',
          window: targetPrepend.window || null,
        };
      }

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
        const sourceStartedAtMs = nowMs();
        try {
          sourceRequestCount += 1;
          loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, plannedWindow);
        } finally {
          inFlightRequestKeys.delete(requestKey);
          sourceLoadMs += elapsedMs(sourceStartedAtMs);
        }
        loadedBars = cloneBars(loadedWindow?.bars);
        recordRequestAttempt({
          barCount: loadedBars.length,
          gapScanIndex: emptyGapScans,
          loadedWindow: summarizeLoadedWindow(loadedWindow),
          paneId,
          plannedWindow,
          reason: loadedBars.length ? null : 'empty-window',
          status: loadedBars.length ? 'loaded' : 'empty',
        });
        if (loadedWindow?.history?.exhaustedBefore === true) {
          exhaustedRequestKeys.add(requestKey);
          exhaustedScopes.set(
            exhaustedScopeKey,
            exhaustedThroughTimestampMs(
              plannedWindow,
              loadedBars,
              sourceTimeframe * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS,
            ),
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
        plannedWindow = planPreviousGapScanWindow(
          plannedWindow,
          sourceTimeframe * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS,
        );
      }

      const latestReplayState = await optionalCommand(REPLAY_COMMANDS.GET_STATE);
      const prependBars = await createLeftwardSourcePrepend({
        displayTimeframe,
        loadedBars,
        loadedWindow,
        paneId,
        paneRecord,
        plannedWindow,
        replayState: latestReplayState || replayState,
      });
      const chartAfterPrepend = await dispatchCommand(CHART_DATA_COMMANDS.PREPEND_BARS, {
        bars: prependBars.bars,
        cursorTimestamp: replayCursorTimestamp(latestReplayState || replayState),
        paneId,
        sourceBars: prependBars.sourceBars,
      });
      state = {
        error: null,
        extension: {
          chartRecord: chartAfterPrepend,
          loadedWindow: summarizeLoadedWindow(loadedWindow),
          paneId,
          plannedWindow,
          prependedBarCount: prependBars.bars.length,
          projectionSource: summarizeProjectionSource(prependBars.projectionRecord),
          reason: null,
          status: 'loaded',
          diagnostics: createDiagnostics(requestStartedAtMs, {
            fallbackReason: targetHistoryFallback?.reason || null,
            path: targetHistoryFallback ? 'target-history-fallback-source-window' : 'source-window',
            prependedBarCount: prependBars.bars.length,
            sourceLoadMs: Math.round(sourceLoadMs * 100) / 100,
            sourceRequestCount,
            targetBarCount,
            targetLoadMs,
            targetRequestCount,
          }),
          targetHistory: targetHistoryFallback,
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
    recentRequests.length = 0;
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
