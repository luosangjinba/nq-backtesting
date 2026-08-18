import { failCalculatedSeriesRuntime } from './runtime-error.js';

export function canonicalCalculatedSeriesValue(value) {
  if (Array.isArray(value)) return value.map(canonicalCalculatedSeriesValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalCalculatedSeriesValue(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}

/** Produce one browser/Node-compatible SHA-256 identity for portable evidence. */
export async function digestCalculatedSeriesValue(value, cryptoPort = globalThis.crypto) {
  if (typeof cryptoPort?.subtle?.digest !== 'function') {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_DIGEST_UNAVAILABLE',
      'Calculated-series runtime requires Web Crypto SHA-256.',
    );
  }
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalCalculatedSeriesValue(value)));
  const output = await cryptoPort.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(output)]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
