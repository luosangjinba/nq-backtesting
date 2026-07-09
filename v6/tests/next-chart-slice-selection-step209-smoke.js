import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP209.md');
const step208Doc = await read('v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md');
const paneStatusReadout = await read('v6/src/shell/pane-status-readout.js');
const paneStatusSmoke = await read('v6/tests/pane-status-readout-step183-smoke.js');

[
  'Pane-Local Symbol/TF/OHLC Header State Sync',
  'not a symbol picker',
  'not a symbol picker, interval editor, custom',
  'Do not implement custom intervals',
  'Do not implement interval sync behavior',
  'Do not implement indicator UI',
  'Do not implement trading',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(doc, /Step 206 added an explicit target pane id/);
assert.match(doc, /Step 207 connected chart-surface pane activation/);
assert.match(doc, /Step 208 synced the visible top-toolbar timeframe text/);
assert.match(step208Doc, /switching panes does not project/);

assert.match(doc, /Pane runtime owns pane identity and pane intent state/);
assert.match(doc, /Chart surface owns crosshair-selected bar payloads/);
assert.match(doc, /Shell pane-status readout owns DOM text/);
assert.match(doc, /Chart-data runtime remains the only owner that writes bar series data/);

assert.match(paneStatusReadout, /PANE_EVENTS\.SYMBOL_INTENT_CHANGED/);
assert.match(paneStatusReadout, /PANE_EVENTS\.DISPLAY_TIMEFRAME_CHANGED/);
assert.match(paneStatusReadout, /CHART_SURFACE_EVENTS\.CROSSHAIR_CHANGED/);
assert.match(paneStatusReadout, /renderPaneReadout/);
assert.match(paneStatusSmoke, /secondary\.text\('\[data-v6-status-symbol\]'\)/);
assert.match(paneStatusSmoke, /secondary\.dataset\.statusCandleDirection/);

console.log('v6 next chart slice selection step 209 smoke passed');
