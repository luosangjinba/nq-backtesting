import assert from 'node:assert/strict';
import { remeasureHighTimeframeTargetHistoryFastPathResponsiveness } from '../src/chart-history/high-timeframe-target-history-fast-path-remeasurement.js';

const ready = remeasureHighTimeframeTargetHistoryFastPathResponsiveness({
  records: [
    { applyLagMs: 0, browserVisible: true, durationMs: 12, fallbackReason: null, path: 'target-history', visualLatencyMs: 18 },
    { applyLagMs: 0, browserVisible: true, durationMs: 14, fallbackReason: null, path: 'target-history', visualLatencyMs: 22 },
    { applyLagMs: 1, browserVisible: true, durationMs: 16, fallbackReason: null, path: 'target-history', visualLatencyMs: 24 },
  ],
});
assert.equal(ready.status, 'materialization-ready');
assert.equal(ready.ownerBoundary, 'target-history-fast-path-responsive');
assert.equal(ready.nextSlice, 'replay-coordination-materialization-transition');
assert.equal(ready.audit.summary.browserSampleCount, 3);

const residual = remeasureHighTimeframeTargetHistoryFastPathResponsiveness({
  records: [
    { applyLagMs: 0, browserVisible: true, durationMs: 12, fallbackReason: null, path: 'target-history', visualLatencyMs: 500 },
    { applyLagMs: 0, browserVisible: true, durationMs: 14, fallbackReason: null, path: 'target-history', visualLatencyMs: 520 },
    { applyLagMs: 1, browserVisible: true, durationMs: 16, fallbackReason: null, path: 'target-history', visualLatencyMs: 540 },
  ],
});
assert.equal(residual.status, 'residual-latency-attribution-needed');
assert.equal(residual.nextSlice, 'target-history-fast-path-residual-latency-attribution');

const fallback = remeasureHighTimeframeTargetHistoryFastPathResponsiveness({
  records: [
    { applyLagMs: 0, browserVisible: true, durationMs: 12, fallbackReason: 'x', path: 'target-history-fallback-source-window', visualLatencyMs: 18 },
    { applyLagMs: 0, browserVisible: true, durationMs: 14, fallbackReason: 'x', path: 'target-history-fallback-source-window', visualLatencyMs: 22 },
    { applyLagMs: 1, browserVisible: true, durationMs: 16, fallbackReason: null, path: 'target-history', visualLatencyMs: 24 },
  ],
});
assert.equal(fallback.status, 'fallback-attribution-needed');
assert.equal(fallback.nextSlice, 'target-history-fallback-rate-attribution');

const incomplete = remeasureHighTimeframeTargetHistoryFastPathResponsiveness({
  records: [],
});
assert.equal(incomplete.status, 'measurement-incomplete');

console.log('v6 high timeframe target history fast path remeasurement step327 smoke passed');
