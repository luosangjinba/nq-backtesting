import {
  extendPaneProjectedHistory,
  preservePaneProjectedHistory,
  projectPaneHistoryExtension,
  projectPaneReplayAdvance,
  projectPaneSnapshot,
} from '../projection-domain/public.js';

function sourceProjection({ accepted, batches, context, descriptor, input, projectionMemo, selected }) {
  const historyRequest = descriptor.kind === 'history-extension'
    || descriptor.kind === 'time-location-history';
  const replayAdvance = descriptor.kind === 'navigation'
    && ['autoplay-next', 'manual-next'].includes(descriptor.responsePlan.actionKind);
  const reusable = {
    acceptedBars: accepted?.status === 'ready' ? accepted.snapshot.bars : null,
    identity: context.identity,
    paneId: input.paneId,
    requestKeys: batches.map(({ requestKey }) => requestKey),
    selection: selected,
  };
  if (!historyRequest && replayAdvance && accepted?.status === 'ready') {
    return projectionMemo.project({
      ...reusable,
      compute: () => projectPaneReplayAdvance({ ...input, acceptedSnapshot: accepted.snapshot }),
      kind: 'replay-advance',
    });
  }
  if (!historyRequest) {
    return projectionMemo.project({
      ...reusable,
      acceptedBars: null,
      compute: () => projectPaneSnapshot(input),
      kind: 'complete',
    });
  }
  if (!accepted || accepted.status !== 'ready') return projectPaneSnapshot(input);
  return projectPaneHistoryExtension({
    ...input,
    acceptedSnapshot: accepted.snapshot,
    sourceBatches: batches.slice(0, 2),
    sourceRequestKeys: reusable.requestKeys,
  });
}

function composeProjectedHistory({
  accepted, context, replacementProjectedBatch, selected, snapshot,
}) {
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
}

/** Route one raw-backed Pane through exact projection reuse and projected-history preservation. */
export function projectRawPane(value) {
  return composeProjectedHistory({
    ...value,
    snapshot: sourceProjection(value),
  });
}
