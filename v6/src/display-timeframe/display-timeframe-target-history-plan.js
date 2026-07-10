import { BAR_DATA_COMMANDS } from '../contracts/app-contracts.js';
import {
  isTargetTimeframeSupported,
  normalizeTargetTimeframeId,
  targetTimeframeToRuntimeValue,
} from '../time-domain/target-timeframe-domain.js';

function normalizePaneId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('Display target history paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeInstrument(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('Display target history instrument must be a non-empty string.');
  }
  return normalized;
}

function normalizeTimeText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Display target history ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

export function shouldUseTargetBarsForDisplayHistory({
  displayTimeframe,
  enabled = false,
  sourceTimeframe = 1,
} = {}) {
  if (!enabled) return false;
  if (!isTargetTimeframeSupported(displayTimeframe)) return false;
  const runtimeValue = targetTimeframeToRuntimeValue(displayTimeframe);
  return runtimeValue === '1D'
    || runtimeValue === '1W'
    || runtimeValue === '1M'
    || Number(runtimeValue) > Number(sourceTimeframe);
}

export function planDisplayTargetHistoryWindow({
  displayTimeframe,
  enabled = false,
  end,
  instrument,
  paneId,
  sourceTimeframe = 1,
  start,
} = {}) {
  if (!shouldUseTargetBarsForDisplayHistory({
    displayTimeframe,
    enabled,
    sourceTimeframe,
  })) {
    return {
      command: null,
      reason: 'target-history-disabled',
      status: 'ignored',
    };
  }

  return {
    command: BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
    paneId: normalizePaneId(paneId),
    reason: 'target-history-opt-in',
    status: 'planned',
    window: {
      end: normalizeTimeText(end, 'end'),
      instrument: normalizeInstrument(instrument),
      start: normalizeTimeText(start, 'start'),
      timeframe: normalizeTargetTimeframeId(displayTimeframe),
    },
  };
}
