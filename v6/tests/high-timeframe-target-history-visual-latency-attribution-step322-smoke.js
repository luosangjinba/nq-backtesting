import assert from 'node:assert/strict';
import { selectHighTimeframeTargetHistoryPhaseBudget } from './governance/helpers/chart-history/high-timeframe-target-history-phase-budget-selection.js';
import { stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution } from '../src/chart-history/high-timeframe-target-history-visual-latency-attribution.js';

const residualVisualLatency = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 8, durationMs: 18, fetchMs: 1, path: 'target-history', viewportReapplyMs: 6, visualLatencyMs: 520 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 9, durationMs: 17, fetchMs: 1, path: 'target-history', viewportReapplyMs: 5, visualLatencyMs: 530 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 7, durationMs: 16, fetchMs: 1, path: 'target-history', viewportReapplyMs: 7, visualLatencyMs: 540 },
  ],
});
const stabilized = stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution({
  selection: residualVisualLatency,
});
assert.equal(residualVisualLatency.status, 'optimize-phase');
assert.equal(stabilized.status, 'visual-latency-attribution-needed');
assert.equal(stabilized.ownerBoundary, 'browser-rendering-or-measurement-boundary');
assert.equal(stabilized.nextSlice, 'target-history-browser-rendering-visibility-attribution');
assert.equal(['chart-data-replacement', 'viewport-reapply'].includes(stabilized.suppressedPhase), true);

const chartDataRuntime = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 180, durationMs: 220, fetchMs: 1, path: 'target-history', viewportReapplyMs: 6, visualLatencyMs: 520 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 190, durationMs: 230, fetchMs: 1, path: 'target-history', viewportReapplyMs: 5, visualLatencyMs: 530 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 200, durationMs: 240, fetchMs: 1, path: 'target-history', viewportReapplyMs: 7, visualLatencyMs: 540 },
  ],
});
const chartDataStable = stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution({
  selection: chartDataRuntime,
});
assert.equal(chartDataStable.status, 'runtime-phase-stable');
assert.equal(chartDataStable.ownerBoundary, 'chart-data-replacement');
assert.equal(chartDataStable.nextSlice, 'target-history-chart-data-replacement-optimization');

const ready = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 8, durationMs: 18, fetchMs: 1, path: 'target-history', viewportReapplyMs: 6, visualLatencyMs: 120 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 9, durationMs: 17, fetchMs: 1, path: 'target-history', viewportReapplyMs: 5, visualLatencyMs: 130 },
    { applyLagMs: 0, browserVisible: true, chartDataReplacementMs: 7, durationMs: 16, fetchMs: 1, path: 'target-history', viewportReapplyMs: 7, visualLatencyMs: 140 },
  ],
});
const readyStable = stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution({
  selection: ready,
});
assert.equal(readyStable.status, 'materialization-ready');
assert.equal(readyStable.nextSlice, 'replay-coordination-materialization-transition');

console.log('v6 high timeframe target history visual latency attribution step322 smoke passed');
