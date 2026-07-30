import { createProjectedHistoryBatch } from '../projected-history-contract/public.js';

function selectionIdentity(selection) {
  const alignment = selection.displayTimeframe.alignment;
  return JSON.stringify([
    selection.instrument.id,
    selection.displayTimeframe.id,
    alignment.kind,
    alignment.kind === 'fixed-duration' ? alignment.durationMs : alignment.policyId,
    selection.sessionHoursMode,
    selection.calendar.revision,
    selection.aggregationPolicy.revision,
  ]);
}

function batchMatchesSelection(batch, selection) {
  const request = batch.request;
  const alignment = selection.displayTimeframe.alignment;
  return request.instrumentId === selection.instrument.id
    && request.displayTimeframeId === selection.displayTimeframe.id
    && request.alignmentKind === alignment.kind
    && request.durationMs === (alignment.kind === 'fixed-duration' ? alignment.durationMs : null)
    && request.alignmentPolicyId === (alignment.kind === 'calendar' ? alignment.policyId : null)
    && request.sessionHoursMode === selection.sessionHoursMode
    && request.calendarRevision === selection.calendar.revision
    && request.aggregationPolicyRevision === selection.aggregationPolicy.revision;
}

function projectedState(snapshot, selection) {
  const state = snapshot?.provenance?.projectedHistory;
  if (!state || state.selectionIdentity !== selectionIdentity(selection)
    || !Number.isSafeInteger(state.windowStartEpochMs)
    || !Number.isSafeInteger(state.windowEndEpochMs)) return null;
  return state;
}

function stateProvenance(batch, selection, previous) {
  return Object.freeze({
    aggregationPolicyRevision: batch.request.aggregationPolicyRevision,
    calendarRevision: batch.request.calendarRevision,
    datasetRevision: batch.request.datasetRevision,
    displayTimeframeId: batch.request.displayTimeframeId,
    providerId: batch.request.providerId,
    requestKeys: Object.freeze([batch.requestKey, ...(previous?.requestKeys ?? [])]),
    selectionIdentity: selectionIdentity(selection),
    sessionHoursMode: batch.request.sessionHoursMode,
    windowEndEpochMs: previous?.windowEndEpochMs ?? batch.request.windowEndEpochMs,
    windowStartEpochMs: batch.request.windowStartEpochMs,
  });
}

function merge(snapshot, prefix, projectedHistory, cursorProposal) {
  const byStartEpochMs = new Map(snapshot.bars.map((bar) => [bar.startEpochMs, bar]));
  for (const bar of prefix) byStartEpochMs.set(bar.startEpochMs, bar);
  return Object.freeze({
    bars: Object.freeze([...byStartEpochMs.values()].sort(
      (left, right) => left.startEpochMs - right.startEpochMs,
    )),
    paneId: snapshot.paneId,
    provenance: Object.freeze({
      ...snapshot.provenance,
      cursorProposal,
      projectedHistory,
    }),
    schemaVersion: snapshot.schemaVersion,
  });
}

/** Extend projected display history using only the accepted projected snapshot as prior state. */
export function extendPaneProjectedHistory({
  acceptedSnapshot,
  cursorProposal,
  projectedBatch,
  selection,
  snapshot,
}) {
  const batch = createProjectedHistoryBatch(projectedBatch);
  if (!batchMatchesSelection(batch, selection)) {
    throw new TypeError('Projected History batch differs from the active Pane selection.');
  }
  const previous = projectedState(acceptedSnapshot, selection);
  const previousPrefix = previous
    ? acceptedSnapshot.bars.filter((bar) => bar.startEpochMs < previous.windowEndEpochMs)
    : [];
  const lastPrefixStart = batch.bars.at(-1)?.startEpochMs ?? -1;
  const prefix = Object.freeze([
    ...batch.bars,
    ...previousPrefix.filter((bar) => bar.startEpochMs > lastPrefixStart),
  ]);
  return merge(snapshot, prefix, stateProvenance(batch, selection, previous), cursorProposal);
}

/** Preserve compatible projected display history across a raw projection transaction. */
export function preservePaneProjectedHistory({ acceptedSnapshot, cursorProposal, selection, snapshot }) {
  const state = projectedState(acceptedSnapshot, selection);
  if (!state) return snapshot;
  const prefix = acceptedSnapshot.bars.filter((bar) => bar.startEpochMs < state.windowEndEpochMs);
  return merge(snapshot, prefix, state, cursorProposal);
}

export function projectedHistoryOldestEpochMs(snapshot) {
  const value = snapshot?.provenance?.projectedHistory?.windowStartEpochMs;
  return Number.isSafeInteger(value) ? value : null;
}
