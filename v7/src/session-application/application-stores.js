import { SESSION_BROWSER_CONFIG } from './config.js';
import { requireApplicationPort } from './application-ports.js';

/** Compose local Session stores over one explicitly supplied storage surface. */
export function composeSessionApplicationStores({ ports, storage }) {
  const persistence = requireApplicationPort(ports, 'adapter.session-persistence', 'createStorageAdapter');
  const sessionStoreApi = requireApplicationPort(ports, 'core.session-store', 'createSessionStore');
  const navigationApi = requireApplicationPort(
    ports,
    'core.replay-navigation-preference-store',
    'createReplayNavigationPreferenceStore',
  );
  const settingsApi = requireApplicationPort(
    ports,
    'core.workstation-settings',
    'createWorkstationSettingsRuntime',
  );
  const storageAdapter = persistence.createStorageAdapter(storage);
  const repository = persistence.createSessionRepository({
    storage: storageAdapter,
    namespace: SESSION_BROWSER_CONFIG.storageNamespace,
  });
  const sessionStore = sessionStoreApi.createSessionStore({ repository });
  const replayNavigationPreferences = navigationApi.createReplayNavigationPreferenceStore({
    storage: storageAdapter,
  });
  const legacySettingsWires = sessionStore.listSessions()
    .filter(({ workspace }) => workspace.schemaVersion === 3)
    .sort((left, right) => right.metadata.updatedAtEpochMs - left.metadata.updatedAtEpochMs)
    .map(({ workspace }) => workspace.replayNavigationSettings);
  replayNavigationPreferences.initialize({ legacySettingsWires });
  const workstationSettings = settingsApi.createWorkstationSettingsRuntime({ storage: storageAdapter });
  workstationSettings.initialize();
  const colorHistory = settingsApi.createColorHistoryStore({ storage: storageAdapter });
  colorHistory.initialize();
  return Object.freeze({
    colorHistory,
    replayNavigationPreferences,
    sessionStore,
    storage,
    storageAdapter,
    workstationSettings,
  });
}
