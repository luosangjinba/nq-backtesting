import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_WIRING_READINESS_AUDIT_STEP359.md',
  'utf8',
);
const auditSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-wiring-readiness-audit.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-boundary-step359-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_WIRING_READINESS_AUDIT_STEP359\.md/);
assert.match(index, /audit-only live wiring readiness decision/);
assert.match(index, /runtime plan\s+as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff wiring readiness step:\s+Step 359/);
assert.match(todo, /### Step 359 - Narrow Replay Materialization Runtime Handoff Wiring Readiness Audit/);
assert.match(todo, /Identified `v6\/src\/app\.js` runtime registry before lifecycle start/);
assert.match(todo, /Identified `chartEntryManualNext:advanced` subscription/);

assert.match(handoff, /Step 359 added the pure wiring readiness audit/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /v6\/src\/app\.js/);
assert.match(doc, /runtime registry before lifecycle start/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /pane\.getById/);
assert.match(doc, /replay\.getState/);
assert.match(doc, /chartData\.getSourceBars/);
assert.match(doc, /barData\.planTargetWindow/);
assert.match(doc, /barData\.loadTargetWindow/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /remove app runtime registration/);
assert.match(doc, /no command dispatch/);
assert.match(doc, /Step 360 should create a plan-only runtime implementation plan/);

for (const requiredAuditTerm of [
  'narrow-replay-materialization-runtime-handoff-wiring-readiness-audit',
  'runtime.replay-coordination-materialization-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'runtime registry before lifecycle start',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'runtime-command-dispatch-wrapper-with-injected-results',
  'remove-app-runtime-registration',
  'disable-command-dispatch-wrapper',
  'modify-manual-next-runtime',
  'route-target-bars-through-replay-runtime',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
  "sourceReplayCursorAuthority: '1m'",
  'narrow-replay-materialization-runtime-handoff-runtime-plan',
]) {
  assert.match(auditSource, new RegExp(requiredAuditTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenAuditTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(auditSource.includes(forbiddenAuditTerm), false, `Step359 audit must stay pure: ${forbiddenAuditTerm}`);
}

for (const requiredSmokeTerm of [
  "appRegistrationSurface.file, 'v6/src/app.js'",
  "eventSubscriptionSurface.eventSurface, 'chartEntryManualNext:advanced'",
  "commandDispatchWrapper.shape, 'runtime-command-dispatch-wrapper-with-injected-results'",
  "nextStep, 'narrow-replay-materialization-runtime-handoff-runtime-plan'",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /doesNotMatch\(appSource, \/createReplayCoordinationMaterializationRuntimeHandoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 narrow replay materialization runtime handoff wiring readiness closeout step359 static smoke passed');
