import assert from 'node:assert/strict';
import {
  createChartEntryDefaultWallPlan,
  getDefaultWallPlanDefaults,
} from '../src/chart-entry/chart-entry-default-wall-plan.js';

const bootstrap = {
  context: {
    anchor: '2026-06-01T09:30:00.000Z',
    loadedWindow: {
      bounded: true,
      end: '2026-06-01 09:30',
      estimatedBars: 121,
      instrument: 'NQ',
      start: '2026-06-01 07:30',
      timeframe: 1,
    },
    plannedWindow: {
      bounded: true,
      end: '2026-06-01 09:30',
      estimatedBars: 121,
      instrument: 'NQ',
      start: '2026-06-01 07:30',
      timeframe: 1,
    },
    record: {
      barCount: 121,
      cacheHit: false,
      key: 'NQ|1|2026-06-01 07:30|2026-06-01 09:30',
    },
    sessionId: 'session-plan',
  },
  replayState: {
    cursorIndex: 0,
    cursorTime: '2026-06-01T09:30:00.000Z',
    sessionId: 'session-plan',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
  },
  sessionId: 'session-plan',
};

assert.deepEqual(getDefaultWallPlanDefaults(), {
  latestOffsetBars: 12,
  paneId: 'main',
  prefixBars: 120,
  spanBars: 80,
});

const plan = createChartEntryDefaultWallPlan(bootstrap);
assert.equal(plan.owner, 'runtime.chartEntryDefaultWallPlan');
assert.equal(plan.status, 'planned');
assert.equal(plan.sessionId, 'session-plan');
assert.equal(plan.paneId, 'main');
assert.equal(plan.anchor, '2026-06-01T09:30:00.000Z');
assert.equal(plan.cursorTime, '2026-06-01T09:30:00.000Z');
assert.equal(plan.cursorIndex, 0);
assert.equal(plan.prefixBars, 120);
assert.equal(plan.spanBars, 80);
assert.equal(plan.latestOffsetBars, 12);
assert.equal(plan.context.record.barCount, 121);
assert.equal('bars' in plan.context.record, false);
assert.deepEqual(plan.context.loadedWindow, bootstrap.context.loadedWindow);
assert.throws(
  () => createChartEntryDefaultWallPlan({ ...bootstrap, context: null }),
  /context is required/,
);
assert.throws(
  () => createChartEntryDefaultWallPlan({ ...bootstrap, replayState: null }),
  /replay state is required/,
);

const custom = createChartEntryDefaultWallPlan(bootstrap, {
  latestOffsetBars: 20,
  paneId: 'pane-2',
  prefixBars: 50,
  spanBars: 30,
});
assert.equal(custom.paneId, 'pane-2');
assert.equal(custom.prefixBars, 50);
assert.equal(custom.spanBars, 30);
assert.equal(custom.latestOffsetBars, 20);

console.log('v6 chart entry default wall plan smoke passed');
