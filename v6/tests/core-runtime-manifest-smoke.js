import assert from 'node:assert/strict';
import { createCoreRuntimeContributions } from '../src/runtime/core-runtime-manifest.js';

const runtimes = createCoreRuntimeContributions({
  dispatchCommand: async () => null,
  replayNavigationPreferencesStorage: {
    load: () => ({}),
    save: () => {},
  },
  sessionRepository: {},
  subscribeEvent: () => () => {},
});
const ids = runtimes.map((runtime) => runtime.id);

assert.equal(Object.isFrozen(runtimes), true);
assert.equal(new Set(ids).size, ids.length);
assert.equal(ids[0], 'runtime.app');
assert.equal(ids.includes('runtime.replay'), true);
assert.equal(ids.includes('runtime.replay-navigation-preferences'), true);
assert.equal(ids.includes('runtime.chart-data'), true);
assert.equal(ids.includes('runtime.chart-viewport'), true);
assert.equal(ids.includes('runtime.replay-coordination-materialization-handoff'), true);

console.log('v6 core runtime manifest smoke passed');
