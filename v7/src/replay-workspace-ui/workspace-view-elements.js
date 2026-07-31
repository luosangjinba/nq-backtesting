import { createExactGotoDialog } from './exact-goto-dialog.js';
import { createGotoControls } from './goto-controls.js';
import { createPaneGridView } from './pane-grid-view.js';
import { createPaneLayoutMenu } from './pane-layout-menu.js';
import { createPaneTimeLocationMenu } from './pane-time-location-menu.js';
import { createReplayTransport } from './replay-transport.js';
import { createTimeframeMenu } from './timeframe-menu.js';
import { createWorkstationSettingsControl } from './workstation-settings-dialog.js';
import { setControlDisabled, setControlsDisabled } from './control-availability.js';

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

function createWorkspaceControls(options, activeWorkstationSettings, getExactDefaultEpochMs) {
  const instrumentPriceIncrements = new Map(
    options.instrumentOptions.map(({ id, priceIncrement }) => [id, priceIncrement]),
  );
  const timeframeControl = createTimeframeMenu({ groups: options.timeframeMenuGroups, onChoose: options.onTimeframe });
  const instrumentControl = createInstrumentSelect(options.instrumentOptions, options.onInstrument);
  const sessionHoursControl = createChoiceGroup({
    ariaLabel: 'Session hours',
    choices: options.sessionHoursModes.map((id) => ({ id, label: id.toUpperCase() })),
    className: 'session-hours-control',
    onChoose: options.onSessionHours,
  });
  const paneLayoutControl = createPaneLayoutMenu({
    onChoose: options.onLayout, onLayoutSync: options.onLayoutSync, options: options.layoutOptions,
  });
  const goto = createGotoControls({
    initialSettings: options.initialNavigationSettings,
    onQuick: options.onQuickGoto,
    onSaveSettings: options.onSaveGotoSettings,
  });
  const exactGoto = createExactGotoDialog({
    getDefaultEpochMs: getExactDefaultEpochMs,
    onSubmit: options.onExactGoto,
    replayRange: options.replayRange,
    workstationSettings: activeWorkstationSettings,
  });
  const workstationSettings = createWorkstationSettingsControl({
    getSnapshot: options.getWorkstationSettings,
    getRecentColors: options.getRecentColors,
    onCancelPreview: options.onCancelWorkstationSettingsPreview,
    onPreview: options.onPreviewWorkstationSettings,
    onRecordRecentColors: options.onRecordRecentColors,
    onSave: options.onSaveWorkstationSettings,
  });
  const paneGrid = createPaneGridView({
    initialLayout: options.initialLayout,
    initialWorkstationSettings: activeWorkstationSettings,
    onFocus: options.onFocusPane,
    onPaneContext: options.onPaneContext,
    onLayoutResize: options.onLayoutResize,
    onReset: options.onReset,
    resolvePriceIncrement: (instrumentId) => instrumentPriceIncrements.get(instrumentId),
  });
  const paneTimeLocationMenu = createPaneTimeLocationMenu({ onChoose: options.onPaneTimeLocation });
  const replayTransport = createReplayTransport({
    onAutoplay: options.onAutoplay,
    onNext: options.onNext,
    onPause: options.onPause,
    onPlaybackSpeed: options.onPlaybackSpeed,
    onPrevious: options.onPrevious,
    onReplayStep: options.onReplayStep,
    onTimeframeSync: options.onTimeframeSync,
    onTruncation: options.onTruncation,
    playbackSpeedOptions: options.playbackSpeedOptions,
    replayStepOptions: options.replayStepOptions,
  });
  return Object.freeze({
    exactGoto, goto, instrumentControl, paneGrid, paneLayoutControl,
    paneTimeLocationMenu, replayTransport, sessionHoursControl, timeframeControl, workstationSettings,
  });
}

function createStatusElements() {
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
  return Object.freeze({ overlay, overlayCopy, overlayTitle, sessionRange, status, visibleThrough });
}

function createWorkspaceRoot({ backButton, controls, name, restartButton, statusElements }) {
  return element('section', { className: 'replay-workspace' }, [
    element('header', { className: 'replay-workspace-toolbar' }, [
      element('div', { className: 'replay-title-group' }, [
        element('div', { className: 'replay-title-line' }, [
          backButton, element('h1', { text: name }), controls.instrumentControl.root,
          controls.timeframeControl.root, controls.sessionHoursControl.root, controls.paneLayoutControl.root,
        ]),
      ]),
      element('div', { className: 'replay-actions' }, [
        statusElements.status, restartButton, controls.goto.root, controls.exactGoto.root,
        controls.workstationSettings.root,
        element('span', { className: 'workspace-status replay-local-status' }, [
          element('span', { className: 'status-dot' }), element('span', { text: 'Local' }),
        ]),
      ]),
    ]),
    element('div', { className: 'chart-frame' }, [
      controls.paneGrid.root, statusElements.overlay, controls.paneTimeLocationMenu.root,
    ]),
    element('footer', { className: 'replay-workspace-footer' }, [
      element('div', { className: 'replay-footer-context' }, [
        statusElements.sessionRange, statusElements.visibleThrough,
      ]),
      controls.replayTransport.root,
      element('span', {
        className: 'replay-footer-owner', text: 'Focused Pane owns symbol, interval, and viewport',
      }),
    ]),
    controls.workstationSettings.dialog,
  ]);
}

export function createWorkspaceViewElements(options, { activeWorkstationSettings, getExactDefaultEpochMs }) {
  const backButton = element('button', {
    className: 'button replay-action-button replay-back', text: '← All sessions', type: 'button',
  });
  const restartButton = element('button', {
    className: 'button replay-action-button replay-restart', text: 'Restart', type: 'button',
  });
  backButton.addEventListener('click', options.onBack);
  restartButton.addEventListener('click', options.onRestart);
  const controls = createWorkspaceControls(options, activeWorkstationSettings, getExactDefaultEpochMs);
  const statusElements = createStatusElements();
  const root = createWorkspaceRoot({ backButton, controls, name: options.name, restartButton, statusElements });
  return Object.freeze({
    backButton,
    ...controls,
    restartButton,
    root,
    ...statusElements,
    dispose() {
      backButton.removeEventListener('click', options.onBack);
      restartButton.removeEventListener('click', options.onRestart);
      controls.timeframeControl.dispose();
      controls.instrumentControl.dispose();
      controls.sessionHoursControl.dispose();
      controls.paneLayoutControl.dispose();
      controls.replayTransport.dispose();
      controls.goto.dispose();
      controls.exactGoto.dispose();
      controls.workstationSettings.dispose();
      controls.paneGrid.dispose();
      controls.paneTimeLocationMenu.dispose();
      root.remove();
    },
  });
}
