import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const topChromeDoc = await readFile('v6/docs/V6_PRODUCT_TOP_CHROME.md', 'utf8');
const sessionSettingsAuditDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md', 'utf8');
const bottomChromeAuditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const presentationAuditDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md'), true);
assert.match(selectionDoc, /Diagnostics Visibility\s+Cleanup/);
assert.match(selectionDoc, /Step 131 should move readiness diagnostics out of the normal workstation header/);
assert.match(selectionDoc, /product surface, not a diagnostics board/);
assert.match(selectionDoc, /runtime count, command count, gate count, and gate-list telemetry/);
assert.match(selectionDoc, /keep readiness controller state available for tests/);
assert.match(selectionDoc, /without weakening readiness state or smoke-test coverage/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(reAuditDoc, /readiness\s+diagnostics exposure in the header/);
assert.match(reAuditDoc, /diagnostics visibility cleanup/);
assert.match(parityGapDoc, /Diagnostics visibility cleanup/);
assert.match(parityGapDoc, /Step 130 should select the next bounded workstation\/chart slice/);
assert.match(guardrailsDoc, /Engineering diagnostics[\s\S]*must not appear in the normal user surface/);
assert.match(topChromeDoc, /product surface, not a diagnostics board/);
assert.match(topChromeDoc, /Readiness telemetry may remain in DOM\/controller state/);
assert.match(sessionSettingsAuditDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(bottomChromeAuditDoc, /bottom\s+account\/trading chrome reservation/);
assert.match(presentationAuditDoc, /chart-data-surface-bridge\.js` is still the only path/);

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

console.log('v6 workstation chart slice selection step 130 smoke passed');
