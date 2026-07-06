import {
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

const SPEEDS = Object.freeze([0.5, 1, 2, 4]);

function normalizeSpeed(value) {
  const speed = Number(value);
  if (!SPEEDS.includes(speed)) {
    throw new Error(`Unsupported replay transport speed: ${value}`);
  }
  return speed;
}

function normalizeSliderSpeed(value) {
  const numericValue = Number(value);
  return SPEEDS.reduce((nearest, speed) => (
    Math.abs(speed - numericValue) < Math.abs(nearest - numericValue) ? speed : nearest
  ), SPEEDS[0]);
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
        command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
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

export function syncReplayTransportStateFromReplay(state, replayState = {}) {
  const status = String(replayState.status || '').trim();
  if (!status) return createReplayTransportState(state);
  return createReplayTransportState({
    playing: status === 'playing',
    speed: state.speed,
  });
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
    const label = state.playing ? 'Pause replay' : 'Play replay';
    const labelElement = playButton.querySelector?.('[data-v6-transport-play-label]');
    if (labelElement) {
      labelElement.textContent = label;
    }
    playButton.setAttribute('aria-label', label);
    playButton.setAttribute('aria-pressed', String(state.playing));
  }
  const speedSlider = root.querySelector('[data-v6-transport-speed-slider]');
  if (speedSlider) {
    speedSlider.value = String(state.speed);
  }
  root.querySelectorAll('[data-v6-transport-speed]').forEach((button) => {
    const selected = Number(button.dataset.v6TransportSpeed) === state.speed;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
  });
}

export function mountReplayTransport(root, {
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Replay transport root is required.');
  }
  let state = createReplayTransportState();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const unsubscribeCallbacks = [];

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

  function syncFromReplayEvent(replayState) {
    setState(syncReplayTransportStateFromReplay(state, replayState));
  }

  function startDrag(event) {
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
    event.preventDefault?.();
    const rect = root.getBoundingClientRect?.();
    if (!rect) return;
    const origin = {
      height: rect.height,
      left: rect.left,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    };

    const move = (moveEvent) => {
      const viewportWidth = root.ownerDocument?.defaultView?.innerWidth || 0;
      const viewportHeight = root.ownerDocument?.defaultView?.innerHeight || 0;
      const maxLeft = Math.max(0, viewportWidth - origin.width);
      const maxTop = Math.max(0, viewportHeight - origin.height);
      const nextLeft = Math.min(maxLeft, Math.max(0, moveEvent.clientX - origin.offsetX));
      const nextTop = Math.min(maxTop, Math.max(0, moveEvent.clientY - origin.offsetY));
      root.style.left = `${nextLeft}px`;
      root.style.top = `${nextTop}px`;
      root.style.bottom = 'auto';
      root.style.transform = 'none';
      root.dataset.dragged = 'true';
    };
    const stop = () => {
      root.ownerDocument?.removeEventListener?.('pointermove', move);
      root.ownerDocument?.removeEventListener?.('pointerup', stop);
    };
    root.ownerDocument?.addEventListener?.('pointermove', move);
    root.ownerDocument?.addEventListener?.('pointerup', stop, { once: true });
  }

  const dragHandle = root.querySelector('[data-v6-transport-drag-handle]');
  dragHandle?.addEventListener?.('pointerdown', startDrag, { signal });

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

  root.addEventListener('input', (event) => {
    const speedSlider = event.target.closest?.('[data-v6-transport-speed-slider]');
    if (speedSlider && root.contains(speedSlider)) {
      setState({
        playing: state.playing,
        speed: normalizeSliderSpeed(speedSlider.value),
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

  if (typeof subscribeEvent === 'function') {
    unsubscribeCallbacks.push(
      subscribeEvent(REPLAY_EVENTS.LOADED, syncFromReplayEvent),
      subscribeEvent(REPLAY_EVENTS.PLAYBACK_CHANGED, syncFromReplayEvent),
      subscribeEvent(REPLAY_EVENTS.RESET, syncFromReplayEvent),
    );
  }

  setState(state);

  return Object.freeze({
    destroy() {
      abortController.abort();
      while (unsubscribeCallbacks.length) {
        unsubscribeCallbacks.pop()();
      }
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
