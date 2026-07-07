import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createJournalContract } from '../src/journal/journal-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile('v6/docs/V6_JOURNAL_SURFACE_READY_FLAG_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const browserSmoke = await readFile('v6/tests/hidden-journal-row-action-browser-smoke.js', 'utf8');
const harnessSmoke = await readFile('v6/tests/hidden-journal-row-action-harness-smoke.js', 'utf8');
const contextSmoke = await readFile('v6/tests/journal-row-action-session-context-contract-smoke.js', 'utf8');

assert.equal(indexDoc.includes('V6_JOURNAL_SURFACE_READY_FLAG_AUDIT.md'), true);
assert.match(auditDoc, /surfaceReady` is now true/);
assert.match(auditDoc, /rowActionVisible` remains false/);
assert.match(auditDoc, /Recent Sessions still renders only Summary, Stats, and Copy/);
assert.match(auditDoc, /Step 115 should audit readiness/);

const journalContract = createJournalContract();
assert.equal(journalContract.commandSurfaceReady, true);
assert.equal(journalContract.persistenceReady, true);
assert.equal(journalContract.surfaceReady, true);
assert.equal(journalContract.rowActionVisible, false);
assert.equal(journalContract.canLoadBars, false);
assert.equal(journalContract.canOpenChart, false);
assert.equal(journalContract.canAdvanceReplay, false);
assert.equal(journalContract.canTouchViewport, false);
assert.equal(journalContract.canReadOrders, false);
assert.equal(journalContract.canQueryCalendar, false);
assert.equal(journalContract.blockedIntegrations.includes('session-dashboard'), true);

const journalAction = getRecentSessionRowActionBoundaries().find((action) => action.id === 'journal');
assert.deepEqual(
  {
    enabled: journalAction.enabled,
    owner: journalAction.owner,
    status: journalAction.status,
    visible: journalAction.visibleInRecentSessions,
  },
  {
    enabled: false,
    owner: 'journal-runtime',
    status: 'future',
    visible: false,
  },
);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

assert.equal(browserSmoke.includes('data-v6-row-action="journal"'), false);
assert.equal(browserSmoke.includes('rowActionsBefore'), true);
assert.equal(browserSmoke.includes("['summary', 'analytics', 'copy']"), true);
assert.equal(harnessSmoke.includes('rowActionVisible: false'), true);
assert.equal(contextSmoke.includes('getJournalRowActionContextBlockedFields'), true);

console.log('v6 journal surface ready flag audit smoke passed');
