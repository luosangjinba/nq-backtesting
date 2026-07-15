import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import {
  CANONICAL_TEST_MANIFEST,
  TEST_ENVIRONMENTS,
  TEST_ROLES,
} from './canonical-test-manifest.js';

assert.equal(CANONICAL_TEST_MANIFEST.schemaVersion, 1);
assert.equal(CANONICAL_TEST_MANIFEST.coverage, 'foundation-selection');
assert.equal(Object.isFrozen(CANONICAL_TEST_MANIFEST), true);

const ids = new Set();
const scripts = new Map();
for (const suite of CANONICAL_TEST_MANIFEST.suites) {
  assert.equal(ids.has(suite.id), false, `duplicate suite id: ${suite.id}`);
  ids.add(suite.id);
  assert.equal(TEST_ENVIRONMENTS.includes(suite.environment), true);
  assert.equal(TEST_ROLES.includes(suite.role), true);
  assert.equal(suite.scripts.length > 0, true);
  if (suite.role === 'quarantine') assert.equal(Boolean(suite.reason), true);
  for (const script of suite.scripts) {
    await access(script);
    const previous = scripts.get(script);
    assert.equal(previous, undefined, `${script} appears in both ${previous} and ${suite.id}`);
    scripts.set(script, suite.id);
  }
}

assert.equal(ids.has('architecture-boundary'), true);
assert.equal(ids.has('chart-engine-core'), true);
assert.equal(ids.has('chart-engine-browser'), true);
assert.equal(ids.has('historical-assertion-review'), true);

console.log('v6 canonical test manifest smoke passed');
