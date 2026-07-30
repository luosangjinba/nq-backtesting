/** Own the accepted/staged ordered source windows used by one pane projection. */
export function createSourceBatchLedger() {
  let accepted = Object.freeze([]);
  let staged = null;

  function sameSourceScope(left, right) {
    return left.schemaVersion === right.schemaVersion
      && left.providerId === right.providerId
      && left.instrumentId === right.instrumentId
      && left.sourceResolutionId === right.sourceResolutionId
      && left.datasetRevision === right.datasetRevision;
  }

  function acceptedCovers(acquired) {
    const request = acquired.request;
    let coveredThroughEpochMs = request.windowStartEpochMs;
    // Complete-Pane transactions can acquire a smaller navigation window for
    // an unchanged Pane. Keep its wider accepted source wall when that wall
    // already covers the complete same-source request.
    for (const candidate of accepted) {
      const candidateRequest = candidate.request;
      if (!sameSourceScope(candidateRequest, request)) continue;
      if (candidateRequest.windowEndEpochMs <= coveredThroughEpochMs) continue;
      if (candidateRequest.windowStartEpochMs > coveredThroughEpochMs) return false;
      coveredThroughEpochMs = candidateRequest.windowEndEpochMs;
      if (coveredThroughEpochMs >= request.windowEndEpochMs) return true;
    }
    return false;
  }

  function contiguousAcceptedPrefix(acquired) {
    const prefix = [];
    let requiredEndEpochMs = acquired.request.windowStartEpochMs;
    for (let index = accepted.length - 1; index >= 0; index -= 1) {
      const candidate = accepted[index];
      if (candidate.request.windowEndEpochMs > requiredEndEpochMs) continue;
      if (candidate.request.windowEndEpochMs < requiredEndEpochMs) break;
      prefix.unshift(candidate);
      requiredEndEpochMs = candidate.request.windowStartEpochMs;
    }
    return prefix;
  }

  function stage(acquired, operation) {
    let batches;
    if (operation === 'history-extension') batches = [acquired, ...accepted];
    else if (operation === 'pane-source-replacement') batches = [acquired];
    else if (acceptedCovers(acquired)) batches = accepted;
    else batches = [...contiguousAcceptedPrefix(acquired), acquired];
    staged = Object.freeze(batches);
    return staged;
  }

  return Object.freeze({
    accept() {
      if (!staged) throw new Error('A staged source batch set is required before acceptance.');
      accepted = staged;
      staged = null;
      return accepted;
    },
    acceptedBatch(requestKey) {
      if (typeof requestKey !== 'string' || requestKey.length === 0) return null;
      return accepted.find((batch) => batch.requestKey === requestKey) ?? null;
    },
    acceptedBatches: () => accepted,
    oldestEpochMs() { return accepted[0]?.request.windowStartEpochMs ?? null; },
    reject() { staged = null; },
    stageRetained() {
      staged = accepted;
      return staged;
    },
    stage,
  });
}
