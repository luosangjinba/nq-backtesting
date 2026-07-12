import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_REAL_CHART_PAINT_VISIBILITY_STEP369.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-browser-step369-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-boundary-step369-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_LEFTWARD_EXTENSION_REAL_CHART_PAINT_VISIBILITY_STEP369\.md/);
assert.match(index, /drag-triggered HTF leftward-extension interaction measurement/);

assert.match(
  todo,
  /Latest completed HTF leftward extension real chart paint visibility step:\s+Step 369/,
);
assert.match(todo, /### Step 369 - HTF Leftward Extension Real Chart Paint Visibility Measurement/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /first paint stage/);
assert.match(doc, /`viewport-projected`/);
assert.match(doc, /real paint lag/);
assert.match(doc, /0\.0ms/);
assert.match(doc, /does not show a chart-surface or\s+browser-paint bottleneck/);
assert.match(doc, /Step 370 should measure the real drag-triggered HTF leftward-extension\s+interaction path/);

for (const field of [
  'canvasSignature',
  'signatureChangedFromBaseline',
  'realChartPaintVisibleLagMs',
  'seriesUpdateToFirstPaintMs',
  'harnessObservationWindowMs',
  'harnessMinusRealPaintMs',
]) {
  assert.match(browserSmoke, new RegExp(field));
  assert.match(boundarySmoke, new RegExp(field));
}

assert.match(browserSmoke, /label: '4h'[\s\S]*targetTimeframe: 240/);
assert.match(browserSmoke, /label: '8h'[\s\S]*targetTimeframe: 480/);
assert.match(browserSmoke, /label: '1D'[\s\S]*targetTimeframe: '1D'/);
assert.match(browserSmoke, /label: '1W'[\s\S]*targetTimeframe: '1W'/);
assert.match(boundarySmoke, /doesNotMatch\(browserSmoke, \/registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe leftward extension real chart paint visibility closeout step369 static smoke passed');
