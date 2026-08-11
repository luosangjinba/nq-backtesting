import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { readPaneLayout } from '../pane-layout-domain/public.js';
import { readLayoutSync } from '../layout-sync-domain/public.js';
import { readReplayStep } from '../replay-contract/public.js';
import { createTimePresentation, readWorkstationSettings } from '../workstation-settings/public.js';
import { setControlDisabled } from './control-availability.js';
import { workspaceErrorCopy } from './workspace-error-copy.js';
import { createWorkspaceViewElements } from './workspace-view-elements.js';

export const REPLAY_WORKSPACE_STATES = Object.freeze([
  'loading', 'empty', 'unavailable', 'stale', 'error', 'ready',
]);

/** Own the real one/multi-Pane workstation presentation and dispatch UI intents. */
export function createReplayWorkspaceView(options) {
  const instrumentLabels = new Map(options.instrumentOptions.map(({ id, label }) => [id, label]));
  let activeWorkstationSettings = options.getWorkstationSettings().settings;
  readWorkstationSettings(activeWorkstationSettings);
  let exactDefaultEpochMs = options.replayRange.startEpochMs;
  const elements = createWorkspaceViewElements(options, {
    activeWorkstationSettings,
    getExactDefaultEpochMs: () => exactDefaultEpochMs,
  });
  const {
    annotationWorkflow, exactGoto, goto, instrumentControl, overlay, overlayCopy, overlayTitle, paneGrid,
    paneLayoutControl, paneTimeLocationMenu, replayTransport, restartButton, root,
    sessionHoursControl, sessionRange, status, timeframeControl, visibleThrough, workstationSettings,
  } = elements;
  const timeframeLabels = new Map(options.timeframeMenuGroups.flatMap(({ items }) => (
    items.map(({ id, label }) => [id, label])
  )));
  let activePaneId = 'pane-main', complete = false, hasAcceptedChart = false;
  let interactionPending = false, annotationInteractionPending = false;
  let gotoFeedback = null, gotoFeedbackTimeout = null, playback = 'paused';
  let truncationError = null, truncationSelectionActive = false, viewState = 'loading';
  let workspaceError = null, cursorEpochMs = null, sessionRangeEpochs = null;
  let visibleThroughState = null;

  function onDocumentKeydown(event) {
    if (event.key !== 'Escape' || !truncationSelectionActive) return;
    event.preventDefault();
    options.onTruncation();
  }

  document.addEventListener('keydown', onDocumentKeydown);

  function renderTimePresentation() {
    const presentation = createTimePresentation(activeWorkstationSettings);
    root.dataset.cursorText = cursorEpochMs === null
      ? 'No Session bar visible'
      : presentation.formatDateTime(cursorEpochMs);
    if (sessionRangeEpochs !== null) {
      sessionRange.textContent = `Session · ${presentation.formatDateTime(sessionRangeEpochs.startEpochMs)}`
        + ` → ${presentation.formatDateTime(sessionRangeEpochs.endEpochMs)}`;
    }
    if (visibleThroughState !== null) {
      const { barCount, paneCount, visibleThroughEpochMs } = visibleThroughState;
      const visibleThroughText = visibleThroughEpochMs === null
        ? 'No Session bar visible'
        : presentation.formatDateTime(visibleThroughEpochMs);
      visibleThrough.textContent = `Visible through · ${visibleThroughText}`
        + ` · ${barCount} bars${paneCount > 1 ? ` · ${paneCount} panes` : ''}`;
    }
  }

  function renderAvailability() {
    const workspaceBusy = interactionPending || viewState === 'loading' || viewState === 'stale';
    const busy = workspaceBusy || annotationInteractionPending;
    const interactionLocked = busy || truncationSelectionActive;
    const unavailable = viewState === 'unavailable';
    const stableRefresh = busy && hasAcceptedChart;
    const setAction = (control, intrinsicallyDisabled) => setControlDisabled(control, {
      disabled: interactionLocked || intrinsicallyDisabled,
      preserveVisual: stableRefresh && !intrinsicallyDisabled,
    });
    setAction(restartButton, unavailable);
    workstationSettings.setDisabled(unavailable);
    timeframeControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    const instrumentUnavailable = unavailable || options.instrumentOptions.length < 2;
    instrumentControl.setDisabled(interactionLocked || instrumentUnavailable, stableRefresh && !instrumentUnavailable);
    sessionHoursControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    paneLayoutControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    goto.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    exactGoto.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    replayTransport.setAvailability({ busy, complete, hasAcceptedChart, unavailable });
    paneGrid.setPending(interactionLocked || unavailable);
    annotationWorkflow.setWorkspaceDisabled(workspaceBusy || truncationSelectionActive || unavailable);
    root.setAttribute('aria-busy', String(busy));
  }

  function renderStatus() {
    if (truncationSelectionActive) {
      status.hidden = false;
      status.className = `workspace-inline-status ${truncationError ? 'status-error' : 'status-selection'}`;
      status.textContent = truncationError
        ?? 'Select a Session candle to hide it and every later candle.';
      return;
    }
    const visibleError = viewState === 'error' && hasAcceptedChart;
    status.hidden = !visibleError && gotoFeedback === null;
    status.className = `workspace-inline-status ${visibleError ? `status-${viewState}` : 'status-goto'}`;
    status.textContent = visibleError
      ? (workspaceError ?? 'Update failed')
      : (gotoFeedback ?? '');
  }

  function setState(state, detail = {}) {
    if (!REPLAY_WORKSPACE_STATES.includes(state)) throw new TypeError(`Unsupported workspace state ${state}.`);
    viewState = state;
    workspaceError = state === 'error' ? workspaceErrorCopy(detail.message) : null;
    root.dataset.viewState = state;
    if (state === 'ready') hasAcceptedChart = true;
    overlay.hidden = state === 'ready' || state === 'stale' || (state === 'error' && hasAcceptedChart);
    overlay.className = `chart-state-overlay state-${state}`;
    overlayTitle.textContent = detail.title ?? {
      loading: 'Preparing replay chart', empty: 'No visible bars', unavailable: 'Chart unavailable',
      stale: 'Applying complete Pane set', error: 'Replay update failed', ready: '',
    }[state];
    overlayCopy.textContent = state === 'error' && detail.message !== undefined
      ? workspaceError
      : detail.message ?? {
      loading: 'Projecting the first no-future snapshot.', empty: 'No visible Pane has eligible bars.',
      unavailable: 'This Session asset set is not available.',
      stale: 'The last accepted Pane set remains authoritative while this update settles.',
      error: 'The last accepted Pane set and Replay cursor were preserved.', ready: '',
    }[state];
    renderStatus();
    renderAvailability();
  }

  return Object.freeze({
    dispose() {
      if (gotoFeedbackTimeout !== null) clearTimeout(gotoFeedbackTimeout);
      document.removeEventListener('keydown', onDocumentKeydown);
      elements.dispose();
    },
    openExactGoto: exactGoto.open,
    openPaneTimeLocationMenu: paneTimeLocationMenu.open,
    root,
    setCursor(epochMs) {
      cursorEpochMs = epochMs;
      root.dataset.cursorEpochMs = epochMs === null ? '' : String(epochMs);
      renderTimePresentation();
    },
    setAnnotationWorkflow(snapshot) {
      annotationInteractionPending = snapshot?.busy === true;
      root.dataset.annotationWorkflowStatus = snapshot?.status ?? 'unavailable';
      root.dataset.annotationInspectorOpen = String(snapshot?.inspector?.open === true);
      annotationWorkflow.setSnapshot(snapshot);
      renderAvailability();
    },
    setEvidence({ replayRevision, workspaceRevision }) {
      root.dataset.replayRevision = String(replayRevision);
      root.dataset.workspaceRevision = String(workspaceRevision);
    },
    setGotoFeedback(message) {
      if (gotoFeedbackTimeout !== null) clearTimeout(gotoFeedbackTimeout);
      gotoFeedbackTimeout = null;
      gotoFeedback = typeof message === 'string' && message.length > 0 ? message : null;
      root.dataset.gotoFeedback = gotoFeedback ?? '';
      renderStatus();
      if (gotoFeedback !== null) {
        gotoFeedbackTimeout = setTimeout(() => {
          gotoFeedback = null;
          gotoFeedbackTimeout = null;
          root.dataset.gotoFeedback = '';
          renderStatus();
        }, 5_000);
      }
    },
    setPending(value) {
      interactionPending = value === true;
      if (interactionPending) paneTimeLocationMenu.close();
      renderAvailability();
    },
    setReplay(snapshot) {
      complete = snapshot.complete;
      playback = snapshot.playback;
      const replayStep = readReplayStep(snapshot.replayStep);
      root.dataset.replayPlayback = playback;
      root.dataset.replayCursorEpochMs = String(snapshot.cursorEpochMs);
      root.dataset.replayStepId = replayStep.id;
      replayTransport.setReplay({ playback, replayStepId: replayStep.id });
      renderAvailability();
    },
    setPlaybackSpeed(speedId) {
      root.dataset.autoplaySpeedId = speedId;
      replayTransport.setSpeed(speedId);
    },
    setLayout(layout, paneIds) {
      const value = readPaneLayout(layout);
      root.dataset.layoutId = value.variantId;
      paneLayoutControl.setValue(value.variantId);
      paneLayoutControl.setPaneCount(value.paneCount);
      paneGrid.setLayout(layout, paneIds);
    },
    setLayoutSync(layoutSync) {
      const value = readLayoutSync(layoutSync);
      root.dataset.crosshairSync = String(value.crosshair);
      for (const [key, enabled] of Object.entries(value)) {
        root.dataset[`layoutSync${key[0].toUpperCase()}${key.slice(1)}`] = String(enabled);
      }
      paneLayoutControl.setSync(value);
    },
    setPaneOhlc(panes) { paneGrid.setPaneOhlc(panes); },
    setTimeframeSync(enabled) {
      root.dataset.syncTimeframe = String(enabled === true);
      replayTransport.setTimeframeSync(enabled);
      renderAvailability();
    },
    setTruncationSelection({ active, error = null }) {
      truncationSelectionActive = active === true;
      truncationError = truncationSelectionActive ? error : null;
      root.dataset.truncationSelection = truncationSelectionActive ? 'active' : 'inactive';
      replayTransport.setTruncationSelection(truncationSelectionActive);
      paneGrid.setTruncationSelection(truncationSelectionActive);
      renderStatus();
      renderAvailability();
    },
    setSelection({ sessionHoursMode }) {
      root.dataset.sessionHoursMode = sessionHoursMode;
      sessionHoursControl.setValue(sessionHoursMode);
    },
    setSessionRange({ endEpochMs, startEpochMs }) {
      sessionRangeEpochs = Object.freeze({ endEpochMs, startEpochMs });
      renderTimePresentation();
    },
    setState,
    setVisibleThrough({ barCount, paneCount, visibleThroughEpochMs }) {
      visibleThroughState = Object.freeze({ barCount, paneCount, visibleThroughEpochMs });
      exactDefaultEpochMs = visibleThroughEpochMs ?? options.replayRange.startEpochMs;
      renderTimePresentation();
    },
    setWall(paneId, origin) {
      if (paneId === activePaneId) root.dataset.wallOrigin = origin;
    },
    setWorkstationSettings(snapshot) {
      root.dataset.settingsRevision = String(snapshot.revision);
      const value = readWorkstationSettings(snapshot.settings);
      activeWorkstationSettings = snapshot.settings;
      root.dataset.changeVisible = String(value.paneReadout.changeVisible);
      root.dataset.currentPriceLineVisible = String(value.currentPrice.lineVisible);
      root.dataset.currentPriceNameVisible = String(value.currentPrice.nameVisible);
      root.dataset.currentPriceValueVisible = String(value.currentPrice.valueVisible);
      root.dataset.canvasBackgroundColor = value.canvas.backgroundColor;
      root.dataset.crosshairOpacityPercent = String(value.canvas.crosshairOpacityPercent);
      root.dataset.crosshairStyle = value.canvas.crosshairStyle;
      root.dataset.crosshairWidth = String(value.canvas.crosshairWidth);
      root.dataset.gridVisible = String(value.canvas.gridVisible);
      root.dataset.ohlcVisible = String(value.paneReadout.ohlcVisible);
      root.dataset.paneControlDockVisibility = value.interface.paneControlDockVisibility;
      root.dataset.paneReadoutFontSize = String(value.paneReadout.fontSize);
      root.dataset.pricePrecision = String(value.candles.pricePrecision);
      root.dataset.rightMarginBars = String(value.canvas.rightMarginBars);
      root.dataset.scaleFontSize = String(value.canvas.scaleFontSize);
      root.dataset.dateFormat = value.time.dateFormat;
      root.dataset.dayOfWeekVisible = String(value.time.dayOfWeekVisible);
      root.dataset.displayTimezone = value.time.displayTimezone;
      root.dataset.hourFormat = value.time.hourFormat;
      root.dataset.volumeVisible = String(value.paneReadout.volumeVisible);
      exactGoto.setWorkstationSettings(snapshot.settings);
      paneGrid.setWorkstationSettings(snapshot.settings);
      renderTimePresentation();
    },
    setWorkspace(workspace) {
      const value = readPaneWorkspace(workspace);
      activePaneId = value.activePaneId;
      const active = value.panes.find(({ paneId }) => paneId === activePaneId);
      root.dataset.activePaneId = activePaneId;
      root.dataset.instrumentId = active.instrumentId;
      root.dataset.paneCount = String(value.panes.length);
      root.dataset.timeframeId = active.timeframeId;
      instrumentControl.setValue(active.instrumentId);
      timeframeControl.setValue(active.timeframeId);
      paneGrid.setWorkspace(value, {
        instrument: (id) => instrumentLabels.get(id) ?? id,
        timeframe: (id) => timeframeLabels.get(id) ?? id,
      });
    },
    surfacePort: Object.freeze({
      applyPaneSet: paneGrid.applyPaneSet,
      finalizePaneSet: paneGrid.finalizePaneSet,
      preparePane: paneGrid.preparePane,
      releasePane: paneGrid.releasePane,
      rollbackPaneSet: paneGrid.rollbackPaneSet,
    }),
  });
}
