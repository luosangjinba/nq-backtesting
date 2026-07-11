import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_WEEKLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP304.md', 'utf8');
const browserSmoke = await readFile('v6/tests/weekly-target-history-fallback-browser-step304-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const packStatic = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 304 - Weekly Target-History Fallback Browser Coverage/);
assert.match(todo, /Step 305 - Monthly Target-History Request Sizing Selection/);
assert.match(index, /V6_WEEKLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP304\.md/);

assert.match(doc, /\/v4\/target_bars\?tf=1W/);
assert.match(doc, /target-history-empty/);
assert.match(doc, /target-history-fallback-source-window/);
assert.match(doc, /targetDisplayBars=4/);
assert.match(doc, /prefetchSourceBars=40000/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Step 305 should select or audit the first `1M`/);

assert.match(browserSmoke, /displayTimeframe: '1W'/);
assert.match(browserSmoke, /targetFetch\.tf, '1W'/);
assert.match(browserSmoke, /targetFetch\.bars, 0/);
assert.match(browserSmoke, /target-history-empty/);
assert.match(browserSmoke, /target-history-fallback-source-window/);
assert.match(browserSmoke, /requestSizing\.targetDisplayBars, 4/);
assert.match(browserSmoke, /requestSizing\.policy\.prefetchSourceBars, 40000/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(pack, /weekly-target-history-fallback-browser-step304-smoke\.js/);
assert.match(packStatic, /weekly-target-history-fallback-browser-step304-smoke\.js/);
assert.match(packStatic, /weeklyFallbackSmoke/);

console.log('v6 weekly target history fallback browser closeout step304 static smoke passed');
