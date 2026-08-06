import { createModuleHost } from '../src/module-host/public.js';
import { loadProductionApplicationDefinitions } from './production-module-catalog.js';

const definitions = await loadProductionApplicationDefinitions({
  environment: {
    browserWindow: window,
    crypto: window.crypto,
    fetch: window.fetch.bind(window),
    reload: () => window.location.reload(),
    readStorage: () => window.localStorage,
    root: document.querySelector('#app'),
  },
  rootModuleId: 'adapter.session-application',
});
const host = createModuleHost(definitions);
await host.start();
window.addEventListener('pagehide', () => { void host.stop(); }, { once: true });
