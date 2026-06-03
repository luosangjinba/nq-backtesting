// Wiring for the readonly split-screen secondary chart.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import {
  findDisplayBarByTime,
  getBarChartTime,
  getBucketStart,
  mapTimestampToChartTime,
} from '../chart/time-projection.js';
import {
  clearSecondaryData,
  destroySecondaryChart,
  getSecondaryActiveDataCount,
  getSecondaryVisibleLogicalRange,
  hideSecondaryCursor,
  hideSecondaryHoverCursor,
  initSecondaryChart,
  setSecondaryChartInfo,
  setSecondaryData,
  showSecondaryCursor,
  showSecondaryEndOfData,
  showSecondaryHoverCursor,
  showSecondaryStartOfData,
} from '../chart/secondary-chart-manager.js';

let requestSeq = 0;
let lastReplayState = { enabled: false, cursorTimestamp: null };
let replaySourceBars = [];
let replaySourceRequestedRange = null;
let lastSettings = {
  enabled: secondaryStore.isSecondaryEnabled(),
  timeframe: secondaryStore.getSecondaryTimeframe(),
  instrument: secondaryStore.getSecondaryInstrument(),
};

function mapTimestampToSecondaryChartTime(timestamp) {
  const timeframe = secondaryStore.getSecondaryTimeframe();
  return mapTimestampToChartTime(timestamp, timeframe, secondaryStore.getSecondaryDisplayBars());
}

function getPrimaryHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  if (Number.isFinite(Number(time))) return Number(time);

  const currentTimeframe = store.getCurrentTimeframe();
  const bar = findDisplayBarByTime(store.getDisplayBars(), time, currentTimeframe);
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function toChartBar(bar, timeframe) {
  return {
    time: getBarChartTime(bar, timeframe),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

function getReplaySourceDisplayBars() {
  if (!replaySourceRequestedRange || replaySourceBars.length === 0) return replaySourceBars;
  const { startTs, endTs } = replaySourceRequestedRange;
  return replaySourceBars.filter((bar) => bar.timestamp >= startTs && bar.timestamp <= endTs);
}

function makeTradingDay(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().slice(0, 10);
}

function aggregatePartialBar(sourceBars, bucketStart, cursorTimestamp, timeframe) {
  const bucketEnd = bucketStart + timeframe * 60;
  const bars = sourceBars.filter((bar) => (
    Number(bar?.timestamp) >= bucketStart &&
    Number(bar?.timestamp) <= cursorTimestamp &&
    Number(bar?.timestamp) < bucketEnd
  ));
  if (!bars.length) return null;

  return bars.reduce((partial, bar, index) => {
    if (index === 0) {
      return {
        timestamp: bucketStart,
        tradingDay: timeframe === 1440 ? makeTradingDay(bucketStart + 24 * 60 * 60) : bar.tradingDay,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0,
      };
    }
    partial.high = Math.max(partial.high, bar.high);
    partial.low = Math.min(partial.low, bar.low);
    partial.close = bar.close;
    partial.volume += bar.volume || 0;
    return partial;
  }, null);
}

function findSecondaryReplayIndex(displayBars, cursorTimestamp, timeframe) {
  if (!Array.isArray(displayBars) || !displayBars.length || cursorTimestamp === null) return -1;

  const replayBucketStart = getBucketStart(Number(cursorTimestamp), timeframe);
  let matchedIndex = -1;
  for (let index = 0; index < displayBars.length; index += 1) {
    const barTimestamp = Number(displayBars[index]?.timestamp);
    if (!Number.isFinite(barTimestamp)) continue;
    const barBucketStart = getBucketStart(barTimestamp, timeframe);
    if (barBucketStart > replayBucketStart) break;
    matchedIndex = index;
  }
  return matchedIndex;
}

function getReplaySyncedSecondaryBars(displayBars, timeframe) {
  if (!lastReplayState.enabled || lastReplayState.cursorTimestamp === null) {
    return displayBars;
  }

  const cursorTimestamp = Number(lastReplayState.cursorTimestamp);
  if (!Number.isFinite(cursorTimestamp)) return [];

  if (Number(timeframe) > 1) {
    const sourceBars = getReplaySourceDisplayBars();
    if (sourceBars.length) {
      const replayBucketStart = getBucketStart(cursorTimestamp, timeframe);
      const completedBars = displayBars.filter((bar) => Number(bar?.timestamp) < replayBucketStart);
      const partialBar = aggregatePartialBar(sourceBars, replayBucketStart, cursorTimestamp, timeframe);
      return partialBar ? [...completedBars, partialBar] : completedBars;
    }
  }

  const replayIndex = findSecondaryReplayIndex(displayBars, lastReplayState.cursorTimestamp, timeframe);
  if (replayIndex < 0) return [];
  return displayBars.slice(0, replayIndex + 1);
}

function renderSecondaryBars() {
  if (!secondaryStore.isSecondaryEnabled()) return;
  initSecondaryChart();

  const timeframe = secondaryStore.getSecondaryTimeframe();
  const instrument = secondaryStore.getSecondaryInstrument();
  setSecondaryChartInfo({ instrument, timeframe });
  const displayBars = secondaryStore.getSecondaryDisplayBars();
  const syncedBars = getReplaySyncedSecondaryBars(displayBars, timeframe);
  const chartData = syncedBars.map((bar) => toChartBar(bar, timeframe));
  const previousRange = getSecondaryVisibleLogicalRange();
  const previousDataCount = getSecondaryActiveDataCount();
  setSecondaryData(chartData);
  if (lastReplayState.enabled) {
    showSecondaryEndOfData(chartData.length, previousRange, previousDataCount);
  } else {
    showSecondaryStartOfData(chartData.length);
  }
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
  const instrument = secondaryStore.getSecondaryInstrument();
  const seq = (requestSeq += 1);
  secondaryStore.clearSecondaryBars();
  replaySourceBars = [];
  replaySourceRequestedRange = null;

  try {
    const [result, replaySourceResult] = await Promise.all([
      fetchBars(start, end, timeframe, instrument),
      Number(timeframe) > 1 ? fetchBars(start, end, 1, instrument) : Promise.resolve(null),
    ]);
    if (seq !== requestSeq || !secondaryStore.isSecondaryEnabled()) return;
    replaySourceBars = replaySourceResult?.bars || [];
    replaySourceRequestedRange = replaySourceResult?.requestedRange || null;
    secondaryStore.setSecondaryBars(result.bars, start, end, timeframe, result.requestedRange);
    bus.emit('status:update', {
      text: `副图 ${instrument} 已加载 ${result.bars.length} 根K线`,
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

function handleSecondarySettingsChanged({ enabled, timeframe, instrument }) {
  const nextSettings = {
    enabled: Boolean(enabled),
    timeframe: Number(timeframe ?? secondaryStore.getSecondaryTimeframe()),
    instrument: instrument ?? secondaryStore.getSecondaryInstrument(),
  };
  const wasEnabled = lastSettings.enabled;
  const timeframeChanged = lastSettings.timeframe !== nextSettings.timeframe;
  const instrumentChanged = lastSettings.instrument !== nextSettings.instrument;
  lastSettings = nextSettings;

  if (!nextSettings.enabled) {
    if (!wasEnabled) return;
    requestSeq += 1;
    replaySourceBars = [];
    replaySourceRequestedRange = null;
    hideSecondaryHoverCursor();
    secondaryStore.clearSecondaryBars();
    destroySecondaryChart();
    return;
  }

  if (wasEnabled && !timeframeChanged && !instrumentChanged) {
    return;
  }

  requestSeq += 1;
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
  replaySourceBars = [];
  replaySourceRequestedRange = null;
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
  renderSecondaryBars();
}

export function initSecondaryChartController() {
  bus.on('secondary-chart:settings-changed', handleSecondarySettingsChanged);
  bus.on('secondary-bars:loaded', renderSecondaryBars);
  bus.on('secondary-bars:cleared', clearSecondaryData);
  bus.on('secondary-chart:reset', () => {
    requestSeq += 1;
    replaySourceBars = [];
    replaySourceRequestedRange = null;
    destroySecondaryChart();
  });
  bus.on('bars:loaded', handlePrimaryBarsLoaded);
  bus.on('bars:cleared', handlePrimaryBarsCleared);
  bus.on('replay:changed', handleReplayChanged);
  chart.onCrosshairMove((param) => syncSecondaryHoverCursor(param?.time));
}
