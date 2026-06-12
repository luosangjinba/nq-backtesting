import * as bus from '../event-bus.js';
import { DEFAULT_PRIMARY_INSTRUMENT, INSTRUMENT_OPTIONS } from '../config.js';

const STORAGE_KEY = 'v4:primary-instrument';
const SUPPORTED_INSTRUMENTS = new Set(INSTRUMENT_OPTIONS);

let currentInstrument = loadInitialInstrument();

function normalizeInstrument(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return SUPPORTED_INSTRUMENTS.has(normalized) ? normalized : DEFAULT_PRIMARY_INSTRUMENT;
}

function loadInitialInstrument() {
  try {
    return normalizeInstrument(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PRIMARY_INSTRUMENT;
  }
}

function persistInstrument(instrument) {
  try {
    localStorage.setItem(STORAGE_KEY, instrument);
  } catch {
    // Ignore unavailable storage; runtime state is still valid.
  }
}

export function getPrimaryInstrument() {
  return currentInstrument;
}

export function setPrimaryInstrument(instrument) {
  const nextInstrument = normalizeInstrument(instrument);
  if (nextInstrument === currentInstrument) return currentInstrument;
  const previousInstrument = currentInstrument;
  currentInstrument = nextInstrument;
  persistInstrument(currentInstrument);
  bus.emit('primary-instrument:changed', {
    instrument: currentInstrument,
    previousInstrument,
  });
  return currentInstrument;
}

export function initPrimaryInstrumentStore() {
  currentInstrument = normalizeInstrument(currentInstrument);
  persistInstrument(currentInstrument);
  bus.emit('primary-instrument:ready', { instrument: currentInstrument });
}
