import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_MONTHLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP305.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-request-sizing.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-request-sizing-step295-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');

assert.match(todo, /Step 305 - Monthly Target-History Request Sizing Selection/);
assert.match(todo, /Step 306 - Monthly Target-History Request Sizing Browser Assertion/);
assert.match(index, /V6_MONTHLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP305\.md/);

assert.match(doc, /`1M` target-history request sizing browser assertion/);
assert.match(doc, /selectMonthlyTargetHistorySizingSlice/);
assert.match(doc, /monthly-target-history-backend-supported-after-weekly-pack/);
assert.match(doc, /monthly-target-history-browser-sizing-audit-needed/);
assert.match(doc, /target display bars: `1`/);
assert.match(doc, /source prefetch bars: `40000`/);
assert.match(doc, /Step 306 should add real browser coverage for `1M`/);

assert.match(helper, /selectMonthlyTargetHistorySizingSlice/);
assert.match(helper, /weekly-target-history-pack-incomplete/);
assert.match(helper, /monthly-target-history-backend-supported-after-weekly-pack/);
assert.match(helper, /monthly-target-history-browser-sizing-audit-needed/);
assert.match(smoke, /displayTimeframe: '1M'/);
assert.match(smoke, /monthly\.status, 'session-aware-policy-sized'/);
assert.match(smoke, /monthly\.targetDisplayBars, 1/);
assert.match(smoke, /monthly\.policy\.prefetchSourceBars, 40000/);
assert.match(smoke, /monthlySelected/);
assert.match(smoke, /monthlyAuditNeeded/);
assert.match(pack, /weekly-target-history-fallback-browser-step304-smoke\.js/);

console.log('v6 monthly target history request sizing selection closeout step305 static smoke passed');
