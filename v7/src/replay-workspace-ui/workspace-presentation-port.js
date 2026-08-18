const PRESENTATION_METHODS = Object.freeze([
  'openPaneTimeLocationMenu',
  'setAnnotationWorkflow',
  'setCursor',
  'setEvidence',
  'setGotoFeedback',
  'setLayout',
  'setLayoutSync',
  'setPaneOhlc',
  'setPending',
  'setPlaybackSpeed',
  'setReplay',
  'setSelection',
  'setSessionRange',
  'setState',
  'setTimeframeSync',
  'setTruncationSelection',
  'setVisibleThrough',
  'setWall',
  'setWorkspace',
]);

/**
 * Subscribe the Replay Workspace DOM view to composition presentation events.
 * The returned port exposes no DOM node or mutable view state to runtime owners.
 */
export function createWorkspacePresentationPort(view) {
  if (!view?.surfacePort) throw new TypeError('Workspace presentation requires a chart surface port.');
  const port = { paneAddonPort: view.paneAddonPort, surfacePort: view.surfacePort };
  for (const method of PRESENTATION_METHODS) {
    if (typeof view[method] !== 'function') {
      throw new TypeError(`Workspace presentation requires ${method}().`);
    }
    port[method] = (...args) => view[method](...args);
  }
  return Object.freeze(port);
}
