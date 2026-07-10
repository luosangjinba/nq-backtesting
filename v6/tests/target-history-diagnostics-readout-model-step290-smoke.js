import assert from 'node:assert/strict';
import { createTargetHistoryDiagnosticsReadoutState } from '../src/shell/target-history-diagnostics-readout-model.js';

const idle = createTargetHistoryDiagnosticsReadoutState(null);
assert.equal(idle.path, 'idle');
assert.equal(idle.text, 'History idle');

const target = createTargetHistoryDiagnosticsReadoutState({
  diagnostics: {
    durationMs: 18.4,
    path: 'target-history',
    prependedBarCount: 24,
    sourceRequestCount: 0,
    targetRequestCount: 1,
  },
});
assert.equal(target.path, 'target');
assert.equal(target.text, 'History target 18ms T1/S0 +24');
assert.match(target.title, /Path: target-history/);
assert.match(target.title, /Prepended bars: 24/);

const fallback = createTargetHistoryDiagnosticsReadoutState({
  diagnostics: {
    durationMs: 126.8,
    fallbackReason: 'target-history-empty',
    path: 'target-history-fallback-source-window',
    prependedBarCount: 12,
    sourceRequestCount: 2,
    targetRequestCount: 1,
  },
});
assert.equal(fallback.path, 'fallback');
assert.equal(fallback.fallbackReason, 'target-history-empty');
assert.equal(fallback.text, 'History fallback 127ms T1/S2 +12 target-history-empty');
assert.match(fallback.title, /Fallback reason: target-history-empty/);

console.log('v6 target history diagnostics readout model step290 smoke passed');
