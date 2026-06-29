import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import {
  clearModulesForTest,
  isModuleRegistryStarted,
  listModules,
  registerModule,
  startModules,
  stopModules,
} from '../src/runtime/module-registry.js';
import { createRouter } from '../src/runtime/router.js';

clearCommandsForTest();
clearEventsForTest();
clearModulesForTest();

const unregister = registerCommand('probe.echo', (payload) => ({ ok: true, payload }));
assert.equal(hasCommand('probe.echo'), true);
assert.deepEqual(await dispatchCommand('probe.echo', 7), { ok: true, payload: 7 });
unregister();
assert.equal(hasCommand('probe.echo'), false);

let seen = 0;
const unsubscribe = subscribeEvent('probe.changed', (value) => {
  seen += value;
});
assert.equal(listenerCount('probe.changed'), 1);
emitEvent('probe.changed', 3);
unsubscribe();
emitEvent('probe.changed', 3);
assert.equal(seen, 3);
assert.equal(listenerCount('probe.changed'), 0);

const calls = [];
registerModule({
  id: 'alpha',
  start: () => calls.push('start-alpha'),
  stop: () => calls.push('stop-alpha'),
});
registerModule({
  id: 'beta',
  start: () => calls.push('start-beta'),
  stop: () => calls.push('stop-beta'),
});
assert.deepEqual(listModules(), ['alpha', 'beta']);
await startModules({});
assert.equal(isModuleRegistryStarted(), true);
assert.throws(() => registerModule({ id: 'gamma' }), /Cannot register/);
await stopModules({});
assert.deepEqual(calls, ['start-alpha', 'start-beta', 'stop-beta', 'stop-alpha']);
assert.equal(isModuleRegistryStarted(), false);

const buttons = [
  {
    dataset: { routeLink: 'setup' },
    toggleAttribute(name, value) {
      this[name] = value;
    },
  },
  {
    dataset: { routeLink: 'chart' },
    toggleAttribute(name, value) {
      this[name] = value;
    },
  },
];
globalThis.document = { querySelectorAll: () => buttons };
const outlet = {
  child: null,
  replaceChildren(node) {
    this.child = node;
  },
};
const makeRoute = (id) => ({ id, render: () => ({ id }) });
const router = createRouter({
  outlet,
  routes: [makeRoute('setup'), makeRoute('chart')],
  fallbackRouteId: 'setup',
});
router.start();
assert.equal(router.getCurrentRouteId(), 'setup');
assert.equal(outlet.child.id, 'setup');
router.navigate('chart');
assert.equal(router.getCurrentRouteId(), 'chart');
assert.equal(outlet.child.id, 'chart');
router.navigate('missing');
assert.equal(router.getCurrentRouteId(), 'setup');

console.log('v5 runtime smoke passed');
