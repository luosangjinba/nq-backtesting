import { CHART_DATA_EVENTS } from '../contracts/app-contracts.js';

export function connectChartDataSurfaceBridge({
  chartSurface,
  subscribeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.applyChartDataRecord !== 'function') {
    throw new Error('Chart data surface bridge requires a chart surface.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Chart data surface bridge requires subscribeEvent.');
  }

  const unsubscribe = subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload = {}) => {
    if (!payload.record) {
      return;
    }
    chartSurface.applyChartDataRecord({
      ...payload.record,
      operation: payload.operation || null,
    });
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}
