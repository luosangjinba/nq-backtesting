import { renderAppShell } from './shell/app-shell.js';
import { createAppRuntime } from './runtime/app-runtime.js';
import { createRuntimeRegistry } from './runtime/lifecycle.js';
import { emitEvent, subscribeEvent } from './runtime/events.js';
import { createBarDataRuntime } from './bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from './chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from './chart-viewport/chart-viewport-runtime.js';
import { createDisplayTimeframeRuntime } from './display-timeframe/display-timeframe-runtime.js';
import { createDefaultWallRuntime } from './default-wall/default-wall-runtime.js';
import { createLayoutRuntime } from './layout/layout-runtime.js';
import { createPaneRuntime } from './panes/pane-runtime.js';
import { createReplayRuntime } from './replay/replay-runtime.js';
import { createSessionRuntime } from './session/session-runtime.js';
import { mountDisplayTimeframeControl } from './shell/display-timeframe-control.js';
import { mountReplayTransport } from './shell/replay-transport.js';
import { mountStatusReadout } from './shell/status-readout.js';

const root = document.querySelector('[data-v6-root]');

if (!root) {
  throw new Error('V6 root element is missing.');
}

renderAppShell(root);
const registry = createRuntimeRegistry();
registry.registerRuntime(createAppRuntime());
registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createLayoutRuntime());
registry.registerRuntime(createBarDataRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createDefaultWallRuntime());
registry.registerRuntime(createDisplayTimeframeRuntime());
await registry.start({ root, emitEvent, subscribeEvent });
const displayTimeframeControl = mountDisplayTimeframeControl(root);
const replayTransport = mountReplayTransport(root.querySelector('[data-v6-transport]'));
const statusReadout = mountStatusReadout(root);
root.__v6DisplayTimeframeControl = displayTimeframeControl;
root.__v6RuntimeRegistry = registry;
root.__v6ReplayTransport = replayTransport;
root.__v6StatusReadout = statusReadout;
root.dataset.booted = 'true';
