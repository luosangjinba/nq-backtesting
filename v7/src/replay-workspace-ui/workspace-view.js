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

export function createReplayWorkspaceView({
  name, onNext, onReset, onSessionHours, onTimeframe, sessionHoursModes, timeframeMenuGroups,
}) {
  const nextButton = element('button', {
    className: 'button replay-action-button replay-next', text: 'Next bar', type: 'button',
  });
  const resetButton = element('button', {
    className: 'button replay-action-button replay-reset', text: 'Reset view', type: 'button',
  });
  nextButton.addEventListener('click', onNext);
  resetButton.addEventListener('click', onReset);
  const timeframeControl = createTimeframeMenu({ groups: timeframeMenuGroups, onChoose: onTimeframe });
  const sessionHoursControl = createChoiceGroup({
    ariaLabel: 'Session hours',
    choices: sessionHoursModes.map((id) => ({ id, label: id.toUpperCase() })),
    className: 'session-hours-control',
    onChoose: onSessionHours,
  });
  const cursor = element('strong', { className: 'replay-cursor', text: 'Preparing…' });
  const wall = element('span', { className: 'replay-wall-status', text: 'Default wall' });
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
  const chartHost = element('div', { className: 'lightweight-chart-host', ariaLabel: 'NQ replay chart' });
  chartHost.setAttribute('role', 'application');
  chartHost.tabIndex = 0;
  const root = element('section', { className: 'replay-workspace' }, [
    element('header', { className: 'replay-workspace-toolbar' }, [
      element('div', { className: 'replay-title-group' }, [
        element('div', { className: 'replay-title-line' }, [
          element('h1', { text: name }),
          element('span', { className: 'market-symbol', text: 'NQ' }),
          timeframeControl.root,
          sessionHoursControl.root,
        ]),
      ]),
      element('div', { className: 'replay-actions' }, [resetButton, nextButton]),
    ]),
    element('div', { className: 'chart-frame' }, [
      element('div', { className: 'chart-meta-strip' }, [
        element('span', { text: 'Nasdaq-100 Futures · Local deterministic foundation feed' }),
        element('span', { className: 'chart-meta-right' }, [status, wall, cursor]),
      ]),
      chartHost,
      overlay,
    ]),
    element('footer', { className: 'replay-workspace-footer' }, [
      sessionRange,
      visibleThrough,
      element('span', { text: 'Drag or zoom the chart to create a manual wall' }),
    ]),
  ]);
  let hasAcceptedChart = false;

  function setState(state, detail = {}) {
    if (!REPLAY_WORKSPACE_STATES.includes(state)) throw new TypeError(`Unsupported workspace state ${state}.`);
    root.dataset.viewState = state;
    const busy = state === 'loading' || state === 'stale';
    nextButton.disabled = busy || state === 'empty' || state === 'unavailable';
    resetButton.disabled = busy || state === 'empty' || state === 'unavailable';
    timeframeControl.setDisabled(busy);
    sessionHoursControl.setDisabled(busy);
    root.setAttribute('aria-busy', String(busy));
    if (state === 'ready') hasAcceptedChart = true;
    overlay.hidden = state === 'ready' || state === 'stale' || (state === 'error' && hasAcceptedChart);
    status.hidden = state !== 'stale' && !(state === 'error' && hasAcceptedChart);
    status.className = `workspace-inline-status status-${state}`;
    status.textContent = state === 'stale' ? 'Updating…' : (detail.message ?? 'Update failed');
    overlay.className = `chart-state-overlay state-${state}`;
    overlayTitle.textContent = detail.title ?? {
      loading: 'Preparing replay chart', empty: 'No visible bars', unavailable: 'Chart unavailable',
      stale: 'Applying next snapshot', error: 'Replay could not advance', ready: '',
    }[state];
    overlayCopy.textContent = detail.message ?? {
      loading: 'Projecting the first no-future snapshot.', empty: 'No eligible bars exist before this cursor.',
      unavailable: 'This workspace configuration is not available in the foundation slice.',
      stale: 'The last accepted chart remains visible while this update settles.',
      error: 'The last accepted chart was preserved. Try Next again.', ready: '',
    }[state];
  }

  return Object.freeze({
    chartHost,
    dispose() {
      nextButton.removeEventListener('click', onNext);
      resetButton.removeEventListener('click', onReset);
      timeframeControl.dispose();
      sessionHoursControl.dispose();
      root.remove();
    },
    root,
    setCursor(text) { cursor.textContent = `Cursor · ${text}`; },
    setEvidence({ replayRevision, workspaceRevision }) {
      root.dataset.replayRevision = String(replayRevision);
      root.dataset.workspaceRevision = String(workspaceRevision);
    },
    setSelection({ sessionHoursMode, timeframeId }) {
      root.dataset.sessionHoursMode = sessionHoursMode;
      root.dataset.timeframeId = timeframeId;
      timeframeControl.setValue(timeframeId);
      sessionHoursControl.setValue(sessionHoursMode);
    },
    setSessionRange({ end, start }) {
      sessionRange.textContent = `Session · ${start} → ${end}`;
    },
    setState,
    setVisibleThrough({ barCount, text }) {
      visibleThrough.textContent = `Visible through · ${text} · ${barCount} bars`;
    },
    setWall(origin) { wall.textContent = origin === 'manual' ? 'Manual wall' : 'Default wall'; },
  });
}
