import assert from 'node:assert/strict';
import { decideTargetHistoryOptimization } from '../src/chart-history/target-history-optimization-decision.js';

const baseline = decideTargetHistoryOptimization({
  diagnostics: [
    { durationMs: 18, path: 'target-history', targetLoadMs: 12 },
    { durationMs: 22, path: 'target-history', targetLoadMs: 14 },
    { durationMs: 70, path: 'source-window', sourceLoadMs: 60 },
    { durationMs: 80, path: 'source-window', sourceLoadMs: 72 },
  ],
});
assert.equal(baseline.decision, 'add-diagnostic-readout');
assert.equal(baseline.reason, 'target-history-diagnostics-need-operator-visibility');
assert.equal(baseline.summary.targetCount, 2);
assert.equal(baseline.summary.sourceCount, 2);
assert.equal(baseline.summary.fallbackCount, 0);
assert.equal(baseline.summary.targetMedianMs, 13);
assert.equal(baseline.summary.sourceMedianMs, 66);

const highFallback = decideTargetHistoryOptimization({
  diagnostics: [
    { path: 'target-history', targetLoadMs: 12 },
    { fallbackReason: 'target-history-load-failed', path: 'target-history-fallback-source-window', sourceLoadMs: 60, targetLoadMs: 30 },
  ],
});
assert.equal(highFallback.decision, 'harden-fallback');
assert.equal(highFallback.reason, 'target-history-fallback-rate-high');
assert.equal(highFallback.summary.fallbackRate, 0.5);

const slowTarget = decideTargetHistoryOptimization({
  diagnostics: [
    { path: 'target-history', targetLoadMs: 150 },
    { path: 'source-window', sourceLoadMs: 80 },
  ],
});
assert.equal(slowTarget.decision, 'tune-activation-policy');
assert.equal(slowTarget.reason, 'target-history-slower-than-source');
assert.equal(slowTarget.summary.targetToSourceRatio, 1.875);

console.log('v6 target history optimization decision step289 smoke passed');
