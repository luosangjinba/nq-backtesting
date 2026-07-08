import assert from 'node:assert/strict';
import {
  createRecentSessionsView,
  createSessionDateBoundaryView,
} from '../src/shell/session-dashboard-model.js';

const sessions = [
  {
    createdAt: '2026-07-04T10:00:00.000Z',
    endTime: '2026-07-04T16:00:00.000Z',
    id: 'session-a',
    name: 'London review',
    startTime: '2026-07-04T09:30:00.000Z',
    symbol: 'NQ',
    symbols: ['NQ'],
    timeframe: '1m',
  },
  {
    createdAt: '2026-07-05T10:00:00.000Z',
    endTime: '2026-07-05T16:00:00.000Z',
    id: 'session-b',
    name: 'NY AM',
    startTime: '2026-07-05T09:30:00.000Z',
    symbol: 'ES',
    symbols: ['ES', 'NQ'],
    timeframe: '5m',
  },
  {
    createdAt: '2026-07-03T10:00:00.000Z',
    endTime: '2026-07-03T16:00:00.000Z',
    id: 'session-c',
    name: 'Asia prep',
    startTime: '2026-07-03T09:30:00.000Z',
    symbol: 'YM',
    symbols: ['YM'],
    timeframe: '1m',
  },
];

assert.deepEqual(
  createRecentSessionsView(sessions).rows.map((session) => session.id),
  ['session-b', 'session-a', 'session-c']
);

assert.deepEqual(
  createRecentSessionsView(sessions, { sort: 'oldest' }).rows.map((session) => session.id),
  ['session-c', 'session-a', 'session-b']
);

assert.deepEqual(
  createRecentSessionsView(sessions, { query: 'nq' }).rows.map((session) => session.id),
  ['session-b', 'session-a']
);

assert.deepEqual(
  createRecentSessionsView(sessions, { page: 2, pageSize: 1 }).rows.map((session) => session.id),
  ['session-a']
);

assert.deepEqual(createRecentSessionsView(sessions, { page: 99, pageSize: 2 }), {
  page: 2,
  pageCount: 2,
  pageSize: 2,
  query: '',
  rows: [sessions[2]],
  sort: 'newest',
  totalCount: 3,
  visibleCount: 3,
});

assert.deepEqual(createSessionDateBoundaryView({
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ'],
}), {
  chartDataBoundaryLabel: 'Chart data from prior Globex open: 2026-05-31 18:00',
  hasActualChartDataBoundary: false,
  hasPriorGlobexOpen: true,
  tradingDateRangeLabel: '2026-06-01 / 2026-06-05',
});

assert.deepEqual(createSessionDateBoundaryView({
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ'],
  timeframe: '1m',
}, {
  chartBoundaryMetadata: {
    scopes: [{
      earliestLoadedTime: '2026-05-31 18:00',
      instrument: 'NQ',
      timeframe: 1,
    }],
  },
}), {
  chartDataBoundaryLabel: 'Chart data from loaded boundary: 2026-05-31 18:00',
  hasActualChartDataBoundary: true,
  hasPriorGlobexOpen: false,
  tradingDateRangeLabel: '2026-06-01 / 2026-06-05',
});

assert.deepEqual(createSessionDateBoundaryView({
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-02T09:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ'],
}), {
  chartDataBoundaryLabel: '',
  hasActualChartDataBoundary: false,
  hasPriorGlobexOpen: false,
  tradingDateRangeLabel: '2026-06-02 / 2026-06-05',
});

assert.deepEqual(createSessionDateBoundaryView({
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'YM',
  symbols: ['YM'],
}), {
  chartDataBoundaryLabel: '',
  hasActualChartDataBoundary: false,
  hasPriorGlobexOpen: false,
  tradingDateRangeLabel: '2026-06-01 / 2026-06-05',
});

console.log('v6 session dashboard model smoke passed');
