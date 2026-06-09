// Read-only metrics for reviewing 1H market segments.
//
// This module reports observable review facts only. It does not classify segment
// quality, produce a trading signal, or persist reviewer judgement back onto the
// segment model.

import { getPdaType } from '../pda/pda-types.js';
import { getVisibleFibLevels } from '../pda/fib-levels.js';

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

  // Extension math is meaningful only for a clean swing pair: the previous
  // segment must end exactly where the current segment starts, and the two
  // segments must move in opposite directions. Other shapes are reported as
  // incomplete instead of being forced into a sweep/extension interpretation.
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

function buildBarFacts(bar) {
  if (!bar) return null;
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
    rangePoints: high === null || low === null ? null : high - low,
  };
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

  return buildBarFacts(bar);
}

function getRangeBounds(annotation) {
  const top = asNumber(annotation?.topPrice ?? annotation?.priceHigh);
  const bottom = asNumber(annotation?.bottomPrice ?? annotation?.priceLow);
  if (top === null || bottom === null) return null;
  return {
    top: Math.max(top, bottom),
    bottom: Math.min(top, bottom),
  };
}

function getRangeCe(annotation, bounds) {
  return asNumber(annotation?.ce?.price) ?? (bounds.top + bounds.bottom) / 2;
}

function inRange(high, low, bounds) {
  return high >= bounds.bottom - PRICE_EPSILON && low <= bounds.top + PRICE_EPSILON;
}

function getRangeDepth({ direction, high, low, bounds }) {
  const rangePoints = bounds.top - bounds.bottom;
  if (!rangePoints) return null;

  if (direction === 'up') {
    const deepestPrice = Math.min(high, bounds.top);
    const entryPoints = Math.max(0, deepestPrice - bounds.bottom);
    return {
      entryBoundary: 'lower',
      deepestPrice,
      entryPoints,
      entryPercentOfRange: (entryPoints / rangePoints) * 100,
    };
  }

  if (direction === 'down') {
    const deepestPrice = Math.max(low, bounds.bottom);
    const entryPoints = Math.max(0, bounds.top - deepestPrice);
    return {
      entryBoundary: 'upper',
      deepestPrice,
      entryPoints,
      entryPercentOfRange: (entryPoints / rangePoints) * 100,
    };
  }

  const deepestPrice = high - bounds.top <= bounds.bottom - low ? bounds.top : bounds.bottom;
  return {
    entryBoundary: 'unknown',
    deepestPrice,
    entryPoints: 0,
    entryPercentOfRange: 0,
  };
}

function computeRangeReaction(annotation, terminalBar, direction) {
  const bounds = getRangeBounds(annotation);
  if (!bounds || !terminalBar.found) return null;
  const rangePoints = bounds.top - bounds.bottom;
  const cePrice = getRangeCe(annotation, bounds);
  const wickTouched = inRange(terminalBar.high, terminalBar.low, bounds);
  const bodyTouched = inRange(terminalBar.bodyHigh, terminalBar.bodyLow, bounds);
  const wickDepth = wickTouched
    ? getRangeDepth({ direction, high: terminalBar.high, low: terminalBar.low, bounds })
    : null;
  const bodyDepth = bodyTouched
    ? getRangeDepth({ direction, high: terminalBar.bodyHigh, low: terminalBar.bodyLow, bounds })
    : null;
  const wickTouchedCe = terminalBar.high >= cePrice - PRICE_EPSILON && terminalBar.low <= cePrice + PRICE_EPSILON;
  const bodyTouchedCe =
    terminalBar.bodyHigh >= cePrice - PRICE_EPSILON && terminalBar.bodyLow <= cePrice + PRICE_EPSILON;

  const deliveredThrough =
    direction === 'up'
      ? terminalBar.close > bounds.top + PRICE_EPSILON
      : direction === 'down'
        ? terminalBar.close < bounds.bottom - PRICE_EPSILON
        : false;
  const sweptThenReversed =
    direction === 'up'
      ? terminalBar.high > bounds.top + PRICE_EPSILON && terminalBar.close <= bounds.top + PRICE_EPSILON
      : direction === 'down'
        ? terminalBar.low < bounds.bottom - PRICE_EPSILON && terminalBar.close >= bounds.bottom - PRICE_EPSILON
        : false;
  const approachDistancePoints = wickTouched
    ? 0
    : direction === 'up'
      ? Math.max(0, bounds.bottom - terminalBar.high)
      : direction === 'down'
        ? Math.max(0, terminalBar.low - bounds.top)
        : Math.min(Math.abs(terminalBar.high - bounds.bottom), Math.abs(terminalBar.low - bounds.top));

  return {
    shape: 'range',
    topPrice: bounds.top,
    bottomPrice: bounds.bottom,
    rangePoints,
    cePrice,
    wick: {
      touched: wickTouched,
      touchedCe: wickTouchedCe,
      ...wickDepth,
    },
    body: {
      touched: bodyTouched,
      touchedCe: bodyTouchedCe,
      ...bodyDepth,
    },
    approachedButNotTouched: !wickTouched,
    approachDistancePoints,
    sweptThenReversed,
    deliveredThrough,
  };
}

function getLiquidityLevel(annotation) {
  return asNumber(annotation?.referencePrice ?? annotation?.price);
}

function getLiquiditySide(annotation, pdaType) {
  if (pdaType?.priceField === 'high' || annotation?.type === 'eqh') return 'high';
  if (pdaType?.priceField === 'low' || annotation?.type === 'eql') return 'low';
  return 'unknown';
}

function computeLiquidityReaction(annotation, pdaType, terminalBar) {
  const level = getLiquidityLevel(annotation);
  if (level === null || !terminalBar.found) return null;
  const side = getLiquiditySide(annotation, pdaType);
  if (side === 'unknown') {
    const touched = terminalBar.high >= level - PRICE_EPSILON && terminalBar.low <= level + PRICE_EPSILON;
    const bodyTouched =
      terminalBar.bodyHigh >= level - PRICE_EPSILON && terminalBar.bodyLow <= level + PRICE_EPSILON;
    const approachDistancePoints = touched
      ? 0
      : Math.min(Math.abs(terminalBar.high - level), Math.abs(terminalBar.low - level));
    return {
      shape: 'liquidity',
      side,
      level,
      swept: false,
      exactEquality:
        Math.abs(terminalBar.high - level) <= PRICE_EPSILON ||
        Math.abs(terminalBar.low - level) <= PRICE_EPSILON,
      touched,
      bodyTouched,
      approachedButNotSwept: !touched,
      approachDistancePoints,
      sweepDistancePoints: 0,
      closeBackThroughLevel: false,
      sweptThenReversed: false,
      deliveredThrough: false,
    };
  }

  const isHighSide = side === 'high';
  const testExtreme = isHighSide ? terminalBar.high : terminalBar.low;
  const swept = isHighSide
    ? testExtreme > level + PRICE_EPSILON
    : testExtreme < level - PRICE_EPSILON;
  const exactEquality = Math.abs(testExtreme - level) <= PRICE_EPSILON;
  const touched = swept || exactEquality;
  const bodyTouched =
    terminalBar.bodyHigh >= level - PRICE_EPSILON && terminalBar.bodyLow <= level + PRICE_EPSILON;
  const sweepDistancePoints = swept ? Math.abs(testExtreme - level) : 0;
  const approachDistancePoints = swept || exactEquality ? 0 : Math.abs(testExtreme - level);
  const closeBackThroughLevel = swept
    ? isHighSide
      ? terminalBar.close < level - PRICE_EPSILON
      : terminalBar.close > level + PRICE_EPSILON
    : false;
  const deliveredThrough = swept && !closeBackThroughLevel;

  return {
    shape: 'liquidity',
    side,
    level,
    touched,
    swept,
    exactEquality,
    bodyTouched,
    approachedButNotSwept: !swept && !exactEquality,
    approachDistancePoints,
    sweepDistancePoints,
    closeBackThroughLevel,
    sweptThenReversed: swept && closeBackThroughLevel,
    deliveredThrough,
  };
}

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = asNumber(annotation?.start?.price);
  const endPrice = asNumber(annotation?.end?.price);
  const value = asNumber(levelValue);
  if (startPrice === null || endPrice === null || value === null) return null;
  return endPrice - (endPrice - startPrice) * value;
}

function computeFibReaction(annotation, terminalBar, direction) {
  if (!terminalBar.found) return null;
  const levels = getVisibleFibLevels(annotation?.levels)
    .map((level) => ({
      value: asNumber(level.value),
      price: getFibLevelPrice(annotation, level.value),
    }))
    .filter((level) => level.value !== null && level.price !== null);
  if (!levels.length) return null;

  const enrichedLevels = levels
    .map((level) => {
      const wickTouched =
        terminalBar.high >= level.price - PRICE_EPSILON && terminalBar.low <= level.price + PRICE_EPSILON;
      const bodyTouched =
        terminalBar.bodyHigh >= level.price - PRICE_EPSILON && terminalBar.bodyLow <= level.price + PRICE_EPSILON;
      const distancePoints = wickTouched
        ? 0
        : Math.min(Math.abs(terminalBar.high - level.price), Math.abs(terminalBar.low - level.price));
      return {
        ...level,
        wickTouched,
        bodyTouched,
        distancePoints,
      };
    })
    .sort((a, b) => a.distancePoints - b.distancePoints);

  const nearest = enrichedLevels[0];
  const swept =
    direction === 'up'
      ? terminalBar.high > nearest.price + PRICE_EPSILON
      : direction === 'down'
        ? terminalBar.low < nearest.price - PRICE_EPSILON
        : false;
  const deliveredThrough =
    direction === 'up'
      ? terminalBar.close > nearest.price + PRICE_EPSILON
      : direction === 'down'
        ? terminalBar.close < nearest.price - PRICE_EPSILON
        : false;

  return {
    shape: 'fib',
    nearestLevel: nearest,
    wickTouched: nearest.wickTouched,
    bodyTouched: nearest.bodyTouched,
    swept,
    sweptThenReversed: swept && !deliveredThrough,
    deliveredThrough: swept && deliveredThrough,
  };
}

function getCandidateDistance(reaction) {
  if (!reaction) return Number.POSITIVE_INFINITY;
  if (reaction.shape === 'range') return reaction.approachDistancePoints ?? 0;
  if (reaction.shape === 'liquidity') return reaction.approachDistancePoints ?? reaction.sweepDistancePoints ?? 0;
  if (reaction.shape === 'fib') return reaction.nearestLevel?.distancePoints ?? 0;
  return Number.POSITIVE_INFINITY;
}

function isCandidateTouched(reaction) {
  if (!reaction) return false;
  if (reaction.shape === 'range') return Boolean(reaction.wick?.touched);
  if (reaction.shape === 'liquidity') return Boolean(reaction.touched || reaction.swept || reaction.exactEquality);
  if (reaction.shape === 'fib') return Boolean(reaction.wickTouched);
  return false;
}

function isCandidateBodyTouched(reaction) {
  if (!reaction) return false;
  if (reaction.shape === 'range') return Boolean(reaction.body?.touched);
  if (reaction.shape === 'liquidity') return Boolean(reaction.bodyTouched);
  if (reaction.shape === 'fib') return Boolean(reaction.bodyTouched);
  return false;
}

function computePdaReaction(annotation, terminalBar, direction) {
  const pdaType = getPdaType(annotation?.type);
  if (!pdaType) return null;
  if (pdaType.shape === 'range') return computeRangeReaction(annotation, terminalBar, direction);
  if (pdaType.shape === 'liquidity-line' || pdaType.shape === 'point-set') {
    return computeLiquidityReaction(annotation, pdaType, terminalBar);
  }
  if (pdaType.shape === 'fib-retracement') return computeFibReaction(annotation, terminalBar, direction);
  return null;
}

function computeTerminalPdaCandidates(segment, annotations, terminalBar, direction) {
  const annotationById = new Map(
    (Array.isArray(annotations) ? annotations : [])
      .filter((annotation) => annotation?.id)
      .map((annotation) => [annotation.id, annotation])
  );
  const responses = Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : [];

  // Terminal PDA reactions describe how the segment endpoint bar interacted
  // with linked PDA annotations. These are proximity/touch/delivery facts, not
  // PDA validity, segment validity, or an automatic explanation selection.
  return responses
    .map((response) => {
      const annotation = annotationById.get(response.pdaId);
      const pdaType = getPdaType(annotation?.type ?? response.pdaType);
      const reaction = annotation ? computePdaReaction(annotation, terminalBar, direction) : null;
      return {
        pdaId: response.pdaId,
        pdaType: annotation?.type ?? response.pdaType ?? 'unknown',
        label: pdaType?.label || String(annotation?.type ?? response.pdaType ?? 'PDA').toUpperCase(),
        relation: response.relation || 'approached',
        found: Boolean(annotation),
        reaction,
        touched: isCandidateTouched(reaction),
        bodyTouched: isCandidateBodyTouched(reaction),
        distancePoints: getCandidateDistance(reaction),
      };
    })
    .sort((a, b) => {
      if (a.found !== b.found) return a.found ? -1 : 1;
      if (a.touched !== b.touched) return a.touched ? -1 : 1;
      if (a.bodyTouched !== b.bodyTouched) return a.bodyTouched ? -1 : 1;
      return a.distancePoints - b.distancePoints;
    });
}

function getSegmentBars(segment, bars = []) {
  const startTimestamp = getTimestamp(segment?.start);
  const endTimestamp = getTimestamp(segment?.end);
  if (startTimestamp === null || endTimestamp === null || !Array.isArray(bars)) return [];
  const from = Math.min(startTimestamp, endTimestamp);
  const to = Math.max(startTimestamp, endTimestamp);
  return bars
    .filter((bar) => {
      const timestamp = asNumber(bar.timestamp);
      return timestamp !== null && timestamp >= from && timestamp <= to;
    })
    .sort((a, b) => asNumber(a.timestamp) - asNumber(b.timestamp));
}

function getDirectionalClose(bar, direction) {
  const open = asNumber(bar.open);
  const close = asNumber(bar.close);
  if (open === null || close === null) return null;
  if (direction === 'up') return close > open + PRICE_EPSILON;
  if (direction === 'down') return close < open - PRICE_EPSILON;
  return null;
}

function bodyOverlap(currentBar, previousBar) {
  const current = buildBarFacts(currentBar);
  const previous = buildBarFacts(previousBar);
  if (!current || !previous) return false;
  if (
    current.bodyHigh === null ||
    current.bodyLow === null ||
    previous.bodyHigh === null ||
    previous.bodyLow === null
  ) {
    return false;
  }
  return Math.min(current.bodyHigh, previous.bodyHigh) > Math.max(current.bodyLow, previous.bodyLow);
}

function computeMaxAdverseExcursionPercent(segment, segmentBars, direction, segmentRangePoints) {
  if (!segmentBars.length || !segmentRangePoints) return null;
  let maxAdverse = 0;
  const startPrice = asNumber(segment?.start?.price);

  if (direction === 'up') {
    let runningHigh = startPrice;
    segmentBars.forEach((bar) => {
      const high = asNumber(bar.high);
      const low = asNumber(bar.low);
      if (runningHigh !== null && low !== null) maxAdverse = Math.max(maxAdverse, runningHigh - low);
      if (high !== null && (runningHigh === null || high > runningHigh)) runningHigh = high;
    });
  } else if (direction === 'down') {
    let runningLow = startPrice;
    segmentBars.forEach((bar) => {
      const high = asNumber(bar.high);
      const low = asNumber(bar.low);
      if (runningLow !== null && high !== null) maxAdverse = Math.max(maxAdverse, high - runningLow);
      if (low !== null && (runningLow === null || low < runningLow)) runningLow = low;
    });
  }

  return (maxAdverse / segmentRangePoints) * 100;
}

function countPriorPdaInterruptions(segment, annotations, segmentBars, direction) {
  const annotationById = new Map(
    (Array.isArray(annotations) ? annotations : [])
      .filter((annotation) => annotation?.id)
      .map((annotation) => [annotation.id, annotation])
  );
  const responses = Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : [];
  const priorBars = segmentBars.slice(0, -1).map(buildBarFacts).filter(Boolean);

  return responses.filter((response) => {
    const annotation = annotationById.get(response.pdaId);
    if (!annotation) return false;
    return priorBars.some((barFacts) => isCandidateTouched(computePdaReaction(annotation, barFacts, direction)));
  }).length;
}

function computeFluencyMetrics(segment, bars, annotations, direction) {
  const segmentBars = getSegmentBars(segment, bars);
  const startTimestamp = getTimestamp(segment?.start);
  const endTimestamp = getTimestamp(segment?.end);
  const startBarLoaded = segmentBars.some((bar) => asNumber(bar.timestamp) === startTimestamp);
  const endBarLoaded = segmentBars.some((bar) => asNumber(bar.timestamp) === endTimestamp);
  const segmentRangePoints = getRangePoints(segment);

  // Fluency values are raw ingredients for review: path efficiency, body
  // overlap, close direction, adverse excursion, and prior PDA interruptions.
  // There is intentionally no final score here, because reviewer context still
  // decides whether these components are favorable, unfavorable, or irrelevant.
  const base = {
    barCount: segmentBars.length,
    startBarLoaded,
    endBarLoaded,
    rangePoints: segmentRangePoints,
    pathRangePoints: null,
    directionalEfficiency: null,
    overlapRatio: null,
    counterDirectionCloseRatio: null,
    directionalCloseRatio: null,
    averageBodyPercent: null,
    maxAdverseExcursionPercent: null,
    pointsPerBar: null,
    pdaInterruptionCount: null,
    incompleteReason: null,
  };

  if (!startBarLoaded || !endBarLoaded) {
    return { ...base, incompleteReason: 'segment endpoint bars not fully loaded' };
  }
  if (segmentBars.length < 2) {
    return { ...base, incompleteReason: 'not enough bars inside segment' };
  }
  if (!segmentRangePoints) {
    return { ...base, incompleteReason: 'missing segment range' };
  }

  const facts = segmentBars.map(buildBarFacts).filter(Boolean);
  const pathRangePoints = facts.reduce((sum, bar) => sum + (bar.rangePoints ?? 0), 0);
  const directionalCloses = segmentBars
    .map((bar) => getDirectionalClose(bar, direction))
    .filter((value) => value !== null);
  const directionalCloseCount = directionalCloses.filter(Boolean).length;
  const counterDirectionCloseCount = directionalCloses.length - directionalCloseCount;
  const bodyPercents = facts
    .filter((bar) => bar.rangePoints && bar.bodyPoints !== null)
    .map((bar) => (bar.bodyPoints / bar.rangePoints) * 100);
  let overlapCount = 0;
  for (let index = 1; index < segmentBars.length; index += 1) {
    if (bodyOverlap(segmentBars[index], segmentBars[index - 1])) overlapCount += 1;
  }

  return {
    ...base,
    pathRangePoints,
    directionalEfficiency: pathRangePoints ? segmentRangePoints / pathRangePoints : null,
    overlapRatio: segmentBars.length > 1 ? overlapCount / (segmentBars.length - 1) : null,
    counterDirectionCloseRatio: directionalCloses.length
      ? counterDirectionCloseCount / directionalCloses.length
      : null,
    directionalCloseRatio: directionalCloses.length ? directionalCloseCount / directionalCloses.length : null,
    averageBodyPercent: bodyPercents.length
      ? bodyPercents.reduce((sum, value) => sum + value, 0) / bodyPercents.length
      : null,
    maxAdverseExcursionPercent: computeMaxAdverseExcursionPercent(
      segment,
      segmentBars,
      direction,
      segmentRangePoints
    ),
    pointsPerBar: segmentRangePoints / segmentBars.length,
    pdaInterruptionCount: countPriorPdaInterruptions(segment, annotations, segmentBars, direction),
  };
}

export function computeSegmentReviewMetrics(segment, { segments = [], bars = [], annotations = [] } = {}) {
  const previousSegment = findPreviousSegment(segment, segments);
  const previousComparison = computePreviousComparison(segment, previousSegment);
  const terminalBar = computeTerminalBarFacts(segment, bars);
  const direction = getDirection(segment);

  return {
    version: 1,
    segmentId: segment?.id || null,
    direction,
    previousComparison,
    terminalBar,
    terminalPdaCandidates: computeTerminalPdaCandidates(segment, annotations, terminalBar, direction),
    fluency: computeFluencyMetrics(segment, bars, annotations, direction),
  };
}
