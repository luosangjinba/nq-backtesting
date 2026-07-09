import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_PANE_LOCAL_DISPLAY_TIMEFRAME_UI_READINESS_STEP206.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step206_pane_local_display_timeframe_ui_readiness.md');
const displayControl = await read('v6/src/shell/display-timeframe-control.js');
const browserSmoke = await read('v6/tests/display-timeframe-target-pane-browser-step206-smoke.js');
const pack = await read('v6/tests/chart-browser-regression-pack.js');

[
  'target pane source',
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'paneId',
  'Do not add custom intervals',
  'Do not implement indicators or Pine Script',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(index, /V6_PANE_LOCAL_DISPLAY_TIMEFRAME_UI_READINESS_STEP206\.md/);
assert.match(todo, /Latest completed roadmap step: Step 206 - Pane-Local Display-Timeframe UI\s+Readiness/);
assert.match(todo, /Step 207 - Display-Timeframe Target Source Integration/);
assert.match(handoff, /Current V6 step state: Step 206 completed/);
assert.match(handoff, /Next planned step: Step 207 - Display-Timeframe Target Source Integration/);
assert.match(session, /6eeea7e8/);
assert.match(session, /c7ff5084/);
assert.match(session, /e5a05754/);

assert.match(displayControl, /setTargetPaneId/);
assert.match(displayControl, /getTargetPaneId/);
assert.match(displayControl, /paneId,/);
assert.match(displayControl, /ownerDocument/);
assert.match(browserSmoke, /setTargetPaneId\('secondary'\)/);
assert.match(browserSmoke, /afterMainPane\.displayTimeframe/);
assert.match(browserSmoke, /afterSecondaryPane\.displayTimeframe/);
assert.match(pack, /display-timeframe-target-pane-browser-step206-smoke\.js/);

console.log('v6 pane-local display timeframe UI readiness step 206 smoke passed');
