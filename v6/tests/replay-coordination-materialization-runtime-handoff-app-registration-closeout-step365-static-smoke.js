import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_STEP365.md',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const browserSmoke = await readFile(
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'utf8',
);

assert.match(
  index,
  /V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_STEP365\.md/,
);
assert.match(index, /live app registration/);
assert.match(index, /optional pack-member integration as the next\s+slice/);

assert.match(
  todo,
  /Latest completed replay coordination materialization runtime handoff app\s+registration step:\s+Step 365/,
);
assert.match(todo, /### Step 366 - Replay Coordination Materialization Runtime Handoff Pack Member/);
assert.match(todo, /### Step 365 - Replay Coordination Materialization Runtime Handoff App Registration/);
assert.match(todo, /Registered\s+`createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)`/);

assert.match(handoff, /Step 365 registered the replay coordination materialization handoff runtime/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /App Registration/);
assert.match(doc, /Focused Browser Coverage/);
assert.match(doc, /Historical Static Coverage Update/);
assert.match(doc, /Step 366 should add the Step 365 focused registration browser smoke/);

assert.match(appSource, /import \{ dispatchCommand \} from '\.\/runtime\/commands\.js';/);
assert.match(
  appSource,
  /import \{ createReplayCoordinationMaterializationRuntimeHandoff \} from '\.\/replay\/replay-coordination-materialization-runtime-handoff\.js';/,
);
assert.match(
  appSource,
  /registry\.registerRuntime\(createChartEntryManualNextRuntime\(\)\);\nregistry\.registerRuntime\(createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)\);\nregistry\.registerRuntime\(createChartEntryManualPreviousRuntime\(\)\);/,
);

for (const requiredSmokeTerm of [
  "const RUNTIME_ID = 'runtime.replay-coordination-materialization-handoff'",
  "registrySnapshot.runtimes.includes(RUNTIME_ID)",
  "registrySnapshot.started.includes(RUNTIME_ID)",
  "afterManualNext.replayCursorTimestamp",
  "afterManualNext.latestSourceTimestamp",
  "entry.kind === 'target' && entry.tf === '8h'",
  "entry.kind === 'source' && entry.tf === '1'",
]) {
  assert.match(browserSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 replay coordination materialization runtime handoff app registration closeout step365 static smoke passed');
