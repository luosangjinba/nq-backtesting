import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
} from '../contracts/timezone-contracts.js';
import {
  DEFAULT_CHART_PRESENTATION_SETTINGS,
} from '../contracts/chart-presentation-contracts.js';

export function cloneCandleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle) {
  return {
    body: { ...style.body },
    border: { ...style.border },
    wick: { ...style.wick },
  };
}

export function cloneGridStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle) {
  return { ...style };
}

export function cloneCrosshairStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle) {
  return { ...style };
}

export function cloneBackgroundStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle) {
  return { ...style };
}

export function cloneScaleStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle) {
  return { ...style };
}

export function cloneWatermarkStyle(style = DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle) {
  return { ...style };
}

export function createEmptyChartState() {
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

export function timestampSeconds(value, label) {
  const parsed = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid chart timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

export function normalizeRange(range) {
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

export function rangesEqual(left, right) {
  if (!left || !right) return left === right;
  return left.from === right.from && left.to === right.to;
}

export function normalizeLoadedCoverage(coverage) {
  if (!coverage || typeof coverage !== 'object') return null;
  const from = timestampSeconds(coverage.from, 'chart loaded coverage from');
  const to = timestampSeconds(coverage.to, 'chart loaded coverage to');
  if (to < from) {
    throw new Error('chart loaded coverage to must be greater than or equal to from.');
  }
  return { from, to };
}

export function normalizeDisplayTimeframe(value) {
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

export function normalizeGoToPayload(payload = {}) {
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

export function normalizeNavigationPayload(payload = {}, {
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

export function normalizeViewportFollow(payload = {}, state) {
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

export function normalizeBar(bar) {
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

export function normalizeCrosshair(payload = {}) {
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

export function normalizeBars(bars) {
  if (!Array.isArray(bars)) {
    throw new Error('chart bars payload must be an array.');
  }
  return bars.map(normalizeBar);
}

export function readHostMetrics(host) {
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
