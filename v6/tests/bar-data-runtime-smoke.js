import assert from 'node:assert/strict';
import { BAR_DATA_COMMANDS, BAR_DATA_EVENTS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const requests = [];
const loadedEvents = [];
const releasedEvents = [];
const unsubscribeLoaded = subscribeEvent(BAR_DATA_EVENTS.WINDOW_LOADED, (payload) => {
  loadedEvents.push(payload);
});
const unsubscribeReleased = subscribeEvent(BAR_DATA_EVENTS.WINDOW_RELEASED, (payload) => {
  releasedEvents.push(payload);
});

const runtime = createBarDataRuntime({
  maxBarsPerWindow: 5,
  fetchBars: async (window) => {
    requests.push(window);
    return {
      bars: [
        { timestamp: 1780306140, open: 99, high: 100, low: 98, close: 99.5 },
        { timestamp: 1780306320, open: 102, high: 103, low: 101, close: 102.5 },
        { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
        { time: '2026-06-01 09:31', open: 100.5, high: 102, low: 100, close: 101.5 },
        { timestamp: 1780306380, open: 103, high: 104, low: 102, close: 103.5 },
      ],
      requestedRange: { startTs: 1780306200, endTs: 1780306320 },
      timing: {
        durationMs: 14,
        parseMs: 3,
        requestMs: 11,
        source: 'test-fetch',
      },
    };
  },
});

const registry = createRuntimeRegistry();
registry.registerRuntime(runtime);
await registry.start({ emitEvent });

assert.equal(hasCommand(BAR_DATA_COMMANDS.PLAN_WINDOW), true);
assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), true);
assert.equal(listenerCount(BAR_DATA_EVENTS.WINDOW_LOADED), 1);

const planned = await dispatchCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, {
  anchor: '2026-06-01T09:32:00.000Z',
  count: 3,
  direction: 'backward',
  instrument: 'nq',
  timeframe: 1,
});
assert.deepEqual(planned, {
  anchor: '2026-06-01T09:32:00.000Z',
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:32',
  estimatedBars: 3,
  instrument: 'NQ',
  start: '2026-06-01 09:30',
  timeframe: 1,
});

const loaded = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, planned);
assert.equal(requests.length, 1);
assert.equal(loaded.cacheHit, false);
assert.deepEqual(loaded.bars.map((bar) => bar.timestamp), [1780306200, 1780306260, 1780306320]);
assert.deepEqual(loaded.timing, {
  durationMs: 14,
  parseMs: 3,
  requestMs: 11,
  source: 'test-fetch',
});
assert.equal(loadedEvents.length, 1);
assert.equal(loadedEvents[0].key, loaded.key);

const cached = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, planned);
assert.equal(requests.length, 1);
assert.equal(cached.cacheHit, true);
assert.equal(loadedEvents.length, 1);

const covered = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  anchor: '2026-06-01T09:31:00.000Z',
  count: 2,
  direction: 'forward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(requests.length, 1);
assert.equal(covered.cacheHit, true);
assert.equal(covered.coveredByKey, loaded.key);
assert.deepEqual(covered.bars.map((bar) => bar.timestamp), [1780306260, 1780306320]);

const fetched = await dispatchCommand(BAR_DATA_COMMANDS.GET_WINDOW, planned);
assert.equal(fetched.key, loaded.key);

const summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.deepEqual(summary, {
  barCount: 3,
  keys: [loaded.key],
  windowCount: 1,
});

await assert.rejects(
  () => dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
    end: '2026-06-01T09:40:00.000Z',
    instrument: 'NQ',
    start: '2026-06-01T09:30:00.000Z',
    timeframe: 1,
  }),
  /estimates 11 bars, limit 5/
);

const released = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, planned);
assert.equal(released.released, true);
assert.equal(releasedEvents.length, 1);
assert.equal(releasedEvents[0].key, loaded.key);

await registry.stop();
assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), false);
unsubscribeLoaded();
unsubscribeReleased();
assert.equal(listenerCount(BAR_DATA_EVENTS.WINDOW_LOADED), 0);

console.log('v6 bar data runtime smoke passed');
