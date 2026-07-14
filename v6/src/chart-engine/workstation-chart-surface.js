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
import {
  createWorkstationLayoutSnapshot,
  LAYOUT_GRID_AREAS_BY_VARIANT,
} from './workstation-chart-layout-model.js';
import { createChartRangeInputController } from './chart-range-input-controller.js';
import { createCanvasSettingsChartOptions } from './canvas-settings-options.js';
import { createSymbolSettingsSeriesOptions } from './symbol-settings-options.js';

const DEFAULT_CHART_OPTIONS = Object.freeze({
  grid: {
    horzLines: { color: '#263441' },
    vertLines: { color: '#263441' },
  },
  layout: {
    background: { color: '#0f1721', type: 'solid' },
    fontSize: 12,
    textColor: '#c9d6df',
  },
  crosshair: {
    horzLine: { color: '#758696' },
    vertLine: { color: '#758696' },
  },
  rightPriceScale: {
    borderColor: '#163345',
    visible: true,
  },
  timeScale: {
    borderColor: '#163345',
    timeVisible: true,
    visible: true,
  },
});

const DEFAULT_SERIES_OPTIONS = Object.freeze({
  borderVisible: false,
  downColor: '#f25f68',
  priceFormat: { minMove: 0.01, precision: 2, type: 'price' },
  upColor: '#36b7a8',
  wickDownColor: '#c94c58',
  wickUpColor: '#2a958b',
});

const PROGRAMMATIC_RANGE_SUPPRESSION_MS = 80;
const PROGRAMMATIC_RANGE_EPSILON = 2;
const WHEEL_PREPEND_STABILIZE_DELAY_MS = 120;

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
  const barsByPaneId = new Map();
  const appliedViewportByPaneId = new Map();
  const crosshairByPaneId = new Map();
  const measuredVisibleRangeByPaneId = new Map();
  const programmaticRangeByPaneId = new Map();
  const chartSurfaceElement = root.querySelector?.('[data-v6-chart-surface]') || null;
  const chartPaneLayerElement = root.querySelector?.('[data-v6-chart-pane-layer]') || null;
  const crosshairListeners = new Set();
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
  let rangeInputController = {
    destroy() {},
    isRecentWheelInput: () => false,
    isUserRangeInputActive: () => false,
  };
  let readoutPaneId = null;
  let restoreLayoutSnapshot = null;
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
        if (!rangeInputController.isUserRangeInputActive()) {
          return;
        }
        visibleRangeListeners.forEach((listener) => listener({ ...record }));
      }))
    : [];
  const unsubscribeCrosshairCallbacks = typeof manager.subscribeCrosshairMove === 'function'
    ? [...hostsByPaneId.keys()].map((paneId) => manager.subscribeCrosshairMove(paneId, (payload = {}) => {
        const recordPaneId = String(payload.paneId || paneId);
        const hasSelectedBar = Boolean(payload.bar);
        const paneBars = barsByPaneId.get(recordPaneId) || [];
        const selectedIndex = hasSelectedBar
          ? paneBars.findIndex((bar) => Number(bar.timestamp) === Number(payload.bar.timestamp ?? payload.time))
          : -1;
        const previousClose = selectedIndex > 0 ? Number(paneBars[selectedIndex - 1]?.close) : null;
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
          ...(Number.isFinite(previousClose) ? { previousClose } : {}),
          time: payload.time ?? null,
        };
        crosshairByPaneId.set(record.paneId, record);
        emitEvent(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, record);
        crosshairListeners.forEach((listener) => listener({ ...record, bar: record.bar ? { ...record.bar } : null }));
      }))
    : [];

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
    if (!rangeInputController.isRecentWheelInput(paneId) || typeof setTimeout !== 'function') {
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
  function activatePane(paneId, origin = 'host-input', notify = true) {
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
    if (notify) {
      paneActivationListeners.forEach((listener) => listener({ ...record }));
    }
    return record;
  }
  rangeInputController = createChartRangeInputController({
    activatePane,
    hosts,
    resolvePaneId,
    root,
  });
  activatePane(activePaneId, 'initial');

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
    const normalized = createWorkstationLayoutSnapshot(snapshot, hosts.map(resolvePaneId));
    return { ...normalized, visiblePaneIds: [...normalized.visiblePaneIds] };
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
    applyDaySeparators(paneId, lines = [], { mode = 'off' } = {}) {
      const normalizedPaneId = String(paneId || '').trim();
      if (!hostsByPaneId.has(normalizedPaneId)) return null;
      const snapshot = manager.setDaySeparators?.(normalizedPaneId, lines) || null;
      if (chartSurfaceElement?.dataset) {
        chartSurfaceElement.dataset.v6ChartDaySeparators = String(mode);
        chartSurfaceElement.dataset.v6ChartDaySeparatorCount = String(
          manager.snapshot().panes.reduce(
            (total, pane) => total + Number(pane.snapshot.daySeparatorCount || 0),
            0,
          ),
        );
      }
      return snapshot;
    },
    applySettings(settings = {}) {
      const canvasSettings = createCanvasSettingsChartOptions(settings, DEFAULT_CHART_OPTIONS);
      manager.applyOptions?.(canvasSettings.options);
      if (chartSurfaceElement?.dataset) {
        chartSurfaceElement.dataset.v6ChartGrid = String(canvasSettings.state.chartGrid);
        chartSurfaceElement.dataset.v6CanvasSettings = JSON.stringify(canvasSettings.state);
        chartSurfaceElement.dataset.v6ChartNavigationVisibility = canvasSettings.state.chartNavigationVisibility;
      }
      return { ...canvasSettings.state };
    },
    applySymbolSettings(settings = {}) {
      const symbolSettings = createSymbolSettingsSeriesOptions(settings, DEFAULT_SERIES_OPTIONS);
      manager.applySeriesOptions?.(symbolSettings.options);
      if (chartSurfaceElement?.dataset) {
        chartSurfaceElement.dataset.v6SymbolSettings = JSON.stringify(symbolSettings.state);
      }
      return { ...symbolSettings.state };
    },
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
      barsByPaneId.set(recordPaneId, (record.bars || []).map((bar) => ({ ...bar })));
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
      rangeInputController.destroy();
      unsubscribeCrosshairCallbacks.forEach((unsubscribeCrosshair) => unsubscribeCrosshair());
      unsubscribeVisibleRangeCallbacks.forEach((unsubscribeVisibleRange) => unsubscribeVisibleRange());
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
    applyActivePane(paneId) {
      return activatePane(paneId, 'runtime-pane', false);
    },
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
