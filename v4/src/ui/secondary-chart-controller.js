// Wiring for the readonly split-screen secondary chart.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getReplayVisibleBars } from './replay-controls.js';
import {
  getBarChartTime,
  getBucketStart,
  mapTimestampToChartTime,
} from '../chart/time-projection.js';
import {
  findDisplayBarFast,
  resolveExistingChartTimeFast,
} from '../chart/display-bar-lookup.js';
import {
  clearSecondaryData,
  destroySecondaryChart,
  getSecondaryActiveDataCount,
  getSecondaryVisibleLogicalRange,
  hideSecondaryCursor,
  hideSecondaryHoverCursor,
  hideSecondarySyncCrosshairCursor,
  initSecondaryChart,
  onSecondaryCrosshairMove,
  setSecondaryChartInfo,
  setSecondaryData,
  showSecondaryCursor,
  showSecondaryEndOfData,
  showSecondarySyncCrosshairCursor,
  showSecondaryStartOfData,
} from '../chart/secondary-chart-manager.js';

let requestSeq = 0;
let lastReplayState = { enabled: false, cursorTimestamp: null };
let replaySourceBars = [];
let replaySourceRequestedRange = null;
let pendingPrimaryHoverTime = null;
let pendingSecondaryHoverTime = null;
let primaryHoverFrame = null;
let secondaryHoverFrame = null;
let lastSettings = {
  enabled: secondaryStore.isSecondaryEnabled(),
  timeframe: secondaryStore.getSecondaryTimeframe(),
  instrument: secondaryStore.getSecondaryInstrument(),
};

function requestFrame(callback) {
  const raf = globalThis.requestAnimationFrame || globalThis.window?.requestAnimationFrame;
  if (typeof raf === 'function') return raf(callback);
  callback();
  return null;
}

function mapTimestampToSecondaryChartTime(timestamp) {
  const timeframe = secondaryStore.getSecondaryTimeframe();
  return mapTimestampToChartTime(timestamp, timeframe, secondaryStore.getSecondaryDisplayBars());
}

function getPrimaryHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  const currentTimeframe = store.getCurrentTimeframe();
  const bar = findDisplayBarFast(getPrimarySyncBars(), time, currentTimeframe);
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function getSecondaryHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  const secondaryTimeframe = secondaryStore.getSecondaryTimeframe();
  const bar = findDisplayBarFast(getSecondarySyncBars(), time, secondaryTimeframe);
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function getPrimarySyncBars() {
  const replayBars = getReplayVisibleBars();
  return Array.isArray(replayBars) ? replayBars : store.getDisplayBars();
}

function getSecondarySyncBars() {
  const bars = secondaryStore.getSecondaryDisplayBars();
  if (!lastReplayState.enabled) return bars;
  return getReplaySyncedSecondaryBars(bars, secondaryStore.getSecondaryTimeframe());
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
    chart.hideSyncCrosshairCursor();
    hideSecondaryHoverCursor();
    hideSecondarySyncCrosshairCursor();
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
  chart.hideSyncCrosshairCursor();
  secondaryStore.clearSecondaryBars();
  clearSecondaryData();
}

function syncSecondaryHoverCursor(primaryTime) {
  chart.hideSyncCrosshairCursor();
  if (!secondaryStore.isSecondaryEnabled() || secondaryStore.getSecondaryBarCount() <= 0) {
    hideSecondaryHoverCursor();
    hideSecondarySyncCrosshairCursor();
    return;
  }

  const hoverTimestamp = getPrimaryHoverTimestamp(primaryTime);
  const hoverTime = resolveExistingChartTimeFast(
    hoverTimestamp,
    secondaryStore.getSecondaryTimeframe(),
    getSecondarySyncBars()
  );
  if (hoverTime === null) {
    hideSecondaryHoverCursor();
    hideSecondarySyncCrosshairCursor();
    return;
  }

  hideSecondaryHoverCursor();
  showSecondarySyncCrosshairCursor(hoverTime);
}

function scheduleSecondaryHoverCursor(primaryTime) {
  pendingPrimaryHoverTime = primaryTime;
  if (primaryHoverFrame !== null) return;
  primaryHoverFrame = requestFrame(() => {
    primaryHoverFrame = null;
    const time = pendingPrimaryHoverTime;
    pendingPrimaryHoverTime = null;
    syncSecondaryHoverCursor(time);
  });
}

function syncPrimaryHoverCursor(secondaryTime) {
  hideSecondarySyncCrosshairCursor();
  if (!secondaryStore.isSecondaryEnabled() || store.getBarCount() <= 0) {
    chart.hideSyncCrosshairCursor();
    return;
  }

  const hoverTimestamp = getSecondaryHoverTimestamp(secondaryTime);
  const hoverTime = resolveExistingChartTimeFast(
    hoverTimestamp,
    store.getCurrentTimeframe(),
    getPrimarySyncBars()
  );
  if (hoverTime === null) {
    chart.hideSyncCrosshairCursor();
    return;
  }

  chart.showSyncCrosshairCursor(hoverTime);
}

function schedulePrimaryHoverCursor(secondaryTime) {
  pendingSecondaryHoverTime = secondaryTime;
  if (secondaryHoverFrame !== null) return;
  secondaryHoverFrame = requestFrame(() => {
    secondaryHoverFrame = null;
    const time = pendingSecondaryHoverTime;
    pendingSecondaryHoverTime = null;
    syncPrimaryHoverCursor(time);
  });
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
    chart.hideSyncCrosshairCursor();
    destroySecondaryChart();
  });
  bus.on('bars:loaded', handlePrimaryBarsLoaded);
  bus.on('bars:cleared', handlePrimaryBarsCleared);
  bus.on('replay:changed', handleReplayChanged);
  chart.onCrosshairMove((param) => scheduleSecondaryHoverCursor(param?.time));
  onSecondaryCrosshairMove((param) => schedulePrimaryHoverCursor(param?.time));
}
