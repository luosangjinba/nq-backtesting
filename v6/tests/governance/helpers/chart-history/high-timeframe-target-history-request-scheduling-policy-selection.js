const OWNER_BOUNDARY = 'chart-history.leftward-history-input-bridge';
const CURRENT_DELAY_MS = 500;
const SELECTED_HTF_TARGET_HISTORY_DELAY_MS = 100;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedMeasurement(measurement = {}) {
  const inputToFetchMs = [
    measurement.inputToTargetFetchStartMsMin,
    measurement.inputToTargetFetchStartMsMax,
    ...(Array.isArray(measurement.inputToTargetFetchStartMsSamples)
      ? measurement.inputToTargetFetchStartMsSamples
      : []),
  ]
    .map(finiteNumber)
    .filter((value) => value !== null);
  const targetFetchMs = finiteNumber(measurement.targetFetchStartToEndMsMax);
  const fetchToChartDataMs = finiteNumber(measurement.fetchEndToChartDataMsMax);
  const sourceRequestCount = finiteNumber(measurement.sourceRequestCount);
  return {
    fetchToChartDataMs,
    inputToFetchMaxMs: inputToFetchMs.length ? Math.max(...inputToFetchMs) : null,
    inputToFetchMinMs: inputToFetchMs.length ? Math.min(...inputToFetchMs) : null,
    sourceRequestCount,
    targetFetchMs,
  };
}

function hasStep371Evidence(measurement) {
  return (
    measurement.inputToFetchMinMs !== null &&
    measurement.inputToFetchMaxMs !== null &&
    measurement.inputToFetchMinMs >= 400 &&
    measurement.inputToFetchMaxMs >= CURRENT_DELAY_MS - 25 &&
    measurement.targetFetchMs !== null &&
    measurement.targetFetchMs <= 5 &&
    measurement.fetchToChartDataMs !== null &&
    measurement.fetchToChartDataMs <= 30 &&
    measurement.sourceRequestCount === 0
  );
}

export function selectHighTimeframeTargetHistoryRequestSchedulingPolicy({
  allowNativeZeroDelay = false,
  measurement = {},
  preserveLowTimeframeNativeDelay = true,
  preserveStickyDragProtections = true,
  preserveTargetHistoryDisabledDelay = true,
} = {}) {
  const normalized = normalizedMeasurement(measurement);
  const baseAlternatives = [
    {
      id: 'keep-native-visible-range-delay-500ms',
      decision: 'rejected',
      reason: 'step371-shows-500ms-native-scheduling-window-is-the-dominant-remaining-delay',
    },
    {
      id: 'native-target-history-zero-delay-fast-path',
      decision: allowNativeZeroDelay ? 'candidate' : 'rejected',
      reason: allowNativeZeroDelay
        ? 'requires-dedicated-sticky-drag-regression-gates-before-runtime-wiring'
        : 'zero-delay-native-wheel-can-bypass-coalescing-and-risk-sticky-drag-regressions',
    },
  ];

  if (
    !hasStep371Evidence(normalized) ||
    !preserveLowTimeframeNativeDelay ||
    !preserveStickyDragProtections ||
    !preserveTargetHistoryDisabledDelay
  ) {
    return {
      alternatives: baseAlternatives,
      currentPolicy: {
        lowTimeframeNativeDelayMs: CURRENT_DELAY_MS,
        nativeVisibleRangeDelayMs: CURRENT_DELAY_MS,
        programmaticTargetHistoryFastPath: 'unchanged',
      },
      evidence: normalized,
      nextSlice: 'htf-target-history-request-scheduling-evidence-refresh',
      ownerBoundary: OWNER_BOUNDARY,
      reason: 'policy-selection-needs-step371-evidence-and-preservation-gates',
      selectedPolicy: null,
      status: 'not-ready',
    };
  }

  return {
    alternatives: [
      ...baseAlternatives,
      {
        id: 'native-target-history-reduced-delay-with-coalescing',
        decision: 'selected',
        reason: 'removes-most-of-the-500ms-window-while-preserving-a-small-native-input-coalescing-delay',
      },
    ],
    currentPolicy: {
      lowTimeframeNativeDelayMs: CURRENT_DELAY_MS,
      nativeVisibleRangeDelayMs: CURRENT_DELAY_MS,
      programmaticTargetHistoryFastPath: 'unchanged',
    },
    evidence: normalized,
    futurePolicy: {
      highTimeframeTargetHistoryNativeDelayMs: SELECTED_HTF_TARGET_HISTORY_DELAY_MS,
      lowTimeframeNativeDelayMs: CURRENT_DELAY_MS,
      programmaticTargetHistoryFastPath: 'unchanged',
      targetHistoryDisabledNativeDelayMs: CURRENT_DELAY_MS,
    },
    implementationSlice: 'htf-target-history-native-visible-range-reduced-delay-resolver',
    nextSlice: 'htf-target-history-native-visible-range-reduced-delay-resolver',
    ownerBoundary: OWNER_BOUNDARY,
    reason: 'step371-isolates-native-target-history-scheduling-delay-as-the-bottleneck',
    rollbackGates: [
      'low-timeframe-native-drag-and-wheel-stay-on-requestDelayMs-500',
      'target-history-disabled-path-stays-on-requestDelayMs-500',
      'shouldRequest-visible-range-validation-remains-before-dispatch',
      'sticky-drag-and-wheel-prepend-stability-smokes-must-stay-green',
      'programmatic-target-history-fast-path-remains-unchanged',
      'runtime-replay-chart-viewport-chart-engine-and-shell-behavior-remain-unchanged',
    ],
    selectedPolicy: 'native-target-history-reduced-delay-with-coalescing',
    status: 'policy-selected',
  };
}
