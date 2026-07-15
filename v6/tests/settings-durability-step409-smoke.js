import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../src/contracts/app-contracts.js';
import {
  createMemoryPersistenceAdapter,
  createPersistenceRepository,
} from '../src/persistence/persistence-repository.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import { emitEvent, clearEventsForTest, subscribeEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import {
  createSettingsPersistenceValue,
  DEFAULT_SETTINGS_INPUT,
  restoreSettingsPersistenceValue,
  SETTINGS_RECORD_VERSION,
} from '../src/settings/settings-model.js';
import {
  SETTINGS_PERSISTENCE_COLLECTION,
  SETTINGS_PERSISTENCE_KEY,
} from '../src/settings/settings-persistence.js';
import { createSettingsRuntime } from '../src/settings/settings-runtime.js';

const defaults = DEFAULT_SETTINGS_INPUT;

assert.deepEqual(createSettingsPersistenceValue(defaults), {
  settings: defaults,
  version: SETTINGS_RECORD_VERSION,
});
assert.deepEqual(restoreSettingsPersistenceValue({
  chartGrid: false,
  displayTimezone: 'utc',
  showWatermark: false,
  theme: 'light',
}), {
  migrated: true,
  settings: {
    ...DEFAULT_SETTINGS_INPUT,
    chartGrid: false,
    displayTimezone: 'utc',
    showWatermark: false,
    theme: 'light',
  },
});
assert.throws(
  () => restoreSettingsPersistenceValue({ version: 99, settings: {} }),
  /Unsupported Settings record version/,
);
assert.throws(
  () => restoreSettingsPersistenceValue({ version: SETTINGS_RECORD_VERSION, settings: { theme: 'purple' } }),
  /theme/,
);

clearCommandsForTest();
clearEventsForTest();
const repository = createPersistenceRepository({
  adapter: createMemoryPersistenceAdapter(),
  now: () => 1000,
});
repository.save({
  collection: SETTINGS_PERSISTENCE_COLLECTION,
  key: SETTINGS_PERSISTENCE_KEY,
  value: {
    chartGrid: false,
    displayTimezone: 'utc',
    showWatermark: true,
    theme: 'light',
  },
});
const hydratedEvents = [];
const failureEvents = [];
const unsubscribeHydrated = subscribeEvent(SETTINGS_EVENTS.HYDRATED, (value) => hydratedEvents.push(value));
const unsubscribeFailure = subscribeEvent(SETTINGS_EVENTS.PERSISTENCE_FAILED, (value) => failureEvents.push(value));
const registry = createRuntimeRegistry();
registry.registerRuntime(createSettingsRuntime({ persistenceRepository: repository }));
await registry.start({ emitEvent, subscribeEvent });

const hydrated = await dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT);
assert.deepEqual(hydrated, {
  ...DEFAULT_SETTINGS_INPUT,
  chartGrid: false,
  displayTimezone: 'utc',
  showWatermark: true,
  theme: 'light',
});
assert.deepEqual(hydratedEvents, [hydrated]);
assert.equal(failureEvents.length, 0);
assert.equal(repository.get(SETTINGS_PERSISTENCE_COLLECTION, SETTINGS_PERSISTENCE_KEY).value.version, 9);

const updated = await dispatchCommand(SETTINGS_COMMANDS.UPDATE, { chartGrid: true });
assert.deepEqual(
  repository.get(SETTINGS_PERSISTENCE_COLLECTION, SETTINGS_PERSISTENCE_KEY).value,
  createSettingsPersistenceValue(updated),
);
await registry.stop();
unsubscribeHydrated();
unsubscribeFailure();

clearCommandsForTest();
clearEventsForTest();
const brokenRepository = createPersistenceRepository({
  adapter: {
    readAll() {
      return [];
    },
    writeAll() {
      throw new Error('storage unavailable');
    },
  },
});
const brokenFailures = [];
const unsubscribeBroken = subscribeEvent(
  SETTINGS_EVENTS.PERSISTENCE_FAILED,
  (value) => brokenFailures.push(value),
);
const brokenRegistry = createRuntimeRegistry();
brokenRegistry.registerRuntime(createSettingsRuntime({ persistenceRepository: brokenRepository }));
await brokenRegistry.start({ emitEvent, subscribeEvent });
const memoryUpdate = await dispatchCommand(SETTINGS_COMMANDS.UPDATE, { chartGrid: false });
assert.equal(memoryUpdate.chartGrid, false);
assert.deepEqual(brokenFailures, [{ message: 'storage unavailable', operation: 'update' }]);
await brokenRegistry.stop();
unsubscribeBroken();

console.log('V6 Settings durability Step 409 smoke passed.');
