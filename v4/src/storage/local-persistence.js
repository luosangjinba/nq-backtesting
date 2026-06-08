function getDefaultStorage() {
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function reportError(onError, error, action) {
  if (typeof onError === 'function') {
    onError(error, action);
  }
}

export function readLocalJson(key, fallback = null, options = {}) {
  const storage = options.storage || getDefaultStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    reportError(options.onError, error, 'read');
    return fallback;
  }
}

export function writeLocalJson(key, value, options = {}) {
  const storage = options.storage || getDefaultStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    reportError(options.onError, error, 'write');
    return false;
  }
}

export function removeLocalJson(key, options = {}) {
  const storage = options.storage || getDefaultStorage();
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    reportError(options.onError, error, 'remove');
    return false;
  }
}

export function createLocalPersistence({
  key,
  fallback = null,
  storage = null,
  onError = null,
} = {}) {
  if (!key) throw new Error('createLocalPersistence requires a storage key');
  let restoring = false;

  function getOptions(options = {}) {
    return {
      ...options,
      storage: options.storage || storage || getDefaultStorage(),
      onError: options.onError || onError,
    };
  }

  return {
    key,
    isRestoring() {
      return restoring;
    },
    read(options = {}) {
      return readLocalJson(key, fallback, getOptions(options));
    },
    write(value, options = {}) {
      if (restoring) return false;
      return writeLocalJson(key, value, getOptions(options));
    },
    remove(options = {}) {
      return removeLocalJson(key, getOptions(options));
    },
    runRestoring(callback) {
      restoring = true;
      try {
        return callback();
      } finally {
        restoring = false;
      }
    },
  };
}
