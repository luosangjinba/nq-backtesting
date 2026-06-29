const modules = new Map();
let started = false;

function normalizeModule(moduleDefinition) {
  if (!moduleDefinition || typeof moduleDefinition !== 'object') {
    throw new Error('Module definition must be an object.');
  }
  const { id, start, stop } = moduleDefinition;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Module id must be a non-empty string.');
  }
  if (start !== undefined && typeof start !== 'function') {
    throw new Error(`Module "${id}" start hook must be a function.`);
  }
  if (stop !== undefined && typeof stop !== 'function') {
    throw new Error(`Module "${id}" stop hook must be a function.`);
  }
  return {
    id,
    start: start || (() => {}),
    stop: stop || (() => {}),
  };
}

export function registerModule(moduleDefinition) {
  if (started) {
    throw new Error('Cannot register modules after the registry has started.');
  }

  const normalized = normalizeModule(moduleDefinition);
  if (modules.has(normalized.id)) {
    throw new Error(`Module "${normalized.id}" is already registered.`);
  }
  modules.set(normalized.id, normalized);
  return normalized.id;
}

export async function startModules(context = {}) {
  if (started) return;
  started = true;

  for (const moduleDefinition of modules.values()) {
    await moduleDefinition.start(context);
  }
}

export async function stopModules(context = {}) {
  if (!started) return;

  for (const moduleDefinition of [...modules.values()].reverse()) {
    await moduleDefinition.stop(context);
  }
  started = false;
}

export function listModules() {
  return [...modules.keys()];
}

export function isModuleRegistryStarted() {
  return started;
}

export function clearModulesForTest() {
  modules.clear();
  started = false;
}
