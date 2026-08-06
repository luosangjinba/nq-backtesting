function violation(code, detail = null) {
  return Object.freeze({ code, detail });
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function includesMatch(scenario, match) {
  return Object.entries(match).every(([axis, required]) => (
    values(scenario.covers?.[axis]).includes(required)
  ));
}

/**
 * Owner: Test Governance.
 * Inputs/outputs: validates the executable production-regression matrix and
 * returns immutable, stable violations.
 * Side effects/lifecycle: none; pathExists is an injected read-only probe.
 * Errors: malformed matrix entries are returned as violations, never ignored.
 * Protected invariant: a filename inventory cannot masquerade as executed
 * cross-product or post-visible rollback evidence.
 */
export function validateProductionRegressionMatrix(model, { pathExists = () => true } = {}) {
  const violations = [];
  const axes = model?.axes ?? {};
  const scenarios = values(model?.scenarios);
  const policy = model?.executionPolicy ?? {};
  const requiredAxes = values(policy.requiredAxes);
  const allowedKinds = new Set(values(policy.allowedExecutionKinds));
  const v4Dependency = model?.runtimeDependencies?.v4ReadApi;

  if (model?.schemaVersion !== 1
    || !['executable', 'known-failures', 'accepted'].includes(model?.status)) {
    violations.push(violation('PRODUCTION_MATRIX_HEADER_INVALID'));
  }
  if (typeof v4Dependency?.baseUrl !== 'string'
    || v4Dependency.baseUrl !== 'http://127.0.0.1:8766'
    || typeof v4Dependency?.healthPath !== 'string'
    || v4Dependency.requiredRevisionField !== 'datasetRevision'
    || typeof v4Dependency?.startEntry !== 'string'
    || !pathExists(`../${v4Dependency.startEntry}`)
    || v4Dependency.databaseEnvironmentVariable !== 'V4_TRADING_DB') {
    violations.push(violation('PRODUCTION_MATRIX_RUNTIME_DEPENDENCY_INVALID'));
  }
  if (model?.status === 'accepted'
    && (typeof model.humanAcceptanceEvidence !== 'string'
      || !pathExists(model.humanAcceptanceEvidence))) {
    violations.push(violation('PRODUCTION_MATRIX_HUMAN_ACCEPTANCE_MISSING'));
  }
  const knownFailures = values(model?.knownFailures);
  if (model?.status === 'known-failures' && knownFailures.length === 0) {
    violations.push(violation('PRODUCTION_MATRIX_KNOWN_FAILURES_MISSING'));
  }
  if (model?.status === 'accepted' && knownFailures.length > 0) {
    violations.push(violation('PRODUCTION_MATRIX_ACCEPTED_WITH_KNOWN_FAILURES'));
  }
  if (requiredAxes.length === 0
    || Object.keys(axes).sort().join('\u0000') !== [...requiredAxes].sort().join('\u0000')) {
    violations.push(violation('PRODUCTION_MATRIX_AXIS_SET_INVALID'));
  }

  for (const axis of requiredAxes) {
    const dimensions = values(axes[axis]);
    if (dimensions.length === 0 || new Set(dimensions).size !== dimensions.length) {
      violations.push(violation('PRODUCTION_MATRIX_AXIS_VALUES_INVALID', axis));
    }
  }

  const ids = new Set();
  for (const scenario of scenarios) {
    if (typeof scenario?.id !== 'string' || ids.has(scenario.id)) {
      violations.push(violation('PRODUCTION_MATRIX_SCENARIO_ID_INVALID', scenario?.id ?? null));
    } else {
      ids.add(scenario.id);
    }
    if (!allowedKinds.has(scenario?.executionKind)) {
      violations.push(violation('PRODUCTION_MATRIX_EXECUTION_KIND_INVALID', scenario?.id ?? null));
    }
    if (typeof scenario?.harness !== 'string' || !pathExists(scenario.harness)) {
      violations.push(violation('PRODUCTION_MATRIX_HARNESS_MISSING', scenario?.id ?? null));
    }
    if (!Array.isArray(scenario?.assertions) || scenario.assertions.length === 0) {
      violations.push(violation('PRODUCTION_MATRIX_ASSERTIONS_MISSING', scenario?.id ?? null));
    }
    for (const [axis, covered] of Object.entries(scenario?.covers ?? {})) {
      if (!requiredAxes.includes(axis)
        || values(covered).length === 0
        || values(covered).some((value) => !values(axes[axis]).includes(value))) {
        violations.push(violation('PRODUCTION_MATRIX_SCENARIO_COVERAGE_INVALID', `${scenario?.id}:${axis}`));
      }
    }
  }

  const knownScenarioIds = new Set();
  for (const known of knownFailures) {
    if (typeof known?.scenarioId !== 'string' || !ids.has(known.scenarioId)
      || knownScenarioIds.has(known.scenarioId)) {
      violations.push(violation('PRODUCTION_MATRIX_KNOWN_FAILURE_SCENARIO_INVALID', known?.scenarioId ?? null));
    } else {
      knownScenarioIds.add(known.scenarioId);
    }
    if (typeof known?.bugId !== 'string' || known.bugId.length === 0
      || typeof known?.outputPattern !== 'string' || known.outputPattern.length === 0
      || typeof known?.evidence !== 'string' || !pathExists(known.evidence)) {
      violations.push(violation('PRODUCTION_MATRIX_KNOWN_FAILURE_EVIDENCE_INVALID', known?.scenarioId ?? null));
    } else {
      try {
        new RegExp(known.outputPattern);
      } catch {
        violations.push(violation('PRODUCTION_MATRIX_KNOWN_FAILURE_PATTERN_INVALID', known.scenarioId));
      }
    }
  }

  for (const axis of requiredAxes) {
    const covered = new Set(scenarios.flatMap((scenario) => values(scenario.covers?.[axis])));
    for (const dimension of values(axes[axis])) {
      if (!covered.has(dimension)) {
        violations.push(violation('PRODUCTION_MATRIX_AXIS_VALUE_MISSING', `${axis}:${dimension}`));
      }
    }
  }

  for (const required of values(policy.requiredCompoundScenarios)) {
    const matching = scenarios.find((scenario) => includesMatch(scenario, required.match ?? {}));
    if (!matching) {
      violations.push(violation('PRODUCTION_MATRIX_COMPOUND_SCENARIO_MISSING', required.id ?? null));
    }
  }

  const browserFailure = scenarios.find((scenario) => (
    scenario.executionKind === 'browser-production'
    && scenario.failureInjection?.bugId === 'BUG-V7-0001'
    && scenario.failureInjection.dynamic === true
    && scenario.failureInjection.phase === 'post-visible-pre-finalize'
    && values(scenario.covers?.workOrdering).includes('participant-failure')
    && values(scenario.covers?.persistence).includes('write-failure')
    && scenario.assertions?.includes('last-accepted-complete-revision-visible-and-persisted')
  ));
  if (!browserFailure) {
    violations.push(violation('PRODUCTION_MATRIX_POST_VISIBLE_FAILURE_MISSING'));
  }

  const participantFailure = scenarios.find((scenario) => (
    scenario.executionKind === 'production-owner'
    && scenario.failureInjection?.bugId === 'BUG-V7-0001'
    && scenario.failureInjection.dynamic === true
    && ['chart', 'replay', 'workspace-state', 'publication', 'persistence']
      .every((participant) => values(scenario.failureInjection.participants).includes(participant))
  ));
  if (!participantFailure) {
    violations.push(violation('PRODUCTION_MATRIX_PARTICIPANT_FAILURE_MISSING'));
  }

  return Object.freeze(violations);
}
