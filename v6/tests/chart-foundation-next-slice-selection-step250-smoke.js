import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP250.md');
const todo = await read('v6/TODO.md');
const roadmap = await read('v6/docs/V6_EXECUTION_ROADMAP.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const step249Doc = await read('v6/docs/V6_DRAG_SCROLL_DISPLAY_STABILITY_REAUDIT_STEP249.md');
const activeOutline = await read('v6/tests/pane-active-visual-outline-browser-smoke.js');
const activeBridge = await read('v6/tests/pane-active-surface-bridge-step207-smoke.js');
const displayActive = await read('v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js');
const paneHeader = await read('v6/tests/pane-local-header-state-browser-step210-smoke.js');
const topSymbol = await read('v6/tests/top-symbol-active-pane-browser-step212-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Multi-Pane Active Focus Chain Gate',
  'visible marker for the active/focused pane',
  'clicking or pointer-focusing a pane must update the active pane owner',
  'top toolbar symbol and timeframe presentation must mirror the active pane',
  'pane-local symbol, timeframe, and OHLC readouts must remain isolated',
  'display-timeframe commands must target the active pane',
  'Chart surface owns chart host pointer activation',
  'Pane runtime owns active pane state',
  'Shell top toolbar owns read-only symbol/timeframe presentation',
  'Display-timeframe control owns shell UI state and command target selection',
  'Pane status readout owns pane-local DOM presentation',
  'Chart-data runtime remains the only owner that writes pane-local bar series',
  'Bar-data runtime remains the only owner that requests and caches bars',
  'Replay runtime remains the owner of replay cursor/reveal state',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 250 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 251 - Multi-Pane Active Focus Chain Gate/);
assert.match(todo, /active-pane focus\/readout/i);
assert.match(roadmap, /primary\/non-primary multi-pane confusion/);
assert.match(roadmap, /active pane id/);
assert.match(productDirection, /SMC\/ICT-style discretionary traders/);
assert.match(step249Doc, /drag\/scroll display stability/);

assert.match(activeOutline, /v6ChartPaneActive/);
assert.match(activeOutline, /boxShadow/);
assert.match(activeOutline, /SET_MODE, \{ mode: 'twice'/);
assert.match(activeBridge, /PANE_COMMANDS\.SET_ACTIVE/);
assert.match(activeBridge, /origin: 'pointerdown'/);
assert.match(displayActive, /getTargetPaneId\(\) !== 'secondary'/);
assert.match(displayActive, /afterApplyMain\.bars/);
assert.match(paneHeader, /PANE_COMMANDS\.SET_SYMBOL_INTENT/);
assert.match(paneHeader, /topToolbarTimeframe/);
assert.match(topSymbol, /__v6TopSymbolActivePaneBridge/);
assert.match(topSymbol, /afterActiveSymbol/);

console.log('v6 chart foundation next slice selection step 250 smoke passed');
