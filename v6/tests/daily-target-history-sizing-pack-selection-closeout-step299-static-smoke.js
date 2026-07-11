import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_DAILY_TARGET_HISTORY_SIZING_PACK_SELECTION_STEP299.md', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const staticSmoke = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 299 - Daily Target-History Sizing Pack Selection/);
assert.match(todo, /Step 300 - Target-History Phase D Next Slice Selection/);
assert.match(index, /V6_DAILY_TARGET_HISTORY_SIZING_PACK_SELECTION_STEP299\.md/);

assert.match(doc, /Do not create a separate daily pack/);
assert.match(doc, /daily-target-history-request-sizing-browser-step298-smoke\.js/);
assert.match(doc, /Step 300 should select/);

assert.match(pack, /target-history-diagnostics-readout-browser-step291-smoke\.js/);
assert.match(pack, /target-history-diagnostics-readout-fallback-browser-step292-smoke\.js/);
assert.match(pack, /daily-target-history-request-sizing-browser-step298-smoke\.js/);
assert.match(staticSmoke, /daily-target-history-request-sizing-browser-step298-smoke\.js/);
assert.match(staticSmoke, /dailySmoke/);
assert.match(staticSmoke, /session-aware-policy-sized/);

console.log('v6 daily target history sizing pack selection closeout step299 static smoke passed');
