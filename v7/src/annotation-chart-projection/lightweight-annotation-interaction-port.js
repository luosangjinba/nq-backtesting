import { failProjection } from './projection-error.js';

const HANDLER_NAMES = Object.freeze(['onCancel', 'onEnd', 'onMove', 'onStart']);
const PANE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SELECTION_FIELDS = Object.freeze(['distancePx', 'entityId', 'projectionId']);

function requireMethod(owner, method, code, label) {
  if (typeof owner?.[method] !== 'function') {
    failProjection(code, `${label} requires ${method}().`);
  }
}

function requireEnvironment(value) {
  const {
    chart, eventTarget, host, resolveInstrumentId, resolveMarketEpochMs, resolveSelectionAt, series,
  } = value;
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
  if (typeof resolveInstrumentId !== 'function' || typeof resolveMarketEpochMs !== 'function'
    || typeof resolveSelectionAt !== 'function') {
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

function normalizeSelectionHit(value) {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...SELECTION_FIELDS].sort().join(',')
    || !Number.isFinite(value.distancePx) || value.distancePx < 0
    || typeof value.entityId !== 'string' || !PANE_ID.test(value.entityId)
    || typeof value.projectionId !== 'string' || !PANE_ID.test(value.projectionId)) {
    failProjection('ANNOTATION_SELECTION_HIT_INVALID', 'Selection resolver returned an invalid bounded hit.');
  }
  return Object.freeze({
    distancePx: value.distancePx,
    entityId: value.entityId,
    projectionId: value.projectionId,
  });
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
 * Create one Chart-owned normalized two-anchor gesture port. It maps both
 * click-move-click and press-drag-release onto the same callbacks while vendor
 * and DOM handles remain closed over by this adapter.
 */
export function createLightweightAnnotationInteractionPort({
  chart,
  dragThresholdPx = 3,
  eventTarget = window,
  host,
  paneId = 'pane-main',
  resolveInstrumentId,
  resolveMarketEpochMs,
  resolveSelectionAt = () => null,
  selectionTolerancePx = 6,
  series,
} = {}) {
  requireEnvironment({
    chart, eventTarget, host, resolveInstrumentId, resolveMarketEpochMs, resolveSelectionAt, series,
  });
  const acceptedPaneId = requirePaneId(paneId);
  const thresholdSquared = requireThreshold(dragThresholdPx) ** 2;
  const selectionTolerance = requireThreshold(selectionTolerancePx);
  let active = null;
  let disposed = false;
  let gesture = null;
  let leaseRevision = 0;
  let selectionCandidate = null;
  let suppressContextMenuUntil = 0;
  const selectionSubscribers = new Set();
  let sequence = 0;

  function plotPoint(event) {
    const rect = host.getBoundingClientRect();
    const point = Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    const pane = chart.paneSize(0);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > pane.width || point.y > pane.height) return null;
    return point;
  }

  function anchorAt(event) {
    const point = plotPoint(event);
    if (point === null) return null;
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
    if (active === null) {
      if (event.button === 0) suppressContextMenuUntil = 0;
      const point = plotPoint(event);
      if (point !== null && event.button === 0 && event.isPrimary !== false) {
        selectionCandidate = Object.freeze({
          clientX: event.clientX,
          clientY: event.clientY,
          point,
          pointerId: event.pointerId,
        });
      }
      return;
    }
    if (event.button === 2) {
      // A real browser may cancel or blur the active lease before it dispatches
      // the later contextmenu event. Retain this one-shot suppression window so
      // that cancel and native-menu suppression remain one interaction.
      suppressContextMenuUntil = Date.now() + 1_000;
      consumePointerEvent(event);
      cancel('secondary-button');
      return;
    }
    if (event.button !== 0 || event.isPrimary === false) return;
    if (gesture?.phase === 'placing') {
      const normalized = safeAnchorAt(event);
      if (normalized === null) return;
      consumePointerEvent(event);
      finish('end', normalized);
      return;
    }
    if (gesture !== null) return;
    const normalized = safeAnchorAt(event);
    if (normalized === null) return;
    consumePointerEvent(event);
    gesture = {
      dragged: false,
      phase: 'pressed-start',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
    active.pointerId = event.pointerId;
    try { host.setPointerCapture?.(event.pointerId); } catch { /* Window listeners still own cleanup. */ }
    try { active.handlers.onStart(normalized); } catch { cancel('handler-failed'); }
  }

  function onPointerMove(event) {
    if (active === null) {
      if (selectionCandidate !== null && event.pointerId === selectionCandidate.pointerId) {
        const x = event.clientX - selectionCandidate.clientX;
        const y = event.clientY - selectionCandidate.clientY;
        if (((x * x) + (y * y)) >= thresholdSquared) selectionCandidate = null;
      }
      return;
    }
    if (gesture?.phase === 'placing') {
      if (event.isPrimary === false) return;
      consumePointerEvent(event);
      const normalized = safeAnchorAt(event);
      if (normalized === null) return;
      try { active.handlers.onMove(normalized); } catch { cancel('handler-failed'); }
      return;
    }
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
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
    if (active === null) {
      const candidate = selectionCandidate;
      selectionCandidate = null;
      if (candidate === null || event.pointerId !== candidate.pointerId) return;
      let hit = null;
      try {
        hit = normalizeSelectionHit(resolveSelectionAt(Object.freeze({
          paneId: acceptedPaneId,
          tolerancePx: selectionTolerance,
          x: candidate.point.x,
          y: candidate.point.y,
        })));
      } catch { hit = null; }
      const eventValue = Object.freeze({ hit, paneId: acceptedPaneId });
      for (const subscriber of selectionSubscribers) {
        try { subscriber(eventValue); } catch { /* Selection observers never own Chart state. */ }
      }
      return;
    }
    if (gesture === null || gesture.phase !== 'pressed-start'
      || event.pointerId !== gesture.pointerId) return;
    consumePointerEvent(event);
    if (!gesture.dragged) {
      gesture = { phase: 'placing', pointerId: null };
      releaseCapture(active);
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
    if (active === null && selectionCandidate?.pointerId === event.pointerId) {
      selectionCandidate = null;
      return;
    }
    if (gesture?.phase === 'pressed-start' && event.pointerId === gesture.pointerId) {
      consumePointerEvent(event);
      cancel('pointer-cancel');
    }
  }

  function onContextMenu(event) {
    const followsConsumedSecondaryButton = Date.now() <= suppressContextMenuUntil;
    if (active === null && !followsConsumedSecondaryButton) return;
    suppressContextMenuUntil = 0;
    consumePointerEvent(event);
    cancel('secondary-button');
  }

  function onKeydown(event) {
    if (active === null || event.key !== 'Escape') return;
    event.preventDefault?.();
    cancel('escape');
  }

  function onBlur() { cancel('focus-loss'); }
  function onLostPointerCapture(event) {
    if (gesture?.phase === 'pressed-start' && event.pointerId === gesture.pointerId) {
      cancel('lost-pointer-capture');
    }
  }

  host.addEventListener('pointerdown', onPointerDown, true);
  host.addEventListener('contextmenu', onContextMenu, true);
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
      selectionCandidate = null;
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
      selectionCandidate = null;
      suppressContextMenuUntil = 0;
      selectionSubscribers.clear();
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('contextmenu', onContextMenu, true);
      host.removeEventListener('lostpointercapture', onLostPointerCapture, true);
      eventTarget.removeEventListener('pointermove', onPointerMove, true);
      eventTarget.removeEventListener('pointerup', onPointerUp, true);
      eventTarget.removeEventListener('pointercancel', onPointerCancel, true);
      eventTarget.removeEventListener('keydown', onKeydown, true);
      eventTarget.removeEventListener('blur', onBlur, true);
    },
    subscribeSelection(listener) {
      if (disposed) failProjection('ANNOTATION_INTERACTION_PORT_DISPOSED', 'Interaction port is disposed.');
      if (typeof listener !== 'function') {
        failProjection('ANNOTATION_SELECTION_LISTENER_INVALID', 'Selection listener must be a function.');
      }
      selectionSubscribers.add(listener);
      let subscribed = true;
      return Object.freeze({
        unsubscribe() {
          if (!subscribed) return;
          subscribed = false;
          selectionSubscribers.delete(listener);
        },
      });
    },
    snapshot: () => Object.freeze({
      active: active !== null,
      disposed,
      gestureActive: gesture !== null,
      gesturePhase: gesture?.phase ?? null,
      leaseRevision,
      nativeSuppressed: active !== null && !active.nativeRestored,
      paneId: acceptedPaneId,
      selectionSubscriberCount: selectionSubscribers.size,
    }),
  });
}
