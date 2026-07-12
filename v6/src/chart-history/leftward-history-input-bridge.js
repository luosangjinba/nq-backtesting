import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_EVENTS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
  PANE_INTENT_RELOAD_VIEWPORT_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { planLeftwardTargetHistoryActivation } from './leftward-target-history-activation.js';
import { resolveLeftwardHistoryRequestSchedule } from './leftward-history-request-schedule.js';

const DEFAULT_NATIVE_TARGET_HISTORY_DELAY_MS = 100;

function traceBridge(record = {}) {
  const trace = globalThis.__v6LeftwardHistoryInputBridgeTrace;
  if (typeof trace !== 'function') return;
  trace({
    ...record,
    source: 'leftward-history-input-bridge',
  });
}

export function connectLeftwardHistoryInputBridge({
  chartSurface,
  clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis),
  dispatchCommand = dispatchRuntimeCommand,
  requestDelayMs = 500,
  setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
  subscribeEvent = subscribeRuntimeEvent,
  targetHistoryActivation = {},
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
  const programmaticFastArmedPaneIds = new Set();
  const programmaticFastInFlightPaneIds = new Set();

  function clearPending(paneId) {
    const pending = pendingByPaneId.get(paneId);
    if (pending?.timer && typeof clearTimeoutFn === 'function') {
      clearTimeoutFn(pending.timer);
    }
    pendingByPaneId.delete(paneId);
  }

  async function paneActivationPayload(paneId) {
    let pane = null;
    try {
      pane = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
    } catch {
      return {};
    }
    const displayTimeframe = pane?.displayTimeframe;
    if (displayTimeframe === null || displayTimeframe === undefined) return {};
    const activation = planLeftwardTargetHistoryActivation({
      displayTimeframe,
      enabled: true,
      minFixedMinutes: targetHistoryActivation.minFixedMinutes,
      paneId,
      sourceTimeframe: pane?.timeframe || targetHistoryActivation.sourceTimeframe || 1,
    });
    if (activation.status !== 'enabled') return {};
    return {
      displayTimeframe: activation.displayTimeframe,
      targetHistory: activation.targetHistory,
    };
  }

  function baseLeftExtensionPayload(paneId, visibleRange) {
    return {
      paneId,
      visibleRange,
    };
  }

  function dispatchLeftExtension(paneId, visibleRange, activationPayload = null) {
    if (targetHistoryActivation.enabled === false) {
      return dispatchCommand(
        CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
        baseLeftExtensionPayload(paneId, visibleRange),
      );
    }
    if (activationPayload) {
      return dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        ...baseLeftExtensionPayload(paneId, visibleRange),
        ...activationPayload,
      });
    }
    return dispatchLeftExtensionWithActivation(paneId, visibleRange);
  }

  async function dispatchLeftExtensionWithActivation(paneId, visibleRange) {
    const activationPayload = await paneActivationPayload(paneId);
    return dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
      ...baseLeftExtensionPayload(paneId, visibleRange),
      ...activationPayload,
    });
  }

  function dispatchPending(paneId) {
    const pending = pendingByPaneId.get(paneId);
    pendingByPaneId.delete(paneId);
    if (!active || !pending) return;
    void Promise.resolve(dispatchLeftExtension(
      paneId,
      pending.visibleRange,
      pending.activationPayload || null,
    ));
  }

  function shouldRequest(visibleRange) {
    const from = Number(visibleRange?.from);
    const to = Number(visibleRange?.to);
    return Number.isFinite(from) && Number.isFinite(to) && from < 0;
  }

  function isProgrammaticFastCandidateReason(reason) {
    return reason === 'runtime-display-timeframe-applied'
      || reason === 'runtime-viewport-projected';
  }

  function resolverReasonForPane(paneId, reason) {
    if (!isProgrammaticFastCandidateReason(reason)) return reason;
    return programmaticFastArmedPaneIds.has(paneId)
      ? reason
      : 'runtime-surface-check';
  }

  function nativeTargetHistoryDelayFor({ activationPayload = null, reason } = {}) {
    if (reason !== 'native-visible-range' || !activationPayload?.targetHistory?.enabled) return null;
    return targetHistoryActivation.nativeTargetHistoryDelayMs ?? DEFAULT_NATIVE_TARGET_HISTORY_DELAY_MS;
  }

  function scheduleResolvedRequest({
    activationPayload = null,
    paneId,
    schedule,
    visibleRange,
  } = {}) {
    if (!active || !schedule.shouldDispatch) return;
    const delayMs = schedule.delayMs;
    if (delayMs === 0 || typeof setTimeoutFn !== 'function') {
      if (schedule.mode === 'programmatic-target-history-fast-path') {
        if (programmaticFastInFlightPaneIds.has(paneId)) return;
        programmaticFastInFlightPaneIds.add(paneId);
        programmaticFastArmedPaneIds.delete(paneId);
      }
      void Promise.resolve(dispatchLeftExtension(paneId, visibleRange, activationPayload));
      return;
    }
    const timer = setTimeoutFn(() => dispatchPending(paneId), delayMs);
    traceBridge({
      delayMs,
      mode: schedule.mode,
      paneId,
      phase: 'timer-scheduled',
      reason: schedule.reason,
      targetHistoryEnabled: Boolean(activationPayload?.targetHistory?.enabled),
    });
    pendingByPaneId.set(paneId, { activationPayload, timer, visibleRange });
  }

  function scheduleRequest(paneId, visibleRange, reason = 'native-visible-range') {
    if (!shouldRequest(visibleRange)) {
      if (isProgrammaticFastCandidateReason(reason)) {
        programmaticFastArmedPaneIds.delete(paneId);
      }
      return;
    }
    clearPending(paneId);
    const resolvedReason = resolverReasonForPane(paneId, reason);
    if (targetHistoryActivation.enabled === false) {
      const schedule = resolveLeftwardHistoryRequestSchedule({
        reason: resolvedReason,
        requestDelayMs,
        targetHistoryEnabled: false,
        visibleRange,
      });
      traceBridge({
        activationStatus: 'disabled',
        delayMs: schedule.delayMs,
        mode: schedule.mode,
        paneId,
        phase: 'schedule-resolved',
        reason: schedule.reason,
        requestedReason: reason,
        resolvedReason,
        targetHistoryEnabled: false,
      });
      scheduleResolvedRequest({
        paneId,
        schedule,
        visibleRange,
      });
      return;
    }
    void Promise.resolve(paneActivationPayload(paneId)).then((activationPayload) => {
      const selectedNativeTargetHistoryDelayMs = nativeTargetHistoryDelayFor({
        activationPayload,
        reason: resolvedReason,
      });
      const schedule = resolveLeftwardHistoryRequestSchedule({
        nativeTargetHistoryDelayMs: selectedNativeTargetHistoryDelayMs,
        reason: resolvedReason,
        requestDelayMs,
        targetHistoryEnabled: Boolean(activationPayload?.targetHistory?.enabled),
        visibleRange,
      });
      traceBridge({
        activationDisplayTimeframe: activationPayload?.displayTimeframe ?? null,
        activationStatus: activationPayload?.targetHistory?.enabled ? 'enabled' : 'ignored',
        delayMs: schedule.delayMs,
        mode: schedule.mode,
        nativeTargetHistoryDelayMs: selectedNativeTargetHistoryDelayMs,
        paneId,
        phase: 'schedule-resolved',
        reason: schedule.reason,
        requestedReason: reason,
        resolvedReason,
        targetHistoryEnabled: Boolean(activationPayload?.targetHistory?.enabled),
      });
      scheduleResolvedRequest({
        activationPayload,
        paneId,
        schedule,
        visibleRange,
      });
      if (isProgrammaticFastCandidateReason(reason)) {
        programmaticFastArmedPaneIds.delete(paneId);
      }
    });
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

  function scheduleFromSurface(paneId, reason = 'runtime-surface-check') {
    if (!active || !paneId) return;
    const visibleRange = latestSurfaceRange(paneId);
    if (!shouldRequest(visibleRange)) return;
    void Promise.resolve(scheduleRequest(paneId, visibleRange, reason));
  }

  function continueAfterLoaded(extension = {}) {
    const paneId = String(extension.paneId || '').trim();
    if (!active || !paneId || extension.status !== 'loaded') return;
    programmaticFastInFlightPaneIds.delete(paneId);
    checkPaneAfterRuntimeUpdate({ paneId, reason: 'runtime-left-extension-loaded' });
  }

  function checkPaneAfterRuntimeUpdate(payload = {}) {
    const paneId = String(payload.paneId || payload.pane?.id || '').trim();
    const reason = String(payload.reason || 'runtime-surface-check');
    if (!paneId || typeof setTimeoutFn !== 'function') {
      scheduleFromSurface(paneId, reason);
      return;
    }
    setTimeoutFn(() => scheduleFromSurface(paneId, reason), 0);
  }

  function checkPanesAfterRuntimeUpdate(records = [], reason = 'runtime-pane-reload-viewport-projected') {
    if (Array.isArray(records)) {
      records.forEach((record) => checkPaneAfterRuntimeUpdate({ ...record, reason }));
      return;
    }
    checkPaneAfterRuntimeUpdate({ ...records, reason });
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
    void Promise.resolve(scheduleRequest(paneId, visibleRange, 'native-visible-range'));
  });
  const unsubscribeLoaded = typeof subscribeEvent === 'function'
    ? subscribeEvent(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, continueAfterLoaded)
    : () => {};
  const unsubscribeViewportProjected = typeof subscribeEvent === 'function'
    ? subscribeEvent(
      CHART_VIEWPORT_EVENTS.PROJECTED,
      (payload) => checkPaneAfterRuntimeUpdate({
        ...payload,
        reason: 'runtime-viewport-projected',
      }),
    )
    : () => {};
  const unsubscribePaneReloadViewportProjected = typeof subscribeEvent === 'function'
    ? subscribeEvent(PANE_INTENT_RELOAD_VIEWPORT_EVENTS.PROJECTED, checkPanesAfterRuntimeUpdate)
    : () => {};
  const unsubscribeDisplayTimeframeApplied = typeof subscribeEvent === 'function'
    ? subscribeEvent(
      DISPLAY_TIMEFRAME_EVENTS.APPLIED,
      (payload = {}) => {
        const paneId = String(payload.paneId || payload.pane?.id || '').trim();
        if (paneId) {
          programmaticFastArmedPaneIds.add(paneId);
        }
        checkPaneAfterRuntimeUpdate({
          ...payload,
          reason: 'runtime-display-timeframe-applied',
        });
      },
    )
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
      programmaticFastArmedPaneIds.clear();
      programmaticFastInFlightPaneIds.clear();
    },
  };
}
