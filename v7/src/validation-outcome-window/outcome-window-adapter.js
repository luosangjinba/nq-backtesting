import {
  calculateOutcomeObservation,
  exactRecord,
  failValidation,
  readPathPlan,
  requireContractId,
  requireEpoch,
  requireOpaqueId,
  requireRevision,
  sha256Canonical,
  strictPortableValue,
} from '../validation-study-domain/public.js';

const REQUEST_FIELDS = Object.freeze([
  'datasetId', 'datasetRevision', 'decisionCutoffEpochMs', 'executionPaneId',
  'executionTimeframeId', 'instrumentId', 'pathPlan', 'recordedAtEpochMs',
  'requestedOutcomeCutoffEpochMs', 'sessionHoursId', 'sessionId', 'sessionRevision',
]);

function requireOptions(value) {
  if (typeof value?.barData?.acquire !== 'function'
      || typeof value?.market?.requestWindow !== 'function'
      || typeof value?.readReplaySnapshot !== 'function'
      || typeof value?.readWorkspaceSnapshot !== 'function'
      || typeof value?.sessionIdentity?.sessionId !== 'string'
      || !Number.isSafeInteger(value?.sessionIdentity?.sessionRevision)) {
    throw new TypeError('Outcome adapter requires Bar Data, market, Replay, and Workspace ports.');
  }
  return value;
}

function requireRequest(value) {
  exactRecord(value, REQUEST_FIELDS, 'Outcome window request');
  return strictPortableValue({
    datasetId: requireOpaqueId(value.datasetId, 'Outcome dataset id'),
    datasetRevision: requireOpaqueId(value.datasetRevision, 'Outcome dataset revision'),
    decisionCutoffEpochMs: requireEpoch(value.decisionCutoffEpochMs, 'Outcome decision cutoff'),
    executionPaneId: requireOpaqueId(value.executionPaneId, 'Outcome execution Pane'),
    executionTimeframeId: requireContractId(
      value.executionTimeframeId, 'Outcome execution timeframe',
    ),
    instrumentId: requireContractId(value.instrumentId, 'Outcome instrument'),
    pathPlan: readPathPlan(value.pathPlan),
    recordedAtEpochMs: requireEpoch(value.recordedAtEpochMs, 'Outcome record time'),
    requestedOutcomeCutoffEpochMs: requireEpoch(
      value.requestedOutcomeCutoffEpochMs, 'Requested Outcome cutoff',
    ),
    sessionHoursId: requireContractId(value.sessionHoursId, 'Outcome Session Hours'),
    sessionId: requireOpaqueId(value.sessionId, 'Outcome Session id'),
    sessionRevision: requireRevision(value.sessionRevision, 'Outcome Session revision'),
  });
}

function requireSession(options, request) {
  if (options.sessionIdentity.sessionId !== request.sessionId
    || options.sessionIdentity.sessionRevision !== request.sessionRevision) {
    failValidation(
      'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
      'The mounted Replay Session does not match the frozen Case Session.',
      { operation: 'record-case-outcome' },
    );
  }
}

function requireReplayCutoff(replay, request, { afterAcquire = false } = {}) {
  if (!Number.isSafeInteger(replay?.cursorEpochMs)
    || request.requestedOutcomeCutoffEpochMs > replay.cursorEpochMs) {
    failValidation(
      afterAcquire
        ? 'VALIDATION_CAMPAIGN_REPLAY_CUTOFF_CHANGED'
        : 'VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED',
      afterAcquire
        ? 'Replay moved behind the requested Outcome cutoff during observation.'
        : 'Requested Outcome cutoff is later than the accepted Replay cursor.',
      { operation: 'record-case-outcome' },
    );
  }
}

function requireDatasetIdentity(identity, request, label) {
  if (identity?.datasetRevision !== request.datasetRevision
    || identity?.instrumentId !== request.instrumentId
    || typeof identity?.providerId !== 'string'
    || typeof identity?.sourceResolutionId !== 'string') {
    failValidation(
      'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
      `${label} does not match the frozen Case dataset.`,
      { operation: 'record-case-outcome' },
    );
  }
  return identity;
}

function displayBars(snapshot, request) {
  const pane = snapshot?.workspace?.panes?.find(({ paneId }) => paneId === request.executionPaneId);
  if (!pane || pane.status !== 'ready' || !Array.isArray(pane.snapshot?.bars)) {
    failValidation(
      'VALIDATION_CAMPAIGN_OUTCOME_WINDOW_INCOMPLETE',
      'The execution Pane has no accepted Bar window.',
      { operation: 'record-case-outcome' },
    );
  }
  const provenance = pane.snapshot.provenance;
  if (provenance.instrumentId !== request.instrumentId
    || provenance.displayTimeframeId !== request.executionTimeframeId
    || provenance.sessionHoursPolicyId !== request.sessionHoursId
    || provenance.datasetRevision !== request.datasetRevision) {
    failValidation(
      'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
      'The execution Pane no longer matches the Case Outcome identity.',
      { operation: 'record-case-outcome' },
    );
  }
  return Object.freeze(pane.snapshot.bars
    .filter(({ startEpochMs }) => (
      startEpochMs >= request.decisionCutoffEpochMs
        && startEpochMs < request.requestedOutcomeCutoffEpochMs
    ))
    .slice(0, request.pathPlan.horizonBars)
    .map(({ close, high, low, open, startEpochMs }) => Object.freeze({
      close, high, low, open, startEpochMs,
    })));
}

/** Request coverage only through the sole Bar Data Runtime, then observe accepted execution Bars. */
export function createValidationOutcomeWindowAdapter(rawOptions = {}) {
  const options = requireOptions(rawOptions);
  return Object.freeze({
    async observeOutcome(rawRequest, signal = new AbortController().signal) {
      const request = requireRequest(rawRequest);
      if (signal.aborted) {
        failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Outcome observation was cancelled.', {
          operation: 'record-case-outcome',
        });
      }
      requireSession(options, request);
      requireReplayCutoff(options.readReplaySnapshot(), request);
      const barRequest = options.market.requestWindow({
        instrumentId: request.instrumentId,
        windowEndEpochMs: request.requestedOutcomeCutoffEpochMs,
        windowStartEpochMs: request.decisionCutoffEpochMs,
      });
      requireDatasetIdentity(barRequest, request, 'The Bar request');
      const batch = await options.barData.acquire(barRequest, { signal });
      if (signal.aborted) {
        failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Outcome observation was cancelled.', {
          operation: 'record-case-outcome',
        });
      }
      requireSession(options, request);
      requireReplayCutoff(options.readReplaySnapshot(), request, { afterAcquire: true });
      const batchIdentity = requireDatasetIdentity(batch?.request, request, 'The accepted Bar batch');
      const bars = displayBars(options.readWorkspaceSnapshot(), request);
      const datasetDigest = await sha256Canonical({
        datasetRevision: batchIdentity.datasetRevision,
        providerId: batchIdentity.providerId,
      }, options.crypto);
      if (`dataset-${datasetDigest.slice(7, 23)}` !== request.datasetId) {
        failValidation(
          'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
          'The accepted Bar batch dataset id differs from the frozen Case.',
          { operation: 'record-case-outcome' },
        );
      }
      const atDatasetEnd = request.requestedOutcomeCutoffEpochMs >= options.sessionRange.endEpochMs;
      const coverageProof = bars.length >= request.pathPlan.horizonBars
        ? 'complete-window'
        : atDatasetEnd ? 'irrecoverable-incomplete' : 'not-yet-revealed';
      return calculateOutcomeObservation({
        bars,
        coverageProof,
        crypto: options.crypto,
        datasetIdentity: strictPortableValue({
          datasetId: request.datasetId,
          datasetRevision: batchIdentity.datasetRevision,
          instrumentId: batchIdentity.instrumentId,
          providerId: batchIdentity.providerId,
          sourceResolutionId: batchIdentity.sourceResolutionId,
        }),
        decisionCutoffEpochMs: request.decisionCutoffEpochMs,
        outcomeCutoffEpochMs: request.requestedOutcomeCutoffEpochMs,
        pathPlan: request.pathPlan,
        recordedAtEpochMs: request.recordedAtEpochMs,
      });
    },
  });
}
