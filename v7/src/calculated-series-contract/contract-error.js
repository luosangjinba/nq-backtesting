/** Stable fail-closed error for calculated-series portable contracts. */
export class CalculatedSeriesContractError extends Error {
  constructor(code, message, location = null) {
    super(message);
    this.name = 'CalculatedSeriesContractError';
    this.code = code;
    this.location = location;
  }
}

export function failCalculatedSeries(code, message, location = null) {
  throw new CalculatedSeriesContractError(code, message, location);
}
