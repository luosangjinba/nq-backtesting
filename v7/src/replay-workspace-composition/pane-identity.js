export const WORKSPACE_PANE_IDS = Object.freeze([
  'pane-main',
  'pane-secondary',
  'pane-tertiary',
  'pane-quaternary',
]);

const IDENTITIES = new Map(WORKSPACE_PANE_IDS.map((paneId, index) => [paneId, Object.freeze({
  label: `P${index + 1}`,
  number: index + 1,
  paneId,
})]));

/** Resolve the stable user-facing Pane number owned by Replay Workspace UI. */
export function readWorkspacePaneIdentity(paneId) {
  const identity = IDENTITIES.get(paneId);
  if (!identity) throw new TypeError('Unknown Replay Workspace Pane identity.');
  return identity;
}
