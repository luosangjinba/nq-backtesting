import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeProductionArchitecture,
} from './support/production-architecture-analyzer.js';
import {
  compareProductionArchitectureSnapshots,
  validateProductionArchitectureSnapshot,
} from './support/production-architecture-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const manifest = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'),
  'utf8',
));
const baseline = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-production-architecture-baseline.json'),
  'utf8',
));

assert.equal(baseline.schemaVersion, 1);
assert.equal(baseline.deliveryStep, 'R8.2');
assert.equal(baseline.status, 'blocking-recovery-baseline');
const report = analyzeProductionArchitecture({
  manifest,
  policy: baseline.analysisPolicy,
  v7Root: V7_ROOT,
});
assert.deepEqual(
  compareProductionArchitectureSnapshots(baseline.snapshot, report.snapshot),
  [],
  'production architecture changed without updating its exact recovery baseline',
);

const recordedViolations = baseline.knownViolations.map(({ bugId, recoveryStep, ...violation }) => violation);
assert.deepEqual(
  report.violations,
  recordedViolations,
  'production findings must exactly equal the blocking recovery inventory',
);
assert.equal(new Set(baseline.knownViolations.map(({ subject }) => subject)).size,
  baseline.knownViolations.length, 'known production violation subjects must be unique');
for (const finding of baseline.knownViolations) {
  assert.match(finding.bugId, /^BUG-V7-\d{4}$/);
  assert.match(finding.recoveryStep, /^R8\.\d+$/);
  assert.equal(finding.blocking, undefined, 'known violations are intrinsically blocking');
}
assert.equal(report.snapshot.modules.length, manifest.activeProductionModules.length);
assert.deepEqual(
  report.snapshot.modules.map(({ id }) => id).sort(),
  baseline.snapshot.modules.map(({ id }) => id).sort(),
  'every active production descriptor must be represented',
);
assert.deepEqual(
  report.snapshot.declaredWriterSurfaces,
  Object.entries(manifest.writerInventories)
    .map(([surface, moduleIds]) => ({ moduleIds: [...moduleIds].sort(), surface }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  'the analyzer must publish the complete declared writer inventory',
);

function mutateSnapshot(snapshot, operation) {
  const candidate = structuredClone(snapshot);
  if (operation === 'make-internal-import') {
    const module = candidate.modules.find(({ id }) => id === 'core.workspace-transaction-contract');
    module.importSites[0].throughPublicEntry = false;
  } else if (operation === 'remove-required-port') {
    const module = candidate.modules.find(({ id }) => id === 'core.workspace-transaction-contract');
    module.declaredRequiredPorts = module.declaredRequiredPorts
      .filter((id) => id !== 'core.activation-generation');
  } else if (operation === 'add-actual-dependency-cycle') {
    const module = candidate.modules.find(({ id }) => id === 'core.session-identity');
    module.actualDependencies.push('core.workspace-transaction-contract');
    module.declaredOptionalPorts.push('core.workspace-transaction-contract');
  } else if (operation === 'remove-dispose-lifecycle') {
    const module = candidate.modules.find(({ id }) => id === 'adapter.lightweight-chart');
    module.declaredLifecycle = [];
  } else if (operation === 'force-app-shell-harness') {
    const module = candidate.modules.find(({ id }) => id === 'core.session-identity');
    module.independentHarnessMode = 'app-shell';
  } else if (operation === 'add-unhosted-composition-root') {
    candidate.compositionRoots.push({
      constructedModuleIds: ['core.session-store'],
      htmlFile: 'app/rogue.html',
      importedModuleIds: ['core.session-store'],
      path: 'app/rogue.js',
      usesModuleHost: false,
    });
  } else if (operation === 'add-rogue-writer') {
    candidate.writerSites.push({
      detectorId: 'native-chart-series',
      sourceFile: 'app/rogue-writer.js',
      sourceModuleId: 'application',
      surface: 'chartSeries',
    });
  } else if (operation === 'drift-production-construction') {
    candidate.constructionSites.pop();
  } else {
    assert.fail(`unknown production architecture negative operation ${operation}`);
  }
  return candidate;
}

const negativeFixture = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/production-architecture/negative/cases.json',
), 'utf8'));
assert.ok(negativeFixture.cases.length >= 8, 'R8.2 requires complete production analyzer controls');
for (const testCase of negativeFixture.cases) {
  const invalidSnapshot = mutateSnapshot(report.snapshot, testCase.operation);
  const failures = testCase.operation === 'drift-production-construction'
    ? compareProductionArchitectureSnapshots(baseline.snapshot, invalidSnapshot)
    : validateProductionArchitectureSnapshot(invalidSnapshot, baseline.analysisPolicy);
  assert.ok(failures.some(({ code, subject }) => (
    code === testCase.expectedFailureCode
      && (testCase.expectedSubject === undefined || subject === testCase.expectedSubject)
  )), `${testCase.name} must fail with ${testCase.expectedFailureCode}`);
}

const actualDependencyEdges = report.snapshot.modules.reduce(
  (count, module) => count + module.actualDependencies.length,
  0,
);
console.log(
  `v7 production architecture harness passed (${report.snapshot.modules.length} modules, `
  + `${actualDependencyEdges} dependency edges, ${report.snapshot.constructionSites.length} construction sites, `
  + `${report.snapshot.writerSites.length} writer sites, ${report.violations.length} blocking findings, `
  + `${negativeFixture.cases.length} negative controls)`,
);
