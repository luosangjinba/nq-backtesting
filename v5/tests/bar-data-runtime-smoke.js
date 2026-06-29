import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, subscribeEvent } from '../src/runtime/events.js';
import {
  BAR_DATA_COMMANDS,
  createBarDataRuntime,
  normalizeBarWindow,
  planBoundedBarWindow,
} from '../src/runtime/bar-data-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const requests = [];
const runtime = createBarDataRuntime({
  maxBarsPerWindow: 5,
  fetchBars: async (window) => {
    requests.push(window);
    return {
      requestedRange: { startTs: 1780315800, endTs: 1780315920 },
      bars: [
        { timestamp: 1780315920, open: 102, high: 103, low: 101, close: 102.5 },
        { timestamp: 1780315800, open: 100, high: 101, low: 99, close: 100.5 },
        { timestamp: 1780315860, open: 100.5, high: 102, low: 100, close: 101.5 },
        { timestamp: 1780315860, open: 100.5, high: 102, low: 100, close: 101.5 },
      ],
    };
  },
});

let loadedEvent = null;
let releasedEvent = null;
const unsubscribeLoaded = subscribeEvent('barData:windowLoaded', (payload) => {
  loadedEvent = payload;
});
const unsubscribeReleased = subscribeEvent('barData:windowReleased', (payload) => {
  releasedEvent = payload;
});

runtime.start({
  emitEvent: (name, payload) => {
    if (name === 'barData:windowLoaded') loadedEvent = payload;
    if (name === 'barData:windowReleased') releasedEvent = payload;
  },
});
assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), true);

const planned = await dispatchCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, {
  instrument: 'nq',
  timeframe: 1,
  anchor: '2026-06-01T09:32:00.000Z',
  direction: 'backward',
  count: 3,
});
assert.deepEqual(planned, {
  instrument: 'NQ',
  timeframe: 1,
  start: '2026-06-01 09:30',
  end: '2026-06-01 09:32',
  anchor: '2026-06-01T09:32:00.000Z',
  direction: 'backward',
  estimatedBars: 3,
  bounded: true,
});

const loaded = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, planned);
assert.equal(requests.length, 1);
assert.equal(loaded.bars.length, 3);
assert.deepEqual(loaded.bars.map((bar) => bar.timestamp), [1780315800, 1780315860, 1780315920]);
assert.equal(loadedEvent.key, loaded.key);

const cached = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, planned);
assert.equal(requests.length, 1);
assert.equal(cached.cached, true);

const fetched = await dispatchCommand(BAR_DATA_COMMANDS.GET_WINDOW, planned);
assert.equal(fetched.key, loaded.key);

const summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 1);
assert.equal(summary.barCount, 3);

await assert.rejects(
  () => dispatchCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, {
    instrument: 'NQ',
    timeframe: 1,
    anchor: '2026-06-01T09:32:00.000Z',
    count: 6,
  }),
  /exceeds limit 5/
);
await assert.rejects(
  () => dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
    instrument: 'NQ',
    timeframe: 1,
    start: '2026-06-01T09:30:00.000Z',
    end: '2026-06-01T09:40:00.000Z',
  }),
  /estimates 11 bars, limit 5/
);

const released = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, planned);
assert.equal(released.released, true);
assert.equal(releasedEvent.key, loaded.key);
assert.equal((await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY)).windowCount, 0);

assert.deepEqual(
  planBoundedBarWindow({
    instrument: 'ES',
    timeframe: 5,
    anchor: '2026-06-01T10:00:00.000Z',
    direction: 'forward',
    count: 2,
  }, { maxBarsPerWindow: 5 }),
  {
    instrument: 'ES',
    timeframe: 5,
    start: '2026-06-01 10:00',
    end: '2026-06-01 10:05',
    anchor: '2026-06-01T10:00:00.000Z',
    direction: 'forward',
    estimatedBars: 2,
    bounded: true,
  }
);
assert.equal(normalizeBarWindow(planned).estimatedBars, 3);

runtime.stop();
unsubscribeLoaded();
unsubscribeReleased();
assert.equal(hasCommand(BAR_DATA_COMMANDS.LOAD_WINDOW), false);

console.log('v5 bar data runtime smoke passed');
