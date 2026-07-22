import {
  createReplayNavigationSettings,
  deserializeReplayNavigationSettings,
  serializeReplayNavigationSettings,
} from '../replay-navigation-settings/public.js';

const DEFAULT_STORAGE_KEY = 'v7.replay-navigation-preferences';
const STORE_SCHEMA = 'v7.replay-navigation-preferences';
const STORE_VERSION = 1;

export class ReplayNavigationPreferenceStoreError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'ReplayNavigationPreferenceStoreError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new ReplayNavigationPreferenceStoreError(code, message, options);
}

function requireStorage(storage) {
  for (const method of ['read', 'write']) {
    if (typeof storage?.[method] !== 'function') {
      fail('REPLAY_NAVIGATION_PREFERENCE_STORAGE_INVALID', `Preference storage requires ${method}().`);
    }
  }
  return storage;
}

function restoreEnvelope(raw) {
  if (raw === null) return null;
  try {
    const wire = JSON.parse(raw);
    if (!wire || typeof wire !== 'object' || Array.isArray(wire)
      || Object.keys(wire).sort().join(',') !== 'replayNavigationSettings,schema,version'
      || wire.schema !== STORE_SCHEMA || wire.version !== STORE_VERSION) return null;
    return deserializeReplayNavigationSettings(wire.replayNavigationSettings);
  } catch {
    return null;
  }
}

function restoreLegacy(wires) {
  if (!Array.isArray(wires)) {
    fail('REPLAY_NAVIGATION_LEGACY_SETTINGS_INVALID', 'Legacy settings candidates must be an array.');
  }
  for (const wire of wires) {
    try {
      return deserializeReplayNavigationSettings(wire);
    } catch {
      // Legacy Session records are migration candidates, never authorities.
    }
  }
  return null;
}

/** Own one durable workstation-wide Quick GoTo preference record. */
export function createReplayNavigationPreferenceStore({
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
}) {
  const port = requireStorage(storage);
  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    fail('REPLAY_NAVIGATION_PREFERENCE_KEY_INVALID', 'Preference storage key must be non-empty.');
  }
  let current = null;

  function persist(settings) {
    const wire = Object.freeze({
      replayNavigationSettings: serializeReplayNavigationSettings(settings),
      schema: STORE_SCHEMA,
      version: STORE_VERSION,
    });
    port.write(storageKey, JSON.stringify(wire));
    current = settings;
    return current;
  }

  function initialize({ legacySettingsWires = [] } = {}) {
    if (current !== null) return current;
    const stored = restoreEnvelope(port.read(storageKey));
    if (stored !== null) {
      current = stored;
      return current;
    }
    return persist(restoreLegacy(legacySettingsWires) ?? createReplayNavigationSettings());
  }

  return Object.freeze({
    initialize,
    save(settings) { return persist(settings); },
    snapshot() { return current ?? initialize(); },
  });
}
