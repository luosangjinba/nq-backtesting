import {
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  LAYOUT_PANE_BOOTSTRAP_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectLayoutSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.applyLayoutSnapshot !== 'function') {
    throw new Error('Layout surface bridge requires a chart surface with applyLayoutSnapshot.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Layout surface bridge requires dispatchCommand.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Layout surface bridge requires subscribeEvent.');
  }

  let destroyed = false;
  function applyAndBootstrap(snapshot) {
    if (destroyed) return null;
    const applied = chartSurface.applyLayoutSnapshot(snapshot);
    const visiblePaneIds = Array.isArray(applied?.visiblePaneIds) ? applied.visiblePaneIds : [];
    if (visiblePaneIds.length > 1) {
      void Promise.resolve(dispatchCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE, {
        visiblePaneIds,
      })).catch(() => {});
    }
    return applied;
  }

  const unsubscribeModeChanged = subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, (snapshot) => {
    applyAndBootstrap(snapshot);
  });

  const ready = Promise.resolve(dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT))
    .then((snapshot) => {
      return applyAndBootstrap(snapshot);
    });

  return {
    destroy() {
      destroyed = true;
      unsubscribeModeChanged?.();
    },
    getState() {
      return {
        destroyed,
        listensTo: [LAYOUT_EVENTS.MODE_CHANGED],
        bootstrapCommand: LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE,
        snapshotCommand: LAYOUT_COMMANDS.GET_SNAPSHOT,
      };
    },
    ready,
  };
}
