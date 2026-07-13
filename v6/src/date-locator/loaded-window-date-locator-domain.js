import { normalizeUnixSeconds } from '../time-domain/time-domain.js';

const DEFAULT_SPAN_BARS = 120;

function normalizeSpanBars(value) {
  const spanBars = Number(value ?? DEFAULT_SPAN_BARS);
  if (!Number.isFinite(spanBars) || spanBars <= 0) {
    throw new Error('Loaded-window date locator spanBars must be positive.');
  }
  return spanBars;
}

function barTimestamp(bar, index) {
  return normalizeUnixSeconds(bar?.timestamp ?? bar?.time, {
    fieldName: `Loaded-window date locator bar[${index}] timestamp`,
  });
}

function normalizedBarTimeline(bars = []) {
  if (!Array.isArray(bars) || bars.length === 0) return [];
  const timeline = bars.map((bar, index) => ({
    bar,
    index,
    timestamp: barTimestamp(bar, index),
  }));
  for (let index = 1; index < timeline.length; index += 1) {
    if (timeline[index].timestamp <= timeline[index - 1].timestamp) {
      throw new Error('Loaded-window date locator bars must be strictly ordered.');
    }
  }
  return timeline;
}

function nearestTimelineRecord(timeline, requestedTimestamp) {
  let low = 0;
  let high = timeline.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = timeline[middle];
    if (candidate.timestamp === requestedTimestamp) return candidate;
    if (candidate.timestamp < requestedTimestamp) low = middle + 1;
    else high = middle - 1;
  }
  const earlier = timeline[Math.max(0, high)];
  const later = timeline[Math.min(timeline.length - 1, low)];
  return requestedTimestamp - earlier.timestamp <= later.timestamp - requestedTimestamp
    ? earlier
    : later;
}

export function planLoadedWindowDateLocation({
  bars = [],
  requestedTimestamp,
  spanBars = DEFAULT_SPAN_BARS,
} = {}) {
  const requested = normalizeUnixSeconds(requestedTimestamp, {
    fieldName: 'Loaded-window date locator requestedTimestamp',
  });
  const timeline = normalizedBarTimeline(bars);
  if (timeline.length === 0) {
    return Object.freeze({
      reason: 'no-loaded-bars',
      requestedTimestamp: requested,
      status: 'rejected',
    });
  }

  const first = timeline[0];
  const last = timeline.at(-1);
  if (requested < first.timestamp || requested > last.timestamp) {
    return Object.freeze({
      loadedEndTimestamp: last.timestamp,
      loadedStartTimestamp: first.timestamp,
      reason: 'outside-loaded-window',
      requestedTimestamp: requested,
      status: 'rejected',
    });
  }

  const span = normalizeSpanBars(spanBars);
  const resolved = nearestTimelineRecord(timeline, requested);
  const latestLogicalIndex = last.index;
  const from = resolved.index - (span / 2);
  const to = from + span;
  return Object.freeze({
    distanceSeconds: Math.abs(resolved.timestamp - requested),
    latestLogicalIndex,
    loadedEndTimestamp: last.timestamp,
    loadedStartTimestamp: first.timestamp,
    measurement: Object.freeze({
      latestOffsetBars: to - latestLogicalIndex,
      spanBars: span,
    }),
    range: Object.freeze({ from, to }),
    requestedTimestamp: requested,
    resolvedIndex: resolved.index,
    resolvedTimestamp: resolved.timestamp,
    status: 'located',
  });
}
