import { windowBoundsMs } from '../bar-data/bar-window.js';
import { targetTimeframeToFixedMinutes } from '../time-domain/target-timeframe-domain.js';
import { resolveLeftwardSourceWindowPolicy } from './leftward-source-window-policy.js';

export const TARGET_HISTORY_VIEWPORT_BUFFER_RATIO = 1;

export function resolveViewportTargetHistoryBarCount({
  displayTimeframe,
  sourceTimeframe = 1,
  visibleRange,
} = {}) {
  const policy = resolveLeftwardSourceWindowPolicy({ displayTimeframe, sourceTimeframe });
  const from = Number(visibleRange?.from);
  const to = Number(visibleRange?.to);
  const visibleBars = Number.isFinite(from) && Number.isFinite(to) && to > from
    ? Math.ceil(to - from)
    : 0;
  return Math.max(
    policy.targetDisplayBars,
    visibleBars + Math.ceil(visibleBars * TARGET_HISTORY_VIEWPORT_BUFFER_RATIO),
  );
}

function estimateFixedTargetBars(window, displayTimeframe) {
  const targetMinutes = targetTimeframeToFixedMinutes(displayTimeframe);
  if (!targetMinutes) return null;
  const { endMs, startMs } = windowBoundsMs(window);
  const stepMs = targetMinutes * 60 * 1000;
  return Math.floor((endMs - startMs) / stepMs) + 1;
}

export function auditTargetHistoryRequestSizing({
  displayTimeframe,
  plannedWindow,
  sourceTimeframe = 1,
} = {}) {
  if (!plannedWindow) {
    throw new Error('Target history request sizing audit requires a planned window.');
  }
  const policy = resolveLeftwardSourceWindowPolicy({
    displayTimeframe,
    sourceTimeframe,
  });
  const estimatedTargetBars = estimateFixedTargetBars(plannedWindow, displayTimeframe);
  const targetDisplayBars = policy.targetDisplayBars;
  const difference = estimatedTargetBars === null
    ? null
    : estimatedTargetBars - targetDisplayBars;
  const status = estimatedTargetBars === null
    ? 'session-aware-policy-sized'
    : difference >= 0
      ? 'adequate'
      : 'underfilled';
  return {
    difference,
    displayTimeframe,
    estimatedTargetBars,
    plannedWindow: { ...plannedWindow },
    policy: { ...policy },
    sourceTimeframe,
    status,
    targetDisplayBars,
  };
}

export function selectSessionAwareTargetHistorySizingSlice({
  backendSupported = ['1D'],
  enabled = ['1D', '1W', '1M'],
} = {}) {
  const backendSet = new Set(backendSupported.map((value) => String(value || '').trim().toUpperCase()));
  const enabledSet = new Set(enabled.map((value) => String(value || '').trim().toUpperCase()));
  if (backendSet.has('1D') && enabledSet.has('1D')) {
    return {
      reason: 'daily-target-history-backend-supported',
      targetTimeframe: '1D',
    };
  }
  return {
    reason: 'no-session-aware-target-history-backend-ready',
    targetTimeframe: null,
  };
}

export function selectWeeklyTargetHistorySizingSlice({
  backendSupported = ['1D'],
  dailyFallbackPacked = false,
  dailySuccessPacked = false,
  enabled = ['1D', '1W', '1M'],
} = {}) {
  const backendSet = new Set(backendSupported.map((value) => String(value || '').trim().toUpperCase()));
  const enabledSet = new Set(enabled.map((value) => String(value || '').trim().toUpperCase()));
  if (!dailySuccessPacked || !dailyFallbackPacked) {
    return {
      reason: 'daily-target-history-pack-incomplete',
      targetTimeframe: null,
    };
  }
  if (backendSet.has('1W') && enabledSet.has('1W')) {
    return {
      reason: 'weekly-target-history-backend-supported-after-daily-pack',
      targetTimeframe: '1W',
    };
  }
  if (enabledSet.has('1W')) {
    return {
      reason: 'weekly-target-history-browser-sizing-audit-needed',
      targetTimeframe: '1W',
    };
  }
  return {
    reason: 'weekly-target-history-disabled',
    targetTimeframe: null,
  };
}

export function selectMonthlyTargetHistorySizingSlice({
  backendSupported = ['1D', '1W'],
  enabled = ['1D', '1W', '1M'],
  weeklyFallbackPacked = false,
  weeklySuccessPacked = false,
} = {}) {
  const backendSet = new Set(backendSupported.map((value) => String(value || '').trim().toUpperCase()));
  const enabledSet = new Set(enabled.map((value) => String(value || '').trim().toUpperCase()));
  if (!weeklySuccessPacked || !weeklyFallbackPacked) {
    return {
      reason: 'weekly-target-history-pack-incomplete',
      targetTimeframe: null,
    };
  }
  if (backendSet.has('1M') && enabledSet.has('1M')) {
    return {
      reason: 'monthly-target-history-backend-supported-after-weekly-pack',
      targetTimeframe: '1M',
    };
  }
  if (enabledSet.has('1M')) {
    return {
      reason: 'monthly-target-history-browser-sizing-audit-needed',
      targetTimeframe: '1M',
    };
  }
  return {
    reason: 'monthly-target-history-disabled',
    targetTimeframe: null,
  };
}
