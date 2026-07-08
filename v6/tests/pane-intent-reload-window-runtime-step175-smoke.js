import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PANE_INTENT_RELOAD_EVENTS,
  PANE_INTENT_RELOAD_PLAN_COMMANDS,
  PANE_INTENT_RELOAD_PLAN_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createPaneIntentReloadWindowRuntime } from '../src/pane-intent-reload/pane-intent-reload-window-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createPaneIntentReloadWindowRuntime());

const plannedEvents = [];
const unsubscribePlanned = subscribeEvent(PANE_INTENT_RELOAD_PLAN_EVENTS.PLANNED, (records) => {
  plannedEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE), true);

emitEvent(PANE_INTENT_RELOAD_EVENTS.INTENT_CREATED, [{
  displayTimeframe: 1,
  instrument: 'NQ',
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
}]);
await Promise.resolve();
assert.equal(plannedEvents.length, 0);
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE), {
  lastError: 'Pane intent reload window plan requires replay cursor time.',
  lastPlans: [],
  plannedCount: 0,
  status: 'error',
});

await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
  endTime: '2026-06-01T09:34:00.000Z',
  id: 'session-1',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1',
});
await dispatchCommand(REPLAY_COMMANDS.NEXT);
await dispatchCommand(REPLAY_COMMANDS.NEXT);

emitEvent(PANE_INTENT_RELOAD_EVENTS.INTENT_CREATED, [
  {
    displayTimeframe: 1,
    instrument: 'NQ',
    paneId: 'main',
    reason: 'symbol',
    source: 'pane-intent',
  },
  {
    displayTimeframe: 5,
    instrument: 'ES',
    paneId: 'secondary',
    reason: 'interval',
    source: 'pane-intent-sync',
  },
]);
await Promise.resolve();

assert.equal(plannedEvents.length, 1);
assert.deepEqual(plannedEvents[0], [
  {
    noFuture: true,
    paneId: 'main',
    reason: 'symbol',
    source: 'pane-intent',
    window: {
      anchor: '2026-06-01T09:32:00.000Z',
      bounded: true,
      direction: 'backward',
      end: '2026-06-01 09:32',
      estimatedBars: 120,
      instrument: 'NQ',
      requestCap: 'replay-cursor',
      start: '2026-06-01 07:33',
      timeframe: 1,
    },
  },
  {
    noFuture: true,
    paneId: 'secondary',
    reason: 'interval',
    source: 'pane-intent-sync',
    window: {
      anchor: '2026-06-01T09:32:00.000Z',
      bounded: true,
      direction: 'backward',
      end: '2026-06-01 09:32',
      estimatedBars: 120,
      instrument: 'ES',
      requestCap: 'replay-cursor',
      start: '2026-05-31 23:37',
      timeframe: 5,
    },
  },
]);
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE), {
  lastError: null,
  lastPlans: plannedEvents[0],
  plannedCount: 2,
  status: 'planned',
});

await registry.stop();
unsubscribePlanned();
assert.equal(hasCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-window-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload window runtime must not contain ${token}`);
}

console.log('v6 pane intent reload window runtime step 175 smoke passed');
