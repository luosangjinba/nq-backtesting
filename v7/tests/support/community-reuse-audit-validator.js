const DECISIONS = new Set([
  'benchmark-only',
  'blocked',
  'calculation-adapter-candidate',
  'pattern-source',
  'reference-only',
]);

const LICENSE_STATES = new Set(['inconsistent', 'verified']);
const REQUIRED_GATES = Object.freeze([
  'fixed-upstream-revision',
  'license-clarity',
  'lightweight-charts-5.2-compatibility',
  'chart-owner-isolation',
  'interaction-owner-isolation',
  'annotation-state-isolation',
  'replay-no-future-preservation',
  'deterministic-teardown',
]);

function violation(code, message) {
  return Object.freeze({ code, message });
}

function dependencyNames(packageManifest) {
  return new Set([
    ...Object.keys(packageManifest?.dependencies ?? {}),
    ...Object.keys(packageManifest?.devDependencies ?? {}),
  ]);
}

/**
 * Owner: Test Governance.
 * Inputs/outputs: validates the frozen community-reuse audit and returns
 * immutable violations.
 * Side effects/lifecycle: none.
 * Errors: malformed or ownership-breaking decisions become stable codes.
 * Protected invariant: a community renderer or indicator cannot silently
 * become a second Chart, interaction, Annotation-state, Replay, or persistence
 * owner merely because its package is installable.
 */
export function validateCommunityReuseAudit(audit, { packageManifest = {} } = {}) {
  const violations = [];
  const candidates = Array.isArray(audit?.candidates) ? audit.candidates : [];
  const candidateIds = new Set();

  if (audit?.schemaVersion !== 1) {
    violations.push(violation('invalid-schema-version', 'audit schemaVersion must be 1'));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(audit?.auditedAt ?? '')) {
    violations.push(violation('invalid-audit-date', 'auditedAt must be an ISO date'));
  }
  if (audit?.target?.package !== 'lightweight-charts'
      || audit?.target?.version !== '5.2.0') {
    violations.push(violation(
      'wrong-lightweight-target',
      'the audit must target V7 pinned lightweight-charts 5.2.0',
    ));
  }

  const gates = Array.isArray(audit?.requiredGates) ? audit.requiredGates : [];
  for (const gate of REQUIRED_GATES) {
    if (!gates.includes(gate)) {
      violations.push(violation('missing-required-gate', `missing required gate ${gate}`));
    }
  }

  if (candidates.length < 6) {
    violations.push(violation('insufficient-candidate-coverage', 'at least six candidate classes are required'));
  }
  for (const candidate of candidates) {
    if (typeof candidate?.id !== 'string' || candidate.id.length === 0) {
      violations.push(violation('missing-candidate-id', 'every candidate requires an id'));
      continue;
    }
    if (candidateIds.has(candidate.id)) {
      violations.push(violation('duplicate-candidate-id', `duplicate candidate ${candidate.id}`));
    }
    candidateIds.add(candidate.id);
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(candidate.repository ?? '')) {
      violations.push(violation('invalid-candidate-repository', `${candidate.id} requires a GitHub repository`));
    }
    if (!/^[0-9a-f]{40}$/.test(candidate.commit ?? '')) {
      violations.push(violation('unpinned-candidate', `${candidate.id} requires an exact commit`));
    }
    if (!DECISIONS.has(candidate.decision)) {
      violations.push(violation('invalid-candidate-decision', `${candidate.id} has an unknown decision`));
    }
    if (!LICENSE_STATES.has(candidate?.license?.status)) {
      violations.push(violation('invalid-license-state', `${candidate.id} has no explicit license disposition`));
    }
    if (!Array.isArray(candidate?.boundary?.directOwnership)) {
      violations.push(violation('missing-boundary-evidence', `${candidate.id} has no direct-ownership evidence`));
    }
    if (typeof candidate?.compatibility?.probe !== 'string') {
      violations.push(violation('missing-compatibility-probe', `${candidate.id} has no compatibility probe`));
    }
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (byId.get('official-lightweight-charts-plugins')?.decision !== 'pattern-source') {
    violations.push(violation('official-pattern-decision-missing', 'official plugin examples must remain pattern sources'));
  }
  if (byId.get('lightweight-charts-drawing')?.license?.status !== 'inconsistent'
      || byId.get('lightweight-charts-drawing')?.decision !== 'blocked') {
    violations.push(violation(
      'drawing-package-not-blocked',
      'the drawing package remains blocked until repository license evidence is consistent',
    ));
  }
  if (byId.get('lightweight-charts-indicators')?.decision !== 'calculation-adapter-candidate') {
    violations.push(violation(
      'indicator-adapter-decision-missing',
      'the indicator catalog may only remain a future calculation-adapter candidate',
    ));
  }
  const smaValues = byId.get('lightweight-charts-indicators')?.compatibility?.knownSmaValues;
  if (JSON.stringify(smaValues) !== JSON.stringify([null, null, 2, 3, 4])) {
    violations.push(violation('indicator-formula-probe-mismatch', 'the frozen SMA(3) probe changed'));
  }
  if (byId.get('line-tools-core')?.compatibility?.npmPublished !== false
      || byId.get('line-tools-core')?.decision !== 'reference-only') {
    violations.push(violation('source-only-core-promoted', 'source-only line-tools core must remain reference-only'));
  }
  if (byId.get('candlekit')?.compatibility?.combinedPeerProbe !== 'conflict'
      || byId.get('candlekit')?.decision !== 'reference-only') {
    violations.push(violation('candlekit-version-coupling-hidden', 'CandleKit peer-version coupling must remain explicit'));
  }
  if (byId.get('klinechart')?.decision !== 'benchmark-only') {
    violations.push(violation('alternate-engine-promoted', 'KLineChart must remain an engine benchmark'));
  }

  const r13 = audit?.r13_6Decision;
  if (r13?.implementationOwner !== 'v7-annotation-boundaries') {
    violations.push(violation('foreign-implementation-owner', 'R13.6 implementation must remain V7-owned'));
  }
  if (!Array.isArray(r13?.productionDependenciesAdded)
      || r13.productionDependenciesAdded.length !== 0) {
    violations.push(violation('third-party-production-dependency', 'the preflight adds no production dependency'));
  }
  if (r13?.indicatorScope !== 'deferred-separate-adapter-decision') {
    violations.push(violation('indicator-scope-leak', 'indicator adoption must remain outside R13.6'));
  }
  if (r13?.communityRuntimePolicy !== 'do-not-adopt') {
    violations.push(violation('community-runtime-promoted', 'R13.6 must not adopt a community owner runtime'));
  }

  const declaredDependencies = dependencyNames(packageManifest);
  for (const candidate of candidates) {
    const packageName = candidate?.package?.name;
    if (packageName && declaredDependencies.has(packageName)) {
      violations.push(violation(
        'candidate-entered-package-manifest',
        `${packageName} entered the V7 package manifest during a no-adoption gate`,
      ));
    }
  }

  return Object.freeze(violations);
}

export const communityReuseRequiredGates = REQUIRED_GATES;
