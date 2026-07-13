import { normalizeUnixSeconds, TIME_DOMAIN_CONSTANTS } from '../time-domain/time-domain.js';
import { targetTimeframeToFixedMinutes } from '../time-domain/target-timeframe-domain.js';
import { resolveTargetBarRevealState } from './target-bar-reveal-policy.js';

function cloneBar(bar = {}) {
  return { ...bar };
}

function normalizeOptionalCursorTimestamp(value) {
  if (value === null || value === undefined) return null;
  return normalizeUnixSeconds(value, {
    fieldName: 'Target display materialization replay cursor',
  });
}

export function sourceCursorTimestampFromState(state = {}) {
  if (!state || typeof state !== 'object') return null;
  return normalizeOptionalCursorTimestamp(
    state.cursorTimestamp ?? state.timestamp ?? state.cursorTime,
  );
}

export function inferTargetBarBucketEndTimestamp({
  bar = {},
  sourceTimeframe = 1,
  targetTimeframe,
} = {}) {
  const explicit = bar.bucketEndTimestamp ?? bar.bucketEnd ?? bar.endTimestamp;
  if (explicit !== null && explicit !== undefined) {
    return normalizeUnixSeconds(explicit, {
      fieldName: 'Target display materialization bucket end',
    });
  }
  const bucketStartTimestamp = normalizeUnixSeconds(bar.bucketStartTimestamp ?? bar.timestamp ?? bar.time, {
    fieldName: 'Target display materialization bucket start',
  });
  const fixedMinutes = targetTimeframeToFixedMinutes(targetTimeframe);
  if (!fixedMinutes) return bucketStartTimestamp;
  const sourceSeconds = Math.max(1, Number(sourceTimeframe || 1)) * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS;
  return bucketStartTimestamp + Math.max(
    0,
    fixedMinutes * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS - sourceSeconds,
  );
}

export function buildTargetBarRevealInput({
  bar = {},
  sourceTimeframe = 1,
  targetTimeframe,
} = {}) {
  const bucketStartTimestamp = normalizeUnixSeconds(bar.bucketStartTimestamp ?? bar.timestamp ?? bar.time, {
    fieldName: 'Target display materialization bucket start',
  });
  return Object.freeze({
    ...cloneBar(bar),
    bucketEndTimestamp: inferTargetBarBucketEndTimestamp({ bar, sourceTimeframe, targetTimeframe }),
    bucketStartTimestamp,
  });
}

export function resolveTargetDisplayMaterialization({
  sourceCursorTimestamp = null,
  sourceTimeframe = 1,
  targetBars = [],
  targetTimeframe,
} = {}) {
  const cursorTimestamp = normalizeOptionalCursorTimestamp(sourceCursorTimestamp);
  if (cursorTimestamp === null) {
    return Object.freeze({
      bars: Object.freeze([]),
      cursorTimestamp,
      fallbackReason: 'source-replay-cursor-unavailable',
      revealStates: Object.freeze([]),
      status: 'fallback',
    });
  }
  const revealStates = targetBars.map((bar) => resolveTargetBarRevealState({
    sourceCursorTimestamp: cursorTimestamp,
    targetBar: buildTargetBarRevealInput({ bar, sourceTimeframe, targetTimeframe }),
  }));
  const requiresSourceProjection = revealStates.some(
    (state) => state.reason === 'source-cursor-inside-target-bucket',
  );
  const cursorCovered = revealStates.some((state) => (
    state.bucketStartTimestamp <= cursorTimestamp && state.bucketEndTimestamp >= cursorTimestamp
  ));
  const latestBucketEndTimestamp = revealStates.length
    ? Math.max(...revealStates.map((state) => state.bucketEndTimestamp))
    : null;
  const staleBeforeCursor = latestBucketEndTimestamp !== null
    && latestBucketEndTimestamp < cursorTimestamp
    && !cursorCovered;
  const requiresFallback = requiresSourceProjection || staleBeforeCursor;
  const bars = targetBars.filter((_, index) => revealStates[index].visible).map(cloneBar);
  return Object.freeze({
    bars: Object.freeze(requiresFallback ? [] : bars),
    cursorTimestamp,
    fallbackReason: requiresSourceProjection
      ? 'target-history-in-progress-source-projection'
      : staleBeforeCursor
        ? 'target-history-stale-source-projection'
      : bars.length ? null : 'target-history-no-visible-bars',
    revealStates: Object.freeze(revealStates),
    status: bars.length && !requiresFallback ? 'applied' : 'fallback',
  });
}

export const resolveDisplayTimeframeTargetMaterializationHandoff = resolveTargetDisplayMaterialization;
