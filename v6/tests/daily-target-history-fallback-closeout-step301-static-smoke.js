import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_DAILY_TARGET_HISTORY_FALLBACK_BROWSER_STEP301.md', 'utf8');
const browserSmoke = await readFile('v6/tests/daily-target-history-fallback-browser-step301-smoke.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const packStatic = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js', 'utf8');

assert.match(todo, /Step 301 - Daily Target-History Fallback Browser Coverage/);
assert.match(todo, /Step 302 - Weekly Target-History Request Sizing Selection/);
assert.match(index, /V6_DAILY_TARGET_HISTORY_FALLBACK_BROWSER_STEP301\.md/);

assert.match(doc, /\/v4\/target_bars\?tf=1D/);
assert.match(doc, /target-history-empty/);
assert.match(doc, /target-history-fallback-source-window/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Step 302 should select or audit the first `1W`/);

assert.match(browserSmoke, /displayTimeframe: '1D'/);
assert.match(browserSmoke, /targetFetch\.tf, '1D'/);
assert.match(browserSmoke, /targetFetch\.bars, 0/);
assert.match(browserSmoke, /target-history-empty/);
assert.match(browserSmoke, /target-history-fallback-source-window/);
assert.match(browserSmoke, /requestSizing\.status, 'session-aware-policy-sized'/);
assert.match(browserSmoke, /requestSizing\.targetDisplayBars, 12/);
assert.match(browserSmoke, /requestSizing\.policy\.prefetchSourceBars, 17280/);
assert.match(browserSmoke, /restoredSourceBarCount/);

assert.match(pack, /daily-target-history-fallback-browser-step301-smoke\.js/);
assert.match(packStatic, /daily-target-history-fallback-browser-step301-smoke\.js/);
assert.match(packStatic, /dailyFallbackSmoke/);

console.log('v6 daily target history fallback closeout step301 static smoke passed');
