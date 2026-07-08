import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md', 'utf8');
const indicatorsContractDoc = await readFile('v6/docs/V6_INDICATORS_OWNER_CONTRACT.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const leftRailDoc = await readFile('v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md'), true);
assert.match(selectionDoc, /Drawing\/Action-History Owner\s+Contract/);
assert.match(selectionDoc, /Step 139 should establish a drawing\/action-history owner contract/);
assert.match(selectionDoc, /without\s+making the left drawing rail or top-toolbar undo\/redo controls interactive/);
assert.match(selectionDoc, /tool id, anchor points, target\s+pane, style, label, visibility, and metadata/);
assert.match(selectionDoc, /action id, action type, target,\s+timestamp, and metadata/);
assert.match(selectionDoc, /default read-only drawing intent state and validation helpers/);
assert.match(selectionDoc, /avoid drawing creation, chart overlays, pane mutation, undo\/redo execution/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(indicatorsContractDoc, /indicators owner contract/);
assert.match(reAuditDoc, /indicators, undo, redo, drawing\/action history/);
assert.match(parityGapDoc, /Owner contract selection for one deferred interactive family/);
assert.match(parityGapDoc, /drawing\/action-history/);
assert.match(guardrailsDoc, /Undo and redo[\s\S]*drawing runtime/);
assert.match(leftRailDoc, /all drawing\/tool placeholder buttons are disabled/);
assert.match(shellSource, /data-v6-left-drawing-tool="cursor" disabled/);
assert.match(shellSource, /data-v6-top-undo disabled/);
assert.match(shellSource, /data-v6-top-redo disabled/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'DRAWING_ACTION_HISTORY_COMMANDS',
  'INDICATORS_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SCREENSHOT_EXPORT_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'addLineSeries',
  'addHistogramSeries',
  'localStorage',
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection step 138 smoke passed');
