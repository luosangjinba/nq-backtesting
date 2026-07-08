import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const step143Doc = await readFile('v6/docs/V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md', 'utf8');
const step142Doc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md', 'utf8');
const architectureDoc = await readFile('v6/docs/V6_ARCHITECTURE.md', 'utf8');
const accountTradingDoc = await readFile('v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md', 'utf8');
const todoDoc = await readFile('v6/TODO.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.match(indexDoc, /V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143\.md/);
assert.match(step143Doc, /supersedes the Step 142 Comparison Symbol Owner Contract direction/);
assert.match(step142Doc, /Comparison Symbol Owner\s+Contract/);
assert.match(step143Doc, /database-backed bounded K-line import through the bar-data owner path/);
assert.match(step143Doc, /leftward historical K-line extension/);
assert.match(step143Doc, /older bounded window through\s+bar-data and keep extending left until the data source reports no older bars/);
assert.match(step143Doc, /cap each triggered historical request at the canvas-left timeline boundary/);
assert.match(step143Doc, /preserve replay-visible speed/);
assert.match(step143Doc, /must not introduce obvious candle reveal latency/);
assert.match(step143Doc, /replay K-line chart flow/);
assert.match(step143Doc, /reset view behavior through chart-viewport ownership/);
assert.match(step143Doc, /multi-pane chart flow through the existing pane model/);
assert.match(step143Doc, /Step 144 should establish the database K-line import boundary/);
assert.match(step143Doc, /bar-data runtime as the only owner that requests and caches bars/);
assert.match(step143Doc, /chart-engine remains the only owner of chart\s+series writes/);
assert.match(step143Doc, /Lightweight Charts supports built-in series types and a plugin system/);
assert.match(step143Doc, /avoid chart series writes, chart overlays, replay cursor mutation, viewport\s+mutation, multi-pane UI, simulated trading, comparison symbols/);
assert.match(architectureDoc, /Only bar data runtime requests and caches bars|Bar Data Runtime[\s\S]*cache keys/);
assert.match(architectureDoc, /Only chart runtime writes chart series|Chart Engine Adapter[\s\S]*setData/);
assert.match(architectureDoc, /Only replay runtime owns replay cursor|Replay Runtime[\s\S]*replay cursor/);
assert.match(accountTradingDoc, /order placement, position mutation, account mutation/);
assert.match(todoDoc, /Latest completed step: Step 162 - Layout Pane Data Bootstrap Boundary/);
assert.match(todoDoc, /Step 163 - Pane-Local Reset View Controls/);
assert.match(todoDoc, /preserve Step 162 layout pane data bootstrap/);
assert.match(todoDoc, /preserve Step 161 layout pane surface reflow/);
assert.match(todoDoc, /preserve Step 160 layout menu owner binding/);
assert.match(todoDoc, /preserve Step 159 selected owner boundary and non-goals/);
assert.match(todoDoc, /preserve Step 158 chart foundation integration audit coverage/);
assert.match(todoDoc, /preserve Step 157 pane-local replay viewport projection isolation/);
assert.match(todoDoc, /preserve Step 156 pane-local replay append and auto-play isolation/);
assert.match(todoDoc, /preserve continuous leftward exhaustion stopping and canvas-left request caps/);

for (const forbiddenToken of [
  'COMPARISON_SYMBOL_COMMANDS',
  'ACCOUNT_TRADING_COMMANDS',
  'ORDERS_COMMANDS',
  'addCustomSeries',
  'attachPrimitive',
  'series.setData',
  'series.update',
  'createChart',
  'localStorage',
]) {
  assert.equal(step143Doc.includes(forbiddenToken), false, `reprioritization doc must not choose runtime-owned ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 chart foundation reprioritization step 143 smoke passed');
