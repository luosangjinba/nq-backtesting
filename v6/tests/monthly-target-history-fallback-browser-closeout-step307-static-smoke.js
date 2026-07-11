import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_MONTHLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP307.md', 'utf8');
const browserSmoke = await readFile('v6/tests/monthly-target-history-fallback-browser-step307-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const packStatic = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 307 - Monthly Target-History Fallback Browser Coverage/);
assert.match(todo, /Step 308 - Target-History Phase D Re-audit And Next Slice Selection/);
assert.match(index, /V6_MONTHLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP307\.md/);

assert.match(doc, /\/v4\/target_bars\?tf=1M/);
assert.match(doc, /target-history-empty/);
assert.match(doc, /target-history-fallback-source-window/);
assert.match(doc, /targetDisplayBars=1/);
assert.match(doc, /prefetchSourceBars=40000/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Step 308 should re-audit target-history Phase D/);

assert.match(browserSmoke, /displayTimeframe: '1M'/);
assert.match(browserSmoke, /targetFetch\.tf, '1M'/);
assert.match(browserSmoke, /targetFetch\.bars, 0/);
assert.match(browserSmoke, /target-history-empty/);
assert.match(browserSmoke, /target-history-fallback-source-window/);
assert.match(browserSmoke, /requestSizing\.targetDisplayBars, 1/);
assert.match(browserSmoke, /requestSizing\.policy\.prefetchSourceBars, 40000/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(pack, /monthly-target-history-fallback-browser-step307-smoke\.js/);
assert.match(packStatic, /monthly-target-history-fallback-browser-step307-smoke\.js/);
assert.match(packStatic, /monthlyFallbackSmoke/);

console.log('v6 monthly target history fallback browser closeout step307 static smoke passed');
