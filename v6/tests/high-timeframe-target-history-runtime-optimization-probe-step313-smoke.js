import assert from 'node:assert/strict';
import { createHighTimeframeTargetHistoryRuntimeOptimizationProbe } from '../src/chart-history/high-timeframe-target-history-runtime-optimization-probe.js';

const ready = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 80, path: 'target-history', visualLatencyMs: 120 },
    { applyLagMs: 22, browserVisible: true, durationMs: 90, path: 'target-history', visualLatencyMs: 130 },
    { applyLagMs: 24, browserVisible: true, durationMs: 100, path: 'target-history', visualLatencyMs: 140 },
  ],
});
assert.equal(ready.reason, 'target-history-runtime-optimization-not-needed');
assert.equal(ready.recommendation, 'start-materialization-transition');
assert.equal(ready.nextSlice, 'replay-coordination-materialization-transition');
assert.equal(ready.dominantPhase, null);

const fetchDominated = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 260, fetchMs: 210, path: 'target-history', visualLatencyMs: 300 },
    { applyLagMs: 25, browserVisible: true, durationMs: 280, fetchMs: 240, path: 'target-history', visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, durationMs: 300, fetchMs: 260, path: 'target-history', visualLatencyMs: 340 },
  ],
});
assert.equal(fetchDominated.reason, 'target-history-runtime-optimization-dominant-phase-found');
assert.equal(fetchDominated.dominantPhase, 'fetch');
assert.equal(fetchDominated.nextSlice, 'target-history-fetch-optimization');
assert.equal(fetchDominated.phaseCosts.fetch, 260);

const chartDataDominated = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 260, durationMs: 270, fetchMs: 30, path: 'target-history', visualLatencyMs: 310 },
    { applyLagMs: 25, browserVisible: true, chartDataReplacementMs: 280, durationMs: 290, fetchMs: 35, path: 'target-history', visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, chartDataReplacementMs: 300, durationMs: 310, fetchMs: 40, path: 'target-history', visualLatencyMs: 340 },
  ],
});
assert.equal(chartDataDominated.dominantPhase, 'chart-data-replacement');
assert.equal(chartDataDominated.nextSlice, 'target-history-chart-data-replacement-optimization');

const viewportDominated = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 230, path: 'target-history', viewportReapplyMs: 260, visualLatencyMs: 300 },
    { applyLagMs: 25, browserVisible: true, durationMs: 240, path: 'target-history', viewportReapplyMs: 280, visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, durationMs: 250, path: 'target-history', viewportReapplyMs: 300, visualLatencyMs: 360 },
  ],
});
assert.equal(viewportDominated.dominantPhase, 'viewport-reapply');
assert.equal(viewportDominated.nextSlice, 'target-history-viewport-reapply-optimization');

const applyLagDominated = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 120, browserVisible: true, durationMs: 100, path: 'target-history', visualLatencyMs: 260 },
    { applyLagMs: 130, browserVisible: true, durationMs: 110, path: 'target-history', visualLatencyMs: 300 },
    { applyLagMs: 140, browserVisible: true, durationMs: 120, path: 'target-history', visualLatencyMs: 360 },
  ],
});
assert.equal(applyLagDominated.dominantPhase, 'browser-visible-apply-lag');
assert.equal(applyLagDominated.nextSlice, 'target-history-browser-visible-apply-lag-optimization');

const incomplete = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  records: [
    { applyLagMs: 20, browserVisible: true, durationMs: 80, path: 'target-history', visualLatencyMs: 120 },
  ],
});
assert.equal(incomplete.reason, 'target-history-runtime-optimization-measurement-incomplete');
assert.equal(incomplete.nextSlice, 'high-timeframe-target-history-responsiveness-harness');
assert.equal(incomplete.recommendation, 'collect-browser-visible-samples');

console.log('v6 high timeframe target history runtime optimization probe step313 smoke passed');
