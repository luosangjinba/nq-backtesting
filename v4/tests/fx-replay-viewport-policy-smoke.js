import assert from 'node:assert/strict';
import {
  buildFxReplayInitialViewportDemandRange,
  estimateFxReplayInitialPrefixDemand,
  estimateFxReplayVisibleBars,
} from '../src/features/fx-replay/fx-replay-viewport-policy.js';

assert.equal(estimateFxReplayVisibleBars({
  viewportWidthPx: 1920,
  barSpacingPx: 6,
}), 320);

assert.equal(estimateFxReplayVisibleBars({
  viewportWidthPx: 9999,
  barSpacingPx: 6,
  visibleLogicalRange: { from: -120.2, to: 30.1 },
}), 151);

const hdDemand = estimateFxReplayInitialPrefixDemand({
  viewportWidthPx: 1920,
  barSpacingPx: 6,
  prefixBufferBars: 24,
});
const fourKDemand = estimateFxReplayInitialPrefixDemand({
  viewportWidthPx: 3840,
  barSpacingPx: 6,
  prefixBufferBars: 24,
});

assert.equal(hdDemand.source, 'viewport-width');
assert.equal(hdDemand.visibleBars, 320);
assert.equal(hdDemand.requestedPrefixBars, 344);
assert.equal(fourKDemand.visibleBars, 640);
assert.equal(fourKDemand.requestedPrefixBars, 664);
assert(fourKDemand.requestedPrefixBars > hdDemand.requestedPrefixBars);

const logicalDemand = estimateFxReplayInitialPrefixDemand({
  viewportWidthPx: 3840,
  barSpacingPx: 6,
  visibleLogicalRange: { from: -200, to: 20 },
  prefixBufferBars: 10,
});
assert.equal(logicalDemand.source, 'logical-range');
assert.equal(logicalDemand.visibleBars, 220);
assert.equal(logicalDemand.requestedPrefixBars, 230);

const cappedDemand = estimateFxReplayInitialPrefixDemand({
  viewportWidthPx: 100000,
  barSpacingPx: 2,
  prefixBufferBars: 0,
  maxPrefixBars: 500,
});
assert.equal(cappedDemand.requestedPrefixBars, 500);

const demandRange = buildFxReplayInitialViewportDemandRange({
  startBarTimestamp: 1748800800,
  timeframe: 1,
  viewportWidthPx: 1920,
  barSpacingPx: 6,
  prefixBufferBars: 24,
});
assert.equal(demandRange.requestedPrefixBars, 344);
assert.equal(demandRange.prefixEndTimestamp, 1748800740);
assert.equal(demandRange.prefixStartTimestamp, 1748780160);

console.log('fx replay viewport policy smoke passed');
