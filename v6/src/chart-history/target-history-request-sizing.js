import { windowBoundsMs } from '../bar-data/bar-window.js';
import { targetTimeframeToFixedMinutes } from '../time-domain/target-timeframe-domain.js';
import { resolveLeftwardSourceWindowPolicy } from './leftward-source-window-policy.js';

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
