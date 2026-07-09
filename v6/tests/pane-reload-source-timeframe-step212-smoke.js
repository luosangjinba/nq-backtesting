import assert from 'node:assert/strict';
import { createReplaySafeReloadWindowPlan } from '../src/pane-intent-reload/pane-intent-reload-window-plan.js';

const replayState = {
  cursorTime: '2026-06-01T16:30:00.000Z',
  startTime: '2026-06-01T16:30:00.000Z',
  timeframe: '1',
};

function planFor(displayTimeframe) {
  return createReplaySafeReloadWindowPlan({
    reloadIntent: {
      displayTimeframe,
      instrument: 'NQ',
      paneId: `pane-${displayTimeframe}`,
      reason: 'interval',
      source: 'pane-intent',
    },
    replayState,
  });
}

const fiveMinute = planFor(5);
assert.equal(fiveMinute.displayTimeframe, 5);
assert.equal(fiveMinute.sourceTimeframe, 1);
assert.equal(fiveMinute.sessionStartTime, replayState.startTime);
assert.equal(fiveMinute.window.timeframe, 1);
assert.equal(fiveMinute.window.estimatedBars, 600);
assert.equal(fiveMinute.window.requestCap, 'replay-cursor');

const fifteenMinute = planFor(15);
assert.equal(fifteenMinute.displayTimeframe, 15);
assert.equal(fifteenMinute.sourceTimeframe, 1);
assert.equal(fifteenMinute.sessionStartTime, replayState.startTime);
assert.equal(fifteenMinute.window.timeframe, 1);
assert.equal(fifteenMinute.window.estimatedBars, 1800);
assert.equal(fifteenMinute.window.requestCap, 'replay-cursor');

console.log('v6 pane reload source timeframe step 212 smoke passed');
