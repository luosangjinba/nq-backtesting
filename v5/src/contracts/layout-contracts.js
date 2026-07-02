export const LAYOUT_COMMANDS = Object.freeze({
  GET_STATE: 'layout.getState',
  SET_ACTIVE_PANE: 'layout.setActivePane',
});

export const LAYOUT_EVENTS = Object.freeze({
  CHANGED: 'layout:changed',
});

export const LAYOUT_MODES = Object.freeze({
  SINGLE: 'single',
  TWO_PANE: 'two-pane',
});

export const DEFAULT_ACTIVE_PANE_ID = 'primary';

export const DEFAULT_LAYOUT_STATE = Object.freeze({
  mode: LAYOUT_MODES.SINGLE,
  activePaneId: DEFAULT_ACTIVE_PANE_ID,
  panes: Object.freeze([
    Object.freeze({
      id: DEFAULT_ACTIVE_PANE_ID,
      role: 'primary',
      instrument: null,
      displayTimeframe: null,
      presentationSettingsId: null,
      sync: Object.freeze({
        timeframe: false,
        viewport: false,
        crosshair: false,
      }),
    }),
  ]),
});
