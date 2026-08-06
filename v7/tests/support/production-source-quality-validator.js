import { validateSourceQuality } from './source-quality-validator.js';

function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function violation(code, subject, detail) {
  return Object.freeze({ code, detail, subject });
}

function evidencePathIsValid(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !value.split('/').includes('..');
}

function integerFromSummary(value) {
  return Number.parseInt(value.replaceAll(',', ''), 10);
}

function sourceSummaryTuples(text) {
  const tuples = [];
  const pattern = /(\d[\d,]*)\s+files,\s+(\d[\d,]*)\s+effective(?:\s+code)?\s+lines,\s+(\d[\d,]*)\s+functions,\s+(?:and\s+)?(\d[\d,]*)\s+public\s+exports/giu;
  for (const match of text.matchAll(pattern)) {
    tuples.push(Object.freeze({
      effectiveLines: integerFromSummary(match[2]),
      files: integerFromSummary(match[1]),
      functions: integerFromSummary(match[3]),
      publicExports: integerFromSummary(match[4]),
    }));
  }
  return tuples;
}

function sourceDerivedResponsibilityPolicyIsValid(policy) {
  const declared = policy?.sourceDerivedResponsibilities;
  const expected = {
    'browser-persistence': 'external-state-io',
    'remote-io': 'external-state-io',
    'visual-surface-mutation': 'visual-surface-mutation',
  };
  const concernEntries = Object.entries(declared?.concernResponsibilities ?? {});
  return declared?.model === 'ast-side-effect-authority-v1'
    && declared?.internalResponsibility === 'internal-state-or-pure-computation'
    && concernEntries.length === Object.keys(expected).length
    && concernEntries.every(([concern, responsibility]) => expected[concern] === responsibility);
}

/**
 * Owner: Test Governance.
 * Purpose: keep current human-readable source summaries equal to the exact machine baseline.
 * Inputs: committed source baseline, policy evidence paths, and an injected text reader.
 * Outputs: stable evidence drift/missing violations; an empty array is the only passing result.
 * Side effects: invokes only the injected reader.
 * Lifecycle: pure per-audit validation.
 * Errors: malformed entries and unavailable evidence fail closed as stable violations.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function validateProductionSourceSummaryEvidence(
  baseline,
  policy,
  { listPaths = () => null, readText = () => null } = {},
) {
  const violations = [];
  const summary = baseline?.summary;
  const entries = policy?.summaryEvidence;
  if (!summary || !Array.isArray(entries) || entries.length === 0) {
    return Object.freeze([violation(
      'production-source-summary-policy-invalid',
      'summaryEvidence',
      'current human-readable source summary evidence must be declared',
    )]);
  }
  const seenPaths = new Set();
  for (const entry of entries) {
    const evidencePath = entry?.path;
    if (!evidencePathIsValid(evidencePath)
      || !Number.isInteger(entry?.expectedOccurrences)
      || entry.expectedOccurrences < 1
      || seenPaths.has(evidencePath)) {
      violations.push(violation(
        'production-source-summary-policy-invalid',
        evidencePath ?? 'summaryEvidence',
        'summary evidence paths must be unique relative paths with a positive occurrence count',
      ));
      continue;
    }
    seenPaths.add(evidencePath);
    let text;
    try {
      text = readText(evidencePath);
    } catch {
      text = null;
    }
    if (typeof text !== 'string') {
      violations.push(violation(
        'production-source-summary-evidence-missing',
        evidencePath,
        'declared human-readable source summary evidence is unavailable',
      ));
      continue;
    }
    const candidates = sourceSummaryTuples(text).filter((tuple) => (
      tuple.files === summary.files
      || tuple.functions === summary.functions
      || tuple.publicExports === summary.publicExports
    ));
    for (const tuple of candidates) {
      if (Object.keys(summary).some((field) => tuple[field] !== summary[field])) {
        violations.push(violation(
          'production-source-summary-drift',
          evidencePath,
          `human-readable source summary ${JSON.stringify(tuple)} does not match ${JSON.stringify(summary)}`,
        ));
      }
    }
    if (candidates.length !== entry.expectedOccurrences) {
      violations.push(violation(
        'production-source-summary-count-mismatch',
        evidencePath,
        `expected ${entry.expectedOccurrences} current source summaries; found ${candidates.length}`,
      ));
    }
  }
  let discoveredPaths;
  try {
    discoveredPaths = listPaths();
  } catch {
    discoveredPaths = null;
  }
  if (!Array.isArray(discoveredPaths)
    || discoveredPaths.some((evidencePath) => !evidencePathIsValid(evidencePath))
    || new Set(discoveredPaths).size !== discoveredPaths.length) {
    violations.push(violation(
      'production-source-summary-discovery-invalid',
      'human-readable-evidence-roots',
      'summary evidence discovery must return unique relative paths',
    ));
  } else {
    for (const evidencePath of discoveredPaths) {
      let text;
      try {
        text = readText(evidencePath);
      } catch {
        text = null;
      }
      if (typeof text !== 'string') continue;
      const candidates = sourceSummaryTuples(text).filter((tuple) => (
        tuple.files === summary.files
        || tuple.functions === summary.functions
        || tuple.publicExports === summary.publicExports
      ));
      if (candidates.length > 0 && !seenPaths.has(evidencePath)) {
        violations.push(violation(
          'production-source-summary-policy-omission',
          evidencePath,
          'a current human-readable source summary is not declared in policy',
        ));
      }
    }
  }
  return Object.freeze(sorted(violations));
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
  if (!sourceDerivedResponsibilityPolicyIsValid(policy)) {
    violations.push(violation(
      'production-source-responsibility-policy-invalid',
      'sourceDerivedResponsibilities',
      'the AST-derived side-effect authority model must be bound explicitly',
    ));
  }
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
