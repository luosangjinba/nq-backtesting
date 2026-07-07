import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createJournalContract } from '../src/journal/journal-contract.js';
import { createHiddenJournalRowActionHarness } from '../src/journal/journal-row-action-hidden-harness.js';
import {
  createJournalRowActionSessionContext,
  getJournalRowActionContextBlockedFields,
} from '../src/journal/journal-row-action-session-context.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const harnessDoc = await readFile('v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_HARNESS.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const harnessSource = await readFile('v6/src/journal/journal-row-action-hidden-harness.js', 'utf8');

assert.equal(indexDoc.includes('V6_HIDDEN_JOURNAL_ROW_ACTION_HARNESS.md'), true);
assert.match(harnessDoc, /dashboard Journal row action remains hidden/);
assert.match(harnessDoc, /injected\s+`createJournalRowActionSessionContext` context factory/);
assert.match(harnessDoc, /Step 113 should add a hidden browser harness/);

for (const forbiddenToken of [
  'dispatchCommand',
  'registerCommand',
  'JOURNAL_COMMANDS',
  'JOURNAL_PERSISTENCE_COMMANDS',
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'ORDERS_COMMANDS',
  'CALENDAR_COMMANDS',
  '../shell/',
  '../session/',
]) {
  assert.equal(harnessSource.includes(forbiddenToken), false, `${forbiddenToken} must not enter harness`);
}

const openedContexts = [];
const refreshedContexts = [];
const harness = createHiddenJournalRowActionHarness({
  createContext: createJournalRowActionSessionContext,
  openSurface: (context) => openedContexts.push(context),
  refreshSurface: async (context) => refreshedContexts.push(context),
});

assert.throws(
  () => createHiddenJournalRowActionHarness(),
  /requires a context factory/,
);

assert.deepEqual(harness.getState(), {
  context: null,
  opened: false,
  refreshed: false,
  rowActionVisible: false,
});

const prepared = harness.prepare({
  activeReplayState: { cursor: 10 },
  bars: [{ time: 1 }],
  calendarEvents: [{ title: 'NFP' }],
  chartState: { paneId: 'main' },
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'journal-session-a',
  journalEntries: [{ id: 'entry-a' }],
  name: 'Journal Session',
  orders: [{ id: 'order-a' }],
  replayState: { revealedCount: 1 },
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'nq',
  timeframe: '1m',
  viewportState: { range: true },
});
assert.equal(prepared.context.sessionId, 'journal-session-a');
assert.equal(prepared.context.symbol, 'NQ');
assert.equal(prepared.opened, false);
assert.equal(prepared.refreshed, false);
assert.equal(prepared.rowActionVisible, false);

for (const blockedField of getJournalRowActionContextBlockedFields()) {
  assert.equal(Object.hasOwn(prepared.context, blockedField), false, `${blockedField} must not enter harness context`);
}

const opened = await harness.open({
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'journal-session-b',
  name: 'Journal Session B',
  startTime: '2026-06-01T09:30:00.000Z',
  symbols: ['es', 'nq'],
  timeframe: '5m',
});
assert.equal(opened.context.sessionId, 'journal-session-b');
assert.deepEqual(opened.context.symbols, ['ES', 'NQ']);
assert.equal(opened.opened, true);
assert.equal(opened.refreshed, true);
assert.equal(opened.rowActionVisible, false);
assert.deepEqual(openedContexts, [opened.context]);
assert.deepEqual(refreshedContexts, [opened.context]);

assert.equal(createJournalContract().rowActionVisible, false);
assert.equal(
  getRecentSessionRowActionBoundaries().find((action) => action.id === 'journal').visibleInRecentSessions,
  false,
);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

console.log('v6 hidden journal row action harness smoke passed');
