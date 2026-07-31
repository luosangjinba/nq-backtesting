import { supportsFoundationWorkspace } from '../replay-workspace-composition/public.js';
import { mountReplayWorkspace } from './replay-workspace-mount.js';

/** Own the professional replay-workspace DOM subtree mounted by the route UI. */
export function createReplayWorkspaceSurface() {
  let active = null;

  function unmount() {
    if (!active) return;
    active.controller.dispose();
    active.view.dispose();
    active = null;
  }

  return Object.freeze({
    dispose: unmount,
    mount({
      initialNavigationSettings,
      colorHistory,
      workstationSettings,
      onBack,
      onPersistWorkspaceCheckpoint = () => {},
      onPersistReplayNavigationSettings = () => {},
      record,
      root,
    }) {
      unmount();
      active = mountReplayWorkspace({
        colorHistory,
        initialNavigationSettings,
        onBack,
        onPersistWorkspaceCheckpoint,
        onPersistReplayNavigationSettings,
        record,
        root,
        workstationSettings,
      });
      return active.controller;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
