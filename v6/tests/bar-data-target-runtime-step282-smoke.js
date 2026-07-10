import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import {
  BAR_DATA_COMMANDS,
  BAR_DATA_EVENTS,
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

clearCommandsForTest();
clearEventsForTest();

const sourceFetchCalls = [];
const targetFetchCalls = [];
const emitted = [];
const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    sourceFetchCalls.push({ ...window });
    return {
      bars: [
        { timestamp: 1780272000, open: 1, high: 2, low: 0, close: 1.5 },
      ],
      requestedRange: { startTs: 1780272000, endTs: 1780272000 },
      timing: { source: 'source-fetch' },
    };
  },
  fetchTargetBars: async (window) => {
    targetFetchCalls.push({ ...window });
    return {
      bars: [
        { timestamp: 1780272000, open: 100, high: 110, low: 90, close: 105, timeframe: '8h' },
        { timestamp: 1780300800, open: 105, high: 115, low: 95, close: 110, timeframe: '8h' },
      ],
      requestedRange: { startTs: 1780272000, endTs: 1780300800 },
      timing: { source: 'target-fetch' },
    };
  },
}));

await registry.start({
  emitEvent: (eventName, payload) => {
    emitted.push({ eventName, payload });
    emitEvent(eventName, payload);
  },
  subscribeEvent,
});

const plannedTarget = await dispatchCommand(BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW, {
  end: '2026-06-01 08:00',
  instrument: 'nq',
  start: '2026-06-01 00:00',
  timeframe: '8H',
});
assert.deepEqual(plannedTarget, {
  bounded: true,
  bucketType: 'fixed-duration',
  dataKind: 'target-display',
  end: '2026-06-01 08:00',
  estimatedBars: 2,
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});

const sourceRecord = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  end: '2026-06-01 00:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: 1,
});
assert.equal(sourceFetchCalls.length, 1);
assert.equal(targetFetchCalls.length, 0);
assert.equal(sourceRecord.timeframe, 1);

const targetRecord = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW, {
  end: '2026-06-01 08:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});
assert.equal(sourceFetchCalls.length, 1);
assert.equal(targetFetchCalls.length, 1);
assert.equal(targetRecord.dataKind, 'target-display');
assert.equal(targetRecord.timeframe, '8h');
assert.equal(targetRecord.cacheHit, false);
assert.deepEqual(targetRecord.bars.map((bar) => bar.open), [100, 105]);

const cachedTarget = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW, {
  end: '2026-06-01 08:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});
assert.equal(targetFetchCalls.length, 1);
assert.equal(cachedTarget.cacheHit, true);

assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_TARGET_CACHE_SUMMARY), {
  barCount: 2,
  dataKind: 'target-display',
  keys: ['target|NQ|8h|2026-06-01 00:00|2026-06-01 08:00'],
  windowCount: 1,
});
assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY), {
  barCount: 1,
  keys: ['NQ|1|2026-06-01 00:00|2026-06-01 00:00'],
  windowCount: 1,
});

const releaseTarget = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_TARGET_WINDOW, {
  end: '2026-06-01 08:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});
assert.deepEqual(releaseTarget, {
  key: 'target|NQ|8h|2026-06-01 00:00|2026-06-01 08:00',
  released: true,
});

assert.equal(emitted.some((event) => event.eventName === BAR_DATA_EVENTS.WINDOW_LOADED), true);
assert.equal(emitted.some((event) => event.eventName === BAR_DATA_EVENTS.TARGET_WINDOW_LOADED), true);
assert.equal(emitted.some((event) => event.eventName === BAR_DATA_EVENTS.TARGET_WINDOW_RELEASED), true);

await registry.stop();

console.log('v6 bar-data target runtime step282 smoke passed');
