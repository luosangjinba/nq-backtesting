/** Stable adapter failure for IndexedDB package-store mechanics. */
export class PluginPackageStorageError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'PluginPackageStorageError';
    this.code = code;
  }
}

export function failPluginPackageStorage(code, message, options) {
  throw new PluginPackageStorageError(code, message, options);
}
