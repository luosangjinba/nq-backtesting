import { dispatchCommand } from '../../runtime/commands.js';
import { subscribeEvent } from '../../runtime/events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../../contracts/chart-contracts.js';
import {
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
} from '../../contracts/chart-presentation-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../../contracts/replay-contracts.js';
import { DISPLAY_TIMEZONE_COMMANDS, DISPLAY_TIMEZONE_EVENTS } from '../../contracts/timezone-contracts.js';
import { formatChange, formatInspectionReadout, formatOhlc } from '../../domain/chart-formatting.js';
import {
  displayWallClockToCanonicalTimestamp,
  formatDisplayTimestamp,
} from '../../domain/timezone-format.js';
import { createReplayViewportDemandBridge } from './viewport-demand-wiring.js';

export function createChartReplayRoute() {
  return {
    id: 'chart',
    render({ params = {} } = {}) {
      const sessionId = params.sessionId || 'No session selected';
      const section = document.createElement('section');
      section.className = 'panel chart-panel';
      section.dataset.route = 'chart';
      section.dataset.sessionId = params.sessionId || '';
      section.innerHTML = `
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Replay workstation</div>
            <h2>FX Session Replay</h2>
          </div>
          <span class="runtime-badge">Historical Review</span>
        </div>
        <div class="replay-workstation-toolbar" data-replay-workstation-toolbar>
          <div class="chart-navigation-controls" data-chart-navigation-controls aria-label="Jump to time">
            <button type="button" data-chart-go-to-open disabled>Go to</button>
            <button type="button" data-chart-jump-cursor disabled>Cursor</button>
            <button type="button" data-route-link="setup">Setup</button>
            <button type="button" data-layout-open disabled title="Layout is planned for a later step">Layout</button>
            <button type="button" data-chart-settings-open title="Chart settings" aria-label="Chart settings">Settings</button>
          </div>
        </div>
        <div class="chart-settings-popover" data-chart-settings-popover hidden>
          <div class="chart-settings-panel" role="dialog" aria-modal="false" aria-label="Chart settings">
            <div class="chart-settings-header">
              <strong>Settings</strong>
              <button type="button" data-chart-settings-close aria-label="Close settings">&times;</button>
            </div>
            <div class="chart-settings-body">
              <nav class="chart-settings-tabs" aria-label="Chart settings sections">
                <span aria-current="true">Time</span>
                <span>Status line</span>
                <span>Canvas</span>
              </nav>
              <div class="chart-settings-sections">
                <section>
                  <h3>Time</h3>
                  <div class="display-timezone-controls" data-display-timezone-controls aria-label="Display timezone">
                    <button type="button" data-display-timezone="Exchange" aria-pressed="false">Exchange</button>
                    <button type="button" data-display-timezone="UTC" aria-pressed="false">UTC</button>
                  </div>
                  <div class="presentation-controls" data-presentation-time-controls aria-label="Time format">
                    <button type="button" data-presentation-time-format="24h" aria-pressed="false">24h</button>
                    <button type="button" data-presentation-time-format="12h" aria-pressed="false">12h</button>
                  </div>
                  <label class="display-timeframe-controls" data-display-timeframe-controls aria-label="Display timeframe">
                    <span>Display interval</span>
                    <select data-display-timeframe-select disabled>
                      <optgroup label="Minutes">
                        <option value="1" data-display-timeframe="1">1m</option>
                        <option value="5" data-display-timeframe="5">5m</option>
                      </optgroup>
                      <optgroup label="Hours">
                        <option value="60" data-display-timeframe="60">1H</option>
                      </optgroup>
                      <optgroup label="Days">
                        <option value="1440" data-display-timeframe="1440">1D</option>
                      </optgroup>
                    </select>
                  </label>
                </section>
                <section>
                  <h3>Status line</h3>
                  <div class="presentation-controls" data-presentation-status-controls aria-label="Status line">
                    <button type="button" data-presentation-toggle="showStatusOhlc" aria-pressed="false">OHLC</button>
                    <button type="button" data-presentation-toggle="showStatusChange" aria-pressed="false">Change</button>
                    <button type="button" data-presentation-toggle="showCrosshairReadout" aria-pressed="false">Crosshair</button>
                  </div>
                </section>
                <section>
                  <h3>Canvas</h3>
                  <div class="presentation-controls" data-presentation-canvas-controls aria-label="Canvas">
                    <button type="button" data-presentation-margin="compact" aria-pressed="false">Compact</button>
                    <button type="button" data-presentation-right-offset="16" aria-pressed="false">+16</button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-viewport">
          <div class="chart-host" data-chart-host>
            <span>Starting chart...</span>
          </div>
          <div class="chart-toolbar" data-chart-toolbar aria-label="Chart navigation">
            <button type="button" data-chart-reset-view title="Reset view" aria-label="Reset view" disabled>&#8634;</button>
          </div>
          <div class="replay-floating-controls" data-replay-floating-controls aria-label="Replay controls">
            <div class="replay-drag-handle" data-replay-drag-handle role="button" tabindex="0" aria-label="Move replay controls">::</div>
            <button type="button" data-replay-truncate-to-selection title="Replay to selected bar is planned" aria-label="Replay to selected bar" disabled>|&lt;</button>
            <label class="replay-speed-control" aria-label="Playback speed">
              <span class="sr-only">Playback speed</span>
              <input type="range" data-replay-speed min="100" max="1000" step="100" value="500" disabled>
            </label>
            <div class="replay-controls" data-replay-controls>
              <button type="button" data-replay-previous title="Previous bar is planned" aria-label="Previous bar" disabled>&lt;|</button>
              <button type="button" data-replay-play title="Play replay" aria-label="Play replay" disabled>&#9654;</button>
              <button type="button" data-replay-pause title="Pause replay" aria-label="Pause replay" disabled hidden>&#10073;&#10073;</button>
              <button type="button" data-replay-next title="Next bar" aria-label="Next bar" disabled>&gt;|</button>
            </div>
            <label class="replay-interval-controls" data-replay-interval-controls aria-label="Replay interval">
              <span class="sr-only">Replay interval</span>
              <select data-replay-interval-select disabled title="Replay interval sync is planned">
                <optgroup label="Minutes">
                  <option value="1">1m</option>
                  <option value="5">5m</option>
                </optgroup>
                <optgroup label="Hours">
                  <option value="60">1H</option>
                </optgroup>
                <optgroup label="Days">
                  <option value="1440">1D</option>
                </optgroup>
              </select>
            </label>
            <label class="replay-sync-control" title="Sync replay interval with active chart interval is planned">
              <span class="sr-only">Sync active chart interval</span>
              <input type="checkbox" data-replay-sync-interval disabled>
            </label>
          </div>
          <div class="chart-go-to-popover" data-chart-go-to-popover hidden>
            <div class="chart-go-to-panel" role="dialog" aria-modal="false" aria-label="Go to time">
              <div class="chart-go-to-header">
                <strong>Go to</strong>
                <button type="button" data-chart-go-to-cancel aria-label="Close go to">&times;</button>
              </div>
              <label>
                Date and time
                <input type="datetime-local" data-chart-go-to-input>
              </label>
              <div class="chart-go-to-actions">
                <button type="button" data-chart-go-to-cancel>Cancel</button>
                <button type="button" data-chart-go-to disabled>Go</button>
                <button type="button" data-chart-jump-cursor-popover disabled>Cursor</button>
                <button type="button" data-replay-reset disabled>Reset replay</button>
              </div>
            </div>
          </div>
        </div>
        <div class="replay-footer" data-replay-footer>
          <div class="session-chip">Session <strong data-session-id-label></strong></div>
          <div class="replay-status-grid" data-replay-status>
            <span>Start <strong data-replay-start>--</strong></span>
            <span>Cursor <strong data-replay-cursor>--</strong></span>
            <span>End <strong data-replay-end>--</strong></span>
            <span>Revealed <strong data-replay-revealed-count>0</strong></span>
            <span>Playback <strong data-replay-playback>Paused</strong></span>
            <span>State <strong data-replay-state>Idle</strong></span>
            <span data-status-ohlc-row>OHLC <strong data-status-ohlc>--</strong></span>
            <span data-status-change-row>Change <strong data-status-change>--</strong></span>
            <span data-crosshair-row>Inspect <strong data-crosshair-inspection-readout>--</strong></span>
          </div>
          <p data-replay-load-status>Waiting for replay session.</p>
        </div>
      `;
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
      const statusChangeLabel = section.querySelector('[data-status-change]');
      const crosshairRow = section.querySelector('[data-crosshair-row]');
      const crosshairReadoutLabel = section.querySelector('[data-crosshair-inspection-readout]');
      const chartViewport = section.querySelector('.chart-viewport');
      const replayFloatingControls = section.querySelector('[data-replay-floating-controls]');
      const replayDragHandle = section.querySelector('[data-replay-drag-handle]');
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
      const displayTimezoneButtons = Array.from(section.querySelectorAll('[data-display-timezone]'));
      const presentationTimeFormatButtons = Array.from(section.querySelectorAll('[data-presentation-time-format]'));
      const presentationToggleButtons = Array.from(section.querySelectorAll('[data-presentation-toggle]'));
      const presentationMarginButtons = Array.from(section.querySelectorAll('[data-presentation-margin]'));
      const presentationRightOffsetButtons = Array.from(section.querySelectorAll('[data-presentation-right-offset]'));
      const goToPopover = section.querySelector('[data-chart-go-to-popover]');
      const goToOpenButton = section.querySelector('[data-chart-go-to-open]');
      const goToCancelButtons = Array.from(section.querySelectorAll('[data-chart-go-to-cancel]'));
      const goToInput = section.querySelector('[data-chart-go-to-input]');
      const goToButton = section.querySelector('[data-chart-go-to]');
      const jumpCursorButton = section.querySelector('[data-chart-jump-cursor]');
      const jumpCursorPopoverButton = section.querySelector('[data-chart-jump-cursor-popover]');
      const chartSettingsPopover = section.querySelector('[data-chart-settings-popover]');
      const chartSettingsOpenButton = section.querySelector('[data-chart-settings-open]');
      const chartSettingsCloseButton = section.querySelector('[data-chart-settings-close]');
      const layoutOpenButton = section.querySelector('[data-layout-open]');
      const chartToolbarButtons = Array.from(section.querySelectorAll('[data-chart-toolbar] button'));
      const resetViewButton = section.querySelector('[data-chart-reset-view]');
      let commandInFlight = false;
      let replayLoaded = false;
      let playbackPlaying = false;
      let playbackIntervalMs = 500;
      let terminalReason = '';
      let revealedCount = 0;
      let startTimestamp = null;
      let cursorTimestamp = null;
      let displayTimeframe = null;
      let replayIntervalTimeframe = null;
      let displayTimezone = 'Exchange';
      let exchangeTimezone = 'America/New_York';
      let floatingPosition = null;
      let floatingDragState = null;
      let presentationSettings = {
        timeFormat: '24h',
        showStatusOhlc: true,
        showStatusChange: true,
        showCrosshairReadout: true,
      };
      let crosshairState = { active: false };
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
        replayIntervalTimeframe = Number(state?.session?.timeframe || replayIntervalTimeframe || displayTimeframe || 1);
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
        });
      }

      function refreshStatusLineValues(state) {
        const latest = Array.isArray(state?.displayBars) ? state.displayBars.at(-1) : null;
        statusOhlcRow.hidden = !presentationSettings.showStatusOhlc;
        statusChangeRow.hidden = !presentationSettings.showStatusChange;
        if (!latest) {
          statusOhlcLabel.textContent = '--';
          statusChangeLabel.textContent = '--';
          return;
        }
        statusOhlcLabel.textContent = formatOhlc(latest);
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

      function selectedCrosshairTimestamp() {
        if (!crosshairState?.active) return null;
        return crosshairState.time || crosshairState.bar?.time || null;
      }

      function isSelectedReplayBarTruncatable() {
        const selected = selectedCrosshairTimestamp();
        if (!selected || !startTimestamp || !cursorTimestamp) return false;
        const selectedMs = Date.parse(selected);
        const startMs = Date.parse(startTimestamp);
        const cursorMs = Date.parse(cursorTimestamp);
        return Number.isFinite(selectedMs)
          && Number.isFinite(startMs)
          && Number.isFinite(cursorMs)
          && selectedMs >= startMs
          && selectedMs <= cursorMs;
      }

      function setControlsDisabled(disabled = false) {
        const unavailable = disabled || commandInFlight || !replayLoaded || !params.sessionId;
        nextButton.disabled = unavailable;
        playButton.disabled = unavailable || playbackPlaying;
        pauseButton.disabled = unavailable || !playbackPlaying;
        resetButton.disabled = unavailable;
        replayTruncateButton.disabled = unavailable || !isSelectedReplayBarTruncatable();
        replayPreviousButton.disabled = unavailable || revealedCount <= 0;
        replaySpeedInput.disabled = unavailable;
        replayIntervalSelect.disabled = true;
        replaySyncIntervalInput.disabled = true;
        goToInput.disabled = unavailable;
        goToOpenButton.disabled = unavailable;
        goToButton.disabled = unavailable || !goToInput.value;
        jumpCursorButton.disabled = unavailable;
        jumpCursorPopoverButton.disabled = unavailable;
        layoutOpenButton.disabled = true;
        chartToolbarButtons.forEach((button) => {
          button.disabled = unavailable;
        });
        displayTimeframeSelect.disabled = unavailable;
        playButton.hidden = playbackPlaying;
        pauseButton.hidden = !playbackPlaying;
      }

      function updateDisplayTimeframeButtons() {
        displayTimeframeSelect.value = displayTimeframe ? String(displayTimeframe) : '1';
        replayIntervalSelect.value = replayIntervalTimeframe ? String(replayIntervalTimeframe) : '1';
        replaySpeedInput.value = String(playbackIntervalMs);
      }

      function updateDisplayTimezoneButtons() {
        displayTimezoneButtons.forEach((button) => {
          const pressed = button.dataset.displayTimezone === displayTimezone;
          button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });
      }

      function clampFloatingPosition(position) {
        const viewportRect = chartViewport.getBoundingClientRect();
        const controlsRect = replayFloatingControls.getBoundingClientRect();
        const axisRightPadding = 78;
        const axisBottomPadding = 52;
        const edgePadding = 12;
        const minLeft = edgePadding;
        const minTop = edgePadding;
        const maxLeft = Math.max(
          minLeft,
          viewportRect.width - controlsRect.width - axisRightPadding
        );
        const maxTop = Math.max(
          minTop,
          viewportRect.height - controlsRect.height - axisBottomPadding
        );
        return {
          left: Math.min(Math.max(position.left, minLeft), maxLeft),
          top: Math.min(Math.max(position.top, minTop), maxTop),
        };
      }

      function applyFloatingPosition(position) {
        const nextPosition = clampFloatingPosition(position);
        floatingPosition = nextPosition;
        replayFloatingControls.style.left = `${Math.round(nextPosition.left)}px`;
        replayFloatingControls.style.top = `${Math.round(nextPosition.top)}px`;
        replayFloatingControls.style.right = 'auto';
        replayFloatingControls.style.bottom = 'auto';
        replayFloatingControls.style.transform = 'none';
        replayFloatingControls.dataset.dragged = 'true';
      }

      function getCurrentFloatingPosition() {
        const viewportRect = chartViewport.getBoundingClientRect();
        const controlsRect = replayFloatingControls.getBoundingClientRect();
        return {
          left: controlsRect.left - viewportRect.left,
          top: controlsRect.top - viewportRect.top,
        };
      }

      function beginFloatingDrag(event) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const startPosition = floatingPosition || getCurrentFloatingPosition();
        floatingDragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: startPosition.left,
          startTop: startPosition.top,
        };
        replayFloatingControls.dataset.dragging = 'true';
        try {
          replayDragHandle.setPointerCapture?.(event.pointerId);
        } catch {
          // Synthetic pointer events in browser smokes may not have an active pointer capture target.
        }
      }

      function moveFloatingDrag(event) {
        if (!floatingDragState || floatingDragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        applyFloatingPosition({
          left: floatingDragState.startLeft + event.clientX - floatingDragState.startX,
          top: floatingDragState.startTop + event.clientY - floatingDragState.startY,
        });
      }

      function endFloatingDrag(event) {
        if (!floatingDragState || floatingDragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          replayDragHandle.releasePointerCapture?.(event.pointerId);
        } catch {
          // See pointer capture note in beginFloatingDrag.
        }
        floatingDragState = null;
        delete replayFloatingControls.dataset.dragging;
      }

      replayDragHandle.addEventListener('pointerdown', beginFloatingDrag);
      replayDragHandle.addEventListener('pointermove', moveFloatingDrag);
      replayDragHandle.addEventListener('pointerup', endFloatingDrag);
      replayDragHandle.addEventListener('pointercancel', endFloatingDrag);

      function updatePresentationButtons() {
        presentationTimeFormatButtons.forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            button.dataset.presentationTimeFormat === presentationSettings.timeFormat ? 'true' : 'false'
          );
        });
        presentationToggleButtons.forEach((button) => {
          const key = button.dataset.presentationToggle;
          button.setAttribute('aria-pressed', presentationSettings[key] ? 'true' : 'false');
        });
        presentationMarginButtons.forEach((button) => {
          const compact = presentationSettings.margins?.topPercent === 6
            && presentationSettings.margins?.bottomPercent === 6;
          button.setAttribute('aria-pressed', compact ? 'true' : 'false');
        });
        presentationRightOffsetButtons.forEach((button) => {
          const pressed = Number(button.dataset.presentationRightOffset) === Number(presentationSettings.rightOffsetBars);
          button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        });
      }

      async function syncChartDisplayTimezone() {
        await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
          displayTimezone,
          exchangeTimezone,
          timeFormat: presentationSettings.timeFormat,
        }).catch(() => null);
      }

      async function syncChartPresentationSettings() {
        await dispatchCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, {
          timeFormat: presentationSettings.timeFormat,
          showCrosshairReadout: presentationSettings.showCrosshairReadout,
          margins: presentationSettings.margins,
          rightOffsetBars: presentationSettings.rightOffsetBars,
        }).catch(() => null);
      }

      async function runReplayCommand(action) {
        if (commandInFlight || !params.sessionId) return null;
        commandInFlight = true;
        setControlsDisabled(true);
        try {
          return await action();
        } finally {
          commandInFlight = false;
          setControlsDisabled(false);
        }
      }

      nextButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.NEXT, {
          sessionId: params.sessionId,
        }));
        if (!state) return;
        terminalReason = state.advanced ? '' : state.reason || 'stopped';
        status.textContent = state.advanced
          ? `Loaded ${state.displayBars.length} bars.`
          : `Replay stopped: ${state.reason || 'no next bar'}.`;
        await refreshReplayStatus();
      });

      replayTruncateButton.addEventListener('click', async () => {
        const selectedTimestamp = selectedCrosshairTimestamp();
        if (!selectedTimestamp) return;
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
      });

      replayPreviousButton.addEventListener('click', async () => {
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
          sessionId: params.sessionId,
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

      displayTimeframeSelect.addEventListener('change', async () => {
        const nextDisplayTimeframe = Number(displayTimeframeSelect.value);
        if (!nextDisplayTimeframe || nextDisplayTimeframe === displayTimeframe) return;
        const selectedOption = displayTimeframeSelect.selectedOptions[0];
        const state = await runReplayCommand(() => dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
          sessionId: params.sessionId,
          displayTimeframe: nextDisplayTimeframe,
        }));
        if (!state) return;
        displayTimeframe = Number(state.displayTimeframe || nextDisplayTimeframe);
        status.textContent = `Loaded ${state.displayBars?.length || 0} ${selectedOption?.textContent || ''} bars.`;
        updateDisplayTimeframeButtons();
        await refreshReplayStatus();
      });

      displayTimezoneButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const nextDisplayTimezone = button.dataset.displayTimezone;
          if (!nextDisplayTimezone || nextDisplayTimezone === displayTimezone) return;
          const timezone = await dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.SET, {
            displayTimezone: nextDisplayTimezone,
          });
          displayTimezone = timezone.displayTimezone;
          exchangeTimezone = timezone.exchangeTimezone;
          await syncChartDisplayTimezone();
          updateDisplayTimezoneButtons();
          await refreshReplayStatus();
        });
      });

      presentationTimeFormatButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const timeFormat = button.dataset.presentationTimeFormat;
          if (!timeFormat || timeFormat === presentationSettings.timeFormat) return;
          presentationSettings = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, { timeFormat });
          await syncChartPresentationSettings();
          updatePresentationButtons();
          await refreshReplayStatus();
        });
      });

      presentationToggleButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const key = button.dataset.presentationToggle;
          if (!key) return;
          presentationSettings = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
            [key]: !presentationSettings[key],
          });
          await syncChartPresentationSettings();
          updatePresentationButtons();
          await refreshReplayStatus();
        });
      });

      presentationMarginButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          presentationSettings = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
            margins: {
              topPercent: 6,
              bottomPercent: 6,
            },
          });
          await syncChartPresentationSettings();
          updatePresentationButtons();
        });
      });

      presentationRightOffsetButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          presentationSettings = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
            rightOffsetBars: Number(button.dataset.presentationRightOffset),
          });
          await syncChartPresentationSettings();
          updatePresentationButtons();
        });
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

      function openChartSettings() {
        chartSettingsPopover.hidden = false;
        chartSettingsCloseButton.focus();
      }

      function closeChartSettings() {
        chartSettingsPopover.hidden = true;
        chartSettingsOpenButton.focus();
      }

      chartSettingsOpenButton.addEventListener('click', openChartSettings);
      chartSettingsCloseButton.addEventListener('click', closeChartSettings);
      chartSettingsPopover.addEventListener('click', (event) => {
        if (event.target === chartSettingsPopover) {
          closeChartSettings();
        }
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

      jumpCursorButton.addEventListener('click', jumpToCursor);
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
          crosshairState = state?.crosshair || crosshairState;
          refreshCrosshairReadout();
        })
        .catch(() => null);

      if (params.sessionId) {
        setTimeout(async () => {
          status.textContent = 'Loading replay start...';
          setControlsDisabled(true);
          try {
            const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
              sessionId: params.sessionId,
            });
            replayLoaded = true;
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
            await refreshReplayStatus();
          } catch (error) {
            status.textContent = error?.message || String(error);
          } finally {
            setControlsDisabled(false);
          }
        }, 0);
      }
      refreshReplayStatus();
      return section;
    },
  };
}
