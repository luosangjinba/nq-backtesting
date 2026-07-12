import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_READINESS_AUDIT_STEP356.md',
  'utf8',
);
const auditSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-readiness-audit.js',
  'utf8',
);
const readinessSmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-readiness-boundary-step356-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_READINESS_AUDIT_STEP356\.md/);
assert.match(index, /runtime\.replay-coordination-materialization-handoff/);

assert.match(todo, /Latest completed narrow replay materialization handoff readiness step:\s+Step\s+356/);
assert.match(todo, /### Step 356 - Narrow Replay Materialization Runtime Handoff Readiness Audit/);
assert.match(todo, /Selected future owner boundary\s+`runtime\.replay-coordination-materialization-handoff`/);
assert.match(todo, /Listed `chartEntryManualNext:advanced` as the future primary trigger/);

assert.match(handoff, /Step 356 audited the narrow replay materialization runtime handoff\s+surfaces/);
assert.match(handoff, /selected future owner boundary\s+`runtime\.replay-coordination-materialization-handoff`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /barData\.planTargetWindow/);
assert.match(doc, /barData\.loadTargetWindow/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.updateSnapshot/);
assert.match(doc, /no command or event registration/);
assert.match(doc, /Step 357 should create a plan-only/);

for (const requiredAuditTerm of [
  'runtime.replay-coordination-materialization-handoff',
  'new-replay-coordination-runtime-helper',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'narrow-replay-materialization-runtime-handoff-plan',
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
  assert.equal(auditSource.includes(forbiddenAuditTerm), false, `Step356 audit must remain pure: ${forbiddenAuditTerm}`);
}

for (const requiredSmokeTerm of [
  "selectedOwner, 'new-replay-coordination-runtime-helper'",
  "boundary, 'runtime.replay-coordination-materialization-handoff'",
  "allowedEventSurfaces.includes('chartEntryManualNext:advanced')",
  "allowedCommandSurfaces.includes('barData.planTargetWindow')",
  "allowedCommandSurfaces.includes('barData.loadTargetWindow')",
  "allowedCommandSurfaces.includes('chartData.replaceBars')",
  "nextStep, 'narrow-replay-materialization-runtime-handoff-plan'",
]) {
  assert.match(readinessSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /chart-entry-manual-next-runtime/);
assert.match(boundarySmoke, /chart-entry-auto-play-runtime/);
assert.match(boundarySmoke, /display-timeframe-runtime/);
assert.match(boundarySmoke, /target-materialization-replay-diagnostics-runtime/);
assert.match(boundarySmoke, /doesNotMatch\(\s+runtimeSource,\s+\/narrow-replay-materialization-runtime-handoff-readiness\|runtime\\\.replay-coordination-materialization-handoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/LOAD_TARGET_WINDOW\|PLAN_TARGET_WINDOW\|fetchV4TargetBars\//);

console.log('v6 narrow replay materialization runtime handoff readiness closeout step356 static smoke passed');
