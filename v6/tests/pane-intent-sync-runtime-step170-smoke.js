import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LAYOUT_COMMANDS,
  PANE_COMMANDS,
  PANE_INTENT_SYNC_COMMANDS,
  PANE_INTENT_SYNC_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createLayoutRuntime } from '../src/layout/layout-runtime.js';
import { createLayoutStore } from '../src/layout/layout-store.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneStore } from '../src/panes/pane-store.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneIntentSyncRuntime } from '../src/pane-intent-sync/pane-intent-sync-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const panes = [
  createPaneRecord({ active: true, displayTimeframe: 1, id: 'main', instrument: 'NQ' }),
  createPaneRecord({ active: false, displayTimeframe: 5, id: 'secondary', instrument: 'ES' }),
  createPaneRecord({ active: false, displayTimeframe: 1, id: 'tertiary', instrument: 'NQ' }),
];
const paneStore = createPaneStore({ initialPanes: panes });
const layoutStore = createLayoutStore({
  mode: 'triple',
  panes,
  sync: {
    interval: true,
    symbol: true,
  },
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createLayoutRuntime({ store: layoutStore }));
registry.registerRuntime(createPaneIntentSyncRuntime());

const plannedEvents = [];
const appliedEvents = [];
const unsubscribePlanned = subscribeEvent(PANE_INTENT_SYNC_EVENTS.PLANNED, (plan) => {
  plannedEvents.push(plan);
});
const unsubscribeApplied = subscribeEvent(PANE_INTENT_SYNC_EVENTS.APPLIED, (record) => {
  appliedEvents.push(record);
});

async function waitForPlanCount(count) {
  const deadline = Date.now() + 1000;
  let state = await dispatchCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE);
  while (state.planCount < count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    state = await dispatchCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE);
  }
  return state;
}

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE), true);

await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
  instrument: 'YM',
  paneId: 'main',
});
await waitForPlanCount(1);
assert.deepEqual(plannedEvents.at(-1), {
  enabled: true,
  kind: 'symbol',
  sourcePaneId: 'main',
  sourceValue: 'YM',
  targets: [
    { paneId: 'secondary', value: 'YM' },
    { paneId: 'tertiary', value: 'YM' },
  ],
});
assert.deepEqual(appliedEvents.at(-1), {
  kind: 'symbol',
  sourcePaneId: 'main',
  sourceValue: 'YM',
  targets: [
    { paneId: 'secondary', value: 'YM' },
    { paneId: 'tertiary', value: 'YM' },
  ],
});

await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'symbol', value: false });
await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
  instrument: 'NQ',
  paneId: 'main',
});
await waitForPlanCount(2);
assert.equal(plannedEvents.at(-1).enabled, false);
assert.equal(plannedEvents.at(-1).kind, 'symbol');
assert.deepEqual(plannedEvents.at(-1).targets, []);

await dispatchCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, {
  displayTimeframe: 15,
  paneId: 'secondary',
});
await waitForPlanCount(3);
assert.deepEqual(plannedEvents.at(-1), {
  enabled: true,
  kind: 'interval',
  sourcePaneId: 'secondary',
  sourceValue: 15,
  targets: [
    { paneId: 'main', value: 15 },
    { paneId: 'tertiary', value: 15 },
  ],
});
assert.deepEqual(appliedEvents.at(-1), {
  kind: 'interval',
  sourcePaneId: 'secondary',
  sourceValue: 15,
  targets: [
    { paneId: 'main', value: 15 },
    { paneId: 'tertiary', value: 15 },
  ],
});

const state = await dispatchCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE);
assert.equal(state.status, 'applied');
assert.equal(state.planCount, 3);
assert.equal(state.appliedCount, 2);
assert.equal(state.lastPlan.kind, 'interval');
assert.equal(state.lastApplied.kind, 'interval');

const paneSnapshot = await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT);
assert.deepEqual(paneSnapshot.panes.map((pane) => [pane.id, pane.instrument, pane.displayTimeframe]), [
  ['main', 'NQ', 15],
  ['secondary', 'YM', 15],
  ['tertiary', 'YM', 15],
]);

await registry.stop();
unsubscribePlanned();
unsubscribeApplied();
assert.equal(hasCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-sync/pane-intent-sync-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent sync runtime must not contain ${token}`);
}

console.log('v6 pane intent sync runtime step 170 smoke passed');
