import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step210_pane_local_header_state_sync.md');
const readout = await read('v6/src/shell/pane-status-readout.js');
const unitSmoke = await read('v6/tests/pane-status-readout-step183-smoke.js');
const browserSmoke = await read('v6/tests/pane-local-header-state-browser-step210-smoke.js');
const pack = await read('v6/tests/chart-browser-regression-pack.js');

[
  'per-pane chart header state explicit',
  'data-v6-pane-active="true|false"',
  'without clearing or overwriting',
  'No symbol picker UI was added',
  'No custom intervals or interval sync behavior were added',
  'No indicator UI',
  'No trading',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(readout, /PANE_EVENTS\.ACTIVE_CHANGED/);
assert.match(readout, /dataset\.v6PaneActive/);
assert.match(readout, /updateActivePane/);
assert.match(unitSmoke, /PANE_EVENTS\.ACTIVE_CHANGED/);
assert.match(unitSmoke, /v6PaneActive/);
assert.match(browserSmoke, /PANE_COMMANDS\.SET_SYMBOL_INTENT/);
assert.match(browserSmoke, /PANE_COMMANDS\.SET_DISPLAY_TIMEFRAME/);
assert.match(browserSmoke, /PANE_COMMANDS\.SET_ACTIVE/);
assert.match(browserSmoke, /CHART_SURFACE_EVENTS\.CROSSHAIR_CHANGED/);
assert.match(pack, /pane-local-header-state-browser-step210-smoke\.js/);

assert.match(index, /V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210\.md/);
assert.match(todo, /Latest completed roadmap step: Step 210 - Pane-Local Symbol\/TF\/OHLC Header\s+State Sync/);
assert.match(todo, /Step 211 - Next Chart Slice Selection/);
assert.match(handoff, /Current V6 step state: Step 210 completed/);
assert.match(handoff, /Next planned step: Step 211 - Next Chart Slice Selection/);
assert.match(session, /a8a9eb1e/);
assert.match(session, /b3717f79/);

console.log('v6 pane-local header state sync step 210 smoke passed');
