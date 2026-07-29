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
    switchProfile.blankSeriesAllowed !== false ||
    switchProfile.entryContextAnchor !== 'session-start' ||
    switchProfile.closedRthEntryCrossesPriorSession !== true ||
    switchProfile.forwardRequestIdentityStableWithinBuffer !== true ||
    switchProfile.replacementViewportTargetPlannedBeforeAcquire !== true ||
    switchProfile.nativeHistoryTriggerRequired !== false ||
    switchProfile.highTimeframeProjectedContextMerge !== true ||
    switchProfile.authoritativeRawTailRequired !== true
  ) {
    violations.push({ code: 'non-atomic-or-blank-projection-refresh' });
  }

  const history = profiles['history-extension-single-pass'] ?? {};
  if (
    !boundedLatency(history.cacheHitVisible) ||
    !boundedLatency(history.postResponseVisible) ||
    history.oneVisibleCommit !== true ||
    history.automaticVisibleContinuation !== false ||
    history.barByBarVisibleRepairAllowed !== false ||
    history.blockByBlockVisibleRepairAllowed !== false ||
    history.dimDuringHistory !== false ||
    history.internalTransportChunkingAllowed !== true ||
    history.requiresAdditionalUserInput !== false ||
    history.heldOrWheelIntentStabilityMs !== 500 ||
    history.pointerReleaseStartsImmediately !== true ||
    !(history.leftFillSafetyBars >= 0) ||
    !(history.leftBufferBars >= 0) ||
    !(history.minimumDisplayBars >= 1) ||
    history.highTimeframeProjectedHistory?.minimumDurationMs !== 3_600_000 ||
    !(history.highTimeframeProjectedHistory?.maximumWindowDays >= 365) ||
    history.highTimeframeProjectedHistory?.barDataRuntimeOwnsCache !== true ||
    history.highTimeframeProjectedHistory?.rawReplayLedgerContaminationAllowed !== false ||
    history.highTimeframeProjectedHistory?.separateProvenanceRequired !== true
  ) {
    violations.push({ code: 'incremental-or-user-driven-history-repair' });
  }

  const projectedCache = model.projectedHistoryCache ?? {};
  if (projectedCache.owner !== 'bar-data-runtime'
    || projectedCache.boundedEvictionRequired !== true
    || projectedCache.coalesceIdenticalInflightRequests !== true
    || projectedCache.sourceDataset !== 'immutable-1m'
    || projectedCache.replaySourceTraversalVisible !== false
    || !Array.isArray(projectedCache.keyFields)
    || !['sessionHoursMode', 'displayTimeframeId', 'calendarRevision', 'aggregationPolicyRevision']
      .every((field) => projectedCache.keyFields.includes(field))) {
    violations.push({ code: 'unsafe-projected-history-cache' });
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
