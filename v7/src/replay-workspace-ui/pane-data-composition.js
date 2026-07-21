import { createEmptyPaneProjection } from '../pane-set-materialization/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import {
  projectPaneHistoryExtension,
  projectPaneSnapshot,
  ProjectionDomainError,
} from '../projection-domain/public.js';
import { createSourceBatchLedger } from './source-batch-ledger.js';

const EMPTY_PROJECTION_CODES = new Set(['PROJECTION_SOURCE_EMPTY', 'PROJECTION_VISIBLE_EMPTY']);

/** Compose Pane-local ledgers over the sole Bar Data Runtime and pure Projection Domain. */
export function createPaneDataComposition({ barData, market, readAcceptedSnapshot }) {
  const ledgers = new Map();
  const stagedPaneIds = new Set();

  function ledger(paneId) {
    if (!ledgers.has(paneId)) ledgers.set(paneId, createSourceBatchLedger());
    return ledgers.get(paneId);
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
      for (const paneId of stagedPaneIds) ledger(paneId).accept();
      stagedPaneIds.clear();
      const active = new Set(activePaneIds);
      for (const paneId of ledgers.keys()) if (!active.has(paneId)) ledgers.delete(paneId);
    },
    acquisitionPort: Object.freeze({
      async acquirePane(context) {
        const descriptor = context.paneRequest.request;
        const selected = selection(context.paneResponse, descriptor.responsePlan);
        const request = descriptor.kind === 'history-extension'
          ? market.requestBefore(descriptor.oldestEpochMs, selected)
          : market.requestThrough(readReplayCursorProposal(context.proposal).targetEpochMs, selected);
        const batch = await barData.acquire(request);
        return Object.freeze({ batch, descriptor, selection: selected });
      },
    }),
    createRequest({ kind = 'navigation', oldestEpochMs = null, responsePlan }) {
      return Object.freeze({ kind, oldestEpochMs, responsePlan });
    },
    oldestEpochMs(paneId) { return ledger(paneId).oldestEpochMs(); },
    projectionPort: Object.freeze({
      projectPane(context) {
        const { batch, descriptor, selection: selected } = context.acquired;
        const paneLedger = ledger(context.paneResponse.paneId);
        const ledgerOperation = descriptor.kind === 'history-extension'
          ? 'history-extension'
          : descriptor.kind === 'instrument-replacement'
            ? 'pane-source-replacement' : 'navigation';
        const batches = paneLedger.stage(batch, ledgerOperation);
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
          if (descriptor.kind !== 'history-extension') return projectPaneSnapshot(input);
          const accepted = acceptedPane(context.paneResponse.paneId);
          if (!accepted || accepted.status !== 'ready') return projectPaneSnapshot(input);
          return projectPaneHistoryExtension({
            ...input,
            acceptedSnapshot: accepted.snapshot,
            sourceBatches: batches.slice(0, 2),
            sourceRequestKeys: batches.map((entry) => entry.requestKey),
          });
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
      for (const paneId of stagedPaneIds) ledger(paneId).reject();
      stagedPaneIds.clear();
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
