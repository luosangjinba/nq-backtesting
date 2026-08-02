const DATA_FIELDS = Object.freeze(['time', 'open', 'high', 'low', 'close']);

function sameBar(left, right) {
  return DATA_FIELDS.every((field) => left?.[field] === right?.[field]);
}

/** Select a complete replacement or one safe latest-candle update. */
export function planSeriesMutation(previousData, nextData) {
  if (!Array.isArray(previousData) || !Array.isArray(nextData) || previousData.length === 0) {
    return Object.freeze({ kind: 'full-replace' });
  }
  const sameLength = nextData.length === previousData.length;
  const oneAppended = nextData.length === previousData.length + 1;
  if (!sameLength && !oneAppended) {
    if (nextData.length <= previousData.length + 1) return Object.freeze({ kind: 'full-replace' });
    for (let index = 0; index < previousData.length - 1; index += 1) {
      if (previousData[index] !== nextData[index]
        && !sameBar(previousData[index], nextData[index])) {
        return Object.freeze({ kind: 'full-replace' });
      }
    }
    const tailStart = previousData.length - 1;
    if (previousData.at(-1).time !== nextData[tailStart].time) {
      return Object.freeze({ kind: 'full-replace' });
    }
    for (let index = tailStart + 1; index < nextData.length; index += 1) {
      if (nextData[index].time <= nextData[index - 1].time) {
        return Object.freeze({ kind: 'full-replace' });
      }
    }
    return Object.freeze({ kind: 'append-replace' });
  }
  const prefixLength = sameLength ? previousData.length - 1 : previousData.length;
  for (let index = 0; index < prefixLength; index += 1) {
    if (previousData[index] !== nextData[index]
      && !sameBar(previousData[index], nextData[index])) return Object.freeze({ kind: 'full-replace' });
  }
  const previousLast = previousData.at(-1);
  const nextLast = nextData.at(-1);
  const validTail = sameLength
    ? previousLast.time === nextLast.time
    : nextLast.time > previousLast.time;
  return Object.freeze(validTail
    ? { bar: nextLast, kind: 'tail-update' }
    : { kind: 'full-replace' });
}

/** Reuse one exact immutable mutation proof across Pane adapters in a transaction. */
export function createSeriesMutationPlanMemo() {
  const entries = new WeakMap();
  return Object.freeze({
    plan(previousData, nextData) {
      let nextEntries = entries.get(previousData);
      if (!nextEntries) {
        nextEntries = new WeakMap();
        entries.set(previousData, nextEntries);
      }
      let plan = nextEntries.get(nextData);
      if (!plan) {
        plan = planSeriesMutation(previousData, nextData);
        nextEntries.set(nextData, plan);
      }
      return plan;
    },
  });
}
