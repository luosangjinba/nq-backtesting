import { failSessionHours } from './session-hours-error.js';

export function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failSessionHours('SESSION_HOURS_VALUE_INVALID', `${label} must be an object.`);
  }
  const expected = [...fields].sort().join(',');
  if (Object.keys(value).sort().join(',') !== expected) {
    failSessionHours('SESSION_HOURS_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

export function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failSessionHours('SESSION_HOURS_STRING_INVALID', `${label} must be a non-empty exact string.`);
  }
  return value;
}

export function requireMode(value) {
  if (value !== 'eth' && value !== 'rth') {
    failSessionHours('SESSION_HOURS_MODE_INVALID', 'mode must be eth or rth.');
  }
  return value;
}

export function requireEpochMs(value, label) {
  if (!Number.isSafeInteger(value) || Number.isNaN(new Date(value).getTime())) {
    failSessionHours('SESSION_HOURS_EPOCH_INVALID', `${label} must be a safe integer epoch.`);
  }
  return value;
}

export function freezeSourceEpochs(values) {
  if (!Array.isArray(values)) {
    failSessionHours('SESSION_HOURS_SOURCE_EPOCHS_INVALID', 'sourceEpochs must be an array.');
  }
  let previous = null;
  const normalized = values.map((value) => {
    requireEpochMs(value, 'sourceEpoch');
    if (previous !== null && value <= previous) {
      failSessionHours('SESSION_HOURS_SOURCE_EPOCHS_NOT_ORDERED', 'sourceEpochs must be strictly ordered.');
    }
    previous = value;
    return value;
  });
  return Object.freeze(normalized);
}
