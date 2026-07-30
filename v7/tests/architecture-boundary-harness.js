import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeProductionArchitecture,
} from './support/production-architecture-analyzer.js';
import {
  compareProductionArchitectureSnapshots,
} from './support/production-architecture-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const REPOSITORY_ROOT = path.resolve(V7_ROOT, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'), 'utf8'),
);
const productionBaseline = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-production-architecture-baseline.json'),
  'utf8',
));
const productionArchitecture = analyzeProductionArchitecture({
  manifest,
  policy: productionBaseline.analysisPolicy,
  v7Root: V7_ROOT,
});
assert.deepEqual(
  compareProductionArchitectureSnapshots(productionBaseline.snapshot, productionArchitecture.snapshot),
  [],
  'production architecture must match its exact recovery baseline',
);
assert.deepEqual(
  productionArchitecture.violations,
  productionBaseline.knownViolations.map(({ bugId, recoveryStep, ...violation }) => violation),
  'production architecture findings must match the blocking recovery inventory',
);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(candidate) : [candidate];
  });
}

for (const document of manifest.requiredDocuments) {
  assert.ok(fs.existsSync(path.join(V7_ROOT, document)), `missing required V7 document: ${document}`);
}

const activeModuleIds = new Set();
const activeModuleDescriptors = [];
for (const descriptorPath of manifest.activeProductionModules) {
  const absoluteDescriptorPath = path.join(V7_ROOT, descriptorPath);
  assert.ok(fs.existsSync(absoluteDescriptorPath), `missing active module descriptor: ${descriptorPath}`);
  const descriptor = JSON.parse(fs.readFileSync(absoluteDescriptorPath, 'utf8'));
  for (const field of manifest.moduleContract.descriptorRequiredFields) {
    assert.ok(field in descriptor, `${descriptorPath} missing descriptor field ${field}`);
  }
  assert.equal(activeModuleIds.has(descriptor.id), false, `duplicate active module id ${descriptor.id}`);
  activeModuleIds.add(descriptor.id);
  activeModuleDescriptors.push(descriptor);
  assert.ok(manifest.moduleContract.allowedKinds.includes(descriptor.kind), `${descriptor.id} has invalid kind`);
  assert.ok(manifest.owners.includes(descriptor.owner), `${descriptor.id} has unknown owner`);
  assert.ok(fs.existsSync(path.join(V7_ROOT, descriptor.publicEntry)), `${descriptor.id} public entry is missing`);
  assert.ok(
    fs.existsSync(path.join(V7_ROOT, descriptor.independentHarness)),
    `${descriptor.id} independent harness is missing`,
  );
}
for (const descriptor of activeModuleDescriptors) {
  for (const dependency of descriptor.requiredPorts) {
    assert.ok(activeModuleIds.has(dependency), `${descriptor.id} requires inactive module ${dependency}`);
  }
}
const dependenciesById = new Map(activeModuleDescriptors.map(
  (descriptor) => [descriptor.id, descriptor.requiredPorts],
));
const visiting = new Set();
const visited = new Set();
function visitModule(moduleId) {
  assert.equal(visiting.has(moduleId), false, `active module dependency cycle reaches ${moduleId}`);
  if (visited.has(moduleId)) return;
  visiting.add(moduleId);
  for (const dependency of dependenciesById.get(moduleId) ?? []) visitModule(dependency);
  visiting.delete(moduleId);
  visited.add(moduleId);
}
for (const moduleId of activeModuleIds) visitModule(moduleId);
assert.deepEqual(manifest.writerInventories, {
  sessionRecord: ['core.session-store'],
  workspaceCheckpoint: ['core.session-store'],
  layoutSyncPolicy: ['core.session-store'],
  replayNavigationPreferences: ['core.replay-navigation-preference-store'],
  workstationSettings: ['core.workstation-settings'],
  calendarSurfaceDom: ['adapter.calendar-surface'],
  sessionBrowserDom: ['adapter.session-browser-ui'],
  replayWorkspaceDom: ['adapter.replay-workspace-ui'],
  chartSeries: ['adapter.lightweight-chart'],
  viewportIntent: ['core.viewport-runtime'],
  paneWorkspace: ['core.pane-workspace-domain'],
  workspaceSnapshot: ['core.workspace-transaction-runtime'],
  rawBarRequest: ['core.bar-data-runtime'],
  replayCursor: ['core.replay-runtime'],
}, 'R4.5 activates one concrete chart writer and one Replay Workspace DOM owner');

assert.deepEqual(manifest.moduleContract.descriptorRequiredFields, [
  'id',
  'version',
  'kind',
  'owner',
  'publicEntry',
  'requiredPorts',
  'optionalPorts',
  'lifecycle',
  'independentHarness',
  'removable',
]);
assert.equal(manifest.moduleContract.forbidInternalCrossModuleImports, true);
assert.equal(manifest.moduleContract.requireAcyclicDependencies, true);
assert.equal(manifest.moduleContract.requireIndependentHarness, true);
assert.equal(manifest.moduleContract.requireOptionalRemovalBootMatrix, true);
assert.equal(manifest.moduleContract.requireLifecycleCleanupProof, true);
assert.deepEqual(manifest.extensionContracts, {
  timeframe: 'TimeframeDefinition',
  marketData: 'MarketDataProvider',
  instrument: 'InstrumentDefinition',
  calendar: 'TradingCalendar',
  indicator: 'IndicatorModule',
  formula: 'FormulaEngine',
});
assert.deepEqual(manifest.forbiddenCoreValueBranches, [
  'timeframe-id',
  'instrument-id',
  'provider-id',
  'indicator-id',
  'formula-language-id',
]);
assert.deepEqual(manifest.futureComplexityMechanisms, [
  'versioned-public-schemas',
  'capability-negotiation',
  'module-scoped-persistence-migrations',
  'explicit-module-permissions',
  'cancellable-budgeted-background-work',
  'structured-module-transaction-observability',
  'read-only-analytics-ai-snapshots',
  'public-port-and-storage-compatibility-suites',
]);
assert.equal(manifest.professionalUiGate.requiredFromFirstVisibleSlice, true);
assert.deepEqual(manifest.professionalUiGate.requiredStates, [
  'loading',
  'empty',
  'unavailable',
  'stale',
  'error',
  'ready',
]);
for (const requirement of [
  'shared-design-tokens',
  'stable-loading-geometry',
  'pane-local-refresh-gates',
  'keyboard-focus-accessibility',
  'desktop-responsive-pane-layout',
  'visual-regression-fixtures',
  'no-debug-or-placeholder-customer-ui',
]) {
  assert.ok(manifest.professionalUiGate.requirements.includes(requirement));
}

const productionFiles = manifest.productionRoots.flatMap((root) =>
  walk(path.join(REPOSITORY_ROOT, root)).filter((file) => /\.(?:js|mjs|ts)$/.test(file)),
);
for (const file of productionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const legacyRoot of manifest.legacyRuntimeImportRoots) {
    assert.equal(
      source.includes(legacyRoot),
      false,
      `${path.relative(REPOSITORY_ROOT, file)} must not import ${legacyRoot}`,
    );
  }
  for (const token of manifest.forbiddenSourceTokens) {
    assert.equal(
      source.includes(token),
      false,
      `${path.relative(REPOSITORY_ROOT, file)} contains forbidden legacy token ${token}`,
    );
  }
}

assert.deepEqual(manifest.requiredIdentityFields, [
  'sessionId',
  'activationGeneration',
  'transactionId',
]);
for (const rule of [
  'explicit-session-identity',
  'one-intent-one-visible-commit',
  'multi-pane-atomicity',
  'replace-and-delete-in-one-commit',
  'manual-acceptance-for-interaction-or-visual-changes',
  'autonomous-execution-between-human-gates',
  'modules-independently-runnable',
  'optional-modules-removable-without-core-edits',
  'cross-module-imports-public-only',
  'capabilities-extend-without-core-owner-edits',
  'concrete-capability-ids-forbidden-in-core-branches',
  'complex-features-use-versioned-public-mechanisms',
  'workflow-coordinators-never-own-feature-state',
  'professional-ui-from-first-visible-slice',
  'critical-rules-have-enforcement-lifecycle',
  'regression-lifecycle-blocks-feature-acceptance',
  'production-source-descriptor-and-writer-conformance',
  'executable-rules-require-negative-controls',
  'automated-evidence-cannot-grant-human-acceptance',
  'production-files-have-one-long-lived-responsibility',
  'source-size-exceptions-require-human-evidence',
  'public-contracts-and-critical-invariants-are-documented',
  'foundation-interactions-have-owner-visible-completion-and-phase-boundary',
  'cache-latency-and-refresh-contracts-are-bounded-and-atomic',
  'calendar-surface-business-data-agnostic',
  'raw-bar-contract-session-independent-and-window-bounded',
  'bar-data-runtime-bounded-coalesced-and-disposable',
  'provider-policy-bounded-and-transport-neutral',
  'coverage-explicit-and-request-planning-bounded',
  'provider-execution-policy-bound-cancellable-and-automatic',
  'replay-contract-time-based-transaction-scoped',
  'replay-runtime-visible-commit-only',
  'replay-prefetch-advice-bounded-and-io-free',
  'workspace-transaction-runtime-visible-gated-and-stale-safe',
  'projection-domain-provider-neutral-exclusive-no-future',
  'chart-snapshot-application-exact-visible-receipt',
  'viewport-intent-pane-local-and-data-independent',
  'real-chart-visible-completion-and-native-wall',
  'uniform-pane-workspace-session-assets-shared-cursor',
  'replay-actions-plan-complete-pane-set-atomically',
  'complete-pane-set-materializes-and-applies-atomically',
  'replay-navigation-shares-one-clock-and-pane-set-transaction',
  'versioned-pane-layout-persistence-and-resize-bounds',
  'pane-local-latest-ohlc-and-chart-only-crosshair-sync',
  'pane-canvas-overlay-controls-are-transient-and-local',
  'pane-control-dock-is-vertical-and-scale-safe',
  'session-browser-delete-is-confirmed-and-durable',
  'global-workstation-settings-transactional-all-pane',
  'versioned-session-layout-sync-policy',
]) {
  assert.ok(manifest.requiredRules.includes(rule), `missing binding architecture rule: ${rule}`);
}

console.log('v7 architecture boundary harness passed');
