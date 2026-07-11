import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_REQUEST_SIZING_BROWSER_DIAGNOSTICS_STEP296.md', 'utf8');
const browserSmoke = await readFile('v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js', 'utf8');

assert.match(todo, /Step 296 - Target-History Request Sizing Browser Diagnostics/);
assert.match(todo, /Step 297 - Target-History Session-Aware Sizing Selection/);
assert.match(index, /V6_TARGET_HISTORY_REQUEST_SIZING_BROWSER_DIAGNOSTICS_STEP296\.md/);

assert.match(doc, /request sizing status is `adequate`/);
assert.match(doc, /estimated target bars are `20`/);
assert.match(doc, /No runtime request sizing change was made/);
assert.match(doc, /Step 297 should decide/);

assert.match(browserSmoke, /target-history-request-sizing\.js/);
assert.match(browserSmoke, /auditTargetHistoryRequestSizing/);
assert.match(browserSmoke, /requestSizing\.status, 'adequate'/);
assert.match(browserSmoke, /requestSizing\.estimatedTargetBars, 20/);
assert.match(browserSmoke, /targetFetch\.bars, value\.after\.requestSizing\.estimatedTargetBars/);

console.log('v6 target history request sizing browser closeout step296 static smoke passed');
