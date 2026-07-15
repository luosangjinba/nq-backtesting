import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import {
  STEP459_BROWSER_LOCAL_FILES,
  STEP459_BROWSER_SERVICE_FILES,
  STEP459_NODE_SERVICE_FILES,
  STEP459_NODE_FALSE_POSITIVES,
  findExplicitTestEnvironment,
} from './test-environment-migration-step459.js';
import { classifyTestFile } from './test-catalog-domain.js';

assert.equal(STEP459_BROWSER_LOCAL_FILES.length, 173);
assert.equal(STEP459_BROWSER_SERVICE_FILES.length, 1);
assert.equal(STEP459_NODE_SERVICE_FILES.length, 1);
assert.equal(STEP459_NODE_FALSE_POSITIVES.length, 18);

const all = [
  ...STEP459_BROWSER_LOCAL_FILES,
  ...STEP459_BROWSER_SERVICE_FILES,
  ...STEP459_NODE_SERVICE_FILES,
  ...STEP459_NODE_FALSE_POSITIVES,
];
assert.equal(new Set(all).size, 193);

for (const path of all) await access(path);

for (const path of STEP459_BROWSER_LOCAL_FILES) {
  assert.equal(findExplicitTestEnvironment(path), 'browser-local', path);
  assert.equal(classifyTestFile({ path, source: '' }).environment, 'browser-local', path);
}
for (const path of STEP459_BROWSER_SERVICE_FILES) {
  assert.equal(findExplicitTestEnvironment(path), 'browser-service', path);
  assert.equal(classifyTestFile({ path, source: '' }).environment, 'browser-service', path);
}
for (const path of STEP459_NODE_SERVICE_FILES) {
  assert.equal(findExplicitTestEnvironment(path), 'node-service', path);
  assert.equal(classifyTestFile({ path, source: '' }).environment, 'node-service', path);
}
for (const path of STEP459_NODE_FALSE_POSITIVES) {
  assert.equal(findExplicitTestEnvironment(path), null, path);
  assert.equal(classifyTestFile({ path, source: '' }).environment, 'node', path);
}

assert.deepEqual(STEP459_BROWSER_SERVICE_FILES, [
  'v6/tests/unified-target-history-real-api-browser-step400-smoke.js',
]);
assert.equal(
  STEP459_BROWSER_LOCAL_FILES.includes(
    'v6/tests/display-timeframe-target-materialization-browser-closeout-step336-static-smoke.js',
  ),
  false,
);
assert.equal(
  STEP459_NODE_FALSE_POSITIVES.includes(
    'v6/tests/display-timeframe-target-materialization-browser-closeout-step336-static-smoke.js',
  ),
  true,
);

console.log('v6 explicit test environment audit Step 459 smoke passed');
