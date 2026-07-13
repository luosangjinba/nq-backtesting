import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../src/contracts/app-contracts.js';
import { createSettingsRuntime } from '../src/settings/settings-runtime.js';
import { DEFAULT_SETTINGS_INPUT } from '../src/settings/settings-model.js';
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

const updatedEvents = [];
const resetEvents = [];
const unsubscribeUpdated = subscribeEvent(SETTINGS_EVENTS.UPDATED, (payload) => {
  updatedEvents.push(payload);
});
const unsubscribeReset = subscribeEvent(SETTINGS_EVENTS.RESET, (payload) => {
  resetEvents.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createSettingsRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(SETTINGS_COMMANDS.GET_SNAPSHOT), true);
assert.deepEqual(await dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT), DEFAULT_SETTINGS_INPUT);

const updated = await dispatchCommand(SETTINGS_COMMANDS.UPDATE, {
  chartGrid: false,
  displayTimezone: 'utc',
  theme: 'light',
});
assert.deepEqual(updated, {
  ...DEFAULT_SETTINGS_INPUT,
  chartGrid: false,
  displayTimezone: 'utc',
  theme: 'light',
});
assert.deepEqual(updatedEvents, [updated]);

await assert.rejects(
  () => dispatchCommand(SETTINGS_COMMANDS.UPDATE, { chartRuntime: true }),
  /Unsupported settings keys/,
);
await assert.rejects(
  () => dispatchCommand(SETTINGS_COMMANDS.UPDATE, { theme: 'purple' }),
  /theme/,
);

const reset = await dispatchCommand(SETTINGS_COMMANDS.RESET);
assert.deepEqual(reset, DEFAULT_SETTINGS_INPUT);
assert.deepEqual(resetEvents, [reset]);

await registry.stop();
assert.equal(hasCommand(SETTINGS_COMMANDS.GET_SNAPSHOT), false);
unsubscribeUpdated();
unsubscribeReset();

console.log('v6 settings runtime smoke passed');
