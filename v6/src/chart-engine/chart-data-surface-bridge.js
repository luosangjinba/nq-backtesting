import { CHART_DATA_EVENTS, PANE_EVENTS } from '../contracts/app-contracts.js';

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

  const unsubscriptions = [];
  unsubscriptions.push(subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload = {}) => {
    if (!payload.record) {
      return;
    }
    chartSurface.applyChartDataRecord({
      ...payload.record,
      operation: payload.operation || null,
    });
  }));
  if (typeof chartSurface.applyPaneDisplayTimeframe === 'function') {
    unsubscriptions.push(subscribeEvent(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, (pane = {}) => {
      chartSurface.applyPaneDisplayTimeframe(
        pane.id || pane.paneId,
        pane.displayTimeframe || pane.timeframe || 1,
      );
    }));
  }

  return {
    destroy() {
      while (unsubscriptions.length) unsubscriptions.pop()();
    },
  };
}
