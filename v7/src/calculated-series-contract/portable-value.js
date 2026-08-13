import { failCalculatedSeries } from './contract-error.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/u;
const CONTRACT_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

function dataPropertyKeys(value, label) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', `${label} cannot contain Symbol keys.`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || (key !== 'length' && !descriptor.enumerable)) {
      failCalculatedSeries(
        'CALCULATED_SERIES_NON_PORTABLE',
        `${label} must contain enumerable data properties only.`,
      );
    }
  }
  return keys;
}

function isAccessorFree(value, seen = new Set()) {
  if (typeof value === 'function') return false;
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) return false;
    if (!isAccessorFree(descriptor.value, seen)) return false;
  }
  return true;
}

export function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failCalculatedSeries(code, `${label} fields are invalid.`);
  }
  const keys = dataPropertyKeys(value, label);
  if (keys.sort().join(',') !== [...fields].sort().join(',')) {
    failCalculatedSeries(code, `${label} fields are invalid.`);
  }
  return value;
}

export function optionalExactRecord(value, required, optional, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    failCalculatedSeries(code, `${label} must be a plain record.`);
  }
  const keys = dataPropertyKeys(value, label);
  if (required.some((field) => !keys.includes(field))
    || keys.some((field) => !required.includes(field) && !optional.includes(field))) {
    failCalculatedSeries(code, `${label} fields are invalid.`);
  }
  return value;
}

export function exactArray(
  value,
  { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {},
  code,
  label,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    failCalculatedSeries(code, `${label} collection bounds are invalid.`);
  }
  const keys = dataPropertyKeys(value, label).filter((key) => key !== 'length');
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', `${label} must be a dense array.`);
  }
  return value;
}

export function contractId(value, label = 'Contract id') {
  if (typeof value !== 'string' || !CONTRACT_ID.test(value)) {
    failCalculatedSeries('CALCULATED_SERIES_ID_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function opaqueId(value, label = 'Id') {
  if (typeof value !== 'string' || !ID.test(value)) {
    failCalculatedSeries('CALCULATED_SERIES_ID_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function displayLabel(value, label = 'Display label') {
  if (typeof value !== 'string' || value.length < 1
    || value.length > CALCULATED_SERIES_LIMITS.maximumDisplayLabelCharacters) {
    failCalculatedSeries('CALCULATED_SERIES_LABEL_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function boundedText(value, label, maximum = CALCULATED_SERIES_LIMITS.maximumMessageCharacters) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
    failCalculatedSeries('CALCULATED_SERIES_TEXT_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function semver(value, label = 'Version') {
  if (typeof value !== 'string' || !VERSION.test(value)) {
    failCalculatedSeries('CALCULATED_SERIES_VERSION_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function digest(value, label = 'Digest') {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    failCalculatedSeries('CALCULATED_SERIES_DIGEST_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function safeInteger(value, label, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    failCalculatedSeries('CALCULATED_SERIES_INTEGER_INVALID', `${label} is invalid.`);
  }
  return value;
}

export function finiteNumber(value, label, { minimum = -Infinity, positive = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum
    || (positive && value <= 0)) {
    failCalculatedSeries('CALCULATED_SERIES_NUMBER_INVALID', `${label} is invalid.`);
  }
  return Object.is(value, -0) ? 0 : value;
}

export function enumValue(value, allowed, code, label) {
  if (!allowed.includes(value)) failCalculatedSeries(code, `${label} is unsupported.`);
  return value;
}

export function canonicalBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function assertByteCeiling(value, maximum, label) {
  if (canonicalBytes(value) > maximum) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', `${label} exceeds its byte ceiling.`);
  }
  return value;
}

/** Reject an oversized exact-shape input before narrower field ceilings mask the wire limit. */
export function assertRawByteCeiling(value, maximum, label) {
  if (!isAccessorFree(value)) return value;
  try {
    return assertByteCeiling(value, maximum, label);
  } catch (error) {
    if (error?.code === 'CALCULATED_SERIES_RESOURCE_LIMIT') throw error;
    return value;
  }
}

function clonePortable(value, depth, seen) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return finiteNumber(value, 'Portable number');
  if (typeof value !== 'object' || depth > CALCULATED_SERIES_LIMITS.maximumPortableDepth
    || seen.has(value)) {
    failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', 'Portable value is cyclic, executable, or too deep.');
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const keys = dataPropertyKeys(value, 'Portable array').filter((key) => key !== 'length');
    if (keys.length !== value.length
      || keys.some((key, index) => key !== String(index))) {
      failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', 'Portable arrays must be dense.');
    }
    if (value.length > CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries) {
      failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Portable array is oversized.');
    }
    const array = Object.freeze(value.map((entry) => clonePortable(entry, depth + 1, seen)));
    seen.delete(value);
    return array;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', 'Portable object must be a plain record.');
  }
  const keys = dataPropertyKeys(value, 'Portable object');
  if (keys.length > CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Portable object is oversized.');
  }
  const clone = {};
  for (const key of keys.sort()) {
    opaqueId(key, 'Portable property');
    clone[key] = clonePortable(
      Object.getOwnPropertyDescriptor(value, key).value,
      depth + 1,
      seen,
    );
  }
  seen.delete(value);
  return Object.freeze(clone);
}

export function portableValue(value, label = 'Portable value') {
  try {
    return clonePortable(value, 0, new Set());
  } catch (error) {
    if (error?.name === 'CalculatedSeriesContractError') throw error;
    failCalculatedSeries('CALCULATED_SERIES_NON_PORTABLE', `${label} is not portable.`);
  }
}

export function uniqueIds(values, field, label) {
  const ids = values.map((value) => value[field]);
  if (new Set(ids).size !== ids.length) {
    failCalculatedSeries('CALCULATED_SERIES_ID_DUPLICATE', `${label} ids must be unique.`);
  }
  return values;
}
