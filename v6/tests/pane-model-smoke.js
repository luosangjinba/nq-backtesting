import assert from 'node:assert/strict';
import {
  DEFAULT_PANE_ID,
  PANE_RECORD_KEYS,
  assertPaneRecordShape,
  createDefaultPaneRecord,
  createDefaultPaneRecords,
  createPaneRecord,
  normalizePaneDisplayTimeframe,
  normalizePaneInstrument,
} from '../src/panes/pane-model.js';
import { createPaneStore } from '../src/panes/pane-store.js';

const defaultPane = createDefaultPaneRecord();
assert.deepEqual(Object.keys(defaultPane).sort(), [...PANE_RECORD_KEYS].sort());
assert.deepEqual(defaultPane, {
  active: true,
  chartBarsRevision: 0,
  displayTimeframe: 1,
  id: DEFAULT_PANE_ID,
  instrument: 'NQ',
  viewportIntentRevision: 0,
});
assert.equal(assertPaneRecordShape(defaultPane), true);

const defaultPanes = createDefaultPaneRecords();
assert.deepEqual(defaultPanes.map((pane) => pane.id), ['main', 'secondary', 'tertiary']);
assert.deepEqual(defaultPanes.map((pane) => pane.active), [true, false, false]);

const inactivePane = createPaneRecord({
  active: false,
  chartBarsRevision: 2,
  displayTimeframe: 5,
  id: 'pane-review',
  instrument: 'es',
  viewportIntentRevision: 3,
});
assert.deepEqual(Object.keys(inactivePane).sort(), Object.keys(defaultPane).sort());
assert.equal(inactivePane.instrument, 'ES');
assert.equal(normalizePaneInstrument(' nq '), 'NQ');
assert.equal(normalizePaneDisplayTimeframe('15'), 15);
assert.equal(normalizePaneDisplayTimeframe('1D'), '1D');

const store = createPaneStore({
  initialPanes: [defaultPane, inactivePane],
});
assert.deepEqual(store.snapshot(), {
  activePaneId: DEFAULT_PANE_ID,
  defaultPaneId: DEFAULT_PANE_ID,
  panes: [
    defaultPane,
    { ...inactivePane, active: false },
  ],
});

const active = store.setActivePane('pane-review');
assert.deepEqual(active, { ...inactivePane, active: true });
assert.equal(store.getPane(DEFAULT_PANE_ID).active, false);
assert.equal(store.getActivePane().id, 'pane-review');
assert.equal(store.listPanes().filter((pane) => pane.active).length, 1);

const cloned = store.getActivePane();
cloned.instrument = 'MUTATED';
assert.equal(store.getActivePane().instrument, 'ES');

const changedSymbol = store.setSymbolIntent('pane-review', ' ym ');
assert.equal(changedSymbol.instrument, 'YM');
assert.equal(changedSymbol.displayTimeframe, 5);
assert.equal(store.getPane(DEFAULT_PANE_ID).instrument, 'NQ');

const changedInterval = store.setIntervalIntent('pane-review', 15);
assert.equal(changedInterval.instrument, 'YM');
assert.equal(changedInterval.displayTimeframe, 15);
assert.equal(store.getPane(DEFAULT_PANE_ID).displayTimeframe, 1);

assert.throws(
  () => createPaneRecord({ displayTimeframe: 0 }),
  /displayTimeframe/
);
assert.throws(
  () => store.setSymbolIntent('pane-review', ''),
  /instrument/
);
assert.throws(
  () => store.setIntervalIntent('pane-review', 0),
  /displayTimeframe/
);
assert.throws(
  () => store.setActivePane('missing-pane'),
  /does not exist/
);
assert.throws(
  () => assertPaneRecordShape({ ...defaultPane, extra: true }),
  /shape mismatch/
);

const defaultStore = createPaneStore();
assert.deepEqual(defaultStore.snapshot().panes.map((pane) => pane.id), ['main', 'secondary', 'tertiary']);
assert.equal(defaultStore.snapshot().activePaneId, 'main');
assert.equal(defaultStore.getPane('secondary').active, false);

console.log('v6 pane model smoke passed');
