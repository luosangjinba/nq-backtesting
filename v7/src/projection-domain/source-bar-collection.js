import { failProjection } from './projection-error.js';

function requireCommonSource(request, expected) {
  for (const field of [
    'providerId',
    'instrumentId',
    'sourceResolutionId',
    'datasetRevision',
  ]) {
    if (request[field] !== expected[field]) {
      failProjection(
        'PROJECTION_SOURCE_IDENTITY_MIXED',
        `Projection source batches disagree on ${field}.`,
      );
    }
  }
}

function requireCapabilityCompatibility(input, request) {
  if (request.instrumentId !== input.instrument.id) {
    failProjection('PROJECTION_INSTRUMENT_MISMATCH', 'Raw bars belong to another instrument.');
  }
  if (!input.instrument.providerIds.includes(request.providerId)) {
    failProjection('PROJECTION_PROVIDER_MISMATCH', 'Raw provider is not supported by the instrument.');
  }
  if (!input.displayTimeframe.sourceResolutionIds.includes(request.sourceResolutionId)) {
    failProjection(
      'PROJECTION_SOURCE_RESOLUTION_MISMATCH',
      'Raw source resolution is incompatible with the selected timeframe.',
    );
  }
}

function lowerBound(bars, targetEpochMs) {
  let low = 0;
  let high = bars.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (bars[middle].startEpochMs < targetEpochMs) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Collect contiguous ordered chunks without silently sorting, deduplicating, or merging. */
export function collectProjectionSourceBars(input, { fromEpochMs = 0 } = {}) {
  if (!Number.isSafeInteger(fromEpochMs) || fromEpochMs < 0) {
    failProjection('PROJECTION_SOURCE_CUTOFF_INVALID', 'Projection source cutoff must be a non-negative epoch.');
  }
  const [firstBatch] = input.sourceBatches;
  const expected = firstBatch.request;
  requireCapabilityCompatibility(input, expected);
  const bars = [];
  let previousWindowEnd = -1;
  for (const batch of input.sourceBatches) {
    requireCommonSource(batch.request, expected);
    requireCapabilityCompatibility(input, batch.request);
    if (batch.request.windowStartEpochMs < previousWindowEnd) {
      failProjection(
        'PROJECTION_SOURCE_WINDOWS_OVERLAP',
        'Projection source windows must be ordered and non-overlapping.',
      );
    }
    if (previousWindowEnd >= 0 && batch.request.windowStartEpochMs > previousWindowEnd) {
      failProjection(
        'PROJECTION_SOURCE_WINDOWS_GAP',
        'Projection source windows must remain contiguous.',
      );
    }
    previousWindowEnd = batch.request.windowEndEpochMs;
    const startIndex = fromEpochMs === 0 ? 0 : lowerBound(batch.bars, fromEpochMs);
    for (let index = startIndex; index < batch.bars.length; index += 1) bars.push(batch.bars[index]);
  }
  if (bars.length === 0) {
    failProjection('PROJECTION_SOURCE_EMPTY', 'Projection source contains no bars.');
  }
  return Object.freeze({ bars: Object.freeze(bars), sourceIdentity: expected });
}
