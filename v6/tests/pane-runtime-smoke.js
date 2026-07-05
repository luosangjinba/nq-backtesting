import assert from 'node:assert/strict';
import { PANE_COMMANDS, PANE_EVENTS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneStore } from '../src/panes/pane-store.js';

clearCommandsForTest();
clearEventsForTest();

const activeChangedEvents = [];
const displayTimeframeEvents = [];
const unsubscribeActive = subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, (payload) => {
  activeChangedEvents.push(payload);
});
const unsubscribeDisplayTimeframe = subscribeEvent(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, (payload) => {
  displayTimeframeEvents.push(payload);
});

const defaultPane = createPaneRecord({
  active: true,
  id: 'pane-default',
  instrument: 'NQ',
});
const reviewPane = createPaneRecord({
  active: false,
  displayTimeframe: 5,
  id: 'pane-review',
  instrument: 'ES',
});
const store = createPaneStore({
  initialPanes: [defaultPane, reviewPane],
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store }));
await registry.start({ emitEvent });

assert.equal(hasCommand(PANE_COMMANDS.GET_SNAPSHOT), true);
assert.equal(listenerCount(PANE_EVENTS.ACTIVE_CHANGED), 1);

const snapshot = await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT);
assert.deepEqual(snapshot, {
  activePaneId: 'pane-default',
  defaultPaneId: 'pane-default',
  panes: [
    defaultPane,
    reviewPane,
  ],
});

assert.equal((await dispatchCommand(PANE_COMMANDS.GET_ACTIVE)).id, 'pane-default');
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-review')).displayTimeframe, 5);
assert.equal((await dispatchCommand(PANE_COMMANDS.LIST)).length, 2);

const active = await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'pane-review');
assert.equal(active.id, 'pane-review');
assert.equal(active.active, true);
assert.equal(activeChangedEvents.length, 1);
assert.deepEqual(activeChangedEvents[0], active);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-default')).active, false);
assert.equal((await dispatchCommand(PANE_COMMANDS.LIST)).filter((pane) => pane.active).length, 1);

const changedTimeframe = await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  displayTimeframe: 15,
  paneId: 'pane-review',
});
assert.equal(changedTimeframe.id, 'pane-review');
assert.equal(changedTimeframe.active, true);
assert.equal(changedTimeframe.displayTimeframe, 15);
assert.equal(displayTimeframeEvents.length, 1);
assert.deepEqual(displayTimeframeEvents[0], changedTimeframe);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-default')).displayTimeframe, 1);

await assert.rejects(
  () => dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
    displayTimeframe: 0,
    paneId: 'pane-review',
  }),
  /displayTimeframe/
);

await assert.rejects(
  () => dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'missing-pane'),
  /does not exist/
);

await registry.stop();
assert.equal(hasCommand(PANE_COMMANDS.GET_SNAPSHOT), false);
unsubscribeActive();
unsubscribeDisplayTimeframe();
assert.equal(listenerCount(PANE_EVENTS.ACTIVE_CHANGED), 0);
assert.equal(listenerCount(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED), 0);

console.log('v6 pane runtime smoke passed');
