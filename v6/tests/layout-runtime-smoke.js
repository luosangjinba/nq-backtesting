import assert from 'node:assert/strict';
import {
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createLayoutRuntime } from '../src/layout/layout-runtime.js';
import { createLayoutStore } from '../src/layout/layout-store.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
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

const left = createPaneRecord({ active: true, id: 'pane-left', instrument: 'NQ' });
const right = createPaneRecord({ active: false, id: 'pane-right', instrument: 'NQ' });
const store = createLayoutStore({
  activePaneId: 'pane-left',
  panes: [left, right],
});

const modeEvents = [];
const activeEvents = [];
const syncEvents = [];
const unsubscribeMode = subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, (payload) => modeEvents.push(payload));
const unsubscribeActive = subscribeEvent(LAYOUT_EVENTS.ACTIVE_PANE_CHANGED, (payload) => activeEvents.push(payload));
const unsubscribeSync = subscribeEvent(LAYOUT_EVENTS.SYNC_CHANGED, (payload) => syncEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createLayoutRuntime({ store }));
await registry.start({ emitEvent });

assert.equal(hasCommand(LAYOUT_COMMANDS.GET_SNAPSHOT), true);
assert.equal((await dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT)).activePaneId, 'pane-left');

const twice = await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, { mode: 'twice' });
assert.equal(twice.mode, 'twice');
assert.equal(modeEvents.length, 1);

const activeRight = await dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, { paneId: 'pane-right' });
assert.equal(activeRight.activePaneId, 'pane-right');
assert.equal(activeRight.panes.find((pane) => pane.id === 'pane-left').active, false);
assert.equal(activeRight.panes.find((pane) => pane.id === 'pane-right').active, true);
assert.equal(activeEvents.length, 1);

const synced = await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'interval', value: true });
assert.equal(synced.sync.interval, true);
assert.equal(syncEvents.length, 1);

await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, { paneId: 'missing-pane' }),
  /does not exist/
);

await registry.stop();
assert.equal(hasCommand(LAYOUT_COMMANDS.GET_SNAPSHOT), false);
unsubscribeMode();
unsubscribeActive();
unsubscribeSync();

console.log('v6 layout runtime smoke passed');
