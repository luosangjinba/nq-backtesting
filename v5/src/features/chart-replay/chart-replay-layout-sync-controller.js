export function createChartReplayLayoutSyncController({
  syncTime,
  syncDateRange,
  syncCrosshair,
  onCrosshairChanged,
  onVisibleRangeChanged,
} = {}) {
  let disposed = false;

  function guard(action) {
    if (disposed || typeof action !== 'function') return null;
    return action();
  }

  function dispose() {
    disposed = true;
  }

  return {
    syncTime: (time) => guard(() => syncTime?.(time)),
    syncDateRange: (visibleRange) => guard(() => syncDateRange?.(visibleRange)),
    syncCrosshair: (crosshair) => guard(() => syncCrosshair?.(crosshair)),
    handleCrosshairChanged: (payload = {}) => guard(() => onCrosshairChanged?.(payload)),
    handleVisibleRangeChanged: (payload = {}) => guard(() => onVisibleRangeChanged?.(payload)),
    dispose,
    get disposed() {
      return disposed;
    },
  };
}
