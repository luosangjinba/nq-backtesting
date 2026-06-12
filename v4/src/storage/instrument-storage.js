import { DEFAULT_PRIMARY_INSTRUMENT, INSTRUMENT_OPTIONS } from '../config.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';

const SUPPORTED_INSTRUMENTS = new Set(INSTRUMENT_OPTIONS);

export function normalizeInstrumentForStorage(instrument = getPrimaryInstrument()) {
  const normalized = String(instrument || '').trim().toUpperCase();
  return SUPPORTED_INSTRUMENTS.has(normalized) ? normalized : DEFAULT_PRIMARY_INSTRUMENT;
}

export function getInstrumentStorageKey(baseKey, instrument = getPrimaryInstrument()) {
  return `${baseKey}:${normalizeInstrumentForStorage(instrument)}`;
}
