import { createSessionBrowser } from '../src/session-browser-ui/public.js';
import { createSessionRepository, createStorageAdapter } from '../src/session-persistence/public.js';
import { createSessionStore } from '../src/session-store/public.js';
import { createReplayNavigationPreferenceStore } from '../src/replay-navigation-preference-store/public.js';
import { createReplayWorkspaceSurface } from '../src/replay-workspace-ui/public.js';
import { SESSION_BROWSER_CONFIG } from './config.js';
import { createHashNavigation } from './hash-navigation.js';

function createOpaqueToken() {
  return `session-${crypto.randomUUID()}`;
}

function composeStores() {
  const storage = createStorageAdapter(window.localStorage);
  const repository = createSessionRepository({
    storage,
    namespace: SESSION_BROWSER_CONFIG.storageNamespace,
  });
  const sessionStore = createSessionStore({ repository });
  const replayNavigationPreferences = createReplayNavigationPreferenceStore({ storage });
  const legacySettingsWires = sessionStore.listSessions()
    .filter(({ workspace }) => workspace.schemaVersion === 3)
    .sort((left, right) => right.metadata.updatedAtEpochMs - left.metadata.updatedAtEpochMs)
    .map(({ workspace }) => workspace.replayNavigationSettings);
  replayNavigationPreferences.initialize({ legacySettingsWires });
  return Object.freeze({ replayNavigationPreferences, sessionStore });
}

let composed = null;
let unavailableMessage = null;
try {
  composed = composeStores();
} catch {
  unavailableMessage = 'Local Session storage could not be initialized. Check browser site-data permissions and reload.';
}

const replayWorkspace = createReplayWorkspaceSurface();
const browser = createSessionBrowser({
  root: document.querySelector('#app'),
  store: composed?.sessionStore ?? null,
  replayNavigationPreferences: composed?.replayNavigationPreferences ?? null,
  unavailableMessage,
  navigation: createHashNavigation(window),
  instruments: SESSION_BROWSER_CONFIG.instruments,
  idFactory: createOpaqueToken,
  openedSessionSurface: composed ? replayWorkspace : null,
});
browser.start();
window.addEventListener('pagehide', () => {
  browser.dispose();
  replayWorkspace.dispose();
}, { once: true });
