import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_BROWSER_VERIFICATION_STEP336.md', 'utf8');
const browserSmoke = await readFile('v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/display-timeframe-target-materialization-browser-boundary-step336-static-smoke.js', 'utf8');

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_BROWSER_VERIFICATION_STEP336\.md/);
assert.match(todo, /### Step 336 - Display-Timeframe Target Materialization Browser Verification/);
assert.match(todo, /browser-visible verification for `8h`, `1D`, and `1W`/);
assert.match(handoff, /Step 336 verified browser-visible `8h`, `1D`, and `1W` target\s+materialization/);
assert.match(handoff, /Step 336 verifies that handoff in browser-visible `8h`, `1D`, and `1W`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /`8h`/);
assert.match(doc, /`1D`/);
assert.match(doc, /`1W`/);
assert.match(doc, /source `1m` bars/);
assert.match(doc, /target-history-no-visible-bars/);
assert.match(doc, /high-timeframe-target-history-responsive-materialization-ready/);
assert.match(doc, /Step 337 should verify replay coordination/);

for (const requiredBrowserTerm of [
  "expectedTf: '8h'",
  "expectedTf: '1D'",
  "expectedTf: '1W'",
  "targetMode = 'empty'",
  'sourcePreserved',
  'auditHighTimeframeTargetHistoryResponsiveness',
  "runtime.bar-data",
  "runtime.chart-data-projection",
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /shellSource/);
assert.match(boundarySmoke, /LOAD_TARGET_WINDOW/);
assert.match(boundarySmoke, /REPLACE_BARS/);
assert.match(boundarySmoke, /setData\(/);

console.log('v6 display timeframe target materialization browser closeout step336 static smoke passed');
