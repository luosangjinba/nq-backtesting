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
const intervalIntentEvents = [];
const symbolIntentEvents = [];
const unsubscribeActive = subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, (payload) => {
  activeChangedEvents.push(payload);
});
const unsubscribeDisplayTimeframe = subscribeEvent(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, (payload) => {
  displayTimeframeEvents.push(payload);
});
const unsubscribeIntervalIntent = subscribeEvent(PANE_EVENTS.INTERVAL_INTENT_CHANGED, (payload) => {
  intervalIntentEvents.push(payload);
});
const unsubscribeSymbolIntent = subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, (payload) => {
  symbolIntentEvents.push(payload);
});

const defaultPane = createPaneRecord({
  active: true,
  id: 'main',
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
  activePaneId: 'main',
  defaultPaneId: 'main',
  panes: [
    defaultPane,
    reviewPane,
  ],
});

assert.equal((await dispatchCommand(PANE_COMMANDS.GET_ACTIVE)).id, 'main');
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-review')).displayTimeframe, 5);
assert.equal((await dispatchCommand(PANE_COMMANDS.LIST)).length, 2);

const active = await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'pane-review');
assert.equal(active.id, 'pane-review');
assert.equal(active.active, true);
assert.equal(activeChangedEvents.length, 1);
assert.deepEqual(activeChangedEvents[0], active);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'main')).active, false);
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
assert.equal(intervalIntentEvents.length, 1);
assert.deepEqual(intervalIntentEvents[0], changedTimeframe);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'main')).displayTimeframe, 1);

const changedSymbol = await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
  instrument: 'ym',
  paneId: 'pane-review',
});
assert.equal(changedSymbol.instrument, 'YM');
assert.equal(changedSymbol.displayTimeframe, 15);
assert.equal(symbolIntentEvents.length, 1);
assert.deepEqual(symbolIntentEvents[0], changedSymbol);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'main')).instrument, 'NQ');

const changedInterval = await dispatchCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, {
  displayTimeframe: 30,
  paneId: 'pane-review',
});
assert.equal(changedInterval.instrument, 'YM');
assert.equal(changedInterval.displayTimeframe, 30);
assert.equal(intervalIntentEvents.length, 2);
assert.deepEqual(intervalIntentEvents[1], changedInterval);
assert.equal(displayTimeframeEvents.length, 1);

await assert.rejects(
  () => dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
    displayTimeframe: 0,
    paneId: 'pane-review',
  }),
  /displayTimeframe/
);

await assert.rejects(
  () => dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
    instrument: '',
    paneId: 'pane-review',
  }),
  /instrument/
);

await assert.rejects(
  () => dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'missing-pane'),
  /does not exist/
);

await registry.stop();
assert.equal(hasCommand(PANE_COMMANDS.GET_SNAPSHOT), false);
unsubscribeActive();
unsubscribeDisplayTimeframe();
unsubscribeIntervalIntent();
unsubscribeSymbolIntent();
assert.equal(listenerCount(PANE_EVENTS.ACTIVE_CHANGED), 0);
assert.equal(listenerCount(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED), 0);
assert.equal(listenerCount(PANE_EVENTS.INTERVAL_INTENT_CHANGED), 0);
assert.equal(listenerCount(PANE_EVENTS.SYMBOL_INTENT_CHANGED), 0);

console.log('v6 pane runtime smoke passed');
