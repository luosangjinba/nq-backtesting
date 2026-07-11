import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_SESSION_AWARE_SIZING_SELECTION_STEP297.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-request-sizing.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-session-aware-sizing-selection-step297-smoke.js', 'utf8');

assert.match(todo, /Step 297 - Target-History Session-Aware Sizing Selection/);
assert.match(todo, /Step 298 - Daily Target-History Request Sizing Browser Assertion/);
assert.match(index, /V6_TARGET_HISTORY_SESSION_AWARE_SIZING_SELECTION_STEP297\.md/);

assert.match(doc, /`1D` browser sizing\s+assertions/);
assert.match(doc, /Do not extend request-sizing browser assertions to `1W` or `1M` yet/);
assert.match(doc, /Step 298 should add a focused browser assertion for `1D`/);

assert.match(helper, /selectSessionAwareTargetHistorySizingSlice/);
assert.match(helper, /daily-target-history-backend-supported/);
assert.match(helper, /no-session-aware-target-history-backend-ready/);
assert.match(smoke, /targetTimeframe: '1D'/);

console.log('v6 target history session-aware sizing selection closeout step297 static smoke passed');
