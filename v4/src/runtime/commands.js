import * as store from '../data/bar-store.js';
import { resolveAdjacentWindow } from '../data/load-range-policy.js';
import { getPrimaryInstrument, setPrimaryInstrument } from '../data/primary-instrument-store.js';
import { CHART_PANE_IDS, updatePaneDescriptor } from '../chart-panes/chart-pane-store.js';
import { loadPrimaryBars } from './primary-bars-runtime.js';

export const COMMANDS = Object.freeze({
  LOAD_PRIMARY_RANGE: 'primary.loadRange',
  LOAD_ADJACENT_PRIMARY_WINDOW: 'primary.loadAdjacentWindow',
  SET_PRIMARY_INSTRUMENT: 'primary.setInstrument',
  SET_PRIMARY_TIMEFRAME: 'primary.setTimeframe',
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
    default:
      throw new Error(`Unknown runtime command: ${command}`);
  }
}
