import { normalizeUnixSeconds, TIME_DOMAIN_CONSTANTS } from '../time-domain/time-domain.js';
import { targetTimeframeToFixedMinutes } from '../time-domain/target-timeframe-domain.js';
import { resolveTargetBarRevealState } from '../materialization/target-bar-reveal-policy.js';

function cloneBar(bar = {}) {
  return { ...bar };
}

function normalizeOptionalCursorTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeUnixSeconds(value, {
    fieldName: 'Display timeframe target materialization replay cursor',
  });
}

export function sourceCursorTimestampFromState(state = {}) {
  if (!state || typeof state !== 'object') {
    return null;
  }
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
      fieldName: 'Display timeframe target materialization bucket end',
    });
  }

  const bucketStartTimestamp = normalizeUnixSeconds(bar.bucketStartTimestamp ?? bar.timestamp ?? bar.time, {
    fieldName: 'Display timeframe target materialization bucket start',
  });
  const fixedMinutes = targetTimeframeToFixedMinutes(targetTimeframe);
  if (!fixedMinutes) {
    return bucketStartTimestamp;
  }

  const sourceSeconds = Math.max(1, Number(sourceTimeframe || 1)) * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS;
  const targetSeconds = fixedMinutes * TIME_DOMAIN_CONSTANTS.MINUTE_SECONDS;
  return bucketStartTimestamp + Math.max(0, targetSeconds - sourceSeconds);
}

export function buildTargetBarRevealInput({
  bar = {},
  sourceTimeframe = 1,
  targetTimeframe,
} = {}) {
  const bucketStartTimestamp = normalizeUnixSeconds(bar.bucketStartTimestamp ?? bar.timestamp ?? bar.time, {
    fieldName: 'Display timeframe target materialization bucket start',
  });
  return Object.freeze({
    ...cloneBar(bar),
    bucketEndTimestamp: inferTargetBarBucketEndTimestamp({
      bar,
      sourceTimeframe,
      targetTimeframe,
    }),
    bucketStartTimestamp,
  });
}

export function resolveDisplayTimeframeTargetMaterializationHandoff({
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

  const revealStates = targetBars.map((bar) => (
    resolveTargetBarRevealState({
      sourceCursorTimestamp: cursorTimestamp,
      targetBar: buildTargetBarRevealInput({
        bar,
        sourceTimeframe,
        targetTimeframe,
      }),
    })
  ));
  const bars = targetBars
    .filter((_, index) => revealStates[index].visible)
    .map(cloneBar);

  if (!bars.length) {
    return Object.freeze({
      bars: Object.freeze([]),
      cursorTimestamp,
      fallbackReason: 'target-history-no-visible-bars',
      revealStates: Object.freeze(revealStates),
      status: 'fallback',
    });
  }

  return Object.freeze({
    bars: Object.freeze(bars),
    cursorTimestamp,
    fallbackReason: null,
    revealStates: Object.freeze(revealStates),
    status: 'applied',
  });
}
