import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSourceQuality } from './support/source-quality-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
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

console.log(`v7 source quality harness passed (${files.length} negative controls)`);
