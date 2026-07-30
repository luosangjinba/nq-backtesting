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

function provenance(state) {
  return Object.freeze({
    aggregationPolicyRevision: state.request.aggregationPolicyRevision,
    calendarRevision: state.request.calendarRevision,
    datasetRevision: state.request.datasetRevision,
    displayTimeframeId: state.request.displayTimeframeId,
    providerId: state.request.providerId,
    requestKeys: state.requestKeys,
    sessionHoursMode: state.request.sessionHoursMode,
  });
}

/** Keep server-projected context separate from replay-owned raw source batches. */
export function createDisplayHistoryLedger() {
  let accepted = null;
  let staged;

  function stageSelection(selection) {
    const identity = selectionIdentity(selection);
    staged = accepted?.identity === identity ? accepted : null;
    return staged;
  }

  function stageExtension(batchValue, selection) {
    const batch = createProjectedHistoryBatch(batchValue);
    if (!batchMatchesSelection(batch, selection)) {
      throw new TypeError('Projected History batch differs from the active Pane selection.');
    }
    const identity = selectionIdentity(selection);
    const previous = accepted?.identity === identity ? accepted : null;
    const lastPrefixStart = batch.bars.at(-1)?.startEpochMs ?? -1;
    const bars = Object.freeze([
      ...batch.bars,
      ...(previous?.bars ?? []).filter((bar) => bar.startEpochMs > lastPrefixStart),
    ]);
    staged = Object.freeze({
      bars,
      identity,
      oldestEpochMs: batch.request.windowStartEpochMs,
      request: batch.request,
      requestKeys: Object.freeze([batch.requestKey, ...(previous?.requestKeys ?? [])]),
    });
    return staged;
  }

  function merge(snapshot, cursorProposal = snapshot.provenance.cursorProposal) {
    const state = staged === undefined ? accepted : staged;
    if (!state || state.bars.length === 0) return snapshot;
    const byStartEpochMs = new Map(snapshot.bars.map((bar) => [bar.startEpochMs, bar]));
    for (const bar of state.bars) byStartEpochMs.set(bar.startEpochMs, bar);
    const bars = Object.freeze([...byStartEpochMs.values()].sort(
      (left, right) => left.startEpochMs - right.startEpochMs,
    ));
    return Object.freeze({
      bars,
      paneId: snapshot.paneId,
      provenance: Object.freeze({
        ...snapshot.provenance,
        cursorProposal,
        projectedHistory: provenance(state),
      }),
      schemaVersion: snapshot.schemaVersion,
    });
  }

  return Object.freeze({
    accept() {
      if (staged === undefined) throw new Error('Display History acceptance requires a staged state.');
      accepted = staged;
      staged = undefined;
    },
    merge,
    oldestEpochMs: () => accepted?.oldestEpochMs ?? null,
    reject() { staged = undefined; },
    stageExtension,
    stageSelection,
  });
}
