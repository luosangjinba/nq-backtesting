import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { BAR_DATA_COMMANDS, createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

function bar(value, open) {
  return {
    timestamp: timestamp(value),
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

clearCommandsForTest();
clearEventsForTest();

const requests = [];
const releaseEvents = [];
const deferredEvents = [];
const runtime = createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    return {
      bars: [
        bar(`${window.start}:00.000Z`.replace(' ', 'T'), 100),
        bar(`${window.end}:00.000Z`.replace(' ', 'T'), 101),
      ],
    };
  },
});

runtime.start({
  emitEvent: (name, payload) => {
    if (name === 'barData:windowReleaseDeferred') deferredEvents.push(payload);
    if (name === 'barData:windowReleased') releaseEvents.push(payload);
  },
});

const displayWindow = {
  instrument: 'NQ',
  timeframe: 5,
  anchor: '2026-06-01T10:00:00.000Z',
  direction: 'backward',
  count: 4,
};

const first = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, displayWindow);
assert.equal(requests.length, 1);
assert.equal(first.cached, false);

const second = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, displayWindow);
assert.equal(requests.length, 1);
assert.equal(second.cached, true);
assert.equal(second.key, first.key);

const deferred = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_WINDOW, {
  ...displayWindow,
  defer: true,
});
assert.deepEqual(deferred, {
  key: first.key,
  released: false,
  deferred: true,
});
assert.equal(deferredEvents.length, 1);
assert.equal(releaseEvents.length, 0);

let summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 1);
assert.equal(summary.windows[0].releaseDeferred, true);

const afterDeferredRelease = await dispatchCommand(BAR_DATA_COMMANDS.GET_WINDOW, displayWindow);
assert.equal(afterDeferredRelease.key, first.key);
assert.equal(requests.length, 1);

const cachedAfterDeferredRelease = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, displayWindow);
assert.equal(cachedAfterDeferredRelease.cached, true);
assert.equal(requests.length, 1);

const pruned = await dispatchCommand(BAR_DATA_COMMANDS.PRUNE_CACHE, {
  maxWindows: 0,
});
assert.equal(pruned.retainedWindowCount, 0);
assert.deepEqual(pruned.released.map((entry) => entry.key), [first.key]);
assert.equal(releaseEvents.length, 1);

summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 0);
assert.equal(await dispatchCommand(BAR_DATA_COMMANDS.GET_WINDOW, displayWindow), null);

const afterPrune = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, displayWindow);
assert.equal(afterPrune.cached, false);
assert.equal(requests.length, 2);

runtime.stop();

console.log('v5 replay display window cache smoke passed');
