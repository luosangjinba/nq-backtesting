import assert from 'node:assert/strict';
import { selectHighTimeframeLeftwardExtensionBottleneckOwner } from './governance/helpers/chart-history/high-timeframe-leftward-extension-bottleneck-owner-selection.js';

const observedStep367 = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: [
    {
      browserVisible: true,
      label: '4h',
      path: 'target-history',
      phaseBreakdown: {
        browserPaintLagMs: 39.8,
        chartDataReplacementMs: 10.9,
        runtimeDurationMs: 14.3,
        sourceRequestMs: 0,
        targetRequestMs: 0.2,
        viewportReapplyMs: 6.1,
        visibleApplyLagMs: 0.1,
        visualLatencyMs: 28.2,
      },
    },
    {
      browserVisible: true,
      label: '8h',
      path: 'target-history',
      phaseBreakdown: {
        browserPaintLagMs: 51.2,
        chartDataReplacementMs: 6.5,
        runtimeDurationMs: 7.6,
        sourceRequestMs: 0,
        targetRequestMs: 0,
        viewportReapplyMs: 1.2,
        visibleApplyLagMs: 0.1,
        visualLatencyMs: 24.4,
      },
    },
    {
      browserVisible: true,
      label: '1D',
      path: 'target-history',
      phaseBreakdown: {
        browserPaintLagMs: 13.8,
        chartDataReplacementMs: 6.7,
        runtimeDurationMs: 7.8,
        sourceRequestMs: 0,
        targetRequestMs: 0.1,
        viewportReapplyMs: 1.4,
        visibleApplyLagMs: 0,
        visualLatencyMs: 49.8,
      },
    },
    {
      browserVisible: true,
      label: '1W',
      path: 'target-history',
      phaseBreakdown: {
        browserPaintLagMs: 38.2,
        chartDataReplacementMs: 2.6,
        runtimeDurationMs: 3.9,
        sourceRequestMs: 0,
        targetRequestMs: 0,
        viewportReapplyMs: 2.8,
        visibleApplyLagMs: 0.2,
        visualLatencyMs: 13.3,
      },
    },
  ],
});
assert.equal(observedStep367.status, 'narrower-measurement-selected');
assert.equal(observedStep367.selectedPhase, 'browserPaintLagMs');
assert.equal(observedStep367.ownerBoundary, 'chart-surface-browser-paint-measurement');
assert.equal(observedStep367.nextSlice, 'target-history-real-chart-paint-visibility-measurement');
assert.equal(observedStep367.reason, 'browser-paint-observation-window-dominates-with-low-runtime-costs');
assert.equal(observedStep367.summary.targetCount, 4);
assert.equal(observedStep367.summary.phaseSummary.sourceRequestMs.p95Ms, 0);
assert.equal(observedStep367.summary.phaseSummary.targetRequestMs.p95Ms, 0.2);
assert.equal(
  observedStep367.rejectedOwnerCandidates.find((candidate) => candidate.phase === 'targetRequestMs').reason,
  'within-budget',
);
assert.equal(
  observedStep367.rejectedOwnerCandidates.find((candidate) => candidate.phase === 'chartDataReplacementMs').reason,
  'within-budget',
);
assert.equal(
  observedStep367.rejectedOwnerCandidates.find((candidate) => candidate.phase === 'viewportReapplyMs').reason,
  'within-budget',
);
assert.equal(
  observedStep367.rejectedOwnerCandidates.find((candidate) => candidate.phase === 'visibleApplyLagMs').reason,
  'within-budget',
);

const targetLoad = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: Array.from({ length: 4 }, (_, index) => ({
    browserVisible: true,
    label: `sample-${index}`,
    path: 'target-history',
    phaseBreakdown: {
      browserPaintLagMs: 8,
      chartDataReplacementMs: 10,
      sourceRequestMs: 0,
      targetRequestMs: 80 + index,
      viewportReapplyMs: 4,
      visibleApplyLagMs: 1,
    },
  })),
});
assert.equal(targetLoad.status, 'owner-selected');
assert.equal(targetLoad.selectedPhase, 'targetRequestMs');
assert.equal(targetLoad.ownerBoundary, 'runtime.bar-data-target-window');
assert.equal(targetLoad.nextSlice, 'target-history-target-load-request-optimization');

const chartData = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: Array.from({ length: 4 }, (_, index) => ({
    browserVisible: true,
    path: 'target-history',
    phaseBreakdown: {
      browserPaintLagMs: 10,
      chartDataReplacementMs: 90 + index,
      sourceRequestMs: 0,
      targetRequestMs: 1,
      viewportReapplyMs: 4,
      visibleApplyLagMs: 1,
    },
  })),
});
assert.equal(chartData.selectedPhase, 'chartDataReplacementMs');
assert.equal(chartData.ownerBoundary, 'runtime.chart-data');
assert.equal(chartData.nextSlice, 'target-history-chart-data-replacement-optimization');

const viewport = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: Array.from({ length: 4 }, (_, index) => ({
    browserVisible: true,
    path: 'target-history',
    phaseBreakdown: {
      browserPaintLagMs: 8,
      chartDataReplacementMs: 10,
      sourceRequestMs: 0,
      targetRequestMs: 1,
      viewportReapplyMs: 70 + index,
      visibleApplyLagMs: 1,
    },
  })),
});
assert.equal(viewport.selectedPhase, 'viewportReapplyMs');
assert.equal(viewport.ownerBoundary, 'runtime.chart-viewport');
assert.equal(viewport.nextSlice, 'target-history-viewport-reapply-optimization');

const visibleLag = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: Array.from({ length: 4 }, (_, index) => ({
    browserVisible: true,
    path: 'target-history',
    phaseBreakdown: {
      browserPaintLagMs: 8,
      chartDataReplacementMs: 10,
      sourceRequestMs: 0,
      targetRequestMs: 1,
      viewportReapplyMs: 4,
      visibleApplyLagMs: 90 + index,
    },
  })),
});
assert.equal(visibleLag.status, 'narrower-measurement-selected');
assert.equal(visibleLag.selectedPhase, 'visibleApplyLagMs');
assert.equal(visibleLag.ownerBoundary, 'target-history-diagnostics-readout-or-browser-visibility');
assert.equal(visibleLag.nextSlice, 'target-history-visible-apply-lag-measurement');

const withinBudget = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: Array.from({ length: 4 }, () => ({
    browserVisible: true,
    path: 'target-history',
    phaseBreakdown: {
      browserPaintLagMs: 8,
      chartDataReplacementMs: 10,
      sourceRequestMs: 0,
      targetRequestMs: 1,
      viewportReapplyMs: 4,
      visibleApplyLagMs: 1,
    },
  })),
});
assert.equal(withinBudget.status, 'materialization-ready');
assert.equal(withinBudget.nextSlice, 'replay-coordination-materialization-transition');

const incomplete = selectHighTimeframeLeftwardExtensionBottleneckOwner({
  records: [
    { browserVisible: true, path: 'target-history', phaseBreakdown: { browserPaintLagMs: 8 } },
  ],
});
assert.equal(incomplete.status, 'measurement-incomplete');
assert.equal(incomplete.nextSlice, 'target-history-leftward-extension-phase-measurement');

console.log('v6 high timeframe leftward extension bottleneck owner selection step368 smoke passed');
