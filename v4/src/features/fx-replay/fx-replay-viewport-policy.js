const DEFAULT_BAR_SPACING_PX = 6;
const DEFAULT_PREFIX_BUFFER_BARS = 24;
const DEFAULT_MAX_PREFIX_BARS = 5000;

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getVisibleLogicalBars(visibleLogicalRange = null) {
  const from = Number(visibleLogicalRange?.from);
  const to = Number(visibleLogicalRange?.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return Math.ceil(to - from);
}

export function estimateFxReplayVisibleBars({
  viewportWidthPx = 0,
  barSpacingPx = DEFAULT_BAR_SPACING_PX,
  visibleLogicalRange = null,
} = {}) {
  const logicalBars = getVisibleLogicalBars(visibleLogicalRange);
  if (logicalBars !== null) return logicalBars;

  const width = normalizePositiveNumber(viewportWidthPx, 0);
  if (width <= 0) return 0;
  const spacing = normalizePositiveNumber(barSpacingPx, DEFAULT_BAR_SPACING_PX);
  return Math.ceil(width / spacing);
}

export function estimateFxReplayInitialPrefixDemand({
  viewportWidthPx = 0,
  barSpacingPx = DEFAULT_BAR_SPACING_PX,
  visibleLogicalRange = null,
  prefixFillRatio = 1,
  prefixBufferBars = DEFAULT_PREFIX_BUFFER_BARS,
  minPrefixBars = 1,
  maxPrefixBars = DEFAULT_MAX_PREFIX_BARS,
} = {}) {
  const visibleBars = estimateFxReplayVisibleBars({
    viewportWidthPx,
    barSpacingPx,
    visibleLogicalRange,
  });
  const ratio = normalizePositiveNumber(prefixFillRatio, 1);
  const buffer = Math.max(0, Math.floor(Number(prefixBufferBars) || 0));
  const minBars = Math.max(0, Math.floor(Number(minPrefixBars) || 0));
  const maxBars = Math.max(minBars, Math.floor(Number(maxPrefixBars) || DEFAULT_MAX_PREFIX_BARS));
  const requestedPrefixBars = Math.min(
    maxBars,
    Math.max(minBars, Math.ceil(visibleBars * ratio) + buffer)
  );

  return {
    visibleBars,
    requestedPrefixBars,
    prefixBufferBars: buffer,
    maxPrefixBars: maxBars,
    source: getVisibleLogicalBars(visibleLogicalRange) !== null ? 'logical-range' : 'viewport-width',
  };
}

export function buildFxReplayInitialViewportDemandRange({
  startBarTimestamp = null,
  timeframe = 1,
  viewportWidthPx = 0,
  barSpacingPx = DEFAULT_BAR_SPACING_PX,
  visibleLogicalRange = null,
  prefixFillRatio = 1,
  prefixBufferBars = DEFAULT_PREFIX_BUFFER_BARS,
  minPrefixBars = 1,
  maxPrefixBars = DEFAULT_MAX_PREFIX_BARS,
} = {}) {
  const demand = estimateFxReplayInitialPrefixDemand({
    viewportWidthPx,
    barSpacingPx,
    visibleLogicalRange,
    prefixFillRatio,
    prefixBufferBars,
    minPrefixBars,
    maxPrefixBars,
  });
  const tf = normalizePositiveNumber(timeframe, 1);
  const startTimestamp = Number(startBarTimestamp);
  const endTimestamp = Number.isFinite(startTimestamp)
    ? startTimestamp - tf * 60
    : null;
  const startTimestampDemand = Number.isFinite(endTimestamp)
    ? endTimestamp - Math.max(0, demand.requestedPrefixBars - 1) * tf * 60
    : null;

  return {
    ...demand,
    timeframe: tf,
    startBarTimestamp: Number.isFinite(startTimestamp) ? startTimestamp : null,
    prefixStartTimestamp: startTimestampDemand,
    prefixEndTimestamp: endTimestamp,
  };
}
