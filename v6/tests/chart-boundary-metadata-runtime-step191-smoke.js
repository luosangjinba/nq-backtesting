import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartBoundaryMetadataRuntime } from '../src/chart-boundary-metadata/chart-boundary-metadata-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_BOUNDARY_METADATA_COMMANDS,
  CHART_BOUNDARY_METADATA_EVENTS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

function ts(value) {
  return Math.floor(Date.parse(`${value.replace(' ', 'T')}Z`) / 1000);
}

async function nextTick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

clearCommandsForTest();
clearEventsForTest();

const updates = [];
const unsubscribeUpdated = subscribeEvent(CHART_BOUNDARY_METADATA_EVENTS.UPDATED, (payload) => {
  updates.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async () => ({
    bars: [
      { close: 100.5, high: 101, low: 100, open: 100, timestamp: ts('2026-05-31 18:00') },
      { close: 101.5, high: 102, low: 101, open: 101, timestamp: ts('2026-05-31 18:01') },
    ],
    history: { exhaustedBefore: false },
  }),
  maxBarsPerWindow: 10,
}));
registry.registerRuntime(createChartBoundaryMetadataRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.deepEqual(await dispatchCommand(CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE), {
  error: null,
  metadata: {
    scope: null,
    scopes: [],
    windowCount: 0,
  },
  status: 'idle',
});

const window = {
  end: '2026-05-31 18:01',
  instrument: 'NQ',
  start: '2026-05-31 18:00',
  timeframe: 1,
};
await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, window);
await nextTick();

const loaded = await dispatchCommand(CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE);
assert.equal(loaded.status, 'ready');
assert.equal(loaded.metadata.windowCount, 1);
assert.deepEqual(loaded.metadata.scopes.map((scope) => [
  scope.instrument,
  scope.earliestLoadedTime,
  scope.latestLoadedTime,
]), [
  ['NQ', '2026-05-31 18:00', '2026-05-31 18:01'],
]);
assert.equal(updates.length, 1);

await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, window);
await nextTick();

const released = await dispatchCommand(CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE);
assert.equal(released.status, 'ready');
assert.deepEqual(released.metadata.scopes, []);
assert.equal(released.metadata.windowCount, 0);
assert.equal(updates.length, 2);

await registry.stop();
unsubscribeUpdated();

console.log('v6 chart boundary metadata runtime step 191 smoke passed');
