import {
  DEFAULT_REPLAY_NAVIGATION_ANCHORS,
  normalizeReplayNavigationAnchors,
} from './replay-navigation-schedule.js';

const PREFERENCE_KEYS = Object.freeze(Object.keys(DEFAULT_REPLAY_NAVIGATION_ANCHORS));

export function createReplayNavigationPreferences(input = {}) {
  return normalizeReplayNavigationAnchors(input);
}

export function updateReplayNavigationPreferences(current, patch = {}) {
  const unknownKeys = Object.keys(patch).filter((key) => !PREFERENCE_KEYS.includes(key));
  if (unknownKeys.length) {
    throw new Error(`Unsupported replay navigation preference keys: ${unknownKeys.join(', ')}`);
  }
  return createReplayNavigationPreferences({
    ...createReplayNavigationPreferences(current),
    ...patch,
  });
}
