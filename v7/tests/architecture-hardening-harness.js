import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArchitectureModel } from './support/architecture-model-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const RULES_PATH = path.join(V7_ROOT, 'docs/v7-harness-rules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
const requiredFields = [
  'id',
  'name',
  'owner',
  'v6FailurePrevented',
  'activationStep',
  'state',
  'harness',
  'positiveEvidence',
  'negativeFixtures',
  'humanReviewRequired',
  'acceptanceEvidence',
];

const ids = new Set();
const currentStepIndex = rules.stepOrder.indexOf(rules.currentStep);
assert.ok(currentStepIndex >= 0, `unknown current step ${rules.currentStep}`);
for (const rule of rules.rules) {
  for (const field of requiredFields) assert.ok(field in rule, `${rule.id ?? 'unknown'} missing ${field}`);
  assert.match(rule.id, /^H\d{3}$/);
  assert.equal(ids.has(rule.id), false, `duplicate harness rule id ${rule.id}`);
  ids.add(rule.id);
  assert.ok(rules.allowedStates.includes(rule.state), `${rule.id} has invalid state ${rule.state}`);
  const activationStepIndex = rules.stepOrder.indexOf(rule.activationStep);
  assert.ok(activationStepIndex >= 0, `${rule.id} has unknown activation step ${rule.activationStep}`);
  assert.equal(rule.humanReviewRequired, true, `${rule.id} must require human review`);

  if (activationStepIndex <= currentStepIndex) {
    assert.ok(
      rule.state === 'executable' || rule.state === 'accepted',
      `${rule.id} is active by ${rules.currentStep} but remains ${rule.state}`,
    );
  }

  if (rule.state === 'executable' || rule.state === 'accepted') {
    assert.ok(rule.harness, `${rule.id} executable rule requires a harness`);
    assert.ok(rule.positiveEvidence.length > 0, `${rule.id} executable rule requires positive evidence`);
    assert.ok(rule.negativeFixtures.length > 0, `${rule.id} executable rule requires a negative fixture`);
    assert.ok(fs.existsSync(path.join(V7_ROOT, rule.harness)), `${rule.id} harness path does not exist`);
    for (const evidence of [...rule.positiveEvidence, ...rule.negativeFixtures]) {
      assert.ok(fs.existsSync(path.join(V7_ROOT, evidence)), `${rule.id} evidence path does not exist: ${evidence}`);
    }
  }
  if (rule.state === 'accepted') {
    assert.ok(rule.acceptanceEvidence, `${rule.id} cannot be accepted without human evidence`);
  } else {
    assert.equal(rule.acceptanceEvidence, null, `${rule.id} has premature acceptance evidence`);
  }
}

const packageConfig = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'package.json'), 'utf8'));
assert.equal(packageConfig.private, true);
assert.equal(packageConfig.type, 'module');

const positivePath = path.join(TEST_DIR, 'fixtures/architecture/positive/minimal-core.json');
const positiveModel = JSON.parse(fs.readFileSync(positivePath, 'utf8'));
assert.deepEqual(validateArchitectureModel(positiveModel), [], 'positive minimal-core model must pass');

function mergeFixture(base, mutation) {
  if (Array.isArray(mutation)) return structuredClone(mutation);
  if (mutation === null || typeof mutation !== 'object') return mutation;
  const result = structuredClone(base ?? {});
  for (const [key, value] of Object.entries(mutation)) {
    result[key] = mergeFixture(result[key], value);
  }
  return result;
}

const negativeDirectory = path.join(TEST_DIR, 'fixtures/architecture/negative');
const negativeFiles = fs.readdirSync(negativeDirectory).filter((file) => file.endsWith('.json')).sort();
assert.ok(negativeFiles.length >= 9, 'R0.1 requires the complete negative-control set');
for (const file of negativeFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(negativeDirectory, file), 'utf8'));
  const model = mergeFixture(positiveModel, fixture.mutation);
  const codes = validateArchitectureModel(model).map((violation) => violation.code);
  assert.ok(
    codes.includes(fixture.expectedFailureCode),
    `${file} must fail with ${fixture.expectedFailureCode}; got ${codes.join(', ') || 'no failure'}`,
  );
}

const executableFixturePaths = new Set(
  rules.rules
    .filter((rule) => rule.state === 'executable' || rule.state === 'accepted')
    .flatMap((rule) => rule.negativeFixtures),
);
for (const file of negativeFiles) {
  assert.ok(
    executableFixturePaths.has(`tests/fixtures/architecture/negative/${file}`),
    `${file} must protect at least one executable rule`,
  );
}

console.log(`v7 architecture hardening harness passed (${rules.rules.length} rules, ${negativeFiles.length} negative controls)`);
