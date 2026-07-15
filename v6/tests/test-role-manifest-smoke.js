import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import {
  EXPLICIT_SUPPORT_FILES,
  EXPLICIT_SUPPORT_PREFIXES,
  EXPLICIT_RUNNER_FILES,
  hasExplicitRunnerRole,
  hasExplicitSupportRole,
} from './test-role-manifest.js';

assert.equal(EXPLICIT_SUPPORT_FILES.length, 5);
assert.equal(EXPLICIT_SUPPORT_PREFIXES.length, 2);
assert.equal(EXPLICIT_RUNNER_FILES.length, 1);
for (const path of EXPLICIT_SUPPORT_FILES) {
  await access(path);
  assert.equal(hasExplicitSupportRole(path), true);
}
assert.equal(hasExplicitSupportRole('v6/tests/helpers/v6-browser-harness.js'), true);
assert.equal(hasExplicitSupportRole('v6/tests/governance/helpers/replay/example.js'), true);
assert.equal(hasExplicitSupportRole('v6/tests/product-direction-smoke.js'), false);
assert.equal(hasExplicitSupportRole('v6/tests/not-helpers/example.js'), false);
for (const path of EXPLICIT_RUNNER_FILES) {
  await access(path);
  assert.equal(hasExplicitRunnerRole(path), true);
}
assert.equal(hasExplicitRunnerRole('v6/tests/ordinary-smoke.js'), false);

console.log('v6 explicit test role manifest smoke passed');
