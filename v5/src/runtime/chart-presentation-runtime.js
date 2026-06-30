import { registerCommand } from './commands.js';
import {
  CHART_DATE_FORMATS,
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
  CHART_TIME_FORMATS,
  DEFAULT_CHART_PRESENTATION_SETTINGS,
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
