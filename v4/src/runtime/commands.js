import * as store from '../data/bar-store.js';
import { resolveAdjacentWindow } from '../data/load-range-policy.js';
import { getPrimaryInstrument, setPrimaryInstrument } from '../data/primary-instrument-store.js';
import { CHART_PANE_IDS, updatePaneDescriptor } from '../chart-panes/chart-pane-store.js';
import { getChartViewportMetrics } from '../chart/chart-manager.js';
import { startFxReplayInitialSession } from '../features/fx-replay/fx-replay-controller.js';
import { loadBars } from '../data/bars/bars-api-client.js';
import { loadPrimaryBars } from './primary-bars-runtime.js';
import { replacePrimaryChartBars } from './primary-chart-runtime.js';
import {
  CHART_MODE_SOURCES,
  enterFxReplayMode,
} from './chart-mode-store.js';

export const COMMANDS = Object.freeze({
  LOAD_PRIMARY_RANGE: 'primary.loadRange',
  LOAD_ADJACENT_PRIMARY_WINDOW: 'primary.loadAdjacentWindow',
  SET_PRIMARY_INSTRUMENT: 'primary.setInstrument',
  SET_PRIMARY_TIMEFRAME: 'primary.setTimeframe',
  START_FX_REPLAY_SESSION: 'fxReplay.startInitialSession',
});

function normalizeTimeframe(timeframe, fallback = store.getCurrentTimeframe()) {
  const value = Number(timeframe);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requireRange(payload) {
  const start = String(payload?.start || '').trim();
  const end = String(payload?.end || '').trim();
  if (!start || !end) {
    throw new Error('Primary range command requires start and end');
  }
  return { start, end };
}

export async function loadPrimaryRangeCommand(payload = {}) {
  const { start, end } = requireRange(payload);
  const timeframe = normalizeTimeframe(payload.timeframe);
  const instrument = payload.instrument || getPrimaryInstrument();
  return loadPrimaryBars({
    start,
    end,
    timeframe,
    instrument,
    outerRange: payload.outerRange || null,
  });
}

export async function loadAdjacentPrimaryWindowCommand({ direction } = {}) {
  const outerRange = store.getRequestedOuterRange();
  const currentRange = store.getCurrentRange();
  const resolved = resolveAdjacentWindow(outerRange, currentRange.start, currentRange.end, direction);
  if (!resolved.ok) {
    return { ok: false, ...resolved };
  }

  const timeframe = normalizeTimeframe(resolved.outerRange?.timeframe);
  const result = await loadPrimaryRangeCommand({
    start: resolved.start,
    end: resolved.end,
    timeframe,
    instrument: getPrimaryInstrument(),
    outerRange: resolved.outerRange,
  });
  return { ok: true, ...resolved, result };
}

export function setPrimaryInstrumentCommand({ instrument } = {}) {
  const normalized = setPrimaryInstrument(instrument);
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { instrument: normalized });
  return normalized;
}

export function setPrimaryTimeframeCommand({ timeframe } = {}) {
  const normalized = normalizeTimeframe(timeframe);
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { timeframe: normalized });
  return normalized;
}

export function startFxReplayInitialSessionCommand(payload = {}) {
  const timeframe = normalizeTimeframe(payload.timeframe);
  const instrument = payload.instrument || getPrimaryInstrument();
  return startFxReplayInitialSession({
    ...payload,
    instrument,
    timeframe,
    viewport: payload.viewport || getChartViewportMetrics(),
    loadBars,
    projectBars: (bars, options = {}) => replacePrimaryChartBars(bars, {
      ...options,
      timeframe,
      showEnd: true,
    }),
    enterMode: (metadata = {}) => enterFxReplayMode({
      source: CHART_MODE_SOURCES.FX_REPLAY_INITIAL_LOAD,
      ...metadata,
    }),
  });
}

export function executeCommand(command, payload = {}) {
  switch (command) {
    case COMMANDS.LOAD_PRIMARY_RANGE:
      return loadPrimaryRangeCommand(payload);
    case COMMANDS.LOAD_ADJACENT_PRIMARY_WINDOW:
      return loadAdjacentPrimaryWindowCommand(payload);
    case COMMANDS.SET_PRIMARY_INSTRUMENT:
      return setPrimaryInstrumentCommand(payload);
    case COMMANDS.SET_PRIMARY_TIMEFRAME:
      return setPrimaryTimeframeCommand(payload);
    case COMMANDS.START_FX_REPLAY_SESSION:
      return startFxReplayInitialSessionCommand(payload);
    default:
      throw new Error(`Unknown runtime command: ${command}`);
  }
}
