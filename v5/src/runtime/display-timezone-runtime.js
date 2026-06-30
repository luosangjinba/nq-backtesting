import { registerCommand } from './commands.js';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
  DISPLAY_TIMEZONE_COMMANDS,
  DISPLAY_TIMEZONE_EVENTS,
} from '../contracts/timezone-contracts.js';
import { resolveDisplayTimezone } from './timezone-format.js';

export {
  DISPLAY_TIMEZONE_COMMANDS,
  DISPLAY_TIMEZONE_EVENTS,
};

function assertValidTimeZone(timeZone) {
  if (timeZone === 'Exchange' || timeZone === 'UTC') return;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new Error(`Unsupported display timezone: ${timeZone}`);
  }
}

export function createDisplayTimezoneRuntime({
  defaultDisplayTimezone = DEFAULT_DISPLAY_TIMEZONE,
  exchangeTimezone = DEFAULT_EXCHANGE_TIMEZONE,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  let state = {
    displayTimezone: defaultDisplayTimezone,
    exchangeTimezone,
    resolvedTimezone: resolveDisplayTimezone(defaultDisplayTimezone, { exchangeTimezone }),
  };

  assertValidTimeZone(defaultDisplayTimezone);
  assertValidTimeZone(exchangeTimezone);

  function snapshot() {
    return { ...state };
  }

  function setDisplayTimezone({ displayTimezone } = {}) {
    const nextDisplayTimezone = displayTimezone || DEFAULT_DISPLAY_TIMEZONE;
    assertValidTimeZone(nextDisplayTimezone);
    const nextState = {
      displayTimezone: nextDisplayTimezone,
      exchangeTimezone,
      resolvedTimezone: resolveDisplayTimezone(nextDisplayTimezone, { exchangeTimezone }),
    };
    const changed = nextState.displayTimezone !== state.displayTimezone
      || nextState.resolvedTimezone !== state.resolvedTimezone;
    state = nextState;
    if (changed) {
      emit(DISPLAY_TIMEZONE_EVENTS.CHANGED, snapshot());
    }
    return snapshot();
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(DISPLAY_TIMEZONE_COMMANDS.GET, () => snapshot()),
      registerCommand(DISPLAY_TIMEZONE_COMMANDS.SET, (payload) => setDisplayTimezone(payload))
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.displayTimezone',
    start,
    stop,
  };
}
