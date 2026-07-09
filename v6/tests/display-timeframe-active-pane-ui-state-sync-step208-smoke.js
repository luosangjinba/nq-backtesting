import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step208_display_timeframe_active_pane_ui_state_sync.md');
const control = await read('v6/src/shell/display-timeframe-control.js');
const bridge = await read('v6/src/shell/display-timeframe-pane-target-bridge.js');
const browserSmoke = await read('v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js');
const pack = await read('v6/tests/chart-browser-regression-pack.js');

[
  /setDisplayTimeframe/,
  /pane\.displayTimeframe/,
  /without dispatching\s+`DISPLAY_TIMEFRAME_COMMANDS\.APPLY`/,
  /switching panes does not project/,
  /Do not start custom intervals/,
].forEach((pattern) => assert.match(doc, pattern));

assert.match(index, /V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208\.md/);
assert.match(todo, /Latest completed roadmap step: Step 208 - Display-Timeframe Active Pane UI\s+State Sync/);
assert.match(todo, /Step 209 - Next Chart Slice Selection/);
assert.match(handoff, /Current V6 step state: Step 208 completed/);
assert.match(handoff, /Next planned step: Step 209 - Next Chart Slice Selection/);
assert.match(session, /3fbfce50/);
assert.match(session, /47d0fcba/);
assert.match(session, /50d17dd7/);

assert.match(control, /setDisplayTimeframe\(value\)/);
assert.match(bridge, /resolveDisplayTimeframeFromPane/);
assert.match(bridge, /setDisplayTimeframe\(displayTimeframe\)/);
assert.match(browserSmoke, /afterSwitchSecondary\.bars/);
assert.match(browserSmoke, /afterApplySecondary\.bars/);
assert.match(pack, /display-timeframe-active-pane-ui-state-browser-step208-smoke\.js/);

console.log('v6 display timeframe active pane UI state sync step 208 smoke passed');
