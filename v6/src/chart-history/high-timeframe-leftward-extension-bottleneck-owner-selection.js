const DEFAULT_PHASE_BUDGETS = Object.freeze({
  browserPaintLagMs: 16,
  chartDataReplacementMs: 50,
  sourceRequestMs: 20,
  targetRequestMs: 20,
  viewportReapplyMs: 20,
  visibleApplyLagMs: 16,
});

const PHASE_OWNER_CANDIDATES = Object.freeze({
  browserPaintLagMs: Object.freeze({
    nextSlice: 'target-history-real-chart-paint-visibility-measurement',
    ownerBoundary: 'chart-surface-browser-paint-measurement',
    reason: 'browser-paint-observation-window-dominates-with-low-runtime-costs',
    status: 'narrower-measurement-selected',
  }),
  chartDataReplacementMs: Object.freeze({
    nextSlice: 'target-history-chart-data-replacement-optimization',
    ownerBoundary: 'runtime.chart-data',
    reason: 'chart-data-replacement-dominates-after-target-load',
    status: 'owner-selected',
  }),
  sourceRequestMs: Object.freeze({
    nextSlice: 'target-history-source-window-request-audit',
    ownerBoundary: 'runtime.bar-data-source-window',
    reason: 'source-request-cost-present-on-target-history-path',
    status: 'owner-selected',
  }),
  targetRequestMs: Object.freeze({
    nextSlice: 'target-history-target-load-request-optimization',
    ownerBoundary: 'runtime.bar-data-target-window',
    reason: 'target-request-cost-dominates',
    status: 'owner-selected',
  }),
  viewportReapplyMs: Object.freeze({
    nextSlice: 'target-history-viewport-reapply-optimization',
    ownerBoundary: 'runtime.chart-viewport',
    reason: 'viewport-reapply-dominates-after-chart-data-apply',
    status: 'owner-selected',
  }),
  visibleApplyLagMs: Object.freeze({
    nextSlice: 'target-history-visible-apply-lag-measurement',
    ownerBoundary: 'target-history-diagnostics-readout-or-browser-visibility',
    reason: 'visible-apply-lag-dominates-after-left-extension-loaded',
    status: 'narrower-measurement-selected',
  }),
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function phaseValue(record = {}, phase) {
  return finiteNumber(record.phaseBreakdown?.[phase] ?? record[phase]);
}

function percentile(values = [], percentileRank = 0.95) {
  const numbers = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!numbers.length) return null;
  const index = Math.min(
    numbers.length - 1,
    Math.max(0, Math.ceil(numbers.length * percentileRank) - 1),
  );
  return numbers[index];
}

function normalizePhaseBudgets(phaseBudgets = {}) {
  return {
    ...DEFAULT_PHASE_BUDGETS,
    ...phaseBudgets,
  };
}

function summarizePhase(records = [], phase) {
  const values = records
    .map((record) => phaseValue(record, phase))
    .filter((value) => value !== null);
  return {
    maxMs: values.length ? Math.max(...values) : null,
    p95Ms: percentile(values),
    sampleCount: values.length,
  };
}

function summarizeRecords(records = [], phaseBudgets = DEFAULT_PHASE_BUDGETS) {
  const normalized = records.filter(Boolean);
  const targetRecords = normalized.filter((record) => (
    (record.path ?? 'target-history') === 'target-history'
    && record.browserVisible !== false
  ));
  const phases = Object.keys(phaseBudgets);
  const phaseSummary = Object.fromEntries(
    phases.map((phase) => [phase, summarizePhase(targetRecords, phase)]),
  );
  const exceededPhases = phases
    .map((phase) => {
      const value = phaseSummary[phase].p95Ms;
      const budget = finiteNumber(phaseBudgets[phase]);
      if (value === null || budget === null || value <= budget) return null;
      return {
        budgetMs: budget,
        phase,
        ratio: value / budget,
        valueMs: value,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.ratio - left.ratio);

  return {
    exceededPhases,
    phaseSummary,
    recordCount: normalized.length,
    targetCount: targetRecords.length,
  };
}

function rejectedOwnerCandidates({ phaseBudgets, selectedPhase, summary }) {
  return Object.keys(PHASE_OWNER_CANDIDATES)
    .filter((phase) => phase !== selectedPhase)
    .map((phase) => {
      const candidate = PHASE_OWNER_CANDIDATES[phase];
      const p95Ms = summary.phaseSummary[phase]?.p95Ms ?? null;
      const budgetMs = finiteNumber(phaseBudgets[phase]);
      const reason = p95Ms === null
        ? 'measurement-missing'
        : budgetMs !== null && p95Ms <= budgetMs
          ? 'within-budget'
          : 'not-largest-exceeded-phase';
      return {
        budgetMs,
        nextSlice: candidate.nextSlice,
        ownerBoundary: candidate.ownerBoundary,
        phase,
        p95Ms,
        reason,
      };
    });
}

export function selectHighTimeframeLeftwardExtensionBottleneckOwner({
  minTargetSamples = 4,
  phaseBudgets = {},
  records = [],
} = {}) {
  const resolvedBudgets = normalizePhaseBudgets(phaseBudgets);
  const summary = summarizeRecords(records, resolvedBudgets);

  if (summary.targetCount < minTargetSamples) {
    return {
      nextSlice: 'target-history-leftward-extension-phase-measurement',
      ownerBoundary: 'target-history-measurement-boundary',
      phaseBudgets: resolvedBudgets,
      reason: 'step367-phase-summary-incomplete',
      rejectedOwnerCandidates: rejectedOwnerCandidates({
        phaseBudgets: resolvedBudgets,
        selectedPhase: null,
        summary,
      }),
      selectedPhase: null,
      status: 'measurement-incomplete',
      summary,
    };
  }

  const selectedFinding = summary.exceededPhases[0] || null;
  if (!selectedFinding) {
    return {
      nextSlice: 'replay-coordination-materialization-transition',
      ownerBoundary: 'target-history-responsive',
      phaseBudgets: resolvedBudgets,
      reason: 'all-measured-phases-within-budget',
      rejectedOwnerCandidates: rejectedOwnerCandidates({
        phaseBudgets: resolvedBudgets,
        selectedPhase: null,
        summary,
      }),
      selectedPhase: null,
      status: 'materialization-ready',
      summary,
    };
  }

  const selected = PHASE_OWNER_CANDIDATES[selectedFinding.phase];
  return {
    ...selected,
    phaseBudgets: resolvedBudgets,
    rejectedOwnerCandidates: rejectedOwnerCandidates({
      phaseBudgets: resolvedBudgets,
      selectedPhase: selectedFinding.phase,
      summary,
    }),
    selectedFinding,
    selectedPhase: selectedFinding.phase,
    summary,
  };
}
