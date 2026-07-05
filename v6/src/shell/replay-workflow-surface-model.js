function formatStateLabel(state) {
  if (!state) return 'No replay loaded';
  const status = String(state.status || 'unknown');
  const cursor = state.cursorTime || (state.cursorIndex ?? 'pending');
  return `${status} at ${cursor}`;
}

function formatWallLabel(state) {
  if (!state) return 'No replay wall loaded';
  return `${state.chartBarCount || 0} visible / ${state.forwardBarCount || 0} forward`;
}

export function createReplayWorkflowSurfaceState({
  replayState = null,
  wallState = null,
} = {}) {
  return {
    loaded: Boolean(replayState),
    replayLabel: formatStateLabel(replayState),
    replayState: replayState ? { ...replayState } : null,
    wallLabel: formatWallLabel(wallState),
    wallState: wallState ? { ...wallState } : null,
  };
}
