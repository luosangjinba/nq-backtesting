const handlers = new Map();

export function registerCommand(name, handler) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Command name must be a non-empty string.');
  }
  if (typeof handler !== 'function') {
    throw new Error(`Command "${name}" handler must be a function.`);
  }
  if (handlers.has(name)) {
    throw new Error(`Command "${name}" is already registered.`);
  }

  handlers.set(name, handler);
  return () => {
    if (handlers.get(name) === handler) {
      handlers.delete(name);
    }
  };
}

export async function dispatchCommand(name, payload = undefined) {
  const handler = handlers.get(name);
  if (!handler) {
    throw new Error(`Command "${name}" is not registered.`);
  }

  return handler(payload);
}

export function hasCommand(name) {
  return handlers.has(name);
}

export function listCommands() {
  return [...handlers.keys()].sort();
}

export function clearCommandsForTest() {
  handlers.clear();
}
