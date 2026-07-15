import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP252.md');
const todo = await read('v6/TODO.md');
const roadmap = await read('v6/docs/V6_EXECUTION_ROADMAP.md');
const step251Doc = await read('v6/docs/V6_MULTI_PANE_ACTIVE_FOCUS_CHAIN_STEP251.md');
const chartPack = await read('v6/tests/chart-browser-regression-pack.js');
const replayPack = await read('v6/tests/replay-transport-chain-regression-pack-step245-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Multi-Pane Chart Foundation Regression Pack',
  'pane data bootstrap should create visible pane-local chart data',
  'replay append should update all visible panes',
  'replay viewport projection should stay pane-local',
  'leftward history should remain pane-isolated',
  'pane-local reset view should target the intended pane',
  'maximize/restore should preserve active pane',
  'display-timeframe commands should target the active pane',
  'Layout runtime owns layout mode',
  'Pane runtime owns pane records',
  'Chart surface owns chart host lifecycle',
  'Chart-data runtime owns pane-local bar records',
  'Chart viewport owns pane-local viewport intent',
  'Replay runtime owns cursor/reveal state',
  'Bar-data runtime remains the only owner that requests and caches bars',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 252 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 253 - Multi-Pane Chart Foundation Regression Pack/);
assert.match(roadmap, /primary\/non-primary multi-pane confusion/);
const normalizedStep251Doc = step251Doc.replace(/\s+/g, ' ');
assert.match(normalizedStep251Doc, /Multi-Pane Active Focus Chain Gate/);
assert.match(normalizedStep251Doc, /display-timeframe command targeting/);

for (const filename of [
  'layout-pane-data-bootstrap-browser-step162-smoke.js',
  'multi-pane-replay-append-browser-step156-smoke.js',
  'multi-pane-replay-viewport-projection-browser-step157-smoke.js',
  'pane-local-reset-controls-browser-step163-smoke.js',
  'pane-maximize-state-browser-step185-smoke.js',
  'maximized-restore-control-browser-step186-smoke.js',
  'display-timeframe-active-pane-ui-state-browser-step208-smoke.js',
  'multi-pane-active-focus-chain-browser-step251-smoke.js',
]) {
  const expected = filename === 'maximized-restore-control-browser-step186-smoke.js'
    ? 'maximize-restore-control-browser-step186-smoke.js'
    : filename;
  assert.match(chartPack, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const filename of [
  'manual-previous-transport-multi-pane-browser-step243-smoke.js',
  'display-timeframe-leftward-auto-chain-browser-smoke.js',
  'layout-pane-data-bootstrap-browser-step162-smoke.js',
  'pane-local-reset-controls-browser-step163-smoke.js',
  'display-timeframe-target-pane-browser-step206-smoke.js',
]) {
  assert.match(replayPack, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 chart foundation next slice selection step 252 smoke passed');
