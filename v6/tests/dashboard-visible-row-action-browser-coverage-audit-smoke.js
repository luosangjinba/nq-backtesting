import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSessionAnalyticsContract } from '../src/session-analytics/session-analytics-contract.js';
import { createSessionCopyContract } from '../src/session/session-copy-contract.js';
import { createSessionSummaryContract } from '../src/session-summary/session-summary-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile('v6/docs/V6_DASHBOARD_VISIBLE_ROW_ACTION_BROWSER_COVERAGE_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const summaryBrowserSmoke = await readFile('v6/tests/session-summary-surface-browser-smoke.js', 'utf8');
const analyticsBrowserSmoke = await readFile('v6/tests/session-analytics-surface-browser-smoke.js', 'utf8');
const copyBrowserSmoke = await readFile('v6/tests/session-copy-action-browser-smoke.js', 'utf8');

const actions = getRecentSessionRowActionBoundaries();
const byId = new Map(actions.map((action) => [action.id, action]));
const summaryContract = createSessionSummaryContract();
const analyticsContract = createSessionAnalyticsContract();
const copyContract = createSessionCopyContract();

assert.equal(indexDoc.includes('V6_DASHBOARD_VISIBLE_ROW_ACTION_BROWSER_COVERAGE_AUDIT.md'), true);
assert.match(auditDoc, /Step 108 should audit the dashboard\/session browser regression pack/);
assert.match(auditDoc, /Summary is covered by `session-summary-surface-browser-smoke\.js`/);
assert.match(auditDoc, /Stats is covered by `session-analytics-surface-browser-smoke\.js`/);
assert.match(auditDoc, /Copy is covered by `session-copy-action-browser-smoke\.js`/);
assert.match(auditDoc, /Order, Journal, and Calendar remain hidden/);

assert.deepEqual(getVisibleRecentSessionRowActions().map((action) => action.id), [
  'summary',
  'analytics',
  'copy',
]);
assert.equal(byId.get('summary').owner, summaryContract.owner);
assert.equal(byId.get('analytics').owner, analyticsContract.owner);
assert.equal(byId.get('copy').owner, copyContract.owner);
assert.equal(byId.get('order').visibleInRecentSessions, false);
assert.equal(byId.get('journal').visibleInRecentSessions, false);
assert.equal(byId.get('calendar').visibleInRecentSessions, false);

assert.equal(summaryContract.canLoadBars, false);
assert.equal(summaryContract.canOpenChart, false);
assert.equal(summaryContract.canMutateSession, false);
assert.equal(summaryBrowserSmoke.includes('[data-v6-row-action="summary"]'), true);
assert.equal(summaryBrowserSmoke.includes('Close session summary'), true);
assert.equal(summaryBrowserSmoke.includes('fieldCount, 14'), true);
assert.equal(summaryBrowserSmoke.includes("owner: 'session-summary'"), true);
assert.equal(summaryBrowserSmoke.includes('afterOpen.snapshot, value.before'), true);
assert.equal(summaryBrowserSmoke.includes('afterEscape.snapshot, value.before'), true);
assert.equal(summaryBrowserSmoke.includes('afterCloseButton.snapshot, value.before'), true);

assert.equal(analyticsContract.canLoadBars, false);
assert.equal(analyticsContract.canOpenChart, false);
assert.equal(analyticsContract.canAdvanceReplay, false);
assert.equal(analyticsContract.canTouchViewport, false);
assert.equal(analyticsBrowserSmoke.includes('[data-v6-row-action="analytics"]'), true);
assert.equal(analyticsBrowserSmoke.includes('Close session stats'), true);
assert.equal(analyticsBrowserSmoke.includes('metricFields.length, 10'), true);
assert.equal(analyticsBrowserSmoke.includes("owner: 'session-analytics'"), true);
assert.equal(analyticsBrowserSmoke.includes("value === '--'"), true);
assert.equal(analyticsBrowserSmoke.includes('afterOpen.snapshot, value.before'), true);
assert.equal(analyticsBrowserSmoke.includes('afterSummary.snapshot, value.before'), true);
assert.equal(analyticsBrowserSmoke.includes('afterCloseButton.snapshot, value.before'), true);

assert.equal(copyContract.canCreateMetadataRecord, true);
assert.equal(copyContract.canCopyBars, false);
assert.equal(copyContract.canCopyChartState, false);
assert.equal(copyContract.canCopyOrders, false);
assert.equal(copyContract.canCopyJournal, false);
assert.equal(copyContract.canCopyCalendar, false);
assert.equal(copyContract.canTouchViewport, false);
assert.equal(copyBrowserSmoke.includes('[data-v6-row-action="copy"]'), true);
assert.equal(copyBrowserSmoke.includes("sessions[1].id, 'v6-session-0001'"), true);
assert.equal(copyBrowserSmoke.includes("sessions[1].name, 'Copy source Copy'"), true);
assert.equal(copyBrowserSmoke.includes('after, value.before'), true);
assert.equal(copyBrowserSmoke.includes('state.summary, { open: false'), true);
assert.equal(copyBrowserSmoke.includes('state.analytics, { open: false'), true);

for (const source of [summaryBrowserSmoke, analyticsBrowserSmoke, copyBrowserSmoke]) {
  assert.equal(source.includes('barData.getCacheSummary'), true);
  assert.equal(source.includes('chartData.getSummary'), true);
  assert.equal(source.includes('chartEntry.getState'), true);
  assert.equal(source.includes('replay.getState'), true);
  for (const forbiddenToken of [
    'ORDER_COMMANDS',
    'JOURNAL_COMMANDS',
    'CALENDAR_COMMANDS',
    'BAR_DATA_COMMANDS.LOAD_WINDOW',
    'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
    'REPLAY_COMMANDS.NEXT',
    'fetch(',
    'XMLHttpRequest',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `visible row-action browser smoke must not use ${forbiddenToken}`);
  }
}

console.log('v6 dashboard visible row action browser coverage audit smoke passed');
