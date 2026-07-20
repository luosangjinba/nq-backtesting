import { CAPABILITY_INTERNALS } from './common-contract.js';

const {
  assertExactFields,
  fail,
  nonNegativeSafeInteger,
  normalizeBase,
  positiveSafeInteger,
  stringList,
} = CAPABILITY_INTERNALS;
const TIMESTAMP_PRECISIONS = Object.freeze(['millisecond', 'microsecond', 'nanosecond']);
const EXECUTION_PRECISIONS = Object.freeze(['bar', 'tick']);

function normalizeCoverage(value) {
  if (value?.kind === 'dynamic') {
    assertExactFields(value, ['kind']);
    return Object.freeze({ kind: value.kind });
  }
  if (value?.kind === 'bounded') {
    assertExactFields(value, ['kind', 'startEpochMs', 'endEpochMs']);
    const startEpochMs = nonNegativeSafeInteger(value.startEpochMs, 'coverage.startEpochMs');
    const endEpochMs = nonNegativeSafeInteger(value.endEpochMs, 'coverage.endEpochMs');
    if (startEpochMs >= endEpochMs) fail('INVALID_PROVIDER_COVERAGE', 'Provider coverage must increase.');
    return Object.freeze({ kind: value.kind, startEpochMs, endEpochMs });
  }
  fail('INVALID_PROVIDER_COVERAGE', 'Provider coverage kind is invalid.');
}

/**
 * Owner: module-registry.
 * Declares provider coverage, precision, resolutions, and bounded request limits.
 * The descriptor exposes no network/request implementation.
 */
export function defineMarketDataProvider(value) {
  const base = normalizeBase(value, {
    kind: 'marketData',
    contract: 'MarketDataProvider',
    specificFields: [
      'instrumentIds',
      'sourceResolutionIds',
      'coverage',
      'timestampPrecision',
      'executionPrecision',
      'requestLimits',
    ],
  });
  if (!TIMESTAMP_PRECISIONS.includes(value.timestampPrecision)
    || !EXECUTION_PRECISIONS.includes(value.executionPrecision)) {
    fail('INVALID_PROVIDER_PRECISION', `${base.id} precision is invalid.`);
  }
  assertExactFields(value.requestLimits, ['maxBarsPerRequest', 'maxConcurrentRequests']);
  return Object.freeze({
    ...base,
    instrumentIds: stringList(value.instrumentIds, 'instrumentIds'),
    sourceResolutionIds: stringList(value.sourceResolutionIds, 'sourceResolutionIds'),
    coverage: normalizeCoverage(value.coverage),
    timestampPrecision: value.timestampPrecision,
    executionPrecision: value.executionPrecision,
    requestLimits: Object.freeze({
      maxBarsPerRequest: positiveSafeInteger(value.requestLimits.maxBarsPerRequest, 'maxBarsPerRequest'),
      maxConcurrentRequests: positiveSafeInteger(
        value.requestLimits.maxConcurrentRequests,
        'maxConcurrentRequests',
      ),
    }),
  });
}
