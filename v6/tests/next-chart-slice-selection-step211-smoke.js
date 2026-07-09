import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP211.md');
const step208Doc = await read('v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md');
const step210Doc = await read('v6/docs/V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md');
const shell = await read('v6/src/shell/workstation-shell.js');
const displayBridge = await read('v6/src/shell/display-timeframe-pane-target-bridge.js');
const paneHeaderBrowser = await read('v6/tests/pane-local-header-state-browser-step210-smoke.js');

[
  'Top-Toolbar Active-Pane Symbol Presentation Sync',
  'read-only way',
  'Do not implement symbol search or symbol picker UI',
  'Do not implement comparison symbols',
  'Do not implement custom intervals',
  'Do not implement indicator UI',
  'Do not implement trading',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(doc, /Step 208 made the top-toolbar display timeframe mirror/);
assert.match(doc, /Step 210 then made per-pane symbol, timeframe,\s+and OHLC headers isolated/);
assert.match(step208Doc, /without dispatching\s+`DISPLAY_TIMEFRAME_COMMANDS\.APPLY`/);
assert.match(step210Doc, /symbol\/timeframe state/);
assert.match(step210Doc, /headers remain isolated/);

assert.match(shell, /data-v6-top-symbol/);
assert.match(shell, /<span class="top-symbol" data-v6-top-symbol>NQ<\/span>/);
assert.match(displayBridge, /PANE_EVENTS\.ACTIVE_CHANGED/);
assert.match(displayBridge, /PANE_COMMANDS\.GET_ACTIVE/);
assert.match(paneHeaderBrowser, /PANE_COMMANDS\.SET_SYMBOL_INTENT/);
assert.match(paneHeaderBrowser, /topToolbarTimeframe/);

assert.match(doc, /Pane runtime owns pane instrument and active pane state/);
assert.match(doc, /Shell top toolbar owns only DOM text/);
assert.match(doc, /Chart-data runtime remains the only owner that writes bar series data/);
assert.match(doc, /Bar-data runtime remains the only owner that requests and caches bars/);
assert.match(doc, /Replay runtime remains the owner of replay cursor/);

console.log('v6 next chart slice selection step 211 smoke passed');
