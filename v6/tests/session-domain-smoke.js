import assert from 'node:assert/strict';
import {
  advanceSessionIdsAfterExistingSessions,
  createReplaySession,
  getDefaultSessionInput,
  resetSessionIdsForTest,
} from '../src/session/session-domain.js';
import { createInMemorySessionRepository } from '../src/session/session-repository.js';

resetSessionIdsForTest();

const defaults = getDefaultSessionInput();
assert.deepEqual(defaults, {
  accountBalance: 100000,
  autoUpdateEndDate: false,
  endTime: '2026-06-05T16:00:00.000Z',
  name: 'Backtesting session',
  profileId: 'default-profile',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ'],
  timeframe: '1m',
  workspaceId: 'default-workspace',
});

const session = createReplaySession({
  createdAt: '2026-07-04T00:00:00.000Z',
});
assert.deepEqual(session, {
  createdAt: '2026-07-04T00:00:00.000Z',
  accountBalance: defaults.accountBalance,
  autoUpdateEndDate: false,
  endTime: defaults.endTime,
  id: 'v6-session-0001',
  name: defaults.name,
  profileId: defaults.profileId,
  startTime: defaults.startTime,
  status: 'created',
  symbol: defaults.symbol,
  symbols: defaults.symbols,
  timeframe: defaults.timeframe,
  workspaceId: defaults.workspaceId,
});

const custom = createReplaySession({
  createdAt: '2026-07-04T00:00:01.000Z',
  accountBalance: 250000,
  autoUpdateEndDate: true,
  endTime: '2026-06-02T16:00:00-04:00',
  name: 'NY AM review',
  profileId: 'fx-profile',
  startTime: '2026-06-02T09:30:00-04:00',
  symbols: ['es', 'nq', 'ES'],
  timeframe: '5m',
  workspaceId: 'main-workspace',
});
assert.equal(custom.id, 'v6-session-0002');
assert.equal(custom.accountBalance, 250000);
assert.equal(custom.autoUpdateEndDate, true);
assert.equal(custom.name, 'NY AM review');
assert.equal(custom.symbol, 'ES');
assert.deepEqual(custom.symbols, ['ES', 'NQ']);
assert.equal(custom.startTime, '2026-06-02T13:30:00.000Z');
assert.equal(custom.endTime, '2026-06-02T20:00:00.000Z');

assert.throws(
  () => createReplaySession({ startTime: '2026-06-02T10:00:00Z', endTime: '2026-06-02T10:00:00Z' }),
  /startTime must be before endTime/
);

const repository = createInMemorySessionRepository();
const saved = repository.save(session);
saved.symbol = 'MUTATED';
saved.symbols.push('BROKEN');
assert.equal(repository.getActive().symbol, 'NQ');
assert.deepEqual(repository.getActive().symbols, ['NQ']);
assert.equal(repository.getById(session.id).id, session.id);
assert.equal(repository.list().length, 1);
const copy = repository.copyMetadata(session.id, {
  createdAt: '2026-07-04T02:00:00.000Z',
});
assert.equal(copy.id, 'v6-session-0003');
assert.equal(copy.name, 'Backtesting session Copy');
assert.equal(copy.createdAt, '2026-07-04T02:00:00.000Z');
assert.equal(copy.symbol, session.symbol);
assert.deepEqual(copy.symbols, session.symbols);
assert.equal(repository.getActive().id, copy.id);
assert.deepEqual(repository.list().map((item) => item.id), [session.id, copy.id]);
assert.throws(
  () => repository.copyMetadata('missing-session'),
  /Session missing-session does not exist/
);
repository.clear();
assert.equal(repository.getActive(), null);

resetSessionIdsForTest();
assert.equal(advanceSessionIdsAfterExistingSessions([
  { id: 'custom-session' },
  { id: 'v6-session-0002' },
  { id: 'v6-session-0010' },
]), 11);
assert.equal(createReplaySession({
  createdAt: '2026-07-04T03:00:00.000Z',
}).id, 'v6-session-0011');

console.log('v6 session domain smoke passed');
