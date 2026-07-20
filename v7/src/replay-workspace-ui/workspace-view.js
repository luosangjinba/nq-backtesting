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

export function createReplayWorkspaceView({ name, onNext, onReset }) {
  const nextButton = element('button', {
    className: 'button button-primary replay-next', text: 'Next minute', type: 'button',
  });
  const resetButton = element('button', {
    className: 'button button-secondary replay-reset', text: 'Reset view', type: 'button',
  });
  nextButton.addEventListener('click', onNext);
  resetButton.addEventListener('click', onReset);
  const cursor = element('strong', { className: 'replay-cursor', text: 'Preparing…' });
  const wall = element('span', { className: 'replay-wall-status', text: 'Default wall' });
  const overlayTitle = element('strong', { text: 'Preparing replay chart' });
  const overlayCopy = element('span', { text: 'Projecting the first no-future snapshot.' });
  const overlay = element('div', { className: 'chart-state-overlay', ariaLabel: 'Chart loading state' }, [
    element('span', { className: 'chart-state-spinner' }),
    element('div', {}, [overlayTitle, overlayCopy]),
  ]);
  const chartHost = element('div', { className: 'lightweight-chart-host', ariaLabel: 'NQ one minute replay chart' });
  chartHost.setAttribute('role', 'application');
  chartHost.tabIndex = 0;
  const root = element('section', { className: 'replay-workspace' }, [
    element('header', { className: 'replay-workspace-toolbar' }, [
      element('div', { className: 'replay-title-group' }, [
        element('span', { className: 'eyebrow', text: 'Replay workspace' }),
        element('div', { className: 'replay-title-line' }, [
          element('h1', { text: name }),
          element('span', { className: 'market-symbol', text: 'NQ' }),
          element('span', { className: 'workspace-chip', text: '1m' }),
          element('span', { className: 'workspace-chip', text: 'ETH' }),
        ]),
      ]),
      element('div', { className: 'replay-actions' }, [resetButton, nextButton]),
    ]),
    element('div', { className: 'chart-frame' }, [
      element('div', { className: 'chart-meta-strip' }, [
        element('span', { text: 'Nasdaq-100 Futures · Local deterministic foundation feed' }),
        element('span', { className: 'chart-meta-right' }, [wall, cursor]),
      ]),
      chartHost,
      overlay,
    ]),
    element('footer', { className: 'replay-workspace-footer' }, [
      element('span', { text: 'Replay-visible data only' }),
      element('span', { text: 'Drag or zoom the chart to create a manual wall' }),
    ]),
  ]);

  function setState(state, detail = {}) {
    if (!REPLAY_WORKSPACE_STATES.includes(state)) throw new TypeError(`Unsupported workspace state ${state}.`);
    root.dataset.viewState = state;
    const busy = state === 'loading' || state === 'stale';
    nextButton.disabled = busy || state === 'empty' || state === 'unavailable';
    resetButton.disabled = busy || state === 'empty' || state === 'unavailable';
    overlay.hidden = state === 'ready';
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
      root.remove();
    },
    root,
    setCursor(text) { cursor.textContent = text; },
    setEvidence({ replayRevision, workspaceRevision }) {
      root.dataset.replayRevision = String(replayRevision);
      root.dataset.workspaceRevision = String(workspaceRevision);
    },
    setState,
    setWall(origin) { wall.textContent = origin === 'manual' ? 'Manual wall' : 'Default wall'; },
  });
}
