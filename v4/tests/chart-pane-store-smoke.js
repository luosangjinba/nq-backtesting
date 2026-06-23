import assert from 'node:assert/strict';

import {
  CHART_PANE_IDS,
  CHART_PANE_LAYOUTS,
  getActivePane,
  getChartPaneState,
  getSyncPeerPanes,
  resetChartPaneStoreForTests,
  setActivePane,
  setChartPaneLayout,
  setPaneSyncEnabled,
  togglePaneSync,
  updatePaneDescriptor,
} from '../src/chart-panes/chart-pane-store.js';

resetChartPaneStoreForTests();

let state = getChartPaneState();
assert.equal(state.layout, CHART_PANE_LAYOUTS.SINGLE);
assert.equal(state.activePaneId, CHART_PANE_IDS.PRIMARY);
assert.equal(state.panes.length, 2);
assert.equal(getActivePane().id, CHART_PANE_IDS.PRIMARY);

state = setChartPaneLayout(CHART_PANE_LAYOUTS.TWO_COLUMN);
assert.equal(state.layout, CHART_PANE_LAYOUTS.TWO_COLUMN);
assert.equal(state.panes.find((pane) => pane.id === CHART_PANE_IDS.PRIMARY).layoutSlot, 'left');
assert.equal(state.panes.find((pane) => pane.id === CHART_PANE_IDS.COMPARISON).layoutSlot, 'right');

const activeComparison = setActivePane(CHART_PANE_IDS.COMPARISON);
assert.equal(activeComparison.id, CHART_PANE_IDS.COMPARISON);
assert.equal(getActivePane().id, CHART_PANE_IDS.COMPARISON);

const updated = updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, {
  instrument: 'nq',
  timeframe: 1,
  visibleRange: { from: 10, to: 20 },
});
assert.equal(updated.instrument, 'NQ');
assert.equal(updated.timeframe, 1);
assert.deepEqual(updated.visibleRange, { from: 10, to: 20 });

assert.deepEqual(
  getSyncPeerPanes(CHART_PANE_IDS.COMPARISON).map((pane) => pane.id),
  [CHART_PANE_IDS.PRIMARY],
  'two sync-enabled panes should see each other as peers'
);

setPaneSyncEnabled(CHART_PANE_IDS.PRIMARY, false);
assert.deepEqual(getSyncPeerPanes(CHART_PANE_IDS.COMPARISON), []);
assert.deepEqual(getSyncPeerPanes(CHART_PANE_IDS.PRIMARY), []);

setPaneSyncEnabled(CHART_PANE_IDS.COMPARISON, false);
assert.deepEqual(getSyncPeerPanes(CHART_PANE_IDS.PRIMARY), []);
assert.deepEqual(getSyncPeerPanes(CHART_PANE_IDS.COMPARISON), []);

const toggled = togglePaneSync(CHART_PANE_IDS.PRIMARY);
assert.equal(toggled.syncEnabled, true);
assert.deepEqual(getSyncPeerPanes(CHART_PANE_IDS.PRIMARY), []);

console.log('chart pane store smoke passed');
