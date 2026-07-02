import { STATUS_TITLE_MODES } from '../../contracts/chart-presentation-contracts.js';
import { formatChange, formatInspectionReadout, formatOhlc, formatPrice } from '../../domain/chart-formatting.js';
import { formatDisplayTimestamp } from '../../domain/timezone-format.js';

export function createChartReplayStatusController({
  root,
  getDisplayTimezone,
  getExchangeTimezone,
  getPresentationSettings,
  getDisplayTimeframe,
}) {
  const sessionIdLabel = root.querySelector('[data-session-id-label]');
  const startLabel = root.querySelector('[data-replay-start]');
  const cursorLabel = root.querySelector('[data-replay-cursor]');
  const endLabel = root.querySelector('[data-replay-end]');
  const revealedCountLabel = root.querySelector('[data-replay-revealed-count]');
  const playbackLabel = root.querySelector('[data-replay-playback]');
  const stateLabel = root.querySelector('[data-replay-state]');
  const statusOhlcRow = root.querySelector('[data-status-ohlc-row]');
  const statusChangeRow = root.querySelector('[data-status-change-row]');
  const statusOhlcLabel = root.querySelector('[data-status-ohlc]');
  const chartOhlcOverlay = root.querySelector('[data-chart-ohlc-overlay]');
  const chartMarketStatus = root.querySelector('[data-chart-market-status]');
  const chartOhlcSymbol = root.querySelector('[data-chart-ohlc-symbol]');
  const chartOhlcTimeframe = root.querySelector('[data-chart-ohlc-timeframe]');
  const chartOhlcLegend = root.querySelector('[data-chart-ohlc-legend]');
  const statusChangeLabel = root.querySelector('[data-status-change]');
  const crosshairRow = root.querySelector('[data-crosshair-row]');
  const crosshairReadoutLabel = root.querySelector('[data-crosshair-inspection-readout]');
  const countdownRow = root.querySelector('[data-countdown-row]');
  const countdownLabel = root.querySelector('[data-bar-countdown]');

  let crosshairState = { active: false };
  let lastReplayState = null;

  function presentationSettings() {
    return getPresentationSettings();
  }

  function formatReplayTimestamp(value) {
    if (!value) return '--';
    const settings = presentationSettings();
    return formatDisplayTimestamp(value, {
      displayTimezone: getDisplayTimezone(),
      exchangeTimezone: getExchangeTimezone(),
      timeFormat: settings.timeFormat,
      dateFormat: settings.dateFormat,
      showDayOfWeekLabels: settings.showDayOfWeekLabels,
    });
  }

  function formatTimeframeLabel(value) {
    const minutes = Number(value || 1);
    if (minutes === 43200) return '1M';
    if (minutes === 10080) return '1W';
    if (minutes === 1440) return '1D';
    if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}H`;
    return `${minutes}m`;
  }

  function createChartOhlcPart(label, value, className) {
    const group = document.createElement('span');
    group.className = 'chart-ohlc-part';
    const labelEl = document.createElement('span');
    labelEl.className = 'chart-ohlc-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = `chart-ohlc-value ${className}`;
    valueEl.textContent = formatPrice(value);
    group.append(labelEl, valueEl);
    return group;
  }

  function renderChartOhlcLegend(bar) {
    chartOhlcLegend.replaceChildren();
    if (!bar) {
      chartOhlcLegend.textContent = '--';
      return;
    }
    const className = Number(bar.close) >= Number(bar.open) ? 'is-up' : 'is-down';
    chartOhlcLegend.append(
      createChartOhlcPart('O', bar.open, className),
      createChartOhlcPart('H', bar.high, className),
      createChartOhlcPart('L', bar.low, className),
      createChartOhlcPart('C', bar.close, className)
    );
  }

  function refreshChartOhlcOverlay(state = lastReplayState) {
    const settings = presentationSettings();
    const latest = Array.isArray(state?.displayBars) ? state.displayBars.at(-1) : null;
    const hoverBar = crosshairState?.active && crosshairState?.bar ? crosshairState.bar : null;
    const displayBar = hoverBar || latest;
    chartOhlcOverlay.hidden = !settings.showStatusOhlc || !displayBar;
    chartMarketStatus.hidden = !settings.showOpenMarketStatus;
    chartOhlcSymbol.hidden = !settings.showStatusTitle
      || settings.statusTitleMode === STATUS_TITLE_MODES.TIMEFRAME;
    chartOhlcTimeframe.hidden = !settings.showStatusTitle
      || settings.statusTitleMode === STATUS_TITLE_MODES.SYMBOL;
    renderChartOhlcLegend(displayBar);
    chartOhlcSymbol.textContent = state?.session?.instrument || 'NQ';
    chartOhlcTimeframe.textContent = formatTimeframeLabel(
      getDisplayTimeframe() || state?.displayTimeframe || state?.session?.timeframe || 1
    );
  }

  function refreshStatusLineValues(state) {
    const settings = presentationSettings();
    lastReplayState = state || null;
    const latest = Array.isArray(state?.displayBars) ? state.displayBars.at(-1) : null;
    statusOhlcRow.hidden = !settings.showStatusOhlc;
    statusChangeRow.hidden = !settings.showStatusChange;
    if (!latest) {
      statusOhlcLabel.textContent = '--';
      refreshChartOhlcOverlay(state);
      statusChangeLabel.textContent = '--';
      return;
    }
    statusOhlcLabel.textContent = formatOhlc(latest);
    refreshChartOhlcOverlay(state);
    const previous = state.displayBars.length > 1 ? state.displayBars.at(-2) : null;
    const change = previous ? Number(latest.close) - Number(previous.close) : 0;
    statusChangeLabel.textContent = formatChange(change);
  }

  function refreshCrosshairReadout() {
    const settings = presentationSettings();
    crosshairRow.hidden = !settings.showCrosshairReadout;
    if (!settings.showCrosshairReadout || !crosshairState?.active) {
      crosshairReadoutLabel.textContent = '--';
      return;
    }
    const bar = crosshairState.bar;
    const timeText = formatReplayTimestamp(crosshairState.time || bar?.time);
    const price = crosshairState.price == null ? bar?.close : crosshairState.price;
    crosshairReadoutLabel.textContent = formatInspectionReadout({ timeText, price, bar });
  }

  function refreshCountdown(state = lastReplayState) {
    const settings = presentationSettings();
    countdownRow.hidden = !settings.showBarCountdown;
    countdownLabel.textContent = settings.showBarCountdown
      ? state?.countdown?.label || '--'
      : '--';
  }

  function renderReplayStatus({
    state,
    playbackPlaying,
    terminalReason,
    revealedCount,
  }) {
    startLabel.textContent = formatReplayTimestamp(state?.startBarTimestamp);
    cursorLabel.textContent = formatReplayTimestamp(state?.cursorTimestamp);
    endLabel.textContent = formatReplayTimestamp(state?.session?.sessionEnd);
    revealedCountLabel.textContent = String(revealedCount);
    playbackLabel.textContent = playbackPlaying ? 'Playing' : 'Paused';
    stateLabel.textContent = terminalReason || state?.status || 'Idle';
    refreshStatusLineValues(state);
    refreshCountdown(state);
    refreshCrosshairReadout();
  }

  function setSessionId(sessionId) {
    sessionIdLabel.textContent = sessionId;
  }

  function setCrosshairState(nextCrosshairState = { active: false }) {
    crosshairState = nextCrosshairState;
    refreshChartOhlcOverlay();
    refreshCrosshairReadout();
  }

  return {
    formatReplayTimestamp,
    refreshChartOhlcOverlay,
    refreshCrosshairReadout,
    renderReplayStatus,
    setCrosshairState,
    setSessionId,
  };
}
