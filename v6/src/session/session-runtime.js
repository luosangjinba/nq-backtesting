import { SESSION_COMMANDS, SESSION_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createReplaySession } from './session-domain.js';
import { createInMemorySessionRepository } from './session-repository.js';

export function createSessionRuntime({
  repository = createInMemorySessionRepository(),
} = {}) {
  const unregisterCallbacks = [];

  function getActiveSession() {
    return repository.getActive();
  }

  function createSession(input = {}) {
    const session = createReplaySession(input);
    return repository.save(session);
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(SESSION_COMMANDS.CREATE, (input = {}) => {
        const session = createSession(input);
        emitEvent?.(SESSION_EVENTS.CREATED, session);
        return session;
      }),
      registerCommand(SESSION_COMMANDS.GET_ACTIVE, () => getActiveSession()),
      registerCommand(SESSION_COMMANDS.GET_BY_ID, (id) => repository.getById(id)),
      registerCommand(SESSION_COMMANDS.LIST, () => repository.list())
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
