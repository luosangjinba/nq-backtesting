import { rawBarRequestKey } from '../bar-data-contract/public.js';
import { createEmptyPaneProjection } from '../pane-set-materialization/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import {
  projectPaneHistoryExtension,
  projectPaneReplayAdvance,
  projectPaneSnapshot,
  ProjectionDomainError,
} from '../projection-domain/public.js';
import { createDisplayHistoryLedger } from './display-history-ledger.js';
import { createSourceBatchLedger } from './source-batch-ledger.js';

const EMPTY_PROJECTION_CODES = new Set(['PROJECTION_SOURCE_EMPTY', 'PROJECTION_VISIBLE_EMPTY']);

/** Compose Pane-local ledgers over the sole Bar Data Runtime and pure Projection Domain. */
export function createPaneDataComposition({
  barData,
  market,
  projectedHistoryData,
  readAcceptedSnapshot,
}) {
  const ledgers = new Map();
  const displayHistoryLedgers = new Map();
  const stagedPaneIds = new Set();

  function ledger(paneId) {
    if (!ledgers.has(paneId)) ledgers.set(paneId, createSourceBatchLedger());
    return ledgers.get(paneId);
  }

  function displayHistoryLedger(paneId) {
    if (!displayHistoryLedgers.has(paneId)) {
      displayHistoryLedgers.set(paneId, createDisplayHistoryLedger());
    }
    return displayHistoryLedgers.get(paneId);
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
    accept(activePaneIds) {
      for (const paneId of stagedPaneIds) {
        ledger(paneId).accept();
        displayHistoryLedger(paneId).accept();
      }
      stagedPaneIds.clear();
      const active = new Set(activePaneIds);
      for (const paneId of ledgers.keys()) if (!active.has(paneId)) ledgers.delete(paneId);
      for (const paneId of displayHistoryLedgers.keys()) {
        if (!active.has(paneId)) displayHistoryLedgers.delete(paneId);
      }
    },
    acquisitionPort: Object.freeze({
      async acquirePane(context) {
        const descriptor = context.paneRequest.request;
        const selected = selection(context.paneResponse, descriptor.responsePlan);
        const historyRequest = descriptor.kind === 'history-extension'
          || descriptor.kind === 'time-location-history';
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
            : market.requestThrough(readReplayCursorProposal(context.proposal).targetEpochMs, selected);
        // An accepted Pane source batch is already validated projection state,
        // so reuse its exact request identity before asking the bounded Bar
        // Data cache. This keeps restored workspaces cache-hit even when deep
        // automatic history has legitimately evicted the forward batch from
        // the runtime LRU.
        const paneLedger = ledger(context.paneResponse.paneId);
        const batch = projectedHistoryRequest
          ? await projectedHistoryData.acquire(request)
          : paneLedger.acceptedBatch(rawBarRequestKey(request)) ?? await barData.acquire(request);
        return Object.freeze({
          batch,
          descriptor,
          projectedHistoryRequest,
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
          batch, descriptor, projectedHistoryRequest, selection: selected,
        } = context.acquired;
        const paneLedger = ledger(context.paneResponse.paneId);
        const historyLedger = displayHistoryLedger(context.paneResponse.paneId);
        if (projectedHistoryRequest) {
          const accepted = acceptedPane(context.paneResponse.paneId);
          if (!accepted || accepted.status !== 'ready') {
            throw new TypeError('Projected History requires an accepted visible Pane.');
          }
          paneLedger.stageRetained();
          historyLedger.stageExtension(batch, selected);
          stagedPaneIds.add(context.paneResponse.paneId);
          return historyLedger.merge(accepted.snapshot, context.proposal);
        }
        const historyRequest = descriptor.kind === 'history-extension'
          || descriptor.kind === 'time-location-history';
        const ledgerOperation = historyRequest
          ? 'history-extension'
          : descriptor.kind === 'instrument-replacement'
            ? 'pane-source-replacement' : 'navigation';
        const batches = paneLedger.stage(batch, ledgerOperation);
        historyLedger.stageSelection(selected);
        stagedPaneIds.add(context.paneResponse.paneId);
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
          const accepted = acceptedPane(context.paneResponse.paneId);
          const replayAdvance = descriptor.kind === 'navigation'
            && ['autoplay-next', 'manual-next'].includes(descriptor.responsePlan.actionKind);
          if (!historyRequest && replayAdvance && accepted?.status === 'ready') {
            return historyLedger.merge(projectPaneReplayAdvance({
              ...input, acceptedSnapshot: accepted.snapshot,
            }));
          }
          if (!historyRequest) return historyLedger.merge(projectPaneSnapshot(input));
          if (!accepted || accepted.status !== 'ready') {
            return historyLedger.merge(projectPaneSnapshot(input));
          }
          return historyLedger.merge(projectPaneHistoryExtension({
            ...input,
            acceptedSnapshot: accepted.snapshot,
            sourceBatches: batches.slice(0, 2),
            sourceRequestKeys: batches.map((entry) => entry.requestKey),
          }));
        } catch (error) {
          if (error instanceof ProjectionDomainError && EMPTY_PROJECTION_CODES.has(error.code)) {
            return createEmptyPaneProjection({
              reason: error.code === 'PROJECTION_SOURCE_EMPTY' ? 'no-source-data' : 'no-eligible-source',
            });
          }
          throw error;
        }
      },
    }),
    reject() {
      for (const paneId of stagedPaneIds) {
        ledger(paneId).reject();
        displayHistoryLedger(paneId).reject();
      }
      stagedPaneIds.clear();
    },
    oldestEpochMs(paneId) {
      const rawOldest = ledger(paneId).oldestEpochMs();
      const displayOldest = displayHistoryLedger(paneId).oldestEpochMs();
      if (rawOldest === null) return displayOldest;
      if (displayOldest === null) return rawOldest;
      return Math.min(rawOldest, displayOldest);
    },
    sourceBars(instrumentId) {
      const byEpoch = new Map();
      for (const paneLedger of ledgers.values()) {
        for (const batch of paneLedger.acceptedBatches()) {
          if (batch.request.instrumentId !== instrumentId) continue;
          for (const bar of batch.bars) byEpoch.set(bar.startEpochMs, bar);
        }
      }
      return Object.freeze([...byEpoch.values()].sort((left, right) => left.startEpochMs - right.startEpochMs));
    },
  });
}
