import assert from 'node:assert/strict';
import {
  REPLAY_NAVIGATION_PREFERENCES_COMMANDS,
  REPLAY_NAVIGATION_PREFERENCES_EVENTS,
} from '../src/contracts/app-contracts.js';
import {
  createReplayNavigationPreferences,
  updateReplayNavigationPreferences,
} from '../src/replay-navigation/replay-navigation-preferences.js';
import { createReplayNavigationPreferencesRuntime } from '../src/replay-navigation/replay-navigation-preferences-runtime.js';
import { createReplayNavigationPreferencesStorage } from '../src/replay-navigation/replay-navigation-preferences-storage.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';

assert.deepEqual(createReplayNavigationPreferences(), {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});
assert.deepEqual(updateReplayNavigationPreferences(createReplayNavigationPreferences(), {
  londonSession: '03:00',
}), {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '03:00',
  newYorkSession: '09:30',
});
assert.throws(
  () => updateReplayNavigationPreferences(createReplayNavigationPreferences(), { silverBullet: '10:00' }),
  /Unsupported replay navigation preference keys/,
);

const records = new Map();
const fakeLocalStorage = {
  getItem: (key) => records.get(key) ?? null,
  setItem: (key, value) => records.set(key, value),
};
const storage = createReplayNavigationPreferencesStorage({ storage: fakeLocalStorage });
assert.deepEqual(storage.load(), createReplayNavigationPreferences());
storage.save({ londonSession: '03:00' });
assert.deepEqual(storage.load(), {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '03:00',
  newYorkSession: '09:30',
});
records.set('v6.replay-navigation.preferences', '{broken');
assert.deepEqual(storage.load(), createReplayNavigationPreferences());
records.set('v6.replay-navigation.preferences', JSON.stringify({ anchors: { dayOpen: '25:00' }, version: 1 }));
assert.deepEqual(storage.load(), createReplayNavigationPreferences());

storage.save({ asianSession: '20:00' });
clearCommandsForTest();
const events = [];
const runtime = createReplayNavigationPreferencesRuntime({ storage });
runtime.start({ emitEvent: (name, payload) => events.push({ name, payload }) });
assert.deepEqual(await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT), {
  asianSession: '20:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});
const updated = await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.UPDATE, {
  newYorkSession: '10:00',
});
assert.equal(updated.newYorkSession, '10:00');
assert.equal(storage.load().newYorkSession, '10:00');
assert.equal(events.at(-1).name, REPLAY_NAVIGATION_PREFERENCES_EVENTS.UPDATED);

const reset = await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.RESET);
assert.deepEqual(reset, createReplayNavigationPreferences());
assert.deepEqual(storage.load(), createReplayNavigationPreferences());
assert.equal(events.at(-1).name, REPLAY_NAVIGATION_PREFERENCES_EVENTS.RESET);

runtime.stop();
clearCommandsForTest();

console.log('v6 replay navigation preferences step403 smoke passed');
