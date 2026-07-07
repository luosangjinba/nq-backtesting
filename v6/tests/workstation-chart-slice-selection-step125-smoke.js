import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md', 'utf8');
const bottomAuditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md'), true);
assert.match(selectionDoc, /Right Rail Session Settings\s+Panel Reservation/);
assert.match(selectionDoc, /Step 126 should reserve an inert right-rail Session settings panel/);
assert.match(selectionDoc, /Session Info, Balance & Assets, Spreads &\s+Commissions, and Date Range/);
assert.match(selectionDoc, /keep Chart Settings and Session settings distinct surfaces/);
assert.match(bottomAuditDoc, /left rail and lower workstation chrome are both reserved and regression-audited/);
assert.match(guardrailsDoc, /Chart settings and Session settings must remain distinct surfaces/);
assert.match(parityGapDoc, /Session settings panel reservation/);
assert.equal(shellSource.includes('data-v6-rail-session-settings'), true);

for (const forbiddenToken of [
  'ORDERS_COMMANDS',
  'CALENDAR_COMMANDS',
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

console.log('v6 workstation chart slice selection step 125 smoke passed');
