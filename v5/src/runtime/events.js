const listeners = new Map();

export function subscribeEvent(name, listener) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Event name must be a non-empty string.');
  }
  if (typeof listener !== 'function') {
    throw new Error(`Event "${name}" listener must be a function.`);
  }

  const eventListeners = listeners.get(name) || new Set();
  eventListeners.add(listener);
  listeners.set(name, eventListeners);

  return () => {
    eventListeners.delete(listener);
    if (!eventListeners.size) {
      listeners.delete(name);
    }
  };
}

export function emitEvent(name, payload = undefined) {
  const eventListeners = listeners.get(name);
  if (!eventListeners) return;

  for (const listener of [...eventListeners]) {
    listener(payload);
  }
}

export function listenerCount(name) {
  return listeners.get(name)?.size || 0;
}

export function clearEventsForTest() {
  listeners.clear();
}
