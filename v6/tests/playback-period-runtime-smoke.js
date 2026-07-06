import assert from 'node:assert/strict';
import {
  PANE_COMMANDS,
  PANE_EVENTS,
  PLAYBACK_PERIOD_COMMANDS,
  PLAYBACK_PERIOD_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneStore } from '../src/panes/pane-store.js';
import { createPlaybackPeriodRuntime } from '../src/playback-period/playback-period-runtime.js';
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

clearCommandsForTest();
clearEventsForTest();

const events = [];
const unsubscribeChanged = subscribeEvent(PLAYBACK_PERIOD_EVENTS.CHANGED, (payload) => {
  events.push(payload);
});

const store = createPaneStore({
  initialPanes: [
    createPaneRecord({
      active: true,
      displayTimeframe: 1,
      id: 'pane-default',
    }),
    createPaneRecord({
      active: false,
      displayTimeframe: 5,
      id: 'pane-review',
    }),
  ],
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store }));
registry.registerRuntime(createPlaybackPeriodRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(PANE_EVENTS.ACTIVE_CHANGED), 1);
assert.deepEqual(await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), {
  activeDisplayTimeframe: 1,
  activePaneId: null,
  period: '1m',
  sync: false,
});

const manualPeriod = await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, {
  period: '3m',
});
assert.equal(manualPeriod.period, '3m');
assert.equal(manualPeriod.sync, false);
assert.equal(events.at(-1).period, '3m');

const synced = await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_SYNC, {
  sync: true,
});
assert.deepEqual(synced, {
  activeDisplayTimeframe: 1,
  activePaneId: 'pane-default',
  period: '1m',
  sync: true,
});

await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'pane-review');
assert.deepEqual(await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), {
  activeDisplayTimeframe: 5,
  activePaneId: 'pane-review',
  period: '5m',
  sync: true,
});

await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  displayTimeframe: 15,
  paneId: 'pane-review',
});
assert.deepEqual(await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), {
  activeDisplayTimeframe: 15,
  activePaneId: 'pane-review',
  period: '15m',
  sync: true,
});

await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, {
  period: '30s',
});
assert.deepEqual(await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), {
  activeDisplayTimeframe: 15,
  activePaneId: 'pane-review',
  period: '30s',
  sync: false,
});

await assert.rejects(
  () => dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, {
    period: '2m',
  }),
  /Unsupported playback period/
);

await registry.stop();
assert.equal(hasCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE), false);
unsubscribeChanged();
assert.equal(listenerCount(PLAYBACK_PERIOD_EVENTS.CHANGED), 0);

console.log('v6 playback period runtime smoke passed');
