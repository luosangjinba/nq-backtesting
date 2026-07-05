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
  const visibleRangeListeners = new Set();
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
        visibleRangeListeners.forEach((listener) => listener({ ...record }));
      })
    : () => {};

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
      const snapshot = manager.setVisibleLogicalRange(recordPaneId, {
        from: record.projection.from,
        to: record.projection.to,
      });
      appliedViewportByPaneId.set(recordPaneId, {
        chartBarsRevision: Number(record.chartBarsRevision) || 0,
        from: Number(record.projection.from),
        origin: record.projection.origin,
        paneId: recordPaneId,
        projectionRevision: Number(record.projection.revision) || 0,
        to: Number(record.projection.to),
      });
      return snapshot;
    },
    destroy() {
      unsubscribeVisibleRange();
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
