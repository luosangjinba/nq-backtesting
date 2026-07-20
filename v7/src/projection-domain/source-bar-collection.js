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

/** Collect strictly ordered chunks without silently sorting, deduplicating, or merging overlaps. */
export function collectProjectionSourceBars(input) {
  const [firstBatch] = input.sourceBatches;
  const expected = firstBatch.request;
  requireCapabilityCompatibility(input, expected);
  const bars = [];
  let previousWindowEnd = -1;
  let previousBarStart = -1;
  for (const batch of input.sourceBatches) {
    requireCommonSource(batch.request, expected);
    requireCapabilityCompatibility(input, batch.request);
    if (batch.request.windowStartEpochMs < previousWindowEnd) {
      failProjection(
        'PROJECTION_SOURCE_WINDOWS_OVERLAP',
        'Projection source windows must be ordered and non-overlapping.',
      );
    }
    previousWindowEnd = batch.request.windowEndEpochMs;
    for (const bar of batch.bars) {
      if (bar.startEpochMs <= previousBarStart) {
        failProjection(
          'PROJECTION_SOURCE_BARS_NOT_ORDERED',
          'Projection source bars must remain globally ordered and unique.',
        );
      }
      previousBarStart = bar.startEpochMs;
      bars.push(bar);
    }
  }
  if (bars.length === 0) {
    failProjection('PROJECTION_SOURCE_EMPTY', 'Projection source contains no bars.');
  }
  return Object.freeze({ bars: Object.freeze(bars), sourceIdentity: expected });
}
