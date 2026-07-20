/** Stable error raised when a storage boundary cannot satisfy the repository port. */
export class SessionPersistenceError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'SessionPersistenceError';
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new SessionPersistenceError(code, message, options);
}

/**
 * Owner: session-store.
 * Purpose: adapt a Web Storage-compatible object without importing `window` or
 * choosing a process-global persistence surface.
 * Inputs: object implementing getItem, setItem, and removeItem.
 * Outputs: frozen UTF-8 string key/value port.
 * Side effects: delegates reads and writes only to the supplied storage object.
 * Errors: INVALID_STORAGE_PORT or STORAGE_OPERATION_FAILED.
 */
export function createStorageAdapter(storage) {
  if (!storage || typeof storage !== 'object') {
    fail('INVALID_STORAGE_PORT', 'A storage object is required.');
  }
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    if (typeof storage[method] !== 'function') {
      fail('INVALID_STORAGE_PORT', `Storage must implement ${method}().`);
    }
  }
  function invoke(method, ...args) {
    try {
      return storage[method](...args);
    } catch (cause) {
      fail('STORAGE_OPERATION_FAILED', `Storage ${method} failed.`, { cause });
    }
  }
  return Object.freeze({
    read(key) {
      const value = invoke('getItem', key);
      return value === null ? null : String(value);
    },
    write(key, value) {
      invoke('setItem', key, value);
    },
    remove(key) {
      invoke('removeItem', key);
    },
  });
}
