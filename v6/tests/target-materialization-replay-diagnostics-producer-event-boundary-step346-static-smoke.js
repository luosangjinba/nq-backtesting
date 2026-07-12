import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const runtimeSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js', 'utf8');
const mapper = await readFile('v6/src/replay/target-materialization-replay-diagnostics-producer-payload-mappers.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(runtime, /subscribeEvent/);
assert.match(runtime, /DISPLAY_TIMEFRAME_EVENTS\.APPLIED/);
assert.match(runtime, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(runtime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.STARTED/);
assert.match(runtime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.TICKED/);
assert.match(runtime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.STOPPED/);
assert.match(runtime, /mapTargetMaterializationReplayDiagnosticsProducerPayload/);
assert.match(runtime, /updateSnapshot\(update\)/);
assert.match(runtimeSmoke, /listenerCount\(DISPLAY_TIMEFRAME_EVENTS\.APPLIED\), 1/);
assert.match(runtimeSmoke, /listenerCount\(DISPLAY_TIMEFRAME_EVENTS\.APPLIED\), 0/);

for (const forbiddenRuntimeSurface of [
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
  /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/,
  /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/,
  /CHART_DATA_COMMANDS\.REPLACE_BARS/,
  /CHART_DATA_COMMANDS\.APPEND_BARS/,
  /CHART_VIEWPORT_COMMANDS/,
  /REPLAY_COMMANDS\.NEXT/,
  /REPLAY_COMMANDS\.SET_CURSOR_TIME/,
]) {
  assert.doesNotMatch(
    runtime,
    forbiddenRuntimeSurface,
    `diagnostics producer event wiring must not use ${forbiddenRuntimeSurface}`,
  );
}

assert.doesNotMatch(mapper, /subscribeEvent|dispatchCommand|registerCommand/);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

for (const shellSource of shellFiles) {
  assert.doesNotMatch(
    shellSource,
    /targetMaterializationReplayDiagnostics\.updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/,
  );
}

console.log('v6 target materialization replay diagnostics producer event boundary step346 static smoke passed');
