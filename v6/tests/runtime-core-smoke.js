import assert from 'node:assert/strict';
import {
  APP_COMMANDS,
  APP_EVENTS,
  BAR_DATA_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
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
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async () => ({ bars: [] }),
}));
assert.deepEqual(registry.snapshot(), {
  running: false,
  runtimes: ['runtime.app', 'runtime.session', 'runtime.bar-data'],
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
