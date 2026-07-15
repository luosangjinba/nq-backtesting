import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  STEP459_BROWSER_LOCAL_FILES,
  STEP459_BROWSER_SERVICE_FILES,
  STEP459_NODE_SERVICE_FILES,
  STEP459_NODE_FALSE_POSITIVES,
  findExplicitTestEnvironment,
} from './test-environment-migration-step459.js';
import { classifyTestFile } from './test-catalog-domain.js';

assert.equal(STEP459_BROWSER_LOCAL_FILES.length, 174);
assert.equal(STEP459_BROWSER_SERVICE_FILES.length, 1);
assert.equal(STEP459_NODE_SERVICE_FILES.length, 1);
assert.equal(STEP459_NODE_FALSE_POSITIVES.length, 18);

const all = [
  ...STEP459_BROWSER_LOCAL_FILES,
  ...STEP459_BROWSER_SERVICE_FILES,
  ...STEP459_NODE_SERVICE_FILES,
  ...STEP459_NODE_FALSE_POSITIVES,
];
assert.equal(new Set(all).size, 194);

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

async function listJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await listJavaScriptFiles(child));
    else if (entry.name.endsWith('.js')) files.push(child);
  }
  return files;
}

const importCache = new Map();
async function readModule(pathname) {
  if (importCache.has(pathname)) return importCache.get(pathname);
  const source = await readFile(pathname, 'utf8');
  const imports = [];
  for (const match of source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    let importedPath = path.normalize(`${path.dirname(pathname)}/${match[1]}`).replaceAll('\\', '/');
    if (!path.extname(importedPath)) importedPath += '.js';
    try {
      await access(importedPath);
      imports.push(importedPath);
    } catch {
      // Non-JavaScript or optional imports do not participate in this audit.
    }
  }
  const module = { imports, source };
  importCache.set(pathname, module);
  return module;
}

async function reachesBrowserHarness(pathname, visited = new Set()) {
  if (visited.has(pathname)) return false;
  visited.add(pathname);
  if (/(?:browser-cdp-client|v6-browser-harness)\.js$/.test(pathname)) return true;
  const module = await readModule(pathname);
  for (const importedPath of module.imports) {
    if (await reachesBrowserHarness(importedPath, visited)) return true;
  }
  return false;
}

for (const pathname of await listJavaScriptFiles('v6/tests')) {
  if (!await reachesBrowserHarness(pathname)) continue;
  const environment = findExplicitTestEnvironment(pathname);
  assert.equal(
    environment === 'browser-local' || environment === 'browser-service',
    true,
    `${pathname} reaches the browser harness without explicit browser environment metadata`,
  );
}

console.log('v6 explicit test environment audit Step 459 smoke passed');
