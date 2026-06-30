import { registerCommand } from './commands.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';

export { CHART_COMMANDS, CHART_EVENTS };

const PREFIX_DEMAND_THRESHOLD_BARS = 2;

function createEmptyState() {
  return {
    bars: [],
    rightEdgeLimit: null,
    visibleRange: null,
    prefixDemand: null,
    viewportDemand: null,
    displayContext: {
      instrument: null,
      displayTimeframe: null,
      loadedCoverage: null,
    },
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

function estimateBarSpacingSeconds(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart bar time'))
    .sort((left, right) => left - right);
  const gaps = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((gap) => gap > 0);
  return gaps[0] || 60;
}

function computePrefixDemand(state) {
  if (!state.visibleRange || !state.bars.length) {
    return null;
  }

  const earliestLoadedTimestamp = Math.min(
    ...state.bars.map((bar) => timestampSeconds(bar.time, 'chart bar time'))
  );
  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const thresholdSeconds = barSpacingSeconds * PREFIX_DEMAND_THRESHOLD_BARS;
  if (state.visibleRange.from > earliestLoadedTimestamp + thresholdSeconds) {
    return null;
  }

  return {
    direction: 'backward',
    anchor: new Date(earliestLoadedTimestamp * 1000).toISOString(),
    earliestLoadedTimestamp,
    visibleFrom: state.visibleRange.from,
    thresholdSeconds,
    suggestedCount: Math.max(
      PREFIX_DEMAND_THRESHOLD_BARS + 1,
      Math.ceil((earliestLoadedTimestamp + thresholdSeconds - state.visibleRange.from) / barSpacingSeconds) + 1
    ),
  };
}

function computeLoadedCoverage(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart bar time'))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
  };
}

function normalizeLoadedCoverage(coverage) {
  if (!coverage || typeof coverage !== 'object') return null;
  const from = timestampSeconds(coverage.from, 'chart loaded coverage from');
  const to = timestampSeconds(coverage.to, 'chart loaded coverage to');
  if (to < from) {
    throw new Error('chart loaded coverage to must be greater than or equal to from.');
  }
  return { from, to };
}

function normalizeDisplayTimeframe(value) {
  if (value == null) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('chart display timeframe must be a positive number.');
  }
  return normalized;
}

function computeViewportDemand(state) {
  if (!state.visibleRange || !state.bars.length || !state.displayContext.displayTimeframe) {
    return null;
  }

  const loadedCoverage = state.displayContext.loadedCoverage || computeLoadedCoverage(state.bars);
  if (!loadedCoverage) return null;

  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const thresholdSeconds = barSpacingSeconds * PREFIX_DEMAND_THRESHOLD_BARS;
  if (state.visibleRange.from > loadedCoverage.from + thresholdSeconds) {
    return null;
  }

  const suggestedCount = Math.max(
    PREFIX_DEMAND_THRESHOLD_BARS + 1,
    Math.ceil((loadedCoverage.from + thresholdSeconds - state.visibleRange.from) / barSpacingSeconds) + 1
  );

  return {
    instrument: state.displayContext.instrument,
    displayTimeframe: state.displayContext.displayTimeframe,
    direction: 'backward',
    visibleFrom: state.visibleRange.from,
    visibleTo: state.visibleRange.to,
    loadedCoverage: { ...loadedCoverage },
    missingWindow: {
      direction: 'backward',
      anchor: new Date(loadedCoverage.from * 1000).toISOString(),
      from: state.visibleRange.from,
      to: loadedCoverage.from,
      suggestedCount,
    },
    thresholdSeconds,
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
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
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
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
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

  function getPrefixDemand() {
    state.prefixDemand = computePrefixDemand(state);
    return {
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function setDisplayContext({
    instrument = state.displayContext.instrument,
    displayTimeframe = state.displayContext.displayTimeframe,
    loadedCoverage = state.displayContext.loadedCoverage,
  } = {}) {
    state.displayContext = {
      instrument: instrument == null ? null : String(instrument),
      displayTimeframe: normalizeDisplayTimeframe(displayTimeframe),
      loadedCoverage: normalizeLoadedCoverage(loadedCoverage),
    };
    state.viewportDemand = computeViewportDemand(state);
    return {
      displayContext: structuredClone(state.displayContext),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
    };
  }

  function getViewportDemand() {
    state.viewportDemand = computeViewportDemand(state);
    return {
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
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
      registerCommand(CHART_COMMANDS.GET_VISIBLE_RANGE, () => getVisibleRange()),
      registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload) => setDisplayContext(payload)),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND, () => getViewportDemand()),
      registerCommand(CHART_COMMANDS.GET_PREFIX_DEMAND, () => getPrefixDemand())
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
