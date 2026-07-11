import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_READINESS_AUDIT_STEP333.md', 'utf8');
const audit = await readFile('v6/src/replay/display-timeframe-target-materialization-readiness-audit.js', 'utf8');
const smoke = await readFile('v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js', 'utf8');

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_READINESS_AUDIT_STEP333\.md/);
assert.match(todo, /Latest completed display-timeframe target materialization readiness audit\s+step: Step 333/);
assert.match(todo, /### Step 333 - Display-Timeframe Target Materialization Readiness Audit/);
assert.match(handoff, /Step 333 verified/);
assert.match(handoff, /selected wiring plan next/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /status: `ready`/);
assert.match(doc, /display-timeframe-target-materialization-owner-surfaces-ready/);
assert.match(doc, /display-timeframe-target-materialization-wiring-plan/);
assert.match(doc, /Step 334 should define/);

assert.match(audit, /auditDisplayTimeframeTargetMaterializationReadiness/);
assert.match(audit, /createDisplayTimeframeTargetMaterializationReadinessReport/);
assert.match(audit, /displayTimeframeTargetHistoryBranch/);
assert.match(audit, /chartDataSourcePreservationSurface/);
assert.match(audit, /targetBarRevealPolicySurface/);

assert.match(smoke, /ready-for-runtime-wiring-selection/);
assert.match(smoke, /display-timeframe-target-materialization-wiring-plan/);
assert.match(boundarySmoke, /display timeframe target materialization readiness boundary/);
assert.match(boundarySmoke, /readiness audit must not expose/);

console.log('v6 display timeframe target materialization readiness closeout step333 static smoke passed');
