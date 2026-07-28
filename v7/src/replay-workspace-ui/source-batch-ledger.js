/** Own the accepted/staged ordered source windows used by one pane projection. */
export function createSourceBatchLedger() {
  let accepted = Object.freeze([]);
  let staged = null;

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
    const batches = operation === 'history-extension'
      ? [acquired, ...accepted]
      : operation === 'pane-source-replacement'
        ? [acquired]
        : [...contiguousAcceptedPrefix(acquired), acquired];
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
