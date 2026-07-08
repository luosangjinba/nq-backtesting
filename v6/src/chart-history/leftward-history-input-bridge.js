import { CHART_HISTORY_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

export function connectLeftwardHistoryInputBridge({
  chartSurface,
  clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
  dispatchCommand = dispatchRuntimeCommand,
  requestDelayMs = 500,
  setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribeVisibleRangeChange !== 'function') {
    throw new Error('Leftward history input bridge requires a chart surface with visible range events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Leftward history input bridge requires dispatchCommand.');
  }

  let active = true;
  const pendingByPaneId = new Map();

  function clearPending(paneId) {
    const pending = pendingByPaneId.get(paneId);
    if (pending?.timer && typeof clearTimeoutFn === 'function') {
      clearTimeoutFn(pending.timer);
    }
    pendingByPaneId.delete(paneId);
  }

  function dispatchPending(paneId) {
    const pending = pendingByPaneId.get(paneId);
    pendingByPaneId.delete(paneId);
    if (!active || !pending) return;
    void Promise.resolve(dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
      paneId,
      visibleRange: pending.visibleRange,
    }));
  }

  function scheduleRequest(paneId, visibleRange) {
    clearPending(paneId);
    const delayMs = Math.max(0, Number(requestDelayMs) || 0);
    if (delayMs === 0 || typeof setTimeoutFn !== 'function') {
      void Promise.resolve(dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        paneId,
        visibleRange,
      }));
      return;
    }
    const timer = setTimeoutFn(() => dispatchPending(paneId), delayMs);
    pendingByPaneId.set(paneId, { timer, visibleRange });
  }

  const unsubscribe = chartSurface.subscribeVisibleRangeChange((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    const from = Number(event.from);
    const to = Number(event.to);
    if (!paneId || !Number.isFinite(from) || !Number.isFinite(to) || from >= 0) {
      return;
    }
    scheduleRequest(paneId, { from, to });
  });

  return {
    destroy() {
      active = false;
      for (const paneId of pendingByPaneId.keys()) {
        clearPending(paneId);
      }
      unsubscribe();
    },
  };
}
