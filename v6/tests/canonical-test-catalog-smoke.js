import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TEST_ENVIRONMENTS, TEST_ROLES } from './canonical-test-manifest.js';
import { loadTestCatalog } from './test-catalog-loader.js';

const catalog = await loadTestCatalog();
for (const entry of catalog) {
  const source = await readFile(entry.path, 'utf8');
  const path = entry.path;
  assert.equal(TEST_ENVIRONMENTS.includes(entry.environment), true, path);
  assert.equal(TEST_ROLES.includes(entry.role), true, path);
  if (/^import .*?(browser-cdp-client|v6-browser-harness)/m.test(source)) {
    assert.notEqual(entry.environment, 'node', `${path} lost its browser environment`);
  }
}

assert.equal(new Set(catalog.map(({ path }) => path)).size, catalog.length);

const summary = Object.fromEntries(TEST_ENVIRONMENTS.map((environment) => [
  environment,
  catalog.filter((entry) => entry.environment === environment).length,
]));
const roleSummary = Object.fromEntries(TEST_ROLES.map((role) => [
  role,
  catalog.filter((entry) => entry.role === role).length,
]));
console.log(JSON.stringify({
  coverage: 'exhaustive-classification',
  roleSummary,
  summary,
  total: catalog.length,
}, null, 2));
console.log('v6 canonical test catalog smoke passed');
