import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { getBarChartTime } from '../chart/time-projection.js';
import * as store from '../data/bar-store.js';
import { debugLog } from '../logger.js';

let initialized = false;

export function toPrimaryChartBar(bar, timeframe = store.getCurrentTimeframe()) {
  return {
    time: getBarChartTime(bar, timeframe),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

export function projectPrimaryChartBars(bars, timeframe = store.getCurrentTimeframe()) {
  return (bars || []).map((bar) => toPrimaryChartBar(bar, timeframe));
}

export function replacePrimaryChartData(chartData, { showStart = false } = {}) {
  const nextData = chartData || [];
  chart.setData(nextData);
  if (showStart) {
    chart.showStartOfData(nextData.length);
  }
  return nextData;
}

export function replacePrimaryChartBars(bars, options = {}) {
  const chartData = projectPrimaryChartBars(bars, options.timeframe);
  return replacePrimaryChartData(chartData, options);
}

export function replacePrimaryChartSlice(
  chartData,
  cursorIndex,
  { followEnd = true, previousRange = null, previousDataCount = null } = {}
) {
  const nextIndex = Math.max(0, Math.min(cursorIndex, (chartData || []).length - 1));
  chart.setData((chartData || []).slice(0, nextIndex + 1));
  if (followEnd) {
    chart.showEndOfData(nextIndex + 1, previousRange, previousDataCount);
  }
}

export function appendPrimaryChartBar(
  chartBar,
  dataCount,
  { previousRange = null, previousDataCount = null } = {}
) {
  if (!chartBar) return;
  chart.updateBar(chartBar);
  chart.showEndOfData(dataCount, previousRange, previousDataCount);
}

export function clearPrimaryChartData() {
  chart.setData([]);
}

export function initPrimaryChartRuntime({
  getReplayRestoreSnapshot = () => null,
  syncReplayData = () => {},
} = {}) {
  if (initialized) return;
  initialized = true;

  bus.on('bars:loaded', ({ bars = [] } = {}) => {
    const replaySnapshot = getReplayRestoreSnapshot();
    const displayBars = store.getDisplayBars();
    const chartData = replacePrimaryChartBars(displayBars, {
      timeframe: store.getCurrentTimeframe(),
      showStart: !replaySnapshot?.enabled,
    });
    syncReplayData(replaySnapshot);
    debugLog(
      `[V4] Chart updated with ${displayBars.length} display bars (${bars.length} total with padding)`
    );
    return chartData;
  });
}
