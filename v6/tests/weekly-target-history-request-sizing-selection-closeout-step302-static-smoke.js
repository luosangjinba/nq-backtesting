import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP302.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-request-sizing.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-request-sizing-step295-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');

assert.match(todo, /Step 302 - Weekly Target-History Request Sizing Selection/);
assert.match(todo, /Step 303 - Weekly Target-History Request Sizing Browser Assertion/);
assert.match(index, /V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP302\.md/);

assert.match(doc, /`1W` target-history request sizing browser assertion/);
assert.match(doc, /selectWeeklyTargetHistorySizingSlice/);
assert.match(doc, /weekly-target-history-backend-supported-after-daily-pack/);
assert.match(doc, /weekly-target-history-browser-sizing-audit-needed/);
assert.match(doc, /target display bars: `4`/);
assert.match(doc, /source prefetch bars: `40000`/);
assert.match(doc, /`1M` remains deferred/);
assert.match(doc, /Step 303 should add real browser coverage for `1W`/);

assert.match(helper, /selectWeeklyTargetHistorySizingSlice/);
assert.match(helper, /daily-target-history-pack-incomplete/);
assert.match(helper, /weekly-target-history-backend-supported-after-daily-pack/);
assert.match(helper, /weekly-target-history-browser-sizing-audit-needed/);
assert.match(smoke, /displayTimeframe: '1W'/);
assert.match(smoke, /weekly\.status, 'session-aware-policy-sized'/);
assert.match(smoke, /weekly\.targetDisplayBars, 4/);
assert.match(smoke, /weekly\.policy\.prefetchSourceBars, 40000/);
assert.match(smoke, /weeklySelected/);
assert.match(smoke, /weeklyAuditNeeded/);
assert.match(pack, /daily-target-history-fallback-browser-step301-smoke\.js/);

console.log('v6 weekly target history request sizing selection closeout step302 static smoke passed');
