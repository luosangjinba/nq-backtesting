import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_ENTRY_RESTART_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  PLAYBACK_PERIOD_EVENTS,
  REPLAY_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

const SPEEDS = Object.freeze([0.5, 1, 2, 4]);

const EMPTY_POSITION_PREFERENCE = Object.freeze({
  load() {
    return null;
  },
  save() {},
});

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

function normalizeFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function clampReplayTransportPosition({
  height = 0,
  left = 0,
  top = 0,
  viewportHeight = 0,
  viewportWidth = 0,
  width = 0,
} = {}) {
  const safeWidth = Math.max(0, normalizeFiniteNumber(width));
  const safeHeight = Math.max(0, normalizeFiniteNumber(height));
  const safeViewportWidth = Math.max(0, normalizeFiniteNumber(viewportWidth));
  const safeViewportHeight = Math.max(0, normalizeFiniteNumber(viewportHeight));
  const maxLeft = Math.max(0, safeViewportWidth - safeWidth);
  const maxTop = Math.max(0, safeViewportHeight - safeHeight);
  return Object.freeze({
    left: Math.min(maxLeft, Math.max(0, normalizeFiniteNumber(left))),
    top: Math.min(maxTop, Math.max(0, normalizeFiniteNumber(top))),
  });
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
    case 'restart':
      return Object.freeze({
        command: CHART_ENTRY_RESTART_COMMANDS.RESTART,
        nextState: createReplayTransportState({
          ...state,
          playing: false,
          replayStatus: 'restarting',
        }),
      });
    default:
      throw new Error(`Unsupported replay transport action: ${action}`);
  }
}

export function syncReplayTransportStateFromReplay(state, replayState = {}) {
  const status = String(replayState.status || '').trim();
  if (!status) return createReplayTransportState(state);
  if (state.replayStatus === 'restarting' && status === 'ended') {
    return createReplayTransportState(state);
  }
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

function isDisabledControl(control) {
  return Boolean(
    control?.disabled ||
    control?.getAttribute?.('aria-disabled') === 'true',
  );
}

function getFocusablePeriodOptions(root) {
  return Array.from(root.querySelectorAll('[data-v6-transport-period-option]'))
    .filter((option) => !isDisabledControl(option));
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
    playButton.setAttribute('title', label);
    playButton.classList.toggle('is-active', state.playing);
    playButton.classList.toggle('is-disabled', ended);
  }
  const nextButton = root.querySelector('[data-v6-transport-action="next"]');
  if (nextButton) {
    const ended = state.replayStatus === 'ended';
    const label = ended ? 'Replay ended' : 'Next replay bar';
    nextButton.disabled = ended;
    nextButton.setAttribute('aria-label', label);
    nextButton.setAttribute('aria-disabled', String(ended));
    nextButton.setAttribute('title', label);
    nextButton.classList.toggle('is-disabled', ended);
  }
  const restartButton = root.querySelector('[data-v6-transport-action="restart"]');
  if (restartButton) {
    const ended = state.replayStatus === 'ended';
    const label = ended ? 'Restart replay' : 'Restart available after replay ends';
    restartButton.disabled = !ended;
    restartButton.setAttribute('aria-label', label);
    restartButton.setAttribute('aria-disabled', String(!ended));
    restartButton.setAttribute('title', label);
    restartButton.classList.toggle('is-active', ended);
    restartButton.classList.toggle('is-disabled', !ended);
  }
  const speedSlider = root.querySelector('[data-v6-transport-speed-slider]');
  if (speedSlider) {
    speedSlider.value = String(state.speed);
    speedSlider.setAttribute('aria-valuetext', `${state.speed}x replay speed`);
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
  const periodTrigger = root.querySelector('[data-v6-transport-period-toggle]');
  if (periodTrigger) {
    periodTrigger.setAttribute('aria-label', `Replay step period ${state.period}`);
    periodTrigger.setAttribute('title', `Replay step period ${state.period}`);
  }
  root.querySelectorAll('[data-v6-transport-period-option]').forEach((button) => {
    const selected = button.dataset.v6TransportPeriodOption === state.period;
    button.setAttribute('aria-checked', String(selected));
    button.setAttribute('tabindex', selected ? '0' : '-1');
    button.classList.toggle('is-active', selected);
  });
  const periodSync = root.querySelector('[data-v6-transport-period-sync]');
  if (periodSync) {
    periodSync.checked = state.periodSync;
    periodSync.setAttribute('aria-checked', String(state.periodSync));
    periodSync.setAttribute('title', state.periodSync ? 'Replay period follows active chart' : 'Replay period is manual');
    periodSync.parentElement?.classList?.toggle('is-active', state.periodSync);
  }
}

export function mountReplayTransport(root, {
  dispatchCommand = dispatchRuntimeCommand,
  getVisiblePaneIds = null,
  positionPreference = EMPTY_POSITION_PREFERENCE,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Replay transport root is required.');
  }
  let state = createReplayTransportState();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const unsubscribeCallbacks = [];
  const preference = positionPreference || EMPTY_POSITION_PREFERENCE;

  function setState(nextState) {
    state = createReplayTransportState(nextState);
    updateDom(root, state);
    return state;
  }

  function resolveVisiblePanePayload() {
    if (typeof getVisiblePaneIds !== 'function') {
      return {};
    }
    const paneIds = [...new Set(
      (getVisiblePaneIds() || [])
        .map((paneId) => String(paneId || '').trim())
        .filter(Boolean)
    )];
    if (paneIds.length > 1) {
      return { paneIds };
    }
    if (paneIds.length === 1) {
      return { paneId: paneIds[0] };
    }
    return {};
  }

  function enrichReplayPanePayload(command, payload) {
    if (
      command !== CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT &&
      command !== CHART_ENTRY_AUTO_PLAY_COMMANDS.START
    ) {
      return payload;
    }
    return {
      ...(payload || {}),
      ...resolveVisiblePanePayload(),
    };
  }

  function dispatchAction(action) {
    const resolved = resolveReplayTransportAction(action, state);
    setState(resolved.nextState);
    if (!resolved.command) {
      root.dataset.lastAction = 'ended';
      return Promise.resolve(null);
    }
    root.dataset.lastAction = action;
    return Promise.resolve(dispatchCommand(
      resolved.command,
      enrichReplayPanePayload(resolved.command, resolved.payload),
    )).then((result) => {
      if (action === 'restart') {
        scheduleReplayStateRefreshAfterRestart();
      }
      return result;
    }).catch((error) => {
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

  function refreshReplayStateAfterRestart() {
    if (root.dataset.lastAction !== 'restart') return;
    Promise.resolve(dispatchCommand(REPLAY_COMMANDS.GET_STATE))
      .then((replayState) => {
        if (replayState) {
          syncFromReplayEvent(replayState);
        }
      })
      .catch((error) => {
        root.dataset.lastError = error?.message || String(error);
      });
  }

  function scheduleReplayStateRefreshAfterRestart(attempt = 0) {
    if (root.dataset.lastAction !== 'restart') return;
    Promise.resolve(dispatchCommand(REPLAY_COMMANDS.GET_STATE))
      .then((replayState) => {
        if (replayState?.status && replayState.status !== 'ended') {
          syncFromReplayEvent(replayState);
          return;
        }
        if (attempt < 40) {
          const setTimeoutFn = root.ownerDocument?.defaultView?.setTimeout || globalThis.setTimeout;
          setTimeoutFn(() => scheduleReplayStateRefreshAfterRestart(attempt + 1), 25);
        }
      })
      .catch((error) => {
        root.dataset.lastError = error?.message || String(error);
      });
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

  function getViewportSize() {
    const view = root.ownerDocument?.defaultView;
    return {
      height: normalizeFiniteNumber(view?.innerHeight),
      width: normalizeFiniteNumber(view?.innerWidth),
    };
  }

  function getTransportSize(fallback = {}) {
    const rect = root.getBoundingClientRect?.() || {};
    return {
      height: normalizeFiniteNumber(rect.height, normalizeFiniteNumber(fallback.height)),
      width: normalizeFiniteNumber(rect.width, normalizeFiniteNumber(fallback.width)),
    };
  }

  function applyTransportPosition(position) {
    if (!position) return null;
    const viewport = getViewportSize();
    const size = getTransportSize(position);
    const nextPosition = clampReplayTransportPosition({
      height: size.height,
      left: position.left,
      top: position.top,
      viewportHeight: viewport.height,
      viewportWidth: viewport.width,
      width: size.width,
    });
    root.style.left = `${nextPosition.left}px`;
    root.style.top = `${nextPosition.top}px`;
    root.style.bottom = 'auto';
    root.style.transform = 'none';
    root.dataset.dragged = 'true';
    root.dataset.positionRestored = 'true';
    return Object.freeze({
      ...nextPosition,
      height: size.height,
      width: size.width,
    });
  }

  function saveTransportPosition(position) {
    if (typeof preference.save !== 'function') return;
    try {
      preference.save(position);
    } catch (error) {
      root.dataset.lastError = error?.message || String(error);
    }
  }

  function restoreTransportPosition() {
    if (typeof preference.load !== 'function') return null;
    try {
      const restoredPosition = applyTransportPosition(preference.load());
      if (restoredPosition) {
        saveTransportPosition(restoredPosition);
      }
      return restoredPosition;
    } catch (error) {
      root.dataset.lastError = error?.message || String(error);
      return null;
    }
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
      const rect = root.getBoundingClientRect?.();
      if (rect) {
        saveTransportPosition({
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        });
      }
    };
    root.ownerDocument?.addEventListener?.('pointermove', move);
    root.ownerDocument?.addEventListener?.('pointerup', stop, { once: true });
  }

  const dragHandle = root.querySelector('[data-v6-transport-drag-handle]');
  dragHandle?.addEventListener?.('pointerdown', startDrag, { signal });

  function focusPeriodOption(index) {
    const options = getFocusablePeriodOptions(root);
    if (!options.length) return;
    const clampedIndex = Math.min(options.length - 1, Math.max(0, index));
    options[clampedIndex]?.focus?.();
  }

  function handlePeriodMenuKeydown(event) {
    const details = root.querySelector('[data-v6-transport-period-details]');
    if (!details) return false;
    const targetIsInPeriodMenu = root.contains(event.target) && details.contains?.(event.target);
    if (!targetIsInPeriodMenu) return false;
    const options = getFocusablePeriodOptions(root);
    if (!options.length) return false;
    const activeIndex = options.indexOf(root.ownerDocument?.activeElement);
    if (event.key === 'Escape') {
      if (details.open) {
        event.preventDefault();
        details.open = false;
        root.querySelector('[data-v6-transport-period-toggle]')?.focus?.();
        return true;
      }
      return false;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      details.open = true;
      focusPeriodOption(activeIndex < 0 ? 0 : (activeIndex + 1) % options.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      details.open = true;
      focusPeriodOption(activeIndex < 0 ? options.length - 1 : (activeIndex - 1 + options.length) % options.length);
      return true;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      details.open = true;
      focusPeriodOption(0);
      return true;
    }
    if (event.key === 'End') {
      event.preventDefault();
      details.open = true;
      focusPeriodOption(options.length - 1);
      return true;
    }
    return false;
  }

  root.addEventListener('click', (event) => {
    const actionButton = event.target.closest?.('[data-v6-transport-action]');
    if (actionButton && root.contains(actionButton)) {
      if (isDisabledControl(actionButton)) return;
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
      if (isDisabledControl(periodButton)) return;
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
      if (isDisabledControl(speedSlider)) return;
      void dispatchSpeedChange(normalizeSliderSpeed(speedSlider.value));
    }
  }, { signal });

  root.addEventListener('change', (event) => {
    const periodSync = event.target.closest?.('[data-v6-transport-period-sync]');
    if (periodSync && root.contains(periodSync)) {
      if (isDisabledControl(periodSync)) return;
      void dispatchPeriodSyncChange(periodSync.checked);
    }
  }, { signal });

  root.ownerDocument.addEventListener('keydown', (event) => {
    if (handlePeriodMenuKeydown(event)) return;
    if (root.querySelector('[data-v6-transport-period-details]')?.open) return;
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
      subscribeEvent(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED, refreshReplayStateAfterRestart),
      subscribeEvent(PLAYBACK_PERIOD_EVENTS.CHANGED, syncFromPlaybackPeriodEvent),
    );
  }

  setState(state);
  Promise.resolve(dispatchCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE))
    .then(syncFromPlaybackPeriodEvent)
    .catch(() => {});
  restoreTransportPosition();

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
