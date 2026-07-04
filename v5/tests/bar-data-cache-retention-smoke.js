import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, hasCommand } from '../src/runtime/commands.js';
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
const deferredEvents = [];
const releaseEvents = [];
const runtime = createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    return {
      bars: [
        bar(`${window.start}:00.000Z`.replace(' ', 'T'), 100 + requests.length),
        bar(`${window.end}:00.000Z`.replace(' ', 'T'), 101 + requests.length),
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

assert.equal(hasCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE), true);

const sharedWindow = {
  instrument: 'NQ',
  timeframe: 1,
  anchor: '2026-06-01T10:00:00.000Z',
  direction: 'backward',
  count: 4,
};
const sessionBWindow = {
  ...sharedWindow,
  anchor: '2026-06-01T11:00:00.000Z',
};

const primaryLoad = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  ...sharedWindow,
  sessionId: 'session-a',
  paneId: 'primary',
});
const secondaryLoad = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  ...sharedWindow,
  sessionId: 'session-a',
  paneId: 'secondary',
});
assert.equal(secondaryLoad.cached, true);
assert.equal(secondaryLoad.key, primaryLoad.key);
assert.equal(requests.length, 1);

const sessionBLoad = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  ...sessionBWindow,
  sessionId: 'session-b',
  paneId: 'primary',
});
assert.notEqual(sessionBLoad.key, primaryLoad.key);
assert.equal(requests.length, 2);

let summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 2);
assert.deepEqual(
  summary.windows.find((window) => window.key === primaryLoad.key).cacheScopes,
  [
    { sessionId: 'session-a', paneId: 'primary' },
    { sessionId: 'session-a', paneId: 'secondary' },
  ]
);

const releaseSecondary = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE, {
  sessionId: 'session-a',
  paneId: 'secondary',
});
assert.equal(releaseSecondary.deferred.length, 0);
assert.equal(releaseSecondary.released.length, 0);
assert.deepEqual(releaseSecondary.retained.map((entry) => entry.key), [primaryLoad.key]);

summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.deepEqual(
  summary.windows.find((window) => window.key === primaryLoad.key).cacheScopes,
  [{ sessionId: 'session-a', paneId: 'primary' }]
);
assert.equal(summary.windows.find((window) => window.key === primaryLoad.key).releaseDeferred, false);

const releaseSessionA = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE, {
  sessionId: 'session-a',
});
assert.deepEqual(releaseSessionA.deferred.map((entry) => entry.key), [primaryLoad.key]);
assert.equal(releaseSessionA.released.length, 0);
assert.equal(deferredEvents.length, 1);

summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 2);
assert.equal(summary.windows.find((window) => window.key === primaryLoad.key).releaseDeferred, true);
assert.deepEqual(summary.windows.find((window) => window.key === primaryLoad.key).cacheScopes, []);
assert.deepEqual(
  summary.windows.find((window) => window.key === sessionBLoad.key).cacheScopes,
  [{ sessionId: 'session-b', paneId: 'primary' }]
);

const cachedWhileDeferred = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  ...sharedWindow,
  sessionId: 'session-a',
  paneId: 'primary',
});
assert.equal(cachedWhileDeferred.cached, true);
assert.equal(requests.length, 2);

const releaseSessionAAgain = await dispatchCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE, {
  sessionId: 'session-a',
});
assert.deepEqual(releaseSessionAAgain.deferred.map((entry) => entry.key), [primaryLoad.key]);

const pruned = await dispatchCommand(BAR_DATA_COMMANDS.PRUNE_CACHE, {
  maxWindows: 1,
});
assert.deepEqual(pruned.released.map((entry) => entry.key), [primaryLoad.key]);
assert.equal(pruned.retainedWindowCount, 1);
assert.equal(releaseEvents.length, 1);

summary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(summary.windowCount, 1);
assert.equal(summary.windows[0].key, sessionBLoad.key);

runtime.stop();
assert.equal(hasCommand(BAR_DATA_COMMANDS.RELEASE_SCOPE), false);

console.log('v5 bar data cache retention smoke passed');
