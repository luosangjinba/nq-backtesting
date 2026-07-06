import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PLAYBACK_PERIOD_COMMANDS,
  PLAYBACK_PERIOD_EVENTS,
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
  period = '1m',
  periodSync = false,
  playing = false,
  replayStatus = 'idle',
  speed = 1,
} = {}) {
  return Object.freeze({
    period: String(period || '1m'),
    periodSync: Boolean(periodSync),
    playing: Boolean(playing),
    replayStatus: String(replayStatus || 'idle'),
    speed: normalizeSpeed(speed),
  });
}

export function resolveReplayTransportAction(action, state = createReplayTransportState()) {
  if (state.replayStatus === 'ended' && (action === 'next' || action === 'play-toggle')) {
    return Object.freeze({
      command: null,
      nextState: createReplayTransportState(state),
      payload: undefined,
    });
  }
  switch (action) {
    case 'next':
      return Object.freeze({
        command: CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
        nextState: state,
      });
    case 'play-toggle': {
      const playing = !state.playing;
      return Object.freeze({
        command: playing ? CHART_ENTRY_AUTO_PLAY_COMMANDS.START : CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP,
        nextState: createReplayTransportState({
          period: state.period,
          periodSync: state.periodSync,
          playing,
          replayStatus: state.replayStatus,
          speed: state.speed,
        }),
        payload: playing ? { speed: state.speed } : undefined,
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
    period: state.period,
    periodSync: state.periodSync,
    playing: status === 'playing' || (status === 'ready' && state.playing),
    replayStatus: status,
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
  root.dataset.playbackStatus = state.replayStatus;
  root.dataset.ended = String(state.replayStatus === 'ended');
  root.dataset.period = state.period;
  root.dataset.periodSync = String(state.periodSync);
  root.dataset.speed = String(state.speed);
  const playButton = root.querySelector('[data-v6-transport-action="play-toggle"]');
  if (playButton) {
    const ended = state.replayStatus === 'ended';
    const label = ended ? 'Replay ended' : state.playing ? 'Pause replay' : 'Play replay';
    const labelElement = playButton.querySelector?.('[data-v6-transport-play-label]');
    if (labelElement) {
      labelElement.textContent = label;
    }
    playButton.disabled = ended;
    playButton.setAttribute('aria-label', label);
    playButton.setAttribute('aria-pressed', String(state.playing));
    playButton.setAttribute('aria-disabled', String(ended));
  }
  const nextButton = root.querySelector('[data-v6-transport-action="next"]');
  if (nextButton) {
    const ended = state.replayStatus === 'ended';
    nextButton.disabled = ended;
    nextButton.setAttribute('aria-label', ended ? 'Replay ended' : 'Next replay bar');
    nextButton.setAttribute('aria-disabled', String(ended));
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
  const periodLabel = root.querySelector('[data-v6-transport-period-label]');
  if (periodLabel) {
    periodLabel.textContent = state.period;
  }
  root.querySelectorAll('[data-v6-transport-period-option]').forEach((button) => {
    const selected = button.dataset.v6TransportPeriodOption === state.period;
    button.setAttribute('aria-checked', String(selected));
    button.classList.toggle('is-active', selected);
  });
  const periodSync = root.querySelector('[data-v6-transport-period-sync]');
  if (periodSync) {
    periodSync.checked = state.periodSync;
  }
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
    if (!resolved.command) {
      root.dataset.lastAction = 'ended';
      return Promise.resolve(null);
    }
    return Promise.resolve(dispatchCommand(resolved.command, resolved.payload)).catch((error) => {
      root.dataset.lastError = error?.message || String(error);
      if (action === 'play-toggle') {
      setState({
          period: state.period,
          periodSync: state.periodSync,
          playing: !state.playing,
          replayStatus: state.replayStatus,
          speed: state.speed,
        });
      }
      return null;
    });
  }

  function dispatchSpeedChange(speed) {
    setState({
      period: state.period,
      periodSync: state.periodSync,
      playing: state.playing,
      replayStatus: state.replayStatus,
      speed,
    });
    if (!state.playing) return Promise.resolve(null);
    return Promise.resolve(dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.SET_SPEED, { speed })).catch((error) => {
      root.dataset.lastError = error?.message || String(error);
      return null;
    });
  }

  function syncFromReplayEvent(replayState) {
    setState(syncReplayTransportStateFromReplay(state, replayState));
  }

  function syncFromPlaybackPeriodEvent(playbackPeriodState = {}) {
    setState({
      period: playbackPeriodState.period || state.period,
      periodSync: playbackPeriodState.sync ?? state.periodSync,
      playing: state.playing,
      replayStatus: state.replayStatus,
      speed: state.speed,
    });
  }

  function syncFromManualNextEvent(advanced = {}) {
    const replayState = advanced.replayState || advanced.advanced?.replayState || null;
    if (replayState) {
      syncFromReplayEvent(replayState);
    }
  }

  function syncFromAutoPlayEvent(autoState = {}) {
    const replayState = autoState.lastTick?.replayState || null;
    if (replayState) {
      syncFromReplayEvent(replayState);
      return;
    }
    if (autoState.status) {
      syncFromReplayEvent({ status: autoState.status === 'ended' ? 'ended' : state.replayStatus });
    }
  }

  function dispatchPeriodChange(period) {
    return Promise.resolve(dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, { period })).catch((error) => {
      root.dataset.lastError = error?.message || String(error);
      return null;
    });
  }

  function dispatchPeriodSyncChange(sync) {
    return Promise.resolve(dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_SYNC, { sync })).catch((error) => {
      root.dataset.lastError = error?.message || String(error);
      return null;
    });
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
      void dispatchSpeedChange(normalizeSpeed(speedButton.dataset.v6TransportSpeed));
      return;
    }
    const periodButton = event.target.closest?.('[data-v6-transport-period-option]');
    if (periodButton && root.contains(periodButton)) {
      void dispatchPeriodChange(periodButton.dataset.v6TransportPeriodOption);
      const details = root.querySelector('[data-v6-transport-period-details]');
      if (details) {
        details.open = false;
      }
    }
  }, { signal });

  root.addEventListener('input', (event) => {
    const speedSlider = event.target.closest?.('[data-v6-transport-speed-slider]');
    if (speedSlider && root.contains(speedSlider)) {
      void dispatchSpeedChange(normalizeSliderSpeed(speedSlider.value));
    }
  }, { signal });

  root.addEventListener('change', (event) => {
    const periodSync = event.target.closest?.('[data-v6-transport-period-sync]');
    if (periodSync && root.contains(periodSync)) {
      void dispatchPeriodSyncChange(periodSync.checked);
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
      subscribeEvent(REPLAY_EVENTS.ADVANCED, syncFromReplayEvent),
      subscribeEvent(REPLAY_EVENTS.PLAYBACK_CHANGED, syncFromReplayEvent),
      subscribeEvent(REPLAY_EVENTS.RESET, syncFromReplayEvent),
      subscribeEvent(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED, syncFromManualNextEvent),
      subscribeEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, syncFromAutoPlayEvent),
      subscribeEvent(PLAYBACK_PERIOD_EVENTS.CHANGED, syncFromPlaybackPeriodEvent),
    );
  }

  setState(state);
  Promise.resolve(dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE))
    .then(syncFromPlaybackPeriodEvent)
    .catch(() => {});

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
      void dispatchSpeedChange(normalizeSpeed(speed));
      return state;
    },
  });
}
