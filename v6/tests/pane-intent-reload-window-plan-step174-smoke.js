import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createReplaySafeReloadWindowPlan,
  createReplaySafeReloadWindowPlans,
} from '../src/pane-intent-reload/pane-intent-reload-window-plan.js';

const reloadIntent = Object.freeze({
  displayTimeframe: 5,
  instrument: 'NQ',
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
});

const plan = createReplaySafeReloadWindowPlan({
  count: 4,
  reloadIntent,
  replayState: {
    cursorTime: '2026-06-01T16:30:00.000Z',
  },
});

assert.deepEqual(plan, {
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
  window: {
    anchor: '2026-06-01T16:30:00.000Z',
    bounded: true,
    direction: 'backward',
    end: '2026-06-01 16:30',
    estimatedBars: 4,
    instrument: 'NQ',
    requestCap: 'replay-cursor',
    start: '2026-06-01 16:15',
    timeframe: 5,
  },
});
assert.equal(Object.isFrozen(plan), true);
assert.equal(Object.isFrozen(plan.window), true);

const multiPlans = createReplaySafeReloadWindowPlans({
  count: 2,
  reloadIntents: [
    reloadIntent,
    {
      displayTimeframe: 1,
      instrument: 'ES',
      paneId: 'secondary',
      reason: 'interval',
      source: 'pane-intent-sync',
    },
  ],
  replayState: {
    cursorTimestamp: 1780306200,
  },
});
assert.equal(Object.isFrozen(multiPlans), true);
assert.equal(multiPlans.length, 2);
assert.deepEqual(multiPlans.map((record) => record.window.end), [
  '2026-06-01 09:30',
  '2026-06-01 09:30',
]);
assert.deepEqual(multiPlans.map((record) => record.window.start), [
  '2026-06-01 09:25',
  '2026-06-01 09:29',
]);

assert.throws(
  () => createReplaySafeReloadWindowPlan({ reloadIntent, replayState: {} }),
  /requires replay cursor time/,
);
assert.throws(
  () => createReplaySafeReloadWindowPlans({ reloadIntents: null, replayState: { cursorTime: '2026-06-01T09:30:00.000Z' } }),
  /require an array/,
);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-window-plan.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload window plan must not contain ${token}`);
}

console.log('v6 pane intent reload window plan step 174 smoke passed');
