import { dispatchCommand } from '../../runtime/commands.js';
import { subscribeEvent } from '../../runtime/events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../../contracts/chart-contracts.js';
import {
  CHART_DATE_FORMATS,
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
  DEFAULT_CHART_PRESENTATION_SETTINGS,
  STATUS_TITLE_MODES,
} from '../../contracts/chart-presentation-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../../contracts/replay-contracts.js';
import { DISPLAY_TIMEZONE_COMMANDS, DISPLAY_TIMEZONE_EVENTS } from '../../contracts/timezone-contracts.js';
import { formatChange, formatInspectionReadout, formatOhlc, formatPrice } from '../../domain/chart-formatting.js';
import {
  displayWallClockToCanonicalTimestamp,
  formatDisplayTimestamp,
} from '../../domain/timezone-format.js';
import {
  cloneBackgroundStyle,
  cloneCandleStyle,
  cloneCrosshairStyle,
  cloneGridStyle,
  cloneScaleStyle,
  cloneWatermarkStyle,
  createChartSettingsController,
} from './chart-settings-panel.js';
import { renderChartReplayTemplate } from './chart-replay-template.js';
import { createReplayFloatingControlsController } from './replay-floating-controls.js';
import { createReplayViewportDemandBridge } from './viewport-demand-wiring.js';

export function createChartReplayRoute() {
  return {
    id: 'chart',
    render({ params = {} } = {}) {
      const sessionId = params.sessionId || 'No session selected';
      const activePaneId = 'primary';
      const section = document.createElement('section');
      section.className = 'panel chart-panel';
      section.dataset.route = 'chart';
      section.dataset.sessionId = params.sessionId || '';
      section.dataset.activePaneId = activePaneId;
      section.dataset.activePaneCount = '1';
      section.dataset.layoutMode = 'single';
      section.innerHTML = renderChartReplayTemplate({ activePaneId });
      const status = section.querySelector('[data-replay-load-status]');
      const sessionIdLabel = section.querySelector('[data-session-id-label]');
      const startLabel = section.querySelector('[data-replay-start]');
      const cursorLabel = section.querySelector('[data-replay-cursor]');
      const endLabel = section.querySelector('[data-replay-end]');
      const revealedCountLabel = section.querySelector('[data-replay-revealed-count]');
      const playbackLabel = section.querySelector('[data-replay-playback]');
      const stateLabel = section.querySelector('[data-replay-state]');
      const statusOhlcRow = section.querySelector('[data-status-ohlc-row]');
      const statusChangeRow = section.querySelector('[data-status-change-row]');
      const statusOhlcLabel = section.querySelector('[data-status-ohlc]');
      const chartOhlcOverlay = section.querySelector('[data-chart-ohlc-overlay]');
      const chartMarketStatus = section.querySelector('[data-chart-market-status]');
      const chartOhlcSymbol = section.querySelector('[data-chart-ohlc-symbol]');
      const chartOhlcTimeframe = section.querySelector('[data-chart-ohlc-timeframe]');
      const chartOhlcLegend = section.querySelector('[data-chart-ohlc-legend]');
      const statusChangeLabel = section.querySelector('[data-status-change]');
      const crosshairRow = section.querySelector('[data-crosshair-row]');
      const crosshairReadoutLabel = section.querySelector('[data-crosshair-inspection-readout]');
      const chartViewport = section.querySelector('.chart-viewport');
      const chartHost = section.querySelector('[data-chart-host]');
      const replayTruncatePickLine = section.querySelector('[data-replay-truncate-pick-line]');
      const replayTruncateErrorPopover = section.querySelector('[data-replay-truncate-error]');
      const replayTruncateErrorTitle = section.querySelector('[data-replay-truncate-error-title]');
      const replayTruncateErrorMessage = section.querySelector('[data-replay-truncate-error-message]');
      const replayTruncateErrorCloseButtons = Array.from(section.querySelectorAll('[data-replay-truncate-error-close]'));
      const nextButton = section.querySelector('[data-replay-next]');
      const playButton = section.querySelector('[data-replay-play]');
      const pauseButton = section.querySelector('[data-replay-pause]');
      const resetButton = section.querySelector('[data-replay-reset]');
      const replayTruncateButton = section.querySelector('[data-replay-truncate-to-selection]');
      const replayPreviousButton = section.querySelector('[data-replay-previous]');
      const replaySpeedInput = section.querySelector('[data-replay-speed]');
      const replayIntervalSelect = section.querySelector('[data-replay-interval-select]');
      const replaySyncIntervalInput = section.querySelector('[data-replay-sync-interval]');
      const displayTimeframeSelect = section.querySelector('[data-display-timeframe-select]');
      const goToPopover = section.querySelector('[data-chart-go-to-popover]');
      const goToOpenButton = section.querySelector('[data-chart-go-to-open]');
      const goToCancelButtons = Array.from(section.querySelectorAll('[data-chart-go-to-cancel]'));
      const goToInput = section.querySelector('[data-chart-go-to-input]');
      const goToButton = section.querySelector('[data-chart-go-to]');
      const jumpCursorButton = section.querySelector('[data-chart-jump-cursor]');
      const jumpCursorPopoverButton = section.querySelector('[data-chart-jump-cursor-popover]');
      const layoutOpenButton = section.querySelector('[data-layout-open]');
      const chartToolbarButtons = Array.from(section.querySelectorAll('[data-chart-toolbar] button'));
      const resetViewButton = section.querySelector('[data-chart-reset-view]');
      let commandInFlight = false;
      let replayCommandQueue = Promise.resolve();
      let replayLoaded = false;
      let disposed = false;
      let initialLoadTimer = null;
      let playbackPlaying = false;
      let playbackIntervalMs = 500;
      let terminalReason = '';
      let revealedCount = 0;
      let startTimestamp = null;
      let cursorTimestamp = null;
      let sessionTimeframe = null;
      let displayTimeframe = null;
      let replayIntervalTimeframe = null;
      let replayIntervalSync = false;
      let displayTimezone = 'Exchange';
      let exchangeTimezone = 'America/New_York';
      let truncatePickMode = false;
      let presentationSettings = {
        timeFormat: DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
        dateFormat: CHART_DATE_FORMATS.ISO_DATE,
        showStatusTitle: DEFAULT_CHART_PRESENTATION_SETTINGS.showStatusTitle,
        statusTitleMode: STATUS_TITLE_MODES.SYMBOL_TIMEFRAME,
        showOpenMarketStatus: DEFAULT_CHART_PRESENTATION_SETTINGS.showOpenMarketStatus,
        showDayOfWeekLabels: DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels,
        showStatusOhlc: true,
        showStatusChange: true,
        showCrosshairReadout: true,
        margins: { ...DEFAULT_CHART_PRESENTATION_SETTINGS.margins },
        rightOffsetBars: DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars,
        candleStyle: cloneCandleStyle(),
        gridStyle: cloneGridStyle(),
        crosshairStyle: cloneCrosshairStyle(),
        backgroundStyle: cloneBackgroundStyle(),
        scaleStyle: cloneScaleStyle(),
        watermarkStyle: cloneWatermarkStyle(),
      };
      let crosshairState = { active: false };
      let lastReplayState = null;
      const unsubscribeCallbacks = [];
      const viewportDemandBridge = createReplayViewportDemandBridge({
        getSessionId: () => params.sessionId || '',
        onLoaded: (state) => {
          status.textContent = `Loaded ${state.displayBars?.length || 0} bars.`;
          refreshReplayStatus();
        },
        onError: (error) => {
          status.textContent = error?.message || String(error);
        },
      });
      sessionIdLabel.textContent = sessionId;
      createReplayFloatingControlsController({ root: section });
      const chartSettingsController = createChartSettingsController({
        root: section,
        getDisplayTimezone: () => displayTimezone,
        getPresentationSettings: () => presentationSettings,
        onCancel: () => {
          updateDisplayTimezoneButtons();
          updatePresentationButtons();
        },
        onApply: async (draft) => {
          if (draft.displayTimezone !== displayTimezone) {
            const timezone = await dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.SET, {
              displayTimezone: draft.displayTimezone,
            });
            displayTimezone = timezone.displayTimezone;
            exchangeTimezone = timezone.exchangeTimezone;
          }
          presentationSettings = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
            timeFormat: draft.timeFormat,
            dateFormat: draft.dateFormat,
            showStatusTitle: draft.showStatusTitle,
            statusTitleMode: draft.statusTitleMode,
            showOpenMarketStatus: draft.showOpenMarketStatus,
            showDayOfWeekLabels: draft.showDayOfWeekLabels,
            showStatusOhlc: draft.showStatusOhlc,
            showStatusChange: draft.showStatusChange,
            showCrosshairReadout: draft.showCrosshairReadout,
            margins: { ...draft.margins },
            rightOffsetBars: Number(draft.rightOffsetBars || 10),
            candleStyle: cloneCandleStyle(draft.candleStyle),
            gridStyle: cloneGridStyle(draft.gridStyle),
            crosshairStyle: cloneCrosshairStyle(draft.crosshairStyle),
            backgroundStyle: cloneBackgroundStyle(draft.backgroundStyle),
            scaleStyle: cloneScaleStyle(draft.scaleStyle),
            watermarkStyle: cloneWatermarkStyle(draft.watermarkStyle),
          });
          await syncChartDisplayTimezone();
          await syncChartPresentationSettings();
          updateDisplayTimezoneButtons();
          updatePresentationButtons();
          await refreshReplayStatus();
        },
      });

      async function refreshReplayStatus() {
        if (!section.isConnected && section.parentElement === null) return;
        const [state, playback, displayContext, timezoneContext, presentationContext] = await Promise.all([
          dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT).catch(() => null),
          dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.GET).catch(() => null),
          dispatchCommand(CHART_PRESENTATION_COMMANDS.GET).catch(() => null),
        ]);
        displayTimeframe = Number(displayContext?.displayTimeframe
          || state?.displayTimeframe
          || state?.session?.timeframe
          || 0);
        sessionTimeframe = Number(state?.session?.timeframe || sessionTimeframe || 1);
        if (replayIntervalSync) {
          replayIntervalTimeframe = Number(displayTimeframe || sessionTimeframe || 1);
        } else {
          replayIntervalTimeframe = Number(replayIntervalTimeframe || sessionTimeframe || displayTimeframe || 1);
        }
        displayTimezone = timezoneContext?.displayTimezone || displayTimezone;
        exchangeTimezone = timezoneContext?.exchangeTimezone || exchangeTimezone;
        presentationSettings = presentationContext || presentationSettings;
        playbackPlaying = Boolean(playback?.playing);
        if (playbackPlaying && Number(playback?.intervalMs) > 0) {
          playbackIntervalMs = Number(playback.intervalMs);
        }
        revealedCount = Number(state?.revealedCount || 0);
        startTimestamp = state?.startBarTimestamp || null;
        cursorTimestamp = state?.cursorTimestamp || null;
        terminalReason = playback?.stoppedReason || terminalReason;
        startLabel.textContent = formatReplayTimestamp(state?.startBarTimestamp);
        cursorLabel.textContent = formatReplayTimestamp(state?.cursorTimestamp);
        endLabel.textContent = formatReplayTimestamp(state?.session?.sessionEnd);
        revealedCountLabel.textContent = String(revealedCount);
        playbackLabel.textContent = playbackPlaying ? 'Playing' : 'Paused';
        stateLabel.textContent = terminalReason || state?.status || 'Idle';
        refreshStatusLineValues(state);
        if (terminalReason) {
          status.textContent = `Replay stopped: ${terminalReason}.`;
        }
        updateDisplayTimeframeButtons();
        updateDisplayTimezoneButtons();
        updatePresentationButtons();
        refreshCrosshairReadout();
        setControlsDisabled();
      }

      function formatReplayTimestamp(value) {
        if (!value) return '--';
        return formatDisplayTimestamp(value, {
          displayTimezone,
          exchangeTimezone,
          timeFormat: presentationSettings.timeFormat,
          dateFormat: presentationSettings.dateFormat,
          showDayOfWeekLabels: presentationSettings.showDayOfWeekLabels,
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
        const latest = Array.isArray(state?.displayBars) ? state.displayBars.at(-1) : null;
        const hoverBar = crosshairState?.active && crosshairState?.bar ? crosshairState.bar : null;
        const displayBar = hoverBar || latest;
        chartOhlcOverlay.hidden = !presentationSettings.showStatusOhlc || !displayBar;
        chartMarketStatus.hidden = !presentationSettings.showOpenMarketStatus;
        chartOhlcSymbol.hidden = !presentationSettings.showStatusTitle
          || presentationSettings.statusTitleMode === STATUS_TITLE_MODES.TIMEFRAME;
        chartOhlcTimeframe.hidden = !presentationSettings.showStatusTitle
          || presentationSettings.statusTitleMode === STATUS_TITLE_MODES.SYMBOL;
        renderChartOhlcLegend(displayBar);
        chartOhlcSymbol.textContent = state?.session?.instrument || 'NQ';
        chartOhlcTimeframe.textContent = formatTimeframeLabel(
          displayTimeframe || state?.displayTimeframe || state?.session?.timeframe || 1
        );
      }

      function refreshStatusLineValues(state) {
        lastReplayState = state || null;
        const latest = Array.isArray(state?.displayBars) ? state.displayBars.at(-1) : null;
        statusOhlcRow.hidden = !presentationSettings.showStatusOhlc;
        statusChangeRow.hidden = !presentationSettings.showStatusChange;
        if (!latest) {
          statusOhlcLabel.textContent = '--';
          refreshChartOhlcOverlay(state);
          statusChangeLabel.textContent = '--';
          return;
        }
        const ohlcText = formatOhlc(latest);
        statusOhlcLabel.textContent = ohlcText;
        refreshChartOhlcOverlay(state);
        const previous = state.displayBars.length > 1 ? state.displayBars.at(-2) : null;
        const change = previous ? Number(latest.close) - Number(previous.close) : 0;
        statusChangeLabel.textContent = formatChange(change);
      }

      function refreshCrosshairReadout() {
        crosshairRow.hidden = !presentationSettings.showCrosshairReadout;
        if (!presentationSettings.showCrosshairReadout || !crosshairState?.active) {
          crosshairReadoutLabel.textContent = '--';
          return;
        }
        const bar = crosshairState.bar;
        const timeText = formatReplayTimestamp(crosshairState.time || bar?.time);
        const price = crosshairState.price == null ? bar?.close : crosshairState.price;
        crosshairReadoutLabel.textContent = formatInspectionReadout({ timeText, price, bar });
      }

      function setControlsDisabled(disabled = false) {
        const unavailable = disabled || !replayLoaded || !params.sessionId;
        nextButton.disabled = unavailable;
        playButton.disabled = unavailable || playbackPlaying;
        pauseButton.disabled = unavailable || !playbackPlaying;
        resetButton.disabled = unavailable;
        replayTruncateButton.disabled = unavailable;
        replayTruncateButton.setAttribute('aria-pressed', truncatePickMode ? 'true' : 'false');
        replayPreviousButton.disabled = unavailable || revealedCount <= 0;
        replaySpeedInput.disabled = unavailable;
        replayIntervalSelect.disabled = unavailable;
        replaySyncIntervalInput.disabled = unavailable;
        goToInput.disabled = unavailable;
        goToOpenButton.disabled = unavailable;
        goToButton.disabled = unavailable || !goToInput.value;
        if (jumpCursorButton) {
          jumpCursorButton.disabled = unavailable;
        }
        jumpCursorPopoverButton.disabled = unavailable;
        layoutOpenButton.disabled = true;
        chartToolbarButtons.forEach((button) => {
          button.disabled = unavailable;
        });
        displayTimeframeSelect.disabled = unavailable;
        playButton.hidden = playbackPlaying;
        pauseButton.hidden = !playbackPlaying;
      }

      function parseTimestampMs(value) {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
      }

      function normalizeBarTime(value) {
        if (value == null) return null;
        if (typeof value === 'number') return new Date(value * 1000).toISOString();
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
      }

      function closeTruncateError() {
        replayTruncateErrorPopover.hidden = true;
      }

      function showTruncateError(title, message) {
        replayTruncateErrorTitle.textContent = title;
        replayTruncateErrorMessage.textContent = message;
        replayTruncateErrorPopover.hidden = false;
      }

      function setTruncatePickMode(enabled) {
        truncatePickMode = Boolean(enabled) && replayLoaded && Boolean(params.sessionId);
        chartViewport.dataset.truncatePickMode = truncatePickMode ? 'true' : 'false';
        replayTruncatePickLine.hidden = !truncatePickMode;
        if (!truncatePickMode) {
          replayTruncatePickLine.style.left = '';
        }
        replayTruncateButton.setAttribute('aria-pressed', truncatePickMode ? 'true' : 'false');
        setControlsDisabled();
      }

      function updateTruncatePickGuide(event) {
        if (!truncatePickMode) return;
        const hostRect = chartHost.getBoundingClientRect();
        if (!hostRect.width) return;
        const viewportRect = chartViewport.getBoundingClientRect();
        const x = Math.min(Math.max(event.clientX - hostRect.left, 0), hostRect.width);
        replayTruncatePickLine.style.left = `${Math.round(hostRect.left - viewportRect.left + x)}px`;
        replayTruncatePickLine.hidden = false;
      }

      async function timestampFromChartPointer(event) {
        const rendered = await dispatchCommand(CHART_COMMANDS.GET_RENDERED_BARS).catch(() => null);
        const bars = Array.isArray(rendered?.renderedBars) ? rendered.renderedBars : [];
        if (!bars.length) return null;
        const hostRect = chartHost.getBoundingClientRect();
        if (!hostRect.width) return null;
        const ratio = Math.min(Math.max((event.clientX - hostRect.left) / hostRect.width, 0), 1);
        const index = Math.min(
          bars.length - 1,
          Math.max(0, Math.round(ratio * Math.max(0, bars.length - 1)))
        );
        return normalizeBarTime(bars[index]?.time);
      }

      function validateTruncateTimestamp(timestamp) {
        const selectedMs = parseTimestampMs(timestamp);
        const startMs = parseTimestampMs(startTimestamp);
        const cursorMs = parseTimestampMs(cursorTimestamp);
        if (selectedMs == null || startMs == null || cursorMs == null) {
          return {
            ok: false,
            title: 'Cannot truncate replay',
            message: 'Select a visible replay bar before truncating.',
          };
        }
        if (selectedMs < startMs) {
          return {
            ok: false,
            title: 'You cannot go further back than this date',
            message: `You cannot go further back than the session start date: ${formatReplayTimestamp(startTimestamp)}`,
          };
        }
        if (selectedMs > cursorMs) {
          return {
            ok: false,
            title: 'Cannot truncate beyond current replay bar',
            message: `Select a bar at or before the current replay cursor: ${formatReplayTimestamp(cursorTimestamp)}`,
          };
        }
        return { ok: true };
      }

      async function pickTruncateTimestamp(event) {
        if (!truncatePickMode) return;
        event.preventDefault();
        event.stopPropagation();
        updateTruncatePickGuide(event);
        const selectedTimestamp = await timestampFromChartPointer(event);
        const validation = validateTruncateTimestamp(selectedTimestamp);
        if (!validation.ok) {
          setTruncatePickMode(false);
          showTruncateError(validation.title, validation.message);
          return;
        }
        setTruncatePickMode(false);
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, {
          sessionId: params.sessionId,
          timestamp: selectedTimestamp,
        }));
        if (!state) return;
        terminalReason = state.truncated ? '' : state.reason || 'stopped';
        status.textContent = state.truncated
          ? `Truncated to ${formatReplayTimestamp(state.cursorTimestamp)}.`
          : `Replay stopped: ${state.reason || 'selected bar unavailable'}.`;
        await refreshReplayStatus();
      }

      function updateDisplayTimeframeButtons() {
        displayTimeframeSelect.value = displayTimeframe ? String(displayTimeframe) : '1';
        replayIntervalSelect.value = replayIntervalTimeframe ? String(replayIntervalTimeframe) : '1';
        replaySyncIntervalInput.checked = replayIntervalSync;
        replaySpeedInput.value = String(playbackIntervalMs);
      }

      function replayStepCount() {
        const base = Number(sessionTimeframe || 1);
        const selected = Number(replayIntervalTimeframe || base);
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(selected) || selected <= 0) {
          return 1;
        }
        return Math.max(1, Math.round(selected / base));
      }

      function updateDisplayTimezoneButtons() {
        chartSettingsController.renderCurrent();
      }

      function updatePresentationButtons() {
        chartSettingsController.renderCurrent();
      }

      async function syncChartDisplayTimezone() {
        await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
          displayTimezone,
          exchangeTimezone,
          timeFormat: presentationSettings.timeFormat,
          dateFormat: presentationSettings.dateFormat,
          showDayOfWeekLabels: presentationSettings.showDayOfWeekLabels,
        }).catch(() => null);
      }

      async function syncChartPresentationSettings() {
        await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
          timeFormat: presentationSettings.timeFormat,
          dateFormat: presentationSettings.dateFormat,
          showDayOfWeekLabels: presentationSettings.showDayOfWeekLabels,
          showCrosshairReadout: presentationSettings.showCrosshairReadout,
          margins: presentationSettings.margins,
          rightOffsetBars: presentationSettings.rightOffsetBars,
          candleStyle: presentationSettings.candleStyle,
          gridStyle: presentationSettings.gridStyle,
          crosshairStyle: presentationSettings.crosshairStyle,
          backgroundStyle: presentationSettings.backgroundStyle,
          scaleStyle: presentationSettings.scaleStyle,
          watermarkStyle: presentationSettings.watermarkStyle,
        }).catch(() => null);
      }

      async function runReplayCommand(action) {
        if (!params.sessionId) return null;
        const runQueued = async () => {
          commandInFlight = true;
          try {
            return await action();
          } finally {
            commandInFlight = false;
            setControlsDisabled(false);
          }
        };
        const result = replayCommandQueue.then(runQueued, runQueued);
        replayCommandQueue = result.catch(() => null);
        return result;
      }

      nextButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.NEXT, {
          sessionId: params.sessionId,
          stepCount: replayStepCount(),
        }));
        if (!state) return;
        terminalReason = state.advanced ? '' : state.reason || 'stopped';
        status.textContent = state.advanced
          ? `Loaded ${state.displayBars.length} bars.`
          : `Replay stopped: ${state.reason || 'no next bar'}.`;
        await refreshReplayStatus();
      });

      replayTruncateButton.addEventListener('click', () => {
        if (replayTruncateButton.disabled) return;
        closeTruncateError();
        setTruncatePickMode(!truncatePickMode);
        status.textContent = truncatePickMode
          ? 'Select a replay bar to truncate future bars.'
          : 'Replay truncate selection canceled.';
      });

      chartHost.addEventListener('pointermove', updateTruncatePickGuide);
      chartHost.addEventListener('click', pickTruncateTimestamp);

      replayTruncateErrorCloseButtons.forEach((button) => {
        button.addEventListener('click', closeTruncateError);
      });
      replayTruncateErrorPopover.addEventListener('click', (event) => {
        if (event.target === replayTruncateErrorPopover) {
          closeTruncateError();
        }
      });
      section.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && truncatePickMode) {
          setTruncatePickMode(false);
          status.textContent = 'Replay truncate selection canceled.';
        }
      });

      replayPreviousButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
          sessionId: params.sessionId,
          stepCount: replayStepCount(),
        }));
        if (!state) return;
        terminalReason = state.rewound ? '' : state.reason || 'stopped';
        status.textContent = state.rewound
          ? `Rewound to ${formatReplayTimestamp(state.cursorTimestamp)}.`
          : `Replay stopped: ${state.reason || 'no previous bar'}.`;
        await refreshReplayStatus();
      });

      playButton.addEventListener('click', async () => {
        const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PLAY, {
          sessionId: params.sessionId,
          intervalMs: playbackIntervalMs,
          stepCount: replayStepCount(),
        }));
        if (!playback) return;
        playbackPlaying = Boolean(playback.playing);
        terminalReason = '';
        status.textContent = playbackPlaying ? 'Playing replay.' : 'Replay paused.';
        await refreshReplayStatus();
      });

      pauseButton.addEventListener('click', async () => {
        const playback = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PAUSE));
        if (!playback) return;
        playbackPlaying = Boolean(playback.playing);
        status.textContent = playbackPlaying ? 'Playing replay.' : 'Replay paused.';
        await refreshReplayStatus();
      });

      resetButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.RESET, {
          sessionId: params.sessionId,
        }));
        if (!state) return;
        terminalReason = '';
        status.textContent = `Loaded ${state.displayBars.length} bars.`;
        await refreshReplayStatus();
      });

      replaySpeedInput.addEventListener('input', () => {
        const nextInterval = Number(replaySpeedInput.value);
        if (!Number.isFinite(nextInterval) || nextInterval <= 0) return;
        playbackIntervalMs = nextInterval;
      });

      replayIntervalSelect.addEventListener('change', () => {
        const nextReplayInterval = Number(replayIntervalSelect.value);
        if (!Number.isFinite(nextReplayInterval) || nextReplayInterval <= 0) return;
        replayIntervalSync = false;
        replayIntervalTimeframe = nextReplayInterval;
        updateDisplayTimeframeButtons();
      });

      replaySyncIntervalInput.addEventListener('change', () => {
        replayIntervalSync = replaySyncIntervalInput.checked;
        if (replayIntervalSync) {
          replayIntervalTimeframe = Number(displayTimeframe || sessionTimeframe || 1);
        }
        updateDisplayTimeframeButtons();
      });

      displayTimeframeSelect.addEventListener('change', async () => {
        const nextDisplayTimeframe = Number(displayTimeframeSelect.value);
        if (!nextDisplayTimeframe || nextDisplayTimeframe === displayTimeframe) return;
        const selectedOption = displayTimeframeSelect.selectedOptions[0];
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
          sessionId: params.sessionId,
          paneId: activePaneId,
          displayTimeframe: nextDisplayTimeframe,
        }));
        if (!state) return;
        displayTimeframe = Number(state.displayTimeframe || nextDisplayTimeframe);
        if (replayIntervalSync) {
          replayIntervalTimeframe = displayTimeframe;
        }
        status.textContent = `Loaded ${state.displayBars?.length || 0} ${selectedOption?.textContent || ''} bars.`;
        updateDisplayTimeframeButtons();
        await refreshReplayStatus();
      });

      function openGoToPopover() {
        if (goToOpenButton.disabled) return;
        goToPopover.hidden = false;
        goToInput.focus();
        setControlsDisabled();
      }

      function closeGoToPopover() {
        goToPopover.hidden = true;
        setControlsDisabled();
      }

      goToOpenButton.addEventListener('click', openGoToPopover);
      goToCancelButtons.forEach((button) => {
        button.addEventListener('click', closeGoToPopover);
      });

      goToInput.addEventListener('input', () => {
        setControlsDisabled();
      });

      async function runChartNavigation(action, statusText) {
        if (commandInFlight) return null;
        commandInFlight = true;
        setControlsDisabled(true);
        try {
          const result = await action();
          if (statusText) {
            status.textContent = statusText(result);
          }
          return result;
        } catch (error) {
          status.textContent = error?.message || String(error);
          return null;
        } finally {
          commandInFlight = false;
          setControlsDisabled(false);
        }
      }

      resetViewButton.addEventListener('click', () => {
        runChartNavigation(
          () => dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW),
          () => 'Following cursor.'
        );
      });

      goToButton.addEventListener('click', async () => {
        if (!goToInput.value || commandInFlight) return;
        commandInFlight = true;
        setControlsDisabled(true);
        try {
          const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS).catch(() => null);
          const targetTimestamp = displayWallClockToCanonicalTimestamp(goToInput.value, {
            displayTimezone,
            exchangeTimezone,
          });
          const result = await dispatchCommand(CHART_COMMANDS.GO_TO_TIME, {
            targetTimestamp,
            estimatedVisibleBars: metrics?.estimatedVisibleBars || null,
          });
          const visibleTo = result.visibleRange?.to
            ? new Date(result.visibleRange.to * 1000).toISOString()
            : targetTimestamp;
          const requestedText = formatReplayTimestamp(targetTimestamp);
          const visibleText = formatReplayTimestamp(visibleTo);
          status.textContent = result.visibleRange?.to && result.targetTimestamp > result.visibleRange.to
            ? `Viewing ${visibleText}; requested ${requestedText} is beyond cursor.`
            : `Viewing ${requestedText}.`;
          closeGoToPopover();
        } catch (error) {
          status.textContent = error?.message || String(error);
        } finally {
          commandInFlight = false;
          setControlsDisabled(false);
        }
      });

      async function jumpToCursor() {
        if (commandInFlight) return;
        commandInFlight = true;
        setControlsDisabled(true);
        try {
          await dispatchCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW);
          const state = await dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null);
          status.textContent = `Following cursor ${formatReplayTimestamp(state?.cursorTimestamp)}.`;
        } catch (error) {
          status.textContent = error?.message || String(error);
        } finally {
          commandInFlight = false;
          setControlsDisabled(false);
        }
      }

      jumpCursorButton?.addEventListener('click', jumpToCursor);
      jumpCursorPopoverButton.addEventListener('click', async () => {
        await jumpToCursor();
        closeGoToPopover();
      });

      [
        REPLAY_EVENTS.INITIAL_LOADED,
        REPLAY_EVENTS.NEXT,
        REPLAY_EVENTS.PREVIOUS,
        REPLAY_EVENTS.TRUNCATED,
        REPLAY_EVENTS.RESET,
        REPLAY_EVENTS.PLAYBACK_CHANGED,
        REPLAY_EVENTS.DISPLAY_TIMEFRAME_CHANGED,
        REPLAY_EVENTS.DISPLAY_WINDOW_LOADED,
        REPLAY_EVENTS.DISPLAY_RELOADED,
        DISPLAY_TIMEZONE_EVENTS.CHANGED,
        CHART_PRESENTATION_EVENTS.CHANGED,
        CHART_EVENTS.CROSSHAIR_CHANGED,
      ].forEach((eventName) => {
        const unsubscribe = subscribeEvent(eventName, (payload = {}) => {
          if (eventName === CHART_EVENTS.CROSSHAIR_CHANGED) {
            crosshairState = payload.crosshair || { active: false };
            refreshChartOhlcOverlay();
            refreshCrosshairReadout();
            setControlsDisabled();
            return;
          }
          if (eventName === CHART_PRESENTATION_EVENTS.CHANGED) {
            dispatchCommand(CHART_PRESENTATION_COMMANDS.GET)
              .then((settings) => {
                presentationSettings = settings || presentationSettings;
                return syncChartPresentationSettings();
              })
              .finally(() => {
                refreshCrosshairReadout();
                refreshReplayStatus();
              });
            return;
          }
          if (eventName === DISPLAY_TIMEZONE_EVENTS.CHANGED) {
            dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.GET)
              .then((timezone) => {
                displayTimezone = timezone.displayTimezone || displayTimezone;
                exchangeTimezone = timezone.exchangeTimezone || exchangeTimezone;
                return syncChartDisplayTimezone();
              })
              .finally(() => refreshReplayStatus());
            return;
          }
          refreshReplayStatus();
        });
        unsubscribeCallbacks.push(unsubscribe);
      });
      section.dispose = () => {
        disposed = true;
        if (initialLoadTimer !== null) {
          clearTimeout(initialLoadTimer);
          initialLoadTimer = null;
        }
        viewportDemandBridge.stop();
        while (unsubscribeCallbacks.length) {
          unsubscribeCallbacks.pop()();
        }
        dispatchCommand(REPLAY_COMMANDS.PAUSE).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      };
      viewportDemandBridge.start();
      dispatchCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE)
        .then((state) => {
          if (disposed) return;
          crosshairState = state?.crosshair || crosshairState;
          refreshCrosshairReadout();
        })
        .catch(() => null);

      if (params.sessionId) {
        initialLoadTimer = setTimeout(async () => {
          initialLoadTimer = null;
          if (disposed) return;
          status.textContent = 'Loading replay start...';
          setControlsDisabled(true);
          try {
            const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
              sessionId: params.sessionId,
            });
            if (disposed) return;
            replayLoaded = true;
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
            await refreshReplayStatus();
          } catch (error) {
            if (disposed && error?.message === 'Stale replay initial load ignored.') return;
            if (disposed) return;
            status.textContent = error?.message || String(error);
          } finally {
            if (disposed) return;
            setControlsDisabled(false);
          }
        }, 0);
      }
      refreshReplayStatus();
      return section;
    },
  };
}
