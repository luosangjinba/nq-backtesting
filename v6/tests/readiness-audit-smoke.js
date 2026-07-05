import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const V6_ROOT = path.resolve('v6');

async function fileExists(relativePath) {
  try {
    await readFile(path.join(V6_ROOT, relativePath), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function listSourceFiles(relativeRoot) {
  const root = path.join(V6_ROOT, relativeRoot);
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
}

const expectedOwnerRoots = [
  'src/replay',
  'src/bar-data',
  'src/chart-data',
  'src/chart-viewport',
  'src/panes',
  'src/persistence',
  'src/journal',
  'src/journal-persistence',
];

for (const root of expectedOwnerRoots) {
  const files = await listSourceFiles(root);
  assert.ok(files.length > 0, `${root} must have source files`);
}

const appSource = await readFile(path.join(V6_ROOT, 'src/app.js'), 'utf8');
const expectedRuntimeIds = [
  'createReplayRuntime',
  'createBarDataRuntime',
  'createChartDataRuntime',
  'createChartViewportRuntime',
  'createPaneRuntime',
  'createPersistenceRuntime',
  'createJournalRuntime',
  'createJournalPersistenceRuntime',
];
for (const runtimeFactory of expectedRuntimeIds) {
  assert.match(appSource, new RegExp(`registry\\.registerRuntime\\(${runtimeFactory}\\(\\)\\)`));
}

const expectedGateTests = [
  'tests/boundary-smoke.js',
  'tests/visible-latency-cache-hit-browser-smoke.js',
  'tests/mixed-timeframe-visible-latency-browser-smoke.js',
  'tests/multi-pane-chart-host-browser-smoke.js',
  'tests/multi-pane-manual-wall-browser-smoke.js',
  'tests/chart-viewport-pane-manual-isolation-smoke.js',
  'tests/display-timeframe-pane-isolation-smoke.js',
  'tests/journal-persistence-runtime-smoke.js',
];
for (const testFile of expectedGateTests) {
  assert.equal(await fileExists(testFile), true, `${testFile} must exist`);
}

const boundarySource = await readFile(path.join(V6_ROOT, 'tests/boundary-smoke.js'), 'utf8');
for (const boundaryKeyword of [
  'primaryState|secondaryState|nonPrimary|non-primary',
  'forbiddenReplayOwnershipPatterns',
  'forbiddenBarDataOwnershipPatterns',
  'forbiddenChartDataOwnershipPatterns',
  'forbiddenChartViewportOwnershipPatterns',
  'forbiddenPaneOwnershipPatterns',
  'forbiddenJournalOwnershipPatterns',
  'forbiddenJournalPersistenceOwnershipPatterns',
]) {
  assert.match(boundarySource, new RegExp(boundaryKeyword.replace(/[|]/g, '\\|')));
}

const latencySource = await readFile(path.join(V6_ROOT, 'tests/visible-latency-cache-hit-browser-smoke.js'), 'utf8');
assert.match(latencySource, /cache/i);
assert.match(latencySource, /visible/i);

const todoSource = await readFile(path.join(V6_ROOT, 'TODO.md'), 'utf8');
assert.match(todoSource, /Step 26 - V6 Readiness Audit/);
assert.match(todoSource, /visible K-line delay/);
assert.match(todoSource, /primary\/non-primary/);

console.log('v6 readiness audit smoke passed');
