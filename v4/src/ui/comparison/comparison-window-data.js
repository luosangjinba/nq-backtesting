import * as bus from '../../event-bus.js';
import { fetchBars } from '../../api.js';
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
import { validateSingleWindowRange } from '../../data/load-range-policy.js';
import * as primaryStore from '../../data/bar-store.js';
import {
  getComparisonWindowState,
  clearComparisonBars,
  setComparisonBars,
} from '../../comparison/comparison-window-store.js';
import { updateComparisonOverlayStatus } from '../../comparison/comparison-overlay-policy.js';
import { getReplaySyncedComparisonBars } from '../../comparison/comparison-replay-sync.js';
import { CHART_PANE_IDS, getPaneLabel } from '../../chart-panes/chart-pane-store.js';

function getComparisonPaneLabel() {
  return getPaneLabel(CHART_PANE_IDS.COMPARISON);
}

function shouldLoadReplaySource(start, end, timeframe) {
  if (Number(timeframe) <= 1) return false;
  return validateSingleWindowRange(start, end, 1).ok;
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

  async function loadComparisonForPrimaryRange({ force = false } = {}) {
    const state = getComparisonWindowState();
    if (!state.enabled) return;
    const { start, end } = primaryStore.getCurrentRange();
    if (!start || !end) {
      clearComparisonView();
      return;
    }

    const { instrument, timeframe } = state.descriptor;
    const loadSignature = `${start}|${end}|${instrument}|${timeframe}`;
    if (!force && loadSignature === lastLoadSignature) return;
    lastLoadSignature = loadSignature;
    const seq = (requestSeq += 1);
    setComparisonStatus(`Loading ${instrument} ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}...`);
    try {
      initComparisonChart();
      setComparisonChartInfo({ instrument, timeframe });
      const shouldLoadSource = shouldLoadReplaySource(start, end, timeframe);
      const [result, replaySourceResult] = await Promise.all([
        fetchBars(start, end, timeframe, instrument),
        shouldLoadSource ? fetchBars(start, end, 1, instrument) : Promise.resolve(null),
      ]);
      if (seq !== requestSeq || !getComparisonWindowState().enabled) return;
      replaySourceBars = replaySourceResult?.bars || [];
      replaySourceRequestedRange = replaySourceResult?.requestedRange || null;
      setComparisonBars(result.bars, result.requestedRange, { start, end });
      const displayBars = getDisplayBarsFromResult(result);
      renderComparisonBars();
      if (displayBars.length > 0) {
        hideComparisonPlaceholder();
      } else {
        setComparisonStatus(`No ${instrument} data in selected range`);
      }
      updateComparisonOverlayStatus();
      bus.emit('status:update', {
        text: `${getComparisonPaneLabel()} ${instrument} 已加载 ${displayBars.length} 根K线`,
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

  return {
    getReplaySyncedBars,
    renderComparisonBars,
    clearComparisonView,
    loadComparisonForPrimaryRange,
    handleComparisonChanged,
    handleReplayChanged,
  };
}
