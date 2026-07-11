import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_DAILY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP298.md', 'utf8');
const browserSmoke = await readFile('v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js', 'utf8');

assert.match(todo, /Step 298 - Daily Target-History Request Sizing Browser Assertion/);
assert.match(todo, /Step 299 - Daily Target-History Sizing Pack Selection/);
assert.match(index, /V6_DAILY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP298\.md/);

assert.match(doc, /tf=1D/);
assert.match(doc, /session-aware-policy-sized/);
assert.match(doc, /switching back to `1m` preserves source bars/);
assert.match(doc, /Step 299 should decide/);

assert.match(browserSmoke, /displayTimeframe: '1D'/);
assert.match(browserSmoke, /targetFetch\.tf, '1D'/);
assert.match(browserSmoke, /requestSizing\.status, 'session-aware-policy-sized'/);
assert.match(browserSmoke, /requestSizing\.targetDisplayBars, 12/);
assert.match(browserSmoke, /requestSizing\.policy\.prefetchSourceBars, 17280/);
assert.match(browserSmoke, /restoredSourceBarCount/);

console.log('v6 daily target history request sizing closeout step298 static smoke passed');
