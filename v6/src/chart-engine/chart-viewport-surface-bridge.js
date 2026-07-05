import { CHART_VIEWPORT_EVENTS } from '../contracts/app-contracts.js';

export function connectChartViewportSurfaceBridge({
  chartSurface,
  subscribeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.applyViewportProjection !== 'function') {
    throw new Error('Chart viewport surface bridge requires a chart surface.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Chart viewport surface bridge requires subscribeEvent.');
  }

  const unsubscribe = subscribeEvent(CHART_VIEWPORT_EVENTS.PROJECTED, (record = {}) => {
    chartSurface.applyViewportProjection(record);
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}
