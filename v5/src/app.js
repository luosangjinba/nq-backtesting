import { dispatchCommand, registerCommand } from './runtime/commands.js';
import { emitEvent } from './runtime/events.js';
import { registerModule, startModules } from './runtime/module-registry.js';
import { createRouter } from './runtime/router.js';
import { createBarDataRuntime } from './runtime/bar-data-runtime.js';
import { createChartRuntime } from './runtime/chart-runtime.js';
import { createReplayRuntime } from './runtime/replay-runtime.js';
import { createSessionRuntime } from './runtime/session-runtime.js';
import { createSessionRepository } from './session/session-repository.js';
import { createLocalSessionStorage } from './session/session-storage.js';
import { APP_COMMANDS } from './contracts/app-contracts.js';
import { createChartReplayRoute } from './features/chart-replay/chart-replay-route.js';
import { createSessionSetupRoute } from './features/session-setup/session-setup-route.js';

const root = document.querySelector('[data-v5-root]');

if (!root) {
  throw new Error('V5 root element was not found.');
}

const outlet = root.querySelector('[data-route-outlet]');
const router = createRouter({
  root,
  outlet,
  routes: [
    createSessionSetupRoute(),
    createChartReplayRoute(),
  ],
  fallbackRouteId: 'setup',
});

registerCommand(APP_COMMANDS.NAVIGATE, ({ routeId, params } = {}) => router.navigate(routeId, params));

registerModule({
  id: 'app.router',
  start() {
    router.start();
  },
});
registerModule(createChartRuntime());
registerModule(createBarDataRuntime());
registerModule(createSessionRuntime(createSessionRepository({
  storage: createLocalSessionStorage(),
})));
registerModule(createReplayRuntime());

root.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-route-link]');
  if (!trigger) return;
  dispatchCommand(APP_COMMANDS.NAVIGATE, { routeId: trigger.dataset.routeLink });
});

startModules({
  root,
  emitEvent,
}).then(() => {
  root.dataset.booted = 'true';
  emitEvent('app:booted', { routeId: router.getCurrentRouteId() });
});
