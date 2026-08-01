const PROJECTED_PANE_SNAPSHOTS = new WeakSet();

/** Mark one immutable Pane snapshot produced inside Projection Domain. */
export function brandProjectedPaneSnapshot(snapshot) {
  PROJECTED_PANE_SNAPSHOTS.add(snapshot);
  return snapshot;
}

/** Identify Projection Domain output without re-normalizing every historical bar. */
export function isProjectedPaneSnapshot(snapshot) {
  return PROJECTED_PANE_SNAPSHOTS.has(snapshot);
}

/** Reissue validated Projection output for another Pane without copying its immutable bars. */
export function retargetProjectedPaneSnapshot(snapshot, paneId) {
  if (!isProjectedPaneSnapshot(snapshot)
    || typeof paneId !== 'string' || paneId.length === 0 || paneId.trim() !== paneId) {
    throw new TypeError('Projected Pane reuse requires validated output and an exact Pane id.');
  }
  if (snapshot.paneId === paneId) return snapshot;
  return brandProjectedPaneSnapshot(Object.freeze({ ...snapshot, paneId }));
}
