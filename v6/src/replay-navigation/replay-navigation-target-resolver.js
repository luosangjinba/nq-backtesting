import { resolveReplaySourceBarNearAnchor } from '../replay/replay-forward-source-cursor-resolver.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createReplayNavigationCandidates } from './replay-navigation-schedule.js';

export const REPLAY_NAVIGATION_TARGET_DEFAULTS = Object.freeze({
  maxCandidates: 32,
  maxDistanceMinutes: 15,
});

export async function resolveReplayNavigationTarget({
  action,
  anchors,
  dispatchCommand = dispatchRuntimeCommand,
  maxCandidates = REPLAY_NAVIGATION_TARGET_DEFAULTS.maxCandidates,
  maxDistanceMinutes = REPLAY_NAVIGATION_TARGET_DEFAULTS.maxDistanceMinutes,
  pane = {},
  replayState,
} = {}) {
  const candidates = createReplayNavigationCandidates({
    action,
    anchors,
    cursorTimestamp: replayState?.cursorTime,
    endTimestamp: replayState?.endTime,
    maxCandidates,
  });
  if (!candidates.length) {
    return Object.freeze({
      action,
      attemptedCandidates: 0,
      reason: 'no-forward-candidate',
      status: 'rejected',
    });
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const source = await resolveReplaySourceBarNearAnchor({
      anchorTimestamp: candidate.timestampIso,
      dispatchCommand,
      maxDistanceMinutes,
      pane,
      replayState,
    });
    if (source) {
      const sourceTimestamp = Number(source.bar.timestamp ?? source.bar.time);
      return Object.freeze({
        action: candidate.action,
        attemptedCandidates: index + 1,
        candidate: Object.freeze({ ...candidate }),
        distanceMs: source.distanceMs,
        loadedWindow: source.loadedWindow,
        sourceBar: Object.freeze({ ...source.bar }),
        sourceCursorTime: new Date(sourceTimestamp * 1000).toISOString(),
        status: 'resolved',
      });
    }
  }

  return Object.freeze({
    action,
    attemptedCandidates: candidates.length,
    reason: 'no-real-source-bar',
    status: 'rejected',
  });
}
