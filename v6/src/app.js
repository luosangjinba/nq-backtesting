import { renderAppShell } from './shell/app-shell.js';
import { createAppRuntime } from './runtime/app-runtime.js';
import { createRuntimeRegistry } from './runtime/lifecycle.js';
import { emitEvent } from './runtime/events.js';

const root = document.querySelector('[data-v6-root]');

if (!root) {
  throw new Error('V6 root element is missing.');
}

renderAppShell(root);
const registry = createRuntimeRegistry();
registry.registerRuntime(createAppRuntime());
await registry.start({ root, emitEvent });
root.__v6RuntimeRegistry = registry;
root.dataset.booted = 'true';
