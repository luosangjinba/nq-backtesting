// Wiring for the readonly split-screen secondary chart.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getBucketStart } from '../pda/pda-context.js';
import {
  clearSecondaryData,
  destroySecondaryChart,
  hideSecondaryCursor,
  hideSecondaryHoverCursor,
  initSecondaryChart,
  setSecondaryData,
  showSecondaryHoverCursor,
  showSecondaryStartOfData,
} from '../chart/secondary-chart-manager.js';

let requestSeq = 0;
let lastReplayState = { enabled: false, cursorTimestamp: null };

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function getBarChartTime(bar, timeframe) {
  return timeframe === 1440 ? bar.tradingDay : bar.timestamp;
}

function mapTimestampToSecondaryChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return null;

  const timeframe = secondaryStore.getSecondaryTimeframe();
  const bucketStart = getBucketStart(numericTimestamp, timeframe);
  if (timeframe === 1440) {
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function getPrimaryHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  if (Number.isFinite(Number(time))) return Number(time);

  const currentTimeframe = store.getCurrentTimeframe();
  const target = normalizeTimeKey(time);
  const bar = store
    .getDisplayBars()
    .find((displayBar) => normalizeTimeKey(getBarChartTime(displayBar, currentTimeframe)) === target);
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function toChartBar(bar, timeframe) {
  return {
    time: timeframe === 1440 ? bar.tradingDay : bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

function renderSecondaryBars() {
  if (!secondaryStore.isSecondaryEnabled()) return;
  initSecondaryChart();

  const timeframe = secondaryStore.getSecondaryTimeframe();
  const displayBars = secondaryStore.getSecondaryDisplayBars();
  const chartData = displayBars.map((bar) => toChartBar(bar, timeframe));
  setSecondaryData(chartData);
  showSecondaryStartOfData(chartData.length);
  syncSecondaryReplayCursor();
}

async function loadSecondaryForPrimaryRange() {
  if (!secondaryStore.isSecondaryEnabled()) return;

  const { start, end } = store.getCurrentRange();
  if (!start || !end) {
    clearSecondaryData();
    return;
  }

  const timeframe = secondaryStore.getSecondaryTimeframe();
  const seq = (requestSeq += 1);
  secondaryStore.clearSecondaryBars();

  try {
    const result = await fetchBars(start, end, timeframe);
    if (seq !== requestSeq || !secondaryStore.isSecondaryEnabled()) return;
    secondaryStore.setSecondaryBars(result.bars, start, end, timeframe, result.requestedRange);
    bus.emit('status:update', {
      text: `副图已加载 ${result.bars.length} 根K线`,
      isError: false,
    });
  } catch (err) {
    if (seq !== requestSeq) return;
    clearSecondaryData();
    bus.emit('status:update', {
      text: `副图加载失败: ${err.message}`,
      isError: true,
    });
  }
}

function handleSecondarySettingsChanged({ enabled }) {
  requestSeq += 1;

  if (!enabled) {
    hideSecondaryHoverCursor();
    secondaryStore.clearSecondaryBars();
    destroySecondaryChart();
    return;
  }

  window.requestAnimationFrame(() => {
    if (!secondaryStore.isSecondaryEnabled()) return;
    initSecondaryChart();
    loadSecondaryForPrimaryRange();
  });
}

function handlePrimaryBarsLoaded() {
  if (!secondaryStore.isSecondaryEnabled()) return;
  loadSecondaryForPrimaryRange();
}

function handlePrimaryBarsCleared() {
  requestSeq += 1;
  secondaryStore.clearSecondaryBars();
  clearSecondaryData();
}

function syncSecondaryHoverCursor(primaryTime) {
  if (!secondaryStore.isSecondaryEnabled() || secondaryStore.getSecondaryBarCount() <= 0) {
    hideSecondaryHoverCursor();
    return;
  }

  const hoverTimestamp = getPrimaryHoverTimestamp(primaryTime);
  const hoverTime = mapTimestampToSecondaryChartTime(hoverTimestamp);
  if (hoverTime === null) {
    hideSecondaryHoverCursor();
    return;
  }

  showSecondaryHoverCursor(hoverTime);
}

function syncSecondaryReplayCursor() {
  if (
    !secondaryStore.isSecondaryEnabled() ||
    !lastReplayState.enabled ||
    lastReplayState.cursorTimestamp === null
  ) {
    hideSecondaryCursor();
    return;
  }

  const cursorTime = mapTimestampToSecondaryChartTime(lastReplayState.cursorTimestamp);
  if (cursorTime === null) {
    hideSecondaryCursor();
    return;
  }
  showSecondaryCursor(cursorTime);
}

function handleReplayChanged({ enabled, cursorTimestamp }) {
  lastReplayState = {
    enabled: Boolean(enabled),
    cursorTimestamp: cursorTimestamp ?? null,
  };
  syncSecondaryReplayCursor();
}

export function initSecondaryChartController() {
  bus.on('secondary-chart:settings-changed', handleSecondarySettingsChanged);
  bus.on('secondary-bars:loaded', renderSecondaryBars);
  bus.on('secondary-bars:cleared', clearSecondaryData);
  bus.on('secondary-chart:reset', () => {
    requestSeq += 1;
    destroySecondaryChart();
  });
  bus.on('bars:loaded', handlePrimaryBarsLoaded);
  bus.on('bars:cleared', handlePrimaryBarsCleared);
  bus.on('replay:changed', handleReplayChanged);
  chart.onCrosshairMove((param) => syncSecondaryHoverCursor(param?.time));
}
