export const LAYOUT_COMMANDS = Object.freeze({
  GET_STATE: 'layout.getState',
  SET_ACTIVE_PANE: 'layout.setActivePane',
  SET_MODE: 'layout.setMode',
  SET_SYNC: 'layout.setSync',
  SET_PANE_DISPLAY_TIMEFRAME: 'layout.setPaneDisplayTimeframe',
});

export const LAYOUT_EVENTS = Object.freeze({
  CHANGED: 'layout:changed',
});

export const LAYOUT_MODES = Object.freeze({
  SINGLE: 'single',
  TWICE: 'twice',
  TRIPLE: 'triple',
});

export const LAYOUT_SYNC_KEYS = Object.freeze({
  SYMBOL: 'symbol',
  INTERVAL: 'interval',
  CROSSHAIR: 'crosshair',
  TIME: 'time',
  DATE_RANGE: 'dateRange',
});

export const DEFAULT_ACTIVE_PANE_ID = 'primary';

export const DEFAULT_LAYOUT_SYNC = Object.freeze({
  symbol: false,
  interval: false,
  crosshair: false,
  time: false,
  dateRange: false,
});

export const DEFAULT_LAYOUT_STATE = Object.freeze({
  mode: LAYOUT_MODES.SINGLE,
  activePaneId: DEFAULT_ACTIVE_PANE_ID,
  sync: DEFAULT_LAYOUT_SYNC,
  panes: Object.freeze([
    Object.freeze({
      id: DEFAULT_ACTIVE_PANE_ID,
      role: 'primary',
      instrument: null,
      displayTimeframe: null,
      presentationSettingsId: null,
    }),
  ]),
});
