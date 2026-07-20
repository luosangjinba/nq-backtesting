/** Stable public error for invalid raw Bar Data contract values. */
export class BarDataContractError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'BarDataContractError';
    this.code = code;
  }
}

export function failBarDataContract(code, message) {
  throw new BarDataContractError(code, message);
}
