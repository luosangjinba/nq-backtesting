/** Stable UI-adapter error for picker, directory-snapshot, and Developer Mode failures. */
export class LocalPluginPackageBrowserError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'LocalPluginPackageBrowserError';
    this.code = code;
  }
}

export function failLocalPluginPackageBrowser(code, message, options) {
  throw new LocalPluginPackageBrowserError(code, message, options);
}
