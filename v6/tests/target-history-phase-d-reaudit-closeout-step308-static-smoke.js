import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PHASE_D_REAUDIT_STEP308.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-phase-d-selection.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-phase-d-reaudit-step308-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');

assert.match(todo, /Step 308 - Target-History Phase D Re-audit And Next Slice Selection/);
assert.match(todo, /Step 309 - Target-History Browser Pack Runtime Cost Control/);
assert.match(index, /V6_TARGET_HISTORY_PHASE_D_REAUDIT_STEP308\.md/);

assert.match(doc, /target-history browser pack runtime\/cost control/);
assert.match(doc, /fixed-duration target-history success/);
assert.match(doc, /monthly target-history fallback/);
assert.match(doc, /expected paths: `8`/);
assert.match(doc, /covered paths: `8`/);
assert.match(doc, /target-history-browser-pack-cost-control/);
assert.match(doc, /target-history-browser-pack-complete-cost-control-next/);
assert.match(doc, /Step 309 should implement target-history browser pack runtime\/cost control/);

assert.match(helper, /auditTargetHistoryPhaseDCoverage/);
assert.match(helper, /selectTargetHistoryPhaseDPostCoverageSlice/);
assert.match(helper, /target-history-browser-pack-cost-control/);
assert.match(helper, /high-timeframe-history-responsiveness-audit/);
assert.match(helper, /replay-coordination-materialization-transition/);

assert.match(smoke, /coveredCount: 8/);
assert.match(smoke, /expectedCount: 8/);
assert.match(smoke, /target-history-browser-pack-complete-cost-control-next/);
assert.match(smoke, /target-history-phase-d-coverage-incomplete/);
assert.match(pack, /monthly-target-history-fallback-browser-step307-smoke\.js/);

console.log('v6 target history phase d reaudit closeout step308 static smoke passed');
