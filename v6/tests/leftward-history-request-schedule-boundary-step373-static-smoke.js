import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const resolver = await readFile('v6/src/chart-history/leftward-history-request-schedule.js', 'utf8');
const step372Doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_REQUEST_SCHEDULING_POLICY_SELECTION_STEP372.md',
  'utf8',
);

assert.match(resolver, /nativeTargetHistoryDelayMs = null/);
assert.match(resolver, /reason === 'native-visible-range' && targetHistoryEnabled === true/);
assert.match(resolver, /native-target-history-reduced-delay/);
assert.match(resolver, /native-target-history-reduced-delay-with-coalescing/);
assert.match(resolver, /PROGRAMMATIC_FAST_PATH_REASONS/);
assert.match(resolver, /programmatic-target-history-fast-path/);
assert.match(resolver, /visible-range-does-not-require-leftward-history/);

assert.match(step372Doc, /native-target-history-reduced-delay-with-coalescing/);
assert.match(step372Doc, /high-timeframe target-history native visible-range delay: `100ms`/);
assert.match(step372Doc, /low-timeframe native drag\/wheel delay: keep `requestDelayMs=500`/);
assert.match(step372Doc, /existing programmatic target-history fast path: unchanged/);

assert.doesNotMatch(resolver, /dispatchCommand|subscribeEvent|setTimeoutFn|clearTimeoutFn|registerCommand|registerRuntime|UPDATE_SNAPSHOT/);

console.log('v6 leftward history request schedule boundary step373 static smoke passed');
