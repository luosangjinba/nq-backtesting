import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createPaneIntentReloadIntent,
  createReloadIntentsFromPaneIntent,
  createReloadIntentsFromSyncApplied,
} from '../src/pane-intent-reload/pane-intent-reload-model.js';

assert.deepEqual(createPaneIntentReloadIntent({
  displayTimeframe: '5',
  instrument: ' nq ',
  paneId: 'main',
  reason: 'symbol',
  source: 'manual',
}), {
  displayTimeframe: 5,
  instrument: 'NQ',
  paneId: 'main',
  reason: 'symbol',
  source: 'manual',
});

assert.deepEqual(createReloadIntentsFromPaneIntent({
  pane: {
    displayTimeframe: 15,
    id: 'secondary',
    instrument: 'ES',
  },
  reason: 'interval',
}), [{
  displayTimeframe: 15,
  instrument: 'ES',
  paneId: 'secondary',
  reason: 'interval',
  source: 'pane-intent',
}]);

assert.deepEqual(createReloadIntentsFromSyncApplied({
  kind: 'symbol',
  sourcePaneId: 'main',
  targets: [
    { paneId: 'secondary', value: 'YM' },
    { paneId: 'tertiary', value: 'YM' },
  ],
}, {
  panes: [
    { displayTimeframe: 5, id: 'secondary', instrument: 'YM' },
    { displayTimeframe: 15, id: 'tertiary', instrument: 'YM' },
  ],
}), [
  {
    displayTimeframe: 5,
    instrument: 'YM',
    paneId: 'secondary',
    reason: 'symbol',
    source: 'pane-intent-sync',
  },
  {
    displayTimeframe: 15,
    instrument: 'YM',
    paneId: 'tertiary',
    reason: 'symbol',
    source: 'pane-intent-sync',
  },
]);

assert.throws(
  () => createPaneIntentReloadIntent({ displayTimeframe: 1, instrument: 'NQ', paneId: 'main', reason: 'crosshair' }),
  /Unsupported pane intent reload reason/,
);
assert.throws(
  () => createReloadIntentsFromSyncApplied({ kind: 'symbol', targets: [{ paneId: 'missing' }] }, { panes: [] }),
  /target pane "missing" is missing/,
);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-model.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload model must not contain ${token}`);
}

const doc = fs.readFileSync(
  new URL('../docs/V6_SYNCED_INTENT_RELOAD_BOUNDARY_STEP172.md', import.meta.url),
  'utf8',
);
assert.match(doc, /This record is not a bar-data request\./);
assert.match(doc, /No `BAR_DATA_COMMANDS\.LOAD_WINDOW`/);

console.log('v6 pane intent reload model step 172 smoke passed');
