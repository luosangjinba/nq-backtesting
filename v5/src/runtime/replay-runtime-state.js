export const DEFAULT_PREFIX_BARS = 119;
export const MAX_PREFIX_BARS = 499;
export const DEFAULT_FORWARD_REVEAL_WINDOW_BARS = 120;
export const PREFIX_RETENTION_VISIBLE_SPANS = 2;
export const MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS = 6;

export function emptyReplayState() {
  return {
    sessionId: null,
    session: null,
    persistedCursor: null,
    startBar: null,
    startBarTimestamp: null,
    cursorTimestamp: null,
    revealedCount: 0,
    replayTimeframe: null,
    displayTimeframe: null,
    displayBarsTimeframe: null,
    prefixBars: [],
    prefixChunks: [],
    releasedPrefixChunks: [],
    displayBars: [],
    viewportMetrics: null,
    status: 'idle',
  };
}

export function cloneReplayValue(value) {
  return value == null ? value : structuredClone(value);
}

export function timestampSeconds(value) {
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}:00.000Z`
    : value;
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error('replay timestamp must be valid.');
  }
  return Math.floor(parsed / 1000);
}

export function selectStartBar(bars = [], sessionStart) {
  const startTimestamp = timestampSeconds(sessionStart);
  const candidates = bars
    .filter((bar) => Number(bar?.timestamp) >= startTimestamp)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  const startBar = candidates[0];
  if (!startBar) {
    throw new Error('Unable to resolve replay start bar.');
  }
  return startBar;
}

export function selectNextBar(bars = [], cursorTimestamp) {
  const cursor = timestampSeconds(cursorTimestamp);
  const candidates = bars
    .filter((bar) => Number(bar?.timestamp) > cursor)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  return candidates[0] || null;
}

export function normalizeTimeframe(value, fieldName = 'replay timeframe') {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }
  return normalized;
}

export function normalizeStepCount(value = 1) {
  const normalized = Math.floor(Number(value || 1));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('replay stepCount must be a positive integer.');
  }
  return normalized;
}

export function timeframeSeconds(timeframe) {
  return normalizeTimeframe(timeframe) * 60;
}

export function computeForwardRevealWindowCount({
  cursorTimestamp,
  sessionEnd,
  timeframe,
  maxCount = DEFAULT_FORWARD_REVEAL_WINDOW_BARS,
} = {}) {
  const cursor = timestampSeconds(cursorTimestamp);
  const end = timestampSeconds(sessionEnd);
  const remainingBars = Math.floor((end - cursor) / timeframeSeconds(timeframe)) + 1;
  const normalizedMaxCount = Math.max(1, Math.floor(Number(maxCount) || DEFAULT_FORWARD_REVEAL_WINDOW_BARS));
  return Math.max(1, Math.min(normalizedMaxCount, remainingBars));
}

export function isoFromTimestamp(timestampValue) {
  return new Date(timestampValue * 1000).toISOString();
}

export function formatCountdownLabel(totalSeconds) {
  const normalized = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function alignTimestampToTimeframe(value, timeframe) {
  const timestamp = timestampSeconds(value);
  const seconds = timeframeSeconds(timeframe);
  return Math.floor(timestamp / seconds) * seconds;
}

export function isDisplayBarAllowed(bar, {
  cursorTimestamp,
  displayTimeframe,
  replayTimeframe,
} = {}) {
  const barTimestamp = Number(bar?.timestamp);
  if (!Number.isFinite(barTimestamp)) return false;
  const cursor = timestampSeconds(cursorTimestamp);
  const displayTf = normalizeTimeframe(displayTimeframe, 'display timeframe');
  const replayTf = normalizeTimeframe(replayTimeframe, 'replay timeframe');
  if (displayTf > replayTf) {
    return barTimestamp + timeframeSeconds(displayTf) <= cursor;
  }
  return barTimestamp <= cursor;
}

export function filterDisplayBarsForCursor(bars = [], context = {}) {
  return bars
    .filter((bar) => isDisplayBarAllowed(bar, context))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function mergeDisplayBarsForCursor(existingBars = [], nextBars = [], context = {}) {
  return filterDisplayBarsForCursor([...new Map([
    ...existingBars,
    ...nextBars,
  ]
    .map((bar) => [Number(bar?.timestamp), bar]))
    .values()], context);
}

export function displayBarsEqual(leftBars = [], rightBars = []) {
  if (leftBars.length !== rightBars.length) return false;
  return leftBars.every((left, index) => {
    const right = rightBars[index];
    return Number(left?.timestamp) === Number(right?.timestamp)
      && Number(left?.open) === Number(right?.open)
      && Number(left?.high) === Number(right?.high)
      && Number(left?.low) === Number(right?.low)
      && Number(left?.close) === Number(right?.close);
  });
}

export function earliestBarTimestamp(bars = []) {
  const timestamps = bars
    .map((bar) => Number(bar?.timestamp))
    .filter(Number.isFinite);
  return timestamps.length ? Math.min(...timestamps) : null;
}

export function previousWindowAnchor(window = {}, timeframe) {
  const startTimestamp = timestampSeconds(window.start);
  const seconds = timeframeSeconds(timeframe);
  return isoFromTimestamp(Math.floor((startTimestamp - seconds) / seconds) * seconds);
}

export function shouldSeekEarlierDisplayWindow({
  direction,
  attempt,
  displayTimeframe,
  missingWindow,
  currentEarliestTimestamp,
  window,
  windowDisplayBars,
} = {}) {
  if (direction !== 'backward') return false;
  if (attempt >= MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS - 1) return false;
  if (!Number.isFinite(currentEarliestTimestamp)) return false;
  const requestedFrom = Number(missingWindow?.from);
  if (!Number.isFinite(requestedFrom)) return false;
  const seekThreshold = timeframeSeconds(displayTimeframe) * 2;
  if (requestedFrom >= currentEarliestTimestamp - seekThreshold) return false;
  const nextEarliestTimestamp = earliestBarTimestamp(windowDisplayBars);
  if (!Number.isFinite(nextEarliestTimestamp)) return true;
  if (nextEarliestTimestamp >= currentEarliestTimestamp) return true;
  if (requestedFrom >= nextEarliestTimestamp - seekThreshold) return false;
  const windowStartTimestamp = window?.start ? timestampSeconds(window.start) : null;
  return Number.isFinite(windowStartTimestamp)
    && windowStartTimestamp < nextEarliestTimestamp - seekThreshold;
}

export function computePrefixBarCount(metrics = {}) {
  const estimatedVisibleBars = Number(metrics?.estimatedVisibleBars);
  if (!Number.isFinite(estimatedVisibleBars) || estimatedVisibleBars <= 1) {
    return DEFAULT_PREFIX_BARS;
  }
  return Math.min(Math.max(1, Math.floor(estimatedVisibleBars) - 1), MAX_PREFIX_BARS);
}

export function assertNoFutureDisplayBars(displayBars = [], startBar) {
  return assertNoDisplayBarsAfter(displayBars, startBar);
}

export function assertNoDisplayBarsAfter(displayBars = [], cursorBarOrTimestamp) {
  const rawTimestamp = typeof cursorBarOrTimestamp === 'object'
    ? cursorBarOrTimestamp?.timestamp
    : cursorBarOrTimestamp;
  const cursorTimestamp = typeof rawTimestamp === 'number'
    ? rawTimestamp
    : timestampSeconds(rawTimestamp);
  if (!Number.isFinite(cursorTimestamp)) {
    throw new Error('replay cursor timestamp is required.');
  }
  const futureBar = displayBars.find((bar) => Number(bar?.timestamp) > cursorTimestamp);
  if (futureBar) {
    throw new Error('replay display state must not include future bars.');
  }
}

export function isAtOrAfterSessionEnd(cursorTimestamp, sessionEnd) {
  return timestampSeconds(cursorTimestamp) >= timestampSeconds(sessionEnd);
}

export function canRevealBar(bar, sessionEnd) {
  return Number(bar?.timestamp) <= timestampSeconds(sessionEnd);
}

export function mergeSparseDisplayBars(displayBars = [], prefixChunks = [], cursorTimestamp) {
  const cursor = timestampSeconds(cursorTimestamp);
  return [...new Map([
    ...prefixChunks.flatMap((chunk) => chunk.bars || []),
    ...displayBars,
  ]
    .filter((bar) => Number(bar?.timestamp) <= cursor)
    .map((bar) => [Number(bar.timestamp), bar]))
    .values()]
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function splitRetainedPrefixChunks(prefixChunks = [], visibleRange = {}) {
  const from = Number(visibleRange.from);
  const to = Number(visibleRange.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return {
      retained: prefixChunks,
      released: [],
      releaseBefore: null,
    };
  }

  const visibleSpan = to - from;
  const releaseBefore = from - (visibleSpan * PREFIX_RETENTION_VISIBLE_SPANS);
  const retained = [];
  const released = [];
  for (const chunk of prefixChunks) {
    const latestTimestamp = Math.max(
      ...((chunk.bars || []).map((bar) => Number(bar?.timestamp)).filter(Number.isFinite))
    );
    if (Number.isFinite(latestTimestamp) && latestTimestamp < releaseBefore) {
      released.push(chunk);
    } else {
      retained.push(chunk);
    }
  }
  return {
    retained,
    released,
    releaseBefore,
  };
}

export function createCountdownSnapshot(sourceState = {}) {
  if (!sourceState.cursorTimestamp || !sourceState.session) {
    return {
      active: false,
      remainingSeconds: null,
      closeTimestamp: null,
      label: '--',
    };
  }
  const cursor = timestampSeconds(sourceState.cursorTimestamp);
  const displayTimeframe = normalizeTimeframe(
    sourceState.displayTimeframe || sourceState.session.timeframe,
    'display timeframe'
  );
  const seconds = timeframeSeconds(displayTimeframe);
  const sessionEnd = sourceState.session?.sessionEnd
    ? timestampSeconds(sourceState.session.sessionEnd)
    : null;
  const barClose = Math.floor(cursor / seconds) * seconds + seconds;
  const closeTimestamp = Number.isFinite(sessionEnd) ? Math.min(barClose, sessionEnd) : barClose;
  const remainingSeconds = Math.max(0, closeTimestamp - cursor);
  return {
    active: remainingSeconds > 0,
    remainingSeconds,
    closeTimestamp: isoFromTimestamp(closeTimestamp),
    label: formatCountdownLabel(remainingSeconds),
  };
}
