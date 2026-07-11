import assert from 'node:assert/strict';
import { auditHighTimeframeTargetHistoryResponsiveness } from '../src/chart-history/high-timeframe-target-history-responsiveness-audit.js';

const prerequisitesMissing = auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady: false,
  targetHistoryCoverageComplete: true,
});
assert.equal(prerequisitesMissing.reason, 'target-history-prerequisites-incomplete');
assert.equal(prerequisitesMissing.nextSlice, null);

const missingBrowserSamples = auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady: true,
  records: [
    { durationMs: 42, path: 'target-history', targetLoadMs: 24 },
    { durationMs: 45, path: 'target-history', targetLoadMs: 25 },
  ],
  targetHistoryCoverageComplete: true,
});
assert.equal(missingBrowserSamples.reason, 'high-timeframe-responsiveness-browser-measurement-missing');
assert.equal(missingBrowserSamples.nextSlice, 'responsiveness-harness');
assert.equal(missingBrowserSamples.summary.browserSampleCount, 0);

const highFallback = auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady: true,
  records: [
    { browserVisible: true, durationMs: 70, path: 'target-history', visualLatencyMs: 90 },
    { browserVisible: true, durationMs: 80, path: 'target-history-fallback-source-window', visualLatencyMs: 100 },
    { browserVisible: true, durationMs: 85, path: 'target-history-fallback-source-window', visualLatencyMs: 110 },
  ],
  targetHistoryCoverageComplete: true,
});
assert.equal(highFallback.reason, 'high-timeframe-target-history-fallback-rate-high');
assert.equal(highFallback.nextSlice, 'bounded-runtime-optimization');
assert.equal(highFallback.summary.fallbackRate, 2 / 3);

const budgetExceeded = auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady: true,
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 120, path: 'target-history', visualLatencyMs: 250 },
    { applyLagMs: 25, browserVisible: true, durationMs: 140, path: 'target-history', visualLatencyMs: 260 },
    { applyLagMs: 95, browserVisible: true, durationMs: 280, path: 'target-history', visualLatencyMs: 410 },
  ],
  targetHistoryCoverageComplete: true,
});
assert.equal(budgetExceeded.reason, 'high-timeframe-target-history-responsive-budget-exceeded');
assert.equal(budgetExceeded.nextSlice, 'bounded-runtime-optimization');
assert.equal(budgetExceeded.summary.durationP95Ms, 280);
assert.equal(budgetExceeded.summary.visualLatencyP95Ms, 410);
assert.equal(budgetExceeded.summary.applyLagP95Ms, 95);

const materializationReady = auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady: true,
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 60, path: 'target-history', visualLatencyMs: 90 },
    { applyLagMs: 22, browserVisible: true, durationMs: 65, path: 'target-history', visualLatencyMs: 95 },
    { applyLagMs: 24, browserVisible: true, durationMs: 70, path: 'target-history', visualLatencyMs: 100 },
  ],
  targetHistoryCoverageComplete: true,
});
assert.equal(materializationReady.reason, 'high-timeframe-target-history-responsive-materialization-ready');
assert.equal(materializationReady.nextSlice, 'replay-coordination-materialization-transition');
assert.equal(materializationReady.summary.targetCount, 3);
assert.equal(materializationReady.summary.fallbackRate, 0);

console.log('v6 high timeframe target history responsiveness audit step310 smoke passed');
