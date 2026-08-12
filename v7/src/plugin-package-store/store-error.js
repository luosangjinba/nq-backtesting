/** Stable public failure for local package inventory, transaction, and recovery commands. */
export class PluginPackageStoreError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'PluginPackageStoreError';
    this.code = code;
  }
}

export function failPluginPackageStore(code, message, options) {
  throw new PluginPackageStoreError(code, message, options);
}
