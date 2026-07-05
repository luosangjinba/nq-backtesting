import { renderAppShell } from './shell/app-shell.js';
import { createAppRuntime } from './runtime/app-runtime.js';
import { createRuntimeRegistry } from './runtime/lifecycle.js';
import { emitEvent, subscribeEvent } from './runtime/events.js';
import { createBarDataRuntime } from './bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from './chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from './chart-viewport/chart-viewport-runtime.js';
import { createDefaultWallRuntime } from './default-wall/default-wall-runtime.js';
import { createPaneRuntime } from './panes/pane-runtime.js';
import { createReplayRuntime } from './replay/replay-runtime.js';
import { createSessionRuntime } from './session/session-runtime.js';

const root = document.querySelector('[data-v6-root]');

if (!root) {
  throw new Error('V6 root element is missing.');
}

renderAppShell(root);
const registry = createRuntimeRegistry();
registry.registerRuntime(createAppRuntime());
registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createBarDataRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createDefaultWallRuntime());
await registry.start({ root, emitEvent, subscribeEvent });
root.__v6RuntimeRegistry = registry;
root.dataset.booted = 'true';
