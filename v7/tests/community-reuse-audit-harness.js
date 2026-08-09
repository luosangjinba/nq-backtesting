import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCommunityReuseAudit } from './support/community-reuse-audit-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const auditPath = path.join(V7_ROOT, 'docs/v7-community-reuse-audit.json');
const decisionPath = path.join(V7_ROOT, 'docs/V7_COMMUNITY_REUSE_GATE_FOR_R13_6.md');
const packagePath = path.join(V7_ROOT, 'package.json');
const lockPath = path.join(V7_ROOT, 'package-lock.json');

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const packageManifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const decision = fs.readFileSync(decisionPath, 'utf8');

assert.deepEqual(validateCommunityReuseAudit(audit, { packageManifest }), []);
assert.equal(packageManifest.dependencies['lightweight-charts'], '5.2.0');
assert.equal(lock.packages[''].dependencies['lightweight-charts'], '5.2.0');
assert.equal(lock.packages['node_modules/lightweight-charts'].version, '5.2.0');
assert.match(
  decision,
  /No community package becomes a V7 production\s+dependency/i,
);
assert.match(decision, /Lightweight Charts 5\.2\.0/);
assert.match(decision, /R13\.6 remains separately authorized/);

function clone() {
  return JSON.parse(JSON.stringify(audit));
}

const negativeCases = [
  {
    code: 'wrong-lightweight-target',
    mutate(value) { value.target.version = '5.0.0'; },
  },
  {
    code: 'missing-required-gate',
    mutate(value) { value.requiredGates.shift(); },
  },
  {
    code: 'duplicate-candidate-id',
    mutate(value) { value.candidates[1].id = value.candidates[0].id; },
  },
  {
    code: 'unpinned-candidate',
    mutate(value) { value.candidates[0].commit = 'master'; },
  },
  {
    code: 'drawing-package-not-blocked',
    mutate(value) { value.candidates.find(({ id }) => id === 'lightweight-charts-drawing').decision = 'pattern-source'; },
  },
  {
    code: 'indicator-adapter-decision-missing',
    mutate(value) { value.candidates.find(({ id }) => id === 'lightweight-charts-indicators').decision = 'reference-only'; },
  },
  {
    code: 'indicator-formula-probe-mismatch',
    mutate(value) { value.candidates.find(({ id }) => id === 'lightweight-charts-indicators').compatibility.knownSmaValues[4] = 5; },
  },
  {
    code: 'source-only-core-promoted',
    mutate(value) { value.candidates.find(({ id }) => id === 'line-tools-core').compatibility.npmPublished = true; },
  },
  {
    code: 'candlekit-version-coupling-hidden',
    mutate(value) { value.candidates.find(({ id }) => id === 'candlekit').compatibility.combinedPeerProbe = 'pass'; },
  },
  {
    code: 'alternate-engine-promoted',
    mutate(value) { value.candidates.find(({ id }) => id === 'klinechart').decision = 'pattern-source'; },
  },
  {
    code: 'third-party-production-dependency',
    mutate(value) { value.r13_6Decision.productionDependenciesAdded.push('lightweight-charts-drawing'); },
  },
  {
    code: 'community-runtime-promoted',
    mutate(value) { value.r13_6Decision.communityRuntimePolicy = 'adopt'; },
  },
  {
    code: 'candidate-entered-package-manifest',
    packageMutation(value) { value.dependencies['lightweight-charts-drawing'] = '0.1.1'; },
  },
];

for (const negative of negativeCases) {
  const candidateAudit = clone();
  const candidatePackage = JSON.parse(JSON.stringify(packageManifest));
  negative.mutate?.(candidateAudit);
  negative.packageMutation?.(candidatePackage);
  const codes = validateCommunityReuseAudit(candidateAudit, {
    packageManifest: candidatePackage,
  }).map(({ code }) => code);
  assert.ok(codes.includes(negative.code), `${negative.code} negative control was not detected`);
}

console.log('Community reuse audit harness passed');
console.log(`Candidates: ${audit.candidates.length}`);
console.log(`Negative controls: ${negativeCases.length}`);
console.log('Production dependency additions: 0');
