import { formatReplayTimestamp, normalizeReplayOuterRange } from '../../data/replay-range-model.js';

const HOUR_SECONDS = 60 * 60;

export const COMPARISON_REPLAY_SYNC_WINDOW = Object.freeze({
  leftHours: 2,
  rightHours: 2,
});

function parseTimeframeMinutes(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

export function isReplayFirstPrimaryRange({ primaryTimeframe, outerRange, replayState } = {}) {
  const outer = normalizeReplayOuterRange(outerRange);
  return Boolean(
    outer &&
    Number(outer.timeframe) === 1 &&
    Number(primaryTimeframe) === 1 &&
    replayState?.enabled &&
    Number.isFinite(Number(replayState.cursorTimestamp))
  );
}

export function resolveReplayFirstComparisonRange({
  primaryTimeframe,
  comparisonTimeframe,
  outerRange,
  replayState,
  policy = COMPARISON_REPLAY_SYNC_WINDOW,
} = {}) {
  if (!isReplayFirstPrimaryRange({ primaryTimeframe, outerRange, replayState })) return null;

  const outer = normalizeReplayOuterRange(outerRange);
  const cursor = Math.floor(Number(replayState.cursorTimestamp));
  const leftSeconds = Math.max(0, Number(policy.leftHours ?? COMPARISON_REPLAY_SYNC_WINDOW.leftHours)) * HOUR_SECONDS;
  const rightSeconds = Math.max(0, Number(policy.rightHours ?? COMPARISON_REPLAY_SYNC_WINDOW.rightHours)) * HOUR_SECONDS;
  const timeframeSeconds = parseTimeframeMinutes(comparisonTimeframe) * 60;
  const startTs = Math.max(outer.startTs, cursor - Math.floor(leftSeconds));
  const endTs = Math.min(outer.endTs, cursor + Math.floor(rightSeconds + timeframeSeconds));
  if (endTs <= startTs) return null;

  return {
    start: formatReplayTimestamp(startTs),
    end: formatReplayTimestamp(endTs),
    timeframe: parseTimeframeMinutes(comparisonTimeframe),
    replayFirstBounded: true,
    message: `Replay sync window ${formatReplayTimestamp(startTs)} - ${formatReplayTimestamp(endTs)}`,
  };
}
