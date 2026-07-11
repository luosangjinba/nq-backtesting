import assert from 'node:assert/strict';
import { createHighTimeframeTargetHistoryResponsivenessBudgetReport } from '../src/chart-history/high-timeframe-target-history-responsiveness-budget-decision.js';

const fastRecords = [
  { applyLagMs: 20, browserVisible: true, durationMs: 80, path: 'target-history', visualLatencyMs: 120 },
  { applyLagMs: 24, browserVisible: true, durationMs: 90, path: 'target-history', visualLatencyMs: 130 },
  { applyLagMs: 28, browserVisible: true, durationMs: 100, path: 'target-history', visualLatencyMs: 140 },
];

const ready = createHighTimeframeTargetHistoryResponsivenessBudgetReport({
  records: fastRecords,
});
assert.equal(ready.outcome, 'materialization-transition-ready');
assert.equal(ready.implementationSlice, 'replay-coordination-materialization-transition');
assert.equal(ready.auditReason, 'high-timeframe-target-history-responsive-materialization-ready');
assert.equal(ready.recordsAccepted, true);
assert.deepEqual(ready.budgetFindings, []);
assert.equal(ready.summary.browserSampleCount, 3);
assert.equal(ready.summary.targetCount, 3);
assert.equal(ready.summary.fallbackRate, 0);
assert.equal(ready.thresholds.maxVisualLatencyMs, 350);
assert.equal(ready.thresholds.maxApplyLagMs, 80);

const slowRecords = [
  { applyLagMs: 40, browserVisible: true, durationMs: 120, path: 'target-history', visualLatencyMs: 200 },
  { applyLagMs: 85, browserVisible: true, durationMs: 260, path: 'target-history', visualLatencyMs: 360 },
  { applyLagMs: 95, browserVisible: true, durationMs: 290, path: 'target-history', visualLatencyMs: 420 },
];

const slow = createHighTimeframeTargetHistoryResponsivenessBudgetReport({
  records: slowRecords,
});
assert.equal(slow.outcome, 'optimize-before-materialization');
assert.equal(slow.implementationSlice, 'bounded-runtime-optimization');
assert.equal(slow.auditReason, 'high-timeframe-target-history-responsive-budget-exceeded');
assert.deepEqual(slow.budgetFindings.map((finding) => finding.metric), [
  'durationP95Ms',
  'visualLatencyP95Ms',
  'applyLagP95Ms',
]);
assert.equal(slow.budgetFindings.find((finding) => finding.metric === 'durationP95Ms').budget, 250);
assert.equal(slow.budgetFindings.find((finding) => finding.metric === 'visualLatencyP95Ms').budget, 350);
assert.equal(slow.budgetFindings.find((finding) => finding.metric === 'applyLagP95Ms').budget, 80);

const fallback = createHighTimeframeTargetHistoryResponsivenessBudgetReport({
  records: [
    { browserVisible: true, durationMs: 100, path: 'target-history', visualLatencyMs: 130 },
    { browserVisible: true, durationMs: 120, path: 'target-history-fallback-source-window', visualLatencyMs: 150 },
    { browserVisible: true, durationMs: 130, path: 'target-history-fallback-source-window', visualLatencyMs: 160 },
  ],
});
assert.equal(fallback.outcome, 'optimize-before-materialization');
assert.equal(fallback.auditReason, 'high-timeframe-target-history-fallback-rate-high');
assert.deepEqual(fallback.budgetFindings.map((finding) => finding.metric), ['fallbackRate']);
assert.equal(fallback.budgetFindings[0].budget, 0.2);

const incomplete = createHighTimeframeTargetHistoryResponsivenessBudgetReport({
  records: [
    { browserVisible: true, durationMs: 90, path: 'target-history', visualLatencyMs: 120 },
  ],
});
assert.equal(incomplete.outcome, 'measurement-incomplete');
assert.equal(incomplete.implementationSlice, 'responsiveness-harness');
assert.equal(incomplete.recordsAccepted, false);
assert.equal(incomplete.auditReason, 'high-timeframe-responsiveness-browser-measurement-missing');

console.log('v6 high timeframe target history responsiveness budget decision step312 smoke passed');
