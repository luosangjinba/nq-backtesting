const handlers = new Map();

function normalizeName(name, label) {
  const normalized = String(name || '').trim();
  if (!normalized) {
    throw new Error(`${label} name must be a non-empty string.`);
  }
  return normalized;
}

export function registerCommand(name, handler) {
  const commandName = normalizeName(name, 'Command');
  if (typeof handler !== 'function') {
    throw new Error(`Command "${commandName}" handler must be a function.`);
  }
  if (handlers.has(commandName)) {
    throw new Error(`Command "${commandName}" is already registered.`);
  }
  handlers.set(commandName, handler);
  return () => {
    if (handlers.get(commandName) === handler) {
      handlers.delete(commandName);
    }
  };
}

export async function dispatchCommand(name, payload = undefined) {
  const commandName = normalizeName(name, 'Command');
  const handler = handlers.get(commandName);
  if (!handler) {
    throw new Error(`Command "${commandName}" is not registered.`);
  }
  return handler(payload);
}

export function hasCommand(name) {
  return handlers.has(String(name || '').trim());
}

export function listCommands() {
  return [...handlers.keys()].sort();
}

export function clearCommandsForTest() {
  handlers.clear();
}
