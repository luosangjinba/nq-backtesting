/** Stable public error for invalid plugin manifests, plans, parameters, or host snapshots. */
export class PluginContractError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'PluginContractError';
    this.code = code;
  }
}

export function failPluginContract(code, message, options) {
  throw new PluginContractError(code, message, options);
}
