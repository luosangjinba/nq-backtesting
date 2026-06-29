import { registerCommand } from './commands.js';

export const CHART_COMMANDS = Object.freeze({
  REPLACE_BARS: 'chart.replaceBars',
  APPEND_BARS: 'chart.appendBars',
  CLEAR_BARS: 'chart.clearBars',
  GET_VIEWPORT_METRICS: 'chart.getViewportMetrics',
  SET_RIGHT_EDGE_LIMIT: 'chart.setRightEdgeLimit',
  SET_VISIBLE_RANGE: 'chart.setVisibleRange',
  GET_VISIBLE_RANGE: 'chart.getVisibleRange',
});

export const CHART_EVENTS = Object.freeze({
  READY: 'chart:ready',
  BARS_CHANGED: 'chart:barsChanged',
  VISIBLE_RANGE_CHANGED: 'chart:visibleRangeChanged',
});

function createEmptyState() {
  return {
    bars: [],
    rightEdgeLimit: null,
    visibleRange: null,
  };
}

function timestampSeconds(value, label) {
  const parsed = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid chart timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

function normalizeRange(range) {
  if (!range || typeof range !== 'object') {
    throw new Error('chart visible range must be an object.');
  }
  const from = timestampSeconds(range.from, 'chart visible range from');
  const to = timestampSeconds(range.to, 'chart visible range to');
  if (to < from) {
    throw new Error('chart visible range to must be greater than or equal to from.');
  }
  return { from, to };
}

function clampVisibleRange(range, rightEdgeLimit) {
  if (!range || !Number.isFinite(rightEdgeLimit) || range.to <= rightEdgeLimit) {
    return range;
  }
  const span = Math.max(0, range.to - range.from);
  return {
    from: rightEdgeLimit - span,
    to: rightEdgeLimit,
  };
}

function normalizeBar(bar) {
  if (!bar || typeof bar !== 'object') {
    throw new Error('chart bar must be an object.');
  }

  const time = bar.time || bar.timestamp;
  if (typeof time !== 'string' || !time.trim()) {
    throw new Error('chart bar time is required.');
  }

  const open = Number(bar.open);
  const high = Number(bar.high);
  const low = Number(bar.low);
  const close = Number(bar.close);
  if (![open, high, low, close].every(Number.isFinite)) {
    throw new Error('chart bar OHLC values must be finite numbers.');
  }

  return { time, open, high, low, close };
}

function normalizeBars(bars) {
  if (!Array.isArray(bars)) {
    throw new Error('chart bars payload must be an array.');
  }
  return bars.map(normalizeBar);
}

function renderBars(canvas, bars) {
  const plot = document.createElement('div');
  plot.className = 'chart-bar-plot';
  plot.dataset.chartBarCount = String(bars.length);

  const values = bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  bars.forEach((bar) => {
    const candle = document.createElement('div');
    const top = ((max - bar.high) / range) * 100;
    const height = Math.max(((bar.high - bar.low) / range) * 100, 4);
    candle.className = `chart-candle ${bar.close >= bar.open ? 'is-up' : 'is-down'}`;
    candle.style.top = `${top}%`;
    candle.style.height = `${height}%`;
    candle.title = `${bar.time} O:${bar.open} H:${bar.high} L:${bar.low} C:${bar.close}`;
    plot.append(candle);
  });

  canvas.append(plot);
}

function renderChartFrame(host, state) {
  host.replaceChildren();
  host.dataset.chartRuntimeMounted = 'true';

  const canvas = document.createElement('div');
  canvas.className = 'chart-runtime-canvas';
  canvas.dataset.chartCanvas = 'true';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chart runtime canvas');

  if (state.bars.length) {
    renderBars(canvas, state.bars);
  } else {
    const empty = document.createElement('span');
    empty.className = 'chart-empty-state';
    empty.textContent = 'Chart runtime ready';
    canvas.append(empty);
  }

  host.append(canvas);
}

function readHostMetrics(host) {
  const rect = host?.getBoundingClientRect?.() || {};
  const width = Math.max(0, Math.round(Number(rect.width) || host?.clientWidth || 0));
  const height = Math.max(0, Math.round(Number(rect.height) || host?.clientHeight || 0));
  const estimatedBarWidth = 10;

  return {
    width,
    height,
    estimatedVisibleBars: Math.max(0, Math.floor(width / estimatedBarWidth)),
    mounted: Boolean(host?.isConnected),
  };
}

export function createChartRuntime() {
  const mountedHosts = new WeakSet();
  const mountedHostList = new Set();
  const unregisterCallbacks = [];
  const state = createEmptyState();
  let rootElement = null;
  let observer = null;
  let emit = () => {};

  function mountHost(host) {
    if (!host || mountedHosts.has(host)) return;
    mountedHosts.add(host);
    mountedHostList.add(host);
    renderChartFrame(host, state);
    emit(CHART_EVENTS.READY, { host });
  }

  function mountAvailableHosts() {
    rootElement
      ?.querySelectorAll('[data-chart-host]')
      .forEach((host) => mountHost(host));
  }

  function rerenderMountedHosts() {
    for (const host of mountedHostList) {
      if (host.isConnected) {
        renderChartFrame(host, state);
      } else {
        mountedHostList.delete(host);
      }
    }
  }

  function updateBars(nextBars) {
    state.bars = nextBars;
    rerenderMountedHosts();
    emit(CHART_EVENTS.BARS_CHANGED, { bars: [...state.bars] });
    return { bars: [...state.bars] };
  }

  function getViewportMetrics() {
    const host = [...mountedHostList].find((candidate) => candidate.isConnected);
    return readHostMetrics(host);
  }

  function updateVisibleRange(range) {
    const visibleRange = clampVisibleRange(normalizeRange(range), state.rightEdgeLimit);
    state.visibleRange = visibleRange;
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    return { visibleRange: { ...visibleRange } };
  }

  function setRightEdgeLimit({ rightEdge } = {}) {
    state.rightEdgeLimit = timestampSeconds(rightEdge, 'chart right edge limit');
    if (state.visibleRange) {
      state.visibleRange = clampVisibleRange(state.visibleRange, state.rightEdgeLimit);
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function getVisibleRange() {
    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function start({ root, emitEvent } = {}) {
    rootElement = root;
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => updateBars(normalizeBars(bars))),
      registerCommand(CHART_COMMANDS.APPEND_BARS, ({ bars } = {}) => updateBars([
        ...state.bars,
        ...normalizeBars(bars),
      ])),
      registerCommand(CHART_COMMANDS.CLEAR_BARS, () => updateBars([])),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => getViewportMetrics()),
      registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, (payload) => setRightEdgeLimit(payload)),
      registerCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, (payload) => updateVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GET_VISIBLE_RANGE, () => getVisibleRange())
    );
    mountAvailableHosts();

    observer = new MutationObserver(() => {
      mountAvailableHosts();
    });
    observer.observe(rootElement, {
      childList: true,
      subtree: true,
    });
  }

  function stop() {
    observer?.disconnect();
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    mountedHostList.clear();
    observer = null;
    rootElement = null;
  }

  return {
    id: 'runtime.chart',
    start,
    stop,
  };
}
