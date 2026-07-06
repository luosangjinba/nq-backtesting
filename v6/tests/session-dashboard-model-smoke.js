import assert from 'node:assert/strict';
import { createRecentSessionsView } from '../src/shell/session-dashboard-model.js';

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

console.log('v6 session dashboard model smoke passed');
