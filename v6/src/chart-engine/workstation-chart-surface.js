import { createChartHostManager } from './chart-host-manager.js';
import {
  calculatePaneResizeCoordinatePercent,
  createGridTemplatesFromRatios,
  getPaneResizeHandles,
  normalizePaneResizeRatios,
  resizePaneRatiosByHandle,
} from './pane-resize-model.js';
import { CHART_SURFACE_EVENTS } from '../contracts/app-contracts.js';
import { emitEvent as emitRuntimeEvent } from '../runtime/events.js';

const DEFAULT_CHART_OPTIONS = Object.freeze({
  grid: {
    horzLines: { color: 'rgba(100, 116, 139, 0.24)' },
    vertLines: { color: 'rgba(100, 116, 139, 0.24)' },
  },
  layout: {
    background: { color: '#0f1721', type: 'solid' },
    textColor: '#c9d6df',
  },
  rightPriceScale: {
    borderColor: 'rgba(56, 189, 248, 0.2)',
    visible: true,
  },
  timeScale: {
    borderColor: 'rgba(56, 189, 248, 0.2)',
    timeVisible: true,
    visible: true,
  },
});

const DEFAULT_SERIES_OPTIONS = Object.freeze({
  borderVisible: false,
  downColor: '#f25f68',
  upColor: '#36b7a8',
  wickDownColor: '#c94c58',
  wickUpColor: '#2a958b',
});

const PROGRAMMATIC_RANGE_SUPPRESSION_MS = 80;
const PROGRAMMATIC_RANGE_EPSILON = 2;
const USER_RANGE_DRAG_RELEASE_GRACE_MS = 80;
const USER_RANGE_WHEEL_WINDOW_MS = 2000;
const WHEEL_PREPEND_STABILIZE_DELAY_MS = 120;
const SYNTHETIC_RELEASE_EVENT_TYPES = Object.freeze(['mouseup', 'pointerup']);
const LAYOUT_PANE_COUNTS = Object.freeze({
  single: 1,
  triple: 3,
  twice: 2,
});
const LAYOUT_VARIANTS_BY_MODE = Object.freeze({
  single: Object.freeze(['single']),
  triple: Object.freeze(['triple-columns', 'triple-rows', 'triple-right-stack', 'triple-left-stack']),
  twice: Object.freeze(['twice-vertical', 'twice-horizontal']),
});
const DEFAULT_LAYOUT_VARIANT_BY_MODE = Object.freeze({
  single: 'single',
  triple: 'triple-columns',
  twice: 'twice-vertical',
});
const LAYOUT_GRID_AREAS_BY_VARIANT = Object.freeze({
  single: Object.freeze(['1 / 1 / 2 / 2']),
  'triple-columns': Object.freeze(['1 / 1 / 2 / 2', '1 / 2 / 2 / 3', '1 / 3 / 2 / 4']),
  'triple-left-stack': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '1 / 2 / 3 / 3']),
  'triple-right-stack': Object.freeze(['1 / 1 / 3 / 2', '1 / 2 / 2 / 3', '2 / 2 / 3 / 3']),
  'triple-rows': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2', '3 / 1 / 4 / 2']),
  'twice-horizontal': Object.freeze(['1 / 1 / 2 / 2', '2 / 1 / 3 / 2']),
  'twice-vertical': Object.freeze(['1 / 1 / 2 / 2', '1 / 2 / 2 / 3']),
});

function normalizeLayoutMode(mode = 'single') {
  const normalized = String(mode || '').trim();
  if (!Object.hasOwn(LAYOUT_PANE_COUNTS, normalized)) {
    throw new Error(`Unsupported chart surface layout mode: ${mode}`);
  }
  return normalized;
}

function normalizeLayoutVariant(mode, variant = null) {
  const normalizedMode = normalizeLayoutMode(mode);
  const fallback = DEFAULT_LAYOUT_VARIANT_BY_MODE[normalizedMode];
  const normalized = String(variant || fallback).trim();
  if (!LAYOUT_VARIANTS_BY_MODE[normalizedMode].includes(normalized)) {
    throw new Error(`Unsupported chart surface layout variant: ${variant}`);
  }
  return normalized;
}

function measureHost(host) {
  const rect = host.getBoundingClientRect?.() ?? {};
  return {
    height: Math.max(1, Math.round(Number(rect.height) || host.clientHeight || 420)),
    width: Math.max(1, Math.round(Number(rect.width) || host.clientWidth || 800)),
  };
}

function resolvePaneId(host) {
  return String(host.dataset.v6PaneId || 'default').trim() || 'default';
}

function findHosts(root, selector) {
  if (typeof root.querySelectorAll === 'function') {
    return Array.from(root.querySelectorAll(selector) || []);
  }
  const host = root.querySelector?.(selector);
  return host ? [host] : [];
}

function rangesNear(left = {}, right = {}) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= PROGRAMMATIC_RANGE_EPSILON &&
    Math.abs(Number(left.to) - Number(right.to)) <= PROGRAMMATIC_RANGE_EPSILON
  );
}

function findPaneSnapshot(manager, paneId) {
  return manager.snapshot().panes.find((pane) => pane.paneId === paneId) || null;
}

export function mountWorkstationChartSurface(root, {
  chartOptions = {},
  emitEvent = emitRuntimeEvent,
  hostSelector = '[data-v6-chart-engine-host]',
  managerFactory = createChartHostManager,
  seriesOptions = {},
} = {}) {
  if (!root) {
    throw new Error('Workstation chart surface root is required.');
  }

  const hosts = findHosts(root, hostSelector);
  if (!hosts.length) {
    throw new Error(`Workstation chart surface host "${hostSelector}" is missing.`);
  }

  const hostsByPaneId = new Map();
  hosts.forEach((host) => {
    const paneId = resolvePaneId(host);
    if (hostsByPaneId.has(paneId)) {
      throw new Error(`Workstation chart surface pane "${paneId}" host is duplicated.`);
    }
    hostsByPaneId.set(paneId, host);
  });
  const appliedChartDataByPaneId = new Map();
  const appliedViewportByPaneId = new Map();
  const crosshairByPaneId = new Map();
  const measuredVisibleRangeByPaneId = new Map();
  const programmaticRangeByPaneId = new Map();
  const chartSurfaceElement = root.querySelector?.('[data-v6-chart-surface]') || null;
  const chartPaneLayerElement = root.querySelector?.('[data-v6-chart-pane-layer]') || null;
  const crosshairListeners = new Set();
  const hostFocusHandlers = new Map();
  const hostInputStartHandlers = new Map();
  const hostWheelHandlers = new Map();
  const lastWheelRangeInputByPaneId = new Map();
  const paneActivationListeners = new Set();
  const visibleRangeListeners = new Set();
  const paneResizeRatiosByVariant = new Map();
  const paneResizeHandleElements = new Map();
  let activePaneResize = null;
  let activePaneId = hosts.slice(0, 1).map(resolvePaneId)[0] || null;
  let layoutSnapshot = {
    mode: 'single',
    paneCount: 1,
    variant: 'single',
    visiblePaneIds: hosts.slice(0, 1).map(resolvePaneId),
  };
  let destroyed = false;
  let maximizedPaneId = null;
  let pendingLayoutResizeFrame = null;
  const pendingPriceScaleResetFrames = new Map();
  const pendingWheelPrependStabilizationTimers = new Map();
  let readoutPaneId = null;
  let restoreLayoutSnapshot = null;
  let activeUserRangeGestures = 0;
  let userRangeInputUntil = 0;
  const size = measureHost(hosts[0]);
  const manager = managerFactory({
    chartOptions: {
      ...DEFAULT_CHART_OPTIONS,
      ...chartOptions,
      height: chartOptions.height ?? size.height,
      width: chartOptions.width ?? size.width,
    },
    seriesOptions: {
      ...DEFAULT_SERIES_OPTIONS,
      ...seriesOptions,
    },
  });

  hostsByPaneId.forEach((host, paneId) => {
    manager.mountPane({ host, paneId });
  });
  const unsubscribeVisibleRangeCallbacks = typeof manager.subscribeVisibleLogicalRangeChange === 'function'
    ? [...hostsByPaneId.keys()].map((paneId) => manager.subscribeVisibleLogicalRangeChange(paneId, ({ paneId: changedPaneId, range } = {}) => {
        if (!range) return;
        const record = {
          from: Number(range.from),
          paneId: changedPaneId,
          to: Number(range.to),
        };
        measuredVisibleRangeByPaneId.set(changedPaneId, record);
        const programmaticRange = programmaticRangeByPaneId.get(changedPaneId);
        if (programmaticRange && Date.now() <= programmaticRange.suppressUntil && rangesNear(record, programmaticRange)) {
          return;
        }
        if (!isUserRangeInputActive()) {
          return;
        }
        visibleRangeListeners.forEach((listener) => listener({ ...record }));
      }))
    : [];
  const unsubscribeCrosshairCallbacks = typeof manager.subscribeCrosshairMove === 'function'
    ? [...hostsByPaneId.keys()].map((paneId) => manager.subscribeCrosshairMove(paneId, (payload = {}) => {
        const recordPaneId = String(payload.paneId || paneId);
        const hasSelectedBar = Boolean(payload.bar);
        const displayReadout = hasSelectedBar || recordPaneId === readoutPaneId;
        if (hasSelectedBar) {
          readoutPaneId = recordPaneId;
        } else if (recordPaneId === readoutPaneId) {
          readoutPaneId = null;
        }
        const record = {
          bar: payload.bar ? { ...payload.bar } : null,
          displayReadout,
          paneId: recordPaneId,
          point: payload.point ? { ...payload.point } : null,
          time: payload.time ?? null,
        };
        crosshairByPaneId.set(record.paneId, record);
        emitEvent(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, record);
        crosshairListeners.forEach((listener) => listener({ ...record, bar: record.bar ? { ...record.bar } : null }));
      }))
    : [];

  function isUserRangeInputActive() {
    return activeUserRangeGestures > 0 || Date.now() <= userRangeInputUntil;
  }

  const markUserRangeDragStart = () => {
    activeUserRangeGestures += 1;
    userRangeInputUntil = Date.now() + USER_RANGE_DRAG_RELEASE_GRACE_MS;
  };
  const markUserRangeDragEnd = () => {
    activeUserRangeGestures = 0;
    userRangeInputUntil = Date.now() + USER_RANGE_DRAG_RELEASE_GRACE_MS;
  };
  const markUserRangeWheelInput = (paneId = null) => {
    userRangeInputUntil = Date.now() + USER_RANGE_WHEEL_WINDOW_MS;
    const normalizedPaneId = String(paneId || '').trim();
    if (normalizedPaneId) {
      lastWheelRangeInputByPaneId.set(normalizedPaneId, {
        until: userRangeInputUntil,
      });
    }
  };
  function isRecentWheelRangeInput(paneId) {
    const record = lastWheelRangeInputByPaneId.get(paneId);
    if (!record) return false;
    if (Date.now() <= Number(record.until)) return true;
    lastWheelRangeInputByPaneId.delete(paneId);
    return false;
  }
  function clearWheelPrependStabilization(paneId) {
    const timer = pendingWheelPrependStabilizationTimers.get(paneId);
    if (timer !== undefined && typeof clearTimeout === 'function') {
      clearTimeout(timer);
    }
    pendingWheelPrependStabilizationTimers.delete(paneId);
  }
  function applyProgrammaticVisibleRange(paneId, range) {
    const record = {
      from: Number(range.from),
      suppressUntil: Date.now() + PROGRAMMATIC_RANGE_SUPPRESSION_MS,
      to: Number(range.to),
    };
    programmaticRangeByPaneId.set(paneId, record);
    return manager.setVisibleLogicalRange(paneId, {
      from: record.from,
      to: record.to,
    });
  }
  function scheduleWheelPrependStabilization(paneId, range) {
    if (!isRecentWheelRangeInput(paneId) || typeof setTimeout !== 'function') {
      return null;
    }
    clearWheelPrependStabilization(paneId);
    const targetRange = {
      from: Number(range.from),
      to: Number(range.to),
    };
    const timer = setTimeout(() => {
      pendingWheelPrependStabilizationTimers.delete(paneId);
      if (destroyed || !hostsByPaneId.has(paneId)) {
        return;
      }
      const measuredRange = typeof manager.measureVisibleLogicalRange === 'function'
        ? manager.measureVisibleLogicalRange(paneId)
        : measuredVisibleRangeByPaneId.get(paneId);
      if (measuredRange && rangesNear(measuredRange, targetRange)) {
        return;
      }
      applyProgrammaticVisibleRange(paneId, targetRange);
    }, WHEEL_PREPEND_STABILIZE_DELAY_MS);
    pendingWheelPrependStabilizationTimers.set(paneId, timer);
    return timer;
  }
  function activatePane(paneId, origin = 'host-input') {
    const normalizedPaneId = String(paneId || '').trim();
    if (!normalizedPaneId || !hostsByPaneId.has(normalizedPaneId)) {
      return null;
    }
    activePaneId = normalizedPaneId;
    const record = {
      origin,
      paneId: normalizedPaneId,
    };
    hostsByPaneId.forEach((host, hostPaneId) => {
      host.dataset.v6ChartPaneActive = String(hostPaneId === normalizedPaneId);
    });
    paneActivationListeners.forEach((listener) => listener({ ...record }));
    return record;
  }
  function dispatchSyntheticRelease(target, eventName) {
    if (!target || typeof target.dispatchEvent !== 'function') {
      return;
    }
    const ownerDocument = target.ownerDocument || root.ownerDocument || globalThis.document;
    const ownerWindow = ownerDocument?.defaultView || globalThis.window;
    const EventCtor = eventName.startsWith('pointer')
      ? ownerWindow?.PointerEvent
      : ownerWindow?.MouseEvent;
    const FallbackCtor = ownerWindow?.Event || globalThis.Event;
    try {
      const event = EventCtor
        ? new EventCtor(eventName, { bubbles: true, buttons: 0, cancelable: true })
        : new FallbackCtor(eventName, { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
    } catch {
      try {
        target.dispatchEvent({ bubbles: true, buttons: 0, type: eventName });
      } catch {
        // Release recovery is best-effort; normal document release listeners remain authoritative.
      }
    }
  }
  function forceUserRangeDragRelease(event = {}) {
    if (activeUserRangeGestures <= 0) {
      return;
    }
    if (Number(event.buttons ?? 0) !== 0) {
      return;
    }
    markUserRangeDragEnd();
    const ownerDocument = event.target?.ownerDocument || root.ownerDocument || globalThis.document;
    const ownerWindow = ownerDocument?.defaultView || globalThis.window;
    SYNTHETIC_RELEASE_EVENT_TYPES.forEach((eventName) => {
      hosts.forEach((host) => dispatchSyntheticRelease(host, eventName));
      dispatchSyntheticRelease(ownerDocument, eventName);
      dispatchSyntheticRelease(ownerWindow, eventName);
    });
  }
  const userInputStartEvents = ['pointerdown', 'mousedown', 'touchstart'];
  const userInputReleaseEvents = ['pointerup', 'pointercancel', 'mouseup', 'touchend', 'touchcancel'];
  const userInputMoveEvents = ['pointermove', 'mousemove'];
  const userInputReleaseTargets = new Set();
  hosts.forEach((host) => {
    const paneId = resolvePaneId(host);
    userInputStartEvents.forEach((eventName) => {
      const handler = (event) => {
        activatePane(paneId, eventName);
        markUserRangeDragStart(event);
      };
      hostInputStartHandlers.set(`${paneId}:${eventName}`, handler);
      host.addEventListener?.(eventName, handler, { passive: true });
    });
    const focusHandler = () => activatePane(paneId, 'focusin');
    hostFocusHandlers.set(paneId, focusHandler);
    host.addEventListener?.('focusin', focusHandler, { passive: true });
    const wheelHandler = () => {
      activatePane(paneId, 'wheel');
      markUserRangeWheelInput(paneId);
    };
    hostWheelHandlers.set(paneId, wheelHandler);
    host.addEventListener?.('wheel', wheelHandler, { passive: true });
    const releaseTarget = host.ownerDocument || root.ownerDocument || globalThis.document;
    if (releaseTarget) {
      userInputReleaseTargets.add(releaseTarget);
    }
  });
  activatePane(activePaneId, 'initial');
  userInputReleaseTargets.forEach((target) => {
    userInputReleaseEvents.forEach((eventName) => {
      target.addEventListener?.(eventName, markUserRangeDragEnd, { passive: true });
    });
    userInputMoveEvents.forEach((eventName) => {
      target.addEventListener?.(eventName, forceUserRangeDragRelease, { passive: true });
    });
  });

  function resize() {
    if (destroyed) {
      return [];
    }
    const mountedPanes = manager.snapshot().panes;
    return [...hostsByPaneId.entries()]
      .map(([paneId, host]) => {
        if (host.hidden) {
          return null;
        }
        const record = mountedPanes.find((pane) => pane.paneId === paneId);
        if (!record?.snapshot?.mounted) {
          return null;
        }
        return manager.resizePane(paneId, measureHost(host));
      })
      .filter(Boolean);
  }

  function getPaneResizeRatios(variant) {
    const existing = paneResizeRatiosByVariant.get(variant);
    const normalized = normalizePaneResizeRatios(variant, existing);
    paneResizeRatiosByVariant.set(variant, normalized);
    return normalized;
  }

  function applyPaneResizeTemplates(variant = layoutSnapshot.variant) {
    if (!chartPaneLayerElement?.style) {
      return null;
    }
    const templates = createGridTemplatesFromRatios(getPaneResizeRatios(variant));
    chartPaneLayerElement.style.gridTemplateColumns = templates.columns;
    chartPaneLayerElement.style.gridTemplateRows = templates.rows;
    updatePaneResizeHandles(variant);
    return templates;
  }

  function positionPaneResizeHandle(element, handle, ratios) {
    const columns = ratios.columns;
    const rows = ratios.rows;
    element.style.left = '';
    element.style.right = '';
    element.style.top = '';
    element.style.bottom = '';
    element.style.width = '';
    element.style.height = '';
    element.style.transform = '';
    if (handle.orientation === 'vertical') {
      element.style.left = `${handle.offset}%`;
      element.style.top = '0';
      element.style.bottom = '0';
      element.style.width = '10px';
      element.style.transform = 'translateX(-5px)';
      return;
    }
    element.style.top = `${handle.offset}%`;
    element.style.height = '10px';
    element.style.transform = 'translateY(-5px)';
    if (handle.region === 'left') {
      element.style.left = '0';
      element.style.width = `${columns[0]}%`;
      return;
    }
    if (handle.region === 'right') {
      element.style.left = `${columns[0]}%`;
      element.style.right = '0';
      return;
    }
    element.style.left = '0';
    element.style.right = '0';
  }

  function createPaneResizeHandleElement(handle) {
    const ownerDocument = chartSurfaceElement?.ownerDocument || root.ownerDocument || globalThis.document;
    if (!ownerDocument?.createElement || !chartSurfaceElement?.appendChild) {
      return null;
    }
    const element = ownerDocument.createElement('div');
    element.className = `chart-pane-resize-handle chart-pane-resize-handle-${handle.orientation}`;
    element.dataset.v6PaneResizeHandle = handle.id;
    element.dataset.v6PaneResizeAxis = handle.axis;
    element.dataset.v6PaneResizeRegion = handle.region;
    element.setAttribute?.('role', 'separator');
    element.setAttribute?.('aria-orientation', handle.orientation === 'vertical' ? 'vertical' : 'horizontal');
    element.addEventListener?.('pointerdown', onPaneResizePointerDown);
    chartSurfaceElement.appendChild(element);
    return element;
  }

  function updatePaneResizeHandles(variant = layoutSnapshot.variant) {
    const handles = getPaneResizeHandles(variant, getPaneResizeRatios(variant));
    const nextHandleIds = new Set(handles.map((handle) => handle.id));
    for (const [handleId, element] of paneResizeHandleElements.entries()) {
      if (!nextHandleIds.has(handleId)) {
        element.removeEventListener?.('pointerdown', onPaneResizePointerDown);
        element.remove?.();
        paneResizeHandleElements.delete(handleId);
      }
    }
    const ratios = getPaneResizeRatios(variant);
    handles.forEach((handle) => {
      let element = paneResizeHandleElements.get(handle.id);
      if (!element) {
        element = createPaneResizeHandleElement(handle);
        if (element) {
          paneResizeHandleElements.set(handle.id, element);
        }
      }
      if (!element) {
        return;
      }
      element.className = `chart-pane-resize-handle chart-pane-resize-handle-${handle.orientation}`;
      element.hidden = false;
      element.dataset.v6PaneResizeAxis = handle.axis;
      element.dataset.v6PaneResizeRegion = handle.region;
      element.dataset.v6PaneResizeVariant = variant;
      positionPaneResizeHandle(element, handle, ratios);
    });
  }

  function clearPaneResizeHandles() {
    for (const element of paneResizeHandleElements.values()) {
      element.removeEventListener?.('pointerdown', onPaneResizePointerDown);
      element.remove?.();
    }
    paneResizeHandleElements.clear();
  }

  function endPaneResize() {
    if (!activePaneResize) {
      return;
    }
    const { ownerDocument, moveHandler, upHandler } = activePaneResize;
    ownerDocument?.removeEventListener?.('pointermove', moveHandler);
    ownerDocument?.removeEventListener?.('pointerup', upHandler);
    ownerDocument?.removeEventListener?.('pointercancel', upHandler);
    chartSurfaceElement?.classList?.remove?.('is-pane-resizing');
    activePaneResize = null;
  }

  function updatePaneResizeFromPointer(handleId, point) {
    const variant = layoutSnapshot.variant;
    const handle = getPaneResizeHandles(variant, getPaneResizeRatios(variant)).find((candidate) => candidate.id === handleId);
    const rect = chartPaneLayerElement?.getBoundingClientRect?.();
    if (!handle || !rect) {
      return null;
    }
    const coordinatePercent = calculatePaneResizeCoordinatePercent(handle, point, rect);
    const nextRatios = resizePaneRatiosByHandle(variant, getPaneResizeRatios(variant), handleId, coordinatePercent);
    paneResizeRatiosByVariant.set(variant, nextRatios);
    const templates = applyPaneResizeTemplates(variant);
    resize();
    scheduleLayoutResize();
    return templates;
  }

  function onPaneResizePointerDown(event = {}) {
    const handleId = event.currentTarget?.dataset?.v6PaneResizeHandle;
    if (!handleId || !chartPaneLayerElement) {
      return;
    }
    event.preventDefault?.();
    event.stopPropagation?.();
    const ownerDocument = event.currentTarget?.ownerDocument || chartSurfaceElement?.ownerDocument || root.ownerDocument || globalThis.document;
    const moveHandler = (moveEvent = {}) => {
      moveEvent.preventDefault?.();
      updatePaneResizeFromPointer(handleId, moveEvent);
    };
    const upHandler = () => endPaneResize();
    endPaneResize();
    activePaneResize = { handleId, moveHandler, ownerDocument, upHandler };
    chartSurfaceElement?.classList?.add?.('is-pane-resizing');
    ownerDocument?.addEventListener?.('pointermove', moveHandler);
    ownerDocument?.addEventListener?.('pointerup', upHandler, { once: true });
    ownerDocument?.addEventListener?.('pointercancel', upHandler, { once: true });
    updatePaneResizeFromPointer(handleId, event);
  }

  function scheduleLayoutResize() {
    if (typeof requestAnimationFrame !== 'function') {
      return [];
    }
    if (pendingLayoutResizeFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(pendingLayoutResizeFrame);
    }
    pendingLayoutResizeFrame = requestAnimationFrame(() => {
      pendingLayoutResizeFrame = requestAnimationFrame(() => {
        pendingLayoutResizeFrame = null;
        resize();
      });
    });
    return pendingLayoutResizeFrame;
  }

  function resetPriceScale(paneId) {
    manager.resetPriceScale?.(paneId);
    if (typeof requestAnimationFrame !== 'function') {
      return null;
    }
    const existingFrame = pendingPriceScaleResetFrames.get(paneId);
    if (existingFrame !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(existingFrame);
    }
    const frame = requestAnimationFrame(() => {
      const nextFrame = requestAnimationFrame(() => {
        pendingPriceScaleResetFrames.delete(paneId);
        if (!destroyed && hostsByPaneId.has(paneId)) {
          manager.resetPriceScale?.(paneId);
        }
      });
      pendingPriceScaleResetFrames.set(paneId, nextFrame);
    });
    pendingPriceScaleResetFrames.set(paneId, frame);
    return frame;
  }

  function normalizeLayoutSnapshot(snapshot = {}) {
    const mode = normalizeLayoutMode(snapshot.mode);
    const variant = normalizeLayoutVariant(mode, snapshot.variant);
    const paneCount = LAYOUT_PANE_COUNTS[mode];
    return {
      mode,
      paneCount,
      variant,
      visiblePaneIds: hosts.slice(0, paneCount).map(resolvePaneId),
    };
  }

  function applyVisibleLayout({ gridAreas, mode, paneCount, variant, visiblePaneIds }) {
    const visiblePaneSet = new Set(visiblePaneIds);
    if (!visiblePaneSet.has(activePaneId)) {
      activePaneId = visiblePaneIds[0] || activePaneId;
    }
    hosts.forEach((host) => {
      const paneId = resolvePaneId(host);
      const visibleIndex = visiblePaneIds.indexOf(paneId);
      const visible = visiblePaneSet.has(paneId);
      host.hidden = !visible;
      host.dataset.v6ChartPaneVisible = String(visible);
      host.dataset.v6ChartPaneSlot = visible ? String(visibleIndex + 1) : '';
      if (host.style) {
        host.style.gridArea = visible ? gridAreas[visibleIndex] : '';
      }
      if (visible) {
        host.removeAttribute?.('aria-hidden');
      } else {
        host.setAttribute?.('aria-hidden', 'true');
      }
      host.dataset.v6ChartPaneActive = String(paneId === activePaneId);
    });
    layoutSnapshot = {
      mode,
      paneCount,
      variant,
      visiblePaneIds,
    };
    if (chartSurfaceElement?.dataset) {
      chartSurfaceElement.dataset.v6ChartLayoutMode = mode;
      chartSurfaceElement.dataset.v6ChartLayoutPaneCount = String(paneCount);
      chartSurfaceElement.dataset.v6ChartLayoutVariant = variant;
      chartSurfaceElement.dataset.v6ChartMaximizedPaneId = maximizedPaneId || '';
    }
    if (chartPaneLayerElement?.dataset) {
      chartPaneLayerElement.dataset.v6ChartLayoutMode = mode;
      chartPaneLayerElement.dataset.v6ChartLayoutPaneCount = String(paneCount);
      chartPaneLayerElement.dataset.v6ChartLayoutVariant = variant;
      chartPaneLayerElement.dataset.v6ChartMaximizedPaneId = maximizedPaneId || '';
    }
    resize();
    scheduleLayoutResize();
    return { ...layoutSnapshot, visiblePaneIds: [...layoutSnapshot.visiblePaneIds] };
  }

  function applyNormalLayoutSnapshot(snapshot = {}) {
    const normalized = normalizeLayoutSnapshot(snapshot);
    applyPaneResizeTemplates(normalized.variant);
    return applyVisibleLayout({
      ...normalized,
      gridAreas: LAYOUT_GRID_AREAS_BY_VARIANT[normalized.variant],
    });
  }

  function applyMaximizedPaneLayout(paneId) {
    if (!hostsByPaneId.has(paneId)) {
      throw new Error(`Workstation chart surface pane "${paneId}" does not exist.`);
    }
    if (chartPaneLayerElement?.style) {
      chartPaneLayerElement.style.gridTemplateColumns = 'minmax(0, 1fr)';
      chartPaneLayerElement.style.gridTemplateRows = 'minmax(0, 1fr)';
    }
    clearPaneResizeHandles();
    return applyVisibleLayout({
      mode: restoreLayoutSnapshot?.mode || layoutSnapshot.mode,
      paneCount: 1,
      variant: restoreLayoutSnapshot?.variant || layoutSnapshot.variant,
      visiblePaneIds: [paneId],
      gridAreas: ['1 / 1 / 2 / 2'],
    });
  }

  function applyLayoutSnapshot(snapshot = {}) {
    const normalized = normalizeLayoutSnapshot(snapshot);
    if (maximizedPaneId) {
      restoreLayoutSnapshot = {
        ...normalized,
        visiblePaneIds: [...normalized.visiblePaneIds],
      };
      return applyMaximizedPaneLayout(maximizedPaneId);
    }
    restoreLayoutSnapshot = null;
    return applyNormalLayoutSnapshot(normalized);
  }

  function maximizePane(paneId) {
    const targetPaneId = String(paneId || '').trim();
    if (!targetPaneId || !hostsByPaneId.has(targetPaneId)) {
      throw new Error(`Workstation chart surface pane "${paneId}" does not exist.`);
    }
    if (!maximizedPaneId) {
      restoreLayoutSnapshot = {
        ...layoutSnapshot,
        visiblePaneIds: [...layoutSnapshot.visiblePaneIds],
      };
    }
    maximizedPaneId = targetPaneId;
    return applyMaximizedPaneLayout(targetPaneId);
  }

  function restorePane() {
    if (!maximizedPaneId) {
      return { ...layoutSnapshot, visiblePaneIds: [...layoutSnapshot.visiblePaneIds] };
    }
    const restoreSnapshot = restoreLayoutSnapshot
      ? { ...restoreLayoutSnapshot, visiblePaneIds: [...restoreLayoutSnapshot.visiblePaneIds] }
      : normalizeLayoutSnapshot({ mode: layoutSnapshot.mode, variant: layoutSnapshot.variant });
    maximizedPaneId = null;
    restoreLayoutSnapshot = null;
    return applyNormalLayoutSnapshot(restoreSnapshot);
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => resize())
    : null;
  hosts.forEach((host) => resizeObserver?.observe(host));

  return {
    applyChartDataRecord(record = {}) {
      const recordPaneId = String(record.paneId || '').trim();
      if (!recordPaneId) {
        throw new Error('Workstation chart surface chart-data record requires paneId.');
      }
      if (!hostsByPaneId.has(recordPaneId)) {
        return null;
      }
      const previousChartData = appliedChartDataByPaneId.get(recordPaneId);
      const previousVisibleRange = measuredVisibleRangeByPaneId.get(recordPaneId);
      const snapshot = manager.setData(recordPaneId, record.bars || []);
      appliedChartDataByPaneId.set(recordPaneId, {
        barCount: record.bars?.length || 0,
        paneId: recordPaneId,
        revision: Number(record.revision) || 0,
      });
      const prependedBarCount = (record.operation === 'prepend' && previousVisibleRange && previousChartData)
        ? Math.max(0, (record.bars?.length || 0) - previousChartData.barCount)
        : 0;
      if (prependedBarCount > 0) {
        const shiftedRange = {
          from: Number(previousVisibleRange.from) + prependedBarCount,
          to: Number(previousVisibleRange.to) + prependedBarCount,
        };
        const stabilizedSnapshot = applyProgrammaticVisibleRange(recordPaneId, shiftedRange);
        scheduleWheelPrependStabilization(recordPaneId, shiftedRange);
        return stabilizedSnapshot;
      }
      return snapshot;
    },
    applyViewportProjection(record = {}) {
      const recordPaneId = String(record.paneId || '').trim();
      if (!recordPaneId) {
        throw new Error('Workstation chart surface viewport projection requires paneId.');
      }
      if (!hostsByPaneId.has(recordPaneId)) {
        return null;
      }
      if (!record.projection) {
        return null;
      }
      appliedViewportByPaneId.set(recordPaneId, {
        chartBarsRevision: Number(record.chartBarsRevision) || 0,
        from: Number(record.projection.from),
        origin: record.projection.origin,
        paneId: recordPaneId,
        projectionRevision: Number(record.projection.revision) || 0,
        to: Number(record.projection.to),
      });
      programmaticRangeByPaneId.set(recordPaneId, {
        from: Number(record.projection.from),
        suppressUntil: Date.now() + PROGRAMMATIC_RANGE_SUPPRESSION_MS,
        to: Number(record.projection.to),
      });
      const measuredRange = measuredVisibleRangeByPaneId.get(recordPaneId);
      if (record.projection.origin === 'manual' && measuredRange && rangesNear(measuredRange, record.projection)) {
        return findPaneSnapshot(manager, recordPaneId);
      }
      const snapshot = manager.setVisibleLogicalRange(recordPaneId, {
        from: record.projection.from,
        to: record.projection.to,
      });
      if (record.projection.origin !== 'manual') {
        resetPriceScale(recordPaneId);
      }
      return snapshot;
    },
    applyCrosshairProjection(record = {}) {
      const recordPaneId = String(record.paneId || '').trim();
      if (!recordPaneId) {
        throw new Error('Workstation chart surface crosshair projection requires paneId.');
      }
      if (!hostsByPaneId.has(recordPaneId)) {
        return null;
      }
      if (record.clear) {
        return manager.clearCrosshairPosition?.(recordPaneId) || null;
      }
      const price = Number(record.price);
      const time = record.time;
      if (!Number.isFinite(price) || time == null) {
        return null;
      }
      return manager.setCrosshairPosition?.(recordPaneId, { price, time }) || null;
    },
    destroy() {
      destroyed = true;
      endPaneResize();
      for (const element of paneResizeHandleElements.values()) {
        element.removeEventListener?.('pointerdown', onPaneResizePointerDown);
        element.remove?.();
      }
      paneResizeHandleElements.clear();
      if (pendingLayoutResizeFrame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(pendingLayoutResizeFrame);
        pendingLayoutResizeFrame = null;
      }
      if (typeof cancelAnimationFrame === 'function') {
        for (const frame of pendingPriceScaleResetFrames.values()) {
          cancelAnimationFrame(frame);
        }
      }
      pendingPriceScaleResetFrames.clear();
      for (const paneId of pendingWheelPrependStabilizationTimers.keys()) {
        clearWheelPrependStabilization(paneId);
      }
      lastWheelRangeInputByPaneId.clear();
      unsubscribeCrosshairCallbacks.forEach((unsubscribeCrosshair) => unsubscribeCrosshair());
      unsubscribeVisibleRangeCallbacks.forEach((unsubscribeVisibleRange) => unsubscribeVisibleRange());
      hosts.forEach((host) => {
        const paneId = resolvePaneId(host);
        userInputStartEvents.forEach((eventName) => {
          host.removeEventListener?.(eventName, hostInputStartHandlers.get(`${paneId}:${eventName}`));
        });
        host.removeEventListener?.('focusin', hostFocusHandlers.get(paneId));
        host.removeEventListener?.('wheel', hostWheelHandlers.get(paneId));
      });
      hostFocusHandlers.clear();
      hostInputStartHandlers.clear();
      hostWheelHandlers.clear();
      userInputReleaseTargets.forEach((target) => {
        userInputReleaseEvents.forEach((eventName) => {
          target.removeEventListener?.(eventName, markUserRangeDragEnd);
        });
        userInputMoveEvents.forEach((eventName) => {
          target.removeEventListener?.(eventName, forceUserRangeDragRelease);
        });
      });
      resizeObserver?.disconnect();
      manager.destroyAll();
      crosshairListeners.clear();
      paneActivationListeners.clear();
      visibleRangeListeners.clear();
    },
    getState() {
      const snapshot = manager.snapshot();
      return {
        appliedChartData: [...appliedChartDataByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        appliedViewport: [...appliedViewportByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        hostConnected: hosts.every((host) => Boolean(host.isConnected)),
        hostSelector,
        layout: { ...layoutSnapshot, visiblePaneIds: [...layoutSnapshot.visiblePaneIds] },
        activePaneId,
        maximize: {
          maximizedPaneId,
          restoreLayout: restoreLayoutSnapshot
            ? { ...restoreLayoutSnapshot, visiblePaneIds: [...restoreLayoutSnapshot.visiblePaneIds] }
            : null,
        },
        paneResize: {
          handles: maximizedPaneId ? [] : getPaneResizeHandles(layoutSnapshot.variant, getPaneResizeRatios(layoutSnapshot.variant)),
          ratios: getPaneResizeRatios(layoutSnapshot.variant),
        },
        crosshair: [...crosshairByPaneId.values()]
          .map((record) => ({ ...record, bar: record.bar ? { ...record.bar } : null }))
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        measuredVisibleRange: [...measuredVisibleRangeByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        panes: snapshot.panes,
      };
    },
    applyLayoutSnapshot,
    maximizePane,
    resize,
    resizePaneByHandle(handleId, point) {
      return updatePaneResizeFromPointer(handleId, point);
    },
    restorePane,
    subscribePaneActivation(handler) {
      if (typeof handler !== 'function') {
        throw new Error('Workstation chart surface pane activation handler is required.');
      }
      paneActivationListeners.add(handler);
      return () => {
        paneActivationListeners.delete(handler);
      };
    },
    subscribeVisibleRangeChange(handler) {
      if (typeof handler !== 'function') {
        throw new Error('Workstation chart surface visible range handler is required.');
      }
      visibleRangeListeners.add(handler);
      return () => {
        visibleRangeListeners.delete(handler);
      };
    },
    subscribeCrosshairChange(handler) {
      if (typeof handler !== 'function') {
        throw new Error('Workstation chart surface crosshair handler is required.');
      }
      crosshairListeners.add(handler);
      return () => {
        crosshairListeners.delete(handler);
      };
    },
  };
}
