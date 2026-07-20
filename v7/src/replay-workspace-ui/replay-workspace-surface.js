import { supportsFoundationWorkspace } from './foundation-market.js';
import { createReplayWorkspaceController } from './workspace-controller.js';
import { createReplayWorkspaceView } from './workspace-view.js';
import { createFoundationCapabilities } from './foundation-capabilities.js';

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
      const callbacks = { next: null, reset: null, sessionHours: null, timeframe: null };
      const capabilities = createFoundationCapabilities();
      const view = createReplayWorkspaceView({
        name: record.metadata.name,
        onNext: () => callbacks.next?.(),
        onReset: () => callbacks.reset?.(),
        onSessionHours: (mode) => callbacks.sessionHours?.(mode),
        onTimeframe: (timeframeId) => callbacks.timeframe?.(timeframeId),
        sessionHoursModes: capabilities.sessionHoursModes,
        timeframes: capabilities.timeframes,
      });
      view.setSelection(capabilities.defaultTarget);
      root.replaceChildren(view.root);
      const controller = createReplayWorkspaceController({ record, view });
      callbacks.next = () => controller.next();
      callbacks.reset = () => controller.resetView();
      callbacks.sessionHours = (mode) => controller.replaceSessionHours(mode);
      callbacks.timeframe = (timeframeId) => controller.replaceTimeframe(timeframeId);
      active = { controller, view };
      void controller.start();
      return controller;
    },
    supports: supportsFoundationWorkspace,
    unmount,
  });
}
