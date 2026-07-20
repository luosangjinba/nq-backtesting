import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prefetch from '../src/replay-prefetch-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/replay-prefetch-contract/negative/cases.json'), 'utf8',
));
const range = { startEpochMs: 1_000, endEpochMs: 20_000 };
const policy = prefetch.createReplayPrefetchPolicy({
  lowWatermarkMs: 3_000,
  highWatermarkMs: 8_000,
});

assert.deepEqual(prefetch.adviseReplayPrefetch({
  range,
  cursorEpochMs: 5_000,
  contiguousCoverageEndEpochMs: 7_000,
  policy,
}), {
  reason: 'below-low-watermark',
  windowStartEpochMs: 7_000,
  windowEndEpochMs: 13_000,
});
assert.equal(prefetch.adviseReplayPrefetch({
  range,
  cursorEpochMs: 5_000,
  contiguousCoverageEndEpochMs: 8_000,
  policy,
}), null, 'coverage at low watermark must not request again');
assert.deepEqual(prefetch.adviseReplayPrefetch({
  range,
  cursorEpochMs: 18_000,
  contiguousCoverageEndEpochMs: 18_500,
  policy,
}), {
  reason: 'below-low-watermark',
  windowStartEpochMs: 18_500,
  windowEndEpochMs: 20_000,
}, 'prefetch must clamp atomically at Session end');
assert.equal(prefetch.adviseReplayPrefetch({
  range,
  cursorEpochMs: 20_000,
  contiguousCoverageEndEpochMs: 20_000,
  policy,
}), null, 'complete Replay has no future prefetch');

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const negativeActions = {
  'zero-low-watermark': () => prefetch.createReplayPrefetchPolicy({
    lowWatermarkMs: 0, highWatermarkMs: 2,
  }),
  'equal-watermarks': () => prefetch.createReplayPrefetchPolicy({
    lowWatermarkMs: 2, highWatermarkMs: 2,
  }),
  'coverage-behind-cursor': () => prefetch.adviseReplayPrefetch({
    range, cursorEpochMs: 5_000, contiguousCoverageEndEpochMs: 4_999, policy,
  }),
  'coverage-after-session': () => prefetch.adviseReplayPrefetch({
    range, cursorEpochMs: 5_000, contiguousCoverageEndEpochMs: 20_001, policy,
  }),
  'cursor-before-session': () => prefetch.adviseReplayPrefetch({
    range, cursorEpochMs: 999, contiguousCoverageEndEpochMs: 1_000, policy,
  }),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

console.log(`v7 Replay Prefetch Contract harness passed (${negativeCases.length} negative controls)`);
