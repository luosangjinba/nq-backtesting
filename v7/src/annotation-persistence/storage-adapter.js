import { failAnnotationPersistence } from './annotation-persistence-error.js';

/** Adapt one explicitly supplied Web Storage-compatible object. */
export function createAnnotationStorageAdapter(storage) {
  if (!storage || typeof storage !== 'object') {
    failAnnotationPersistence('ANNOTATION_STORAGE_INVALID', 'Annotation storage object is required.');
  }
  for (const method of ['getItem', 'removeItem', 'setItem']) {
    if (typeof storage[method] !== 'function') {
      failAnnotationPersistence('ANNOTATION_STORAGE_INVALID', `Annotation storage requires ${method}().`);
    }
  }
  function invoke(method, ...args) {
    try { return storage[method](...args); } catch (cause) {
      failAnnotationPersistence(
        'ANNOTATION_STORAGE_OPERATION_FAILED',
        `Annotation storage ${method} failed.`,
        { cause },
      );
    }
  }
  return Object.freeze({
    read(key) {
      const value = invoke('getItem', key);
      return value === null ? null : String(value);
    },
    remove: (key) => invoke('removeItem', key),
    write: (key, value) => invoke('setItem', key, value),
  });
}
