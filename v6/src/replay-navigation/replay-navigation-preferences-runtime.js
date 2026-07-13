import {
  REPLAY_NAVIGATION_PREFERENCES_COMMANDS,
  REPLAY_NAVIGATION_PREFERENCES_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createReplayNavigationPreferencesStorage } from './replay-navigation-preferences-storage.js';
import { createReplayNavigationPreferencesStore } from './replay-navigation-preferences-store.js';

export function createReplayNavigationPreferencesRuntime({
  storage = createReplayNavigationPreferencesStorage(),
  store = createReplayNavigationPreferencesStore({ initialPreferences: storage.load() }),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT, () => store.snapshot()),
      registerCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.UPDATE, (patch = {}) => {
        const preferences = store.update(patch);
        storage.save(preferences);
        emit(REPLAY_NAVIGATION_PREFERENCES_EVENTS.UPDATED, preferences);
        return preferences;
      }),
      registerCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.RESET, () => {
        const preferences = store.reset();
        storage.save(preferences);
        emit(REPLAY_NAVIGATION_PREFERENCES_EVENTS.RESET, preferences);
        return preferences;
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return Object.freeze({
    id: 'runtime.replay-navigation-preferences',
    start,
    stop,
  });
}
