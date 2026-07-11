import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile('v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js', 'utf8');
const runtime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const handoff = await readFile('v6/src/display-timeframe/display-timeframe-target-materialization-handoff.js', 'utf8');
const shellControl = await readFile('v6/src/shell/display-timeframe-control.js', 'utf8');
const shellBridge = await readFile('v6/src/shell/display-timeframe-pane-target-bridge.js', 'utf8');
const step335Doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_RUNTIME_HANDOFF_STEP335.md', 'utf8');

for (const requiredTerm of [
  'auditHighTimeframeTargetHistoryResponsiveness',
  "expectedTf: '8h'",
  "expectedTf: '1D'",
  "expectedTf: '1W'",
  "displayTimeframe: 1",
  "targetMode = 'empty'",
  "target-history-no-visible-bars",
  "runtime.bar-data",
  "runtime.chart-data-projection",
  'sourcePreserved',
]) {
  assert.match(browserSmoke, new RegExp(requiredTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step335Doc, /Step 336 should verify/);
assert.match(runtime, /REPLAY_COMMANDS\.GET_STATE/);
assert.match(runtime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(runtime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(runtime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(runtime, /preserveSource:\s*true/);
assert.match(handoff, /resolveDisplayTimeframeTargetMaterializationHandoff/);
assert.match(handoff, /sourceCursorTimestampFromState/);

for (const shellSource of [shellControl, shellBridge]) {
  assert.doesNotMatch(shellSource, /BAR_DATA_COMMANDS|LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
  assert.doesNotMatch(shellSource, /CHART_DATA_COMMANDS\.REPLACE_BARS|REPLAY_COMMANDS\.GET_STATE/);
}

for (const forbiddenRuntimeTerm of [
  'REPLAY_COMMANDS.NEXT',
  'REPLAY_COMMANDS.PREVIOUS',
  'REPLAY_COMMANDS.SET_CURSOR_TIME',
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
  'setVisibleLogicalRange(',
  'setData(',
]) {
  assert.equal(runtime.includes(forbiddenRuntimeTerm), false, `Step336 must not require ${forbiddenRuntimeTerm}`);
}

console.log('v6 display timeframe target materialization browser boundary step336 static smoke passed');
