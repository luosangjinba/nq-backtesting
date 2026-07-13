import assert from 'node:assert/strict';
import { selectHighTimeframeTargetHistoryRequestSchedulingPolicy } from './governance/helpers/chart-history/high-timeframe-target-history-request-scheduling-policy-selection.js';

const step371Measurement = {
  fetchEndToChartDataMsMax: 22.7,
  inputToTargetFetchStartMsSamples: [474.9, 536.4, 460.2, 471.4],
  sourceRequestCount: 0,
  targetFetchStartToEndMsMax: 0.2,
};

const selected = selectHighTimeframeTargetHistoryRequestSchedulingPolicy({
  measurement: step371Measurement,
});

assert.equal(selected.status, 'policy-selected');
assert.equal(selected.ownerBoundary, 'chart-history.leftward-history-input-bridge');
assert.equal(selected.nextSlice, 'htf-target-history-native-visible-range-reduced-delay-resolver');
assert.equal(selected.implementationSlice, 'htf-target-history-native-visible-range-reduced-delay-resolver');
assert.equal(selected.selectedPolicy, 'native-target-history-reduced-delay-with-coalescing');
assert.deepEqual(selected.currentPolicy, {
  lowTimeframeNativeDelayMs: 500,
  nativeVisibleRangeDelayMs: 500,
  programmaticTargetHistoryFastPath: 'unchanged',
});
assert.deepEqual(selected.futurePolicy, {
  highTimeframeTargetHistoryNativeDelayMs: 100,
  lowTimeframeNativeDelayMs: 500,
  programmaticTargetHistoryFastPath: 'unchanged',
  targetHistoryDisabledNativeDelayMs: 500,
});
assert.equal(selected.evidence.inputToFetchMinMs, 460.2);
assert.equal(selected.evidence.inputToFetchMaxMs, 536.4);
assert.equal(selected.evidence.sourceRequestCount, 0);
assert.equal(
  selected.alternatives.find((alternative) => alternative.id === 'keep-native-visible-range-delay-500ms')?.decision,
  'rejected',
);
assert.equal(
  selected.alternatives.find((alternative) => alternative.id === 'native-target-history-zero-delay-fast-path')?.decision,
  'rejected',
);
assert.equal(
  selected.alternatives.find((alternative) => alternative.id === 'native-target-history-reduced-delay-with-coalescing')?.decision,
  'selected',
);
assert.equal(selected.rollbackGates.includes('low-timeframe-native-drag-and-wheel-stay-on-requestDelayMs-500'), true);
assert.equal(selected.rollbackGates.includes('sticky-drag-and-wheel-prepend-stability-smokes-must-stay-green'), true);
assert.equal(selected.rollbackGates.includes('programmatic-target-history-fast-path-remains-unchanged'), true);

const insufficientEvidence = selectHighTimeframeTargetHistoryRequestSchedulingPolicy({
  measurement: {
    fetchEndToChartDataMsMax: 40,
    inputToTargetFetchStartMsSamples: [180, 220],
    sourceRequestCount: 0,
    targetFetchStartToEndMsMax: 1,
  },
});
assert.equal(insufficientEvidence.status, 'not-ready');
assert.equal(insufficientEvidence.nextSlice, 'htf-target-history-request-scheduling-evidence-refresh');
assert.equal(insufficientEvidence.selectedPolicy, null);

const unsafeLowTimeframe = selectHighTimeframeTargetHistoryRequestSchedulingPolicy({
  measurement: step371Measurement,
  preserveLowTimeframeNativeDelay: false,
});
assert.equal(unsafeLowTimeframe.status, 'not-ready');
assert.equal(unsafeLowTimeframe.reason, 'policy-selection-needs-step371-evidence-and-preservation-gates');

const zeroDelayCandidate = selectHighTimeframeTargetHistoryRequestSchedulingPolicy({
  allowNativeZeroDelay: true,
  measurement: step371Measurement,
});
assert.equal(
  zeroDelayCandidate.alternatives.find((alternative) => alternative.id === 'native-target-history-zero-delay-fast-path')?.decision,
  'candidate',
);
assert.equal(zeroDelayCandidate.selectedPolicy, 'native-target-history-reduced-delay-with-coalescing');

console.log('v6 high timeframe target history request scheduling policy selection step372 smoke passed');
