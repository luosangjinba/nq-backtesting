import { LAYOUT_COMMANDS, LAYOUT_EVENTS } from '../contracts/app-contracts.js';
import { canApplyChartOnlySyncEffect } from '../layout/layout-sync-effects-model.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

const RANGE_EPSILON = 0.5;
const PROGRAMMATIC_CROSSHAIR_SUPPRESSION_MS = 250;

function normalizeRange(event = {}) {
  const from = Number(event.from);
  const to = Number(event.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return null;
  }
  return { from, to };
}

function rangesEqual(left = {}, right = {}) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= RANGE_EPSILON &&
    Math.abs(Number(left.to) - Number(right.to)) <= RANGE_EPSILON
  );
}

function getVisiblePaneIds(chartSurface) {
  return chartSurface.getState?.().layout?.visiblePaneIds || [];
}

function isRangeSyncEnabled(snapshot = {}) {
  return (
    canApplyChartOnlySyncEffect('dateRange', snapshot) ||
    canApplyChartOnlySyncEffect('time', snapshot)
  );
}

function isCrosshairSyncEnabled(snapshot = {}) {
  return canApplyChartOnlySyncEffect('crosshair', snapshot);
}

function normalizeCrosshair(event = {}) {
  if (!event.bar) {
    return { clear: true };
  }
  const price = Number(event.bar.close);
  const time = event.time ?? event.bar.timestamp ?? event.bar.time;
  if (!Number.isFinite(price) || time == null) {
    return null;
  }
  return { price, time };
}

export function connectLayoutSyncSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribeVisibleRangeChange !== 'function') {
    throw new Error('Layout sync surface bridge requires a chart surface with visible range events.');
  }
  if (typeof chartSurface.subscribeCrosshairChange !== 'function') {
    throw new Error('Layout sync surface bridge requires a chart surface with crosshair events.');
  }
  if (typeof chartSurface.applyViewportProjection !== 'function') {
    throw new Error('Layout sync surface bridge requires viewport projection support.');
  }
  if (typeof chartSurface.applyCrosshairProjection !== 'function') {
    throw new Error('Layout sync surface bridge requires crosshair projection support.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Layout sync surface bridge requires dispatchCommand.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Layout sync surface bridge requires subscribeEvent.');
  }

  let active = true;
  let layoutSnapshot = null;
  let revision = 0;
  const appliedRecords = [];
  const appliedCrosshairRecords = [];
  const programmaticCrosshairByPaneId = new Map();

  const refreshLayoutSnapshot = (snapshot = null) => {
    if (snapshot) {
      layoutSnapshot = snapshot;
      return Promise.resolve(layoutSnapshot);
    }
    return Promise.resolve(dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT))
      .then((nextSnapshot) => {
        layoutSnapshot = nextSnapshot || layoutSnapshot;
        return layoutSnapshot;
      });
  };

  const syncVisibleRange = (event = {}) => {
    if (!active) return [];
    const sourcePaneId = String(event.paneId || '').trim();
    const range = normalizeRange(event);
    if (!sourcePaneId || !range || !isRangeSyncEnabled(layoutSnapshot)) {
      return [];
    }

    const appliedViewport = chartSurface.getState?.().appliedViewport || [];
    const targets = getVisiblePaneIds(chartSurface)
      .map((paneId) => String(paneId || '').trim())
      .filter((paneId) => paneId && paneId !== sourcePaneId)
      .filter((paneId) => {
        const current = appliedViewport.find((record) => record.paneId === paneId);
        return !current || !rangesEqual(current, range);
      });

    const records = targets.map((paneId) => {
      revision += 1;
      const record = {
        chartBarsRevision: 0,
        paneId,
        projection: {
          from: range.from,
          origin: 'layout-sync',
          revision,
          to: range.to,
        },
      };
      chartSurface.applyViewportProjection(record);
      appliedRecords.push({
        from: range.from,
        origin: 'layout-sync',
        paneId,
        revision,
        sourcePaneId,
        to: range.to,
      });
      return record;
    });

    return records;
  };

  const syncCrosshair = (event = {}) => {
    if (!active) return [];
    const sourcePaneId = String(event.paneId || '').trim();
    if (!sourcePaneId || !isCrosshairSyncEnabled(layoutSnapshot)) {
      return [];
    }
    const suppressed = programmaticCrosshairByPaneId.get(sourcePaneId);
    if (suppressed && Date.now() <= suppressed) {
      return [];
    }
    if (suppressed) {
      programmaticCrosshairByPaneId.delete(sourcePaneId);
    }
    const projection = normalizeCrosshair(event);
    if (!projection) {
      return [];
    }

    const records = getVisiblePaneIds(chartSurface)
      .map((paneId) => String(paneId || '').trim())
      .filter((paneId) => paneId && paneId !== sourcePaneId)
      .map((paneId) => {
        revision += 1;
        const record = {
          ...projection,
          origin: 'layout-sync',
          paneId,
          revision,
          sourcePaneId,
        };
        programmaticCrosshairByPaneId.set(paneId, Date.now() + PROGRAMMATIC_CROSSHAIR_SUPPRESSION_MS);
        chartSurface.applyCrosshairProjection(record);
        appliedCrosshairRecords.push({ ...record });
        return record;
      });

    return records;
  };

  const unsubscribeVisibleRange = chartSurface.subscribeVisibleRangeChange(syncVisibleRange);
  const unsubscribeCrosshair = chartSurface.subscribeCrosshairChange(syncCrosshair);
  const unsubscribeMode = subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, refreshLayoutSnapshot);
  const unsubscribeSync = subscribeEvent(LAYOUT_EVENTS.SYNC_CHANGED, refreshLayoutSnapshot);
  const ready = refreshLayoutSnapshot();

  return {
    ready,
    destroy() {
      active = false;
      unsubscribeVisibleRange();
      unsubscribeCrosshair();
      unsubscribeMode();
      unsubscribeSync();
    },
    getState() {
      return {
        appliedCrosshairRecords: appliedCrosshairRecords.map((record) => ({ ...record })),
        appliedRecords: appliedRecords.map((record) => ({ ...record })),
        crosshairEnabled: isCrosshairSyncEnabled(layoutSnapshot),
        enabled: isRangeSyncEnabled(layoutSnapshot) || isCrosshairSyncEnabled(layoutSnapshot),
        rangeEnabled: isRangeSyncEnabled(layoutSnapshot),
        revision,
        visiblePaneIds: getVisiblePaneIds(chartSurface),
      };
    },
    syncCrosshair,
    syncVisibleRange,
  };
}
