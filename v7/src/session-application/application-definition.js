import { SESSION_BROWSER_CONFIG } from './config.js';
import { createHashNavigation } from './hash-navigation.js';

const MODULE_ID = 'adapter.session-application';

function requirePort(ports, id, method) {
  const port = ports[id];
  if (!port || typeof port[method] !== 'function') {
    throw new TypeError(`${MODULE_ID} requires ${id}.${method}().`);
  }
  return port;
}

async function releaseApplication(browser, replayWorkspace, stateSync) {
  const errors = [];
  try { browser?.dispose(); } catch (error) { errors.push(error); }
  try { replayWorkspace?.dispose(); } catch (error) { errors.push(error); }
  try { await stateSync?.dispose(); } catch (error) { errors.push(error); }
  if (errors.length > 0) throw new AggregateError(errors, 'Session application cleanup failed.');
}

function composeStores({ ports, storage }) {
  const persistence = requirePort(ports, 'adapter.session-persistence', 'createStorageAdapter');
  const sessionStoreApi = requirePort(ports, 'core.session-store', 'createSessionStore');
  const navigationApi = requirePort(
    ports,
    'core.replay-navigation-preference-store',
    'createReplayNavigationPreferenceStore',
  );
  const settingsApi = requirePort(ports, 'core.workstation-settings', 'createWorkstationSettingsRuntime');
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
    workstationSettings,
  });
}

/**
 * Owner: application-composition.
 * Builds the real Session Browser application as one ModuleHost lifecycle
 * definition. Public module namespaces arrive only through registered ports;
 * DOM, navigation, and storage resources are acquired in start and released by
 * both partial-start rollback and normal reverse cleanup.
 */
export function createProductionModuleDefinition({
  descriptor,
  environment,
  lifecycleObserver = () => {},
}) {
  if (descriptor?.id !== MODULE_ID) throw new TypeError(`Expected ${MODULE_ID} descriptor.`);
  if (!environment?.root || !environment?.browserWindow
    || typeof environment?.readStorage !== 'function'
    || typeof environment?.crypto?.randomUUID !== 'function') {
    throw new TypeError(`${MODULE_ID} requires root, browserWindow, crypto, and readStorage().`);
  }
  return Object.freeze({
    descriptor,
    instantiate({ optionalPorts, requiredPorts }) {
      lifecycleObserver('instantiate', MODULE_ID);
      const browserApi = requirePort(requiredPorts, 'adapter.session-browser-ui', 'createSessionBrowser');
      const dateApi = requirePort(requiredPorts, 'adapter.v4-bars-provider', 'createV4MarketDateAvailability');
      requirePort(requiredPorts, 'adapter.session-persistence', 'createStorageAdapter');
      requirePort(requiredPorts, 'adapter.session-persistence', 'createSessionRepository');
      requirePort(requiredPorts, 'core.session-store', 'createSessionStore');
      requirePort(
        requiredPorts,
        'core.replay-navigation-preference-store',
        'createReplayNavigationPreferenceStore',
      );
      requirePort(requiredPorts, 'core.workstation-settings', 'createWorkstationSettingsRuntime');
      requirePort(requiredPorts, 'core.workstation-settings', 'createColorHistoryStore');
      const replayApi = optionalPorts['adapter.replay-workspace-ui'] ?? null;
      const stateSyncApi = optionalPorts['adapter.server-state-sync'] ?? null;
      if (replayApi && typeof replayApi.createReplayWorkspaceSurface !== 'function') {
        throw new TypeError(`${MODULE_ID} received an invalid optional Replay Workspace port.`);
      }
      if (stateSyncApi && typeof stateSyncApi.createServerStateSync !== 'function') {
        throw new TypeError(`${MODULE_ID} received an invalid optional State Sync port.`);
      }
      let browser = null;
      let replayWorkspace = null;
      let stateSync = null;
      let status = 'created';
      let storageAvailable = false;

      function snapshot() {
        return Object.freeze({
          hasBrowser: browser !== null,
          hasReplayWorkspace: replayWorkspace !== null,
          status,
          storageAvailable,
        });
      }

      async function cleanup(nextStatus) {
        const releasedBrowser = browser;
        const releasedReplayWorkspace = replayWorkspace;
        const releasedStateSync = stateSync;
        browser = null;
        replayWorkspace = null;
        stateSync = null;
        storageAvailable = false;
        status = nextStatus;
        await releaseApplication(releasedBrowser, releasedReplayWorkspace, releasedStateSync);
      }

      return Object.freeze({
        publicApi: Object.freeze({ snapshot }),
        async start() {
          lifecycleObserver('start', MODULE_ID);
          status = 'starting';
          let composed = null;
          let unavailableMessage = null;
          try {
            let storage = environment.readStorage();
            if (stateSyncApi && typeof environment.fetch === 'function'
              && typeof environment.reload === 'function') {
              stateSync = stateSyncApi.createServerStateSync({
                crypto: environment.crypto,
                fetch: environment.fetch,
                now: () => Date.now(),
                reload: environment.reload,
                storage,
              });
              await stateSync.initialize();
              storage = stateSync.storage;
            }
            composed = composeStores({ ports: requiredPorts, storage });
            storageAvailable = true;
          } catch {
            unavailableMessage = 'Local Session storage could not be initialized. Check browser site-data permissions and reload.';
          }
          replayWorkspace = replayApi?.createReplayWorkspaceSurface() ?? null;
          browser = browserApi.createSessionBrowser({
            colorHistory: composed?.colorHistory ?? null,
            dateAvailability: dateApi.createV4MarketDateAvailability(),
            idFactory: () => `session-${environment.crypto.randomUUID()}`,
            instruments: SESSION_BROWSER_CONFIG.instruments,
            navigation: createHashNavigation(environment.browserWindow),
            openedSessionSurface: composed ? replayWorkspace : null,
            replayNavigationPreferences: composed?.replayNavigationPreferences ?? null,
            root: environment.root,
            store: composed?.sessionStore ?? null,
            stateSync,
            unavailableMessage,
            workstationSettings: composed?.workstationSettings ?? null,
          });
          browser.start();
          status = 'running';
          return snapshot();
        },
        async stop() {
          lifecycleObserver('stop', MODULE_ID);
          if (status !== 'disposed') await cleanup('stopped');
        },
        async dispose() {
          lifecycleObserver('dispose', MODULE_ID);
          if (status !== 'disposed') await cleanup('disposed');
        },
      });
    },
  });
}
