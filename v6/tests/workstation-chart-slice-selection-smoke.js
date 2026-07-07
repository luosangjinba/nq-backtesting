import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const presentationReauditDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION.md'), true);
assert.match(selectionDoc, /Left Drawing Rail Reservation/);
assert.match(selectionDoc, /Step 120 should reserve a vertical left drawing\/tool rail/);
assert.match(selectionDoc, /disabled or inert until a drawing\/tool owner exists/);
assert.match(selectionDoc, /chart host remains mounted, visible, and non-overlapped/);

assert.match(guardrailsDoc, /The left toolbar is a vertical drawing\/tool strip/);
assert.match(parityGapDoc, /\| Left toolbar \| Missing \| Vertical drawing\/tool icon strip/);
assert.match(parityGapDoc, /Reserve shell rail without fake drawing behavior/);
assert.match(presentationReauditDoc, /chart host\/adapter\/bridge ownership boundary/);

for (const forbiddenToken of [
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
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection smoke passed');
