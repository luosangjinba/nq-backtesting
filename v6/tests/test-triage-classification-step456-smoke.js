import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';
import { STEP456_TEST_TRIAGE } from './test-triage-manifest-step456.js';

for (const entry of STEP456_TEST_TRIAGE) {
  const source = await readFile(entry.path, 'utf8');
  const classified = classifyTestFile({ path: entry.path, source });
  const expectedRole = entry.disposition === 'quarantine-superseded'
    ? 'quarantine'
    : 'gate';
  assert.equal(classified.role, expectedRole, entry.path);
}

console.log('v6 Step 456 test triage classification smoke passed');
