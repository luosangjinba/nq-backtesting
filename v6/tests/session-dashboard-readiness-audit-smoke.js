import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const dashboardSource = await readFile('v6/src/shell/session-dashboard.js', 'utf8');
const auditDoc = await readFile('v6/docs/V6_SESSION_DASHBOARD_READINESS_REAUDIT.md', 'utf8');

const imports = [...dashboardSource.matchAll(/from\s+['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .sort();

assert.deepEqual(imports, [
  '../contracts/app-contracts.js',
  '../runtime/commands.js',
  '../runtime/events.js',
  './session-analytics-surface.js',
  './session-dashboard-model.js',
  './session-row-action-boundaries.js',
  './safe-dom-render.js',
  './session-setup-model.js',
  './session-summary-surface.js',
].sort());

for (const forbiddenImport of [
  '../bar-data',
  '../calendar',
  '../chart-data',
  '../chart-engine',
  '../chart-entry',
  '../chart-viewport',
  '../journal',
  '../orders',
  '../replay',
  '../viewport',
]) {
  assert.equal(
    imports.some((specifier) => specifier.includes(forbiddenImport)),
    false,
    `session dashboard must not import ${forbiddenImport}`,
  );
}

assert.deepEqual(
  [...dashboardSource.matchAll(/SESSION_COMMANDS\.([A-Z_]+)/g)].map((match) => match[1]).sort(),
  ['COPY', 'CREATE', 'DELETE', 'LIST', 'OPEN'].sort(),
);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_ENTRY_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'JOURNAL_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'VIEWPORT_COMMANDS',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'loadWindow',
  'replayCursor',
  'viewportIntent',
]) {
  assert.equal(
    dashboardSource.includes(forbiddenToken),
    false,
    `session dashboard must not own ${forbiddenToken}`,
  );
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

assert.deepEqual(
  getRecentSessionRowActionBoundaries()
    .filter((action) => !action.visibleInRecentSessions)
    .map((action) => [action.id, action.owner, action.enabled]),
  [
    ['order', 'orders-runtime', false],
    ['calendar', 'calendar-runtime', false],
  ],
);

assert.match(auditDoc, /Step 99 should be Workstation Replay\/Chart Re-entry Audit/);
assert.match(auditDoc, /do not modify dashboard row action visibility/i);
assert.match(auditDoc, /no dashboard path gains chart, replay, bar-data, or viewport ownership/i);

console.log('v6 session dashboard readiness audit smoke passed');
