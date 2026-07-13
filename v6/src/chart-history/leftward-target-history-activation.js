import {
  isTargetTimeframeSupported,
  normalizeTargetTimeframeId,
  targetTimeframeToFixedMinutes,
  targetTimeframeToRuntimeValue,
} from '../time-domain/target-timeframe-domain.js';

function normalizePaneId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('Leftward target-history activation paneId must be a non-empty string.');
  }
  return normalized;
}

function runtimeMinutes(value) {
  const fixedMinutes = targetTimeframeToFixedMinutes(value);
  if (fixedMinutes) return fixedMinutes;
  return null;
}

export function planLeftwardTargetHistoryActivation({
  displayTimeframe,
  enabled = true,
  paneId,
  sourceTimeframe = 1,
} = {}) {
  const normalizedPaneId = normalizePaneId(paneId);
  if (!enabled) {
    return {
      paneId: normalizedPaneId,
      reason: 'target-history-activation-disabled',
      status: 'disabled',
      targetHistory: null,
    };
  }
  if (!isTargetTimeframeSupported(displayTimeframe)) {
    return {
      paneId: normalizedPaneId,
      reason: 'target-history-unsupported-timeframe',
      status: 'ignored',
      targetHistory: null,
    };
  }

  const runtimeValue = targetTimeframeToRuntimeValue(displayTimeframe);
  const fixedMinutes = runtimeMinutes(displayTimeframe);
  const sourceMinutes = Number(sourceTimeframe) || 1;
  const targetId = normalizeTargetTimeframeId(displayTimeframe);
  const sessionAware = runtimeValue === '1D' || runtimeValue === '1W' || runtimeValue === '1M';
  const highFixed = fixedMinutes !== null
    && fixedMinutes > sourceMinutes;

  if (!sessionAware && !highFixed) {
    return {
      paneId: normalizedPaneId,
      reason: 'target-history-timeframe-below-policy',
      status: 'ignored',
      targetHistory: null,
      timeframe: targetId,
    };
  }

  return {
    displayTimeframe: runtimeValue,
    paneId: normalizedPaneId,
    reason: 'target-history-high-timeframe-policy',
    status: 'enabled',
    targetHistory: {
      enabled: true,
      policy: 'high-timeframe-leftward-history',
      reason: 'target-history-high-timeframe-policy',
    },
    timeframe: targetId,
  };
}
