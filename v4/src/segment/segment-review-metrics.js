// Read-only metrics for reviewing 1H market segments.

const PRICE_EPSILON = 0.0000001;

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getTimestamp(point) {
  const timestamp = asNumber(point?.timestamp ?? point?.time);
  return timestamp === null ? null : timestamp;
}

function getDirection(segment) {
  if (segment?.direction === 'up' || segment?.direction === 'down') return segment.direction;
  const start = asNumber(segment?.start?.price);
  const end = asNumber(segment?.end?.price);
  if (start === null || end === null) return 'unknown';
  if (end > start) return 'up';
  if (end < start) return 'down';
  return 'flat';
}

function getRangePoints(segment) {
  const start = asNumber(segment?.start?.price);
  const end = asNumber(segment?.end?.price);
  if (start === null || end === null) return null;
  return Math.abs(end - start);
}

function isSameEndpoint(a, b) {
  const aTime = getTimestamp(a);
  const bTime = getTimestamp(b);
  const aPrice = asNumber(a?.price);
  const bPrice = asNumber(b?.price);
  return (
    aTime !== null &&
    bTime !== null &&
    aTime === bTime &&
    aPrice !== null &&
    bPrice !== null &&
    Math.abs(aPrice - bPrice) <= PRICE_EPSILON
  );
}

function sortSegments(segments) {
  return [...segments].sort((a, b) => {
    const aStart = getTimestamp(a.start) ?? 0;
    const bStart = getTimestamp(b.start) ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    return (getTimestamp(a.end) ?? 0) - (getTimestamp(b.end) ?? 0);
  });
}

export function findPreviousSegment(segment, segments = []) {
  if (!segment?.id || !Array.isArray(segments)) return null;
  const sorted = sortSegments(segments);
  const index = sorted.findIndex((candidate) => candidate.id === segment.id);
  if (index <= 0) return null;
  return sorted[index - 1];
}

export function classifyExtensionRatio(ratio) {
  if (!Number.isFinite(Number(ratio))) return 'n/a';
  if (ratio <= 1) return 'no take';
  if (ratio <= 1.1) return 'marginal sweep';
  if (ratio <= 1.5) return 'meaningful break';
  return 'strong expansion';
}

function computePreviousComparison(segment, previousSegment) {
  const currentRangePoints = getRangePoints(segment);
  const previousRangePoints = getRangePoints(previousSegment);
  const currentDirection = getDirection(segment);
  const previousDirection = getDirection(previousSegment);
  const connected = isSameEndpoint(previousSegment?.end, segment?.start);
  const oppositeDirection =
    (previousDirection === 'up' && currentDirection === 'down') ||
    (previousDirection === 'down' && currentDirection === 'up');

  const base = {
    previousSegmentId: previousSegment?.id || null,
    currentRangePoints,
    previousRangePoints,
    connected,
    oppositeDirection,
    extensionRatio: null,
    extensionClass: 'n/a',
    tookPreviousExtreme: false,
    previousExtreme: null,
    overshootPoints: null,
    overshootRatio: null,
    stoppedAtPreviousRangePositionPercent: null,
    incompleteReason: null,
  };

  if (!previousSegment) {
    return { ...base, incompleteReason: 'missing previous segment' };
  }
  if (!connected) {
    return { ...base, incompleteReason: 'segments are not endpoint-continuous' };
  }
  if (!oppositeDirection) {
    return { ...base, incompleteReason: 'segments are not opposite direction' };
  }
  if (!previousRangePoints || !currentRangePoints) {
    return { ...base, incompleteReason: 'missing segment range' };
  }

  const extensionRatio = currentRangePoints / previousRangePoints;
  const previousExtreme = asNumber(previousSegment.start?.price);
  const currentEndPrice = asNumber(segment.end?.price);
  let rawOvershoot = null;
  if (currentDirection === 'up') {
    rawOvershoot = currentEndPrice - previousExtreme;
  } else if (currentDirection === 'down') {
    rawOvershoot = previousExtreme - currentEndPrice;
  }

  const tookPreviousExtreme = rawOvershoot !== null && rawOvershoot > PRICE_EPSILON;
  const overshootPoints = tookPreviousExtreme ? rawOvershoot : 0;
  const stoppedPercent = tookPreviousExtreme
    ? null
    : Math.max(0, Math.min(100, extensionRatio * 100));

  return {
    ...base,
    extensionRatio,
    extensionClass: classifyExtensionRatio(extensionRatio),
    tookPreviousExtreme,
    previousExtreme,
    overshootPoints,
    overshootRatio: tookPreviousExtreme ? extensionRatio - 1 : 0,
    stoppedAtPreviousRangePositionPercent: stoppedPercent,
  };
}

function findTerminalBar(segment, bars = []) {
  const endTimestamp = getTimestamp(segment?.end);
  if (endTimestamp === null || !Array.isArray(bars)) return null;
  return bars.find((bar) => asNumber(bar.timestamp) === endTimestamp) || null;
}

function computeTerminalBarFacts(segment, bars) {
  const bar = findTerminalBar(segment, bars);
  if (!bar) {
    return {
      timestamp: getTimestamp(segment?.end),
      found: false,
      incompleteReason: 'terminal bar not loaded',
    };
  }

  const open = asNumber(bar.open);
  const high = asNumber(bar.high);
  const low = asNumber(bar.low);
  const close = asNumber(bar.close);
  const bodyHigh = open === null || close === null ? null : Math.max(open, close);
  const bodyLow = open === null || close === null ? null : Math.min(open, close);

  return {
    timestamp: asNumber(bar.timestamp),
    time: bar.tradingDay || bar.time || bar.timestamp,
    found: true,
    open,
    high,
    low,
    close,
    bodyHigh,
    bodyLow,
    upperWickPoints: high === null || bodyHigh === null ? null : high - bodyHigh,
    lowerWickPoints: low === null || bodyLow === null ? null : bodyLow - low,
    bodyPoints: bodyHigh === null || bodyLow === null ? null : bodyHigh - bodyLow,
  };
}

export function computeSegmentReviewMetrics(segment, { segments = [], bars = [] } = {}) {
  const previousSegment = findPreviousSegment(segment, segments);
  const previousComparison = computePreviousComparison(segment, previousSegment);
  const terminalBar = computeTerminalBarFacts(segment, bars);

  return {
    version: 1,
    segmentId: segment?.id || null,
    direction: getDirection(segment),
    previousComparison,
    terminalBar,
  };
}
