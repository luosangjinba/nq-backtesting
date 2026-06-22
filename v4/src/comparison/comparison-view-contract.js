export const COMPARISON_VIEW_ROLE = 'comparison';

export const COMPARISON_LAYOUT_MODE = Object.freeze({
  floating: 'floating',
  sliding: 'sliding',
});

export const COMPARISON_SYNC_MODE = Object.freeze({
  primaryTime: 'primary-time',
});

export const COMPARISON_OVERLAY_SYNC_MODE = Object.freeze({
  noSync: 'no-sync',
  sync: 'sync',
});

export function createComparisonViewDescriptor(overrides = {}) {
  return {
    viewId: 'comparison-window-1',
    role: COMPARISON_VIEW_ROLE,
    instrument: 'ES',
    timeframe: 60,
    range: null,
    layoutMode: COMPARISON_LAYOUT_MODE.sliding,
    sourceContext: 'comparison-window',
    syncMode: COMPARISON_SYNC_MODE.primaryTime,
    overlaySyncMode: COMPARISON_OVERLAY_SYNC_MODE.sync,
    writable: false,
    visibleWindow: {
      x: 34,
      y: 0,
      width: 66,
      height: 100,
    },
    ...overrides,
  };
}

export function normalizeVisibleWindow(value = {}) {
  const width = clampNumber(value.width, 18, 96, 66);
  const height = clampNumber(value.height, 24, 100, 100);
  return {
    x: clampNumber(value.x, 0, 100 - width, 34),
    y: clampNumber(value.y, 0, 100 - height, 0),
    width,
    height,
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
