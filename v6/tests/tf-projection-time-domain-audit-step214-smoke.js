import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function read(relativePath) {
  return readFile(relativePath, 'utf8');
}

async function collectJsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const audit = await read('v6/docs/V6_TF_PROJECTION_TIME_DOMAIN_UNIFICATION_AUDIT_STEP214.md');
const todo = await read('v6/TODO.md');

for (const required of [
  'SMC/ICT',
  'Step 215',
  'normalizeMinuteTimeframe',
  'normalizeUnixSeconds',
  'resolveDisplayBucketStart',
  'summarizeProjectionSource',
  'v6/src/chart-data-projection/chart-data-projection-domain.js',
  'v6/src/display-timeframe/display-timeframe-projection.js',
  'v6/src/default-wall/default-wall-pane-projection.js',
  'v6/src/chart-history/leftward-extension-planner.js',
  'v6/src/chart-history/leftward-history-extension-runtime.js',
  'v6/src/bar-data/bar-window.js',
  'v6/src/replay/replay-domain.js',
  'v6/src/panes/pane-model.js',
  'Do not rewrite projection behavior in Step 214',
]) {
  assert.match(audit, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 214 - TF \/ Projection \/ Time Domain Unification Readiness Audit/);

const jsFiles = await collectJsFiles('v6/src');
const projectionImplementations = [];

for (const file of jsFiles) {
  const source = await read(file);
  if (
    /function\s+(projectBarsToDisplayTimeframe|projectSourceBarsToChartData)\b/.test(source) ||
    /function\s+(bucketStart|resolveBucketStart)\b/.test(source)
  ) {
    projectionImplementations.push(file);
  }
}

projectionImplementations.sort();
assert.deepEqual(projectionImplementations, [
  'v6/src/chart-data-projection/chart-data-projection-domain.js',
]);

const localTimeframeNormalizers = [];
const sharedTimeDomainConsumers = [];
for (const file of jsFiles) {
  const source = await read(file);
  if (
    /function\s+normalize[A-Za-z]*Timeframe[A-Za-z]*\b/.test(source) ||
    /function\s+normalizePositiveInteger\b/.test(source)
  ) {
    localTimeframeNormalizers.push(file);
  }
  if (/from\s+['"]\.\.\/time-domain\/time-domain\.js['"]/.test(source)) {
    sharedTimeDomainConsumers.push(file);
  }
}

assert.equal(
  sharedTimeDomainConsumers.includes('v6/src/chart-data-projection/chart-data-projection-domain.js'),
  true,
  'chart-data-projection-domain must consume the shared time-domain helper after Step 215.',
);

for (const file of [
  'v6/src/bar-data/bar-window.js',
  'v6/src/chart-viewport/chart-viewport-runtime.js',
  'v6/src/chart-viewport/chart-viewport-store.js',
  'v6/src/chart-history/leftward-extension-planner.js',
  'v6/src/chart-history/leftward-history-extension-runtime.js',
  'v6/src/panes/pane-model.js',
  'v6/src/replay/replay-domain.js',
]) {
  assert.equal(sharedTimeDomainConsumers.includes(file), true, `${file} must consume the shared time-domain helper after Step 217.`);
  assert.match(audit, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.equal(
  localTimeframeNormalizers.includes('v6/src/bar-data/bar-window.js'),
  false,
  'bar-window must not carry a local timeframe normalizer after Step 218.',
);

console.log('v6 TF projection time domain audit step 214 smoke passed');
