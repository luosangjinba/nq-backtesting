import assert from 'node:assert/strict';
import {
  createReplayNavigationPreferenceStore,
  ReplayNavigationPreferenceStoreError,
} from '../src/replay-navigation-preference-store/public.js';
import {
  createReplayNavigationSettings,
  readReplayNavigationSettings,
  serializeReplayNavigationSettings,
} from '../src/replay-navigation-settings/public.js';
import { createStorageAdapter } from '../src/session-persistence/public.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const custom = createReplayNavigationSettings({
  asianSession: '20:00',
  dayOpen: '12:00',
  londonSession: '03:00',
  newYorkSession: '10:15',
  silverBulletLondon: '04:00',
  silverBulletNewYorkAm: '11:00',
  silverBulletNewYorkPm: '15:00',
});
const webStorage = createMemoryWebStorage();
const storage = createStorageAdapter(webStorage);
let store = createReplayNavigationPreferenceStore({ storage });
assert.deepEqual(readReplayNavigationSettings(store.initialize()),
  readReplayNavigationSettings(createReplayNavigationSettings()));
assert.equal(webStorage.keys().includes('v7.replay-navigation-preferences'), true,
  'initialization must create one Session-independent durable record');
store.save(custom);
assert.deepEqual(readReplayNavigationSettings(store.snapshot()), readReplayNavigationSettings(custom));

store = createReplayNavigationPreferenceStore({ storage });
assert.deepEqual(readReplayNavigationSettings(store.initialize()), readReplayNavigationSettings(custom),
  'a reconstructed preference owner must restore the one global value');

const legacyStorage = createMemoryWebStorage({
  'v7.replay-navigation-preferences': '{broken',
});
const legacyStore = createReplayNavigationPreferenceStore({
  storage: createStorageAdapter(legacyStorage),
});
assert.deepEqual(readReplayNavigationSettings(legacyStore.initialize({
  legacySettingsWires: [
    { invalid: true },
    serializeReplayNavigationSettings(custom),
    serializeReplayNavigationSettings(createReplayNavigationSettings()),
  ],
})), readReplayNavigationSettings(custom),
'the first valid most-recent legacy Session candidate must seed a missing/corrupt global record');
assert.deepEqual(readReplayNavigationSettings(createReplayNavigationPreferenceStore({
  storage: createStorageAdapter(legacyStorage),
}).initialize()), readReplayNavigationSettings(custom),
'legacy migration must persist once and stop depending on Session records');

let failWrites = false;
const atomicStorage = {
  read: storage.read,
  write(key, value) {
    if (failWrites) throw new Error('write failed');
    storage.write(key, value);
  },
};
const atomicStore = createReplayNavigationPreferenceStore({ storage: atomicStorage });
atomicStore.initialize();
const beforeFailure = atomicStore.snapshot();
failWrites = true;
assert.throws(() => atomicStore.save(createReplayNavigationSettings()), /write failed/);
assert.equal(atomicStore.snapshot(), beforeFailure,
  'a failed durable write must preserve the prior in-memory authority');

assert.throws(
  () => createReplayNavigationPreferenceStore({ storage: {} }),
  (error) => error instanceof ReplayNavigationPreferenceStoreError
    && error.code === 'REPLAY_NAVIGATION_PREFERENCE_STORAGE_INVALID',
);
assert.throws(
  () => createReplayNavigationPreferenceStore({
    storage: createStorageAdapter(createMemoryWebStorage()),
  }).initialize({ legacySettingsWires: null }),
  (error) => error instanceof ReplayNavigationPreferenceStoreError
    && error.code === 'REPLAY_NAVIGATION_LEGACY_SETTINGS_INVALID',
);

console.log('v7 Replay Navigation Preference Store harness passed');
