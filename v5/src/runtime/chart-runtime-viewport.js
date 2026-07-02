import {
  normalizeNavigationPayload,
  timestampSeconds,
} from './chart-runtime-state.js';

const PREFIX_DEMAND_THRESHOLD_BARS = 2;

export function clampVisibleRange(range, rightEdgeLimit) {
  if (!range || !Number.isFinite(rightEdgeLimit) || range.to <= rightEdgeLimit) {
    return range;
  }
  const span = Math.max(0, range.to - range.from);
  return {
    from: rightEdgeLimit - span,
    to: rightEdgeLimit,
  };
}

function estimateBarSpacingSeconds(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart bar time'))
    .sort((left, right) => left - right);
  const gaps = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((gap) => gap > 0);
  return gaps[0] || 60;
}

export function computePrefixDemand(state) {
  if (!state.visibleRange || !state.bars.length) {
    return null;
  }

  const earliestLoadedTimestamp = Math.min(
    ...state.bars.map((bar) => timestampSeconds(bar.time, 'chart bar time'))
  );
  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const thresholdSeconds = barSpacingSeconds * PREFIX_DEMAND_THRESHOLD_BARS;
  if (state.visibleRange.from > earliestLoadedTimestamp + thresholdSeconds) {
    return null;
  }

  return {
    direction: 'backward',
    anchor: new Date(earliestLoadedTimestamp * 1000).toISOString(),
    earliestLoadedTimestamp,
    visibleFrom: state.visibleRange.from,
    thresholdSeconds,
    suggestedCount: Math.max(
      PREFIX_DEMAND_THRESHOLD_BARS + 1,
      Math.ceil((earliestLoadedTimestamp + thresholdSeconds - state.visibleRange.from) / barSpacingSeconds) + 1
    ),
  };
}

export function computeLoadedCoverage(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart bar time'))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
  };
}

export function computeRenderedBars(state) {
  if (state.interaction.mode === 'manual' && state.interaction.manualVisibleRange) {
    const manualTo = Number.isFinite(state.rightEdgeLimit)
      ? Math.min(state.interaction.manualVisibleRange.to, state.rightEdgeLimit)
      : state.interaction.manualVisibleRange.to;
    return state.bars.filter((bar) => {
      const timestamp = timestampSeconds(bar.time, 'chart bar time');
      return timestamp >= state.interaction.manualVisibleRange.from
        && timestamp <= manualTo;
    });
  }

  if (!state.viewportFollow.enabled || !state.bars.length) {
    return [...state.bars];
  }

  const capacity = state.viewportFollow.estimatedVisibleBars || state.bars.length;
  const rightOffsetBars = Math.min(state.viewportFollow.rightOffsetBars || 0, Math.max(0, capacity - 1));
  const visibleCapacity = Math.max(1, capacity - rightOffsetBars);
  const cursor = state.viewportFollow.cursorTimestamp;
  const cursorIndex = Number.isFinite(cursor)
    ? state.bars.findLastIndex((bar) => timestampSeconds(bar.time, 'chart bar time') <= cursor)
    : state.bars.length - 1;
  if (cursorIndex < 0) return [];

  const endIndex = cursorIndex + 1;
  const startIndex = Math.max(0, endIndex - visibleCapacity);
  return state.bars.slice(startIndex, endIndex);
}

export function deriveGoToRange(state, {
  targetTimestamp,
  estimatedVisibleBars,
}) {
  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const capacity = Math.max(
    3,
    estimatedVisibleBars
      || state.viewportFollow.estimatedVisibleBars
      || state.bars.length
      || 20
  );
  const halfSpan = Math.max(barSpacingSeconds, Math.floor((capacity * barSpacingSeconds) / 2));
  return clampVisibleRange({
    from: targetTimestamp - halfSpan,
    to: targetTimestamp + halfSpan,
  }, state.rightEdgeLimit);
}

function deriveCurrentVisibleRange(state) {
  if (state.visibleRange) {
    return { ...state.visibleRange };
  }
  const renderedBars = computeRenderedBars(state);
  const coverage = computeLoadedCoverage(renderedBars.length ? renderedBars : state.bars);
  if (coverage) return coverage;
  const cursor = state.viewportFollow.cursorTimestamp;
  if (Number.isFinite(cursor)) {
    const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
    return {
      from: cursor - Math.max(barSpacingSeconds, barSpacingSeconds * 5),
      to: cursor,
    };
  }
  return null;
}

export function deriveZoomRange(state, payload = {}) {
  const { direction, ratio } = normalizeNavigationPayload(payload, {
    defaultDirection: -1,
    defaultRatio: 0.25,
  });
  const range = deriveCurrentVisibleRange(state);
  if (!range) {
    throw new Error('chart visible range is required before zooming.');
  }
  const span = Math.max(1, range.to - range.from);
  const center = range.from + (span / 2);
  const multiplier = direction > 0
    ? 1 + ratio
    : Math.max(0.1, 1 - ratio);
  const nextSpan = Math.max(1, span * multiplier);
  return clampVisibleRange({
    from: Math.floor(center - (nextSpan / 2)),
    to: Math.ceil(center + (nextSpan / 2)),
  }, state.rightEdgeLimit);
}

export function derivePanRange(state, payload = {}) {
  const { direction, ratio } = normalizeNavigationPayload(payload, {
    defaultDirection: -1,
    defaultRatio: 0.5,
  });
  const range = deriveCurrentVisibleRange(state);
  if (!range) {
    throw new Error('chart visible range is required before panning.');
  }
  const span = Math.max(1, range.to - range.from);
  const offset = Math.max(1, Math.floor(span * ratio)) * direction;
  return clampVisibleRange({
    from: range.from + offset,
    to: range.to + offset,
  }, state.rightEdgeLimit);
}

export function computeViewportDemand(state) {
  if (!state.visibleRange || !state.bars.length || !state.displayContext.displayTimeframe) {
    return null;
  }

  const loadedCoverage = state.displayContext.loadedCoverage || computeLoadedCoverage(state.bars);
  if (!loadedCoverage) return null;

  const barSpacingSeconds = estimateBarSpacingSeconds(state.bars);
  const thresholdSeconds = barSpacingSeconds * PREFIX_DEMAND_THRESHOLD_BARS;
  if (state.visibleRange.from > loadedCoverage.from + thresholdSeconds) {
    return null;
  }

  const suggestedCount = Math.max(
    PREFIX_DEMAND_THRESHOLD_BARS + 1,
    Math.ceil((loadedCoverage.from + thresholdSeconds - state.visibleRange.from) / barSpacingSeconds) + 1
  );

  return {
    instrument: state.displayContext.instrument,
    displayTimeframe: state.displayContext.displayTimeframe,
    direction: 'backward',
    visibleFrom: state.visibleRange.from,
    visibleTo: state.visibleRange.to,
    loadedCoverage: { ...loadedCoverage },
    missingWindow: {
      direction: 'backward',
      anchor: new Date(loadedCoverage.from * 1000).toISOString(),
      from: state.visibleRange.from,
      to: loadedCoverage.from,
      suggestedCount,
    },
    thresholdSeconds,
  };
}

export function deriveManualAnchorRange(state, nextViewportFollow) {
  if (state.interaction.mode !== 'manual' || !state.interaction.manualVisibleRange) {
    return null;
  }
  const previousCursor = state.viewportFollow.cursorTimestamp;
  const nextCursor = nextViewportFollow.cursorTimestamp;
  if (!Number.isFinite(previousCursor) || !Number.isFinite(nextCursor)) {
    return state.interaction.manualVisibleRange;
  }
  const delta = nextCursor - previousCursor;
  if (!delta) {
    return state.interaction.manualVisibleRange;
  }
  return {
    from: state.interaction.manualVisibleRange.from + delta,
    to: state.interaction.manualVisibleRange.to + delta,
  };
}
