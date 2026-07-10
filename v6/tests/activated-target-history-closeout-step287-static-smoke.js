import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_ACTIVATED_TARGET_HISTORY_BROWSER_INTEGRATION_STEP287.md', 'utf8');
const browserSmoke = await readFile('v6/tests/activated-target-history-browser-step287-smoke.js', 'utf8');

assert.match(todo, /Step 287 - Activated Target-History Browser Integration/);
assert.match(todo, /Step 288 - Activated Target-History Performance Observability/);
assert.match(todo, /real\s+chart surface and leftward input bridge/);
assert.match(index, /V6_ACTIVATED_TARGET_HISTORY_BROWSER_INTEGRATION_STEP287\.md/);

assert.match(doc, /real V6 page, runtime\s+registry, chart surface/);
assert.match(doc, /display-timeframe-leftward-auto-chain-browser-smoke\.js/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /openV6Page/);
assert.match(browserSmoke, /\/v4\/target_bars/);
assert.match(browserSmoke, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(browserSmoke, /projectionSource\.owner, 'runtime\.bar-data'/);
assert.match(browserSmoke, /targetTimeframe, '8h'/);
assert.match(browserSmoke, /restoredSourceBarCount/);

console.log('v6 activated target history closeout step287 static smoke passed');
