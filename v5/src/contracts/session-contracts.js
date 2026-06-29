export const SESSION_COMMANDS = Object.freeze({
  GET_CONTEXT: 'session.getContext',
  CREATE: 'session.create',
  LIST: 'session.list',
  GET: 'session.get',
  UPDATE_CURSOR: 'session.updateCursor',
});

export const SESSION_EVENTS = Object.freeze({
  CREATED: 'session:created',
  CURSOR_UPDATED: 'session:cursorUpdated',
});
