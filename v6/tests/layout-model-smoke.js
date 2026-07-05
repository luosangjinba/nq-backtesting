import assert from 'node:assert/strict';
import { createPaneRecord } from '../src/panes/pane-model.js';
import {
  createLayoutRecord,
  setLayoutActivePane,
  setLayoutMode,
  setLayoutSync,
} from '../src/layout/layout-model.js';
import { createLayoutStore } from '../src/layout/layout-store.js';

const left = createPaneRecord({
  active: true,
  id: 'pane-left',
  instrument: 'NQ',
});
const right = createPaneRecord({
  active: false,
  displayTimeframe: 5,
  id: 'pane-right',
  instrument: 'NQ',
});

const layout = createLayoutRecord({
  activePaneId: 'pane-left',
  mode: 'twice',
  panes: [left, right],
  sync: { crosshair: true, interval: false },
});

assert.deepEqual(layout, {
  activePaneId: 'pane-left',
  mode: 'twice',
  panes: [
    { ...left, active: true },
    { ...right, active: false },
  ],
  sync: {
    crosshair: true,
    dateRange: false,
    interval: false,
    symbol: false,
    time: false,
  },
});

const activeRight = setLayoutActivePane(layout, 'pane-right');
assert.equal(activeRight.activePaneId, 'pane-right');
assert.equal(activeRight.panes.find((pane) => pane.id === 'pane-left').active, false);
assert.equal(activeRight.panes.find((pane) => pane.id === 'pane-right').active, true);

const triple = setLayoutMode(activeRight, 'triple');
assert.equal(triple.mode, 'triple');
assert.deepEqual(setLayoutSync(triple, 'interval', true).sync.interval, true);

assert.throws(() => setLayoutMode(layout, 'grid'), /Unsupported/);
assert.throws(() => setLayoutActivePane(layout, 'missing'), /does not exist/);
assert.throws(() => createLayoutRecord({ panes: [left, left] }), /Duplicate/);

const store = createLayoutStore({ panes: [left, right] });
assert.equal(store.snapshot().activePaneId, 'pane-left');
assert.equal(store.setActivePane('pane-right').activePaneId, 'pane-right');
assert.equal(store.setMode('twice').mode, 'twice');
assert.equal(store.setSync('time', true).sync.time, true);

console.log('v6 layout model smoke passed');
