import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { classifyTestFile } from './test-catalog-domain.js';
import { TEST_ENVIRONMENTS, TEST_ROLES } from './canonical-test-manifest.js';

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await listJavaScriptFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files.sort();
}

const files = await listJavaScriptFiles('v6/tests');
const catalog = [];
for (const path of files) {
  const source = await readFile(path, 'utf8');
  const entry = classifyTestFile({ path, source });
  assert.equal(TEST_ENVIRONMENTS.includes(entry.environment), true, path);
  assert.equal(TEST_ROLES.includes(entry.role), true, path);
  if (/^import .*?(browser-cdp-client|v6-browser-harness)/m.test(source)) {
    assert.notEqual(entry.environment, 'node', `${path} lost its browser environment`);
  }
  catalog.push(entry);
}

assert.equal(new Set(catalog.map(({ path }) => path)).size, files.length);
assert.equal(catalog.length, files.length);

const summary = Object.fromEntries(TEST_ENVIRONMENTS.map((environment) => [
  environment,
  catalog.filter((entry) => entry.environment === environment).length,
]));
console.log(JSON.stringify({ coverage: 'exhaustive-classification', summary, total: catalog.length }, null, 2));
console.log('v6 canonical test catalog smoke passed');
