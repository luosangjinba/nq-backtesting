import { registerCommand } from './commands.js';
import {
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  LAYOUT_MODES,
} from '../contracts/layout-contracts.js';

export {
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
};

function cloneLayoutState(state) {
  return structuredClone(state);
}

function normalizePane(pane = {}) {
  const id = String(pane.id || '').trim();
  if (!id) {
    throw new Error('layout pane id must be a non-empty string.');
  }
  return {
    id,
    role: pane.role === 'secondary' ? 'secondary' : 'primary',
    instrument: pane.instrument || null,
    displayTimeframe: pane.displayTimeframe == null ? null : Number(pane.displayTimeframe),
    presentationSettingsId: pane.presentationSettingsId || null,
    sync: {
      timeframe: Boolean(pane.sync?.timeframe),
      viewport: Boolean(pane.sync?.viewport),
      crosshair: Boolean(pane.sync?.crosshair),
    },
  };
}

function normalizeLayoutState(input = DEFAULT_LAYOUT_STATE) {
  const mode = input.mode === LAYOUT_MODES.TWO_PANE ? LAYOUT_MODES.TWO_PANE : LAYOUT_MODES.SINGLE;
  const panes = (Array.isArray(input.panes) && input.panes.length
    ? input.panes
    : DEFAULT_LAYOUT_STATE.panes
  ).map(normalizePane);
  if (panes.length < 1 || panes.length > 2) {
    throw new Error('layout state must contain one or two panes.');
  }
  const activePaneId = String(input.activePaneId || panes[0].id).trim();
  if (!panes.some((pane) => pane.id === activePaneId)) {
    throw new Error(`layout active pane "${activePaneId}" does not exist.`);
  }
  if (mode === LAYOUT_MODES.SINGLE && panes.length !== 1) {
    throw new Error('single layout mode must contain exactly one pane.');
  }
  if (mode === LAYOUT_MODES.TWO_PANE && panes.length !== 2) {
    throw new Error('two-pane layout mode must contain exactly two panes.');
  }
  return {
    mode,
    activePaneId,
    panes,
  };
}

function sameLayout(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createLayoutRuntime({
  initialState = DEFAULT_LAYOUT_STATE,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  let state = normalizeLayoutState(initialState);

  function snapshot() {
    return cloneLayoutState(state);
  }

  function setActivePane({ paneId } = {}) {
    const nextActivePaneId = String(paneId || '').trim();
    if (!nextActivePaneId) {
      throw new Error('layout active pane id must be a non-empty string.');
    }
    if (!state.panes.some((pane) => pane.id === nextActivePaneId)) {
      throw new Error(`layout pane "${nextActivePaneId}" does not exist.`);
    }
    const nextState = {
      ...state,
      activePaneId: nextActivePaneId,
    };
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(LAYOUT_COMMANDS.GET_STATE, () => snapshot()),
      registerCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, (payload) => setActivePane(payload))
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.layout',
    start,
    stop,
  };
}
