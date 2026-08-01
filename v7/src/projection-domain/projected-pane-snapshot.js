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
