import assert from 'node:assert/strict';
import {
  createChartEntryContextPlan,
  getDefaultContextPrefixBars,
} from '../src/chart-entry/chart-entry-context-plan.js';

assert.equal(getDefaultContextPrefixBars(), 120);

const plan = createChartEntryContextPlan({
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'v6-session-0001',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'nq',
  timeframe: '1m',
});

assert.deepEqual(plan, {
  boundedContextWindow: {
    anchor: '2026-06-01T09:30:00.000Z',
    count: 121,
    direction: 'backward',
    instrument: 'NQ',
    timeframe: 1,
  },
  owner: 'runtime.chartEntryInitialization',
  sessionId: 'v6-session-0001',
  startBarAnchor: '2026-06-01T09:30:00.000Z',
  status: 'planned',
});

assert.deepEqual(createChartEntryContextPlan({
  id: 'v6-session-0002',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'ES',
  timeframe: '5m',
}, { prefixBars: 10 }).boundedContextWindow, {
  anchor: '2026-06-01T09:30:00.000Z',
  count: 11,
  direction: 'backward',
  instrument: 'ES',
  timeframe: 5,
});

assert.throws(
  () => createChartEntryContextPlan(null),
  /session is required/
);
assert.throws(
  () => createChartEntryContextPlan({
    id: 'v6-session-0001',
    startTime: 'bad',
    symbol: 'NQ',
    timeframe: '1m',
  }),
  /startTime must be a valid date\/time/
);
assert.throws(
  () => createChartEntryContextPlan({
    id: 'v6-session-0001',
    startTime: '2026-06-01T09:30:00.000Z',
    symbol: 'NQ',
    timeframe: '1h',
  }),
  /timeframe must be minute-based/
);

console.log('v6 chart entry context plan smoke passed');
