import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_LEFTWARD_REQUEST_SCHEDULING_PLAN_STEP325.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-leftward-request-scheduling-plan.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/high-timeframe-target-history-leftward-request-scheduling-boundary-step325-static-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_LEFTWARD_REQUEST_SCHEDULING_PLAN_STEP325\.md/);
assert.match(todo, /Latest completed target-TF leftward request scheduling plan step: Step 325/);
assert.match(todo, /### Step 326 - High-Timeframe Target-History Programmatic Leftward Request Fast Path/);

assert.match(doc, /target-history-programmatic-leftward-request-fast-path/);
assert.match(doc, /keep native visible-range drag\/wheel scheduling on `requestDelayMs`/);
assert.match(doc, /pure scheduling delay resolver/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /planHighTimeframeTargetHistoryLeftwardRequestScheduling/);
assert.match(helper, /programmatic-display-timeframe-apply-can-use-fast-path/);
assert.match(helper, /target-history-programmatic-leftward-request-fast-path/);
assert.match(helper, /keep native visible-range drag\/wheel scheduling on requestDelayMs/);

assert.match(boundarySmoke, /requestDelayMs = 500/);
assert.match(boundarySmoke, /DISPLAY_TIMEFRAME_EVENTS/);
assert.match(boundarySmoke, /CHART_VIEWPORT_EVENTS/);
assert.match(boundarySmoke, /bypass the second requestDelayMs debounce/);

console.log('v6 high timeframe target history leftward request scheduling closeout step325 static smoke passed');
