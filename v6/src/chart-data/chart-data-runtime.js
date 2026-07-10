import { CHART_DATA_COMMANDS, CHART_DATA_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createChartDataStore } from './chart-data-store.js';

export function createChartDataRuntime({
  store = createChartDataStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_DATA_COMMANDS.REPLACE_BARS, (payload = {}) => {
        const record = store.replaceBars(payload);
        emitEvent?.(CHART_DATA_EVENTS.BARS_CHANGED, {
          operation: 'replace',
          record,
        });
        return record;
      }),
      registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload = {}) => {
        const record = store.appendBars(payload);
        emitEvent?.(CHART_DATA_EVENTS.BARS_CHANGED, {
          operation: 'append',
          record,
        });
        return record;
      }),
      registerCommand(CHART_DATA_COMMANDS.PREPEND_BARS, (payload = {}) => {
        const record = store.prependBars(payload);
        emitEvent?.(CHART_DATA_EVENTS.BARS_CHANGED, {
          operation: 'prepend',
          record,
        });
        return record;
      }),
      registerCommand(CHART_DATA_COMMANDS.GET_BARS, ({ paneId } = {}) => store.getRecord(paneId)),
      registerCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, ({ paneId } = {}) => store.getSourceRecord(paneId)),
      registerCommand(CHART_DATA_COMMANDS.CLEAR_PANE, ({ paneId } = {}) => {
        const record = store.clearPane(paneId);
        emitEvent?.(CHART_DATA_EVENTS.BARS_CHANGED, {
          operation: 'clear',
          record,
        });
        return record;
      }),
      registerCommand(CHART_DATA_COMMANDS.GET_SUMMARY, () => store.summary())
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.chart-data',
    start,
    stop,
  };
}
