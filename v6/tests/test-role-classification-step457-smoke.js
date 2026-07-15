import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';
import {
  EXPLICIT_SUPPORT_FILES,
  EXPLICIT_SUPPORT_PREFIXES,
  EXPLICIT_RUNNER_FILES,
} from './test-role-manifest.js';
import { STEP457_HISTORICAL_LEDGER_SNAPSHOTS } from './test-role-migration-step457.js';
import { STEP458_FALSE_POSITIVE_RUNNERS } from './test-runner-migration-step458.js';

for (const path of EXPLICIT_SUPPORT_FILES) {
  const source = await readFile(path, 'utf8');
  assert.equal(classifyTestFile({ path, source }).role, 'support', path);
}

for (const prefix of EXPLICIT_SUPPORT_PREFIXES) {
  const path = `${prefix}classification-probe.js`;
  assert.equal(classifyTestFile({ path, source: '' }).role, 'support', path);
}

for (const path of EXPLICIT_RUNNER_FILES) {
  assert.equal(classifyTestFile({ path, source: '' }).role, 'runner', path);
}

for (const path of STEP458_FALSE_POSITIVE_RUNNERS) {
  assert.equal(classifyTestFile({ path, source: '' }).role, 'gate', path);
}

assert.equal(classifyTestFile({
  path: 'v6/tests/ordinary-smoke.js',
  source: '',
}).role, 'gate');

assert.equal(classifyTestFile({
  path: STEP457_HISTORICAL_LEDGER_SNAPSHOTS[0],
  source: '',
}).role, 'quarantine');

assert.equal(classifyTestFile({
  path: 'v6/tests/current-ledger-routing-smoke.js',
  source: "await readFile('v6/TODO.md', 'utf8');",
}).role, 'gate');

console.log('v6 explicit support classification Step 457 smoke passed');
