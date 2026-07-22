import assert from 'node:assert/strict';
import {
  createReplayNavigationSettings,
  DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  deserializeReplayNavigationSettings,
  readReplayNavigationSettings,
  serializeReplayNavigationSettings,
} from '../src/replay-navigation-settings/public.js';

const defaults = createReplayNavigationSettings();
assert.deepEqual(readReplayNavigationSettings(defaults), DEFAULT_REPLAY_NAVIGATION_SETTINGS);
assert.equal(Object.isFrozen(readReplayNavigationSettings(defaults)), true);

const custom = createReplayNavigationSettings({
  ...DEFAULT_REPLAY_NAVIGATION_SETTINGS,
  dayOpen: '17:45',
  silverBulletNewYorkPm: '15:00',
});
const wire = serializeReplayNavigationSettings(custom);
assert.deepEqual(readReplayNavigationSettings(deserializeReplayNavigationSettings(
  JSON.parse(JSON.stringify(wire)),
)), readReplayNavigationSettings(custom));

const negative = [
  [() => createReplayNavigationSettings({ dayOpen: '18:00' }), 'REPLAY_NAVIGATION_SETTINGS_FIELDS_INVALID'],
  [() => createReplayNavigationSettings({ ...DEFAULT_REPLAY_NAVIGATION_SETTINGS, dayOpen: '6:00' }), 'REPLAY_NAVIGATION_SETTINGS_TIME_INVALID'],
  [() => createReplayNavigationSettings({ ...DEFAULT_REPLAY_NAVIGATION_SETTINGS, dayOpen: '24:00' }), 'REPLAY_NAVIGATION_SETTINGS_TIME_INVALID'],
  [() => createReplayNavigationSettings({ ...DEFAULT_REPLAY_NAVIGATION_SETTINGS, dayOpen: '18:01' }), 'REPLAY_NAVIGATION_SETTINGS_TIME_INVALID'],
  [() => readReplayNavigationSettings(Object.freeze(DEFAULT_REPLAY_NAVIGATION_SETTINGS)), 'REPLAY_NAVIGATION_SETTINGS_REQUIRED'],
  [() => deserializeReplayNavigationSettings({}), 'REPLAY_NAVIGATION_SETTINGS_WIRE_INVALID'],
  [() => deserializeReplayNavigationSettings({ ...wire, schema: 'v6.goto-settings' }), 'REPLAY_NAVIGATION_SETTINGS_SCHEMA_INVALID'],
  [() => deserializeReplayNavigationSettings({ ...wire, version: 2 }), 'REPLAY_NAVIGATION_SETTINGS_VERSION_INVALID'],
];
for (const [operation, code] of negative) {
  assert.throws(operation, (error) => error?.code === code, code);
}

console.log(`v7 Replay Navigation Settings harness passed (${negative.length} negative controls)`);
