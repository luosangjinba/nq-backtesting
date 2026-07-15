import assert from 'node:assert/strict';
import { CANONICAL_TEST_MANIFEST } from './canonical-test-manifest.js';
import { selectCanonicalGateScripts } from './canonical-test-runner-domain.js';

const all = selectCanonicalGateScripts(CANONICAL_TEST_MANIFEST);
const node = selectCanonicalGateScripts(CANONICAL_TEST_MANIFEST, { environment: 'node' });
const browser = selectCanonicalGateScripts(CANONICAL_TEST_MANIFEST, { environment: 'browser-local' });

assert.equal(all.length, 14);
assert.equal(node.length, 6);
assert.equal(browser.length, 8);
assert.deepEqual(all, [...node, ...browser]);
assert.equal(new Set(all.map(({ script }) => script)).size, all.length);
assert.equal(all.every(({ suiteId, script }) => Boolean(suiteId && script)), true);
assert.throws(
  () => selectCanonicalGateScripts(CANONICAL_TEST_MANIFEST, { environment: 'unknown' }),
  /Unsupported canonical test environment/,
);

console.log('v6 canonical test runner smoke passed');
