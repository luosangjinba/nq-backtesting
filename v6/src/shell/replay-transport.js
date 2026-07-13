import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_ENTRY_RESTART_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  PLAYBACK_PERIOD_EVENTS,
  REPLAY_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { mountReplayTransportPositionController } from './replay-transport-position-controller.js';
import { mountReplayTransportPeriodMenuController } from './replay-transport-period-menu-controller.js';
import { renderReplayTransport } from './replay-transport-presentation.js';

export { clampReplayTransportPosition } from './replay-transport-position.js';

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

function normalizeFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function createReplayTransportState({
  period = '1m',
  periodSync = false,
  playing = false,
  previousAvailable = false,
  replayStatus = 'idle',
  speed = 1,
} = {}) {
  return Object.freeze({
    period: String(period || '1m'),
    periodSync: Boolean(periodSync),
    playing: Boolean(playing),
    previousAvailable: Boolean(previousAvailable),
    replayStatus: String(replayStatus || 'idle'),
    speed: normalizeSpeed(speed),
  });
}

export function resolveReplayTransportPreviousAvailability(replayState = {}) {
  return Boolean(replayState.previousAvailable);
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
    case 'previous':
      if (!state.previousAvailable) {
        return Object.freeze({
          command: null,
          nextState: createReplayTransportState(state),
          payload: undefined,
        });
      }
      return Object.freeze({
        command: CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS,
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
          previousAvailable: state.previousAvailable,
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
    previousAvailable: resolveReplayTransportPreviousAvailability(replayState),
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

export function mountReplayTransport(root, {
  dispatchCommand = dispatchRuntimeCommand,
  getVisiblePaneIds = null,
  positionPreference,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Replay transport root is required.');
  }
  let state = createReplayTransportState();
  const abortController = new AbortController();
  const signal = abortController.signal;
  const unsubscribeCallbacks = [];
  const positionController = mountReplayTransportPositionController(root, {
    positionPreference,
    signal,
  });

  function setState(nextState) {
    state = createReplayTransportState(nextState);
    renderReplayTransport(root, state);
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
      command !== CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS &&
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
          previousAvailable: state.previousAvailable,
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
      previousAvailable: state.previousAvailable,
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
      previousAvailable: state.previousAvailable,
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

  const periodMenuController = mountReplayTransportPeriodMenuController(root, {
    onSelect: dispatchPeriodChange,
    signal,
  });

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
    if (periodMenuController.handleKeydown(event)) return;
    if (periodMenuController.isOpen()) return;
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
      subscribeEvent(REPLAY_EVENTS.REWOUND, syncFromReplayEvent),
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
  return Object.freeze({
    destroy() {
      abortController.abort();
      positionController.destroy();
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
