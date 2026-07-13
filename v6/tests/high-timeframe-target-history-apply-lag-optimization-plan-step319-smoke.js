import assert from 'node:assert/strict';
import { createHighTimeframeTargetHistoryApplyLagOptimizationPlan } from './governance/helpers/chart-history/high-timeframe-target-history-apply-lag-optimization-plan.js';

const realBudgetShape = createHighTimeframeTargetHistoryApplyLagOptimizationPlan({
  phaseBudgets: {
    'browser-visible-apply-lag': 80,
    'chart-data-replacement': 120,
    fetch: 120,
    'viewport-reapply': 80,
  },
  phaseCosts: {
    'browser-visible-apply-lag': 587.1,
    'chart-data-replacement': 45.1,
    fetch: 0.4,
    'viewport-reapply': 28.4,
  },
  selectedSlice: 'target-history-browser-visible-apply-lag-optimization',
});

assert.equal(realBudgetShape.status, 'plan-selected');
assert.equal(realBudgetShape.ownerBoundary, 'chart-surface-readout-observation');
assert.equal(realBudgetShape.owner, 'shell.pane-status-readout');
assert.equal(realBudgetShape.needsApplyLagWork, true);
assert.equal(realBudgetShape.nextSlice, 'target-history-browser-visible-apply-lag-boundary-browser-assertion');
assert.match(realBudgetShape.focusedBrowserAssertion, /chart-data-applied/);
assert.match(realBudgetShape.focusedBrowserAssertion, /diagnostics-readout-visible/);
assert.equal(realBudgetShape.candidateRuntimeChange, 'defer-runtime-change-until-browser-boundary-assertion');

const chartDataDominated = createHighTimeframeTargetHistoryApplyLagOptimizationPlan({
  phaseBudgets: {
    'browser-visible-apply-lag': 80,
    'chart-data-replacement': 120,
    'viewport-reapply': 80,
  },
  phaseCosts: {
    'browser-visible-apply-lag': 180,
    'chart-data-replacement': 220,
    'viewport-reapply': 20,
  },
  selectedSlice: 'target-history-browser-visible-apply-lag-optimization',
});
assert.equal(chartDataDominated.ownerBoundary, 'chart-data-replacement-notification');
assert.equal(chartDataDominated.owner, 'runtime.chart-data');

const viewportDominated = createHighTimeframeTargetHistoryApplyLagOptimizationPlan({
  phaseBudgets: {
    'browser-visible-apply-lag': 80,
    'chart-data-replacement': 120,
    'viewport-reapply': 80,
  },
  phaseCosts: {
    'browser-visible-apply-lag': 180,
    'chart-data-replacement': 20,
    'viewport-reapply': 140,
  },
  selectedSlice: 'target-history-browser-visible-apply-lag-optimization',
});
assert.equal(viewportDominated.ownerBoundary, 'chart-viewport-reapply-scheduling');
assert.equal(viewportDominated.owner, 'runtime.chart-viewport');

const auditFallback = createHighTimeframeTargetHistoryApplyLagOptimizationPlan({
  selectedSlice: 'target-history-fetch-optimization',
});
assert.equal(auditFallback.status, 'plan-audit');
assert.equal(auditFallback.ownerBoundary, 'chart-history-completion');

console.log('v6 high timeframe target history apply lag optimization plan step319 smoke passed');
