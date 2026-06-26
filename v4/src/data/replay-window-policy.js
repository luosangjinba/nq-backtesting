import {
  clampReplayCursor,
  formatReplayTimestamp,
  normalizeReplayOuterRange,
} from './replay-range-model.js';

const DAY_SECONDS = 24 * 60 * 60;

export const DEFAULT_REPLAY_WINDOW_POLICY = Object.freeze({
  leftDays: 1,
  rightDays: 3,
  minLeftBars: 20,
  minRightBars: 200,
});

export function resolveReplayWindowAroundCursor(outerRange, cursorTimestamp, policy = DEFAULT_REPLAY_WINDOW_POLICY) {
  const outer = normalizeReplayOuterRange(outerRange);
  if (!outer) {
    return {
      ok: false,
      message: 'invalid replay outer range',
      outerRange: null,
      cursorTimestamp: null,
      windowRange: null,
    };
  }

  const cursor = clampReplayCursor(cursorTimestamp, outer);
  const leftDays = Math.max(0, Number(policy.leftDays ?? DEFAULT_REPLAY_WINDOW_POLICY.leftDays));
  const rightDays = Math.max(0, Number(policy.rightDays ?? DEFAULT_REPLAY_WINDOW_POLICY.rightDays));
  const timeframeSeconds = Math.max(60, Number(outer.timeframe) * 60);
  const leftSeconds = Math.max(
    Math.floor(leftDays * DAY_SECONDS),
    Math.floor(Number(policy.minLeftBars ?? DEFAULT_REPLAY_WINDOW_POLICY.minLeftBars) * timeframeSeconds)
  );
  const rightSeconds = Math.max(
    Math.floor(rightDays * DAY_SECONDS),
    Math.floor(Number(policy.minRightBars ?? DEFAULT_REPLAY_WINDOW_POLICY.minRightBars) * timeframeSeconds)
  );
  const startTs = cursor - leftSeconds;
  const endTs = Math.min(outer.endTs, cursor + rightSeconds);
  const start = formatReplayTimestamp(startTs);
  const end = formatReplayTimestamp(endTs);

  return {
    ok: true,
    message: `Replay window ${start} - ${end} / outer ${outer.start} - ${outer.end}`,
    outerRange: outer,
    cursorTimestamp: cursor,
    windowRange: {
      start,
      end,
      startTs,
      endTs,
      timeframe: outer.timeframe,
    },
  };
}
