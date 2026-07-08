import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md', 'utf8');
const sessionSettingsAuditDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md', 'utf8');
const bottomChromeAuditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const presentationAuditDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md'), true);
assert.match(selectionDoc, /Step 129 should re-audit the current workstation shell/);
assert.match(reAuditDoc, /No workstation chrome implementation was added/);
assert.match(reAuditDoc, /readiness\s+diagnostics exposure in the header/);
assert.match(reAuditDoc, /diagnostics visibility cleanup/);
assert.match(parityGapDoc, /Updated Priority Order/);
assert.match(parityGapDoc, /Diagnostics visibility cleanup/);
assert.match(parityGapDoc, /Step 130 should select the next bounded workstation\/chart slice/);
assert.match(guardrailsDoc, /Engineering diagnostics[\s\S]*must not appear in the normal user surface/);
assert.match(sessionSettingsAuditDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(bottomChromeAuditDoc, /bottom\s+account\/trading chrome reservation/);
assert.match(presentationAuditDoc, /chart-data-surface-bridge\.js` is still the only path/);

for (const requiredSelector of [
  'data-v6-top-interval',
  'data-v6-top-indicators',
  'data-v6-settings-toggle',
  'data-v6-settings-panel',
  'data-v6-left-drawing-rail',
  'data-v6-right-utility-rail',
  'data-v6-rail-session-settings',
  'data-v6-session-settings-panel',
  'data-v6-bottom-account-chrome',
  'data-v6-transport',
  'data-v6-status-readout',
  'data-v6-readiness-surface',
]) {
  assert.equal(shellSource.includes(requiredSelector), true, `${requiredSelector} should exist in workstation shell`);
}

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
  assert.equal(reAuditDoc.includes(forbiddenToken), false, `re-audit doc must not choose runtime-owned ${forbiddenToken}`);
  assert.equal(parityGapDoc.includes(forbiddenToken), false, `parity gap doc must not choose runtime-owned ${forbiddenToken}`);
}

for (const staleDirection of [
  'Step 50 should reserve',
  'Step 51 should reserve',
  'Session settings panel reservation: make',
  'Left drawing rail reservation: add',
  'Bottom chrome audit: align',
]) {
  assert.equal(parityGapDoc.includes(staleDirection), false, `${staleDirection} should not remain active`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation ui parity gap re-audit smoke passed');
