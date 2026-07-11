const APPLY_LAG_SLICE = 'target-history-browser-visible-apply-lag-optimization';

const OWNER_BOUNDARIES = Object.freeze({
  'chart-data-replacement-notification': Object.freeze({
    owner: 'runtime.chart-data',
    reason: 'chart-data replacement remains a candidate when chart-data replacement timing exceeds its phase budget',
  }),
  'chart-history-completion': Object.freeze({
    owner: 'runtime.leftward-history-extension',
    reason: 'chart-history completion remains a candidate when target-history loaded state is delayed',
  }),
  'chart-surface-readout-observation': Object.freeze({
    owner: 'shell.pane-status-readout',
    reason: 'current evidence places the delay after target-history data load and before the diagnostics readout becomes browser-visible',
  }),
  'chart-viewport-reapply-scheduling': Object.freeze({
    owner: 'runtime.chart-viewport',
    reason: 'viewport reapply remains a candidate when viewport reapply timing exceeds its phase budget',
  }),
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function phaseCost(planInput = {}, phase) {
  return finiteNumber(planInput.phaseCosts?.[phase]);
}

function phaseBudget(planInput = {}, phase) {
  return finiteNumber(planInput.phaseBudgets?.[phase]);
}

function exceedsBudget(planInput, phase) {
  const cost = phaseCost(planInput, phase);
  const budget = phaseBudget(planInput, phase);
  return cost !== null && budget !== null && cost > budget;
}

function selectOwnerBoundary(planInput = {}) {
  if (exceedsBudget(planInput, 'chart-data-replacement')) {
    return 'chart-data-replacement-notification';
  }
  if (exceedsBudget(planInput, 'viewport-reapply')) {
    return 'chart-viewport-reapply-scheduling';
  }
  if (planInput.selectedSlice === APPLY_LAG_SLICE) {
    return 'chart-surface-readout-observation';
  }
  return 'chart-history-completion';
}

export function createHighTimeframeTargetHistoryApplyLagOptimizationPlan(planInput = {}) {
  const ownerBoundary = selectOwnerBoundary(planInput);
  const boundary = OWNER_BOUNDARIES[ownerBoundary];
  const applyLagCost = phaseCost(planInput, 'browser-visible-apply-lag');
  const applyLagBudget = phaseBudget(planInput, 'browser-visible-apply-lag');
  const needsApplyLagWork = applyLagCost !== null && applyLagBudget !== null && applyLagCost > applyLagBudget;

  return {
    candidateRuntimeChange: 'defer-runtime-change-until-browser-boundary-assertion',
    focusedBrowserAssertion: 'split target-history apply lag into chart-data-applied, viewport-projected, left-extension-loaded, and diagnostics-readout-visible milestones without an absolute timing gate',
    needsApplyLagWork,
    nextSlice: 'target-history-browser-visible-apply-lag-boundary-browser-assertion',
    owner: boundary.owner,
    ownerBoundary,
    reason: boundary.reason,
    selectedSlice: planInput.selectedSlice || null,
    status: planInput.selectedSlice === APPLY_LAG_SLICE ? 'plan-selected' : 'plan-audit',
  };
}
