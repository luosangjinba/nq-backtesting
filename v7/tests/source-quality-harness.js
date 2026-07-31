import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeProductionSourceQuality,
  compareProductionSourceQualitySnapshots,
} from './support/production-source-quality-analyzer.js';
import {
  validateProductionSourceQualitySnapshot,
  validateProductionSourceSummaryEvidence,
} from './support/production-source-quality-validator.js';
import { validateSourceQuality } from './support/source-quality-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const fixtureRoot = path.join(TEST_DIR, 'fixtures/source-quality');
const positive = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'positive/modular-source.json'), 'utf8'));
assert.deepEqual(validateSourceQuality(positive), [], 'positive modular source model must pass');

const negativeDirectory = path.join(fixtureRoot, 'negative');
const files = fs.readdirSync(negativeDirectory).filter((file) => file.endsWith('.json')).sort();
assert.equal(files.length, 7, 'R0.2 requires seven source-quality negative controls');

for (const file of files) {
  const fixture = JSON.parse(fs.readFileSync(path.join(negativeDirectory, file), 'utf8'));
  const codes = validateSourceQuality(fixture.model).map((violation) => violation.code);
  assert.ok(
    codes.includes(fixture.expectedFailureCode),
    `${file} must fail with ${fixture.expectedFailureCode}; got ${codes.join(', ') || 'no failure'}`,
  );
}

const manifest = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'),
  'utf8',
));
const policy = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-production-source-quality-policy.json'),
  'utf8',
));
const baseline = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-production-source-quality-baseline.json'),
  'utf8',
));
const summaryEvidencePaths = Object.freeze([
  'TODO.md',
  ...['docs', 'sessions'].flatMap((directory) => fs.readdirSync(path.join(V7_ROOT, directory))
    .filter((file) => file.endsWith('.md'))
    .map((file) => `${directory}/${file}`)),
].sort());
const summaryEvidencePorts = Object.freeze({
  listPaths: () => summaryEvidencePaths,
  readText: (relativePath) => fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'),
});
const production = analyzeProductionSourceQuality({ manifest, policy, v7Root: V7_ROOT });
assert.deepEqual(
  validateProductionSourceQualitySnapshot(production, policy),
  [],
  'all production JavaScript must satisfy source-quality and documentation gates',
);
assert.deepEqual(
  compareProductionSourceQualitySnapshots(baseline, production),
  [],
  'production source-quality evidence must match the committed baseline',
);
assert.deepEqual(
  validateProductionSourceSummaryEvidence(baseline, policy, summaryEvidencePorts),
  [],
  'human-readable production source summaries must match the committed baseline',
);

const summaryNegative = JSON.parse(fs.readFileSync(
  path.join(fixtureRoot, 'evidence-summary-negative/cases.json'),
  'utf8',
));
for (const testCase of summaryNegative.cases) {
  const candidatePolicy = structuredClone(policy);
  const candidatePorts = { ...summaryEvidencePorts };
  if (testCase.operation === 'replace-text') {
    const original = summaryEvidencePorts.readText(testCase.path);
    const mutated = original.replace(testCase.replace.from, testCase.replace.to);
    assert.notEqual(mutated, original, `${testCase.name} must mutate declared evidence`);
    candidatePorts.readText = (relativePath) => (relativePath === testCase.path
      ? mutated
      : summaryEvidencePorts.readText(relativePath));
  } else if (testCase.operation === 'remove-policy-entry') {
    candidatePolicy.summaryEvidence = candidatePolicy.summaryEvidence
      .filter(({ path: evidencePath }) => evidencePath !== testCase.path);
  } else {
    assert.fail(`unknown evidence-summary negative operation ${testCase.operation}`);
  }
  const codes = validateProductionSourceSummaryEvidence(baseline, candidatePolicy, candidatePorts)
    .map(({ code }) => code);
  assert.ok(
    codes.includes(testCase.expectedFailureCode),
    `${testCase.name} must fail with ${testCase.expectedFailureCode}; got ${codes.join(', ')}`,
  );
}

function expectProductionFailure(name, mutate, expectedCode) {
  const candidate = structuredClone(production);
  mutate(candidate);
  const codes = validateProductionSourceQualitySnapshot(candidate, policy)
    .map(({ code }) => code);
  assert.ok(
    codes.includes(expectedCode),
    `${name} must fail with ${expectedCode}; got ${codes.join(', ') || 'no failure'}`,
  );
}

const fileWithFunction = production.files.find((file) => file.functions.length > 0);
const fileWithExport = production.files.find((file) => file.publicExports.length > 0);
assert.ok(fileWithFunction && fileWithExport, 'production evidence must include functions and public exports');

expectProductionFailure('production oversize mutation', (candidate) => {
  candidate.files[0].effectiveLines = 10_000;
}, 'source-size-budget-exceeded');
expectProductionFailure('production long-function mutation', (candidate) => {
  candidate.files.find(({ path: value }) => value === fileWithFunction.path)
    .functions[0].effectiveLines = 10_000;
}, 'function-size-budget-exceeded');
expectProductionFailure('production responsibility mutation', (candidate) => {
  candidate.files[0].responsibilities.push('unauthorized-second-owner');
}, 'mixed-or-missing-file-responsibility');
expectProductionFailure('production public-doc mutation', (candidate) => {
  candidate.files.find(({ path: value }) => value === fileWithExport.path)
    .publicExports[0].documentation.lifecycle = '';
}, 'undocumented-public-contract');
expectProductionFailure('production invariant mutation', (candidate) => {
  for (const file of candidate.files) {
    file.criticalInvariants = file.criticalInvariants.filter(({ id }) => id !== 'no-future');
  }
}, 'missing-production-critical-invariant');
expectProductionFailure('production debt mutation', (candidate) => {
  candidate.files[0].debtComments.push({ decisionId: '', owner: '', removalCondition: '', text: 'TODO' });
}, 'untracked-debt-comment');
expectProductionFailure('production fragment mutation', (candidate) => {
  Object.assign(candidate.files[0], {
    adaptsBoundary: false,
    effectiveLines: 8,
    forwardingOnly: true,
    ownsContract: false,
  });
}, 'artificial-source-fragment');

const drifted = structuredClone(production);
drifted.files[0].sourceHash = 'negative-control-drift';
assert.deepEqual(
  compareProductionSourceQualitySnapshots(production, drifted).map(({ code }) => code),
  ['production-source-quality-snapshot-drift'],
  'source hash drift must fail closed',
);

console.log(
  `v7 source quality harness passed (${production.summary.files} production files, `
    + `${production.summary.publicExports} public exports, `
    + `${files.length + 8 + summaryNegative.cases.length} negative controls)`,
);
