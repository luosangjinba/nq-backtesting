function violation(code, message) {
  return Object.freeze({ code, message });
}

function isRelativeEvidencePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/');
}

/**
 * Owner: Test Governance.
 * Inputs/outputs: validates the machine-readable harness catalog and returns
 * immutable recovery-lifecycle violations without mutating the catalog.
 * Side effects/lifecycle: none; pathExists is an injected read-only probe.
 * Errors: malformed recovery metadata is reported as stable violation codes.
 * Protected invariant: historical acceptance cannot masquerade as current
 * conformance after production evidence has placed a rule in regression.
 */
export function validateHarnessRuleCatalogRecovery(catalog, { pathExists = () => true } = {}) {
  const violations = [];
  const recovery = catalog?.recoveryMode;
  const catalogRules = Array.isArray(catalog?.rules) ? catalog.rules : [];
  const regressedRules = catalogRules.filter((rule) => rule.state === 'regressed');
  const regressedIds = regressedRules.map((rule) => rule.id).sort();
  const inventoryIds = Array.isArray(recovery?.regressedRuleIds)
    ? [...recovery.regressedRuleIds].sort()
    : [];

  if (regressedRules.length > 0 && recovery?.active !== true) {
    violations.push(violation(
      'regressed-rule-outside-recovery',
      'regressed rules require active recovery mode',
    ));
  }

  if (recovery?.active === true) {
    if (!isRelativeEvidencePath(recovery.plan) || !pathExists(recovery.plan)) {
      violations.push(violation('missing-recovery-plan', 'active recovery requires a binding plan'));
    }
    if (!/^[0-9a-f]{7,40}$/.test(recovery.checkpointCommit ?? '')) {
      violations.push(violation(
        'invalid-recovery-checkpoint',
        'active recovery requires an immutable git checkpoint',
      ));
    }
    if (recovery.allowedWork !== 'architecture-conformance-recovery-only') {
      violations.push(violation(
        'unbounded-recovery-work',
        'active recovery must freeze work outside architecture conformance',
      ));
    }
    if (recovery.freezeFeatureDelivery !== true) {
      violations.push(violation(
        'feature-delivery-not-frozen',
        'active recovery must freeze feature delivery',
      ));
    }
    if (!catalog.stepOrder?.includes(recovery.requiredClosureStep)) {
      violations.push(violation(
        'invalid-required-recovery-closure-step',
        'active recovery requires a known future closure step',
      ));
    }
    if (recovery.closureStep !== null || recovery.closureEvidence !== null) {
      violations.push(violation(
        'premature-recovery-closure-evidence',
        'active recovery cannot carry completion evidence',
      ));
    }
  }

  if (recovery?.active === false) {
    if (recovery.allowedWork !== 'normal-delivery') {
      violations.push(violation(
        'closed-recovery-work-scope-invalid',
        'closed recovery must restore normal delivery scope',
      ));
    }
    if (recovery.freezeFeatureDelivery !== false) {
      violations.push(violation(
        'feature-delivery-still-frozen',
        'closed recovery must release the feature-delivery freeze',
      ));
    }
    if (!catalog.stepOrder?.includes(recovery.requiredClosureStep)
      || recovery.closureStep !== recovery.requiredClosureStep) {
      violations.push(violation(
        'invalid-recovery-closure-step',
        'recovery may close only through its declared closure step',
      ));
    }
    if (!isRelativeEvidencePath(recovery.closureEvidence)
      || !pathExists(recovery.closureEvidence)) {
      violations.push(violation(
        'missing-recovery-closure-evidence',
        'closed recovery requires durable recovery evidence',
      ));
    }
  }

  if (JSON.stringify(regressedIds) !== JSON.stringify(inventoryIds)) {
    violations.push(violation(
      'regressed-rule-inventory-mismatch',
      'recovery inventory must exactly equal rules in regressed state',
    ));
  }

  for (const rule of regressedRules) {
    if (!isRelativeEvidencePath(rule.acceptanceEvidence) || !pathExists(rule.acceptanceEvidence)) {
      violations.push(violation(
        'missing-prior-acceptance-evidence',
        `${rule.id} must retain its historical acceptance evidence`,
      ));
    }
    if (!isRelativeEvidencePath(rule.regressionEvidence) || !pathExists(rule.regressionEvidence)) {
      violations.push(violation(
        'missing-regression-evidence',
        `${rule.id} requires current production regression evidence`,
      ));
    }
    if (typeof rule.recoveryStep !== 'string' || !catalog.stepOrder?.includes(rule.recoveryStep)) {
      violations.push(violation(
        'invalid-recovery-step',
        `${rule.id} requires a known recovery step`,
      ));
    }
  }

  return Object.freeze(violations);
}
