export const APP_COMMANDS = Object.freeze({
  GET_STATUS: 'app.getStatus',
});

export const APP_EVENTS = Object.freeze({
  BOOTED: 'app:booted',
});

export const SESSION_COMMANDS = Object.freeze({
  CREATE: 'session.create',
  GET_ACTIVE: 'session.getActive',
  GET_BY_ID: 'session.getById',
  LIST: 'session.list',
});

export const SESSION_EVENTS = Object.freeze({
  CREATED: 'session:created',
});

export const BAR_DATA_COMMANDS = Object.freeze({
  GET_CACHE_SUMMARY: 'barData.getCacheSummary',
  GET_WINDOW: 'barData.getWindow',
  LOAD_WINDOW: 'barData.loadWindow',
  PLAN_WINDOW: 'barData.planWindow',
  RELEASE_WINDOW: 'barData.releaseWindow',
});

export const BAR_DATA_EVENTS = Object.freeze({
  WINDOW_LOADED: 'barData:windowLoaded',
  WINDOW_RELEASED: 'barData:windowReleased',
});

export const REPLAY_COMMANDS = Object.freeze({
  GET_STATE: 'replay.getState',
  LOAD_SESSION: 'replay.loadSession',
  NEXT: 'replay.next',
  PAUSE: 'replay.pause',
  PLAY: 'replay.play',
  RESET: 'replay.reset',
});

export const REPLAY_EVENTS = Object.freeze({
  ADVANCED: 'replay:advanced',
  LOADED: 'replay:loaded',
  PLAYBACK_CHANGED: 'replay:playbackChanged',
  RESET: 'replay:reset',
});
