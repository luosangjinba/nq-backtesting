import {
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

const SPEEDS = Object.freeze([0.5, 1, 2, 4]);

function normalizeSpeed(value) {
  const speed = Number(value);
  if (!SPEEDS.includes(speed)) {
    throw new Error(`Unsupported replay transport speed: ${value}`);
  }
  return speed;
}

export function createReplayTransportState({
  playing = false,
  speed = 1,
} = {}) {
  return Object.freeze({
    playing: Boolean(playing),
    speed: normalizeSpeed(speed),
  });
}

export function resolveReplayTransportAction(action, state = createReplayTransportState()) {
  switch (action) {
    case 'next':
      return Object.freeze({
        command: DEFAULT_WALL_COMMANDS.NEXT,
        nextState: state,
      });
    case 'play-toggle': {
      const playing = !state.playing;
      return Object.freeze({
        command: playing ? REPLAY_COMMANDS.PLAY : REPLAY_COMMANDS.PAUSE,
        nextState: createReplayTransportState({
          playing,
          speed: state.speed,
        }),
      });
    }
    default:
      throw new Error(`Unsupported replay transport action: ${action}`);
  }
}

function isEditableTarget(target) {
  const tagName = String(target?.tagName || '').toLowerCase();
  return Boolean(
    target?.isContentEditable ||
    tagName === 'input' ||
    tagName === 'select' ||
    tagName === 'textarea',
  );
}

function updateDom(root, state) {
  root.dataset.playback = state.playing ? 'playing' : 'paused';
  root.dataset.speed = String(state.speed);
  const playButton = root.querySelector('[data-v6-transport-action="play-toggle"]');
  if (playButton) {
    playButton.textContent = state.playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', state.playing ? 'Pause replay' : 'Play replay');
    playButton.setAttribute('aria-pressed', String(state.playing));
  }
  root.querySelectorAll('[data-v6-transport-speed]').forEach((button) => {
    const selected = Number(button.dataset.v6TransportSpeed) === state.speed;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
  });
}

export function mountReplayTransport(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) {
    throw new Error('Replay transport root is required.');
  }
  let state = createReplayTransportState();
  const abortController = new AbortController();
  const signal = abortController.signal;

  function setState(nextState) {
    state = createReplayTransportState(nextState);
    updateDom(root, state);
    return state;
  }

  function dispatchAction(action) {
    const resolved = resolveReplayTransportAction(action, state);
    setState(resolved.nextState);
    return Promise.resolve(dispatchCommand(resolved.command)).catch((error) => {
      root.dataset.lastError = error?.message || String(error);
      if (action === 'play-toggle') {
        setState({
          playing: !state.playing,
          speed: state.speed,
        });
      }
      return null;
    });
  }

  root.addEventListener('click', (event) => {
    const actionButton = event.target.closest?.('[data-v6-transport-action]');
    if (actionButton && root.contains(actionButton)) {
      void dispatchAction(actionButton.dataset.v6TransportAction);
      return;
    }
    const speedButton = event.target.closest?.('[data-v6-transport-speed]');
    if (speedButton && root.contains(speedButton)) {
      setState({
        playing: state.playing,
        speed: normalizeSpeed(speedButton.dataset.v6TransportSpeed),
      });
    }
  }, { signal });

  root.ownerDocument.addEventListener('keydown', (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      void dispatchAction('play-toggle');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      void dispatchAction('next');
    }
  }, { signal });

  setState(state);

  return Object.freeze({
    destroy() {
      abortController.abort();
    },
    getState() {
      return state;
    },
    setSpeed(speed) {
      return setState({
        playing: state.playing,
        speed,
      });
    },
  });
}
