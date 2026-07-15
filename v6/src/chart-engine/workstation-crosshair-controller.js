import { CHART_SURFACE_EVENTS } from '../contracts/app-contracts.js';

function cloneRecord(record) {
  return { ...record, bar: record.bar ? { ...record.bar } : null };
}

export function createWorkstationCrosshairController({
  emitEvent,
  getPaneBars,
  manager,
  paneIds = [],
} = {}) {
  const listeners = new Set();
  const records = new Map();
  let readoutPaneId = null;
  const unsubscriptions = typeof manager?.subscribeCrosshairMove === 'function'
    ? paneIds.map((paneId) => manager.subscribeCrosshairMove(paneId, (payload = {}) => {
      const recordPaneId = String(payload.paneId || paneId);
      const hasSelectedBar = Boolean(payload.bar);
      const paneBars = getPaneBars(recordPaneId);
      const selectedIndex = hasSelectedBar
        ? paneBars.findIndex((bar) => Number(bar.timestamp) === Number(payload.bar.timestamp ?? payload.time))
        : -1;
      const previousClose = selectedIndex > 0 ? Number(paneBars[selectedIndex - 1]?.close) : null;
      const displayReadout = hasSelectedBar || recordPaneId === readoutPaneId;
      if (hasSelectedBar) readoutPaneId = recordPaneId;
      else if (recordPaneId === readoutPaneId) readoutPaneId = null;
      const record = {
        bar: payload.bar ? { ...payload.bar } : null,
        displayReadout,
        paneId: recordPaneId,
        point: payload.point ? { ...payload.point } : null,
        ...(Number.isFinite(previousClose) ? { previousClose } : {}),
        time: payload.time ?? null,
      };
      records.set(recordPaneId, record);
      emitEvent?.(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, record);
      listeners.forEach((listener) => listener(cloneRecord(record)));
    }))
    : [];

  return Object.freeze({
    destroy() {
      unsubscriptions.forEach((unsubscribe) => unsubscribe());
      listeners.clear();
      records.clear();
    },
    snapshot() {
      return [...records.values()]
        .map(cloneRecord)
        .sort((left, right) => left.paneId.localeCompare(right.paneId));
    },
    subscribe(handler) {
      if (typeof handler !== 'function') {
        throw new Error('Workstation chart surface crosshair handler is required.');
      }
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  });
}
