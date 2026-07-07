import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md', 'utf8');
const railAuditDoc = await readFile('v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md'), true);
assert.match(selectionDoc, /Bottom Account\/Trading Chrome Reservation/);
assert.match(selectionDoc, /Step 123 should reserve an inert bottom account\/trading chrome strip/);
assert.match(selectionDoc, /disabled\/inert placeholders for Buy, Sell, quantity, account balance/);
assert.match(selectionDoc, /moving replay transport ownership into chart runtime or trading\/account\s+chrome/);
assert.match(railAuditDoc, /replay transport remains a floating shell transport/);
assert.match(guardrailsDoc, /Trading\/account chrome stays along the bottom edge/);
assert.match(parityGapDoc, /Bottom chrome audit: align transport plus account\/trading chrome/);

for (const forbiddenToken of [
  'ORDERS_COMMANDS',
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

console.log('v6 workstation chart slice selection step 122 smoke passed');
