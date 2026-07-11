import assert from 'node:assert/strict';
import { planHighTimeframeTargetHistoryLeftwardRequestScheduling } from '../src/chart-history/high-timeframe-target-history-leftward-request-scheduling-plan.js';

const ready = planHighTimeframeTargetHistoryLeftwardRequestScheduling({
  attribution: {
    ownerBoundary: 'chart-history.leftward-history-input-bridge',
    selectedPhase: 'scheduling',
    status: 'leftward-request-scheduling-attribution-needed',
  },
});
assert.equal(ready.status, 'implementation-plan-ready');
assert.equal(ready.ownerBoundary, 'chart-history.leftward-history-input-bridge');
assert.equal(ready.nextSlice, 'target-history-programmatic-leftward-request-fast-path');
assert.equal(ready.implementationSlice, 'target-history-programmatic-leftward-request-fast-path');
assert.deepEqual(ready.currentBehavior, {
  nativeVisibleRangeInput: 'delayed-requestDelayMs',
  runtimeProjectionAndDisplayApply: 'zero-delay-surface-check-then-delayed-requestDelayMs',
});
assert.equal(ready.plan.includes('keep native visible-range drag/wheel scheduling on requestDelayMs'), true);
assert.equal(ready.plan.includes('continue requiring shouldRequest visible-range validation before dispatch'), true);

const wrongOwner = planHighTimeframeTargetHistoryLeftwardRequestScheduling({
  attribution: {
    ownerBoundary: 'runtime.leftward-history-extension',
    selectedPhase: 'targetRuntime',
    status: 'target-history-runtime-attribution-needed',
  },
});
assert.equal(wrongOwner.status, 'not-ready');
assert.equal(wrongOwner.nextSlice, 'target-history-trigger-coordination-latency-attribution');

const unsafe = planHighTimeframeTargetHistoryLeftwardRequestScheduling({
  attribution: {
    ownerBoundary: 'chart-history.leftward-history-input-bridge',
    selectedPhase: 'scheduling',
    status: 'leftward-request-scheduling-attribution-needed',
  },
  preserveNativeInputDelay: false,
});
assert.equal(unsafe.status, 'unsafe-plan');
assert.equal(unsafe.nextSlice, 'target-history-leftward-request-scheduling-plan');

console.log('v6 high timeframe target history leftward request scheduling plan step325 smoke passed');
