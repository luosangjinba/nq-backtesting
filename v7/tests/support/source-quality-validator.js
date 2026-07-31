export const SOURCE_BUDGETS = Object.freeze({
  composition: { reviewAt: 150, maxLines: 250, maxFunctionLines: 60 },
  domain: { reviewAt: 250, maxLines: 400, maxFunctionLines: 80 },
  contract: { reviewAt: 250, maxLines: 400, maxFunctionLines: 80 },
  runtime: { reviewAt: 250, maxLines: 400, maxFunctionLines: 80 },
  adapter: { reviewAt: 300, maxLines: 450, maxFunctionLines: 80 },
  persistence: { reviewAt: 300, maxLines: 450, maxFunctionLines: 80 },
  ui: { reviewAt: 300, maxLines: 450, maxFunctionLines: 80 },
});

const CONTRACT_DOC_FIELDS = [
  'owner',
  'purpose',
  'inputs',
  'outputs',
  'sideEffects',
  'lifecycle',
  'errors',
  'concurrencyCancellation',
];
const CRITICAL_INVARIANTS = [
  'session-identity',
  'stale-rejection',
  'atomic-commit',
  'no-future',
  'projection-alignment',
  'viewport-wall',
];

function hasApprovedException(file) {
  const exception = file.sizeException;
  return Boolean(
    exception?.owner &&
      exception?.decisionId &&
      exception?.reason &&
      exception?.splitIsWorseBecause &&
      exception?.humanApproval &&
      exception?.reviewCondition &&
      exception?.expiresAtStep,
  );
}

export function validateSourceQuality(model) {
  const violations = [];

  for (const file of model.files ?? []) {
    const budget = SOURCE_BUDGETS[file.kind];
    if (!budget) {
      violations.push({ code: 'unknown-source-kind', file: file.path });
      continue;
    }

    if ((file.responsibilities ?? []).length !== 1) {
      violations.push({ code: 'mixed-or-missing-file-responsibility', file: file.path });
    }
    if (file.effectiveLines > budget.maxLines && !hasApprovedException(file)) {
      violations.push({ code: 'source-size-budget-exceeded', file: file.path });
    }
    for (const fn of file.functions ?? []) {
      if (fn.effectiveLines > budget.maxFunctionLines && !fn.reviewedDecompositionException) {
        violations.push({ code: 'function-size-budget-exceeded', file: file.path, function: fn.name });
      }
    }
    if (
      file.effectiveLines < 20 &&
      file.forwardingOnly === true &&
      file.ownsContract !== true &&
      file.adaptsBoundary !== true
    ) {
      violations.push({ code: 'artificial-source-fragment', file: file.path });
    }

    for (const exported of file.publicExports ?? []) {
      for (const field of CONTRACT_DOC_FIELDS) {
        if (!(exported.documentation?.[field]?.trim?.())) {
          violations.push({ code: 'undocumented-public-contract', file: file.path, export: exported.name, field });
        }
      }
    }

    for (const invariant of file.criticalInvariants ?? []) {
      if (!CRITICAL_INVARIANTS.includes(invariant.id) || !invariant.why?.trim?.()) {
        violations.push({ code: 'missing-critical-invariant-rationale', file: file.path, invariant: invariant.id });
      }
    }
    if (file.requiresCriticalInvariant === true && (file.criticalInvariants ?? []).length === 0) {
      violations.push({ code: 'missing-critical-invariant-rationale', file: file.path });
    }

    for (const debt of file.debtComments ?? []) {
      if (!debt.decisionId || !debt.owner || !debt.removalCondition) {
        violations.push({ code: 'untracked-debt-comment', file: file.path });
      }
    }
  }

  return violations;
}
