import { timestampSeconds, toChartBar } from './chart-engine-context.js';

function crosshairPrice(param, seriesBar, bar) {
  const price = Number(param?.price ?? seriesBar?.close ?? bar?.close);
  return Number.isFinite(price) ? price : null;
}

function crosshairKey(crosshair) {
  if (!crosshair?.active) return 'inactive';
  return [
    crosshair.time || '',
    crosshair.price == null ? '' : crosshair.price,
    crosshair.point?.x ?? '',
    crosshair.point?.y ?? '',
  ].join('|');
}

export function createLightweightCrosshairBridge({
  getBars,
  getHost,
  getSeries,
} = {}) {
  let pendingCrosshair = null;
  let crosshairFrame = null;
  let lastCrosshairKey = '';

  function barForEngineTime(time) {
    if (time == null) return null;
    const timestamp = timestampSeconds(time, 'chart engine crosshair time');
    return getBars?.().find((bar) => (
      timestampSeconds(bar.time, 'chart readout bar time') === timestamp
    )) || null;
  }

  function schedule(crosshair) {
    const host = getHost?.();
    if (typeof host?.__v5OnCrosshairChange !== 'function') return;
    pendingCrosshair = crosshair;
    if (crosshairFrame !== null) return;
    const scheduleFrame = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
    crosshairFrame = scheduleFrame(() => {
      crosshairFrame = null;
      const nextCrosshair = pendingCrosshair;
      pendingCrosshair = null;
      const nextKey = crosshairKey(nextCrosshair);
      if (nextKey === lastCrosshairKey) return;
      lastCrosshairKey = nextKey;
      getHost?.()?.__v5OnCrosshairChange?.(nextCrosshair);
    });
  }

  function clear() {
    schedule({ active: false });
  }

  function handleCrosshairMove(param = {}) {
    if (!param?.time) {
      clear();
      return;
    }
    const series = getSeries?.();
    const seriesBar = param.seriesData?.get?.(series);
    const bar = toChartBar(seriesBar || barForEngineTime(param.time));
    schedule({
      active: true,
      time: param.time,
      price: crosshairPrice(param, seriesBar, bar),
      bar,
      point: param.point
        ? {
          x: Number(param.point.x || 0),
          y: Number(param.point.y || 0),
        }
        : null,
    });
  }

  function reset() {
    pendingCrosshair = null;
    crosshairFrame = null;
    lastCrosshairKey = '';
  }

  return {
    clear,
    handleCrosshairMove,
    reset,
  };
}
