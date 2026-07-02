import { registerCommand } from './commands.js';
import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_LAYOUT_SYNC,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  LAYOUT_MODES,
  LAYOUT_SYNC_KEYS,
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
    role: pane.role || 'primary',
    instrument: pane.instrument || null,
    displayTimeframe: pane.displayTimeframe == null ? null : Number(pane.displayTimeframe),
    presentationSettingsId: pane.presentationSettingsId || null,
  };
}

function normalizeSync(sync = {}) {
  return {
    symbol: Boolean(sync.symbol ?? DEFAULT_LAYOUT_SYNC.symbol),
    interval: Boolean(sync.interval ?? DEFAULT_LAYOUT_SYNC.interval),
    crosshair: Boolean(sync.crosshair ?? DEFAULT_LAYOUT_SYNC.crosshair),
    time: Boolean(sync.time ?? DEFAULT_LAYOUT_SYNC.time),
    dateRange: Boolean(sync.dateRange ?? DEFAULT_LAYOUT_SYNC.dateRange),
  };
}

function paneCountForMode(mode) {
  if (mode === LAYOUT_MODES.TRIPLE) return 3;
  if (mode === LAYOUT_MODES.TWICE) return 2;
  return 1;
}

function defaultPaneForIndex(index, existingPane = {}) {
  const defaults = [
    { id: 'primary', role: 'primary' },
    { id: 'secondary', role: 'secondary' },
    { id: 'tertiary', role: 'tertiary' },
  ];
  return normalizePane({
    ...defaults[index],
    ...existingPane,
    id: existingPane.id || defaults[index].id,
    role: existingPane.role || defaults[index].role,
  });
}

function panesForMode(mode, currentPanes = []) {
  const count = paneCountForMode(mode);
  return Array.from({ length: count }, (_, index) => defaultPaneForIndex(index, currentPanes[index]));
}

function normalizeLayoutState(input = DEFAULT_LAYOUT_STATE) {
  const mode = Object.values(LAYOUT_MODES).includes(input.mode)
    ? input.mode
    : LAYOUT_MODES.SINGLE;
  const panes = (Array.isArray(input.panes) && input.panes.length
    ? input.panes
    : DEFAULT_LAYOUT_STATE.panes
  ).map(normalizePane);
  const expectedPaneCount = paneCountForMode(mode);
  if (panes.length !== expectedPaneCount) {
    throw new Error(`${mode} layout mode must contain exactly ${expectedPaneCount} pane(s).`);
  }
  const activePaneId = String(input.activePaneId || DEFAULT_ACTIVE_PANE_ID || panes[0].id).trim();
  if (!panes.some((pane) => pane.id === activePaneId)) {
    throw new Error(`layout active pane "${activePaneId}" does not exist.`);
  }
  return {
    mode,
    activePaneId,
    sync: normalizeSync(input.sync),
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

  function setMode({ mode } = {}) {
    const nextMode = Object.values(LAYOUT_MODES).includes(mode) ? mode : null;
    if (!nextMode) {
      throw new Error(`Unsupported layout mode: ${mode}`);
    }
    const panes = panesForMode(nextMode, state.panes);
    const activePaneId = panes.some((pane) => pane.id === state.activePaneId)
      ? state.activePaneId
      : DEFAULT_ACTIVE_PANE_ID;
    const nextState = normalizeLayoutState({
      ...state,
      mode: nextMode,
      activePaneId,
      panes,
    });
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function setSync({ key, value } = {}) {
    if (!Object.values(LAYOUT_SYNC_KEYS).includes(key)) {
      throw new Error(`Unsupported layout sync key: ${key}`);
    }
    const nextState = normalizeLayoutState({
      ...state,
      sync: {
        ...state.sync,
        [key]: Boolean(value),
      },
    });
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
      registerCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, (payload) => setActivePane(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_MODE, (payload) => setMode(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_SYNC, (payload) => setSync(payload))
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
