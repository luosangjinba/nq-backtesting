import { setControlDisabled } from './control-availability.js';

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  return node;
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
  playbackSpeedOptions,
  replayStepOptions,
}) {
  const previous = element('button', {
    ariaLabel: 'Previous bar', className: 'replay-transport-button replay-previous', text: '|‹', type: 'button',
  });
  const playPause = element('button', {
    ariaLabel: 'Play replay continuously',
    className: 'replay-transport-button replay-playback replay-autoplay replay-pause',
    text: '▶',
    type: 'button',
  });
  const replayStep = selectControl({
    ariaLabel: 'Replay step',
    className: 'replay-transport-select replay-step-select',
    onChange: () => onReplayStep(replayStep.value),
    options: replayStepOptions,
  });
  replayStep.title = 'Previous and Next advance one completed Replay bar on this independent timeframe.';
  const playbackSpeed = selectControl({
    ariaLabel: 'Autoplay speed',
    className: 'replay-transport-select replay-speed-select',
    onChange: () => onPlaybackSpeed(playbackSpeed.value),
    options: playbackSpeedOptions,
  });
  const next = element('button', {
    ariaLabel: 'Next bar', className: 'replay-transport-button replay-next', text: '›|', type: 'button',
  });
  previous.title = 'Previous bar';
  next.title = 'Next bar';
  let playback = 'paused';

  function onPlayPause() {
    if (playback === 'playing') onPause();
    else onAutoplay();
  }
  previous.addEventListener('click', onPrevious);
  playPause.addEventListener('click', onPlayPause);
  next.addEventListener('click', onNext);

  const root = element('div', { className: 'replay-transport' });
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Replay transport');
  root.append(previous, playPause, replayStep, playbackSpeed, next);

  return Object.freeze({
    dispose() {
      previous.removeEventListener('click', onPrevious);
      playPause.removeEventListener('click', onPlayPause);
      next.removeEventListener('click', onNext);
      root.remove();
    },
    root,
    setAvailability({ busy, complete, hasAcceptedChart, unavailable }) {
      const stableRefresh = busy && hasAcceptedChart;
      const lockNavigation = (control, intrinsicallyDisabled) => setControlDisabled(control, {
        disabled: busy || intrinsicallyDisabled,
        preserveVisual: stableRefresh && !intrinsicallyDisabled,
      });
      lockNavigation(previous, unavailable);
      lockNavigation(replayStep, unavailable);
      lockNavigation(next, unavailable || complete);
      const playbackUnavailable = unavailable || complete || (busy && playback !== 'playing');
      setControlDisabled(playPause, {
        disabled: playbackUnavailable,
        preserveVisual: stableRefresh && !unavailable && !complete && playback !== 'playing',
      });
      setControlDisabled(playbackSpeed, { disabled: unavailable || complete });
    },
    setReplay({ playback: nextPlayback, replayStepId }) {
      playback = nextPlayback;
      replayStep.value = replayStepId;
      const playing = playback === 'playing';
      playPause.textContent = playing ? 'Ⅱ' : '▶';
      playPause.setAttribute('aria-label', playing ? 'Pause replay' : 'Play replay continuously');
      playPause.setAttribute('aria-pressed', String(playing));
      playPause.title = playing ? 'Pause replay' : 'Play replay continuously';
    },
    setSpeed(speedId) { playbackSpeed.value = speedId; },
  });
}
