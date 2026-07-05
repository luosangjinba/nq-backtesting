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
