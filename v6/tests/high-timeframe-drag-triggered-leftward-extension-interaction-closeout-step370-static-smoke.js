import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_DRAG_TRIGGERED_LEFTWARD_EXTENSION_INTERACTION_STEP370.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-browser-step370-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-boundary-step370-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_DRAG_TRIGGERED_LEFTWARD_EXTENSION_INTERACTION_STEP370\.md/);
assert.match(index, /low-overhead runtime milestone attribution/);

assert.match(
  todo,
  /Latest completed HTF drag-triggered leftward extension measurement step:\s+Step 370/,
);
assert.match(todo, /### Step 371 - HTF Drag-Triggered Low-Overhead Runtime Milestone Attribution/);
assert.match(todo, /### Step 370 - HTF Drag-Triggered Leftward Extension Interaction Measurement/);

assert.match(handoff, /Worktree at handoff: clean after Step 370 closeout/);
assert.match(handoff, /Latest completed step: Step 370 - HTF Drag-Triggered Leftward Extension\s+Interaction Measurement/);
assert.match(handoff, /start with Step 371/);
assert.match(handoff, /Recommended next action is Step 371/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /inputAttemptIndex/);
assert.match(doc, /inputDeltaX/);
assert.match(doc, /input -> fetch/);
assert.match(doc, /first real wheel attempt triggered target-history loading/);
assert.match(doc, /target request duration was effectively zero/);
assert.match(doc, /include measurement\s+overhead/);
assert.match(doc, /Step 371 should implement low-overhead drag-triggered runtime milestone\s+attribution/);

for (const field of [
  'Input.dispatchMouseEvent',
  'inputAttemptIndex',
  'inputDeltaX',
  'inputToTargetFetchStartMs',
  'inputToLeftExtensionLoadedMs',
  'targetRequestMs',
  'chartDataReplacementMs',
  'viewportReapplyMs',
  'realChartPaintVisibleLagMs',
]) {
  assert.match(browserSmoke, new RegExp(field.replaceAll('.', '\\.')));
  assert.match(boundarySmoke, new RegExp(field.replaceAll('.', '\\.')));
}

assert.match(browserSmoke, /label: '4h'[\s\S]*targetTimeframe: 240/);
assert.match(browserSmoke, /label: '8h'[\s\S]*targetTimeframe: 480/);
assert.match(browserSmoke, /label: '1D'[\s\S]*targetTimeframe: '1D'/);
assert.match(browserSmoke, /label: '1W'[\s\S]*targetTimeframe: '1W'/);
assert.match(boundarySmoke, /doesNotMatch\(browserSmoke, \/registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe drag-triggered leftward extension interaction closeout step370 static smoke passed');
