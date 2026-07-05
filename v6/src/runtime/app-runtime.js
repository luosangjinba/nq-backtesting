import { APP_COMMANDS, APP_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from './commands.js';

export function createAppRuntime() {
  const unregisterCallbacks = [];
  let state = {
    booted: false,
    version: 'v6',
  };

  function snapshot() {
    return { ...state };
  }

  function start({ emitEvent } = {}) {
    state = {
      ...state,
      booted: true,
    };
    unregisterCallbacks.push(
      registerCommand(APP_COMMANDS.GET_STATUS, () => snapshot())
    );
    emitEvent?.(APP_EVENTS.BOOTED, snapshot());
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      ...state,
      booted: false,
    };
  }

  return {
    id: 'runtime.app',
    start,
    stop,
  };
}
