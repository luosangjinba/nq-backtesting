import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_SOURCE_INTEGRATION_STEP207.md');
const index = await read('v6/docs/INDEX.md');
const todo = await read('v6/TODO.md');
const handoff = await read('v6/docs/V6_HANDOFF.md');
const session = await read('v6/sessions/session_20260708_step207_display_timeframe_target_source_integration.md');
const chartSurface = await read('v6/src/chart-engine/workstation-chart-surface.js');
const paneActiveBridge = await read('v6/src/chart-engine/pane-active-surface-bridge.js');
const displayTargetBridge = await read('v6/src/shell/display-timeframe-pane-target-bridge.js');
const app = await read('v6/src/app.js');
const browserSmoke = await read('v6/tests/display-timeframe-active-pane-browser-step207-smoke.js');
const pack = await read('v6/tests/chart-browser-regression-pack.js');

[
  /real\s+active pane source/,
  /subscribePaneActivation/,
  /PANE_COMMANDS\.SET_ACTIVE/,
  /PANE_EVENTS\.ACTIVE_CHANGED/,
  /Do not add custom intervals/,
  /Do not implement indicators or Pine Script/,
].forEach((pattern) => assert.match(doc, pattern));

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_SOURCE_INTEGRATION_STEP207\.md/);
assert.match(todo, /Latest completed roadmap step: Step 207 - Display-Timeframe Target Source\s+Integration/);
assert.match(todo, /Step 208 - Display-Timeframe Active Pane UI State Sync/);
assert.match(handoff, /Current V6 step state: Step 207 completed/);
assert.match(handoff, /Next planned step: Step 208 - Display-Timeframe Active Pane UI State Sync/);
assert.match(session, /485551f1/);
assert.match(session, /d00d2cec/);
assert.match(session, /dda22aa2/);

assert.match(chartSurface, /subscribePaneActivation/);
assert.match(chartSurface, /activePaneId/);
assert.match(paneActiveBridge, /PANE_COMMANDS\.SET_ACTIVE/);
assert.match(displayTargetBridge, /PANE_EVENTS\.ACTIVE_CHANGED/);
assert.match(displayTargetBridge, /PANE_COMMANDS\.GET_ACTIVE/);
assert.match(app, /connectPaneActiveSurfaceBridge/);
assert.match(app, /connectDisplayTimeframePaneTargetBridge/);
assert.match(browserSmoke, /PointerEvent\('pointerdown'/);
assert.match(browserSmoke, /afterSecondaryPane\.displayTimeframe/);
assert.match(pack, /display-timeframe-active-pane-browser-step207-smoke\.js/);

console.log('v6 display timeframe target source integration step 207 smoke passed');
