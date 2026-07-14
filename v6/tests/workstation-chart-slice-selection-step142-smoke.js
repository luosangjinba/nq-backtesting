import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md', 'utf8');
const accountTradingContractDoc = await readFile('v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md', 'utf8');
const reAuditDoc = await readFile('v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md', 'utf8');
const parityGapDoc = await readFile('v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md'), true);
assert.match(selectionDoc, /Comparison Symbol Owner\s+Contract/);
assert.match(selectionDoc, /Step 143 should establish a comparison symbol owner contract/);
assert.match(selectionDoc, /without making the\s+top-toolbar Add comparison symbol button interactive/);
assert.match(selectionDoc, /base symbol, comparison\s+symbol, display mode, scale mode, color, source series, visibility, session\s+id, and metadata/);
assert.match(selectionDoc, /price, percent, indexed, and spread/);
assert.match(selectionDoc, /overlay and separate-scale/);
assert.match(selectionDoc, /default read-only comparison intent state and validation helpers/);
assert.match(selectionDoc, /avoid symbol search, bar requests, comparison series creation, chart series\s+writes, chart primitives\/plugins/);
assert.match(selectionDoc, /Lightweight Charts supports plugins, primitives, and series APIs/);
assert.match(selectionDoc, /dashboard visible row actions from Summary, Stats, Copy, and\s+Journal/);

assert.match(accountTradingContractDoc, /account\/trading owner contract/);
assert.match(reAuditDoc, /comparison symbol/);
assert.match(parityGapDoc, /comparison, indicators, undo\/redo, session hours, screenshot, theme, fullscreen need owners/);
assert.match(parityGapDoc, /Comparison symbols, RTH\/ETH, page layout, theme, and fullscreen controls/);
assert.match(guardrailsDoc, /Add comparison symbol[\s\S]*explicit comparison\/multi-symbol owner/);
assert.doesNotMatch(shellSource, /data-v6-top-compare/);
assert.doesNotMatch(shellSource, /aria-label="Add comparison symbol"/);

for (const forbiddenToken of [
  'ACCOUNT_TRADING_COMMANDS',
  'BAR_DATA_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'COMPARISON_SYMBOL_COMMANDS',
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
  'addCustomSeries',
  'attachPrimitive',
  'localStorage',
]) {
  assert.equal(selectionDoc.includes(forbiddenToken), false, `selection doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart slice selection step 142 smoke passed');
