import { createReplayNavigationPreferences } from './replay-navigation-preferences.js';

const DEFAULT_STORAGE_KEY = 'v6.replay-navigation.preferences';
const STORAGE_VERSION = 1;

export function createReplayNavigationPreferencesStorage({
  storage = globalThis?.localStorage,
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) {
  return Object.freeze({
    load() {
      try {
        const parsed = JSON.parse(storage?.getItem?.(storageKey) || 'null');
        if (!parsed || parsed.version !== STORAGE_VERSION) {
          return createReplayNavigationPreferences();
        }
        return createReplayNavigationPreferences(parsed.anchors);
      } catch {
        return createReplayNavigationPreferences();
      }
    },
    save(preferences = {}) {
      const anchors = createReplayNavigationPreferences(preferences);
      storage?.setItem?.(storageKey, JSON.stringify({
        anchors,
        version: STORAGE_VERSION,
      }));
      return anchors;
    },
  });
}
