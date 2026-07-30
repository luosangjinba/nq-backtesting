import assert from 'node:assert/strict';
import { createFoundationCapabilities } from '../src/replay-workspace-ui/foundation-capabilities.js';
import { resolveReplayTruncationTarget } from '../src/replay-workspace-ui/replay-truncation.js';

const range = Object.freeze({ endEpochMs: 20_000, startEpochMs: 10_000 });
assert.equal(resolveReplayTruncationTarget({
  cursorEpochMs: 18_000,
  range,
  selection: { displayEpochMs: 19_000, startEpochMs: 15_000 },
}), 15_000, 'truncation must use the projected bucket start rather than its completion slot');

for (const [selection, code] of [
  [null, 'replay-truncation-outside-data'],
  [{ startEpochMs: 9_000 }, 'replay-truncation-outside-session'],
  [{ startEpochMs: 20_000 }, 'replay-truncation-outside-session'],
  [{ startEpochMs: 18_000 }, 'replay-truncation-not-revealed'],
]) {
  assert.throws(
    () => resolveReplayTruncationTarget({ cursorEpochMs: 18_000, range, selection }),
    (error) => error.code === code,
  );
}

const capabilities = createFoundationCapabilities();
const replayStepIds = new Set(capabilities.replayStepOptions.map(({ id }) => id));
assert.equal(capabilities.timeframes.length, 16);
assert.ok(capabilities.timeframes.every(({ replayStepId }, index) => (
  index < 13 ? replayStepIds.has(replayStepId) : replayStepId === null
)), 'fixed display TFs resolve real Replay steps while calendar display keeps Replay independently owned');
assert.deepEqual(capabilities.replayStepOptions.map(({ label }) => label), [
  '1m', '2m', '3m', '4m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '8h', '12h',
]);

console.log('v7 Replay truncation and Sync timeframe harness passed');
