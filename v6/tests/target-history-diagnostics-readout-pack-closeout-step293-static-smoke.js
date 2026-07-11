import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_REGRESSION_PACK_STEP293.md', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const staticSmoke = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 293 - Target-History Diagnostics Readout Regression Pack/);
assert.match(todo, /Step 294 - Target-History Optimization Re-selection/);
assert.match(index, /V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_REGRESSION_PACK_STEP293\.md/);
assert.match(doc, /test orchestration only/);
assert.match(doc, /target-history-diagnostics-readout-regression-pack-step293-smoke\.js/);
assert.match(doc, /Step 294 should return to target-history optimization selection/);

assert.match(pack, /target-history-diagnostics-readout-browser-step291-smoke\.js/);
assert.match(pack, /target-history-diagnostics-readout-fallback-browser-step292-smoke\.js/);
assert.match(pack, /\[target-history-readout-pack\] passed/);
assert.match(pack, /process\.exit\(failed\.code \|\| 1\)/);

assert.match(staticSmoke, /requiredMembers/);
assert.match(staticSmoke, /target-history-opt-in/);
assert.match(staticSmoke, /target-history-fallback-source-window/);

console.log('v6 target history diagnostics readout pack closeout step293 static smoke passed');
