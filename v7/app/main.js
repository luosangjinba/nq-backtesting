import { createModuleHost } from '../src/module-host/public.js';
import { startProductionCorePluginGeneration } from './core-plugin-boot-supervisor.js';
import { loadProductionModuleCatalog } from './production-module-catalog.js';

const storage = window.localStorage;
const catalog = await loadProductionModuleCatalog();
const generation = await startProductionCorePluginGeneration({
  catalog,
  createEnvironment: ({ readModuleHostSnapshot }) => ({
    browserWindow: window,
    crypto: window.crypto,
    fetch: window.fetch.bind(window),
    reload: () => window.location.reload(),
    readStorage: () => storage,
    readModuleHostSnapshot,
    root: document.querySelector('#app'),
  }),
  createHost: (definitions) => createModuleHost(definitions),
  storage,
});
window.addEventListener('pagehide', () => { void generation.host.stop(); }, { once: true });
