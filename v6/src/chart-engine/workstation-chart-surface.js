import { createChartHostManager } from './chart-host-manager.js';

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

function rangesNear(left = {}, right = {}) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= PROGRAMMATIC_RANGE_EPSILON &&
    Math.abs(Number(left.to) - Number(right.to)) <= PROGRAMMATIC_RANGE_EPSILON
  );
}

export function mountWorkstationChartSurface(root, {
  chartOptions = {},
  hostSelector = '[data-v6-chart-engine-host]',
  managerFactory = createChartHostManager,
  seriesOptions = {},
} = {}) {
  if (!root) {
    throw new Error('Workstation chart surface root is required.');
  }

  const host = root.querySelector(hostSelector);
  if (!host) {
    throw new Error(`Workstation chart surface host "${hostSelector}" is missing.`);
  }

  const paneId = resolvePaneId(host);
  const appliedChartDataByPaneId = new Map();
  const appliedViewportByPaneId = new Map();
  const measuredVisibleRangeByPaneId = new Map();
  const programmaticRangeByPaneId = new Map();
  const visibleRangeListeners = new Set();
  let userRangeInputUntil = 0;
  const size = measureHost(host);
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

  manager.mountPane({ host, paneId });
  const unsubscribeVisibleRange = typeof manager.subscribeVisibleLogicalRangeChange === 'function'
    ? manager.subscribeVisibleLogicalRangeChange(paneId, ({ paneId: changedPaneId, range } = {}) => {
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
      })
    : () => {};

  const markUserRangeInput = () => {
    userRangeInputUntil = Date.now() + USER_RANGE_INPUT_WINDOW_MS;
  };
  const userInputEvents = ['pointerdown', 'mousedown', 'wheel', 'touchstart'];
  userInputEvents.forEach((eventName) => {
    host.addEventListener?.(eventName, markUserRangeInput, { passive: true });
  });

  function resize() {
    const nextSize = measureHost(host);
    const record = manager.snapshot().panes.find((pane) => pane.paneId === paneId);
    if (!record?.snapshot?.mounted) {
      return null;
    }
    return manager.resizePane(paneId, nextSize);
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => resize())
    : null;
  resizeObserver?.observe(host);

  return {
    applyChartDataRecord(record = {}) {
      const recordPaneId = String(record.paneId || '').trim();
      if (!recordPaneId) {
        throw new Error('Workstation chart surface chart-data record requires paneId.');
      }
      if (recordPaneId !== paneId) {
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
      if (recordPaneId !== paneId) {
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
      unsubscribeVisibleRange();
      userInputEvents.forEach((eventName) => {
        host.removeEventListener?.(eventName, markUserRangeInput);
      });
      resizeObserver?.disconnect();
      manager.destroyAll();
      visibleRangeListeners.clear();
    },
    getState() {
      const snapshot = manager.snapshot();
      return {
        appliedChartData: [...appliedChartDataByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        appliedViewport: [...appliedViewportByPaneId.values()]
          .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        hostConnected: Boolean(host.isConnected),
        hostSelector,
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
  };
}
