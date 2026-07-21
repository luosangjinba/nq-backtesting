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
  if (!sameLength && !oneAppended) return Object.freeze({ kind: 'full-replace' });
  const prefixLength = sameLength ? previousData.length - 1 : previousData.length;
  for (let index = 0; index < prefixLength; index += 1) {
    if (!sameBar(previousData[index], nextData[index])) return Object.freeze({ kind: 'full-replace' });
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
