import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { STEP456_TEST_TRIAGE } from './test-triage-manifest-step456.js';

assert.equal(STEP456_TEST_TRIAGE.length, 27);
assert.equal(Object.isFrozen(STEP456_TEST_TRIAGE), true);
assert.equal(new Set(STEP456_TEST_TRIAGE.map(({ path }) => path)).size, 27);
assert.deepEqual(
  [...new Set(STEP456_TEST_TRIAGE.map(({ disposition }) => disposition))].sort(),
  ['quarantine-superseded', 'refresh-current-contract'],
);

for (const entry of STEP456_TEST_TRIAGE) {
  await access(entry.path);
  assert.equal(Boolean(entry.reason), true, `${entry.path} requires a reason`);
  if (entry.disposition === 'quarantine-superseded') {
    assert.equal(Boolean(entry.successor), true, `${entry.path} requires successor coverage`);
    await access(entry.successor);
  }
}

assert.equal(
  STEP456_TEST_TRIAGE.filter(({ disposition }) => disposition === 'quarantine-superseded').length,
  5,
);
assert.equal(
  STEP456_TEST_TRIAGE.filter(({ disposition }) => disposition === 'refresh-current-contract').length,
  22,
);

console.log('v6 Step 456 test triage manifest smoke passed');
