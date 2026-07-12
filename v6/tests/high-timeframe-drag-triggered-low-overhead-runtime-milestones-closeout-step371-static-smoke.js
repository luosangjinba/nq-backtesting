import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_DRAG_TRIGGERED_LOW_OVERHEAD_RUNTIME_MILESTONES_STEP371.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-boundary-step371-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_DRAG_TRIGGERED_LOW_OVERHEAD_RUNTIME_MILESTONES_STEP371\.md/);
assert.match(index, /requestDelayMs=500/);
assert.match(index, /request scheduling policy selection as the next slice/);

assert.match(
  todo,
  /Latest completed HTF drag-triggered low-overhead milestone step:\s+Step 371/,
);
assert.match(todo, /### Step 372 - HTF Target-History Request Scheduling Policy Selection/);
assert.match(todo, /### Step 371 - HTF Drag-Triggered Low-Overhead Runtime Milestone Attribution/);
assert.match(todo, /460-536ms/);
assert.match(todo, /requestDelayMs=500/);

assert.match(handoff, /Worktree at handoff: clean after Step 371 closeout/);
assert.match(
  handoff,
  /Latest completed step: Step 371 - HTF Drag-Triggered Low-Overhead Runtime\s+Milestone Attribution/,
);
assert.match(handoff, /start with Step 372/);
assert.match(handoff, /Recommended next action is Step 372/);
assert.match(handoff, /460-536ms/);
assert.match(handoff, /requestDelayMs=500/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /inputToTargetFetchStartMs/);
assert.match(doc, /requestDelayMs=500/);
assert.match(doc, /Step 372 should select a bounded request scheduling policy/);
assert.match(doc, /460\.2ms/);
assert.match(doc, /536\.4ms/);
assert.match(doc, /target fetch duration is effectively zero/);
assert.match(doc, /fetch-to-chart-data and left-extension-to-readout are low/);
assert.match(doc, /source requests stay zero/);

for (const field of [
  'Input.dispatchMouseEvent',
  "type: 'mouseWheel'",
  'inputToTargetFetchStartMs',
  'targetFetchStartToEndMs',
  'fetchEndToChartDataMs',
  'chartDataToViewportMs',
  'viewportToLeftExtensionMs',
  'leftExtensionToReadoutMs',
  'postMarkerCanvasObservationMs',
  'sourceRequestCount',
  'targetRequestCount',
]) {
  assert.match(browserSmoke, new RegExp(field.replaceAll('.', '\\.')));
}

for (const field of [
  'Input.dispatchMouseEvent',
  "type: 'mouseWheel'",
  'target-fetch-ended',
  'chart-data-applied',
  'viewport-projected',
  'left-extension-loaded',
  'diagnostics-readout-visible',
  'postMarkerCanvasObservationMs',
]) {
  assert.match(boundarySmoke, new RegExp(field.replaceAll('.', '\\.')));
}

for (const pattern of [
  /label: '4h'[\s\S]*targetTimeframe: 240/,
  /label: '8h'[\s\S]*targetTimeframe: 480/,
  /label: '1D'[\s\S]*targetTimeframe: '1D'/,
  /label: '1W'[\s\S]*targetTimeframe: '1W'/,
]) {
  assert.match(browserSmoke, pattern);
  assert.match(boundarySmoke, pattern);
}

assert.match(boundarySmoke, /signatureChangedFromBaseline\|activeBaselineSignature\|mark/);
assert.match(boundarySmoke, /canvasSignature/);
assert.match(boundarySmoke, /doesNotMatch\(browserSmoke, \/registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe drag-triggered low-overhead runtime milestones closeout step371 static smoke passed');
