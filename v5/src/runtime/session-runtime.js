import { registerCommand } from './commands.js';
import { emitEvent } from './events.js';
import { SESSION_COMMANDS, SESSION_EVENTS } from '../contracts/session-contracts.js';
import { createSessionRepository } from '../session/session-repository.js';

export { SESSION_COMMANDS, SESSION_EVENTS };

export function createSessionRuntime(repository = createSessionRepository()) {
  const unregisterCallbacks = [];

  function start() {
    unregisterCallbacks.push(
      registerCommand(SESSION_COMMANDS.GET_CONTEXT, () => repository.getDefaultContext()),
      registerCommand(SESSION_COMMANDS.CREATE, (payload) => {
        const created = repository.createReplaySession(payload);
        emitEvent(SESSION_EVENTS.CREATED, created);
        return created;
      }),
      registerCommand(SESSION_COMMANDS.LIST, () => repository.listReplaySessions()),
      registerCommand(SESSION_COMMANDS.GET, ({ sessionId } = {}) => repository.getReplaySession(sessionId))
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.session',
    start,
    stop,
  };
}
