import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_READINESS_AUDIT_STEP363.md',
  'utf8',
);
const auditSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js',
  'utf8',
);
const runtimeManifest = await readFile('v6/src/runtime/core-runtime-manifest.js', 'utf8');
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js',
  'utf8',
);

assert.match(
  index,
  /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_READINESS_AUDIT_STEP363\.md/,
);
assert.match(index, /audit-only app registration readiness surface/);
assert.match(index, /app registration plan as the\s+next slice/);

assert.match(
  todo,
  /Latest completed narrow replay materialization handoff app registration\s+readiness step:\s+Step 363/,
);
assert.match(todo, /### Step 363 - Narrow Replay Materialization Runtime Handoff App Registration Readiness Audit/);
assert.match(todo, /Did not add runtime to `v6\/src\/app\.js`/);
assert.match(todo, /Did not register commands, subscribe to events, dispatch commands/);

assert.match(handoff, /Step 363 added the audit-only app registration readiness helper/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Future import surface/);
assert.match(doc, /Future registration surface/);
assert.match(doc, /createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)/);
assert.match(doc, /after `registry\.registerRuntime\(createChartEntryManualNextRuntime\(\)\);`/);
assert.match(doc, /before `registry\.registerRuntime\(createChartEntryManualPreviousRuntime\(\)\);`/);
assert.match(doc, /Dependency Injection Source/);
assert.match(doc, /Rollback Plan/);
assert.match(doc, /Focused Future Browser Coverage/);
assert.match(doc, /no `v6\/src\/app\.js` modification/);
assert.match(doc, /Step 364 should define the plan-only app registration slice/);

for (const requiredAuditTerm of [
  'narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit',
  'runtime.replay-coordination-materialization-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  './replay/replay-coordination-materialization-runtime-handoff.js',
  'after registry.registerRuntime(createChartEntryManualNextRuntime()); before registry.registerRuntime(createChartEntryManualPreviousRuntime());',
  "import { dispatchCommand } from './runtime/commands.js';",
  'new-replay-coordination-materialization-handoff-app-registration-browser-smoke',
  'remove-registry-registerRuntime-handoff-call',
  "runtimeRegistrationWired: false",
]) {
  assert.match(auditSource, new RegExp(requiredAuditTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(runtimeManifest, /createChartEntryManualNextRuntime\(\),/);
assert.match(runtimeManifest, /createChartEntryManualPreviousRuntime\(\),/);

assert.match(smoke, /nextStep,\s+'narrow-replay-materialization-runtime-handoff-app-registration-plan'/);
assert.match(boundarySmoke, /Step363 audit must stay pure/);

console.log('v6 narrow replay materialization runtime handoff app registration readiness closeout step363 static smoke passed');
