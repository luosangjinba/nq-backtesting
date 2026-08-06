import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProductionArchitecture } from './support/production-architecture-analyzer.js';
import { validateProductionArchitectureSnapshot } from './support/production-architecture-validator.js';

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
const writerPolicy = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-production-writer-policy.json'),
  'utf8',
));
const policy = Object.freeze({
  ...baseline.analysisPolicy,
  writerPolicies: writerPolicy.writerPolicies,
});

const report = analyzeProductionArchitecture({ manifest, policy, v7Root: V7_ROOT });
const writerViolation = (entry) => entry.code.startsWith('writer-');
assert.deepEqual(
  report.violations.filter(writerViolation),
  [],
  'production writer policy, inventory, evidence, and owner sets must form an exact closure',
);
assert.deepEqual(
  [...new Set(report.snapshot.writerSites.map(({ surface }) => surface))].sort(),
  Object.keys(manifest.writerInventories).sort(),
  'every inventoried writer surface must have observed production evidence',
);
assert.equal(writerPolicy.writerPolicies.length, Object.keys(manifest.writerInventories).length);

function expectViolation({ mutatePolicy = () => {}, mutateSnapshot = () => {} }, code, subject) {
  const invalidPolicy = structuredClone(policy);
  const invalidSnapshot = structuredClone(report.snapshot);
  mutatePolicy(invalidPolicy);
  mutateSnapshot(invalidSnapshot);
  const violations = validateProductionArchitectureSnapshot(invalidSnapshot, invalidPolicy);
  assert.ok(violations.some((entry) => (
    entry.code === code && (subject === undefined || entry.subject === subject)
  )), `${code}:${subject ?? '*'} negative control must fail`);
}

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.writerSites.push({
      detectorId: 'rogue-writer-detector',
      sourceFile: 'app/rogue-writer.js',
      sourceModuleId: 'application',
      surface: 'undeclaredSurface',
    });
  },
}, 'writer-evidence-undeclared-surface', 'undeclaredSurface:app/rogue-writer.js');

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.writerSites = snapshot.writerSites.filter(({ surface }) => surface !== 'replayCursor');
  },
}, 'writer-evidence-missing', 'replayCursor');

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.writerSites.find(({ surface }) => surface === 'chartSeries').detectorId = 'rogue';
  },
}, 'writer-evidence-detector-mismatch');

expectViolation({
  mutatePolicy(candidate) {
    candidate.writerPolicies = candidate.writerPolicies
      .filter(({ surface }) => surface !== 'replayCursor');
  },
}, 'writer-policy-missing', 'replayCursor');

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.declaredWriterSurfaces = snapshot.declaredWriterSurfaces
      .filter(({ surface }) => surface !== 'replayCursor');
  },
}, 'writer-inventory-missing', 'replayCursor');

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.declaredWriterSurfaces
      .find(({ surface }) => surface === 'replayCursor').moduleIds = ['application'];
  },
}, 'writer-policy-owner-mismatch', 'replayCursor');

expectViolation({
  mutatePolicy(candidate) {
    candidate.writerPolicies.push(structuredClone(candidate.writerPolicies[0]));
  },
}, 'writer-policy-duplicate');

expectViolation({
  mutateSnapshot(snapshot) {
    snapshot.declaredWriterSurfaces.push(structuredClone(snapshot.declaredWriterSurfaces[0]));
  },
}, 'writer-inventory-duplicate');

console.log(
  `v7 production writer closure harness passed (${writerPolicy.writerPolicies.length} surfaces, `
  + `${report.snapshot.writerSites.length} observed writer files, 8 negative controls)`,
);
