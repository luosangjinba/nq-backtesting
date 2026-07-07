import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createJournalContract } from '../src/journal/journal-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile('v6/docs/V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const dashboardSource = await readFile('v6/src/shell/session-dashboard.js', 'utf8');
const hiddenBrowserSmoke = await readFile('v6/tests/hidden-journal-row-action-browser-smoke.js', 'utf8');
const readyFlagSmoke = await readFile('v6/tests/journal-surface-ready-flag-audit-smoke.js', 'utf8');

assert.equal(indexDoc.includes('V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md'), true);
assert.match(auditDoc, /ready for a deliberate exposure implementation step/);
assert.match(auditDoc, /ready for a deliberate exposure implementation step/);
assert.match(auditDoc, /Step 116 should implement Journal row-action visibility wiring/);

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

assert.equal(dashboardSource.includes("v6RowAction === 'summary'"), true);
assert.equal(dashboardSource.includes("v6RowAction === 'analytics'"), true);
assert.equal(dashboardSource.includes("v6RowAction === 'copy'"), true);
assert.equal(dashboardSource.includes("v6RowAction === 'journal'"), true);
assert.equal(hiddenBrowserSmoke.includes("rowActionsBefore, ['summary', 'analytics', 'copy', 'journal']"), true);
assert.equal(readyFlagSmoke.includes('surfaceReady, true'), true);
assert.equal(readyFlagSmoke.includes('rowActionVisible, true'), true);

console.log('v6 journal row action exposure gate audit smoke passed');
