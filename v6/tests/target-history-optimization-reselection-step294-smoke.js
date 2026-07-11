import assert from 'node:assert/strict';
import {
  decideTargetHistoryOptimization,
  reselectTargetHistoryOptimization,
} from '../src/chart-history/target-history-optimization-decision.js';

const representativeDiagnostics = [
  { durationMs: 18, path: 'target-history', targetLoadMs: 12 },
  { durationMs: 22, path: 'target-history', targetLoadMs: 14 },
  { durationMs: 70, path: 'source-window', sourceLoadMs: 60 },
  { durationMs: 80, path: 'source-window', sourceLoadMs: 72 },
];

const original = decideTargetHistoryOptimization({
  diagnostics: representativeDiagnostics,
});
assert.equal(original.decision, 'add-diagnostic-readout');

const reselected = reselectTargetHistoryOptimization({
  completed: ['add-diagnostic-readout'],
  diagnostics: representativeDiagnostics,
});
assert.equal(reselected.decision, 'tune-target-request-sizing');
assert.equal(reselected.reason, 'target-history-readout-complete-next-size-requests');
assert.equal(reselected.summary.targetCount, 2);
assert.equal(reselected.summary.sourceCount, 2);
assert.equal(reselected.summary.fallbackCount, 0);
assert.equal(reselected.summary.targetMedianMs, 13);
assert.equal(reselected.summary.sourceMedianMs, 66);

const highFallback = reselectTargetHistoryOptimization({
  completed: ['add-diagnostic-readout'],
  diagnostics: [
    { path: 'target-history', targetLoadMs: 12 },
    { fallbackReason: 'target-history-load-failed', path: 'target-history-fallback-source-window', sourceLoadMs: 60, targetLoadMs: 30 },
  ],
});
assert.equal(highFallback.decision, 'harden-fallback');
assert.equal(highFallback.reason, 'target-history-fallback-rate-high');

const slowTarget = reselectTargetHistoryOptimization({
  completed: ['add-diagnostic-readout'],
  diagnostics: [
    { path: 'target-history', targetLoadMs: 150 },
    { path: 'source-window', sourceLoadMs: 80 },
  ],
});
assert.equal(slowTarget.decision, 'tune-activation-policy');
assert.equal(slowTarget.reason, 'target-history-slower-than-source');

const withoutCompletedReadout = reselectTargetHistoryOptimization({
  completed: [],
  diagnostics: representativeDiagnostics,
});
assert.equal(withoutCompletedReadout.decision, 'add-diagnostic-readout');

console.log('v6 target history optimization reselection step294 smoke passed');
