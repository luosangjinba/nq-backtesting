import { createEmptyPaneProjection } from '../pane-set-materialization/public.js';
import { readReplayCursorProposal, readReplayStep } from '../replay-contract/public.js';
import {
  extendPaneProjectedHistory,
  projectedHistoryOldestEpochMs,
  ProjectionDomainError,
} from '../projection-domain/public.js';
import {
  requireWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { projectRawPane } from './pane-projection-routing.js';
import { createPaneProjectionMemo } from './pane-projection-memo.js';

const EMPTY_PROJECTION_CODES = new Set(['PROJECTION_SOURCE_EMPTY', 'PROJECTION_VISIBLE_EMPTY']);

function withLeaseBatches(lease, identity, visit, index = 0, batches = []) {
  if (index === lease.requests.length) return visit(batches);
  const request = lease.requests[index];
  return lease.withReadView({
    identity,
    request,
    visit: (batch) => withLeaseBatches(lease, identity, visit, index + 1, [...batches, batch]),
  });
}

function planAcquisitionRequest(context, descriptor, selected, market) {
  const historyRequest = descriptor.kind === 'history-extension'
    || descriptor.kind === 'time-location-history';
  const projectionReplacementRequest = descriptor.kind === 'timeframe-replacement'
    || descriptor.kind === 'session-hours-replacement';
  const projectedHistoryRequest = descriptor.kind === 'history-extension'
    && market.supportsProjectedHistory(selected);
  const request = projectedHistoryRequest
    ? market.requestProjectedHistoryBefore(
      descriptor.oldestEpochMs,
      selected,
      descriptor.historyDisplayBars,
    )
    : descriptor.kind === 'time-location-history'
      ? market.requestForTimeLocation(descriptor.oldestEpochMs, descriptor.targetEpochMs, selected)
      : historyRequest
        ? market.requestBefore(descriptor.oldestEpochMs, selected, descriptor.historyDisplayBars)
        : market.requestThrough(
          readReplayCursorProposal(context.proposal).targetEpochMs,
          selected,
          projectionReplacementRequest ? descriptor.historyDisplayBars : null,
          readReplayStep(descriptor.responsePlan.replayStep).durationMs,
        );
  const replacementProjectedRequest = projectionReplacementRequest
    && market.requiresProjectedReplacementHistory(
      request,
      selected,
      descriptor.historyDisplayBars,
    )
    ? market.requestProjectedHistoryBefore(
      request.windowStartEpochMs,
      selected,
      descriptor.historyDisplayBars,
    ) : null;
  return Object.freeze({
    historyRequest, projectedHistoryRequest, replacementProjectedRequest, request,
  });
}

function acquisitionOperation(descriptor, historyRequest) {
  if (historyRequest) return 'history-extension';
  if (['instrument-replacement', 'timeframe-replacement', 'session-hours-replacement']
    .includes(descriptor.kind)) return 'source-replacement';
  return 'navigation';
}

/** Compose transaction-scoped raw leases with pure Projection Domain functions. */
export function createPaneDataComposition({
  barData,
  market,
  projectedHistoryData,
  readAcceptedSnapshot,
}) {
  const stagedLeaseBuckets = new Map();
  const projectionMemo = createPaneProjectionMemo();

  function matchingBucket(identity) {
    const acceptedIdentity = requireWorkspaceTransactionIdentity(identity);
    for (const [bucketIdentity, leases] of stagedLeaseBuckets) {
      if (workspaceTransactionIdentitiesEqual(bucketIdentity, acceptedIdentity)) {
        return Object.freeze({ bucketIdentity, leases });
      }
    }
    return null;
  }

  function stageLease(identity, lease) {
    const existing = matchingBucket(identity);
    if (existing !== null) {
      existing.leases.add(lease);
      return;
    }
    stagedLeaseBuckets.set(requireWorkspaceTransactionIdentity(identity), new Set([lease]));
  }

  function takeLeases(identity) {
    const bucket = matchingBucket(identity);
    if (bucket === null) return [];
    stagedLeaseBuckets.delete(bucket.bucketIdentity);
    return [...bucket.leases];
  }

  function selection(paneResponse, responsePlan) {
    return market.catalog.get({
      instrumentId: paneResponse.instrumentId,
      sessionHoursMode: responsePlan.sessionHours.mode,
      timeframeId: paneResponse.timeframeId,
    });
  }

  function acceptedPane(paneId) {
    return readAcceptedSnapshot()?.panes.find((pane) => pane.paneId === paneId) ?? null;
  }

  return Object.freeze({
    finalize(identity, activePaneIds) {
      barData.commitCoverageLeases({
        activeConsumerIds: activePaneIds,
        leases: takeLeases(identity),
      });
    },
    acquisitionPort: Object.freeze({
      async acquirePane(context) {
        const descriptor = context.paneRequest.request;
        const selected = selection(context.paneResponse, descriptor.responsePlan);
        await market.resolveDatasetRevision(selected.instrument.id, { signal: context.signal });
        const plan = planAcquisitionRequest(context, descriptor, selected, market);

        let lease = null;
        let projectedBatch = null;
        let replacementProjectedBatch = null;
        if (plan.projectedHistoryRequest) {
          projectedBatch = await projectedHistoryData.acquire(plan.request, {
            signal: context.signal,
          });
        } else {
          lease = await barData.acquireCoverageLease({
            consumerId: context.paneResponse.paneId,
            identity: context.identity,
            operation: acquisitionOperation(descriptor, plan.historyRequest),
            request: plan.request,
            signal: context.signal,
          });
          stageLease(context.identity, lease);
          if (plan.replacementProjectedRequest) {
            replacementProjectedBatch = await projectedHistoryData.acquire(
              plan.replacementProjectedRequest,
              { signal: context.signal },
            );
          }
        }
        return Object.freeze({
          descriptor,
          lease,
          projectedBatch,
          projectedHistoryRequest: plan.projectedHistoryRequest,
          replacementProjectedBatch,
          selection: selected,
        });
      },
    }),
    createRequest({
      historyDisplayBars = null,
      kind = 'navigation',
      oldestEpochMs = null,
      responsePlan,
      targetEpochMs = null,
    }) {
      return Object.freeze({ historyDisplayBars, kind, oldestEpochMs, responsePlan, targetEpochMs });
    },
    projectionPort: Object.freeze({
      projectPane(context) {
        const {
          descriptor,
          lease,
          projectedBatch,
          projectedHistoryRequest,
          replacementProjectedBatch,
          selection: selected,
        } = context.acquired;
        const accepted = acceptedPane(context.paneResponse.paneId);
        if (projectedHistoryRequest) {
          if (!accepted || accepted.status !== 'ready') {
            throw new TypeError('Projected History requires an accepted visible Pane.');
          }
          return extendPaneProjectedHistory({
            acceptedSnapshot: accepted.snapshot,
            cursorProposal: context.proposal,
            projectedBatch,
            selection: selected,
            snapshot: accepted.snapshot,
          });
        }

        return withLeaseBatches(lease, context.identity, (batches) => {
          const input = {
            aggregationPolicy: selected.aggregationPolicy,
            calendar: selected.calendar,
            cursorProposal: context.proposal,
            displayTimeframe: selected.displayTimeframe,
            instrument: selected.instrument,
            paneId: context.paneResponse.paneId,
            schemaVersion: 1,
            sessionHoursPolicy: selected.sessionHoursPolicy,
            sourceBatches: batches,
          };
          try {
            return projectRawPane({
              accepted,
              batches,
              context,
              descriptor,
              input,
              projectionMemo,
              replacementProjectedBatch,
              selected,
            });
          } catch (error) {
            if (error instanceof ProjectionDomainError && EMPTY_PROJECTION_CODES.has(error.code)) {
              return createEmptyPaneProjection({
                reason: error.code === 'PROJECTION_SOURCE_EMPTY' ? 'no-source-data' : 'no-eligible-source',
              });
            }
            throw error;
          }
        });
      },
    }),
    reject(identity) {
      barData.rejectCoverageLeases(takeLeases(identity));
    },
    oldestEpochMs(paneId) {
      const rawOldest = barData.oldestCoverageEpochMs(paneId);
      const accepted = acceptedPane(paneId);
      const displayOldest = accepted?.status === 'ready'
        ? projectedHistoryOldestEpochMs(accepted.snapshot) : null;
      if (rawOldest === null) return displayOldest;
      if (displayOldest === null) return rawOldest;
      return Math.min(rawOldest, displayOldest);
    },
  });
}
