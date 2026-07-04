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
import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
} from '../../contracts/layout-contracts.js';
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
import { createChartReplayControlsController } from './chart-replay-controls.js';
import { createChartReplayNavigationController } from './chart-replay-navigation.js';
import { createChartReplayStatusController } from './chart-replay-status.js';
import { createChartReplayTruncateController } from './chart-replay-truncate.js';
import { createChartReplayLayoutController } from './chart-replay-layout.js';
import { createChartReplayLayoutSyncController } from './chart-replay-layout-sync-controller.js';
import { createChartReplayPaneShellController } from './chart-replay-pane-shell.js';
import { createChartReplayPaneOrchestrator } from './chart-replay-pane-orchestrator.js';
import { createReplayFloatingControlsController } from './replay-floating-controls.js';
import { createReplayViewportDemandBridge } from './viewport-demand-wiring.js';

export function createChartReplayRoute() {
  return {
    id: 'chart',
    render({ params = {} } = {}) {
      const sessionId = params.sessionId || 'No session selected';
      const activePaneId = DEFAULT_ACTIVE_PANE_ID;
      const section = document.createElement('section');
      section.className = 'panel chart-panel';
      section.dataset.route = 'chart';
      section.dataset.sessionId = params.sessionId || '';
      section.dataset.activePaneId = activePaneId;
      section.dataset.activePaneCount = String(DEFAULT_LAYOUT_STATE.panes.length);
      section.dataset.layoutMode = DEFAULT_LAYOUT_STATE.mode;
      section.innerHTML = renderChartReplayTemplate({ activePaneId });
      const status = section.querySelector('[data-replay-load-status]');
      let commandInFlight = false;
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
      let replayDisplayTimeframe = null;
      let replayIntervalTimeframe = null;
      let replayIntervalSync = false;
      let currentLayoutState = DEFAULT_LAYOUT_STATE;
      let displayTimezone = 'Exchange';
      let exchangeTimezone = 'America/New_York';
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
        showBarCountdown: DEFAULT_CHART_PRESENTATION_SETTINGS.showBarCountdown,
        margins: { ...DEFAULT_CHART_PRESENTATION_SETTINGS.margins },
        rightOffsetBars: DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars,
        candleStyle: cloneCandleStyle(),
        gridStyle: cloneGridStyle(),
        crosshairStyle: cloneCrosshairStyle(),
        backgroundStyle: cloneBackgroundStyle(),
        scaleStyle: cloneScaleStyle(),
        watermarkStyle: cloneWatermarkStyle(),
      };
      const unsubscribeCallbacks = [];
      const controllerDisposers = [];
      function trackController(controller) {
        if (controller && typeof controller.dispose === 'function') {
          controllerDisposers.push(() => controller.dispose());
        }
        return controller;
      }
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
      const paneOrchestrator = trackController(createChartReplayPaneOrchestrator({
        root: section,
        dispatchCommand,
        getLayoutState: () => currentLayoutState,
        onLayoutStateChange: (layoutState) => {
          currentLayoutState = layoutState;
        },
        onDisplayTimeframeChange: (value) => {
          displayTimeframe = Number(value || 0);
        },
        setReplayDisplayTimeframe: (value) => {
          replayDisplayTimeframe = Number(value || 0);
        },
        getReplayDisplayTimeframe: () => replayDisplayTimeframe,
        getSessionTimeframe: () => sessionTimeframe,
        getDisplayTimeframeFallback: () => displayTimeframe,
        getSessionId: () => params.sessionId || '',
        getReplayLoaded: () => replayLoaded,
        setStatusText: (message) => {
          status.textContent = message;
        },
        renderLayoutState: (layoutState) => layoutController?.renderState(layoutState),
        renderPaneShellState: (layoutState) => paneShellController?.renderState(layoutState),
        refreshChartOhlcOverlay: () => statusController.refreshChartOhlcOverlay(),
        renderReplayControls: () => replayControlsController?.renderControls(),
        setReplayControlsDisabled: () => replayControlsController?.setControlsDisabled(),
      }));
      const statusController = createChartReplayStatusController({
        root: section,
        getDisplayTimezone: () => displayTimezone,
        getExchangeTimezone: () => exchangeTimezone,
        getPresentationSettings: () => presentationSettings,
        getDisplayTimeframe: () => displayTimeframe,
      });
      statusController.setSessionId(sessionId);
      trackController(createReplayFloatingControlsController({ root: section }));
      let replayControlsController = null;
      let truncateController = null;
      let navigationController = null;
      let layoutController = null;
      let layoutSyncController = null;
      let paneShellController = null;
      const chartSettingsController = trackController(createChartSettingsController({
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
            showBarCountdown: draft.showBarCountdown,
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
      }));
      replayControlsController = trackController(createChartReplayControlsController({
        root: section,
        dispatchCommand,
        getSessionId: () => params.sessionId || '',
        getReplayLoaded: () => replayLoaded,
        getPlaybackPlaying: () => playbackPlaying,
        setPlaybackPlaying: (value) => {
          playbackPlaying = Boolean(value);
        },
        getPlaybackIntervalMs: () => playbackIntervalMs,
        setPlaybackIntervalMs: (value) => {
          playbackIntervalMs = Number(value);
        },
        getTerminalReason: () => terminalReason,
        setTerminalReason: (value) => {
          terminalReason = value || '';
        },
        getRevealedCount: () => revealedCount,
        getSessionTimeframe: () => sessionTimeframe,
        getDisplayTimeframe: () => displayTimeframe,
        setDisplayTimeframe: (value) => {
          displayTimeframe = Number(value || 0);
        },
        setActivePaneDisplayTimeframe: (payload) => paneOrchestrator.setActivePaneDisplayTimeframe(payload),
        getReplayIntervalTimeframe: () => replayIntervalTimeframe,
        setReplayIntervalTimeframe: (value) => {
          replayIntervalTimeframe = Number(value || 0);
        },
        getReplayIntervalSync: () => replayIntervalSync,
        setReplayIntervalSync: (value) => {
          replayIntervalSync = Boolean(value);
        },
        getTruncatePickMode: () => truncateController?.isPickMode() || false,
        getGoToInputValue: () => navigationController?.getGoToInputValue() || '',
        formatReplayTimestamp,
        refreshReplayStatus,
        setStatusText: (message) => {
          status.textContent = message;
        },
        getCommandInFlight: () => commandInFlight,
        setCommandInFlight: (value) => {
          commandInFlight = Boolean(value);
        },
      }));
      layoutSyncController = trackController(createChartReplayLayoutSyncController({
        syncTime: (time) => syncLayoutTime(time),
        syncDateRange: (visibleRange) => syncLayoutDateRange(visibleRange),
        syncCrosshair: (crosshair) => syncLayoutCrosshair(crosshair),
        onCrosshairChanged: (payload) => {
          statusController.setCrosshairState(payload.crosshair || { active: false });
          replayControlsController.setControlsDisabled();
          return syncLayoutCrosshair(payload.crosshair).catch(() => null);
        },
        onVisibleRangeChanged: (payload) => (
          syncLayoutDateRange(payload.visibleRange).finally(() => refreshReplayStatus())
        ),
      }));
      navigationController = trackController(createChartReplayNavigationController({
        root: section,
        dispatchCommand,
        getDisplayTimezone: () => displayTimezone,
        getExchangeTimezone: () => exchangeTimezone,
        formatReplayTimestamp,
        getCommandInFlight: () => commandInFlight,
        setCommandInFlight: (value) => {
          commandInFlight = Boolean(value);
        },
        setControlsDisabled: (disabled) => replayControlsController.setControlsDisabled(disabled),
        setStatusText: (message) => {
          status.textContent = message;
        },
        syncLayoutTime: (time) => layoutSyncController.syncTime(time),
        getActivePaneId: () => paneOrchestrator.getActivePaneId(),
      }));
      truncateController = trackController(createChartReplayTruncateController({
        root: section,
        dispatchCommand,
        getSessionId: () => params.sessionId || '',
        getReplayLoaded: () => replayLoaded,
        getStartTimestamp: () => startTimestamp,
        getCursorTimestamp: () => cursorTimestamp,
        formatReplayTimestamp,
        runReplayCommand: (action) => replayControlsController.runReplayCommand(action),
        refreshReplayStatus,
        setControlsDisabled: (disabled) => replayControlsController.setControlsDisabled(disabled),
        setTerminalReason: (value) => {
          terminalReason = value || '';
        },
        setStatusText: (message) => {
          status.textContent = message;
        },
      }));

      async function refreshReplayStatus() {
        if (!section.isConnected && section.parentElement === null) return;
        const [state, playback, displayContext, timezoneContext, presentationContext] = await Promise.all([
          dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE).catch(() => null),
          dispatchCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT).catch(() => null),
          dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.GET).catch(() => null),
          dispatchCommand(CHART_PRESENTATION_COMMANDS.GET).catch(() => null),
        ]);
        replayDisplayTimeframe = Number(displayContext?.displayTimeframe
          || state?.displayTimeframe
          || state?.session?.timeframe
          || 0);
        displayTimeframe = activePaneDisplayTimeframe();
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
        statusController.renderReplayStatus({
          state,
          playbackPlaying,
          terminalReason,
          revealedCount,
        });
        if (terminalReason) {
          status.textContent = `Replay stopped: ${terminalReason}.`;
        }
        replayControlsController.renderControls();
        updateDisplayTimezoneButtons();
        updatePresentationButtons();
        replayControlsController.setControlsDisabled();
      }

      function formatReplayTimestamp(value) {
        return statusController.formatReplayTimestamp(value);
      }

      function updateDisplayTimezoneButtons() {
        chartSettingsController.renderCurrent();
      }

      function updatePresentationButtons() {
        chartSettingsController.renderCurrent();
      }

      function activePaneDisplayTimeframe(layoutState = currentLayoutState) {
        return paneOrchestrator.activeDisplayTimeframe(layoutState);
      }

      function ensureNonPrimaryPaneDisplays(layoutState = currentLayoutState) {
        return paneOrchestrator.ensureNonPrimaryPaneDisplays(layoutState);
      }

      function applyLayoutState(layoutState = DEFAULT_LAYOUT_STATE) {
        return paneOrchestrator.applyLayoutState(layoutState);
      }

      async function syncLayoutTime(time) {
        if (!time) return null;
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_TIME, {
          paneId: paneOrchestrator.getActivePaneId(),
          time,
        });
        applyLayoutState(layoutState);
        return layoutState;
      }

      async function syncLayoutDateRange(visibleRange) {
        if (!visibleRange || !currentLayoutState.sync?.dateRange) return null;
        const from = visibleRange.from == null ? null : new Date(Number(visibleRange.from) * 1000).toISOString();
        const to = visibleRange.to == null ? null : new Date(Number(visibleRange.to) * 1000).toISOString();
        if (!from || !to) return null;
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, {
          paneId: paneOrchestrator.getActivePaneId(),
          dateRange: { from, to },
        });
        applyLayoutState(layoutState);
        return layoutState;
      }

      async function syncLayoutCrosshair(crosshair) {
        if (!currentLayoutState.sync?.crosshair) return null;
        const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR, {
          paneId: paneOrchestrator.getActivePaneId(),
          crosshair: crosshair || { active: false },
        });
        applyLayoutState(layoutState);
        return layoutState;
      }

      paneShellController = trackController(createChartReplayPaneShellController({
        root: section,
        dispatchCommand,
        onLayoutState: applyLayoutState,
        setStatusText: (message) => {
          status.textContent = message;
        },
      }));
      layoutController = trackController(createChartReplayLayoutController({
        root: section,
        dispatchCommand,
        onLayoutState: applyLayoutState,
        setStatusText: (message) => {
          status.textContent = message;
        },
      }));

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
        LAYOUT_EVENTS.CHANGED,
        CHART_EVENTS.VISIBLE_RANGE_CHANGED,
        CHART_EVENTS.CROSSHAIR_CHANGED,
      ].forEach((eventName) => {
        const unsubscribe = subscribeEvent(eventName, (payload = {}) => {
          if (eventName === LAYOUT_EVENTS.CHANGED) {
            applyLayoutState(payload);
            return;
          }
          if (eventName === CHART_EVENTS.CROSSHAIR_CHANGED) {
            layoutSyncController.handleCrosshairChanged(payload);
            return;
          }
          if (eventName === CHART_EVENTS.VISIBLE_RANGE_CHANGED) {
            layoutSyncController.handleVisibleRangeChanged(payload);
            return;
          }
          if (eventName === CHART_PRESENTATION_EVENTS.CHANGED) {
            dispatchCommand(CHART_PRESENTATION_COMMANDS.GET)
              .then((settings) => {
                presentationSettings = settings || presentationSettings;
                return syncChartPresentationSettings();
              })
              .finally(() => {
                statusController.refreshCrosshairReadout();
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
        while (controllerDisposers.length) {
          controllerDisposers.pop()();
        }
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
      paneOrchestrator.applyLayoutState(currentLayoutState);
      dispatchCommand(LAYOUT_COMMANDS.GET_STATE)
        .then((layoutState) => {
          if (disposed) return;
          applyLayoutState(layoutState);
        })
        .catch(() => null);
      dispatchCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE)
        .then((state) => {
          if (disposed) return;
          statusController.setCrosshairState(state?.crosshair || { active: false });
        })
        .catch(() => null);

      if (params.sessionId) {
        initialLoadTimer = setTimeout(async () => {
          initialLoadTimer = null;
          if (disposed) return;
          status.textContent = 'Loading replay start...';
          replayControlsController.setControlsDisabled(true);
          try {
            const state = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
              sessionId: params.sessionId,
            });
            if (disposed) return;
            replayLoaded = true;
            status.textContent = `Loaded ${state.displayBars.length} bars.`;
            await refreshReplayStatus();
            ensureNonPrimaryPaneDisplays();
          } catch (error) {
            if (disposed && error?.message === 'Stale replay initial load ignored.') return;
            if (disposed) return;
            status.textContent = error?.message || String(error);
          } finally {
            if (disposed) return;
            replayControlsController.setControlsDisabled(false);
          }
        }, 0);
      }
      refreshReplayStatus();
      return section;
    },
  };
}
