import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md', 'utf8');
const sessionSettingsContractDoc = await readFile('v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md'), true);
assert.match(selectionDoc, /Screenshot\/Export Owner\s+Contract/);
assert.match(selectionDoc, /Step 135 should establish a screenshot\/export owner contract/);
assert.match(selectionDoc, /without making the\s+top-toolbar Screenshot button interactive/);
assert.match(selectionDoc, /source surface, format,\s+filename, dimensions, background, and metadata/);
assert.match(selectionDoc, /default read-only export intent state and validation helpers/);
assert.match(selectionDoc, /avoid screenshot capture, canvas reads, downloads, browser storage, or\s+persistence/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(sessionSettingsContractDoc, /session-settings owner contract/);
assert.match(reAuditDoc, /screenshot\/export/);
assert.match(parityGapDoc, /Owner contract selection for one deferred interactive family/);
assert.match(parityGapDoc, /screenshot\/export/);
assert.match(guardrailsDoc, /Screenshot[\s\S]*export\/screenshot owner exists/);
assert.doesNotMatch(shellSource, /data-v6-top-screenshot/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'ORDERS_COMMANDS',
  'REPLAY_COMMANDS',
  'SESSION_SETTINGS_COMMANDS',
  'SCREENSHOT_EXPORT_COMMANDS',
  'createChart',
  'series.setData',
  'series.update',
  'setVisibleLogicalRange',
  'captureScreenshot',
  'toDataURL',
  'toBlob',
  'createObjectURL',
  'localStorage',
  'download=',
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection step 134 smoke passed');
