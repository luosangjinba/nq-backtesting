import { supportsFoundationWorkspace } from './foundation-market.js';
import { createReplayWorkspaceController } from './workspace-controller.js';
import { createReplayWorkspaceView } from './workspace-view.js';

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
    mount({ record, root }) {
      unmount();
      const callbacks = { next: null, reset: null };
      const view = createReplayWorkspaceView({
        name: record.metadata.name,
        onNext: () => callbacks.next?.(),
        onReset: () => callbacks.reset?.(),
      });
      root.replaceChildren(view.root);
      const controller = createReplayWorkspaceController({ record, view });
      callbacks.next = () => controller.next();
      callbacks.reset = () => controller.resetView();
      active = { controller, view };
      void controller.start();
      return controller;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
