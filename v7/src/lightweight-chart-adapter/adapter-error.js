/** Stable browser adapter failure. */
export class LightweightChartAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LightweightChartAdapterError';
    this.code = code;
  }
}

export function failLightweightAdapter(code, message) {
  throw new LightweightChartAdapterError(code, message);
}
