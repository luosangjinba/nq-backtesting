const TARGET_STATUS = 'leftward-request-scheduling-attribution-needed';
const TARGET_OWNER = 'chart-history.leftward-history-input-bridge';

function matchesSchedulingAttribution(attribution = {}) {
  return (
    attribution.status === TARGET_STATUS &&
    attribution.ownerBoundary === TARGET_OWNER &&
    attribution.selectedPhase === 'scheduling'
  );
}

export function planHighTimeframeTargetHistoryLeftwardRequestScheduling({
  attribution = {},
  preserveNativeInputDelay = true,
  preserveRuntimeBehavior = true,
} = {}) {
  if (!matchesSchedulingAttribution(attribution)) {
    return {
      implementationSlice: null,
      nextSlice: 'target-history-trigger-coordination-latency-attribution',
      ownerBoundary: 'target-history-scheduling-plan-prerequisite',
      reason: 'leftward-request-scheduling-attribution-not-selected',
      status: 'not-ready',
    };
  }

  if (!preserveNativeInputDelay || !preserveRuntimeBehavior) {
    return {
      implementationSlice: null,
      nextSlice: 'target-history-leftward-request-scheduling-plan',
      ownerBoundary: TARGET_OWNER,
      reason: 'scheduling-plan-must-preserve-native-input-delay-and-runtime-behavior',
      status: 'unsafe-plan',
    };
  }

  return {
    currentBehavior: {
      nativeVisibleRangeInput: 'delayed-requestDelayMs',
      runtimeProjectionAndDisplayApply: 'zero-delay-surface-check-then-delayed-requestDelayMs',
    },
    implementationSlice: 'target-history-programmatic-leftward-request-fast-path',
    nextSlice: 'target-history-programmatic-leftward-request-fast-path',
    ownerBoundary: TARGET_OWNER,
    plan: [
      'keep native visible-range drag/wheel scheduling on requestDelayMs',
      'add an explicit runtime-event scheduling reason for display-timeframe and viewport projection checks',
      'allow high-timeframe target-history programmatic scheduling to bypass the second requestDelayMs debounce after the zero-delay surface check',
      'continue requiring shouldRequest visible-range validation before dispatch',
      'continue resolving target-history activation through the bridge before dispatch',
      'keep chart-history runtime, chart viewport intent, chart-engine, replay, and shell behavior unchanged',
    ],
    reason: 'programmatic-display-timeframe-apply-can-use-fast-path-while-native-input-keeps-delay',
    status: 'implementation-plan-ready',
  };
}
