import { createChartHostManager } from './chart-host-manager.js';
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
const USER_RANGE_INPUT_WINDOW_MS = 2000;

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
  const crosshairListeners = new Set();
  const visibleRangeListeners = new Set();
  let readoutPaneId = null;
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
        if (Date.now() > userRangeInputUntil) {
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

  const markUserRangeInput = () => {
    userRangeInputUntil = Date.now() + USER_RANGE_INPUT_WINDOW_MS;
  };
  const userInputEvents = ['pointerdown', 'mousedown', 'wheel', 'touchstart'];
  hosts.forEach((host) => {
    userInputEvents.forEach((eventName) => {
      host.addEventListener?.(eventName, markUserRangeInput, { passive: true });
    });
  });

  function resize() {
    const mountedPanes = manager.snapshot().panes;
    return [...hostsByPaneId.entries()]
      .map(([paneId, host]) => {
        const record = mountedPanes.find((pane) => pane.paneId === paneId);
        if (!record?.snapshot?.mounted) {
          return null;
        }
        return manager.resizePane(paneId, measureHost(host));
      })
      .filter(Boolean);
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
      const snapshot = manager.setData(recordPaneId, record.bars || []);
      appliedChartDataByPaneId.set(recordPaneId, {
        barCount: record.bars?.length || 0,
        paneId: recordPaneId,
        revision: Number(record.revision) || 0,
      });
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
      const snapshot = manager.setVisibleLogicalRange(recordPaneId, {
        from: record.projection.from,
        to: record.projection.to,
      });
      return snapshot;
    },
    destroy() {
      unsubscribeCrosshairCallbacks.forEach((unsubscribeCrosshair) => unsubscribeCrosshair());
      unsubscribeVisibleRangeCallbacks.forEach((unsubscribeVisibleRange) => unsubscribeVisibleRange());
      hosts.forEach((host) => {
        userInputEvents.forEach((eventName) => {
          host.removeEventListener?.(eventName, markUserRangeInput);
        });
      });
      resizeObserver?.disconnect();
      manager.destroyAll();
      crosshairListeners.clear();
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
        crosshair: [...crosshairByPaneId.values()]
          .map((record) => ({ ...record, bar: record.bar ? { ...record.bar } : null }))
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        measuredVisibleRange: [...measuredVisibleRangeByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        panes: snapshot.panes,
      };
    },
    resize,
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
