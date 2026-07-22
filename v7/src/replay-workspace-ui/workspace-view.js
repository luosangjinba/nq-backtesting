import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { readPaneLayout } from '../pane-layout-domain/public.js';
import { readReplayStep } from '../replay-contract/public.js';
import { setControlDisabled, setControlsDisabled } from './control-availability.js';
import { createGotoControls } from './goto-controls.js';
import { createPaneGridView } from './pane-grid-view.js';
import { createPaneLayoutMenu } from './pane-layout-menu.js';
import { createReplayTransport } from './replay-transport.js';
import { createTimeframeMenu } from './timeframe-menu.js';

export const REPLAY_WORKSPACE_STATES = Object.freeze([
  'loading', 'empty', 'unavailable', 'stale', 'error', 'ready',
]);

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  for (const child of children) if (child) node.append(child);
  return node;
}

function createChoiceGroup({ ariaLabel, choices, className, onChoose }) {
  const buttons = new Map();
  const root = element('div', { className: `workspace-choice-group ${className}`, ariaLabel });
  root.setAttribute('role', 'group');
  for (const choice of choices) {
    const button = element('button', {
      className: 'workspace-choice', text: choice.label, type: 'button',
    });
    button.dataset.value = choice.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => onChoose(choice.id));
    buttons.set(choice.id, button);
    root.append(button);
  }
  return Object.freeze({
    buttons,
    dispose() { for (const button of buttons.values()) button.replaceWith(button.cloneNode(true)); },
    root,
    setDisabled(disabled, preserveVisual = false) {
      setControlsDisabled(buttons.values(), { disabled, preserveVisual });
    },
    setValue(value) {
      for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(id === value));
    },
  });
}

function createInstrumentSelect(options, onChoose) {
  const select = element('select', { ariaLabel: 'Active pane instrument', className: 'market-symbol-select' });
  for (const option of options) {
    const node = element('option', { text: option.label });
    node.value = option.id;
    select.append(node);
  }
  select.addEventListener('change', () => onChoose(select.value));
  return Object.freeze({
    dispose() { select.replaceWith(select.cloneNode(true)); },
    root: select,
    setDisabled(disabled, preserveVisual = false) {
      setControlDisabled(select, { disabled, preserveVisual });
    },
    setValue(value) { select.value = value; },
  });
}

/** Own the real one/multi-Pane workstation presentation and dispatch UI intents. */
export function createReplayWorkspaceView({
  initialLayout,
  instrumentOptions,
  layoutOptions,
  name,
  onAutoplay,
  onBack,
  onCrosshairSync,
  onExactGoto,
  onFocusPane,
  onInstrument,
  onLayout,
  onLayoutResize,
  onNext,
  onPause,
  onPlaybackSpeed,
  onPrevious,
  onQuickGoto,
  onReset,
  onReplayStep,
  onRestart,
  onSessionHours,
  onTimeframeSync,
  onTimeframe,
  onTruncation,
  playbackSpeedOptions,
  replayStepOptions,
  sessionHoursModes,
  timeframeMenuGroups,
}) {
  const backButton = element('button', {
    className: 'button replay-action-button replay-back', text: '← All sessions', type: 'button',
  });
  const restartButton = element('button', {
    className: 'button replay-action-button replay-restart', text: 'Restart', type: 'button',
  });
  backButton.addEventListener('click', onBack);
  restartButton.addEventListener('click', onRestart);

  const timeframeControl = createTimeframeMenu({ groups: timeframeMenuGroups, onChoose: onTimeframe });
  const instrumentControl = createInstrumentSelect(instrumentOptions, onInstrument);
  const sessionHoursControl = createChoiceGroup({
    ariaLabel: 'Session hours',
    choices: sessionHoursModes.map((id) => ({ id, label: id.toUpperCase() })),
    className: 'session-hours-control',
    onChoose: onSessionHours,
  });
  const paneLayoutControl = createPaneLayoutMenu({
    onChoose: onLayout,
    onCrosshairSync,
    options: layoutOptions,
  });
  let exactDefaultEpochMs = Date.now();
  const goto = createGotoControls({
    getExactDefault: () => exactDefaultEpochMs,
    onExact: onExactGoto,
    onQuick: onQuickGoto,
  });
  const paneGrid = createPaneGridView({
    initialLayout,
    onFocus: onFocusPane,
    onLayoutResize,
    onReset,
  });
  const replayTransport = createReplayTransport({
    onAutoplay,
    onNext,
    onPause,
    onPlaybackSpeed,
    onPrevious,
    onReplayStep,
    onTimeframeSync,
    onTruncation,
    playbackSpeedOptions,
    replayStepOptions,
  });
  const sessionRange = element('span', { className: 'replay-session-range', text: 'Session range preparing…' });
  const visibleThrough = element('span', { className: 'replay-visible-through', text: 'Visible through preparing…' });
  const status = element('span', { className: 'workspace-inline-status' });
  status.hidden = true;
  const overlayTitle = element('strong', { text: 'Preparing replay chart' });
  const overlayCopy = element('span', { text: 'Projecting the first no-future snapshot.' });
  const overlay = element('div', { className: 'chart-state-overlay', ariaLabel: 'Chart loading state' }, [
    element('span', { className: 'chart-state-spinner' }),
    element('div', {}, [overlayTitle, overlayCopy]),
  ]);
  const root = element('section', { className: 'replay-workspace' }, [
    element('header', { className: 'replay-workspace-toolbar' }, [
      element('div', { className: 'replay-title-group' }, [
        element('div', { className: 'replay-title-line' }, [
          backButton,
          element('h1', { text: name }),
          instrumentControl.root,
          timeframeControl.root,
          sessionHoursControl.root,
          paneLayoutControl.root,
        ]),
      ]),
      element('div', { className: 'replay-actions' }, [
        status,
        restartButton,
        goto.root,
        element('span', { className: 'workspace-status replay-local-status' }, [
          element('span', { className: 'status-dot' }),
          element('span', { text: 'Local' }),
        ]),
      ]),
    ]),
    element('div', { className: 'chart-frame' }, [paneGrid.root, overlay]),
    element('footer', { className: 'replay-workspace-footer' }, [
      element('div', { className: 'replay-footer-context' }, [sessionRange, visibleThrough]),
      replayTransport.root,
      element('span', {
        className: 'replay-footer-owner', text: 'Focused Pane owns symbol, interval, and viewport',
      }),
    ]),
  ]);
  const instrumentLabels = new Map(instrumentOptions.map(({ id, label }) => [id, label]));
  const timeframeLabels = new Map(timeframeMenuGroups.flatMap(({ items }) => (
    items.map(({ id, label }) => [id, label])
  )));
  let activePaneId = 'pane-main';
  let complete = false;
  let hasAcceptedChart = false;
  let interactionPending = false;
  let playback = 'paused';
  let truncationError = null;
  let truncationSelectionActive = false;
  let viewState = 'loading';
  let workspaceError = null;

  function renderAvailability() {
    const busy = interactionPending || viewState === 'loading' || viewState === 'stale';
    const interactionLocked = busy || truncationSelectionActive;
    const unavailable = viewState === 'unavailable';
    const stableRefresh = busy && hasAcceptedChart;
    const setAction = (control, intrinsicallyDisabled) => setControlDisabled(control, {
      disabled: interactionLocked || intrinsicallyDisabled,
      preserveVisual: stableRefresh && !intrinsicallyDisabled,
    });
    setAction(restartButton, unavailable);
    timeframeControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    const instrumentUnavailable = unavailable || instrumentOptions.length < 2;
    instrumentControl.setDisabled(interactionLocked || instrumentUnavailable, stableRefresh && !instrumentUnavailable);
    sessionHoursControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    paneLayoutControl.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    goto.setDisabled(interactionLocked || unavailable, stableRefresh && !unavailable);
    replayTransport.setAvailability({ busy, complete, hasAcceptedChart, unavailable });
    paneGrid.setPending(interactionLocked || unavailable);
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
    status.hidden = !visibleError;
    status.className = `workspace-inline-status status-${viewState}`;
    status.textContent = visibleError ? (workspaceError ?? 'Update failed') : '';
  }

  function setState(state, detail = {}) {
    if (!REPLAY_WORKSPACE_STATES.includes(state)) throw new TypeError(`Unsupported workspace state ${state}.`);
    viewState = state;
    workspaceError = state === 'error' ? (detail.message ?? 'Update failed') : null;
    root.dataset.viewState = state;
    if (state === 'ready') hasAcceptedChart = true;
    overlay.hidden = state === 'ready' || state === 'stale' || (state === 'error' && hasAcceptedChart);
    overlay.className = `chart-state-overlay state-${state}`;
    overlayTitle.textContent = detail.title ?? {
      loading: 'Preparing replay chart', empty: 'No visible bars', unavailable: 'Chart unavailable',
      stale: 'Applying complete Pane set', error: 'Replay update failed', ready: '',
    }[state];
    overlayCopy.textContent = detail.message ?? {
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
      backButton.removeEventListener('click', onBack);
      restartButton.removeEventListener('click', onRestart);
      timeframeControl.dispose();
      instrumentControl.dispose();
      sessionHoursControl.dispose();
      paneLayoutControl.dispose();
      replayTransport.dispose();
      goto.dispose();
      paneGrid.dispose();
      root.remove();
    },
    openExactGoto: goto.openExact,
    root,
    setCursor(text) { root.dataset.cursorText = text; },
    setEvidence({ replayRevision, workspaceRevision }) {
      root.dataset.replayRevision = String(replayRevision);
      root.dataset.workspaceRevision = String(workspaceRevision);
    },
    setPending(value) {
      interactionPending = value === true;
      renderAvailability();
    },
    setReplay(snapshot) {
      complete = snapshot.complete;
      playback = snapshot.playback;
      const replayStep = readReplayStep(snapshot.replayStep);
      exactDefaultEpochMs = snapshot.cursorEpochMs;
      root.dataset.replayPlayback = playback;
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
    setCrosshairSync(enabled) {
      root.dataset.crosshairSync = String(enabled === true);
      paneLayoutControl.setCrosshairSync(enabled);
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
    setSessionRange({ end, start }) { sessionRange.textContent = `Session · ${start} → ${end}`; },
    setState,
    setVisibleThrough({ barCount, paneCount, text }) {
      visibleThrough.textContent = `Visible through · ${text} · ${barCount} bars${paneCount > 1 ? ` · ${paneCount} panes` : ''}`;
    },
    setWall(paneId, origin) {
      if (paneId === activePaneId) root.dataset.wallOrigin = origin;
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
      commitPaneSet: paneGrid.commitPaneSet,
      preparePane: paneGrid.preparePane,
    }),
  });
}
