import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createJournalContract } from '../src/journal/journal-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile(
  'v6/docs/V6_JOURNAL_ROW_ACTION_OWNER_SURFACE_READINESS_AUDIT.md',
  'utf8',
);
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const journalSurfaceSource = await readFile('v6/src/shell/journal-surface.js', 'utf8');
const controllerSmoke = await readFile('v6/tests/journal-surface-controller-smoke.js', 'utf8');
const workflowBrowserSmoke = await readFile('v6/tests/workflow-panels-browser-smoke.js', 'utf8');
const recentSessionsBrowserSmoke = await readFile(
  'v6/tests/recent-sessions-controls-browser-smoke.js',
  'utf8',
);
const dashboardBrowserSmoke = await readFile('v6/tests/session-dashboard-browser-smoke.js', 'utf8');

assert.equal(
  indexDoc.includes('V6_JOURNAL_ROW_ACTION_OWNER_SURFACE_READINESS_AUDIT.md'),
  true,
);
assert.match(auditDoc, /not ready for dashboard row-action exposure yet/);
assert.match(auditDoc, /workstation Journal panel is a valid journal-owned surface/);
assert.match(auditDoc, /not yet a session-scoped dashboard row-action surface/);
assert.match(auditDoc, /Keep the Journal dashboard row action hidden/);
assert.match(auditDoc, /data-v6-row-action="journal"/);
assert.match(auditDoc, /Step 111 should define the Journal row-action session context contract/);

const journalContract = createJournalContract();
assert.deepEqual(
  {
    canAdvanceReplay: journalContract.canAdvanceReplay,
    canLoadBars: journalContract.canLoadBars,
    canOpenChart: journalContract.canOpenChart,
    canQueryCalendar: journalContract.canQueryCalendar,
    canReadOrders: journalContract.canReadOrders,
    canTouchViewport: journalContract.canTouchViewport,
    commandSurfaceReady: journalContract.commandSurfaceReady,
    persistenceReady: journalContract.persistenceReady,
    rowActionVisible: journalContract.rowActionVisible,
    surfaceReady: journalContract.surfaceReady,
  },
  {
    canAdvanceReplay: false,
    canLoadBars: false,
    canOpenChart: false,
    canQueryCalendar: false,
    canReadOrders: false,
    canTouchViewport: false,
    commandSurfaceReady: true,
    persistenceReady: true,
    rowActionVisible: false,
    surfaceReady: true,
  },
);
assert.equal(journalContract.blockedIntegrations.includes('session-dashboard'), true);

const actions = getRecentSessionRowActionBoundaries();
const journalAction = actions.find((action) => action.id === 'journal');
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

assert.equal(journalSurfaceSource.includes('JOURNAL_COMMANDS'), true);
assert.equal(journalSurfaceSource.includes('JOURNAL_PERSISTENCE_COMMANDS'), true);
for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'ORDERS_COMMANDS',
  'CALENDAR_COMMANDS',
]) {
  assert.equal(journalSurfaceSource.includes(forbiddenToken), false);
}

assert.equal(controllerSmoke.includes('forbiddenCommands'), true);
assert.equal(controllerSmoke.includes('BAR_DATA_COMMANDS.LOAD_WINDOW'), true);
assert.equal(controllerSmoke.includes('CHART_DATA_COMMANDS.APPEND_BARS'), true);
assert.equal(controllerSmoke.includes('CHART_VIEWPORT_COMMANDS.ENSURE_INTENT'), true);
assert.equal(controllerSmoke.includes('REPLAY_COMMANDS.LOAD_SESSION'), true);
assert.equal(workflowBrowserSmoke.includes('[data-v6-journal-toggle]'), true);
assert.equal(workflowBrowserSmoke.includes('[data-v6-journal-panel]'), true);

for (const browserSmoke of [recentSessionsBrowserSmoke, dashboardBrowserSmoke, workflowBrowserSmoke]) {
  assert.equal(browserSmoke.includes('data-v6-row-action="journal"'), false);
}

console.log('v6 journal row action owner surface readiness audit smoke passed');
