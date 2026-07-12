import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = await readFile('v6/src/replay/target-materialization-replay-diagnostics-contract.js', 'utf8');
const smoke = await readFile('v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js', 'utf8');
const step340Doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_POST_PACK_SELECTION_STEP340.md', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/status-readout.js', 'utf8').catch(() => ''),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

for (const requiredContractTerm of [
  'target-materialization-replay-diagnostics-contract',
  'DIAGNOSTICS_READ_FIELDS',
  'displayApplyStatus',
  'projectionOwner',
  'targetHistoryStatus',
  'targetHistoryReason',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'shell-diagnostics-readout',
  'command-event-diagnostic-snapshot',
  'no-runtime-handoff-in-contract-step',
]) {
  assert.match(contract, new RegExp(requiredContractTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const requiredSmokeTerm of [
  'runtimeCommandReady, false',
  'runtimeWiringReady, false',
  'writeReady, false',
  'sourceCursorAuthority: true',
  'targetBarsDisplayInputOnly: true',
  'callTargetBarsApi',
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step340Doc, /target-materialization-replay-coordination-diagnostics-readout/);
assert.match(step340Doc, /without changing replay cursor\s+movement or target-bar loading behavior/);

for (const runtimeSource of [displayRuntime, manualNextRuntime, autoPlayRuntime, replayRuntime]) {
  assert.doesNotMatch(runtimeSource, /target-materialization-replay-diagnostics-contract|createTargetMaterializationReplayDiagnosticsSnapshot/);
}

assert.match(displayRuntime, /LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /preserveSource:\s*true/);
assert.doesNotMatch(manualNextRuntime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
assert.doesNotMatch(autoPlayRuntime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
assert.doesNotMatch(replayRuntime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);

for (const shellSource of shellFiles) {
  assert.doesNotMatch(shellSource, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars|\/v4\/target_bars/);
}

for (const forbiddenContractTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(contract.includes(forbiddenContractTerm), false, `Step341 contract must stay pure: ${forbiddenContractTerm}`);
}

console.log('v6 target materialization replay diagnostics boundary step341 static smoke passed');
