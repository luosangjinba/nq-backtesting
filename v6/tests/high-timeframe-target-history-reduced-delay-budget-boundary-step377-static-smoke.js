import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');

assert.match(browserSmoke, /TARGET_FETCH_BUDGET_MS = 300/);
assert.match(browserSmoke, /expectedTargetFetchTf: '4h'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '8h'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1D'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1W'/);
assert.match(browserSmoke, /inputToTargetFetchStartMs < TARGET_FETCH_BUDGET_MS/);
assert.match(browserSmoke, /mode === 'native-target-history-reduced-delay'/);
assert.match(browserSmoke, /trace\.delayMs === 100/);
assert.match(browserSmoke, /phase === 'schedule-suppressed'/);
assert.match(browserSmoke, /runtime-surface-check/);
assert.match(browserSmoke, /runtime-left-extension-loaded/);
assert.match(browserSmoke, /sourceFetchCount, 0/);
assert.match(browserSmoke, /openV6Page/);
assert.doesNotMatch(browserSmoke, /canvasSignature|getImageData|postMarkerCanvas/);

assert.match(bridge, /phase: 'schedule-suppressed'/);
assert.doesNotMatch(app, /high-timeframe-target-history-reduced-delay-budget/);

console.log('v6 high-timeframe target-history reduced delay budget boundary step377 static smoke passed');
