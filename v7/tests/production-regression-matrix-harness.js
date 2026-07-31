import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProductionRegressionMatrix } from './support/production-regression-matrix-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'),
);
const model = readJson('docs/v7-production-regression-matrix.json');
const validate = (candidate) => validateProductionRegressionMatrix(candidate, {
  pathExists: (relativePath) => fs.existsSync(path.join(V7_ROOT, relativePath)),
});

assert.deepEqual(validate(model), [], 'the production regression matrix must be executable and closed');

const negative = readJson('tests/fixtures/production-regression-matrix/negative/cases.json');
for (const testCase of negative.cases) {
  const invalid = structuredClone(model);
  const scenario = invalid.scenarios.find(({ id }) => id === testCase.scenarioId);
  if (testCase.operation === 'remove-axis-coverage') {
    for (const entry of invalid.scenarios) {
      if (Array.isArray(entry.covers?.[testCase.axis])) {
        entry.covers[testCase.axis] = entry.covers[testCase.axis]
          .filter((value) => value !== testCase.value);
      }
    }
  } else if (testCase.operation === 'replace-execution-kind') {
    scenario.executionKind = testCase.value;
  } else if (testCase.operation === 'remove-scenario') {
    invalid.scenarios = invalid.scenarios.filter(({ id }) => id !== testCase.scenarioId);
  } else if (testCase.operation === 'disable-dynamic-failure') {
    scenario.failureInjection.dynamic = false;
  } else if (testCase.operation === 'replace-harness') {
    scenario.harness = testCase.value;
  } else if (testCase.operation === 'remove-human-acceptance') {
    invalid.humanAcceptanceEvidence = null;
  } else {
    assert.fail(`unknown production matrix negative operation ${testCase.operation}`);
  }
  const codes = validate(invalid).map(({ code }) => code);
  assert.ok(codes.includes(testCase.expectedFailureCode),
    `${testCase.name} must fail with ${testCase.expectedFailureCode}; got ${codes.join(', ')}`);
}

console.log('v7 production regression matrix harness passed', {
  axes: Object.keys(model.axes).length,
  negativeControls: negative.cases.length,
  productionScenarios: model.scenarios.length,
});
