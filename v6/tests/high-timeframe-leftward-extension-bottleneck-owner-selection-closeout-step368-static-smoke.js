import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_BOTTLENECK_OWNER_SELECTION_STEP368.md',
  'utf8',
);
const selector = await readFile(
  'v6/tests/governance/helpers/chart-history/high-timeframe-leftward-extension-bottleneck-owner-selection.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-step368-smoke.js',
  'utf8',
);
const boundary = await readFile(
  'v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-boundary-step368-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_LEFTWARD_EXTENSION_BOTTLENECK_OWNER_SELECTION_STEP368\.md/);
assert.match(index, /target-history-real-chart-paint-visibility-measurement/);

assert.match(
  todo,
  /Latest completed HTF leftward extension bottleneck owner selection step:\s+Step 368/,
);
assert.match(todo, /### Step 368 - HTF Leftward Extension Bottleneck Owner Selection After Handoff Measurement/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /narrower-measurement-selected/);
assert.match(doc, /selectedPhase`: `browserPaintLagMs`/);
assert.match(doc, /ownerBoundary`: `chart-surface-browser-paint-measurement`/);
assert.match(doc, /nextSlice`: `target-history-real-chart-paint-visibility-measurement`/);
assert.match(doc, /Request sizing \/ target load is deferred/);
assert.match(doc, /Chart-data replacement is deferred/);
assert.match(doc, /Viewport reapply is deferred/);
assert.match(doc, /Visible apply lag \/ diagnostics readout is deferred/);
assert.match(doc, /Step 369 should implement/);

assert.match(selector, /selectHighTimeframeLeftwardExtensionBottleneckOwner/);
assert.match(selector, /rejectedOwnerCandidates/);
assert.match(selector, /target-history-real-chart-paint-visibility-measurement/);
assert.match(selector, /browser-paint-observation-window-dominates-with-low-runtime-costs/);
assert.match(smoke, /observedStep367/);
assert.match(smoke, /target-history-real-chart-paint-visibility-measurement/);
assert.match(boundary, /doesNotMatch\(selector, \/registerCommand\|dispatchCommand\|subscribeEvent/);

console.log('v6 high timeframe leftward extension bottleneck owner selection closeout step368 static smoke passed');
