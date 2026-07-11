import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_PHASE_D_NEXT_SLICE_SELECTION_STEP300.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-phase-d-selection.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');

assert.match(todo, /Step 300 - Target-History Phase D Next Slice Selection/);
assert.match(todo, /Step 301 - Daily Target-History Fallback Browser Coverage/);
assert.match(index, /V6_TARGET_HISTORY_PHASE_D_NEXT_SLICE_SELECTION_STEP300\.md/);

assert.match(doc, /`1D` fallback browser coverage/);
assert.match(doc, /daily-fallback-browser-coverage/);
assert.match(doc, /Step 301 should add a focused `1D` target-history fallback browser smoke/);

assert.match(helper, /selectTargetHistoryPhaseDSlice/);
assert.match(helper, /daily-success-packed-fallback-gap-remains/);
assert.match(helper, /weekly-request-sizing-selection/);
assert.match(helper, /display-history-responsiveness-audit/);

assert.match(pack, /daily-target-history-request-sizing-browser-step298-smoke\.js/);

console.log('v6 target history phase d selection closeout step300 static smoke passed');
