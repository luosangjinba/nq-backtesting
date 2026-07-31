function failure(code, message) {
  throw Object.assign(new TypeError(message), { code });
}

/** Resolve a selected projected candle to an exclusive Replay cutoff. */
export function resolveReplayTruncationTarget({ cursorEpochMs, range, selection }) {
  const startEpochMs = selection?.startEpochMs;
  if (!Number.isSafeInteger(startEpochMs) || startEpochMs < 0) {
    failure('replay-truncation-outside-data', 'Select a visible candle inside the Session range.');
  }
  if (startEpochMs < range.startEpochMs || startEpochMs >= range.endEpochMs) {
    failure('replay-truncation-outside-session', 'The truncation point must be inside the Session range.');
  }
  if (startEpochMs >= cursorEpochMs) {
    failure('replay-truncation-not-revealed', 'The truncation point must be an already revealed candle.');
  }
  return startEpochMs;
}
