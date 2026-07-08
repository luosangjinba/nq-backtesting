import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md', 'utf8');
const sessionSettingsAuditDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md', 'utf8');
const sessionSettingsReservationDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md', 'utf8');
const bottomChromeAuditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const leftRailDoc = await readFile('v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md'), true);
assert.match(selectionDoc, /Workstation UI Parity Gap\s+Re-audit/);
assert.match(selectionDoc, /Step 129 should re-audit the current workstation shell/);
assert.match(selectionDoc, /left drawing rail, bottom\s+account\/trading chrome, and Session settings panel stabilization/);
assert.match(selectionDoc, /top toolbar, timeframe menu, and chart settings entry behavior/);
assert.match(selectionDoc, /settings modal parity and diagnostics visibility/);
assert.match(selectionDoc, /multi-pane readiness and any remaining runtime-owned gap classification/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(sessionSettingsAuditDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(sessionSettingsReservationDoc, /Session Info, Balance & Assets, Spreads &\s+Commissions, and Date Range/);
assert.match(bottomChromeAuditDoc, /bottom account\/trading chrome/);
assert.match(leftRailDoc, /left drawing\/tool rail/);
assert.match(guardrailsDoc, /Chart settings and Session settings must remain distinct surfaces/);
assert.match(parityGapDoc, /Priority Order/);

for (const forbiddenToken of [
  'ORDERS_COMMANDS',
  'CALENDAR_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'CHART_VIEWPORT_COMMANDS.ENSURE_INTENT',
  'DEFAULT_WALL_COMMANDS.LOAD',
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'REPLAY_COMMANDS.NEXT',
  'BAR_DATA_COMMANDS.LOAD_WINDOW',
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'localStorage.setItem',
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection step 128 smoke passed');
