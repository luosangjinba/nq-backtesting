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
assert.match(auditDoc, /rowActionVisible` is now true/);
assert.match(auditDoc, /Recent Sessions now renders Summary, Stats, Copy, and Journal/);
assert.match(auditDoc, /Step 115 should audit readiness/);

const journalContract = createJournalContract();
assert.equal(journalContract.commandSurfaceReady, true);
assert.equal(journalContract.persistenceReady, true);
assert.equal(journalContract.surfaceReady, true);
assert.equal(journalContract.rowActionVisible, true);
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
    enabled: true,
    owner: 'journal-runtime',
    status: 'surface-ready',
    visible: true,
  },
);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

assert.equal(browserSmoke.includes("rowActionsBefore, ['summary', 'analytics', 'copy', 'journal']"), true);
assert.equal(browserSmoke.includes('rowActionsBefore'), true);
assert.equal(browserSmoke.includes("['summary', 'analytics', 'copy', 'journal']"), true);
assert.equal(harnessSmoke.includes('rowActionVisible: false'), true);
assert.equal(contextSmoke.includes('getJournalRowActionContextBlockedFields'), true);

console.log('v6 journal surface ready flag audit smoke passed');
