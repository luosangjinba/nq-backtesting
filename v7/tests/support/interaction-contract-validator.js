const ALLOWED_OWNERS = new Set([
  'session-store',
  'replay-runtime',
  'workspace-transaction-runtime',
  'viewport-runtime',
]);

const REQUIRED_CAPABILITIES = new Set([
  'session-create',
  'session-open',
  'session-leave-reopen',
  'hard-refresh',
  'chart-entry',
  'manual-next',
  'viewport-manual',
  'viewport-reset',
  'timeframe-switch',
  'session-hours-switch',
  'history-left',
  'layout',
  'pane-timeframe',
  'pane-instrument',
  'pane-maximize',
  'auto-replay',
  'replay-navigation',
  'latency-failure-presentation',
]);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateInteractionContract(model) {
  const violations = [];
  const ids = new Set();
  const capabilities = new Set();

  for (const interaction of model.foundationInteractions ?? []) {
    if (!/^UX-FND-\d{3}$/.test(interaction.id ?? '') || ids.has(interaction.id)) {
      violations.push({ code: 'invalid-or-duplicate-interaction-id', id: interaction.id });
    }
    ids.add(interaction.id);
    capabilities.add(interaction.capability);
    if (!ALLOWED_OWNERS.has(interaction.owner) || !hasText(interaction.command)) {
      violations.push({ code: 'missing-or-invalid-interaction-owner', id: interaction.id });
    }
    if (
      !hasText(interaction.completion?.runtimeSignal) ||
      !hasText(interaction.completion?.visibleEvidence) ||
      !(interaction.visibleStates ?? []).includes('ready')
    ) {
      violations.push({ code: 'missing-visible-completion-contract', id: interaction.id });
    }
    if (
      !hasText(interaction.failure?.visibleState) ||
      typeof interaction.failure?.preservesLastAcceptedSnapshot !== 'boolean'
    ) {
      violations.push({ code: 'missing-failure-snapshot-contract', id: interaction.id });
    }
  }

  for (const capability of REQUIRED_CAPABILITIES) {
    if (!capabilities.has(capability)) {
      violations.push({ code: 'missing-foundation-capability', capability });
    }
  }

  const requiredAxes = model.requiredCrossProductAxes ?? [];
  for (const axis of requiredAxes) {
    if (!(model.coverageDimensions?.[axis]?.length > 0)) {
      violations.push({ code: 'missing-cross-product-axis', axis });
    }
  }
  const coveredAxes = new Set(
    (model.foundationInteractions ?? []).flatMap((interaction) => interaction.coverageAxes ?? []),
  );
  for (const axis of requiredAxes) {
    if (!coveredAxes.has(axis)) violations.push({ code: 'unassigned-cross-product-axis', axis });
  }

  for (const interaction of model.unplannedPostFoundationCandidates ?? []) {
    if (!/^UX-POST-\d{3}$/.test(interaction.id ?? '')) {
      violations.push({ code: 'invalid-unplanned-candidate-id', id: interaction.id });
    }
    if (
      interaction.planned !== false ||
      interaction.foundationAcceptanceRequired !== false ||
      !hasText(interaction.extensionBoundary) ||
      !hasText(interaction.foundationDependency)
    ) {
      violations.push({ code: 'unplanned-candidate-leaks-into-foundation', id: interaction.id });
    }
  }

  return violations;
}
