import { createEmptyPaneProjection } from '../pane-set-materialization/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import {
  extendPaneProjectedHistory,
  preservePaneProjectedHistory,
  projectPaneHistoryExtension,
  projectPaneReplayAdvance,
  projectPaneSnapshot,
  projectedHistoryOldestEpochMs,
  ProjectionDomainError,
} from '../projection-domain/public.js';

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

/** Compose transaction-scoped raw leases with pure Projection Domain functions. */
export function createPaneDataComposition({
  barData,
  market,
  projectedHistoryData,
  readAcceptedSnapshot,
}) {
  const stagedLeases = new Set();

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
    accept(activePaneIds) {
      barData.commitCoverageLeases({
        activeConsumerIds: activePaneIds,
        leases: [...stagedLeases],
      });
      stagedLeases.clear();
    },
    acquisitionPort: Object.freeze({
      async acquirePane(context) {
        const descriptor = context.paneRequest.request;
        const selected = selection(context.paneResponse, descriptor.responsePlan);
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
          ? market.requestForTimeLocation(
            descriptor.oldestEpochMs,
            descriptor.targetEpochMs,
            selected,
          )
          : historyRequest
            ? market.requestBefore(
              descriptor.oldestEpochMs,
              selected,
              descriptor.historyDisplayBars,
            )
            : market.requestThrough(
              readReplayCursorProposal(context.proposal).targetEpochMs,
              selected,
              projectionReplacementRequest ? descriptor.historyDisplayBars : null,
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

        let lease = null;
        let projectedBatch = null;
        let replacementProjectedBatch = null;
        if (projectedHistoryRequest) {
          projectedBatch = await projectedHistoryData.acquire(request);
        } else {
          const operation = historyRequest
            ? 'history-extension'
            : descriptor.kind === 'instrument-replacement'
                || descriptor.kind === 'timeframe-replacement'
                || descriptor.kind === 'session-hours-replacement'
              ? 'source-replacement' : 'navigation';
          lease = await barData.acquireCoverageLease({
            consumerId: context.paneResponse.paneId,
            identity: context.identity,
            operation,
            request,
            signal: context.signal,
          });
          stagedLeases.add(lease);
          if (replacementProjectedRequest) {
            replacementProjectedBatch = await projectedHistoryData.acquire(replacementProjectedRequest);
          }
        }
        return Object.freeze({
          descriptor,
          lease,
          projectedBatch,
          projectedHistoryRequest,
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
          const historyRequest = descriptor.kind === 'history-extension'
            || descriptor.kind === 'time-location-history';
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
            const replayAdvance = descriptor.kind === 'navigation'
              && ['autoplay-next', 'manual-next'].includes(descriptor.responsePlan.actionKind);
            let snapshot;
            if (!historyRequest && replayAdvance && accepted?.status === 'ready') {
              snapshot = projectPaneReplayAdvance({
                ...input, acceptedSnapshot: accepted.snapshot,
              });
            } else if (!historyRequest) {
              snapshot = projectPaneSnapshot(input);
            } else if (!accepted || accepted.status !== 'ready') {
              snapshot = projectPaneSnapshot(input);
            } else {
              snapshot = projectPaneHistoryExtension({
                ...input,
                acceptedSnapshot: accepted.snapshot,
                sourceBatches: batches.slice(0, 2),
                sourceRequestKeys: batches.map((entry) => entry.requestKey),
              });
            }
            if (replacementProjectedBatch) {
              return extendPaneProjectedHistory({
                acceptedSnapshot: accepted?.snapshot ?? null,
                cursorProposal: context.proposal,
                projectedBatch: replacementProjectedBatch,
                selection: selected,
                snapshot,
              });
            }
            return preservePaneProjectedHistory({
              acceptedSnapshot: accepted?.snapshot ?? null,
              cursorProposal: context.proposal,
              selection: selected,
              snapshot,
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
    reject() {
      barData.rejectCoverageLeases([...stagedLeases]);
      stagedLeases.clear();
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
