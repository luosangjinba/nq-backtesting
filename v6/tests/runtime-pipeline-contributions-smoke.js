import assert from 'node:assert/strict';
import { createCoreRuntimeContributions } from '../src/runtime/core-runtime-manifest.js';

const runtimes = createCoreRuntimeContributions({
  dispatchCommand: async () => null,
  persistenceRepository: {},
  replayNavigationPreferencesStorage: {
    load: () => undefined,
    save: () => null,
  },
  sessionRepository: {},
  subscribeEvent: () => () => {},
});
const ids = runtimes.map((runtime) => runtime.id);

assert.equal(runtimes.length, 40);
assert.equal(new Set(ids).size, ids.length);
assert.equal(ids[0], 'runtime.app');
assert.equal(ids[17], 'runtime.chartEntryContext');
assert.equal(ids[18], 'runtime.replay');
assert.equal(ids.at(-1), 'runtime.playback-period');
assert.equal(Object.isFrozen(runtimes), true);

console.log('v6 runtime pipeline contributions smoke passed');
