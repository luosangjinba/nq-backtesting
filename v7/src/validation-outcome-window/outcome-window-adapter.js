import {
  calculateOutcomeObservation,
  failValidation,
  strictPortableValue,
} from '../validation-study-domain/public.js';

function requireOptions(value) {
  if (typeof value?.barData?.acquire !== 'function'
    || typeof value?.market?.requestWindow !== 'function'
    || typeof value?.readReplaySnapshot !== 'function'
    || typeof value?.readWorkspaceSnapshot !== 'function') {
    throw new TypeError('Outcome adapter requires Bar Data, market, Replay, and Workspace ports.');
  }
  return value;
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
    || provenance.sessionHoursPolicyId !== request.sessionHoursId) {
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
    async observeOutcome(request, signal = new AbortController().signal) {
      if (signal.aborted) {
        failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Outcome observation was cancelled.', {
          operation: 'record-case-outcome',
        });
      }
      const replay = options.readReplaySnapshot();
      if (request.requestedOutcomeCutoffEpochMs > replay.cursorEpochMs) {
        failValidation(
          'VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED',
          'Requested Outcome cutoff is later than the accepted Replay cursor.',
          { operation: 'record-case-outcome' },
        );
      }
      const rawRequest = options.market.requestWindow({
        instrumentId: request.instrumentId,
        windowEndEpochMs: request.requestedOutcomeCutoffEpochMs,
        windowStartEpochMs: request.decisionCutoffEpochMs,
      });
      const batch = await options.barData.acquire(rawRequest, { signal });
      if (signal.aborted) {
        failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Outcome observation was cancelled.', {
          operation: 'record-case-outcome',
        });
      }
      const bars = displayBars(options.readWorkspaceSnapshot(), request);
      const atDatasetEnd = request.requestedOutcomeCutoffEpochMs >= options.sessionRange.endEpochMs;
      const coverageProof = bars.length >= request.pathPlan.horizonBars
        ? 'complete-window'
        : atDatasetEnd ? 'irrecoverable-incomplete' : 'not-yet-revealed';
      return calculateOutcomeObservation({
        bars,
        coverageProof,
        crypto: options.crypto,
        datasetIdentity: strictPortableValue({
          datasetRevision: batch.request.datasetRevision,
          instrumentId: batch.request.instrumentId,
          providerId: batch.request.providerId,
          sourceResolutionId: batch.request.sourceResolutionId,
        }),
        decisionCutoffEpochMs: request.decisionCutoffEpochMs,
        outcomeCutoffEpochMs: request.requestedOutcomeCutoffEpochMs,
        pathPlan: request.pathPlan,
        recordedAtEpochMs: request.recordedAtEpochMs,
      });
    },
  });
}
