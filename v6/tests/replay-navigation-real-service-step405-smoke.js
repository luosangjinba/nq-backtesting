import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { fetchV4Bars } from '../src/bar-data/v4-bars-adapter.js';
import { REPLAY_NAVIGATION_ACTIONS } from '../src/replay-navigation/replay-navigation-schedule.js';
import { resolveReplayNavigationTarget } from '../src/replay-navigation/replay-navigation-target-resolver.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const runtime = createBarDataRuntime({
  fetchBars: (window) => fetchV4Bars(window, { apiBase: 'http://127.0.0.1:8766' }),
  fetchRetryLimit: 0,
  maxBarsPerWindow: 500,
});
const registry = createRuntimeRegistry();
registry.registerRuntime(runtime);
await registry.start({ emitEvent });

try {
  const resolved = await resolveReplayNavigationTarget({
    action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
    dispatchCommand,
    maxCandidates: 4,
    pane: { instrument: 'NQ' },
    replayState: {
      cursorTime: '2026-05-01T10:00:00.000Z',
      endTime: '2026-05-04T12:00:00.000Z',
      symbol: 'NQ',
      timeframe: '1m',
    },
  });

  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.attemptedCandidates, 3, 'Saturday and Sunday anchors have no nearby source bars');
  assert.equal(resolved.candidate.localDate, '2026-05-04');
  assert.equal(resolved.candidate.localTime, '09:30');
  assert.equal(resolved.candidate.timestampIso, '2026-05-04T09:30:00.000Z');
  assert.equal(resolved.sourceCursorTime, '2026-05-04T09:30:00.000Z');
  assert.equal(resolved.sourceBar.time, '2026-05-04T09:30:00.000Z');
  assert.equal(resolved.distanceMs, 0);
  assert.equal(resolved.loadedWindow.bars.every((bar) => (
    bar.timestamp >= Date.parse('2026-05-04T09:30:00.000Z') / 1000
    && bar.timestamp <= Date.parse('2026-05-04T09:45:00.000Z') / 1000
  )), true);
} finally {
  await registry.stop();
  clearCommandsForTest();
  clearEventsForTest();
}

console.log('V6 replay navigation real-service Step 405 smoke passed.');
