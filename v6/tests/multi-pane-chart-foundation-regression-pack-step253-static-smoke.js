import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_REGRESSION_PACK_STEP253.md');
const pack = await read('v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP252.md');

const requiredMembers = [
  'layout-pane-data-bootstrap-browser-step162-smoke.js',
  'multi-pane-replay-append-browser-step156-smoke.js',
  'multi-pane-replay-viewport-projection-browser-step157-smoke.js',
  'multi-pane-leftward-history-browser-step155-smoke.js',
  'pane-local-reset-controls-browser-step163-smoke.js',
  'pane-maximize-state-browser-step185-smoke.js',
  'maximize-restore-control-browser-step186-smoke.js',
  'display-timeframe-active-pane-ui-state-browser-step208-smoke.js',
  'multi-pane-active-focus-chain-step251-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Multi-Pane Chart Foundation Regression Pack',
  'smaller than `v6/tests/chart-browser-regression-pack.js`',
  'Pane data bootstrap creates visible pane-local chart data',
  'Replay append updates visible panes',
  'Replay viewport projection remains pane-local',
  'Leftward history remains pane-isolated',
  'Pane-local reset targets the intended pane',
  'Maximize and restore preserve pane state',
  'Display-timeframe commands target the active pane',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 253 should implement \*\*Multi-Pane Chart Foundation Regression Pack\*\*/);
assert.match(todo, /Step 253 - Multi-Pane Chart Foundation Regression Pack/);
assert.match(todo, /Step 254 - Chart Foundation Next Slice Selection/);
assert.match(pack, /\[multi-pane-foundation-pack\] start/);
assert.match(pack, /\[multi-pane-foundation-pack\] passed/);

console.log('v6 multi-pane chart foundation regression pack step 253 static smoke passed');
