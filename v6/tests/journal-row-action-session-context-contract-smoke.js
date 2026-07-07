import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createJournalRowActionSessionContext,
  createJournalRowActionSessionContextContract,
  getJournalRowActionContextAllowedFields,
  getJournalRowActionContextBlockedFields,
  getJournalRowActionContextOwner,
} from '../src/journal/journal-row-action-session-context.js';
import { createJournalContract } from '../src/journal/journal-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile(
  'v6/docs/V6_JOURNAL_ROW_ACTION_SESSION_CONTEXT_CONTRACT.md',
  'utf8',
);
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_JOURNAL_ROW_ACTION_SESSION_CONTEXT_CONTRACT.md'), true);
assert.match(auditDoc, /dashboard Journal\s+row action remains hidden/);
assert.match(auditDoc, /source` is fixed to `recent-session-row/);
assert.match(auditDoc, /Step 112 should add a hidden Journal row-action harness/);

assert.equal(getJournalRowActionContextOwner(), 'journal-runtime');
assert.deepEqual(getJournalRowActionContextAllowedFields(), [
  'accountBalance',
  'createdAt',
  'endTime',
  'name',
  'profileId',
  'sessionId',
  'source',
  'startTime',
  'status',
  'symbol',
  'symbols',
  'timeframe',
  'workspaceId',
]);
assert.deepEqual(getJournalRowActionContextBlockedFields(), [
  'activeReplayState',
  'bars',
  'calendarEvents',
  'chartState',
  'journalEntries',
  'orders',
  'replayState',
  'viewportState',
]);

const contract = createJournalRowActionSessionContextContract();
assert.deepEqual(contract, {
  allowedFields: getJournalRowActionContextAllowedFields(),
  blockedFields: getJournalRowActionContextBlockedFields(),
  canAdvanceReplay: false,
  canLoadBars: false,
  canOpenChart: false,
  canQueryCalendar: false,
  canReadOrders: false,
  canTouchViewport: false,
  owner: 'journal-runtime',
  rowActionVisible: false,
  source: 'recent-session-row',
});
assert.equal(Object.isFrozen(contract), true);

const context = createJournalRowActionSessionContext({
  accountBalance: '125000',
  activeReplayState: { cursor: 10 },
  bars: [{ time: 1 }],
  calendarEvents: [{ title: 'FOMC' }],
  chartState: { paneId: 'main' },
  createdAt: '2026-07-07T09:00:00.000Z',
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'session-a',
  journalEntries: [{ id: 'journal-a' }],
  name: 'NQ Replay',
  orders: [{ id: 'order-a' }],
  profileId: 'profile-a',
  replayState: { revealedCount: 1 },
  startTime: '2026-06-01T09:30:00.000Z',
  status: 'planned',
  symbol: 'nq',
  symbols: ['nq', 'ES', 'nq'],
  timeframe: '1m',
  viewportState: { range: true },
  workspaceId: 'workspace-a',
});

assert.deepEqual(context, {
  accountBalance: 125000,
  createdAt: '2026-07-07T09:00:00.000Z',
  endTime: '2026-06-05T16:00:00.000Z',
  name: 'NQ Replay',
  profileId: 'profile-a',
  sessionId: 'session-a',
  source: 'recent-session-row',
  startTime: '2026-06-01T09:30:00.000Z',
  status: 'planned',
  symbol: 'NQ',
  symbols: ['NQ', 'ES'],
  timeframe: '1m',
  workspaceId: 'workspace-a',
});
assert.equal(Object.isFrozen(context), true);

for (const blockedField of getJournalRowActionContextBlockedFields()) {
  assert.equal(Object.hasOwn(context, blockedField), false, `${blockedField} must not enter context`);
}

assert.equal(createJournalContract().rowActionVisible, true);
assert.equal(createJournalContract().surfaceReady, true);
assert.equal(
  getRecentSessionRowActionBoundaries().find((action) => action.id === 'journal').visibleInRecentSessions,
  true,
);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 journal row action session context contract smoke passed');
