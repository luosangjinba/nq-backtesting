import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const step130Doc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md', 'utf8');
const sessionSettingsAuditDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md', 'utf8');
const diagnosticsTest = await readFile('v6/tests/diagnostics-visibility-cleanup-browser-smoke.js', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md'), true);
assert.match(selectionDoc, /Session Settings Owner\s+Contract/);
assert.match(selectionDoc, /Step 133 should establish a session-settings owner contract/);
assert.match(selectionDoc, /without making the\s+right-rail panel interactive/);
assert.match(selectionDoc, /Session\s+Info, Balance & Assets, Spreads & Commissions, and Date Range/);
assert.match(selectionDoc, /keep Chart Settings and Session settings distinct surfaces/);
assert.match(selectionDoc, /avoid persistence until a session-settings runtime\/repository owner/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(reAuditDoc, /Session settings persistence and command\/event ownership/);
assert.match(parityGapDoc, /Owner contract selection for one deferred interactive family/);
assert.match(parityGapDoc, /session-settings/);
assert.match(step130Doc, /Diagnostics Visibility\s+Cleanup/);
assert.match(sessionSettingsAuditDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(diagnosticsTest, /runtime\/command\/gate|runtimeText/);

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

console.log('v6 workstation chart slice selection step 132 smoke passed');
