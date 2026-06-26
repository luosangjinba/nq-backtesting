import * as bus from '../../event-bus.js';
import { TIMEFRAME_MAP } from '../../config.js';
import {
  clearComparisonData,
  getComparisonChart,
  hideComparisonCursor,
  initComparisonChart,
  setComparisonChartInfo,
  setComparisonData,
  showComparisonCursor,
  showComparisonEndOfData,
  showComparisonStartOfData,
} from '../../chart/comparison-chart-manager.js';
import { getBarChartTime, mapTimestampToChartTime } from '../../chart/time-projection.js';
import { resolveChartLoadRange, validateSingleWindowRange } from '../../data/load-range-policy.js';
import { loadBarsWindow } from '../../data/load-bars-window.js';
import * as primaryStore from '../../data/bar-store.js';
import {
  getComparisonWindowState,
  clearComparisonBars,
  setComparisonBars,
} from '../../comparison/comparison-window-store.js';
import { updateComparisonOverlayStatus } from '../../comparison/comparison-overlay-policy.js';
import { getReplaySyncedComparisonBars } from '../../comparison/comparison-replay-sync.js';
import { CHART_PANE_IDS, getPaneLabel, getSyncPeerPanes } from '../../chart-panes/chart-pane-store.js';
import { resolveReplayFirstComparisonRange } from './comparison-replay-load-policy.js';

function getComparisonPaneLabel() {
  return getPaneLabel(CHART_PANE_IDS.COMPARISON);
}

function shouldLoadReplaySource(start, end, timeframe) {
  if (Number(timeframe) <= 1) return false;
  return validateSingleWindowRange(start, end, 1).ok;
}

export function resolveComparisonLoadRequest(start, end, timeframe, instrument, options = {}) {
  const replayFirstRange = resolveReplayFirstComparisonRange({
    primaryTimeframe: options.primaryTimeframe,
    comparisonTimeframe: timeframe,
    outerRange: options.outerRange,
    replayState: options.replayState,
  });
  const comparisonRange = replayFirstRange || resolveChartLoadRange(start, end, timeframe);
  if (!comparisonRange.ok) {
    return {
      ok: false,
      message: comparisonRange.message,
      comparisonRange,
      replaySourceRange: null,
      signature: `${start}|${end}|${instrument}|${timeframe}|invalid`,
    };
  }

  return {
    ok: true,
    message: comparisonRange.message,
    comparisonRange,
    replaySourceRange: shouldLoadReplaySource(comparisonRange.start, comparisonRange.end, timeframe)
      ? { start: comparisonRange.start, end: comparisonRange.end, timeframe: 1 }
      : null,
    signature: `${comparisonRange.start}|${comparisonRange.end}|${start}|${end}|${instrument}|${timeframe}`,
  };
}

function getDisplayBarsFromResult(result) {
  const bars = Array.isArray(result?.bars) ? result.bars : [];
  const range = result?.requestedRange;
  if (!range || bars.length === 0) return bars;
  const { startTs, endTs } = range;
  return bars.filter((bar) => Number(bar?.timestamp) >= startTs && Number(bar?.timestamp) <= endTs);
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

function mapTimestampToComparisonChartTime(timestamp, timeframe, displayBars) {
  return mapTimestampToChartTime(timestamp, timeframe, displayBars);
}

export function createComparisonWindowDataController({
  setComparisonStatus,
  hideComparisonPlaceholder,
}) {
  let requestSeq = 0;
  let lastLoadSignature = null;
  let lastReplayState = { enabled: false, cursorTimestamp: null };
  let replaySourceBars = [];
  let replaySourceRequestedRange = null;

  function getReplaySyncedBars(displayBars, timeframe) {
    return getReplaySyncedComparisonBars({
      displayBars,
      timeframe,
      replayEnabled: lastReplayState.enabled,
      cursorTimestamp: lastReplayState.cursorTimestamp,
      replaySourceBars,
      replaySourceRequestedRange,
    });
  }

  function syncComparisonReplayCursor(timeframe, displayBars) {
    if (!lastReplayState.enabled || lastReplayState.cursorTimestamp === null) {
      hideComparisonCursor();
      return;
    }
    const cursorTime = mapTimestampToComparisonChartTime(lastReplayState.cursorTimestamp, timeframe, displayBars);
    if (cursorTime === null) {
      hideComparisonCursor();
      return;
    }
    showComparisonCursor(cursorTime);
  }

  function renderComparisonBars({ followReplay = false } = {}) {
    const state = getComparisonWindowState();
    if (!state.enabled) return;
    initComparisonChart();
    const { instrument, timeframe } = state.descriptor;
    setComparisonChartInfo({ instrument, timeframe });
    const displayBars = state.displayBars || [];
    const syncedBars = getReplaySyncedBars(displayBars, timeframe);
    const chartData = syncedBars.map((bar) => toChartBar(bar, timeframe));
    const previousRange = getComparisonChart()?.timeScale?.().getVisibleLogicalRange?.() || null;
    setComparisonData(chartData);
    if (lastReplayState.enabled || followReplay) {
      showComparisonEndOfData(chartData.length, previousRange, null);
    } else {
      showComparisonStartOfData(chartData.length);
    }
    syncComparisonReplayCursor(timeframe, syncedBars);
    if (chartData.length > 0) {
      hideComparisonPlaceholder();
    }
  }

  function clearComparisonView() {
    requestSeq += 1;
    lastLoadSignature = null;
    clearComparisonBars();
    replaySourceBars = [];
    replaySourceRequestedRange = null;
    clearComparisonData();
    setComparisonStatus('');
    updateComparisonOverlayStatus();
  }

  function shouldFollowPrimaryPane() {
    return getSyncPeerPanes(CHART_PANE_IDS.PRIMARY).some((pane) => pane.id === CHART_PANE_IDS.COMPARISON);
  }

  function clearComparisonViewForPrimary() {
    if (!shouldFollowPrimaryPane()) return;
    clearComparisonView();
  }

  async function loadComparisonForPrimaryRange({ force = false, requirePaneSync = false, primaryPayload = null } = {}) {
    const state = getComparisonWindowState();
    if (!state.enabled) return;
    if (requirePaneSync && !shouldFollowPrimaryPane()) return;
    const { start, end } = primaryPayload || primaryStore.getCurrentRange();
    if (!start || !end) {
      clearComparisonView();
      return;
    }

    const { instrument, timeframe } = state.descriptor;
    const loadRequest = resolveComparisonLoadRequest(start, end, timeframe, instrument, {
      primaryTimeframe: primaryPayload?.tf ?? primaryStore.getCurrentTimeframe(),
      outerRange: primaryPayload?.requestedOuterRange ?? primaryStore.getRequestedOuterRange(),
      replayState: {
        ...lastReplayState,
        allowOuterStartFallback: true,
      },
    });
    if (!loadRequest.ok) {
      clearComparisonBars();
      replaySourceBars = [];
      replaySourceRequestedRange = null;
      clearComparisonData();
      setComparisonStatus(`${getComparisonPaneLabel()} load failed: ${loadRequest.message}`, true);
      updateComparisonOverlayStatus();
      bus.emit('status:update', {
        text: `${getComparisonPaneLabel()} 加载失败: ${loadRequest.message}`,
        isError: true,
      });
      return;
    }

    const { comparisonRange, replaySourceRange } = loadRequest;
    const loadSignature = loadRequest.signature;
    if (!force && loadSignature === lastLoadSignature) return;
    lastLoadSignature = loadSignature;
    const seq = (requestSeq += 1);
    setComparisonStatus(`Loading ${instrument} ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}...`);
    try {
      initComparisonChart();
      setComparisonChartInfo({ instrument, timeframe });
      const [loadedWindow, loadedReplaySource] = await Promise.all([
        loadBarsWindow(comparisonRange.start, comparisonRange.end, timeframe, instrument),
        replaySourceRange
          ? loadBarsWindow(replaySourceRange.start, replaySourceRange.end, replaySourceRange.timeframe, instrument)
          : Promise.resolve(null),
      ]);
      if (seq !== requestSeq || !getComparisonWindowState().enabled) return;
      const result = loadedWindow.result;
      const replaySourceResult = loadedReplaySource?.result || null;
      replaySourceBars = replaySourceResult?.bars || [];
      replaySourceRequestedRange = replaySourceResult?.requestedRange || null;
      setComparisonBars(result.bars, result.requestedRange, {
        start: comparisonRange.start,
        end: comparisonRange.end,
      });
      const displayBars = getDisplayBarsFromResult(result);
      renderComparisonBars();
      if (displayBars.length > 0) {
        hideComparisonPlaceholder();
      } else {
        setComparisonStatus(`No ${instrument} data in selected range`);
      }
      updateComparisonOverlayStatus();
      bus.emit('status:update', {
        text: comparisonRange.windowed
          ? `${getComparisonPaneLabel()} ${comparisonRange.message}${loadedWindow.cacheHit ? ' (cache)' : ''}`
          : `${getComparisonPaneLabel()} ${instrument} 已加载 ${displayBars.length} 根K线${loadedWindow.cacheHit ? ' (cache)' : ''}`,
        isError: false,
      });
    } catch (error) {
      if (seq !== requestSeq) return;
      lastLoadSignature = null;
      clearComparisonBars();
      replaySourceBars = [];
      replaySourceRequestedRange = null;
      clearComparisonData();
      setComparisonStatus(`${getComparisonPaneLabel()} load failed: ${error.message}`, true);
      updateComparisonOverlayStatus();
      bus.emit('status:update', {
        text: `${getComparisonPaneLabel()} 加载失败: ${error.message}`,
        isError: true,
      });
    }
  }

  function handleComparisonChanged(state) {
    if (!state.enabled) {
      requestSeq += 1;
      lastLoadSignature = null;
      return;
    }
    loadComparisonForPrimaryRange();
  }

  function handleReplayChanged({ enabled, cursorTimestamp }) {
    lastReplayState = {
      enabled: Boolean(enabled),
      cursorTimestamp: cursorTimestamp ?? null,
    };
    renderComparisonBars({ followReplay: true });
  }

  function handleReplayPendingActivate({ timestamp } = {}) {
    lastReplayState = {
      enabled: true,
      cursorTimestamp: timestamp ?? null,
    };
  }

  return {
    getReplaySyncedBars,
    renderComparisonBars,
    clearComparisonView,
    clearComparisonViewForPrimary,
    loadComparisonForPrimaryRange,
    handleComparisonChanged,
    handleReplayPendingActivate,
    handleReplayChanged,
  };
}
