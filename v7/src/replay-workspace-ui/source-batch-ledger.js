/** Own the accepted/staged ordered source windows used by one pane projection. */
export function createSourceBatchLedger() {
  let accepted = Object.freeze([]);
  let staged = null;

  function stage(acquired, operation) {
    const batches = operation === 'history-extension'
      ? [acquired, ...accepted]
      : [
        ...accepted.filter((batch) => (
          batch.request.windowEndEpochMs <= acquired.request.windowStartEpochMs
        )),
        acquired,
      ];
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
    oldestEpochMs() { return accepted[0]?.request.windowStartEpochMs ?? null; },
    reject() { staged = null; },
    stage,
  });
}
