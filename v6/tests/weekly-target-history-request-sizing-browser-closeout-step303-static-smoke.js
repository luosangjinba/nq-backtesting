import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP303.md', 'utf8');
const browserSmoke = await readFile('v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const packStatic = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 303 - Weekly Target-History Request Sizing Browser Assertion/);
assert.match(todo, /Step 304 - Weekly Target-History Fallback Browser Coverage/);
assert.match(index, /V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP303\.md/);

assert.match(doc, /`1W` target-history request sizing/);
assert.match(doc, /tf=1W/);
assert.match(doc, /session-aware-policy-sized/);
assert.match(doc, /targetDisplayBars=4/);
assert.match(doc, /prefetchSourceBars=40000/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Step 304 should add focused `1W` target-history fallback/);

assert.match(browserSmoke, /displayTimeframe: '1W'/);
assert.match(browserSmoke, /targetFetch\.tf, '1W'/);
assert.match(browserSmoke, /requestSizing\.status, 'session-aware-policy-sized'/);
assert.match(browserSmoke, /requestSizing\.targetDisplayBars, 4/);
assert.match(browserSmoke, /requestSizing\.policy\.prefetchSourceBars, 40000/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(pack, /weekly-target-history-request-sizing-browser-step303-smoke\.js/);
assert.match(packStatic, /weekly-target-history-request-sizing-browser-step303-smoke\.js/);
assert.match(packStatic, /weeklySmoke/);

console.log('v6 weekly target history request sizing browser closeout step303 static smoke passed');
