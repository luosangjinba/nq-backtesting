import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP205.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const displayControl = await read('v6/src/shell/display-timeframe-control.js');
const displayRuntime = await read('v6/src/display-timeframe/display-timeframe-runtime.js');
const paneIsolationSmoke = await read('v6/tests/display-timeframe-pane-isolation-smoke.js');

[
  'not full TF UI implementation',
  'Do not implement custom intervals',
  'Do not implement indicator UI or indicator rendering',
  'Do not implement layout sync',
].forEach((text) => assert.equal(doc.includes(text), true));
assert.match(doc, /Pane-Local Display-Timeframe UI\s+Readiness/);
assert.match(doc, /dispatch `DISPLAY_TIMEFRAME_COMMANDS\.APPLY` with `paneId`/);
assert.match(doc, /not indicator\s+work/);

assert.match(index, /V6_NEXT_CHART_SLICE_SELECTION_STEP205\.md/);
assert.match(todo, /Step 205 - Next Chart Slice Selection/);
assert.match(displayControl, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(displayControl, /displayTimeframe,/);
assert.doesNotMatch(displayControl, /paneId/);
assert.match(displayRuntime, /paneId\s*\?\s*await dispatchCommand\(PANE_COMMANDS\.GET_BY_ID, paneId\)/);
assert.match(displayRuntime, /await dispatchCommand\(PANE_COMMANDS\.GET_ACTIVE\)/);
assert.match(paneIsolationSmoke, /pane-left/);
assert.match(paneIsolationSmoke, /pane-right/);

console.log('v6 next chart slice selection step 205 smoke passed');
