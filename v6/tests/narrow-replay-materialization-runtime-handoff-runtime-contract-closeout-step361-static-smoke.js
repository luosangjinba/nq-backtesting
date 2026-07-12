import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_CONTRACT_STEP361.md',
  'utf8',
);
const contractSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-contract.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_CONTRACT_STEP361\.md/);
assert.match(index, /contract-only future runtime surface/);
assert.match(index, /unwired runtime skeleton as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff runtime contract step:\s+Step 361/);
assert.match(todo, /### Step 361 - Narrow Replay Materialization Runtime Handoff Runtime Contract/);
assert.match(todo, /Defined future factory signature/);
assert.match(todo, /Defined app registration preconditions before live wiring/);

assert.match(handoff, /Step 361 added the contract-only future runtime surface/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /createReplayCoordinationMaterializationRuntimeHandoff\(dependencies\)/);
assert.match(doc, /subscribeEvent/);
assert.match(doc, /dispatchCommand/);
assert.match(doc, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);
assert.match(doc, /status: fallback/);
assert.match(doc, /no diagnostics event surface yet/);
assert.match(doc, /runtime contract accepted/);
assert.match(doc, /no command dispatch/);
assert.match(doc, /Step 362 should create an unwired runtime skeleton module/);

for (const requiredContractTerm of [
  'narrow-replay-materialization-runtime-handoff-runtime-contract',
  'runtime.replay-coordination-materialization-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'no-op-until-runtime-wiring',
  'runtime-contract-accepted',
  'runtime-plan-accepted',
  'pure-executor-accepted',
  'wiring-readiness-audit-accepted',
  'app-registration-step-selected',
  'register-runtime-now',
  'subscribe-event-now',
  'dispatch-command-now',
  'narrow-replay-materialization-runtime-handoff-runtime-skeleton',
]) {
  assert.match(contractSource, new RegExp(requiredContractTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenContractTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(contractSource.includes(forbiddenContractTerm), false, `Step361 contract must stay pure: ${forbiddenContractTerm}`);
}

for (const requiredSmokeTerm of [
  "factorySignature.name, 'createReplayCoordinationMaterializationRuntimeHandoff'",
  "executor: 'executeNarrowReplayMaterializationRuntimeHandoffPlan'",
  "mode: 'no-op-until-runtime-wiring'",
  "selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-skeleton'",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /doesNotMatch\(appSource, \/createReplayCoordinationMaterializationRuntimeHandoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 narrow replay materialization runtime handoff runtime contract closeout step361 static smoke passed');
