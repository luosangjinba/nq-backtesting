import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selectionDoc = await readFile('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP159.md', 'utf8');
const todoDoc = await readFile('v6/TODO.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const layoutMenuControlSource = await readFile('v6/src/shell/layout-menu-control.js', 'utf8');
const layoutRuntimeSource = await readFile('v6/src/layout/layout-runtime.js', 'utf8');
const topToolbarSmoke = await readFile('v6/tests/top-toolbar-parity-browser-smoke.js', 'utf8');

assert.match(selectionDoc, /Layout Menu Owner Binding/);
assert.match(selectionDoc, /LAYOUT_COMMANDS\.SET_MODE/);
assert.match(selectionDoc, /LAYOUT_COMMANDS\.SET_SYNC/);
assert.match(selectionDoc, /Shell\/UI controller owns DOM events/);
assert.match(selectionDoc, /Layout runtime owns layout mode, active pane, and sync flags/);
assert.match(selectionDoc, /Pane\/chart surface behavior remains unchanged in Step 160/);
assert.match(selectionDoc, /Do not implement actual chart pane reflow or new chart host creation/);
assert.match(selectionDoc, /Do not sync symbol, interval, crosshair, time, or date range behavior across\s+charts yet/);
assert.match(selectionDoc, /Do not mutate chart-data, chart-viewport, chart-engine, chart-history,\s+replay, or bar-data state from shell code/);
assert.match(selectionDoc, /Step 158 chart foundation integration re-audit still passes/);

assert.match(todoDoc, /Latest completed step: Step 162 - Layout Pane Data Bootstrap Boundary/);
assert.match(todoDoc, /Step 163 - Pane-Local Reset View Controls/);
assert.match(todoDoc, /preserve Step 162 layout pane data bootstrap/);
assert.match(todoDoc, /preserve Step 161 layout pane surface reflow/);
assert.match(todoDoc, /preserve Step 160 layout menu owner binding/);
assert.match(guardrailsDoc, /These controls stay inert until layout\/pane sync ownership exists/);
assert.match(shellSource, /data-v6-layout-menu-details/);
assert.doesNotMatch(shellSource, /class="layout-option[^"]*" disabled/);
assert.doesNotMatch(shellSource, /data-v6-layout-sync="[^"]+"[^>]*disabled/);
assert.match(layoutMenuControlSource, /LAYOUT_COMMANDS\.SET_MODE/);
assert.match(layoutMenuControlSource, /LAYOUT_COMMANDS\.SET_SYNC/);
assert.match(layoutMenuControlSource, /LAYOUT_COMMANDS\.GET_SNAPSHOT/);
assert.doesNotMatch(layoutMenuControlSource, /CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|BAR_DATA_COMMANDS|REPLAY_COMMANDS/);
assert.match(layoutRuntimeSource, /LAYOUT_COMMANDS\.SET_MODE/);
assert.match(layoutRuntimeSource, /LAYOUT_COMMANDS\.SET_SYNC/);
assert.match(layoutRuntimeSource, /LAYOUT_COMMANDS\.GET_SNAPSHOT/);
assert.match(topToolbarSmoke, /layoutSyncDisabled/);
assert.match(topToolbarSmoke, /\[false, false, false, false, false\]/);

for (const forbidden of [
  'Order',
  'Calendar',
  'simulated trading',
  'comparison symbols',
  'overlays',
]) {
  assert.match(selectionDoc, new RegExp(`Do not .*${forbidden}|${forbidden}.*Non-goals|${forbidden}`, 'i'));
}

console.log('v6 chart foundation next slice selection step 159 smoke passed');
