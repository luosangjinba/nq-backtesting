import { failProjection } from './projection-error.js';

const HANDLER_NAMES = Object.freeze(['onCancel', 'onEnd', 'onMove', 'onStart']);
const PANE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function requireMethod(owner, method, code, label) {
  if (typeof owner?.[method] !== 'function') {
    failProjection(code, `${label} requires ${method}().`);
  }
}

function requireEnvironment(value) {
  const { chart, eventTarget, host, resolveInstrumentId, resolveMarketEpochMs, series } = value;
  for (const method of ['addEventListener', 'getBoundingClientRect', 'removeEventListener']) {
    requireMethod(host, method, 'ANNOTATION_INTERACTION_HOST_INVALID', 'Interaction host');
  }
  for (const method of ['addEventListener', 'removeEventListener']) {
    requireMethod(eventTarget, method, 'ANNOTATION_INTERACTION_EVENT_TARGET_INVALID', 'Event target');
  }
  for (const method of ['applyOptions', 'options', 'paneSize', 'timeScale']) {
    requireMethod(chart, method, 'ANNOTATION_INTERACTION_CHART_INVALID', 'Chart port');
  }
  for (const method of ['coordinateToPrice']) {
    requireMethod(series, method, 'ANNOTATION_INTERACTION_SERIES_INVALID', 'Series port');
  }
  requireMethod(chart.timeScale(), 'coordinateToTime', 'ANNOTATION_INTERACTION_CHART_INVALID', 'Time scale');
  if (typeof resolveInstrumentId !== 'function' || typeof resolveMarketEpochMs !== 'function') {
    failProjection(
      'ANNOTATION_INTERACTION_RESOLVER_INVALID',
      'Interaction port requires instrument and exact market-time resolvers.',
    );
  }
}

function requirePaneId(value) {
  if (typeof value !== 'string' || !PANE_ID.test(value)) {
    failProjection('ANNOTATION_INTERACTION_PANE_INVALID', 'Interaction Pane id is invalid.');
  }
  return value;
}

function requireThreshold(value) {
  if (!Number.isFinite(value) || value < 1 || value > 32) {
    failProjection('ANNOTATION_INTERACTION_THRESHOLD_INVALID', 'Drag threshold must be 1–32 pixels.');
  }
  return value;
}

function requireHandlers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...HANDLER_NAMES].sort().join(',')) {
    failProjection('ANNOTATION_INTERACTION_HANDLERS_INVALID', 'Interaction handlers must be exact.');
  }
  for (const method of HANDLER_NAMES) {
    if (typeof value[method] !== 'function') {
      failProjection('ANNOTATION_INTERACTION_HANDLERS_INVALID', `Interaction requires ${method}().`);
    }
  }
  return value;
}

function nativeOptions(chart) {
  const options = chart.options();
  return Object.freeze({
    handleScale: structuredClone(options.handleScale),
    handleScroll: structuredClone(options.handleScroll),
  });
}

/**
 * Create one Chart-owned normalized Segment gesture port. Vendor and DOM
 * handles remain closed over by this adapter and never reach its callbacks.
 */
export function createLightweightAnnotationInteractionPort({
  chart,
  dragThresholdPx = 3,
  eventTarget = window,
  host,
  paneId = 'pane-main',
  resolveInstrumentId,
  resolveMarketEpochMs,
  series,
} = {}) {
  requireEnvironment({ chart, eventTarget, host, resolveInstrumentId, resolveMarketEpochMs, series });
  const acceptedPaneId = requirePaneId(paneId);
  const thresholdSquared = requireThreshold(dragThresholdPx) ** 2;
  let active = null;
  let disposed = false;
  let gesture = null;
  let leaseRevision = 0;
  let sequence = 0;

  function anchorAt(event) {
    const rect = host.getBoundingClientRect();
    const point = Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    const pane = chart.paneSize(0);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > pane.width || point.y > pane.height) return null;
    const time = chart.timeScale().coordinateToTime(point.x);
    const price = series.coordinateToPrice(point.y);
    if (typeof time !== 'number' || !Number.isFinite(price)) return null;
    const displayEpochMs = Math.round(time * 1_000);
    const epochMs = resolveMarketEpochMs(Object.freeze({
      displayEpochMs,
      paneId: acceptedPaneId,
    }));
    const instrumentId = resolveInstrumentId(acceptedPaneId);
    if (!Number.isSafeInteger(epochMs) || epochMs < 0
      || typeof instrumentId !== 'string' || instrumentId.length === 0
      || instrumentId.trim() !== instrumentId) {
      failProjection(
        'ANNOTATION_INTERACTION_ANCHOR_RESOLUTION_FAILED',
        'Chart interaction could not resolve an exact market anchor.',
      );
    }
    return Object.freeze({
      anchor: Object.freeze({ epochMs, instrumentId, price: Number(price) }),
      paneId: acceptedPaneId,
      pointerId: event.pointerId,
      sequence: ++sequence,
    });
  }

  function safeAnchorAt(event) {
    try { return anchorAt(event); } catch { cancel('anchor-resolution-failed'); }
    return null;
  }

  function restoreNative(record) {
    if (!record.nativeRestored) {
      chart.applyOptions(record.nativeOptions);
      record.nativeRestored = true;
    }
  }

  function releaseCapture(record) {
    if (record.pointerId === null) return;
    const pointerId = record.pointerId;
    record.pointerId = null;
    try {
      if (typeof host.hasPointerCapture !== 'function' || host.hasPointerCapture(pointerId)) {
        host.releasePointerCapture?.(pointerId);
      }
    } catch { /* Native capture may already have ended. */ }
  }

  function finish(kind, payload) {
    const record = active;
    if (record === null) return;
    gesture = null;
    releaseCapture(record);
    active = null;
    restoreNative(record);
    if (kind === 'cancel') record.handlers.onCancel(Object.freeze({ reason: payload }));
    else record.handlers.onEnd(payload);
  }

  function cancel(reason) {
    if (active !== null) finish('cancel', reason);
  }

  function consumePointerEvent(event) {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
  }

  function onPointerDown(event) {
    if (active === null || gesture !== null || event.button !== 0 || event.isPrimary === false) return;
    const normalized = safeAnchorAt(event);
    if (normalized === null) return;
    consumePointerEvent(event);
    gesture = {
      dragged: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
    active.pointerId = event.pointerId;
    try { host.setPointerCapture?.(event.pointerId); } catch { /* Window listeners still own cleanup. */ }
    try { active.handlers.onStart(normalized); } catch { cancel('handler-failed'); }
  }

  function onPointerMove(event) {
    if (active === null || gesture === null || event.pointerId !== gesture.pointerId) return;
    consumePointerEvent(event);
    if (!gesture.dragged) {
      const x = event.clientX - gesture.startClientX;
      const y = event.clientY - gesture.startClientY;
      gesture.dragged = ((x * x) + (y * y)) >= thresholdSquared;
    }
    if (!gesture.dragged) return;
    const normalized = safeAnchorAt(event);
    if (normalized === null) return;
    try { active.handlers.onMove(normalized); } catch { cancel('handler-failed'); }
  }

  function onPointerUp(event) {
    if (active === null || gesture === null || event.pointerId !== gesture.pointerId) return;
    consumePointerEvent(event);
    if (!gesture.dragged) {
      cancel('below-threshold');
      return;
    }
    const normalized = safeAnchorAt(event);
    if (normalized === null) {
      cancel('outside-plot');
      return;
    }
    finish('end', normalized);
  }

  function onPointerCancel(event) {
    if (gesture !== null && event.pointerId === gesture.pointerId) {
      consumePointerEvent(event);
      cancel('pointer-cancel');
    }
  }

  function onKeydown(event) {
    if (active === null || event.key !== 'Escape') return;
    event.preventDefault?.();
    cancel('escape');
  }

  function onBlur() { cancel('focus-loss'); }
  function onLostPointerCapture(event) {
    if (gesture !== null && event.pointerId === gesture.pointerId) cancel('lost-pointer-capture');
  }

  host.addEventListener('pointerdown', onPointerDown, true);
  host.addEventListener('lostpointercapture', onLostPointerCapture, true);
  eventTarget.addEventListener('pointermove', onPointerMove, true);
  eventTarget.addEventListener('pointerup', onPointerUp, true);
  eventTarget.addEventListener('pointercancel', onPointerCancel, true);
  eventTarget.addEventListener('keydown', onKeydown, true);
  eventTarget.addEventListener('blur', onBlur, true);

  return Object.freeze({
    acquire(handlers) {
      if (disposed) failProjection('ANNOTATION_INTERACTION_PORT_DISPOSED', 'Interaction port is disposed.');
      if (active !== null) {
        failProjection('ANNOTATION_INTERACTION_LEASE_ACTIVE', 'One exclusive interaction lease is active.');
      }
      const record = {
        handlers: requireHandlers(handlers),
        leaseRevision: ++leaseRevision,
        nativeOptions: nativeOptions(chart),
        nativeRestored: false,
        pointerId: null,
      };
      chart.applyOptions({ handleScale: false, handleScroll: false });
      active = record;
      const lease = Object.freeze({
        release(reason = 'released') {
          if (active === record) cancel(reason);
        },
      });
      return lease;
    },
    dispose() {
      if (disposed) return;
      cancel('disposed');
      disposed = true;
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('lostpointercapture', onLostPointerCapture, true);
      eventTarget.removeEventListener('pointermove', onPointerMove, true);
      eventTarget.removeEventListener('pointerup', onPointerUp, true);
      eventTarget.removeEventListener('pointercancel', onPointerCancel, true);
      eventTarget.removeEventListener('keydown', onKeydown, true);
      eventTarget.removeEventListener('blur', onBlur, true);
    },
    snapshot: () => Object.freeze({
      active: active !== null,
      disposed,
      gestureActive: gesture !== null,
      leaseRevision,
      nativeSuppressed: active !== null && !active.nativeRestored,
      paneId: acceptedPaneId,
    }),
  });
}
