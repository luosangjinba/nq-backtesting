import { failGeometry } from './geometry-error.js';

class MarketAnchorValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function exactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failGeometry('MARKET_ANCHOR_INVALID', 'Market Anchor must be one exact record.');
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failGeometry('MARKET_ANCHOR_FIELDS_INVALID', 'Market Anchor fields must be exact.');
  }
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: create one canonical market-coordinate anchor without vendor coordinates.
 * Inputs/outputs: exact instrument id, epoch milliseconds, and finite price; branded immutable anchor.
 * Side effects/lifecycle: none; the value owns no Chart, Pane, Replay, or persistence state.
 * Errors: AnnotationGeometryError with a stable anchor validation code.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
export function createMarketAnchor(value = {}) {
  exactRecord(value, ['epochMs', 'instrumentId', 'price']);
  if (typeof value.instrumentId !== 'string'
    || value.instrumentId.length === 0
    || value.instrumentId.trim() !== value.instrumentId) {
    failGeometry('MARKET_ANCHOR_INSTRUMENT_INVALID', 'Market Anchor instrument id must be exact and non-empty.');
  }
  if (!Number.isSafeInteger(value.epochMs) || value.epochMs < 0) {
    failGeometry('MARKET_ANCHOR_EPOCH_INVALID', 'Market Anchor epoch must be a non-negative safe integer.');
  }
  if (!Number.isFinite(value.price)) {
    failGeometry('MARKET_ANCHOR_PRICE_INVALID', 'Market Anchor price must be finite.');
  }
  return new MarketAnchorValue({
    epochMs: value.epochMs,
    instrumentId: value.instrumentId,
    price: Object.is(value.price, -0) ? 0 : value.price,
  });
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: read canonical market coordinates while rejecting structural lookalikes.
 * Inputs/outputs: branded Market Anchor; frozen plain anchor record.
 * Side effects/lifecycle: none.
 * Errors: AnnotationGeometryError when the candidate was not created by this contract.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function readMarketAnchor(candidate) {
  if (!(candidate instanceof MarketAnchorValue)) {
    failGeometry('MARKET_ANCHOR_REQUIRED', 'A branded Market Anchor is required.');
  }
  return candidate.read();
}
