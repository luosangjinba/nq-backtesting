import assert from 'node:assert/strict';
import {
  APP_COMMANDS,
  APP_EVENTS,
  BAR_DATA_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import { createAppRuntime } from '../src/runtime/app-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  listCommands,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
const bootEvents = [];
const unsubscribeBoot = subscribeEvent(APP_EVENTS.BOOTED, (payload) => {
  bootEvents.push(payload);
});

registry.registerRuntime(createAppRuntime());
registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async () => ({ bars: [] }),
}));
registry.registerRuntime(createReplayRuntime());
assert.deepEqual(registry.snapshot(), {
  running: false,
  runtimes: ['runtime.app', 'runtime.session', 'runtime.pane', 'runtime.bar-data', 'runtime.replay'],
  started: [],
});

await registry.start({ emitEvent });

assert.equal(listenerCount(APP_EVENTS.BOOTED), 1);
assert.equal(bootEvents.length, 1);
assert.equal(bootEvents[0].booted, true);
assert.equal(hasCommand(APP_COMMANDS.GET_STATUS), true);
assert.deepEqual(listCommands(), [
  APP_COMMANDS.GET_STATUS,
  BAR_DATA_COMMANDS.GET_CACHE_SUMMARY,
  BAR_DATA_COMMANDS.GET_WINDOW,
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  BAR_DATA_COMMANDS.PLAN_WINDOW,
  BAR_DATA_COMMANDS.RELEASE_WINDOW,
  PANE_COMMANDS.GET_ACTIVE,
  PANE_COMMANDS.GET_BY_ID,
  PANE_COMMANDS.GET_SNAPSHOT,
  PANE_COMMANDS.LIST,
  PANE_COMMANDS.SET_ACTIVE,
  REPLAY_COMMANDS.GET_STATE,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.NEXT,
  REPLAY_COMMANDS.PAUSE,
  REPLAY_COMMANDS.PLAY,
  REPLAY_COMMANDS.RESET,
  SESSION_COMMANDS.CREATE,
  SESSION_COMMANDS.GET_ACTIVE,
  SESSION_COMMANDS.GET_BY_ID,
  SESSION_COMMANDS.LIST,
]);

const status = await dispatchCommand(APP_COMMANDS.GET_STATUS);
assert.deepEqual(status, {
  booted: true,
  version: 'v6',
});

await registry.stop();
assert.equal(hasCommand(APP_COMMANDS.GET_STATUS), false);
unsubscribeBoot();
assert.equal(listenerCount(APP_EVENTS.BOOTED), 0);

console.log('v6 runtime core smoke passed');
