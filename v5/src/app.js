import { dispatchCommand, registerCommand } from './runtime/commands.js';
import { emitEvent } from './runtime/events.js';
import { registerModule, startModules } from './runtime/module-registry.js';
import { createRouter } from './runtime/router.js';
import { createChartReplayRoute } from './features/chart-replay/chart-replay-route.js';
import { createSessionSetupRoute } from './features/session-setup/session-setup-route.js';

const root = document.querySelector('[data-v5-root]');

if (!root) {
  throw new Error('V5 root element was not found.');
}

const outlet = root.querySelector('[data-route-outlet]');
const router = createRouter({
  outlet,
  routes: [
    createSessionSetupRoute(),
    createChartReplayRoute(),
  ],
  fallbackRouteId: 'setup',
});

registerCommand('app.navigate', ({ routeId } = {}) => router.navigate(routeId));

registerModule({
  id: 'app.router',
  start() {
    router.start();
  },
});

root.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-route-link]');
  if (!trigger) return;
  dispatchCommand('app.navigate', { routeId: trigger.dataset.routeLink });
});

startModules({
  root,
  emitEvent,
}).then(() => {
  root.dataset.booted = 'true';
  emitEvent('app:booted', { routeId: router.getCurrentRouteId() });
});
