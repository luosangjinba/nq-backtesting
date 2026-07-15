import {
  PANE_COMMANDS,
  PANE_EVENTS,
  PLAYBACK_PERIOD_COMMANDS,
  PLAYBACK_PERIOD_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export const PLAYBACK_PERIOD_OPTIONS = Object.freeze([
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
]);

function normalizePeriod(value) {
  const period = String(value || '').trim().toLowerCase();
  if (!PLAYBACK_PERIOD_OPTIONS.includes(period)) {
    throw new Error(`Unsupported playback period: ${value}`);
  }
  return period;
}

function normalizeSync(value) {
  return Boolean(value);
}

function periodFromPane(pane = {}) {
  const displayTimeframe = Number(pane.displayTimeframe);
  if (!Number.isInteger(displayTimeframe) || displayTimeframe <= 0) {
    return '1m';
  }
  const period = displayTimeframe % 60 === 0
    ? `${displayTimeframe / 60}h`
    : `${displayTimeframe}m`;
  return PLAYBACK_PERIOD_OPTIONS.includes(period) ? period : '1m';
}

function createPlaybackPeriodState({
  activeDisplayTimeframe = 1,
  activePaneId = null,
  period = '1m',
  sync = false,
} = {}) {
  return Object.freeze({
    activeDisplayTimeframe: Number(activeDisplayTimeframe) || 1,
    activePaneId: activePaneId ? String(activePaneId) : null,
    period: normalizePeriod(period),
    sync: normalizeSync(sync),
  });
}

function stateChanged(previous, next) {
  return (
    previous.activeDisplayTimeframe !== next.activeDisplayTimeframe ||
    previous.activePaneId !== next.activePaneId ||
    previous.period !== next.period ||
    previous.sync !== next.sync
  );
}

export function createPlaybackPeriodRuntime() {
  const unregisterCallbacks = [];
  let emit = () => {};
  let state = createPlaybackPeriodState();

  function setState(nextInput) {
    const nextState = createPlaybackPeriodState({
      ...state,
      ...nextInput,
    });
    if (stateChanged(state, nextState)) {
      state = nextState;
      emit(PLAYBACK_PERIOD_EVENTS.CHANGED, state);
    } else {
      state = nextState;
    }
    return state;
  }

  function syncToPane(pane) {
    if (!pane || !state.sync) return state;
    return setState({
      activeDisplayTimeframe: pane.displayTimeframe,
      activePaneId: pane.id,
      period: periodFromPane(pane),
      sync: true,
    });
  }

  async function setSync({ sync } = {}) {
    if (!normalizeSync(sync)) {
      return setState({ sync: false });
    }
    const pane = await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
    return setState({
      activeDisplayTimeframe: pane?.displayTimeframe,
      activePaneId: pane?.id,
      period: periodFromPane(pane),
      sync: true,
    });
  }

  function setPeriod({ period } = {}) {
    return setState({
      period: normalizePeriod(period),
      sync: false,
    });
  }

  function handlePaneActiveChanged(pane) {
    syncToPane(pane);
  }

  function handlePaneDisplayTimeframeChanged(pane) {
    if (!pane || !state.sync) return;
    if (pane.id === state.activePaneId || pane.active) {
      syncToPane(pane);
    }
  }

  function start({ emitEvent, subscribeEvent = subscribeRuntimeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => state),
      registerCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, setPeriod),
      registerCommand(PLAYBACK_PERIOD_COMMANDS.SET_SYNC, setSync),
      subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, handlePaneActiveChanged),
      subscribeEvent(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, handlePaneDisplayTimeframeChanged),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    state = createPlaybackPeriodState();
  }

  return {
    id: 'runtime.playback-period',
    start,
    stop,
  };
}
