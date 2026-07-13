import {
  createReplayNavigationPreferences,
  updateReplayNavigationPreferences,
} from './replay-navigation-preferences.js';

export function createReplayNavigationPreferencesStore({
  initialPreferences = {},
} = {}) {
  let preferences = createReplayNavigationPreferences(initialPreferences);

  function snapshot() {
    return { ...preferences };
  }

  return Object.freeze({
    reset() {
      preferences = createReplayNavigationPreferences();
      return snapshot();
    },
    snapshot,
    update(patch = {}) {
      preferences = updateReplayNavigationPreferences(preferences, patch);
      return snapshot();
    },
  });
}
