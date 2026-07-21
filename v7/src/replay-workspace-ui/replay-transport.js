import { setControlDisabled } from './control-availability.js';

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'replay-transport-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  const definitions = {
    next: [['path', { d: 'M7 6l8 6-8 6z', fill: 'currentColor' }], ['path', { d: 'M18 5v14' }]],
    pause: [['path', { d: 'M8 6v12M16 6v12' }]],
    play: [['path', { d: 'M8 5l10 7-10 7z', fill: 'currentColor' }]],
    previous: [['path', { d: 'M17 6l-8 6 8 6z', fill: 'currentColor' }], ['path', { d: 'M6 5v14' }]],
    truncate: [['path', { d: 'M6 4v16M19 12H9m4-5l-5 5 5 5' }]],
  };
  for (const [tag, attributes] of definitions[name]) {
    const shape = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
    if (!Object.hasOwn(attributes, 'fill')) shape.setAttribute('fill', 'none');
    shape.setAttribute('stroke', 'currentColor');
    shape.setAttribute('stroke-linecap', 'round');
    shape.setAttribute('stroke-linejoin', 'round');
    shape.setAttribute('stroke-width', '1.7');
    svg.append(shape);
  }
  return svg;
}

function iconButton({ ariaLabel, className, iconName }) {
  const button = element('button', { ariaLabel, className, type: 'button' });
  button.append(icon(iconName));
  return button;
}

function selectControl({ ariaLabel, className, onChange, options }) {
  const select = element('select', { ariaLabel, className });
  for (const option of options) {
    const node = element('option', { text: option.label });
    node.value = option.id;
    select.append(node);
  }
  select.addEventListener('change', onChange);
  return select;
}

/** Own the fixed Workspace-level Replay transport DOM and dispatch UI intents only. */
export function createReplayTransport({
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
}) {
  const truncation = iconButton({
    ariaLabel: 'Select replay truncation point',
    className: 'replay-transport-button replay-truncation',
    iconName: 'truncate',
  });
  const previous = iconButton({
    ariaLabel: 'Previous bar', className: 'replay-transport-button replay-previous', iconName: 'previous',
  });
  const playPause = iconButton({
    ariaLabel: 'Play replay continuously',
    className: 'replay-transport-button replay-playback replay-autoplay replay-pause',
    iconName: 'play',
  });
  const replayStep = selectControl({
    ariaLabel: 'Replay step',
    className: 'replay-transport-select replay-step-select',
    onChange: () => onReplayStep(replayStep.value),
    options: replayStepOptions,
  });
  const playbackSpeed = selectControl({
    ariaLabel: 'Autoplay speed',
    className: 'replay-transport-select replay-speed-select',
    onChange: () => onPlaybackSpeed(playbackSpeed.value),
    options: playbackSpeedOptions,
  });
  const next = iconButton({
    ariaLabel: 'Next bar', className: 'replay-transport-button replay-next', iconName: 'next',
  });
  const timeframeSyncInput = element('input', { ariaLabel: 'Sync timeframe', type: 'checkbox' });
  const timeframeSync = element('label', { className: 'replay-timeframe-sync' });
  timeframeSync.append(
    timeframeSyncInput,
    element('span', { className: 'replay-timeframe-sync-track' }),
    element('span', { className: 'replay-timeframe-sync-label', text: 'Sync timeframe' }),
  );
  truncation.title = 'Select a candle: that candle and every later candle will be hidden';
  previous.title = 'Previous bar';
  playPause.title = 'Play replay continuously';
  replayStep.title = 'Previous and Next advance one completed Replay bar on this timeframe.';
  next.title = 'Next bar';
  timeframeSync.title = 'Keep Replay step synchronized with the active Pane timeframe';
  let playback = 'paused';
  let selecting = false;
  let syncTimeframe = false;

  function onPlayPause() {
    if (playback === 'playing') onPause();
    else onAutoplay();
  }
  const onTimeframeSyncChange = () => onTimeframeSync(timeframeSyncInput.checked);
  truncation.addEventListener('click', onTruncation);
  previous.addEventListener('click', onPrevious);
  playPause.addEventListener('click', onPlayPause);
  next.addEventListener('click', onNext);
  timeframeSyncInput.addEventListener('change', onTimeframeSyncChange);

  const root = element('div', { className: 'replay-transport' });
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Replay transport');
  root.append(truncation, previous, playPause, replayStep, playbackSpeed, next, timeframeSync);

  return Object.freeze({
    dispose() {
      truncation.removeEventListener('click', onTruncation);
      previous.removeEventListener('click', onPrevious);
      playPause.removeEventListener('click', onPlayPause);
      next.removeEventListener('click', onNext);
      timeframeSyncInput.removeEventListener('change', onTimeframeSyncChange);
      root.remove();
    },
    root,
    setAvailability({ busy, complete, hasAcceptedChart, unavailable }) {
      const stableRefresh = busy && hasAcceptedChart;
      const lockNavigation = (control, intrinsicallyDisabled) => setControlDisabled(control, {
        disabled: busy || selecting || intrinsicallyDisabled,
        preserveVisual: stableRefresh && !intrinsicallyDisabled,
      });
      setControlDisabled(truncation, {
        disabled: unavailable || !hasAcceptedChart || (busy && !selecting),
        preserveVisual: stableRefresh && !unavailable && hasAcceptedChart,
      });
      lockNavigation(previous, unavailable);
      lockNavigation(replayStep, unavailable || syncTimeframe);
      lockNavigation(next, unavailable || complete);
      const playbackUnavailable = unavailable || complete || selecting || (busy && playback !== 'playing');
      setControlDisabled(playPause, {
        disabled: playbackUnavailable,
        preserveVisual: stableRefresh && !unavailable && !complete && playback !== 'playing',
      });
      setControlDisabled(playbackSpeed, { disabled: unavailable || complete || selecting });
      setControlDisabled(timeframeSyncInput, { disabled: unavailable || busy || selecting });
    },
    setReplay({ playback: nextPlayback, replayStepId }) {
      playback = nextPlayback;
      replayStep.value = replayStepId;
      const playing = playback === 'playing';
      playPause.replaceChildren(icon(playing ? 'pause' : 'play'));
      playPause.setAttribute('aria-label', playing ? 'Pause replay' : 'Play replay continuously');
      playPause.setAttribute('aria-pressed', String(playing));
      playPause.title = playing ? 'Pause replay' : 'Play replay continuously';
    },
    setSpeed(speedId) { playbackSpeed.value = speedId; },
    setTimeframeSync(enabled) {
      syncTimeframe = enabled === true;
      timeframeSyncInput.checked = syncTimeframe;
      root.dataset.syncTimeframe = String(syncTimeframe);
    },
    setTruncationSelection(active) {
      selecting = active === true;
      truncation.setAttribute('aria-pressed', String(selecting));
      root.dataset.truncationSelection = selecting ? 'active' : 'inactive';
    },
  });
}
