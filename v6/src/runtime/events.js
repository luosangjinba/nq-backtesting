const listeners = new Map();

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
  [...eventListeners].forEach((listener) => listener(payload));
}

export function listenerCount(name) {
  return listeners.get(String(name || '').trim())?.size || 0;
}

export function clearEventsForTest() {
  listeners.clear();
}
