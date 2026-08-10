import { AnnotationSemanticPackageError } from '../annotation-semantic-registry/public.js';

function reject(message) {
  throw new AnnotationSemanticPackageError('SEMANTIC_CONSTRUCTION_REJECTED', message);
}
function parameter(value) {
  return Object.freeze({
    baselineValue: value,
    effectiveSource: 'derived',
    effectiveValue: value,
    overrideProvenance: null,
  });
}

function requirePrice(value, label) {
  if (!Number.isFinite(value)) reject(`${label} is invalid.`);
  return Object.is(value, -0) ? 0 : value;
}

/** Apply the immutable strict three-Bar wick-gap definition to normalized evidence. */
export function deriveStrictFvgFormation(bars) {
  if (!Array.isArray(bars) || bars.length !== 3
    || bars.some((bar, index) => bar?.relativeOffset !== index - 1)) {
    reject('Strict FVG formation requires exact -1, 0, and 1 Bar evidence.');
  }
  const preceding = bars[0];
  const selected = bars[1];
  const confirming = bars[2];
  const precedingHigh = requirePrice(preceding.value?.high, 'Preceding Bar high');
  const precedingLow = requirePrice(preceding.value?.low, 'Preceding Bar low');
  const confirmingHigh = requirePrice(confirming.value?.high, 'Confirming Bar high');
  const confirmingLow = requirePrice(confirming.value?.low, 'Confirming Bar low');
  const bullish = precedingHigh < confirmingLow;
  const bearish = precedingLow > confirmingHigh;
  if (bullish === bearish) {
    reject('Three-Bar evidence does not form one strict bullish or bearish wick gap.');
  }
  const lower = bullish ? precedingHigh : confirmingHigh;
  const upper = bullish ? confirmingLow : precedingLow;
  if (!(lower < upper)) reject('Strict FVG price bounds are degenerate.');
  const midpoint = lower + ((upper - lower) / 2);
  return Object.freeze({
    attributes: Object.freeze({
      direction: bullish ? 'bullish' : 'bearish',
      formation: Object.freeze({
        confirmingBarStartEpochMs: confirming.reference.startEpochMs,
        precedingBarStartEpochMs: preceding.reference.startEpochMs,
        selectedBarStartEpochMs: selected.reference.startEpochMs,
      }),
      lowerPrice: parameter(lower),
      midpointPrice: parameter(midpoint),
      upperPrice: parameter(upper),
    }),
    direction: bullish ? 'bullish' : 'bearish',
    lowerPrice: lower,
    midpointPrice: midpoint,
    upperPrice: upper,
  });
}
