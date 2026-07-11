import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_REQUEST_SIZING_STEP295.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-request-sizing.js', 'utf8');
const smoke = await readFile('v6/tests/target-history-request-sizing-step295-smoke.js', 'utf8');

assert.match(todo, /Step 295 - Target-History Request Sizing/);
assert.match(todo, /Step 296 - Target-History Request Sizing Browser Diagnostics/);
assert.match(index, /V6_TARGET_HISTORY_REQUEST_SIZING_STEP295\.md/);

assert.match(doc, /No runtime sizing change was made/);
assert.match(doc, /4h`, `8h`, and `12h`: 20 display bars/);
assert.match(doc, /Step 296 should add browser-visible request sizing diagnostics/);

assert.match(helper, /auditTargetHistoryRequestSizing/);
assert.match(helper, /estimatedTargetBars/);
assert.match(helper, /session-aware-policy-sized/);
assert.match(smoke, /underfilled/);
assert.match(smoke, /targetDisplayBars, 20/);

console.log('v6 target history request sizing closeout step295 static smoke passed');
