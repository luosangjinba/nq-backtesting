import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { readReplayStep } from '../replay-contract/public.js';
import { createGotoControls } from './goto-controls.js';
import { createPaneGridView } from './pane-grid-view.js';
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
    setDisabled(disabled) { for (const button of buttons.values()) button.disabled = disabled; },
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
    setDisabled(value) { select.disabled = value; },
    setValue(value) { select.value = value; },
  });
}

function createReplayStepSelect(options, onChoose) {
  const select = element('select', { ariaLabel: 'Replay step', className: 'replay-step-select' });
  select.title = 'Previous and Next advance one completed Replay bar on this independent timeframe.';
  for (const option of options) {
    const node = element('option', { text: option.label });
    node.value = option.id;
    select.append(node);
  }
  select.addEventListener('change', () => onChoose(select.value));
  return Object.freeze({
    dispose() { select.replaceWith(select.cloneNode(true)); },
    root: select,
    setDisabled(value) { select.disabled = value; },
    setValue(value) { select.value = value; },
  });
}

/** Own the real one/multi-Pane workstation presentation and dispatch UI intents. */
export function createReplayWorkspaceView({
  instrumentOptions,
  name,
  onAutoplay,
  onBack,
  onExactGoto,
  onFocusPane,
  onInstrument,
  onNext,
  onPaneCount,
  onPause,
  onPrevious,
  onQuickGoto,
  onReset,
  onReplayStep,
  onRestart,
  onSessionHours,
  onTimeframe,
  replayStepOptions,
  sessionHoursModes,
  timeframeMenuGroups,
}) {
  const backButton = element('button', {
    className: 'button replay-action-button replay-back', text: '← All sessions', type: 'button',
  });
  const previousButton = element('button', {
    ariaLabel: 'Previous bar', className: 'button replay-action-button replay-previous', text: '‹', type: 'button',
  });
  const nextButton = element('button', {
    ariaLabel: 'Next bar', className: 'button replay-action-button replay-next', text: 'Next bar', type: 'button',
  });
  const autoplayButton = element('button', {
    ariaLabel: 'Play replay continuously', className: 'button replay-action-button replay-autoplay', text: 'Play', type: 'button',
  });
  autoplayButton.title = 'Continuously advance one selected Replay bar per cadence.';
  const pauseButton = element('button', {
    className: 'button replay-action-button replay-pause', text: 'Pause', type: 'button',
  });
  const restartButton = element('button', {
    className: 'button replay-action-button replay-restart', text: 'Restart', type: 'button',
  });
  const resetButton = element('button', {
    className: 'button replay-action-button replay-reset', text: 'Reset view', type: 'button',
  });
  backButton.addEventListener('click', onBack);
  previousButton.addEventListener('click', onPrevious);
  nextButton.addEventListener('click', onNext);
  autoplayButton.addEventListener('click', onAutoplay);
  pauseButton.addEventListener('click', onPause);
  restartButton.addEventListener('click', onRestart);
  resetButton.addEventListener('click', () => onReset(null));

  const timeframeControl = createTimeframeMenu({ groups: timeframeMenuGroups, onChoose: onTimeframe });
  const instrumentControl = createInstrumentSelect(instrumentOptions, onInstrument);
  const replayStepControl = createReplayStepSelect(replayStepOptions, onReplayStep);
  const sessionHoursControl = createChoiceGroup({
    ariaLabel: 'Session hours',
    choices: sessionHoursModes.map((id) => ({ id, label: id.toUpperCase() })),
    className: 'session-hours-control',
    onChoose: onSessionHours,
  });
  const paneCountControl = createChoiceGroup({
    ariaLabel: 'Pane count',
    choices: [{ id: '1', label: '1 pane' }, { id: '2', label: '2 panes' }],
    className: 'pane-count-control',
    onChoose: (value) => onPaneCount(Number(value)),
  });
  let exactDefaultEpochMs = Date.now();
  const goto = createGotoControls({
    getExactDefault: () => exactDefaultEpochMs,
    onExact: onExactGoto,
    onQuick: onQuickGoto,
  });
  const paneGrid = createPaneGridView({ onFocus: onFocusPane, onReset });
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
          paneCountControl.root,
        ]),
      ]),
      element('div', { className: 'replay-actions' }, [
        status,
        resetButton,
        restartButton,
        goto.root,
        previousButton,
        replayStepControl.root,
        autoplayButton,
        pauseButton,
        nextButton,
        element('span', { className: 'workspace-status replay-local-status' }, [
          element('span', { className: 'status-dot' }),
          element('span', { text: 'Local' }),
        ]),
      ]),
    ]),
    element('div', { className: 'chart-frame' }, [paneGrid.root, overlay]),
    element('footer', { className: 'replay-workspace-footer' }, [
      sessionRange,
      visibleThrough,
      element('span', { text: 'Focused Pane owns symbol, interval, and viewport' }),
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
  let viewState = 'loading';

  function renderAvailability() {
    const busy = interactionPending || viewState === 'loading' || viewState === 'stale';
    const unavailable = viewState === 'unavailable';
    nextButton.disabled = busy || unavailable || complete;
    autoplayButton.disabled = busy || unavailable || complete || playback === 'playing';
    previousButton.disabled = busy || unavailable;
    restartButton.disabled = busy || unavailable;
    resetButton.disabled = busy || unavailable;
    pauseButton.disabled = unavailable || playback !== 'playing';
    timeframeControl.setDisabled(busy || unavailable);
    instrumentControl.setDisabled(busy || unavailable || instrumentOptions.length < 2);
    sessionHoursControl.setDisabled(busy || unavailable);
    paneCountControl.setDisabled(busy || unavailable);
    replayStepControl.setDisabled(busy || unavailable);
    goto.setDisabled(busy || unavailable);
    paneGrid.setPending(busy || unavailable);
    root.setAttribute('aria-busy', String(busy));
  }

  function setState(state, detail = {}) {
    if (!REPLAY_WORKSPACE_STATES.includes(state)) throw new TypeError(`Unsupported workspace state ${state}.`);
    viewState = state;
    root.dataset.viewState = state;
    if (state === 'ready') hasAcceptedChart = true;
    overlay.hidden = state === 'ready' || state === 'stale' || (state === 'error' && hasAcceptedChart);
    status.hidden = !(state === 'error' && hasAcceptedChart);
    status.className = `workspace-inline-status status-${state}`;
    status.textContent = state === 'error' ? (detail.message ?? 'Update failed') : '';
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
    renderAvailability();
  }

  return Object.freeze({
    dispose() {
      backButton.removeEventListener('click', onBack);
      previousButton.removeEventListener('click', onPrevious);
      nextButton.removeEventListener('click', onNext);
      autoplayButton.removeEventListener('click', onAutoplay);
      pauseButton.removeEventListener('click', onPause);
      restartButton.removeEventListener('click', onRestart);
      timeframeControl.dispose();
      instrumentControl.dispose();
      sessionHoursControl.dispose();
      paneCountControl.dispose();
      replayStepControl.dispose();
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
      replayStepControl.setValue(replayStep.id);
      autoplayButton.setAttribute('aria-pressed', String(playback === 'playing'));
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
      paneCountControl.setValue(String(value.panes.length));
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
