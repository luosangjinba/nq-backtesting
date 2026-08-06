import {
  createRawBarBatch,
  createRawBarRequest,
  rawBarRequestKey,
} from '../bar-data-contract/public.js';
import { failBarDataRuntime } from './runtime-error.js';

const OPERATIONS = new Set(['history-extension', 'navigation', 'source-replacement']);

function requirePositiveSafeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    failBarDataRuntime('INVALID_RAW_COVERAGE_STORE_CONFIG', `${field} must be a positive safe integer.`);
  }
  return value;
}

function requireConsumerId(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failBarDataRuntime('INVALID_RAW_COVERAGE_CONSUMER', 'Raw coverage consumer id must be an exact string.');
  }
  return value;
}

function sameSourceScope(left, right) {
  return left.providerId === right.providerId
    && left.instrumentId === right.instrumentId
    && left.sourceResolutionId === right.sourceResolutionId
    && left.datasetRevision === right.datasetRevision;
}

function covers(batches, request) {
  let coveredThroughEpochMs = request.windowStartEpochMs;
  for (const candidate of batches) {
    const window = candidate.request;
    if (!sameSourceScope(window, request)) continue;
    if (window.windowEndEpochMs <= coveredThroughEpochMs) continue;
    if (window.windowStartEpochMs > coveredThroughEpochMs) return false;
    coveredThroughEpochMs = window.windowEndEpochMs;
    if (coveredThroughEpochMs >= request.windowEndEpochMs) return true;
  }
  return false;
}

function contiguousPrefix(accepted, acquired) {
  const prefix = [];
  let requiredEndEpochMs = acquired.request.windowStartEpochMs;
  for (let index = accepted.length - 1; index >= 0; index -= 1) {
    const candidate = accepted[index];
    if (!sameSourceScope(candidate.request, acquired.request)) break;
    if (candidate.request.windowEndEpochMs > requiredEndEpochMs) continue;
    if (candidate.request.windowEndEpochMs < requiredEndEpochMs) break;
    prefix.unshift(candidate);
    requiredEndEpochMs = candidate.request.windowStartEpochMs;
  }
  return prefix;
}

function exactBatchFromCoverage(batches, request) {
  if (!covers(batches, request)) return null;
  const bars = new Map();
  for (const batch of batches) {
    if (!sameSourceScope(batch.request, request)) continue;
    for (const bar of batch.bars) {
      if (bar.startEpochMs >= request.windowStartEpochMs
        && bar.startEpochMs < request.windowEndEpochMs) {
        bars.set(bar.startEpochMs, bar);
      }
    }
  }
  return createRawBarBatch({
    bars: [...bars.values()].sort((left, right) => left.startEpochMs - right.startEpochMs),
    request,
    schemaVersion: 1,
  });
}

/** Own all accepted, staged, and callback-transient raw coverage for one Bar Data Runtime. */
export function createRawCoverageStore({
  maxConsumers,
  maxTotalWindowSpanMs,
  maxWindowCount,
  maxWindowSpanMs,
}) {
  const limits = Object.freeze({
    maxConsumers: requirePositiveSafeInteger(maxConsumers, 'maxConsumers'),
    maxTotalWindowSpanMs: requirePositiveSafeInteger(
      maxTotalWindowSpanMs,
      'maxTotalWindowSpanMs',
    ),
    maxWindowCount: requirePositiveSafeInteger(maxWindowCount, 'maxWindowCount'),
    maxWindowSpanMs: requirePositiveSafeInteger(maxWindowSpanMs, 'maxWindowSpanMs'),
  });
  if (limits.maxTotalWindowSpanMs < limits.maxWindowSpanMs) {
    failBarDataRuntime(
      'INVALID_RAW_COVERAGE_STORE_CONFIG',
      'Raw coverage aggregate span must not be smaller than its per-window span.',
    );
  }

  const acceptedByConsumer = new Map();
  const staged = new Map();
  const transient = new Map();
  let nextToken = 1;

  function validateBounded(batches) {
    if (batches.length > limits.maxWindowCount) {
      failBarDataRuntime('RAW_COVERAGE_WINDOW_COUNT_EXCEEDED', 'Raw coverage exceeds its window-count bound.');
    }
    let total = 0;
    for (const batch of batches) {
      const span = batch.request.windowEndEpochMs - batch.request.windowStartEpochMs;
      if (span > limits.maxWindowSpanMs) {
        failBarDataRuntime('RAW_COVERAGE_WINDOW_SPAN_EXCEEDED', 'Raw coverage exceeds its per-window bound.');
      }
      total += span;
      if (!Number.isSafeInteger(total) || total > limits.maxTotalWindowSpanMs) {
        failBarDataRuntime('RAW_COVERAGE_TOTAL_SPAN_EXCEEDED', 'Raw coverage exceeds its aggregate bound.');
      }
    }
  }

  function stage({ acquired, consumerId, operation }) {
    const consumer = requireConsumerId(consumerId);
    if (!OPERATIONS.has(operation)) {
      failBarDataRuntime('INVALID_RAW_COVERAGE_OPERATION', 'Raw coverage operation is invalid.');
    }
    const batch = createRawBarBatch(acquired);
    const accepted = acceptedByConsumer.get(consumer) ?? Object.freeze([]);
    const sourceChanged = accepted.length > 0
      && !sameSourceScope(accepted[0].request, batch.request);
    let batches;
    if (sourceChanged) batches = [batch];
    else if (operation === 'history-extension') batches = [batch, ...accepted];
    else if (operation === 'source-replacement') batches = [batch];
    else if (covers(accepted, batch.request)) batches = accepted;
    else batches = [...contiguousPrefix(accepted, batch), batch];
    validateBounded(batches);
    const knownConsumers = new Set([
      ...acceptedByConsumer.keys(),
      ...[...staged.values()].map((entry) => entry.consumerId),
    ]);
    if (!knownConsumers.has(consumer) && knownConsumers.size >= limits.maxConsumers) {
      failBarDataRuntime('RAW_COVERAGE_CONSUMER_LIMIT_EXCEEDED', 'Raw coverage exceeds its consumer bound.');
    }
    const token = nextToken;
    nextToken += 1;
    staged.set(token, Object.freeze({
      batches: Object.freeze(batches),
      consumerId: consumer,
    }));
    return Object.freeze({
      requests: Object.freeze(batches.map(({ request }) => request)),
      token,
    });
  }

  function requireStage(token) {
    const entry = staged.get(token);
    if (!entry) failBarDataRuntime('RAW_COVERAGE_STAGE_INACTIVE', 'Raw coverage stage is inactive.');
    return entry;
  }

  function readStage(token, requestValue) {
    const request = createRawBarRequest(requestValue);
    const entry = requireStage(token);
    const exact = entry.batches.find((batch) => batch.requestKey === rawBarRequestKey(request));
    if (!exact) failBarDataRuntime('RAW_COVERAGE_WINDOW_UNAVAILABLE', 'Leased raw window is unavailable.');
    return exact;
  }

  function commit(token) {
    const entry = requireStage(token);
    acceptedByConsumer.set(entry.consumerId, entry.batches);
    staged.delete(token);
  }

  function reject(token) {
    staged.delete(token);
  }

  function batchForRequest(requestValue) {
    const request = createRawBarRequest(requestValue);
    const requestKey = rawBarRequestKey(request);
    for (const batches of acceptedByConsumer.values()) {
      const exact = batches.find((batch) => batch.requestKey === requestKey);
      if (exact) return exact;
      const batch = exactBatchFromCoverage(batches, request);
      if (batch) return batch;
    }
    return null;
  }

  function createTransient(batchValue) {
    const token = nextToken;
    nextToken += 1;
    transient.set(token, createRawBarBatch(batchValue));
    return token;
  }

  function readTransient(token, requestValue) {
    const batch = transient.get(token);
    if (!batch || batch.requestKey !== rawBarRequestKey(requestValue)) {
      failBarDataRuntime('RAW_COVERAGE_WINDOW_UNAVAILABLE', 'Transient raw window is unavailable.');
    }
    return batch;
  }

  function releaseConsumers(activeConsumerIds) {
    const active = new Set([...activeConsumerIds].map(requireConsumerId));
    for (const consumerId of acceptedByConsumer.keys()) {
      if (!active.has(consumerId)) acceptedByConsumer.delete(consumerId);
    }
  }

  function oldestEpochMs(consumerId) {
    const accepted = acceptedByConsumer.get(requireConsumerId(consumerId));
    return accepted?.[0]?.request.windowStartEpochMs ?? null;
  }

  function dispose() {
    acceptedByConsumer.clear();
    staged.clear();
    transient.clear();
  }

  return Object.freeze({
    batchForRequest,
    commit,
    createTransient,
    dispose,
    oldestEpochMs,
    readStage,
    readTransient,
    reject,
    releaseConsumers,
    releaseTransient: (token) => transient.delete(token),
    stage,
  });
}
