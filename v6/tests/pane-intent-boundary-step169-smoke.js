import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PANE_COMMANDS, PANE_EVENTS } from '../src/contracts/app-contracts.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneStore } from '../src/panes/pane-store.js';

assert.equal(PANE_COMMANDS.SET_SYMBOL_INTENT, 'pane.setSymbolIntent');
assert.equal(PANE_COMMANDS.SET_INTERVAL_INTENT, 'pane.setIntervalIntent');
assert.equal(PANE_EVENTS.SYMBOL_INTENT_CHANGED, 'pane:symbolIntentChanged');
assert.equal(PANE_EVENTS.INTERVAL_INTENT_CHANGED, 'pane:intervalIntentChanged');

const store = createPaneStore({
  initialPanes: [
    createPaneRecord({ active: true, displayTimeframe: 1, id: 'main', instrument: 'NQ' }),
    createPaneRecord({ active: false, displayTimeframe: 5, id: 'review', instrument: 'ES' }),
  ],
});

const changedSymbol = store.setSymbolIntent('review', 'ym');
assert.equal(changedSymbol.instrument, 'YM');
assert.equal(changedSymbol.displayTimeframe, 5);
assert.equal(store.getPane('main').instrument, 'NQ');

const changedInterval = store.setIntervalIntent('review', 15);
assert.equal(changedInterval.instrument, 'YM');
assert.equal(changedInterval.displayTimeframe, 15);
assert.equal(store.getPane('main').displayTimeframe, 1);

const paneRuntimeSource = fs.readFileSync(
  new URL('../src/panes/pane-runtime.js', import.meta.url),
  'utf8',
);
const paneStoreSource = fs.readFileSync(
  new URL('../src/panes/pane-store.js', import.meta.url),
  'utf8',
);
const paneSources = `${paneRuntimeSource}\n${paneStoreSource}`;

const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'replayCursor',
  'barDataRuntime',
  'chartEngine',
];

for (const token of forbiddenTokens) {
  assert.equal(paneSources.includes(token), false, `pane intent boundary must not contain ${token}`);
}

const doc = fs.readFileSync(
  new URL('../docs/V6_SYMBOL_INTERVAL_SYNC_BOUNDARY_STEP168.md', import.meta.url),
  'utf8',
);
assert.match(doc, /Required before implementation:\n\n- explicit pane-local symbol intent;/);
assert.match(doc, /explicit pane-local interval or display-timeframe intent/);

console.log('v6 pane intent boundary step 169 smoke passed');
