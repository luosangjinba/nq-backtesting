import assert from 'node:assert/strict';
import { selectHighTimeframeTargetHistoryPhaseBudget } from './governance/helpers/chart-history/high-timeframe-target-history-phase-budget-selection.js';

const ready = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 40, durationMs: 80, fetchMs: 20, path: 'target-history', viewportReapplyMs: 25, visualLatencyMs: 120 },
    { applyLagMs: 24, browserVisible: true, chartDataReplacementMs: 45, durationMs: 90, fetchMs: 22, path: 'target-history', viewportReapplyMs: 28, visualLatencyMs: 130 },
    { applyLagMs: 28, browserVisible: true, chartDataReplacementMs: 50, durationMs: 100, fetchMs: 25, path: 'target-history', viewportReapplyMs: 30, visualLatencyMs: 140 },
  ],
});
assert.equal(ready.status, 'materialization-ready');
assert.equal(ready.selectedSlice, 'replay-coordination-materialization-transition');
assert.equal(ready.selectedPhase, null);
assert.deepEqual(ready.phaseFindings, []);

const fetch = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 40, durationMs: 260, fetchMs: 190, path: 'target-history', viewportReapplyMs: 25, visualLatencyMs: 300 },
    { applyLagMs: 24, browserVisible: true, chartDataReplacementMs: 45, durationMs: 280, fetchMs: 210, path: 'target-history', viewportReapplyMs: 28, visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, chartDataReplacementMs: 50, durationMs: 300, fetchMs: 240, path: 'target-history', viewportReapplyMs: 30, visualLatencyMs: 340 },
  ],
});
assert.equal(fetch.status, 'optimize-phase');
assert.equal(fetch.selectedPhase, 'fetch');
assert.equal(fetch.selectedSlice, 'target-history-fetch-optimization');
assert.equal(fetch.phaseFindings[0].phase, 'fetch');

const chartData = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 190, durationMs: 260, fetchMs: 30, path: 'target-history', viewportReapplyMs: 25, visualLatencyMs: 300 },
    { applyLagMs: 24, browserVisible: true, chartDataReplacementMs: 210, durationMs: 280, fetchMs: 35, path: 'target-history', viewportReapplyMs: 28, visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, chartDataReplacementMs: 240, durationMs: 300, fetchMs: 40, path: 'target-history', viewportReapplyMs: 30, visualLatencyMs: 340 },
  ],
});
assert.equal(chartData.selectedPhase, 'chart-data-replacement');
assert.equal(chartData.selectedSlice, 'target-history-chart-data-replacement-optimization');

const viewport = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 40, durationMs: 240, fetchMs: 30, path: 'target-history', viewportReapplyMs: 140, visualLatencyMs: 300 },
    { applyLagMs: 24, browserVisible: true, chartDataReplacementMs: 45, durationMs: 245, fetchMs: 35, path: 'target-history', viewportReapplyMs: 150, visualLatencyMs: 330 },
    { applyLagMs: 28, browserVisible: true, chartDataReplacementMs: 50, durationMs: 250, fetchMs: 40, path: 'target-history', viewportReapplyMs: 160, visualLatencyMs: 360 },
  ],
});
assert.equal(viewport.selectedPhase, 'viewport-reapply');
assert.equal(viewport.selectedSlice, 'target-history-viewport-reapply-optimization');

const applyLag = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 130, browserVisible: true, chartDataReplacementMs: 40, durationMs: 100, fetchMs: 30, path: 'target-history', viewportReapplyMs: 25, visualLatencyMs: 260 },
    { applyLagMs: 140, browserVisible: true, chartDataReplacementMs: 45, durationMs: 110, fetchMs: 35, path: 'target-history', viewportReapplyMs: 28, visualLatencyMs: 300 },
    { applyLagMs: 150, browserVisible: true, chartDataReplacementMs: 50, durationMs: 120, fetchMs: 40, path: 'target-history', viewportReapplyMs: 30, visualLatencyMs: 360 },
  ],
});
assert.equal(applyLag.selectedPhase, 'browser-visible-apply-lag');
assert.equal(applyLag.selectedSlice, 'target-history-browser-visible-apply-lag-optimization');

const incomplete = selectHighTimeframeTargetHistoryPhaseBudget({
  records: [
    { applyLagMs: 20, browserVisible: true, chartDataReplacementMs: 40, durationMs: 80, fetchMs: 20, path: 'target-history', viewportReapplyMs: 25, visualLatencyMs: 120 },
  ],
});
assert.equal(incomplete.status, 'measurement-incomplete');
assert.equal(incomplete.selectedSlice, 'high-timeframe-target-history-responsiveness-harness');

console.log('v6 high timeframe target history phase budget selection step315 smoke passed');
