import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInteractionContract } from './support/interaction-contract-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const model = JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, 'docs/v7-foundation-interactions.json'), 'utf8'),
);
assert.deepEqual(validateInteractionContract(model), [], 'foundation interaction contract must pass');

const negativeDirectory = path.join(TEST_DIR, 'fixtures/interactions/negative');
const files = fs.readdirSync(negativeDirectory).filter((file) => file.endsWith('.json')).sort();
assert.equal(files.length, 4, 'R0.3 requires four interaction-contract negative controls');

for (const file of files) {
  const fixture = JSON.parse(fs.readFileSync(path.join(negativeDirectory, file), 'utf8'));
  const codes = validateInteractionContract(fixture.model).map((violation) => violation.code);
  assert.ok(
    codes.includes(fixture.expectedFailureCode),
    `${file} must fail with ${fixture.expectedFailureCode}; got ${codes.join(', ') || 'no failure'}`,
  );
}

console.log(`v7 interaction contract harness passed (${model.foundationInteractions.length} foundation interactions, ${model.deferredInteractions.length} deferred, ${files.length} negative controls)`);
