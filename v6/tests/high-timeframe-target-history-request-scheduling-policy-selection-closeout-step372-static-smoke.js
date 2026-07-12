import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_REQUEST_SCHEDULING_POLICY_SELECTION_STEP372.md',
  'utf8',
);
const selector = await readFile(
  'v6/src/chart-history/high-timeframe-target-history-request-scheduling-policy-selection.js',
  'utf8',
);
const selectorSmoke = await readFile(
  'v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-step372-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_TARGET_HISTORY_REQUEST_SCHEDULING_POLICY_SELECTION_STEP372\.md/);
assert.match(index, /native-target-history-reduced-delay-with-coalescing/);
assert.match(index, /100ms/);
assert.match(index, /requestDelayMs=500/);

assert.match(
  todo,
  /Latest completed HTF target-history request scheduling policy step:\s+Step 372/,
);
assert.match(todo, /### Step 372 - HTF Target-History Request Scheduling Policy Selection/);
assert.match(todo, /native-target-history-reduced-delay-with-coalescing/);
assert.match(todo, /100ms/);
assert.match(todo, /requestDelayMs=500/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Selected policy:\s+`native-target-history-reduced-delay-with-coalescing`/);
assert.match(doc, /high-timeframe target-history native visible-range delay: `100ms`/);
assert.match(doc, /low-timeframe native drag\/wheel delay: keep `requestDelayMs=500`/);
assert.match(doc, /target-history disabled native delay: keep `requestDelayMs=500`/);
assert.match(doc, /existing programmatic target-history fast path: unchanged/);
assert.match(doc, /inputToTargetFetchStartMs`: roughly `460-536ms`/);
assert.match(doc, /Rejected\.[\s\S]*keeps the measured dominant delay/);
assert.match(doc, /Zero-delay native wheel\/drag can bypass coalescing/);
assert.match(doc, /Step 373 should add the pure resolver shape/);

for (const field of [
  'native-target-history-reduced-delay-with-coalescing',
  'keep-native-visible-range-delay-500ms',
  'native-target-history-zero-delay-fast-path',
  'programmaticTargetHistoryFastPath',
]) {
  assert.match(selector, new RegExp(field.replaceAll('.', '\\.')));
  assert.match(selectorSmoke, new RegExp(field.replaceAll('.', '\\.')));
}

assert.match(selector, /SELECTED_HTF_TARGET_HISTORY_DELAY_MS = 100/);
assert.match(selector, /highTimeframeTargetHistoryNativeDelayMs: SELECTED_HTF_TARGET_HISTORY_DELAY_MS/);
assert.match(selector, /lowTimeframeNativeDelayMs: CURRENT_DELAY_MS/);
assert.match(selector, /targetHistoryDisabledNativeDelayMs: CURRENT_DELAY_MS/);

assert.match(selectorSmoke, /highTimeframeTargetHistoryNativeDelayMs: 100/);
assert.match(selectorSmoke, /lowTimeframeNativeDelayMs: 500/);
assert.match(selectorSmoke, /targetHistoryDisabledNativeDelayMs: 500/);

assert.match(boundarySmoke, /assert\.match\(bridge, \/requestDelayMs = 500\/\)/);
assert.match(boundarySmoke, /doesNotMatch\(selector, \/dispatchCommand\|subscribeEvent\|setTimeoutFn\|clearTimeoutFn\|registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe target history request scheduling policy selection closeout step372 static smoke passed');
