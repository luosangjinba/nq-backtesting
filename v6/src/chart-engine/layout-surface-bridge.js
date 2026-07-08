import {
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
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
  const unsubscribeModeChanged = subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, (snapshot) => {
    if (destroyed) return;
    chartSurface.applyLayoutSnapshot(snapshot);
  });

  const ready = Promise.resolve(dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT))
    .then((snapshot) => {
      if (destroyed) return null;
      return chartSurface.applyLayoutSnapshot(snapshot);
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
        snapshotCommand: LAYOUT_COMMANDS.GET_SNAPSHOT,
      };
    },
    ready,
  };
}
