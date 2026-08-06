import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArchitectureModel } from './support/architecture-model-validator.js';
import { validateHarnessRuleCatalogRecovery } from './support/harness-rule-catalog-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const RULES_PATH = path.join(V7_ROOT, 'docs/v7-harness-rules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
const recoveryViolations = validateHarnessRuleCatalogRecovery(rules, {
  pathExists: (relativePath) => fs.existsSync(path.join(V7_ROOT, relativePath)),
});
assert.deepEqual(recoveryViolations, [], 'current harness-rule recovery lifecycle must be valid');
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
  assert.equal(typeof rule.humanReviewRequired, 'boolean', `${rule.id} must declare human review policy`);

  if (activationStepIndex <= currentStepIndex) {
    assert.ok(
      rule.state === 'executable' || rule.state === 'accepted' || rule.state === 'regressed',
      `${rule.id} is active by ${rules.currentStep} but remains ${rule.state}`,
    );
  }

  if (rule.state === 'executable' || rule.state === 'accepted' || rule.state === 'regressed') {
    assert.ok(rule.harness, `${rule.id} executable rule requires a harness`);
    assert.ok(rule.positiveEvidence.length > 0, `${rule.id} executable rule requires positive evidence`);
    assert.ok(rule.negativeFixtures.length > 0, `${rule.id} executable rule requires a negative fixture`);
    assert.ok(fs.existsSync(path.join(V7_ROOT, rule.harness)), `${rule.id} harness path does not exist`);
    for (const evidence of [...rule.positiveEvidence, ...rule.negativeFixtures]) {
      assert.ok(fs.existsSync(path.join(V7_ROOT, evidence)), `${rule.id} evidence path does not exist: ${evidence}`);
    }
  }
  if (rule.state === 'accepted' || rule.state === 'regressed') {
    assert.ok(rule.acceptanceEvidence, `${rule.id} cannot be accepted without completion evidence`);
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
    .filter((rule) => (
      rule.state === 'executable' || rule.state === 'accepted' || rule.state === 'regressed'
    ))
    .flatMap((rule) => rule.negativeFixtures),
);
for (const file of negativeFiles) {
  assert.ok(
    executableFixturePaths.has(`tests/fixtures/architecture/negative/${file}`),
    `${file} must protect at least one executable rule`,
  );
}

const recoveryNegativePath = path.join(
  TEST_DIR,
  'fixtures/harness-rules/negative/regression-lifecycle-cases.json',
);
const recoveryNegativeFixture = JSON.parse(fs.readFileSync(recoveryNegativePath, 'utf8'));
assert.ok(recoveryNegativeFixture.cases.length >= 3, 'R8.1 requires complete lifecycle controls');
for (const testCase of recoveryNegativeFixture.cases) {
  const invalidCatalog = structuredClone(rules);
  const regressionOperations = new Set([
    'deactivate-recovery',
    'remove-regression-evidence',
    'remove-recovery-inventory-entry',
  ]);
  const firstRegressed = regressionOperations.has(testCase.operation)
    ? invalidCatalog.rules.find((rule) => rule.id === 'H069')
    : null;
  if (firstRegressed) {
    assert.ok(firstRegressed.regressionEvidence && firstRegressed.recoveryStep,
      'recovery lifecycle controls require one rule with complete historical regression metadata');
    firstRegressed.state = 'regressed';
    invalidCatalog.recoveryMode.regressedRuleIds = [firstRegressed.id];
  }
  const closedRecoveryOperations = new Set([
    'retain-feature-freeze-after-closure',
    'remove-closure-evidence',
    'replace-closure-step',
  ]);
  if (closedRecoveryOperations.has(testCase.operation)) {
    invalidCatalog.recoveryMode.active = false;
    invalidCatalog.recoveryMode.allowedWork = 'normal-delivery';
    invalidCatalog.recoveryMode.freezeFeatureDelivery = false;
    invalidCatalog.recoveryMode.requiredClosureStep = 'R8.15';
    invalidCatalog.recoveryMode.closureStep = 'R8.15';
    invalidCatalog.recoveryMode.closureEvidence = 'sessions/session_20260731_r8_15_human_acceptance_zero_debt.md';
  }
  if (testCase.operation === 'deactivate-recovery') {
    invalidCatalog.recoveryMode.active = false;
  } else if (testCase.operation === 'remove-regression-evidence') {
    firstRegressed.regressionEvidence = null;
  } else if (testCase.operation === 'remove-recovery-inventory-entry') {
    invalidCatalog.recoveryMode.regressedRuleIds = invalidCatalog.recoveryMode.regressedRuleIds
      .filter((ruleId) => ruleId !== firstRegressed.id);
  } else if (testCase.operation === 'retain-feature-freeze-after-closure') {
    invalidCatalog.recoveryMode.freezeFeatureDelivery = true;
  } else if (testCase.operation === 'remove-closure-evidence') {
    invalidCatalog.recoveryMode.closureEvidence = null;
  } else if (testCase.operation === 'replace-closure-step') {
    invalidCatalog.recoveryMode.closureStep = 'R8.14';
  } else {
    assert.fail(`unknown recovery negative operation ${testCase.operation}`);
  }
  const failureCodes = validateHarnessRuleCatalogRecovery(invalidCatalog, {
    pathExists: (relativePath) => fs.existsSync(path.join(V7_ROOT, relativePath)),
  }).map((violation) => violation.code);
  assert.ok(
    failureCodes.includes(testCase.expectedFailureCode),
    `${testCase.name} must fail with ${testCase.expectedFailureCode}; got ${failureCodes.join(', ')}`,
  );
}

console.log(
  `v7 architecture hardening harness passed (${rules.rules.length} rules, `
  + `${negativeFiles.length + recoveryNegativeFixture.cases.length} negative controls)`,
);
