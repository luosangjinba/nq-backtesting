const listeners = new Map();
const listenerErrors = [];
const MAX_LISTENER_ERRORS = 50;

function recordListenerError(eventName, error) {
  listenerErrors.push(Object.freeze({
    eventName,
    message: error?.message || String(error),
    timestamp: Date.now(),
  }));
  if (listenerErrors.length > MAX_LISTENER_ERRORS) {
    listenerErrors.splice(0, listenerErrors.length - MAX_LISTENER_ERRORS);
  }
}

function normalizeName(name, label) {
  const normalized = String(name || '').trim();
  if (!normalized) {
    throw new Error(`${label} name must be a non-empty string.`);
  }
  return normalized;
}

export function subscribeEvent(name, listener) {
  const eventName = normalizeName(name, 'Event');
  if (typeof listener !== 'function') {
    throw new Error(`Event "${eventName}" listener must be a function.`);
  }
  const eventListeners = listeners.get(eventName) || new Set();
  eventListeners.add(listener);
  listeners.set(eventName, eventListeners);
  return () => {
    eventListeners.delete(listener);
    if (!eventListeners.size) {
      listeners.delete(eventName);
    }
  };
}

export function emitEvent(name, payload = undefined) {
  const eventName = normalizeName(name, 'Event');
  const eventListeners = listeners.get(eventName);
  if (!eventListeners) return;
  [...eventListeners].forEach((listener) => {
    try {
      const result = listener(payload);
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch((error) => recordListenerError(eventName, error));
      }
    } catch (error) {
      recordListenerError(eventName, error);
    }
  });
}

export function listEventErrors() {
  return listenerErrors.map((record) => ({ ...record }));
}

export function listenerCount(name) {
  return listeners.get(String(name || '').trim())?.size || 0;
}

export function clearEventsForTest() {
  listeners.clear();
  listenerErrors.length = 0;
}
