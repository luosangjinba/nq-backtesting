import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_BROWSER_PACK_COST_CONTROL_STEP309.md', 'utf8');
const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-pack-cost-control-step309-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_HISTORY_BROWSER_PACK_COST_CONTROL_STEP309\.md/);
assert.match(todo, /Latest completed target-TF browser pack cost step: Step 309/);
assert.match(todo, /### Step 310 - High-Timeframe Target-History Responsiveness Audit/);

assert.match(doc, /TARGET_HISTORY_PACK_GROUP/);
assert.match(doc, /TARGET_HISTORY_PACK_MEMBERS/);
assert.match(doc, /all/);
assert.match(doc, /fallback/);
assert.match(doc, /fixed/);
assert.match(doc, /session-aware/);
assert.match(doc, /sizing/);
assert.match(doc, /monthly-fallback/);
assert.match(doc, /full Step 293 pack remains the default/);
assert.match(doc, /full eight-member pack/);
assert.match(doc, /Step 310/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /TARGET_HISTORY_PACK_GROUPS/);
assert.match(helper, /TARGET_HISTORY_PACK_TESTS/);
assert.match(helper, /selectTargetHistoryPackTests/);
assert.match(helper, /createTargetHistoryPackPlanFromEnv/);
assert.match(helper, /TARGET_HISTORY_PACK_MEMBERS/);
assert.match(helper, /TARGET_HISTORY_PACK_GROUP/);
assert.match(helper, /SESSION_AWARE: 'session-aware'/);
assert.match(helper, /SIZING: 'sizing'/);
assert.match(helper, /members/);

assert.match(pack, /createTargetHistoryPackPlanFromEnv/);
assert.match(pack, /plan\.selectedCount/);
assert.match(pack, /\[target-history-readout-pack\] plan/);
assert.match(pack, /plan\.scripts/);
assert.match(pack, /\[target-history-readout-pack\] start/);
assert.match(pack, /\[target-history-readout-pack\] passed/);

assert.match(smoke, /selectedCount, 8/);
assert.match(smoke, /weekly-sizing,monthly-fallback/);
assert.match(smoke, /Unknown target-history pack group/);
assert.match(smoke, /Unknown target-history pack member/);

console.log('v6 target history browser pack cost control closeout step309 static smoke passed');
