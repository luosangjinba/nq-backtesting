import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [manifest, handoff, diagnostics, materialization, shell] = await Promise.all([
  readFile('v6/src/runtime/core-runtime-manifest.js', 'utf8'),
  readFile('v6/src/replay/replay-coordination-materialization-runtime-handoff.js', 'utf8'),
  readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8'),
  readFile('v6/src/materialization/target-display-materialization.js', 'utf8'),
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
]);

assert.match(manifest, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(manifest, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(handoff, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(handoff, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);
assert.match(diagnostics, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(diagnostics, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);
assert.match(materialization, /resolveTargetBarRevealState/);
assert.match(materialization, /sourceCursorTimestampFromState/);
assert.doesNotMatch(shell, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars|SET_CURSOR_TIME/);

console.log('v6 current materialization ownership step394 static smoke passed');
