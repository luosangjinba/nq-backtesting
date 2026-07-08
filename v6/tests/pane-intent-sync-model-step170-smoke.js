import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createIntervalIntentSyncPlan,
  createPaneIntentSyncPlan,
  createSymbolIntentSyncPlan,
} from '../src/pane-intent-sync/pane-intent-sync-model.js';

const layoutSnapshot = {
  panes: [{ id: 'main' }, { id: 'secondary' }, { id: 'tertiary' }],
  sync: {
    interval: true,
    symbol: true,
  },
  visiblePaneIds: ['main', 'secondary', 'tertiary'],
};
const paneSnapshot = {
  panes: [
    { displayTimeframe: 1, id: 'main', instrument: 'NQ' },
    { displayTimeframe: 5, id: 'secondary', instrument: 'ES' },
    { displayTimeframe: 1, id: 'tertiary', instrument: 'NQ' },
  ],
};

assert.deepEqual(createSymbolIntentSyncPlan({
  layoutSnapshot,
  paneSnapshot,
  sourcePane: paneSnapshot.panes[0],
}), {
  enabled: true,
  kind: 'symbol',
  sourcePaneId: 'main',
  sourceValue: 'NQ',
  targets: [
    { paneId: 'secondary', value: 'NQ' },
  ],
});

assert.deepEqual(createIntervalIntentSyncPlan({
  layoutSnapshot,
  paneSnapshot,
  sourcePane: paneSnapshot.panes[1],
}), {
  enabled: true,
  kind: 'interval',
  sourcePaneId: 'secondary',
  sourceValue: 5,
  targets: [
    { paneId: 'main', value: 5 },
    { paneId: 'tertiary', value: 5 },
  ],
});

assert.deepEqual(createSymbolIntentSyncPlan({
  layoutSnapshot: {
    ...layoutSnapshot,
    sync: { ...layoutSnapshot.sync, symbol: false },
  },
  paneSnapshot,
  sourcePane: paneSnapshot.panes[0],
}), {
  enabled: false,
  kind: 'symbol',
  sourcePaneId: 'main',
  sourceValue: 'NQ',
  targets: [],
});

assert.deepEqual(createPaneIntentSyncPlan({
  kind: 'interval',
  layoutSnapshot: {
    ...layoutSnapshot,
    visiblePaneIds: ['main', 'secondary'],
  },
  paneSnapshot,
  sourcePane: paneSnapshot.panes[1],
}).targets, [
  { paneId: 'main', value: 5 },
]);

assert.throws(
  () => createPaneIntentSyncPlan({ kind: 'crosshair' }),
  /Unsupported pane intent sync kind/,
);

const source = fs.readFileSync(
  new URL('../src/pane-intent-sync/pane-intent-sync-model.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent sync model must not contain ${token}`);
}

console.log('v6 pane intent sync model step 170 smoke passed');
