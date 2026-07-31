import { createModuleHost } from '../src/module-host/public.js';
import { loadProductionApplicationDefinitions } from './production-module-catalog.js';

const definitions = await loadProductionApplicationDefinitions({
  environment: { root: document.querySelector('#data-acquisition-app') },
  rootModuleId: 'adapter.data-acquisition-application',
});
const host = createModuleHost(definitions);
await host.start();
window.addEventListener('pagehide', () => { void host.stop(); }, { once: true });
