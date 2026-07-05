import assert from 'node:assert/strict';
import { APP_COMMANDS, APP_EVENTS } from '../src/contracts/app-contracts.js';
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

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
const bootEvents = [];
const unsubscribeBoot = subscribeEvent(APP_EVENTS.BOOTED, (payload) => {
  bootEvents.push(payload);
});

registry.registerRuntime(createAppRuntime());
assert.deepEqual(registry.snapshot(), {
  running: false,
  runtimes: ['runtime.app'],
  started: [],
});

await registry.start({ emitEvent });

assert.equal(listenerCount(APP_EVENTS.BOOTED), 1);
assert.equal(bootEvents.length, 1);
assert.equal(bootEvents[0].booted, true);
assert.equal(hasCommand(APP_COMMANDS.GET_STATUS), true);
assert.deepEqual(listCommands(), [APP_COMMANDS.GET_STATUS]);

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
