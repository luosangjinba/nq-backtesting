import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LAYOUT_PANE_BOOTSTRAP_COMMANDS,
  LAYOUT_PANE_BOOTSTRAP_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand, registerCommand } from '../runtime/commands.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneResult(result = {}) {
  return {
    ...result,
    bootstrapped: Array.isArray(result.bootstrapped)
      ? result.bootstrapped.map((record) => ({ ...record }))
      : [],
    skipped: Array.isArray(result.skipped)
      ? result.skipped.map((record) => ({ ...record }))
      : [],
  };
}

function normalizePaneIds(paneIds = []) {
  return [...new Set(
    paneIds
      .map((paneId) => String(paneId || '').trim())
      .filter(Boolean)
  )];
}

function timestampFromReplayState(replayState = {}) {
  const state = replayState || {};
  const value = state.cursorTimestamp ?? state.timestamp ?? state.cursorTime;
  const timestamp = typeof value === 'number'
    ? value
    : Math.floor(new Date(value).valueOf() / 1000);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function findSourceRecord({ dispatchCommand, paneIds }) {
  for (const paneId of paneIds) {
    const record = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId });
    if (Array.isArray(record?.bars) && record.bars.length) {
      return record;
    }
  }
  return null;
}

export function createLayoutPaneBootstrapRuntime({
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  const unregisterCallbacks = [];
  let state = {
    error: null,
    lastResult: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      lastResult: state.lastResult ? cloneResult(state.lastResult) : null,
      status: state.status,
    };
  }

  async function bootstrapVisible(payload = {}, emitEvent) {
    const visiblePaneIds = normalizePaneIds(payload.visiblePaneIds);
    try {
      if (!visiblePaneIds.length) {
        throw new Error('Layout pane bootstrap requires visiblePaneIds.');
      }
      const sourceRecord = await findSourceRecord({ dispatchCommand, paneIds: visiblePaneIds });
      if (!sourceRecord) {
        const result = {
          bootstrapped: [],
          skipped: visiblePaneIds.map((paneId) => ({ paneId, reason: 'no-source-bars' })),
          sourcePaneId: null,
          visiblePaneIds,
        };
        state = { error: null, lastResult: result, status: 'skipped' };
        return getState();
      }

      const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      const cursorTimestamp = timestampFromReplayState(replayState) ?? Number(sourceRecord.bars.at(-1)?.timestamp ?? sourceRecord.bars.at(-1)?.time);
      if (!Number.isFinite(cursorTimestamp)) {
        throw new Error('Layout pane bootstrap requires a replay cursor or source bar timestamp.');
      }

      const bootstrapped = [];
      const skipped = [];
      for (const paneId of visiblePaneIds) {
        if (paneId === sourceRecord.paneId) {
          skipped.push({ paneId, reason: 'source-pane' });
          continue;
        }
        const existing = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId });
        if (Array.isArray(existing?.bars) && existing.bars.length >= sourceRecord.bars.length) {
          skipped.push({ paneId, reason: 'already-has-bars' });
          continue;
        }
        await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
          cursorTimestamp,
          paneId,
        });
        const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars: cloneBars(sourceRecord.bars),
          cursorTimestamp,
          paneId,
        });
        const viewportRecord = await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
          chartBarsRevision: chartRecord.revision,
          latestLogicalIndex: Math.max(0, chartRecord.bars.length - 1),
          paneId,
        });
        bootstrapped.push({
          barCount: chartRecord.bars.length,
          paneId,
          revision: chartRecord.revision,
          viewportProjected: Boolean(viewportRecord?.projection),
        });
      }

      const result = {
        bootstrapped,
        skipped,
        sourcePaneId: sourceRecord.paneId,
        visiblePaneIds,
      };
      state = { error: null, lastResult: result, status: bootstrapped.length ? 'bootstrapped' : 'skipped' };
      emitEvent?.(LAYOUT_PANE_BOOTSTRAP_EVENTS.BOOTSTRAPPED, cloneResult(result));
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        lastResult: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE, (payload) => bootstrapVisible(payload, emitEvent)),
      registerCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE, () => getState()),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      error: null,
      lastResult: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.layoutPaneBootstrap',
    start,
    stop,
  };
}
