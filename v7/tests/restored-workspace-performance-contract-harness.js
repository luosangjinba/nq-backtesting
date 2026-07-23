import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'),
);

function validate(model, interactionContract, latencyContract) {
  const violations = [];
  if (model?.schemaVersion !== 1 || model?.status !== 'accepted') {
    violations.push({ code: 'RESTORED_PERFORMANCE_HEADER_INVALID' });
    return violations;
  }
  const expectedAxes = [...interactionContract.requiredCrossProductAxes].sort();
  const actualAxes = Object.keys(model.axisEvidence ?? {}).sort();
  if (actualAxes.join(',') !== expectedAxes.join(',')) {
    violations.push({ code: 'RESTORED_PERFORMANCE_AXIS_SET_INVALID' });
  }
  for (const axis of expectedAxes) {
    const evidence = model.axisEvidence?.[axis] ?? {};
    for (const value of interactionContract.coverageDimensions[axis]) {
      if (!Array.isArray(evidence[value]) || evidence[value].length === 0) {
        violations.push({ code: 'RESTORED_PERFORMANCE_AXIS_VALUE_MISSING', axis, value });
      }
    }
  }
  const profile = model.restoredWorkspaceProfile ?? {};
  if (profile.manualNextSamples < latencyContract.measurement.minimumSamples
    || profile.warmCacheProviderRequests !== 0
    || profile.requiredMutationMode !== 'tail-update'
    || profile.performanceProfile !== 'manual-next-cache-tiered'
    || profile.autoplayCheckpointRequired !== true) {
    violations.push({ code: 'RESTORED_PERFORMANCE_PROFILE_INVALID' });
  }
  for (const key of ['delayed', 'stale', 'reordered']) {
    if (!Array.isArray(model.raceEvidence?.[key]) || model.raceEvidence[key].length === 0) {
      violations.push({ code: 'RESTORED_PERFORMANCE_RACE_EVIDENCE_MISSING', key });
    }
  }
  return violations;
}

const model = readJson('docs/v7-restored-workspace-performance-matrix.json');
const interactionContract = readJson('docs/v7-foundation-interactions.json');
const latencyContract = readJson('docs/v7-cache-latency-contract.json');
assert.deepEqual(validate(model, interactionContract, latencyContract), []);

const referencedPaths = new Set([
  model.restoredWorkspaceProfile.harness,
  ...Object.values(model.raceEvidence).flat(),
  ...Object.values(model.axisEvidence).flatMap((values) => Object.values(values).flat()),
]);
for (const relativePath of referencedPaths) {
  assert.equal(fs.existsSync(path.join(V7_ROOT, relativePath)), true, `${relativePath} must exist`);
}

const negative = readJson('tests/fixtures/restored-workspace-performance/negative/missing-axis-value.json');
const invalid = structuredClone(model);
delete invalid.axisEvidence[negative.remove.axis][negative.remove.value];
const negativeCodes = validate(invalid, interactionContract, latencyContract)
  .map(({ code }) => code);
assert.ok(negativeCodes.includes(negative.expectedFailureCode));

assert.deepEqual(
  latencyContract.profiles['manual-next-cache-tiered'].cacheHitVisible,
  { p95Ms: 100, p99Ms: 150, maxMs: 250 },
  'restored Workspace measurements remain bound to the accepted Manual Next budget',
);

console.log('v7 restored Workspace performance contract harness passed', {
  axes: Object.keys(model.axisEvidence).length,
  evidenceFiles: referencedPaths.size,
  raceClasses: Object.keys(model.raceEvidence),
});
