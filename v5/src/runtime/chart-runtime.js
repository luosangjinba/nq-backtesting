import { registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
  DISPLAY_TIMEZONE_EVENTS,
} from '../contracts/timezone-contracts.js';
import {
  CHART_PRESENTATION_EVENTS,
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../contracts/chart-presentation-contracts.js';
import { createChartEngineAdapter } from './chart-engine-adapter.js';

export { CHART_COMMANDS, CHART_EVENTS };

const PREFIX_DEMAND_THRESHOLD_BARS = 2;

function cloneCandleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle) {
  return {
    body: { ...style.body },
    border: { ...style.border },
    wick: { ...style.wick },
  };
}

function cloneGridStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle) {
  return { ...style };
}

function cloneCrosshairStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle) {
  return { ...style };
}

function cloneBackgroundStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle) {
  return { ...style };
}

function cloneScaleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle) {
  return { ...style };
}

function cloneWatermarkStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle) {
  return { ...style };
}

function createEmptyState() {
  return {
    bars: [],
    rightEdgeLimit: null,
    visibleRange: null,
    prefixDemand: null,
    viewportDemand: null,
    viewportFollow: {
      enabled: false,
      cursorTimestamp: null,
      estimatedVisibleBars: null,
      rightOffsetBars: DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars,
    },
    interaction: {
      mode: 'follow',
      manualVisibleRange: null,
    },
    nativeInteraction: {
      active: false,
      type: null,
      source: null,
    },
    crosshair: {
      active: false,
      time: null,
      price: null,
      bar: null,
      point: null,
    },
    displayContext: {
      instrument: null,
      displayTimeframe: null,
      loadedCoverage: null,
      displayTimezone: DEFAULT_DISPLAY_TIMEZONE,
      exchangeTimezone: DEFAULT_EXCHANGE_TIMEZONE,
      timeFormat: DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
      dateFormat: DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
      showDayOfWeekLabels: DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels,
      showCrosshairReadout: DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout,
      margins: { ...DEFAULT_CHART_PRESENTATION_SETTINGS.margins },
      rightOffsetBars: DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars,
      candleStyle: cloneCandleStyle(),
      gridStyle: cloneGridStyle(),
      crosshairStyle: cloneCrosshairStyle(),
      backgroundStyle: cloneBackgroundStyle(),
      scaleStyle: cloneScaleStyle(),
      watermarkStyle: cloneWatermarkStyle(),
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

function rangesEqual(left, right) {
  if (!left || !right) return left === right;
  return left.from === right.from && left.to === right.to;
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

function normalizePositiveInteger(value, fallback, label) {
  if (value == null) return fallback;
  const normalized = Math.floor(Number(value));
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return normalized;
}

function normalizeGoToPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('chart go-to time payload must be an object.');
  }
  return {
    targetTimestamp: timestampSeconds(payload.targetTimestamp ?? payload.time, 'chart go-to target time'),
    estimatedVisibleBars: normalizePositiveInteger(
      payload.estimatedVisibleBars,
      null,
      'chart go-to estimatedVisibleBars'
    ),
  };
}

function normalizeNavigationPayload(payload = {}, {
  defaultDirection = 1,
  defaultRatio = 0.25,
} = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('chart navigation payload must be an object.');
  }
  const direction = Math.sign(Number(payload.direction ?? defaultDirection)) || defaultDirection;
  const ratio = Number(payload.ratio ?? defaultRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error('chart navigation ratio must be a positive number.');
  }
  return { direction, ratio };
}

function normalizeViewportFollow(payload = {}, state) {
  const enabled = payload.enabled == null ? state.viewportFollow.enabled : Boolean(payload.enabled);
  return {
    enabled,
    cursorTimestamp: payload.cursorTimestamp == null
      ? state.viewportFollow.cursorTimestamp
      : timestampSeconds(payload.cursorTimestamp, 'chart viewport follow cursorTimestamp'),
    estimatedVisibleBars: normalizePositiveInteger(
      payload.estimatedVisibleBars,
      state.viewportFollow.estimatedVisibleBars,
      'chart viewport follow estimatedVisibleBars'
    ),
    rightOffsetBars: normalizePositiveInteger(
      payload.rightOffsetBars,
      state.viewportFollow.rightOffsetBars,
      'chart viewport follow rightOffsetBars'
    ),
  };
}

function computeRenderedBars(state) {
  if (state.interaction.mode === 'manual' && state.interaction.manualVisibleRange) {
    const manualTo = Number.isFinite(state.rightEdgeLimit)
      ? Math.min(state.interaction.manualVisibleRange.to, state.rightEdgeLimit)
      : state.interaction.manualVisibleRange.to;
    return state.bars.filter((bar) => {
      const timestamp = timestampSeconds(bar.time, 'chart bar time');
      return timestamp >= state.interaction.manualVisibleRange.from
        && timestamp <= manualTo;
    });
  }

  if (!state.viewportFollow.enabled || !state.bars.length) {
    return [...state.bars];
  }

  const capacity = state.viewportFollow.estimatedVisibleBars || state.bars.length;
  const rightOffsetBars = Math.min(state.viewportFollow.rightOffsetBars || 0, Math.max(0, capacity - 1));
  const visibleCapacity = Math.max(1, capacity - rightOffsetBars);
  const cursor = state.viewportFollow.cursorTimestamp;
  const cursorIndex = Number.isFinite(cursor)
    ? state.bars.findLastIndex((bar) => timestampSeconds(bar.time, 'chart bar time') <= cursor)
    : state.bars.length - 1;
  if (cursorIndex < 0) return [];

  const endIndex = cursorIndex + 1;
  const startIndex = Math.max(0, endIndex - visibleCapacity);
  return state.bars.slice(startIndex, endIndex);
}

function deriveGoToRange(state, {
  targetTimestamp,
  estimatedVisibleBars,
}) {
  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const capacity = Math.max(
    3,
    estimatedVisibleBars
      || state.viewportFollow.estimatedVisibleBars
      || state.bars.length
      || 20
  );
  const halfSpan = Math.max(barSpacingSeconds, Math.floor((capacity * barSpacingSeconds) / 2));
  return clampVisibleRange({
    from: targetTimestamp - halfSpan,
    to: targetTimestamp + halfSpan,
  }, state.rightEdgeLimit);
}

function deriveCurrentVisibleRange(state) {
  if (state.visibleRange) {
    return { ...state.visibleRange };
  }
  const renderedBars = computeRenderedBars(state);
  const coverage = computeLoadedCoverage(renderedBars.length ? renderedBars : state.bars);
  if (coverage) return coverage;
  const cursor = state.viewportFollow.cursorTimestamp;
  if (Number.isFinite(cursor)) {
    const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
    return {
      from: cursor - Math.max(barSpacingSeconds, barSpacingSeconds * 5),
      to: cursor,
    };
  }
  return null;
}

function deriveZoomRange(state, payload = {}) {
  const { direction, ratio } = normalizeNavigationPayload(payload, {
    defaultDirection: -1,
    defaultRatio: 0.25,
  });
  const range = deriveCurrentVisibleRange(state);
  if (!range) {
    throw new Error('chart visible range is required before zooming.');
  }
  const span = Math.max(1, range.to - range.from);
  const center = range.from + (span / 2);
  const multiplier = direction > 0
    ? 1 + ratio
    : Math.max(0.1, 1 - ratio);
  const nextSpan = Math.max(1, span * multiplier);
  return clampVisibleRange({
    from: Math.floor(center - (nextSpan / 2)),
    to: Math.ceil(center + (nextSpan / 2)),
  }, state.rightEdgeLimit);
}

function derivePanRange(state, payload = {}) {
  const { direction, ratio } = normalizeNavigationPayload(payload, {
    defaultDirection: -1,
    defaultRatio: 0.5,
  });
  const range = deriveCurrentVisibleRange(state);
  if (!range) {
    throw new Error('chart visible range is required before panning.');
  }
  const span = Math.max(1, range.to - range.from);
  const offset = Math.max(1, Math.floor(span * ratio)) * direction;
  return clampVisibleRange({
    from: range.from + offset,
    to: range.to + offset,
  }, state.rightEdgeLimit);
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

function deriveManualAnchorRange(state, nextViewportFollow) {
  if (state.interaction.mode !== 'manual' || !state.interaction.manualVisibleRange) {
    return null;
  }
  const previousCursor = state.viewportFollow.cursorTimestamp;
  const nextCursor = nextViewportFollow.cursorTimestamp;
  if (!Number.isFinite(previousCursor) || !Number.isFinite(nextCursor)) {
    return state.interaction.manualVisibleRange;
  }
  const delta = nextCursor - previousCursor;
  if (!delta) {
    return state.interaction.manualVisibleRange;
  }
  return {
    from: state.interaction.manualVisibleRange.from + delta,
    to: state.interaction.manualVisibleRange.to + delta,
  };
}

function normalizeBar(bar) {
  if (!bar || typeof bar !== 'object') {
    throw new Error('chart bar must be an object.');
  }

  const time = bar.time || bar.timestamp;
  const hasStringTime = typeof time === 'string' && time.trim();
  const hasNumericTime = typeof time === 'number' && Number.isFinite(time);
  if (!hasStringTime && !hasNumericTime) {
    throw new Error('chart bar time is required.');
  }

  const open = Number(bar.open);
  const high = Number(bar.high);
  const low = Number(bar.low);
  const close = Number(bar.close);
  if (![open, high, low, close].every(Number.isFinite)) {
    throw new Error('chart bar OHLC values must be finite numbers.');
  }

  return { time: hasStringTime ? time.trim() : time, open, high, low, close };
}

function normalizeCrosshairBar(bar) {
  if (!bar || typeof bar !== 'object') return null;
  return normalizeBar(bar);
}

function normalizeCrosshair(payload = {}) {
  if (!payload || typeof payload !== 'object' || !payload.active) {
    return {
      active: false,
      time: null,
      price: null,
      bar: null,
      point: null,
    };
  }

  const price = payload.price == null ? null : Number(payload.price);
  return {
    active: true,
    time: payload.time == null
      ? null
      : new Date(timestampSeconds(payload.time, 'chart crosshair time') * 1000).toISOString(),
    price: Number.isFinite(price) ? price : null,
    bar: normalizeCrosshairBar(payload.bar),
    point: payload.point && typeof payload.point === 'object'
      ? {
        x: Number(payload.point.x ?? 0),
        y: Number(payload.point.y ?? 0),
      }
      : null,
  };
}

function normalizeBars(bars) {
  if (!Array.isArray(bars)) {
    throw new Error('chart bars payload must be an array.');
  }
  return bars.map(normalizeBar);
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
  const mountedHosts = new Set();
  const mountedHostList = new Set();
  const chartAdapters = new Map();
  const unregisterCallbacks = [];
  const state = createEmptyState();
  let rootElement = null;
  let observer = null;
  let emit = () => {};
  let applyingRuntimeVisibleRange = false;
  let pendingChartSyncAfterNativeInteraction = false;

  function buildChartMetadata(renderedBars = computeRenderedBars(state)) {
    return {
      viewportFollow: state.viewportFollow.enabled ? 'true' : 'false',
      interactionMode: state.interaction.mode,
      renderedBarCount: renderedBars.length,
      fullBarCount: state.bars.length,
      crosshairActive: state.crosshair.active ? 'true' : 'false',
      crosshairTime: state.crosshair.time || '',
      crosshairPrice: state.crosshair.price == null ? '' : state.crosshair.price,
      nativeInteractionActive: state.nativeInteraction.active ? 'true' : 'false',
      nativeInteractionType: state.nativeInteraction.type || '',
    };
  }

  function syncChartHost(host, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata());
      return;
    }
    const renderedBars = computeRenderedBars(state);
    applyingRuntimeVisibleRange = true;
    try {
      adapter.setPresentation(state.displayContext);
      adapter.setBars(renderedBars, {
        fullBarCount: state.bars.length,
        displayContext: state.displayContext,
        metadata: buildChartMetadata(renderedBars),
        followViewport: state.interaction.mode === 'follow' && state.viewportFollow.enabled,
      });
      if (state.interaction.mode === 'manual') {
        adapter.setVisibleRange(state.visibleRange);
      }
    } finally {
      applyingRuntimeVisibleRange = false;
    }
  }

  function mountHost(host) {
    if (!host || mountedHosts.has(host)) return;
    mountedHosts.add(host);
    mountedHostList.add(host);
    const adapter = createChartEngineAdapter();
    chartAdapters.set(host, adapter);
    adapter.mount(host, {
      displayContext: state.displayContext,
      onVisibleRangeChange: (visibleRange, metadata = {}) => {
        if (applyingRuntimeVisibleRange) return;
        if (metadata.source === 'lightweight-native') {
          observeNativeVisibleRange(visibleRange);
          return;
        }
        setManualVisibleRange(visibleRange);
      },
      onCrosshairChange: (crosshair) => {
        updateCrosshair(crosshair);
      },
      onNativeInteractionChange: (interaction) => {
        updateNativeInteraction(interaction);
      },
    });
    syncChartHost(host);
    emit(CHART_EVENTS.READY, { host });
  }

  function mountAvailableHosts() {
    rootElement
      ?.querySelectorAll('[data-chart-host]')
      .forEach((host) => mountHost(host));
  }

  function rerenderMountedHosts(options = {}) {
    for (const host of mountedHostList) {
      if (host.isConnected) {
        syncChartHost(host, options);
      } else {
        chartAdapters.get(host)?.destroy();
        chartAdapters.delete(host);
        mountedHosts.delete(host);
        mountedHostList.delete(host);
      }
    }
  }

  function syncVisibleRangeToMountedHosts() {
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const adapter = chartAdapters.get(host);
      if (state.nativeInteraction.active) {
        pendingChartSyncAfterNativeInteraction = true;
        adapter?.setMetadata?.(buildChartMetadata());
        continue;
      }
      applyingRuntimeVisibleRange = true;
      try {
        adapter?.setVisibleRange(state.visibleRange);
      } finally {
        applyingRuntimeVisibleRange = false;
      }
    }
  }

  function syncMetadataToMountedHosts() {
    const metadata = buildChartMetadata();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      chartAdapters.get(host)?.setMetadata?.(metadata);
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
    rerenderMountedHosts();
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
    let visibleRangeChanged = false;

    if (state.visibleRange && state.interaction.mode !== 'manual') {
      const visibleRange = clampVisibleRange(state.visibleRange, state.rightEdgeLimit);
      visibleRangeChanged = !rangesEqual(state.visibleRange, visibleRange);
      state.visibleRange = visibleRange;
    }

    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();

    if (state.visibleRange && visibleRangeChanged) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }

    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
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

  function setViewportFollow(payload = {}) {
    const nextViewportFollow = normalizeViewportFollow(payload, state);
    let visibleRangeChanged = false;
    if (payload.resume) {
      state.visibleRange = null;
      state.interaction = {
        mode: 'follow',
        manualVisibleRange: null,
      };
    } else {
      const manualAnchorRange = deriveManualAnchorRange(state, nextViewportFollow);
      if (manualAnchorRange) {
        visibleRangeChanged = !rangesEqual(state.visibleRange, manualAnchorRange)
          || !rangesEqual(state.interaction.manualVisibleRange, manualAnchorRange);
        state.visibleRange = { ...manualAnchorRange };
        state.interaction = {
          mode: 'manual',
          manualVisibleRange: { ...manualAnchorRange },
        };
        state.prefixDemand = computePrefixDemand(state);
        state.viewportDemand = computeViewportDemand(state);
      }
    }
    state.viewportFollow = state.interaction.mode === 'manual' && !payload.resume
      ? {
        ...nextViewportFollow,
        enabled: false,
      }
      : nextViewportFollow;
    rerenderMountedHosts();
    if (visibleRangeChanged && state.visibleRange) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (visibleRangeChanged && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (visibleRangeChanged && state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setManualVisibleRange(payload = {}) {
    const visibleRange = normalizeRange(payload);
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function observeNativeVisibleRange(payload = {}) {
    const visibleRange = normalizeRange(payload);
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state);
    syncMetadataToMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
      clamped: false,
    };
  }

  function goToTime(payload = {}) {
    const goTo = normalizeGoToPayload(payload);
    const visibleRange = deriveGoToRange(state, goTo);
    const result = setManualVisibleRange(visibleRange);
    return {
      ...result,
      targetTimestamp: goTo.targetTimestamp,
    };
  }

  function zoomVisibleRange(payload = {}) {
    const visibleRange = deriveZoomRange(state, payload);
    return setManualVisibleRange(visibleRange);
  }

  function panVisibleRange(payload = {}) {
    const visibleRange = derivePanRange(state, payload);
    return setManualVisibleRange(visibleRange);
  }

  function resumeViewportFollow() {
    state.visibleRange = null;
    state.interaction = {
      mode: 'follow',
      manualVisibleRange: null,
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: true,
    };
    state.prefixDemand = null;
    state.viewportDemand = null;
    rerenderMountedHosts();
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function getRenderedBars() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function getInteractionState() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      nativeInteraction: structuredClone(state.nativeInteraction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function updateCrosshair(payload = {}) {
    state.crosshair = normalizeCrosshair(payload);
    emit(CHART_EVENTS.CROSSHAIR_CHANGED, { crosshair: structuredClone(state.crosshair) });
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function updateNativeInteraction(payload = {}) {
    const wasActive = state.nativeInteraction.active;
    state.nativeInteraction = {
      active: Boolean(payload.active),
      type: payload.active && payload.type ? String(payload.type) : null,
      source: payload.source ? String(payload.source) : null,
    };
    syncMetadataToMountedHosts();
    if (wasActive && !state.nativeInteraction.active && pendingChartSyncAfterNativeInteraction) {
      pendingChartSyncAfterNativeInteraction = false;
      rerenderMountedHosts({ deferDuringNativeInteraction: false });
    }
    if (wasActive && !state.nativeInteraction.active && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    return {
      nativeInteraction: structuredClone(state.nativeInteraction),
      pendingChartSyncAfterNativeInteraction,
    };
  }

  function getCrosshairState() {
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setDisplayContext({
    instrument = state.displayContext.instrument,
    displayTimeframe = state.displayContext.displayTimeframe,
    loadedCoverage = state.displayContext.loadedCoverage,
    displayTimezone = state.displayContext.displayTimezone,
    exchangeTimezone = state.displayContext.exchangeTimezone,
    timeFormat = state.displayContext.timeFormat,
    dateFormat = state.displayContext.dateFormat,
    showDayOfWeekLabels = state.displayContext.showDayOfWeekLabels,
    showCrosshairReadout = state.displayContext.showCrosshairReadout,
    margins = state.displayContext.margins,
    rightOffsetBars = state.displayContext.rightOffsetBars,
    candleStyle = state.displayContext.candleStyle,
    gridStyle = state.displayContext.gridStyle,
    crosshairStyle = state.displayContext.crosshairStyle,
    backgroundStyle = state.displayContext.backgroundStyle,
    scaleStyle = state.displayContext.scaleStyle,
    watermarkStyle = state.displayContext.watermarkStyle,
  } = {}) {
    state.displayContext = {
      instrument: instrument == null ? null : String(instrument),
      displayTimeframe: normalizeDisplayTimeframe(displayTimeframe),
      loadedCoverage: normalizeLoadedCoverage(loadedCoverage),
      displayTimezone: displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
      exchangeTimezone: exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
      timeFormat: timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
      dateFormat: dateFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
      showDayOfWeekLabels: showDayOfWeekLabels == null
        ? DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels
        : Boolean(showDayOfWeekLabels),
      showCrosshairReadout: showCrosshairReadout == null
        ? DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout
        : Boolean(showCrosshairReadout),
      margins: {
        topPercent: Number(margins?.topPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.topPercent),
        bottomPercent: Number(margins?.bottomPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.bottomPercent),
      },
      rightOffsetBars: Number(rightOffsetBars ?? DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars),
      candleStyle: cloneCandleStyle(candleStyle),
      gridStyle: cloneGridStyle(gridStyle),
      crosshairStyle: cloneCrosshairStyle(crosshairStyle),
      backgroundStyle: cloneBackgroundStyle(backgroundStyle),
      scaleStyle: cloneScaleStyle(scaleStyle),
      watermarkStyle: cloneWatermarkStyle(watermarkStyle),
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      rightOffsetBars: state.displayContext.rightOffsetBars,
    };
    state.viewportDemand = computeViewportDemand(state);
    rerenderMountedHosts();
    return {
      displayContext: structuredClone(state.displayContext),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
    };
  }

  function updateDisplayTimezoneContext(payload = {}) {
    return setDisplayContext({
      displayTimezone: payload.displayTimezone,
      exchangeTimezone: payload.exchangeTimezone,
    });
  }

  function updatePresentationContext(payload = {}) {
    return setDisplayContext({
      timeFormat: payload.timeFormat,
      dateFormat: payload.dateFormat,
      showDayOfWeekLabels: payload.showDayOfWeekLabels,
      showCrosshairReadout: payload.showCrosshairReadout,
      margins: payload.margins,
      rightOffsetBars: payload.rightOffsetBars,
      candleStyle: payload.candleStyle,
      gridStyle: payload.gridStyle,
      crosshairStyle: payload.crosshairStyle,
      backgroundStyle: payload.backgroundStyle,
      scaleStyle: payload.scaleStyle,
      watermarkStyle: payload.watermarkStyle,
    });
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
      registerCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, (payload) => setViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, (payload) => setManualVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GO_TO_TIME, (payload) => goToTime(payload)),
      registerCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE, (payload) => zoomVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, (payload) => panVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, () => resumeViewportFollow()),
      registerCommand(CHART_COMMANDS.GET_RENDERED_BARS, () => getRenderedBars()),
      registerCommand(CHART_COMMANDS.GET_INTERACTION_STATE, () => getInteractionState()),
      registerCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE, () => getCrosshairState()),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND, () => getViewportDemand()),
      registerCommand(CHART_COMMANDS.GET_PREFIX_DEMAND, () => getPrefixDemand()),
      subscribeEvent(DISPLAY_TIMEZONE_EVENTS.CHANGED, (payload) => updateDisplayTimezoneContext(payload)),
      subscribeEvent(CHART_PRESENTATION_EVENTS.CHANGED, (payload) => updatePresentationContext(payload))
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
    for (const adapter of chartAdapters.values()) {
      adapter.destroy();
    }
    chartAdapters.clear();
    mountedHosts.clear();
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
