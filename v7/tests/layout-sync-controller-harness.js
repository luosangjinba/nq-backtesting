import assert from 'node:assert/strict';
import { readLayoutSync } from '../src/layout-sync-domain/public.js';
import { createLayoutSyncController } from '../src/replay-workspace-composition/public.js';

function makePorts({ failPersistence = false } = {}) {
  const calls = [];
  return {
    calls,
    adapter: {
      setCrosshairSync(value) { calls.push(['adapter', value]); },
    },
    persist(value) {
      calls.push(['persist', readLayoutSync(value).crosshair]);
      if (failPersistence) throw new Error('storage unavailable');
    },
    view: {
      setLayoutSync(value) { calls.push(['view', readLayoutSync(value).crosshair]); },
      setState(state, detail) { calls.push(['state', state, detail.message]); },
    },
  };
}

const acceptedPorts = makePorts();
const accepted = createLayoutSyncController(acceptedPorts);
assert.deepEqual(acceptedPorts.calls, [['adapter', false], ['view', false]]);
assert.equal(accepted.change('crosshair', true), true);
assert.equal(accepted.read().crosshair, true);
assert.deepEqual(acceptedPorts.calls.slice(-3), [
  ['persist', true], ['adapter', true], ['view', true],
], 'persistence must complete before an accepted projection');

const failedPorts = makePorts({ failPersistence: true });
const failed = createLayoutSyncController(failedPorts);
assert.equal(failed.change('crosshair', true), false);
assert.equal(failed.read().crosshair, false);
assert.deepEqual(failedPorts.calls.slice(-4), [
  ['persist', true],
  ['adapter', false],
  ['view', false],
  ['state', 'error', 'Layout synchronization could not be saved locally.'],
], 'failed persistence must restore the last accepted adapter and UI projection');

console.log('v7 Layout Sync UI controller harness passed');
