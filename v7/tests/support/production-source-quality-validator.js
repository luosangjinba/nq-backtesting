import { validateSourceQuality } from './source-quality-validator.js';

function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function violation(code, subject, detail) {
  return Object.freeze({ code, detail, subject });
}

/**
 * Owner: Test Governance.
 * Purpose: enforce source budgets and documentation against a production AST snapshot.
 * Inputs: production-derived source snapshot and committed source-quality policy.
 * Outputs: stable violations; an empty array is the only passing result.
 * Side effects: none.
 * Lifecycle: pure per-snapshot validation.
 * Errors: malformed policy is reported as stable blocking violations.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function validateProductionSourceQualitySnapshot(snapshot, policy) {
  const violations = validateSourceQuality(snapshot).map((finding) => violation(
    finding.code,
    [finding.file, finding.function, finding.export, finding.field].filter(Boolean).join(':'),
    'production source violates the binding source-quality contract',
  ));
  const evidence = new Map();
  for (const file of snapshot.files) {
    for (const invariant of file.criticalInvariants) {
      if (!evidence.has(invariant.id)) evidence.set(invariant.id, []);
      evidence.get(invariant.id).push(file.path);
    }
  }
  for (const invariantId of policy.requiredCriticalInvariants) {
    if (!evidence.has(invariantId)) {
      violations.push(violation(
        'missing-production-critical-invariant',
        invariantId,
        'no production source explains why this critical invariant exists',
      ));
    }
  }
  return Object.freeze(sorted(violations));
}
