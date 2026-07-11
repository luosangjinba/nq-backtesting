import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'utf8',
);
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');

for (const requiredBrowserTerm of [
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE',
  'REPLAY_COMMANDS.SET_CURSOR_TIME',
  "targetMode = 'empty'",
  'target-history-no-visible-bars',
  "runtime.bar-data",
  "runtime.chart-data-projection",
  '2026-06-01T18:00:00.000Z',
  '2026-06-01T18:01:00.000Z',
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(manualNextRuntime, /const cursorTimestamp = parseReplayTimestamp\(replayState\.cursorTime, 'cursorTime'\);/);
assert.match(manualNextRuntime, /sourceBars: appendBars\.sourceBars/);
assert.match(manualNextRuntime, /REPLAY_COMMANDS\.NEXT/);
assert.match(manualNextRuntime, /REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);

for (const replayDrivenSource of [manualNextRuntime, autoPlayRuntime, replayRuntime]) {
  assert.doesNotMatch(replayDrivenSource, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars|targetHistory:\s*makeTargetHistory/);
}

assert.match(displayRuntime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /preserveSource:\s*true/);

for (const forbiddenBrowserTerm of [
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
  'setVisibleLogicalRange(',
  'setData(',
]) {
  assert.equal(browserSmoke.includes(forbiddenBrowserTerm), false, `Step337 browser smoke must not require ${forbiddenBrowserTerm}`);
}

console.log('v6 display timeframe target materialization replay coordination boundary step337 static smoke passed');
