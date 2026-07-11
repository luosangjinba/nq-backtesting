import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const handoff = await readFile('v6/src/display-timeframe/display-timeframe-target-materialization-handoff.js', 'utf8');
const revealPolicy = await readFile('v6/src/materialization/target-bar-reveal-policy.js', 'utf8');
const shellControl = await readFile('v6/src/shell/display-timeframe-control.js', 'utf8');
const shellTargetBridge = await readFile('v6/src/shell/display-timeframe-pane-target-bridge.js', 'utf8');

for (const contractSurface of [
  "GET_STATE: 'replay.getState'",
  "GET_SOURCE_BARS: 'chartData.getSourceBars'",
  "PLAN_TARGET_WINDOW: 'barData.planTargetWindow'",
  "LOAD_TARGET_WINDOW: 'barData.loadTargetWindow'",
  "REPLACE_BARS: 'chartData.replaceBars'",
]) {
  assert.ok(contracts.includes(contractSurface), `contracts must expose ${contractSurface}`);
}

assert.match(displayRuntime, /REPLAY_COMMANDS\.GET_STATE/);
assert.match(displayRuntime, /CHART_DATA_COMMANDS\.GET_SOURCE_BARS/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /resolveDisplayTimeframeTargetMaterializationHandoff/);
assert.match(displayRuntime, /preserveSource:\s*true/);
assert.match(displayRuntime, /source-replay-cursor-unavailable/);
assert.match(displayRuntime, /runtime\.bar-data/);
assert.match(displayRuntime, /CHART_DATA_PROJECTION_COMMANDS\.PROJECT/);

assert.match(handoff, /sourceCursorTimestampFromState/);
assert.match(handoff, /resolveTargetBarRevealState/);
assert.match(handoff, /target-history-no-visible-bars/);
assert.doesNotMatch(handoff, /from\s+['"][^'"]*replay\//);
assert.doesNotMatch(handoff, /\breplayCursor\b/);

assert.match(revealPolicy, /source-cursor-inside-target-bucket/);
assert.match(revealPolicy, /target-bar-complete-before-or-at-source-cursor/);
assert.match(revealPolicy, /target-bar-start-after-source-cursor/);

for (const shellSource of [shellControl, shellTargetBridge]) {
  assert.doesNotMatch(shellSource, /BAR_DATA_COMMANDS|LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
  assert.doesNotMatch(shellSource, /CHART_DATA_COMMANDS\.REPLACE_BARS|REPLAY_COMMANDS\.GET_STATE/);
}

for (const forbiddenRuntimeSurface of [
  /REPLAY_COMMANDS\.NEXT/,
  /REPLAY_COMMANDS\.PREVIOUS/,
  /REPLAY_COMMANDS\.SET_CURSOR_TIME/,
  /CHART_VIEWPORT_COMMANDS\.RESET_VIEW/,
  /CHART_VIEWPORT_COMMANDS\.SET_MANUAL_INTENT/,
  /\.setData\(/,
  /\.setVisibleLogicalRange\(/,
  /\bfetch\b/,
  /\blocalStorage\b/,
  /\bXMLHttpRequest\b/,
]) {
  assert.doesNotMatch(
    displayRuntime,
    forbiddenRuntimeSurface,
    `display-timeframe runtime handoff must not use ${forbiddenRuntimeSurface}`,
  );
}

console.log('v6 display timeframe target materialization runtime boundary step335 static smoke passed');
