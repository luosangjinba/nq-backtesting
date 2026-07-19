const REQUIRED_CACHE_KEY_FIELDS = [
  'providerId',
  'instrumentId',
  'sourceResolution',
  'windowStart',
  'windowEnd',
  'datasetRevision',
];

function boundedLatency(value) {
  return (
    Number.isFinite(value?.p95Ms) &&
    Number.isFinite(value?.p99Ms) &&
    Number.isFinite(value?.maxMs) &&
    value.p95Ms <= value.p99Ms &&
    value.p99Ms <= value.maxMs
  );
}

function boundedFeedback(value) {
  return Number.isFinite(value?.p95Ms) && Number.isFinite(value?.p99Ms) && value.p95Ms <= value.p99Ms;
}

export function validateCacheLatencyContract(model) {
  const violations = [];
  const measurement = model.measurement ?? {};
  if (measurement.artificialProductionDelayMs !== 0) {
    violations.push({ code: 'artificial-production-delay' });
  }
  if (
    measurement.excludeProviderTimeFromLocalBudget !== true ||
    !(measurement.minimumSamples >= 100) ||
    !(measurement.providerRequestDeadlineMs > 0 && measurement.providerRequestDeadlineMs <= 5000) ||
    !Array.isArray(measurement.requiredRecordedContext)
  ) {
    violations.push({ code: 'invalid-latency-measurement-contract' });
  }

  const profiles = model.profiles ?? {};
  for (const id of ['manual-next-cache-tiered', 'auto-replay-cache-tiered', 'projection-switch-cache-tiered']) {
    if (!boundedLatency(profiles[id]?.cacheHitVisible)) {
      violations.push({ code: 'unbounded-cache-hit-latency', profile: id });
    }
  }
  for (const id of ['manual-next-cache-tiered', 'auto-replay-cache-tiered', 'projection-switch-cache-tiered', 'miss-overhead-and-feedback']) {
    if (!boundedLatency(profiles[id]?.postResponseVisible)) {
      violations.push({ code: 'unbounded-post-response-latency', profile: id });
    }
  }

  for (const id of ['manual-next-cache-tiered', 'auto-replay-cache-tiered', 'projection-switch-cache-tiered']) {
    if (!boundedFeedback(profiles[id]?.cacheMissFeedback)) {
      violations.push({ code: 'unbounded-cache-miss-feedback', profile: id });
    }
  }
  if (!boundedFeedback(profiles['miss-overhead-and-feedback']?.feedback)) {
    violations.push({ code: 'unbounded-cache-miss-feedback', profile: 'miss-overhead-and-feedback' });
  }

  const switchProfile = profiles['projection-switch-cache-tiered'] ?? {};
  if (
    switchProfile.retainLastAcceptedSnapshot !== true ||
    switchProfile.dimDuringRefresh !== true ||
    switchProfile.atomicReplacement !== true ||
    switchProfile.blankSeriesAllowed !== false
  ) {
    violations.push({ code: 'non-atomic-or-blank-projection-refresh' });
  }

  const history = profiles['history-extension-chunked'] ?? {};
  if (
    !boundedLatency(history.cacheHitChunkVisible) ||
    !boundedLatency(history.postResponseChunkVisible) ||
    history.atomicChunkCommit !== true ||
    history.barByBarVisibleRepairAllowed !== false ||
    history.requiresAdditionalUserInput !== false ||
    !(history.minimumVisibleRangeMultiplier >= 2) ||
    !Number.isFinite(history.automaticContinuationMaxMs)
  ) {
    violations.push({ code: 'incremental-or-user-driven-history-repair' });
  }

  const rawCache = model.rawBarCache ?? {};
  const keyFields = new Set(rawCache.keyFields ?? []);
  if (
    rawCache.owner !== 'bar-data-runtime' ||
    rawCache.activeSessionInKey !== false ||
    REQUIRED_CACHE_KEY_FIELDS.some((field) => !keyFields.has(field))
  ) {
    violations.push({ code: 'incomplete-or-session-coupled-cache-identity' });
  }
  if (
    rawCache.coalesceIdenticalInflightRequests !== true ||
    rawCache.boundedEvictionRequired !== true ||
    rawCache.projectionStillEnforcesNoFuture !== true ||
    !(rawCache.prefetch?.minimumAheadReplaySteps >= 2) ||
    !(rawCache.prefetch?.lowWatermarkReplaySteps >= 1) ||
    !(rawCache.prefetch?.targetVisibleSourceWindows >= 1) ||
    rawCache.prefetch?.respectsProviderRequestLimits !== true
  ) {
    violations.push({ code: 'missing-cache-prefetch-or-safety-contract' });
  }

  return violations;
}
