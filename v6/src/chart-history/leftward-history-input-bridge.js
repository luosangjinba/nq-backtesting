import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_EVENTS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_INTENT_RELOAD_VIEWPORT_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectLeftwardHistoryInputBridge({
  chartSurface,
  clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
  dispatchCommand = dispatchRuntimeCommand,
  requestDelayMs = 500,
  setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribeVisibleRangeChange !== 'function') {
    throw new Error('Leftward history input bridge requires a chart surface with visible range events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Leftward history input bridge requires dispatchCommand.');
  }

  let active = true;
  const latestVisibleRangeByPaneId = new Map();
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

  function shouldRequest(visibleRange) {
    const from = Number(visibleRange?.from);
    const to = Number(visibleRange?.to);
    return Number.isFinite(from) && Number.isFinite(to) && from < 0;
  }

  function scheduleRequest(paneId, visibleRange) {
    if (!shouldRequest(visibleRange)) return;
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

  function latestSurfaceRange(paneId) {
    const state = typeof chartSurface.getState === 'function' ? chartSurface.getState() : null;
    const measured = state?.measuredVisibleRange?.find?.((record) => record.paneId === paneId);
    const pane = state?.panes?.find?.((record) => record.paneId === paneId);
    const range = measured || pane?.snapshot?.visibleLogicalRange || latestVisibleRangeByPaneId.get(paneId);
    return range ? {
      from: Number(range.from),
      to: Number(range.to),
    } : null;
  }

  function scheduleFromSurface(paneId) {
    if (!active || !paneId) return;
    const visibleRange = latestSurfaceRange(paneId);
    if (!shouldRequest(visibleRange)) return;
    scheduleRequest(paneId, visibleRange);
  }

  function continueAfterLoaded(extension = {}) {
    const paneId = String(extension.paneId || '').trim();
    if (!active || !paneId || extension.status !== 'loaded') return;
    scheduleFromSurface(paneId);
  }

  function checkPaneAfterRuntimeUpdate(payload = {}) {
    const paneId = String(payload.paneId || payload.pane?.id || '').trim();
    if (!paneId || typeof setTimeoutFn !== 'function') {
      scheduleFromSurface(paneId);
      return;
    }
    setTimeoutFn(() => scheduleFromSurface(paneId), 0);
  }

  function checkPanesAfterRuntimeUpdate(records = []) {
    if (Array.isArray(records)) {
      records.forEach(checkPaneAfterRuntimeUpdate);
      return;
    }
    checkPaneAfterRuntimeUpdate(records);
  }

  const unsubscribe = chartSurface.subscribeVisibleRangeChange((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    const from = Number(event.from);
    const to = Number(event.to);
    if (!paneId || !Number.isFinite(from) || !Number.isFinite(to) || from >= 0) {
      return;
    }
    const visibleRange = { from, to };
    latestVisibleRangeByPaneId.set(paneId, visibleRange);
    scheduleRequest(paneId, visibleRange);
  });
  const unsubscribeLoaded = typeof subscribeEvent === 'function'
    ? subscribeEvent(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, continueAfterLoaded)
    : () => {};
  const unsubscribeViewportProjected = typeof subscribeEvent === 'function'
    ? subscribeEvent(CHART_VIEWPORT_EVENTS.PROJECTED, checkPaneAfterRuntimeUpdate)
    : () => {};
  const unsubscribePaneReloadViewportProjected = typeof subscribeEvent === 'function'
    ? subscribeEvent(PANE_INTENT_RELOAD_VIEWPORT_EVENTS.PROJECTED, checkPanesAfterRuntimeUpdate)
    : () => {};
  const unsubscribeDisplayTimeframeApplied = typeof subscribeEvent === 'function'
    ? subscribeEvent(DISPLAY_TIMEFRAME_EVENTS.APPLIED, checkPaneAfterRuntimeUpdate)
    : () => {};

  return {
    destroy() {
      active = false;
      for (const paneId of pendingByPaneId.keys()) {
        clearPending(paneId);
      }
      unsubscribe();
      unsubscribeLoaded();
      unsubscribeViewportProjected();
      unsubscribePaneReloadViewportProjected();
      unsubscribeDisplayTimeframeApplied();
      latestVisibleRangeByPaneId.clear();
    },
  };
}
