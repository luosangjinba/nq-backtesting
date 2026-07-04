import { registerCommand } from './commands.js';
import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  DEFAULT_LAYOUT_SYNC,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  LAYOUT_MODES,
  LAYOUT_SYNC_KEYS,
  LAYOUT_VARIANTS,
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
    time: normalizePaneTime(pane.time),
    dateRange: normalizePaneDateRange(pane.dateRange),
    crosshair: normalizePaneCrosshair(pane.crosshair),
    presentationSettingsId: pane.presentationSettingsId || null,
  };
}

function normalizePaneTime(value) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('layout pane time must be a valid timestamp.');
  }
  return new Date(parsed).toISOString();
}

function normalizePaneDateRange(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object') {
    throw new Error('layout pane date range must be an object.');
  }
  const from = normalizePaneTime(value.from);
  const to = normalizePaneTime(value.to);
  if (from == null || to == null) {
    throw new Error('layout pane date range must include from and to.');
  }
  if (Date.parse(to) < Date.parse(from)) {
    throw new Error('layout pane date range to must be greater than or equal to from.');
  }
  return { from, to };
}

function normalizePaneCrosshair(value) {
  if (value == null || value === false) return null;
  if (!value || typeof value !== 'object' || !value.active) {
    return { active: false, time: null, price: null, point: null };
  }
  const price = value.price == null ? null : Number(value.price);
  const point = value.point && typeof value.point === 'object'
    ? {
      x: Number(value.point.x ?? 0),
      y: Number(value.point.y ?? 0),
    }
    : null;
  return {
    active: true,
    time: normalizePaneTime(value.time),
    price: Number.isFinite(price) ? price : null,
    point,
  };
}

function normalizeDisplayTimeframe(value) {
  if (value == null) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('layout display timeframe must be a positive number.');
  }
  return normalized;
}

function normalizeRatio(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(10, Math.max(0.1, number));
}

function normalizeSplit(split = {}, panes = []) {
  const sourceRatios = split?.ratios && typeof split.ratios === 'object'
    ? split.ratios
    : DEFAULT_LAYOUT_STATE.split.ratios;
  return {
    ratios: Object.fromEntries(panes.map((pane) => [
      pane.id,
      normalizeRatio(sourceRatios[pane.id], DEFAULT_LAYOUT_STATE.split.ratios[pane.id] || 1),
    ])),
  };
}

function normalizeSplitRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error('layout split ratio must be a finite number.');
  }
  return Math.min(85, Math.max(15, number));
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

function modeForVariant(variant) {
  if (String(variant).startsWith('triple.')) return LAYOUT_MODES.TRIPLE;
  if (String(variant).startsWith('twice.')) return LAYOUT_MODES.TWICE;
  return LAYOUT_MODES.SINGLE;
}

function defaultVariantForMode(mode) {
  if (mode === LAYOUT_MODES.TRIPLE) return LAYOUT_VARIANTS.TRIPLE_VERTICAL;
  if (mode === LAYOUT_MODES.TWICE) return LAYOUT_VARIANTS.TWICE_VERTICAL;
  return LAYOUT_VARIANTS.SINGLE_DEFAULT;
}

function normalizeLayoutVariant({ mode, variant } = {}) {
  if (variant != null) {
    if (!Object.values(LAYOUT_VARIANTS).includes(variant)) {
      throw new Error(`Unsupported layout variant: ${variant}`);
    }
    const variantMode = modeForVariant(variant);
    if (mode && mode !== variantMode) {
      throw new Error(`Layout variant ${variant} is not valid for ${mode} mode.`);
    }
    return {
      mode: variantMode,
      variant,
    };
  }
  if (!Object.values(LAYOUT_MODES).includes(mode)) {
    throw new Error(`Unsupported layout mode: ${mode}`);
  }
  return {
    mode,
    variant: defaultVariantForMode(mode),
  };
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

const INITIAL_ACTIVE_PANE_BY_VARIANT = Object.freeze({
  [LAYOUT_VARIANTS.SINGLE_DEFAULT]: DEFAULT_ACTIVE_PANE_ID,
  [LAYOUT_VARIANTS.TWICE_VERTICAL]: 'secondary',
  [LAYOUT_VARIANTS.TWICE_HORIZONTAL]: DEFAULT_ACTIVE_PANE_ID,
  [LAYOUT_VARIANTS.TRIPLE_VERTICAL]: 'tertiary',
  [LAYOUT_VARIANTS.TRIPLE_HORIZONTAL]: DEFAULT_ACTIVE_PANE_ID,
  [LAYOUT_VARIANTS.TRIPLE_LEFT]: 'secondary',
  [LAYOUT_VARIANTS.TRIPLE_RIGHT]: DEFAULT_ACTIVE_PANE_ID,
  [LAYOUT_VARIANTS.TRIPLE_TOP]: DEFAULT_ACTIVE_PANE_ID,
  [LAYOUT_VARIANTS.TRIPLE_BOTTOM]: 'secondary',
});

function preferredActivePaneForVariant(variant, panes = []) {
  const preferredPaneId = INITIAL_ACTIVE_PANE_BY_VARIANT[variant] || DEFAULT_ACTIVE_PANE_ID;
  if (panes.some((pane) => pane.id === preferredPaneId)) {
    return preferredPaneId;
  }
  return panes.some((pane) => pane.id === DEFAULT_ACTIVE_PANE_ID)
    ? DEFAULT_ACTIVE_PANE_ID
    : panes[0]?.id || DEFAULT_ACTIVE_PANE_ID;
}

function nextActivePaneForModeChange({ previousPaneCount, previousActivePaneId, variant, panes }) {
  if (previousPaneCount === 1 && panes.length > 1) {
    return preferredActivePaneForVariant(variant, panes);
  }
  if (panes.some((pane) => pane.id === previousActivePaneId)) {
    return previousActivePaneId;
  }
  return DEFAULT_ACTIVE_PANE_ID;
}

function normalizeLayoutState(input = DEFAULT_LAYOUT_STATE) {
  const layout = normalizeLayoutVariant({
    mode: input.mode || DEFAULT_LAYOUT_STATE.mode,
    variant: input.variant || defaultVariantForMode(input.mode || DEFAULT_LAYOUT_STATE.mode),
  });
  const panes = (Array.isArray(input.panes) && input.panes.length
    ? input.panes
    : DEFAULT_LAYOUT_STATE.panes
  ).map(normalizePane);
  const expectedPaneCount = paneCountForMode(layout.mode);
  if (panes.length !== expectedPaneCount) {
    throw new Error(`${layout.mode} layout mode must contain exactly ${expectedPaneCount} pane(s).`);
  }
  const activePaneId = String(input.activePaneId || DEFAULT_ACTIVE_PANE_ID || panes[0].id).trim();
  if (!panes.some((pane) => pane.id === activePaneId)) {
    throw new Error(`layout active pane "${activePaneId}" does not exist.`);
  }
  return {
    mode: layout.mode,
    variant: layout.variant,
    activePaneId,
    sync: normalizeSync(input.sync),
    split: normalizeSplit(input.split, panes),
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

  function setMode({ mode, variant } = {}) {
    const layout = normalizeLayoutVariant({ mode, variant });
    const nextMode = layout.mode;
    const previousPaneCount = state.panes.length;
    const panes = panesForMode(nextMode, state.panes);
    const activePaneId = nextActivePaneForModeChange({
      previousPaneCount,
      previousActivePaneId: state.activePaneId,
      variant: layout.variant,
      panes,
    });
    const nextState = normalizeLayoutState({
      ...state,
      mode: nextMode,
      variant: layout.variant,
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

  function setPaneDisplayTimeframe({ paneId, displayTimeframe } = {}) {
    const targetPaneId = String(paneId || state.activePaneId || DEFAULT_ACTIVE_PANE_ID).trim();
    if (!targetPaneId) {
      throw new Error('layout pane id must be a non-empty string.');
    }
    if (!state.panes.some((pane) => pane.id === targetPaneId)) {
      throw new Error(`layout pane "${targetPaneId}" does not exist.`);
    }
    const normalizedDisplayTimeframe = normalizeDisplayTimeframe(displayTimeframe);
    const nextState = normalizeLayoutState({
      ...state,
      panes: state.panes.map((pane) => (
        state.sync.interval || pane.id === targetPaneId
          ? {
            ...pane,
            displayTimeframe: normalizedDisplayTimeframe,
          }
          : pane
      )),
    });
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function updatePanesForSync({ paneId, syncKey, patch }) {
    const targetPaneId = String(paneId || state.activePaneId || DEFAULT_ACTIVE_PANE_ID).trim();
    if (!targetPaneId) {
      throw new Error('layout pane id must be a non-empty string.');
    }
    if (!state.panes.some((pane) => pane.id === targetPaneId)) {
      throw new Error(`layout pane "${targetPaneId}" does not exist.`);
    }
    return state.panes.map((pane) => (
      state.sync[syncKey] || pane.id === targetPaneId
        ? {
          ...pane,
          ...patch,
        }
        : pane
    ));
  }

  function setPaneTime({ paneId, time } = {}) {
    const nextState = normalizeLayoutState({
      ...state,
      panes: updatePanesForSync({
        paneId,
        syncKey: 'time',
        patch: { time: normalizePaneTime(time) },
      }),
    });
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function setPaneDateRange({ paneId, dateRange } = {}) {
    const nextState = normalizeLayoutState({
      ...state,
      panes: updatePanesForSync({
        paneId,
        syncKey: 'dateRange',
        patch: { dateRange: normalizePaneDateRange(dateRange) },
      }),
    });
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function setPaneCrosshair({ paneId, crosshair } = {}) {
    const nextState = normalizeLayoutState({
      ...state,
      panes: updatePanesForSync({
        paneId,
        syncKey: 'crosshair',
        patch: { crosshair: normalizePaneCrosshair(crosshair) },
      }),
    });
    const changed = !sameLayout(nextState, state);
    state = nextState;
    if (changed) {
      emit(LAYOUT_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function setSplitRatio({ firstPaneId, secondPaneId, ratio } = {}) {
    const first = String(firstPaneId || '').trim();
    const second = String(secondPaneId || '').trim();
    if (!first || !second || first === second) {
      throw new Error('layout split ratio requires two distinct pane ids.');
    }
    if (!state.panes.some((pane) => pane.id === first) || !state.panes.some((pane) => pane.id === second)) {
      throw new Error('layout split ratio pane does not exist.');
    }
    const firstShare = normalizeSplitRatio(ratio) / 100;
    const currentRatios = normalizeSplit(state.split, state.panes).ratios;
    const pairTotal = normalizeRatio(currentRatios[first]) + normalizeRatio(currentRatios[second]);
    const nextState = normalizeLayoutState({
      ...state,
      split: {
        ratios: {
          ...currentRatios,
          [first]: pairTotal * firstShare,
          [second]: pairTotal * (1 - firstShare),
        },
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
      registerCommand(LAYOUT_COMMANDS.SET_SYNC, (payload) => setSync(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, (payload) => setPaneDisplayTimeframe(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_PANE_TIME, (payload) => setPaneTime(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, (payload) => setPaneDateRange(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR, (payload) => setPaneCrosshair(payload)),
      registerCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, (payload) => setSplitRatio(payload))
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
