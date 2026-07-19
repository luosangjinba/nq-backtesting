import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const REPOSITORY_ROOT = path.resolve(V7_ROOT, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'), 'utf8'),
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

assert.deepEqual(manifest.activeProductionModules, [], 'R0 must not activate production runtime modules');
for (const inventory of Object.values(manifest.writerInventories)) {
  assert.deepEqual(inventory, [], 'R0 writer inventories must remain empty');
}

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
  'manual-acceptance-after-every-step',
  'autonomous-execution-between-human-gates',
  'modules-independently-runnable',
  'optional-modules-removable-without-core-edits',
  'cross-module-imports-public-only',
  'capabilities-extend-without-core-owner-edits',
  'concrete-capability-ids-forbidden-in-core-branches',
  'complex-features-use-versioned-public-mechanisms',
  'workflow-coordinators-never-own-feature-state',
  'professional-ui-from-first-visible-slice',
]) {
  assert.ok(manifest.requiredRules.includes(rule), `missing binding architecture rule: ${rule}`);
}

console.log('v7 architecture boundary harness passed');
