import assert from 'node:assert/strict';
import { attributeHighTimeframeTargetHistoryTriggerCoordinationLatency } from '../src/chart-history/high-timeframe-target-history-trigger-coordination-attribution.js';

const scheduling = attributeHighTimeframeTargetHistoryTriggerCoordinationLatency({
  records: [
    { browserVisible: true, displayApplyMs: 20, eventEmissionMs: 2, path: 'target-history', postApplyTargetFetchStartMs: 510, preLeftExtensionMs: 540, targetRuntimeMs: 30 },
    { browserVisible: true, displayApplyMs: 18, eventEmissionMs: 1, path: 'target-history', postApplyTargetFetchStartMs: 520, preLeftExtensionMs: 552, targetRuntimeMs: 32 },
    { browserVisible: true, displayApplyMs: 22, eventEmissionMs: 3, path: 'target-history', postApplyTargetFetchStartMs: 500, preLeftExtensionMs: 535, targetRuntimeMs: 35 },
  ],
});
assert.equal(scheduling.status, 'leftward-request-scheduling-attribution-needed');
assert.equal(scheduling.ownerBoundary, 'chart-history.leftward-history-input-bridge');
assert.equal(scheduling.nextSlice, 'target-history-leftward-request-scheduling-plan');
assert.equal(scheduling.selectedPhase, 'scheduling');

const displayApply = attributeHighTimeframeTargetHistoryTriggerCoordinationLatency({
  records: [
    { browserVisible: true, displayApplyMs: 420, eventEmissionMs: 4, path: 'target-history', postApplyTargetFetchStartMs: 40, preLeftExtensionMs: 500, targetRuntimeMs: 80 },
    { browserVisible: true, displayApplyMs: 430, eventEmissionMs: 5, path: 'target-history', postApplyTargetFetchStartMs: 30, preLeftExtensionMs: 510, targetRuntimeMs: 75 },
    { browserVisible: true, displayApplyMs: 410, eventEmissionMs: 3, path: 'target-history', postApplyTargetFetchStartMs: 45, preLeftExtensionMs: 498, targetRuntimeMs: 88 },
  ],
});
assert.equal(displayApply.status, 'display-apply-coordination-attribution-needed');
assert.equal(displayApply.ownerBoundary, 'runtime.display-timeframe');

const targetRuntime = attributeHighTimeframeTargetHistoryTriggerCoordinationLatency({
  records: [
    { browserVisible: true, displayApplyMs: 20, eventEmissionMs: 5, path: 'target-history', postApplyTargetFetchStartMs: 50, preLeftExtensionMs: 510, targetRuntimeMs: 440 },
    { browserVisible: true, displayApplyMs: 25, eventEmissionMs: 5, path: 'target-history', postApplyTargetFetchStartMs: 55, preLeftExtensionMs: 520, targetRuntimeMs: 445 },
    { browserVisible: true, displayApplyMs: 18, eventEmissionMs: 4, path: 'target-history', postApplyTargetFetchStartMs: 45, preLeftExtensionMs: 500, targetRuntimeMs: 430 },
  ],
});
assert.equal(targetRuntime.status, 'target-history-runtime-attribution-needed');
assert.equal(targetRuntime.ownerBoundary, 'runtime.leftward-history-extension');

const incomplete = attributeHighTimeframeTargetHistoryTriggerCoordinationLatency({
  records: [{ browserVisible: false, path: 'target-history' }],
});
assert.equal(incomplete.status, 'measurement-incomplete');
assert.equal(incomplete.nextSlice, 'target-history-trigger-coordination-latency-attribution');

console.log('v6 high timeframe target history trigger coordination attribution step324 smoke passed');
