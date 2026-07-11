const SELECTED_PATH_DETAILS = Object.freeze({
  'high-timeframe-target-history-responsiveness-harness': Object.freeze({
    implementationSlice: 'high-timeframe-target-history-responsiveness-measurement-completion',
    path: 'measurement-completion',
    reason: 'real-budget selector has incomplete browser-visible samples',
  }),
  'replay-coordination-materialization-transition': Object.freeze({
    implementationSlice: 'replay-coordination-materialization-transition-plan',
    path: 'materialization-transition',
    reason: 'real-budget selector reports target-history responsiveness within default budgets',
  }),
  'target-history-browser-visible-apply-lag-optimization': Object.freeze({
    implementationSlice: 'target-history-browser-visible-apply-lag-optimization-plan',
    path: 'phase-optimization',
    reason: 'real-budget selector reports browser-visible apply lag over default budget',
  }),
  'target-history-chart-data-replacement-optimization': Object.freeze({
    implementationSlice: 'target-history-chart-data-replacement-optimization-plan',
    path: 'phase-optimization',
    reason: 'real-budget selector reports chart-data replacement over default budget',
  }),
  'target-history-fetch-optimization': Object.freeze({
    implementationSlice: 'target-history-fetch-optimization-plan',
    path: 'phase-optimization',
    reason: 'real-budget selector reports target-history fetch over default budget',
  }),
  'target-history-viewport-reapply-optimization': Object.freeze({
    implementationSlice: 'target-history-viewport-reapply-optimization-plan',
    path: 'phase-optimization',
    reason: 'real-budget selector reports viewport reapply over default budget',
  }),
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function selectedFindingForPhase(selection = {}) {
  const selectedPhase = selection.selectedPhase || null;
  return (selection.phaseFindings || []).find((finding) => finding.phase === selectedPhase) || null;
}

function dominantFinding(selection = {}) {
  return selectedFindingForPhase(selection) || selection.phaseFindings?.[0] || null;
}

export function selectHighTimeframeTargetHistorySelectedPathSlice(selection = {}) {
  const selectedSlice = selection.selectedSlice || null;
  const detail = SELECTED_PATH_DETAILS[selectedSlice];
  if (!detail) {
    return {
      implementationSlice: 'high-timeframe-target-history-selected-path-measurement-audit',
      path: 'measurement-completion',
      reason: 'real-budget selector did not return a recognized selected slice',
      selectedFinding: null,
      selectedPhase: selection.selectedPhase || null,
      selectedSlice,
      status: 'measurement-needed',
    };
  }

  const finding = dominantFinding(selection);
  const ratio = finiteNumber(finding?.ratio);
  return {
    implementationSlice: detail.implementationSlice,
    path: detail.path,
    reason: detail.reason,
    selectedFinding: finding,
    selectedPhase: selection.selectedPhase || null,
    selectedSlice,
    severity: ratio !== null && ratio >= 2 ? 'high' : 'normal',
    status: 'selected',
  };
}
