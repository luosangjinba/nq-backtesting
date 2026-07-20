import { createSessionBrowser } from '../src/session-browser-ui/public.js';
import { createSessionRepository, createStorageAdapter } from '../src/session-persistence/public.js';
import { createSessionStore } from '../src/session-store/public.js';
import { createReplayWorkspaceSurface } from '../src/replay-workspace-ui/public.js';
import { SESSION_BROWSER_CONFIG } from './config.js';
import { createHashNavigation } from './hash-navigation.js';

function createOpaqueToken() {
  return `session-${crypto.randomUUID()}`;
}

function composeSessionStore() {
  const storage = createStorageAdapter(window.localStorage);
  const repository = createSessionRepository({
    storage,
    namespace: SESSION_BROWSER_CONFIG.storageNamespace,
  });
  return createSessionStore({ repository });
}

let store = null;
let unavailableMessage = null;
try {
  store = composeSessionStore();
} catch {
  unavailableMessage = 'Local Session storage could not be initialized. Check browser site-data permissions and reload.';
}

const replayWorkspace = createReplayWorkspaceSurface();
const browser = createSessionBrowser({
  root: document.querySelector('#app'),
  store,
  unavailableMessage,
  navigation: createHashNavigation(window),
  instruments: SESSION_BROWSER_CONFIG.instruments,
  idFactory: createOpaqueToken,
  openedSessionSurface: replayWorkspace,
});
browser.start();
window.addEventListener('pagehide', () => {
  browser.dispose();
  replayWorkspace.dispose();
}, { once: true });
