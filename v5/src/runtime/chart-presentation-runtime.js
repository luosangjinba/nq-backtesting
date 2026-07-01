import { registerCommand } from './commands.js';
import {
  CHART_DATE_FORMATS,
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
  CHART_TIME_FORMATS,
  DEFAULT_CHART_PRESENTATION_SETTINGS,
  DEFAULT_CANDLE_STYLE,
  DEFAULT_CROSSHAIR_STYLE,
  DEFAULT_GRID_STYLE,
} from '../contracts/chart-presentation-contracts.js';

export {
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
};

function normalizeBoolean(value, fallback) {
  if (value == null) return fallback;
  return Boolean(value);
}

function normalizeTimeFormat(value = DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat) {
  if (Object.values(CHART_TIME_FORMATS).includes(value)) return value;
  throw new Error(`Unsupported chart time format: ${value}`);
}

function normalizeDateFormat(value = DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat) {
  if (Object.values(CHART_DATE_FORMATS).includes(value)) return value;
  throw new Error(`Unsupported chart date format: ${value}`);
}

function normalizePercent(value, fallback, name) {
  if (value == null) return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 40) {
    throw new Error(`chart presentation ${name} must be between 0 and 40.`);
  }
  return normalized;
}

function normalizeRightOffsetBars(value = DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 200) {
    throw new Error('chart presentation rightOffsetBars must be between 0 and 200.');
  }
  return normalized;
}

function normalizeColor(value, fallback, name) {
  const normalized = String((value ?? fallback) || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return normalized.toLowerCase();
  throw new Error(`chart presentation ${name} must be a #rrggbb color.`);
}

function normalizeCandleStyle(value = {}, base = DEFAULT_CANDLE_STYLE) {
  return {
    body: {
      up: normalizeColor(value.body?.up, base.body.up, 'candleStyle.body.up'),
      down: normalizeColor(value.body?.down, base.body.down, 'candleStyle.body.down'),
    },
    border: {
      up: normalizeColor(value.border?.up, base.border.up, 'candleStyle.border.up'),
      down: normalizeColor(value.border?.down, base.border.down, 'candleStyle.border.down'),
    },
    wick: {
      up: normalizeColor(value.wick?.up, base.wick.up, 'candleStyle.wick.up'),
      down: normalizeColor(value.wick?.down, base.wick.down, 'candleStyle.wick.down'),
    },
  };
}

function normalizeGridStyle(value = {}, base = DEFAULT_GRID_STYLE) {
  return {
    verticalVisible: normalizeBoolean(value.verticalVisible, base.verticalVisible),
    horizontalVisible: normalizeBoolean(value.horizontalVisible, base.horizontalVisible),
    verticalColor: normalizeColor(value.verticalColor, base.verticalColor, 'gridStyle.verticalColor'),
    horizontalColor: normalizeColor(value.horizontalColor, base.horizontalColor, 'gridStyle.horizontalColor'),
  };
}

function normalizeCrosshairStyle(value = {}, base = DEFAULT_CROSSHAIR_STYLE) {
  return {
    verticalVisible: normalizeBoolean(value.verticalVisible, base.verticalVisible),
    horizontalVisible: normalizeBoolean(value.horizontalVisible, base.horizontalVisible),
    verticalColor: normalizeColor(value.verticalColor, base.verticalColor, 'crosshairStyle.verticalColor'),
    horizontalColor: normalizeColor(value.horizontalColor, base.horizontalColor, 'crosshairStyle.horizontalColor'),
    labelBackgroundColor: normalizeColor(
      value.labelBackgroundColor,
      base.labelBackgroundColor,
      'crosshairStyle.labelBackgroundColor'
    ),
  };
}

export function normalizeChartPresentationSettings(input = {}, base = DEFAULT_CHART_PRESENTATION_SETTINGS) {
  const margins = input.margins || {};
  return {
    timeFormat: normalizeTimeFormat(input.timeFormat ?? base.timeFormat),
    dateFormat: normalizeDateFormat(input.dateFormat ?? base.dateFormat),
    showStatusOhlc: normalizeBoolean(input.showStatusOhlc, base.showStatusOhlc),
    showStatusChange: normalizeBoolean(input.showStatusChange, base.showStatusChange),
    showCrosshairReadout: normalizeBoolean(input.showCrosshairReadout, base.showCrosshairReadout),
    margins: {
      topPercent: normalizePercent(margins.topPercent, base.margins.topPercent, 'topPercent'),
      bottomPercent: normalizePercent(margins.bottomPercent, base.margins.bottomPercent, 'bottomPercent'),
    },
    rightOffsetBars: normalizeRightOffsetBars(input.rightOffsetBars ?? base.rightOffsetBars),
    candleStyle: normalizeCandleStyle(input.candleStyle, base.candleStyle),
    gridStyle: normalizeGridStyle(input.gridStyle, base.gridStyle),
    crosshairStyle: normalizeCrosshairStyle(input.crosshairStyle, base.crosshairStyle),
  };
}

function sameSettings(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createChartPresentationRuntime({
  defaults = DEFAULT_CHART_PRESENTATION_SETTINGS,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  const normalizedDefaults = normalizeChartPresentationSettings(defaults);
  let state = normalizeChartPresentationSettings({}, normalizedDefaults);

  function snapshot() {
    return structuredClone(state);
  }

  function setSettings(payload = {}) {
    const nextState = normalizeChartPresentationSettings(payload, state);
    const changed = !sameSettings(nextState, state);
    state = nextState;
    if (changed) {
      emit(CHART_PRESENTATION_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function resetSettings() {
    const nextState = normalizeChartPresentationSettings({}, normalizedDefaults);
    const changed = !sameSettings(nextState, state);
    state = nextState;
    if (changed) {
      emit(CHART_PRESENTATION_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(CHART_PRESENTATION_COMMANDS.GET, () => snapshot()),
      registerCommand(CHART_PRESENTATION_COMMANDS.SET, (payload) => setSettings(payload)),
      registerCommand(CHART_PRESENTATION_COMMANDS.RESET, () => resetSettings())
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.chartPresentation',
    start,
    stop,
  };
}
